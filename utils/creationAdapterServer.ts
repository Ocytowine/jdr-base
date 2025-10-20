// utils/creationAdapterServer.ts
// Adaptateur serveur pour la création : résout features -> normalise -> applique via EffectEngine
// Usage : const svc = new CreationAdapterServer(adapterInstance?); await svc.init(); const res = await svc.buildPreview(selection, baseChar);

import fs from 'fs/promises';
import path from 'path';
import EffectEngine from '~/engine/effectEngine';

import { evalFormuleAdditive } from '~/utils/evalFormule';
import { normalizeEffect, extractChoiceDescriptor } from '~/utils/normalizeEffect';
import { FeatureLedger, AppliedFeatureDetail, flattenFeatureLedger } from '~/utils/featureLedger';

const TEXT_FIELDS = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_FIELDS = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];
const EFFECT_LABEL_FIELDS = ['effect_label', 'effectLabel', 'effect', 'summary', 'tagline', 'mecanique.effect_label', 'mecanique.effectLabel'];

const summarizeValue = (value: any, depth = 0): string => {
  if (depth > 2) return '...';
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const mapped = value
      .map((entry) => summarizeValue(entry, depth + 1))
      .filter((entry) => entry && entry !== 'n/a');
    return mapped.length ? mapped.join(', ') : 'n/a';
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const limited = entries.slice(0, 3).map(([key, val]) => `${key}: ${summarizeValue(val, depth + 1)}`);
    const suffix = entries.length > 3 ? ' ...' : '';
    return limited.join(', ') + suffix;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const summarizeEffectDescription = (effect: any): string => {
  if (!effect || typeof effect !== 'object') return 'Effet applique';
  const type = String(effect.type ?? effect.raw?.type ?? 'effet').toLowerCase();
  const payload = effect.payload ?? {};
  switch (type) {
    case 'proficiency_grant': {
      const parts: string[] = [];
      if (payload.skills) parts.push(`competences (${summarizeValue(payload.skills)})`);
      if (payload.weapons) parts.push(`armes (${summarizeValue(payload.weapons)})`);
      if (payload.armor) parts.push(`armures (${summarizeValue(payload.armor)})`);
      if (payload.tools) parts.push(`outils (${summarizeValue(payload.tools)})`);
      if (!parts.length) parts.push(summarizeValue(payload));
      return `Maitrises: ${parts.join(' | ')}`;
    }
    case 'saving_throws':
      return `Jets de sauvegarde: ${summarizeValue(payload.saving_throws ?? payload)}`;
    case 'spell_grant':
      return `Sort obtenu: ${summarizeValue(payload.spell_id ?? payload.spell ?? payload)}`;
    case 'spellcasting_feature': {
      const ability = payload.ability ? ` (${payload.ability})` : '';
      return `Sortilege${ability}`.trim();
    }
    case 'stat_modifier': {
      const stat = summarizeValue(payload.stat ?? payload.attribute ?? 'stat');
      const delta = summarizeValue(payload.delta ?? payload.value ?? '+?');
      return `Modification ${stat}: ${delta}`;
    }
    case 'ability_score_increase':
      return `Augmentation de caracteristique: ${summarizeValue(payload)}`;
    case 'trait':
      return payload.description ? String(payload.description) : `Trait: ${summarizeValue(payload)}`;
    case 'items_proposal':
      return `Proposition d'equipement: ${summarizeValue(payload.items ?? payload)}`;
    default: {
      const summary = summarizeValue(payload);
      return summary && summary !== 'n/a' ? `${type}: ${summary}` : type;
    }
  }
};

const extractHitPoints = (entity: any): { level_1?: string; per_level_after_1?: string } | null => {
  if (!entity || typeof entity !== 'object') return null
  const direct = entity.hit_points
  if (direct && typeof direct === 'object') return { ...direct }
  const lists = [entity.effects, entity.features, entity.payload?.effects]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      const payload = entry && typeof entry === 'object' ? (entry.payload && typeof entry.payload === 'object' ? entry.payload : entry) : null
      const hp = payload?.hit_points
      if (hp && typeof hp === 'object') return { ...hp }
    }
  }
  return null
}

export type Selection = {
  class?: string | null;
  race?: string | null;
  background?: string | null;
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
    this.engine = new EffectEngine({
      resolveItemById: async (id: string) => this.resolveItemById(id)
    });
  }

  async resolveItemById(id: string): Promise<any | null> {
    if (!id) return null;
    if (!this.adapter || typeof this.adapter.loadRaw !== 'function') {
      return null;
    }

    try {
      const item = await this.adapter.loadRaw(String(id));
      if (!item || typeof item !== 'object') {
        return null;
      }
      if (!item.id) {
        item.id = String(id);
      }
      return item;
    } catch (err) {
      try {
        console.warn('[CreationAdapterServer] resolveItemById failed', id, err);
      } catch (e) {
        // ignore console errors
      }
      return null;
    }
  }

  async init() {
    if (this.adapter && typeof this.adapter.initIndex === 'function') {
      await this.adapter.initIndex();
    }
  }

  // Fallback read local JSON entity
  async readLocalEntity(kind: 'classes' | 'races' | 'backgrounds', id: string): Promise<any | null> {
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
    let resolved: any[] = [];

    if (this.adapter && typeof this.adapter.resolveFeatureTree === 'function') {
      try {
        resolved = await this.adapter.resolveFeatureTree(selection);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CreationAdapterServer] resolveFeatureTree via adapter failed, falling back to local', err);
        resolved = [];
      }
    }

    const out: any[] = Array.isArray(resolved) ? [...resolved] : [];
    const existingIds = new Set<string>();
    for (const node of out) {
      const id = node?.originId ?? node?.payload?.id ?? node?.id ?? null;
      if (id !== null && id !== undefined) existingIds.add(String(id));
    }

    const ensureEntity = async (kind: 'classes' | 'races' | 'backgrounds', id: string | null | undefined) => {
      if (!id) return;
      const key = String(id);
      if (existingIds.has(key)) return;

      const candidatePaths = [`${kind}/${key}.json`, `${kind}/${key}/${key}.json`, `${key}.json`];
      let payload: any | null = null;

      if (this.adapter) {
        const adapterAny = this.adapter as any;
        for (const candidate of candidatePaths) {
          if (!candidate) continue;
          try {
            payload = await adapterAny.fetchJsonFromRepoPath?.(candidate);
            if (payload) break;
          } catch (err) {
            payload = null;
          }
        }

        if (!payload && typeof adapterAny.loadRaw === 'function') {
          try {
            payload = await adapterAny.loadRaw(key);
          } catch (err) {
            payload = null;
          }
        }
      }

      if (!payload) {
        payload = await this.readLocalEntity(kind, key);
      }

      if (payload && typeof payload === 'object') {
        try {
          console.debug('[CreationAdapterServer] ensureEntity loaded', kind, key);
        } catch (e) {
          // ignore console errors
        }
        out.push({ originId: key, payload });
        existingIds.add(key);
      }
    };

    await ensureEntity('classes', selection.class);
    await ensureEntity('races', selection.race);
    await ensureEntity('backgrounds', selection.background);

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

      const toCleanId = (value: unknown): string | null => {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        return str.length ? str : null;
      };

      // Resolve features/entities
      const resolved = await this.resolveFeatureTree(selection);

      const resolvedById = new Map<string, any>();
      for (const node of resolved || []) {
        const payloadEntity = node?.payload ?? node;
        const key = toCleanId(payloadEntity?.id ?? node?.originId ?? node?.id ?? null);
        if (!key) continue;
        resolvedById.set(key, node);
      }

      const getResolvedPayload = (id?: string | null) => {
        const key = toCleanId(id);
        if (!key) return null;
        const node = resolvedById.get(key);
        if (!node) return null;
        return node.payload ?? node;
      };

      const manualFeatureIds = new Set<string>();
      if (Array.isArray(selection.manual_features)) {
        for (const entry of selection.manual_features) {
          const id =
            typeof entry === 'object'
              ? toCleanId(entry?.id ?? entry?.feature_id ?? entry?.featureId)
              : toCleanId(entry);
          if (id) manualFeatureIds.add(id);
        }
      }

      // collect immediate effects and pending choices
      const immediateEffects: Array<{ source?: string | null; effect: any }> = [];
      const pendingChoices: any[] = [];
      const featureDetails: AppliedFeatureDetail[] = [];
      const ledgerMap = new Map<string, Set<string>>();

      const addLedgerEntry = (parentId: string | null, featureId: string | null) => {
        const feature = toCleanId(featureId);
        if (!feature) return;
        const parent = toCleanId(parentId) ?? feature;
        if (!ledgerMap.has(parent)) ledgerMap.set(parent, new Set<string>());
        const set = ledgerMap.get(parent)!;
        set.add(parent);
        set.add(feature);
      };

      const extractEffectIds = (effect: any): string[] => {
        if (!effect || typeof effect !== 'object') return [];
        const ids = new Set<string>();
        const push = (value: unknown) => {
          const id = toCleanId(value);
          if (id) ids.add(id);
        };

        push(effect.id);
        const payload = effect.payload ?? {};
        push(payload.feature_id);
        push(payload.featureId);
        push(payload.id);
        push(payload.slug);
        push(payload.key);

        const arrays = [
          payload.feature_ids,
          payload.featureIds,
          payload.features,
          payload.ids,
          payload.options,
          payload.grants
        ];
        for (const candidate of arrays) {
          if (Array.isArray(candidate)) {
            for (const value of candidate) {
              if (value && typeof value === 'object') {
                push((value as any).id ?? (value as any).feature_id ?? (value as any).featureId ?? value);
              } else {
                push(value);
              }
            }
          }
        }

        return Array.from(ids);
      };

      const toLabel = (entity: any, fallback: string | null): string => {
        const fallbackLabel = fallback ? String(fallback) : '';
        if (!entity || typeof entity !== 'object') return fallbackLabel;
        const candidates = [entity.name, entity.label, entity.title, entity.nom, entity.slug, entity.id];
        for (const candidate of candidates) {
          const label = toCleanId(candidate);
          if (label) return label;
        }
        return fallbackLabel;
      };

      const resolveSourceKind = (rootId: string | null): AppliedFeatureDetail['sourceKind'] => {
        const key = toCleanId(rootId);
        if (!key) return 'unknown';
        if (selection.class && toCleanId(selection.class) === key) return 'class';
        if (selection.race && toCleanId(selection.race) === key) return 'race';
        if (selection.background && toCleanId(selection.background) === key) return 'background';
        if (manualFeatureIds.has(key)) return 'manual';
        return 'feature';
      };

      for (const node of resolved || []) {
        try {
          console.debug('[RESOLVED_NODE]', node?.originId ?? node?.id ?? '<unknown>');
        } catch (e) {
          // ignore console errors
        }
        const payloadEntity = node?.payload ?? node;
        const featureId = toCleanId(payloadEntity?.id ?? node?.id ?? node?.originId);
        if (!featureId) continue;
        const rootId = toCleanId(node?.originId ?? node?.rootId ?? featureId);
        const parentId = toCleanId(node?.grantedBy ?? null);
        addLedgerEntry(rootId, featureId);

        try {
          const effectsCount = Array.isArray(payloadEntity?.effects) ? payloadEntity.effects.length : payloadEntity?.effects ? 1 : 0;
          console.debug('[RESOLVED_PAYLOAD]', featureId, effectsCount);
        } catch (e) {
          // ignore console errors
        }

        const featureLabel = toLabel(payloadEntity, featureId);
        const rootLabel = toLabel(getResolvedPayload(rootId), rootId ?? featureId);
        const parentLabel = parentId ? toLabel(getResolvedPayload(parentId), parentId) : null;
        const sourceKind = resolveSourceKind(rootId);
        const featureEffects: Array<Record<string, any>> = [];
        const effectSummaries: string[] = [];

        const recordNormalizedEffect = (normalized: any) => {
          if (!normalized || typeof normalized !== 'object') return;
          immediateEffects.push({ source: rootId ?? featureId, effect: normalized });
          featureEffects.push(normalized);
          effectSummaries.push(summarizeEffectDescription(normalized));
        };

        const recordRawEffect = (raw: any) => {
          const normalized = normalizeEffect(raw);
          if (normalized) recordNormalizedEffect(normalized);
        };

        // extract raw effects array from common fields
        const effectsRaw = payloadEntity.effects ?? payloadEntity.features ?? payloadEntity.payload?.effects ?? payloadEntity.payload?.features ?? [];
        const arr = Array.isArray(effectsRaw) ? effectsRaw : (effectsRaw ? [effectsRaw] : []);

        for (const rawEf of arr) {
          const ef = normalizeEffect(rawEf);
          try {
            console.debug('[NORMALIZED_EFFECT]', featureId, ef?.id ?? ef?.type ?? '<no-id>', ef?.type ?? '<no-type>');
          } catch (e) {
            // ignore console errors
          }
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
                  recordRawEffect({
                    type: 'proficiency_grant',
                    payload: { skills: skillsPayload }
                  });
                  effectGenerated = true;
                }

                if ((category === 'spell' || category === 'spells') && chosenIds.length > 0) {
                  for (const spellId of chosenIds) {
                    recordRawEffect({
                      type: 'spell_grant',
                      payload: { spell_id: spellId }
                    });
                  }
                  effectGenerated = true;
                }

                if ((category === 'subclass' || category === 'subclasses') && chosenIds.length > 0) {
                  for (const grantedFeatureId of chosenIds) {
                    recordRawEffect({
                      type: 'grant_feature',
                      payload: { feature_id: grantedFeatureId, apply_immediately: true }
                    });
                  }
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

          const effectIds = extractEffectIds(ef);
          if (effectIds.length) {
            for (const childId of effectIds) {
              if (childId === featureId) continue;
              addLedgerEntry(featureId, childId);
              const effectLabel = String(
                ef.payload?.name ??
                  ef.payload?.label ??
                  ef.payload?.title ??
                  ef.payload?.nom ??
                  ef.payload?.id ??
                  ef.id ??
                  childId
              );
              const summary = summarizeEffectDescription(ef);
              featureDetails.push({
                featureId: childId,
                featureLabel: effectLabel,
                parentId: featureId,
                parentLabel: featureLabel,
                rootId,
                rootLabel,
                sourceKind,
                effects: [ef],
                effectsSummary: summary ? [summary] : []
              });
            }
          }

          // otherwise it's immediate -> push for application
          recordNormalizedEffect(ef);
        }

        featureDetails.push({
          featureId,
          featureLabel,
          parentId,
          parentLabel,
          rootId,
          rootLabel,
          sourceKind,
          effects: featureEffects,
          effectsSummary: effectSummaries
        });
      }

      featureDetails.sort((a, b) => {
        const rootCompare = (a.rootLabel ?? '').localeCompare(b.rootLabel ?? '', undefined, { sensitivity: 'base' });
        if (rootCompare !== 0) return rootCompare;
        return (a.featureLabel ?? '').localeCompare(b.featureLabel ?? '', undefined, { sensitivity: 'base' });
      });

      const featureLedger: FeatureLedger = {};
      for (const [parent, set] of ledgerMap.entries()) {
        featureLedger[parent] = Array.from(set);
      }
      const appliedFeatures = flattenFeatureLedger(featureLedger);

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
        item_proposals: [],
        currency: { gold: 0, silver: 0, copper: 0 },
        unhandled_effects: []
      };

      // Apply immediate effects
      await this.engine.applyEffects(previewChar, immediateEffects, {
        selection,
        baseCharacter: baseCharacterIn,
        classLevels
      });

      // --- Derive DV and PV using class rules to align with store ---
      const pickNumberFromKeys = (obj: any, keys: string[], fallback = 0): number => {
        if (!obj || typeof obj !== 'object') return fallback;
        for (const key of keys) {
          const parts = String(key).split('.');
          let cur: any = obj;
          for (const part of parts) {
            if (cur && typeof cur === 'object' && part in cur) cur = cur[part]; else { cur = undefined; break; }
          }
          const n = Number(cur);
          if (Number.isFinite(n) && n > 0) return n;
        }
        return fallback;
      };

      const classeEntity = getResolvedPayload(selection.class) ?? await this.resolveItemById(String(selection.class || ''));
      const niveau = Number(selection.niveau ?? 1) || 1;
      const dv = pickNumberFromKeys(classeEntity, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice', 'dice.hit_die'], 0) || 0;
      const hp = extractHitPoints(classeEntity);
      const caracs = {
        force: Number(previewChar?.final_stats?.force ?? baseCharacterIn?.base_stats_before_race?.force ?? 10) || 10,
        dexterite: Number(previewChar?.final_stats?.dexterite ?? baseCharacterIn?.base_stats_before_race?.dexterite ?? 10) || 10,
        constitution: Number(previewChar?.final_stats?.constitution ?? baseCharacterIn?.base_stats_before_race?.constitution ?? 10) || 10,
        intelligence: Number(previewChar?.final_stats?.intelligence ?? baseCharacterIn?.base_stats_before_race?.intelligence ?? 10) || 10,
        sagesse: Number(previewChar?.final_stats?.sagesse ?? baseCharacterIn?.base_stats_before_race?.sagesse ?? 10) || 10,
        charisme: Number(previewChar?.final_stats?.charisme ?? baseCharacterIn?.base_stats_before_race?.charisme ?? 10) || 10,
      };
      let pvMax = 0;
      if (hp) {
        previewChar.hit_points = { ...hp };
        const l1 = evalFormuleAdditive(String(hp.level_1 || ''), niveau, caracs as any);
        const per = evalFormuleAdditive(String(hp.per_level_after_1 || ''), niveau, caracs as any);
        const add = (x: number) => Math.max(1, Number(x) || 0);
        pvMax = add(l1);
        for (let i = 2; i <= niveau; i++) pvMax += add(per);
      }
      if (dv > 0) previewChar.dv = dv;
      // Set pvActuels to max at creation, unless a value already present
      const currentPv = Number(previewChar?.pvActuels ?? previewChar?.pv ?? 0);
      previewChar.pvActuels = Number.isFinite(currentPv) && currentPv > 0 ? Math.min(currentPv, pvMax) : pvMax;
      // also expose pv_max for UI if needed
      previewChar.pv_max = pvMax;
      previewChar.features = appliedFeatures;
      previewChar.featureIds = appliedFeatures;
      previewChar.featureLedger = featureLedger;
      previewChar.featureDetails = featureDetails;

      // Filter pending choices by conditions (if any). If no conditions, keep the choice.
      const choicesFiltered = (pendingChoices || []).filter((cd) => {
        try {
          const raw = cd?.raw ?? null;
          const conditions = raw?.conditions ?? raw?.payload?.conditions ?? raw?.raw?.payload?.conditions ?? null;
          if (!conditions) return true; // no condition written => considered OK
          return this.engine.evaluateConditions(conditions, {
            selection,
            baseCharacter: baseCharacterIn,
            classLevels,
            character: previewChar
          });
        } catch {
          // On error evaluating conditions, default to showing the choice
          return true;
        }
      });

      return {
        ok: true,
        previewCharacter: previewChar,
        appliedFeatures,
        appliedFeatureDetails: featureDetails,
        featureLedger,
        pendingChoices: choicesFiltered,
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
              const description =
                choice.description !== undefined && choice.description !== null ? String(choice.description) : null;
              const effectLabelRaw =
                choice.effectLabel !== undefined && choice.effectLabel !== null
                  ? choice.effectLabel
                  : choice.effect_label !== undefined && choice.effect_label !== null
                    ? choice.effect_label
                    : null;
              const effectLabel = effectLabelRaw !== null ? String(effectLabelRaw) : null;
              const image = choice.image !== undefined && choice.image !== null ? String(choice.image) : null;
              return { id, label, description, effectLabel, image };
            })
            .filter(
              (
                val
              ): val is {
                id: string;
                label: string;
                description: string | null;
                effectLabel: string | null;
                image: string | null;
              } => Boolean(val)
            );

          if (normalized.length > 0) {
            const ids = normalized.map((item) => item.id);
            const labels = normalized.map((item) => ({
              id: item.id,
              label: item.label,
              description: item.description,
              effectLabel: item.effectLabel,
              effect_label: item.effectLabel,
              image: item.image
            }));

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

  async resolveAutoFromChoices(
    autoFrom: any
  ): Promise<Array<{ id: string; label: string; description?: string | null; effectLabel?: string | null; image?: string | null }>> {
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

    const normalizeKey = (raw: string): string =>
      String(raw || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[\s_-]+/g, '')
        .toLowerCase();

    const SEGMENT_ALIAS_MAP: Record<string, string[]> = {
      classid: ['classeid'],
      classeid: ['classid'],
      subclassid: ['sousclasseid'],
      sousclasseid: ['subclassid'],
      raceid: ['ligneeid'],
      ligneeid: ['raceid'],
      backgroundid: ['historiqueid'],
      historiqueid: ['backgroundid']
    };

    const getNestedValue = (obj: any, key: string) => {
      const parts = String(key || '').split('.');

      const dive = (current: any, index: number): any => {
        if (index >= parts.length) {
          return current;
        }
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }

        const segment = parts[index];
        const normalizedSegment = normalizeKey(segment);
        const aliases = new Set<string>([normalizedSegment, ...(SEGMENT_ALIAS_MAP[normalizedSegment] ?? [])]);

        for (const candidateKey of Object.keys(current)) {
          const normalizedCandidate = normalizeKey(candidateKey);
          if (
            aliases.has(normalizedCandidate) ||
            (SEGMENT_ALIAS_MAP[normalizedCandidate] ?? []).includes(normalizedSegment)
          ) {
            const result = dive(current[candidateKey], index + 1);
            if (result !== undefined) {
              return result;
            }
          }
        }

        return undefined;
      };

      return dive(obj, 0);
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
      if (!this.adapter) return [];

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

    const pickFirstStringFromKeys = (entry: any, keys: string[]): string | null => {
      for (const key of keys) {
        const value = getNestedValue(entry, key);
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length) return trimmed;
        }
      }
      return null;
    };

    const seen = new Set<string>();
    const mapped: Array<{ id: string; label: string; description?: string | null; effectLabel?: string | null; image?: string | null }> = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const id = pickFirstValue(entry, [...idFields, ...fallbackIdFields]);
      if (!id) continue;
      const label = pickFirstValue(entry, [...labelFields, ...fallbackLabelFields]) ?? id;
      const description = pickFirstStringFromKeys(entry, TEXT_FIELDS);
      const effectLabel = pickFirstStringFromKeys(entry, EFFECT_LABEL_FIELDS);
      const image = pickFirstStringFromKeys(entry, IMAGE_FIELDS);
      if (seen.has(id)) continue;
      seen.add(id);
      mapped.push({ id, label, description, effectLabel, image });
    }

    mapped.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));

    return limit ? mapped.slice(0, limit) : mapped;
  }
}

export default CreationAdapterServer;
