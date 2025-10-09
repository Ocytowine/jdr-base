<template>
  <article :class="articleClass">
    <header class="item-card__header">
      <div class="item-card__media">
        <img :src="imageSrc" :alt="title" class="item-card__image" loading="lazy" />
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
        <dt>Poids (unite)</dt>
        <dd>{{ weightUnitLabel }}</dd>
      </div>
      <div>
        <dt>Valeur</dt>
        <dd>{{ valueDisplay }}</dd>
      </div>
      <div>
        <dt>Etat</dt>
        <dd>{{ equipped ? 'Equipe' : 'Sac' }}</dd>
      </div>
    </dl>

    <div v-if="typeDetails.length" class="item-card__type-extra">
      <div v-for="detail in typeDetails" :key="detail.label" class="item-card__type-row">
        <span class="item-card__type-label">{{ detail.label }}</span>
        <span class="item-card__type-value">{{ detail.value }}</span>
      </div>
    </div>

    <footer class="item-card__footer">
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

type ValueObject = {
  gold?: number
  silver?: number
  copper?: number
} | null

type FightProps = Record<string, any> | null
type EquipProps = Record<string, any> | null

const props = withDefaults(
  defineProps<{
    title: string
    description?: string | null
    image?: string | null
    imageId?: string | null
    typeLabel?: string | null
    quantity?: number
    weightTotal?: number | null
    weightPerUnit?: number | null
    valueLabel?: string | null
    value?: ValueObject
    equipped?: boolean
    allowStack?: boolean
    propertiesFight?: FightProps
    propertiesEquip?: EquipProps
  }>(),
  {
    description: null,
    image: null,
    imageId: null,
    typeLabel: null,
    quantity: 1,
    weightTotal: null,
    weightPerUnit: null,
    valueLabel: null,
    value: null,
    equipped: false,
    allowStack: false,
    propertiesFight: null,
    propertiesEquip: null
  }
)

const emit = defineEmits<{
  (event: 'equip', equip: boolean): void
  (event: 'inspect'): void
  (event: 'drop'): void
}>()

const imageSrc = computed(() => {
  const src = typeof props.image === 'string' ? props.image.trim() : ''
  if (src.length) return src
  const derived = typeof props.imageId === 'string' && props.imageId.length ? `/img/${props.imageId}.webp` : ''
  return derived.length ? derived : DEFAULT_IMAGE
})

const formatWeight = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const numeric = Number(value)
  if (!numeric) return '0 kg'
  if (Math.abs(numeric) >= 10) return `${numeric.toFixed(0)} kg`
  return `${numeric.toFixed(2)} kg`
}

const weightTotalLabel = computed(() => formatWeight(props.weightTotal))
const weightUnitLabel = computed(() => formatWeight(props.weightPerUnit))

const formatValue = (value: ValueObject) => {
  if (!value) return props.valueLabel || '—'
  const parts: string[] = []
  if (value.gold) parts.push(`${value.gold} po`)
  if (value.silver) parts.push(`${value.silver} pa`)
  if (value.copper) parts.push(`${value.copper} pc`)
  return parts.length ? parts.join(' ') : props.valueLabel || '—'
}

const valueDisplay = computed(() => formatValue(props.value))

const articleClass = computed(() => ({
  'item-card': true,
  'item-card--equipped': props.equipped,
}))

const typeDetails = computed(() => {
  const details: Array<{ label: string; value: string }> = []
  const type = (props.typeLabel || '').toLowerCase()
  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  if (type.includes('bourse') || type.includes('purse')) {
    details.push({ label: 'Contenu', value: valueDisplay.value })
  }

  if (type.includes('arme') || type.includes('weapon')) {
    const fight = props.propertiesFight || {}
    const damage = fight.damage ?? fight.degats ?? null
    const damageType = fight.damage_type ?? fight.type ?? fight.damageType ?? fight.degats_type ?? null
    const value = [damage, damageType].filter(Boolean).join(' ')
    if (value) {
      details.push({ label: 'Degats', value })
    }
  }

  if (type.includes('armure') || type.includes('protection')) {
    const equip = props.propertiesEquip || {}
    const defense = equip.armor_class ?? equip.defense ?? equip.ca
    if (defense !== undefined) {
      details.push({ label: "Classe d'armure", value: String(defense) })
    }
  }

  if (props.allowStack) {
    details.push({ label: 'Empilable', value: 'Oui' })
  }

  return details
})
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
  min-height: 100%;
}

.item-card--equipped {
  border-color: rgba(92, 227, 171, 0.6);
  box-shadow: 0 0 0 1px rgba(92, 227, 171, 0.2);
}

.item-card__header {
  display: flex;
  gap: 16px;
}

.item-card__media {
  flex: 0 0 68px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.item-card__image {
  width: 68px;
  height: 68px;
  object-fit: cover;
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
</style>
