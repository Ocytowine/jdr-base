import { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { EffectEngine } from '~/engine/effectEngine';
import { CreationAdapterServer } from '~/utils/creationAdapterServer';

let singleton: any = null;
function getSingleton() {
  if (singleton) return singleton;
  const config = useRuntimeConfig();
  const owner = config.github?.owner || process.env.GITHUB_OWNER || 'Ocytowine';
  const repo = config.github?.repo || process.env.GITHUB_REPO || 'ArchiveValmorinTest';
  const branch = config.github?.branch || process.env.GITHUB_BRANCH || 'main';
  const token = config.github?.token || process.env.GITHUB_TOKEN || '';
  const cacheDir = config.dataCacheDir || process.env.DATA_CACHE_DIR || '/tmp/data_adapter_cache';
  const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });
  const engine = new EffectEngine();
  const creation = new CreationAdapterServer(adapter, engine);
  singleton = { adapter, engine, creation };
  return singleton;
}

export default defineEventHandler(async (event) => {
  const s = getSingleton();
  try { await s.adapter.initIndex(); } catch(e){}
  const surf = await s.creation.getCreationSurface();
  return { ok:true, surface: surf };
});