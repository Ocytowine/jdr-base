<template>
  <section class="carte">
    <h1 class="h1">Bienvenue dans JDR BASE</h1>
    <p>Pour les tests, l'authentification est remplacée par un simple bouton.</p>
    <div class="ligne" style="margin-top:10px;">
      <button class="btn" @click="demarrerTest">TEST — se connecter</button>
      <span class="badge">Session: {{ sessionActive ? 'active' : 'aucune' }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useSession } from '@/composables/useSession'
const { sessionActive, activerSession } = useSession()
const router = useRouter()

function demarrerTest(){
  activerSession()
  router.push('/joueur')
}
</script>