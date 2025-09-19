// server/api/creation/preview.post.ts
import { readBody } from 'h3';
import { DataAdapterV2GitHub } from '~/utils/dataAdapterV2GitHub';
import { CreationAdapterServer } from '~/utils/creationAdapterServer';
import { EffectEngine } from '~/engine/effectEngine';

let singleton: any = null;

function getAdapterSingleton() {
  if (singleton) return singleton;

  // useRuntimeConfig() est disponible côté serveur
  const config = useRuntimeConfig();
  const owner = config.github?.owner || 'Ocytowine';
  const repo = config.github?.repo || 'ArchiveValmorinTest';
  const branch = config.github?.branch || 'main';
  const token = config.github?.token || process.env.GITHUB_TOKEN || '';
  const cacheDir = config.dataCacheDir || process.env.DATA_CACHE_DIR || '/tmp/data_adapter_cache';

  const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });
  const engine = new EffectEngine();
  const creation = new CreationAdapterServer(adapter, engine);
  singleton = { adapter, engine, creation };
  return singleton;
}

export default defineEventHandler(async (event) => {
  // attend un body JSON: { selection: {...}, baseCharacter: {...} }
  const body = await readBody(event);
  const { selection, baseCharacter } = body || {};

  const s = getAdapterSingleton();

  // lazy index init (ne bloque pas si échec)
  try {
    await s.adapter.initIndex();
  } catch (e) {
    // log minimal pour debug
    console.warn('initIndex() warning:', (e && e.message) || e);
  }

  // effectue la prévisualisation
  try {
    const result = await s.creation.applyFeaturesToCharacter(selection || {}, baseCharacter || {});
    return result;
  } catch (err: any) {
    // erreur serveur — renvoyer message d'erreur clair
    return { ok: false, error: (err && err.message) || String(err) };
  }
});
