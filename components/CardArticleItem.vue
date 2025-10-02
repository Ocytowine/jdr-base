<template>
  <article :class="articleClass">
    <div class="relative h-40 w-full overflow-hidden bg-slate-200">
      <img :src="imageSrc" :alt="title" class="h-full w-full object-cover" loading="lazy" />
      <span class="absolute left-3 top-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass">
        {{ statusLabel }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-4 bg-white px-5 pb-5 pt-6 text-slate-900">
      <div class="space-y-1">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-lg font-semibold leading-tight">{{ title }}</h3>
          <span v-if="typeLabel" class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {{ typeLabel }}
          </span>
        </div>
        <p v-if="description" class="text-sm text-slate-600 line-clamp-3 whitespace-pre-line">
          {{ description }}
        </p>
      </div>
      <dl class="grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantité</dt>
          <dd class="mt-0.5 text-slate-900">{{ quantity }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Poids total</dt>
          <dd class="mt-0.5 text-slate-900">{{ weightTotalLabel }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Poids unitaire</dt>
          <dd class="mt-0.5 text-slate-900">{{ weightPerUnitLabel }}</dd>
        </div>
        <div v-if="coinsLabel">
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Monnaie</dt>
          <dd class="mt-0.5 text-slate-900">{{ coinsLabel }}</dd>
        </div>
        <div v-if="sellValueLabel">
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valeur de vente</dt>
          <dd class="mt-0.5 text-slate-900">{{ sellValueLabel }}</dd>
        </div>
      </dl>
      <div class="mt-auto flex items-center justify-between gap-3 pt-2">
        <p class="text-xs text-slate-500">
          <span class="font-semibold" v-if="kept">Conservé</span>
          <span class="font-semibold" v-else>Marqué pour vente</span>
        </p>
        <button type="button" :class="buttonClass" @click="handleToggle">
          {{ kept ? 'Vendre' : 'Ajouter' }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const DEFAULT_IMAGE = '/images/card.jpg';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string | null;
    image?: string | null;
    typeLabel?: string | null;
    quantity?: number;
    weightPerUnit?: number;
    weightTotal?: number;
    coinsLabel?: string | null;
    sellValueLabel?: string | null;
    kept: boolean;
  }>(),
  {
    description: null,
    image: null,
    typeLabel: null,
    quantity: 1,
    weightPerUnit: 0,
    weightTotal: 0,
    coinsLabel: null,
    sellValueLabel: null
  }
);

const emit = defineEmits<{ (event: 'toggle'): void }>();

const imageSrc = computed(() => {
  if (typeof props.image === 'string') {
    const trimmed = props.image.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return DEFAULT_IMAGE;
});

const formatWeight = (value: number | null | undefined): string => {
  const numeric = Number.isFinite(value) ? Number(value) : 0;
  if (!numeric) {
    return '0 kg';
  }
  if (Math.abs(numeric) >= 10) {
    return `${numeric.toFixed(0)} kg`;
  }
  return `${numeric.toFixed(1)} kg`;
};

const weightPerUnitLabel = computed(() => formatWeight(props.weightPerUnit));
const weightTotalLabel = computed(() => formatWeight(props.weightTotal));

const statusLabel = computed(() => (props.kept ? 'Conservé' : 'Vendu'));
const statusClass = computed(() =>
  props.kept
    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
);

const articleClass = computed(() => {
  const base =
    'group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200';
  return props.kept
    ? `${base} hover:-translate-y-0.5 hover:shadow-lg`
    : `${base} border-dashed opacity-95 hover:shadow`;
});

const buttonClass = computed(() =>
  props.kept
    ? 'inline-flex items-center rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50'
    : 'inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700'
);

const handleToggle = () => {
  emit('toggle');
};
</script>
