// utils/normalizeEffect.ts
/**
 * normalizeEffect.ts
 * - normalizeEffect(effect): normalize différentes variantes de shape vers des champs canoniques
 * - normalizeEffects(effects): map + filter
 * - extractChoiceDescriptor(feature): extrait un pendingChoice standardisé si présent
 *
 * Exporte les fonctions nommées pour les imports destructurés.
 */

export type AnyObject = Record<string, any>;

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
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

  // choice-like normalization
  if (e.type && /choice/i.test(String(e.type))) {
    e.type = 'choice';
    e.payload.choose = Number(e.payload.choose ?? e.raw?.choose ?? e.payload?.count ?? null) || (e.payload?.choose === 0 ? 0 : e.payload.choose ?? 1);

    let fromCandidate = e.payload.from ?? e.raw?.from ?? e.raw?.payload?.from ?? null;
    if (typeof fromCandidate === 'string') fromCandidate = [fromCandidate];
    else if (!Array.isArray(fromCandidate) && fromCandidate && typeof fromCandidate === 'object') {
      if (Array.isArray(fromCandidate.items)) {
        fromCandidate = fromCandidate.items.map((x: any) => x.id ?? x.value ?? x.name ?? x);
      } else {
        fromCandidate = Object.values(fromCandidate).map((x: any) => (typeof x === 'object' ? (x.id ?? x.value ?? x.name ?? x) : x));
      }
    }
    if (!Array.isArray(fromCandidate)) fromCandidate = fromCandidate ?? [];
    e.payload.from = fromCandidate;
  } else {
    if (e.payload?.choose || e.payload?.from) {
      e.payload.choose = Number(e.payload.choose ?? 1);
      if (typeof e.payload.from === 'string') e.payload.from = [e.payload.from];
    }
  }

  // spellcasting_feature: ensure slots_table is object
  if (e.type === 'spellcasting_feature' || e.payload?.slots_table) {
    if (typeof e.payload.slots_table === 'string') {
      try { e.payload.slots_table = JSON.parse(e.payload.slots_table); } catch {}
    }
    if (!e.payload.slots_table || typeof e.payload.slots_table !== 'object') {
      e.payload.slots_table = e.payload.slots_table ?? {};
    }
  }

  // preserve conditions if nested under payload
  if (!e.conditions && e.payload?.conditions) {
    e.conditions = e.payload.conditions;
  }

  // keep original raw for debugging
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

  let from = payload?.from ?? feat.raw?.from ?? null;
  if (typeof from === 'string') from = [from];
  if (!Array.isArray(from) && from && typeof from === 'object') {
    if (Array.isArray(from.items)) {
      from = from.items.map((x: any) => x.id ?? x.value ?? x.name ?? x);
    } else {
      from = Object.values(from).map((x: any) => (typeof x === 'object' ? (x.id ?? x.value ?? x.name ?? x) : x));
    }
  }
  if (!Array.isArray(from)) from = [];

  const featureId = feat.id ?? feat.raw?.id ?? payload?.feature_id ?? payload?.featureId ?? null;

  return {
    ui_id,
    featureId,
    choose,
    from,
    type,
    raw: feat
  };
}

// default export for convenience, plus named exports
export default {
  normalizeEffect,
  normalizeEffects,
  extractChoiceDescriptor
};
