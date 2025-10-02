<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Choix de la race</h3>
      <p class="phase__subtitle">Sélectionnez la race correspondant à votre personnage.</p>
    </header>

    <div v-if="raceGroup">
      <div v-if="raceGroup.options.length" class="phase__grid">
        <CardArticle
          v-for="option in raceGroup.options"
          :key="option.id"
          :title="option.label"
          :description="option.description"
          :image="option.image"
          :fallback-image="option.fallbackImage"
          :image-candidates="option.imageCandidates"
          role="option"
          :aria-selected="raceGroup.selected === option.id"
          :selected="raceGroup.selected === option.id"
          @select="handleRaceSelection(option.id, $event)"
        >
          <template v-if="option.effectLabel" #footer>
            <span class="badge badge--accent">{{ option.effectLabel }}</span>
          </template>
        </CardArticle>
      </div>
      <p v-else class="phase__message phase__message--info">
        Aucune option de race n'est disponible pour le moment. Veuillez réessayer plus tard ou actualiser le catalogue.
      </p>
    </div>
    <p v-else class="phase__message phase__message--info">
      Les données de catalogue ne sont pas encore chargées. Patientez un instant ou réessayez.
    </p>

    <div class="phase__actions">
      <button type="button" class="phase__action phase__action--ghost" @click="emit('cancel')">Annuler</button>
      <button
        type="button"
        class="phase__action phase__action--primary"
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

const handleRaceSelection = (optionId: string, nextState: boolean) => {
  if (nextState) {
    selectPrimaryOption('race', optionId);
  } else {
    resetPrimarySelection(optionId);
  }
};

const resetPrimarySelection = (optionId: string) => {
  if (selectedRace.value === optionId) {
    selectedRace.value = '';
  }
};

const stepMeta = computed(() => props.stepMeta);
const raceGroup = computed(() => props.raceGroup);
const canValidate = computed(() => Boolean(raceGroup.value?.selected));
</script>
