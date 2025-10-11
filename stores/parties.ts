import { defineStore } from 'pinia'
import { useUid } from '@/composables/useUid'
import { useSession } from '@/composables/useSession'
import type { AventureMessage } from '@/components/aventure/AventureChat.vue'
import type { InventaireItem } from '@/components/aventure/AventureInventaire.vue'
import { DEFAULT_PARTIE_INVENTORY_ID_SET } from '@/utils/inventaireTransition'
import type { JournalEntry } from '@/components/aventure/AventureJournal.vue'
import type { Quete } from '@/components/aventure/AventureQuetes.vue'
import type { AideMemoire } from '@/components/aventure/AventureAides.vue'
import type { ModuleClasse } from '@/components/aventure/AventureClasse.vue'
import type { Compagnon } from '@/components/aventure/AventureCompagnons.vue'

const PARTIES_INDEX_KEY = 'JDR_PARTIES_INDEX'
const CURRENT_PARTY_KEY = 'JDR_PARTIE_CURRENT'
const PARTY_DATA_PREFIX = 'JDR_PARTIE_DATA_'

export type PartieMeta = {
  id: string
  label: string
  createdAt: string
  updatedAt: string
}

export type PartieData = {
  id: string
  createdAt: string
  updatedAt: string
  inventaireInitialise: boolean
  messages: AventureMessage[]
  inventaire: InventaireItem[]
  journalEntries: JournalEntry[]
  quetes: Quete[]
  aides: AideMemoire[]
  modulesClasse: ModuleClasse[]
  compagnons: Compagnon[]
}

const isoNow = () => new Date().toISOString()
const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const parseValueLabelToCoins = (label: unknown): { gold: number; silver: number; copper: number } | null => {
  if (typeof label !== 'string') return null
  const goldMatch = label.match(/(\d+)\s*po/i)
  const silverMatch = label.match(/(\d+)\s*pa/i)
  const copperMatch = label.match(/(\d+)\s*pc/i)
  const gold = goldMatch ? Number(goldMatch[1]) : 0
  const silver = silverMatch ? Number(silverMatch[1]) : 0
  const copper = copperMatch ? Number(copperMatch[1]) : 0
  if (!gold && !silver && !copper) return null
  return { gold, silver, copper }
}

const normalizeInventaireItem = (input: any, fallbackId: string): InventaireItem => {
  if (input && typeof input === 'object' && 'name' in input) {
    const item = input as Record<string, any>
    const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
    const weight = Number.isFinite(item.weight) ? Number(item.weight) : null
    const value = item.value && typeof item.value === 'object'
      ? {
          gold: Number(item.value.gold) || 0,
          silver: Number(item.value.silver) || 0,
          copper: Number(item.value.copper) || 0
        }
      : null
  return {
    id: String(item.id ?? fallbackId),
    originId: item.originId ? String(item.originId) : null,
      name: String(item.name ?? fallbackId),
      description: item.description ?? null,
      type: item.type ?? null,
      quantity,
      weight,
      value,
      equipped: Boolean(item.equipped),
      allow_stack: Boolean(item.allow_stack ?? item.allowStack),
      harmonisable: Boolean(item.harmonisable ?? item.harmonizable),
      properties_fight: item.properties_fight ?? item.propertiesFight ?? null,
      properties_equip: item.properties_equip ?? item.propertiesEquip ?? null
    }
  }

  const legacy = input || {}
  const quantity = Number.isFinite(legacy.quantity) ? Number(legacy.quantity) : 1
  const weightTotal = Number.isFinite(legacy.weightTotal) ? Number(legacy.weightTotal) : null
  const weight = weightTotal !== null ? weightTotal / quantity : null
  const valueFromLabel = parseValueLabelToCoins(legacy.valueLabel)

  return {
    id: String(legacy.id ?? fallbackId),
    originId: legacy.originId ? String(legacy.originId) : legacy.id ? String(legacy.id) : null,
    name: String(legacy.title ?? legacy.name ?? fallbackId),
    description: legacy.description ?? null,
    type: legacy.typeLabel ?? legacy.type ?? null,
    quantity,
    weight,
    value: valueFromLabel,
    equipped: Boolean(legacy.equipped ?? legacy.equiped),
    allow_stack: Boolean(legacy.allow_stack ?? legacy.allowStack ?? false),
    harmonisable: Boolean(legacy.harmonisable ?? legacy.harmonizable ?? false),
    properties_fight: legacy.properties_fight ?? legacy.propertiesFight ?? null,
    properties_equip: legacy.properties_equip ?? legacy.propertiesEquip ?? null
  }
}

const createDefaultPartieData = (id: string): PartieData => {
  const now = isoNow()
  return {
    id,
    createdAt: now,
    updatedAt: now,
    inventaireInitialise: false,
    messages: [
      {
        id: randomId(),
        author: 'ai',
        content: 'Bienvenue aventurier. Quelle est votre prochaine action ?',
        timestamp: now
      }
    ],
    inventaire: [
      {
        id: 'epee-longue',
        originId: 'item-epee',
        name: 'Epee longue de soldat',
        description: 'Une lame solide aux gravures usees, mais parfaitement equilibree.',
        type: 'arme',
        quantity: 1,
        weight: 1.5,
        value: { gold: 15, silver: 0, copper: 0 },
        equipped: true,
        allow_stack: false,
        harmonisable: false,
        properties_fight: { damage: '1d8', damage_type: 'slashing' },
        properties_equip: null
      },
      {
        id: 'potion-soin-mineure',
        originId: 'item-potion',
        name: 'Potion de soin mineure',
        description: "Un flacon d'elixir rouge scintillant. Rend 2d4 + 2 PV.",
        type: 'consommable',
        quantity: 3,
        weight: 0.3,
        value: { gold: 50, silver: 0, copper: 0 },
        equipped: false,
        allow_stack: true,
        harmonisable: false,
        properties_fight: null,
        properties_equip: null
      },
      {
        id: 'grimoire-bataille',
        originId: 'item-grimoire',
        name: 'Grimoire de bataille',
        description: 'Recueil de tactiques, sorts mineurs et incantations.',
        type: 'livre',
        quantity: 1,
        weight: 2.4,
        value: { gold: 120, silver: 0, copper: 0 },
        equipped: false,
        allow_stack: false,
        harmonisable: false,
        properties_fight: null,
        properties_equip: null
      }
    ],
    journalEntries: [
      {
        id: randomId(),
        title: 'Briefing initial',
        content: 'Le Maire nous a charges de proteger la ville contre les incursions gobelines.',
        timestamp: now
      }
    ],
    quetes: [
      {
        id: 'quete-principale',
        title: 'Retablir la balise astrale',
        summary: 'Explorer les ruines du temple et rallumer la balise afin de proteger la ville.',
        status: 'active'
      },
      {
        id: 'quete-annexe',
        title: "Trouver l'herbe d'etoile",
        summary: 'Collecter trois tiges pour soigner le capitaine blesse.',
        status: 'completed'
      }
    ],
    aides: [
      {
        id: randomId(),
        title: 'Reactions disponibles',
        content: 'Parade (bouclier) | Riposte (superiorite) | Absorption des elements (sort).'
      },
      {
        id: randomId(),
        title: 'Effets de statut',
        content: 'Avant : avantage aux jets de Dex. Hex: +1d6 degats necrotiques sur la cible.'
      }
    ],
    modulesClasse: [
      {
        id: 'module-1',
        title: 'Manoeuvre: Fente retentissante',
        description: 'Depense 1 point de superiorite pour ajouter 1d8 de degats et imposer un test de Con.',
        usage: '3 points / repos court',
        cooldown: 'Repos court'
      },
      {
        id: 'module-2',
        title: 'Posture de sentinelle',
        description: 'Tant que vous restez immobile, reduisez de 2 les degats de chaque attaque subie.',
        usage: 'Etat actif'
      }
    ],
    compagnons: [
      {
        id: 'compagnon-1',
        name: 'Lysa Briselame',
        role: 'Rodeuse eclaireuse',
        notes: 'Avantage aux tests de perception dans les forets. Arc long +5 (1d8+3).'
      }
    ]
  }
}

const ensureArray = <T>(value: unknown, fallback: T[]): T[] => (Array.isArray(value) ? (value as T[]) : fallback)

const sanitizePartie = (raw: Partial<PartieData> | undefined, id: string): PartieData => {
  const now = isoNow()
  const legacy = ensureArray<any>(raw?.inventaire, [])
  const inventaire = legacy.map((item, index) => normalizeInventaireItem(item, `item-${index}`))
  const inferInventaireInitialise =
    typeof raw?.inventaireInitialise === 'boolean'
      ? raw.inventaireInitialise
      : inventaire.some((item) => !DEFAULT_PARTIE_INVENTORY_ID_SET.has(item.id))
  return {
    id,
    createdAt: typeof raw?.createdAt === 'string' ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : now,
    inventaireInitialise: inferInventaireInitialise,
    messages: ensureArray<AventureMessage>(raw?.messages, []),
    inventaire,
    journalEntries: ensureArray<JournalEntry>(raw?.journalEntries, []),
    quetes: ensureArray<Quete>(raw?.quetes, []),
    aides: ensureArray<AideMemoire>(raw?.aides, []),
    modulesClasse: ensureArray<ModuleClasse>(raw?.modulesClasse, []),
    compagnons: ensureArray<Compagnon>(raw?.compagnons, [])
  }
}

export const useParties = defineStore('parties', {
  state: () => ({
    initialised: false,
    parties: [] as PartieMeta[],
    currentPartyId: null as string | null,
    cache: {} as Record<string, PartieData>
  }),
  getters: {
    currentPartie(state): PartieData | null {
      if (!state.currentPartyId) return null
      return state.cache[state.currentPartyId] ?? null
    },
    partiesSorted(state): PartieMeta[] {
      return [...state.parties].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
  },
  actions: {
    initialiser() {
      if (!process.client || this.initialised) return
      const rawIndex = localStorage.getItem(PARTIES_INDEX_KEY)
      if (rawIndex) {
        try {
          this.parties = JSON.parse(rawIndex) as PartieMeta[]
        } catch (error) {
          console.warn('Impossible de parser le registre des parties', error)
          this.parties = []
        }
      }
      const currentId = localStorage.getItem(CURRENT_PARTY_KEY)
      if (currentId && this.parties.some((meta) => meta.id === currentId)) {
        this.currentPartyId = currentId
        this.chargerPartie(currentId)
        this.syncSession(currentId)
      }
      this.initialised = true
    },
    creerPartie(label?: string) {
      if (!process.client) return null
      const { nouvelId } = useUid()
      const id = nouvelId('partie')
      const now = isoNow()
      const meta: PartieMeta = {
        id,
        label: label ?? id,
        createdAt: now,
        updatedAt: now
      }
      this.parties.push(meta)
      const data = createDefaultPartieData(id)
      this.cache[id] = data
      this.currentPartyId = id
      this.persistMeta()
      this.persistPartie(id)
      this.persistCurrent()
      this.syncSession(id)
      return id
    },
    chargerPartie(id: string) {
      if (!process.client) return null
      if (this.cache[id]) return this.cache[id]
      const raw = localStorage.getItem(PARTY_DATA_PREFIX + id)
      let data: PartieData
      if (raw) {
        try {
          // Les anciennes sauvegardes peuvent encore contenir un inventaire -> on le lit mais sanitize retire les doublons
          data = sanitizePartie(JSON.parse(raw) as PartieData, id)
        } catch (error) {
          console.warn(`Impossible de charger la partie ${id}`, error)
          data = createDefaultPartieData(id)
        }
      } else {
        data = createDefaultPartieData(id)
      }
      this.cache[id] = data
      // Aligne le timestamp de meta si besoin
      const meta = this.parties.find((item) => item.id === id)
      if (meta) {
        meta.updatedAt = data.updatedAt
        this.persistMeta()
      }
      return data
    },
    getPartie(id: string) {
      return this.cache[id] ?? null
    },
    setCurrentParty(id: string) {
      if (!process.client) return
      if (!this.parties.some((meta) => meta.id === id)) return
      this.currentPartyId = id
      this.persistCurrent()
      this.chargerPartie(id)
      this.syncSession(id)
    },
    updatePartie(id: string, patch: Partial<Omit<PartieData, 'id' | 'createdAt'>>) {
      if (!process.client) return
      const existing = this.chargerPartie(id)
      if (!existing) return
      const merged = {
        ...existing,
        ...patch,
        id,
        createdAt: existing.createdAt
      }
      const sanitized = sanitizePartie(merged, id)
      sanitized.updatedAt = isoNow()
      this.cache[id] = sanitized
      this.persistPartie(id)
      const meta = this.parties.find((item) => item.id === id)
      if (meta) {
        meta.updatedAt = sanitized.updatedAt
        this.persistMeta()
      }
    },
    supprimerPartie(id: string) {
      if (!process.client) return
      this.parties = this.parties.filter((meta) => meta.id !== id)
      delete this.cache[id]
      localStorage.removeItem(PARTY_DATA_PREFIX + id)
      this.persistMeta()
      if (this.currentPartyId === id) {
        this.currentPartyId = null
        this.persistCurrent()
        this.syncSession(null)
      }
    },
    persistMeta() {
      if (!process.client) return
      localStorage.setItem(PARTIES_INDEX_KEY, JSON.stringify(this.parties))
    },
    persistPartie(id: string) {
      if (!process.client) return
      const data = this.cache[id]
      if (!data) return
      // Ne persiste pas l'inventaire dans la sauvegarde de partie (evite le doublon avec data/personnage)
      const { inventaire: _discardInv, inventaireInitialise: _discardInit, ...rest } = data
      localStorage.setItem(PARTY_DATA_PREFIX + id, JSON.stringify(rest))
    },
    persistCurrent() {
      if (!process.client) return
      if (this.currentPartyId) {
        localStorage.setItem(CURRENT_PARTY_KEY, this.currentPartyId)
      } else {
        localStorage.removeItem(CURRENT_PARTY_KEY)
      }
    },
    syncSession(id: string | null) {
      const { definirIdPartie } = useSession()
      definirIdPartie(id)
    }
  }
})
