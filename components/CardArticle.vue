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
        :src="image || '/images/card.jpg'"
        :alt="imageAlt"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
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
    'group relative flex h-full w-full max-w-sm flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 focus:outline-none';
  const interactive = props.disabled
    ? 'cursor-not-allowed opacity-60'
    : 'cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:-translate-y-1 hover:shadow-lg';
  const border = props.selected
    ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-lg'
    : 'hover:border-blue-300';
  return `${base} ${interactive} ${border}`;
});

const onSelect = () => {
  if (props.disabled) return;
  emit('select', !props.selected);
};

const { image, imageAlt, title, description, selected, disabled } = props;
</script>
