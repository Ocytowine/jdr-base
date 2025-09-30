<template>
  <section
    :data-step="stepMeta.id"
    :data-preview-ready="!!preview"
    class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
  >
    <div class="space-y-3">
      <h3 class="text-lg font-semibold text-slate-900">Récapitulatif</h3>
      <p class="text-sm text-slate-600">
        Vérifiez les informations, ajustez vos notes et sauvegardez votre bonôme pour rejoindre l’aventure.
      </p>
    </div>

    <BonomePreviewPanel />

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <header class="space-y-1">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Plan de matériel</h4>
          <p class="text-xs text-slate-500">Anticipez la dotation initiale pour faciliter la prochaine session.</p>
        </header>
        <div class="space-y-2">
          <div
            v-for="entry in materialSummary"
            :key="entry.id"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ entry.label }}</p>
            <p class="mt-1 text-sm text-slate-700">{{ entry.value || 'À définir' }}</p>
          </div>
        </div>
        <div class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes complémentaires</p>
          <p class="mt-1 whitespace-pre-line">{{ materialNotesDisplay || 'Aucune note particulière pour le moment.' }}</p>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <header class="space-y-1">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Portrait narratif</h4>
          <p class="text-xs text-slate-500">Ces éléments nourriront le jeu de rôle et les interactions.</p>
        </header>
        <div class="space-y-2">
          <div
            v-for="entry in descriptionSummary"
            :key="entry.id"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ entry.label }}</p>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-700">{{ entry.value || 'À préciser' }}</p>
          </div>
        </div>
      </section>
    </div>

    <div class="space-y-3">
      <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Choix appliqués</h4>
      <ul v-if="appliedChoices.length" class="space-y-2 text-sm text-slate-700">
        <li v-for="choice in appliedChoices" :key="choice.id" class="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span class="font-semibold">{{ choice.label }} :</span> {{ choice.displayValue }}
        </li>
      </ul>
      <p v-else class="text-sm text-slate-500">Aucun choix complémentaire appliqué.</p>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Revenir</button>
      <button
        type="button"
        class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
        @click="emit('refresh')"
      >
        Rafraîchir la prévisualisation
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import BonomePreviewPanel from '@/components/BonomePreviewPanel.vue';
import type { BonomePhaseMeta } from '@/components/bonomePhases';
import {
  DESCRIPTION_FIELD_DEFINITIONS,
  MATERIAL_SLOT_DEFINITIONS,
  useBonomeCreationStore
} from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées de l'étape de récapitulatif.
   */
  stepMeta: BonomePhaseMeta;
  /**
   * Aperçu calculé côté assistant, utilisé pour informer l'utilisateur sur l'état courant.
   */
  preview?: any | null;
}>();

const creation = useBonomeCreationStore();
const { appliedChoices, preview: storePreview } = storeToRefs(creation);
const materialPlan = creation.materialPlan;
const descriptionFields = creation.descriptionFields;

const equipmentSlots = MATERIAL_SLOT_DEFINITIONS;
const descriptionFieldDefinitions = DESCRIPTION_FIELD_DEFINITIONS;

const materialSummary = computed(() =>
  equipmentSlots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    value: materialPlan[slot.id].trim()
  }))
);

const descriptionSummary = computed(() =>
  descriptionFieldDefinitions.map((field) => ({
    id: field.id,
    label: field.label,
    value: descriptionFields[field.id].trim()
  }))
);

const materialNotesDisplay = computed(() => materialPlan.notes.trim());

const stepMeta = computed(() => props.stepMeta);

// expose preview to template/users if needed
const preview = computed(() => props.preview ?? storePreview.value ?? null);
</script>
