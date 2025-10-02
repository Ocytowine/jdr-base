<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Description narrative</h3>
      <p class="phase__subtitle">
        Renseignez les repères narratifs clés : ces éléments complètent la fiche pour donner vie au personnage.
      </p>
    </header>

    <div class="description-grid">
      <article v-for="field in descriptionFieldDefinitions" :key="field.id" class="description-card">
        <div class="description-card__header">
          <label class="description-card__label">{{ field.label }}</label>
          <p v-if="field.hint" class="description-card__hint">{{ field.hint }}</p>
        </div>
        <textarea
          v-model="descriptionFields[field.id]"
          rows="4"
          class="input description-card__textarea"
          :placeholder="field.placeholder"
        ></textarea>
      </article>
    </div>

    <div class="phase__actions">
      <button type="button" class="phase__action phase__action--ghost" @click="emit('cancel')">Annuler</button>
      <button type="button" class="phase__action phase__action--primary" @click="emit('validate')">
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

<style scoped>
.description-grid {
  display: grid;
  gap: 18px;
}

@media (min-width: 768px) {
  .description-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.description-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(20, 24, 52, 0.88), rgba(11, 14, 32, 0.94));
  padding: 18px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.description-card__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.description-card__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--texte);
}

.description-card__hint {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
}

.description-card__textarea {
  resize: vertical;
  min-height: 120px;
  border: 1px solid var(--bord);
  background: var(--carte-2);
  color: var(--texte);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.description-card__textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(122, 162, 255, 0.2);
}
</style>
