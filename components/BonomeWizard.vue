<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6">
    <header class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Étape {{ currentStep + 1 }} / {{ steps.length }}
          </p>
          <h2 class="text-2xl font-semibold text-slate-900">{{ activeStep.title }}</h2>
          <p v-if="activeStep.description" class="mt-1 text-sm text-slate-600">
            {{ activeStep.description }}
          </p>
        </div>
        <div class="rounded-full bg-slate-900/5 px-4 py-1 text-sm font-semibold text-slate-700">
          {{ currentStep + 1 }}/{{ steps.length }}
        </div>
      </div>

      <nav class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        <span
          v-for="(step, index) in steps"
          :key="step.id"
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1"
          :class="[
            index === currentStep
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : index < currentStep
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-400'
          ]"
        >
          <span class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px]">
            {{ index + 1 }}
          </span>
          <span>{{ step.shortTitle }}</span>
        </span>
      </nav>
    </header>

    <component
      :is="activePhase.component"
      v-bind="phaseProps"
      @validate="handleValidate"
      @cancel="handleCancel"
      @refresh="handleRefresh"
    />
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

const steps: BonomePhaseMeta[] = [
  {
    id: 'identity',
    title: 'Identité du personnage',
    shortTitle: 'Identité',
    description: 'Définissez le nom complet de votre bonôme.',
    onValidate: refreshPreview,
    onReset: resetIdentity
  },
  {
    id: 'race',
    title: 'Sélection de la race',
    shortTitle: 'Race',
    description: 'Choisissez la race principale pour votre personnage.',
    onValidate: refreshPreview,
    onReset: resetRace
  },
  {
    id: 'class',
    title: 'Sélection de la classe',
    shortTitle: 'Classe',
    description: 'Choisissez la classe principale de votre bonôme.',
    onValidate: refreshPreview,
    onReset: resetClass
  },
  {
    id: 'level',
    title: 'Niveau et caractéristiques',
    shortTitle: 'Caracs',
    description: 'Ajustez le niveau et les valeurs de base de vos caractéristiques.',
    onValidate: refreshPreview,
    onReset: resetLevelAndStats
  },
  {
    id: 'choices',
    title: 'Choix complémentaires',
    shortTitle: 'Choix',
    description: "Appliquez les options supplémentaires générées par l'assistant.",
    onValidate: refreshPreview,
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
    onReset: resetDescription
  },
  {
    id: 'recap',
    title: 'Récapitulatif final',
    shortTitle: 'Récapitulatif',
    description: 'Relisez et confirmez les informations avant la finalisation.',
    onValidate: refreshPreview
  }
];

const phases: BonomePhaseComponentConfig[] = [
  { id: 'identity', component: defineAsyncComponent(() => import('@/components/BonomePhase1.vue')) },
  { id: 'race', component: defineAsyncComponent(() => import('@/components/BonomePhase2.vue')) },
  { id: 'class', component: defineAsyncComponent(() => import('@/components/BonomePhase3.vue')) },
  { id: 'level', component: defineAsyncComponent(() => import('@/components/BonomePhase4.vue')) },
  { id: 'choices', component: defineAsyncComponent(() => import('@/components/BonomePhase5.vue')) },
  { id: 'equipment', component: defineAsyncComponent(() => import('@/components/BonomePhase6.vue')) },
  { id: 'description', component: defineAsyncComponent(() => import('@/components/BonomePhase7.vue')) },
  { id: 'recap', component: defineAsyncComponent(() => import('@/components/BonomePhase8.vue')) }
];

const currentStep = ref(0);

const activeStep = computed(() => steps[currentStep.value] ?? steps[0]);
const activePhase = computed(() => phases.find((phase) => phase.id === activeStep.value.id) ?? phases[0]);

const raceGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'race') ?? null);
const classGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'class') ?? null);

const phaseProps = computed<BonomePhaseProps>(() => {
  const base: BonomePhaseProps = { stepMeta: activeStep.value };
  switch (activeStep.value.id) {
    case 'race':
      return { ...base, raceGroup: raceGroup.value };
    case 'class':
      return { ...base, classGroup: classGroup.value };
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
  if (currentStep.value < steps.length - 1) {
    goToStep(currentStep.value + 1);
  }
};

const handleCancel = async () => {
  const step = activeStep.value;
  if (step?.onReset) {
    await step.onReset();
  }
  if (currentStep.value > 0) {
    goToStep(currentStep.value - 1);
  }
};

const handleRefresh = async () => {
  await refreshPreview();
};

onMounted(() => {
  creation.initialize();
});
</script>
