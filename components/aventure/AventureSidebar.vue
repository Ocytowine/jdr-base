<template>
  <nav class="aventure-sidebar">
    <header class="aventure-sidebar__header">
      <h2>Navigation</h2>
      <p>Acces rapide a toutes les sections de votre aventure.</p>
    </header>
    <ul class="aventure-sidebar__list">
      <li v-for="section in sections" :key="section.id">
        <button
          type="button"
          class="aventure-sidebar__button"
          :class="{ 'aventure-sidebar__button--active': section.id === activeSection }"
          @click="handleSelect(section.id)"
        >
          <span class="aventure-sidebar__button-label">{{ section.label }}</span>
          <small v-if="section.hint" class="aventure-sidebar__button-hint">{{ section.hint }}</small>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'

const props = defineProps<{
  sections: Array<{ id: string; label: string; hint?: string }>
  activeSection: string
}>()

const emit = defineEmits<{ (event: 'select', id: string): void }>()

const { sections, activeSection } = toRefs(props)

const handleSelect = (id: string) => {
  if (id === activeSection.value) return
  emit('select', id)
}
</script>

<style scoped>
.aventure-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aventure-sidebar__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-sidebar__header p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--texte-2);
  line-height: 1.4;
}

.aventure-sidebar__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
}

.aventure-sidebar__button {
  width: 100%;
  text-align: left;
  background: rgba(22, 28, 56, 0.7);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--texte-2);
  font-size: 14px;
  font-weight: 500;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.aventure-sidebar__button:hover {
  border-color: var(--accent-border-soft);
  color: var(--texte);
}

.aventure-sidebar__button--active {
  background: var(--accent-soft);
  border-color: var(--accent-border-soft);
  color: var(--accent-2);
}

.aventure-sidebar__button-label {
  display: block;
}

.aventure-sidebar__button-hint {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--texte-3, rgba(255, 255, 255, 0.6));
}

@media (max-width: 960px) {
  .aventure-sidebar__list {
    flex-direction: row;
  }

  .aventure-sidebar__button {
    min-width: 140px;
    text-align: center;
  }
}
</style>
