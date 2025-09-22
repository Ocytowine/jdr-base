// engine/effectEngine.ts
export type Effect = Record<string, any>;
export type Character = Record<string, any>;
export type EvalContext = {
  selection?: any;
  baseCharacter?: Record<string, any>;
  source?: string | null;
  classLevels?: Record<string, number>;
  character?: Character;
  [k: string]: any;
};

function getPayload(effect: Effect): any {
  if (!effect) return {};
  if (effect.payload && typeof effect.payload === 'object') return effect.payload;
  if (effect.raw && effect.raw.payload && typeof effect.raw.payload === 'object') return effect.raw.payload;
  // sometimes the effect itself is actually a payload-like object
  // exclude metadata keys that suggest wrapper
  const keys = Object.keys(effect || {});
  const hasOnlyPayloadKeys = keys.length > 0 && !keys.includes('type') && !keys.includes('id') && !keys.includes('source') && !keys.includes('priority') && !keys.includes('raw');
  if (hasOnlyPayloadKeys) return effect;
  // fallback: return empty object
  return {};
}

function getEffectType(effect: Effect): string {
  if (!effect) return '';
  if (effect.type) return String(effect.type).toLowerCase();
  if (effect.raw && effect.raw.type) return String(effect.raw.type).toLowerCase();
  // try to infer from payload keys
  const payload = getPayload(effect);
  if (payload && (payload.spell_id || payload.spell || payload.slot || payload.slots_table)) return 'spell_grant';
  if (payload && (payload.proficiency || payload.proficiencies || payload.skill)) return 'proficiency_grant';
  if (payload && (payload.stat && payload.delta !== undefined)) return 'stat_modifier';
  return '';
}

function normalizeFieldAliases(payload: any) {
  if (!payload || typeof payload !== 'object') return payload;
  // spell id aliases
  if (!payload.spell_id && payload.spellId && !payload.spell) payload.spell_id = payload.spellId;
  if (!payload.spell_id && payload.spell && typeof payload.spell === 'string') payload.spell_id = payload.spell;
  // feature id aliases
  if (!payload.feature_id && payload.featureId) payload.feature_id = payload.featureId;
  // prof aliases
  if (!payload.proficiency && payload.proficiencies && Array.isArray(payload.proficiencies) && payload.proficiencies.length === 1) {
    payload.proficiency = payload.proficiencies[0];
  }
  // slots table aliases
  if (!payload.slots_table && payload.slots) payload.slots_table = payload.slots;
  return payload;
}

export class EffectEngine {
  opts: any;
  constructor(opts: any = {}) {
    this.opts = opts;
  }

  evaluateSingleCondition(c: any, ctx: EvalContext = {}): boolean {
    if (!c || !c.kind) return true;
    const k = String(c.kind);

    if (k === 'level_gte') {
      const cls = c.class ?? (ctx.selection?.class) ?? null;
      const required = Number(c.value ?? 0);
      const classLevels = ctx.classLevels ?? {};
      const current = Number(classLevels[cls] ?? ctx.selection?.niveau ?? ctx.baseCharacter?.niveau ?? 0);
      return current >= required;
    }

    if (k === 'always' || k === 'true') return true;
    if (k === 'has_feature') {
      const feat = c.feature ?? c.feature_id ?? c.id;
      if (!feat) return false;
      return Array.isArray(ctx.character?.features) && ctx.character.features.includes(feat);
    }
    return true;
  }

  evaluateConditions(conditions: any, ctx: EvalContext = {}): boolean {
    if (!conditions) return true;
    if (conditions.all && Array.isArray(conditions.all)) {
      return conditions.all.every((c: any) => this.evaluateSingleCondition(c, ctx));
    }
    if (conditions.any && Array.isArray(conditions.any)) {
      return conditions.any.some((c: any) => this.evaluateSingleCondition(c, ctx));
    }
    return this.evaluateSingleCondition(conditions, ctx);
  }

  async applyEffect(character: Character, effect: Effect, ctx: EvalContext = {}) {
    if (!effect || typeof effect !== 'object') return;

    // ensure certain arrays exist
    character.features = character.features ?? [];
    character.equipment = character.equipment ?? [];
    character.proficiencies = character.proficiencies ?? [];
    character.senses = character.senses ?? [];
    character.spellcasting = character.spellcasting ?? {};
    character.final_stats = character.final_stats ?? {};
    character.unhandled_effects = character.unhandled_effects ?? [];

    // guard: check conditions
    const cond = effect.conditions ?? effect.payload?.conditions ?? effect.raw?.payload?.conditions ?? null;
    if (cond && !this.evaluateConditions(cond, { ...ctx, character })) return;

    // robust payload / type extraction
    const payload = getPayload(effect);
    normalizeFieldAliases(payload);
    const type = getEffectType(effect);

    try { console.debug('[APPLY_EFFECT] id=%s type=%s source=%s payload=%o', effect.id ?? payload.id ?? '<no-id>', type, effect.source ?? effect.raw?.source ?? ctx.source, payload); } catch (e) {}

    // ---- stat_modifier ----
    if (type === 'stat_modifier' || payload.stat || (payload.delta !== undefined && payload.stat !== undefined)) {
      const stat = String(payload.stat ?? 'all');
      const delta = Number(payload.delta ?? 0);
      if (stat === 'all') {
        for (const k of ['strength','dexterity','constitution','intelligence','wisdom','charisma']) {
          const base = character.base_stats_before_race?.[k] ?? character.final_stats?.[k] ?? 0;
          character.final_stats[k] = (character.final_stats[k] ?? base) + delta;
        }
      } else {
        const base = character.base_stats_before_race?.[stat] ?? character.final_stats?.[stat] ?? 0;
        character.final_stats[stat] = (character.final_stats[stat] ?? base) + delta;
      }
      return;
    }

    // ---- sense_grant ----
    if (type === 'sense_grant' || payload.sense_type || payload.type === 'sense') {
      const sense = {
        sense_type: payload.sense_type ?? payload.type ?? null,
        range: payload.range ?? payload.distance ?? null,
        units: payload.units ?? null,
        source: effect.source ?? effect.raw?.source ?? ctx.source ?? null,
      };
      character.senses.push(sense);
      return;
    }

    // ---- proficiency_grant ----
    if (type === 'proficiency_grant' || payload.proficiency || payload.skill || payload.skills) {
      const profs = payload.proficiency ?? payload.proficiencies ?? payload.skill ?? payload.skills ?? null;
      if (!profs) return;
      if (Array.isArray(profs)) {
        for (const p of profs) if (!character.proficiencies.includes(p)) character.proficiencies.push(p);
      } else {
        if (!character.proficiencies.includes(profs)) character.proficiencies.push(profs);
      }
      return;
    }

    // ---- equipment_grant ----
    if (type === 'equipment_grant' || payload.equipment || payload.item || payload.items) {
      const eq = payload.equipment ?? payload.item ?? payload.items;
      if (!eq) return;
      if (Array.isArray(eq)) {
        for (const i of eq) character.equipment.push(i);
      } else character.equipment.push(eq);
      return;
    }

    // ---- grant_feature ----
    if (type === 'grant_feature' || payload.feature_id || payload.feature) {
      const fid = payload.feature_id ?? payload.feature ?? effect.id ?? null;
      if (!fid) {
        // can't apply, push to unhandled
        character.unhandled_effects.push(effect);
        return;
      }
      if (payload.apply_immediately) {
        if (!character.features.includes(fid)) character.features.push(fid);
      } else {
        // if not immediate, maybe want to add to features or unhandled (depends on semantics)
        // default: add feature id to features (so spells/features can be resolved)
        if (!character.features.includes(fid)) character.features.push(fid);
      }
      return;
    }

    // ---- spell_grant ----
    // Accept many variants: payload.spell_id | payload.spell | payload.id
    if (type === 'spell_grant' || payload.spell_id || payload.spell) {
      character.spellcasting = character.spellcasting ?? {};
      const sc = character.spellcasting;
      sc.known = sc.known ?? [];
      sc.prepared = sc.prepared ?? [];
      const sid = String(payload.spell_id ?? payload.spell ?? payload.id ?? payload.spellId ?? '');
      if (sid) {
        if (payload.known || payload.known === undefined) {
          if (!sc.known.includes(sid)) sc.known.push(sid);
        } else if (payload.prepared) {
          if (!sc.prepared.includes(sid)) sc.prepared.push(sid);
        } else {
          // default known
          if (!sc.known.includes(sid)) sc.known.push(sid);
        }
      } else {
        // no spell id found => unhandled
        character.unhandled_effects.push(effect);
      }
      return;
    }

    // ---- spellcasting feature / slots ----
    if (type === 'spellcasting_feature' || payload.slots_table || payload.slots || payload.ability) {
      character.spellcasting = character.spellcasting ?? {};
      const sc = character.spellcasting;
      if (payload.ability) sc.ability = payload.ability;
      sc.slots = sc.slots ?? {};
      const table = payload.slots_table ?? payload.slots;
      if (table && typeof table === 'object') {
        for (const lvl of Object.keys(table)) sc.slots[lvl] = Number(table[lvl]);
      }
      // known spells in payload
      if (Array.isArray(payload.known)) {
        sc.known = sc.known ?? [];
        for (const s of payload.known) if (!sc.known.includes(s)) sc.known.push(s);
      }
      sc.meta = sc.meta ?? {};
      const ability = sc.ability ?? payload.ability ?? 'intelligence';
      const abilityScore = character.final_stats?.[ability] ?? character.base_stats_before_race?.[ability] ?? 10;
      const abilityMod = Math.floor((Number(abilityScore) - 10) / 2);
      sc.meta.spell_save_dc = sc.meta.spell_save_dc ?? (10 + abilityMod + (payload.spell_save_dc_mod ?? 0));
      sc.meta.spell_attack_mod = sc.meta.spell_attack_mod ?? (abilityMod + (character.proficiency_bonus ?? 0) + (payload.spell_attack_mod ?? 0));
      sc.features = sc.features ?? [];
      sc.features.push({ id: effect.id, payload });
      return;
    }

    // ---- casting_modifier ----
    if (type === 'casting_modifier' || payload.apply_to || payload.spell_attack_bonus_delta !== undefined || payload.spell_save_dc_delta !== undefined) {
      character.spellcasting = character.spellcasting ?? {};
      const sc = character.spellcasting;
      sc.modifiers = sc.modifiers ?? [];
      sc.modifiers.push({ id: effect.id, payload });
      if (payload.spell_save_dc_delta) {
        sc.meta = sc.meta ?? {};
        sc.meta.spell_save_dc = (sc.meta.spell_save_dc ?? 0) + Number(payload.spell_save_dc_delta);
      }
      if (payload.spell_attack_bonus_delta) {
        sc.meta = sc.meta ?? {};
        sc.meta.spell_attack_mod = (sc.meta.spell_attack_mod ?? 0) + Number(payload.spell_attack_bonus_delta);
      }
      return;
    }

    // fallback -> unrecognized: store for debugging
    character.unhandled_effects.push(effect);
  }

  async applyEffects(character: Character, effectsList: Array<{ source?: string | null; effect: Effect }>, ctx: EvalContext = {}) {
    for (const en of (effectsList || [])) {
      try {
        await this.applyEffect(character, en.effect, { ...ctx, source: en.source, character });
      } catch (err) {
        character.unhandled_effects = character.unhandled_effects ?? [];
        character.unhandled_effects.push({ error: String(err?.message ?? err), effect: en.effect });
        // keep console warning to help debug
        console.warn('[EffectEngine] applyEffect error', err, en.effect?.id ?? en.effect);
      }
    }
  }
}

export default EffectEngine;
