<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Matériel</h3>
      <p class="phase__subtitle">
        Vérifiez l'équipement proposé par votre classe et votre historique. Conservez les objets nécessaires ou vendez ceux dont
        vous n'avez pas besoin pour alimenter votre bourse.
      </p>
    </header>

    <section class="inventory-summary">
      <h4 class="inventory-summary__title">Résumé de l'inventaire</h4>
      <div class="inventory-summary__grid">
        <div class="inventory-summary__card">
          <p class="inventory-summary__label">Poids transporté</p>
          <p class="inventory-summary__value">
            {{ formatWeight(materialSummary.totalWeightKept) }} / {{ formatWeight(materialSummary.carryCapacity) }}
          </p>
          <p class="inventory-summary__hint">Inventaire complet : {{ formatWeight(materialSummary.totalWeightAll) }}</p>
        </div>
        <div class="inventory-summary__card">
          <p class="inventory-summary__label">Gains issus des ventes</p>
          <p class="inventory-summary__value">{{ formatCoins(materialSummary.salesCoins) }}</p>
          <p class="inventory-summary__hint">Les objets vendus sont automatiquement convertis en pièces.</p>
        </div>
        <div class="inventory-summary__card">
          <p class="inventory-summary__label">Contenu de la {{ materialSummary.coinPurse.label || 'bourse' }}</p>
          <p class="inventory-summary__value">{{ formatCoins(materialSummary.coinPurse.final) }}</p>
          <p class="inventory-summary__hint">Valeur initiale : {{ formatCoins(materialSummary.coinPurse.base) }}</p>
        </div>
      </div>
      <p v-if="materialSummary.overCapacity" class="inventory-summary__alert">
        Le poids total dépasse votre capacité de charge. Vendez ou retirez des objets avant de poursuivre.
      </p>
    </section>

    <section v-if="hasProposals" class="inventory-groups">
      <article
        v-for="(group, index) in materialProposals"
        :key="group.effectId ?? `group-${index}`"
        class="inventory-group"
      >
        <header class="inventory-group__header">
          <div>
            <h5 class="inventory-group__title">{{ getGroupTitle(group, index) }}</h5>
            <p class="inventory-group__subtitle">
              Objets conservés : {{ countKeptInGroup(group) }} / {{ group.items.length }}
            </p>
          </div>
          <span v-if="group.source" class="inventory-group__source">Source : {{ group.source }}</span>
        </header>
        <div class="inventory-group__items">
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
    <p v-else class="phase__message phase__message--info">
      Aucun matériel spécifique n'est proposé pour cette combinaison de classe et d'historique.
    </p>

    <div class="inventory-actions">
      <button type="button" class="phase__action phase__action--ghost" @click="emit('cancel')">
        Annuler
      </button>
      <button
        type="button"
        class="phase__action phase__action--ghost"
        :disabled="!hasProposals"
        @click="handleReset"
      >
        Réinitialiser
      </button>
      <button
        type="button"
        class="phase__action phase__action--primary"
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

<style scoped>
.inventory-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(23, 27, 57, 0.9), rgba(12, 16, 38, 0.92));
  padding: 22px;
}

.inventory-summary__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-2);
}

.inventory-summary__grid {
  display: grid;
  gap: 14px;
}

@media (min-width: 768px) {
  .inventory-summary__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.inventory-summary__card {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 16, 38, 0.6);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inventory-summary__label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.inventory-summary__value {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.inventory-summary__hint {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
}

.inventory-summary__alert {
  margin: 4px 0 0;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--ko-soft-border);
  background: var(--ko-soft);
  color: var(--ko);
  font-size: 13px;
}

.inventory-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.inventory-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(21, 25, 52, 0.9), rgba(10, 13, 30, 0.94));
  padding: 22px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.32);
}

.inventory-group__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  .inventory-group__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.inventory-group__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.inventory-group__subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
}

.inventory-group__source {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent-2);
}

.inventory-group__items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.inventory-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .inventory-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.inventory-actions .phase__action--ghost {
  min-width: 120px;
  text-align: center;
}
</style>
