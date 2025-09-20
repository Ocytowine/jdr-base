/**
 * utils/creationAdapterServer.ts  (updated)
 * - robust previewChar init
 * - apply chosenOptions if present
 * - when engine.applyEffect fails we push result.errors entries that include the full effect object
 */

import { EffectEngine } from '../engine/effectEngine'

export interface Selection {
  race?: string | null;
  subrace?: string | null;
  class?: string | null;
  subclass?: string | null;
  background?: string | null;
  manual_features?: string[];
  chosenOptions?: Record<string, any>;
  niveau?: number;
}

export interface BaseCharacter {
  base_stats_before_race: Record<string, number>;
  nom?: string;
  niveau?: number;
  features?: string[];
  equipment?: any[];
  spellcasting?: any;
  proficiencies?: string[];
  [k: string]: any;
}

export class CreationAdapterServer {
  adapter: any;
  engine: EffectEngine;
  constructor(adapterInstance: any) {
    this.adapter = adapterInstance;
    this.engine = new EffectEngine();
  }

  async init() {
    if (this.adapter && typeof this.adapter.initIndex === 'function') {
      await this.adapter.initIndex();
    }
  }

  async buildPreview(selection: Selection, baseCharacter: BaseCharacter) {
    const result: any = {
      ok: true,
      previewCharacter: null,
      appliedFeatures: [],
      pendingChoices: [],
      errors: []
    };

    try {
      const seeds: string[] = [];
      if (selection?.class) seeds.push(selection.class);
      if (selection?.subclass) seeds.push(selection.subclass);
      if (selection?.race) seeds.push(selection.race);
      if (selection?.subrace) seeds.push(selection.subrace);
      if (selection?.background) seeds.push(selection.background);
      if (Array.isArray(selection?.manual_features)) seeds.push(...selection.manual_features);

      if (this.adapter && typeof this.adapter.initIndex === 'function') {
        await this.adapter.initIndex();
      }

      let resolved: any[] = [];
      if (this.adapter && typeof this.adapter.resolveFeatureTree === 'function') {
        resolved = await this.adapter.resolveFeatureTree(seeds, 20);
      } else {
        for (const id of seeds) {
          if (this.adapter && typeof this.adapter.loadFeatureById === 'function') {
            const f = await this.adapter.loadFeatureById(id);
            if (f) resolved.push(f);
          }
        }
      }

      const allEffects: any[] = [];

      for (const f of resolved) {
        const id = f.id || f.raw?.id || f.raw?.name || null;
        const ui_id = f.raw?.ui_id || f.id || id || `choice_${Math.random().toString(36).slice(2,8)}`;

        const hasChoice = Boolean(f.raw && (f.raw.choose || f.raw.from));
        const providedValue = selection?.chosenOptions?.[ui_id];

        if (hasChoice && providedValue !== undefined && providedValue !== null) {
          const chosenArr = Array.isArray(providedValue) ? providedValue : [providedValue];
          for (const chosen of chosenArr) {
            try {
              if (typeof chosen === 'string') {
                if (Array.isArray(f.raw.from) && f.raw.from.includes(chosen)) {
                  try {
                    const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(chosen) : null;
                    if (gf) {
                      if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: chosen, effect: e });
                      else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: chosen, effect: e });
                      result.appliedFeatures.push(gf.id || chosen);
                      continue;
                    }
                  } catch (e) { /* ignore */ }
                }

                if (Array.isArray(f.raw.from)) {
                  const candidate = f.raw.from.find((x: any) => {
                    if (!x) return false;
                    if (typeof x === 'string') return false;
                    return x.id === chosen || x.value === chosen || x.name === chosen;
                  });
                  if (candidate) {
                    if (Array.isArray(candidate.effects)) for (const e of candidate.effects) allEffects.push({ source: id, effect: e });
                    if (Array.isArray(candidate.grants)) {
                      for (const gid of candidate.grants) {
                        try {
                          const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(gid) : null;
                          if (gf) {
                            if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: gid, effect: e });
                            else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: gid, effect: e });
                            result.appliedFeatures.push(gf.id || gid);
                          }
                        } catch (e) {
                          result.errors.push({ type: 'choice_grant_load', id: gid, message: String(e), effect: { sourceFeature: id, candidate } });
                        }
                      }
                    }
                    continue;
                  }
                }

                try {
                  const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(chosen) : null;
                  if (gf) {
                    if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: chosen, effect: e });
                    else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: chosen, effect: e });
                    result.appliedFeatures.push(gf.id || chosen);
                    continue;
                  }
                } catch (e) {
                  result.errors.push({ type: 'choice_resolve', ui_id, choice: chosen, message: String(e) });
                }
              }

              if (typeof chosen === 'object' && chosen !== null) {
                if (Array.isArray(chosen.effects)) for (const e of chosen.effects) allEffects.push({ source: id, effect: e });
                if (Array.isArray(chosen.grants)) {
                  for (const gid of chosen.grants) {
                    try {
                      const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(gid) : null;
                      if (gf) {
                        if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: gid, effect: e });
                        else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: gid, effect: e });
                        result.appliedFeatures.push(gf.id || gid);
                      }
                    } catch (e) {
                      result.errors.push({ type: 'choice_grant_load', id: gid, message: String(e), effect: { sourceFeature: id, candidate: chosen } });
                    }
                  }
                }
                if (chosen.id) {
                  try {
                    const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(chosen.id) : null;
                    if (gf) {
                      if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: chosen.id, effect: e });
                      else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: chosen.id, effect: e });
                      result.appliedFeatures.push(gf.id || chosen.id);
                    }
                  } catch (e) {
                    result.errors.push({ type: 'choice_grant_load', id: chosen.id, message: String(e), effect: { sourceFeature: id, candidate: chosen } });
                  }
                }
              }
            } catch (e) {
              result.errors.push({ type: 'choice_resolve', ui_id, message: String(e) });
            }
          } // chosenArr loop
        } else {
          if (hasChoice) {
            result.pendingChoices.push({
              ui_id,
              featureId: id,
              choose: f.raw?.choose || null,
              from: f.raw?.from || null,
              note: f.raw?.note || f.raw?.description || null
            });
          }
        }

        // add feature's own effects
        if (Array.isArray(f.effects)) for (const e of f.effects) allEffects.push({ source: id, effect: e });
        else if (f.raw && f.raw.effects) for (const e of f.raw.effects) allEffects.push({ source: id, effect: e });
        else if (f.raw && f.raw.mecanique) allEffects.push({ source: id, effect: { type: 'legacy_mecanique', payload: f.raw.mecanique }});

        // expand grants
        if (f.raw && Array.isArray(f.raw.grants)) {
          for (const gid of f.raw.grants) {
            try {
              const gf = (this.adapter && typeof this.adapter.loadFeatureById === 'function') ? await this.adapter.loadFeatureById(gid) : null;
              if (gf) {
                if (Array.isArray(gf.effects)) for (const e of gf.effects) allEffects.push({ source: gid, effect: e });
                else if (gf.raw && Array.isArray(gf.raw.effects)) for (const e of gf.raw.effects) allEffects.push({ source: gid, effect: e });
                result.appliedFeatures.push(gf.id || gid);
              }
            } catch (e) {
              result.errors.push({ type: 'grant_load', id: gid, message: String(e), effect: { sourceFeature: id, grantId: gid } });
            }
          }
        }

        if (!result.appliedFeatures.includes(id)) result.appliedFeatures.push(id);
      } // end resolved loop

      // Build initial preview character with robust defaults
      const previewChar: any = {
        ...baseCharacter,
        final_stats: { ...(baseCharacter.final_stats || {} )},
        features: Array.isArray(baseCharacter.features) ? [...baseCharacter.features] : [],
        equipment: Array.isArray(baseCharacter.equipment) ? [...baseCharacter.equipment] : [],
        spellcasting: {
          known: Array.isArray(baseCharacter?.spellcasting?.known) ? [...baseCharacter.spellcasting.known] : [],
          prepared: Array.isArray(baseCharacter?.spellcasting?.prepared) ? [...baseCharacter.spellcasting.prepared] : [],
          slots: baseCharacter?.spellcasting?.slots ? { ...baseCharacter.spellcasting.slots } : {},
          meta: baseCharacter?.spellcasting?.meta ? { ...baseCharacter.spellcasting.meta } : {},
          features: Array.isArray(baseCharacter?.spellcasting?.features) ? [...baseCharacter.spellcasting.features] : [],
          modifiers: Array.isArray(baseCharacter?.spellcasting?.modifiers) ? [...baseCharacter.spellcasting.modifiers] : []
        },
        proficiencies: Array.isArray(baseCharacter.proficiencies) ? [...baseCharacter.proficiencies] : []
      };

      // Apply effects via engine (with enriched errors including effect object)
      for (const entry of allEffects) {
        try {
          // pass some context for computing (level, baseCharacter)
          await this.engine.applyEffect(previewChar, entry.effect, { source: entry.source, selection, baseCharacter, character: previewChar, level: selection?.niveau ?? baseCharacter?.niveau });
        } catch (e) {
          result.errors.push({ type: 'effect_apply', source: entry.source, message: String(e), effect: entry.effect });
        }
      }

      result.previewCharacter = previewChar;
      return result;
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }
}
