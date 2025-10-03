<template>
  <div class="aventure-quetes">
    <header class="aventure-quetes__header">
      <div>
        <h2>Quetes</h2>
        <p>Suivez vos objectifs principaux et secondaires.</p>
      </div>
      <select v-model="filtre" class="aventure-quetes__filter">
        <option value="toutes">Toutes</option>
        <option value="actives">Actives</option>
        <option value="terminees">Terminees</option>
      </select>
    </header>
    <section v-if="displayedQuetes.length" class="aventure-quetes__list">
      <article
        v-for="quete in displayedQuetes"
        :key="quete.id"
        class="aventure-quetes__item"
        :class="`aventure-quetes__item--${quete.status}`"
      >
        <header>
          <h3>{{ quete.title }}</h3>
          <span class="aventure-quetes__status">{{ libelleStatut(quete.status) }}</span>
        </header>
        <p class="aventure-quetes__summary">{{ quete.summary }}</p>
        <footer>
          <button type="button" @click="emit('focus', { id: quete.id })">Afficher dans le journal</button>
          <button type="button" @click="emit('toggle', { id: quete.id })">
            {{ quete.status === 'completed' ? 'Re-ouvrir' : 'Terminer' }}
          </button>
        </footer>
      </article>
    </section>
    <p v-else class="aventure-quetes__empty">Aucune quete a afficher pour ce filtre.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export type Quete = {
  id: string
  title: string
  summary: string
  status: 'active' | 'completed' | 'archived'
}

const props = defineProps<{ quetes: Quete[] }>()

const emit = defineEmits<{
  (event: 'focus', payload: { id: string }): void
  (event: 'toggle', payload: { id: string }): void
}>()

const filtre = ref<'toutes' | 'actives' | 'terminees'>('toutes')

const displayedQuetes = computed(() => {
  if (filtre.value === 'actives') return props.quetes.filter((q) => q.status === 'active')
  if (filtre.value === 'terminees') return props.quetes.filter((q) => q.status === 'completed')
  return props.quetes
})

const libelleStatut = (statut: Quete['status']): string => {
  switch (statut) {
    case 'active':
      return 'En cours'
    case 'completed':
      return 'Terminee'
    default:
      return 'Archivee'
  }
}
</script>

<style scoped>
.aventure-quetes {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.aventure-quetes__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.aventure-quetes__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-quetes__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-quetes__filter {
  background: rgba(8, 12, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--texte);
  font-size: 13px;
}

.aventure-quetes__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aventure-quetes__item {
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aventure-quetes__item header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.aventure-quetes__item h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-quetes__status {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--texte-2);
}

.aventure-quetes__summary {
  margin: 0;
  color: var(--texte-2);
  line-height: 1.5;
}

.aventure-quetes__item footer {
  display: flex;
  gap: 8px;
}

.aventure-quetes__item button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--texte-2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.aventure-quetes__item button:hover {
  border-color: var(--accent-border-soft);
  color: var(--texte);
}

.aventure-quetes__item--completed {
  border-color: rgba(92, 227, 171, 0.4);
}

.aventure-quetes__item--archived {
  border-color: rgba(255, 208, 122, 0.3);
  opacity: 0.8;
}

.aventure-quetes__empty {
  margin: 0;
  color: var(--texte-2);
  font-size: 14px;
}
</style>
