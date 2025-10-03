<template>
  <section class="aventure-page">
    <header class="aventure-page__header">
      <div>
        <h1>Table d'aventure</h1>
        <p>Gerez votre expedition, consultez vos ressources et discutez avec le narrateur IA.</p>
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
import AventureQuetes, { type Quete } from '@/components/aventure/AventureQuetes.vue'
import AventureJournal, { type JournalEntry } from '@/components/aventure/AventureJournal.vue'
import AventureAides, { type AideMemoire } from '@/components/aventure/AventureAides.vue'
import AventureCompagnons, { type Compagnon } from '@/components/aventure/AventureCompagnons.vue'

type EtatSauvegarde = 'chargement' | 'chargee' | 'aucune'

type SectionId =
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

if (process.client) {
  partiesStore.initialiser()
}

const etatSauvegarde = ref<EtatSauvegarde>('chargement')
const activeSection = ref<SectionId>('fiche')

const partie = computed<PartieData | null>(() => partiesStore.currentPartie)
const messages = computed<AventureMessage[]>(() => partie.value?.messages ?? [])

const sections: Array<{ id: SectionId; label: string; hint?: string }> = [
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
  const sauvegarde = localStorage.getItem('JDR_PERSO')
  if (sauvegarde) {
    storePersonnage.chargerDepuisLocal()
    etatSauvegarde.value = 'chargee'
  } else {
    etatSauvegarde.value = 'aucune'
  }
})

watch(
  () => partiesStore.currentPartyId,
  (id) => {
    if (!process.client) return
    if (id) {
      partiesStore.chargerPartie(id)
    }
    activeSection.value = 'fiche'
  },
  { immediate: true }
)

const panelConfig = computed(() => {
  if (!partie.value) return null
  const data = partie.value
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
          items: data.inventaire
        },
        on: {
          equip: handleEquipItem,
          drop: handleDropItem,
          inspect: handleInspectItem
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
    default:
      return {
        component: AventureFichePersonnage,
        props: {},
        on: {}
      }
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

const handleEquipItem = ({ itemId, equip }: { itemId: string; equip: boolean }) => {
  if (!partie.value) return
  const updated = partie.value.inventaire.map((item) =>
    item.id === itemId ? { ...item, equipped: equip } : item
  )
  partiesStore.updatePartie(partie.value.id, { inventaire: updated })
  pushSystemMessage(equip ? 'Objet equipe.' : 'Objet range dans le sac.')
}

const handleDropItem = ({ itemId }: { itemId: string }) => {
  if (!partie.value) return
  const updated = partie.value.inventaire.filter((item) => item.id !== itemId)
  partiesStore.updatePartie(partie.value.id, { inventaire: updated })
  pushSystemMessage('Objet retire de votre inventaire.')
}

const handleInspectItem = ({ itemId }: { itemId: string }) => {
  if (!partie.value) return
  const item = partie.value.inventaire.find((entry) => entry.id === itemId)
  if (!item) return
  pushSystemMessage(`Inspection: ${item.title}. ${item.description ?? ''}`.trim())
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
