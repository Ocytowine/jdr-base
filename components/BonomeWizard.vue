<template>
  <div class="wizard">
    <header class="wizard__header">
      <div class="wizard__top">
        <div class="wizard__meta">
          <p class="wizard__step-summary">
            Étape {{ currentStep + 1 }} / {{ steps.length }}
          </p>
          <h2 class="wizard__title">{{ activeStep.title }}</h2>
          <p v-if="activeStep.description" class="wizard__description">
            {{ activeStep.description }}
          </p>
        </div>
      </div>

      <nav class="wizard__nav">
        <span
          v-for="(step, index) in steps"
          :key="step.id"
          :class="[
            'wizard__nav-item',
            index === currentStep
              ? 'wizard__nav-item--active'
              : index < currentStep
                ? 'wizard__nav-item--done'
                : 'wizard__nav-item--upcoming'
          ]"
        >
          <span class="wizard__nav-index">{{ index + 1 }}</span>
          <span>{{ step.shortTitle }}</span>
        </span>
      </nav>
    </header>

    <div class="wizard__phase">
      <component
        :is="activePhase.component"
        v-bind="phaseProps"
        @validate="handleValidate"
        @cancel="handleCancel"
        @refresh="handleRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';

import type { BonomePhaseComponentConfig, BonomePhaseMeta, BonomePhaseProps } from '@/components/bonomePhases';
import {
  DESCRIPTION_FIELD_DEFINITIONS,
  MATERIAL_SLOT_DEFINITIONS,
  useBonomeCreationStore
} from '@/stores/bonomeCreation';

const creation = useBonomeCreationStore();

const {
  primarySelectionGroups,
  preview,
  selectedClass,
  selectedBackground,
  selectedRace,
  characterFirstName,
  characterLastName,
  characterNickname,
  niveau
} = storeToRefs(creation);

const refreshPreview = async () => {
  await creation.sendPreview();
};

const resetIdentity = async () => {
  characterFirstName.value = '';
  characterLastName.value = '';
  characterNickname.value = '';
  await refreshPreview();
};

const resetRace = async () => {
  selectedRace.value = '';
  await refreshPreview();
};

const resetClass = async () => {
  selectedClass.value = '';
  await refreshPreview();
};
const resetBackground = async () => {
  selectedBackground.value = '';
  await refreshPreview();
};


const resetLevelAndStats = async () => {
  niveau.value = 1;
  creation.resetBaseStats();
  await refreshPreview();
};

const resetComplementaryChoices = async () => {
  const keys = Object.keys(creation.chosenOptions);
  await Promise.all(keys.map((key) => creation.resetChoiceById(key)));
  Object.keys(creation.localChosen).forEach((key) => {
    delete creation.localChosen[key];
  });
  Object.keys(creation.choiceOptionCache).forEach((key) => {
    delete creation.choiceOptionCache[key];
  });
  Object.keys(creation.choiceMetadata).forEach((key) => {
    delete creation.choiceMetadata[key];
  });
  await refreshPreview();
};

const resetEquipment = () => {
  MATERIAL_SLOT_DEFINITIONS.forEach(({ id }) => {
    creation.materialPlan[id] = '';
  });
  creation.materialPlan.notes = '';
};

const resetDescription = () => {
  DESCRIPTION_FIELD_DEFINITIONS.forEach(({ id }) => {
    creation.descriptionFields[id] = '';
  });
};

const finalizePreview = async () => {
  await creation.sendPreview();
};

const steps: BonomePhaseMeta[] = [
  {
    id: 'identity',
    title: 'Identité du personnage',
    shortTitle: 'Identité',
    description: 'Définissez le nom complet de votre bonôme.',
    onReset: resetIdentity
  },
  {
    id: 'race',
    title: 'Selection de la race',
    shortTitle: 'Race',
    description: 'Choisissez la race principale pour votre personnage.',
    onReset: resetRace
  },
  {
    id: 'class',
    title: 'Selection de la classe',
    shortTitle: 'Classe',
    description: 'Choisissez la classe principale de votre bonome.',
    onReset: resetClass
  },
  {
    id: 'background',
    title: "Selection de l'historique",
    shortTitle: 'Historique',
    description: "Choisissez l'historique principal de votre personnage.",
    onReset: resetBackground
  },
  {
    id: 'level',
    title: 'Niveau et caracteristiques',
    shortTitle: 'Caracs',
    description: 'Ajustez le niveau et les valeurs de base de vos caracteristiques.',
    onReset: resetLevelAndStats
  },
  {
    id: 'choices',
    title: 'Choix complémentaires',
    shortTitle: 'Choix',
    description: "Appliquez les options supplémentaires générées par l'assistant.",
    onReset: resetComplementaryChoices
  },
  {
    id: 'equipment',
    title: 'Matériel et équipement',
    shortTitle: 'Matériel',
    description: 'Préparez les notes de matériel à intégrer ultérieurement.',
    onReset: resetEquipment
  },
  {
    id: 'description',
    title: 'Description du bonôme',
    shortTitle: 'Description',
    description: 'Rédigez les éléments narratifs de votre personnage.',
    onReset: resetDescription,

    onValidate: finalizePreview
  },
  {
    id: 'recap',
    title: 'Récapitulatif final',
    shortTitle: 'Récapitulatif',
    description: 'Relisez et confirmez les informations avant la finalisation.',
  }
];

const phases: BonomePhaseComponentConfig[] = [
  { id: 'identity', component: defineAsyncComponent(() => import('@/components/BonomePhase1.vue')) },
  { id: 'race', component: defineAsyncComponent(() => import('@/components/BonomePhase2.vue')) },
  { id: 'class', component: defineAsyncComponent(() => import('@/components/BonomePhase3.vue')) },
  { id: 'background', component: defineAsyncComponent(() => import('@/components/BonomePhaseBackground.vue')) },
  { id: 'level', component: defineAsyncComponent(() => import('@/components/BonomePhase4.vue')) },
  { id: 'choices', component: defineAsyncComponent(() => import('@/components/BonomePhase5.vue')) },
  { id: 'equipment', component: defineAsyncComponent(() => import('@/components/BonomePhase6.vue')) },
  { id: 'description', component: defineAsyncComponent(() => import('@/components/BonomePhase7.vue')) },
  { id: 'recap', component: defineAsyncComponent(() => import('@/components/BonomePhase8.vue')) }
];

const currentStep = ref(0);

const shouldSendPreviewAfterStep = (id: string | undefined) =>
  id === 'level' || id === 'choices' || id === 'equipment' || id === 'description';


const activeStep = computed(() => steps[currentStep.value] ?? steps[0]);
const activePhase = computed(() => phases.find((phase) => phase.id === activeStep.value.id) ?? phases[0]);

const raceGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'race') ?? null);
const classGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'class') ?? null);
const backgroundGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'background') ?? null);

const phaseProps = computed<BonomePhaseProps>(() => {
  const base: BonomePhaseProps = { stepMeta: activeStep.value };
  switch (activeStep.value.id) {
    case 'race':
      return { ...base, raceGroup: raceGroup.value };
    case 'class':
      return { ...base, classGroup: classGroup.value };
    case 'background':
      return { ...base, backgroundGroup: backgroundGroup.value };
    case 'choices':
      return { ...base, preview: preview.value };
    case 'recap':
      return { ...base, preview: preview.value };
    default:
      return base;
  }
});

const goToStep = (index: number) => {
  if (index < 0) {
    currentStep.value = 0;
    return;
  }
  if (index >= steps.length) {
    currentStep.value = steps.length - 1;
    return;
  }
  currentStep.value = index;
};

const handleValidate = async () => {
  const step = activeStep.value;
  if (step?.onValidate) {
    await step.onValidate();
  }
  if (shouldSendPreviewAfterStep(step?.id)) {
    await creation.sendPreview();
  }
  if (currentStep.value < steps.length - 1) {
    goToStep(currentStep.value + 1);
  }
};

const handleCancel = () => {
  if (currentStep.value > 0) {
    goToStep(currentStep.value - 1);
  }
};

const handleRefresh = async () => {
  await refreshPreview();
};

onMounted(() => {
  creation.initialize({ restoreFromStorage: true });
});
</script>

<style scoped>
.wizard {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.wizard__header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, var(--carte), var(--carte-2));
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
}

.wizard__top {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (min-width: 640px) {
  .wizard__top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.wizard__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 640px;
}

.wizard__step-summary {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--accent-2);
  font-weight: 600;
}

.wizard__title {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  color: var(--texte);
}

.wizard__description {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
}

.wizard__counter {
  align-self: flex-start;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--accent-border-soft);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.4px;
}

@media (min-width: 640px) {
  .wizard__counter {
    align-self: center;
  }
}

.wizard__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.wizard__nav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--bord);
  background: var(--surface-overlay);
  color: var(--texte-2);
  font-size: 12px;
  font-weight: 600;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.wizard__nav-item--active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-2);
  box-shadow: 0 8px 24px var(--accent-soft);
}

.wizard__nav-item--done {
  border-color: var(--ok-soft-border);
  background: var(--ok-soft);
  color: var(--ok);
}

.wizard__nav-item--upcoming {
  opacity: 0.75;
}

.wizard__nav-index {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 11px;
  line-height: 1;
}

.wizard__phase {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
