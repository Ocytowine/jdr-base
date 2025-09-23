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
            if (cd) {
              const identifiers = [
                cd.ui_id,
                cd.featureId,
                cd.raw?.ui_id,
                cd.raw?.featureId,
                cd.raw?.id
              ]
                .map((val) => (val === undefined || val === null ? null : String(val)))
                .filter((val): val is string => Boolean(val));

              let hasSelection = false;
              let resolvedIdentifier: string | null = null;
              for (const identifier of identifiers) {
                const existing = selection.chosenOptions?.[identifier];
                if (existing === undefined || existing === null) continue;

                if (Array.isArray(existing)) {
                  if (existing.length === 0) continue;
                } else {
                  selection.chosenOptions![identifier] = [existing];
                }

                hasSelection = true;
                resolvedIdentifier = identifier;
                break;
              }

              if (hasSelection && resolvedIdentifier) {
                const rawSelection = selection.chosenOptions?.[resolvedIdentifier];
                const ensureArray = Array.isArray(rawSelection) ? rawSelection : [rawSelection];
                const normalizeChoiceId = (val: any): string | null => {
                  if (val === undefined || val === null) return null;
                  if (typeof val === 'string') return val;
                  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
                  if (typeof val === 'object') {
                    if (val.id !== undefined && val.id !== null) return String(val.id);
                    if (val.value !== undefined && val.value !== null) return String(val.value);
                    if (val.key !== undefined && val.key !== null) return String(val.key);
                  }
                  return null;
                };

                const chosenIds = ensureArray
                  .map((val) => normalizeChoiceId(val))
                  .filter((val): val is string => Boolean(val && val.length > 0));

                selection.chosenOptions![resolvedIdentifier] = chosenIds;

                const categoryRaw =
                  cd.raw?.payload?.category ??
                  cd.raw?.payload?.type ??
                  cd.raw?.category ??
                  cd.raw?.type ??
                  cd.type ??
                  null;
                const category =
                  typeof categoryRaw === 'string' ? categoryRaw.toLowerCase() : null;

                let effectGenerated = false;

                if ((category === 'skill' || category === 'skills') && chosenIds.length > 0) {
                  const skillsPayload = chosenIds.length === 1 ? chosenIds[0] : chosenIds;
                  immediateEffects.push({
                    source: node.originId ?? payloadEntity.id ?? null,
                    effect: {
                      type: 'proficiency_grant',
                      payload: { skills: skillsPayload }
                    }
                  });
                  effectGenerated = true;
                }

                if (!effectGenerated) {
                  await this.addPendingChoice(pendingChoices, cd);
                }

                continue;
              }

              await this.addPendingChoice(pendingChoices, cd);
            }
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

  async addPendingChoice(pendingChoices: any[], cd: any) {
    if (!cd) return;

    const autoFrom = cd?.raw?.payload?.auto_from ?? cd?.raw?.auto_from ?? cd?.payload?.auto_from;
    if (autoFrom) {
      try {
        const resolved = await this.resolveAutoFromChoices(autoFrom);
        if (resolved.length > 0) {
          const normalized = resolved
            .map((choice) => {
              if (!choice) return null;
              const id = choice.id !== undefined && choice.id !== null ? String(choice.id) : null;
              if (!id) return null;
              const labelRaw = choice.label !== undefined && choice.label !== null ? choice.label : id;
              const label = String(labelRaw);
              return { id, label };
            })
            .filter((val): val is { id: string; label: string } => Boolean(val));

          if (normalized.length > 0) {
            const ids = normalized.map((item) => item.id);
            const labels = normalized.map((item) => ({ id: item.id, label: item.label }));

            cd.from = ids;
            cd.from_labels = labels;
            cd.raw = cd.raw ?? {};
            cd.raw.payload = cd.raw.payload ?? {};
            cd.raw.payload.from = ids;
            cd.raw.payload.from_labels = labels;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CreationAdapterServer] resolveAutoFromChoices failed', err);
      }
    }

    pendingChoices.push(cd);
  }

  async resolveAutoFromChoices(autoFrom: any): Promise<Array<{ id: string; label: string }>> {
    if (!autoFrom || typeof autoFrom !== 'object') return [];
    if (!this.adapter) return [];

    const collection =
      autoFrom.collection ?? autoFrom.folder ?? autoFrom.path ?? autoFrom.repoPath ?? autoFrom.source ?? null;
    if (!collection || typeof collection !== 'string') return [];

    const filters = (autoFrom.filters && typeof autoFrom.filters === 'object') ? autoFrom.filters : {};
    const limit = typeof autoFrom.limit === 'number' && autoFrom.limit > 0 ? autoFrom.limit : null;

    const normalizeKeyList = (value: any): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map((v) => String(v));
      return [String(value)];
    };

    const idFields = normalizeKeyList(autoFrom.id_fields ?? autoFrom.id_field ?? autoFrom.idKey ?? autoFrom.id_path);
    const labelFields = normalizeKeyList(
      autoFrom.label_fields ?? autoFrom.label_field ?? autoFrom.labelKey ?? autoFrom.label_path
    );

    const getNestedValue = (obj: any, key: string) => {
      if (!obj || typeof obj !== 'object' || !key) return undefined;
      const parts = String(key).split('.');
      let current = obj;
      for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
      }
      return current;
    };

    const predicate = (entry: any): boolean => {
      if (!filters) return true;
      for (const [rawKey, expected] of Object.entries(filters)) {
        const value = getNestedValue(entry, rawKey);
        if (expected === undefined || expected === null) continue;

        if (Array.isArray(expected)) {
          const expectedValues = expected.map((item) => String(item).toLowerCase());
          const valueArray = Array.isArray(value)
            ? value.map((item: any) => String(item).toLowerCase())
            : value === undefined || value === null
              ? []
              : [String(value).toLowerCase()];
          const matches = expectedValues.every((item) => valueArray.includes(item));
          if (!matches) return false;
          continue;
        }

        if (typeof expected === 'object') {
          if ('$in' in expected && expected.$in !== undefined && expected.$in !== null) {
            const arr = Array.isArray(expected.$in) ? expected.$in : [expected.$in];
            const normalized = arr.map((item) => String(item));
            const valStr = value === undefined || value === null ? null : String(value);
            if (!valStr || !normalized.includes(valStr)) return false;
            continue;
          }
          if ('$eq' in expected) {
            const valStr = value === undefined || value === null ? null : String(value);
            if (valStr !== String(expected.$eq)) return false;
            continue;
          }
          if (JSON.stringify(value) !== JSON.stringify(expected)) return false;
          continue;
        }

        if (value === undefined || value === null) return false;
        if (String(value) !== String(expected)) return false;
      }
      return true;
    };

    const loadEntries = async (): Promise<any[]> => {
      if (typeof this.adapter.queryCollection === 'function') {
        return await this.adapter.queryCollection(collection, predicate);
      }

      if (
        typeof this.adapter.listFilesInPath !== 'function' ||
        typeof this.adapter.fetchJsonFromRepoPath !== 'function'
      ) {
        return [];
      }

      const results: any[] = [];
      try {
        const entries = await this.adapter.listFilesInPath(collection);
        for (const entry of entries ?? []) {
          if (!entry || entry.type !== 'file') continue;
          const repoPath = entry.path ?? (entry.name ? `${collection}/${entry.name}` : null);
          if (!repoPath || !/\.json$/i.test(repoPath)) continue;
          try {
            const data = await this.adapter.fetchJsonFromRepoPath(repoPath);
            if (!data) continue;
            if (data.id === undefined || data.id === null) {
              const fallbackId = entry.name ? String(entry.name).replace(/\.json$/i, '') : null;
              if (fallbackId) data.id = fallbackId;
            }
            if (predicate(data)) {
              results.push(data);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[CreationAdapterServer.resolveAutoFromChoices] unable to read entry', err);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CreationAdapterServer.resolveAutoFromChoices] listFilesInPath failed', err);
      }
      return results;
    };

    const entries = await loadEntries();
    if (!entries.length) return [];

    const fallbackIdFields = ['id', 'slug', 'code', 'key', 'name'];
    const fallbackLabelFields = ['label', 'name', 'title', 'display_name'];

    const pickFirstValue = (entry: any, candidates: string[]): string | null => {
      for (const candidate of candidates) {
        const value = getNestedValue(entry, candidate);
        if (value === undefined || value === null) continue;
        return String(value);
      }
      return null;
    };

    const seen = new Set<string>();
    const mapped: Array<{ id: string; label: string }> = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const id = pickFirstValue(entry, [...idFields, ...fallbackIdFields]);
      if (!id) continue;
      const label =
        pickFirstValue(entry, [...labelFields, ...fallbackLabelFields]) ?? id;
      if (seen.has(id)) continue;
      seen.add(id);
      mapped.push({ id, label });
    }

    mapped.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));

    return limit ? mapped.slice(0, limit) : mapped;
  }
}

export default CreationAdapterServer;
