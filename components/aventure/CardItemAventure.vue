<template>
  <article :class="articleClass">
    <div class="item-card__media">
      <img :src="imageSrc" :alt="displayTitle" class="item-card__image" loading="lazy" />
    </div>
    <div class="item-card__content">
      <header class="item-card__header">
        <div class="item-card__heading">
          <h3 class="item-card__title">{{ displayTitle }}</h3>
          <button
            v-if="hasExtraStats"
            type="button"
            class="item-card__toggle"
            :class="{ 'item-card__toggle--open': detailsExpanded }"
            :aria-expanded="detailsExpanded"
            :aria-controls="detailsSectionId"
            @click="toggleDetails"
          >
            <span class="sr-only">{{ detailsExpanded ? 'Masquer les details' : 'Afficher les details' }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <p v-if="typeLabel" class="item-card__type">{{ typeLabel }}</p>
        <p v-if="description" class="item-card__description">{{ description }}</p>
        <ul v-if="badgesList.length" class="item-card__badges">
          <li v-for="badge in badgesList" :key="badge.label" class="item-card__badge">
            <span class="item-card__badge-label">{{ badge.label }}</span>
            <span class="item-card__badge-value">{{ badge.value }}</span>
          </li>
        </ul>
      </header>

      <section v-if="hasExtraStats" :id="detailsSectionId" class="item-card__details" v-show="detailsExpanded">
        <dl class="item-card__grid">
          <div v-for="stat in extraStatsList" :key="stat.label">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <div v-if="typeDetailsList.length" class="item-card__type-extra">
        <div v-for="detail in typeDetailsList" :key="detail.label" class="item-card__type-row">
          <span class="item-card__type-label">{{ detail.label }}</span>
          <span class="item-card__type-value">{{ detail.value }}</span>
        </div>
      </div>

      <footer v-if="hasActionSelect" class="item-card__footer">
        <label class="item-card__action-select">
          <span class="sr-only">Choisir une action</span>
          <select ref="actionSelect" v-model="selectedAction" @change="handleActionChange">
            <option value="" disabled>Actions...</option>
            <option v-for="action in actionsList" :key="action.key" :value="action.key">
              {{ action.label }}
            </option>
          </select>
        </label>
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CardItemAction, CardItemStat } from './useInventoryCardPresenter'

const DEFAULT_IMAGE = '/images/card.jpg'

const props = withDefaults(
  defineProps<{
    name?: string | null
    title: string
    description?: string | null
    image?: string | null
    imageId?: string | null
    typeLabel?: string | null
    badges?: CardItemStat[]
    extraStats?: CardItemStat[]
    typeDetails?: CardItemStat[]
    actions?: CardItemAction[]
    equipped?: boolean
  }>(),
  {
    description: null,
    image: null,
    imageId: null,
    typeLabel: null,
    badges: () => [],
    extraStats: () => [],
    typeDetails: () => [],
    actions: () => [],
    equipped: false
  }
)

const emit = defineEmits<{
  (event: 'equip', equip: boolean): void
  (event: 'inspect'): void
  (event: 'drop'): void
}>()

const detailsExpanded = ref(false)
const selectedAction = ref('')
const actionSelect = ref<HTMLSelectElement | null>(null)

const displayTitle = computed(() => (props.name && props.name.length ? props.name : props.title))

const imageSrc = computed(() => {
  const src = typeof props.image === 'string' ? props.image.trim() : ''
  if (src.length) return src
  const derived = typeof props.imageId === 'string' && props.imageId.length ? `/img/${props.imageId}.webp` : ''
  return derived.length ? derived : DEFAULT_IMAGE
})

const badgesList = computed(() =>
  (props.badges || []).filter((badge) => Boolean(badge?.label) && Boolean(badge?.value))
)

const extraStatsList = computed(() =>
  (props.extraStats || []).filter((stat) => Boolean(stat?.label) && Boolean(stat?.value))
)

const typeDetailsList = computed(() =>
  (props.typeDetails || []).filter((detail) => Boolean(detail?.label) && Boolean(detail?.value))
)

const actionsList = computed(() =>
  (props.actions || []).filter((action) => Boolean(action?.key) && Boolean(action?.label))
)

const actionByKey = computed(() => {
  const map: Record<string, CardItemAction> = {}
  actionsList.value.forEach((action) => {
    map[action.key] = action
  })
  return map
})

const hasExtraStats = computed(() => extraStatsList.value.length > 0)
const hasActionSelect = computed(() => actionsList.value.length > 0)

const baseId = computed(() => {
  const source = props.imageId || props.name || props.title
  return source
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
})

const detailsSectionId = computed(() => `item-card-details-${baseId.value || 'default'}`)

const articleClass = computed(() => ({
  'item-card': true,
  'item-card--equipped': props.equipped
}))

const toggleDetails = () => {
  if (!hasExtraStats.value) return
  detailsExpanded.value = !detailsExpanded.value
}

const handleActionChange = () => {
  const key = selectedAction.value
  if (!key) return

  const action = actionByKey.value[key]
  if (!action) {
    selectedAction.value = ''
    return
  }

  switch (action.kind) {
    case 'equip':
      emit('equip', true)
      break
    case 'unequip':
      emit('equip', false)
      break
    case 'inspect':
      emit('inspect')
      break
    case 'drop':
      emit('drop')
      break
  }

  selectedAction.value = ''
  actionSelect.value?.blur()
}
</script>

<style scoped>
.item-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(21, 25, 52, 0.95), rgba(10, 13, 30, 0.96));
  color: var(--texte);
  height: 100%;
  min-height: 360px;
  overflow: hidden;
}

.item-card--equipped {
  border-color: rgba(92, 227, 171, 0.6);
  box-shadow: 0 0 0 1px rgba(92, 227, 171, 0.2);
}

.item-card__media {
  position: relative;
  flex: 0 0 33%;
  min-height: 120px;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.item-card__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card__content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.item-card__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.item-card__toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 30, 0.6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--texte-2);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.item-card__toggle svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.item-card__toggle--open svg {
  transform: rotate(180deg);
}

.item-card__toggle:hover {
  border-color: var(--accent-border-soft);
  color: var(--texte);
  background: rgba(12, 16, 38, 0.8);
}

.item-card__type {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--texte-2);
}

.item-card__description {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
  line-height: 1.5;
}

.item-card__badges {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--texte-2);
}

.item-card__badge-value {
  font-weight: 600;
  color: var(--texte);
}

.item-card__details {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  padding: 12px 14px;
}

.item-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.item-card__grid div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-card__grid dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--texte-2);
}

.item-card__grid dd {
  margin: 0;
  font-size: 13px;
  color: var(--texte);
}

.item-card__type-extra {
  display: grid;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.item-card__type-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--texte);
}

.item-card__type-label {
  font-weight: 600;
  color: var(--texte-2);
}

.item-card__type-value {
  text-align: right;
}

.item-card__footer {
  margin-top: auto;
}

.item-card__action-select {
  display: block;
}

.item-card__action-select select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 30, 0.75);
  color: var(--texte);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.item-card__action-select select:hover {
  border-color: var(--accent-border-soft);
  background: rgba(12, 16, 38, 0.9);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
