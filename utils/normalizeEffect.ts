// utils/normalizeEffect.ts
/**
 * normalizeEffect.ts
 * - normalizeEffect(effect): normalize différentes variantes de shape vers des champs canoniques
 * - normalizeEffects(effects): map + filter
 * - extractChoiceDescriptor(feature): extrait un pendingChoice standardisé si présent
 *
 * Améliorations :
 * - robuste extraction des options pour les "choice" depuis plusieurs emplacements
 * - payload.from => string[] (ids)
 * - payload.from_labels => [{id,label}] si available
 */

export type AnyObject = Record<string, any>;

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Helper: extract id/label from a candidate item */
function extractIdLabel(item: any): { id: string | null; label: string | null } {
  if (item === null || item === undefined) return { id: null, label: null };
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
    const s = String(item);
    return { id: s, label: s };
  }
  if (typeof item === 'object') {
    const id = item.id ?? item.value ?? item.key ?? item.name ?? item.code ?? null;
    const label = item.label ?? item.name ?? item.title ?? item.text ?? id ?? (id ? String(id) : null);
    return { id: id !== null ? String(id) : null, label: label !== null ? String(label) : null };
  }
  const s = String(item);
  return { id: s, label: s };
}

/** Normalizes various shapes (array, object with items, single) into array */
function flattenCandidates(candidate: any): any[] {
  if (candidate === undefined || candidate === null) return [];
  if (Array.isArray(candidate)) return candidate;
  // some shapes: { items: [...] } or object mapping
  if (typeof candidate === 'object') {
    if (Array.isArray(candidate.items)) return candidate.items;
    if (candidate.items && typeof candidate.items === 'object') return Array.from(Object.values(candidate.items));
    // if it's an object of keyed options, take values
    return Array.from(Object.values(candidate));
  }
  // primitive -> single-element array
  return [candidate];
}

/**
 * Normalize a single effect/feature object.
 */
export function normalizeEffect(rawEffect: AnyObject | null | undefined): AnyObject | null {
  if (!rawEffect || typeof rawEffect !== 'object') return rawEffect ?? null;

  const e: AnyObject = cloneDeep(rawEffect);

  // Top-level normalization
  e.id = e.id ?? e.payload?.id ?? e.payload?.feature_id ?? e.payload?.featureId ?? e.raw?.id ?? null;
  e.type = e.type ?? e.raw?.type ?? e.payload?.type ?? e.type ?? null;
  e.source = e.source ?? e.raw?.source ?? e.payload?.source ?? e.source ?? null;
  e.priority = e.priority ?? e.raw?.priority ?? e.payload?.priority ?? e.priority ?? 0;

  e.payload = e.payload ?? (e.raw?.payload ? cloneDeep(e.raw.payload) : (e.raw?.mecanique ? { mecanique: e.raw.mecanique } : {}));
  if (!e.payload) e.payload = {};

  // grant_feature: normalize payload.feature_id
  if (e.type === 'grant_feature' || e.payload?.feature_id || e.payload?.featureId || e.payload?.id || e.payload?.feature) {
    e.payload.feature_id = e.payload.feature_id ?? e.payload.featureId ?? e.payload.id ?? e.payload.feature ?? null;
  }

  // spell_grant: normalize spell_id
  if (e.type === 'spell_grant' || e.payload?.spell_id || e.payload?.spellId || e.payload?.id) {
    e.payload.spell_id = e.payload.spell_id ?? e.payload.spellId ?? e.payload.id ?? null;
  }

  // === CHOICE normalization (robuste) ===
  const looksLikeChoice = Boolean((e.type && /choice/i.test(String(e.type))) || e.payload?.choose !== undefined || e.payload?.from !== undefined || e.raw?.choose !== undefined || e.raw?.from !== undefined);
  if (looksLikeChoice) {
    e.type = 'choice';

    // ensure choose is a number (default 1)
    let chooseVal = e.payload?.choose ?? e.payload?.count ?? e.raw?.choose ?? e.raw?.payload?.choose ?? null;
    chooseVal = (chooseVal === null || chooseVal === undefined) ? 1 : Number(chooseVal);
    if (Number.isNaN(chooseVal)) chooseVal = 1;
    e.payload.choose = chooseVal;

    // gather candidates from many possible places
    const candidateSources = [
      e.payload?.from,
      e.raw?.payload?.from,
      e.raw?.from,
      e.payload?.options,
      e.payload?.choices,
      e.raw?.mecanique,
      e.raw?.mecanique?.from,
      e.raw?.choices,
      e.raw?.options,
      e.raw?.payload?.options
    ];

    const seenIds = new Set<string>();
    const ids: string[] = [];
    const labels: Array<{ id: string; label: string }> = [];

    for (const src of candidateSources) {
      if (!src) continue;
      const items = flattenCandidates(src);
      for (const it of items) {
        const { id, label } = extractIdLabel(it);
        if (!id) continue;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          ids.push(id);
          labels.push({ id, label: label ?? id });
        }
      }
      // if we have found at least one id from a candidate source, keep scanning other sources to merge, but don't treat lack as fatal
    }

    // fallback: if no ids found but there is a payload.from that is an array of non-string objects, try to stringify them
    if (ids.length === 0 && Array.isArray(e.payload?.from)) {
      for (const it of e.payload.from) {
        const { id, label } = extractIdLabel(it);
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          ids.push(id);
          labels.push({ id, label: label ?? id });
        }
      }
    }

    // final canonicalization
    e.payload.from = ids;
    if (labels.length) e.payload.from_labels = labels;
    else if (e.payload.from_labels && Array.isArray(e.payload.from_labels)) {
      // try to normalize existing labels if any
      const normalizedLabels: Array<{ id: string; label: string }> = [];
      for (const l of e.payload.from_labels) {
        const { id, label } = extractIdLabel(l);
        if (id) normalizedLabels.push({ id, label: label ?? id });
      }
      if (normalizedLabels.length) e.payload.from_labels = normalizedLabels;
    }

    // ensure payload.from exists as array even if empty
    if (!Array.isArray(e.payload.from)) e.payload.from = [];
  } else {
    // if not explicitly a choice, but has choose/from, normalize basic forms
    if (e.payload?.choose !== undefined || e.payload?.from !== undefined) {
      e.payload.choose = Number(e.payload.choose ?? 1);
      if (typeof e.payload.from === 'string') e.payload.from = [e.payload.from];
      if (!Array.isArray(e.payload.from)) e.payload.from = [];
    }
  }

  // spellcasting_feature: ensure slots_table is object
  if (e.type === 'spellcasting_feature' || e.payload?.slots_table) {
    if (typeof e.payload.slots_table === 'string') {
      try { e.payload.slots_table = JSON.parse(e.payload.slots_table); } catch { /* ignore */ }
    }
    if (!e.payload.slots_table || typeof e.payload.slots_table !== 'object') {
      e.payload.slots_table = e.payload.slots_table ?? {};
    }
  }

  // preserve conditions if nested under payload
  if (!e.conditions && e.payload?.conditions) {
    e.conditions = e.payload.conditions;
  }

  // keep original raw for debugging (if not already present)
  e.raw = e.raw ?? rawEffect;

  return e;
}

/**
 * Normalize array of effects
 */
export function normalizeEffects(effects: any[] | undefined | null): any[] {
  if (!effects || !Array.isArray(effects)) return [];
  return effects.map((ef) => normalizeEffect(ef)).filter(Boolean);
}

/**
 * Extract a standardized pendingChoice descriptor from a normalized feature/effect
 */
export function extractChoiceDescriptor(f: AnyObject): AnyObject | null {
  if (!f || typeof f !== 'object') return null;

  const feat = cloneDeep(f);
  const payload = feat.payload ?? feat.raw?.payload ?? {};
  const type = feat.type ?? feat.raw?.type ?? payload?.type ?? null;

  const looksLikeChoice = Boolean((type && /choice/i.test(String(type))) || payload?.choose !== undefined || payload?.from !== undefined || feat.raw?.choose !== undefined || feat.raw?.from !== undefined);
  if (!looksLikeChoice) return null;

  const ui_id = (payload?.ui_id ?? feat.raw?.ui_id ?? feat.id ?? feat.raw?.id ?? `choice_${Math.random().toString(36).slice(2,8)}`);

  let choose = payload?.choose ?? payload?.count ?? feat.raw?.choose ?? null;
  choose = choose === null || choose === undefined ? 1 : Number(choose);

  // Ensure canonical from array of strings
  let from: string[] = [];
  let from_labels: Array<{id:string,label:string}> = [];

  if (Array.isArray(payload?.from)) {
    from = payload.from.map((x: any) => (typeof x === 'string' ? x : (x && x.id ? x.id : String(x))));
  } else if (Array.isArray(feat.raw?.from)) {
    from = feat.raw.from.map((x: any) => (typeof x === 'string' ? x : (x && x.id ? x.id : String(x))));
  }

  // payload.from_labels if present
  if (Array.isArray(payload?.from_labels)) {
    for (const l of payload.from_labels) {
      const id = l?.id ?? l?.value ?? l?.key ?? null;
      const label = l?.label ?? l?.name ?? l?.title ?? id ?? null;
      if (id) from_labels.push({ id: String(id), label: String(label ?? id) });
    }
  }

  // As a last resort, if no from found but payload has mecanique or raw.mecanique, attempt to flatten it
  if (from.length === 0 && feat.raw?.mecanique) {
    const items = flattenCandidates(feat.raw.mecanique);
    for (const it of items) {
      const { id, label } = extractIdLabel(it);
      if (id && !from.includes(id)) {
        from.push(id);
        from_labels.push({ id, label: label ?? id });
      }
    }
  }

  const featureId = feat.id ?? feat.raw?.id ?? payload?.feature_id ?? payload?.featureId ?? null;

  const descriptor: AnyObject = {
    ui_id,
    featureId,
    choose,
    from,
    from_labels,
    type,
    raw: feat
  };

  return descriptor;
}

// default export for convenience, plus named exports
export default {
  normalizeEffect,
  normalizeEffects,
  extractChoiceDescriptor
};
