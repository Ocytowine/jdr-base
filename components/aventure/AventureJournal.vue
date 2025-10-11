<template>
  <div class="aventure-journal">
    <header class="aventure-journal__header">
      <div>
        <h2>Journal</h2>
        <p>Consignez les moments clefs de votre histoire.</p>
      </div>
      <button type="button" class="aventure-journal__export" @click="emit('export')">
        Exporter
      </button>
    </header>
    <section v-if="entries.length" class="aventure-journal__entries">
      <article v-for="entry in entries" :key="entry.id" class="aventure-journal__entry">
        <header class="aventure-journal__entry-header">
          <h3>{{ entry.title }}</h3>
          <time>{{ formatDate(entry.timestamp) }}</time>
        </header>
        <p class="aventure-journal__entry-content">{{ entry.content }}</p>
      </article>
    </section>
    <p v-else class="aventure-journal__empty">Aucune entree pour le moment. Ecrivez votre premiere note.</p>
    <form class="aventure-journal__composer" @submit.prevent="handleSubmit">
      <input v-model="title" type="text" placeholder="Titre de la note" />
      <textarea v-model="content" rows="4" placeholder="Que s\'est-il passe pendant l\'aventure?" />
      <div class="aventure-journal__composer-actions">
        <button type="submit" :disabled="content.trim().length === 0">Ajouter</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs } from 'vue'

export type JournalEntry = {
  id: string
  title: string
  content: string
  timestamp: string | number | Date
}

const props = defineProps<{ entries: JournalEntry[] }>()

const emit = defineEmits<{
  (event: 'add', payload: { title: string; content: string }): void
  (event: 'export'): void
}>()

const { entries } = toRefs(props)

const title = ref('')
const content = ref('')

const resetForm = () => {
  title.value = ''
  content.value = ''
}

const handleSubmit = () => {
  const body = content.value.trim()
  if (!body) return
  emit('add', { title: title.value.trim() || 'Note sans titre', content: body })
  resetForm()
}

const formatDate = (value: string | number | Date): string => {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<style scoped>
.aventure-journal {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
}

.aventure-journal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.aventure-journal__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-journal__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-journal__export {
  background: transparent;
  border: 1px solid var(--accent-border-soft);
  border-radius: 999px;
  padding: 6px 14px;
  color: var(--accent-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.aventure-journal__entries {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.aventure-journal__entry {
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.aventure-journal__entry-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.aventure-journal__entry-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-journal__entry-header time {
  font-size: 12px;
  color: var(--texte-2);
}

.aventure-journal__entry-content {
  margin: 10px 0 0;
  color: var(--texte-2);
  line-height: 1.5;
  white-space: pre-wrap;
}

.aventure-journal__empty {
  margin: 0;
  color: var(--texte-2);
  font-size: 14px;
}

.aventure-journal__composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(8, 12, 30, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.aventure-journal__composer input,
.aventure-journal__composer textarea {
  background: rgba(6, 10, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--texte);
  font-size: 13px;
}

.aventure-journal__composer textarea {
  resize: vertical;
}

.aventure-journal__composer-actions {
  display: flex;
  justify-content: flex-end;
}

.aventure-journal__composer button {
  background: var(--accent);
  color: #08122b;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.aventure-journal__composer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
