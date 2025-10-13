
<template>
  <div class="aventure-classe">
    <header class="aventure-classe__header">
      <div>
        <h2>{{ classeLabel }}</h2>
        <p>Rassemblez les capacites specifiques a votre classe.</p>
      </div>
      <button type="button" class="aventure-classe__add" @click="emit('add')">Ajouter</button>
    </header>
    <section v-if="modules.length" class="aventure-classe__grid">
      <article v-for="module in modules" :key="module.id" class="aventure-classe__card">
        <header>
          <h3>{{ module.title }}</h3>
          <span v-if="module.usage" class="aventure-classe__usage">{{ module.usage }}</span>
        </header>
        <p class="aventure-classe__description">{{ module.description }}</p>
        <footer v-if="module.cooldown" class="aventure-classe__cooldown">
          Recuperation: {{ module.cooldown }}
        </footer>
      </article>
    </section>
    <p v-else class="aventure-classe__empty">Vous pouvez configurer cette section selon la classe du personnage.</p>

    <!-- Ajout du template UI dynamique de classe -->
    <component :is="uiTemplateComponent" v-if="uiTemplateComponent" />
    <div v-else-if="isLoadingTemplate" class="text-gray-400 mt-4">Chargement du template de classe...</div>
  </div>
</template>

<script setup lang="ts">

import { toRefs, ref, onMounted, defineAsyncComponent } from 'vue'
import { usePersonnage } from '@/stores/personnage'
import { useNuxtApp } from '#app'

export type ModuleClasse = {
  id: string
  title: string
  description: string
  usage?: string
  cooldown?: string
}


const props = defineProps<{
  classeLabel: string
  modules: ModuleClasse[]
}>()

const emit = defineEmits<{
  (event: 'add'): void
}>()

const { classeLabel, modules } = toRefs(props)

// Chargement dynamique du template UI de classe
const uiTemplateComponent = ref<any>(null)
const isLoadingTemplate = ref(false)

const personnage = usePersonnage()
const nuxtApp = useNuxtApp()

onMounted(async () => {
  // Récupère le nom du template UI depuis la fiche du personnage
  const templateName = personnage.ui_template || null
  if (!templateName) return
  isLoadingTemplate.value = true
  try {
    // Utilise l'adaptateur pour récupérer le code du template depuis le repo GitHub
    // Ici, on suppose que l'adaptateur est accessible via nuxtApp.$dataAdapterV2GitHub
    const adapter = nuxtApp.$dataAdapterV2GitHub
    const templateCode = await adapter.fetchRawFile(`UiTemplates/classes/${templateName}`)
    // Compile le template en composant Vue dynamique
    uiTemplateComponent.value = defineAsyncComponent(() => Promise.resolve({ template: templateCode }))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Erreur chargement template UI classe', e)
    uiTemplateComponent.value = null
  } finally {
    isLoadingTemplate.value = false
  }
})
</script>

<style scoped>
.aventure-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  height: calc(100vh - 120px);
  padding: 16px 0 32px;
}

.aventure-layout__sidebar {
  background: rgba(12, 16, 38, 0.85);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 20px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.aventure-layout__main {
  display: grid;
  grid-template-columns: 2fr 1.1fr;
  gap: 24px;
  align-items: stretch;
}

.aventure-layout__chat,
.aventure-layout__panel {
  background: rgba(12, 16, 38, 0.9);
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aventure-layout__chat {
  min-height: 540px;
}

.aventure-layout__panel {
  min-height: 540px;
}

@media (max-width: 1280px) {
  .aventure-layout {
    grid-template-columns: 220px 1fr;
  }

  .aventure-layout__main {
    grid-template-columns: 1fr;
  }

  .aventure-layout__panel {
    margin-top: 16px;
  }
}

@media (max-width: 960px) {
  .aventure-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .aventure-layout__sidebar {
    flex-direction: row;
    overflow-x: auto;
    gap: 12px;
  }

  .aventure-layout__main {
    grid-template-columns: 1fr;
  }
}
</style>
