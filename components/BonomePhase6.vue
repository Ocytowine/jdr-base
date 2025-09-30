<template>
  <section :data-step="props.stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-slate-900">Matériel</h3>
      <p class="text-sm text-slate-600">Module matériel à venir.</p>
    </div>
    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="emit('validate')">
        Valider
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BonomePhaseMeta } from '@/components/bonomePhases';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées d'étape pour identification.
   */
  stepMeta: BonomePhaseMeta;
}>();
</script>
