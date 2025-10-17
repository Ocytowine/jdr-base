function getUiTemplateForClasse(classe: string): string | null {
  switch (classe?.toLowerCase()) {
    case 'mage':
      return 'mage.vue'
    case 'guerrier':
      return 'guerrier.vue'
    // Ajoute d'autres classes ici
    default:
      return null
  }
}
import { defineStore } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'
import { useDataStore } from '@/stores/data'
import { useBonomeCreationStore } from '@/stores/bonomeCreation'
import { bonusDeMaitrise } from '@/utils/regles_du_jeu'
import { evalFormuleAdditive, resolveStatBasePayload } from '@/utils/evalFormule'
import { mod } from '@/utils/regles_du_jeu'
import EffectEngine from '@/engine/effectEngine'
import { normalizeEffects } from '@/utils/normalizeEffect'

const extractHitPoints = (entity: any): { level_1?: string; per_level_after_1?: string } | null => {
  if (!entity || typeof entity !== 'object') return null
  const direct = entity.hit_points
  if (direct && typeof direct === 'object') return { ...direct }

  const candidates: any[] = []
  const effects = Array.isArray(entity.effects) ? entity.effects : []
  const features = Array.isArray(entity.features) ? entity.features : []
  const payloadEffects = Array.isArray(entity.payload?.effects) ? entity.payload.effects : []
  candidates.push(...effects, ...features, ...payloadEffects)

  if (candidates.length) {
    try {
      for (const entry of candidates) {
        const payload = entry && typeof entry === 'object' ? (entry.payload && typeof entry.payload === 'object' ? entry.payload : entry) : null
        const hp = payload?.hit_points
        if (hp && typeof hp === 'object') return { ...hp }
      }
    } catch {}

    try {
      const normalized = normalizeEffects(candidates)
      for (const entry of normalized) {
        const hp = entry?.payload?.hit_points
        if (hp && typeof hp === 'object') return { ...hp }
      }
    } catch {}
  }

  return null
}

const DEF_COMPETENCES: CompetenceDef[] = [
  { id: 'athletisme', nom: 'Athletisme', carac: 'force' },
  { id: 'acrobaties', nom: 'Acrobaties', carac: 'dexterite' },
  { id: 'discretion', nom: 'Discretion', carac: 'dexterite' },
  { id: 'escamotage', nom: 'Escamotage', carac: 'dexterite' },
  { id: 'dressage', nom: 'Dressage', carac: 'sagesse' },
  { id: 'intimidation', nom: 'Intimidation', carac: 'charisme' },
  { id: 'persuasion', nom: 'Persuasion', carac: 'charisme' },
  { id: 'representation', nom: 'Representation', carac: 'charisme' },
  { id: 'histoire', nom: 'Histoire', carac: 'intelligence' },
  { id: 'arcanes', nom: 'Arcanes', carac: 'intelligence' },
  { id: 'investigation', nom: 'Investigation', carac: 'intelligence' },
  { id: 'nature', nom: 'Nature', carac: 'intelligence' },
  { id: 'religion', nom: 'Religion', carac: 'intelligence' },
  { id: 'medecine', nom: 'Medecine', carac: 'sagesse' },
  { id: 'perception', nom: 'Perception', carac: 'sagesse' },
  { id: 'perspicacite', nom: 'Perspicacite', carac: 'sagesse' },
  { id: 'survie', nom: 'Survie', carac: 'sagesse' }
]

const prettifyLabel = (value: string): string => {
  const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned.length) return ''
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const coerceIdLabel = (entry: any): { id: string; label: string } | null => {
  if (entry === null || entry === undefined) return null
  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
    const id = String(entry).trim()
    if (!id.length) return null
    return { id, label: prettifyLabel(id) }
  }
  if (typeof entry === 'object') {
    const idCandidate =
      entry.id ?? entry.key ?? entry.value ?? entry.slug ?? entry.code ?? entry.name ?? entry.label ?? entry.type ?? entry.category ?? null
    const id = idCandidate !== null && idCandidate !== undefined ? String(idCandidate).trim() : ''
    if (!id.length) return null
    const labelCandidate = entry.label ?? entry.name ?? entry.title ?? entry.nom ?? entry.text ?? null
    const label = labelCandidate ? String(labelCandidate).trim() : prettifyLabel(id)
    return { id, label }
  }
  const id = String(entry).trim()
  if (!id.length) return null
  return { id, label: prettifyLabel(id) }
}

const normalizeStringArray = (value: any): string[] => {
  const entries = Array.isArray(value) ? value : value !== null && value !== undefined ? [value] : []
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of entries) {
    if (entry === null || entry === undefined) continue
    const str = String(entry).trim()
    if (!str.length) continue
    const key = str.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(str)
  }
  return result
}

const normalizeProficiencySummary = (input: any): Record<string, Array<{ id: string; label: string }>> => {
  const result: Record<string, Array<{ id: string; label: string }>> = {}
  const ensureCategory = (categoryRaw: string) => {
    const key = String(categoryRaw || 'other').toLowerCase()
    if (!Array.isArray(result[key])) result[key] = []
    return result[key] as Array<{ id: string; label: string }>
  }
  const pushEntry = (category: string, entry: any) => {
    const normalized = coerceIdLabel(entry)
    if (!normalized) return
    const list = ensureCategory(category)
    const key = normalized.id.toLowerCase()
    if (list.some((existing) => String(existing.id).toLowerCase() === key)) return
    list.push({ id: normalized.id, label: normalized.label })
  }
  const handleCollection = (category: string, collection: any) => {
    if (collection === null || collection === undefined) return
    const entries = Array.isArray(collection) ? collection : [collection]
    for (const entry of entries) pushEntry(category, entry)
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const category = entry.category ?? entry.type ?? entry.kind ?? entry.group ?? 'other'
        if ((entry as any).values !== undefined) handleCollection(category, (entry as any).values)
        else if ((entry as any).items !== undefined) handleCollection(category, (entry as any).items)
        else if ((entry as any).proficiencies !== undefined) handleCollection(category, (entry as any).proficiencies)
        else if ((entry as any).proficiency !== undefined) handleCollection(category, (entry as any).proficiency)
        else if ((entry as any).value !== undefined) handleCollection(category, (entry as any).value)
        else pushEntry(category, entry)
      } else {
        pushEntry('other', entry)
      }
    }
    return result
  }

  if (input && typeof input === 'object') {
    for (const [category, value] of Object.entries(input)) {
      handleCollection(category, value)
    }
  }

  return result
}

const cloneProficiencySummary = (summary: Record<string, Array<{ id: string; label: string }>>): Record<string, Array<{ id: string; label: string }>> => {
  const cloned: Record<string, Array<{ id: string; label: string }>> = {}
  for (const [category, list] of Object.entries(summary || {})) {
    cloned[category] = Array.isArray(list) ? list.map((entry) => ({ id: entry.id, label: entry.label })) : []
  }
  return cloned
}

const mergeProficiencySummaries = (
  ...summaries: Array<Record<string, Array<{ id: string; label: string }>>>
): Record<string, Array<{ id: string; label: string }>> => {
  const merged: Record<string, Array<{ id: string; label: string }>> = {}
  for (const summary of summaries) {
    for (const [categoryRaw, list] of Object.entries(summary || {})) {
      const category = String(categoryRaw || 'other').toLowerCase()
      const dest = (merged[category] = merged[category] ?? [])
      const seen = new Set(dest.map((entry) => String(entry.id).toLowerCase()))
      for (const entry of Array.isArray(list) ? list : []) {
        if (!entry || entry.id === undefined || entry.id === null) continue
        const id = String(entry.id).trim()
        if (!id.length) continue
        const key = id.toLowerCase()
        if (seen.has(key)) continue
        const label = entry.label ? String(entry.label).trim() : prettifyLabel(id)
        dest.push({ id, label })
        seen.add(key)
      }
    }
  }
  return merged
}

type Personnage = {
  id: string
  nom: string
  lignee: string
  age: number
  alignement: string
  historique: string
  classe: string
  sousClasse: string
  niveau: number
  xp?: number
  dv: number
  pvActuels: number
  pvMax?: number
  hit_points?: { level_1?: string; per_level_after_1?: string } | null
  caracs: Caracs
  competences: Record<string, boolean>
  proficienciesDetail?: Record<string, Array<{ id: string; label: string }>>
  savingThrows?: string[]
  langues: string
  armure?: { type: 'aucune' | 'legere' | 'intermediaire' | 'lourde'; nom?: string }
  bouclier?: boolean
  monture: { nom: string; vitesse: string; notes: string }
  inspiration: boolean
  inventaire: PersonnageInventoryEntry[]
  traits?: string[]
  classeId?: string | null
  raceId?: string | null
  backgroundId?: string | null
  featureIds?: string[]
  spellIds?: string[]
  spellcastingSpec?: SpellcastingSpec | null
  statBases?: StatBase | null
  materielPersonnalise: {
    armePrincipale: string | null
    armePrincipaleId: string | null
    armeSecondaire: string | null
    armeSecondaireId: string | null
    protection: string | null
    protectionId: string | null
    bouclier: string | null
    bouclierId: string | null
    paquetage: string | null
    paquetageId: string | null
    accessoires: string | null
    accessoiresIds: string[]
    keptIds: string[]
    equippedIds: string[]
    notes: string
  }
  descriptionDetaillee: {
    bio: string
    physique: string
    personnalite: string
    objectifs: string
    relations: string
    defauts: string
  }
  ui_template?: string | null
}

type SpellcastingSpec = {
  ability: string | null
  spellSaveDc: number | null
  spellAttackMod: number | null
  slots: Record<string, number | string>
  description?: string | null
}

type StatBase = {
  vitesse?: number
  nivFatigueMax?: number
  initiative?: string
  CA?: string
  besoin?: Array<Record<string, any>>
  [key: string]: any
}

const createDefaultPerso = (): Personnage => ({
  id: 'pj_0001',
  nom: '',
  lignee: 'Humain',
  age: 18,
  alignement: 'Neutre',
  historique: '',
  classe: 'Guerrier',
  sousClasse: '',
  niveau: 1,
  xp: 0,
  dv: 10,
  pvActuels: 10,
  pvMax: 10,
  hit_points: null,
  caracs: {
    force: 15,
    dexterite: 14,
    constitution: 13,
    intelligence: 12,
    sagesse: 10,
    charisme: 8
  } as Caracs,
  competences: {} as Record<string, boolean>,
  proficienciesDetail: {},
  savingThrows: [],
  langues: 'Commun',
  armure: { type: 'aucune' },
  bouclier: false,
  monture: { nom: '', vitesse: '', notes: '' },
  inspiration: false,
  inventaire: [],
  traits: [],
  statBases: null,
  spellcastingSpec: null,
  hit_points: null,
  materielPersonnalise: {
    armePrincipale: null,
    armePrincipaleId: null,
    armeSecondaire: null,
    armeSecondaireId: null,
    protection: null,
    protectionId: null,
    bouclier: null,
    bouclierId: null,
    paquetage: null,
    paquetageId: null,
    accessoires: null,
    accessoiresIds: [],
    keptIds: [],
    equippedIds: [],
    notes: ''
  },
  descriptionDetaillee: {
    bio: '',
    physique: '',
    personnalite: '',
    objectifs: '',
    relations: '',
    defauts: ''
  },
  ui_template: null
})

export type Caracs = {
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
}

export type CompetenceDef = { id: string; nom: string; carac: keyof Caracs }

type InventaireSnapshotItem = CreationInventoryTransition['items'][number]

export type PersonnageInventoryEntry = {
  id: string
  quantity: number
  coins?: { gold: number; silver: number; copper: number } | null
}


// Version asynchrone pour garantir le chargement du catalogue avant la normalisation
const sanitizePersonnage = async (raw: unknown): Promise<Personnage> => {
  const base = createDefaultPerso()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const source = raw as Record<string, any>
  const { equipement: _discardedEquipement, ...restSource } = source

  const dataStore = useDataStore()
  // On attend le chargement du catalogue si nécessaire (maps.classes doit être non vide)
  if (!Object.keys(dataStore.maps.classes).length) {
    await dataStore.load()
  }

  const caracs = {
    ...base.caracs,
    ...(typeof source.caracs === 'object' && source.caracs ? source.caracs : {})
  } as Caracs

  const competences =
    source.competences && typeof source.competences === 'object'
      ? (source.competences as Record<string, boolean>)
      : {}

  const slugify = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')

  const makeUniqueSlug = (base: string, usage: Map<string, number>) => {
    const existing = usage.get(base) ?? 0
    usage.set(base, existing + 1)
    return existing === 0 ? base : `${base}-${existing}`
  }

  const parseValueLabelToCoins = (label: unknown): { gold: number; silver: number; copper: number } | null => {
    if (typeof label !== 'string') return null
    const gold = Number(label.match(/(\d+)\s*po/i)?.[1] ?? 0)
    const silver = Number(label.match(/(\d+)\s*pa/i)?.[1] ?? 0)
    const copper = Number(label.match(/(\d+)\s*pc/i)?.[1] ?? 0)
    if (!gold && !silver && !copper) return null
    return { gold, silver, copper }
  }

  const normalizeInventoryBase = (entry: any, fallbackName: string) => {
    const ensureValue = (value: any) =>
      value && typeof value === 'object'
        ? {
            gold: Number(value.gold) || 0,
            silver: Number(value.silver) || 0,
            copper: Number(value.copper) || 0
          }
        : null

    if (entry && typeof entry === 'object' && 'name' in entry) {
      const item = entry as Record<string, any>
      const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
      const weight = Number.isFinite(item.weight) ? Number(item.weight) : null
      return {
        idCandidate: typeof item.id === 'string' ? item.id : null,
        originId: item.originId ? String(item.originId) : (typeof item.id === 'string' ? item.id : null),
        name: String(item.name ?? fallbackName),
        description: item.description ?? null,
        type: item.type ?? null,
        quantity,
        weight,
        value: ensureValue(item.value),
        equipped: Boolean(item.equipped ?? item.equiped),
        allow_stack: Boolean(item.allow_stack ?? item.allowStack),
        harmonisable: Boolean(item.harmonisable ?? item.harmonizable),
        properties_fight: item.properties_fight ?? item.propertiesFight ?? null,
        properties_equip: item.properties_equip ?? item.propertiesEquip ?? null
      }
    }

    const legacy = entry ?? {}
    const quantity = Number.isFinite(legacy.quantity) ? Number(legacy.quantity) : 1
    const weightTotal = Number.isFinite(legacy.weightTotal) ? Number(legacy.weightTotal) : null
    const weight = weightTotal !== null ? weightTotal / (quantity || 1) : null
    return {
      idCandidate: typeof legacy.id === 'string' ? legacy.id : null,
      originId: legacy.originId ? String(legacy.originId) : (typeof legacy.id === 'string' ? legacy.id : null),
      name: String(legacy.title ?? legacy.name ?? fallbackName),
      description: legacy.description ?? null,
      type: legacy.typeLabel ?? legacy.type ?? null,
      quantity,
      weight,
      value: parseValueLabelToCoins(legacy.valueLabel),
      equipped: Boolean(legacy.equipped ?? legacy.equiped),
      allow_stack: Boolean(legacy.allow_stack ?? legacy.allowStack ?? false),
      harmonisable: Boolean(legacy.harmonisable ?? legacy.harmonizable ?? false),
      properties_fight: legacy.properties_fight ?? legacy.propertiesFight ?? null,
      properties_equip: legacy.properties_equip ?? legacy.propertiesEquip ?? null
    }
  }

  const slugUsage = new Map<string, number>()
  const rawInventaire = Array.isArray(source.inventaire) ? source.inventaire : []
  const inventaire: PersonnageInventoryEntry[] = rawInventaire.map((entry: any, index: number) => {
    // support nouveau format deja minimal
    if (entry && typeof entry === 'object' && 'id' in entry && 'quantity' in entry && !('name' in entry)) {
      const e = entry as any
      return {
        id: String(e.id),
        quantity: Number(e.quantity) || 1,
        coins: e.coins ? { gold: Number(e.coins.gold) || 0, silver: Number(e.coins.silver) || 0, copper: Number(e.coins.copper) || 0 } : null
      }
    }
    // fallback: ancien format riche -> convertir en minimal
    const fallbackName = `Objet ${index + 1}`
    const normalized = normalizeInventoryBase(entry, fallbackName)
    const baseId = normalized.idCandidate ?? normalized.originId ?? normalized.name ?? `item-${index}`
    let slugBase = baseId ? slugify(String(baseId)) : ''
    if (!slugBase && normalized.name) slugBase = slugify(normalized.name)
    if (!slugBase) slugBase = `item-${index}`
    const id = makeUniqueSlug(slugBase, slugUsage)
    // detect purse value -> store as coins
    const coins = normalized.value ?? null
    return {
      id,
      quantity: Number(normalized.quantity) || 1,
      coins
    }
  })

  const slugByOrigin = new Map<string, string>()
  const adaptId = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    if (!str.length) return null
    return str
  }

  const adaptIdArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const results: string[] = []
    for (const entry of value) {
      const mapped = adaptId(entry)
      if (mapped) {
        results.push(mapped)
      }
    }
    return results
  }

  const materielSource =
    source.materielPersonnalise && typeof source.materielPersonnalise === 'object'
      ? (source.materielPersonnalise as Record<string, any>)
      : {}

  const toNullableString = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value)
    return str.trim().length ? str : null
  }

  // Résolution robuste d'identifiants à partir d'ID ou de labels
  const findByIdOrName = (map: Record<string, any>, key?: string | null): { id: string | null; entity: any | null } => {
    const k = (key ?? '').toString().trim()
    if (!k) return { id: null, entity: null }
    const low = k.toLowerCase()
    if (map[low]) return { id: low, entity: map[low] }
    const byId = Object.keys(map).find((id) => id.toLowerCase() === low)
    if (byId) return { id: byId, entity: map[byId] }
    const byName = Object.entries(map).find(([_, v]) => {
      const name = String((v as any)?.name ?? (v as any)?.nom ?? (v as any)?.label ?? '').toLowerCase()
      const slug = String((v as any)?.slug ?? '').toLowerCase()
      return name === low || slug === low
    })
    if (byName) return { id: byName[0] as string, entity: byName[1] }
    return { id: null, entity: null }
  }

  const displayLabel = (entity: any, fallback: string): string => {
    if (!entity || typeof entity !== 'object') return fallback
    return String(entity.name ?? entity.nom ?? entity.label ?? fallback)
  }

  const numberFromKeys = (obj: any, keys: string[], fallback = 0): number => {
    for (const k of keys) {
      let cur: any = obj
      for (const part of k.split('.')) {
        if (cur && typeof cur === 'object' && part in cur) cur = cur[part]
        else { cur = undefined; break }
      }
      const n = Number(cur)
      if (Number.isFinite(n) && n > 0) return n
    }
    return fallback
  }

  // Résoudre classe/race/background IDs depuis la source
  const srcClasseId = typeof (source as any).classeId === 'string' ? (source as any).classeId : null
  const srcRaceId = typeof (source as any).raceId === 'string' ? (source as any).raceId : null
  const srcBackgroundId = typeof (source as any).backgroundId === 'string' ? (source as any).backgroundId : null

  const resolvedClasse = findByIdOrName(dataStore.maps.classes, srcClasseId ?? ((source as any).classe as any))
  const resolvedRace = findByIdOrName(dataStore.maps.races, srcRaceId ?? ((source as any).lignee as any))
  const resolvedBackground = findByIdOrName(dataStore.maps.backgrounds, srcBackgroundId ?? ((source as any).historique as any))

  // UI template depuis la classe
  const uiTemplate: string | null = (resolvedClasse.entity?.ui_template ?? null) || null

  // Déterminer le DV depuis la classe (ne sert plus au calcul PV)
  const derivedDv = numberFromKeys(resolvedClasse.entity, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice', 'dice.hit_die']) || (base as any).dv

  const classHitPoints = extractHitPoints(resolvedClasse.entity)
  const sourceHitPoints = extractHitPoints(source)

  // Calcul PV max et pvActuels bornés
  const niveau = Number.isFinite((source as any).niveau) ? Number((source as any).niveau) : (base as any).niveau
  const modCon = mod(Number((caracs as any).constitution || (base as any).caracs.constitution))
  const pvMax = (() => {
    const hpSource = classHitPoints ?? sourceHitPoints
    if (hpSource && typeof hpSource === 'object') {
      const l1 = evalFormuleAdditive(String(hpSource.level_1 || ''), niveau, caracs as any)
      const per = evalFormuleAdditive(String(hpSource.per_level_after_1 || ''), niveau, caracs as any)
      const add = (x: number) => Math.max(1, Number(x) || 0)
      let sum = add(l1)
      for (let i = 2; i <= niveau; i++) sum += add(per)
      return sum
    }
    return 0
  })()
  const pvActuels = (() => {
    const rawPv = Number((source as any).pvActuels)
    if (!Number.isFinite(rawPv) || rawPv <= 0) return pvMax
    return Math.min(rawPv, pvMax)
  })()
  const rawProficiencySummary =
    (source as any).proficienciesDetail ??
    (source as any).proficiencySummary ??
    (source as any).proficiency_summary ??
    (source as any).maitrises ??
    (source as any).maitrisesDetail ??
    (source as any).proficiencies ??
    null
  const proficienciesDetail = normalizeProficiencySummary(rawProficiencySummary)
  const savingThrows = normalizeStringArray(
    (source as any).savingThrows ??
      (source as any).saving_throws ??
      (source as any).saves ??
      (source as any).savingThrowsProf ??
      null
  )

  return {
    ...base,
    // ne pas propager tel-quel la source pour éviter doublons non normalisés
    id: String((source as any).id ?? (base as any).id),
    nom: String((source as any).nom ?? (base as any).nom),
    niveau,
    // XP
    xp: Number.isFinite((source as any).xp) ? Number((source as any).xp) : 0,
    // Règles
    dv: derivedDv,
    pvActuels,
    hit_points: classHitPoints ?? sourceHitPoints ?? ((base as any).hit_points ?? null),
    caracs,
    competences,
    proficienciesDetail,
    savingThrows,
    inventaire,
    // IDs normalisés (source de vérité)
    classeId: resolvedClasse.id ?? (base as any).classeId ?? null,
    raceId: resolvedRace.id ?? (base as any).raceId ?? null,
    backgroundId: resolvedBackground.id ?? (base as any).backgroundId ?? null,
    // Labels d'affichage (dérivés des IDs)
    classe: displayLabel(resolvedClasse.entity, (base as any).classe),
    lignee: displayLabel(resolvedRace.entity, (base as any).lignee),
    historique: displayLabel(resolvedBackground.entity, (base as any).historique),
    featureIds: Array.isArray(source.featureIds) ? source.featureIds.map((x: any) => String(x)) : (base.featureIds ?? []),
    spellIds: Array.isArray(source.spellIds) ? source.spellIds.map((x: any) => String(x)) : (base.spellIds ?? []),
    traits: Array.isArray((source as any).traits) ? (source as any).traits.map((t: any) => String(t)) : (base.traits ?? []),
    spellcastingSpec: (source as any).spellcastingSpec ?? (base as any).spellcastingSpec ?? null,
    statBases: (source as any).statBases ?? (base as any).statBases ?? null,
    materielPersonnalise: {
      ...base.materielPersonnalise,
      ...materielSource,
      armePrincipale: toNullableString(materielSource.armePrincipale ?? base.materielPersonnalise.armePrincipale),
      armePrincipaleId: adaptId(materielSource.armePrincipaleId),
      armeSecondaire: toNullableString(materielSource.armeSecondaire ?? base.materielPersonnalise.armeSecondaire),
      armeSecondaireId: adaptId(materielSource.armeSecondaireId),
      protection: toNullableString(materielSource.protection ?? base.materielPersonnalise.protection),
      protectionId: adaptId(materielSource.protectionId),
      bouclier: toNullableString(materielSource.bouclier ?? base.materielPersonnalise.bouclier),
      bouclierId: adaptId(materielSource.bouclierId),
      paquetage: toNullableString(materielSource.paquetage ?? base.materielPersonnalise.paquetage),
      paquetageId: adaptId(materielSource.paquetageId),
      accessoires: toNullableString(materielSource.accessoires ?? base.materielPersonnalise.accessoires),
      accessoiresIds: adaptIdArray(materielSource.accessoiresIds),
      keptIds: adaptIdArray(materielSource.keptIds),
      equippedIds: adaptIdArray(materielSource.equippedIds),
      notes: typeof materielSource.notes === 'string' ? materielSource.notes : base.materielPersonnalise.notes
    },
    // Injection du template UI depuis le catalogue
    ui_template: uiTemplate
  }
}


export const usePersonnage = defineStore('personnage', {
  state: () => ({
    perso: createDefaultPerso(),
    loading: false,
    derivedCache: null as null | {
      pvMax: number
      proficiencyBonus: number
      spellcasting?: { dc: number | null; attack: number | null; ability: string | null } | null
      proficiencies?: string[]
      proficiencySummary?: Record<string, Array<{ id: string; label: string }>>
      savingThrows?: string[]
      senses?: any[]
    },
    _lastPvMax: 0,
    _lastNiveau: 0,
    _lastConScore: 10
  }),
  getters: {
    listeCompetences: () => DEF_COMPETENCES,
    ui_template: (state) => {
      // On suppose que le champ est stocké dans perso ou à défaut dans la classe
      return state.perso?.ui_template || null
    },
    spellcastingSpec: (state) => state.perso?.spellcastingSpec ?? null,
    statBases: (state) => state.perso?.statBases ?? null,
    // D�riv�s calcul�s (non persist�s)
    derived: (state) => {
      if ((state as any).derivedCache) return (state as any).derivedCache
      const p = (state as any).perso || {}
      const niveau = Number(p.niveau || 1)
      const prof = bonusDeMaitrise(niveau)
      let pvMax = 0
      try {
        const dataStore = useDataStore()
        try {
          const creationStore = useBonomeCreationStore()
        } catch {}
        const classeKey = String(p.classeId || '').trim().toLowerCase()
        let classe = classeKey ? Object.values((dataStore as any).maps.classes || {}).find((c: any) => {
          if (!c || typeof c !== 'object') return false
          const id = String(c.id ?? '').toLowerCase()
          const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase()
          return id === classeKey || name === classeKey
        }) : null
        if (!classe && p.classe) {
          const wanted = String(p.classe).trim().toLowerCase()
          classe = Object.values((dataStore as any).maps.classes || {}).find((c: any) => {
            if (!c || typeof c !== 'object') return false
            const id = String(c.id ?? '').toLowerCase()
            const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase()
            return id === wanted || name === wanted
          }) || null
        }
        const hpSource: any = extractHitPoints(classe) ?? (p?.hit_points && typeof p.hit_points === 'object' ? p.hit_points : null)
        if (hpSource && typeof hpSource === 'object') {
          const l1 = evalFormuleAdditive(String(hpSource.level_1 || ''), niveau, p.caracs)
          const per = evalFormuleAdditive(String(hpSource.per_level_after_1 || ''), niveau, p.caracs)
          const add = (x: number) => Math.max(1, Number(x) || 0)
          pvMax = add(l1)
          for (let i = 2; i <= niveau; i++) pvMax += add(per)
        }
      } catch {}
      // Spellcasting d�riv� (facultatif si la classe le d�finit)
      let spellSaveDc: number | null = null
      let spellAttackMod: number | null = null
      try {
        const dataStore = useDataStore()
        try {
          const creationStore = useBonomeCreationStore()
        } catch {}
        const classeKey = String(p.classeId || '').trim().toLowerCase()
        const classe = classeKey ? Object.values((dataStore as any).maps.classes || {}).find((c: any) => {
          if (!c || typeof c !== 'object') return false
          const id = String(c.id ?? '').toLowerCase()
          const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase()
          return id === classeKey || name === classeKey
        }) : null
        const sc: any = (classe as any)?.spellcasting_feature || (classe as any)?.spellcasting || null
        if (sc && typeof sc === 'object') {
          const ability = String(sc.ability || 'intelligence').toLowerCase()
          const caracMap: any = {
            force: p.caracs?.force || 10,
            dexterite: p.caracs?.dexterite || 10,
            constitution: p.caracs?.constitution || 10,
            intelligence: p.caracs?.intelligence || 10,
            sagesse: p.caracs?.sagesse || 10,
            charisme: p.caracs?.charisme || 10
          }
          // DC
          if (typeof sc.spell_save_dc_mod === 'string' && sc.spell_save_dc_mod.trim().length) {
            spellSaveDc = evalFormuleAdditive(sc.spell_save_dc_mod, niveau, caracMap)
          } else {
            const m: any = { intelligence:'INT', sagesse:'SAG', dexterite:'DEX', constitution:'CON', force:'FOR', charisme:'CHA' }
            const ab = m[ability] || 'INT'
            spellSaveDc = evalFormuleAdditive(`8 + mait + mod.${ab}` , niveau, caracMap)
          }
          // ATK
          if (typeof sc.spell_attack_mod === 'string' && sc.spell_attack_mod.trim().length) {
            spellAttackMod = evalFormuleAdditive(sc.spell_attack_mod, niveau, caracMap)
          } else {
            const m: any = { intelligence:'INT', sagesse:'SAG', dexterite:'DEX', constitution:'CON', force:'FOR', charisme:'CHA' }
            const ab = m[ability] || 'INT'
            spellAttackMod = evalFormuleAdditive(`mait + mod.${ab}`, niveau, caracMap)
          }
        }
      } catch {}
      return {
        pvMax: Math.max(1, pvMax || 0),
        proficiencyBonus: prof,
        spellcasting: { dc: spellSaveDc, attack: spellAttackMod },
        proficiencySummary: (p.proficienciesDetail && typeof p.proficienciesDetail === 'object') ? { ...p.proficienciesDetail } : {},
        savingThrows: Array.isArray(p.savingThrows) ? [...p.savingThrows] : []
      }
    }
  },
  actions: {
    async levelUp(delta: number = 1) {
      const inc = Math.max(1, Math.floor(Number(delta) || 1))
      ;(this as any).perso.niveau = Math.max(1, Number((this as any).perso.niveau || 1) + inc)
      try { await (this as any).recomputeDerived() } catch {}
    },

    async equip(itemRepoId: string, slot?: 'armePrincipale'|'armeSecondaire'|'protection'|'bouclier'|'accessoire') {
      const id = String(itemRepoId || '').trim()
      if (!id) return
      const mp: any = (this as any).perso.materielPersonnalise || ((this as any).perso.materielPersonnalise = { accessoiresIds: [], keptIds: [], equippedIds: [] })
      mp.keptIds = Array.isArray(mp.keptIds) ? mp.keptIds : []
      mp.equippedIds = Array.isArray(mp.equippedIds) ? mp.equippedIds : []
      if (!mp.keptIds.includes(id)) mp.keptIds.push(id)
      if (!mp.equippedIds.includes(id)) mp.equippedIds.push(id)
      if (slot) {
        if (slot === 'armePrincipale') mp.armePrincipaleId = id
        else if (slot === 'armeSecondaire') mp.armeSecondaireId = id
        else if (slot === 'protection') mp.protectionId = id
        else if (slot === 'bouclier') mp.bouclierId = id
        else if (slot === 'accessoire') {
          mp.accessoiresIds = Array.isArray(mp.accessoiresIds) ? mp.accessoiresIds : []
          if (!mp.accessoiresIds.includes(id)) mp.accessoiresIds.push(id)
        }
      }
      try { await (this as any).recomputeDerived() } catch {}
    },

    async unequip(itemRepoId: string) {
      const id = String(itemRepoId || '').trim()
      if (!id) return
      const mp: any = (this as any).perso.materielPersonnalise || ((this as any).perso.materielPersonnalise = { accessoiresIds: [], keptIds: [], equippedIds: [] })
      mp.equippedIds = (Array.isArray(mp.equippedIds) ? mp.equippedIds : []).filter((x: any) => String(x) !== id)
      if (String(mp.armePrincipaleId || '') === id) mp.armePrincipaleId = null
      if (String(mp.armeSecondaireId || '') === id) mp.armeSecondaireId = null
      if (String(mp.protectionId || '') === id) mp.protectionId = null
      if (String(mp.bouclierId || '') === id) mp.bouclierId = null
      if (Array.isArray(mp.accessoiresIds)) mp.accessoiresIds = mp.accessoiresIds.filter((x: any) => String(x) !== id)
      try { await (this as any).recomputeDerived() } catch {}
    },
    async recomputeDerived() {
      try {
        const p: any = (this as any).perso || {}
        const dataStore = useDataStore()
        // Assurer que la base (classes/races/backgrounds) est chargée avant la résolution
        try {
          if (!Object.keys((dataStore as any).maps?.classes || {}).length) {
            try { const parties = useParties(); await (dataStore as any).load?.(parties.currentPartyId ?? undefined) } catch {}
            if (!Object.keys((dataStore as any).maps?.classes || {}).length) {
              try { await (dataStore as any).load?.() } catch {}
            }
          }
        } catch {}
        try {
          const creationStore = useBonomeCreationStore()
          await creationStore.restoreDatabaseFromIds?.((this as any).perso)
        } catch {}
        if (!Object.keys(dataStore.maps.classes || {}).length) {
          try { await (dataStore.load?.() ?? Promise.resolve()) } catch {}
        }

        const toBaseStats = (caracs: any) => ({
          strength: Number((caracs)?.force ?? 10),
          dexterity: Number((caracs)?.dexterite ?? 10),
          constitution: Number((caracs)?.constitution ?? 10),
          intelligence: Number((caracs)?.intelligence ?? 10),
          wisdom: Number((caracs)?.sagesse ?? 10),
          charisma: Number((caracs)?.charisme ?? 10)
        })
        const niveau = Number(p.niveau || 1) || 1
        const baseCharacter: any = {
          base_stats_before_race: toBaseStats(p.caracs || {}),
        final_stats: {},
        niveau,
        features: Array.isArray(p.featureIds) ? [...p.featureIds] : [],
        equipment: [],
        spellcasting: {},
        proficiencies: [],
        proficiency_summary: {},
        senses: [],
        saving_throws: [],
        item_proposals: [],
        currency: { gold: 0, silver: 0, copper: 0 },
        unhandled_effects: []
      }

        const selection = {
          class: p.classeId ?? null,
          race: p.raceId ?? null,
          background: p.backgroundId ?? null,
          niveau
        }

        const mergeStatBase = (target: StatBase | null, payload: any): StatBase => {
          if (!payload || typeof payload !== 'object') return target ?? {}
          const next: StatBase = { ...(target ?? {}) }
          for (const [key, value] of Object.entries(payload)) {
            if (Array.isArray(value)) {
              const existing = Array.isArray(next[key]) ? (next[key] as any[]) : []
              next[key] = [...existing, ...value]
            } else {
              next[key] = value
            }
          }
          return next
        }


        const pickEffects = (entity: any): any[] => {
          if (!entity || typeof entity !== 'object') return []
          const raw: any = entity
          const arr = raw.effects ?? raw.features ?? raw.payload?.effects ?? []
          return normalizeEffects(arr)
        }
        const effectEntries: Array<{ source?: string | null; effect: any }> = []
        let classSpellPayload: any = null
        let statBasePayload: StatBase | null = null
        const pushEffects = (src: string, list: any[]) => {
          for (const ef of list) {
            effectEntries.push({ source: src, effect: ef })
            if (ef?.type === 'add_stat_base') {
              statBasePayload = mergeStatBase(statBasePayload, ef.payload ?? {})
            }
            if (ef?.type === 'spellcasting_feature' && src === 'class') {
              classSpellPayload = ef.payload ?? classSpellPayload
            }
          }
        }
        const pickGrantFrom = (entity: any, keys: string[]): any => {
          if (!entity || typeof entity !== 'object') return null
          for (const key of keys) {
            if (entity[key] !== undefined) return entity[key]
          }
          if (entity.payload && typeof entity.payload === 'object') {
            for (const key of keys) {
              if (entity.payload[key] !== undefined) return entity.payload[key]
            }
          }
          return null
        }
        const pushDirectGrants = (src: string, entity: any) => {
          if (!entity || typeof entity !== 'object') return
          const profPayload =
            pickGrantFrom(entity, ['proficiency_grant', 'proficiencies', 'proficiencyGrant', 'proficiencies_grant']) ??
            null
          if (profPayload) {
            effectEntries.push({ source: src, effect: { type: 'proficiency_grant', payload: profPayload } })
          }
          const savingPayload = pickGrantFrom(entity, ['saving_throws', 'savingThrows', 'saves', 'saving_throw']) ?? null
          if (savingPayload) {
            effectEntries.push({ source: src, effect: { type: 'saving_throws', payload: { saving_throws: savingPayload } } })
          }
        }

        const findById = (map: Record<string, any> = {}, id: any) => {
          if (!id) return null
          const key = String(id).toLowerCase()
          return map[key] || Object.values(map).find((e: any) => String(e?.id ?? '').toLowerCase() === key) || null
        }

        let cls = findById(dataStore.maps.classes, p.classeId)
        if (!cls && p.classe) {
          const wanted = String(p.classe).trim().toLowerCase()
          cls = Object.values(dataStore.maps.classes || {}).find((entry: any) => {
            if (!entry || typeof entry !== 'object') return false
            const id = String(entry.id ?? '').toLowerCase()
            const name = String(entry.name ?? entry.nom ?? entry.label ?? entry.slug ?? '').toLowerCase()
            return id === wanted || name === wanted
          }) || null
        }
        if (cls) {
          pushEffects('class', pickEffects(cls))
          pushDirectGrants('class', cls)
          const sc = (cls as any).spellcasting_feature || (cls as any).spellcasting || null
          if (sc && typeof sc === 'object') {
            classSpellPayload = sc
            effectEntries.push({ source: 'class', effect: { type: 'spellcasting_feature', payload: sc } })
          }
          const hp = (cls as any).hit_points || null
          const dvCandidate = (() => {
            const keys = ['dv','hit_die','hitdie','hitDie','hit_dice','dice?.hit_die']
            for (const k of keys) { if ((cls as any)[k] !== undefined) return (cls as any)[k] }
            return null
          })()
          if (hp || dvCandidate) effectEntries.push({ source: 'class', effect: { type: 'traits', payload: { hit_points: hp ?? undefined, dv: dvCandidate ?? undefined } } })
        }

        const rc = findById(dataStore.maps.races, p.raceId)
        if (rc) {
          pushEffects('race', pickEffects(rc))
          pushDirectGrants('race', rc)
        }

        const bg = findById(dataStore.maps.backgrounds, p.backgroundId)
        if (bg) {
          pushEffects('background', pickEffects(bg))
          pushDirectGrants('background', bg)
        }

        const featureIds = Array.isArray(p.featureIds) ? p.featureIds.map((x: any) => String(x)) : []
        for (const fid of featureIds) {
          const ft = findById(dataStore.maps.features, fid)
          if (ft) {
            pushEffects(`feature:${fid}`, pickEffects(ft))
            pushDirectGrants(`feature:${fid}`, ft)
          }
        }

        // Effets d'items port�s (IDs d'origine du repo attendus)
        try {
          const equipSet = new Set<string>()
          const mp = (p.materielPersonnalise || {}) as any
          const maybePush = (v: any) => { const s = String(v ?? '').trim(); if (s) equipSet.add(s) }
          maybePush(mp.armePrincipaleId)
          maybePush(mp.armeSecondaireId)
          maybePush(mp.protectionId)
          maybePush(mp.bouclierId)
          if (Array.isArray(mp.accessoiresIds)) for (const id of mp.accessoiresIds) maybePush(id)
          if (Array.isArray(mp.equippedIds)) for (const id of mp.equippedIds) maybePush(id)

          const resolveItemEntity = (id: string) => {
            const direct = (dataStore.maps.items || {})[id]
            if (direct) return direct
            const low = id.toLowerCase()
            return Object.values(dataStore.maps.items || {}).find((it: any) => String(it?.id ?? '').toLowerCase() === low) || null
          }

          for (const id of equipSet) {
            const item = resolveItemEntity(id)
            if (!item) continue
            pushEffects(`item:${id}`, pickEffects(item))
            pushDirectGrants(`item:${id}`, item)
          }
        } catch {}

        const engine = new EffectEngine({ resolveItemById: async (id: string) => dataStore.maps.items?.[id] ?? null })
        await engine.applyEffects(baseCharacter, effectEntries, { selection, baseCharacter })

        const summaryFromEngine = normalizeProficiencySummary((baseCharacter as any).proficiency_summary ?? null)
        const summaryFromPersisted = normalizeProficiencySummary((p as any).proficienciesDetail ?? null)
        const mergedSummary = mergeProficiencySummaries(summaryFromEngine, summaryFromPersisted)
        const summaryForPerso = cloneProficiencySummary(mergedSummary)
        const proficiencySummaryForCache = cloneProficiencySummary(mergedSummary)
        const savingThrowsFromEngine = normalizeStringArray((baseCharacter as any).saving_throws ?? null)
        const savingThrowsFromPersisted = normalizeStringArray((p as any).savingThrows ?? null)
        const savingThrowsCombined = normalizeStringArray([...savingThrowsFromEngine, ...savingThrowsFromPersisted])
        const savingThrowsForCache = [...savingThrowsCombined]
        ;(this as any).perso.proficienciesDetail = summaryForPerso
        ;(this as any).perso.savingThrows = [...savingThrowsCombined]

        let dv = Number(p.dv || 0)
        try {
          const pickNumberFromKeys = (obj: any, keys: string[], fallback = 0): number => {
            if (!obj || typeof obj !== 'object') return fallback
            for (const key of keys) {
              const parts = String(key).split('.')
              let cur: any = obj
              for (const part of parts) { if (cur && typeof cur === 'object' && part in cur) cur = cur[part]; else { cur = undefined; break } }
              const n = Number(cur)
              if (Number.isFinite(n) && n > 0) return n
            }
            return fallback
          }
          const dvFromData = pickNumberFromKeys(cls, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice', 'dice.hit_die'], 0)
          if (dvFromData > 0) dv = dvFromData
        } catch {}
        const conScore = Number(p?.caracs?.constitution ?? baseCharacter?.final_stats?.constitution ?? 10) || 10
        // Calcul PV: uniquement via les formules de classe (hit_points)
        let pvMax = 0
        try {
          const hpFromClass = extractHitPoints(cls)
          const hpSource: any = hpFromClass ?? (p?.hit_points && typeof p.hit_points === 'object' ? p.hit_points : null)
          if (hpFromClass) {
            (this as any).perso.hit_points = { ...hpFromClass }
          }
          if (hpSource) {
            const l1 = evalFormuleAdditive(String(hpSource.level_1 || ''), niveau, (p.caracs || {}) as any)
            const per = evalFormuleAdditive(String(hpSource.per_level_after_1 || ''), niveau, (p.caracs || {}) as any)
            const add = (x: number) => Math.max(1, Number(x) || 0)
            pvMax = add(l1)
            for (let i = 2; i <= niveau; i++) pvMax += add(per)
          } else {
            pvMax = 0
          }
        } catch {
          pvMax = 0
        }
        const proficiencyBonus = bonusDeMaitrise(niveau)
        const spellDc = baseCharacter?.spellcasting?.meta?.spell_save_dc ?? null
        const spellAtk = baseCharacter?.spellcasting?.meta?.spell_attack_mod ?? null
        const spellcastingSummary = (() => {
          const scBase: any = baseCharacter?.spellcasting || {}
          const abilityRaw = classSpellPayload?.ability ?? scBase?.ability ?? null
          const ability = abilityRaw ? String(abilityRaw) : null
          const meta: any = scBase?.meta || {}
          const slotsSource = scBase?.slots ?? classSpellPayload?.slots_table ?? {}
          const slots: Record<string, number | string> = {}
          if (slotsSource && typeof slotsSource === 'object') {
            for (const [k, v] of Object.entries(slotsSource)) {
              slots[k] = typeof v === 'number' ? v : String(v)
            }
          }
          const description = classSpellPayload?.description ?? null
          if (!ability && meta?.spell_save_dc == null && meta?.spell_attack_mod == null && !Object.keys(slots).length && !description) {
            return null
          }
          return {
            ability,
            spellSaveDc: meta?.spell_save_dc ?? null,
            spellAttackMod: meta?.spell_attack_mod ?? null,
            slots,
            description: description ? String(description) : null
          } as SpellcastingSpec
        })()
        const evaluatedStatBases = resolveStatBasePayload(statBasePayload, niveau, (p.caracs || {}) as any)

        const prevPvMax = Number((this as any)._lastPvMax || 0)
        const prevNiv = Number((this as any)._lastNiveau || 0)
        const prevCon = Number((this as any)._lastConScore || 10)
        const isCreation = !prevPvMax && (!Number(p.pvActuels) || Number(p.pvActuels) <= 0)
        const niveauChangedUp = niveau > prevNiv && prevPvMax > 0 && pvMax > prevPvMax
        const conChanged = conScore !== prevCon && prevPvMax > 0
        let nextPvActuels = Number(p.pvActuels || 0)
        if (isCreation) nextPvActuels = pvMax
        else if (niveauChangedUp) nextPvActuels = Math.min(nextPvActuels + (pvMax - prevPvMax), pvMax)
        else if (conChanged) nextPvActuels = Math.min(nextPvActuels, pvMax)
        else nextPvActuels = Math.min(nextPvActuels, pvMax)
        ;(this as any).perso.pvActuels = nextPvActuels
        if (dv > 0) { (this as any).perso.dv = dv }
        if (pvMax > 0) { (this as any).perso.pvMax = pvMax }
        if (spellcastingSummary) {
          (this as any).perso.spellcastingSpec = spellcastingSummary
        } else {
          delete (this as any).perso.spellcastingSpec
        }
        if (evaluatedStatBases && Object.keys(evaluatedStatBases).length) {
          (this as any).perso.statBases = evaluatedStatBases
        } else {
          delete (this as any).perso.statBases
        }

        ;(this as any).derivedCache = {
          pvMax: Math.max(0, pvMax || 0),
          proficiencyBonus,
          spellcasting: { dc: spellDc, attack: spellAtk, ability: spellcastingSummary?.ability ?? null },
          proficiencies: Array.isArray(baseCharacter?.proficiencies) ? [...baseCharacter.proficiencies] : [],
          proficiencySummary: proficiencySummaryForCache,
          savingThrows: [...savingThrowsForCache],
          senses: Array.isArray(baseCharacter?.senses) ? [...baseCharacter.senses] : []
        }
        ;(this as any)._lastPvMax = pvMax
        ;(this as any)._lastNiveau = niveau
        ;(this as any)._lastConScore = conScore
      } catch {
        try { (this as any).derivedCache = null } catch {}
      }
    },
    _storageKey(partieId?: string | null) {
      const id =
        partieId ??
        (() => {
          try {
            const parties = useParties()
            return parties.currentPartyId
          } catch {
            return null
          }
        })() ??
        (() => {
          try {
            const { idCourant } = useSession()
            return idCourant.value
          } catch {
            return null
          }
        })()

      return id ? `JDR_PERSO_${id}` : 'JDR_PERSO'
    },

    async chargerDepuisLocal(partieId?: string) {
      if (!process.client) return
      this.loading = true
      const key = this._storageKey(partieId)
      const brut = localStorage.getItem(key)
      // Log de debug pour la clé et le contenu
      console.info('[Perso] Tentative de chargement', { key, brut })

      let loaded = false
      if (brut) {
        try {
          const parsed = JSON.parse(brut)
          this.perso = await sanitizePersonnage(parsed)
          loaded = true
        } catch (error) {
          console.warn('Chargement de personnage invalide', error)
        }
      }

      // Fallback : tente de restaurer la dernière sauvegarde générique si rien n'a été chargé
      if (!loaded && !partieId) {
        const fallbackRaw = localStorage.getItem('JDR_PERSO')
        console.info('[Perso] Fallback sur JDR_PERSO', { fallbackRaw })
        if (fallbackRaw) {
          try {
            const parsed = JSON.parse(fallbackRaw)
            this.perso = await sanitizePersonnage(parsed)
            loaded = true
          } catch (error) {
            console.warn('Chargement fallback invalide', error)
          }
        }
      }

      // Si aucune sauvegarde trouvée, conserve le personnage courant (évite la réinitialisation accidentelle)
      if (!loaded) {
        console.warn('[Perso] Aucune sauvegarde trouvée, conservation du perso courant')
        // Ne pas écraser le perso courant par défaut
      }
      this.loading = false
      try { await (this as any).recomputeDerived() } catch {}
    },

    sauvegarderLocal(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      try {
        const existingRaw = localStorage.getItem(key)
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw) as any
            const prevInv = Array.isArray(existing?.inventaire) ? existing.inventaire : []
            const curInv = Array.isArray((this as any).perso?.inventaire) ? (this as any).perso.inventaire : []
            if (prevInv.length > 0 && curInv.length === 0) {
              ;(this as any).perso.inventaire = prevInv
            }
          } catch {}
        }
      } catch {}
      // Sauvegarde minimale: �vite les doublons (labels) et blobs lourds
      const toPersist = (() => {
        const p: any = (this as any).perso || {}
        const minimalInventory = Array.isArray(p.inventaire)
          ? p.inventaire.map((it: any) => ({ id: String(it.id), quantity: Number(it.quantity)||1, coins: it.coins ?? null }))
          : []
        return {
          id: String(p.id ?? ''),
          nom: String(p.nom ?? ''),
          niveau: Number(p.niveau) || 1,
          xp: Number(p.xp) || 0,
          dv: Number(p.dv) || 0,
          pvActuels: (() => { const _pvMax = Number(p.pvMax) || Number(((this as any).derived ?? {}).pvMax || 0); const act = Number(p.pvActuels)||0; return _pvMax>0? Math.min(act,_pvMax) : act })(),
          pvMax: Number(p.pvMax) || Number(((this as any).derived ?? {}).pvMax || 0),
          hit_points: p.hit_points && typeof p.hit_points === 'object' ? { ...p.hit_points } : null,
          caracs: p.caracs || {},
          competences: p.competences || {},
          proficienciesDetail: cloneProficiencySummary(normalizeProficiencySummary(p.proficienciesDetail ?? null)),
          savingThrows: normalizeStringArray(p.savingThrows ?? []),
          armure: p.armure || { type: 'aucune' },
          bouclier: Boolean(p.bouclier || false),
          monture: p.monture || { nom:'', vitesse:'', notes:'' },
          inspiration: Boolean(p.inspiration || false),
          inventaire: minimalInventory,
          classeId: p.classeId ?? null,
          raceId: p.raceId ?? null,
          backgroundId: p.backgroundId ?? null,
          featureIds: Array.isArray(p.featureIds) ? p.featureIds.map(String) : [],
          spellIds: Array.isArray(p.spellIds) ? p.spellIds.map(String) : [],
          traits: Array.isArray(p.traits) ? p.traits.map(String) : [],
          materielPersonnalise: p.materielPersonnalise || {},
          descriptionDetaillee: p.descriptionDetaillee || {},
          statBases: p.statBases ?? null,
          spellcastingSpec: p.spellcastingSpec ?? null,
          ui_template: p.ui_template ?? null
        }
      })()
      localStorage.setItem(key, JSON.stringify(toPersist))
    },

    reinitialiser(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      localStorage.removeItem(key)
      if (!partieId) {
        localStorage.removeItem('JDR_PERSO')
      }
      this.perso = createDefaultPerso()
      location.reload()
    }
    ,
    /**
     * Ajoute un montant d'expérience au personnage courant.
     * - N'accepte que des montants positifs.
     * - Sauvegarde locale à la charge de l'appelant (connaît la partie courante).
     */
    ajouterXp(montant: number) {
      const val = Number(montant) || 0
      if (val <= 0) return
      const current = Number((this.perso as any).xp) || 0
      ;(this.perso as any).xp = current + val
    }
  }
})



