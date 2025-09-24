<template>
  <div class="p-4 max-w-4xl mx-auto space-y-8 text-slate-100">
    <header class="space-y-2">
      <h2 class="text-3xl font-semibold">Création de personnage</h2>
      <p class="text-sm text-slate-300">
        Sélectionnez les fondations de votre bonôme, ajustez ses caractéristiques puis appliquez les choix suggérés.
        Une fois l'ensemble validé, vous pourrez afficher un aperçu complet.
      </p>
    </header>

    <section class="rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-sm">
      <div class="border-b border-white/10 px-6 py-4">
        <h3 class="text-lg font-semibold">Identité du bonôme</h3>
        <p class="text-xs text-slate-300">Choisissez une option obligatoire dans chaque catégorie.</p>
      </div>
      <div class="space-y-6 p-6">
        <div
          v-for="group in primarySelectionGroups"
          :key="group.id"
          class="rounded-2xl border border-white/10 bg-slate-900/40 shadow-inner"
        >
          <div class="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 class="text-base font-semibold">{{ group.title }}</h4>
              <p class="text-xs text-slate-400">1 sélection requise</p>
            </div>
            <div class="text-xs text-slate-300">
              Option sélectionnée :
              <span class="font-medium text-white">{{ getPrimarySelectedLabel(group) }}</span>
            </div>
          </div>

          <div class="-mx-1 overflow-x-auto px-4 py-4">
            <div class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 pb-2">
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="rounded-xl border border-white/10 bg-white/10 p-4 text-left shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                :class="{
                  'ring-2 ring-sky-400 border-sky-400 shadow-lg bg-white/20': group.selected === option.id
                }"
                :aria-pressed="group.selected === option.id"
                @click="selectPrimaryOption(group.id, option.id)"
              >
                <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-800">
                  <img
                    :src="option.image"
                    :alt="`Illustration ${option.label}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div class="mt-3 space-y-1">
                  <div class="text-base font-medium text-white">{{ option.label }}</div>
                  <div class="text-sm leading-snug text-slate-300 min-h-[3.5rem]">{{ option.description }}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm space-y-6">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="block text-sm font-medium text-slate-200">
          Nom du personnage
          <input
            v-model="characterName"
            type="text"
            placeholder="Ex. Maître Arcaniste"
            class="mt-2 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </label>
        <label class="block text-sm font-medium text-slate-200">
          Niveau
          <input
            v-model.number="niveau"
            type="number"
            min="1"
            max="20"
            class="mt-2 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </label>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Caractéristiques de base</h3>
        <div class="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
          <label v-for="(value, key) in baseStats" :key="key" class="block text-xs font-medium uppercase tracking-wide text-slate-300">
            {{ key }}
            <input
              v-model.number="baseStats[key]"
              type="number"
              class="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/60 px-2 py-1 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </label>
        </div>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          :disabled="loading"
          @click="sendPreview"
        >
          {{ loading ? 'Prévisualisation…' : 'Actualiser la prévisualisation' }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          @click="resetChosenOptions"
        >
          Réinitialiser toutes les sélections
        </button>
      </div>
    </section>

    <section v-if="pendingChoices.length" class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
      <header class="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">Choix à appliquer</h3>
          <p class="text-xs text-slate-300">{{ pendingChoices.length }} sélection(s) en attente.</p>
        </div>
        <span class="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
          Complétez ces choix pour débloquer la prévisualisation finale.
        </span>
      </header>

      <div class="mt-4 space-y-5">
        <article
          v-for="(choice, idx) in pendingChoices"
          :key="getChoiceKey(choice, idx) ?? idx"
          class="rounded-xl border border-white/10 bg-slate-900/40 p-4 shadow-inner"
        >
          <div class="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="text-base font-semibold text-white">{{ getChoiceTitle(choice) }}</div>
              <div class="text-xs text-slate-300">
                Choisir {{ getChoiceRequirement(choice) }} option(s) — catégorie : {{ getChoiceCategoryLabel(choice) }}
              </div>
            </div>
            <div class="text-xs text-slate-400">Source : {{ getChoiceSourceLabel(choice) }}</div>
          </div>

          <div class="mt-4 space-y-3">
            <div class="-mx-1 overflow-x-auto px-1">
              <div class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 pb-2">
                <button
                  v-for="(option, optionIndex) in getChoiceOptions(choice)"
                  :key="typeof option.value === 'object' ? optionIndex : (option.value ?? optionIndex)"
                  type="button"
                  class="rounded-xl border border-white/10 bg-white/10 p-4 text-left shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  :class="{
                    'ring-2 ring-sky-400 border-sky-400 shadow-lg bg-white/20': isChoiceOptionSelected(choice, option),
                    'opacity-60 cursor-not-allowed': isChoiceOptionDisabled(choice, option)
                  }"
                  :disabled="isChoiceOptionDisabled(choice, option)"
                  @click="handleChoiceOptionClick(choice, option)"
                >
                  <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-800">
                    <img
                      :src="getChoiceOptionImage(option)"
                      :alt="`Illustration ${option.label}`"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div class="mt-3 space-y-1">
                    <div class="text-base font-medium text-white">{{ option.label }}</div>
                    <div class="text-sm leading-snug text-slate-300 min-h-[3.5rem]">
                      {{ getChoiceOptionDescription(option) }}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>Sélection : {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}</span>
              <span v-if="getChoiceRequirement(choice) > 1" class="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">
                Sélection multiple autorisée
              </span>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                @click="applyChoice(choice)"
              >
                Appliquer ce choix
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="!hasLocalChoiceValue(choice)"
                @click="resetChoice(choice)"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="appliedChoices.length" class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
      <header class="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-lg font-semibold text-white">Choix appliqués</h3>
          <p class="text-xs text-slate-300">Les options validées sont listées ci-dessous.</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          @click="resetChosenOptions"
        >
          Effacer tous les choix
        </button>
      </header>

      <ul class="mt-4 space-y-3">
        <li
          v-for="choice in appliedChoices"
          :key="choice.id"
          class="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-4 shadow-inner sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <div class="text-sm font-semibold text-white">{{ choice.label }}</div>
            <div class="text-sm text-slate-300">{{ choice.displayValue }}</div>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            @click="resetChoiceById(choice.id)"
          >
            Retirer
          </button>
        </li>
      </ul>
    </section>

    <section class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
      <button
        type="button"
        class="text-sm font-medium text-slate-200 underline-offset-4 hover:underline"
        @click="showRaw = !showRaw"
      >
        {{ showRaw ? 'Masquer la réponse brute (debug)' : 'Afficher la réponse brute (debug)' }}
      </button>
      <div v-if="showRaw" class="mt-4 max-h-[400px] overflow-auto rounded-xl bg-slate-900/80 p-4 text-xs text-slate-100">
        <pre class="whitespace-pre-wrap">{{ rawText }}</pre>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const creation = useBonomeCreationStore();

const {
  primarySelectionGroups,
  niveau,
  characterName,
  baseStats,
  preview,
  loading,
  showRaw,
  rawText,
  appliedChoices
} = storeToRefs(creation);

const {
  selectPrimaryOption,
  getPrimarySelectedLabel,
  getChoiceKey,
  getChoiceTitle,
  getChoiceRequirement,
  getChoiceCategoryLabel,
  getChoiceSourceLabel,
  getChoiceOptions,
  getChoiceOptionImage,
  getChoiceOptionDescription,
  getLocalChoiceCount,
  isChoiceOptionSelected,
  handleChoiceOptionClick,
  isChoiceOptionDisabled,
  hasLocalChoiceValue,
  applyChoice,
  resetChoice,
  resetChosenOptions,
  resetChoiceById,
  sendPreview
} = creation;

const pendingChoices = computed(() => (preview.value?.pendingChoices ?? []) as any[]);
</script>

<style scoped>
/* Styles additionnels gérés via classes utilitaires */
</style>
