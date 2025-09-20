// server/api/debug/adapter-test.get.ts
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const owner = config.github.owner;
    const repo = config.github.repo;
    const branch = config.github.branch;
    const token = config.github.token;
    const cacheDir = config.dataCacheDir;

    // Ajuste le chemin si ton adapter est dans utils/ ou à la racine
    // Ex : '~/utils/dataAdapterV2GitHub'
    const mod = await import('~/utils/dataAdapterV2GitHub').catch(async () => {
      // fallback to root if you placed it at project root
      return await import('../../dataAdapterV2GitHub');
    });
    const { DataAdapterV2GitHub } = mod;

    const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });

    // init index (scanne les dossiers définis dans scanFolders)
    await adapter.initIndex();

    // resolve the tree for mage + elfe (limit depth as appropriate)
    const features = await adapter.resolveFeatureTree(['mage','elfe'], 20);

    // build a lightweight summary to return
    const summary = features.map(f => ({
      id: f.id,
      name: f.raw?.nom || f.raw?.name || null,
      effectsCount: Array.isArray(f.effects) ? f.effects.length : 0,
      links: f.links || null
    }));

    return { ok: true, indexSize: adapter.indexCache.size, resolvedCount: features.length, features: summary };
  } catch (err: any) {
    console.error('adapter-test error', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
