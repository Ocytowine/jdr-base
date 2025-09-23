import { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';

let adapterSingleton: any = null;

function resolveRuntimeConfig() {
  try {
    if (typeof useRuntimeConfig === 'function') {
      return useRuntimeConfig();
    }
  } catch (error) {
    // ignore runtime config resolution errors, fallback to env vars below
  }
  return {} as any;
}

export function getCatalogAdapter() {
  if (adapterSingleton) {
    return adapterSingleton;
  }

  const config = resolveRuntimeConfig() as any;
  const owner = config.github?.owner || process.env.GITHUB_OWNER || 'Ocytowine';
  const repo = config.github?.repo || process.env.GITHUB_REPO || 'ArchiveValmorinTest';
  const branch = config.github?.branch || process.env.GITHUB_BRANCH || 'main';
  const token = config.github?.token || process.env.GITHUB_TOKEN || '';
  const cacheDir = config.dataCacheDir || process.env.DATA_CACHE_DIR || '/tmp/data_adapter_cache';

  adapterSingleton = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });
  return adapterSingleton;
}

export function setCatalogAdapter(adapter: any) {
  adapterSingleton = adapter;
}
