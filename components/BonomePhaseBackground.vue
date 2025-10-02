<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Choix de l'historique</h3>
      <p class="phase__subtitle">Sélectionnez l'historique principal de votre personnage.</p>
    </header>

    <div v-if="backgroundGroup">
      <div v-if="backgroundGroup.options.length" class="phase__grid">
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
            <span class="badge badge--accent">{{ option.effectLabel }}</span>
          </template>
        </CardArticle>
      </div>
      <p v-else class="phase__message phase__message--info">
        Aucun historique n'est disponible pour le moment. Veuillez réessayer plus tard ou actualiser le catalogue.
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
const canValidate = computed(() => Boolean(backgroundGroup.value?.selected));
</script>
