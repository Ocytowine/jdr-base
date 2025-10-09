import { defineStore } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'
import type { CreationInventoryTransition } from '@/utils/inventaireTransition'

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

export type Personnage = {
  id: string
  nom: string
  lignee: string
  age: number
  alignement: string
  historique: string
  classe: string
  sousClasse: string
  niveau: number
  dv: number
  pvActuels: number
  caracs: Caracs
  competences: Record<string, boolean>
  langues: string
  armure?: { type: 'aucune' | 'legere' | 'intermediaire' | 'lourde'; nom?: string }
  bouclier?: boolean
  monture: { nom: string; vitesse: string; notes: string }
  inspiration: boolean
  inventaire: InventaireSnapshotItem[]
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
  dv: 10,
  pvActuels: 10,
  caracs: {
    force: 15,
    dexterite: 14,
    constitution: 13,
    intelligence: 12,
    sagesse: 10,
    charisme: 8
  } as Caracs,
  competences: {} as Record<string, boolean>,
  langues: 'Commun',
  armure: { type: 'aucune' },
  bouclier: false,
  monture: { nom: '', vitesse: '', notes: '' },
  inspiration: false,
  inventaire: [],
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
  }
})

const sanitizePersonnage = (raw: unknown): Personnage => {
  const base = createDefaultPerso()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const source = raw as Record<string, any>
  const { equipement: _discardedEquipement, ...restSource } = source

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
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
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
  const inventaire = rawInventaire.map((entry, index) => {
    const fallbackName = `Objet ${index + 1}`
    const normalized = normalizeInventoryBase(entry, fallbackName)
    const baseId = normalized.idCandidate ?? normalized.originId ?? normalized.name ?? `item-${index}`
    let slugBase = baseId ? slugify(String(baseId)) : ''
    if (!slugBase && normalized.name) slugBase = slugify(normalized.name)
    if (!slugBase) slugBase = `item-${index}`
    const id = makeUniqueSlug(slugBase, slugUsage)
    const originId = normalized.originId ?? normalized.idCandidate ?? id
    return {
      id,
      originId,
      name: normalized.name,
      description: normalized.description,
      type: normalized.type,
      quantity: normalized.quantity,
      weight: normalized.weight,
      value: normalized.value,
      equipped: normalized.equipped,
      allow_stack: normalized.allow_stack,
      harmonisable: normalized.harmonisable,
      properties_fight: normalized.properties_fight,
      properties_equip: normalized.properties_equip
    } satisfies InventaireSnapshotItem
  })

  const slugByOrigin = new Map<string, string>()
  for (const item of inventaire) {
    slugByOrigin.set(item.id, item.id)
    if (item.originId) {
      slugByOrigin.set(item.originId, item.id)
    }
  }

  const adaptId = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    if (!str.length) return null
    return slugByOrigin.get(str) ?? str
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

  return {
    ...base,
    ...restSource,
    caracs,
    competences,
    inventaire,
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
    }
  }
}

export const usePersonnage = defineStore('personnage', {
  state: () => ({
    perso: createDefaultPerso()
  }),
  getters: {
    listeCompetences: () => DEF_COMPETENCES
  },
  actions: {
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

    chargerDepuisLocal(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      const brut = localStorage.getItem(key) ?? (!partieId ? localStorage.getItem('JDR_PERSO') : null)
      if (!brut) return
      try {
        const parsed = JSON.parse(brut)
        this.perso = sanitizePersonnage(parsed)
      } catch (error) {
        console.warn('Chargement de personnage invalide', error)
        this.perso = createDefaultPerso()
      }
    },

    sauvegarderLocal(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      localStorage.setItem(key, JSON.stringify(this.perso))
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
  }
})
