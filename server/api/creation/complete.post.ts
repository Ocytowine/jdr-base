// server/api/creation/complete.post.ts
import { readBody } from 'h3';
import { useCreationAdapter } from '~/server/utils/creationAdapter';
import { normalizeFeatureLedger, flattenFeatureLedger } from '~/utils/featureLedger';

type Id = string;

type CompletionRequest = {
  selection?: {
    class?: Id | null;
    race?: Id | null;
    background?: Id | null;
    niveau?: number;
    chosenOptions?: Record<string, any>;
  } | null;
  previewCharacter?: any | null;
  personnage?: any | null;
  missing?: {
    classes?: Id[] | null;
    races?: Id[] | null;
    backgrounds?: Id[] | null;
    features?: Id[] | null;
    spells?: Id[] | null;
    items?: Id[] | null;
  } | null;
};

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CompletionRequest;
    const selection = body?.selection ?? {};
    const previewCharacter = body?.previewCharacter ?? {};
    const personnage = body?.personnage ?? {};
    const missingPayload = body?.missing;
    const missingProvided = missingPayload && typeof missingPayload === 'object';

    const toMissingSet = (list: any): Set<string> | null => {
      if (!missingProvided) return null;
      if (!Array.isArray(list)) return new Set();
      const set = new Set<string>();
      for (const entry of list) {
        const str = String(entry ?? '').trim();
        if (str.length) set.add(str);
      }
      return set;
    };

    const missingSets = {
      classes: toMissingSet(missingPayload?.classes),
      races: toMissingSet(missingPayload?.races),
      backgrounds: toMissingSet(missingPayload?.backgrounds),
      features: toMissingSet(missingPayload?.features),
      spells: toMissingSet(missingPayload?.spells),
      items: toMissingSet(missingPayload?.items)
    };

    const shouldFetch = (kind: keyof typeof missingSets, id: any) => {
      const str = id === undefined || id === null ? '' : String(id).trim();
      if (!str) return false;
      const set = missingSets[kind];
      if (set === null) return true;
      return set.has(str);
    };

    const { service } = await useCreationAdapter();
    const adapter: any = (service as any).adapter;

    const out = {
      classes: {} as Record<string, any>,
      races: {} as Record<string, any>,
      backgrounds: {} as Record<string, any>,
      // map of feature id -> raw payload
      features: {} as Record<string, any>,
      // map of spell id -> raw payload
      spells: {} as Record<string, any>,
      // map of item id -> raw payload
      items: {} as Record<string, any>
    };

    const loadById = async (id: any): Promise<any | null> => {
      const str = id === undefined || id === null ? '' : String(id).trim();
      if (!str) return null;
      try {
        const raw = await adapter?.loadRaw?.(str);
        if (raw && typeof raw === 'object') {
          if (raw.id === undefined || raw.id === null) raw.id = str;
          return raw;
        }
      } catch (err) {
        // ignore individual failures
      }
      return null;
    };

    // Primary entities
    const classId = selection?.class ?? null;
    const raceId = selection?.race ?? null;
    const backgroundId = selection?.background ?? null;
    if (shouldFetch('classes', classId)) {
      const cls = await loadById(classId);
      if (cls && classId) out.classes[String(classId)] = cls;
    }
    if (shouldFetch('races', raceId)) {
      const rc = await loadById(raceId);
      if (rc && raceId) out.races[String(raceId)] = rc;
    }
    if (shouldFetch('backgrounds', backgroundId)) {
      const bg = await loadById(backgroundId);
      if (bg && backgroundId) out.backgrounds[String(backgroundId)] = bg;
    }

    const previewFeatureLedger = normalizeFeatureLedger(
      (previewCharacter as any)?.featureLedger ??
        (body as any)?.featureLedger ??
        (body as any)?.preview?.featureLedger ??
        null
    );

    const appliedFeatureSet = new Set<string>(flattenFeatureLedger(previewFeatureLedger));

    const fallbackFeatureArrays = [
      (previewCharacter as any)?.features,
      (previewCharacter as any)?.appliedFeatures,
      (body as any)?.appliedFeatures,
      (body as any)?.preview?.appliedFeatures,
      (body as any)?.applied
    ];

    for (const arr of fallbackFeatureArrays) {
      if (!Array.isArray(arr)) continue;
      for (const val of arr) {
        const str = String(val ?? '').trim();
        if (str.length) appliedFeatureSet.add(str);
      }
    }

    // Include feature ids coming from the saved personnage (JDR_PERSO_...), if present
    const personnageFeatureIds: string[] = flattenFeatureLedger(normalizeFeatureLedger(personnage?.featureIds ?? {}));

    // Also include selection.chosenOptions values as possible feature ids
    const chosenOptionIds: string[] = (() => {
      const out: string[] = [];
      const co = selection?.chosenOptions && typeof selection.chosenOptions === 'object' ? selection!.chosenOptions! : {};
      for (const v of Object.values(co)) {
        if (Array.isArray(v)) {
          for (const x of v) {
            const str = String(x ?? '').trim();
            if (str.length) out.push(str);
          }
        } else if (v !== undefined && v !== null) {
          const str = String(v).trim();
          if (str.length) out.push(str);
        }
      }
      return out;
    })();

    const featureIds = Array.from(
      new Set<string>([
        ...Array.from(appliedFeatureSet),
        ...chosenOptionIds,
        ...personnageFeatureIds
      ])
    ).filter((fid) => shouldFetch('features', fid));
    for (const fid of featureIds) {
      const raw = await loadById(fid);
      if (raw) out.features[fid] = raw;
    }

    // Spells from previewCharacter.spellcasting { known, prepared }
    const spellcasting = (previewCharacter && typeof previewCharacter === 'object') ? (previewCharacter as any).spellcasting : null;
    const spellIds: string[] = [];
    if (spellcasting && typeof spellcasting === 'object') {
      if (Array.isArray(spellcasting.known)) {
        for (const s of spellcasting.known) {
          const str = String(s ?? '').trim();
          if (str.length) spellIds.push(str);
        }
      }
      if (Array.isArray(spellcasting.prepared)) {
        for (const s of spellcasting.prepared) {
          const str = String(s ?? '').trim();
          if (str.length) spellIds.push(str);
        }
      }
    }

    // Include spellIds present in the saved personnage (JDR_PERSO_...), if any
    if (Array.isArray(personnage?.spellIds)) {
      for (const s of personnage.spellIds) {
        const str = String(s ?? '').trim();
        if (str.length) spellIds.push(str);
      }
    }

    for (const sid of Array.from(new Set(spellIds)).filter((sid) => shouldFetch('spells', sid))) {
      const raw = await loadById(sid);
      if (raw) out.spells[sid] = raw;
    }

    // Items from personnage.inventaire -> use provided minimal ids (stable repo ids)
    const inv: any[] = Array.isArray(personnage?.inventaire) ? personnage!.inventaire : [];
    const itemIds = Array.from(
      new Set(inv.map((it: any) => String(it?.id ?? '').trim()).filter((s) => s.length > 0))
    ).filter((iid) => shouldFetch('items', iid));
    for (const iid of itemIds) {
      const raw = await loadById(iid);
      if (raw) out.items[iid] = raw;
    }

    return { ok: true, enriched: out };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});
