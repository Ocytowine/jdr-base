// data_adapter.ts
// JDR BASE Refonte — Index-driven data adapter
// ------------------------------------------------------------
// This adapter loads classes / subclasses / features / items from a public GitHub repo (or any static base URL)
// using a single index.json as the source of truth. It normalizes IDs, resolves features by id,
// and exposes helpers tailored for the character creation wizard (BonomeWizard).
//
// Key features:
// - Single fetch of index.json (cached)
// - ID normalization (snake_case -> kebab-case) to absorb legacy files
// - Robust URL resolution via index.categories.<cat>.map[id]
// - Batched feature resolution
// - Clear TypeScript types and errors
// - Helper functions for dropdown lists & level-based feature resolution
//
// Usage pattern (in Vue or any TS file):
//   import { DataAdapter } from "./utils/data_adapter";
//
//   const adapter = new DataAdapter("https://raw.githubusercontent.com/<user>/<repo>/<branch>");
//   await adapter.ensureIndex();
//   const classes = await adapter.getClassList(); // for dropdowns
//   const { cls, features, choiceEvents } = await adapter.loadClassWithFeatures("guerrier");
//   // On level 3, show subclass choice if present in choiceEvents.
//   // After choosing a subclass: const sub = await adapter.loadSubclassWithFeatures("berserker");
//
// ------------------------------------------------------------

export type CategoryName = "classes" | "subclasses" | "features" | "items";

export interface IndexCategory {
  ids: string[];
  map: Record<string, string>;
  // optional meta, ignored here
  meta?: Record<string, unknown>;
}

export interface JDRIndex {
  $schema?: string;
  generated_at?: string;
  root?: string;
  categories: {
    classes?: IndexCategory;
    subclasses?: IndexCategory;
    features?: IndexCategory;
    items?: IndexCategory;
  };
  summary?: Record<string, number>;
  problems?: unknown;
}

export interface ChoiceEvent {
  choice_id: string;
  type: "sous_classe"; // extensible si d'autres types de choix
  choose: number;
  from: string[];
}

export interface JDRClass {
  id: string;
  name: string;
  hit_die?: number;
  primary_abilities?: string[];
  saving_throws?: string[];
  proficiencies?: Record<string, string[]>;
  skill_choices?: { choose: number; from: string[] };
  features_by_level?: Record<string, (string | ChoiceEvent)[]>;
  subclasses?: string[];
  [k: string]: any; // pour tolérer des champs additionnels
}

export interface JDRSubclass {
  id: string;
  name?: string;
  classe_id: string;
  features_by_level?: Record<string, string[]>; // uniquement des ids
  [k: string]: any;
}

export interface JDRFeature {
  id: string;
  type?: "feature";
  categorie?: string; // "class_feature" | "subclass_feature" | ...
  name: string;
  applique_a?: {
    classes?: string[];
    sous_classes?: string[];
    races?: string[];
    backgrounds?: string[];
    items?: string[];
  };
  niveau_acquisition?: number;
  prerequis?: Array<{ type: string; valeur: string }>;
  mecanique?: Record<string, any>;
  texte?: string;
  ui?: Record<string, any>;
  [k: string]: any;
}

export interface LoadedClass {
  cls: JDRClass;
  features: JDRFeature[];
  choiceEvents: Array<{ level: number; event: ChoiceEvent }>;
}

export interface LoadedSubclass {
  sub: JDRSubclass;
  features: JDRFeature[];
}

type Fetcher = (url: string) => Promise<Response>;

export interface DataAdapterOptions {
  fetcher?: Fetcher;
  // If true, logs useful information to console
  debug?: boolean;
  // Enable simple in-memory caching for GET requests
  cache?: boolean;
}

// ------------------------------------------------------------
// Small utilities
// ------------------------------------------------------------

function isNonEmptyString(x: any): x is string {
  return typeof x === "string" && x.length > 0;
}

// Normalize IDs to a canonical kebab-case form:
//  - trim
//  - lower-case
//  - replace spaces with '-'
//  - replace underscores '_' with '-'
export function normalizeId(id: string): string {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

// safe join for baseUrl + relative path from index map (which uses '/')
function joinUrl(baseUrl: string, relativePath: string): string {
  const a = baseUrl.replace(/\/+$/, "");
  const b = relativePath.replace(/^\/+/, "");
  return `${a}/${b}`;
}

// ------------------------------------------------------------
// DataAdapter
// ------------------------------------------------------------

export class DataAdapter {
  private baseUrl: string;
  private options: Required<DataAdapterOptions>;
  private indexCache: JDRIndex | null = null;
  private entityCache = new Map<string, any>(); // url -> json

  constructor(baseUrl: string, options?: DataAdapterOptions) {
    this.baseUrl = baseUrl;
    this.options = {
      fetcher: (typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined) as Fetcher,
      debug: false,
      cache: true,
      ...(options || {}),
    };
    if (!this.options.fetcher) {
      throw new Error("No fetch implementation found. Provide options.fetcher in Node environments.");
    }
  }

  // ------------------------------------------------------------------
  // Core fetching with optional in-memory cache
  // ------------------------------------------------------------------
  private async fetchJson<T = any>(url: string): Promise<T> {
    if (this.options.cache && this.entityCache.has(url)) {
      return this.entityCache.get(url) as T;
    }
    const res = await this.options.fetcher(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while fetching ${url}`);
    }
    const json = (await res.json()) as T;
    if (this.options.cache) this.entityCache.set(url, json);
    return json;
  }

  // ------------------------------------------------------------------
  // Index handling
  // ------------------------------------------------------------------
  async ensureIndex(): Promise<JDRIndex> {
    if (this.indexCache) return this.indexCache;
    const url = joinUrl(this.baseUrl, "index.json");
    const idx = await this.fetchJson<JDRIndex>(url);
    // sanity checks
    if (!idx || !idx.categories) {
      throw new Error("index.json malformé: champ 'categories' manquant");
    }
    this.indexCache = idx;
    if (this.options.debug) {
      console.info("[DataAdapter] index loaded:", {
        classes: idx.categories.classes?.ids?.length ?? 0,
        subclasses: idx.categories.subclasses?.ids?.length ?? 0,
        features: idx.categories.features?.ids?.length ?? 0,
        items: idx.categories.items?.ids?.length ?? 0,
      });
    }
    return idx;
  }

  private resolveCategory(cat: CategoryName, idx: JDRIndex): IndexCategory {
    const c = idx.categories[cat];
    if (!c) throw new Error(`index.json ne contient pas la catégorie '${cat}'`);
    if (!c.ids || !c.map) throw new Error(`index.json: catégorie '${cat}' invalide (ids/map)`);
    return c;
  }

  // Get URL for an entity by id using the index map. Tries normalized id if exact key missing.
  private idToUrl(cat: CategoryName, id: string, idx: JDRIndex): string {
    const category = this.resolveCategory(cat, idx);
    const direct = category.map[id];
    if (direct) return joinUrl(this.baseUrl, direct);

    // fallback: try normalized
    const norm = normalizeId(id);
    const normHit = category.map[norm];
    if (normHit) {
      if (this.options.debug) console.warn(`[DataAdapter] id '${id}' resolved via normalized '${norm}' in ${cat}`);
      return joinUrl(this.baseUrl, normHit);
    }

    // last resort: try to find by basename match
    const entry = Object.entries(category.map).find(([k, rel]) => {
      const basename = rel.split("/").pop()?.replace(/\.json$/i, "");
      return basename === id || basename === norm;
    });
    if (entry) {
      if (this.options.debug) console.warn(`[DataAdapter] id '${id}' matched by filename '${entry[0]}' in ${cat}`);
      return joinUrl(this.baseUrl, entry[1]);
    }

    throw new Error(`ID introuvable dans l'index (${cat}): '${id}'`);
  }

  // ------------------------------------------------------------
  // Public loaders
  // ------------------------------------------------------------

  async getClassList(): Promise<Array<{ id: string; name: string }>> {
    const idx = await this.ensureIndex();
    const cat = this.resolveCategory("classes", idx);
    // Load minimal data for labels
    const results: Array<{ id: string; name: string }> = [];
    for (const id of cat.ids) {
      const url = this.idToUrl("classes", id, idx);
      const cls = await this.fetchJson<JDRClass>(url);
      results.push({ id: cls.id || id, name: cls.name || id });
    }
    // Sort by display name
    results.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return results;
  }

  async getSubclassList(forClassId?: string): Promise<Array<{ id: string; name: string; classe_id: string }>> {
    const idx = await this.ensureIndex();
    const cat = this.resolveCategory("subclasses", idx);
    const results: Array<{ id: string; name: string; classe_id: string }> = [];
    for (const id of cat.ids) {
      const url = this.idToUrl("subclasses", id, idx);
      const sub = await this.fetchJson<JDRSubclass>(url);
      if (!forClassId || normalizeId(sub.classe_id) === normalizeId(forClassId)) {
        results.push({ id: sub.id || id, name: (sub as any).name || sub.id || id, classe_id: sub.classe_id });
      }
    }
    results.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return results;
  }

  async loadClass(classId: string): Promise<JDRClass> {
    const idx = await this.ensureIndex();
    const url = this.idToUrl("classes", classId, idx);
    const cls = await this.fetchJson<JDRClass>(url);
    // normalize id
    if (!cls.id) cls.id = normalizeId(classId);
    return cls;
  }

  async loadSubclass(subclassId: string): Promise<JDRSubclass> {
    const idx = await this.ensureIndex();
    const url = this.idToUrl("subclasses", subclassId, idx);
    const sub = await this.fetchJson<JDRSubclass>(url);
    if (!sub.id) sub.id = normalizeId(subclassId);
    return sub;
  }

  async loadFeatureById(featureId: string): Promise<JDRFeature> {
    const idx = await this.ensureIndex();
    const url = this.idToUrl("features", featureId, idx);
    const feature = await this.fetchJson<JDRFeature>(url);
    if (!feature.id) feature.id = normalizeId(featureId);
    return feature;
  }

  async loadFeatures(featureIds: string[]): Promise<JDRFeature[]> {
    // de-duplicate + normalize for robustness
    const uniq = Array.from(new Set(featureIds.map(normalizeId)));
    return Promise.all(uniq.map((id) => this.loadFeatureById(id)));
  }

  // Class + features + choice events (for the wizard)
  async loadClassWithFeatures(classId: string): Promise<LoadedClass> {
    const cls = await this.loadClass(classId);
    const featureIds: string[] = [];
    const choiceEvents: Array<{ level: number; event: ChoiceEvent }> = [];

    const fbl = cls.features_by_level || {};
    for (const [lvlStr, entries] of Object.entries(fbl)) {
      const level = Number(lvlStr);
      for (const entry of entries) {
        if (typeof entry === "string") {
          featureIds.push(entry);
        } else if (entry && typeof entry === "object" && "type" in entry) {
          // Treat explicit choice object (e.g. sous_classe at level N)
          const ev = entry as ChoiceEvent;
          choiceEvents.push({ level, event: ev });
        } else {
          if (this.options.debug) {
            console.warn(`[DataAdapter] Ignored unknown feature entry at level ${level}:`, entry);
          }
        }
      }
    }

    const features = await this.loadFeatures(featureIds);
    return { cls, features, choiceEvents };
  }

  // Subclass + features
  async loadSubclassWithFeatures(subclassId: string): Promise<LoadedSubclass> {
    const sub = await this.loadSubclass(subclassId);
    const fids: string[] = [];
    const fbl = sub.features_by_level || {};
    for (const entries of Object.values(fbl)) {
      for (const e of entries) {
        if (typeof e === "string") fids.push(e);
      }
    }
    const features = await this.loadFeatures(fids);
    return { sub, features };
  }

  // ------------------------------------------------------------
  // High-level helpers for BonomeWizard
  // ------------------------------------------------------------

  /**
   * Return the fully-resolved features that a character gains at a given level,
   * based on the selected class and (optionally) the chosen subclass.
   */
  async getGainsAtLevel(level: number, classId: string, subclassId?: string): Promise<{
    features: JDRFeature[];
    choiceEvents: ChoiceEvent[]; // (often a sous-classe choice at the given level)
  }> {
    const { cls } = await this.loadClassWithFeatures(classId);
    const outFeatures: string[] = [];
    const outChoices: ChoiceEvent[] = [];

    const entries = (cls.features_by_level?.[String(level)] || []) as (string | ChoiceEvent)[];
    for (const entry of entries) {
      if (typeof entry === "string") outFeatures.push(entry);
      else if (entry && entry.type) outChoices.push(entry);
    }

    if (subclassId) {
      const { sub } = await this.loadSubclassWithFeatures(subclassId);
      const subEntries = (sub.features_by_level?.[String(level)] || []) as string[];
      for (const x of subEntries) outFeatures.push(x);
    }

    const features = await this.loadFeatures(outFeatures);
    return { features, choiceEvents: outChoices };
  }

  /**
   * Prepare dropdown data for subclasses available to a given class.
   * If the class defines 'subclasses' list, we filter to those – otherwise we return all matching classe_id.
   */
  async getSubclassesForClass(classId: string): Promise<Array<{ id: string; name: string }>> {
    const idx = await this.ensureIndex();
    const all = await this.getSubclassList(classId);
    // If class file restricts subclasses list, honor it
    let allowed: Set<string> | null = null;
    try {
      const cls = await this.loadClass(classId);
      if (Array.isArray(cls.subclasses) && cls.subclasses.length > 0) {
        allowed = new Set(cls.subclasses.map(normalizeId));
      }
    } catch {
      /* ignore */
    }

    const list = all
      .filter((s) => (allowed ? allowed.has(normalizeId(s.id)) : true))
      .map((s) => ({ id: s.id, name: s.name }));

    // As a safety, ensure IDs are present in the index
    const subCat = this.resolveCategory("subclasses", idx);
    const filtered = list.filter((s) => subCat.map[s.id] || subCat.map[normalizeId(s.id)]);

    return filtered;
  }

  // For UI dropdown styling convenience
  static toOptions(items: Array<{ id: string; name: string }>) {
    return items.map((x) => ({ value: x.id, label: x.name }));
  }
}
