<template>
  <article :class="articleClass">
    <div class="item-card__media">
      <img :src="imageSrc" :alt="title" class="item-card__image" loading="lazy" />
      <span class="item-card__status" :class="statusClass">{{ statusLabel }}</span>
    </div>
    <div class="item-card__body">
      <div class="item-card__intro">
        <div class="item-card__heading">
          <h3 class="item-card__title">{{ title }}</h3>
          <span v-if="typeLabel" class="item-card__type">{{ typeLabel }}</span>
        </div>
        <p v-if="description" class="item-card__description">{{ description }}</p>
      </div>
      <dl class="item-card__grid">
        <div>
          <dt>Quantité</dt>
          <dd>{{ quantity }}</dd>
        </div>
        <div>
          <dt>Poids total</dt>
          <dd>{{ weightTotalLabel }}</dd>
        </div>
        <div>
          <dt>Poids unitaire</dt>
          <dd>{{ weightPerUnitLabel }}</dd>
        </div>
        <div v-if="coinsLabel">
          <dt>Monnaie</dt>
          <dd>{{ coinsLabel }}</dd>
        </div>
        <div v-if="sellValueLabel">
          <dt>Valeur de vente</dt>
          <dd>{{ sellValueLabel }}</dd>
        </div>
      </dl>
      <div class="item-card__footer">
        <p class="item-card__state">
          <span class="item-card__state-label" v-if="kept">Conservé</span>
          <span class="item-card__state-label" v-else>Marqué pour vente</span>
        </p>
        <button type="button" :class="buttonClass" @click="handleToggle">
          {{ kept ? 'Vendre' : 'Ajouter' }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const DEFAULT_IMAGE = '/images/card.jpg';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string | null;
    image?: string | null;
    typeLabel?: string | null;
    quantity?: number;
    weightPerUnit?: number;
    weightTotal?: number;
    coinsLabel?: string | null;
    sellValueLabel?: string | null;
    kept: boolean;
  }>(),
  {
    description: null,
    image: null,
    typeLabel: null,
    quantity: 1,
    weightPerUnit: 0,
    weightTotal: 0,
    coinsLabel: null,
    sellValueLabel: null
  }
);

const emit = defineEmits<{ (event: 'toggle'): void }>();

const imageSrc = computed(() => {
  if (typeof props.image === 'string') {
    const trimmed = props.image.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return DEFAULT_IMAGE;
});

const formatWeight = (value: number | null | undefined): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  if (!numeric) {
    return '0 kg';
  }
  if (Math.abs(numeric) >= 10) {
    return `${numeric.toFixed(0)} kg`;
  }
  return `${numeric.toFixed(1)} kg`;
};

const weightPerUnitLabel = computed(() => formatWeight(props.weightPerUnit));
const weightTotalLabel = computed(() => formatWeight(props.weightTotal));

const statusLabel = computed(() => (props.kept ? 'Conservé' : 'Vendu'));

const articleClass = computed(() => ({
  'item-card': true,
  'item-card--kept': props.kept,
  'item-card--sale': !props.kept
}));

const statusClass = computed(() => (props.kept ? 'item-card__status--kept' : 'item-card__status--sale'));

const buttonClass = computed(() => (props.kept ? 'item-card__button item-card__button--warn' : 'item-card__button item-card__button--accent'));

const handleToggle = () => {
  emit('toggle');
};
</script>

<style scoped>
.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  border: 1px solid var(--bord);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(19, 23, 48, 0.95), rgba(10, 13, 30, 0.96));
  color: var(--texte);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  min-height: 100%;
}

.item-card--kept:hover,
.item-card--sale:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.item-card__media {
  position: relative;
  height: 160px;
  background: var(--carte-2);
}

.item-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-card__status {
  position: absolute;
  left: 16px;
  top: 14px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.item-card__status--kept {
  background: var(--ok-soft);
  color: var(--ok);
  border: 1px solid var(--ok-soft-border);
}

.item-card__status--sale {
  background: var(--warn-soft);
  color: var(--warn);
  border: 1px solid var(--warn-soft-border);
}

.item-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
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

.item-card__type {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent-2);
  font-size: 11px;
  font-weight: 600;
}

.item-card__description {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--texte-2);
  line-height: 1.5;
  white-space: pre-line;
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
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.item-card__state {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
}

.item-card__state-label {
  font-weight: 600;
  color: var(--texte);
}

.item-card__button {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.item-card__button--accent {
  background: var(--accent);
  color: #08122b;
  box-shadow: 0 12px 24px rgba(122, 162, 255, 0.25);
}

.item-card__button--accent:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(122, 162, 255, 0.35);
}

.item-card__button--warn {
  background: transparent;
  border-color: var(--warn-soft-border);
  color: var(--warn);
}

.item-card__button--warn:hover {
  border-color: var(--warn);
  color: var(--warn);
  transform: translateY(-1px);
}
</style>
