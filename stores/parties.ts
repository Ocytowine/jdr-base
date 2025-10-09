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
        id: 'item-epee',
        title: 'Epee longue de soldat',
        description: 'Une lame solide aux gravures usees, mais parfaitement equilibree.',
        typeLabel: 'Arme martiale',
        quantity: 1,
        weightTotal: 1.5,
        valueLabel: '15 po',
        equipped: true,
        rarity: 'commun',
        tags: ['tranchant', 'acier']
      },
      {
        id: 'item-potion',
        title: 'Potion de soin mineure',
        description: "Un flacon d'elixir rouge scintillant. Rend 2d4 + 2 PV.",
        typeLabel: 'Potion',
        quantity: 3,
        weightTotal: 0.9,
        valueLabel: '50 po',
        equipped: false,
        rarity: 'inhabituel',
        tags: ['consommable']
      },
      {
        id: 'item-grimoire',
        title: 'Grimoire de bataille',
        description: 'Recueil de tactiques, sorts mineurs et incantations.',
        typeLabel: 'Livre',
        quantity: 1,
        weightTotal: 2.4,
        valueLabel: '120 po',
        equipped: false,
        rarity: 'rare',
        tags: ['connaissance']
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
  const inventaire = ensureArray<InventaireItem>(raw?.inventaire, [])
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
      localStorage.setItem(PARTY_DATA_PREFIX + id, JSON.stringify(data))
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
