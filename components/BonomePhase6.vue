<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Matériel</h3>
      <p class="text-sm text-slate-600">
        Réservez les emplacements clés de l’équipement : chaque bloc sera enrichi par la suite par
        l’assistant ou vos choix manuels.
      </p>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <article
        v-for="slot in equipmentSlots"
        :key="slot.id"
        class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <header class="flex items-start justify-between gap-3">
          <div>
            <h4 class="text-sm font-semibold text-slate-900">{{ slot.label }}</h4>
            <p class="text-xs text-slate-500">{{ slot.hint }}</p>
          </div>
          <button
            type="button"
            class="cursor-not-allowed rounded-full border border-dashed border-slate-300 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400"
            disabled
          >
            À venir
          </button>
        </header>
        <input
          v-model="materialPlan[slot.id]"
          type="text"
          :placeholder="slot.placeholder"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </article>
    </div>
    <div>
      <label class="block text-sm font-medium text-slate-700">Notes complémentaires</label>
      <textarea
        v-model="materialPlan.notes"
        rows="4"
        class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder="Consignez les ajustements libres : munitions, potions, objets uniques…"
      ></textarea>
      <p class="mt-1 text-xs text-slate-500">
        Ces informations seront ajoutées à la fiche finale du personnage.
      </p>
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
import { MATERIAL_SLOT_DEFINITIONS, useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées d'étape pour identification.
   */
  stepMeta: BonomePhaseMeta;
}>();

const creation = useBonomeCreationStore();
const materialPlan = creation.materialPlan;

const equipmentSlots = MATERIAL_SLOT_DEFINITIONS;

const stepMeta = computed(() => props.stepMeta);
</script>
