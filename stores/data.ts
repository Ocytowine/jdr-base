import { defineStore } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'

export type DataMaps = {
  classes: Record<string, any>
  races: Record<string, any>
  backgrounds: Record<string, any>
  features: Record<string, any>
  spells: Record<string, any>
  items: Record<string, any>
}

const DEFAULT_DATA: DataMaps = {
  classes: {},
  races: {},
  backgrounds: {},
  features: {},
  spells: {},
  items: {}
}

export const useDataStore = defineStore('data', {
  state: () => ({
    maps: { ...DEFAULT_DATA } as DataMaps
  }),
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

      // Nouveau prefixe: JDR_DATABASE_*
      return id ? `JDR_DATABASE_${id}` : 'JDR_DATABASE'
    },

    load(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      let raw = localStorage.getItem(key)

      // Migration: ancien prefixe JDR_DATA_* -> JDR_DATABASE_*
      if (!raw) {
        const oldKey = (() => {
          const id = (partieId ?? (() => {
            try { const parties = useParties(); return parties.currentPartyId } catch { return null }
          })())
          return id ? `JDR_DATA_${id}` : 'JDR_DATA'
        })()
        const oldRaw = localStorage.getItem(oldKey)
        if (oldRaw) {
          try {
            // Ecrit sous la nouvelle cle et supprime l’ancienne
            localStorage.setItem(key, oldRaw)
            localStorage.removeItem(oldKey)
            raw = oldRaw
          } catch {}
        }
      }

      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        const next: DataMaps = {
          classes: parsed?.classes ?? {},
          races: parsed?.races ?? {},
          backgrounds: parsed?.backgrounds ?? {},
          features: parsed?.features ?? {},
          spells: parsed?.spells ?? {},
          items: parsed?.items ?? {}
        }
        this.maps = next
      } catch (err) {
        console.warn('Chargement data invalide', err)
        this.maps = { ...DEFAULT_DATA }
      }
    },

    save(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      localStorage.setItem(key, JSON.stringify(this.maps))
    },

    clear(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      localStorage.removeItem(key)
      this.maps = { ...DEFAULT_DATA }
    },

    merge(enriched: Partial<DataMaps>) {
      const m = this.maps
      const src = enriched || {}
      m.classes = { ...m.classes, ...(src.classes || {}) }
      m.races = { ...m.races, ...(src.races || {}) }
      m.backgrounds = { ...m.backgrounds, ...(src.backgrounds || {}) }
      m.features = { ...m.features, ...(src.features || {}) }
      m.spells = { ...m.spells, ...(src.spells || {}) }
      m.items = { ...m.items, ...(src.items || {}) }
    }
  }
})
