import { basename } from 'node:path';

import type { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { getCatalogAdapter } from '~/server/utils/catalogAdapter';

type CatalogKind = 'classes' | 'races' | 'backgrounds';

export type CatalogEntry = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

type NormalizedCatalogEntry = CatalogEntry & {
  slug?: string | null;
  repoPath?: string | null;
};

type IndexEntry = string | number | boolean | { [key: string]: any } | null | undefined;

type GitHubEntry = {
  type?: string;
  name?: string;
  path?: string;
  id?: string;
  [key: string]: any;
};

const JSON_EXTENSION = /\.json$/i;

const TEXT_CANDIDATES = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_CANDIDATES = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];

function humanizeLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const normalized = trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.replace(/\b(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) =>
    `${first.toUpperCase()}${rest.toLowerCase()}`
  );
}

function extractTextField(source: Record<string, any> | null | undefined, fallbackName: string): string | null {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of TEXT_CANDIDATES) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
  }

  if (Array.isArray(source.entries)) {
    const candidate = source.entries.find((entry: unknown) => typeof entry === 'string');
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }

  const name = source.name ?? source.label ?? null;
  if (typeof name === 'string' && name.trim().length && name.trim().toLowerCase() !== fallbackName.toLowerCase()) {
    return name.trim();
  }

  return null;
}

function extractImageField(source: Record<string, any> | null | undefined): string | null {
  if (!source || typeof source !== 'object') {
    return null;
  }

  for (const key of IMAGE_CANDIDATES) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
  }

  return null;
}

function extractNameField(source: Record<string, any> | null | undefined, fallback: string): string {
  if (!source || typeof source !== 'object') {
    return fallback;
  }
  const candidate =
    source.label ??
    source.name ??
    source.title ??
    source.text ??
    source.displayName ??
    source.display_name ??
    null;
  if (typeof candidate === 'string' && candidate.trim().length) {
    return candidate.trim();
  }
  return fallback;
}

function sanitizeSlug(raw: string | number | boolean | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const asString = String(raw).trim();
  if (!asString.length) {
    return null;
  }
  const withoutJson = asString.replace(JSON_EXTENSION, '');
  const parts = withoutJson.split('/');
  const slug = parts[parts.length - 1]?.trim();
  return slug && slug.length ? slug : null;
}

function normalizeIndexEntry(entry: IndexEntry, kind: CatalogKind, idx: number): NormalizedCatalogEntry | null {
  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
    const slug = sanitizeSlug(entry);
    if (!slug) {
      return null;
    }
    return {
      id: slug,
      name: humanizeLabel(slug),
      slug,
      repoPath: `${kind}/${slug}.json`
    };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const source = entry as Record<string, any>;
  const slug =
    sanitizeSlug(source.slug) ??
    sanitizeSlug(source.id) ??
    sanitizeSlug(source.name) ??
    sanitizeSlug(source.value) ??
    sanitizeSlug(source.key) ??
    sanitizeSlug(source.path) ??
    sanitizeSlug(source.file) ??
    `entry_${idx}`;

  if (!slug) {
    return null;
  }

  const repoPathCandidate = source.path ?? source.repoPath ?? null;
  const repoPath = typeof repoPathCandidate === 'string' && repoPathCandidate.trim().length
    ? repoPathCandidate.trim()
    : `${kind}/${slug}.json`;

  const name = extractNameField(source, humanizeLabel(slug));
  const description = extractTextField(source, name);
  const image = extractImageField(source);

  return {
    id: slug,
    name,
    description,
    image,
    slug,
    repoPath
  };
}

function normalizeIndexDetailed(entries: IndexEntry[] | null | undefined, kind: CatalogKind): NormalizedCatalogEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry, idx) => normalizeIndexEntry(entry, kind, idx))
    .filter((entry): entry is NormalizedCatalogEntry => Boolean(entry));
}

function normalizeGitHubEntriesDetailed(entries: GitHubEntry[] | null | undefined, kind: CatalogKind): NormalizedCatalogEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter((entry) => entry && entry.type === 'file')
    .map((entry) => {
      const pathValue = typeof entry.path === 'string' ? entry.path : null;
      if (pathValue && !JSON_EXTENSION.test(pathValue)) {
        return null;
      }

      const slugSource = pathValue ?? entry.name ?? entry.id ?? null;
      const slug = sanitizeSlug(slugSource);
      if (!slug) {
        return null;
      }

      const repoPath = pathValue ?? `${kind}/${slug}.json`;
      const nameSource = entry.name ? entry.name.replace(JSON_EXTENSION, '') : slug;
      const name = humanizeLabel(nameSource ?? slug);

      return {
        id: slug,
        name,
        slug,
        repoPath
      };
    })
    .filter((entry): entry is NormalizedCatalogEntry => Boolean(entry));
}

function normalizeIndexEntries(entries: IndexEntry[]): string[] {
  return entries
    .map((entry) => {
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        const value = String(entry).trim();
        return value.length ? value : null;
      }
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const candidate = entry.name ?? entry.id ?? null;
      if (typeof candidate === 'string') {
        const value = candidate.trim();
        return value.length ? value : null;
      }
      if (candidate != null) {
        const value = String(candidate).trim();
        return value.length ? value : null;
      }
      return null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function normalizeGitHubEntries(entries: GitHubEntry[]): string[] {
  return entries
    .filter((entry) => entry && entry.type === 'file')
    .map((entry) => {
      const source =
        typeof entry.name === 'string'
          ? entry.name
          : typeof entry.path === 'string'
          ? basename(entry.path)
          : entry.id;
      if (typeof source !== 'string') {
        return null;
      }
      const cleaned = source.replace(JSON_EXTENSION, '').trim();
      return cleaned.length ? cleaned : null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function normalizeList(entries: GitHubEntry[] | null | undefined): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  const onlyJsonFiles = entries.filter((entry) => {
    if (!entry) {
      return false;
    }
    if (typeof entry.name === 'string') {
      return JSON_EXTENSION.test(entry.name);
    }
    if (typeof entry.path === 'string') {
      return JSON_EXTENSION.test(entry.path);
    }
    return false;
  });
  return normalizeGitHubEntries(onlyJsonFiles);
}

function normalizeIndex(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return normalizeIndexEntries(payload as IndexEntry[]);
}

export async function getCatalogLabels(kind: CatalogKind): Promise<string[]> {
  const adapter: DataAdapterV2GitHub | any = getCatalogAdapter();

  let indexError: unknown = null;
  let indexPayload: unknown;

  try {
    indexPayload = await adapter.fetchJsonFromRepoPath(`${kind}/index.json`);
  } catch (error) {
    indexError = error;
  }

  const labelsFromIndex = normalizeIndex(indexPayload);
  if (labelsFromIndex.length > 0) {
    return labelsFromIndex;
  }

  try {
    const entries = await adapter.listFilesInPath(kind);
    const labels = normalizeList(entries);
    if (labels.length > 0) {
      return labels;
    }
  } catch (listError) {
    if (indexError) {
      throw Object.assign(new Error(`Failed to load catalog for ${kind}`), { cause: { indexError, listError } });
    }
    throw listError;
  }

  if (indexError) {
    throw indexError instanceof Error ? indexError : new Error(String(indexError));
  }

  return [];
}

async function enrichCatalogEntry(
  adapter: DataAdapterV2GitHub | any,
  kind: CatalogKind,
  entry: NormalizedCatalogEntry
): Promise<NormalizedCatalogEntry> {
  const repoPath = entry.repoPath ?? (entry.slug ? `${kind}/${entry.slug}.json` : null);
  if (!repoPath) {
    return entry;
  }

  try {
    const payload = await adapter.fetchJsonFromRepoPath(repoPath);
    if (!payload || typeof payload !== 'object') {
      return entry;
    }

    const record = payload as Record<string, any>;
    const name = extractNameField(record, entry.name);
    const description = extractTextField(record, name) ?? entry.description ?? null;
    const image = extractImageField(record) ?? entry.image ?? null;

    return {
      ...entry,
      name,
      description,
      image
    };
  } catch (error) {
    return entry;
  }
}

export async function getCatalogEntries(kind: CatalogKind): Promise<CatalogEntry[]> {
  const adapter: DataAdapterV2GitHub | any = getCatalogAdapter();

  let indexPayload: unknown;
  let indexError: unknown = null;

  try {
    indexPayload = await adapter.fetchJsonFromRepoPath(`${kind}/index.json`);
  } catch (error) {
    indexError = error;
  }

  let entries = normalizeIndexDetailed(indexPayload as IndexEntry[] | null | undefined, kind);

  if (!entries.length) {
    try {
      const list = await adapter.listFilesInPath(kind);
      entries = normalizeGitHubEntriesDetailed(list, kind);
    } catch (listError) {
      if (indexError) {
        throw Object.assign(new Error(`Failed to load catalog for ${kind}`), { cause: { indexError, listError } });
      }
      throw listError;
    }
  }

  if (!entries.length && indexError) {
    throw indexError instanceof Error ? indexError : new Error(String(indexError));
  }

  const enriched = await Promise.all(entries.map((entry) => enrichCatalogEntry(adapter, kind, entry)));

  const deduped = new Map<string, NormalizedCatalogEntry>();
  for (const entry of enriched) {
    if (!deduped.has(entry.id)) {
      deduped.set(entry.id, entry);
    }
  }

  return Array.from(deduped.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    description: entry.description ?? undefined,
    image: entry.image ?? undefined
  }));
}
