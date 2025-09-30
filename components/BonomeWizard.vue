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

    <!-- Identité -->
    <section
      v-if="isCurrentStep('identity')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-slate-700">Nom du personnage</label>
          <input
            v-model="characterName"
            type="text"
            placeholder="Aventurier sans nom"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p class="font-semibold text-slate-700">Aperçu rapide</p>
          <p class="mt-2">Nom affiché : {{ displayCharacterName }}</p>
          <p>Portrait généré : {{ displayCharacterName }}</p>
        </div>
      </div>

      <div v-if="backgroundGroup" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">Historique</h3>
          <span class="text-sm text-slate-600">
            Sélection actuelle :
            {{ backgroundGroup ? getPrimarySelectedLabel(backgroundGroup) : '—' }}
          </span>
        </div>
        <div class="-mx-1 px-1">
          <div class="grid grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
            <CardArticleSpells
              v-for="option in backgroundGroup.options"
              :key="option.id"
              :title="option.label"
              :description="option.description"
              :effact-label="option.effectLabel ?? undefined"
              :image="option.image"
              role="option"
              :aria-selected="backgroundGroup.selected === option.id"
              :selection-state="backgroundGroup.selected === option.id ? 'write' : 'none'"
              :class="[
                'snap-center focus-within:ring-2 focus-within:ring-blue-500',
                backgroundGroup.selected === option.id
                  ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                  : 'hover:border-slate-300 hover:shadow'
              ]"
              @write="selectPrimaryOption('background', option.id)"
              @write-prepare="selectPrimaryOption('background', option.id)"
              @reset="resetPrimarySelection('background', option.id)"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Race -->
    <section
      v-else-if="isCurrentStep('race')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Choix de la race</h3>
        <p class="text-sm text-slate-600">Sélectionnez la race correspondant à votre personnage.</p>
      </div>
      <div v-if="raceGroup" class="-mx-1 px-1">
        <div class="grid grid-flow-col auto-cols-[320px] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          <CardArticleSpells
            v-for="option in raceGroup.options"
            :key="option.id"
            :title="option.label"
            :description="option.description"
            :effact-label="option.effectLabel ?? undefined"
            :image="option.image"
            role="option"
            :aria-selected="raceGroup.selected === option.id"
            :selection-state="raceGroup.selected === option.id ? 'write' : 'none'"
            :class="[
              'snap-center focus-within:ring-2 focus-within:ring-blue-500',
              raceGroup.selected === option.id
                ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                : 'hover:border-slate-300 hover:shadow'
            ]"
            @write="selectPrimaryOption('race', option.id)"
            @write-prepare="selectPrimaryOption('race', option.id)"
            @reset="resetPrimarySelection('race', option.id)"
          />
        </div>
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Classe -->
    <section
      v-else-if="isCurrentStep('class')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Choix de la classe</h3>
        <p class="text-sm text-slate-600">Sélectionnez la classe principale de votre bonôme.</p>
      </div>
      <div v-if="classGroup" class="-mx-1 px-1">
        <div class="grid grid-flow-col auto-cols-[320px] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          <CardArticleSpells
            v-for="option in classGroup.options"
            :key="option.id"
            :title="option.label"
            :description="option.description"
            :effact-label="option.effectLabel ?? undefined"
            :image="option.image"
            role="option"
            :aria-selected="classGroup.selected === option.id"
            :selection-state="classGroup.selected === option.id ? 'write' : 'none'"
            :class="[
              'snap-center focus-within:ring-2 focus-within:ring-blue-500',
              classGroup.selected === option.id
                ? 'ring-2 ring-blue-500 border-blue-500 shadow-md'
                : 'hover:border-slate-300 hover:shadow'
            ]"
            @write="selectPrimaryOption('class', option.id)"
            @write-prepare="selectPrimaryOption('class', option.id)"
            @reset="resetPrimarySelection('class', option.id)"
          />
        </div>
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Niveau et caractéristiques -->
    <section
      v-else-if="isCurrentStep('level')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-slate-700">Niveau</label>
          <input
            v-model.number="niveau"
            type="number"
            min="1"
            max="20"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p class="font-semibold text-slate-700">Conseil</p>
          <p class="mt-2">
            Ajustez les caractéristiques de base selon la méthode de génération choisie pour votre table.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div v-for="key in baseStatKeys" :key="key" class="rounded-lg border border-slate-200 p-4 shadow-sm">
          <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">{{ key }}</label>
          <input
            v-model.number="baseStats[key]"
            type="number"
            class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Choix complémentaires -->
    <section
      v-else-if="isCurrentStep('choices')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
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
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Matériel -->
    <section
      v-else-if="isCurrentStep('equipment')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Matériel</h3>
        <p class="text-sm text-slate-600">Placeholder pour la future sélection de matériel.</p>
      </div>
      <textarea
        v-model="materialNotes"
        rows="6"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder="Listez ici les idées de matériel à intégrer plus tard."
      ></textarea>
      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Description -->
    <section
      v-else-if="isCurrentStep('description')"
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-slate-900">Description</h3>
        <p class="text-sm text-slate-600">
          Rédigez quelques lignes sur l'histoire, la personnalité ou les objectifs de votre personnage.
        </p>
      </div>
      <textarea
        v-model="descriptionNotes"
        rows="8"
        class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        placeholder="Décrivez l'allure, les motivations et les traits marquants de votre bonôme."
      ></textarea>
      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>

    <!-- Récapitulatif -->
    <section
      v-else
      class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm"
    >
      <div class="space-y-3">
        <h3 class="text-lg font-semibold text-slate-900">Récapitulatif</h3>
        <p class="text-sm text-slate-600">Vérifiez les informations avant la génération finale du personnage.</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-3">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Identité</h4>
          <ul class="space-y-2 text-sm text-slate-700">
            <li><span class="font-medium">Nom :</span> {{ displayCharacterName }}</li>
            <li
              v-for="entry in identitySummary"
              :key="entry.id"
            >
              <span class="font-medium">{{ entry.title }} :</span> {{ entry.name }}
            </li>
          </ul>
        </div>
        <div class="space-y-3">
          <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Caractéristiques</h4>
          <ul class="grid grid-cols-2 gap-2 text-sm text-slate-700">
            <li v-for="(value, key) in displayStats" :key="key" class="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span class="font-medium uppercase">{{ key }}</span>
              <span class="ml-2">{{ value }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="space-y-3">
        <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Choix appliqués</h4>
        <ul v-if="appliedChoices.length" class="space-y-2 text-sm text-slate-700">
          <li v-for="choice in appliedChoices" :key="choice.id" class="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span class="font-semibold">{{ choice.label }} :</span> {{ choice.displayValue }}
          </li>
        </ul>
        <p v-else class="text-sm text-slate-500">Aucun choix complémentaire appliqué.</p>
      </div>

      <div class="space-y-3">
        <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes personnelles</h4>
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <p class="font-semibold text-slate-800">Matériel</p>
          <p class="text-slate-600">{{ materialNotes || 'Aucun matériel personnalisé noté.' }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <p class="font-semibold text-slate-800">Description</p>
          <p class="text-slate-600 whitespace-pre-line">{{ descriptionNotes || 'Aucune description fournie.' }}</p>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="handleCancel">Annuler</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="handleValidate">
          Valider
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';

import CardArticleSpells from '~/components/CardArticleSpells.vue';
import { useBonomeCreationStore } from '~/stores/bonomeCreation';

type StepId =
  | 'identity'
  | 'race'
  | 'class'
  | 'level'
  | 'choices'
  | 'equipment'
  | 'description'
  | 'recap';

type StepDefinition = {
  id: StepId;
  title: string;
  shortTitle: string;
  description?: string;
  onValidate?: () => Promise<void> | void;
  onReset?: () => Promise<void> | void;
};

const creation = useBonomeCreationStore();

const {
  primarySelectionGroups,
  niveau,
  preview,
  appliedChoices,
  selectedClass,
  selectedRace,
  selectedBackground,
  characterName,
  identitySummary,
  displayCharacterName,
  displayStats
} = storeToRefs(creation);

const baseStats = creation.baseStats;
const materialNotes = ref('');
const descriptionNotes = ref('');
const currentStep = ref<number>(0);

const defaultBaseStats = {
  strength: 8,
  dexterity: 14,
  constitution: 12,
  intelligence: 16,
  wisdom: 10,
  charisma: 11
} as const;

const refreshPreview = async () => {
  await creation.sendPreview();
};

const resetIdentity = async () => {
  characterName.value = '';
  selectedBackground.value = '';
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

type BaseStatKey = keyof typeof defaultBaseStats;

const baseStatKeys = computed(() => Object.keys(defaultBaseStats) as BaseStatKey[]);

const resetLevelAndStats = async () => {
  niveau.value = 1;
  baseStatKeys.value.forEach((key) => {
    baseStats[key] = defaultBaseStats[key];
  });
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
  materialNotes.value = '';
};

const resetDescription = () => {
  descriptionNotes.value = '';
};

const steps: StepDefinition[] = [
  {
    id: 'identity',
    title: 'Identité du personnage',
    shortTitle: 'Identité',
    description: "Définissez le nom et l'historique de votre bonôme.",
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

const activeStep = computed(() => steps[currentStep.value] ?? steps[0]);

const backgroundGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'background') ?? null);
const raceGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'race') ?? null);
const classGroup = computed(() => primarySelectionGroups.value.find((group) => group.id === 'class') ?? null);

const isCurrentStep = (id: StepId) => activeStep.value.id === id;

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
  getPrimarySelectedLabel,
  resetChoice,
  hasLocalChoiceValue,
  resetChoiceById,
  selectPrimaryOption
} = creation;

const resetPrimarySelection = (
  groupId: 'class' | 'race' | 'background',
  optionId: string
) => {
  const map = {
    class: selectedClass,
    race: selectedRace,
    background: selectedBackground
  } as const;
  const target = map[groupId];
  if (!target) return;
  if (target.value === optionId) {
    target.value = '';
  }
};

const resetChoiceOption = (choice: any, option: any) => {
  if (isChoiceOptionSelected(choice, option)) {
    handleChoiceOptionClick(choice, option);
  }
};

onMounted(() => {
  creation.initialize();
});
</script>
