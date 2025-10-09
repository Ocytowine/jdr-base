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

      <AventureLayout>
        <template #sidebar>
          <AventureSidebar
            :sections="sections"
            :active-section="activeSection"
            @select="(sectionId) => (activeSection = sectionId)"
          />
        </template>

        <template #chat>
          <AventureChat :messages="messages" @send="handleSendMessage" />
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
import { computed, onMounted, ref, watch } from 'vue'
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
import { useBonomeCreationStore } from '@/stores/bonomeCreation'
import { buildCreationInventoryTransition } from '@/utils/inventaireTransition'

type EtatSauvegarde = 'chargement' | 'chargee' | 'aucune'

type SectionId =
  | 'narration'
  | 'fiche'
  | 'classe'
  | 'inventaire'
  | 'quetes'
  | 'journal'
  | 'aides'
  | 'compagnons'

const isoNow = () => new Date().toISOString()
const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const storePersonnage = usePersonnage()
const partiesStore = useParties()
const creation = useBonomeCreationStore()

if (process.client) {
  partiesStore.initialiser()
}

const etatSauvegarde = ref<EtatSauvegarde>('chargement')
const activeSection = ref<SectionId>('narration')
const showDebugPanel = ref(false)
const debugPartieCache = ref<any | null>(null)
const debugPartieStorage = ref<any | null>(null)
const debugPersonnageStorage = ref<any | null>(null)
const inventaireOriginal = ref<InventaireItem[]>([])
const inventaireDraft = ref<InventaireItem[]>([])
const isSyncingInventaire = ref(false)

const partie = computed<PartieData | null>(() => partiesStore.currentPartie)
const messages = computed<AventureMessage[]>(() => partie.value?.messages ?? [])

// Inventaire issu de la création (Option A, affichage non destructif)
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

const refreshDebugSnapshots = () => {
  if (!process.client) {
    debugPartieCache.value = null
    debugPartieStorage.value = null
    debugPersonnageStorage.value = null
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
}

const formatDebugValue = (value: unknown) => {
  if (value === null || value === undefined) return '—'
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

const syncInventaireState = (items: InventaireItem[]) => {
  const cloned = cloneInventaireItems(items)
  inventaireOriginal.value = cloned
  inventaireDraft.value = cloneInventaireItems(cloned)
  if (!isSyncingInventaire.value) {
    isSyncingInventaire.value = true
    storePersonnage.perso.inventaire = cloneInventaireItems(cloned)
    isSyncingInventaire.value = false
  }
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
        syncInventaireState(cloned)
      }
      return
    }
    if (!transition.items.length) {
      if (!hasPendingInventoryChanges.value) {
        const cloned = cloneInventaireItems(currentPartie.inventaire)
        syncInventaireState(cloned)
      }
      return
    }
    const initialItems = cloneInventaireItems(transition.items)
    partiesStore.updatePartie(currentPartie.id, {
      inventaire: initialItems,
      inventaireInitialise: true
    })
    syncInventaireState(initialItems)
  },
  { immediate: true }
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
    isSyncingInventaire.value = true
    syncInventaireState(cloned)
    isSyncingInventaire.value = false
  },
  { deep: true }
)

watch(
  () => storePersonnage.perso.inventaire,
  (inventaire) => {
    if (!partie.value) return
    if (!partie.value.inventaireInitialise) return
    if (hasPendingInventoryChanges.value || isSyncingInventaire.value) return
    const cloned = cloneInventaireItems(inventaire)
    if (areInventairesEqual(cloned, inventaireOriginal.value)) return
    isSyncingInventaire.value = true
    partiesStore.updatePartie(partie.value.id, {
      inventaire: cloned,
      inventaireInitialise: true
    })
    syncInventaireState(cloned)
    storePersonnage.sauvegarderLocal(partie.value.id)
    isSyncingInventaire.value = false
  },
  { deep: true }
)

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
  { id: 'inventaire', label: 'Inventaire', hint: 'Equipement et tresors' },
  { id: 'quetes', label: 'Quetes', hint: 'Objectifs actifs' },
  { id: 'journal', label: 'Journal', hint: 'Notes de session' },
  { id: 'aides', label: 'Aides de jeu', hint: 'Rappels et regles' },
  { id: 'compagnons', label: 'Compagnons', hint: 'Allies et familiers' }
]

onMounted(() => {
  if (!process.client) return
  partiesStore.initialiser()
  const id = partiesStore.currentPartyId
  if (!id) return
  partiesStore.chargerPartie(id)
  const current = partiesStore.getPartie(id)
  if (current) {
    const cloned = cloneInventaireItems(current.inventaire)
    syncInventaireState(cloned)
  }
  const key = `JDR_PERSO_${id}`
  const sauvegarde = localStorage.getItem(key) ?? localStorage.getItem('JDR_PERSO')
  if (sauvegarde) {
    storePersonnage.chargerDepuisLocal(id ?? undefined)
    etatSauvegarde.value = 'chargee'
  } else {
    etatSauvegarde.value = 'aucune'
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
      const current = partiesStore.getPartie(id)
      if (current && !hasPendingInventoryChanges.value) {
        const cloned = cloneInventaireItems(current.inventaire)
        syncInventaireState(cloned)
      }
      const key = `JDR_PERSO_${id}`
      const sauvegarde = localStorage.getItem(key) ?? localStorage.getItem('JDR_PERSO')
      if (sauvegarde) {
        storePersonnage.chargerDepuisLocal(id)
        etatSauvegarde.value = 'chargee'
      } else {
        etatSauvegarde.value = 'aucune'
      }
    }
    activeSection.value = 'narration'
    if (showDebugPanel.value) {
      refreshDebugSnapshots()
    }
  },
  { immediate: true }
)

const panelConfig = computed(() => {
  if (!partie.value) return null
  const data = partie.value
  if (activeSection.value === 'narration') {
    return null
  }
  switch (activeSection.value) {
    case 'classe':
      return {
        component: AventureClasse,
        props: {
          classeLabel: storePersonnage.perso.classe || 'Classe a definir',
          modules: data.modulesClasse
        },
        on: {
          add: handleAddModule
        }
      }
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

const handleSendMessage = ({ content }: { content: string }) => {
  if (!partie.value) return
  const partieId = partie.value.id
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
  const summary = `Inspection: ${item.title}. ${item.description ?? ''}`.trim()
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
