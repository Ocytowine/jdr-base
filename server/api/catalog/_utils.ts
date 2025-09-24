import { basename } from 'node:path';

import type { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { getCatalogAdapter } from '~/server/utils/catalogAdapter';

type CatalogKind = 'classes' | 'races' | 'backgrounds';

type IndexEntry = string | number | boolean | { [key: string]: any } | null | undefined;

type GitHubEntry = {
  type?: string;
  name?: string;
  path?: string;
  id?: string;
  [key: string]: any;
};

const JSON_EXTENSION = /\.json$/i;

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
