## components/FichePersonnage.vue
```vue
<template>
  <div class="fiche" :class="{compact}">
    <h3 class="h2">Fiche personnage</h3>
    <div class="champs" style="margin-top:8px;">
      <div style="grid-column: span 6;">
        <div class="carte-mini">
          <strong>{{ p.nom || 'Sans-nom' }}</strong>
          <div style="color:var(--texte-2);">{{ p.lignee }} — {{ p.classe }} {{ p.niveau }}</div>
          <div class="ligne" style="gap:8px; margin-top:6px;">
            <span class="badge">CA {{ ca }}</span>
            <span class="badge">PV {{ p.pvActuels }}/{{ pvMax }}</span>
            <span class="badge">Init {{ init >= 0 ? '+' : '' }}{{ init }}</span>
            <span class="badge">Maîtrise +{{ mait }}</span>
          </div>
        </div>
      </div>

      <div style="grid-column: span 6;">
        <div class="carte-mini">
          <table class="table">
            <thead><tr><th>Carac</th><th>Score</th><th>Mod</th></tr></thead>
            <tbody>
              <tr v-for="(v, k) in p.caracs" :key="k">
                <td style="text-transform:capitalize;">{{ k }}</td>
                <td>{{ v }}</td>
                <td>{{ mod(v) >= 0 ? '+' : '' }}{{ mod(v) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="champs" style="margin-top:8px;">
      <div style="grid-column: span 12;">
        <div class="carte-mini">
          <strong>Compétences maîtrisées</strong>
          <div style="margin-top:6px; display:flex; flex-wrap: wrap; gap:6px;">
            <span v-for="c in competencesMaitrisees" :key="c.id" class="badge">
              {{ c.nom }} ({{ scoreCompetence(c) >=0?'+':'' }}{{ scoreCompetence(c) }})
            </span>
            <span v-if="!competencesMaitrisees.length" style="color:var(--texte-2);">Aucune</span>
          </div>
        </div>
      </div>
    </div>

    <div class="champs" style="margin-top:8px;" v-if="p.monture.nom">
      <div style="grid-column: span 12;">
        <div class="carte-mini">
          <strong>Monture / Créature</strong>
          <div style="margin-top:6px;">{{ p.monture.nom }} — {{ p.monture.vitesse || 'vitesse ?' }}</div>
          <div style="color:var(--texte-2);">{{ p.monture.notes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePersonnage } from '@/stores/personnage'
import { mod, bonusDeMaitrise, classeArmureDeBase, pvMaxAuNiveau } from '@/utils/regles_du_jeu'

const props = defineProps<{ compact?: boolean }>()
const store = usePersonnage()
const p = store.perso

const mait = computed(() => bonusDeMaitrise(p.niveau))
const init = computed(() => mod(p.caracs.dexterite))
const ca = computed(() => classeArmureDeBase(p.caracs.dexterite, p.armure?.type || 'aucune', !!p.bouclier))
const pvMax = computed(() => pvMaxAuNiveau(p.dv, p.niveau, mod(p.caracs.constitution)))

const competencesMaitrisees = computed(() => store.listeCompetences.filter(c => p.competences[c.id]))
function scoreCompetence(c: {id:string, nom:string, carac:'force'|'dexterite'|'constitution'|'intelligence'|'sagesse'|'charisme'}){
  const base = mod(p.caracs[c.carac])
  const maitB = p.competences[c.id] ? mait.value : 0
  return base + maitB
}
</script>

<style scoped>
.fiche.compact .carte-mini{ padding:10px; }
.carte-mini{ background:#0f1330; border:1px solid var(--bord); border-radius:12px; padding:14px; }
</style>