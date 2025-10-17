import { COMPETENCE_DEFS, COMPETENCE_INDEX } from './competences'

export type ProficiencyCategory =
  | 'armes'
  | 'armures'
  | 'outils'
  | 'competences'
  | 'langues'
  | 'vehicules'
  | 'instruments'
  | 'jeux'
  | 'sauvegardes'
  | 'divers'

export type ProficiencyRank = 'maitrise' | 'expertise'

export type ProficiencyEntry = {
  id: string
  label: string
  rank: ProficiencyRank
  source?: string | null
}

export type ProficiencySummary = Record<ProficiencyCategory | string, ProficiencyEntry[]>

type CatalogEntry = {
  category: ProficiencyCategory
  id: string
  label: string
  aliases: string[]
}

type CanonicalProficiency = {
  id: string
  label: string
  category: ProficiencyCategory
}

type AddEntryOptions = {
  categoryHint?: string | null
  rankHint?: ProficiencyRank | null
  source?: string | null
}

const splitSources = (value: string | null | undefined): { raw: string; normalized: string }[] => {
  if (!value) return []
  return String(value)
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter((part) => part.length)
    .map((part) => ({ raw: part, normalized: normalizeKey(part) }))
}

const mergeSource = (existing: string | null | undefined, incoming: string | null | undefined): string | null => {
  if (!incoming || !incoming.trim().length) return existing ? String(existing) : null
  const incomingEntry = { raw: incoming.trim(), normalized: normalizeKey(incoming) }
  const existingEntries = splitSources(existing)
  if (!existingEntries.length) return incomingEntry.raw
  const existingJoined = existingEntries.map((entry) => entry.raw).join(', ')
  if (existingEntries.some((entry) => entry.normalized === incomingEntry.normalized)) {
    return existingJoined
  }
  return `${existingJoined}, ${incomingEntry.raw}`
}

export function normalizeKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

const CATEGORY_ALIASES: Record<ProficiencyCategory, string[]> = {
  armes: ['arme', 'armes', 'weapon', 'weapons', 'armes_maitrise', 'weapon_mastery', 'weaponry'],
  armures: ['armure', 'armures', 'armor', 'armors', 'armure_maitrise'],
  outils: ['outil', 'outils', 'tool', 'tools', 'kit'],
  competences: ['competence', 'competences', 'skill', 'skills'],
  langues: ['langue', 'langues', 'language', 'languages', 'lang'],
  vehicules: ['vehicule', 'vehicules', 'vehicle', 'vehicles'],
  instruments: ['instrument', 'instruments', 'musical_instruments', 'musical instrument', 'instrument_musique'],
  jeux: ['jeu', 'jeux', 'gaming_set', 'gaming_sets', 'game', 'games'],
  sauvegardes: ['saving_throw', 'saving_throws', 'sauvegarde', 'sauvegardes', 'save'],
  divers: ['autre', 'autres', 'divers', 'misc', 'other', 'others', 'general']
}

const WEAPON_CATALOG: CatalogEntry[] = [
  { category: 'armes', id: 'simple', label: 'Armes simples', aliases: ['arme simple', 'armes simples', 'simple weapon', 'simple weapons'] },
  { category: 'armes', id: 'martiale', label: 'Armes martiales', aliases: ['arme martiale', 'armes martiales', 'martial weapon', 'martial weapons'] },
  { category: 'armes', id: 'speciale', label: 'Armes speciales', aliases: ['arme speciale', 'armes speciales', 'special weapon', 'special weapons'] },
  { category: 'armes', id: 'monastique', label: 'Maitrise monastique', aliases: ['arme monastique', 'armes monastiques', 'monastic weapon', 'monastic weapons', 'monk weapon', 'monk weapons'] }
]

const ARMOR_CATALOG: CatalogEntry[] = [
  { category: 'armures', id: 'legere', label: 'Armures legeres', aliases: ['armure legere', 'light armor', 'light armors'] },
  { category: 'armures', id: 'intermediaire', label: 'Armures intermediaires', aliases: ['armure intermediaire', 'medium armor', 'medium armors'] },
  { category: 'armures', id: 'lourde', label: 'Armures lourdes', aliases: ['armure lourde', 'heavy armor', 'heavy armors'] },
  { category: 'armures', id: 'bouclier', label: 'Boucliers', aliases: ['bouclier', 'boucliers', 'shield', 'shields'] }
]

const TOOL_CATALOG: CatalogEntry[] = [
  { category: 'outils', id: 'outils_artisan', label: 'Outils d artisan', aliases: ['outils artisan', 'artisan tools', 'artisans tools', 'outil artisan'] },
  { category: 'outils', id: 'outils_voleur', label: 'Outils de voleur', aliases: ['thieves tools', 'thief tools', 'outils voleur'] },
  { category: 'outils', id: 'trousse_herboriste', label: 'Trousse d herboriste', aliases: ['herbalism kit', 'kit d herboriste'] },
  { category: 'outils', id: 'trousse_soins', label: 'Trousse de soins', aliases: ['healer kit', 'healer s kit', 'medic kit', 'kit de soins'] },
  { category: 'outils', id: 'instrument_musique', label: 'Instrument de musique', aliases: ['musical instrument', 'musical instruments', 'instrument musique'] },
  { category: 'outils', id: 'trousse_deguisement', label: 'Trousse de deguisement', aliases: ['disguise kit', 'deguisement'] },
  { category: 'outils', id: 'trousse_faussaire', label: 'Trousse de faussaire', aliases: ['forgery kit', 'faussaire'] },
  { category: 'outils', id: 'trousse_brasseur', label: 'Trousse de brasseur cuisinier', aliases: ['brewer supplies', 'brewer s supplies', 'brewer kit', 'cooking utensils', 'cuisinier'] },
  { category: 'outils', id: 'outils_navigation', label: 'Outils de navigation', aliases: ['navigation tools', 'navigator s tools', 'navigator tools'] },
  { category: 'outils', id: 'outils_cartographe', label: 'Outils de cartographe', aliases: ['cartographer tools', 'cartographer s tools'] }
]

const SKILL_CATALOG: CatalogEntry[] = COMPETENCE_DEFS.map((def) => ({
  category: 'competences',
  id: def.id,
  label: def.nom,
  aliases: [
    def.id,
    def.nom,
    ...(() => {
      switch (def.id) {
        case 'athletisme': return ['athletics', 'athletique']
        case 'acrobaties': return ['acrobatics']
        case 'discretion': return ['stealth']
        case 'escamotage': return ['sleight of hand', 'sleight_of_hand']
        case 'dressage': return ['animal handling', 'animal_handling']
        case 'intimidation': return ['intimidation']
        case 'persuasion': return ['persuasion']
        case 'representation': return ['performance']
        case 'histoire': return ['history']
        case 'arcanes': return ['arcana']
        case 'investigation': return ['investigation']
        case 'nature': return ['nature']
        case 'religion': return ['religion']
        case 'medecine': return ['medicine']
        case 'perception': return ['perception']
        case 'perspicacite': return ['insight']
        case 'survie': return ['survival']
        default: return []
      }
    })()
  ].filter(Boolean) as string[]
}))

const STATIC_CATALOG: CatalogEntry[] = [...WEAPON_CATALOG, ...ARMOR_CATALOG, ...TOOL_CATALOG, ...SKILL_CATALOG]

const CATALOG_ALIAS_MAP = (() => {
  const map = new Map<string, CatalogEntry>()
  for (const entry of STATIC_CATALOG) {
    const aliases = new Set<string>([entry.id, entry.label, ...entry.aliases])
    for (const alias of aliases) {
      const key = normalizeKey(alias)
      if (!key.length) continue
      if (!map.has(key)) {
        map.set(key, entry)
      }
    }
  }
  return map
})()

const CATEGORY_ALIAS_MAP = (() => {
  const map = new Map<string, ProficiencyCategory>()
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES) as Array<[ProficiencyCategory, string[]]>) {
    for (const alias of aliases) {
      const key = normalizeKey(alias)
      if (!key.length) continue
      if (!map.has(key)) map.set(key, category)
    }
  }
  return map
})()

const RANK_ORDER: Record<ProficiencyRank, number> = {
  maitrise: 1,
  expertise: 2
}

export const DEFAULT_CATEGORY_LABELS: Record<ProficiencyCategory, string> = {
  armes: 'Armes',
  armures: 'Armures',
  outils: 'Outils',
  competences: 'Competences',
  langues: 'Langues',
  vehicules: 'Vehicules',
  instruments: 'Instruments',
  jeux: 'Jeux',
  sauvegardes: 'Jets de sauvegarde',
  divers: 'Divers'
}

export const DEFAULT_CATEGORY_ORDER: ProficiencyCategory[] = [
  'armes',
  'armures',
  'outils',
  'competences',
  'langues',
  'vehicules',
  'instruments',
  'jeux',
  'sauvegardes',
  'divers'
]

const toSlug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

export const prettifyLabel = (value: string): string => {
  const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned.length) return ''
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const normalizeCategory = (value: string | null | undefined): ProficiencyCategory => {
  if (!value) return 'divers'
  const key = normalizeKey(value)
  if (!key.length) return 'divers'
  return CATEGORY_ALIAS_MAP.get(key) ?? 'divers'
}

const matchCatalog = (category: ProficiencyCategory, rawId?: string | null, rawLabel?: string | null): CanonicalProficiency | null => {
  const candidateKeys = [rawId, rawLabel]
  for (const candidate of candidateKeys) {
    if (!candidate) continue
    const key = normalizeKey(candidate)
    if (!key.length) continue
    const entry = CATALOG_ALIAS_MAP.get(key)
    if (entry && entry.category === category) {
      return { id: entry.id, label: entry.label, category }
    }
  }
  if (category === 'competences') {
    const fromId = rawId ? COMPETENCE_INDEX[rawId] : null
    if (fromId) return { id: fromId.id, label: fromId.nom, category }
    if (rawLabel) {
      const key = normalizeKey(rawLabel)
      for (const def of COMPETENCE_DEFS) {
        if (normalizeKey(def.nom) === key) {
          return { id: def.id, label: def.nom, category }
        }
      }
    }
  }
  return null
}

const canonicalize = (
  category: ProficiencyCategory,
  rawId: string | null,
  rawLabel: string | null
): CanonicalProficiency => {
  const catalogMatch = matchCatalog(category, rawId, rawLabel)
  if (catalogMatch) return catalogMatch
  const base = rawId && rawId.trim().length ? rawId : rawLabel ?? ''
  const fallbackId = base ? toSlug(base) : 'proficiency'
  const fallbackLabel = rawLabel && rawLabel.trim().length ? rawLabel : base ? prettifyLabel(base) : 'Competence'
  return { id: fallbackId, label: fallbackLabel.trim().length ? fallbackLabel : fallbackId, category }
}

const extractIdLabel = (entry: any): { rawId: string | null; rawLabel: string | null } => {
  if (entry === null || entry === undefined) {
    return { rawId: null, rawLabel: null }
  }
  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
    const id = String(entry).trim()
    return { rawId: id, rawLabel: id }
  }
  if (typeof entry === 'object') {
    const rawIdCandidate =
      entry.id ??
      entry.key ??
      entry.value ??
      entry.slug ??
      entry.code ??
      entry.name ??
      entry.label ??
      entry.nom ??
      entry.type ??
      entry.category ??
      null
    const rawLabelCandidate = entry.label ?? entry.nom ?? entry.name ?? entry.title ?? entry.text ?? entry.value ?? null
    const rawId = rawIdCandidate !== null && rawIdCandidate !== undefined ? String(rawIdCandidate).trim() : null
    const rawLabel = rawLabelCandidate !== null && rawLabelCandidate !== undefined ? String(rawLabelCandidate).trim() : rawId
    return { rawId, rawLabel }
  }
  const id = String(entry).trim()
  return { rawId: id, rawLabel: id }
}

const detectRank = (entry: any, rankHint?: ProficiencyRank | null): ProficiencyRank => {
  if (rankHint) return rankHint
  if (entry && typeof entry === 'object') {
    const { rank, niveau, level, expertise, master } = entry as Record<string, unknown>
    const candidates = [rank, niveau, level, expertise, master]
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue
      if (typeof candidate === 'string') {
        const key = normalizeKey(candidate)
        if (key === 'expertise' || key === 'double' || key === 'expert') return 'expertise'
      }
      if (typeof candidate === 'number') {
        if (candidate >= 2) return 'expertise'
      }
      if (typeof candidate === 'boolean' && candidate) return 'expertise'
    }
  }
  return 'maitrise'
}

const maxRank = (a: ProficiencyRank, b: ProficiencyRank): ProficiencyRank =>
  RANK_ORDER[a] >= RANK_ORDER[b] ? a : b

export const pushProficiencyEntry = (
  summary: ProficiencySummary,
  value: any,
  options?: AddEntryOptions
): ProficiencyEntry | null => {
  const categoryRaw =
    options?.categoryHint ??
    (value && typeof value === 'object'
      ? (value.category ?? value.type ?? value.kind ?? value.group ?? value.section ?? null)
      : null)

  const category = normalizeCategory(categoryRaw)
  const { rawId, rawLabel } = extractIdLabel(value)
  if (!rawId && !rawLabel) return null

  const canonical = canonicalize(category, rawId, rawLabel)
  const rank = detectRank(value, options?.rankHint)
  const isCompetence = category === 'competences'
  const normalizedRank: ProficiencyRank = isCompetence ? rank : 'maitrise'
  const valueSource =
    options?.source ??
    (value && typeof value === 'object'
      ? ((value as any).source ?? (value as any).origin ?? null)
      : null)
  const incomingSource = valueSource !== null && valueSource !== undefined ? String(valueSource).trim() : null

  const list = (summary[category] = summary[category] ?? [])
  const key = normalizeKey(canonical.id)
  let existing: ProficiencyEntry | undefined
  for (const entry of list) {
    if (normalizeKey(entry.id) === key) {
      existing = entry
      break
    }
  }

  if (existing) {
    const currentRank = existing.rank ?? 'maitrise'
    let updatedSource = mergeSource(existing.source, incomingSource)
    const existingSourceEntries = splitSources(existing.source)
    const hasIncomingSource =
      !incomingSource || existingSourceEntries.some((entry) => entry.normalized === normalizeKey(incomingSource))
    if (isCompetence && normalizedRank === 'maitrise' && !hasIncomingSource) {
      existing.rank = 'expertise'
    } else {
      existing.rank = maxRank(currentRank, normalizedRank)
    }
    if (updatedSource) existing.source = updatedSource
    return existing
  }

  const entry: ProficiencyEntry = {
    id: canonical.id,
    label: canonical.label,
    rank: normalizedRank,
    source: incomingSource ?? null
  }
  list.push(entry)
  return entry
}

const handleCollection = (
  summary: ProficiencySummary,
  collection: any,
  categoryHint?: string | null,
  sourceHint?: string | null
) => {
  if (collection === null || collection === undefined) return
  const entries = Array.isArray(collection) ? collection : [collection]
  for (const entry of entries) {
    if (entry === null || entry === undefined) continue
    const rankHint =
      entry && typeof entry === 'object' && (entry as any).rank
        ? detectRank(entry, (entry as any).rank as ProficiencyRank)
        : undefined
    const entrySource =
      entry && typeof entry === 'object'
        ? (entry as any).source ?? (entry as any).origin ?? sourceHint ?? null
        : sourceHint ?? null
    pushProficiencyEntry(summary, entry, { categoryHint, rankHint, source: entrySource ?? null })
  }
}

export const normalizeProficiencySummary = (input: any): ProficiencySummary => {
  const summary: ProficiencySummary = {}

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (entry === null || entry === undefined) continue
      if (typeof entry === 'object' && !Array.isArray(entry)) {
        const categoryHint = entry.category ?? entry.type ?? entry.kind ?? entry.group ?? entry.section ?? null
        const sourceHint = entry.source ?? entry.origin ?? null
        if ((entry as any).values !== undefined) {
          handleCollection(summary, (entry as any).values, categoryHint, sourceHint)
        } else if ((entry as any).items !== undefined) {
          handleCollection(summary, (entry as any).items, categoryHint, sourceHint)
        } else if ((entry as any).proficiencies !== undefined) {
          handleCollection(summary, (entry as any).proficiencies, categoryHint, sourceHint)
        } else if ((entry as any).proficiency !== undefined) {
          handleCollection(summary, (entry as any).proficiency, categoryHint, sourceHint)
        } else if ((entry as any).value !== undefined) {
          handleCollection(summary, (entry as any).value, categoryHint, sourceHint)
        } else if ((entry as any).entries !== undefined) {
          handleCollection(summary, (entry as any).entries, categoryHint, sourceHint)
        } else if ((entry as any).options !== undefined) {
          handleCollection(summary, (entry as any).options, categoryHint, sourceHint)
        } else {
          pushProficiencyEntry(summary, entry, { categoryHint, source: sourceHint ?? null })
        }
      } else {
        pushProficiencyEntry(summary, entry, {})
      }
    }
    return summary
  }

  if (input && typeof input === 'object') {
    for (const [category, collection] of Object.entries(input)) {
      handleCollection(summary, collection, category)
    }
    return summary
  }

  if (input !== null && input !== undefined) {
    pushProficiencyEntry(summary, input, {})
  }

  return summary
}

export const cloneProficiencySummary = (summary: ProficiencySummary): ProficiencySummary => {
  const cloned: ProficiencySummary = {}
  for (const [category, list] of Object.entries(summary)) {
    cloned[category] = Array.isArray(list)
      ? list.map((entry) => ({
          id: entry.id,
          label: entry.label,
          rank: entry.rank ?? 'maitrise',
          source: entry.source ?? null
        }))
      : []
  }
  return cloned
}

export const mergeProficiencySummaries = (...summaries: ProficiencySummary[]): ProficiencySummary => {
  const merged: ProficiencySummary = {}
  for (const summary of summaries) {
    for (const [category, list] of Object.entries(summary || {})) {
      for (const entry of Array.isArray(list) ? list : []) {
        pushProficiencyEntry(merged, entry, { categoryHint: category, rankHint: entry.rank ?? 'maitrise', source: entry.source ?? null })
      }
    }
  }
  return merged
}

export const ensureExpertiseOnDuplicate = (summary: ProficiencySummary) => {
  for (const list of Object.values(summary)) {
    if (!Array.isArray(list)) continue
    for (const entry of list) {
      if (!entry.rank) entry.rank = 'maitrise'
    }
  }
}

export const summarizeSkillRanks = (
  summary: ProficiencySummary
): Record<string, ProficiencyRank> => {
  const result: Record<string, ProficiencyRank> = {}
  const skills = summary.competences ?? []
  for (const entry of skills) {
    const key = entry.id
    if (!key) continue
    const rank = entry.rank ?? 'maitrise'
    const previous = result[key]
    result[key] = previous ? (RANK_ORDER[rank] > RANK_ORDER[previous] ? rank : previous) : rank
  }
  return result
}
