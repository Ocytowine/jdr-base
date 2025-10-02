<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Choix de la classe</h3>
      <p class="phase__subtitle">Sélectionnez la classe principale de votre bonôme.</p>
    </header>

    <div v-if="classGroup">
      <div v-if="classGroup.options.length" class="phase__grid">
        <CardArticle
          v-for="option in classGroup.options"
          :key="option.id"
          :title="option.label"
          :description="option.description"
          :image="option.image"
          :fallback-image="option.fallbackImage"
          :image-candidates="option.imageCandidates"
          role="option"
          :aria-selected="classGroup.selected === option.id"
          :selected="classGroup.selected === option.id"
          @select="handleClassSelection(option.id, $event)"
        >
          <template v-if="option.effectLabel" #footer>
            <span class="badge badge--accent">{{ option.effectLabel }}</span>
          </template>
        </CardArticle>
      </div>
      <p v-else class="phase__message phase__message--info">
        Aucune classe n'est disponible pour le moment. Veuillez réessayer plus tard ou actualiser le catalogue.
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
   * Métadonnées de l'étape courante.
   */
  stepMeta: BonomePhaseMeta;
  /**
   * Groupe des classes primaires disponible et sélection en cours.
   */
  classGroup: PrimarySelectionGroup | null;
}>();

const creation = useBonomeCreationStore();
const { selectedClass } = storeToRefs(creation);
const { selectPrimaryOption } = creation;

const handleClassSelection = (optionId: string, nextState: boolean) => {
  if (nextState) {
    selectPrimaryOption('class', optionId);
  } else {
    resetPrimarySelection(optionId);
  }
};

const resetPrimarySelection = (optionId: string) => {
  if (selectedClass.value === optionId) {
    selectedClass.value = '';
  }
};

const stepMeta = computed(() => props.stepMeta);
const classGroup = computed(() => props.classGroup);
const canValidate = computed(() => Boolean(classGroup.value?.selected));
</script>
