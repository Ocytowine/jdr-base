// server/api/creation/resolve-choice.post.ts
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const ui_id = body.ui_id;
    const value = body.value; // could be string, array, or object
    const selection = body.selection || {};
    const baseCharacter = body.baseCharacter || { base_stats_before_race: {} };

    if (!ui_id) {
      return { ok: false, error: 'ui_id required' };
    }

    // ensure chosenOptions exists
    selection.chosenOptions = selection.chosenOptions || {};
    // set/override the choice for this ui_id
    selection.chosenOptions[ui_id] = value;

    // load adapter
    const config = useRuntimeConfig();
    const owner = config.github?.owner || 'Ocytowine';
    const repo = config.github?.repo || 'ArchiveValmorinTest';
    const branch = config.github?.branch || 'main';
    const token = config.github?.token || '';
    const cacheDir = config.dataCacheDir || '/tmp/data_adapter_cache';

    // import adapter
    let mod = null;
    try {
      mod = await import('~/utils/dataAdapterV2GitHub');
    } catch (e) {
      mod = await import('../../../utils/dataAdapterV2GitHub');
    }
    const DataAdapterV2GitHub = mod?.DataAdapterV2GitHub || mod?.default || mod;
    if (!DataAdapterV2GitHub) throw new Error('DataAdapterV2GitHub not found');

    const adapter = new DataAdapterV2GitHub(owner, repo, { branch, token, cacheDir });

    // import creation adapter
    const caMod = await import('~/utils/creationAdapterServer').catch(() => import('../../../utils/creationAdapterServer'));
    const CreationAdapterServer = caMod?.CreationAdapterServer || caMod?.default || caMod;

    const creationAdapter = new CreationAdapterServer(adapter);
    await creationAdapter.init();

    // build preview using updated selection
    const result = await creationAdapter.buildPreview(selection, baseCharacter);

    return result;
  } catch (err: any) {
    console.error('resolve-choice error', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
