<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Matériel</h3>
      <p class="text-sm text-slate-600">
        Vérifiez l’équipement proposé par votre classe et votre historique. Conservez les objets nécessaires ou vendez ceux
        dont vous n’avez pas besoin afin d’alimenter votre bourse.
      </p>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 class="text-sm font-semibold text-slate-700">Résumé de l’inventaire</h4>
      <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Poids transporté</p>
          <p class="mt-1 text-base font-semibold text-slate-900">
            {{ formatWeight(materialSummary.totalWeightKept) }} / {{ formatWeight(materialSummary.carryCapacity) }}
          </p>
          <p class="text-xs text-slate-500">
            Inventaire complet : {{ formatWeight(materialSummary.totalWeightAll) }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Gains issus des ventes</p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatCoins(materialSummary.salesCoins) }}</p>
          <p class="text-xs text-slate-500">Les objets vendus sont automatiquement convertis en pièces.</p>
        </div>
        <div class="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Contenu de la {{ materialSummary.coinPurse.label || 'bourse' }}
          </p>
          <p class="mt-1 text-base font-semibold text-slate-900">{{ formatCoins(materialSummary.coinPurse.final) }}</p>
          <p class="text-xs text-slate-500">Valeur initiale : {{ formatCoins(materialSummary.coinPurse.base) }}</p>
        </div>
      </div>
      <p
        v-if="materialSummary.overCapacity"
        class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
      >
        Le poids total dépasse votre capacité de charge. Vendez ou retirez des objets avant de poursuivre.
      </p>
    </section>

    <section v-if="hasProposals" class="space-y-6">
      <article
        v-for="(group, index) in materialProposals"
        :key="group.effectId ?? `group-${index}`"
        class="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h5 class="text-base font-semibold text-slate-900">
              {{ getGroupTitle(group, index) }}
            </h5>
            <p class="text-xs text-slate-500">
              Objets conservés : {{ countKeptInGroup(group) }} / {{ group.items.length }}
            </p>
          </div>
          <span v-if="group.source" class="text-xs font-medium uppercase tracking-wide text-slate-400">
            Source : {{ group.source }}
          </span>
        </header>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardArticleItem
            v-for="item in group.items"
            :key="item.key"
            :title="item.label"
            :description="item.description"
            :image="item.image"
            :type-label="item.type"
            :quantity="item.quantity"
            :weight-per-unit="item.weightPerUnit"
            :weight-total="item.weightTotal"
            :coins-label="item.totalCoinsCopper ? formatCopper(item.totalCoinsCopper) : null"
            :sell-value-label="item.totalSellValueCopper ? formatCopper(item.totalSellValueCopper) : null"
            :kept="isMaterialItemKept(item.key)"
            @toggle="handleToggle(item.key)"
          />
        </div>
      </article>
    </section>
    <p v-else class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      Aucun matériel spécifique n’est proposé pour cette combinaison de classe et d’historique.
    </p>

    <div class="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">
        Annuler
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-4 py-2 text-sm"
        :disabled="!hasProposals"
        @click="handleReset"
      >
        Réinitialiser
      </button>
      <button
        type="button"
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
        :disabled="materialSummary.overCapacity"
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

import CardArticleItem from '@/components/CardArticleItem.vue';
import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';
import type { MaterialProposalGroup } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  stepMeta: BonomePhaseMeta;
  preview?: any | null;
}>();

const creation = useBonomeCreationStore();
const { materialProposals, materialSummary } = storeToRefs(creation);

const stepMeta = computed(() => props.stepMeta);
const hasProposals = computed(() => materialProposals.value.length > 0);

const formatWeight = (value: number): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  if (!numeric) return '0 kg';
  if (Math.abs(numeric) >= 10) return `${numeric.toFixed(0)} kg`;
  return `${numeric.toFixed(1)} kg`;
};

const copperToCoinsBreakdown = (value: number) => {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const gold = Math.floor(normalized / 100);
  const remainderAfterGold = normalized - gold * 100;
  const silver = Math.floor(remainderAfterGold / 10);
  const copper = remainderAfterGold - silver * 10;
  return { gold, silver, copper };
};

const formatCoins = (coins: { gold: number; silver: number; copper: number } | null | undefined): string => {
  if (!coins) return '0';
  const gold = Math.round(coins.gold ?? 0);
  const silver = Math.round(coins.silver ?? 0);
  const copper = Math.round(coins.copper ?? 0);
  const parts: string[] = [];
  if (gold) parts.push(`${gold} po`);
  if (silver) parts.push(`${silver} pa`);
  if (copper) parts.push(`${copper} pc`);
  return parts.length ? parts.join(', ') : '0';
};

const formatCopper = (value: number) => formatCoins(copperToCoinsBreakdown(value));

const getGroupTitle = (group: MaterialProposalGroup, index: number) => {
  if (group.label && group.label.trim().length) {
    return group.label;
  }
  return `Ensemble ${index + 1}`;
};

const countKeptInGroup = (group: MaterialProposalGroup) =>
  group.items.reduce((acc, item) => acc + (creation.isMaterialItemKept(item.key) ? 1 : 0), 0);

const handleToggle = (key: string) => {
  creation.toggleMaterialItemDecision(key);
};

const handleReset = () => {
  creation.resetMaterialSelections();
};

const isMaterialItemKept = (key: string) => creation.isMaterialItemKept(key);
</script>
