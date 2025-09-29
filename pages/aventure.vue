<template>
  <section class="carte">
    <h1 class="h1">Aventure</h1>
    <p>Onglets prévus : Fiche | Journal | Carte (plus tard)</p>
    <div v-if="etatSauvegarde === 'chargement'" class="message-neutre">
      Chargement de votre fiche...
    </div>
    <div v-else-if="etatSauvegarde === 'aucune'" class="message-neutre">
      Aucune sauvegarde trouvée. Commencez une nouvelle aventure !
    </div>
    <FichePersonnage v-else />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FichePersonnage from '@/components/FichePersonnage.vue'
import { usePersonnage } from '@/stores/personnage'

type EtatSauvegarde = 'chargement' | 'chargee' | 'aucune'

const store = usePersonnage()
const etatSauvegarde = ref<EtatSauvegarde>('chargement')

onMounted(() => {
  if (process.client) {
    const sauvegarde = localStorage.getItem('JDR_PERSO')
    if (sauvegarde) {
      store.chargerDepuisLocal()
      etatSauvegarde.value = 'chargee'
    } else {
      etatSauvegarde.value = 'aucune'
    }
  }
})
</script>

<style scoped>
.message-neutre {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #0f1330;
  border: 1px solid var(--bord);
  color: var(--texte-2);
}
</style>
