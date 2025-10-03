<template>
  <div class="aventure-fiche">
    <header class="aventure-fiche__header">
      <h2>Fiche personnage</h2>
      <p>Consultez et mettez a jour les informations du heros.</p>
    </header>
    <section class="aventure-fiche__body">
      <FichePersonnage />
    </section>
  </div>
</template>

<script setup lang="ts">
import FichePersonnage from '@/components/FichePersonnage.vue'
</script>

<style scoped>
.aventure-fiche {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.aventure-fiche__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.aventure-fiche__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.aventure-fiche__body {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}
</style>
