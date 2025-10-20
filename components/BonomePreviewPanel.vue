<template>
  <!-- Bloc template : BonomePreviewPanel -->
  <section class="preview">
    <div class="preview__header">
      <h3 class="preview__title">Prévisualisation</h3>
      <div class="preview__counter">Capacités : {{ appliedFeatureCount }}</div>
    </div>

    <div v-if="preview" class="preview__panel">
      <div class="preview__hero">
        <div class="preview__portrait">
          <img :src="previewPortrait" :alt="`Portrait ${displayCharacterName}`" class="preview__portrait-image" />
        </div>
        <div class="preview__identity">
          <div class="preview__identity-header">
            <span class="preview__identity-label">Nom du personnage</span>
            <h4 class="preview__identity-name">{{ displayCharacterName }}</h4>
            <div v-if="hasNameParts" class="preview__identity-details">
              <p v-if="trimmedFirstName"><span>Prénom :</span> {{ trimmedFirstName }}</p>
              <p v-if="trimmedLastName"><span>Nom :</span> {{ trimmedLastName }}</p>
              <p v-if="trimmedNickname"><span>Surnom :</span> {{ trimmedNickname }}</p>
            </div>
            <p v-else-if="trimmedFullName" class="preview__identity-details">
              Nom complet : {{ trimmedFullName }}
            </p>
          </div>
          <div class="preview__identity-grid">
            <article v-for="summary in identitySummary" :key="summary.id" class="preview-card">
              <div class="preview-card__media">
                <img :src="summary.image" :alt="`Illustration ${summary.name}`" loading="lazy" />
              </div>
              <div class="preview-card__body">
                <span class="preview-card__overline">{{ summary.title }}</span>
                <strong class="preview-card__title">{{ summary.name }}</strong>
                <p class="preview-card__description">{{ summary.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="preview__grid">
        <!-- Bloc matériel : sélection par slot -->
        <section class="preview-section">
          <h4 class="preview-section__title">Preparation du materiel (choix par slot)</h4>
          <div class="preview-section__form">
            <div v-for="slot in uiSlots" :key="slot.id" class="preview-form__row">
              <label class="preview-form__label">{{ slot.label }}</label>
              <select
                class="preview-form__select"
                :value="assignmentFor(slot.id)"
                @change="onAssign(slot.id, ($event.target as HTMLSelectElement).value)"
              >
                <option :value="''">-- A definir --</option>
                <option
                  v-for="it in candidatesFor(slot.id)"
                  :key="String(it.key || it.itemId)"
                  :value="String(it.key || it.itemId)"
                >
                  {{ formatItem(it) }}
                </option>
              </select>
            </div>
          </div>
          <div class="preview-section__divider"></div>
          <h5 class="preview-section__subtitle">Inventaire</h5>
          <ul class="preview-list">
            <li v-for="it in assignedList" :key="`a-${String(it.item.key || it.item.itemId)}`">
              {{ formatItem(it.item) }} - <strong>porté</strong>
            </li>
            <li v-for="it in inventoryItems" :key="`u-${String(it.key || it.itemId)}`">
              {{ formatItem(it) }} - rangé
            </li>
            <li v-if="!assignedList.length && !inventoryItems.length" class="preview-list__empty">
              Aucun objet
            </li>
          </ul>
          <p class="preview-list__hint" v-if="coinPurseFinalLabel">
            {{ coinPurseLabel }} : {{ coinPurseFinalLabel }}
          </p>
        </section>
        <!-- Fin bloc matériel -->
        <section class="preview-section">
          <h4 class="preview-section__title">Capacités &amp; choix</h4>
          <div v-if="featureSections.length" class="preview-section__tiles">
            <article v-for="section in featureSections" :key="section.id" class="preview-tile">
              <span class="preview-tile__label">{{ section.sourceLabel }}</span>
              <strong class="preview-tile__title">{{ section.title }}</strong>
              <ul class="preview-feature-list">
                <li v-for="item in section.items" :key="item.id">
                  <span class="preview-feature__label">{{ item.label }}</span>
                  <span v-if="item.summaries.length" class="preview-feature__summary">
                    {{ item.summaries.join(' • ') }}
                  </span>
                </li>
              </ul>
            </article>
          </div>
          <p v-else class="preview-list__empty">Aucune capacité détectée.</p>
        </section>
      </div>

      <div v-if="preview?.errors && preview.errors.length" class="preview__errors">
        <div class="preview__errors-title">Erreurs détectées</div>
        <ul class="preview__errors-list">
          <li v-for="(e, i) in preview.errors" :key="i">{{ e.type }} - {{ e.message }}</li>
        </ul>
      </div>
    </div>

    <p v-else class="preview__empty">Lancez une prévisualisation pour voir un aperçu détaillé du personnage.</p>

    <div class="preview__footer">
      <p v-if="saveError" class="preview__save-error">{{ saveError }}</p>
      <button class="btn" type="button" @click="handleSave" :disabled="saving || !canSave">
        <span v-if="saving">Sauvegarde.</span>
        <span v-else>Sauvegarder ce personnage</span>
      </button>
    </div>
  </section>
  <!-- Fin bloc template : BonomePreviewPanel -->
</template>

<script setup lang="ts">
// Bloc script : BonomePreviewPanel (logique d'affectation et sauvegarde)
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter, useRequestFetch } from '#app';
import {
  MATERIAL_SLOT_DEFINITIONS,
  useBonomeCreationStore
} from '@/stores/bonomeCreation';
import { usePersonnage } from '@/stores/personnage';
import { useDataStore } from '@/stores/data';
import { useParties } from '@/stores/parties';
import { buildCreationInventoryTransition } from '@/utils/inventaireTransition';
import { normalizeFeatureLedger, flattenFeatureLedger, type FeatureLedger } from '@/utils/featureLedger';
import type { InventaireItem } from '@/components/aventure/AventureInventaire.vue';

const router = useRouter();
const creation = useBonomeCreationStore();
const dataStore = useDataStore();
const requestFetch = useRequestFetch();

type FeaturePreviewEntry = {
  featureId: string;
  featureLabel: string;
  parentId: string | null;
  parentLabel: string | null;
  rootId: string | null;
  rootLabel: string | null;
  sourceKind: 'class' | 'race' | 'background' | 'feature' | 'manual' | 'item' | 'unknown';
  effects: Array<Record<string, any>>;
  effectsSummary: string[];
};

type FeatureSection = {
  id: string;
  title: string;
  sourceLabel: string;
  items: Array<{ id: string; label: string; summaries: string[] }>;
};

const summarizeValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const mapped = value
      .map((entry) => summarizeValue(entry))
      .filter((entry) => typeof entry === 'string' && entry.length > 0);
    return mapped.join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const limited = entries.slice(0, 3).map(([key, val]) => `${key}: ${summarizeValue(val)}`);
    const suffix = entries.length > 3 ? ' ...' : '';
    return limited.join(', ') + suffix;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const summarizeEffectForDisplay = (effect: any): string => {
  if (!effect || typeof effect !== 'object') return '';
  const type = String(effect.type ?? 'effet').toLowerCase();
  const payload = effect.payload ?? {};
  switch (type) {
    case 'proficiency_grant': {
      const parts: string[] = [];
      if (payload.skills) parts.push(`Compétences (${summarizeValue(payload.skills)})`);
      if (payload.weapons) parts.push(`Armes (${summarizeValue(payload.weapons)})`);
      if (payload.armor) parts.push(`Armures (${summarizeValue(payload.armor)})`);
      if (payload.tools) parts.push(`Outils (${summarizeValue(payload.tools)})`);
      if (!parts.length) parts.push(summarizeValue(payload));
      return parts.join(' · ');
    }
    case 'saving_throws':
      return `Jets de sauvegarde: ${summarizeValue(payload.saving_throws ?? payload)}`;
    case 'spell_grant':
      return `Sort obtenu: ${summarizeValue(payload.spell_id ?? payload.spell ?? payload)}`;
    case 'spellcasting_feature': {
      const ability = payload.ability ? ` (${payload.ability})` : '';
      return `Sortilège${ability}`.trim();
    }
    case 'stat_modifier': {
      const stat = summarizeValue(payload.stat ?? payload.attribute ?? 'stat');
      const delta = summarizeValue(payload.delta ?? payload.value ?? '+?');
      return `Modification ${stat}: ${delta}`;
    }
    case 'ability_score_increase':
      return `Augmentation de caractéristique: ${summarizeValue(payload)}`;
    case 'trait':
      return payload.description ? String(payload.description) : `Trait: ${summarizeValue(payload)}`;
    case 'items_proposal':
      return `Équipement: ${summarizeValue(payload.items ?? payload)}`;
    default: {
      const summary = summarizeValue(payload);
      return summary.length ? `${type}: ${summary}` : type;
    }
  }
};

const cloneInventoryItems = (items: InventaireItem[] | null | undefined): InventaireItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    value: item.value ? { ...item.value } : null,
    properties_fight: item.properties_fight ? { ...item.properties_fight } : null,
    properties_equip: item.properties_equip ? { ...item.properties_equip } : null
  }))

const {
  preview,
  identitySummary,
  displayCharacterName,
  previewPortrait,
  displayStats,
  characterFirstName,
  characterLastName,
  characterNickname,
  fullCharacterName,
  selectedClass,
  selectedRace,
  selectedBackground
} = storeToRefs(creation);

const { getSpellOrFeatureDetails } = creation;

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
};

const labelForFeature = (id: string | null): string => {
  const cleanId = normalizeId(id);
  if (!cleanId) return '';
  const detail = getSpellOrFeatureDetails?.(cleanId, 'feature');
  if (detail && typeof detail === 'object') {
    const label = detail.name ?? detail.label ?? detail.nom ?? detail.title ?? null;
    if (label) return String(label);
  }
  const raw = (dataStore.maps.features || {})[cleanId];
  if (raw && typeof raw === 'object') {
    const label = raw.name ?? raw.label ?? raw.nom ?? raw.title ?? raw.id ?? null;
    if (label) return String(label);
  }
  return cleanId;
};

const classifyRootKind = (rootId: string | null): FeaturePreviewEntry['sourceKind'] => {
  const normalized = normalizeId(rootId)?.toLowerCase() ?? '';
  if (normalized && normalizeId(selectedClass.value)?.toLowerCase() === normalized) return 'class';
  if (normalized && normalizeId(selectedRace.value)?.toLowerCase() === normalized) return 'race';
  if (normalized && normalizeId(selectedBackground.value)?.toLowerCase() === normalized) return 'background';
  return 'feature';
};

const SOURCE_KIND_LABEL: Record<FeaturePreviewEntry['sourceKind'], string> = {
  class: 'Classe',
  race: 'Race',
  background: 'Historique',
  feature: 'Capacité',
  manual: 'Choix manuel',
  item: 'Objet',
  unknown: 'Autre'
};

const sourceKindLabel = (kind: FeaturePreviewEntry['sourceKind']): string => SOURCE_KIND_LABEL[kind] ?? 'Autre';

const trimmedFirstName = computed(() => characterFirstName.value.trim());
const trimmedLastName = computed(() => characterLastName.value.trim());
const trimmedNickname = computed(() => characterNickname.value.trim());
const hasNameParts = computed(
  () =>
    Boolean(trimmedFirstName.value) ||
    Boolean(trimmedLastName.value) ||
    Boolean(trimmedNickname.value)
);
const trimmedFullName = computed(() => fullCharacterName.value.trim());

const resolvedKeptItemsForSlots = computed(() => {
  const decisions = preview.value?.previewCharacter?.materialDecisions;
  if (decisions && Array.isArray(decisions.kept) && decisions.kept.length) {
    return decisions.kept as any[];
  }
  const storeKept = creation.materialKeptItems?.value ?? [];
  return storeKept.map((entry: any) => entry.item);
});

const itemKey = (item: any) => String(item?.key ?? item?.itemId ?? item?.id ?? '');
const lc = (value: unknown) => String(value ?? '').toLowerCase();
const typeTag = (item: any) => lc(item.type ?? item.resolved?.type ?? '');
const matchesTypeTag = (item: any, patterns: string[]) => {
  const tag = typeTag(item);
  if (!tag.length) {
    return false;
  }
  return patterns.some((pattern) => tag.includes(pattern));
};
const isWeapon = (item: any) => matchesTypeTag(item, ['arme', 'weapon', 'focalisateur']);
const isProtection = (item: any) => matchesTypeTag(item, ['armure', 'armor', 'armour', 'protection', 'vetement']);
const isShield = (item: any) => matchesTypeTag(item, ['bouclier', 'shield']);
const isAccessory = (item: any) => matchesTypeTag(item, ['accessoire', 'accessory', 'amulette', 'anneau', 'baguette', 'focus', 'talisman', 'gantelet', 'kit']);

const slotOptionsForKept = computed(() => {
  const items = resolvedKeptItemsForSlots.value;
  return {
    primaryWeapon: items.filter(isWeapon),
    secondaryWeapon: items.filter(isWeapon),
    protection: items.filter(isProtection),
    shield: items.filter(isShield),
    accessories: items.filter(isAccessory)
  };
});

const slotCandidatesForUi = computed(() => {
  const purseKey = creation.materialCoinPurseKey?.value ? String(creation.materialCoinPurseKey.value) : null;
  const prune = (list: any[]) => {
    if (!Array.isArray(list)) return [];
    if (!purseKey) return list;
    return list.filter((item) => itemKey(item) !== purseKey);
  };
  const map = slotOptionsForKept.value;
  return {
    primaryWeapon: prune(map.primaryWeapon),
    secondaryWeapon: prune(map.secondaryWeapon),
    protection: prune(map.protection),
    shield: prune(map.shield),
    accessories: prune(map.accessories)
  };
});

const previewFeatureLedger = computed<FeatureLedger>(() => {
  const rawLedger =
    preview.value?.featureLedger ??
    preview.value?.previewCharacter?.featureLedger ??
    (Array.isArray(preview.value?.appliedFeatures) ? preview.value?.appliedFeatures : null) ??
    (Array.isArray(preview.value?.previewCharacter?.features) ? preview.value?.previewCharacter?.features : null) ??
    (Array.isArray(preview.value?.previewCharacter?.featureIds) ? preview.value?.previewCharacter?.featureIds : null) ??
    [];
  return normalizeFeatureLedger(rawLedger);
});

const previewFeatureDetails = computed<FeaturePreviewEntry[]>(() => {
  const rawDetails =
    (Array.isArray(preview.value?.appliedFeatureDetails) ? preview.value?.appliedFeatureDetails : null) ??
    (Array.isArray(preview.value?.previewCharacter?.featureDetails) ? preview.value?.previewCharacter?.featureDetails : null) ??
    [];
  if (!Array.isArray(rawDetails)) return [];

  const map = new Map<string, FeaturePreviewEntry>();
  const allowedKinds: FeaturePreviewEntry['sourceKind'][] = ['class', 'race', 'background', 'feature', 'manual', 'item', 'unknown'];

  for (const detail of rawDetails) {
    if (!detail || typeof detail !== 'object') continue;
    const featureId = normalizeId(detail.featureId ?? detail.id);
    if (!featureId) continue;
    const parentId = normalizeId(detail.parentId ?? detail.parent_id ?? null);
    const rootId = normalizeId(detail.rootId ?? detail.originId ?? parentId ?? featureId);
    const effectsArray = Array.isArray(detail.effects) ? detail.effects : [];
    const summaries = Array.isArray(detail.effectsSummary) && detail.effectsSummary.length
      ? detail.effectsSummary.map((entry: any) => String(entry))
      : effectsArray.map((effect: any) => summarizeEffectForDisplay(effect)).filter((entry) => entry && entry.length);
    const kindRaw = String(detail.sourceKind ?? '').toLowerCase();
    const sourceKind = allowedKinds.includes(kindRaw as FeaturePreviewEntry['sourceKind'])
      ? (kindRaw as FeaturePreviewEntry['sourceKind'])
      : classifyRootKind(rootId);

    const parentLabelRaw = typeof detail.parentLabel === 'string' && detail.parentLabel.trim().length
      ? String(detail.parentLabel)
      : typeof detail.parentName === 'string' && detail.parentName.trim().length
        ? String(detail.parentName)
        : null;
    const rootLabelRaw = typeof detail.rootLabel === 'string' && detail.rootLabel.trim().length
      ? String(detail.rootLabel)
      : typeof detail.originLabel === 'string' && detail.originLabel.trim().length
        ? String(detail.originLabel)
        : null;

    const entry: FeaturePreviewEntry = {
      featureId,
      featureLabel: String(detail.featureLabel ?? detail.label ?? detail.name ?? featureId),
      parentId,
      parentLabel: parentLabelRaw ?? (parentId ? labelForFeature(parentId) : null),
      rootId,
      rootLabel: rootLabelRaw ?? (rootId ? labelForFeature(rootId) : null),
      sourceKind,
      effects: effectsArray,
      effectsSummary: summaries
    };

    map.set(featureId, entry);
  }

  return Array.from(map.values());
});

const featureEntries = computed<FeaturePreviewEntry[]>(() => {
  const entries = new Map<string, FeaturePreviewEntry>();
  previewFeatureDetails.value.forEach((entry) => {
    entries.set(entry.featureId, { ...entry });
  });

  const ledger = previewFeatureLedger.value;
  const ensureEntry = (featureId: string, parentForChild: string | null, rootForChild: string): FeaturePreviewEntry => {
    let existing = entries.get(featureId);
    if (!existing) {
      existing = {
        featureId,
        featureLabel: labelForFeature(featureId),
        parentId: parentForChild && parentForChild !== featureId ? parentForChild : null,
        parentLabel: parentForChild && parentForChild !== featureId ? labelForFeature(parentForChild) : null,
        rootId: rootForChild,
        rootLabel: labelForFeature(rootForChild),
        sourceKind: classifyRootKind(rootForChild),
        effects: [],
        effectsSummary: []
      };
      entries.set(featureId, existing);
    } else {
      if (parentForChild && parentForChild !== featureId && !existing.parentId) {
        existing.parentId = parentForChild;
        existing.parentLabel = labelForFeature(parentForChild);
      }
      if (!existing.rootId) existing.rootId = rootForChild;
      if (!existing.rootLabel) existing.rootLabel = labelForFeature(rootForChild);
      if (!existing.sourceKind || existing.sourceKind === 'unknown') {
        existing.sourceKind = classifyRootKind(rootForChild);
      }
    }
    return existing;
  };

  for (const [parentKey, list] of Object.entries(ledger)) {
    const parentId = normalizeId(parentKey);
    if (!parentId) continue;
    const parentEntry = ensureEntry(parentId, null, parentId);
    parentEntry.parentId = null;
    parentEntry.parentLabel = null;

    const children = Array.isArray(list) ? list : [];
    for (const child of children) {
      const childId = normalizeId(child);
      if (!childId) continue;
      ensureEntry(childId, parentId, parentId);
    }
  }

  return Array.from(entries.values()).sort((a, b) =>
    a.featureLabel.localeCompare(b.featureLabel, 'fr', { sensitivity: 'base' })
  );
});

const featureSections = computed<FeatureSection[]>(() => {
  const sections = new Map<string, FeatureSection>();

  for (const entry of featureEntries.value) {
    const rootKey = normalizeId(entry.rootId ?? entry.parentId ?? entry.featureId) ?? entry.featureId;
    const title = entry.rootLabel ?? entry.parentLabel ?? entry.featureLabel;
    if (!sections.has(rootKey)) {
      sections.set(rootKey, {
        id: rootKey,
        title,
        sourceLabel: sourceKindLabel(entry.sourceKind),
        items: []
      });
    }
    const section = sections.get(rootKey)!;
    if (section.sourceLabel === SOURCE_KIND_LABEL.feature && entry.sourceKind !== 'feature') {
      section.sourceLabel = sourceKindLabel(entry.sourceKind);
    }
    const summaries = entry.effectsSummary.filter((summary) => summary && summary.length);
    if (!section.items.find((existing) => existing.id === entry.featureId)) {
      section.items.push({
        id: entry.featureId,
        label: entry.featureLabel,
        summaries
      });
    }
  }

  return Array.from(sections.values())
    .map((section) => {
      section.items.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
      return section;
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
});

const appliedFeatureCount = computed(() => flattenFeatureLedger(previewFeatureLedger.value).length);

const coinPurseLabel = computed(() => creation.materialCoinPurseLabel?.value || 'Bourse')
const coinPurseFinalLabel = computed(() => {
  const coins = creation.materialFinalCoins?.value
  if (!coins) return ''
  const parts: string[] = []
  if (coins.gold) parts.push(`${coins.gold} po`)
  if (coins.silver) parts.push(`${coins.silver} pa`)
  if (coins.copper) parts.push(`${coins.copper} pc`)
  return parts.join(' ')
})

// Helpers for slot assignment UI
const formatItem = (it: any) => (creation.formatMaterialItemDisplay as (item: any) => string)(it);

const assignmentsBySlot = computed(() => {
  const a = creation.materialAssignments as any;
  return {
    primaryWeapon: a?.primaryWeaponKey ? String(a.primaryWeaponKey) : null,
    secondaryWeapon: a?.secondaryWeaponKey ? String(a.secondaryWeaponKey) : null,
    protection: a?.protectionKey ? String(a.protectionKey) : null,
    shield: a?.shieldKey ? String(a.shieldKey) : null,
    accessories: Array.isArray(a?.accessoriesKeys) ? a.accessoriesKeys.map((k: any) => String(k)) : []
  };
});

const assignedKeySet = computed(() => {
  const map = assignmentsBySlot.value;
  const set = new Set<string>();
  const push = (value: string | null) => { if (value) set.add(value); };
  push(map.primaryWeapon);
  push(map.secondaryWeapon);
  push(map.protection);
  push(map.shield);
  for (const key of map.accessories) push(key);
  return set;
});

const candidatesFor = (slotId: string) => {
  const list = (slotCandidatesForUi.value as Record<string, any[]>)[slotId] ?? [];
  const map = assignmentsBySlot.value;
  const forbidden = new Set(assignedKeySet.value);
  const allow = (value: string | null) => { if (value) forbidden.delete(value); };
  switch (slotId) {
    case 'primaryWeapon': allow(map.primaryWeapon); break;
    case 'secondaryWeapon': allow(map.secondaryWeapon); break;
    case 'protection': allow(map.protection); break;
    case 'shield': allow(map.shield); break;
    case 'accessories':
      for (const key of map.accessories) forbidden.delete(key);
      break;
  }
  return list.filter((item) => {
    const key = itemKey(item);
    return !key || !forbidden.has(key);
  });
};

const assignmentFor = (slotId: string) => {
  const map = assignmentsBySlot.value;
  switch (slotId) {
    case 'primaryWeapon': return map.primaryWeapon ?? '';
    case 'secondaryWeapon': return map.secondaryWeapon ?? '';
    case 'protection': return map.protection ?? '';
    case 'shield': return map.shield ?? '';
    case 'accessories':
      return '';
    default: return '';
  }
};

const onAssign = (slotId: string, key: string) => {
  (creation.setMaterialAssignment as any)(slotId, key && key.length ? key : null);
};

const inventoryItems = computed(() => {
  const assigned = assignedKeySet.value;
  return resolvedKeptItemsForSlots.value.filter((item) => {
    const key = itemKey(item);
    if (!key) {
      return true;
    }
    return !assigned.has(key);
  });
});

const assignedList = computed(() => ((creation.materialAcquired as any).value ?? []).filter((e: any) => e.status === 'porte'));

// UI slots: base definitions minus 'pack' + add 'shield'
const uiSlots = computed(() => {
  const list = [...(MATERIAL_SLOT_DEFINITIONS as any)].filter((s: any) => s.id !== 'pack');
  if (!list.some((s: any) => s.id === 'shield')) {
    list.splice(3, 0, { id: 'shield', label: 'Bouclier', hint: '', placeholder: '' });
  }
  return list;
});

// Fin bloc script : BonomePreviewPanel
const canSave = computed(() => preview.value?.ok && !(preview.value?.errors?.length));
const saving = ref(false);
const saveError = ref<string | null>(null);

async function handleSave() {
  if (!canSave.value || saving.value) {
    return;
  }

  saving.value = true;
  saveError.value = null;

  try {
    const payload = await creation.createPersonnagePayload();
    if (!payload) {
      throw new Error("La génération du personnage n'a retourné aucune donnée.");
    }

    // --- NOUVEAU : garantir la présence de ui_template dans la fiche finale ---
    try {
      if (!payload.ui_template) {
        const previewCharacter = creation.preview?.value?.previewCharacter ?? null;
        if (previewCharacter && typeof previewCharacter.ui_template === 'string' && previewCharacter.ui_template.trim()) {
          payload.ui_template = previewCharacter.ui_template.trim();
        } else {
          // recherche robuste dans la DB locale (classes)
          const wanted = String(payload.classeId ?? payload.classe ?? '').trim().toLowerCase();
          if (wanted) {
            try {
              // s'assurer que dataStore est chargé pour la partie courante
              try { await dataStore.load?.((useParties() as any).currentPartyId ?? undefined) } catch {}
            } catch {}
            const all = Object.values(dataStore.maps.classes || {});
            const found = all.find((c: any) => {
              if (!c || typeof c !== 'object') return false;
              const id = String(c.id ?? '').toLowerCase();
              const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase();
              return id === wanted || name === wanted;
            });
            if (found && typeof found.ui_template === 'string' && found.ui_template.trim()) {
              payload.ui_template = found.ui_template.trim();
            }
          }
        }
      }
    } catch (e) {
      // ignore, on ne bloque pas la sauvegarde pour ce step
    }
    // --- FIN injection ui_template ---

    const livePersonnageStore = usePersonnage();
    livePersonnageStore.perso = payload;
    try { await (livePersonnageStore as any).recomputeDerived?.() } catch {}
    const partiesStore = useParties();
    if (process.client) {
      partiesStore.initialiser();
    }
    let partieId = partiesStore.currentPartyId as string | null;
    if (!partieId) {
      partieId = partiesStore.creerPartie() as string | null;
      if (partieId) {
        partiesStore.setCurrentParty(partieId);
      }
    }
    if (partieId) {
      // Persist enriched data alongside the party
      try { dataStore.save(partieId); } catch {}
      const keptEntries = (creation.materialKeptItems?.value ?? []) as Array<{ item: unknown }>;
      const transition = buildCreationInventoryTransition({
        entries: keptEntries.map((entry) => entry.item),
        assignments: (creation.materialAssignments as Record<string, string | null> | undefined) ?? null,
        purseKey: creation.materialCoinPurseKey?.value || null,
        finalCoins: creation.materialFinalCoins?.value ?? null
      });

      let inventoryItems = cloneInventoryItems(transition.items);

      if (!inventoryItems.length) {
        const fallbackFromPersonnage = cloneInventoryItems(livePersonnageStore.perso.inventaire);
        if (fallbackFromPersonnage.length) {
          inventoryItems = fallbackFromPersonnage;
        }
      }

      if (!inventoryItems.length) {
        const existingPartie = partiesStore.getPartie(partieId);
        if (existingPartie) {
          inventoryItems = cloneInventoryItems(existingPartie.inventaire);
        }
      }

      const finalized = cloneInventoryItems(inventoryItems)

      partiesStore.updatePartie(partieId, {
        inventaire: finalized,
        inventaireInitialise: finalized.length > 0
      })

      livePersonnageStore.perso = {
        ...livePersonnageStore.perso,
        inventaire: finalized
      }
    }
    if (typeof livePersonnageStore.sauvegarderLocal === 'function') {
      livePersonnageStore.sauvegarderLocal(partieId ?? undefined);
    } else {
      console.warn('[BonomePreviewPanel] sauvegarderLocal indisponible', livePersonnageStore);
    }
    creation.lockCreation();

    await router.push('/aventure');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[BonomePreviewPanel] handleSave failed', err);
    const message = err?.message ?? err;
    saveError.value = message ? `Impossible de sauvegarder la fiche : ${String(message)}` : 'Impossible de sauvegarder la fiche.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(20, 24, 50, 0.85), rgba(12, 15, 32, 0.95));
  color: var(--texte);
}

.preview__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  .preview__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.preview__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.preview__counter {
  font-size: 13px;
  color: var(--texte-2);
}

.preview__panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.preview__hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (min-width: 768px) {
  .preview__hero {
    flex-direction: row;
  }
}

.preview__portrait {
  flex: 0 0 200px;
  max-width: 220px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--bord);
  background: var(--carte-2);
}

.preview__portrait-image {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.preview__identity {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1 1 auto;
}

.preview__identity-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview__identity-label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.preview__identity-name {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--texte);
}

.preview__identity-details {
  font-size: 13px;
  color: var(--texte-2);
}

.preview__identity-details span {
  font-weight: 600;
  color: var(--texte);
  margin-right: 6px;
}

.preview__identity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.preview-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(18, 22, 47, 0.9), rgba(9, 12, 28, 0.94));
  overflow: hidden;
}

.preview-card__media {
  height: 120px;
  background: var(--carte-2);
}

.preview-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px 16px;
}

.preview-card__overline {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent-2);
}

.preview-card__title {
  font-size: 15px;
  margin: 0;
}

.preview-card__description {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
  line-height: 1.45;
}

.preview__grid {
  display: grid;
  gap: 18px;
}

@media (min-width: 1024px) {
  .preview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(17, 21, 45, 0.92), rgba(10, 13, 30, 0.95));
  padding: 20px 22px;
}

.preview-section__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--texte);
}

.preview-section__subtitle {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-2);
}

.preview-section__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table td {
  padding: 6px 4px;
}

.preview-table td:first-child {
  color: var(--texte-2);
  font-weight: 600;
  width: 40%;
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.preview-list__empty {
  color: var(--texte-2);
  font-style: italic;
}

.preview-feature-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.preview-feature__label {
  display: block;
  font-weight: 600;
}

.preview-feature__summary {
  display: block;
  color: var(--texte-2);
  font-size: 12px;
  margin-top: 2px;
}

.preview-section__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--texte-2);
}

.preview-section__block p {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
}

.preview-section__tiles {
  display: grid;
  gap: 12px;
}

.preview-tile {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 28, 0.7);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-tile__label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.preview-tile__value {
  font-size: 13px;
  color: var(--texte);
  word-break: break-word;
}

.preview-tile__value--multiline {
  white-space: pre-line;
}

.preview-section__notes {
  border: 1px dashed var(--bord);
  border-radius: 14px;
  background: rgba(12, 16, 34, 0.6);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--texte-2);
}

.preview__errors {
  border-radius: 14px;
  border: 1px solid var(--ko-soft-border);
  background: var(--ko-soft);
  color: var(--ko);
  padding: 16px;
  font-size: 13px;
}

.preview__errors-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.preview__errors-list {
  margin: 0;
  padding-left: 18px;
}

.preview__empty {
  font-size: 13px;
  color: var(--texte-2);
  font-style: italic;
}

.preview__footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .preview__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.preview__save-error {
  margin: 0;
  font-size: 13px;
  color: var(--ko);
}
</style>
