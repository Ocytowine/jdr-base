<template>
  <section class="carte">
    <h1 class="h1">Espace Joueur</h1>
    <p>Creer une nouvelle partie ou charger une partie existante (ID).</p>

    <div class="champs" style="margin-top:12px;">
      <div style="grid-column: span 6;">
        <button class="btn" @click="nouvellePartie">+ Nouvelle partie</button>
      </div>
      <div style="grid-column: span 3;">
        <input class="input" v-model="idSaisi" placeholder="ID de partie" />
      </div>
      <div style="grid-column: span 3;">
        <button class="btn ghost" @click="chargerPartieDepuisInput">Charger</button>
      </div>
    </div>

    <div v-if="idCourant" style="margin-top:14px;">
      <span class="badge">Partie actuelle: {{ idCourant }}</span>
      <div style="margin-top:10px;" class="ligne">
        <NuxtLink class="btn" to="/creation">Aller a la creation du PJ</NuxtLink>
        <NuxtLink class="btn ghost" to="/aventure">Ouvrir l'aventure</NuxtLink>
      </div>
    </div>

    <section class="liste-parties">
      <header class="liste-parties__header">
        <h2>Parties sauvegardees</h2>
        <p>Chaque session est conservee localement. Chargez ou supprimez-les depuis cette liste.</p>
      </header>
      <ul v-if="listeParties.length" class="liste-parties__items">
        <li
          v-for="partie in listeParties"
          :key="partie.id"
          class="liste-parties__item"
          :class="{ 'liste-parties__item--active': partie.id === idCourant }"
        >
          <div class="liste-parties__meta">
            <strong>{{ partie.saveState.display }}</strong>
            <small>ID: {{ partie.id }}</small>
            <small>Mis a jour: {{ formatHorodatage(partie.updatedAt) }}</small>
          </div>
          <div class="liste-parties__actions">
            <button class="btn ghost" @click="chargerDepuisListe(partie.id)">Charger</button>
            <button class="btn ghost liste-parties__delete" @click="supprimerDepuisListe(partie.id)">
              Supprimer
            </button>
          </div>
        </li>
      </ul>
      <p v-else class="liste-parties__empty">Aucune partie enregistree pour le moment.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'
import { getPartieSaveState } from '@/utils/localSaves'

const { idCourant } = useSession()
const partiesStore = useParties()
const { partiesSorted } = storeToRefs(partiesStore)

const idSaisi = ref('')

onMounted(() => {
  if (!process.client) return
  partiesStore.initialiser()
})

const listeParties = computed(() =>
  partiesSorted.value.map((partie) => ({
    ...partie,
    saveState: getPartieSaveState(partie.id)
  }))
)

const nouvellePartie = () => {
  const id = partiesStore.creerPartie()
  if (!id) return
  idSaisi.value = ''
}

const chargerPartieDepuisInput = () => {
  const id = idSaisi.value.trim()
  if (!id) return
  if (!listeParties.value.some((meta) => meta.id === id)) {
    alert('Aucune sauvegarde locale trouvee pour cet ID.')
    return
  }
  partiesStore.setCurrentParty(id)
  idSaisi.value = ''
}

const chargerDepuisListe = (id: string) => {
  partiesStore.setCurrentParty(id)
}

const supprimerDepuisListe = (id: string) => {
  if (!confirm('Supprimer cette partie ?')) return
  partiesStore.supprimerPartie(id)
}

const formatHorodatage = (value: string) => {
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short'
  })
}
</script>

<style scoped>
.liste-parties {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.liste-parties__header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--texte);
}

.liste-parties__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}

.liste-parties__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.liste-parties__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--bord);
  background: rgba(12, 16, 38, 0.7);
}

.liste-parties__item--active {
  border-color: var(--accent-border-soft);
  box-shadow: 0 0 0 1px var(--accent-border-soft);
}

.liste-parties__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.liste-parties__meta strong {
  font-size: 16px;
  font-weight: 600;
  color: var(--texte);
}

.liste-parties__meta small {
  color: var(--texte-2);
  font-size: 12px;
}

.liste-parties__actions {
  display: flex;
  gap: 8px;
}

.liste-parties__delete {
  border-color: rgba(255, 122, 122, 0.35);
  color: #ff9a9a;
}

.liste-parties__delete:hover {
  border-color: #ffb3b3;
  color: #ffd4d4;
}

.liste-parties__empty {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
}
</style>

