import fs from 'node:fs';
import path from 'node:path';

import { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { CreationAdapterServer } from '~/utils/creationAdapterServer';

type CreationAdapterContext = {
  adapter: DataAdapterV2GitHub;
  service: CreationAdapterServer;
  initPromise: Promise<void> | null;
};

let singleton: CreationAdapterContext | null = null;

function resolveRuntimeConfig(): any {
  try {
    if (typeof useRuntimeConfig === 'function') {
      return useRuntimeConfig();
    }
  } catch (error) {
    // ignore runtime config resolution errors and fallback to env vars
  }
  return {} as any;
}

function getOrCreateContext(): CreationAdapterContext {
  if (singleton) {
    return singleton;
  }

  const config = resolveRuntimeConfig() as any;
  const owner = config.github?.owner || process.env.GITHUB_OWNER || 'Ocytowine';
  const repo = config.github?.repo || process.env.GITHUB_REPO || 'ArchiveValmorinTest';
  const branch = config.github?.branch || process.env.GITHUB_BRANCH || 'main';
  const token = config.github?.token || process.env.GITHUB_TOKEN || '';
  const cacheDir = config.dataCacheDir || process.env.DATA_CACHE_DIR || path.resolve(process.cwd(), 'tmp', 'data_adapter_cache');

  const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });
  const service = new CreationAdapterServer(adapter);

  singleton = { adapter, service, initPromise: null };
  return singleton;
}

export async function useCreationAdapter(): Promise<CreationAdapterContext> {
  const context = getOrCreateContext();
  if (!context.initPromise) {
    context.initPromise = context.service.init().catch((error) => {
      context.initPromise = null;
      throw error;
    });
  }
  await context.initPromise;
  return context;
}

export function resetCreationAdapter() {
  if (singleton?.adapter?.cacheDir) {
    const dir = singleton.adapter.cacheDir;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      try {
        console.warn('[creationAdapter] Unable to clear cache directory', dir, error);
      } catch (e) {
        // ignore console errors
      }
    }
  }
  singleton = null;
}
