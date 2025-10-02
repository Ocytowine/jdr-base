import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useRequestFetch } from '#app';

import type { Personnage } from './personnage';

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

export type ChoiceOption = {
  value: any;
  label: string;
  description?: string | null;
  image?: string | null;
  fallbackImage?: string | null;
  imageCandidates?: string[];
};

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

const TEXT_FIELDS = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_FIELDS = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];
const DEFAULT_CARD_DESCRIPTION = 'Aucune description disponible.';

const pickFirstString = (values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
  }
  return null;
};

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const stringValue = String(value).trim();
  if (!stringValue.length) {
    return null;
  }
  const withoutJson = stringValue.replace(/\.json$/i, '');
  const segments = withoutJson.split('/');
  const candidate = segments[segments.length - 1]?.trim();
  return candidate && candidate.length ? candidate : null;
};

const humanizeLabel = (value: string): string => {
  const safe = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe.length) {
    return value;
  }
  return safe.replace(/\b(\p{L})(\p{L}*)/gu, (_: unknown, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`);
};

const escapeForSvg = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const createCardPlaceholder = (label: string): string => {
  const base = label && label.trim().length ? label.trim() : 'Option';
  const truncated = base.length <= 32 ? base : `${base.slice(0, 29)}…`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">\n  <defs>\n    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#e2e8f0"/>\n      <stop offset="100%" stop-color="#cbd5f5"/>\n    </linearGradient>\n  </defs>\n  <rect width="320" height="180" fill="url(#grad)" rx="16"/>\n  <text x="160" y="98" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="20" fill="#475569">${escapeForSvg(truncated)}</text>\n</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const ensureCardImage = (image: string | null | undefined, label: string): string => {
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return createCardPlaceholder(label);
};

const CARD_IMAGE_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const;
const CATALOG_PREFIXES = [
  'class_',
  'race_',
  'background_',
  'spell_',
  'heritage_',
  'domain_',
  'path_',
  'archetype_',
  'subclass_',
  'feat_'
];

const CATALOG_CATEGORY_FOLDERS: Record<string, string[]> = {
  class: ['img/classes', 'img/class'],
  race: ['img/races', 'img/race'],
  background: ['img/backgrounds', 'img/historiques', 'img/background'],
  spell: ['img/spells', 'img/sorts', 'img/spell'],
  heritage: ['img/heritages'],
  domain: ['img/domains'],
  path: ['img/paths']
};

const stripCatalogPrefix = (value: string): string => {
  for (const prefix of CATALOG_PREFIXES) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }
  return value;
};

const collapseNonAlnum = (value: string, joiner: string): string =>
  value.replace(/[^a-z0-9]+/gi, joiner).replace(new RegExp(`${joiner}{2,}`, 'g'), joiner).replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');

const deriveCatalogBasenames = (rawId: string): string[] => {
  const trimmed = rawId.trim();
  if (!trimmed.length) return [];

  const lower = trimmed.toLowerCase();
  const withoutJson = lower.replace(/\.json$/i, '');
  const segments = withoutJson.split(/[\\/]/);
  const lastSegment = segments[segments.length - 1] ?? withoutJson;
  const stripped = stripCatalogPrefix(lastSegment);

  const tokens = new Set<string>();

  const push = (value: string | null | undefined) => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized.length) return;
    tokens.add(normalized);
  };

  push(trimmed);
  push(lower);
  push(lastSegment);
  push(stripped);

  const subSegments = stripped.split(/[:]/).filter(Boolean);
  subSegments.forEach((segment) => {
    push(segment);
    push(collapseNonAlnum(segment, '-'));
    push(collapseNonAlnum(segment, '_'));
    push(segment.replace(/[^a-z0-9]+/gi, ''));
  });

  push(collapseNonAlnum(stripped, '-'));
  push(collapseNonAlnum(stripped, '_'));
  push(stripped.replace(/[^a-z0-9]+/gi, ''));

  return Array.from(tokens).filter(Boolean);
};

const normalizeFolderSegment = (value: string): string => value.replace(/^\/+/, '').replace(/\/+$/, '');

const buildCatalogImageCandidates = (id: string | null, categoryKey: string | null | undefined): string[] => {
  if (!id) return [];
  const basenames = deriveCatalogBasenames(id);
  if (!basenames.length) return [];

  const folderList = [
    ...(categoryKey && CATALOG_CATEGORY_FOLDERS[categoryKey]
      ? CATALOG_CATEGORY_FOLDERS[categoryKey]
      : []),
    'img'
  ];
  const folders = Array.from(new Set(folderList.map((folder) => normalizeFolderSegment(folder))));

  const candidates: string[] = [];
  for (const folder of folders) {
    const basePath = folder.length ? `/${folder}` : '';
    for (const name of basenames) {
      const normalizedName = name.replace(/^\/+/, '').replace(/\/+$/, '');
      if (!normalizedName.length) continue;
      for (const ext of CARD_IMAGE_EXTENSIONS) {
        candidates.push(`${basePath}/${normalizedName}.${ext}`);
      }
    }
  }
  return Array.from(new Set(candidates));
};

const detectCategoryKey = (rawCategory: string | null | undefined): string | null => {
  if (!rawCategory) return null;
  const normalized = String(rawCategory).toLowerCase();
  if (normalized.includes('class')) return 'class';
  if (normalized.includes('race')) return 'race';
  if (normalized.includes('background') || normalized.includes('historique')) return 'background';
  if (normalized.includes('spell') || normalized.includes('sort')) return 'spell';
  if (normalized.includes('heritage')) return 'heritage';
  if (normalized.includes('domain')) return 'domain';
  if (normalized.includes('path') || normalized.includes('voie')) return 'path';
  return null;
};

const resolveCardVisuals = (
  explicitImage: string | null | undefined,
  id: string | null,
  fallbackLabel: string,
  categoryKey: string | null | undefined
): { image: string; fallbackImage: string; imageCandidates: string[] } => {
  const directImage = typeof explicitImage === 'string' ? explicitImage.trim() : '';
  const fallbackImage = ensureCardImage(explicitImage ?? null, fallbackLabel);
  const candidates = new Set<string>();
  if (directImage.length) {
    candidates.add(directImage);
  }
  for (const candidate of buildCatalogImageCandidates(id, categoryKey)) {
    if (candidate) {
      candidates.add(candidate);
    }
  }
  const imageCandidates = Array.from(candidates);
  const image = imageCandidates[0] ?? fallbackImage;
  return { image, fallbackImage, imageCandidates };
};

const ensureDescription = (description: string | null | undefined, fallbackLabel: string, categoryLabel: string): string => {
  if (typeof description === 'string') {
    const trimmed = description.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return `Sélectionnez ce ${categoryLabel.toLowerCase()} pour ${fallbackLabel}.`;
};

const normalizeCatalogEntries = (payload: unknown): CatalogEntry[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries = new Map<string, CatalogEntry>();

  payload.forEach((item, idx) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, any>;
      const id =
        normalizeId(record.id) ??
        normalizeId(record.slug) ??
        normalizeId(record.uid) ??
        normalizeId(record.key) ??
        normalizeId(record.value) ??
        normalizeId(record.name) ??
        `entry_${idx}`;
      if (!id) {
        return;
      }

      const name = pickFirstString([record.label, record.name, record.title, record.text]) ?? humanizeLabel(id);
      const description = pickFirstString(TEXT_FIELDS.map((key) => record[key]));
      const image = pickFirstString(IMAGE_FIELDS.map((key) => record[key]));

      entries.set(id, {
        id,
        name,
        description: description ?? null,
        image: image ?? null
      });
      return;
    }

    const id = normalizeId(item);
    if (!id) {
      return;
    }
    if (!entries.has(id)) {
      entries.set(id, {
        id,
        name: humanizeLabel(id),
        description: null,
        image: null
      });
    }
  });

  return Array.from(entries.values());
};

const extractChoiceFrom = (choice: any): any[] => {
  if (Array.isArray(choice?.from) && choice.from.length) {
    return choice.from;
  }
  if (Array.isArray(choice?.payload?.from) && choice.payload.from.length) {
    return choice.payload.from;
  }
  if (choice?.from && typeof choice.from === 'object') {
    return Object.keys(choice.from);
  }
  if (choice?.payload?.from && typeof choice.payload.from === 'object') {
    return Object.keys(choice.payload.from);
  }
  return [];
};

const extractChoiceLabels = (choice: any): Record<string, string> => {
  const out: Record<string, string> = {};
  const source = choice?.from_labels ?? choice?.payload?.from_labels ?? null;
  if (!source) return out;

  if (Array.isArray(source)) {
    source.forEach((entry: any, idx: number) => {
      if (entry && typeof entry === 'object') {
        const id = entry.id ?? entry.value ?? entry.key ?? entry.uid ?? null;
        const label = entry.label ?? entry.name ?? entry.title ?? entry.text ?? entry.value ?? entry.id ?? null;
        if (id !== null && id !== undefined) {
          out[String(id)] = String(label ?? id);
        } else if (entry.label) {
          out[String(idx)] = String(entry.label);
        }
      } else if (entry !== null && entry !== undefined) {
        out[String(idx)] = String(entry);
      }
    });
  } else if (typeof source === 'object') {
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined) {
        out[String(key)] = String(value as any);
      }
    }
  }

  return out;
};

const extractDescriptionFromValue = (value: any, fallbackLabel: string): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, any>;
  const description = pickFirstString(TEXT_FIELDS.map((key) => record[key]));
  if (description) {
    return description;
  }

  if (Array.isArray(record.entries)) {
    const text = record.entries.find((entry: any) => typeof entry === 'string' && entry.trim().length);
    if (typeof text === 'string') {
      return text.trim();
    }
  }

  if (typeof record.name === 'string') {
    const trimmed = record.name.trim();

    if (trimmed.length && trimmed.toLowerCase() !== fallbackLabel.toLowerCase()) {
      return trimmed;
    }
  }
  return null;
};

const extractImageFromValue = (value: any): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, any>;
  return pickFirstString(IMAGE_FIELDS.map((key) => record[key]));
};

const valueExists = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
};

const isSameChoiceValue = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  }
  return false;
};

const formatChoiceValue = (key: string, value: any, options: ChoiceOption[]): string => {
  const toLabel = (val: any): string => {
    for (const opt of options) {
      if (isSameChoiceValue(opt.value, val)) {
        return opt.label;
      }
    }
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (val === null || val === undefined) {
      return '—';
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  if (Array.isArray(value)) {
    if (!value.length) return '—';
    return value.map((entry) => toLabel(entry)).join(', ');
  }

  return toLabel(value);
};

export const useBonomeCreationStore = defineStore('bonomeCreation', () => {
  const requestFetch = useRequestFetch();

  const classes = ref<CatalogEntry[]>([]);
  const races = ref<CatalogEntry[]>([]);
  const backgrounds = ref<CatalogEntry[]>([]);

  const selectedClass = ref<string>('');
  const selectedRace = ref<string>('');
  const selectedBackground = ref<string>('');
  const MIN_LEVEL = 1;
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

  const chosenOptions = reactive<Record<string, any>>({});
  const localChosen = reactive<Record<string, any>>({});
  const choiceOptionCache = reactive<Record<string, ChoiceOption[]>>({});
  const choiceMetadata = reactive<Record<string, { label: string }>>({});

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

  const getChoiceKey = (choice: any, fallbackIndex?: number): string | null => {
    const candidates = [
      choice?.featureId,
      choice?.payload?.featureId,
      choice?.raw?.featureId,
      choice?.raw?.id,
      choice?.payload?.id,
      choice?.ui_id,
      choice?.payload?.ui_id,
      choice?.raw?.ui_id
    ];

    const resolved = candidates.find((value) => {
      if (value === null || value === undefined) return false;
      const str = String(value);
      return str.length > 0 && str !== 'null' && str !== 'undefined';
    });

    if (resolved !== undefined) {
      return String(resolved);
    }
    if (fallbackIndex !== undefined) {
      return `choice_${fallbackIndex}`;
    }
    return null;
  };

  const getChoiceTitle = (choice: any): string =>
    choice?.title ??
    choice?.label ??
    choice?.name ??
    choice?.payload?.title ??
    choice?.payload?.label ??
    choice?.payload?.name ??
    choice?.raw?.title ??
    choice?.raw?.label ??
    choice?.raw?.name ??
    'Choix';

  const getChoiceRequirement = (choice: any): number => {
    const raw = Number(
      choice?.choose ??
        choice?.payload?.choose ??
        choice?.raw?.choose ??
        choice?.raw?.payload?.choose ??
        1
    );
    if (!Number.isFinite(raw) || raw <= 0) {
      return 1;
    }
    return Math.max(1, Math.floor(raw));
  };

  const getChoiceCategoryLabel = (choice: any): string =>
    choice?.category ??
    choice?.payload?.category ??
    choice?.type ??
    choice?.payload?.type ??
    choice?.raw?.category ??
    choice?.raw?.type ??
    '—';

  const getChoiceSourceLabel = (choice: any): string =>
    choice?.source ??
    choice?.payload?.source ??
    choice?.raw?.source ??
    choice?.featureId ??
    choice?.payload?.featureId ??
    '—';

  const getChoiceOptions = (choice: any): ChoiceOption[] => {
    const from = extractChoiceFrom(choice);
    if (!from.length) return [];

    const labels = extractChoiceLabels(choice);
    const categoryLabel = getChoiceCategoryLabel(choice);
    const categoryKey = detectCategoryKey(categoryLabel);

    const resolveValueId = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' || typeof value === 'number') {
        return normalizeId(value);
      }
      if (typeof value === 'object') {
        const record = value as Record<string, any>;
        return (
          normalizeId(record.id) ??
          normalizeId(record.slug) ??
          normalizeId(record.value) ??
          normalizeId(record.name) ??
          normalizeId(record.key) ??
          null
        );
      }
      return null;
    };

    return from.map((value: any, idx: number) => {
      const key = typeof value === 'string' || typeof value === 'number' ? String(value) : String(idx);
      let label = labels[key] ?? labels[String(idx)] ?? null;
      if (!label && value && typeof value === 'object') {
        label = value.label ?? value.name ?? value.title ?? null;
      }
      if (!label) {
        label = typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);
      }

      const description = extractDescriptionFromValue(value, label);
      const rawImage = extractImageFromValue(value);
      const valueId = resolveValueId(value);
      const visuals = resolveCardVisuals(rawImage, valueId, label, categoryKey);

      return {
        value,
        label,
        description,
        image: visuals.image,
        fallbackImage: visuals.fallbackImage,
        imageCandidates: visuals.imageCandidates
      };
    });
  };

  const getChoiceOptionImage = (option: ChoiceOption): string => {
    if (typeof option.image === 'string') {
      const trimmed = option.image.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    if (typeof option.fallbackImage === 'string') {
      const fallbackTrimmed = option.fallbackImage.trim();
      if (fallbackTrimmed.length) {
        return fallbackTrimmed;
      }
    }
    return ensureCardImage(null, option.label);
  };

  const getChoiceOptionDescription = (option: ChoiceOption): string => {
    if (typeof option.description === 'string' && option.description.trim().length) {
      return option.description.trim();
    }
    return DEFAULT_CARD_DESCRIPTION;
  };

  const getLocalChoiceCount = (choice: any): number => {
    const key = getChoiceKey(choice);
    if (!key) return 0;
    const current = localChosen[key];
    if (Array.isArray(current)) {
      return current.length;
    }
    return current === null || current === undefined || current === '' ? 0 : 1;
  };

  const isChoiceOptionSelected = (choice: any, option: ChoiceOption): boolean => {
    const key = getChoiceKey(choice);
    if (!key) return false;
    const current = localChosen[key];
    if (Array.isArray(current)) {
      return current.some((entry) => isSameChoiceValue(entry, option.value));
    }
    return isSameChoiceValue(current, option.value);
  };

  const handleChoiceOptionClick = (choice: any, option: ChoiceOption) => {
    const key = getChoiceKey(choice);
    if (!key) return;

    const requirement = getChoiceRequirement(choice);
    if (requirement > 1) {
      const current = Array.isArray(localChosen[key]) ? (localChosen[key] as any[]) : [];
      const index = current.findIndex((entry) => isSameChoiceValue(entry, option.value));
      if (index >= 0) {
        localChosen[key] = [...current.slice(0, index), ...current.slice(index + 1)];
        return;
      }
      if (current.length >= requirement) {
        return;
      }
      localChosen[key] = [...current, option.value];
      return;
    }

    if (isSameChoiceValue(localChosen[key], option.value)) {
      localChosen[key] = null;
    } else {
      localChosen[key] = option.value;
    }
  };

  const isChoiceOptionDisabled = (choice: any, option: ChoiceOption): boolean => {
    const requirement = getChoiceRequirement(choice);
    if (requirement <= 1) {
      return false;
    }
    if (isChoiceOptionSelected(choice, option)) {
      return false;
    }
    return getLocalChoiceCount(choice) >= requirement;
  };

  const hasLocalChoiceValue = (choice: any): boolean => {
    const key = getChoiceKey(choice);
    if (!key) return false;
    return valueExists(localChosen[key]);
  };

  const registerChoiceMetadata = (choice: any, key: string | null) => {
    if (!key) return;
    const label =
      choice?.title ??
      choice?.label ??
      choice?.name ??
      choice?.payload?.title ??
      choice?.payload?.label ??
      choice?.payload?.name ??
      choice?.raw?.title ??
      choice?.raw?.label ??
      choice?.raw?.name ??
      choice?.type ??
      choice?.featureId ??
      choice?.ui_id ??
      key;
    choiceMetadata[key] = { label: String(label) };
  };

  const cacheChoiceOptions = (key: string | null, options: ChoiceOption[]) => {
    if (!key) return;
    choiceOptionCache[key] = options;
  };

  const appliedChoices = computed(() => {
    return Object.entries(chosenOptions)
      .map(([id, value]) => {
        const label = choiceMetadata[id]?.label ?? id;
        const options = choiceOptionCache[id] ?? [];
        const displayValue = formatChoiceValue(id, value, options);
        return { id, label, displayValue };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  });

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
      const hasSelection = entries.some((entry) => entry.id === selected.value);
      if (!selected.value) {
        selected.value = entries[0].id;
        return;
      }
      if (!hasSelection) {
        selected.value = '';
      }
    };

    const current = (async () => {
      const [classResponse, raceResponse, backgroundResponse] = await Promise.all([
        requestFetch('/api/catalog/classes').catch(() => null),
        requestFetch('/api/catalog/races').catch(() => null),
        requestFetch('/api/catalog/backgrounds').catch(() => null)
      ]);

      assignCatalog(classes, classResponse);
      assignCatalog(races, raceResponse);
      assignCatalog(backgrounds, backgroundResponse);

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
      }
    };

    const payloadSignature = JSON.stringify(body);
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
    const equipment = toList(previewCharacter.equipment);

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
      equipement: equipment.join(', '),
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
  };

  const initialize = async (options: InitializeOptions = {}) => {
    const { restoreFromStorage = true } = options;
    const wasInitialized = initialized.value;

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
      await sendPreview();
    }

    if (restoreFromStorage && process.client && !restoredBeforeInit) {
      const wasRestored = hasRestoredSelections.value;
      const didRestore = restoreSelections();
      if (!wasRestored && didRestore && !wasInitialized) {
        await sendPreview();
      }
    }
  };

  return {
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
    loadCatalog,
    initialize,
    materialPlan,
    descriptionFields
  };
});
