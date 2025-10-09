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

  const rawInventaire = Array.isArray(source.inventaire) ? source.inventaire : []
  const slugUsage = new Map<string, number>()
  const slugify = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')

  const nextSlug = (base: string, index: number): string => {
    const slug = base || `item-${index}`
    const count = slugUsage.get(slug) ?? 0
    slugUsage.set(slug, count + 1)
    return count === 0 ? slug : `${slug}-${count}`
  }

  const inventaire = rawInventaire.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const id = nextSlug(`item-${index}`, index)
      return {
        id,
        originId: null,
        title: `Objet ${index + 1}`,
        description: null,
        image: null,
        typeLabel: null,
        quantity: 1,
        weightTotal: 0,
        valueLabel: null,
        equipped: false,
        rarity: 'commun',
        tags: []
      } satisfies InventaireSnapshotItem
    }
    const item = entry as Record<string, any>
    const originId = item.originId ? String(item.originId) : typeof item.id === 'string' ? item.id : null
    const label = String(item.title ?? item.label ?? originId ?? `Objet ${index + 1}`)
    const slugBase = slugify(label) || (originId ? slugify(originId) : '')
    const id = nextSlug(slugBase, index)
    return {
      id,
      originId,
      title: label,
      description: item.description ?? null,
      image: item.image ?? null,
      typeLabel: item.typeLabel ?? null,
      quantity: Number.isFinite(item.quantity) ? Number(item.quantity) : 1,
      weightTotal: Number.isFinite(item.weightTotal) ? Number(item.weightTotal) : 0,
      valueLabel: item.valueLabel ?? null,
      equipped: Boolean(item.equipped),
      rarity: item.rarity ?? 'commun',
      tags: Array.isArray(item.tags) ? item.tags.map((tag: unknown) => String(tag)) : []
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
