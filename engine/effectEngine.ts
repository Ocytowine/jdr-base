/**
 * EffectEngine - applies a single Effect to a character preview object.
 * Extend handlers for more complex behavior.
 */

export class EffectEngine {
  constructor() {}

  async apply(character: any, effect: any) {
    if (!effect || !effect.type) {
      throw new Error('Invalid effect');
    }
    const handler = (this as any)[`handle_${effect.type}`] || this.handle_unknown;
    return handler.call(this, character, effect);
  }

  async handle_stat_modifier(character: any, effect: any) {
    const p = effect.payload || {};
    const stat = p.stat;
    const delta = p.delta || 0;
    if (!stat) throw new Error('stat_modifier missing stat');
    character.final_stats = character.final_stats || {};
    character.final_stats[stat] = (character.final_stats[stat] || 0) + delta;
    this._pushApplied(character, effect, { stat, delta });
    return true;
  }

  async handle_ability_score_set(character: any, effect: any) {
    const p = effect.payload || {};
    if (!p.stat) throw new Error('ability_score_set missing stat');
    character.final_stats = character.final_stats || {};
    character.final_stats[p.stat] = p.value;
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_proficiency_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.proficiencies = character.proficiencies || { weapons: [], armors: [], tools: [], skills: [] };
    const cat = p.category;
    if (cat === 'weapon' && p.subtype) {
      const list = p.subtype.split(',').map((s:string)=>s.trim());
      character.proficiencies.weapons.push(...list.filter((x:any)=>!character.proficiencies.weapons.includes(x)));
    }
    if (cat === 'skill' && p.subtype) {
      const list = p.subtype.split(',').map((s:string)=>s.trim());
      character.proficiencies.skills.push(...list.filter((x:any)=>!character.proficiencies.skills.includes(x)));
    }
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_spell_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.spellcasting = character.spellcasting || { spells_known: [], slots_table: {} };
    if (p.spell_id && !character.spellcasting.spells_known.includes(p.spell_id)) {
      character.spellcasting.spells_known.push(p.spell_id);
    }
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_spellcasting_feature(character: any, effect: any) {
    const p = effect.payload || {};
    character.spellcasting = character.spellcasting || { spells_known: [], slots_table: {}, ability: p.ability || character.spellcasting?.ability };
    if (p.slots_table) {
      character.spellcasting.slots_table = { ...character.spellcasting.slots_table, ...p.slots_table };
    }
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_resource_pool(character: any, effect: any) {
    const p = effect.payload || {};
    if (!p.id) throw new Error('resource_pool missing id');
    character.resources = character.resources || {};
    character.resources[p.id] = { max: p.max || 0, current: p.max || 0, recharge: p.recharge || 'long_rest' };
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_ability_create(character: any, effect: any) {
    const p = effect.payload || {};
    if (!p.id) throw new Error('ability_create missing id');
    character.abilities = character.abilities || {};
    if (!character.abilities[p.id]) {
      character.abilities[p.id] = { ...p, uses_from: p.uses_from || null };
    }
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_equipment_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.equipment = character.equipment || [];
    if (p.item_id && !character.equipment.includes(p.item_id)) {
      character.equipment.push(p.item_id);
    }
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_temp_hp_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.temp_hp = Math.max(character.temp_hp || 0, p.amount || 0);
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_condition_apply(character: any, effect: any) {
    const p = effect.payload || {};
    character.conditions = character.conditions || [];
    character.conditions.push({ condition_id: p.condition_id, duration: p.duration });
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_resistance_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.resistances = character.resistances || [];
    character.resistances.push({ damage_type: p.damage_type, type: p.type || 'resistance' });
    this._pushApplied(character, effect, p);
    return true;
  }

  async handle_ui_message(character: any, effect: any) {
    const p = effect.payload || {};
    character.messages = character.messages || [];
    character.messages.push({ title: p.title || '', body: p.body || '' });
    return true;
  }

  async handle_unknown(character: any, effect: any) {
    character._unknown = character._unknown || [];
    character._unknown.push(effect);
    return true;
  }

  _pushApplied(character:any, effect:any, info:any) {
    character._applied = character._applied || [];
    character._applied.push({ id: effect.id, source: effect.source, type: effect.type, payload: info });
  }
}