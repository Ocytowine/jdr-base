// engine/effectEngine.ts
// Engine léger pour appliquer des effets normalisés sur une "preview" de personnage.
// Expose à la fois un export nommé et un export default.

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

export class EffectEngine {
  opts: any;
  constructor(opts: any = {}) {
    this.opts = opts;
  }

  // Evaluate a single "atomic" condition object (returns boolean).
  // Supports at least: level_gte, always/true, has_feature.
  evaluateSingleCondition(c: any, ctx: EvalContext = {}): boolean {
    if (!c || !c.kind) return true;
    const k = String(c.kind);

    // -- level_gte: check class level in various fallbacks
    if (k === 'level_gte') {
      const selRaw = ctx.selection;
      const selObj = (typeof selRaw === 'object' && selRaw !== null) ? selRaw : { class: selRaw, niveau: Number(ctx.selection_niveau ?? ctx.niveau ?? 0) };

      const cls = c.class ?? selObj.class ?? null;
      const required = Number(c.value ?? 0);

      const classLevels = ctx.classLevels ?? {};
      const current = Number(
        (cls && classLevels && classLevels[cls] !== undefined) ? classLevels[cls] :
        (selObj && selObj.niveau !== undefined ? selObj.niveau :
        (ctx.baseCharacter?.niveau ?? ctx.selection?.niveau ?? 0))
      );

      return current >= required;
    }

    if (k === 'always' || k === 'true') return true;

    if (k === 'has_feature') {
      const feat = c.feature ?? c.feature_id ?? c.id;
      if (!feat) return false;
      return Array.isArray(ctx.character?.features) && ctx.character.features.includes(feat);
    }

    // Unknown condition - default true (non-blocking)
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
    // single condition object
    return this.evaluateSingleCondition(conditions, ctx);
  }

  // Apply a single normalized effect to the preview character (mutates character).
  async applyEffect(character: Character, effect: Effect, ctx: EvalContext = {}) {
    if (!effect || typeof effect !== 'object') return;

    // ensure shapes
    character.features = character.features ?? [];
    character.equipment = character.equipment ?? [];
    character.proficiencies = character.proficiencies ?? [];
    character.senses = character.senses ?? [];
    character.spellcasting = character.spellcasting ?? {};
    character.final_stats = character.final_stats ?? {};
    character.unhandled_effects = character.unhandled_effects ?? [];

    // check conditions
    const cond = effect.conditions ?? effect.payload?.conditions ?? null;
    if (cond && !this.evaluateConditions(cond, { ...ctx, character })) {
      // skip applying this effect
      return;
    }

    const type = String(effect.type ?? '').toLowerCase();
    const payload = effect.payload ?? {};

    // DEBUG log (structured)
    try {
      // eslint-disable-next-line no-console
      console.debug('[DEBUG APPLY_EFFECT]', {
        effect: effect.id ?? payload?.id ?? null,
        type,
        source: effect.source ?? ctx.source ?? null,
        classLevels: ctx.classLevels ?? null,
        selection: ctx.selection ?? null,
      });
    } catch {}

    // --- stat modifier ---
    if (type === 'stat_modifier' || payload.stat || payload.delta !== undefined) {
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

    // --- sense grant ---
    if (type === 'sense_grant') {
      const sense = {
        sense_type: payload.sense_type ?? payload.type ?? 'unknown',
        range: payload.range ?? payload.distance ?? null,
        units: payload.units ?? payload.unit ?? null,
        source: effect.source ?? ctx.source ?? null,
      };
      character.senses.push(sense);
      return;
    }

    // --- proficiency grant / skill choice processed elsewhere ---
    if (type === 'proficiency_grant' || type === 'proficiency') {
      const profs = payload.proficiency ?? payload.proficiencies ?? payload.skill ?? null;
      if (!profs) return;
      if (Array.isArray(profs)) {
        for (const p of profs) if (!character.proficiencies.includes(p)) character.proficiencies.push(p);
      } else {
        if (!character.proficiencies.includes(profs)) character.proficiencies.push(profs);
      }
      return;
    }

    // --- equipment grant ---
    if (type === 'equipment_grant' || type === 'equipment') {
      const eq = payload.equipment ?? payload.item ?? payload.items ?? null;
      if (!eq) return;
      if (Array.isArray(eq)) character.equipment.push(...eq);
      else character.equipment.push(eq);
      return;
    }

    // --- grant_feature ---
    if (type === 'grant_feature') {
      const fid = payload.feature_id ?? payload.featureId ?? payload.id ?? payload.feature ?? effect.id ?? null;
      if (!fid) {
        // malformed grant_feature -> put in unhandled
        character.unhandled_effects.push(effect);
        return;
      }
      if (payload.apply_immediately) {
        if (!character.features.includes(fid)) character.features.push(fid);
      } else {
        character.unhandled_effects.push(effect);
      }
      return;
    }

    // --- spellcasting ---
    if (type === 'spellcasting_feature' || /spellcast/i.test(type)) {
      character.spellcasting = character.spellcasting ?? {};
      const sc = character.spellcasting;

      // ability
      if (payload.ability) sc.ability = payload.ability;

      // merge slots (prefer payload)
      sc.slots = sc.slots ?? {};
      if (payload.slots_table && typeof payload.slots_table === 'object') {
        for (const lvl of Object.keys(payload.slots_table)) {
          sc.slots[lvl] = Number(payload.slots_table[lvl]);
        }
      }

      // known spells
      if (Array.isArray(payload.known) && payload.known.length) {
        sc.known = sc.known ?? [];
        for (const s of payload.known) if (!sc.known.includes(s)) sc.known.push(s);
      }
      if (Array.isArray(payload.known_spells) && payload.known_spells.length) {
        sc.known = sc.known ?? [];
        for (const s of payload.known_spells) if (!sc.known.includes(s)) sc.known.push(s);
      }

      // meta: compute basic spell save DC & attack mod if possible
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

    // fallback: push to unhandled_effects for inspection/debug
    character.unhandled_effects.push(effect);
  }

  // Apply a list of effects (each item: { source, effect })
  async applyEffects(character: Character, effectsList: Array<{ source?: string | null; effect: Effect }>, ctx: EvalContext = {}) {
    for (const en of (effectsList || [])) {
      try {
        await this.applyEffect(character, en.effect, { ...ctx, source: en.source, character });
      } catch (err) {
        // defensive: push as unhandled error on character
        character.unhandled_effects = character.unhandled_effects ?? [];
        character.unhandled_effects.push({ error: String(err?.message ?? err), effect: en.effect });
        // eslint-disable-next-line no-console
        console.warn('[EffectEngine] applyEffect error', err);
      }
    }
  }
}

// default compatibility
export default EffectEngine;
