<template>
  <div class="aventure-inventaire">
    <header class="aventure-inventaire__header">
      <div>
        <h2>Inventaire</h2>
        <p>Organisez votre equipement et preparez vos actions.</p>
      </div>
      <div class="aventure-inventaire__toolbar">
        <label class="aventure-inventaire__search" for="inventory-search">
          <span class="sr-only">Recherche</span>
          <input
            id="inventory-search"
            name="inventory-search"
            v-model="search"
            type="search"
            placeholder="Rechercher un objet"
            autocomplete="off"
          />
        </label>
        <label class="aventure-inventaire__toggle" for="inventory-equipped-only">
          <input id="inventory-equipped-only" name="inventory-equipped-only" type="checkbox" v-model="equippedOnly" />
          <span>Equipe seulement</span>
        </label>
      </div>
    </header>
    <section v-if="displayedItems.length" class="aventure-inventaire__grid">
      <CardItemAventure
        v-for="item in displayedItems"
        :key="item.id"
        v-bind="toCardProps(item)"
        @equip="(equip) => emit('equip', { item, equip })"
        @inspect="emit('inspect', { item })"
        @drop="emit('drop', { item })"
      />
    </section>
    <p v-else class="aventure-inventaire__empty">
      Aucun objet ne correspond a votre recherche.
    </p>
    <footer v-if="!readonly" class="aventure-inventaire__footer">
      <button
        type="button"
        class="aventure-inventaire__action"
        :disabled="!pendingChanges || disabled"
        @click="emit('validate')"
      >
        Valider les changements
      </button>
      <button
        type="button"
        class="aventure-inventaire__action aventure-inventaire__action--secondary"
        :disabled="!pendingChanges"
        @click="emit('reset')"
      >
        Annuler
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CardItemAventure from './CardItemAventure.vue'
import { toPresentedCardItem } from './useInventoryCardPresenter'

export type InventaireValue = {
  gold: number
  silver: number
  copper: number
}

export type InventaireItem = {
  id: string
  originId?: string | null
  name: string
  description?: string | null
  type?: string | null
  quantity?: number
  weight?: number | null
  value?: InventaireValue | null
  equipped?: boolean
  allow_stack?: boolean
  harmonisable?: boolean
  properties_fight?: Record<string, any> | null
  properties_equip?: Record<string, any> | null
}

const props = withDefaults(
  defineProps<{
    items: InventaireItem[]
    pendingChanges?: boolean
    readonly?: boolean
    disabled?: boolean
  }>(),
  {
    pendingChanges: false,
    readonly: false,
    disabled: false
  }
)

const emit = defineEmits<{
  (event: 'equip', payload: { item: InventaireItem; equip: boolean }): void
  (event: 'drop', payload: { item: InventaireItem }): void
  (event: 'inspect', payload: { item: InventaireItem }): void
  (event: 'validate'): void
  (event: 'reset'): void
}>()

const search = ref('')
const equippedOnly = ref(false)

const formatValueLabel = (value: InventaireValue | null | undefined) => {
  if (!value) return '—'
  const parts: string[] = []
  if (value.gold) parts.push(`${value.gold} po`)
  if (value.silver) parts.push(`${value.silver} pa`)
  if (value.copper) parts.push(`${value.copper} pc`)
  return parts.join(' ') || '0'
}

const displayedItems = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return props.items.filter((item) => {
    if (equippedOnly.value && !item.equipped) return false
    if (!needle) return true
    const fields: Array<string | null | undefined> = [
      item.name,
      item.description,
      item.type,
      formatValueLabel(item.value),
      item.properties_fight ? JSON.stringify(item.properties_fight) : null,
      item.properties_equip ? JSON.stringify(item.properties_equip) : null
    ]
    return fields.some((field) => (field || '').toLowerCase().includes(needle))
  })
})

const toCardProps = (item: InventaireItem) => toPresentedCardItem(item)
</script>

<style scoped>
.aventure-inventaire {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.aventure-inventaire__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.aventure-inventaire__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-inventaire__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-inventaire__toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.aventure-inventaire__search input {
  background: rgba(8, 12, 30, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 8px 14px;
  color: var(--texte);
  font-size: 13px;
}

.aventure-inventaire__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--texte-2);
}

.aventure-inventaire__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 320px));
  gap: 20px;
  justify-content: center;
  align-content: flex-start;
  grid-auto-rows: 1fr;
  overflow: auto;
  padding-right: 4px;
}

.aventure-inventaire__empty {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
}

.aventure-inventaire__footer {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.aventure-inventaire__action {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: var(--accent);
  color: #08122b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.aventure-inventaire__action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.aventure-inventaire__action--secondary {
  background: transparent;
  color: var(--texte);
  border-color: rgba(255, 255, 255, 0.15);
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
