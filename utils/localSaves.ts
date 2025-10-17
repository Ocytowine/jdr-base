type PersonnagePersisted = {
  id?: string | null
  nom?: string | null
  niveau?: number | string | null
  classeId?: string | null
  classeId1?: string | null
  classeId2?: string | null
  subclasseId1?: string | null
  subclasseId2?: string | null
  levelClasse1?: number | string | null
  levelClasse2?: number | string | null
  classe?: string | null
  classes?: {
    1?: { classeId?: string | null; subclasseId?: string | null; niveau?: number | string | null }
    2?: { classeId?: string | null; subclasseId?: string | null; niveau?: number | string | null }
    [key: string]: { classeId?: string | null; subclasseId?: string | null; niveau?: number | string | null } | undefined
  }
}

type DataStoreSnapshot = {
  classes?: Record<string, { id?: string; name?: string; nom?: string; label?: string }>
}

export type PartieSaveState =
  | {
      status: 'needs_creation'
      display: string
    }
  | {
      status: 'ready'
      display: string
      personnage: {
        nom: string
        classeId: string | null
        classeLabel: string
        niveau: number
        classeId1?: string | null
        classeId2?: string | null
        subclasseId1?: string | null
        subclasseId2?: string | null
        levelClasse1?: number
        levelClasse2?: number
        classeLabel2?: string | null
        classes?: {
          1: { classeId: string | null; subclasseId: string | null; niveau: number }
          2: { classeId: string | null; subclasseId: string | null; niveau: number }
        }
      }
    }

const PERSONNAGE_PREFIX = 'JDR_PERSO_'
const PERSONNAGE_FALLBACK = 'JDR_PERSO'
const PARTY_DATA_PREFIX = 'JDR_PARTIE_DATA_'
const DATABASE_PREFIX = 'JDR_DATABASE_'
const DATABASE_LEGACY_PREFIX = 'JDR_DATA_'
const CREATION_LOCK_PREFIX = 'bonome_creation_locked_'

const DISPLAY_NEEDS_CREATION = '(etape de creation requise)'

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const readPersonnage = (partieId: string): PersonnagePersisted | null => {
  if (!isBrowser()) return null
  const key = `${PERSONNAGE_PREFIX}${partieId}`
  const fallbackKey = PERSONNAGE_FALLBACK
  const direct = safeParse<PersonnagePersisted>(window.localStorage.getItem(key))
  if (direct) return direct
  const fallback = safeParse<PersonnagePersisted>(window.localStorage.getItem(fallbackKey))
  if (!fallback) return null
  const currentId = window.localStorage.getItem('JDR_PARTIE_CURRENT')
  return currentId === partieId ? fallback : null
}

const readDataSnapshot = (partieId: string): DataStoreSnapshot | null => {
  if (!isBrowser()) return null
  const key = `${DATABASE_PREFIX}${partieId}`
  const legacyKey = `${DATABASE_LEGACY_PREFIX}${partieId}`
  return (
    safeParse<DataStoreSnapshot>(window.localStorage.getItem(key)) ??
    safeParse<DataStoreSnapshot>(window.localStorage.getItem(legacyKey)) ??
    null
  )
}

const resolveClasseLabel = (classeId: string | null, snapshot: DataStoreSnapshot | null): string => {
  if (!classeId) return ''
  const classes = snapshot?.classes ?? {}
  const entry = classeId in classes ? classes[classeId] : undefined
  return (
    (entry?.name ?? entry?.nom ?? entry?.label ?? '').toString().trim() ||
    classeId.toString().trim()
  )
}

export const getPartieSaveState = (partieId: string | null | undefined): PartieSaveState => {
  if (!partieId) {
    return {
      status: 'needs_creation',
      display: DISPLAY_NEEDS_CREATION
    }
  }
  const persisted = readPersonnage(partieId)
  if (!persisted) {
    return {
      status: 'needs_creation',
      display: DISPLAY_NEEDS_CREATION
    }
  }

  const nom = (persisted.nom ?? '').toString().trim()
  const normalizeId = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    return str.length ? str : null
  }
  const classSlot1 = (persisted.classes && typeof persisted.classes === 'object'
    ? persisted.classes['1'] ?? persisted.classes[1] ?? persisted.classes.primary ?? persisted.classes.main
    : null) as PersonnagePersisted['classes'][string] | undefined
  const classSlot2 = (persisted.classes && typeof persisted.classes === 'object'
    ? persisted.classes['2'] ?? persisted.classes[2] ?? persisted.classes.secondary ?? persisted.classes.alt
    : null) as PersonnagePersisted['classes'][string] | undefined

  const classeId1 = normalizeId(classSlot1?.classeId ?? persisted.classeId1 ?? persisted.classeId ?? persisted.classe)
  const classeId2 = normalizeId(classSlot2?.classeId ?? persisted.classeId2)
  const subclasseId1 = normalizeId(classSlot1?.subclasseId ?? persisted.subclasseId1)
  const subclasseId2 = normalizeId(classSlot2?.subclasseId ?? persisted.subclasseId2)
  const rawLevelClasse1 = Number(classSlot1?.niveau ?? persisted.levelClasse1 ?? (persisted.niveau ?? 0))
  let levelClasse1 = Number.isFinite(rawLevelClasse1) ? Math.floor(rawLevelClasse1) : 0
  if (levelClasse1 <= 0 && classeId1) {
    const fallback = Number(persisted.niveau ?? 0)
    levelClasse1 = Number.isFinite(fallback) && fallback > 0 ? Math.floor(fallback) : 1
  }
  if (levelClasse1 <= 0 && classeId1) levelClasse1 = 1
  const rawLevelClasse2 = Number(classSlot2?.niveau ?? persisted.levelClasse2 ?? 0)
  let levelClasse2 = Number.isFinite(rawLevelClasse2) ? Math.floor(rawLevelClasse2) : 0
  if (levelClasse2 < 0) levelClasse2 = 0
  const totalClassLevels = Math.max(0, levelClasse1) + Math.max(0, levelClasse2)
  const niveauPersisted = Number.isFinite(Number(persisted.niveau ?? 0))
    ? Math.floor(Number(persisted.niveau ?? 0))
    : 0
  const niveauRaw = Math.max(0, niveauPersisted, totalClassLevels)
  const niveau = Math.max(1, niveauRaw)

  const hasMinimalData = Boolean(nom || classeId1 || classeId2 || niveauRaw > 0)
  if (!hasMinimalData) {
    return {
      status: 'needs_creation',
      display: DISPLAY_NEEDS_CREATION
    }
  }

  const snapshot = readDataSnapshot(partieId)
  const classeLabel1 = resolveClasseLabel(classeId1, snapshot)
  const classeLabel2 = resolveClasseLabel(classeId2, snapshot)
  const classeLabelPrimary = classeLabel1 || classeLabel2 || 'Classe inconnue'
  const classSegments: string[] = []
  if (classeLabel1) {
    classSegments.push(`${classeLabel1}${levelClasse1 > 0 ? ` ${levelClasse1}` : ''}`)
  }
  if (classeLabel2) {
    classSegments.push(`${classeLabel2}${levelClasse2 > 0 ? ` ${levelClasse2}` : ''}`)
  }
  const displayClasses = classSegments.length ? classSegments.join(' / ') : classeLabelPrimary
  const displayNom = nom || '(nom manquant)'
  const displayNiveau = niveau > 0 ? niveau : 1

  return {
    status: 'ready',
    display: `${displayNom} - ${displayClasses} - Niveau ${displayNiveau}`,
    personnage: {
      nom: displayNom,
      classeId: classeId1,
      classeLabel: classeLabelPrimary,
      niveau: displayNiveau,
      classeId1,
      classeId2,
      subclasseId1,
      subclasseId2,
      levelClasse1,
      levelClasse2,
      classeLabel2: classeLabel2 || null,
      classes: {
        1: { classeId: classeId1, subclasseId: subclasseId1, niveau: levelClasse1 },
        2: { classeId: classeId2, subclasseId: subclasseId2, niveau: levelClasse2 }
      }
    }
  }
}

export const purgePartieLocalSaves = (partieId: string): void => {
  if (!partieId || !isBrowser()) return
  const keysToRemove = [
    `${PARTY_DATA_PREFIX}${partieId}`,
    `${DATABASE_PREFIX}${partieId}`,
    `${DATABASE_LEGACY_PREFIX}${partieId}`,
    `${PERSONNAGE_PREFIX}${partieId}`,
    `${CREATION_LOCK_PREFIX}${partieId}`
  ]
  for (const key of keysToRemove) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // noop
    }
  }
}
