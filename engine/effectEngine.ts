// engine/effectEngine.ts
/**
 * EffectEngine (robust)
 * - initialise les containers attendus
 * - handlers basiques pour spellcasting_feature, casting_modifier, sense_grant
 * - tolérance aux données manquantes (stocke dans unhandled_effects)
 * - calcule spell save DC & spell attack mod si possible (niveau + stat)
 */

export class EffectEngine {
  constructor() {}

  // utilitaires
  private computeProficiencyBonus(level?: number) {
    if (!level || typeof level !== 'number' || level <= 0) return 2;
    return 2 + Math.floor((level - 1) / 4);
  }

  private abilityModifier(statValue: number) {
    return Math.floor((statValue - 10) / 2);
  }

  async applyEffect(character: any, effect: any, ctx: any = {}) {
    // Defensive init
    character.proficiencies = Array.isArray(character.proficiencies) ? character.proficiencies : (character.proficiencies ? [...character.proficiencies] : []);
    character.features = Array.isArray(character.features) ? character.features : (character.features ? [...character.features] : []);
    character.equipment = Array.isArray(character.equipment) ? character.equipment : (character.equipment ? [...character.equipment] : []);
    character.final_stats = character.final_stats || {};
    character.temp_hp = Number(character.temp_hp || 0);
    character.senses = character.senses || [];
    character.unhandled_effects = character.unhandled_effects || [];
    character.legacy_mecanique = character.legacy_mecanique || [];
    character.spellcasting = character.spellcasting || {};
    character.spellcasting.known = Array.isArray(character.spellcasting.known) ? character.spellcasting.known : [];
    character.spellcasting.prepared = Array.isArray(character.spellcasting.prepared) ? character.spellcasting.prepared : [];
    character.spellcasting.slots = character.spellcasting.slots || {};
    character.spellcasting.meta = character.spellcasting.meta || {};
    character.spellcasting.features = character.spellcasting.features || [];
    character.spellcasting.modifiers = character.spellcasting.modifiers || [];

    if (!effect || !effect.type) {
      if (effect && typeof effect === 'object') {
        character.legacy_mecanique.push(effect);
        return;
      }
      character.unhandled_effects.push({ reason: 'invalid_effect_format', effect });
      return;
    }

    const payload = effect.payload || {};

    switch (effect.type) {
      case 'stat_modifier': {
        const stat = payload.stat;
        const delta = Number(payload.delta || 0);
        if (!stat) {
          character.unhandled_effects.push({ reason: 'stat_modifier_missing_stat', effect });
          return;
        }
        const before = Number(character.final_stats[stat] ?? character.base_stats_before_race?.[stat] ?? 0);
        character.final_stats[stat] = before + delta;
        return;
      }

      case 'ability_score_set': {
        const stat = payload.stat;
        const value = Number(payload.value);
        if (!stat) {
          character.unhandled_effects.push({ reason: 'ability_score_set_missing_stat', effect });
          return;
        }
        character.final_stats[stat] = value;
        return;
      }

      case 'proficiency_grant': {
        const prof = payload.proficiency;
        if (!prof) {
          character.unhandled_effects.push({ reason: 'proficiency_grant_missing_proficiency', effect });
          return;
        }
        if (!character.proficiencies.includes(prof)) character.proficiencies.push(prof);
        return;
      }

      case 'grant_feature': {
        const id = payload.id;
        if (!id) {
          character.unhandled_effects.push({ reason: 'grant_feature_missing_id', effect });
          return;
        }
        if (!character.features.includes(id)) character.features.push(id);
        return;
      }

      case 'equipment_grant': {
        const id = payload.id;
        const qty = Number(payload.qty || 1);
        if (!id) {
          character.unhandled_effects.push({ reason: 'equipment_grant_missing_id', effect });
          return;
        }
        for (let i = 0; i < qty; i++) character.equipment.push({ id });
        return;
      }

      case 'spell_grant': {
        const spellId = payload.spell_id;
        if (!spellId) {
          character.unhandled_effects.push({ reason: 'spell_grant_missing_spell_id', effect });
          return;
        }
        if (payload.known) {
          if (!character.spellcasting.known.includes(spellId)) character.spellcasting.known.push(spellId);
        }
        if (payload.prepared) {
          if (!character.spellcasting.prepared.includes(spellId)) character.spellcasting.prepared.push(spellId);
        }
        return;
      }

      case 'temp_hp_grant': {
        const v = Number(payload.value || 0);
        character.temp_hp = Math.max(Number(character.temp_hp || 0), v);
        return;
      }

      case 'spellcasting_feature': {
        // merge slots_table
        if (payload.slots_table && typeof payload.slots_table === 'object') {
          for (const lvlKey of Object.keys(payload.slots_table)) {
            const want = Number(payload.slots_table[lvlKey] || 0);
            const now = Number(character.spellcasting.slots[lvlKey] || 0);
            character.spellcasting.slots[lvlKey] = Math.max(now, want);
          }
        }
        if (payload.ability) character.spellcasting.ability = payload.ability;
        // merge meta
        character.spellcasting.meta = Object.assign({}, character.spellcasting.meta || {}, payload.meta || {});
        // store the feature record for UI / debugging
        character.spellcasting.features.push({ id: effect.id || payload.id || null, payload });

        // Try to compute spell save DC / attack if level & ability stat known
        try {
          const level = Number(ctx?.character?.niveau ?? ctx?.selection?.niveau ?? ctx?.baseCharacter?.niveau ?? ctx?.level ?? ctx?.characterLevel);
          const proficiencyBonus = this.computeProficiencyBonus(level);
          const ability = character.spellcasting.ability || payload.ability;
          if (ability && (character.final_stats?.[ability] ?? character.base_stats_before_race?.[ability] !== undefined)) {
            const statVal = Number(character.final_stats?.[ability] ?? character.base_stats_before_race?.[ability] ?? 10);
            const abilityMod = this.abilityModifier(statVal);
            const dcDelta = Number(payload.spell_save_dc_mod || 0);
            const atkDelta = Number(payload.spell_attack_mod || 0);
            character.spellcasting.meta.spell_save_dc = 8 + proficiencyBonus + abilityMod + dcDelta;
            character.spellcasting.meta.spell_attack_mod = proficiencyBonus + abilityMod + atkDelta;
          }
        } catch (e) {
          // non critique : on stocke le cas
          character.spellcasting.meta._compute_error = String(e);
        }

        return;
      }

      case 'casting_modifier': {
        character.spellcasting.modifiers.push({ id: effect.id || payload.id || null, payload });
        return;
      }

      case 'sense_grant': {
        const sense = payload.sense_type || payload.type || null;
        if (!sense) {
          character.unhandled_effects.push({ reason: 'sense_grant_missing_type', effect });
          return;
        }
        character.senses.push({ type: sense, range: payload.range, units: payload.units, raw: payload });
        return;
      }

      case 'legacy_mecanique': {
        character.legacy_mecanique.push(payload);
        return;
      }

      default:
        character.unhandled_effects.push(effect);
        return;
    }
  }
}
