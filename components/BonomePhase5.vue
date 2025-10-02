<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Choix complémentaires</h3>
      <p class="phase__subtitle">Appliquez les options supplémentaires proposées par l'assistant.</p>
    </header>

    <section v-if="preview && preview.pendingChoices && preview.pendingChoices.length" class="choice-list">
      <article
        v-for="(choice, idx) in preview.pendingChoices"
        :key="getChoiceKey(choice, idx) ?? idx"
        class="choice-card"
      >
        <header class="choice-card__header">
          <div class="choice-card__meta">
            <h4 class="choice-card__title">{{ getChoiceTitle(choice) }}</h4>
            <p class="choice-card__subtitle">
              Choisir {{ getChoiceRequirement(choice) }} · catégorie : {{ getChoiceCategoryLabel(choice) }}
            </p>
          </div>
          <span class="choice-card__source">Source : {{ getChoiceSourceLabel(choice) }}</span>
        </header>

        <div class="choice-card__body">
          <div v-if="getChoiceOptions(choice).length" class="choice-card__options">
            <CardArticle
              v-for="(opt, optIdx) in getChoiceOptions(choice)"
              :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
              :title="opt.label"
              :description="getChoiceOptionDescription(opt)"
              :image="getChoiceOptionImage(opt)"
              :fallback-image="opt.fallbackImage ?? undefined"
              :image-candidates="opt.imageCandidates ?? []"
              role="option"
              :aria-selected="isChoiceOptionSelected(choice, opt)"
              :selected="isChoiceOptionSelected(choice, opt)"
              :disabled="isChoiceOptionDisabled(choice, opt)"
              @select="handleChoiceOptionClick(choice, opt)"
            >
              <template v-if="opt.effectLabel || opt.effect_label" #footer>
                <span class="badge badge--accent">{{ opt.effectLabel ?? opt.effect_label }}</span>
              </template>
            </CardArticle>
          </div>
          <p v-else class="choice-card__empty">
            Aucune option lisible pour ce choix (vérifier la donnée).
          </p>

          <footer class="choice-card__footer">
            <span class="choice-card__progress">
              Sélection : {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}
              <span v-if="getChoiceRequirement(choice) > 1">(sélection multiple autorisée)</span>
            </span>
            <div class="choice-card__actions">
              <button type="button" class="choice-card__action choice-card__action--primary" @click="applyChoice(choice)">
                Appliquer
              </button>
              <button
                type="button"
                class="choice-card__action choice-card__action--ghost"
                :disabled="!hasLocalChoiceValue(choice)"
                @click="resetChoice(choice)"
              >
                Réinitialiser
              </button>
            </div>
          </footer>
        </div>
      </article>
    </section>
    <p v-else class="phase__message phase__message--info">
      Aucun choix complémentaire requis pour le moment.
    </p>

    <section v-if="appliedChoices.length" class="applied">
      <h4 class="applied__title">Choix appliqués</h4>
      <ul class="applied__list">
        <li v-for="choice in appliedChoices" :key="choice.id" class="applied__item">
          <div>
            <p class="applied__label">{{ choice.label }}</p>
            <p class="applied__value">{{ choice.displayValue }}</p>
          </div>
          <button type="button" class="choice-card__action choice-card__action--ghost" @click="resetChoiceById(choice.id)">
            Retirer
          </button>
        </li>
      </ul>
    </section>

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

import CardArticle from '@/components/CardArticle.vue';
import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées de l'étape courante.
   */
  stepMeta: BonomePhaseMeta;
  /**
   * Prévisualisation en cours contenant les choix à appliquer.
   */
  preview: any | null;
}>();

const creation = useBonomeCreationStore();
const { appliedChoices, preview: storePreview } = storeToRefs(creation);

const {
  getChoiceKey,
  getChoiceTitle,
  getChoiceRequirement,
  getChoiceCategoryLabel,
  getChoiceSourceLabel,
  getChoiceOptions,
  getChoiceOptionDescription,
  getChoiceOptionImage,
  isChoiceOptionDisabled,
  handleChoiceOptionClick,
  isChoiceOptionSelected,
  getLocalChoiceCount,
  applyChoice,
  resetChoice,
  hasLocalChoiceValue,
  resetChoiceById
} = creation;

const stepMeta = computed(() => props.stepMeta);
const preview = computed(() => props.preview ?? storePreview.value ?? null);
</script>

<style scoped>
.choice-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.choice-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(19, 23, 48, 0.9), rgba(10, 14, 32, 0.92));
  padding: 22px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.choice-card__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 14px;
}

@media (min-width: 640px) {
  .choice-card__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.choice-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.choice-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.choice-card__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
}

.choice-card__source {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent-2);
}

.choice-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.choice-card__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  justify-items: center;
}

.choice-card__empty {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
  font-style: italic;
}

.choice-card__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (min-width: 640px) {
  .choice-card__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.choice-card__progress {
  font-size: 13px;
  color: var(--texte-2);
}

.choice-card__actions {
  display: flex;
  gap: 10px;
}

.choice-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
}

.choice-card__action--primary {
  background: var(--accent);
  color: #08122b;
  box-shadow: 0 12px 24px rgba(122, 162, 255, 0.25);
}

.choice-card__action--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(122, 162, 255, 0.35);
}

.choice-card__action--ghost {
  background: transparent;
  border-color: var(--bord);
  color: var(--texte-2);
}

.choice-card__action--ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.choice-card__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.applied {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.applied__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-2);
}

.applied__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.applied__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(18, 22, 47, 0.9), rgba(10, 14, 32, 0.92));
}

.applied__label {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--texte);
}

.applied__value {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}
</style>
