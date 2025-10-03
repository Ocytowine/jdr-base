<template>
  <div class="aventure-inventaire">
    <header class="aventure-inventaire__header">
      <div>
        <h2>Inventaire</h2>
        <p>Organisez votre equipement et preparez vos actions.</p>
      </div>
      <div class="aventure-inventaire__toolbar">
        <label class="aventure-inventaire__search">
          <span class="sr-only">Recherche</span>
          <input v-model="search" type="search" placeholder="Rechercher un objet" />
        </label>
        <label class="aventure-inventaire__toggle">
          <input type="checkbox" v-model="equippedOnly" />
          <span>Equipe seulement</span>
        </label>
      </div>
    </header>
    <section v-if="displayedItems.length" class="aventure-inventaire__grid">
      <CardItemAventure
        v-for="item in displayedItems"
        :key="item.id"
        v-bind="toCardProps(item)"
        @equip="(equip) => emit('equip', { itemId: item.id, equip })"
        @inspect="emit('inspect', { itemId: item.id })"
        @drop="emit('drop', { itemId: item.id })"
      />
    </section>
    <p v-else class="aventure-inventaire__empty">
      Aucun objet ne correspond a votre recherche.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CardItemAventure from './CardItemAventure.vue'

export type InventaireItem = {
  id: string
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
}

const props = defineProps<{ items: InventaireItem[] }>()

const emit = defineEmits<{
  (event: 'equip', payload: { itemId: string; equip: boolean }): void
  (event: 'drop', payload: { itemId: string }): void
  (event: 'inspect', payload: { itemId: string }): void
}>()

const search = ref('')
const equippedOnly = ref(false)

const displayedItems = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return props.items.filter((item) => {
    if (equippedOnly.value && !item.equipped) return false
    if (!needle) return true
    const fields = [item.title, item.description, item.typeLabel, ...(item.tags || [])]
    return fields.some((field) => (field || '').toLowerCase().includes(needle))
  })
})

const toCardProps = (item: InventaireItem) => ({
  title: item.title,
  description: item.description,
  image: item.image,
  typeLabel: item.typeLabel,
  quantity: item.quantity,
  weightTotal: item.weightTotal,
  valueLabel: item.valueLabel,
  equipped: item.equipped,
  rarity: item.rarity,
  tags: item.tags,
})
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  overflow: auto;
  padding-right: 4px;
}

.aventure-inventaire__empty {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
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
