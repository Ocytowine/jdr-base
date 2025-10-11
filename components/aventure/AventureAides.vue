<template>
  <div class="aventure-aides">
    <header class="aventure-aides__header">
      <div>
        <h2>Aides</h2>
        <p>Gardez sous la main les regles et rappels importants.</p>
      </div>
      <button type="button" class="aventure-aides__add" @click="emit('add')">Nouvelle aide</button>
    </header>
    <section v-if="items.length" class="aventure-aides__list">
      <article v-for="item in items" :key="item.id" class="aventure-aides__item">
        <header>
          <h3>{{ item.title }}</h3>
          <button type="button" @click="emit('remove', { id: item.id })">Retirer</button>
        </header>
        <p>{{ item.content }}</p>
      </article>
    </section>
    <p v-else class="aventure-aides__empty">Ajoutez vos pense-betes pour vous souvenir des details.</p>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

export type AideMemoire = {
  id: string
  title: string
  content: string
}

const props = defineProps<{ items: AideMemoire[] }>()

const emit = defineEmits<{
  (event: 'add'): void
  (event: 'remove', payload: { id: string }): void
}>()

const { items } = toRefs(props)
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
