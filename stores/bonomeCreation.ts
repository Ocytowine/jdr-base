import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useRequestFetch } from '#app';

import type { Personnage } from './personnage';

import { useCreationChoices, type CreationChoiceOption } from '@/composables/useCreationChoices';

import { createCardPlaceholder, coinsToCopper, copperToCoins, ensureCardImage, ensureDescription, humanizeLabel, normalizeCatalogEntries, normalizeCoinsValue, resolveCardVisuals, toFiniteNumber, valueExists } from '@/utils/creationHelpers';
import type { CoinBreakdown } from '@/utils/creationHelpers';

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
  pack: string;
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
  const CREATION_LOCK_STORAGE_KEY = 'bonome_creation_locked';
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
    pack: '',
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
      const raw = localStorage.getItem(CREATION_LOCK_STORAGE_KEY);
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
      localStorage.setItem(CREATION_LOCK_STORAGE_KEY, '1');
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
      localStorage.removeItem(CREATION_LOCK_STORAGE_KEY);
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

    const fetchLegacyCatalogs = async () => {
      const [classResponse, raceResponse, backgroundResponse] = await Promise.all([
        requestFetch('/api/catalog/classes').catch(() => null),
        requestFetch('/api/catalog/races').catch(() => null),
        requestFetch('/api/catalog/backgrounds').catch(() => null)
      ]);

      assignCatalog(classes, classResponse);
      assignCatalog(races, raceResponse);
      assignCatalog(backgrounds, backgroundResponse);
    };

    const current = (async () => {
      let indexResponse: any = null;
      try {
        indexResponse = await requestFetch('/api/creation/index').catch(() => null);
      } catch (error) {
        indexResponse = null;
      }

      if (indexResponse && typeof indexResponse === 'object') {
        const catalogPayload = indexResponse.catalog ?? indexResponse;
        assignCatalog(classes, catalogPayload?.classes ?? []);
        assignCatalog(races, catalogPayload?.races ?? []);
        assignCatalog(backgrounds, catalogPayload?.backgrounds ?? []);
      }

      if (!classes.value.length || !races.value.length || !backgrounds.value.length) {
        await fetchLegacyCatalogs();
      }

      ensureSelectionValidity(selectedClass, classes.value);
      ensureSelectionValidity(selectedRace, races.value);
      ensureSelectionValidity(selectedBackground, backgrounds.value);
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
      raw: normalized
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
        materialSelections[item.key] = previousSelections[item.key] === false ? false : true;

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

    if (!materialCoinPurseKey.value) {
      const candidate = normalized.flatMap((group) => group.items).find((item) => item.coinsCopper > 0);
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
    if (!key) {
      return;
    }
    materialSelections[key] = keep;
  };

  const toggleMaterialItemDecision = (key: string) => {
    if (!key) {
      return;
    }
    materialSelections[key] = !isMaterialItemKept(key);
  };

  const resetMaterialSelections = () => {
    for (const group of materialProposals.value) {
      for (const item of group.items) {
        materialSelections[item.key] = true;
      }
    }
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

  const sendPreview = async () => {
    const trimmedFullName = fullCharacterName.value.trim();
    const trimmedLegacyName = characterName.value.trim();
    const primaryName = trimmedFullName.length ? trimmedFullName : trimmedLegacyName;
    const trimmedFirstName = normalizeNamePart(characterFirstName.value);
    const trimmedLastName = normalizeNamePart(characterLastName.value);
    const trimmedNickname = normalizeNamePart(characterNickname.value);
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
      forceReset: adapterResetPending.value
    };

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

    const proficiencies = toList(previewCharacter.proficiencies).reduce<Record<string, boolean>>((acc, entry) => {
      acc[entry] = true;
      return acc;
    }, {});

    const languages = toList(previewCharacter.languages);
    const baseEquipment = toList(previewCharacter.equipment);

    const keptMaterialDisplays = materialKeptItems.value
      .map(({ item }) => {
        const isCoinPurse = materialCoinPurseKey.value ? item.key === materialCoinPurseKey.value : false;
        const coinsOverride = isCoinPurse ? materialFinalCoins.value : null;
        return formatMaterialItemDisplay(item, coinsOverride);
      })
      .filter((entry) => typeof entry === 'string' && entry.trim().length);

    const equipmentList = [...baseEquipment, ...keptMaterialDisplays];

    const trimValue = (value: string): string => value.trim();
    const toNullableString = (value: string): string | null => {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const personnage: Personnage = {
      id: toDisplayString(previewCharacter.id, `pj_${Date.now()}`),
      nom: displayCharacterName.value,
      lignee: toDisplayString(identityLabels.race, '—'),
      age: ensureNumber(previewCharacter.age, 18),
      alignement: toDisplayString(previewCharacter.alignement, 'Neutre'),
      historique: toDisplayString(identityLabels.background, ''),
      classe: toDisplayString(identityLabels.class, ''),
      sousClasse: toDisplayString(previewCharacter.subclass ?? previewCharacter.sousClasse, ''),
      niveau: ensureNumber(previewCharacter.niveau ?? niveau.value, 1),
      dv: ensureNumber(previewCharacter.dv ?? previewCharacter.hit_dice, 0),
      pvActuels: ensureNumber(
        previewCharacter.pvActuels ??
          previewCharacter.hp?.current ??
          previewCharacter.final_stats?.hp ??
          previewCharacter.hp,
        0
      ),
      caracs,
      competences: proficiencies,
      langues: languages.length ? languages.join(', ') : 'Commun',
      equipement: equipmentList.join(', '),
      armure: { type: 'aucune' },
      bouclier: Boolean(previewCharacter.bouclier ?? false),
      monture: {
        nom: toDisplayString(previewCharacter.monture?.nom ?? ''),
        vitesse: toDisplayString(previewCharacter.monture?.vitesse ?? ''),
        notes: toDisplayString(previewCharacter.monture?.notes ?? '')
      },
      inspiration: Boolean(previewCharacter.inspiration ?? false),
      materielPersonnalise: {
        armePrincipale: toNullableString(materialPlan.primaryWeapon),
        armeSecondaire: toNullableString(materialPlan.secondaryWeapon),
        protection: toNullableString(materialPlan.protection),
        paquetage: toNullableString(materialPlan.pack),
        accessoires: toNullableString(materialPlan.accessories),
        notes: trimValue(materialPlan.notes)
      },
      descriptionDetaillee: {
        bio: trimValue(descriptionFields.bio),
        physique: trimValue(descriptionFields.physique),
        personnalite: trimValue(descriptionFields.personnalite),
        objectifs: trimValue(descriptionFields.objectifs),
        relations: trimValue(descriptionFields.relations),
        defauts: trimValue(descriptionFields.defauts)
      }
    };

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
    descriptionFields
  };
});
