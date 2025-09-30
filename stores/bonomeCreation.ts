import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { useNuxtApp } from '#app';
import type { Personnage } from './personnage';

import { usePersonnage, type Personnage } from './personnage';

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
};

export type IdentitySummaryEntry = {
  id: PrimarySelectionGroup['id'];
  title: string;
  name: string;
  description: string;
  image: string;
};

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

const fallbackCatalogEntries = (entries: Array<string | Partial<CatalogEntry>>): CatalogEntry[] =>
  entries
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const id = normalizeId(entry);
        if (!id) return null;
        return {
          id,
          name: humanizeLabel(id),
          description: null,
          image: null
        } satisfies CatalogEntry;
      }

      if (entry && typeof entry === 'object') {
        const id = normalizeId(entry.id ?? entry.name ?? `fallback_${index}`);
        if (!id) return null;

        const name = typeof entry.name === 'string' && entry.name.trim().length ? entry.name.trim() : humanizeLabel(id);
        const description = typeof entry.description === 'string' && entry.description.trim().length ? entry.description.trim() : null;
        const image = typeof entry.image === 'string' && entry.image.trim().length ? entry.image.trim() : null;

        return {
          id,
          name,
          description,
          image
        } satisfies CatalogEntry;
      }

      return null;
    })
    .filter((entry): entry is CatalogEntry => Boolean(entry));

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

const useRequestFetch = () => {
  const nuxtApp = useNuxtApp();
  return nuxtApp.$fetch;
};

export const useBonomeCreationStore = defineStore('bonomeCreation', () => {
  const requestFetch = useRequestFetch();

  const classes = ref<CatalogEntry[]>([]);
  const races = ref<CatalogEntry[]>([]);
  const backgrounds = ref<CatalogEntry[]>([]);

  const selectedClass = ref<string>('');
  const selectedRace = ref<string>('');
  const selectedBackground = ref<string>('');
  const niveau = ref<number>(1);
  const loading = ref(false);
  const characterName = ref<string>('');
  const firstName = ref<string>('');
  const lastName = ref<string>('');
  const nickname = ref<string>('');

  const preview = ref<any | null>(null);
  const rawText = ref<string>('');
  const showRaw = ref(false);
  const initialized = ref(false);
  const hasRestoredSelections = ref(false);

  const baseStats = reactive({
    strength: 8,
    dexterity: 14,
    constitution: 12,
    intelligence: 16,
    wisdom: 10,
    charisma: 11
  });

  const chosenOptions = reactive<Record<string, any>>({});
  const localChosen = reactive<Record<string, any>>({});
  const choiceOptionCache = reactive<Record<string, ChoiceOption[]>>({});
  const choiceMetadata = reactive<Record<string, { label: string }>>({});

  const buildPrimaryOptions = (entries: CatalogEntry[], categoryLabel: string): PrimaryCardOption[] =>
    entries.map((entry) => {
      const label = entry.name?.trim().length ? entry.name.trim() : humanizeLabel(entry.id);
      return {
        id: entry.id,
        label,
        description: ensureDescription(entry.description ?? null, label, categoryLabel),
        image: ensureCardImage(entry.image ?? null, label)
      };
    });

  const primarySelectionGroups = computed<PrimarySelectionGroup[]>(() => [
    {
      id: 'class',
      title: 'Classe',
      options: buildPrimaryOptions(classes.value, 'Classe'),
      selected: selectedClass.value
    },
    {
      id: 'race',
      title: 'Race',
      options: buildPrimaryOptions(races.value, 'Race'),
      selected: selectedRace.value
    },
    {
      id: 'background',
      title: 'Historique',
      options: buildPrimaryOptions(backgrounds.value, 'Historique'),
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
        image: ensureCardImage(selected?.image ?? null, placeholderLabel)
      };
    })
  );

  const normalizeNamePart = (value: string): string => value.replace(/\s+/g, ' ').trim();

  const fullCharacterName = computed(() => {
    const first = normalizeNamePart(firstName.value);
    const last = normalizeNamePart(lastName.value);
    const nick = normalizeNamePart(nickname.value);

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
    const key =
      choice?.ui_id ??
      choice?.featureId ??
      choice?.payload?.ui_id ??
      choice?.payload?.featureId ??
      choice?.raw?.ui_id ??
      choice?.raw?.featureId ??
      null;
    if (key !== null && key !== undefined) {
      return String(key);
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

    return from.map((value: any, idx: number) => {
      const key = typeof value === 'string' || typeof value === 'number' ? String(value) : String(idx);
      let label = labels[key] ?? labels[String(idx)] ?? null;
      if (!label && value && typeof value === 'object') {
        label = value.label ?? value.name ?? value.title ?? null;
      }
      if (!label) {
        label = typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);
      }
      return {
        value,
        label,
        description: extractDescriptionFromValue(value, label),
        image: extractImageFromValue(value)
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
      firstName: firstName.value,
      lastName: lastName.value,
      nickname: nickname.value,
      baseStats: { ...baseStats },
      chosenOptions: JSON.parse(JSON.stringify(chosenOptions))
    };
    try {
      localStorage.setItem('bonome_creation_state', JSON.stringify(payload));
    } catch (err) {
      console.warn('Persist selections failed', err);
    }
  };

  const restoreSelections = () => {
    if (!process.client || hasRestoredSelections.value) return;
    try {
      const raw = localStorage.getItem('bonome_creation_state');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        selectedClass.value = parsed.selectedClass ?? selectedClass.value;
        selectedRace.value = parsed.selectedRace ?? selectedRace.value;
        selectedBackground.value = parsed.selectedBackground ?? selectedBackground.value;
        niveau.value = Number(parsed.niveau ?? niveau.value) || niveau.value;
        characterName.value = parsed.characterName ?? characterName.value;
        firstName.value = parsed.firstName ?? firstName.value;
        lastName.value = parsed.lastName ?? lastName.value;
        nickname.value = parsed.nickname ?? nickname.value;
        if (!firstName.value && !lastName.value && !nickname.value && parsed.characterName) {
          firstName.value = parsed.characterName;
        }
        if (parsed.baseStats && typeof parsed.baseStats === 'object') {
          Object.assign(baseStats, parsed.baseStats);
        }
        if (parsed.chosenOptions && typeof parsed.chosenOptions === 'object') {
          Object.assign(chosenOptions, parsed.chosenOptions);
          Object.assign(localChosen, parsed.chosenOptions);
        }
      }
    } catch (err) {
      console.warn('Restore selections failed', err);
    } finally {
      hasRestoredSelections.value = true;
    }
  };

  const loadCatalog = async () => {
    const assignCatalog = (
      target: { value: CatalogEntry[] },
      payload: unknown,
      fallbackEntries: Array<string | Partial<CatalogEntry>>
    ) => {
      const normalized = normalizeCatalogEntries(payload);
      target.value = normalized.length ? normalized : fallbackCatalogEntries(fallbackEntries);
    };

    try {
      const response = await requestFetch('/api/catalog/classes').catch(() => null);
      assignCatalog(classes, response, [
        {
          id: 'mage',
          name: 'Mage',
          description: 'Maîtres des arcanes, les mages manipulent les énergies mystiques pour façonner la réalité.'
        },
        {
          id: 'guerrier',
          name: 'Guerrier',
          description: 'Combattants polyvalents et endurcis, les guerriers excellent sur tous les champs de bataille.'
        },
        {
          id: 'rodeur',
          name: 'Rôdeur',
          description: 'Silencieux et précis, les rôdeurs allient talents de pisteur et maîtrise martiale.'
        }
      ]);
    } catch (error) {
      classes.value = fallbackCatalogEntries([
        {
          id: 'mage',
          name: 'Mage',
          description: 'Maîtres des arcanes, les mages manipulent les énergies mystiques pour façonner la réalité.'
        },
        {
          id: 'guerrier',
          name: 'Guerrier',
          description: 'Combattants polyvalents et endurcis, les guerriers excellent sur tous les champs de bataille.'
        },
        {
          id: 'rodeur',
          name: 'Rôdeur',
          description: 'Silencieux et précis, les rôdeurs allient talents de pisteur et maîtrise martiale.'
        }
      ]);
    }

    try {
      const response = await requestFetch('/api/catalog/races').catch(() => null);
      assignCatalog(races, response, [
        {
          id: 'humain',
          name: 'Humain',
          description: 'Adaptables et ambitieux, les humains se retrouvent dans toutes les régions du monde.'
        },
        {
          id: 'elfe',
          name: 'Elfe',
          description: 'Gracieux et proches de la nature, les elfes vivent selon des traditions millénaires.'
        },
        {
          id: 'nain',
          name: 'Nain',
          description: 'Forgerons et bâtisseurs inégalés, les nains valorisent honneur et artisanat.'
        }
      ]);
    } catch (error) {
      races.value = fallbackCatalogEntries([
        {
          id: 'humain',
          name: 'Humain',
          description: 'Adaptables et ambitieux, les humains se retrouvent dans toutes les régions du monde.'
        },
        {
          id: 'elfe',
          name: 'Elfe',
          description: 'Gracieux et proches de la nature, les elfes vivent selon des traditions millénaires.'
        },
        {
          id: 'nain',
          name: 'Nain',
          description: 'Forgerons et bâtisseurs inégalés, les nains valorisent honneur et artisanat.'
        }
      ]);
    }

    try {
      const response = await requestFetch('/api/catalog/backgrounds').catch(() => null);
      assignCatalog(backgrounds, response, [
        {
          id: 'acolyte',
          name: 'Acolyte',
          description: 'Élevé dans un temple, l’acolyte porte les traditions sacrées et la sagesse de sa foi.'
        },
        {
          id: 'aventurier',
          name: 'Aventurier',
          description: 'Toujours en quête de découvertes, l’aventurier parcourt le monde en quête de gloire.'
        },
        {
          id: 'erudit',
          name: 'Érudit',
          description: 'Passionné par le savoir, l’érudit a passé des années plongé dans les livres et les archives.'
        }
      ]);
    } catch (error) {
      backgrounds.value = fallbackCatalogEntries([
        {
          id: 'acolyte',
          name: 'Acolyte',
          description: 'Élevé dans un temple, l’acolyte porte les traditions sacrées et la sagesse de sa foi.'
        },
        {
          id: 'aventurier',
          name: 'Aventurier',
          description: 'Toujours en quête de découvertes, l’aventurier parcourt le monde en quête de gloire.'
        },
        {
          id: 'erudit',
          name: 'Érudit',
          description: 'Passionné par le savoir, l’érudit a passé des années plongé dans les livres et les archives.'
        }
      ]);
    }

    if (!selectedClass.value && classes.value.length) selectedClass.value = classes.value[0].id;
    if (!selectedRace.value && races.value.length) selectedRace.value = races.value[0].id;
    if (!selectedBackground.value && backgrounds.value.length) selectedBackground.value = backgrounds.value[0].id;
  };

  const sendPreview = async () => {
    loading.value = true;
    preview.value = null;
    rawText.value = '';
    try {
      const trimmedFullName = fullCharacterName.value.trim();
      const trimmedLegacyName = characterName.value.trim();
      const primaryName = trimmedFullName.length ? trimmedFullName : trimmedLegacyName;
      const trimmedFirstName = normalizeNamePart(firstName.value);
      const trimmedLastName = normalizeNamePart(lastName.value);
      const trimmedNickname = normalizeNamePart(nickname.value);
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

      const res = await requestFetch('/api/creation/preview', {
        method: 'POST',
        body
      });

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
      preview.value = {
        ok: false,
        errors: [{ type: 'network', message: String(err?.message ?? err) }]
      };
      rawText.value = String(err?.message ?? err);
    } finally {
      loading.value = false;
    }
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
    firstName.value = '';
    lastName.value = '';
    nickname.value = '';
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
      inspiration: Boolean(previewCharacter.inspiration ?? false)
    };

    return personnage;
  };

  const initialize = async () => {
    restoreSelections();
    if (initialized.value) return;
    initialized.value = true;
    await loadCatalog();
    await sendPreview();
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
    firstName,
    lastName,
    nickname,
    preview,
    rawText,
    showRaw,
    baseStats,
    chosenOptions,
    localChosen,
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
    createPersonnagePayload
  };
});
