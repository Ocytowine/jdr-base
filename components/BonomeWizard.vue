<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-semibold mb-4">Choix principaux</h2>

    <!-- Sélections -->
    <section class="mb-6 border rounded p-4 bg-white/80">
      <div class="space-y-6">
        <div
          v-for="group in primarySelectionGroups"
          :key="group.id"

          class="border border-slate-200/70 rounded-xl p-4 bg-white shadow-sm"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold">{{ group.title }}</h3>
            </div>
          </div>

          <div v-if="group.options.length" class="-mx-1 px-1">
            <div
              class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] lg:auto-cols-[18rem] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="snap-center w-full text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :aria-pressed="group.selected === option.id"
                @click="selectPrimaryOption(group.id, option.id)"
              >
                <BookCardTailwind
                  :name="option.label"
                  :description="option.description"
                  :effect-label="option.effectLabel ?? null"
                  :image="option.image"
                  :class="[
                    'h-full',
                    group.selected === option.id
                      ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                      : 'hover:border-slate-300 hover:shadow'
                  ]"
                />
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">Aucune option disponible pour l'instant.</div>

          <div class="mt-3 text-sm text-gray-600">
            Classe sélectionnée :
            <span class="font-medium">{{ getPrimarySelectedLabel(group) }}</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Niveau</label>
          <input type="number" v-model.number="niveau" min="1" max="20" class="w-full border rounded p-2" />
        </div>
      </div>

      <hr class="my-3" />

      <!-- Base stats quick edit -->
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div v-for="(v,k) in baseStats" :key="k">
          <label class="block text-xs text-gray-600">{{ k }}</label>
          <input type="number" v-model.number="baseStats[k]" class="w-full border rounded p-1" />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button @click="resetChosenOptions" class="px-3 py-2 rounded border">Réinitialiser choix</button>
      </div>
    </section>

    <!-- Pending choices -->
    <section v-if="preview && preview.pendingChoices && preview.pendingChoices.length" class="mb-6 p-4 border rounded bg-white/80">
      <h3 class="font-semibold mb-2">Choix à faire</h3>
      <div
        v-for="(choice, idx) in preview.pendingChoices"
        :key="getChoiceKey(choice, idx) ?? idx"
        class="mb-3 p-3 border rounded"
      >
        <div class="flex items-center justify-between mb-1">
          <div>
            <div class="font-medium">{{ getChoiceTitle(choice) }}</div>
            <div class="text-sm text-gray-600">
              Choisir {{ getChoiceRequirement(choice) }} / catégorie: {{ getChoiceCategoryLabel(choice) }}
            </div>
          </div>
          <div class="text-sm text-gray-500">source: {{ getChoiceSourceLabel(choice) }}</div>
        </div>

        <!-- selector -->
        <div class="mt-2">
          <template v-if="getChoiceOptions(choice).length">
            <label class="block text-xs text-gray-600 mb-2 uppercase tracking-wide">Options</label>

            <div class="-mx-1 px-1">
              <div
                class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] lg:auto-cols-[18rem] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
              >
                <button
                  v-for="(opt, optIdx) in getChoiceOptions(choice)"
                  :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
                  type="button"
                  class="snap-center w-full text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  :class="{
                    'cursor-not-allowed opacity-60': isChoiceOptionDisabled(choice, opt)
                  }"
                  :disabled="isChoiceOptionDisabled(choice, opt)"
                  @click="handleChoiceOptionClick(choice, opt)"
                >
                  <BookCardTailwind
                    :name="opt.label"
                    :description="getChoiceOptionDescription(opt)"
                    :effect-label="opt.effectLabel ?? opt.effect_label ?? null"
                    :image="getChoiceOptionImage(opt)"
                    :class="[
                      'h-full',
                      isChoiceOptionSelected(choice, opt)
                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                        : 'hover:border-slate-300 hover:shadow'
                    ]"
                  />
                </button>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              Sélection :
              {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}
              <span v-if="getChoiceRequirement(choice) > 1">(sélection multiple autorisée)</span>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <button @click="applyChoice(choice)" class="px-3 py-1 rounded bg-green-600 text-white">Appliquer</button>
              <button
                @click="resetChoice(choice)"
                class="px-3 py-1 rounded border"
                :disabled="!hasLocalChoiceValue(choice)"
              >
                Réinitialiser
              </button>
            </div>
          </template>

          <template v-else>
            <div class="text-sm italic text-gray-600">Aucune option lisible pour ce choix (vérifier la donnée).</div>
          </template>
        </div>
      </div>
    </section>

    <!-- Applied choices overview -->
    <section
      v-if="appliedChoices.length"
      class="mb-6 p-4 border rounded bg-white/80"
    >
      <h3 class="font-semibold mb-2">Choix appliqués</h3>
      <ul class="space-y-2">
        <li
          v-for="choice in appliedChoices"
          :key="choice.id"
          class="flex items-start justify-between gap-4 border rounded p-3 bg-white"
        >
          <div>
            <div class="font-medium">{{ choice.label }}</div>
            <div class="text-sm text-gray-600">{{ choice.displayValue }}</div>
          </div>
          <button @click="resetChoiceById(choice.id)" class="px-3 py-1 rounded border">Réinitialiser</button>
        </li>
      </ul>
    </section>

  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';

import BookCardTailwind from '~/components/BookCardTailwind.vue';
import { useBonomeCreationStore } from '~/stores/bonomeCreation';

const creation = useBonomeCreationStore();

const {
  primarySelectionGroups,
  niveau,
  baseStats,
  preview,
  appliedChoices
} = storeToRefs(creation);

const {
  getPrimarySelectedLabel,
  selectPrimaryOption,
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
  resetChosenOptions,
  resetChoiceById
} = creation;

onMounted(() => {
  creation.initialize();
});
</script>
