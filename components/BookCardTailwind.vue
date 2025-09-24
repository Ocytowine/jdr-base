<template>
  <div
    class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition"
  >
    <div class="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
      <img
        v-if="hasImage"
        :src="resolvedImage"
        :alt="`Illustration ${name}`"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-medium text-slate-600"
      >
        <span>{{ initials }}</span>
      </div>
    </div>
    <div class="flex flex-1 flex-col gap-3 p-4">
      <p class="text-base font-semibold leading-tight text-slate-900">
        {{ name }}
      </p>
      <p class="flex-1 whitespace-pre-line text-sm leading-snug text-slate-600" v-if="descriptionContent">
        {{ descriptionContent }}
      </p>
      <p v-else class="flex-1 text-sm italic leading-snug text-slate-500">
        Aucune description disponible.
      </p>
      <div
        v-if="effectLabelContent"
        class="rounded-md bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
      >
        {{ effectLabelContent }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    description?: string | null;
    effectLabel?: string | null;
    effect_label?: string | null;
    image?: string | null;
  }>(),
  {
    description: null,
    effectLabel: null,
    effect_label: null,
    image: null
  }
);

const trimmed = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const result = value.trim();
  return result.length ? result : null;
};

const resolvedEffectLabel = computed(() => trimmed(props.effectLabel) ?? trimmed(props.effect_label));
const descriptionContent = computed(() => trimmed(props.description));
const effectLabelContent = computed(() => resolvedEffectLabel.value ?? null);

const resolvedImage = computed(() => trimmed(props.image));
const hasImage = computed(() => Boolean(resolvedImage.value));

const initials = computed(() => {
  const parts = props.name
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .slice(0, 2);
  if (!parts.length) {
    return '—';
  }
  const candidate = parts.map((segment) => segment[0]!.toUpperCase()).join('');
  return candidate || '—';
});
</script>
