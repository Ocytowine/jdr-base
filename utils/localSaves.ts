type PersonnagePersisted = {
  id?: string | null
  nom?: string | null
  niveau?: number | string | null
  classeId?: string | null
  classe?: string | null
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
  const classeIdCandidate = persisted.classeId ?? (persisted.classe ?? '').toString().trim()
  const classeId = (() => {
    const raw = classeIdCandidate !== undefined && classeIdCandidate !== null ? String(classeIdCandidate).trim() : ''
    return raw.length ? raw : null
  })()
  const niveau = Number(persisted.niveau ?? 0) || 0

  const hasMinimalData = Boolean(nom || classeId || niveau > 0)
  if (!hasMinimalData) {
    return {
      status: 'needs_creation',
      display: DISPLAY_NEEDS_CREATION
    }
  }

  const snapshot = readDataSnapshot(partieId)
  const classeLabel = resolveClasseLabel(classeId, snapshot) || 'Classe inconnue'
  const displayNom = nom || '(nom manquant)'
  const displayNiveau = niveau > 0 ? niveau : 1

  return {
    status: 'ready',
    display: `${displayNom} - ${classeLabel} - Niveau ${displayNiveau}`,
    personnage: {
      nom: displayNom,
      classeId,
      classeLabel,
      niveau: displayNiveau
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
