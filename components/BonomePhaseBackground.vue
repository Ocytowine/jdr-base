<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Choix de l'historique</h3>
      <p class="text-sm text-slate-600">Selectionnez l'historique principal de votre personnage.</p>
    </div>
    <div v-if="backgroundGroup" class="space-y-4">
      <div
        v-if="backgroundGroup.options.length"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center"
      >
        <CardArticle
          v-for="option in backgroundGroup.options"
          :key="option.id"
          :title="option.label"
          :description="option.description"
          :image="option.image"
          :fallback-image="option.fallbackImage"
          :image-candidates="option.imageCandidates"
          role="option"
          :aria-selected="backgroundGroup.selected === option.id"
          :selected="backgroundGroup.selected === option.id"
          @select="handleBackgroundSelection(option.id, $event)"
        >
          <template v-if="option.effectLabel" #footer>
            <span class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {{ option.effectLabel }}
            </span>
          </template>
        </CardArticle>
      </div>
      <p v-else class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
        Aucun historique n'est disponible pour le moment. Veuillez reessayer plus tard ou actualiser le catalogue.
      </p>
    </div>
    <p
      v-else
      class="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600"
    >
      Les donnees de catalogue ne sont pas encore chargees. Patientez un instant ou reessayez.
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

import CardArticle from '@/components/CardArticle.vue';
import type { BonomePhaseMeta } from '@/components/bonomePhases';
import type { PrimarySelectionGroup } from '@/stores/bonomeCreation';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  stepMeta: BonomePhaseMeta;
  backgroundGroup: PrimarySelectionGroup | null;
}>();

const creation = useBonomeCreationStore();
const { selectedBackground } = storeToRefs(creation);
const { selectPrimaryOption } = creation;

const handleBackgroundSelection = (optionId: string, nextState: boolean) => {
  if (nextState) {
    selectPrimaryOption('background', optionId);
  } else {
    resetPrimarySelection(optionId);
  }
};

const resetPrimarySelection = (optionId: string) => {
  if (selectedBackground.value === optionId) {
    selectedBackground.value = '';
  }
};

const stepMeta = computed(() => props.stepMeta);
const backgroundGroup = computed(() => props.backgroundGroup);
const canValidate = computed(() => Boolean(backgroundGroup.value?.options.length));
</script>
