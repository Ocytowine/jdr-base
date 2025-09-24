import { basename } from 'node:path';

import type { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { getCatalogAdapter } from '~/server/utils/catalogAdapter';

export type CatalogEntry = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  effectLabel: string | null;
  effect_label?: string | null;
};
type CatalogKind = 'classes' | 'races' | 'backgrounds' | 'spells';

type IndexEntry = string | number | boolean | { [key: string]: any } | null | undefined;

type GitHubEntry = {
  type?: string;
  name?: string;
  path?: string;
  id?: string;
  [key: string]: any;
};

const JSON_EXTENSION = /\.json$/i;
const TEXT_FIELDS = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_FIELDS = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];
const NAME_FIELDS = ['name', 'label', 'title'];
const EFFECT_LABEL_FIELDS = ['effect_label', 'effectLabel', 'effect', 'summary', 'tagline', 'mecanique.effect_label', 'mecanique.effectLabel'];

const pickFirstString = (values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
  }
  return null;
};

const getNestedValue = (source: any, path: string): unknown => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }
  const segments = String(path).split('.');
  let current: any = source;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const pickFirstFromKeys = (record: Record<string, any>, keys: string[]): string | null => {
  const values = keys.map((key) => getNestedValue(record, key));
  return pickFirstString(values);
};

const toSlug = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const asString = String(value).trim();
  if (!asString.length) {
    return null;
  }
  const withoutJson = asString.replace(JSON_EXTENSION, '');
  const segments = withoutJson.split('/');
  const slug = segments[segments.length - 1]?.trim();
  return slug && slug.length ? slug : null;
};

const humanizeLabel = (value: string): string => {
  const normalized = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized.length) {
    return value;
  }
  return normalized.replace(/\b(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`);
};

const fromIndexEntry = (entry: IndexEntry, idx: number): CatalogEntry | null => {
  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
    const id = toSlug(entry);
    if (!id) {
      return null;
    }
    return {
      id,
      name: humanizeLabel(id),
      description: null,
      image: null,
      effectLabel: null,
      effect_label: null
    };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Record<string, any>;
  const id =
    toSlug(record.id) ??
    toSlug(record.slug) ??
    toSlug(record.uid) ??
    toSlug(record.key) ??
    toSlug(record.value) ??
    toSlug(record.name) ??
    `entry_${idx}`;

  if (!id) {
    return null;
  }

  const name = pickFirstString([record.label, record.name, record.title, record.text]) ?? humanizeLabel(id);
  const description = pickFirstFromKeys(record, TEXT_FIELDS);
  const image = pickFirstFromKeys(record, IMAGE_FIELDS);
  const effectLabel = pickFirstFromKeys(record, EFFECT_LABEL_FIELDS);

  return {
    id,
    name,
    description: description ?? null,
    image: image ?? null,
    effectLabel: effectLabel ?? null,
    effect_label: effectLabel ?? null
  };
};

const normalizeIndex = (payload: unknown): CatalogEntry[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries = new Map<string, CatalogEntry>();
  payload.forEach((item, idx) => {
    const normalized = fromIndexEntry(item as IndexEntry, idx);
    if (normalized) {
      entries.set(normalized.id, normalized);
    }
  });

  return Array.from(entries.values());
};

const fromGitHubEntry = (entry: GitHubEntry): CatalogEntry | null => {
  if (!entry || entry.type !== 'file') {
    return null;
  }

  const source =
    typeof entry.name === 'string'
      ? entry.name
      : typeof entry.path === 'string'
      ? basename(entry.path)
      : entry.id;

  if (typeof source !== 'string') {
    return null;
  }

  const id = toSlug(source);
  if (!id) {
    return null;
  }

  return {
    id,
    name: humanizeLabel(id),
    description: null,
    image: null,
    effectLabel: null,
    effect_label: null
  };
};

const normalizeList = (entries: GitHubEntry[] | null | undefined): CatalogEntry[] => {
  if (!Array.isArray(entries)) {
    return [];
  }
  const output = new Map<string, CatalogEntry>();
  entries.forEach((entry) => {
    const normalized = fromGitHubEntry(entry);
    if (normalized) {
      output.set(normalized.id, normalized);
    }
  });
  return Array.from(output.values());
};

export async function getCatalogEntries(kind: CatalogKind): Promise<CatalogEntry[]> {
  const adapter: DataAdapterV2GitHub | any = getCatalogAdapter();
  if (!adapter) {
    console.error(`[catalog] Aucun adaptateur configuré pour ${kind}`);
    return [];
  }

  let indexError: unknown = null;

  try {
    const payload = await adapter.fetchJsonFromRepoPath(`${kind}/index.json`);
    const normalized = normalizeIndex(payload);
    if (normalized.length) {
      return await enrichCatalogEntries(kind, normalized, adapter);
    }
  } catch (error) {
    indexError = error;
  }

  try {
    const entries = await adapter.listFilesInPath(kind);
    const normalized = normalizeList(entries);
    if (normalized.length) {
      return await enrichCatalogEntries(kind, normalized, adapter);
    }
  } catch (listError) {
    if (indexError) {
      console.error(`[catalog] Impossible de charger le catalogue ${kind}`, { indexError, listError });
      return [];
    }
    console.error(`[catalog] Impossible de lister les fichiers pour ${kind}`, listError);
    return [];
  }

  if (indexError) {
    console.error(`[catalog] Index introuvable pour ${kind}`, indexError);
  }

  return [];
}

async function enrichCatalogEntries(
  kind: CatalogKind,
  entries: CatalogEntry[],
  adapter: DataAdapterV2GitHub | any
): Promise<CatalogEntry[]> {
  if (!Array.isArray(entries) || !entries.length) {
    return entries ?? [];
  }

  const hasContent = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

  const tasks = entries.map(async (entry) => {
    const needsDescription = !hasContent(entry.description);
    const needsEffectLabel = !hasContent(entry.effectLabel);
    const needsImage = !hasContent(entry.image);
    const needsName = !hasContent(entry.name) || entry.name === humanizeLabel(entry.id);

    if (!needsDescription && !needsEffectLabel && !needsImage && !needsName) {
      return entry;
    }

    try {
      const repoPath = `${kind}/${entry.id}.json`;
      const payload = await adapter.fetchJsonFromRepoPath(repoPath);
      if (!payload || typeof payload !== 'object') {
        return entry;
      }

      const record = payload as Record<string, any>;
      const resolvedName = pickFirstFromKeys(record, NAME_FIELDS);
      const resolvedDescription = pickFirstFromKeys(record, TEXT_FIELDS);
      const resolvedImage = pickFirstFromKeys(record, IMAGE_FIELDS);
      const resolvedEffectLabel = pickFirstFromKeys(record, EFFECT_LABEL_FIELDS);

      if (resolvedName) {
        entry.name = resolvedName;
      }
      if (resolvedDescription) {
        entry.description = resolvedDescription;
      }
      if (resolvedImage) {
        entry.image = resolvedImage;
      }
      if (resolvedEffectLabel) {
        entry.effectLabel = resolvedEffectLabel;
        entry.effect_label = resolvedEffectLabel;
      }
    } catch (error) {
      console.error(`[catalog] Impossible de récupérer les détails pour ${kind}/${entry.id}.json`, error);
    }

    return entry;
  });

  await Promise.all(tasks);
  return entries;
}
