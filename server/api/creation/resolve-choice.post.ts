// server/api/creation/resolve-choice.post.ts
import { readBody } from 'h3';

import { useCreationAdapter } from '~/server/utils/creationAdapter';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const ui_id = body?.ui_id;
    if (!ui_id) {
      return { ok: false, error: 'ui_id required' };
    }

    const selection = (body?.selection ?? {}) as Record<string, any>;
    const baseCharacter = body?.baseCharacter ?? { base_stats_before_race: {} };
    const value = body?.value;

    selection.chosenOptions = selection.chosenOptions || {};
    selection.chosenOptions[ui_id] = value;

    const { service } = await useCreationAdapter();
    const result = await service.buildPreview(selection, baseCharacter);

    return result;
  } catch (err: any) {
    console.error('resolve-choice error', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
