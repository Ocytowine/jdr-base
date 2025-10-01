<template>
  <article
    :class="articleClass"
    role="button"
    :aria-pressed="selected"
    :aria-disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    @click="onSelect"
    @keydown.enter.prevent="onSelect"
    @keydown.space.prevent="onSelect"
  >
    <div class="relative h-44 w-full">
      <img
        :src="currentImage"
        :alt="imageAlt"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        @error="handleImageError"
      />
      <div
        v-if="disabled"
        class="absolute inset-0 bg-white/70 backdrop-blur-[1px]"
        aria-hidden="true"
      ></div>
    </div>

    <div class="flex flex-1 flex-col gap-4 bg-white px-5 pb-5 pt-6 text-slate-900">
      <h3 class="text-lg font-semibold leading-tight text-slate-900">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm font-normal text-slate-600 line-clamp-4 whitespace-pre-line">
        {{ description }}
      </p>
      <footer v-if="$slots.footer" class="mt-auto border-t border-slate-200 pt-4 text-sm text-slate-600">
        <slot name="footer"></slot>
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';

const emit = defineEmits<{
  (event: 'select', nextState: boolean): void;
}>();

const DEFAULT_FALLBACK = '/images/card.jpg';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    fallbackImage?: string;
    imageCandidates?: string[];
    selected?: boolean;
    disabled?: boolean;
  }>(),
  {
    description: '',
    image: undefined,
    imageAlt: 'Illustration',
    fallbackImage: DEFAULT_FALLBACK,
    imageCandidates: () => [],
    selected: false,
    disabled: false,
  },
);

const articleClass = computed(() => {
  const base =
    'group relative flex h-full w-full max-w-sm flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 focus:outline-none';
  const interactive = props.disabled
    ? 'cursor-not-allowed opacity-60'
    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:-translate-y-1 hover:shadow-lg';
  const border = props.selected
    ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-lg'
    : 'hover:border-blue-300';
  return `${base} ${interactive} ${border}`;
});

const fallbackSrc = computed(() => {
  if (typeof props.fallbackImage === 'string') {
    const trimmed = props.fallbackImage.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return DEFAULT_FALLBACK;
});

const candidateQueue = shallowRef<string[]>([]);
const currentImage = shallowRef('');

const rebuildQueue = () => {
  const seen = new Set<string>();
  const queue: string[] = [];
  const pushCandidate = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed.length) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    queue.push(trimmed);
  };

  pushCandidate(props.image);
  for (const candidate of props.imageCandidates ?? []) {
    pushCandidate(candidate);
  }
  pushCandidate(fallbackSrc.value);

  candidateQueue.value = queue.slice(1);
  currentImage.value = queue[0] ?? fallbackSrc.value;
};

watch(
  () => [props.image, props.imageCandidates, fallbackSrc.value],
  rebuildQueue,
  { immediate: true, deep: true },
);

const handleImageError = () => {
  if (!candidateQueue.value.length) {
    currentImage.value = fallbackSrc.value;
    return;
  }
  const next = candidateQueue.value.shift();
  if (next) {
    currentImage.value = next;
  } else {
    currentImage.value = fallbackSrc.value;
  }
};

const onSelect = () => {
  if (props.disabled) return;
  emit('select', !props.selected);
};

const { imageAlt, title, description, selected, disabled } = props;
</script>
