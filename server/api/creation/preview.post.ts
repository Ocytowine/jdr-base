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
      const keptKeysRaw = Array.isArray((body as any)?.keptItemKeys) ? (body as any).keptItemKeys : null;
      const keptKeys = keptKeysRaw ? new Set<string>(keptKeysRaw.map((k: any) => String(k))) : null;

      const pc = (result as any)?.previewCharacter ?? {};
      const proposalsRaw = Array.isArray(pc.item_proposals) ? pc.item_proposals : [];

      const toNumber = (value: unknown): number => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      const coinsObjectToCopper = (coins: any): number =>
        toNumber(coins?.gold ?? 0) * 100 + toNumber(coins?.silver ?? 0) * 10 + toNumber(coins?.copper ?? 0);
      const copperToCoins = (value: number) => {
        const normalized = Math.max(0, Math.round(value));
        const gold = Math.floor(normalized / 100);
        const silver = Math.floor((normalized % 100) / 10);
        const copper = normalized % 10;
        return { gold, silver, copper };
      };

      const annotateItem = (item: any) => {
        const key = String(item?.key ?? item?.itemId ?? item?.id ?? '');
        const kept = keptKeys ? keptKeys.has(key) : true;
        return {
          ...item,
          key,
          kept,
          status: kept ? 'kept' : 'sold'
        };
      };

      const annotatedGroups = proposalsRaw.map((group: any) => ({
        ...group,
        items: Array.isArray(group?.items) ? group.items.map(annotateItem) : []
      }));

      const allItems = annotatedGroups.flatMap((group: any) => group.items);
      const keptItems = allItems.filter((item: any) => item.kept);
      const soldItems = allItems.filter((item: any) => !item.kept);

      const sum = (items: any[], getter: (item: any) => number) =>
        items.reduce((total, item) => total + getter(item), 0);

      const weightTotal = (item: any) => toNumber(item?.weight?.total ?? item?.weightTotal ?? item?.resolved?.weight ?? 0);
      const coinsCopper = (item: any) => {
        if (item?.totalCoinsCopper !== undefined) return toNumber(item.totalCoinsCopper);
        if (item?.coinsCopper !== undefined) return toNumber(item.coinsCopper);
        if (item?.coins) return coinsObjectToCopper(item.coins);
        if (item?.resolved?.value) return coinsObjectToCopper(item.resolved.value);
        return 0;
      };
      const sellCopper = (item: any) => {
        if (item?.totalSellValueCopper !== undefined) return toNumber(item.totalSellValueCopper);
        if (item?.sellValueCopper !== undefined) return toNumber(item.sellValueCopper);
        if (item?.sellValue) return coinsObjectToCopper(item.sellValue);
        if (item?.resolved?.sellValue) return coinsObjectToCopper(item.resolved.sellValue);
        return 0;
      };

      const coinsFromKeptCopper = sum(keptItems, coinsCopper);
      const coinsFromSalesCopper = sum(soldItems, sellCopper);
      const finalCoinsCopper = coinsFromKeptCopper + coinsFromSalesCopper;

      const mapDecisionEntry = (item: any) => ({
        key: item.key,
        id: String(item.itemId ?? item.id ?? ''),
        label: item.label ?? item.resolved?.nom ?? item.itemId ?? 'Objet',
        type: item.type ?? item.resolved?.type ?? null,
        quantity: toNumber(item.quantity ?? 1) || 1,
        weightTotal: weightTotal(item),
        coinsCopper: coinsCopper(item),
        sellValueCopper: sellCopper(item),
        kept: Boolean(item.kept),
        status: item.kept ? 'kept' : 'sold'
      });

      const mapEquipmentEntry = (item: any) => ({
        key: item.key,
        id: String(item.itemId ?? item.id ?? ''),
        label: item.label ?? item.resolved?.nom ?? item.itemId ?? 'Objet',
        type: item.type ?? item.resolved?.type ?? null,
        quantity: toNumber(item.quantity ?? 1) || 1,
        weight: weightTotal(item),
        value: item.coins ?? item.resolved?.value ?? null,
        resolved: item.resolved ?? null,
        kept: Boolean(item.kept),
        status: item.kept ? 'kept' : 'sold',
        sellValueCopper: sellCopper(item)
      });

      const equipment = keptItems.map(mapEquipmentEntry);

      const materialDecisions = {
        kept: keptItems.map(mapDecisionEntry),
        sold: soldItems.map(mapDecisionEntry),
        summary: {
          keptCount: keptItems.length,
          soldCount: soldItems.length,
          weightKept: sum(keptItems, weightTotal),
          weightSold: sum(soldItems, weightTotal),
          coins: {
            kept: copperToCoins(coinsFromKeptCopper),
            fromSales: copperToCoins(coinsFromSalesCopper),
            final: copperToCoins(finalCoinsCopper),
            keptCopper: coinsFromKeptCopper,
            salesCopper: coinsFromSalesCopper,
            finalCopper: finalCoinsCopper
          }
        }
      };

      (result as any).previewCharacter = {
        ...(result as any).previewCharacter,
        equipment,
        item_proposals: annotatedGroups,
        materialDecisions
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
