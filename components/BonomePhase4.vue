<template>
  <section :data-step="stepMeta.id" class="phase carte">
    <header class="phase__heading">
      <h3 class="phase__title">Choix du niveau</h3>
      <p class="phase__subtitle">Sélectionnez le niveau de départ et ajustez les caractéristiques de base.</p>
    </header>

    <div class="level-card">
      <div>
        <p class="level-card__title">Niveau</p>
        <p class="level-card__hint">Entre 1 et 3</p>
      </div>
      <div class="level-card__controls">
        <button
          type="button"
          class="stepper"
          :aria-label="'Diminuer le niveau'"
          :disabled="niveau <= 1"
          @click="handleDecreaseLevel"
        >
          -
        </button>
        <span class="level-card__value">{{ niveau }}</span>
        <button
          type="button"
          class="stepper stepper--accent"
          :aria-label="'Augmenter le niveau'"
          :disabled="niveau >= 3"
          @click="handleIncreaseLevel"
        >
          +
        </button>
      </div>
    </div>

    <div class="point-buy">
      <div>
        <p class="point-buy__title">Budget de points</p>
        <p class="point-buy__hint">Chaque caractéristique doit rester entre {{ pointBuyMin }} et {{ pointBuyMax }}.</p>
      </div>
      <div class="point-buy__status">
        <p class="point-buy__label">Points restants</p>
        <p :class="['point-buy__value', pointBuyToneClass]">{{ pointBuyStatus.message }}</p>
        <p class="point-buy__meta">Coût total : {{ pointBuySpent }} / {{ pointBuyBudget }}</p>
      </div>
      <p class="point-buy__caption">Ajustez les caractéristiques en respectant votre budget de 27 points.</p>
      <p class="point-buy__caption">
        Niveau sélectionné : <span class="point-buy__level">{{ niveau }}</span>
      </p>
    </div>

    <div class="stats-grid">
      <div v-for="key in baseStatKeys" :key="key" class="stat-card">
        <div class="stat-card__header">
          <div>
            <p class="stat-card__title">{{ key }}</p>
            <p class="stat-card__cost">Coût : {{ pointBuyCostFor(baseStats[key]) }} pts</p>
          </div>
          <div class="stat-card__controls">
            <button
              type="button"
              class="stepper"
              :aria-label="`Diminuer ${key}`"
              :disabled="!canDecreaseStat(key)"
              @click="handleDecreaseStat(key)"
            >
              -
            </button>
            <span class="stat-card__value">{{ baseStats[key] }}</span>
            <button
              type="button"
              class="stepper stepper--accent"
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

    <div class="phase__actions">
      <button type="button" class="phase__action phase__action--ghost" @click="emit('cancel')">Annuler</button>
      <button
        type="button"
        class="phase__action phase__action--primary"
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

const pointBuyToneClass = computed(() => `point-buy__value--${pointBuyStatus.value.tone}`);

const handleIncreaseLevel = () => {
  if (niveau.value >= 3) return;
  niveau.value = Math.min(3, niveau.value + 1);
};

const handleDecreaseLevel = () => {
  if (niveau.value <= 1) return;
  niveau.value = Math.max(1, niveau.value - 1);
};

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

<style scoped>
.level-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-radius: 16px;
  border: 1px solid var(--bord);
  padding: 20px 22px;
  background: linear-gradient(180deg, rgba(23, 27, 57, 0.9), rgba(14, 18, 38, 0.92));
}

.level-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--texte);
}

.level-card__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--texte-2);
}

.level-card__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-card__value {
  min-width: 48px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-2);
}

.stepper {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--bord);
  background: transparent;
  color: var(--texte-2);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.stepper:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.stepper--accent {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.stepper:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.point-buy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 16px;
  border: 1px dashed var(--bord);
  background: linear-gradient(180deg, rgba(20, 24, 52, 0.85), rgba(12, 16, 38, 0.92));
  padding: 20px 22px;
}

.point-buy__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-2);
}

.point-buy__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.point-buy__status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-buy__label {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--texte-2);
}

.point-buy__value {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-2);
}

.point-buy__value--error {
  color: var(--ko);
}

.point-buy__value--warn {
  color: var(--warn);
}

.point-buy__value--ok {
  color: var(--ok);
}

.point-buy__meta {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
}

.point-buy__caption {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
}

.point-buy__level {
  color: var(--accent-2);
  font-weight: 600;
}

.stats-grid {
  display: grid;
  gap: 16px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.stat-card {
  border-radius: 16px;
  border: 1px solid var(--bord);
  padding: 18px;
  background: linear-gradient(180deg, rgba(22, 26, 54, 0.9), rgba(11, 14, 32, 0.95));
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
}

.stat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.stat-card__title {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.stat-card__cost {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--texte-2);
}

.stat-card__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-card__value {
  min-width: 46px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--texte);
}
</style>
