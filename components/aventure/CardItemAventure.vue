<template>
  <article :class="articleClass">
    <header class="item-card__header">
      <div class="item-card__media">
        <img :src="imageSrc" :alt="title" class="item-card__image" loading="lazy" />
        <span class="item-card__rarity" :class="rarityClass">{{ rarityLabel }}</span>
      </div>
      <div class="item-card__summary">
        <h3 class="item-card__title">{{ title }}</h3>
        <p v-if="typeLabel" class="item-card__type">{{ typeLabel }}</p>
        <p v-if="description" class="item-card__description">{{ description }}</p>
      </div>
    </header>
    <dl class="item-card__grid">
      <div>
        <dt>Quantite</dt>
        <dd>{{ quantity }}</dd>
      </div>
      <div>
        <dt>Poids total</dt>
        <dd>{{ weightTotalLabel }}</dd>
      </div>
      <div>
        <dt>Valeur</dt>
        <dd>{{ valueLabel || 'N/A' }}</dd>
      </div>
      <div>
        <dt>Etat</dt>
        <dd>{{ equipped ? 'Equipe' : 'Sac' }}</dd>
      </div>
    </dl>
    <footer class="item-card__footer">
      <div class="item-card__tags" v-if="tags && tags.length">
        <span v-for="tag in tags" :key="tag" class="item-card__tag">{{ tag }}</span>
      </div>
      <div class="item-card__actions">
        <button type="button" class="item-card__action item-card__action--primary" @click="emit('equip', !equipped)">
          {{ equipped ? 'Retirer' : 'Equiper' }}
        </button>
        <button type="button" class="item-card__action" @click="emit('inspect')">Inspecter</button>
        <button type="button" class="item-card__action item-card__action--danger" @click="emit('drop')">Jeter</button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const DEFAULT_IMAGE = '/images/card.jpg'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string | null
    image?: string | null
    typeLabel?: string | null
    quantity?: number
    weightTotal?: number | null
    valueLabel?: string | null
    equipped?: boolean
    rarity?: 'commun' | 'inhabituel' | 'rare' | 'tres-rare' | 'legend'
    tags?: string[]
  }>(),
  {
    description: null,
    image: null,
    typeLabel: null,
    quantity: 1,
    weightTotal: 0,
    valueLabel: null,
    equipped: false,
    rarity: 'commun',
    tags: () => []
  }
)

const emit = defineEmits<{
  (event: 'equip', equip: boolean): void
  (event: 'inspect'): void
  (event: 'drop'): void
}>()

const imageSrc = computed(() => {
  const src = typeof props.image === 'string' ? props.image.trim() : ''
  return src.length ? src : DEFAULT_IMAGE
})

const weightTotalLabel = computed(() => {
  const numeric = Number.isFinite(props.weightTotal) ? Number(props.weightTotal) : 0
  if (!numeric) return '0 kg'
  if (Math.abs(numeric) >= 10) return `${numeric.toFixed(0)} kg`
  return `${numeric.toFixed(1)} kg`
})

const rarityLabel = computed(() => {
  switch (props.rarity) {
    case 'inhabituel':
      return 'Inhabituel'
    case 'rare':
      return 'Rare'
    case 'tres-rare':
      return 'Tres rare'
    case 'legend':
      return 'Legendaire'
    default:
      return 'Commun'
  }
})

const rarityClass = computed(() => `item-card__rarity--${props.rarity}`)

const articleClass = computed(() => ({
  'item-card': true,
  'item-card--equipped': props.equipped,
}))
</script>

<style scoped>
.item-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(21, 25, 52, 0.95), rgba(10, 13, 30, 0.96));
  color: var(--texte);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  height: 100%;
}

.item-card--equipped {
  border-color: var(--accent-border-soft);
  box-shadow: 0 16px 30px rgba(122, 162, 255, 0.2);
}

.item-card__header {
  display: flex;
  gap: 16px;
}

.item-card__media {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--carte-2);
  flex-shrink: 0;
}

.item-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card__rarity {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.item-card__rarity--commun {
  background: rgba(180, 190, 220, 0.18);
  color: var(--texte);
}

.item-card__rarity--inhabituel {
  background: rgba(92, 227, 171, 0.2);
  color: #5ce3ab;
}

.item-card__rarity--rare {
  background: rgba(122, 162, 255, 0.2);
  color: var(--accent-2);
}

.item-card__rarity--tres-rare {
  background: rgba(217, 140, 255, 0.2);
  color: #d98cff;
}

.item-card__rarity--legend {
  background: rgba(255, 208, 122, 0.2);
  color: #ffd07a;
}

.item-card__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
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

.item-card__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.item-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--texte-2);
  font-size: 11px;
  letter-spacing: 0.4px;
}

.item-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.item-card__action {
  flex: 1;
  min-width: 110px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--texte-2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.item-card__action:hover {
  transform: translateY(-1px);
  border-color: var(--accent-border-soft);
  color: var(--texte);
}

.item-card__action--primary {
  background: var(--accent);
  color: #08122b;
  border-color: transparent;
}

.item-card__action--danger {
  background: rgba(255, 99, 71, 0.12);
  border-color: rgba(255, 99, 71, 0.3);
  color: #ff8a7a;
}

.item-card__action--danger:hover {
  border-color: #ff8a7a;
  color: #ffb0a3;
}
</style>
