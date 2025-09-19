export class EffectEngine {
  constructor() {}

  async apply(character: any, effect: any) {
    const handler = (this as any)[`handle_${effect.type}`] || this.handle_unknown;
    return handler.call(this, character, effect);
  }

  async handle_stat_modifier(character: any, effect: any) {
    const p = effect.payload || {};
    const stat = p.stat;
    const delta = p.delta || 0;
    if (!stat) throw new Error('stat_modifier missing stat');
    character.final_stats = character.final_stats || { ...(character.base_stats_before_race || {}) };
    character.final_stats[stat] = (character.final_stats[stat] || 0) + delta;
    character._applied = character._applied || [];
    character._applied.push({ effect: effect.id, source: effect.source, type: 'stat_modifier', payload: p });
    return true;
  }

  async handle_spell_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.spellcasting = character.spellcasting || { spells_known: [] };
    if (!character.spellcasting.spells_known) character.spellcasting.spells_known = [];
    if (p.spell_id && !character.spellcasting.spells_known.includes(p.spell_id)) {
      character.spellcasting.spells_known.push(p.spell_id);
    }
    character._applied = character._applied || [];
    character._applied.push({ effect: effect.id, source: effect.source, type: 'spell_grant', payload: p });
    return true;
  }

  async handle_resource_pool(character: any, effect: any) {
    const p = effect.payload || {};
    character.resources = character.resources || {};
    if (!p.id) throw new Error('resource_pool missing id');
    character.resources[p.id] = { max: p.max || 0, current: p.max || 0, recharge: p.recharge || 'long_rest' };
    character._applied = character._applied || [];
    character._applied.push({ effect: effect.id, source: effect.source, type: 'resource_pool', payload: p });
    return true;
  }

  async handle_ability_create(character: any, effect: any) {
    const p = effect.payload || {};
    if (!p.id) throw new Error('ability_create missing id');
    character.abilities = character.abilities || {};
    if (!character.abilities[p.id]) {
      character.abilities[p.id] = { ...p, uses_from: p.uses_from || null };
    }
    character._applied = character._applied || [];
    character._applied.push({ effect: effect.id, source: effect.source, type: 'ability_create', payload: p });
    return true;
  }

  async handle_equipment_grant(character: any, effect: any) {
    const p = effect.payload || {};
    character.equipment = character.equipment || [];
    if (p.item_id) {
      if (!character.equipment.includes(p.item_id)) character.equipment.push(p.item_id);
    }
    character._applied = character._applied || [];
    character._applied.push({ effect: effect.id, source: effect.source, type: 'equipment_grant', payload: p });
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
    character._unknown.push({ effect, note: 'unknown effect type' });
    return true;
  }
}