<template>
  <section class="aventure-page">
    <header class="aventure-page__header">
      <div>
        <h1>Table d'aventure</h1>
        <p>Gerez votre expedition, consultez vos ressources et discutez avec le narrateur IA.</p>
      </div>
      <span v-if="etatSauvegarde === 'aucune'" class="aventure-page__badge">Nouvelle partie</span>
      <span v-else-if="etatSauvegarde === 'chargee'" class="aventure-page__badge aventure-page__badge--loaded">Sauvegarde chargee</span>
    </header>

    <p v-if="etatSauvegarde === 'chargement'" class="aventure-page__state">Chargement de votre fiche...</p>

    <AventureLayout v-else>
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
        :is="currentPanel.component"
        v-bind="currentPanel.props"
        v-on="currentPanel.on"
      />
    </AventureLayout>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePersonnage } from '@/stores/personnage'
import AventureLayout from '@/components/aventure/AventureLayout.vue'
import AventureSidebar from '@/components/aventure/AventureSidebar.vue'
import AventureChat, { type AventureMessage } from '@/components/aventure/AventureChat.vue'
import AventureFichePersonnage from '@/components/aventure/AventureFichePersonnage.vue'
import AventureClasse, { type ModuleClasse } from '@/components/aventure/AventureClasse.vue'
import AventureInventaire, { type InventaireItem } from '@/components/aventure/AventureInventaire.vue'
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

const store = usePersonnage()
const etatSauvegarde = ref<EtatSauvegarde>('chargement')

onMounted(() => {
  if (!process.client) return
  const sauvegarde = localStorage.getItem('JDR_PERSO')
  if (sauvegarde) {
    store.chargerDepuisLocal()
    etatSauvegarde.value = 'chargee'
  } else {
    etatSauvegarde.value = 'aucune'
  }
})

const sections: Array<{ id: SectionId; label: string; hint?: string }> = [
  { id: 'fiche', label: 'Fiche personnage', hint: 'Profil complet' },
  { id: 'classe', label: 'Classe & pouvoirs', hint: 'Configuration dynamique a venir' },
  { id: 'inventaire', label: 'Inventaire', hint: 'Equipement et tresors' },
  { id: 'quetes', label: 'Quetes', hint: 'Objectifs actifs' },
  { id: 'journal', label: 'Journal', hint: 'Notes de session' },
  { id: 'aides', label: 'Aides de jeu', hint: 'Rappels et regles' },
  { id: 'compagnons', label: 'Compagnons', hint: 'Allies et familiers' },
]

const activeSection = ref<SectionId>('fiche')

const messages = ref<AventureMessage[]>([
  {
    id: createId(),
    author: 'ai',
    content: 'Bienvenue aventurier. Quelle est votre prochaine action ?',
    timestamp: new Date(),
  },
])

const inventaireItems = ref<InventaireItem[]>([
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
    tags: ['tranchant', 'acier'],
  },
  {
    id: 'item-potion',
    title: 'Potion de soin mineure',
    description: 'Un flacon d\'elixir rouge scintillant. Rend 2d4 + 2 PV.',
    typeLabel: 'Potion',
    quantity: 3,
    weightTotal: 0.9,
    valueLabel: '50 po',
    equipped: false,
    rarity: 'inhabituel',
    tags: ['consommable'],
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
    tags: ['connaissance'],
  },
])

const quetes = ref<Quete[]>([
  {
    id: 'quete-principale',
    title: 'Retablir la balise astrale',
    summary: 'Explorer les ruines du temple et rallumer la balise afin de proteger la ville.',
    status: 'active',
  },
  {
    id: 'quete-annexe',
    title: 'Trouver l\'herbe d\'etoile',
    summary: 'Collecter trois tiges pour soigner le capitaine blessé.',
    status: 'completed',
  },
])

const journalEntries = ref<JournalEntry[]>([
  {
    id: createId(),
    title: 'Briefing initial',
    content: 'Le Maire nous a charges de proteger la ville contre les incursions gobelines.',
    timestamp: new Date(),
  },
])

const aides = ref<AideMemoire[]>([
  {
    id: createId(),
    title: 'Reactions disponibles',
    content: 'Parade (bouclier) | Riposte (superiorite) | Absorption des elements (sort).',
  },
  {
    id: createId(),
    title: 'Effets de statut',
    content: 'Avant : Avantage aux jets de Dex. Hex: +1d6 degats nécrotique sur la cible.',
  },
])

const modulesClasse = ref<ModuleClasse[]>([
  {
    id: 'module-1',
    title: 'Manoeuvre: Fente retentissante',
    description: 'Depense 1 point de superiorite pour ajouter 1d8 de degats et imposer un test de Con.',
    usage: '3 points / repos court',
    cooldown: 'Repos court',
  },
  {
    id: 'module-2',
    title: 'Posture de sentinelle',
    description: 'Tant que vous restez immobile, reduisez de 2 les degats de chaque attaque subie.',
    usage: 'Etat actif',
  },
])

const compagnons = ref<Compagnon[]>([
  {
    id: 'compagnon-1',
    name: 'Lysa Briselame',
    role: 'Rodeuse eclaireuse',
    notes: 'Avantage aux tests de perception dans les forets. Arc long +5 (1d8+3).',
  },
])

const currentPanel = computed(() => {
  switch (activeSection.value) {
    case 'classe':
      return {
        component: AventureClasse,
        props: {
          classeLabel: store.perso.classe || 'Classe a definir',
          modules: modulesClasse.value,
        },
        on: {
          add: handleAddModule,
        },
      }
    case 'inventaire':
      return {
        component: AventureInventaire,
        props: {
          items: inventaireItems.value,
        },
        on: {
          equip: handleEquipItem,
          drop: handleDropItem,
          inspect: handleInspectItem,
        },
      }
    case 'quetes':
      return {
        component: AventureQuetes,
        props: {
          quetes: quetes.value,
        },
        on: {
          toggle: handleToggleQuete,
          focus: handleFocusQuete,
        },
      }
    case 'journal':
      return {
        component: AventureJournal,
        props: {
          entries: journalEntries.value,
        },
        on: {
          add: handleAddJournalEntry,
          export: handleExportJournal,
        },
      }
    case 'aides':
      return {
        component: AventureAides,
        props: {
          items: aides.value,
        },
        on: {
          add: handleAddAide,
          remove: handleRemoveAide,
        },
      }
    case 'compagnons':
      return {
        component: AventureCompagnons,
        props: {
          compagnons: compagnons.value,
        },
        on: {
          add: handleAddCompagnon,
          remove: handleRemoveCompagnon,
        },
      }
    default:
      return {
        component: AventureFichePersonnage,
        props: {},
        on: {},
      }
  }
})

const handleSendMessage = ({ content }: { content: string }) => {
  messages.value = [
    ...messages.value,
    {
      id: createId(),
      author: 'player',
      content,
      timestamp: new Date(),
    },
  ]
  // Placeholder IA feedback.
  setTimeout(() => {
    messages.value = [
      ...messages.value,
      {
        id: createId(),
        author: 'ai',
        content: "L'IA traitera bientot vos actions. Decrivez les consequences que vous esperez.",
        timestamp: new Date(),
      },
    ]
  }, 400)
}

const handleEquipItem = ({ itemId, equip }: { itemId: string; equip: boolean }) => {
  inventaireItems.value = inventaireItems.value.map((item) =>
    item.id === itemId ? { ...item, equipped: equip } : item
  )
  pushSystemMessage(equip ? 'Objet equipe.' : 'Objet range dans le sac.')
}

const handleDropItem = ({ itemId }: { itemId: string }) => {
  inventaireItems.value = inventaireItems.value.filter((item) => item.id !== itemId)
  pushSystemMessage('Objet retire de votre inventaire.')
}

const handleInspectItem = ({ itemId }: { itemId: string }) => {
  const item = inventaireItems.value.find((entry) => entry.id === itemId)
  if (!item) return
  pushSystemMessage(`Inspection: ${item.title}. ${item.description || ''}`)
}

const handleToggleQuete = ({ id }: { id: string }) => {
  quetes.value = quetes.value.map((quete) =>
    quete.id === id
      ? {
          ...quete,
          status: quete.status === 'completed' ? 'active' : 'completed',
        }
      : quete
  )
}

const handleFocusQuete = ({ id }: { id: string }) => {
  const quete = quetes.value.find((q) => q.id === id)
  if (!quete) return
  pushSystemMessage(`Focalisation sur la quete: ${quete.title}`)
  activeSection.value = 'journal'
}

const handleAddJournalEntry = ({ title, content }: { title: string; content: string }) => {
  journalEntries.value = [
    {
      id: createId(),
      title,
      content,
      timestamp: new Date(),
    },
    ...journalEntries.value,
  ]
}

const handleExportJournal = () => {
  pushSystemMessage('Export du journal a venir: integration prevue pour plus tard.')
}

const handleAddAide = () => {
  aides.value = [
    {
      id: createId(),
      title: 'Nouvelle aide',
      content: 'Ajoutez ici vos rappels importants.',
    },
    ...aides.value,
  ]
}

const handleRemoveAide = ({ id }: { id: string }) => {
  aides.value = aides.value.filter((aide) => aide.id !== id)
}

const handleAddModule = () => {
  modulesClasse.value = [
    ...modulesClasse.value,
    {
      id: createId(),
      title: 'Nouveau module',
      description: 'Definissez ici une nouvelle capacite specifique a la classe.',
      usage: 'A parametrer',
    },
  ]
}

const handleAddCompagnon = () => {
  compagnons.value = [
    ...compagnons.value,
    {
      id: createId(),
      name: 'Compagnon mystere',
      role: 'A definir',
      notes: 'Ajoutez ici les capacites et traits du compagnon.',
    },
  ]
}

const handleRemoveCompagnon = ({ id }: { id: string }) => {
  compagnons.value = compagnons.value.filter((compagnon) => compagnon.id !== id)
}

const pushSystemMessage = (content: string) => {
  messages.value = [
    ...messages.value,
    {
      id: createId(),
      author: 'system',
      content,
      timestamp: new Date(),
    },
  ]
}

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
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

.aventure-page__state {
  margin: 0;
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--texte-2);
}
</style>

