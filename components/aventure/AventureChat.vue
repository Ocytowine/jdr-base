<template>
  <div class="aventure-chat">
    <header class="aventure-chat__header">
      <div>
        <h2>Journal de bord</h2>
        <p>Discutez avec l\'IA pour faire avancer votre aventure.</p>
      </div>
      <button type="button" class="aventure-chat__pin" @click="$emit('togglePin')">
        Conserver
      </button>
    </header>
    <div ref="logEl" class="aventure-chat__log">
      <template v-if="messages.length">
        <article
          v-for="message in messages"
          :key="message.id"
          class="aventure-chat__message"
          :class="{
            'aventure-chat__message--player': message.author === 'player',
            'aventure-chat__message--ai': message.author === 'ai'
          }"
        >
          <header class="aventure-chat__message-meta">
            <span class="aventure-chat__message-author">{{ auteurLabel(message.author) }}</span>
            <time class="aventure-chat__message-time">{{ formatHorodatage(message.timestamp) }}</time>
          </header>
          <p class="aventure-chat__message-body">{{ message.content }}</p>
        </article>
      </template>
      <p v-else class="aventure-chat__empty">Commencez la discussion pour lancer votre aventure.</p>
    </div>
    <form class="aventure-chat__composer" @submit.prevent="handleSubmit">
      <textarea
        v-model="draft"
        class="aventure-chat__textarea"
        placeholder="Decrivez votre action, posez une question..."
        rows="3"
      />
      <div class="aventure-chat__composer-actions">
        <button type="submit" class="aventure-chat__send" :disabled="draft.trim().length === 0">
          Envoyer
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, toRefs, watch } from 'vue'

type Auteur = 'player' | 'ai' | 'system'

export type AventureMessage = {
  id: string
  author: Auteur
  content: string
  timestamp: string | number | Date
}

const props = defineProps<{ messages: AventureMessage[] }>()

const emit = defineEmits<{ (event: 'send', payload: { content: string }): void }>()

const { messages } = toRefs(props)

const draft = ref('')
const logEl = ref<HTMLDivElement | null>(null)

const auteurLabel = (auteur: Auteur): string => {
  switch (auteur) {
    case 'player':
      return 'Vous'
    case 'ai':
      return 'Narrateur'
    default:
      return 'Systeme'
  }
}

const formatHorodatage = (value: string | number | Date): string => {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  if (!logEl.value) return
  logEl.value.scrollTop = logEl.value.scrollHeight
}

watch(
  () => messages.value.length,
  () => nextTick(scrollToBottom)
)

onMounted(scrollToBottom)

const handleSubmit = () => {
  const content = draft.value.trim()
  if (!content) return
  emit('send', { content })
  draft.value = ''
}
</script>

<style scoped>
.aventure-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.aventure-chat__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.aventure-chat__header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-chat__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-chat__pin {
  background: transparent;
  border: 1px solid var(--accent-border-soft);
  border-radius: 999px;
  padding: 6px 14px;
  color: var(--accent-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.aventure-chat__log {
  flex: 1;
  overflow-y: auto;
  background: rgba(8, 12, 30, 0.7);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aventure-chat__message {
  max-width: 80%;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(22, 26, 52, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.aventure-chat__message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--texte-2);
}

.aventure-chat__message-body {
  margin: 0;
  font-size: 14px;
  color: var(--texte);
  line-height: 1.6;
  white-space: pre-wrap;
}

.aventure-chat__message--player {
  align-self: flex-end;
  background: var(--accent-soft);
  color: var(--accent-2);
}

.aventure-chat__message--player .aventure-chat__message-body {
  color: var(--accent-2);
}

.aventure-chat__message--ai {
  align-self: flex-start;
}

.aventure-chat__empty {
  margin: 0;
  font-size: 14px;
  text-align: center;
  color: var(--texte-2);
}

.aventure-chat__composer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aventure-chat__textarea {
  width: 100%;
  background: rgba(10, 14, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  color: var(--texte);
  resize: none;
}

.aventure-chat__textarea:focus {
  outline: none;
  border-color: var(--accent-border-soft);
}

.aventure-chat__composer-actions {
  display: flex;
  justify-content: flex-end;
}

.aventure-chat__send {
  background: var(--accent);
  color: #08122b;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(122, 162, 255, 0.25);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.aventure-chat__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.aventure-chat__send:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(122, 162, 255, 0.35);
}
</style>
