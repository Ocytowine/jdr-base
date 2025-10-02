<template>
  <section :data-step="stepMeta.id" :data-preview-ready="!!preview" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Récapitulatif</h3>
      <p class="phase__subtitle">
        Vérifiez les informations, ajustez vos notes et sauvegardez votre bonôme pour rejoindre l'aventure.
      </p>
    </header>

    <BonomePreviewPanel />

    <div class="recap-applied">
      <h4 class="recap-applied__title">Choix appliqués</h4>
      <ul v-if="appliedChoices.length" class="recap-applied__list">
        <li v-for="choice in appliedChoices" :key="choice.id" class="recap-applied__item">
          <span class="recap-applied__label">{{ choice.label }}</span>
          <span class="recap-applied__value">{{ choice.displayValue }}</span>
        </li>
      </ul>
      <p v-else class="phase__message phase__message--info">Aucun choix complémentaire appliqué.</p>
    </div>

    <div class="recap-actions">
      <button type="button" class="phase__action phase__action--ghost" @click="emit('cancel')">Revenir</button>
      <button type="button" class="phase__action phase__action--primary" @click="emit('refresh')">
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
  equipmentSlots.map((slot) => {
    const value = materialPlan[slot.id];
    return {
      id: slot.id,
      label: slot.label,
      value: typeof value === 'string' ? value.trim() : ''
    };
  })
);

const descriptionSummary = computed(() =>
  descriptionFieldDefinitions.map((field) => ({
    id: field.id,
    label: field.label,
    value: descriptionFields[field.id].trim()
  }))
);

const materialNotesDisplay = computed(() =>
  typeof materialPlan.notes === 'string' ? materialPlan.notes.trim() : ''
);

const stepMeta = computed(() => props.stepMeta);

// expose preview to template/users if needed
const preview = computed(() => props.preview ?? storePreview.value ?? null);
</script>

<style scoped>
.recap-applied {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recap-applied__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-2);
}

.recap-applied__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recap-applied__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(18, 22, 47, 0.9), rgba(10, 13, 30, 0.92));
}

@media (min-width: 640px) {
  .recap-applied__item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.recap-applied__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--texte);
}

.recap-applied__value {
  font-size: 13px;
  color: var(--texte-2);
}

.recap-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .recap-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
