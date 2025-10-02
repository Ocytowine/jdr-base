// server/api/creation/preview.post.ts
import { readBody } from 'h3';

import { useCreationAdapter } from '~/server/utils/creationAdapter';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const selection = body?.selection ?? {};
    const baseCharacter = body?.baseCharacter ?? { base_stats_before_race: {} };

    const { service } = await useCreationAdapter();
    const result = await service.buildPreview(selection, baseCharacter);

    return result;
  } catch (err: any) {
    console.error('preview endpoint error', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
