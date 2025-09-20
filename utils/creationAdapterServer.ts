import cloneDeep from 'lodash.clonedeep';
import { DataAdapterV2GitHub } from './dataAdapterV2GitHub';
import { EffectEngine } from '~/engine/effectEngine';

type Selection = {
  race?: string;
  subrace?: string;
  class?: string;
  subclass?: string;
  background?: string;
  manual_features?: string[];
  chosenOptions?: Record<string, any>;
};

export class CreationAdapterServer {
  adapter: DataAdapterV2GitHub;
  engine: EffectEngine;

  constructor(adapter: DataAdapterV2GitHub, engine: EffectEngine) {
    this.adapter = adapter;
    this.engine = engine;
  }

  async getCreationSurface() {
    const races = await this.adapter.listRaces();
    const classes = await this.adapter.listClasses();
    return { races, classes };
  }

  // returns { ok, previewCharacter, appliedFeatures, pendingChoices, errors }
  async applyFeaturesToCharacter(selection: Selection, baseCharacter: any) {
    const result: any = { ok: false, errors: [], pendingChoices: [], appliedFeatures: [] };
    const preview = cloneDeep(baseCharacter || {});
    preview.final_stats = preview.final_stats || { ...(preview.base_stats_before_race || {}) };

    const seeds: string[] = [];
    if (selection.race) seeds.push(selection.race);
    if (selection.subrace) seeds.push(selection.subrace);
    if (selection.class) seeds.push(selection.class);
    if (selection.subclass) seeds.push(selection.subclass);
    if (selection.background) seeds.push(selection.background);
    if (selection.manual_features) seeds.push(...selection.manual_features);

    // resolve features recursively
    const features = await this.adapter.resolveFeatureTree(seeds);

    // detect pending choice effects
    for (const f of features) {
      for (const eff of f.effects || []) {
        if (eff.type === 'skill_choice' || eff.type === 'feature_choice') {
          const ui_id = eff.payload?.ui_id || `${f.id}_${eff.id}`;
          const from = Array.isArray(eff.payload?.from) ? eff.payload.from : (eff.payload?.from ? [eff.payload.from] : []);
          result.pendingChoices.push({ ui_id, choose: eff.payload?.choose || 1, from });
        }
      }
    }
    if (result.pendingChoices.length) {
      result.ok = true;
      result.previewCharacter = preview;
      return result;
    }

    // apply effects in priority order
    features.sort((a,b)=> (b.priority||0)-(a.priority||0));
    for (const f of features) {
      for (const eff of f.effects || []) {
        // simple condition check placeholder (to be expanded)
        try {
          await this.engine.apply(preview, eff);
        } catch (e:any) {
          result.errors.push({ source: f.id, message: e.message || String(e) });
          result.ok = false;
          result.previewCharacter = preview;
          return result;
        }
      }
      result.appliedFeatures.push(f.id);
    }

    // finalize derived properties: proficiency bonus, HP, etc.
    // example: proficiency bonus by level (if class level is known)
    const level = preview.level || 1;
    preview.proficiency_bonus = Math.ceil(2 + (level - 1) / 4);
    result.ok = true;
    result.previewCharacter = preview;
    return result;
  }
}