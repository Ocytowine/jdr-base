<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Description narrative</h3>
      <p class="text-sm text-slate-600">
        Renseignez les repères narratifs clés : ces éléments complètent la fiche pour donner vie au personnage.
      </p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <article
        v-for="field in descriptionFieldDefinitions"
        :key="field.id"
        class="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label class="block text-sm font-semibold text-slate-800">{{ field.label }}</label>
          <p v-if="field.hint" class="mt-1 text-xs text-slate-500">{{ field.hint }}</p>
        </div>
        <textarea
          v-model="descriptionFields[field.id]"
          rows="4"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          :placeholder="field.placeholder"
        ></textarea>
      </article>
    </div>
    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="emit('validate')">
        Valider
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { DESCRIPTION_FIELD_DEFINITIONS, useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées d'étape pour contextualiser la section.
   */
  stepMeta: BonomePhaseMeta;
}>();

const creation = useBonomeCreationStore();
const descriptionFields = creation.descriptionFields;

const descriptionFieldDefinitions = DESCRIPTION_FIELD_DEFINITIONS;

const stepMeta = computed(() => props.stepMeta);
</script>
