<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <form class="phase__form" @submit.prevent>
      <div class="phase__fields">
        <div class="field">
          <label class="field__label">Prénom</label>
          <input
            v-model="characterFirstName"
            type="text"
            placeholder="Ex. Lina"
            class="input field__input"
          />
        </div>
        <div class="field">
          <label class="field__label">Nom</label>
          <input
            v-model="characterLastName"
            type="text"
            placeholder="Ex. Morcant"
            class="input field__input"
          />
        </div>
        <div class="field">
          <label class="field__label">Surnom</label>
          <input
            v-model="characterNickname"
            type="text"
            placeholder="Ex. L'Éclair"
            class="input field__input"
          />
          <p class="field__hint">Optionnel : sera affiché entre guillemets.</p>
        </div>
      </div>

      <div class="phase__preview">
        <p class="phase__preview-title">Aperçu rapide</p>
        <dl class="phase__preview-list">
          <div class="phase__preview-item">
            <dt class="phase__preview-key">Nom complet</dt>
            <dd class="phase__preview-value">{{ fullNamePreview || '-' }}</dd>
          </div>
          <div class="phase__preview-item">
            <dt class="phase__preview-key">Nom affiché</dt>
            <dd class="phase__preview-value">{{ displayCharacterName }}</dd>
          </div>
          <div class="phase__preview-item">
            <dt class="phase__preview-key">Portrait généré</dt>
            <dd class="phase__preview-value">{{ displayCharacterName }}</dd>
          </div>
        </dl>
      </div>
    </form>

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
import { storeToRefs } from 'pinia';

import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées décrivant l'étape courante (identifiant, libellés, actions associées).
   */
  stepMeta: BonomePhaseMeta;
}>();

const creation = useBonomeCreationStore();
const { characterFirstName, characterLastName, characterNickname, fullCharacterName, displayCharacterName } =
  storeToRefs(creation);

const fullNamePreview = computed(() => fullCharacterName.value.trim());

// Ensure props are referenced to avoid unused warnings in template compilation.
const stepMeta = computed(() => props.stepMeta);
</script>

