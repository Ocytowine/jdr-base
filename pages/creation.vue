<template>
  <div class="space-y-6">
    <section v-if="!showPreview" class="carte space-y-6">
      <header class="space-y-2">
        <h1 class="h1">Création de votre bonôme</h1>
        <p class="text-sm text-[var(--texte-2)]">
          Parcourez l'assistant pour sélectionner la classe, la race et l'historique, ajustez vos caractéristiques puis appliquez
          les choix complémentaires proposés.
        </p>
      </header>

      <BonomeWizard />

      <footer class="flex flex-col gap-4 border-t border-[var(--bord)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-[var(--texte-2)]">
          <template v-if="loading">
            Préparation de l'aperçu en cours…
          </template>
          <template v-else-if="!preview">
            Lancez une prévisualisation pour vérifier votre sélection.
          </template>
          <template v-else-if="pendingChoicesCount">
            {{ pendingChoicesCount }} choix supplémentaires doivent être appliqués avant la prévisualisation finale.
          </template>
          <template v-else>
            Tous les choix ont été appliqués, vous pouvez afficher la prévisualisation détaillée.
          </template>
        </div>
        <button
          type="button"
          class="btn"
          :class="[
            'px-6 py-3 text-sm uppercase tracking-wide transition',
            canValidate ? 'shadow-[0_0_20px_rgba(122,162,255,0.4)]' : 'opacity-60 cursor-not-allowed'
          ]"
          :disabled="!canValidate"
          @click="handleValidate"
        >
          {{ loading ? 'Préparation…' : 'Valider et prévisualiser' }}
        </button>
      </footer>
    </section>

    <section v-else class="carte space-y-6">
      <div class="flex flex-col gap-3 border-b border-[var(--bord)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="h2 m-0">Prévisualisation du bonôme</h2>
          <p class="text-sm text-[var(--texte-2)]">
            Vérifiez l'aperçu généré avant de finaliser votre fiche de personnage.
          </p>
        </div>
        <button type="button" class="btn ghost" @click="backToWizard">Modifier les choix</button>
      </div>

      <BonomePreviewPanel />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import BonomeWizard from '@/components/BonomeWizard.vue';
import BonomePreviewPanel from '@/components/BonomePreviewPanel.vue';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const creation = useBonomeCreationStore();
await creation.initialize();

const { preview, loading } = storeToRefs(creation);

const showPreview = ref(false);
const pendingChoicesCount = computed(() => (preview.value?.pendingChoices?.length ?? 0));
const canValidate = computed(() => !loading.value && !!preview.value && pendingChoicesCount.value === 0);

const handleValidate = async () => {
  if (loading.value) return;
  await creation.sendPreview();
  if (canValidate.value) {
    showPreview.value = true;
  }
};

const backToWizard = () => {
  showPreview.value = false;
};

watch(preview, (value) => {
  if (!value) {
    showPreview.value = false;
  }
});

watch(pendingChoicesCount, (count) => {
  if (count > 0) {
    showPreview.value = false;
  }
});
</script>
