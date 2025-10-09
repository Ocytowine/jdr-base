// server/api/creation/preview.post.ts
import { readBody } from 'h3';

import { useCreationAdapter, resetCreationAdapter } from '~/server/utils/creationAdapter';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const selection = body?.selection ?? {};
    const baseCharacter = body?.baseCharacter ?? { base_stats_before_race: {} };

    const { service } = await (async () => {
      if (body?.forceReset) {
        resetCreationAdapter();
      }
      return await useCreationAdapter();
    })();
    const result = await service.buildPreview(selection, baseCharacter);

    try {
      const keptKeys = Array.isArray((body as any)?.keptItemKeys)
        ? new Set<string>((body as any).keptItemKeys.map((k: any) => String(k)))
        : null;

      const pc = (result as any)?.previewCharacter ?? {};
      const proposals = Array.isArray(pc.item_proposals) ? pc.item_proposals : [];
      const allItems = proposals.flatMap((g: any) => Array.isArray(g?.items) ? g.items : []);
      const filtered = keptKeys ? allItems.filter((it: any) => keptKeys.has(String(it.key))) : allItems;
      const equipment = filtered.map((it: any) => ({
        key: String(it.key),
        id: String(it.itemId ?? it.id ?? ''),
        label: it.label ?? it.resolved?.nom ?? it.itemId ?? 'Objet',
        type: it.type ?? it.resolved?.type ?? null,
        quantity: Number(it.quantity ?? 1),
        weight: Number(it.weight?.total ?? it.weightTotal ?? it.resolved?.weight ?? 0),
        value: it.coins ?? it.resolved?.value ?? null,
        resolved: it.resolved ?? null
      }));

      (result as any).previewCharacter = {
        ...(result as any).previewCharacter,
        equipment
      };
    } catch (e) {
      // swallow mapping errors to not block preview
    }

    return result;
  } catch (err: any) {
    console.error('preview endpoint error', err);
    return { ok: false, error: err?.message || String(err) };
  }
});
