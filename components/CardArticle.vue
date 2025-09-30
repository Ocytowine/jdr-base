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
    <div class="relative h-48 w-full flex-shrink-0">
      <img
        :src="image || '/images/card.jpg'"
        :alt="imageAlt"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div
        v-if="disabled"
        class="absolute inset-0 bg-white/60 backdrop-blur-[1px]"
        aria-hidden="true"
      ></div>
    </div>

    <div class="flex flex-1 flex-col bg-white/95 text-slate-900">
      <div class="flex-1 space-y-3 p-6">
        <h3 class="text-xl font-semibold leading-tight text-slate-900">
          {{ title }}
        </h3>
        <p v-if="description" class="text-sm text-slate-600 line-clamp-5 whitespace-pre-line">
          {{ description }}
        </p>
      </div>
      <footer v-if="$slots.footer" class="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
        <slot name="footer"></slot>
      </footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const emit = defineEmits<{
  (event: 'select', nextState: boolean): void;
}>();

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    selected?: boolean;
    disabled?: boolean;
  }>(),
  {
    description: '',
    image: undefined,
    imageAlt: 'Illustration',
    selected: false,
    disabled: false,
  },
);

const articleClass = computed(() => {
  const base =
    'group relative flex h-full w-full max-w-xs md:max-w-sm flex-col overflow-hidden rounded-2xl border bg-white/90 text-left shadow transition-all duration-200 focus:outline-none';
  const interactive = props.disabled
    ? 'opacity-60 cursor-not-allowed'
    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:-translate-y-1 hover:shadow-lg';
  const border = props.selected
    ? 'border-blue-500 ring-2 ring-blue-500/40'
    : 'border-slate-200 hover:border-blue-300';
  return `${base} ${interactive} ${border}`;
});

const onSelect = () => {
  if (props.disabled) return;
  emit('select', !props.selected);
};

const { image, imageAlt, title, description, selected, disabled } = props;
</script>
