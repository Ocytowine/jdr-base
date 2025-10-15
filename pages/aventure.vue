<template>
  <section class="aventure-page">
    <header class="aventure-page__header">
      <div>
        <h1>Table d'aventure</h1>
        <p>Gerez votre expedition, consultez vos ressources et discutez avec le narrateur IA.</p>
      </div>
      <div class="aventure-page__header-actions">
        <button class="aventure-page__debug-button" type="button" @click="toggleDebugPanel">
          {{ showDebugPanel ? 'Masquer la sauvegarde' : 'Afficher la sauvegarde' }}
        </button>
      </div>
      <span v-if="partie" class="aventure-page__badge aventure-page__badge--loaded">
        Partie: {{ partie.id }}
      </span>
      <span v-else class="aventure-page__badge">Nouvelle partie</span>
    </header>

    <p v-if="etatSauvegarde === 'chargement'" class="aventure-page__state">Chargement de votre fiche...</p>
    <p v-else-if="!partie" class="aventure-page__state">
      Aucune partie active. Rendez-vous sur la page Joueur pour en creer ou en charger une.
    </p>

    <template v-else>
      <section v-if="showDebugPanel" class="aventure-page__debug">
        <header class="aventure-page__debug-header">
          <h2>Sauvegardes locales</h2>
          <button type="button" class="aventure-page__debug-refresh" @click="refreshDebugSnapshots">
            Actualiser
          </button>
        </header>
        <div class="aventure-page__debug-grid">
          <article class="aventure-page__debug-card">
            <h3>Partie (cache courant)</h3>
            <ul class="aventure-page__debug-summary" v-if="summariseDebugSource(debugPartieCache).length">
              <li v-for="row in summariseDebugSource(debugPartieCache)" :key="row.label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </li>
            </ul>
            <details>
              <summary>Voir les donnees</summary>
              <pre>{{ formatDebugValue(debugPartieCache) }}</pre>
            </details>
          </article>
          <article class="aventure-page__debug-card">
            <h3>Partie (localStorage)</h3>
            <ul class="aventure-page__debug-summary" v-if="summariseDebugSource(debugPartieStorage).length">
              <li v-for="row in summariseDebugSource(debugPartieStorage)" :key="row.label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </li>
            </ul>
            <details>
              <summary>Voir les donnees</summary>
              <pre>{{ formatDebugValue(debugPartieStorage) }}</pre>
            </details>
          </article>
          <article class="aventure-page__debug-card">
            <h3>Database (localStorage)</h3>
            <ul class="aventure-page__debug-summary" v-if="summariseDatabase(debugDatabaseStorage).length">
              <li v-for="row in summariseDatabase(debugDatabaseStorage)" :key="row.label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </li>
            </ul>
            <details>
              <summary>Voir les donnees</summary>
              <pre>{{ formatDebugValue(debugDatabaseStorage) }}</pre>
            </details>
          </article>
          <article class="aventure-page__debug-card">
            <h3>Fiche personnage</h3>
            <ul class="aventure-page__debug-summary" v-if="summariseDebugSource(debugPersonnageStorage).length">
              <li v-for="row in summariseDebugSource(debugPersonnageStorage)" :key="row.label">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </li>
            </ul>
            <details>
              <summary>Voir les donnees</summary>
              <pre>{{ formatDebugValue(debugPersonnageStorage) }}</pre>
            </details>
          </article>
        </div>
      </section>

      <p v-if="etatSauvegarde === 'aucune'" class="aventure-page__notice">
        Aucune fiche personnage sauvegardee. Terminez la creation pour lier vos donnees a cette partie.
      </p>

      <AventureLayout :overlay-transparent="activeSection === 'narration'">
        <template #sidebar>
          <AventureSidebar
            :sections="sections"
            :active-section="activeSection"
            @select="(sectionId) => (activeSection = sectionId)"
          />
        </template>

        

        <component
          v-if="panelConfig"
          :is="panelConfig.component"
          v-bind="panelConfig.props"
          v-on="panelConfig.on"
        />
      </AventureLayout>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRequestFetch } from '#app'
import { usePersonnage } from '@/stores/personnage'
import { useParties } from '@/stores/parties'
import type { PartieData } from '@/stores/parties'
import AventureLayout from '@/components/aventure/AventureLayout.vue'
import AventureSidebar from '@/components/aventure/AventureSidebar.vue'
import AventureChat, { type AventureMessage } from '@/components/aventure/AventureChat.vue'
import AventureFichePersonnage from '@/components/aventure/AventureFichePersonnage.vue'
import AventureClasse, { type ModuleClasse } from '@/components/aventure/AventureClasse.vue'
import AventureInventaire from '@/components/aventure/AventureInventaire.vue'
import type { InventaireItem } from '@/components/aventure/AventureInventaire.vue'
import AventureQuetes, { type Quete } from '@/components/aventure/AventureQuetes.vue'
import AventureJournal, { type JournalEntry } from '@/components/aventure/AventureJournal.vue'
import AventureAides, { type AideMemoire } from '@/components/aventure/AventureAides.vue'
import AventureCompagnons, { type Compagnon } from '@/components/aventure/AventureCompagnons.vue'
import AventureLevelUp from '@/components/aventure/AventureLevelUp.vue'
import { useBonomeCreationStore } from '@/stores/bonomeCreation'
import { useDataStore } from '@/stores/data'
import { buildCreationInventoryTransition } from '@/utils/inventaireTransition'
import { processInput as processCommand, isCommandInput } from '@/utils/commands'
import { defineAsyncComponent } from 'vue'

type EtatSauvegarde = 'chargement' | 'chargee' | 'aucune'

/* type SectionId =
  | 'narration'
  | 'fiche'
  | 'classe'\n  | 'levelup'\n  | 'inventaire'
  | 'quetes'
  | 'journal'
  | 'aides'
  | 'compagnons' */

const isoNow = () => new Date().toISOString()
const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const storePersonnage = usePersonnage()
const partiesStore = useParties()
const creation = useBonomeCreationStore()
const dataStore = useDataStore()
const requestFetch = useRequestFetch()

if (process.client) {
  partiesStore.initialiser()
  try { dataStore.load(partiesStore.currentPartyId || undefined) } catch {}
}

const etatSauvegarde = ref<EtatSauvegarde>('chargement')
const activeSection = ref<'narration' | 'fiche' | 'classe' | 'levelup' | 'inventaire' | 'quetes' | 'journal' | 'aides' | 'compagnons'>('narration')
const showDebugPanel = ref(false)
  const debugPartieCache = ref<any | null>(null)
  const debugPartieStorage = ref<any | null>(null)
  const debugPersonnageStorage = ref<any | null>(null)
  const debugDatabaseStorage = ref<any | null>(null)
const inventaireOriginal = ref<InventaireItem[]>([])
const inventaireDraft = ref<InventaireItem[]>([])
const isSyncingInventaire = ref(false)

const partie = computed<PartieData | null>(() => partiesStore.currentPartie)
const messages = computed<AventureMessage[]>(() => partie.value?.messages ?? [])
const classeDisplayLabel = computed(() => {
  const cid = (storePersonnage as any).perso?.classeId || null
  if (cid && dataStore.maps.classes[cid]) {
    const raw = dataStore.maps.classes[cid]
    return String(raw?.name || raw?.nom || raw?.label || storePersonnage.perso.classe || 'Classe')
  }
  return storePersonnage.perso.classe || 'Classe'
})

// Modules de classe a partir des features/sorts (data + ids du personnage)
const classeModulesFromData = computed<ModuleClasse[]>(() => {
  const out: ModuleClasse[] = []
  try {
    const perso: any = (storePersonnage as any).perso
    const featureIds: string[] = Array.isArray(perso?.featureIds) ? perso.featureIds.map((x: any) => String(x)) : []
    const spellIds: string[] = Array.isArray(perso?.spellIds) ? perso.spellIds.map((x: any) => String(x)) : []

    for (const fid of featureIds) {
      const raw = dataStore.maps.features[fid]
      if (!raw) continue
      const title = String(raw?.name || raw?.label || fid)
      const description = String(
        raw?.description || raw?.desc || raw?.summary || raw?.flavor || raw?.text || ''
      )
      const usage = ((): string | undefined => {
        const u = raw?.usage || raw?.mecanique?.usage || raw?.recharge || raw?.cooldown
        return u ? String(u) : undefined
      })()
      const cooldown = ((): string | undefined => {
        const c = raw?.cooldown || raw?.mecanique?.cooldown || raw?.recharge
        return c ? String(c) : undefined
      })()
      out.push({ id: fid, title, description, usage, cooldown })
    }

    for (const sid of spellIds) {
      const raw = dataStore.maps.spells[sid]
      if (!raw) continue
      const title = String(raw?.name || raw?.nom || raw?.label || sid)
      const pieces: string[] = []
      if (raw?.school) pieces.push(String(raw.school))
      if (raw?.level !== undefined) pieces.push(`Niv. ${raw.level}`)
      const head = pieces.length ? `Sort ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ${pieces.join(' ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ ')}` : 'Sort'
      const description = String(raw?.description || raw?.desc || '')
      out.push({ id: sid, title: `${head}: ${title}`, description })
    }
  } catch {}
  return out
})

// Construit un item affichable a partir d'un couple (id, quantity) et des donnees brutes du store data
const buildItemFromData = (id: string, quantity: number, coins: any | null | undefined) => {
  const raw = dataStore.maps.items[id] || null
  const name = (raw?.name || raw?.nom || raw?.label || id)
  const description = raw?.description || raw?.desc || null
  const type = raw?.type || raw?.resolved?.type || null
  const weight = raw?.weight || raw?.resolved?.weight || null
  const value = coins ? { gold: coins.gold||0, silver: coins.silver||0, copper: coins.copper||0 } : (raw?.value || raw?.resolved?.value || null)
  const properties_fight = raw?.properties_fight || null
  const properties_equip = raw?.properties_equip || null
  return {
    id,
    originId: id,
    name: String(name),
    description: typeof description === 'string' ? description : null,
    type: typeof type === 'string' ? type : null,
    quantity: Number(quantity) || 1,
    weight: typeof weight === 'number' ? weight : null,
    value: value ? { gold: Number(value.gold)||0, silver: Number(value.silver)||0, copper: Number(value.copper)||0 } : null,
    equipped: false,
    allow_stack: Boolean(raw?.allow_stack || raw?.allowStack),
    harmonisable: Boolean(raw?.harmonisable || raw?.harmonizable),
    properties_fight: properties_fight ?? null,
    properties_equip: properties_equip ?? null
  } as InventaireItem
}

const inventaireFromData = computed<InventaireItem[]>(() => {
  try {
    const entries = Array.isArray((storePersonnage as any).perso?.inventaire) ? (storePersonnage as any).perso.inventaire : []
    return entries.map((e: any) => buildItemFromData(String(e.id), Number(e.quantity)||1, e.coins || null))
  } catch {
    return []
  }
})

// Inventaire issu de la crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ation (Option A, affichage non destructif)
const creationInventoryTransition = computed(() => {
  const kept = (creation.materialKeptItems?.value ?? []) as Array<{
    item: unknown
    keep: boolean
  }>
  if (!kept.length) {
    return {
      items: [] as InventaireItem[],
      keptIds: [] as string[],
      equippedIds: [] as string[]
    }
  }
  return buildCreationInventoryTransition({
    entries: kept.map((entry) => entry.item),
    assignments: (creation.materialAssignments as Record<string, string | null> | undefined) ?? null,
    purseKey: creation.materialCoinPurseKey?.value || null,
    finalCoins: creation.materialFinalCoins?.value ?? null
  })
})

const resolvePersonnageStorageKey = (partyId: string | null | undefined) => {
  if (typeof storePersonnage._storageKey === 'function') {
    return storePersonnage._storageKey(partyId)
  }
  return partyId ? `JDR_PERSO_${partyId}` : 'JDR_PERSO'
}

  const refreshDebugSnapshots = async () => {
    if (!process.client) {
      debugPartieCache.value = null
      debugPartieStorage.value = null
      debugPersonnageStorage.value = null
      debugDatabaseStorage.value = null
      return
    }

    const currentId = partiesStore.currentPartyId
    const cached = currentId ? partiesStore.getPartie(currentId) : null
    debugPartieCache.value = cached ?? null

    const partieKey = currentId ? `JDR_PARTIE_DATA_${currentId}` : null
    debugPartieStorage.value = partieKey
      ? (() => {
          const raw = localStorage.getItem(partieKey)
          if (!raw) return null
          try {
            return JSON.parse(raw)
          } catch (error) {
            return { erreur: 'JSON invalide', raw }
          }
        })()
      : null

    const personnageKey = resolvePersonnageStorageKey(currentId)
    debugPersonnageStorage.value = (() => {
      const raw = localStorage.getItem(personnageKey)
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch (error) {
        return { erreur: 'JSON invalide', raw }
      }
    })()

    // Tenter d'enrichir la DATABASE ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  partir de la fiche personnage (appelle /api/creation/complete)
    try {
      const rawPerso = localStorage.getItem(personnageKey)
      const perso = rawPerso ? JSON.parse(rawPerso) : null
      if (perso) {
        const selection = {
          class: perso.classeId ?? perso.classe ?? null,
          race: perso.raceId ?? perso.lignee ?? null,
          background: perso.backgroundId ?? null,
          niveau: perso.niveau ?? 1,
          chosenOptions: {}
        }
        const completion = await requestFetch('/api/creation/complete', {
          method: 'POST',
          body: { selection, previewCharacter: null, personnage: perso }
        }).catch(() => null)
        if (completion?.ok && completion.enriched) {
          try {
            dataStore.merge(completion.enriched)
            if (currentId) dataStore.save(currentId)
          } catch (e) {
            // ignore merge/save failures but continue to update snapshot view
          }
        }
      }
    } catch (err) {
      // ignore fetch errors but continue to refresh displayed snapshot
    }

    // Snapshot de la base de donnees (DATABASE) ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â on montre d'abord le dataStore s'il est prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©sent,
    // sinon on lit le localStorage via la cle calculÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e
    try {
      debugDatabaseStorage.value = dataStore.maps ?? null
    } catch {
      const databaseKey = ((): string => {
        try {
          return (dataStore as any)._storageKey(currentId || undefined)
        } catch {
          return currentId ? `JDR_DATABASE_${currentId}` : 'JDR_DATABASE'
        }
      })()
      debugDatabaseStorage.value = (() => {
        const raw = localStorage.getItem(databaseKey)
        if (!raw) return null
        try {
          return JSON.parse(raw)
        } catch (error) {
          return { erreur: 'JSON invalide', raw }
        }
      })()
    }
  }

const formatDebugValue = (value: unknown) => {
  if (value === null || value === undefined) return 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

  const summariseDebugSource = (value: any) => {
    if (!value || typeof value !== 'object') return [] as Array<{ label: string; value: string }>
    const rows: Array<{ label: string; value: string }> = []
    if ('id' in value && typeof value.id === 'string') rows.push({ label: 'ID', value: value.id })
    if ('updatedAt' in value && typeof value.updatedAt === 'string') rows.push({ label: 'Mis a jour', value: value.updatedAt })
    if ('inventaire' in value && Array.isArray(value.inventaire)) rows.push({ label: 'Objets', value: String(value.inventaire.length) })
    if ('journalEntries' in value && Array.isArray(value.journalEntries)) rows.push({ label: 'Journal', value: String(value.journalEntries.length) })
    if ('quetes' in value && Array.isArray(value.quetes)) rows.push({ label: 'Quetes', value: String(value.quetes.length) })
    if ('aides' in value && Array.isArray(value.aides)) rows.push({ label: 'Aides', value: String(value.aides.length) })
    return rows
  }

  const summariseDatabase = (value: any) => {
    if (!value || typeof value !== 'object') return [] as Array<{ label: string; value: string }>
    const safeLen = (obj: any) => (obj && typeof obj === 'object' ? Object.keys(obj).length : 0)
    return [
      { label: 'Classes', value: String(safeLen((value as any).classes)) },
      { label: 'Races', value: String(safeLen((value as any).races)) },
      { label: 'Historiques', value: String(safeLen((value as any).backgrounds)) },
      { label: 'Capacites', value: String(safeLen((value as any).features)) },
      { label: 'Sorts', value: String(safeLen((value as any).spells)) },
      { label: 'Objets', value: String(safeLen((value as any).items)) }
    ]
  }

const toggleDebugPanel = () => {
  showDebugPanel.value = !showDebugPanel.value
  if (showDebugPanel.value) {
    refreshDebugSnapshots()
  }
}

const cloneInventaireItems = (items: InventaireItem[] | undefined | null): InventaireItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    tags: Array.isArray(item.tags) ? [...item.tags] : []
  }))

const areInventairesEqual = (left: InventaireItem[], right: InventaireItem[]) =>
  JSON.stringify(left) === JSON.stringify(right)

const syncInventaireState = (items: InventaireItem[], mirrorStore = false) => {
  const cloned = cloneInventaireItems(items)
  inventaireOriginal.value = cloned
  inventaireDraft.value = cloneInventaireItems(cloned)
}

const hasPendingInventoryChanges = computed(() => {
  return JSON.stringify(inventaireDraft.value) !== JSON.stringify(inventaireOriginal.value)
})

watch(
  [partie, creationInventoryTransition],
  ([currentPartie, transition]) => {
    if (!process.client) return
    if (!currentPartie) {
      if (!hasPendingInventoryChanges.value) {
        syncInventaireState([])
      }
      return
    }
    if (currentPartie.inventaireInitialise) {
      if (!hasPendingInventoryChanges.value) {
        const cloned = cloneInventaireItems(currentPartie.inventaire)
        // Si inventaire contient des placeholders (ex: id comme 'item-0'), tenter remplacement via data
        const hasPlaceholders = cloned.some((it) => /^item-\d+$/i.test(String(it.id)) || !it.name)
        const dataItems = inventaireFromData.value
        if (hasPlaceholders && dataItems.length) {
          partiesStore.updatePartie(currentPartie.id, {
            inventaire: dataItems,
            inventaireInitialise: true
          })
          syncInventaireState(cloneInventaireItems(dataItems))
          try { dataStore.load(currentPartie.id) } catch {}
          return
        }
        syncInventaireState(cloned)
      }
      return
    }
    // Si la partie n'a pas encore un inventaire initialise, tenter d'abord les IDs + data
    const dataItems = inventaireFromData.value
    if (dataItems.length) {
      partiesStore.updatePartie(currentPartie.id, {
        inventaire: dataItems,
        inventaireInitialise: true
      })
      syncInventaireState(cloneInventaireItems(dataItems))
      try { dataStore.load(currentPartie.id) } catch {}
      return
    }
    if (!transition.items.length) {
      if (!hasPendingInventoryChanges.value) {
        const cloned = cloneInventaireItems(currentPartie.inventaire)
        syncInventaireState(cloned)
        storePersonnage.sauvegarderLocal(currentPartie.id)
      }
      return
    }
    const initialItems = cloneInventaireItems(transition.items)
    partiesStore.updatePartie(currentPartie.id, {
      inventaire: initialItems,
      inventaireInitialise: true
    })
    syncInventaireState(initialItems)
    storePersonnage.sauvegarderLocal(currentPartie.id)
  },
  { immediate: false }
)

watch(
  () => partie.value?.inventaire,
  (inventaire) => {
    if (!partie.value) {
      if (!hasPendingInventoryChanges.value) {
        syncInventaireState([])
      }
      return
    }
    if (!partie.value.inventaireInitialise) return
    if (hasPendingInventoryChanges.value || isSyncingInventaire.value) return
    const cloned = cloneInventaireItems(inventaire)
    if (areInventairesEqual(cloned, inventaireOriginal.value)) return
    syncInventaireState(cloned)
  },
  { deep: true }
)

// Le store personnage conserve des IDs minimaux; on ne synchronise plus vers la partie ici.

watch(
  () => partiesStore.cache,
  () => {
    if (showDebugPanel.value) {
      refreshDebugSnapshots()
    }
  },
  { deep: true }
)

const sections: Array<{ id: SectionId; label: string; hint?: string }> = [
  { id: 'narration', label: 'Narration', hint: 'Fil de discussion' },
  { id: 'fiche', label: 'Fiche personnage', hint: 'Profil complet' },
  { id: 'classe', label: 'Classe & pouvoirs', hint: 'Configuration dynamique a venir' },
  { id: 'levelup', label: 'Passer un niveau', hint: 'AperÃƒÂ§u + choix' },
  { id: 'inventaire', label: 'Inventaire', hint: 'Equipement et tresors' },
  { id: 'quetes', label: 'Quetes', hint: 'Objectifs actifs' },
  { id: 'journal', label: 'Journal', hint: 'Notes de session' },
  { id: 'aides', label: 'Aides de jeu', hint: 'Rappels et regles' },
  { id: 'compagnons', label: 'Compagnons', hint: 'Allies et familiers' }
]

const ensureDataForCurrent = async () => {
  if (!process.client) return
  try {
    const perso: any = (storePersonnage as any).perso
    if (!perso) return
    const itemIds: string[] = Array.isArray(perso.inventaire) ? perso.inventaire.map((e: any) => String(e.id)) : []
    const missing = itemIds.filter((id) => !dataStore.maps.items[id])
    const needEntities = missing.length > 0 || (perso.classeId && !dataStore.maps.classes[perso.classeId])
    if (!needEntities) return
    const selection = {
      class: perso.classeId || null,
      race: perso.raceId || null,
      background: perso.backgroundId || null,
      niveau: perso.niveau || 1,
      chosenOptions: {}
    }
    const completion = await requestFetch('/api/creation/complete', {
      method: 'POST',
      body: { selection, previewCharacter: null, personnage: perso }
    }).catch(() => null)
    if (completion?.ok && completion.enriched) {
      dataStore.merge(completion.enriched)
      try { if (partiesStore.currentPartyId) dataStore.save(partiesStore.currentPartyId) } catch {}
    }
  } catch {}
}

onMounted(async () => {
  if (!process.client) return
  partiesStore.initialiser()
  const id = partiesStore.currentPartyId
  if (!id) return
  partiesStore.chargerPartie(id)
  // Charger d'abord la fiche personnage avant toute sauvegarde
  try {
    const key = `JDR_PERSO_${id}`
    const sauvegarde = localStorage.getItem(key) ?? localStorage.getItem('JDR_PERSO')
    if (sauvegarde) {
      storePersonnage.chargerDepuisLocal(id)
      // Assure la prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©sence de ui_template pour la classe
      try {
        const dataStore = useDataStore()
        if (!storePersonnage.perso.ui_template) {
          const wanted = String(storePersonnage.perso.classeId ?? storePersonnage.perso.classe ?? '').trim().toLowerCase()
          if (wanted) {
            const all = Object.values(dataStore.maps.classes || {})
            const found = all.find((c: any) => {
              if (!c || typeof c !== 'object') return false
              const cid = String(c.id ?? '').toLowerCase()
              const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase()
              return cid === wanted || name === wanted
            })
            if (found && typeof found.ui_template === 'string' && found.ui_template.trim().length) {
              storePersonnage.perso.ui_template = found.ui_template.trim()
            }
          }
        }
        // PrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©charge le composant si dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©jÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  connu
        const tpl = storePersonnage.perso.ui_template
        if (tpl) {
          const keyMatch = Object.keys(classeTemplates).find(k => k.endsWith(`/${tpl}`))
          if (keyMatch) { (classeTemplates as any)[keyMatch]() }
        }
      } catch {}
      etatSauvegarde.value = 'chargee'
    } else {
      etatSauvegarde.value = 'aucune'
    }
  } catch {
    etatSauvegarde.value = 'aucune'
  }
  // Synchroniser l'inventaire UI a partir de la partie si present, sinon laisser les watchers reconstruire via data/personnage
  const current = partiesStore.getPartie(id)
  if (current && Array.isArray(current.inventaire) && current.inventaire.length) {
    const cloned = cloneInventaireItems(current.inventaire)
    syncInventaireState(cloned)
  } else {
    // Tenter de reconstruire via data/personnage
    await ensureDataForCurrent()
    const dataItems = inventaireFromData.value
    if (current && dataItems.length) {
      partiesStore.updatePartie(id, { inventaire: dataItems, inventaireInitialise: true })
      syncInventaireState(cloneInventaireItems(dataItems))
    }
  }
  if (showDebugPanel.value) {
    refreshDebugSnapshots()
  }
})

watch(
  () => partiesStore.currentPartyId,
  (id) => {
    if (!process.client) return
    if (id) {
      partiesStore.chargerPartie(id)
      try { dataStore.load(id) } catch {}
      const current = partiesStore.getPartie(id)
      if (current && !hasPendingInventoryChanges.value) {
        const cloned = cloneInventaireItems(current.inventaire)
        syncInventaireState(cloned)
        // Correction : restaurer la fiche personnage depuis le localStorage si prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©sente
        const key = `JDR_PERSO_${id}`
        const sauvegarde = localStorage.getItem(key) ?? localStorage.getItem('JDR_PERSO')
        if (sauvegarde) {
          storePersonnage.chargerDepuisLocal(id)
          try {
            const dataStore = useDataStore()
            if (!storePersonnage.perso.ui_template) {
              const wanted = String(storePersonnage.perso.classeId ?? storePersonnage.perso.classe ?? '').trim().toLowerCase()
              if (wanted) {
                const all = Object.values(dataStore.maps.classes || {})
                const found = all.find((c: any) => {
                  if (!c || typeof c !== 'object') return false
                  const cid = String(c.id ?? '').toLowerCase()
                  const name = String(c.name ?? c.nom ?? c.label ?? c.slug ?? '').toLowerCase()
                  return cid === wanted || name === wanted
                })
                if (found && typeof found.ui_template === 'string' && found.ui_template.trim().length) {
                  storePersonnage.perso.ui_template = found.ui_template.trim()
                }
              }
            }
            const tpl = storePersonnage.perso.ui_template
            if (tpl) {
              const keyMatch = Object.keys(classeTemplates).find(k => k.endsWith(`/${tpl}`))
              if (keyMatch) { (classeTemplates as any)[keyMatch]() }
            }
          } catch {}
          etatSauvegarde.value = 'chargee'
        } else {
          etatSauvegarde.value = 'aucune'
        }
      }
    }
    activeSection.value = 'narration'
    if (showDebugPanel.value) {
      refreshDebugSnapshots()
    }
  },
  { immediate: true }
)

const classeTemplates = import.meta.glob('@/components/uiTemplates/classes/*.vue')

const classeUiComponent = computed(() => {
  const template = storePersonnage.perso.ui_template
  if (!template) return null
  // Cherche le template dans le glob
  const key = Object.keys(classeTemplates).find(k => k.endsWith(`/${template}`))
  if (!key) return null
  return defineAsyncComponent(classeTemplates[key])
})

// PrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©-chargement du template de classe dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s que la fiche est chargÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e
watch(
  () => storePersonnage.perso?.ui_template,
  (tpl) => {
    try {
      if (!tpl) return
      const key = Object.keys(classeTemplates).find(k => k.endsWith(`/${tpl}`))
      if (key) {
        // lance l'import pour prÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©charger le chunk
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        ;(classeTemplates as any)[key]()
      }
    } catch {}
  },
  { immediate: true }
)

const panelConfig = computed(() => {
  if (!partie.value) return null
  const data = partie.value
  if (activeSection.value === 'narration') {
    return {
      component: AventureChat,
      props: { messages: messages.value },
      on: { send: handleSendMessage }
    }
  }
  if (activeSection.value === 'classe') {
    return {
      component: classeUiComponent.value || AventureClasse,
      props: {
        classeLabel: classeDisplayLabel.value || 'Classe ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©finir',
        modules: (classeModulesFromData.value.length ? classeModulesFromData.value : data.modulesClasse)
      },
      on: {
        add: handleAddModule
      }
    }
  }
  switch (activeSection.value) {
    case 'inventaire':
      return {
        component: AventureInventaire,
        props: {
          items: inventaireDraft.value,
          pendingChanges: hasPendingInventoryChanges.value,
          disabled: !partie.value,
          readonly: false
        },
        on: {
          equip: handleDraftEquip,
          drop: handleDraftDrop,
          inspect: handleDraftInspect,
          validate: handleValidateInventory,
          reset: handleResetInventory
        }
      }
    case 'quetes':
      return {
        component: AventureQuetes,
        props: {
          quetes: data.quetes
        },
        on: {
          toggle: handleToggleQuete,
          focus: handleFocusQuete
        }
      }
    case 'journal':
      return {
        component: AventureJournal,
        props: {
          entries: data.journalEntries
        },
        on: {
          add: handleAddJournalEntry,
          export: handleExportJournal
        }
      }
    case 'aides':
      return {
        component: AventureAides,
        props: {
          items: data.aides
        },
        on: {
          add: handleAddAide,
          remove: handleRemoveAide
        }
      }
    case 'compagnons':
      return {
        component: AventureCompagnons,
        props: {
          compagnons: data.compagnons
        },
        on: {
          add: handleAddCompagnon,
          remove: handleRemoveCompagnon
        }
      }
    case 'fiche':
      return {
        component: AventureFichePersonnage,
        props: {},
        on: {}
      }
    default:
      return null
  }
})

const handleSendMessage = ({ content, admin }: { content: string; admin?: boolean }) => {
  if (!partie.value) return
  const partieId = partie.value.id
  // Si le mode admin est actif et qu'il s'agit d'une commande reconnue,
  // on intercepte et exÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cute sans crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©er de message "player".
  if (admin && isCommandInput(content)) {
    const result = processCommand(content, {
      partieId,
      stores: {
        personnage: storePersonnage
      }
    })
    if (result) {
      pushSystemMessage(result.message)
      return
    }
  }
  const playerMessage: AventureMessage = {
    id: createId(),
    author: 'player',
    content,
    timestamp: isoNow()
  }
  partiesStore.updatePartie(partieId, {
    messages: [...partie.value.messages, playerMessage]
  })
  setTimeout(() => {
    const refreshed = partiesStore.getPartie(partieId)
    if (!refreshed) return
    const aiMessage: AventureMessage = {
      id: createId(),
      author: 'ai',
      content: "L'IA traitera bientot vos actions. Decrivez les consequences que vous esperez.",
      timestamp: isoNow()
    }
    partiesStore.updatePartie(partieId, {
      messages: [...refreshed.messages, aiMessage]
    })
  }, 400)
}

const handleDraftEquip = ({ item, equip }: { item: InventaireItem; equip: boolean }) => {
  inventaireDraft.value = inventaireDraft.value.map((entry) =>
    entry.id === item.id ? { ...entry, equipped: equip } : entry
  )
}

const handleDraftDrop = ({ item }: { item: InventaireItem }) => {
  inventaireDraft.value = inventaireDraft.value.filter((entry) => entry.id !== item.id)
}

const handleDraftInspect = ({ item }: { item: InventaireItem }) => {
  const summary = `Inspection: ${item.name}. ${item.description ?? ''}`.trim()
  pushSystemMessage(summary)
}

const handleValidateInventory = () => {
  if (!partie.value) return
  if (!hasPendingInventoryChanges.value) return
  const updated = cloneInventaireItems(inventaireDraft.value)
  partiesStore.updatePartie(partie.value.id, {
    inventaire: updated,
    inventaireInitialise: true
  })
  syncInventaireState(updated)
  storePersonnage.sauvegarderLocal(partie.value.id)
  pushSystemMessage('Inventaire mis a jour.')
  if (showDebugPanel.value) refreshDebugSnapshots()
}

const handleResetInventory = () => {
  inventaireDraft.value = cloneInventaireItems(inventaireOriginal.value)
}

const handleToggleQuete = ({ id }: { id: string }) => {
  if (!partie.value) return
  const updated = partie.value.quetes.map((quete) =>
    quete.id === id
      ? {
          ...quete,
          status: quete.status === 'completed' ? 'active' : 'completed'
        }
      : quete
  )
  partiesStore.updatePartie(partie.value.id, { quetes: updated })
}

const handleFocusQuete = ({ id }: { id: string }) => {
  if (!partie.value) return
  const quete = partie.value.quetes.find((entry) => entry.id === id)
  if (!quete) return
  pushSystemMessage(`Focalisation sur la quete: ${quete.title}`)
  activeSection.value = 'journal'
}

const handleAddJournalEntry = ({ title, content }: { title: string; content: string }) => {
  if (!partie.value) return
  const entry: JournalEntry = {
    id: createId(),
    title,
    content,
    timestamp: isoNow()
  }
  partiesStore.updatePartie(partie.value.id, {
    journalEntries: [entry, ...partie.value.journalEntries]
  })
}

const handleExportJournal = () => {
  pushSystemMessage('Export du journal a venir: integration prevue pour plus tard.')
}

const handleAddAide = () => {
  if (!partie.value) return
  const aide: AideMemoire = {
    id: createId(),
    title: 'Nouvelle aide',
    content: 'Ajoutez ici vos rappels importants.'
  }
  partiesStore.updatePartie(partie.value.id, {
    aides: [aide, ...partie.value.aides]
  })
}

const handleRemoveAide = ({ id }: { id: string }) => {
  if (!partie.value) return
  const updated = partie.value.aides.filter((item) => item.id !== id)
  partiesStore.updatePartie(partie.value.id, { aides: updated })
}

const handleAddModule = () => {
  if (!partie.value) return
  const module: ModuleClasse = {
    id: createId(),
    title: 'Nouveau module',
    description: 'Definissez ici une nouvelle capacite specifique a la classe.',
    usage: 'A parametrer'
  }
  partiesStore.updatePartie(partie.value.id, {
    modulesClasse: [...partie.value.modulesClasse, module]
  })
}

const handleAddCompagnon = () => {
  if (!partie.value) return
  const compagnon: Compagnon = {
    id: createId(),
    name: 'Compagnon mystere',
    role: 'A definir',
    notes: 'Ajoutez ici les capacites et traits du compagnon.'
  }
  partiesStore.updatePartie(partie.value.id, {
    compagnons: [...partie.value.compagnons, compagnon]
  })
}

const handleRemoveCompagnon = ({ id }: { id: string }) => {
  if (!partie.value) return
  const updated = partie.value.compagnons.filter((comp) => comp.id !== id)
  partiesStore.updatePartie(partie.value.id, { compagnons: updated })
}

const pushSystemMessage = (content: string) => {
  if (!partie.value) return
  const message: AventureMessage = {
    id: createId(),
    author: 'system',
    content,
    timestamp: isoNow()
  }
  partiesStore.updatePartie(partie.value.id, {
    messages: [...partie.value.messages, message]
  })
}
</script>

<style scoped>
.aventure-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.aventure-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.aventure-page__header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--texte);
}

.aventure-page__header p {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--texte-2);
}

.aventure-page__badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 208, 122, 0.18);
  color: #ffd07a;
  font-size: 12px;
  font-weight: 600;
}

.aventure-page__badge--loaded {
  background: rgba(92, 227, 171, 0.18);
  color: #5ce3ab;
}

.aventure-page__header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.aventure-page__debug-button,
.aventure-page__debug-refresh {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 30, 0.7);
  color: var(--texte);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.aventure-page__debug-button:hover,
.aventure-page__debug-refresh:hover {
  background: rgba(20, 26, 48, 0.85);
  border-color: rgba(255, 255, 255, 0.24);
}

.aventure-page__debug {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(8, 12, 30, 0.65);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.aventure-page__debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.aventure-page__debug-header h2 {
  margin: 0;
  font-size: 16px;
  color: var(--texte);
}

.aventure-page__debug-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 900px) {
  .aventure-page__debug-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.aventure-page__debug-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: rgba(10, 14, 32, 0.75);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aventure-page__debug-card h3 {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
}

.aventure-page__debug-card details {
  font-size: 12px;
  color: var(--texte-2);
}

.aventure-page__debug-card pre {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.4;
  background: rgba(4, 6, 16, 0.85);
  border-radius: 8px;
  padding: 12px;
  color: #93a1ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.aventure-page__debug-summary {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--texte);
}

.aventure-page__debug-summary li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 6px 10px;
}

.aventure-page__debug-summary strong {
  font-weight: 600;
  color: var(--texte);
}

.aventure-page__state,
.aventure-page__notice {
  margin: 0;
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--texte-2);
}

.aventure-page__notice {
  background: rgba(255, 208, 122, 0.12);
  color: #ffd07a;
  border-color: rgba(255, 208, 122, 0.24);
}
</style>
