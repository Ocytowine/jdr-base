<template>
  <div class="p-4 max-w-6xl mx-auto">
    <div class="space-y-6">
      <!-- Sélections principales -->
      <section class="border rounded p-4 bg-white/80">
        <div class="space-y-6">
          <div
            v-for="group in primarySelectionGroups"
            :key="group.id"
            class="border border-slate-200/70 rounded-xl p-4 bg-white shadow-sm"
          >
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-lg font-semibold">{{ group.title }}</h3>
                <p class="text-sm text-gray-600">Choisir une option obligatoire.</p>
              </div>
              <span class="text-xs uppercase tracking-wide text-gray-500">1 sélection</span>
            </div>

            <div v-if="group.options.length" class="-mx-1 px-1">
              <div
                class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] lg:auto-cols-[18rem] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
              >
                <button
                  v-for="option in group.options"
                  :key="option.id"
                  type="button"
                  class="snap-center w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  :class="{
                    'ring-2 ring-blue-500 border-blue-500 shadow-md': group.selected === option.id
                  }"
                  :aria-pressed="group.selected === option.id"
                  @click="selectPrimaryOption(group.id, option.id)"
                >
                  <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-200">
                    <img
                      :src="option.image"
                      :alt="`Illustration ${option.label}`"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div class="mt-3 space-y-3">
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Nom</div>
                      <div class="text-base font-medium text-slate-900">{{ option.label }}</div>
                    </div>
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</div>
                      <p class="text-sm leading-snug text-gray-600 min-h-[3.5rem]">{{ option.description }}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-gray-500">Aucune option disponible pour l'instant.</div>

            <div class="mt-3 text-sm text-gray-600">
              Option sélectionnée :
              <span class="font-medium">{{ getPrimarySelectedLabel(group) }}</span>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1">Niveau</label>
              <input type="number" v-model.number="niveau" min="1" max="20" class="w-full border rounded p-2" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Nom du personnage</label>
              <input type="text" v-model="characterName" placeholder="Nom personnalisé" class="w-full border rounded p-2" />
            </div>
          </div>
        </div>

        <hr class="my-3" />

        <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
          <div v-for="(v, k) in baseStats" :key="k">
            <label class="block text-xs text-gray-600">{{ k }}</label>
            <input type="number" v-model.number="baseStats[k]" class="w-full border rounded p-1" />
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button @click="creation.sendPreview" :disabled="loading" class="px-3 py-2 rounded bg-blue-600 text-white">
            {{ loading ? 'Prévisualisation...' : 'Prévisualiser' }}
          </button>
          <button @click="creation.resetChosenOptions" class="px-3 py-2 rounded border">Réinitialiser choix</button>
        </div>
      </section>

      <!-- Choix pendants -->
      <section v-if="preview && preview.pendingChoices && preview.pendingChoices.length" class="p-4 border rounded bg-white/80">
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
                    class="snap-center w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    :class="{
                      'ring-2 ring-blue-500 border-blue-500 shadow-md': isChoiceOptionSelected(choice, opt),
                      'opacity-60 cursor-not-allowed': isChoiceOptionDisabled(choice, opt)
                    }"
                    :disabled="isChoiceOptionDisabled(choice, opt)"
                    @click="handleChoiceOptionClick(choice, opt)"
                  >
                    <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-200">
                      <img
                        :src="getChoiceOptionImage(opt)"
                        :alt="`Illustration ${opt.label}`"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div class="mt-3 space-y-3">
                      <div>
                        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Nom</div>
                        <div class="text-base font-medium text-slate-900">{{ opt.label }}</div>
                      </div>
                      <div>
                        <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</div>
                        <p class="text-sm leading-snug text-gray-600 min-h-[3.5rem]">
                          {{ getChoiceOptionDescription(opt) }}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div class="mt-2 text-xs text-gray-500">
                Sélection :
                {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}
                <span v-if="getChoiceRequirement(choice) > 1">(sélection multiple autorisée)</span>
              </div>

              <div class="mt-2 flex items-center gap-2">
                <button @click="creation.applyChoice(choice)" class="px-3 py-1 rounded bg-green-600 text-white">Appliquer</button>
                <button
                  @click="creation.resetChoice(choice)"
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

      <!-- Choix appliqués -->
      <section v-if="appliedChoices.length" class="p-4 border rounded bg-white/80">
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
            <button @click="creation.resetChoiceById(choice.id)" class="px-3 py-1 rounded border">Réinitialiser</button>
          </li>
        </ul>
      </section>

      <!-- Debug -->
      <section class="p-4 border rounded bg-white/80">
        <button @click="showRaw = !showRaw" class="px-3 py-1 rounded border">
          {{ showRaw ? 'Cacher Raw response (debug)' : 'Voir Raw response (debug)' }}
        </button>
        <div v-if="showRaw" class="mt-3">
          <pre class="whitespace-pre-wrap bg-slate-100 p-3 rounded text-sm overflow-auto" style="max-height:400px">{{ rawText }}</pre>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const creation = useBonomeCreationStore();

const { primarySelectionGroups, preview, showRaw, rawText, appliedChoices, niveau, loading, characterName } =
  storeToRefs(creation);

const baseStats = creation.baseStats;

onMounted(() => {
  creation.initialize();
});

const selectPrimaryOption = creation.selectPrimaryOption;
const getPrimarySelectedLabel = creation.getPrimarySelectedLabel;
const getChoiceKey = creation.getChoiceKey;
const getChoiceTitle = creation.getChoiceTitle;
const getChoiceRequirement = creation.getChoiceRequirement;
const getChoiceCategoryLabel = creation.getChoiceCategoryLabel;
const getChoiceSourceLabel = creation.getChoiceSourceLabel;
const getChoiceOptions = creation.getChoiceOptions;
const getChoiceOptionImage = creation.getChoiceOptionImage;
const getChoiceOptionDescription = creation.getChoiceOptionDescription;
const getLocalChoiceCount = creation.getLocalChoiceCount;
const isChoiceOptionSelected = creation.isChoiceOptionSelected;
const handleChoiceOptionClick = creation.handleChoiceOptionClick;
const isChoiceOptionDisabled = creation.isChoiceOptionDisabled;
const hasLocalChoiceValue = creation.hasLocalChoiceValue;
</script>

<style scoped>
/* minimal */
</style>
