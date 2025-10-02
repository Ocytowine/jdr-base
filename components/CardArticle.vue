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
    <div class="card__media">
      <img
        :src="currentImage"
        :alt="imageAlt"
        class="card__image"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-if="disabled" class="card__disabled" aria-hidden="true"></div>
    </div>

    <div class="card__body">
      <h3 class="card__title">
        {{ title }}
      </h3>
      <p v-if="description" class="card__description">
        {{ description }}
      </p>
      <footer v-if="$slots.footer" class="card__footer">
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
    disabled: false
  }
);

const articleClass = computed(() => ({
  card: true,
  'card--selected': props.selected,
  'card--disabled': props.disabled
}));

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
  { immediate: true, deep: true }
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

</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 320px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(23, 26, 52, 0.88), rgba(17, 20, 43, 0.92));
  color: var(--texte);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  border-color: rgba(122, 162, 255, 0.6);
}

.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.card--selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft), 0 20px 40px rgba(122, 162, 255, 0.3);
}

.card--disabled {
  cursor: not-allowed;
  opacity: 0.6;
  pointer-events: none;
}

.card__media {
  position: relative;
  height: 180px;
  background: var(--carte-2);
}

.card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__disabled {
  position: absolute;
  inset: 0;
  background: rgba(15, 18, 38, 0.6);
  backdrop-filter: blur(1px);
}

.card__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 14px;
  padding: 22px 22px 24px;
}

.card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--texte);
}

.card__description {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
  line-height: 1.5;
  white-space: pre-line;
}

.card__footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  color: var(--accent-2);
}
</style>

