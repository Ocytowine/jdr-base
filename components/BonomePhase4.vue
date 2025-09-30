<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="grid gap-6 md:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-slate-700">Niveau</label>
        <input
          v-model.number="niveau"
          type="number"
          min="1"
          max="3"
          class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <p class="mt-1 text-xs text-slate-500">Le niveau est limité entre 1 et 3.</p>
      </div>
      <div class="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <div>
          <p class="font-semibold text-slate-700">Budget de points</p>
          <p class="mt-1 text-xs text-slate-500">
            Chaque caractéristique doit rester entre {{ pointBuyMin }} et {{ pointBuyMax }}.
          </p>
        </div>
        <div class="rounded-md border border-slate-200 bg-white px-3 py-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Points restants</p>
          <p :class="['text-base font-semibold', pointBuyStatusClass]">{{ pointBuyStatus.message }}</p>
          <p class="text-xs text-slate-500">Coût total : {{ pointBuySpent }} / {{ pointBuyBudget }}</p>
        </div>
        <p class="text-xs text-slate-500">
          Ajustez les caractéristiques en respectant votre budget de 27 points.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div v-for="key in baseStatKeys" :key="key" class="space-y-3 rounded-lg border border-slate-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ key }}</p>
            <p class="text-xs text-slate-400">Coût : {{ pointBuyCostFor(baseStats[key]) }} pts</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-base font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              :aria-label="`Diminuer ${key}`"
              :disabled="!canDecreaseStat(key)"
              @click="handleDecreaseStat(key)"
            >
              −
            </button>
            <span class="w-10 text-center text-lg font-semibold text-slate-900">{{ baseStats[key] }}</span>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-base font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              :aria-label="`Augmenter ${key}`"
              :disabled="!canIncreaseStat(key)"
              @click="handleIncreaseStat(key)"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button
        type="button"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        :class="!isPointBuyBalanced ? 'cursor-not-allowed opacity-60' : ''"
        :disabled="!isPointBuyBalanced"
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

import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Informations d'étape utilisées pour la navigation.
   */
  stepMeta: BonomePhaseMeta;
}>();

const creation = useBonomeCreationStore();
const {
  niveau,
  pointBuyBudget,
  pointBuyRemaining,
  pointBuySpent,
  isPointBuyBalanced,
  pointBuyMin,
  pointBuyMax
} = storeToRefs(creation);

const baseStats = creation.baseStats;
const { pointBuyCostFor } = creation;

type BaseStatKey = keyof typeof baseStats;

const baseStatKeys = computed(() => Object.keys(baseStats) as BaseStatKey[]);

const pointBuyStatus = computed(() => {
  const remaining = pointBuyRemaining.value;
  if (remaining < 0) {
    return { message: `Budget dépassé de ${Math.abs(remaining)} pts`, tone: 'error' as const };
  }
  if (remaining > 0) {
    return { message: `${remaining} pts à répartir`, tone: 'warn' as const };
  }
  return { message: 'Budget équilibré', tone: 'ok' as const };
});

const pointBuyStatusClass = computed(() => {
  switch (pointBuyStatus.value.tone) {
    case 'error':
      return 'text-red-600';
    case 'warn':
      return 'text-amber-600';
    default:
      return 'text-emerald-600';
  }
});

const handleIncreaseStat = (key: BaseStatKey) => {
  creation.increaseBaseStat(key);
};

const handleDecreaseStat = (key: BaseStatKey) => {
  creation.decreaseBaseStat(key);
};

const canIncreaseStat = (key: BaseStatKey) => creation.canIncreaseBaseStat(key);
const canDecreaseStat = (key: BaseStatKey) => creation.canDecreaseBaseStat(key);

const stepMeta = computed(() => props.stepMeta);
</script>
