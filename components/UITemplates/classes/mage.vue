<template>
  <div class="p-4 bg-gray-900 text-white rounded-lg">
    <h2 class="text-xl font-bold mb-2">Interface Mage</h2>
    <div v-if="uiTemplate">
      <div v-html="uiTemplate"></div>
    </div>
    <div>
      <h3 class="mt-4 font-semibold">Pouvoirs et sorts disponibles</h3>
      <ul>
        <li v-for="id in nonAppliedIds" :key="id" class="mb-2">
          <div v-if="spellDetails(id)">
            <strong>{{ spellDetails(id).name || id }}</strong>
            <span class="ml-2 text-sm text-gray-400">{{ spellDetails(id).description || '—' }}</span>
            <button class="ml-4 px-2 py-1 bg-blue-600 rounded" @click="applyPower(id, 'spell')">Appliquer</button>
          </div>
          <div v-else-if="featureDetails(id)">
            <strong>{{ featureDetails(id).name || id }}</strong>
            <span class="ml-2 text-sm text-gray-400">{{ featureDetails(id).description || '—' }}</span>
            <button class="ml-4 px-2 py-1 bg-green-600 rounded" @click="applyPower(id, 'feature')">Appliquer</button>
          </div>
          <div v-else class="text-red-400">Introuvable : {{ id }}</div>
        </li>
        <li v-if="!nonAppliedIds.length" class="text-gray-400">Aucun sort ou pouvoir à appliquer</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBonomeCreationStore } from '@/stores/bonomeCreation'
const store = useBonomeCreationStore()

const uiTemplate = computed(() => store.preview?.value?.previewCharacter?.ui_template ?? null)
const spellIds = computed(() => Array.isArray(store.preview?.value?.spellIds) ? store.preview.value.spellIds : [])
const featureIds = computed(() => Array.isArray(store.preview?.value?.featureIds) ? store.preview.value.featureIds : [])
const appliedFeatures = computed(() => Array.isArray(store.preview?.value?.appliedFeatures) ? store.preview.value.appliedFeatures : [])

const nonAppliedIds = computed(() => {
  const applied = new Set(appliedFeatures.value ?? [])
  return [
    ...spellIds.value.filter((id: string) => !applied.has(id)),
    ...featureIds.value.filter((id: string) => !applied.has(id))
  ]
})

const spellDetails = (id: string) => store.getSpellOrFeatureDetails?.(id, 'spell') ?? null
const featureDetails = (id: string) => store.getSpellOrFeatureDetails?.(id, 'feature') ?? null

const applyPower = async (id: string, type: 'spell' | 'feature') => {
  alert(`Pouvoir/sort ${id} appliqué !`)
}
</script>

<style scoped>
/* Personnalisation possible */
</style>
