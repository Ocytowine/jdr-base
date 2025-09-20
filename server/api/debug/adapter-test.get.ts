// server/api/debug/adapter-test.get.ts
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const owner = config.github?.owner || 'Ocytowine';
    const repo = config.github?.repo || 'ArchiveValmorinTest';
    const branch = config.github?.branch || 'main';
    const token = config.github?.token || '';
    const cacheDir = config.dataCacheDir || '/tmp/data_adapter_cache';

    // Importer le module depuis utils via alias Nuxt (préféré)
    let mod: any = null;
    try {
      mod = await import('~/utils/dataAdapterV2GitHub');
    } catch (e) {
      // fallback relatif CORRECT depuis server/api/debug -> project root = ../../../
      mod = await import('../../../utils/dataAdapterV2GitHub');
    }

    // Support export nommé ou default
    const DataAdapterV2GitHub = mod?.DataAdapterV2GitHub || mod?.default || mod;
    if (!DataAdapterV2GitHub) {
      throw new Error('DataAdapterV2GitHub export not found in module. Vérifie utils/dataAdapterV2GitHub.ts');
    }

    const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });

    await adapter.initIndex();

    const features = await adapter.resolveFeatureTree(['mage','elfe'], 20);

    const summary = features.map((f: any) => ({
      id: f.id,
      name: f.raw?.nom || f.raw?.name || null,
      effectsCount: Array.isArray(f.effects) ? f.effects.length : 0
    }));

    return { ok: true, indexSize: adapter.indexCache?.size || 0, resolvedCount: features.length, features: summary };
  } catch (err: any) {
    console.error('adapter-test error:', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
