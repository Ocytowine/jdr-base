// server/api/creation/complete.post.ts
import { readBody } from 'h3';
import { useCreationAdapter } from '~/server/utils/creationAdapter';

type Id = string;

type CompletionRequest = {
  selection?: {
    class?: Id | null;
    race?: Id | null;
    background?: Id | null;
    niveau?: number;
    chosenOptions?: Record<string, any>;
  } | null;
  previewCharacter?: any | null;
  personnage?: any | null;
};

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CompletionRequest;
    const selection = body?.selection ?? {};
    const previewCharacter = body?.previewCharacter ?? {};
    const personnage = body?.personnage ?? {};

    const { service } = await useCreationAdapter();
    const adapter: any = (service as any).adapter;

    const out = {
      classes: {} as Record<string, any>,
      races: {} as Record<string, any>,
      backgrounds: {} as Record<string, any>,
      // map of feature id -> raw payload
      features: {} as Record<string, any>,
      // map of spell id -> raw payload
      spells: {} as Record<string, any>,
      // map of item id -> raw payload
      items: {} as Record<string, any>
    };

    const loadById = async (id: any): Promise<any | null> => {
      const str = id === undefined || id === null ? '' : String(id);
      if (!str) return null;
      try {
        const raw = await adapter?.loadRaw?.(str);
        if (raw && typeof raw === 'object') {
          if (raw.id === undefined || raw.id === null) raw.id = str;
          return raw;
        }
      } catch (err) {
        // ignore individual failures
      }
      return null;
    };

    // Primary entities
    const classId = selection?.class ?? null;
    const raceId = selection?.race ?? null;
    const backgroundId = selection?.background ?? null;
    const cls = await loadById(classId);
    const rc = await loadById(raceId);
    const bg = await loadById(backgroundId);
    if (cls && classId) out.classes[String(classId)] = cls;
    if (rc && raceId) out.races[String(raceId)] = rc;
    if (bg && backgroundId) out.backgrounds[String(backgroundId)] = bg;

    // Applied features (includes class/race/background and granted features)
    const appliedFeatures: string[] = Array.isArray((previewCharacter as any)?.features)
      ? (previewCharacter as any).features
      : Array.isArray((previewCharacter as any)?.appliedFeatures)
        ? (previewCharacter as any).appliedFeatures
        : Array.isArray((body as any)?.appliedFeatures)
          ? (body as any).appliedFeatures
          : Array.isArray((body as any)?.preview?.appliedFeatures)
            ? (body as any).preview.appliedFeatures
            : Array.isArray((body as any)?.applied)
              ? (body as any).applied
              : [];

    // Also include selection.chosenOptions values as possible feature ids
    const chosenOptionIds: string[] = (() => {
      const out: string[] = [];
      const co = selection?.chosenOptions && typeof selection.chosenOptions === 'object' ? selection!.chosenOptions! : {};
      for (const v of Object.values(co)) {
        if (Array.isArray(v)) out.push(...v.map((x) => String(x)));
        else if (v !== undefined && v !== null) out.push(String(v));
      }
      return out;
    })();

    const featureIds = Array.from(new Set<string>([...appliedFeatures.map(String), ...chosenOptionIds]));
    for (const fid of featureIds) {
      const raw = await loadById(fid);
      if (raw) out.features[fid] = raw;
    }

    // Spells from previewCharacter.spellcasting { known, prepared }
    const spellcasting = (previewCharacter && typeof previewCharacter === 'object') ? (previewCharacter as any).spellcasting : null;
    const spellIds: string[] = [];
    if (spellcasting && typeof spellcasting === 'object') {
      if (Array.isArray(spellcasting.known)) spellIds.push(...spellcasting.known.map((s: any) => String(s)));
      if (Array.isArray(spellcasting.prepared)) spellIds.push(...spellcasting.prepared.map((s: any) => String(s)));
    }
    for (const sid of Array.from(new Set(spellIds))) {
      const raw = await loadById(sid);
      if (raw) out.spells[sid] = raw;
    }

    // Items from personnage.inventaire -> use provided minimal ids (stable repo ids)
    const inv: any[] = Array.isArray(personnage?.inventaire) ? personnage!.inventaire : [];
    const itemIds = Array.from(new Set(inv.map((it: any) => String(it?.id ?? '')).filter((s) => s.length > 0)));
    for (const iid of itemIds) {
      const raw = await loadById(iid);
      if (raw) out.items[iid] = raw;
    }

    return { ok: true, enriched: out };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
});
