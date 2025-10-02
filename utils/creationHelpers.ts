const COPPER_PER_SILVER = 10;
const COPPER_PER_GOLD = 100;

export type CoinBreakdown = {
  gold: number;
  silver: number;
  copper: number;
};

export function toFiniteNumber(value: any, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function normalizeCoinsValue(value: any): CoinBreakdown | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const gold = toFiniteNumber(value, 0);
    if (!Number.isFinite(gold)) {
      return null;
    }
    return { gold, silver: 0, copper: 0 };
  }
  if (typeof value !== 'object') {
    return null;
  }

  const normalized = new Map<string, any>();
  for (const [key, val] of Object.entries(value)) {
    normalized.set(String(key).toLowerCase(), val);
  }

  const result: CoinBreakdown = { gold: 0, silver: 0, copper: 0 };
  let hasValue = false;
  const assignFrom = (aliases: string[], target: keyof CoinBreakdown) => {
    for (const alias of aliases) {
      if (!normalized.has(alias)) continue;
      const candidate = toFiniteNumber(normalized.get(alias), Number.NaN);
      if (!Number.isNaN(candidate)) {
        result[target] = candidate;
        hasValue = true;
        return;
      }
    }
  };

  assignFrom(['gold', 'gp', 'or', 'g', 'po'], 'gold');
  assignFrom(['silver', 'sp', 'argent', 's', 'pa'], 'silver');
  assignFrom(['copper', 'cp', 'cuivre', 'c', 'pc'], 'copper');

  return hasValue ? result : null;
}

export function coinsToCopper(coins: CoinBreakdown | null | undefined): number {
  if (!coins) {
    return 0;
  }
  const gold = toFiniteNumber(coins.gold, 0);
  const silver = toFiniteNumber(coins.silver, 0);
  const copper = toFiniteNumber(coins.copper, 0);
  return Math.round(gold * COPPER_PER_GOLD + silver * COPPER_PER_SILVER + copper);
}

export function copperToCoins(totalCopper: number): CoinBreakdown {
  const normalized = Number.isFinite(totalCopper) ? Math.max(0, Math.floor(totalCopper)) : 0;
  const gold = Math.floor(normalized / COPPER_PER_GOLD);
  const remainderAfterGold = normalized - gold * COPPER_PER_GOLD;
  const silver = Math.floor(remainderAfterGold / COPPER_PER_SILVER);
  const copper = Math.max(0, remainderAfterGold - silver * COPPER_PER_SILVER);
  return { gold, silver, copper };
}

const TEXT_FIELDS = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_FIELDS = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];

export const DEFAULT_CARD_DESCRIPTION = 'Aucune description disponible.';

export const CARD_IMAGE_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const;
export const CATALOG_PREFIXES = [
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

export const CATALOG_CATEGORY_FOLDERS: Record<string, string[]> = {
  class: ['img/classes', 'img/class'],
  race: ['img/races', 'img/race'],
  background: ['img/backgrounds', 'img/historiques', 'img/background'],
  spell: ['img/spells', 'img/sorts', 'img/spell'],
  heritage: ['img/heritages'],
  domain: ['img/domains'],
  path: ['img/paths']
};

export const pickFirstString = (values: Array<unknown>): string | null => {
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

export const normalizeId = (value: unknown): string | null => {
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

export const humanizeLabel = (value: string): string => {
  const safe = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe.length) {
    return value;
  }
  return safe.replace(/\b(\p{L})(\p{L}*)/gu, (_: unknown, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`);
};

const escapeForSvg = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const createCardPlaceholder = (label: string): string => {
  const base = label && label.trim().length ? label.trim() : 'Option';
  const truncated = base.length <= 32 ? base : `${base.slice(0, 29)}.`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">\n  <defs>\n    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#e2e8f0"/>\n      <stop offset="100%" stop-color="#cbd5f5"/>\n    </linearGradient>\n  </defs>\n  <rect width="320" height="180" fill="url(#grad)" rx="16"/>\n  <text x="160" y="98" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="20" fill="#475569">${escapeForSvg(truncated)}</text>\n</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const ensureCardImage = (image: string | null | undefined, label: string): string => {
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return createCardPlaceholder(label);
};

export const stripCatalogPrefix = (value: string): string => {
  for (const prefix of CATALOG_PREFIXES) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }
  return value;
};

export const collapseNonAlnum = (value: string, joiner: string): string =>
  value.replace(/[^a-z0-9]+/gi, joiner).replace(new RegExp(`${joiner}{2,}`, 'g'), joiner).replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');

export const deriveCatalogBasenames = (rawId: string): string[] => {
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

export const normalizeFolderSegment = (value: string): string => value.replace(/^\/+/, '').replace(/\/+$/, '');

export const buildCatalogImageCandidates = (id: string | null, categoryKey: string | null | undefined): string[] => {
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

export const detectCategoryKey = (rawCategory: string | null | undefined): string | null => {
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

export type CardVisuals = {
  image: string;
  fallbackImage: string;
  imageCandidates: string[];
};

export const resolveCardVisuals = (
  explicitImage: string | null | undefined,
  id: string | null,
  fallbackLabel: string,
  categoryKey: string | null | undefined
): CardVisuals => {
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

export const ensureDescription = (description: string | null | undefined, fallbackLabel: string, categoryLabel: string): string => {
  if (typeof description === 'string') {
    const trimmed = description.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return `Sélectionnez ce ${categoryLabel.toLowerCase()} pour ${fallbackLabel}.`;
};

export const extractDescriptionFromValue = (value: any, fallbackLabel: string): string | null => {
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

export const extractImageFromValue = (value: any): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, any>;
  return pickFirstString(IMAGE_FIELDS.map((key) => record[key]));
};

export type NormalizedCatalogEntry = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
};

export const normalizeCatalogEntries = (payload: unknown): NormalizedCatalogEntry[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries = new Map<string, NormalizedCatalogEntry>();

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
      const description = extractDescriptionFromValue(record, name);
      const image = extractImageFromValue(record);

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

export const valueExists = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
};

export const isSameChoiceValue = (a: any, b: any): boolean => {
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

export type LabeledChoiceOption = { value: any; label: string };

export const formatChoiceValue = (key: string, value: any, options: LabeledChoiceOption[]): string => {
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
      return '-';
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  if (Array.isArray(value)) {
    if (!value.length) return '-';
    return value.map((entry) => toLabel(entry)).join(', ');
  }

  return toLabel(value);
};

export const extractChoiceFrom = (choice: any): any[] => {
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

export const extractChoiceLabels = (choice: any): Record<string, string> => {
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
