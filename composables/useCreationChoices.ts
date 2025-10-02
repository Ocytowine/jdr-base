import { computed, reactive } from 'vue';

import {
  DEFAULT_CARD_DESCRIPTION,
  detectCategoryKey,
  ensureCardImage,
  extractChoiceFrom,
  extractChoiceLabels,
  extractDescriptionFromValue,
  extractImageFromValue,
  formatChoiceValue,
  isSameChoiceValue,
  normalizeId,
  resolveCardVisuals,
  valueExists
} from '@/utils/creationHelpers';

export type CreationChoiceOption = {
  value: any;
  label: string;
  description?: string | null;
  image?: string | null;
  fallbackImage?: string | null;
  imageCandidates?: string[];
};

export type CreationChoiceMetadata = {
  label: string;
};

export const useCreationChoices = () => {
  const chosenOptions = reactive<Record<string, any>>({});
  const localChosen = reactive<Record<string, any>>({});
  const choiceOptionCache = reactive<Record<string, CreationChoiceOption[]>>({});
  const choiceMetadata = reactive<Record<string, CreationChoiceMetadata>>({});

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
    '-';

  const getChoiceSourceLabel = (choice: any): string =>
    choice?.source ??
    choice?.payload?.source ??
    choice?.raw?.source ??
    choice?.featureId ??
    choice?.payload?.featureId ??
    '-';

  const getChoiceOptions = (choice: any): CreationChoiceOption[] => {
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

  const getChoiceOptionImage = (option: CreationChoiceOption): string => {
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

  const getChoiceOptionDescription = (option: CreationChoiceOption): string => {
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

  const isChoiceOptionSelected = (choice: any, option: CreationChoiceOption): boolean => {
    const key = getChoiceKey(choice);
    if (!key) return false;
    const current = localChosen[key];
    if (Array.isArray(current)) {
      return current.some((entry) => isSameChoiceValue(entry, option.value));
    }
    return isSameChoiceValue(current, option.value);
  };

  const handleChoiceOptionClick = (choice: any, option: CreationChoiceOption) => {
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

  const isChoiceOptionDisabled = (choice: any, option: CreationChoiceOption): boolean => {
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

  const cacheChoiceOptions = (key: string | null, options: CreationChoiceOption[]) => {
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

  return {
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
  };
};
