// utils/creationAdapterServer.ts
// Adaptateur serveur pour la création : résout features -> normalise -> applique via EffectEngine
// Usage : const svc = new CreationAdapterServer(adapterInstance?); await svc.init(); const res = await svc.buildPreview(selection, baseChar);

import fs from 'fs/promises';
import path from 'path';
import EffectEngine from '~/engine/effectEngine';
import { normalizeEffect, normalizeEffects, extractChoiceDescriptor } from '~/utils/normalizeEffect';

export type Selection = {
  class?: string | null;
  race?: string | null;
  niveau?: number;
  classLevels?: Record<string, number>;
  manual_features?: any[];
  chosenOptions?: Record<string, any>;
  [k: string]: any;
};

export class CreationAdapterServer {
  adapter: any | null;
  engine: EffectEngine;

  constructor(adapterInstance: any = null) {
    this.adapter = adapterInstance;
    this.engine = new EffectEngine();
  }

  async init() {
    if (this.adapter && typeof this.adapter.initIndex === 'function') {
      await this.adapter.initIndex();
    }
  }

  // Fallback read local JSON entity
  async readLocalEntity(kind: 'classes' | 'races', id: string): Promise<any | null> {
    try {
      const fp = path.resolve(process.cwd(), kind, `${id}.json`);
      const txt = await fs.readFile(fp, 'utf-8');
      return JSON.parse(txt);
    } catch (e) {
      return null;
    }
  }

  // Resolve feature tree using adapter if present, otherwise a simple local resolution.
  async resolveFeatureTree(selection: Selection) {
    if (this.adapter && typeof this.adapter.resolveFeatureTree === 'function') {
      return await this.adapter.resolveFeatureTree(selection);
    }

    const out: any[] = [];
    if (selection.class) {
      const cls = await this.readLocalEntity('classes', String(selection.class));
      if (cls) out.push({ originId: selection.class, payload: cls });
    }
    if (selection.race) {
      const rc = await this.readLocalEntity('races', String(selection.race));
      if (rc) out.push({ originId: selection.race, payload: rc });
    }
    return out;
  }

  // Build preview character
  async buildPreview(selectionIn: any = {}, baseCharacterIn: any = {}) {
    try {
      // Normaliser selection : accepter string ou objet
      let selection: Selection;
      if (typeof selectionIn === 'string') {
        selection = { class: selectionIn, niveau: 1, manual_features: [], chosenOptions: {}, classLevels: {} };
      } else {
        selection = { ...(selectionIn ?? {}) } as Selection;
      }
      selection.class = selection.class ?? null;
      selection.niveau = Number(selection.niveau ?? selection.level ?? 1);
      selection.manual_features = selection.manual_features ?? [];
      selection.chosenOptions = selection.chosenOptions ?? {};
      selection.classLevels = selection.classLevels ?? {};

      // Construire classLevels de façon explicite
      const classLevels: Record<string, number> = { ...(selection.classLevels ?? {}) };
      if (selection.class) {
        classLevels[selection.class] = Number(classLevels[selection.class] ?? selection.niveau ?? 1);
      }

      // debug log
      // eslint-disable-next-line no-console
      console.debug('[CREATION PREVIEW] selection normalized', { selection, classLevels });

      // Resolve features/entities
      const resolved = await this.resolveFeatureTree(selection);

      // collect immediate effects and pending choices
      const immediateEffects: Array<{ source?: string | null; effect: any }> = [];
      const pendingChoices: any[] = [];
      const appliedFeatures: string[] = [];

      for (const node of (resolved || [])) {
        const payloadEntity = node?.payload ?? node;
        // extract raw effects array from common fields
        const effectsRaw = payloadEntity.effects ?? payloadEntity.features ?? payloadEntity.payload?.effects ?? payloadEntity.payload?.features ?? [];
        const arr = Array.isArray(effectsRaw) ? effectsRaw : (effectsRaw ? [effectsRaw] : []);

        for (const rawEf of arr) {
          const ef = normalizeEffect(rawEf);
          if (!ef) continue;

          // if this is a choice and not apply_immediately, mark as pending
          const isChoice = String(ef.type ?? '').toLowerCase().includes('choice') || ef.payload?.choose !== undefined;
          const applyNow = ef.payload?.apply_immediately === true;
          if (isChoice && !applyNow) {
            const cd = extractChoiceDescriptor(ef);
            if (cd) pendingChoices.push(cd);
            // do not push as immediate
            continue;
          }

          // otherwise it's immediate -> push for application
          immediateEffects.push({ source: node.originId ?? payloadEntity.id ?? null, effect: ef });
        }

        // record applied feature OR entity id
        if (node.originId) appliedFeatures.push(String(node.originId));
        else if (payloadEntity.id) appliedFeatures.push(String(payloadEntity.id));
      }

      // Build initial preview character skeleton
      const previewChar: any = {
        base_stats_before_race: { ...(baseCharacterIn?.base_stats_before_race ?? {}) },
        niveau: selection.niveau,
        final_stats: {},
        features: [],
        equipment: [],
        spellcasting: {},
        proficiencies: [],
        temp_hp: 0,
        senses: [],
        unhandled_effects: []
      };

      // Apply immediate effects
      await this.engine.applyEffects(previewChar, immediateEffects, {
        selection,
        baseCharacter: baseCharacterIn,
        classLevels
      });

      return {
        ok: true,
        previewCharacter: previewChar,
        appliedFeatures,
        pendingChoices,
        errors: []
      };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[CreationAdapterServer.buildPreview] error', err);
      return {
        ok: false,
        error: String(err?.message ?? err),
        stack: err?.stack
      };
    }
  }
}

export default CreationAdapterServer;
