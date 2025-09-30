<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Choix complémentaires</h3>
      <p class="text-sm text-slate-600">Appliquez les options supplémentaires proposées par l'assistant.</p>
    </div>

    <section v-if="preview && preview.pendingChoices && preview.pendingChoices.length" class="space-y-4">
      <article
        v-for="(choice, idx) in preview.pendingChoices"
        :key="getChoiceKey(choice, idx) ?? idx"
        class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <header class="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 class="text-base font-semibold text-slate-900">{{ getChoiceTitle(choice) }}</h4>
            <p class="text-xs text-slate-500">
              Choisir {{ getChoiceRequirement(choice) }} / catégorie : {{ getChoiceCategoryLabel(choice) }}
            </p>
          </div>
          <span class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Source : {{ getChoiceSourceLabel(choice) }}
          </span>
        </header>

        <div class="space-y-4">
          <div v-if="getChoiceOptions(choice).length" class="-mx-1 px-1">
            <div class="grid grid-flow-col auto-cols-[320px] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
              <CardArticleSpells
                v-for="(opt, optIdx) in getChoiceOptions(choice)"
                :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
                :title="opt.label"
                :description="getChoiceOptionDescription(opt)"
                :effact-label="opt.effectLabel ?? opt.effect_label ?? undefined"
                :image="getChoiceOptionImage(opt)"
                role="option"
                :aria-selected="isChoiceOptionSelected(choice, opt)"
                :selection-state="isChoiceOptionSelected(choice, opt) ? 'write' : 'none'"
                :class="[
                  'snap-center focus-within:ring-2 focus-within:ring-blue-500',
                  isChoiceOptionSelected(choice, opt)
                    ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                    : 'hover:border-slate-300 hover:shadow',
                  isChoiceOptionDisabled(choice, opt) ? 'cursor-not-allowed opacity-60' : ''
                ]"
                @write="handleChoiceOptionClick(choice, opt)"
                @write-prepare="handleChoiceOptionClick(choice, opt)"
                @reset="resetChoiceOption(choice, opt)"
              />
            </div>
          </div>
          <p v-else class="text-sm italic text-slate-500">
            Aucune option lisible pour ce choix (vérifier la donnée).
          </p>

          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Sélection :
              {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}
              <span v-if="getChoiceRequirement(choice) > 1">(sélection multiple autorisée)</span>
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                @click="applyChoice(choice)"
              >
                Appliquer
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-1 text-xs"
                :disabled="!hasLocalChoiceValue(choice)"
                @click="resetChoice(choice)"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
    <p v-else class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      Aucun choix complémentaire requis pour le moment.
    </p>

    <section v-if="appliedChoices.length" class="space-y-3">
      <h4 class="text-sm font-semibold text-slate-700">Choix appliqués</h4>
      <ul class="space-y-2">
        <li
          v-for="choice in appliedChoices"
          :key="choice.id"
          class="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
        >
          <div>
            <p class="font-semibold text-slate-800">{{ choice.label }}</p>
            <p class="text-xs text-slate-500">{{ choice.displayValue }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1 text-xs"
            @click="resetChoiceById(choice.id)"
          >
            Retirer
          </button>
        </li>
      </ul>
    </section>

    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="emit('validate')">
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

const resetChoiceOption = (choice: any, option: any) => {
  if (isChoiceOptionSelected(choice, option)) {
    handleChoiceOptionClick(choice, option);
  }
};

const stepMeta = computed(() => props.stepMeta);
const preview = computed(() => props.preview ?? storePreview.value ?? null);
</script>
