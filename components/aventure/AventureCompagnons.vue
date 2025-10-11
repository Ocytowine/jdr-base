<template>
  <div class="aventure-compagnons">
    <header class="aventure-compagnons__header">
      <div>
        <h2>Compagnons</h2>
        <p>Gerez vos allies, familiers ou mercenaires.</p>
      </div>
      <button type="button" class="aventure-compagnons__add" @click="emit('add')">Ajouter</button>
    </header>
    <section v-if="compagnons.length" class="aventure-compagnons__list">
      <article v-for="compagnon in compagnons" :key="compagnon.id" class="aventure-compagnons__card">
        <header>
          <div>
            <h3>{{ compagnon.name }}</h3>
            <p class="aventure-compagnons__role">{{ compagnon.role }}</p>
          </div>
          <button type="button" @click="emit('remove', { id: compagnon.id })">Retirer</button>
        </header>
        <p class="aventure-compagnons__notes">{{ compagnon.notes }}</p>
      </article>
    </section>
    <p v-else class="aventure-compagnons__empty">Ajoutez vos compagnons pour acceder rapidement a leurs capacites.</p>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

export type Compagnon = {
  id: string
  name: string
  role: string
  notes: string
}

const props = defineProps<{ compagnons: Compagnon[] }>()

const emit = defineEmits<{
  (event: 'add'): void
  (event: 'remove', payload: { id: string }): void
}>()

const { compagnons } = toRefs(props)
</script>

<style scoped>
.aventure-compagnons {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
}

.aventure-compagnons__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.aventure-compagnons__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-compagnons__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-compagnons__add {
  background: transparent;
  border: 1px solid var(--accent-border-soft);
  border-radius: 999px;
  padding: 6px 14px;
  color: var(--accent-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.aventure-compagnons__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aventure-compagnons__card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aventure-compagnons__card header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.aventure-compagnons__card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-compagnons__role {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--texte-2);
}

.aventure-compagnons__card button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 6px 10px;
  color: var(--texte-2);
  font-size: 12px;
  cursor: pointer;
}

.aventure-compagnons__notes {
  margin: 0;
  color: var(--texte-2);
  line-height: 1.5;
  white-space: pre-wrap;
}

.aventure-compagnons__empty {
  margin: 0;
  color: var(--texte-2);
  font-size: 14px;
}
</style>
