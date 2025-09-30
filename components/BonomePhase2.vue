<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Choix de la race</h3>
      <p class="text-sm text-slate-600">Sélectionnez la race correspondant à votre personnage.</p>
    </div>
    <div v-if="raceGroup" class="-mx-1 space-y-4 px-1">
      <div
        v-if="raceGroup.options.length"
        class="grid grid-flow-col auto-cols-[320px] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
      >
        <CardArticleSpells
          v-for="option in raceGroup.options"
          :key="option.id"
          :title="option.label"
          :description="option.description"
          :effact-label="option.effectLabel ?? undefined"
          :image="option.image"
          role="option"
          :aria-selected="raceGroup.selected === option.id"
          :selection-state="raceGroup.selected === option.id ? 'write' : 'none'"
          :class="[
            'snap-center focus-within:ring-2 focus-within:ring-blue-500',
            raceGroup.selected === option.id ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'hover:border-slate-300 hover:shadow'
          ]"
          @write="selectPrimaryOption('race', option.id)"
          @write-prepare="selectPrimaryOption('race', option.id)"
          @reset="resetPrimarySelection(option.id)"
        />
      </div>
      <p v-else class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
        Aucune option de race n’est disponible pour le moment. Veuillez réessayer plus tard ou actualiser le catalogue.
      </p>
    </div>
    <p
      v-else
      class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600"
    >
      Les données de catalogue ne sont pas encore chargées. Patientez un instant ou réessayez.
    </p>
    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-semibold text-white"
        :class="canValidate ? 'bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500' : 'bg-slate-300 text-slate-500 cursor-not-allowed'"
        :disabled="!canValidate"
        @click="emit('validate')"
      >
        Valider
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import CardArticleSpells from '@/components/CardArticleSpells.vue';
import type { BonomePhaseMeta } from '@/components/bonomePhases';
import type { PrimarySelectionGroup } from '@/stores/bonomeCreation';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées de l'étape (utilisées pour la navigation et l'accessibilité).
   */
  stepMeta: BonomePhaseMeta;
  /**
   * Groupe de sélection des races fourni par l'assistant (options et sélection courante).
   */
  raceGroup: PrimarySelectionGroup | null;
}>();

const creation = useBonomeCreationStore();
const { selectedRace } = storeToRefs(creation);
const { selectPrimaryOption } = creation;

const resetPrimarySelection = (optionId: string) => {
  if (selectedRace.value === optionId) {
    selectedRace.value = '';
  }
};

const stepMeta = computed(() => props.stepMeta);
const raceGroup = computed(() => props.raceGroup);
const canValidate = computed(() => Boolean(raceGroup.value?.options.length));
</script>
