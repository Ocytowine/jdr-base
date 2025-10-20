import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useRequestFetch } from '#app';
import { useDataStore } from '@/stores/data';
import { useParties } from '@/stores/parties'; // <-- Ajout import pour obtenir currentPartyId
import { normalizeEffects } from '@/utils/normalizeEffect';
import { resolveStatBasePayload, evalFormuleAdditive } from '@/utils/evalFormule';
import type { ProficiencyRank } from '@/utils/proficiencies';

import type { Personnage } from './personnage';

import { useCreationChoices, type CreationChoiceOption } from '@/composables/useCreationChoices';
import { useSession } from '@/composables/useSession';

import { createCardPlaceholder, coinsToCopper, copperToCoins, ensureCardImage, ensureDescription, humanizeLabel, normalizeCatalogEntries, normalizeCoinsValue, resolveCardVisuals, toFiniteNumber, valueExists } from '@/utils/creationHelpers';
import type { CoinBreakdown } from '@/utils/creationHelpers';
import { buildCreationInventoryTransition } from '@/utils/inventaireTransition';
import { xpThresholdForLevel } from '@/composables/useExperienceLevelUp';
import { normalizeFeatureLedger, flattenFeatureLedger, ledgerAddFeature } from '@/utils/featureLedger';

export type CatalogEntry = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

export type PrimaryCardOption = {
  id: string;
  label: string;
  description: string;
  image: string;
  fallbackImage: string;
  imageCandidates: string[];
};

export type PrimarySelectionGroup = {
  id: 'class' | 'race' | 'background';
  title: string;
  options: PrimaryCardOption[];
  selected: string;
};

export type ChoiceOption = CreationChoiceOption;

export type IdentitySummaryEntry = {
  id: PrimarySelectionGroup['id'];
  title: string;
  name: string;
  description: string;
  image: string;
};

export type MaterialPlan = {
  primaryWeapon: string;
  secondaryWeapon: string;
  protection: string;
  shield: string;
  accessories: string;
  notes: string;
};

export type DescriptionFields = {
  bio: string;
  physique: string;
  personnalite: string;
  objectifs: string;
  relations: string;
  defauts: string;
};

export type MaterialSlotKey = keyof MaterialPlan;
export type NarrativeFieldKey = keyof DescriptionFields;

export type MaterialProposalItem = {
  key: string;
  itemId: string;
  quantity: number;
  label: string;
  description: string | null;
  image: string | null;
  type: string | null;
  coins?: CoinBreakdown | null;
  coinsCopper: number;
  totalCoinsCopper: number;
  sellValue?: CoinBreakdown | null;
  sellValueCopper: number;
  totalSellValueCopper: number;
  weightPerUnit: number;
  weightTotal: number;
  resolved?: any | null;
  raw?: any;
  kept: boolean;
  status: 'kept' | 'sold';
};

export type MaterialProposalGroup = {
  effectId: string | null;
  source: string | null;
  label: string | null;
  description: string | null;
  items: MaterialProposalItem[];
};

export const MATERIAL_SLOT_DEFINITIONS: ReadonlyArray<{
  id: MaterialSlotKey;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    id: 'primaryWeapon',
    label: 'Arme principale',
    hint: "L’équipement offensif qui définit votre style.",
    placeholder: 'Ex. Épée longue gravée'
  },
  {
    id: 'secondaryWeapon',
    label: 'Arme secondaire',
    hint: 'Un outil de secours ou une arme légère.',
    placeholder: 'Ex. Dague dissimulée'
  },
  {
    id: 'protection',
    label: 'Protection',
    hint: 'Armure, parades magiques ou vêtements renforcés.',
    placeholder: 'Ex. Cuir clouté souple'
  },
  {
    id: 'pack',
    label: 'Paquetage',
    hint: 'Sacs, kits d’aventuriers et ressources de voyage.',
    placeholder: 'Ex. Sac d’explorateur allégé'
  },
  {
    id: 'accessories',
    label: 'Accessoires',
    hint: 'Objets spéciaux, talismans ou gadgets.',
    placeholder: 'Ex. Amulette porte-bonheur'
  }
];

export const DESCRIPTION_FIELD_DEFINITIONS: ReadonlyArray<{
  id: NarrativeFieldKey;
  label: string;
  placeholder: string;
  hint?: string;
}> = [
  {
    id: 'bio',
    label: 'Biographie',
    placeholder: 'Résumez les grandes lignes de son histoire.'
  },
  {
    id: 'physique',
    label: 'Physique',
    placeholder: 'Décrivez sa silhouette, ses traits et son allure.'
  },
  {
    id: 'personnalite',
    label: 'Personnalité',
    placeholder: 'Quelles attitudes, quelles valeurs le définissent ?'
  },
  {
    id: 'objectifs',
    label: 'Objectifs',
    placeholder: 'Quels rêves, quêtes ou ambitions poursuit-il ?'
  },
  {
    id: 'relations',
    label: 'Relations',
    placeholder: 'Alliés, mentors, familles ou rivaux marquants.'
  },
  {
    id: 'defauts',
    label: 'Faiblesses',
    placeholder: 'Ses failles, travers ou secrets encombrants.',
    hint: 'Ces détails alimenteront les tensions narratives.'
  }
];

export const useBonomeCreationStore = defineStore('bonomeCreation', () => {
  const requestFetch = useRequestFetch();

  const classes = ref<CatalogEntry[]>([]);
  const races = ref<CatalogEntry[]>([]);
  const backgrounds = ref<CatalogEntry[]>([]);

  const adapterResetPending = ref(false);
  const getCreationLockKey = () => {
    const { idCourant } = useSession();
    const id = idCourant.value as string | null;
    return id ? `bonome_creation_locked_${id}` : 'bonome_creation_locked';
  };
  const creationLocked = ref(false);

  const materialProposals = ref<MaterialProposalGroup[]>([]);
  const materialSelections = reactive<Record<string, boolean>>({});
  const materialCoinPurseKey = ref<string | null>(null);
  const materialCoinPurseLabel = ref('Bourse');
  const materialCarryCapacity = ref(0);

  const selectedClass = ref<string>('');
  const selectedRace = ref<string>('');
  const selectedBackground = ref<string>('');
  const MIN_LEVEL = 1;

  watch(selectedClass, (next, prev) => {
    if (next !== prev) {
      adapterResetPending.value = true;
    }
  });

  watch(selectedRace, (next, prev) => {
    if (next !== prev) {
      adapterResetPending.value = true;
    }
  });

  watch(selectedBackground, (next, prev) => {
    if (next !== prev) {
      adapterResetPending.value = true;
    }
  });

  const hasPrimarySelection = () =>
    Boolean((selectedClass.value && selectedClass.value.length) || (selectedRace.value && selectedRace.value.length) || (selectedBackground.value && selectedBackground.value.length));
  const MAX_LEVEL = 3;

  const POINT_BUY_MIN = 8;
  const POINT_BUY_MAX = 15;
  const POINT_BUY_BUDGET = 27;
  const POINT_BUY_COST_TABLE: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9
  };

  const BASE_STAT_KEYS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;
  type BaseStatKey = (typeof BASE_STAT_KEYS)[number];

  const defaultBaseStats: Record<BaseStatKey, number> = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8
  };

  const niveau = ref<number>(MIN_LEVEL);
  const loading = ref(false);
  const characterName = ref<string>('');
  const characterFirstName = ref<string>('');
  const characterLastName = ref<string>('');
  const characterNickname = ref<string>('');

  const preview = ref<any | null>(null);
  const rawText = ref<string>('');
  const showRaw = ref(false);
  const initialized = ref(false);
  const hasRestoredSelections = ref(false);

  const baseStats = reactive<Record<BaseStatKey, number>>({ ...defaultBaseStats });

  const clampLevelValue = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return MIN_LEVEL;
    }
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(numeric)));
  };

  const clampBaseStatValue = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return POINT_BUY_MIN;
    }
    const rounded = Math.round(numeric);
    if (rounded < POINT_BUY_MIN) {
      return POINT_BUY_MIN;
    }
    if (rounded > POINT_BUY_MAX) {
      return POINT_BUY_MAX;
    }
    return rounded;
  };

  const getPointBuyCost = (score: number): number => {
    const rounded = Math.round(score);
    return POINT_BUY_COST_TABLE[rounded] ?? Number.POSITIVE_INFINITY;
  };

  const calculatePointBuySpent = (stats: Record<BaseStatKey, number>): number =>
    BASE_STAT_KEYS.reduce((total, key) => total + getPointBuyCost(stats[key]), 0);

  const normalizePointBuyStats = (
    stats: Partial<Record<BaseStatKey, unknown>>
  ): Record<BaseStatKey, number> => {
    const normalized = {} as Record<BaseStatKey, number>;
    for (const key of BASE_STAT_KEYS) {
      normalized[key] = clampBaseStatValue(stats[key] ?? baseStats[key] ?? defaultBaseStats[key]);
    }

    let spent = calculatePointBuySpent(normalized);
    if (!Number.isFinite(spent)) {
      spent = calculatePointBuySpent(defaultBaseStats);
    }

    if (spent > POINT_BUY_BUDGET) {
      const sortedKeys = [...BASE_STAT_KEYS].sort((a, b) => normalized[b] - normalized[a]);
      while (spent > POINT_BUY_BUDGET) {
        let adjusted = false;
        for (const key of sortedKeys) {
          if (normalized[key] <= POINT_BUY_MIN) continue;
          const nextValue = normalized[key] - 1;
          const currentCost = getPointBuyCost(normalized[key]);
          const nextCost = getPointBuyCost(nextValue);
          if (!Number.isFinite(nextCost)) continue;
          normalized[key] = nextValue;
          spent -= currentCost - nextCost;
          adjusted = true;
          if (spent <= POINT_BUY_BUDGET) break;
        }
        if (!adjusted) {
          break;
        }
      }

      if (spent > POINT_BUY_BUDGET) {
        for (const key of BASE_STAT_KEYS) {
          normalized[key] = defaultBaseStats[key];
        }
      }
    }

    return normalized;
  };

  const cloneBaseStats = (): Record<BaseStatKey, number> => {
    return BASE_STAT_KEYS.reduce((acc, key) => {
      acc[key] = baseStats[key];
      return acc;
    }, {} as Record<BaseStatKey, number>);
  };

  const pointBuyBudget = computed(() => POINT_BUY_BUDGET);
  const pointBuyMin = computed(() => POINT_BUY_MIN);
  const pointBuyMax = computed(() => POINT_BUY_MAX);
  const pointBuySpent = computed(() => calculatePointBuySpent(baseStats));
  const pointBuyRemaining = computed(() => POINT_BUY_BUDGET - pointBuySpent.value);
  const isPointBuyBalanced = computed(() => pointBuyRemaining.value === 0);

  const pointBuyCostFor = (score: number): number => getPointBuyCost(score);

  const canIncreaseBaseStat = (key: BaseStatKey): boolean => {
    const current = baseStats[key];
    if (current >= POINT_BUY_MAX) {
      return false;
    }
    const currentCost = getPointBuyCost(current);
    const nextCost = getPointBuyCost(current + 1);
    if (!Number.isFinite(nextCost)) {
      return false;
    }
    const projectedSpent = pointBuySpent.value - currentCost + nextCost;
    return projectedSpent <= POINT_BUY_BUDGET;
  };

  const canDecreaseBaseStat = (key: BaseStatKey): boolean => baseStats[key] > POINT_BUY_MIN;

  const increaseBaseStat = (key: BaseStatKey): boolean => {
    if (!canIncreaseBaseStat(key)) {
      return false;
    }
    baseStats[key] = clampBaseStatValue(baseStats[key] + 1);
    return true;
  };

  const decreaseBaseStat = (key: BaseStatKey): boolean => {
    if (!canDecreaseBaseStat(key)) {
      return false;
    }
    baseStats[key] = clampBaseStatValue(baseStats[key] - 1);
    return true;
  };

  const resetBaseStats = () => {
    for (const key of BASE_STAT_KEYS) {
      baseStats[key] = defaultBaseStats[key];
    }
  };

  const {
    chosenOptions,
    localChosen,
    choiceOptionCache,
    choiceMetadata,
    getChoiceKey,
    getChoiceTitle,
    getChoiceRequirement,
    getChoiceCategoryLabel,
    getChoiceSourceLabel,
    getChoiceOptions,
    getChoiceOptionImage,
    getChoiceOptionDescription,
    getLocalChoiceCount,
    isChoiceOptionSelected,
    handleChoiceOptionClick,
    isChoiceOptionDisabled,
    hasLocalChoiceValue,
    registerChoiceMetadata,
    cacheChoiceOptions,
    appliedChoices
  } = useCreationChoices();

  const buildPrimaryOptions = (
    entries: CatalogEntry[],
    categoryLabel: string,
    categoryKey: string
  ): PrimaryCardOption[] =>
    entries.map((entry) => {
      const label = entry.name?.trim().length ? entry.name.trim() : humanizeLabel(entry.id);
      const visuals = resolveCardVisuals(entry.image ?? null, entry.id, label, categoryKey);
      return {
        id: entry.id,
        label,
        description: ensureDescription(entry.description ?? null, label, categoryLabel),
        image: visuals.image,
        fallbackImage: visuals.fallbackImage,
        imageCandidates: visuals.imageCandidates
      };
    });

  const primarySelectionGroups = computed<PrimarySelectionGroup[]>(() => [
    {
      id: 'class',
      title: 'Classe',
      options: buildPrimaryOptions(classes.value, 'Classe', 'class'),
      selected: selectedClass.value
    },
    {
      id: 'race',
      title: 'Race',
      options: buildPrimaryOptions(races.value, 'Race', 'race'),
      selected: selectedRace.value
    },
    {
      id: 'background',
      title: 'Historique',
      options: buildPrimaryOptions(backgrounds.value, 'Historique', 'background'),
      selected: selectedBackground.value
    }
  ]);

  const identitySummary = computed<IdentitySummaryEntry[]>(() =>
    primarySelectionGroups.value.map((group) => {
      const selected = group.options.find((option) => option.id === group.selected) ?? null;
      const placeholderLabel = selected?.label ?? group.title;
      return {
        id: group.id,
        title: group.title,
        name: selected?.label ?? '—',
        description: ensureDescription(selected?.description ?? null, placeholderLabel, group.title),
        image:
          (selected?.image && selected.image.trim().length ? selected.image : null) ??
          (selected?.fallbackImage && selected.fallbackImage.trim().length ? selected.fallbackImage : null) ??
          ensureCardImage(null, placeholderLabel)
      };
    })
  );

  const normalizeNamePart = (value: string): string => value.replace(/\s+/g, ' ').trim();

  const fullCharacterName = computed(() => {
    const first = normalizeNamePart(characterFirstName.value);
    const last = normalizeNamePart(characterLastName.value);
    const nick = normalizeNamePart(characterNickname.value);

    const segments: string[] = [];
    if (first.length) segments.push(first);
    if (last.length) segments.push(last);

    const base = segments.join(' ').trim();
    if (nick.length) {
      return base.length ? `${base} « ${nick} »` : `« ${nick} »`;
    }

    return base;
  });

  const displayCharacterName = computed(() => {
    const full = fullCharacterName.value.trim();
    if (full.length) {
      return full;
    }
    const trimmed = characterName.value.trim();
    if (trimmed.length) {
      return trimmed;
    }
    const classEntry = identitySummary.value.find((entry) => entry.id === 'class');
    if (classEntry && classEntry.name !== '—') {
      return `${classEntry.name} sans nom`;
    }
    return 'Aventurier sans nom';
  });

  const previewPortrait = computed(() => createCardPlaceholder(displayCharacterName.value));

  const materialPlan = reactive<MaterialPlan>({
    primaryWeapon: '',
    secondaryWeapon: '',
    protection: '',
    shield: '',
    accessories: '',
    notes: ''
  });

  const descriptionFields = reactive<DescriptionFields>({
    bio: '',
    physique: '',
    personnalite: '',
    objectifs: '',
    relations: '',
    defauts: ''
  });

  const getPrimarySelectedLabel = (group: PrimarySelectionGroup): string => {
    const found = group.options.find((option) => option.id === group.selected);
    return found?.label ?? '—';
  };

  const selectPrimaryOption = (
    groupId: PrimarySelectionGroup['id'],
    optionId: string | null | undefined
  ) => {
    if (!optionId) {
      return;
    }

    const value = String(optionId);
    if (!value.length) {
      return;
    }

    if (groupId === 'class') {
      selectedClass.value = value;
      return;
    }
    if (groupId === 'race') {
      selectedRace.value = value;
      return;
    }
    if (groupId === 'background') {
      selectedBackground.value = value;
    }
  };

  const persistSelections = () => {
    if (!process.client) return;
    const payload = {
      selectedClass: selectedClass.value,
      selectedRace: selectedRace.value,
      selectedBackground: selectedBackground.value,
      niveau: niveau.value,
      characterName: fullCharacterName.value.trim() || characterName.value,
      characterFirstName: characterFirstName.value,
      characterLastName: characterLastName.value,
      characterNickname: characterNickname.value,
      baseStats: cloneBaseStats(),
      chosenOptions: JSON.parse(JSON.stringify(chosenOptions))
    };
    try {
      localStorage.setItem('bonome_creation_state', JSON.stringify(payload));
    } catch (err) {
      console.warn('Persist selections failed', err);
    }
  };

  const restoreLockState = () => {
    if (!process.client) {
      creationLocked.value = false;
      return;
    }
    try {
      const raw = localStorage.getItem(getCreationLockKey());
      creationLocked.value = raw === '1';
    } catch (error) {
      creationLocked.value = false;
    }
  };

  const lockCreation = () => {
    creationLocked.value = true;
    if (!process.client) {
      return;
    }
    try {
      localStorage.setItem(getCreationLockKey(), '1');
    } catch (error) {
      console.warn('Failed to persist creation lock', error);
    }
  };

  const unlockCreation = () => {
    creationLocked.value = false;
    if (!process.client) {
      return;
    }
    try {
      localStorage.removeItem(getCreationLockKey());
    } catch (error) {
      console.warn('Failed to clear creation lock', error);
    }
  };

  const restoreSelections = (): boolean => {
    if (!process.client || hasRestoredSelections.value) return false;

    let changed = false;
    try {
      const raw = localStorage.getItem('bonome_creation_state');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const nextClass = parsed.selectedClass ?? selectedClass.value;
        if (nextClass !== selectedClass.value) {
          selectedClass.value = nextClass;
          changed = true;
        }
        const nextRace = parsed.selectedRace ?? selectedRace.value;
        if (nextRace !== selectedRace.value) {
          selectedRace.value = nextRace;
          changed = true;
        }
        const nextBackground = parsed.selectedBackground ?? selectedBackground.value;
        if (nextBackground !== selectedBackground.value) {
          selectedBackground.value = nextBackground;
          changed = true;
        }

        const nextLevel = clampLevelValue(parsed.niveau ?? niveau.value);
        if (nextLevel !== niveau.value) {
          niveau.value = nextLevel;
          changed = true;
        } else {
          niveau.value = nextLevel;
        }

        if (parsed.characterName !== undefined) {
          const nextName = parsed.characterName ?? '';
          if (nextName !== characterName.value) {
            characterName.value = nextName;
            changed = true;
          }
        }

        const nextFirst = parsed.characterFirstName ?? parsed.firstName ?? characterFirstName.value;
        if (nextFirst !== characterFirstName.value) {
          characterFirstName.value = nextFirst;
          changed = true;
        }

        const nextLast = parsed.characterLastName ?? parsed.lastName ?? characterLastName.value;
        if (nextLast !== characterLastName.value) {
          characterLastName.value = nextLast;
          changed = true;
        }

        const nextNickname = parsed.characterNickname ?? parsed.nickname ?? characterNickname.value;
        if (nextNickname !== characterNickname.value) {
          characterNickname.value = nextNickname;
          changed = true;
        }

        if (
          !characterFirstName.value &&
          !characterLastName.value &&
          !characterNickname.value &&
          parsed.characterName
        ) {
          characterFirstName.value = parsed.characterName;
          changed = true;
        }
        if (parsed.baseStats && typeof parsed.baseStats === 'object') {
          const normalized = normalizePointBuyStats(parsed.baseStats as Partial<Record<BaseStatKey, unknown>>);
          let statsChanged = false;
          for (const key of BASE_STAT_KEYS) {
            if (baseStats[key] !== normalized[key]) {
              statsChanged = true;
            }
          }
          if (statsChanged) {
            for (const key of BASE_STAT_KEYS) {
              baseStats[key] = normalized[key];
            }
            changed = true;
          }
        }
        if (parsed.chosenOptions && typeof parsed.chosenOptions === 'object') {
          let optionsChanged = false;
          for (const [k, v] of Object.entries(parsed.chosenOptions)) {
            const existing = chosenOptions[k];
            if (JSON.stringify(existing) !== JSON.stringify(v)) {
              optionsChanged = true;
            }
          }
          if (optionsChanged) {
            Object.assign(chosenOptions, parsed.chosenOptions);
            Object.assign(localChosen, parsed.chosenOptions);
            changed = true;
          }
        }

        if (!characterName.value) {
          const computedName = fullCharacterName.value.trim();
          if (computedName.length) {
            characterName.value = computedName;
            changed = true;
          }
        }
      }
    } catch (err) {
      console.warn('Restore selections failed', err);
    } finally {
      hasRestoredSelections.value = true;
    }
    return changed;
  };

  watch(niveau, (value, oldValue) => {
    const clamped = clampLevelValue(value);
    if (clamped !== value) {
      niveau.value = clamped;
      return;
    }
    if (value !== oldValue) {
      persistSelections();
    }
  });

  let isNormalizingBaseStats = false;
  let catalogPromise: Promise<void> | null = null;
  let previewPromise: Promise<void> | null = null;
  let previewAbort: AbortController | null = null;
  let lastPreviewPayload = '';
  let lastPreviewSuccessPayload = '';
  watch(
    baseStats,
    (current) => {
      if (isNormalizingBaseStats) {
        isNormalizingBaseStats = false;
        return;
      }
      const normalized = normalizePointBuyStats(current as Partial<Record<BaseStatKey, unknown>>);
      const hasChanges = BASE_STAT_KEYS.some((key) => normalized[key] !== baseStats[key]);
      if (hasChanges) {
        isNormalizingBaseStats = true;
        for (const key of BASE_STAT_KEYS) {
          baseStats[key] = normalized[key];
        }
        return;
      }
      persistSelections();
    },
    { deep: true }
  );

  const loadCatalog = async () => {
    if (catalogPromise) {
      return catalogPromise;
    }

    const assignCatalog = (target: { value: CatalogEntry[] }, payload: unknown) => {
      target.value = normalizeCatalogEntries(payload);
    };

    const ensureSelectionValidity = (
      selected: { value: string },
      entries: CatalogEntry[]
    ) => {
      if (!entries.length) {
        selected.value = '';
        return;
      }
      if (!entries.some((entry) => entry.id === selected.value)) {
        selected.value = entries[0].id;
        return;
      }
      if (!selected.value) {
        selected.value = entries[0].id;
      }
    };

    const current = (async () => {
      const [classResponse, raceResponse, backgroundResponse] = await Promise.all([
        requestFetch('/api/catalog/classes?refresh=1').catch(() => null),
        requestFetch('/api/catalog/races?refresh=1').catch(() => null),
        requestFetch('/api/catalog/backgrounds?refresh=1').catch(() => null)
      ]);

      assignCatalog(classes, classResponse);
      assignCatalog(races, raceResponse);
      assignCatalog(backgrounds, backgroundResponse);

      ensureSelectionValidity(selectedClass, classes.value);
      ensureSelectionValidity(selectedRace, races.value);
      ensureSelectionValidity(selectedBackground, backgrounds.value);

      // Le catalogue est rechargé depuis GitHub avec refresh=1.
      // Forçons un reset de l'adaptateur de création pour que les "items"
      // et autres données dépendantes soient re-récupérés sans cache.
      adapterResetPending.value = true;
    })();

    catalogPromise = current;
    current.finally(() => {
      if (catalogPromise === current) {
        catalogPromise = null;
      }
    });
    return current;
  };


  const resetMaterialState = () => {
    materialProposals.value = [];
    for (const key of Object.keys(materialSelections)) {
      delete materialSelections[key];
    }
    materialCoinPurseKey.value = null;
    materialCoinPurseLabel.value = 'Bourse';
    materialCarryCapacity.value = 0;
  };

  const mapProposalItem = (raw: any, fallbackIndex: number): MaterialProposalItem | null => {
    if (raw === null || raw === undefined) {
      return null;
    }
    let normalized: any = raw;
    if (typeof normalized !== 'object' || Array.isArray(normalized)) {
      normalized = { id: normalized };
    }

    const resolvedData = normalized && typeof normalized.resolved === 'object' ? { ...normalized.resolved } : null;
    if (resolvedData) {
      normalized = { ...resolvedData, ...normalized };
      normalized.resolved = resolvedData;
    }

    const itemIdCandidate =
      normalized.itemId ??
      normalized.item_id ??
      normalized.id ??
      normalized.item ??
      normalized.key ??
      null;
    const itemId = itemIdCandidate ? String(itemIdCandidate).trim() : '';
    if (!itemId.length) {
      return null;
    }

    const key = String(normalized.key ?? `${itemId}_${fallbackIndex}`);
    const quantityCandidate = toFiniteNumber(
      normalized.quantity ?? normalized.qty ?? normalized.count ?? normalized.qte ?? 1,
      1
    );
    const quantity = quantityCandidate > 0 ? quantityCandidate : 1;

    const coins = normalizeCoinsValue(normalized.coins ?? null);
    const sellValue = normalizeCoinsValue(normalized.sellValue ?? normalized.sell_value ?? null);

    const coinsCopper = toFiniteNumber(
      normalized.coinsCopper ?? normalized.coins_copper ?? (coins ? coinsToCopper(coins) : 0),
      coins ? coinsToCopper(coins) : 0
    );
    const totalCoinsCopper = toFiniteNumber(
      normalized.totalCoinsCopper ?? normalized.total_coins_copper ?? coinsCopper * quantity,
      coinsCopper * quantity
    );

    const sellValueCopper = toFiniteNumber(
      normalized.sellValueCopper ?? normalized.sell_value_copper ?? (sellValue ? coinsToCopper(sellValue) : 0),
      sellValue ? coinsToCopper(sellValue) : 0
    );
    const totalSellValueCopper = toFiniteNumber(
      normalized.totalSellValueCopper ?? normalized.total_sell_value_copper ?? sellValueCopper * quantity,
      sellValueCopper * quantity
    );

    const weightPerUnit = Math.max(
      0,
      toFiniteNumber(
        normalized.weightPerUnit ??
          normalized.weight_per_unit ??
          normalized.weight?.perUnit ??
          normalized.weight?.per_unit ??
          normalized.weight?.value ??
          normalized.weight ??
          normalized.mass ??
          0,
        0
      )
    );
    const weightTotal = Math.max(
      0,
      toFiniteNumber(
        normalized.weightTotal ??
          normalized.weight_total ??
          normalized.weight?.total ??
          weightPerUnit * quantity,
        weightPerUnit * quantity
      )
    );

    const label =
      typeof normalized.label === 'string' && normalized.label.trim().length
        ? normalized.label.trim()
        : typeof normalized.name === 'string' && normalized.name.trim().length
          ? normalized.name.trim()
          : typeof normalized.nom === 'string' && normalized.nom.trim().length
            ? normalized.nom.trim()
            : itemId;
    const description =
      typeof normalized.description === 'string' && normalized.description.trim().length
        ? normalized.description.trim()
        : typeof normalized.desc === 'string' && normalized.desc.trim().length
          ? normalized.desc.trim()
          : null;
    const image =
      typeof normalized.image === 'string' && normalized.image.trim().length
        ? normalized.image.trim()
        : typeof normalized.icon === 'string' && normalized.icon.trim().length
          ? normalized.icon.trim()
          : typeof normalized.illustration === 'string' && normalized.illustration.trim().length
            ? normalized.illustration.trim()
            : null;
    const type =
      typeof normalized.type === 'string' && normalized.type.trim().length
        ? normalized.type.trim()
        : typeof normalized.category === 'string' && normalized.category.trim().length
          ? normalized.category.trim()
          : typeof normalized.categorie === 'string' && normalized.categorie.trim().length
            ? normalized.categorie.trim()
            : null;

    const keepFlag =
      typeof normalized.kept === 'boolean'
        ? normalized.kept
        : typeof normalized.status === 'string'
          ? normalized.status !== 'sold'
          : true;

    return {
      key,
      itemId,
      quantity,
      label,
      description,
      image,
      type,
      coins: coins ?? null,
      coinsCopper,
      totalCoinsCopper,
      sellValue: sellValue ?? null,
      sellValueCopper,
      totalSellValueCopper,
      weightPerUnit,
      weightTotal,
      resolved: normalized.resolved ?? null,
      raw: normalized,
      kept: keepFlag,
      status: keepFlag ? 'kept' : 'sold'
    };
  };

  const computeCarryCapacity = (previewCharacter: any): number => {
    if (!previewCharacter || typeof previewCharacter !== 'object') {
      return 0;
    }
    const stats = previewCharacter.final_stats ?? {};
    const direct = toFiniteNumber(
      stats.carry_capacity ??
        stats.carryCapacity ??
        stats.charge_max ??
        stats.chargeMax ??
        stats.encumbrance_max ??
        stats.encumbranceMax,
      Number.NaN
    );
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    const strengthScore = toFiniteNumber(
      stats.strength ??
        stats.force ??
        previewCharacter.base_stats_before_race?.strength ??
        previewCharacter.base_stats?.strength ??
        10,
      10
    );
    return Math.max(0, strengthScore * 6.8);
  };

  const hydrateMaterialFromPreview = (previewCharacter: any) => {
    const previousSelections = { ...materialSelections };
    resetMaterialState();

    const proposalsInput = Array.isArray(previewCharacter?.item_proposals) ? previewCharacter.item_proposals : [];
    try {
      console.debug('[RAW_ITEM_PROPOSALS]', previewCharacter?.item_proposals ?? null)
    } catch {}
    const normalized: MaterialProposalGroup[] = [];

    for (const groupRaw of proposalsInput) {
      if (!groupRaw || typeof groupRaw !== 'object') {
        continue;
      }
      const itemsRaw = Array.isArray(groupRaw.items) ? groupRaw.items : [];
      const mappedItems = itemsRaw
        .map((item: any, idx: number) => mapProposalItem(item, idx))
        .filter((value): value is MaterialProposalItem => Boolean(value));

      if (!mappedItems.length) {
        continue;
      }

      normalized.push({
        effectId: groupRaw.effect_id ?? groupRaw.effectId ?? null,
        source: groupRaw.source ?? null,
        label: typeof groupRaw.label === 'string' ? groupRaw.label : null,
        description: typeof groupRaw.description === 'string' ? groupRaw.description : null,
        items: mappedItems
      });
    }

    try {
      console.debug('[MATERIAL_PROPOSALS]', normalized.map((group) => ({ source: group.source, label: group.label, count: group.items.length })));
    } catch (e) {
      // ignore console errors
    }
    materialProposals.value = normalized;

    materialCoinPurseKey.value = null;
    materialCoinPurseLabel.value = 'Bourse';

    for (const group of normalized) {
      for (const item of group.items) {
        const previousDecision = previousSelections[item.key];
        const keep =
          previousDecision === false
            ? false
            : previousDecision === true
              ? true
              : typeof item.kept === 'boolean'
                ? item.kept
                : typeof item.status === 'string'
                  ? item.status !== 'sold'
                  : true;
        setMaterialItemDecision(item.key, keep);

        if (!materialCoinPurseKey.value) {
          const idLower = item.itemId.toLowerCase();
          const typeLower = (item.type ?? '').toLowerCase();
          if (idLower === 'bourse' || typeLower === 'bourse' || typeLower === 'purse') {
            materialCoinPurseKey.value = item.key;
            materialCoinPurseLabel.value = item.label || 'Bourse';
          }
        }
      }
    }

    refreshMaterialItemsKeptState();

    if (!materialCoinPurseKey.value) {
      const candidate = materialProposals.value.flatMap((group) => group.items).find((item) => item.coinsCopper > 0);
      if (candidate) {
        materialCoinPurseKey.value = candidate.key;
        materialCoinPurseLabel.value = candidate.label || 'Bourse';
      }
    }

    materialCarryCapacity.value = computeCarryCapacity(previewCharacter);
  };

  const isMaterialItemKept = (key: string): boolean => {
    if (!key) {
      return true;
    }
    return materialSelections[key] !== false;
  };

  const setMaterialItemDecision = (key: string, keep: boolean) => {
    const normalized = String(key ?? '');
    if (!normalized.length) {
      return;
    }
    materialSelections[normalized] = keep;
    applyMaterialItemKeptFlag(normalized, keep);
    if (!keep) {
      clearAssignmentsForItem(normalized);
    }
  };

  const toggleMaterialItemDecision = (key: string) => {
    const normalized = String(key ?? '');
    if (!normalized.length) {
      return;
    }
    const next = !isMaterialItemKept(normalized);
    setMaterialItemDecision(normalized, next);
  };

  const resetMaterialSelections = () => {
    for (const group of materialProposals.value) {
      for (const item of group.items) {
        setMaterialItemDecision(item.key, true);
      }
    }
    refreshMaterialItemsKeptState();
  };

  const materialItems = computed(() =>
    materialProposals.value.flatMap((group) =>
      group.items.map((item) => ({
        group,
        item,
        keep: isMaterialItemKept(item.key)
      }))
    )
  );

  const materialKeptItems = computed(() => materialItems.value.filter((entry) => entry.keep));
  const materialSoldItems = computed(() => materialItems.value.filter((entry) => !entry.keep));

  const materialTotalWeightAll = computed(() =>
    materialItems.value.reduce((acc, entry) => acc + toFiniteNumber(entry.item.weightTotal, 0), 0)
  );
  const materialTotalWeightKept = computed(() =>
    materialKeptItems.value.reduce((acc, entry) => acc + toFiniteNumber(entry.item.weightTotal, 0), 0)
  );

  const materialCoinsFromKeptCopper = computed(() =>
    materialKeptItems.value.reduce((acc, entry) => acc + toFiniteNumber(entry.item.totalCoinsCopper, 0), 0)
  );
  const materialCoinsFromSalesCopper = computed(() =>
    materialSoldItems.value.reduce((acc, entry) => acc + toFiniteNumber(entry.item.totalSellValueCopper, 0), 0)
  );
  const materialFinalCoinsCopper = computed(
    () => materialCoinsFromKeptCopper.value + materialCoinsFromSalesCopper.value
  );
  const materialFinalCoins = computed(() => copperToCoins(materialFinalCoinsCopper.value));
  const materialSalesCoins = computed(() => copperToCoins(materialCoinsFromSalesCopper.value));
  const materialCarryCapacityValue = computed(() => materialCarryCapacity.value);
  const materialOverCapacity = computed(
    () =>
      materialCarryCapacity.value > 0 && materialTotalWeightKept.value > materialCarryCapacity.value
  );

  const materialCoinPurseItem = computed(() => {
    if (!materialCoinPurseKey.value) {
      return null;
    }
    return materialItems.value.find((entry) => entry.item.key === materialCoinPurseKey.value) ?? null;
  });

  const materialCoinPurseBaseCoins = computed(() => {
    const entry = materialCoinPurseItem.value;
    if (!entry) {
      return { gold: 0, silver: 0, copper: 0 };
    }
    return copperToCoins(toFiniteNumber(entry.item.totalCoinsCopper, 0));
  });

  const materialSummary = computed(() => ({
    proposals: materialProposals.value,
    totalWeightAll: materialTotalWeightAll.value,
    totalWeightKept: materialTotalWeightKept.value,
    carryCapacity: materialCarryCapacity.value,
    overCapacity: materialOverCapacity.value,
    finalCoins: materialFinalCoins.value,
    finalCoinsCopper: materialFinalCoinsCopper.value,
    salesCoins: materialSalesCoins.value,
    coinPurse: {
      key: materialCoinPurseKey.value,
      label: materialCoinPurseLabel.value,
      base: materialCoinPurseBaseCoins.value,
      final: materialFinalCoins.value
    }
  }));

  const formatMaterialItemDisplay = (
    item: MaterialProposalItem,
    coinsOverride: CoinBreakdown | null = null
  ): string => {
    const label = item.label || item.itemId;
    const quantitySuffix = item.quantity > 1 ? ` x${item.quantity}` : '';
    const coinsSource = coinsOverride ?? item.coins ?? null;
    if (coinsSource) {
      const parts: string[] = [];
      if (coinsSource.gold) parts.push(`${coinsSource.gold} po`);
      if (coinsSource.silver) parts.push(`${coinsSource.silver} pa`);
      if (coinsSource.copper) parts.push(`${coinsSource.copper} pc`);
      if (parts.length) {
        return `${label}${quantitySuffix} (${parts.join(', ')})`;
      }
    }
    return `${label}${quantitySuffix}`.trim();
  };

  // --- Slot candidates and assignments (for preview material preparation) ---
  type SlotId = 'primaryWeapon' | 'secondaryWeapon' | 'protection' | 'shield' | 'accessories';

  const lc = (v: unknown) => String(v ?? '').toLowerCase();
  const matchesType = (it: any, patterns: string[]) => {
    const typeLower = lc(it.type);
    if (typeLower.length) {
      if (patterns.some((pattern) => typeLower.includes(pattern))) {
        return true;
      }
    }
    return false;
  };
  const field = (it: any) => `${lc(it.type)} ${lc(it.label)} ${lc(it.itemId)}`.trim();
  // Type-driven filters per votre spec + fallback sur label/id si type absent
  const isWeapon = (it: any) =>
    matchesType(it, ['arme', 'weapon', 'focalisateur']) ||
    /(\barme\b|focalisateur)/.test(field(it)) ||
    /(arc|epee|fleche|dague|hache|masse|lance|marteau)/.test(`${lc(it.itemId)} ${lc(it.label)}`);
  const isProtection = (it: any) =>
    matchesType(it, ['armure', 'armor', 'armour', 'protection', 'vetement']) ||
    /(armure|protection|cuir|maille|plaque|armour)/.test(field(it));
  const isShield = (it: any) =>
    matchesType(it, ['bouclier', 'shield']) ||
    /(bouclier|shield)/.test(field(it));
  const isAccessory = (it: any) =>
    matchesType(it, ['accessoire', 'accessory', 'amulette', 'anneau', 'baguette', 'focus', 'kit']) ||
    /(accessoire|amulette|anneau|baguette|focus|talisman|gantelet)/.test(field(it));

  const slotCandidates = computed<Record<SlotId, any[]>>(() => {
    const items = materialKeptItems.value.map((e) => e.item);
    return {
      primaryWeapon: items.filter(isWeapon),
      secondaryWeapon: items.filter(isWeapon),
      protection: items.filter(isProtection),
      shield: items.filter(isShield),
      accessories: items.filter(isAccessory)
    };
  });

  const materialAssignments = reactive<{
    primaryWeaponKey: string | null
    secondaryWeaponKey: string | null
    protectionKey: string | null
    shieldKey: string | null
    accessoriesKeys: string[]
  }>({
    primaryWeaponKey: null,
    secondaryWeaponKey: null,
    protectionKey: null,
    shieldKey: null,
    accessoriesKeys: []
  });

  const clearAssignmentsForItem = (key: string | null | undefined) => {
    const normalized = String(key ?? '');
    if (!normalized.length) {
      return;
    }
    if (materialAssignments.primaryWeaponKey === normalized) {
      materialAssignments.primaryWeaponKey = null;
    }
    if (materialAssignments.secondaryWeaponKey === normalized) {
      materialAssignments.secondaryWeaponKey = null;
    }
    if (materialAssignments.protectionKey === normalized) {
      materialAssignments.protectionKey = null;
    }
    if (materialAssignments.shieldKey === normalized) {
      materialAssignments.shieldKey = null;
    }
    materialAssignments.accessoriesKeys = materialAssignments.accessoriesKeys.filter((k) => k !== normalized);
  };

  const applyMaterialItemKeptFlag = (key: string, keep: boolean) => {
    if (!key) {
      return;
    }
    for (const group of materialProposals.value) {
      const found = group.items.find((item) => item.key === key);
      if (found) {
        found.kept = keep;
        found.status = keep ? 'kept' : 'sold';
        return;
      }
    }
  };

  const refreshMaterialItemsKeptState = () => {
    for (const group of materialProposals.value) {
      for (const item of group.items) {
        const keep = isMaterialItemKept(item.key);
        item.kept = keep;
        item.status = keep ? 'kept' : 'sold';
      }
    }
  };

  const setMaterialAssignment = (slot: SlotId, key: string | null) => {
    const normalized = key !== null && key !== undefined ? String(key) : null;
    const keptKey = normalized && isMaterialItemKept(normalized) ? normalized : null;

    if (keptKey) {
      clearAssignmentsForItem(keptKey);
    }

    switch (slot) {
      case 'primaryWeapon':
        materialAssignments.primaryWeaponKey = keptKey;
        break;
      case 'secondaryWeapon':
        materialAssignments.secondaryWeaponKey = keptKey;
        break;
      case 'protection':
        materialAssignments.protectionKey = keptKey;
        break;
      case 'shield':
        materialAssignments.shieldKey = keptKey;
        break;
      case 'accessories':
        // Correction : structure if/else complète, évite la ligne "if" seule qui cassait la transformation
        if (!keptKey) {
          if (key === null) {
            materialAssignments.accessoriesKeys = [];
          }
          break;
        }
        if (!materialAssignments.accessoriesKeys.includes(keptKey)) {
          materialAssignments.accessoriesKeys.push(keptKey);
        }
        break;
    }
  };

  const clearAccessoryAssignment = (key: string) => {
    materialAssignments.accessoriesKeys = materialAssignments.accessoriesKeys.filter((k) => k !== key);
  };

  const unassignedKeptItems = computed(() => {
    const purseKey = materialCoinPurseKey.value;
    const selected = new Set<string>();
    const pushKey = (k: any) => {
      const id = String(k ?? '');
      if (id) selected.add(id);
    };
    pushKey(materialAssignments.primaryWeaponKey);
    pushKey(materialAssignments.secondaryWeaponKey);
    pushKey(materialAssignments.protectionKey);
    pushKey(materialAssignments.shieldKey);
    for (const k of materialAssignments.accessoriesKeys) pushKey(k);

    return materialKeptItems.value
      .map((e) => e.item)
      .filter((it) => {
        const id = String(it.key || it.itemId);
        if (purseKey && id === purseKey) return false;
        return !selected.has(id);
      });
  });

  // Acquired items with status after assignment
  const materialAcquired = computed(() => {
    const selected = new Set<string>();
    const push = (k: string | null | undefined) => { if (k) selected.add(String(k)); };
    push(materialAssignments.primaryWeaponKey);
    push(materialAssignments.secondaryWeaponKey);
    push(materialAssignments.protectionKey);
    push(materialAssignments.shieldKey);
    for (const k of materialAssignments.accessoriesKeys) push(String(k));

    const purseKey = materialCoinPurseKey.value;
    return materialKeptItems.value.map(({ item }) => {
      const id = String(item.key || item.itemId);
      const assigned = selected.has(id);
      const isPurse = purseKey && id === purseKey;
      return {
        item,
        status: assigned ? 'porte' : 'range',
        isPurse
      } as { item: any; status: 'porte'|'range'; isPurse: boolean };
    });
  });

  const sendPreview = async () => {
    const trimmedFullName = fullCharacterName.value.trim();
    const trimmedLegacyName = characterName.value.trim();
    const primaryName = trimmedFullName.length ? trimmedFullName : trimmedLegacyName;
    const trimmedFirstName = normalizeNamePart(characterFirstName.value);
    const trimmedLastName = normalizeNamePart(characterLastName.value);
    const trimmedNickname = normalizeNamePart(characterNickname.value);
    // Collect kept item keys to inform server of current decisions
    const keptItemKeys: string[] = (() => {
      try {
        const keys: string[] = [];
        for (const group of materialProposals.value) {
          for (const it of group.items) {
            if (isMaterialItemKept(it.key)) keys.push(String(it.key));
          }
        }
        return keys;
      } catch {
        return [];
      }
    })();

    const body = {
      selection: {
        class: selectedClass.value || null,
        race: selectedRace.value || null,
        background: selectedBackground.value || null,
        niveau: Number(niveau.value || 1),
        manual_features: [],
        chosenOptions: { ...chosenOptions }
      },
      baseCharacter: {
        name: primaryName.length ? primaryName : null,
        first_name: trimmedFirstName.length ? trimmedFirstName : null,
        last_name: trimmedLastName.length ? trimmedLastName : null,
        nickname: trimmedNickname.length ? trimmedNickname : null,
        base_stats_before_race: { ...baseStats }
      },
      keptItemKeys,
      forceReset: adapterResetPending.value
    };

    // --- NOUVEAU : s'assurer que la database locale contient les entités brutes nécessaires ---
    try {
      const dataStore = useDataStore();
      const parties = useParties();
      try {
        // Tenter de charger la database locale pour la partie courante (si applicable)
        await (dataStore.load?.(parties.currentPartyId ?? undefined) ?? Promise.resolve());
      } catch {}
      // Si certaines entités manquent, tenter d'enrichir via l'API serveur
      try {
        await restoreDatabaseFromIds();
      } catch {}
      // helper pour retrouver une entité soit par id clé, soit par nom
      const findEntity = (map: Record<string, any> = {}, wanted: unknown) => {
        if (!wanted) return null;
        const key = String(wanted).trim();
        if (!key.length) return null;
        if (map[key]) return map[key];
        const wantLower = key.toLowerCase();
        return Object.values(map).find((e: any) => {
          if (!e || typeof e !== 'object') return false;
          const id = String(e.id ?? '').toLowerCase();
          const name = String(e.name ?? e.nom ?? e.label ?? e.slug ?? '').toLowerCase();
          return id === wantLower || name === wantLower;
        }) ?? null;
      };

      const rawClass = findEntity(dataStore.maps.classes || {}, selectedClass.value);
      const rawRace = findEntity(dataStore.maps.races || {}, selectedRace.value);
      const rawBackground = findEntity(dataStore.maps.backgrounds || {}, selectedBackground.value);

      // Injecter les entités brutes dans le corps de la requête pour le serveur
      (body as any).raw_entities = {
        race: rawRace,
        class: rawClass,
        background: rawBackground
      };
    } catch (e) {
      // ne bloque pas la preview si l'enrichissement échoue
      try { console.warn('[sendPreview] raw_entities enrichment failed', e); } catch {}
    }
    // --- FIN injection raw_entities ---

    const hasSelection = hasPrimarySelection();
    if (!hasSelection) {
      lastPreviewPayload = '';
      if (!preview.value) {
        lastPreviewSuccessPayload = '';
      }
    }

    const payloadSignature = JSON.stringify(body);
    if (!previewPromise && !adapterResetPending.value && payloadSignature === lastPreviewSuccessPayload) {
      return preview.value;
    }
    if (previewPromise && payloadSignature === lastPreviewPayload) {
      return previewPromise;
    }

    if (previewAbort) {
      previewAbort.abort();
    }

    const controller = new AbortController();
    previewAbort = controller;
    lastPreviewPayload = payloadSignature;

    const task = (async () => {
      loading.value = true;
      preview.value = null;
      rawText.value = '';
      resetMaterialState();
      try {
        const res = await requestFetch('/api/creation/preview', {
          method: 'POST',
          body,
          signal: controller.signal
        });
        if (controller.signal.aborted) {
          return;
        }

        preview.value = res;
        rawText.value = JSON.stringify(res, null, 2);
        persistSelections();
        hydrateMaterialFromPreview(res?.previewCharacter ?? null);
        lastPreviewSuccessPayload = payloadSignature;
        adapterResetPending.value = false;
        if (res?.pendingChoices && Array.isArray(res.pendingChoices)) {
          for (const [idx, pc] of (res.pendingChoices as any[]).entries()) {
            const key = getChoiceKey(pc, idx);
            registerChoiceMetadata(pc, key);
            const options = getChoiceOptions(pc);
            cacheChoiceOptions(key, options);
            if (!key) continue;
            if (key in chosenOptions) {
              const existing = chosenOptions[key];
              localChosen[key] = Array.isArray(existing) ? [...existing] : existing;
              continue;
            }
            if (!(key in localChosen)) {
              const requirement = getChoiceRequirement(pc);
              if (requirement > 1) {
                localChosen[key] = [];
              } else if (options.length === 1) {
                localChosen[key] = options[0].value;
              } else {
                localChosen[key] = null;
              }
            }
          }
        }
      } catch (err: any) {
        if (controller.signal.aborted) {
          return;
        }
        resetMaterialState();
        preview.value = {
          ok: false,
          errors: [{ type: 'network', message: String(err?.message ?? err) }]
        };
        rawText.value = String(err?.message ?? err);
      } finally {
        if (previewAbort === controller) {
          previewAbort = null;
          lastPreviewPayload = '';
          loading.value = false;
        }
        if (previewPromise === task) {
          previewPromise = null;
        }
      }
    })();

    previewPromise = task;
    return task;
  };

  const applyChoice = async (choice: any) => {
    const key = getChoiceKey(choice);
    if (!key) {
      if (process.client) {
        window.alert('Choice has no ui_id/featureId — cannot apply from UI');
      }
      return;
    }
    registerChoiceMetadata(choice, key);
    cacheChoiceOptions(key, getChoiceOptions(choice));

    const val = localChosen[key];
    if (!valueExists(val)) {
      if (process.client) {
        window.alert('Aucune valeur sélectionnée');
      }
      return;
    }
    if (Number(choice.choose ?? 1) > 1) {
      chosenOptions[key] = Array.isArray(val) ? [...val] : [val];
    } else {
      chosenOptions[key] = Array.isArray(val) ? [...val] : val;
    }
    await sendPreview();
  };

  const resetChosenOptions = async () => {
    for (const k of Object.keys(chosenOptions)) {
      delete chosenOptions[k];
    }
    for (const k of Object.keys(localChosen)) {
      delete localChosen[k];
    }
    for (const k of Object.keys(choiceOptionCache)) {
      delete choiceOptionCache[k];
    }
    for (const k of Object.keys(choiceMetadata)) {
      delete choiceMetadata[k];
    }
    characterName.value = '';
    characterFirstName.value = '';
    characterLastName.value = '';
    characterNickname.value = '';
    await sendPreview();
  };

  const resetChoiceById = async (id: string | number) => {
    if (id === null || id === undefined) return;
    const key = String(id);
    if (key in chosenOptions) {
      delete chosenOptions[key];
    }
    if (key in localChosen) {
      delete localChosen[key];
    }
    await sendPreview();
  };

  const resetChoice = async (choice: any) => {
    const key = getChoiceKey(choice);
    if (!key) return;
    await resetChoiceById(key);
  };

  const displayStats = computed(() => {
    const out: Record<string, any> = {};
    for (const k of Object.keys(baseStats)) out[k] = baseStats[k];
    try {
      const fs = preview.value?.previewCharacter?.final_stats ?? {};
      if (fs && typeof fs === 'object') {
        for (const kk of Object.keys(fs)) {
          out[kk] = fs[kk];
        }
      }
    } catch (e) {
      // ignore
    }
    return out;
  });

  const createPersonnagePayload = async (): Promise<Personnage> => {
    if (!preview.value?.ok) {
      throw new Error('Aucune prévisualisation valide disponible.');
    }

    const previewCharacter = (preview.value?.previewCharacter ?? {}) as Record<string, any>;
    const dataStore = useDataStore()
    try {
      const parties = useParties()
      await (dataStore.load?.(parties.currentPartyId ?? undefined) ?? Promise.resolve())
    } catch {}
    try {
      await restoreDatabaseFromIds(previewCharacter)
    } catch {}


    const statsSource = {
      ...(previewCharacter.base_stats_before_race ?? {}),
      ...(previewCharacter.final_stats ?? {})
    } as Record<string, unknown>;

    const ensureNumber = (value: unknown, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const getStat = (key: keyof typeof baseStats) => {
      if (key in statsSource) {
        const candidate = statsSource[key];
        if (typeof candidate === 'number' && Number.isFinite(candidate)) {
          return candidate;
        }
      }
      const fallback = baseStats[key];
      return typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : 0;
    };

    const statMap: Array<{ target: keyof Personnage['caracs']; source: keyof typeof baseStats }> = [
      { target: 'force', source: 'strength' },
      { target: 'dexterite', source: 'dexterity' },
      { target: 'constitution', source: 'constitution' },
      { target: 'intelligence', source: 'intelligence' },
      { target: 'sagesse', source: 'wisdom' },
      { target: 'charisme', source: 'charisma' }
    ];

    const caracs = statMap.reduce((acc, entry) => {
      acc[entry.target] = getStat(entry.source);
      return acc;
    }, {} as Personnage['caracs']);

    const identityLabels = identitySummary.value.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.id] = entry.name;
      return acc;
    }, {});

    const toDisplayString = (value: unknown, fallback = ''): string => {
      if (typeof value === 'string' && value.trim().length) {
        return value.trim();
      }
      return fallback;
    };

    const toList = (value: unknown): string[] => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry;
          }
          if (entry && typeof entry === 'object') {
            if ('label' in entry && typeof entry.label === 'string') {
              return entry.label;
            }
            if ('name' in entry && typeof entry.name === 'string') {
              return entry.name;
            }
          }
          try {
            return JSON.stringify(entry);
          } catch (err) {
            return String(entry);
          }
        })
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    };

    const proficiencies = toList(previewCharacter.proficiencies).reduce<Record<string, ProficiencyRank>>((acc, entry) => {
      const id = String(entry ?? '').trim();
      if (!id.length) return acc;
      acc[id] = 'maitrise';
      return acc;
    }, {});

    const languages = toList(previewCharacter.languages);

    const trimValue = (value: string | null | undefined): string => (value ?? '').trim();
    const toNullableString = (value: string | null | undefined): string | null => {
      const trimmed = (value ?? '').trim();
      return trimmed.length ? trimmed : null;
    };

    const keptItemsRaw = materialKeptItems.value.map((entry) => entry.item);
    const normalizeKey = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      return str.length ? str : null;
    };

    const inventoryTransition = buildCreationInventoryTransition({
      entries: keptItemsRaw,
      assignments: {
        primaryWeaponKey: materialAssignments.primaryWeaponKey,
        secondaryWeaponKey: materialAssignments.secondaryWeaponKey,
        protectionKey: materialAssignments.protectionKey,
        shieldKey: materialAssignments.shieldKey
      },
      purseKey: materialCoinPurseKey.value ? String(materialCoinPurseKey.value) : null,
      finalCoins: materialFinalCoins.value ?? null
    });

    const originToSlug = new Map<string, string>();
    const slugToOrigin = new Map<string, string>();
    for (const item of inventoryTransition.items) {
      if (item.originId) {
        originToSlug.set(item.originId, item.id);
        slugToOrigin.set(item.id, item.originId);
      }
    }

    const slugForOrigin = (key: string | null): string | null => {
      if (!key) return null;
      return originToSlug.get(key) ?? key;
    };
    const originForSlug = (slug: string | null): string | null => {
      if (!slug) return null;
      return slugToOrigin.get(slug) ?? slug;
    };

    const labelForKey = (key: string | null): string | null => {
      if (!key) return null;
      const target = keptItemsRaw.find((item: any) => String(item.key || item.itemId) === key);
      if (!target) return null;
      const label = target.label ?? target.itemId;
      return label ? String(label) : null;
    };

    const primaryOriginKey = normalizeKey(materialAssignments.primaryWeaponKey);
    const secondaryOriginKey = normalizeKey(materialAssignments.secondaryWeaponKey);
    const protectionOriginKey = normalizeKey(materialAssignments.protectionKey);
    const shieldOriginKey = normalizeKey(materialAssignments.shieldKey);
    const accessoiresIds = Array.isArray(materialAssignments.accessoriesKeys)
      ? materialAssignments.accessoriesKeys
          .map((id: unknown) => normalizeKey(id))
          .filter((id): id is string => Boolean(id))
      : [];

    const primaryKey = primaryOriginKey;
    const secondaryKey = secondaryOriginKey;
    const protectionKey = protectionOriginKey;
    const shieldKey = shieldOriginKey;

    let appliedFeatureLedger = normalizeFeatureLedger(
      (preview.value as any)?.featureLedger ??
        (preview.value as any)?.previewCharacter?.featureLedger ??
        null
    );
    const appliedFeatureSet = new Set<string>(flattenFeatureLedger(appliedFeatureLedger));

    const ensureFeatureInLedger = (featureId: unknown, parentId: unknown = null) => {
      const feature = String(featureId ?? '').trim();
      if (!feature.length) return;
      const parent = String(parentId ?? '').trim();
      appliedFeatureLedger = ledgerAddFeature(
        appliedFeatureLedger,
        parent.length ? parent : feature,
        feature
      );
      appliedFeatureSet.add(feature);
    };

    const fallbackFeatureArrays = [
      (preview.value as any)?.appliedFeatures,
      (preview.value as any)?.previewCharacter?.appliedFeatures,
      (preview.value as any)?.previewCharacter?.features
    ];
    for (const arr of fallbackFeatureArrays) {
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        ensureFeatureInLedger(entry);
      }
    }
    ensureFeatureInLedger(selectedClass.value);
    ensureFeatureInLedger(selectedRace.value);
    ensureFeatureInLedger(selectedBackground.value);
    const knownSpells: string[] = Array.isArray(previewCharacter?.spellcasting?.known)
      ? (previewCharacter.spellcasting.known as any[]).map((s) => String(s))
      : [];

    // Construire l'inventaire minimal a partir des items conserves (proposals) pour garder les IDs stables (itemId)
    const minimalInventory = (() => {
      const purseKey = materialCoinPurseKey.value ? String(materialCoinPurseKey.value) : null;
      const keptEntries = materialKeptItems.value as Array<{ item: any; keep?: boolean }>;
      const out: { id: string; quantity: number; coins?: { gold: number; silver: number; copper: number } | null }[] = [];
      for (const entry of keptEntries) {
        const it = entry?.item ?? {};
        // Priorite a itemId (ID de repo), fallback sur id/resolved.id
        const stableId = String(
          it.itemId ?? it.id ?? it.resolved?.id ?? ''
        ).trim();
        if (!stableId) continue;
        const quantity = Number(it.quantity ?? it.qte ?? 1) || 1;
        const e: any = { id: stableId, quantity };
        const key = String(it.key ?? '');
        if (purseKey && key && key === purseKey) {
          e.coins = materialFinalCoins.value ?? null;
        }
        out.push(e);
      }
      return out;
    })();

    const mergeStatBase = (target: Record<string, any> | null, payload: any): Record<string, any> => {
      if (!payload || typeof payload !== 'object') return target ?? {};
      const next: Record<string, any> = { ...(target ?? {}) };
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
          const existing = Array.isArray(next[key]) ? (next[key] as any[]) : [];
          next[key] = [...existing, ...value];
        } else {
          next[key] = value;
        }
      }
      return next;
    };

    // Deriver DV et PV depuis la classe + CON
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

    let dvDerived = 0;
    let classHitPoints: any = null;
    let statBasePayload: Record<string, any> | null = null;
    let spellcastingPayload: any = null;
    try {
      const dataStore = useDataStore();
      const cid = selectedClass.value || null;
      if (cid) {
        const wanted = String(cid).trim().toLowerCase();
        const found = Object.values(dataStore.maps.classes || {}).find((c: any) => {
          if (!c || typeof c !== 'object') return false;
          const id = String(c.id ?? '').toLowerCase();
          const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase();
          return id === wanted || name === wanted;
        });
        const catalogClasse = classes.value.find((entry) => {
          if (!entry) return false;
          const id = String(entry.id ?? '').toLowerCase();
          const slug = String((entry as any)?.slug ?? '').toLowerCase();
          return id === wanted || slug === wanted;
        });
        spellcastingPayload = (found as any)?.spellcasting_feature || (found as any)?.spellcasting || null;
        dvDerived =
          pickNumberFromKeys(found, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice', 'dice.hit_die'], 0) ||
          pickNumberFromKeys(catalogClasse, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice'], 0) ||
          0;
        const hpFromFound = extractHitPoints(found);
        const hpFromCatalog = extractHitPoints(catalogClasse);
        classHitPoints = hpFromFound ?? hpFromCatalog ?? null;
        const classEffects = normalizeEffects((found as any)?.effects ?? []);
        for (const ef of classEffects) {
          if (ef?.type === 'add_stat_base') {
            statBasePayload = mergeStatBase(statBasePayload, ef.payload ?? {});
          }
        }
        const catalogEffects = normalizeEffects((catalogClasse as any)?.effects ?? []);
        for (const ef of catalogEffects) {
          if (ef?.type === 'add_stat_base') {
            statBasePayload = mergeStatBase(statBasePayload, ef.payload ?? {});
          }
        }
      }
    } catch {}

    try {
      const dataStore = useDataStore();
      const rid = selectedRace.value || null;
      if (rid) {
        const wantedRace = String(rid).trim().toLowerCase();
        const foundRace = Object.values(dataStore.maps.races || {}).find((r: any) => {
          if (!r || typeof r !== 'object') return false;
          const id = String(r.id ?? '').toLowerCase();
          const name = String(r.name ?? r.nom ?? r.label ?? r.slug ?? '').toLowerCase();
          return id === wantedRace || name === wantedRace;
        });
        const raceEffects = normalizeEffects(foundRace?.effects ?? []);
        for (const ef of raceEffects) {
          if (ef?.type === 'add_stat_base') {
            statBasePayload = mergeStatBase(statBasePayload, ef.payload ?? {});
          }
        }
      }
    } catch {}

    const conScore = getStat('constitution');
    const conMod = Math.floor((Number(conScore) - 10) / 2);
    const niveauValue = ensureNumber(previewCharacter.niveau ?? niveau.value, 1);
    const previewDv = ensureNumber(previewCharacter.dv ?? previewCharacter.hit_dice ?? previewCharacter.hit_die, 0);
    const dvFinal = previewDv || dvDerived || 0;
    const previewPvMax = ensureNumber(previewCharacter.pv_max ?? previewCharacter.hp?.max, 0);
    const pvMaxFinal = (() => {
      if (previewPvMax > 0) return previewPvMax;
      if (classHitPoints && typeof classHitPoints === 'object') {
        try {
          const l1 = evalFormuleAdditive(String(classHitPoints.level_1 || ''), niveauValue, caracs as any);
          const per = evalFormuleAdditive(String(classHitPoints.per_level_after_1 || ''), niveauValue, caracs as any);
          const add = (x: number) => Math.max(1, Number(x) || 0);
          let sum = add(l1);
          for (let i = 2; i <= niveauValue; i++) sum += add(per);
          return sum;
        } catch {}
      }
      return 0;
    })();
    const pvActuelsFinal = (() => {
      const candidates = [
        previewCharacter.pvActuels,
        previewCharacter.hp?.current,
        previewCharacter.final_stats?.hp,
        previewCharacter.hp
      ];
      const first = candidates.find((x) => Number.isFinite(Number(x)) && Number(x) > 0);
      const value = Number(first ?? 0);
      if (pvMaxFinal > 0) {
        if (value > 0) return Math.min(value, pvMaxFinal);
        return pvMaxFinal;
      }
      return value > 0 ? value : 0;
    })();

    const statBasesResult = resolveStatBasePayload(statBasePayload, niveauValue, caracs);
    const subclassIdSlot1 = (() => {
      const candidate =
        (previewCharacter as any)?.subclass_id ??
        (previewCharacter as any)?.subclassId ??
        (previewCharacter as any)?.subclasseId ??
        null
      if (candidate === null || candidate === undefined) return null
      const str = String(candidate).trim()
      return str.length ? str : null
    })();

    const personnage: Personnage = {
      id: toDisplayString(previewCharacter.id, `pj_${Date.now()}`),
      nom: displayCharacterName.value,
      lignee: toDisplayString(identityLabels.race, '—'),
      age: ensureNumber(previewCharacter.age, 18),
      alignement: toDisplayString(previewCharacter.alignement, 'Neutre'),
      historique: toDisplayString(identityLabels.background, ''),
      classe: toDisplayString(identityLabels.class, ''),
      sousClasse: toDisplayString(previewCharacter.subclass ?? previewCharacter.sousClasse, ''),
      niveau: niveauValue,
      xp: xpThresholdForLevel(niveauValue),
      dv: dvFinal,
      pvActuels: pvActuelsFinal,
      hit_points: classHitPoints && typeof classHitPoints === 'object' ? { ...classHitPoints } : null,
      caracs,
      competences: proficiencies,
      langues: languages.length ? languages.join(', ') : 'Commun',
      armure: { type: 'aucune' },
      bouclier: Boolean(previewCharacter.bouclier ?? false),
      monture: {
        nom: toDisplayString(previewCharacter.monture?.nom ?? ''),
        vitesse: toDisplayString(previewCharacter.monture?.vitesse ?? ''),
        notes: toDisplayString(previewCharacter.monture?.notes ?? '')
      },
      inspiration: Boolean(previewCharacter.inspiration ?? false),
      inventaire: minimalInventory,
      statBases: statBasesResult,
      classeId: selectedClass.value || null,
      classeId1: selectedClass.value || null,
      subclasseId1: subclassIdSlot1,
      levelClasse1: niveauValue,
      classeId2: null,
      subclasseId2: null,
      levelClasse2: 0,
      classes: {
        1: { classeId: selectedClass.value || null, subclasseId: subclassIdSlot1, niveau: niveauValue },
        2: { classeId: null, subclasseId: null, niveau: 0 }
      },
      raceId: selectedRace.value || null,
      backgroundId: selectedBackground.value || null,
      featureIds: appliedFeatureLedger,
      spellIds: knownSpells,
      traits: Array.isArray(previewCharacter?.traits) ? previewCharacter.traits.map((t: any) => String(t?.id ?? t)) : [],
      spellcastingSpec: (() => {
        const spell = (previewCharacter?.spellcasting ?? {}) as any;
        const ability = spell?.ability ?? spellcastingPayload?.ability ?? null;
        const meta = spell?.meta ?? {};
        const slotsSource = spell?.slots ?? spellcastingPayload?.slots_table ?? {};
        const slots: Record<string, number | string> = {};
        if (slotsSource && typeof slotsSource === 'object') {
          for (const [k, v] of Object.entries(slotsSource)) {
            slots[k] = typeof v === 'number' ? v : String(v);
          }
        }
        const description = spellcastingPayload?.description ?? spell?.description ?? null;
        if (!ability && meta?.spell_save_dc == null && meta?.spell_attack_mod == null && !Object.keys(slots).length && !description) {
          return null;
        }
        return {
          ability: ability ? String(ability) : null,
          spellSaveDc: meta?.spell_save_dc ?? null,
          spellAttackMod: meta?.spell_attack_mod ?? null,
          slots,
          description: description ? String(description) : null
        };
      })(),
      materielPersonnalise: {
        armePrincipale: toNullableString(materialPlan.primaryWeapon) ?? labelForKey(primaryOriginKey),
        armePrincipaleId: primaryKey,
        armeSecondaire: toNullableString(materialPlan.secondaryWeapon) ?? labelForKey(secondaryOriginKey),
        armeSecondaireId: secondaryKey,
        protection: toNullableString(materialPlan.protection) ?? labelForKey(protectionOriginKey),
        protectionId: protectionKey,
        bouclier: toNullableString(materialPlan.shield) ?? labelForKey(shieldOriginKey),
        bouclierId: shieldKey,
        paquetage: toNullableString(materialPlan.pack),
        paquetageId: null,
        accessoires: toNullableString(materialPlan.accessories),
        accessoiresIds,
        // On stocke désormais les IDs repo conservés/portés
        keptIds: inventoryTransition.items.map(it => String(it.originId)).filter(Boolean),
        equippedIds: inventoryTransition.items.filter(it => it.equipped).map(it => String(it.originId)).filter(Boolean),
        notes: trimValue(materialPlan.notes)
      },
      descriptionDetaillee: {
        bio: trimValue(descriptionFields.bio),
        physique: trimValue(descriptionFields.physique),
        personnalite: trimValue(descriptionFields.personnalite),
        objectifs: trimValue(descriptionFields.objectifs),
        relations: trimValue(descriptionFields.relations),
        defauts: trimValue(descriptionFields.defauts)
      },
      // Ajout du template UI de la classe (si présent dans le catalogue)
      ui_template: null
    }
    
    // Récupération du template UI de classe (robuste)
    let uiTemplate: string | null = null
    try {
      const classeId = selectedClass.value || null
      const dataStore = useDataStore()
      // S'assurer que la database locale est chargée (peut dépendre de la partie courante)
      try {
        // useParties peut être importé au besoin, mais load() accepte undefined
        await (dataStore.load?.() ?? Promise.resolve())
      } catch {}

      const normalizeKey = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim().toLowerCase())
      const wanted = normalizeKey(classeId)

      // 1) Cherche dans les objets bruts importés depuis GitHub (dataStore.maps.classes)
      if (wanted) {
        const all = Object.values(dataStore.maps.classes || {})
        const found = all.find((c: any) => {
          if (!c || typeof c !== 'object') return false
          const id = normalizeKey(c.id)
          const name = normalizeKey(c.name ?? c.nom ?? c.label ?? c.slug)
          return id === wanted || name === wanted
        })
        if (found && typeof found.ui_template === 'string' && found.ui_template.trim().length) {
          uiTemplate = found.ui_template.trim()
        }
      }

      // 2) Si non trouvé, tentative sur le catalogue normalisé (classes.value)
      if (!uiTemplate && classeId) {
        const entry = classes.value.find((c) => {
          if (!c) return false
          const cid = normalizeKey(c.id)
          const cname = normalizeKey(c.name)
          return cid === wanted || cname === wanted
        })
        if (entry && typeof (entry as any).ui_template === 'string' && (entry as any).ui_template.trim().length) {
          uiTemplate = (entry as any).ui_template.trim()
        }
      }

      // 3) Dernier recours : champ présent directement dans la prévisualisation serveur
      if (!uiTemplate && previewCharacter && typeof previewCharacter.ui_template === 'string') {
        uiTemplate = previewCharacter.ui_template.trim() || null
      }
    } catch (e) {
      // ignore
    }

    personnage.ui_template = uiTemplate

    return personnage;
  };

  type InitializeOptions = {
    restoreFromStorage?: boolean;
    generatePreview?: boolean;
  };

  const initialize = async (options: InitializeOptions = {}) => {
    const { restoreFromStorage = true, generatePreview = false } = options;
    const wasInitialized = initialized.value;

    if (process.client) {
      restoreLockState();
    } else {
      creationLocked.value = false;
    }

    let restoredBeforeInit = false;
    if (
      restoreFromStorage &&
      process.client &&
      !initialized.value &&
      !hasRestoredSelections.value
    ) {
      restoreSelections();
      restoredBeforeInit = true;
    }

    if (!initialized.value) {
      initialized.value = true;
      await loadCatalog();
      if (generatePreview && hasPrimarySelection()) {
        await sendPreview();
      }
    }

    if (restoreFromStorage && process.client && !restoredBeforeInit) {
      const wasRestored = hasRestoredSelections.value;
      const didRestore = restoreSelections();
      if (
        generatePreview &&
        !wasRestored &&
        didRestore &&
        !wasInitialized &&
        hasPrimarySelection()
      ) {
        await sendPreview();
      }
    }
  };

  const catalogGroup = {
    classes,
    races,
    backgrounds
  };

  const selectionsGroup = {
    niveau,
    selectedClass,
    selectedRace,
    selectedBackground,
    primarySelectionGroups,
    getPrimarySelectedLabel,
    selectPrimaryOption,
    hasPrimarySelection
  };

  const identityGroup = {
    characterName,
    characterFirstName,
    characterLastName,
    characterNickname,
    displayCharacterName,
    fullCharacterName,
    previewPortrait,
    identitySummary
  };

  const pointBuyGroup = {
    baseStats,
    pointBuyBudget,
    pointBuyMin,
    pointBuyMax,
    pointBuySpent,
    pointBuyRemaining,
    isPointBuyBalanced,
    pointBuyCostFor,
    canIncreaseBaseStat,
    canDecreaseBaseStat,
    increaseBaseStat,
    decreaseBaseStat,
    resetBaseStats
  };

  const choicesGroup = {
    chosenOptions,
    localChosen,
    choiceOptionCache,
    choiceMetadata,
    getChoiceKey,
    getChoiceTitle,
    getChoiceRequirement,
    getChoiceCategoryLabel,
    getChoiceSourceLabel,
    getChoiceOptions,
    getChoiceOptionImage,
    getChoiceOptionDescription,
    getLocalChoiceCount,
    isChoiceOptionSelected,
    handleChoiceOptionClick,
    isChoiceOptionDisabled,
    hasLocalChoiceValue,
    appliedChoices,
    applyChoice,
    resetChoice,
    resetChoiceById,
    resetChosenOptions,
    registerChoiceMetadata,
    cacheChoiceOptions
  };

  const materialGroup = {
    plan: materialPlan,
    description: descriptionFields,
    proposals: materialProposals,
    items: materialItems,
    keptItems: materialKeptItems,
    soldItems: materialSoldItems,
    summary: materialSummary,
    totalWeightAll: materialTotalWeightAll,
    totalWeightKept: materialTotalWeightKept,
    carryCapacity: materialCarryCapacityValue,
    overCapacity: materialOverCapacity,
    finalCoins: materialFinalCoins,
    finalCoinsCopper: materialFinalCoinsCopper,
    salesCoins: materialSalesCoins,
    coinPurseKey: materialCoinPurseKey,
    coinPurseLabel: materialCoinPurseLabel,
    coinPurseBase: materialCoinPurseBaseCoins,
    isItemKept: isMaterialItemKept,
    setItemDecision: setMaterialItemDecision,
    toggleItemDecision: toggleMaterialItemDecision,
    resetSelections: resetMaterialSelections,
    formatItemDisplay: formatMaterialItemDisplay
  };

  const previewGroup = {
    preview,
    creationLocked,
    rawText,
    showRaw,
    loading,
    displayStats,
    sendPreview,
    createPersonnagePayload
  };

  const lifecycleGroup = {
    initialize,
    loadCatalog,
    persistSelections,
    restoreSelections,
    hasRestoredSelections,
    restoreLockState,
    lockCreation,
    unlockCreation
  };

  // Ajout d'une méthode utilitaire pour récupérer les infos complètes d'un spell ou feature
  const getSpellOrFeatureDetails = (id: string, type: 'spell' | 'feature') => {
    const dataStore = useDataStore();
    if (type === 'spell') {
      return dataStore.maps.spells?.[id] ?? null;
    }
    if (type === 'feature') {
      return dataStore.maps.features?.[id] ?? null;
    }
    return null;
  };

  const completionRequestState: { inFlight: Promise<void> | null } = {
    inFlight: null
  };

  /**
   * Restaure la database locale en complétant les entités manquantes (spells, features, items, classes, races, backgrounds)
   * à partir des IDs présents dans la fiche du personnage ou du preview.
   * Utilise l'API /api/creation/complete pour enrichir dataStore.maps.
   */
  const completionCache = {
    classes: new Set<string>(),
    races: new Set<string>(),
    backgrounds: new Set<string>(),
    features: new Set<string>(),
    spells: new Set<string>(),
    items: new Set<string>()
  };

  const cacheAddFromEntries = (kind: keyof typeof completionCache, entries: Record<string, any> | null | undefined) => {
    if (!entries || typeof entries !== 'object') return;
    for (const key of Object.keys(entries)) {
      const str = String(key ?? '').trim();
      if (str.length) completionCache[kind].add(str);
    }
  };

  const syncCompletionCacheFromStore = (dataStore: ReturnType<typeof useDataStore>) => {
    cacheAddFromEntries('classes', dataStore.maps.classes);
    cacheAddFromEntries('races', dataStore.maps.races);
    cacheAddFromEntries('backgrounds', dataStore.maps.backgrounds);
    cacheAddFromEntries('features', dataStore.maps.features);
    cacheAddFromEntries('spells', dataStore.maps.spells);
    cacheAddFromEntries('items', dataStore.maps.items);
  };

  const restoreDatabaseFromIds = async (personnage?: any) => {
    if (completionRequestState.inFlight) {
      try {
        await completionRequestState.inFlight;
      } catch {
        // ignore previous failure, a new attempt will run with refreshed payload
      }
    }

    const normalizeIds = (values: Array<unknown>): string[] => {
      const seen = new Set<string>();
      const pushValue = (raw: unknown) => {
        if (raw === null || raw === undefined) return;
        if (Array.isArray(raw)) {
          for (const entry of raw) pushValue(entry);
          return;
        }
        if (typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          const candidate =
            obj.id ??
            obj.featureId ??
            obj.feature_id ??
            obj.featureID ??
            obj.value ??
            obj.key ??
            null;
          if (candidate !== null && candidate !== undefined) {
            const fromObject = String(candidate).trim();
            if (fromObject.length) {
              seen.add(fromObject);
              return;
            }
          }
        }
        const str = typeof raw === 'string' ? raw.trim() : String(raw).trim();
        if (str.length) seen.add(str);
      };
      for (const value of values) pushValue(value);
      return Array.from(seen);
    };

    const dataStore = useDataStore();
    syncCompletionCacheFromStore(dataStore);
    const ids = {
      spells: [] as Array<unknown>,
      features: [] as Array<unknown>,
      items: [] as Array<unknown>,
      classes: [] as Array<unknown>,
      races: [] as Array<unknown>,
      backgrounds: [] as Array<unknown>
    };
    const source = personnage ?? preview.value?.previewCharacter ?? {};
    if (Array.isArray(source.spellIds)) ids.spells.push(...source.spellIds);
    if (source?.spellcasting && typeof source.spellcasting === 'object') {
      const spellcasting = source.spellcasting as Record<string, any>;
      if (Array.isArray(spellcasting.known)) ids.spells.push(...spellcasting.known);
      if (Array.isArray(spellcasting.prepared)) ids.spells.push(...spellcasting.prepared);
    }
    ids.features.push(...flattenFeatureLedger(normalizeFeatureLedger(source.featureIds ?? {})));
    ids.features.push(...flattenFeatureLedger(normalizeFeatureLedger(source.featureLedger ?? {})));
    if (Array.isArray(source.appliedFeatures)) ids.features.push(...source.appliedFeatures);
    if (Array.isArray(source.features)) ids.features.push(...source.features);
    if (Array.isArray(source.manual_features)) ids.features.push(...source.manual_features);
    if (source?.chosenOptions && typeof source.chosenOptions === 'object') {
      for (const value of Object.values(source.chosenOptions as Record<string, unknown>)) {
        ids.features.push(value);
      }
    }
    if (Array.isArray(source.inventaire)) {
      for (const entry of source.inventaire) {
        if (entry && entry.id) ids.items.push(entry.id);
      }
    }
    if (source.classeId) ids.classes.push(source.classeId);
    if (source.raceId) ids.races.push(source.raceId);
    if (source.backgroundId) ids.backgrounds.push(source.backgroundId);

    const normalizedIds = {
      spells: normalizeIds(ids.spells),
      features: normalizeIds(ids.features),
      items: normalizeIds(ids.items),
      classes: normalizeIds(ids.classes),
      races: normalizeIds(ids.races),
      backgrounds: normalizeIds(ids.backgrounds)
    };

    const featureCandidates = normalizedIds.features.filter((id) => {
      if (!id) return false;
      if (normalizedIds.classes.includes(id)) return false;
      if (normalizedIds.races.includes(id)) return false;
      if (normalizedIds.backgrounds.includes(id)) return false;
      return true;
    });

    const shouldFetch = (kind: keyof typeof completionCache, map: Record<string, any>, id: string): boolean => {
      if (!id) return false;
      if (completionCache[kind].has(id)) return false;
      if (map && typeof map === 'object' && map[id]) return false;
      return true;
    };

    const missing = {
      spells: normalizedIds.spells.filter((id) => shouldFetch('spells', dataStore.maps.spells, id)),
      features: featureCandidates.filter((id) => shouldFetch('features', dataStore.maps.features, id)),
      items: normalizedIds.items.filter((id) => shouldFetch('items', dataStore.maps.items, id)),
      classes: normalizedIds.classes.filter((id) => shouldFetch('classes', dataStore.maps.classes, id)),
      races: normalizedIds.races.filter((id) => shouldFetch('races', dataStore.maps.races, id)),
      backgrounds: normalizedIds.backgrounds.filter((id) => shouldFetch('backgrounds', dataStore.maps.backgrounds, id))
    };

    const totalMissing =
      missing.spells.length +
      missing.features.length +
      missing.items.length +
      missing.classes.length +
      missing.races.length +
      missing.backgrounds.length;

    if (totalMissing === 0) return;

    const pickId = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const candidate = obj.id ?? obj.value ?? obj.key ?? null;
        if (candidate !== null && candidate !== undefined) {
          const strCandidate = String(candidate).trim();
          if (strCandidate.length) return strCandidate;
        }
      }
      const str = String(value).trim();
      return str.length ? str : null;
    };

    const selection = {
      class: missing.classes.length ? (pickId((source as any).classeId) ?? pickId(selectedClass.value)) : null,
      race: missing.races.length ? (pickId((source as any).raceId) ?? pickId(selectedRace.value)) : null,
      background: missing.backgrounds.length ? (pickId((source as any).backgroundId) ?? pickId(selectedBackground.value)) : null,
      niveau: source.niveau ?? niveau.value,
      chosenOptions: source.chosenOptions ?? chosenOptions
    };

    const previewCharacter = source ?? null;
    const requestFetch = useRequestFetch();

    const fetchPromise = (async () => {
      try {
        const completion = await requestFetch('/api/creation/complete', {
          method: 'POST',
          body: { selection, previewCharacter, personnage: source, missing }
        }).catch(() => null);
        if (completion?.ok && completion.enriched) {
          dataStore.merge(completion.enriched);
          cacheAddFromEntries('classes', completion.enriched.classes ?? {});
          cacheAddFromEntries('races', completion.enriched.races ?? {});
          cacheAddFromEntries('backgrounds', completion.enriched.backgrounds ?? {});
          cacheAddFromEntries('features', completion.enriched.features ?? {});
          cacheAddFromEntries('spells', completion.enriched.spells ?? {});
          cacheAddFromEntries('items', completion.enriched.items ?? {});
        }
      } catch (e) {
        try { console.warn('[restoreDatabaseFromIds] completion fetch failed', e); } catch {}
        throw e;
      }
    })();

    completionRequestState.inFlight = fetchPromise;
    try {
      await fetchPromise;
    } finally {
      completionRequestState.inFlight = null;
    }
  };

  return {
    catalog: catalogGroup,
    selections: selectionsGroup,
    identity: identityGroup,
    pointBuy: pointBuyGroup,
    choices: choicesGroup,
    material: materialGroup,
    previewState: previewGroup,
    lifecycle: lifecycleGroup,
    classes,
    races,
    backgrounds,
    selectedClass,
    selectedRace,
    selectedBackground,
    niveau,
    loading,
    characterName,
    characterFirstName,
    characterLastName,
    characterNickname,
       preview,
    creationLocked,
    rawText,
    showRaw,
    baseStats,
    chosenOptions,
    localChosen,
    pointBuyBudget,
    pointBuyMin,
    pointBuyMax,
    pointBuySpent,
    pointBuyRemaining,
    isPointBuyBalanced,
    pointBuyCostFor,
    canIncreaseBaseStat,
    canDecreaseBaseStat,
    increaseBaseStat,
    decreaseBaseStat,
    resetBaseStats,
    primarySelectionGroups,
    identitySummary,
    displayCharacterName,
    fullCharacterName,
    previewPortrait,
    getPrimarySelectedLabel,
    selectPrimaryOption,
    getChoiceKey,
    getChoiceTitle,
    getChoiceRequirement,
    getChoiceCategoryLabel,
    getChoiceSourceLabel,
    getChoiceOptions,
    getChoiceOptionImage,
    getChoiceOptionDescription,
    getLocalChoiceCount,
    isChoiceOptionSelected,
    handleChoiceOptionClick,
    isChoiceOptionDisabled,
    hasLocalChoiceValue,
    applyChoice,
    resetChoice,
    resetChosenOptions,
    resetChoiceById,
    displayStats,
    createPersonnagePayload,
    choiceOptionCache,
    choiceMetadata,
    appliedChoices,
    sendPreview,
    lockCreation,
    unlockCreation,
    loadCatalog,
    initialize,
    restoreLockState,
    materialProposals,
    materialItems,
    materialKeptItems,
    materialSoldItems,
    materialSummary,
    materialTotalWeightAll,
    materialTotalWeightKept,
    materialCarryCapacityValue,
    materialOverCapacity,
    materialFinalCoins,
    materialFinalCoinsCopper,
    materialSalesCoins,
    materialCoinPurseKey,
    materialCoinPurseLabel,
    materialCoinPurseBaseCoins,
    isMaterialItemKept,
    setMaterialItemDecision,
    toggleMaterialItemDecision,
    resetMaterialSelections,
    formatMaterialItemDisplay,
    materialPlan,
    descriptionFields,
    // slots & assignments for preview material preparation
    slotCandidates,
    materialAssignments,
    setMaterialAssignment,
    clearAccessoryAssignment,
    unassignedKeptItems,
    materialAcquired,
    getSpellOrFeatureDetails,
    restoreDatabaseFromIds
  };
});
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
