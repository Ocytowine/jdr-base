import { DataAdapterV2GitHub } from '~/dataAdapterV2GitHub';
import { EffectEngine } from '~/engine/effectEngine';
import cloneDeep from 'lodash.clonedeep';

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

  async applyFeaturesToCharacter(selection: Selection, baseCharacter: any) {
    const preview = cloneDeep(baseCharacter || {});
    const seeds: string[] = [];
    if (selection.race) seeds.push(selection.race);
    if (selection.subrace) seeds.push(selection.subrace);
    if (selection.class) seeds.push(selection.class);
    if (selection.subclass) seeds.push(selection.subclass);
    if (selection.background) seeds.push(selection.background);
    if (selection.manual_features) seeds.push(...selection.manual_features);

    const features = await this.adapter.resolveFeatureTree(seeds);
    const pendingChoices: any[] = [];
    // detect choices
    for (const f of features) {
      for (const eff of f.effects || []) {
        if (eff.type === 'skill_choice' && !(selection.chosenOptions && selection.chosenOptions[eff.payload?.ui_id])) {
          pendingChoices.push({ ui_id: eff.payload?.ui_id, choose: eff.payload.choose, from: eff.payload.from });
        }
      }
    }
    if (pendingChoices.length) {
      return { ok: true, pendingChoices, previewCharacter: preview };
    }

    // apply effects
    features.sort((a,b)=>(b.priority||0)-(a.priority||0));
    const appliedFeatures: string[] = [];
    for (const f of features) {
      for (const eff of f.effects || []) {
        // simple condition check placeholder (can be extended)
        try {
          await this.engine.apply(preview, eff);
        } catch (e:any) {
          return { ok: false, errors: [{ source: f.id, message: e.message }], previewCharacter: preview };
        }
      }
      appliedFeatures.push(f.id);
    }

    // finalize: derive final stats if needed
    preview.finalized = true;
    return { ok: true, previewCharacter: preview, appliedFeatures };
  }
}