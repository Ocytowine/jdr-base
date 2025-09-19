<template>
  <section class="carte">
    <h1 class="h1">Espace Joueur</h1>
    <p>Créer une nouvelle partie ou charger une partie existante (ID).</p>

    <div class="champs" style="margin-top:12px;">
      <div style="grid-column: span 6;">
        <button class="btn" @click="nouvellePartie">➕ Nouvelle partie</button>
      </div>
      <div style="grid-column: span 3;">
        <input class="input" v-model="idSaisi" placeholder="ID de partie" />
      </div>
      <div style="grid-column: span 3;">
        <button class="btn ghost" @click="chargerPartie">Charger</button>
      </div>
    </div>

    <div v-if="idCourant" style="margin-top:14px;">
      <span class="badge">Partie actuelle: {{ idCourant }}</span>
      <div style="margin-top:10px;" class="ligne">
        <NuxtLink class="btn" to="/creation">Aller à la création du PJ</NuxtLink>
        <NuxtLink class="btn ghost" to="/aventure">Ouvrir l'aventure</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSession } from '@/composables/useSession'
import { useUid } from '@/composables/useUid'
const { idCourant, definirIdPartie } = useSession()
const { nouvelId } = useUid()

const idSaisi = ref('')

function nouvellePartie(){
  const id = nouvelId('partie')
  definirIdPartie(id)
}
function chargerPartie(){
  if(idSaisi.value.trim()) definirIdPartie(idSaisi.value.trim())
}
</script>