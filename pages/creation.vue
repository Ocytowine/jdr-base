<template>
  <div class="space-y-6">
    <section class="carte">
      <BonomeWizard />
    </section>
    <section class="carte">
      <BonomePreviewPanel />
    </section>
  </div>
</template>

<script setup lang="ts">
import BonomeWizard from '@/components/BonomeWizard.vue';
import BonomePreviewPanel from '@/components/BonomePreviewPanel.vue';
</script>
