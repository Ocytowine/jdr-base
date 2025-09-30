<template>
  <section :data-step="stepMeta.id" class="space-y-6 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm">
    <form class="grid gap-6 md:grid-cols-2" @submit.prevent>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700">Prénom</label>
          <input
            v-model="characterFirstName"
            type="text"
            placeholder="Ex. Lina"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Nom</label>
          <input
            v-model="characterLastName"
            type="text"
            placeholder="Ex. Morcant"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Surnom</label>
          <input
            v-model="characterNickname"
            type="text"
            placeholder="Ex. L'Éclair"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <p class="mt-1 text-xs text-slate-500">Optionnel : sera affiché entre guillemets.</p>
        </div>
      </div>
      <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p class="font-semibold text-slate-700">Aperçu rapide</p>
        <dl class="mt-2 space-y-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom complet</dt>
            <dd class="text-sm text-slate-700">{{ fullNamePreview || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom affiché</dt>
            <dd class="text-sm text-slate-700">{{ displayCharacterName }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Portrait généré</dt>
            <dd class="text-sm text-slate-700">{{ displayCharacterName }}</dd>
          </div>
        </dl>
      </div>
    </form>

    <div class="flex justify-end gap-3">
      <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" @click="emit('cancel')">Annuler</button>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" @click="emit('validate')">
        Valider
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import type { BonomePhaseMeta } from '@/components/bonomePhases';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const emit = defineEmits(['validate', 'cancel', 'refresh']);

const props = defineProps<{
  /**
   * Métadonnées décrivant l'étape courante (identifiant, libellés, actions associées).
   */
  stepMeta: BonomePhaseMeta;
}>();

const creation = useBonomeCreationStore();
const { characterFirstName, characterLastName, characterNickname, fullCharacterName, displayCharacterName } =
  storeToRefs(creation);

const fullNamePreview = computed(() => fullCharacterName.value.trim());

// Ensure props are referenced to avoid unused warnings in template compilation.
const stepMeta = computed(() => props.stepMeta);
</script>
