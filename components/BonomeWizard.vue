<template>
  <div>
    <!-- Barre d'étapes -->
    <div class="ligne" style="justify-content: space-between; margin-bottom:10px;">
      <div class="badge">Étape {{ etape }} / 5</div>
      <div class="ligne" style="gap:8px;">
        <button class="btn ghost" @click="precedent" :disabled="etape===1">← Précédent</button>
        <button class="btn" @click="suivant" v-if="etape<5">Suivant →</button>
        <button class="btn" v-else @click="sauvegarder">Enregistrer le PJ</button>
      </div>
    </div>

    <!-- Étape 1 : identité / background -->
    <div v-if="etape===1" class="bloc">
      <h2 class="h2">[1/5] Identité</h2>
      <div class="champs">
        <div style="grid-column: span 6;">
          <label>Nom</label>
          <input class="input" v-model="perso.nom" placeholder="Ex: Alia Cendrefeu" />
        </div>

        <div style="grid-column: span 3;">
          <label>Lignée (race)</label>
          <select class="input" v-model="perso.lignee" :disabled="backgroundLocked">
            <option value="Humain">Humain</option>
            <option value="Elfe">Elfe</option>
            <option value="Nain">Nain</option>
            <option value="Halfelin">Halfelin</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div style="grid-column: span 3;">
          <label>Âge</label>
          <input class="input" type="number" v-model.number="perso.age" :disabled="backgroundLocked" />
        </div>

        <div style="grid-column: span 4;">
          <label>Alignement (indicatif)</label>
          <select class="input" v-model="perso.alignement" :disabled="backgroundLocked">
            <option>Neutre</option>
            <option>Loyal Bon</option>
            <option>Chaotique Bon</option>
            <option>Loyal Neutre</option>
            <option>Chaotique Neutre</option>
            <option>Loyal Mauvais</option>
            <option>Chaotique Mauvais</option>
          </select>
        </div>

        <div style="grid-column: span 8;">
          <label>Historique (background)</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="input" v-model="selectedBackgroundName" :disabled="backgroundLocked">
              <option value="">-- Aucun --</option>
              <option v-for="b in backgroundsOptions" :key="b.id" :value="b.name">{{ b.name }}</option>
            </select>
            <button class="btn" v-if="!backgroundLocked" @click="validerBackground">Valider</button>
            <button class="btn ghost" v-else @click="deverrouillerBackground">Modifier</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Étape 2 : Classe & progression -->
    <div v-else-if="etape===2" class="bloc">
      <h2 class="h2">[2/5] Classe & niveau</h2>
      <div class="champs">
        <div style="grid-column: span 4;">
          <label>Classe</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="input" v-model="selectedClassName" :disabled="classLocked">
              <option value="">-- Choisir une classe --</option>
              <option v-for="c in classesOptions" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <button class="btn" v-if="!classLocked" @click="validerClasse">Valider</button>
            <button class="btn ghost" v-else @click="deverrouillerClasse">Modifier</button>
          </div>
        </div>

        <!-- NOTE: Le choix de sous-classe direct a été supprimé de l'UI.
             La sous-classe est désormais choisie via une feature 'subclass_choice'
             (déclenchée par features_by_level). On affiche la sous-classe choisie en info. -->
        <div style="grid-column: span 4;">
          <label>Sous-classe (actuelle)</label>
          <input class="input" type="text" :value="perso.sousClasse || '— aucune —'" disabled />
        </div>

        <div style="grid-column: span 4;">
          <label>Niveau</label>
          <input class="input" type="number" min="1" max="20" v-model.number="perso.niveau" :disabled="classLocked" />
        </div>

        <div style="grid-column: span 4;">
          <label>DV (dé de vie)</label>
          <input class="input" type="number" :value="dvComputed" disabled />
        </div>

        <div style="grid-column: span 4;">
          <label>PV max (calculé)</label>
          <input class="input" type="number" :value="pvMaxComputed" disabled />
        </div>

        <div style="grid-column: span 4;">
          <label>PV actuels</label>
          <input class="input" type="number" :value="pvActuelsComputed" disabled />
        </div>
      </div>

      <!-- Indicateur de la classe chargée -->
      <div style="margin-top:10px;color:var(--texte-2)">
        <strong>Classe détectée :</strong>
        <span v-if="classData">{{ classData.name || classData.raw?.name || classData.raw?.nom }}</span>
        <span v-else>aucune</span>

        <div v-if="(classData?.raw?.skill_choices) || (classData?.skill_choices)" style="margin-top:6px;">
          <small>
            Choisir
            {{ (classData?.raw?.skill_choices?.choose) || (classData?.skill_choices?.choose) || 0 }}
            compétences parmi :
            {{ (classData?.raw?.skill_choices?.from ?? classData?.skill_choices?.from ?? []).join(', ') }}
          </small>
        </div>
      </div>

      <!-- BLOC: Choix spécifiques à la classe (compétences & features enrichies) -->
      <div style="margin-top:14px; border-top:1px dashed var(--bord); padding-top:10px;">
        <h3 class="h3">Choix spécifiques à la classe</h3>

        <!-- Choix de compétences (si la classe impose un choix) -->
        <div v-if="classSkillChoices" style="margin-top:8px;">
          <label><strong>Compétences à choisir</strong> — Choisir {{ classSkillChoices.choose }} :</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <label v-for="s in classSkillChoices.from" :key="s" style="display:flex; align-items:center; gap:6px;">
              <input type="checkbox" :value="s" :checked="selectedSkills.includes(s)" @change="toggleSkillChoice(s)" :disabled="isSkillLocked" />
              <span>{{ s }}</span>
            </label>
          </div>
          <div style="margin-top:6px;">
            <small>{{ selectedSkills.length }} / {{ classSkillChoices.choose }} sélectionné(s)</small>
            <button class="btn" style="margin-left:8px;" @click="validerSkills" :disabled="selectedSkills.length !== classSkillChoices.choose || isSkillLocked">Valider les compétences</button>
            <button class="btn ghost" v-if="isSkillLocked" @click="deverrouillerSkills">Modifier</button>
          </div>
        </div>

        <!-- Features enrichies (classe + sous-classe) -->
        <div v-if="enrichedAvailableFeatures.length" style="margin-top:12px;">
          <label><strong>Features disponibles (niveau ≤ {{ perso.niveau }})</strong></label>
          <ul style="margin-top:6px; padding-left:18px;">
            <li v-for="(f, idx) in enrichedAvailableFeatures" :key="f.id+idx" style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <strong>{{ f.displayName || f.id }}</strong>
                  <div style="color:var(--texte-2); font-size:12px;">{{ f.description || '' }}</div>
                </div>
                <div style="margin-left:12px;">
                  <!-- SPECIAL : feature qui déclenche le choix de sous-classe -->
                  <div v-if="f.id === 'subclass_choice' && !featureChoicesLocked[f.id]">
                    <small>Choix de sous-classe requis</small>
                    <div style="margin-top:6px;">
                      <button class="btn" @click="openSubclassChoiceModal(f.id)">Choisir la sous-classe</button>
                    </div>
                  </div>

                  <!-- Si la feature demande un choix multiple (choose/from) -->
                  <div v-else-if="f.choose && !featureChoicesLocked[f.id]">
                    <small>Choisir {{ f.choose }}</small>
                    <div style="display:flex; gap:6px; margin-top:6px;">
                      <label v-for="opt in (f.from||[])" :key="opt" style="display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" :value="opt" :checked="(selectedFeatureChoices[f.id] || []).includes(opt)" @change="toggleFeatureChoice(f.id, opt, f.choose)" />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                    <div style="margin-top:6px;">
                      <button class="btn" @click="validerFeatureChoice(f.id)" :disabled="(selectedFeatureChoices[f.id]||[]).length !== f.choose">Valider</button>
                    </div>
                  </div>

                  <!-- Sinon feature automatique -->
                  <div v-else>
                    <small v-if="featureChoicesLocked[f.id]">Verrouillée ✓</small>
                    <small v-else>Automatique</small>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

      </div>
      <!-- FIN bloc choix classe/features -->
    </div>

    <!-- Étape 3 : caractéristiques -->
    <div v-else-if="etape===3" class="bloc">
      <h2 class="h2">[3/5] Caractéristiques</h2>
      <div class="ligne" style="gap:8px; margin-bottom:8px;">
        <button class="btn ghost" @click="generer('roll')">🎲 Lancer 4d6 (garde 3)</button>
        <button class="btn ghost" @click="generer('array')">📚 Répartition standard</button>
        <button class="btn ghost" @click="generer('buy')">🧮 Point Buy (27)</button>
      </div>

      <div class="champs">
        <div v-for="(val, cle) in perso.caracs" :key="cle" style="grid-column: span 4;">
          <label style="display:flex; justify-content:space-between;">
            <span style="text-transform: capitalize;">{{ cle }}</span>
            <small class="badge">mod {{ modificateur(cle) >= 0 ? '+' : '' }}{{ modificateur(cle) }}</small>
          </label>
          <input class="input" type="number" v-model.number="perso.caracs[cle]" :disabled="false" />
        </div>
      </div>
      <p style="margin-top:8px; color:var(--texte-2);">Rappel : mod = ⌊(score − 10) / 2⌋</p>
    </div>

    <!-- Étape 4 : compétences / équipement -->
    <div v-else-if="etape===4" class="bloc">
      <h2 class="h2">[4/5] Compétences, sauvegardes, équipement de base</h2>
      <div class="champs">
        <div style="grid-column: span 4;">
          <label>Bonus de maîtrise</label>
          <input class="input" type="number" :value="bonusMaitrise" disabled />
        </div>
        <div style="grid-column: span 4;">
          <label>Classe d'armure (CA)</label>
          <input class="input" type="number" :value="classeArmure" disabled />
        </div>
        <div style="grid-column: span 4;">
          <label>Initiative</label>
          <input class="input" type="number" :value="initiative" disabled />
        </div>
      </div>

      <details style="margin-top:10px;">
        <summary>Proficiences (cocher maîtrises)</summary>
        <table class="table" style="margin-top:8px;">
          <thead>
            <tr><th>Compétence</th><th>Carac</th><th>Maîtrise ?</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in competencesDef" :key="c.id">
              <td>{{ c.nom }}</td>
              <td>{{ c.carac.toUpperCase() }}</td>
              <td><input type="checkbox" v-model="perso.competences[c.id]" :disabled="classLocked && !perso.competences[c.id]" /></td>
              <td>{{ scoreCompetence(c) >= 0 ? '+' : '' }}{{ scoreCompetence(c) }}</td>
            </tr>
          </tbody>
        </table>
      </details>

      <div class="champs" style="margin-top:10px;">
        <div style="grid-column: span 6;">
          <label>Langues</label>
          <select class="input" v-model="perso.langues" :disabled="backgroundLocked">
            <option v-for="l in languesOptions" :key="l.id" :value="l.name">{{ l.name }}</option>
          </select>
        </div>

        <div style="grid-column: span 6;">
          <label>Équipement de départ (armes disponibles selon maîtrises)</label>
          <select class="input" v-model="equipementModel" multiple :disabled="classLocked && !armesOptionsFiltered.length">
            <option v-for="it in armesOptionsFiltered" :key="it.id" :value="it.name" :title="it.raw?.description || it.description || ''">
              {{ it.name + ' (' + (it.weaponType || 'inconnu') + ')' }}
            </option>
          </select>
        </div>
      </div>

      <details style="margin-top:10px;">
        <summary>Monture / Créature apprivoisée (règle maison)</summary>
        <div class="champs" style="margin-top:8px;">
          <div style="grid-column: span 6;">
            <label>Nom monture/créature</label>
            <input class="input" v-model="perso.monture.nom" placeholder="Ex: Havane (cheval)" :disabled="false" />
          </div>
          <div style="grid-column: span 3;">
            <label>Vitesse</label>
            <input class="input" v-model="perso.monture.vitesse" placeholder="Ex: 60 ft. (/12 m)" :disabled="false" />
          </div>
          <div style="grid-column: span 3;">
            <label>Notes</label>
            <input class="input" v-model="perso.monture.notes" placeholder="Charge, dressage…" :disabled="false" />
          </div>
        </div>
      </details>
    </div>

    <!-- Étape 5 : résumé -->
    <div v-else class="bloc">
      <h2 class="h2">[5/5] Résumé</h2>
      <FichePersonnage :compact="true" />
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn ghost" @click="editerJSON">Voir JSON</button>
        <button class="btn" @click="telechargerJSON">Télécharger JSON</button>
      </div>
    </div>

    <!-- MODAL pour choix sous-classe (ouvert par feature 'subclass_choice') -->
    <div v-if="subclassChoiceModal.opened" class="bw-modal" @click.self="subclassChoiceModal.opened=false">
      <div class="card">
        <h3>Choisir une sous-classe</h3>
        <div class="list">
          <label v-for="s in subclassesFiltered" :key="s.id">
            <input type="radio" name="subclass_choice" :value="s.name" v-model="subclassChoiceSelection" />
            <strong style="margin-left:6px">{{ s.name }}</strong>
            <div style="font-size:12px; color:var(--texte-2)">{{ s.raw?.description || s.raw?.texte || '' }}</div>
          </label>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
          <button class="btn ghost" @click="subclassChoiceModal.opened=false">Annuler</button>
          <button class="btn" @click="confirmSubclassChoice">Confirmer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// BonomeWizard.vue - version enrichie
// - suppression choix direct sous-classe : désormais via feature 'subclass_choice'
// - enrichment asynchrone des features via loadFeature()
// - corrections d'UI et conversion select multiple <-> array

import { ref, computed, onMounted, watch, reactive } from 'vue'
import { usePersonnage } from '@/stores/personnage'
import FichePersonnage from './FichePersonnage.vue'
import { mod, bonusDeMaitrise, classeArmureDeBase, pvMaxAuNiveau } from '@/utils/regles_du_jeu'
import { roll4d6DropLowest, standardArray, pointBuy27 } from '@/utils/dice_helper'

// adaptateur (assure-toi d'avoir ajouté listFeatures / loadFeature dans utils/data_adapter.ts)
import {
  listClasses,
  loadClass,
  listSubclasses,
  loadSubclass,
  listBackgrounds,
  loadBackground,
  listLanguages,
  listWeapons,
  loadFeature
} from '@/utils/data_adapter'

/* ---------- store et personnage ---------- */
const store = usePersonnage()
const perso = store.perso

/* ---------- états locaux ---------- */
const etape = ref(1)
const classLocked = ref(false)
const subclassLocked = ref(false)
const backgroundLocked = ref(false)

const classesOptions = ref([] as {id:string,name:string}[])
const subclassesAll = ref([] as {id:string,name:string, raw?:any}[])
const backgroundsOptions = ref([] as {id:string,name:string}[])
const languesOptions = ref([] as {id:string,name:string}[])
const armesOptionsAll = ref([] as {id:string,name:string, raw:any}[])

const selectedClassName = ref(perso.classe || '')
const selectedBackgroundName = ref('')
// note: plus de select direct pour la sous-classe : c'est via modal feature
const classData = ref<any>(null)
const subclassData = ref<any>(null)

/* ---------- computed utiles ---------- */
const competencesDef = computed(()=> store.listeCompetences)
const bonusMaitrise = computed(()=> bonusDeMaitrise(perso.niveau))
const initiative = computed(()=> mod(perso.caracs.dexterite))
const classeArmure = computed(()=> classeArmureDeBase(perso.caracs.dexterite, perso.armure?.type||'aucune', !!perso.bouclier))

/* ---------- chargement initial des indexes ---------- */
onMounted(async ()=>{
  try{ classesOptions.value = await listClasses() }catch(e){ console.error('Erreur classes:', e) }
  try{ subclassesAll.value = await listSubclasses() }catch(e){ console.error('Erreur sous-classes', e) }
  try{ backgroundsOptions.value = await listBackgrounds() }catch(e){ console.error('Erreur backgrounds', e) }
  try{ languesOptions.value = await listLanguages() }catch(e){ console.error('Erreur langues', e) }
  try{ armesOptionsAll.value = await listWeapons() }catch(e){ console.error('Erreur armes', e) }

  console.debug('[BonomeWizard] onMounted: classes', classesOptions.value.length, 'subs', subclassesAll.value.length)
})

/* ---------- watch : sélection de classe (normalise & load) ---------- */
watch(selectedClassName, async (nv)=>{
  if(!nv){ classData.value = null; return }
  try{
    const raw = await loadClass(nv)
    if(!raw){ classData.value = null; return }
    classData.value = { id: (raw.id||raw.name||nv).toString().toLowerCase(), name: raw.name||raw.nom||nv, raw }
  }catch(e){ console.error(e); classData.value = null }
})

/* ---------- filtrage sous-classes (utilisé dans modal) ---------- */
const subclassesFiltered = computed(()=>{
  if(!classData.value || !subclassesAll.value.length) return []
  const clsIds = new Set<string>()
  if(classData.value.id) clsIds.add(String(classData.value.id).toLowerCase())
  if(classData.value.name) clsIds.add(String(classData.value.name).toLowerCase())
  if(classData.value.raw?.id) clsIds.add(String(classData.value.raw.id).toLowerCase())

  function parentIdsOf(sub:any){
    const vals: string[] = []
    if(!sub) return vals
    const keys = ['class_id','classe_id','class','parent','classe','classId']
    keys.forEach(k=>{
      if(sub[k]) vals.push(String(sub[k]).toLowerCase())
      if(sub.raw && sub.raw[k]) vals.push(String(sub.raw[k]).toLowerCase())
    })
    return vals
  }

  return subclassesAll.value.filter(s=>{
    const parents = parentIdsOf(s)
    const matchParent = parents.some(p => clsIds.has(p))
    if(!matchParent) return false
    const possibleLevels: number[] = []
    ;['unlock_level','required_level','level_required','level','min_level'].forEach(k=>{
      if(s.raw && s.raw[k] != null) possibleLevels.push(Number(s.raw[k]))
      if((s as any)[k] != null) possibleLevels.push(Number((s as any)[k]))
    })
    const required = possibleLevels.length ? Math.min(...possibleLevels) : 0
    if(required > (perso.niveau || 1)) return false
    return true
  }).map(s=>({ id: s.id, name: s.name, class_id: s.class_id, raw: s.raw }))
})

/* ---------- GESTION DU CHOIX DE LA SOUS-CLASSE VIA MODAL ---------- */
/* L'ouverture est déclenchée par une feature 'subclass_choice' (ex: présent dans features_by_level) */
const subclassChoiceModal = ref({ featureId: null as string|null, opened: false })
const subclassChoiceSelection = ref('')

function openSubclassChoiceModal(featureId: string){
  subclassChoiceModal.value.featureId = featureId
  subclassChoiceModal.value.opened = true
  subclassChoiceSelection.value = ''
}

async function confirmSubclassChoice(){
  const chosen = subclassChoiceSelection.value
  if(!chosen) return alert('Choisir une sous-classe')
  selectedClassName.value && (perso.classe = selectedClassName.value)
  // applique la sous-classe
  subclassLocked.value = true
  const d = await loadSubclass(chosen)
  subclassData.value = d || null
  perso.sousClasse = chosen
  // stocke la validation dans perso.features si featureId fournie
  if(subclassChoiceModal.value.featureId){
    featureChoicesLocked[subclassChoiceModal.value.featureId] = true
    perso.features = perso.features || []
    perso.features.push({ featureId: subclassChoiceModal.value.featureId, name: 'Sous-classe', choices: [chosen] })
  }
  subclassChoiceModal.value.opened = false
  subclassChoiceModal.value.featureId = null
  subclassChoiceSelection.value = ''
}

/* possibilité de déverrouiller la sous-classe (retirer) */
function deverrouillerSubclass(){
  if(confirm('Déverrouiller la sous-classe réinitialisera les choix dépendants. Continuer ?')){
    subclassLocked.value = false
    subclassData.value = null
    perso.sousClasse = ''
  }
}

/* ---------- fonctions de validation / verrouillage standard ---------- */
async function validerClasse(){
  if(!selectedClassName.value) return alert("Choisir une classe d'abord")
  classLocked.value = true
  perso.classe = selectedClassName.value

  try{
    const raw = await loadClass(selectedClassName.value)
    if(raw){
      classData.value = { id: (raw.id||raw.name||selectedClassName.value).toString().toLowerCase(), name: raw.name || raw.nom || selectedClassName.value, raw }
    } else {
      classData.value = null
    }

    // appliquer DV si la classe le définit
    if(classData.value?.raw?.hit_die) perso.dv = Number(classData.value.raw.hit_die) || perso.dv

    // recalc pv actuels
    perso.pvActuels = pvMaxAuNiveau(perso.dv, perso.niveau, mod(perso.caracs.constitution))

    // réinitialise la sous-classe affichée (sera choisie via feature si besoin)
    subclassData.value = null
    perso.sousClasse = ''
  }catch(e){
    console.error('Erreur validerClasse', e)
  }
}

function deverrouillerClasse(){
  if(confirm('Déverrouiller la classe réinitialisera les choix dépendants (sous-classe, équipement). Continuer ?')){
    classLocked.value = false
    selectedClassName.value = ''
    perso.classe = ''
    classData.value = null
    subclassData.value = null
    perso.sousClasse = ''
  }
}

async function validerBackground(){
  if(!selectedBackgroundName.value) return alert("Choisir un background d'abord")
  backgroundLocked.value = true
  const data = await loadBackground(selectedBackgroundName.value)
  if(!data) return
  if(data.languages){
    if(Array.isArray(data.languages)) perso.langues = data.languages.join(', ')
    else if(typeof data.languages === 'string') perso.langues = data.languages
  }
  if(data.skill_proficiencies && Array.isArray(data.skill_proficiencies)){
    data.skill_proficiencies.forEach((s:string)=> perso.competences[s.toLowerCase()] = true)
  }
  if(data.equipment){
    if(Array.isArray(data.equipment)) perso.equipement = data.equipment.join(', ')
    else if(typeof data.equipment === 'string') perso.equipement = data.equipment
  }
}

function deverrouillerBackground(){
  if(confirm('Déverrouiller le background supprimera ses suggestions (langues, compétences, équipement). Continuer ?')){
    backgroundLocked.value = false
    selectedBackgroundName.value = ''
    perso.langues = 'Commun'
  }
}

/* ---------- GESTION DES FEATURES : récupération et enrichissement asynchrone ---------- */
/* On construit la liste brute depuis features_by_level puis on tente de compléter via loadFeature(id) */
function flattenFeaturesFrom(obj: any){
  const out: any[] = []
  if(!obj) return out
  Object.entries(obj).forEach(([lvl, arr])=>{
    const levelNum = Number(lvl)
    if(!Array.isArray(arr)) return
    arr.forEach((entry:any) => {
      if(typeof entry === 'string'){
        out.push({ id: String(entry).toLowerCase().replace(/\s+/g,'_'), displayName: entry, level: levelNum })
      } else if(typeof entry === 'object'){
        if(entry.choose && entry.from){
          out.push({
            id: entry.id || `choice_${entry.choose}_${Math.random().toString(36).slice(2,6)}`,
            displayName: entry.name || entry.id || `Choix ${entry.choose}`,
            level: levelNum,
            choose: Number(entry.choose),
            from: entry.from,
            description: entry.description || ''
          })
        } else if(entry.id || entry.name){
          out.push({ id: entry.id || entry.name, displayName: entry.name || entry.id, level: levelNum, raw: entry })
        } else {
          out.push({ id: JSON.stringify(entry).slice(0,20), displayName: JSON.stringify(entry), level: levelNum, raw: entry })
        }
      }
    })
  })
  return out
}

// conteneur enrichi pour la liste des features disponible (classe + sous-classe)
const enrichedAvailableFeatures = ref<any[]>([])
const selectedFeatureChoices = reactive<Record<string,string[]>>({})
const featureChoicesLocked = reactive<Record<string,boolean>>({})

// reconstruit la liste enrichie à chaque changement clé
async function rebuildEnrichedFeatures(){
  const list: any[] = []
  if(classData.value?.raw?.features_by_level) list.push(...flattenFeaturesFrom(classData.value.raw.features_by_level))
  if(subclassData.value?.raw?.features_by_level) list.push(...flattenFeaturesFrom(subclassData.value.raw.features_by_level))
  const lvl = Number(perso.niveau || 1)
  const filtered = list.filter(f => (f.level || 0) <= lvl)
  // dedupe par id
  const map = new Map<string, any>()
  for(const f of filtered){ if(!map.has(f.id)) map.set(f.id, f) }
  const base = Array.from(map.values())

  // enrichment asynchrone via loadFeature
  const enriched = await Promise.all(base.map(async (f)=>{
    if(f.choose && f.from) return f // déjà complet
    try{
      const remote = await loadFeature(f.id)
      if(remote){
        const rem = (typeof remote === 'object') ? remote : { name: String(remote) }
        const choose = rem.choose || rem.choices || rem.choose_count
        const from = rem.from || rem.options || rem.choices || rem.from_choices
        const desc = rem.description || rem.desc || rem.texte || rem.texte_court || rem.short
        return Object.assign({}, f, {
          displayName: rem.name || rem.nom || f.displayName,
          description: desc || f.description || '',
          choose: choose ? Number(choose) : f.choose,
          from: from || f.from
        })
      }
    }catch(e){
      // ignore si pas trouvé
    }
    return f
  }))

  enrichedAvailableFeatures.value = enriched
}

// rebuild quand classData, subclassData ou niveau change
watch([classData, subclassData, ()=>perso.niveau], ()=>{ rebuildEnrichedFeatures().catch(e=>console.error(e)) }, { immediate:true })

/* ---------- gestion des choix de feature (générique) ---------- */
function toggleFeatureChoice(featureId: string, option: string, maxChoose: number){
  const arr = selectedFeatureChoices[featureId] || (selectedFeatureChoices[featureId] = [])
  const i = arr.indexOf(option)
  if(i === -1){
    if(arr.length < maxChoose) arr.push(option)
    else alert(`Vous pouvez choisir uniquement ${maxChoose} option(s).`)
  } else { arr.splice(i,1) }
}

function validerFeatureChoice(featureId: string){
  const arr = selectedFeatureChoices[featureId] || []
  const f = enrichedAvailableFeatures.value.find(x=>x.id===featureId)
  const required = f?.choose || 0
  if(arr.length !== required) return alert(`Sélectionnez exactement ${required} option(s) pour ${f.displayName || featureId}`)
  perso.features = perso.features || []
  perso.features.push({ featureId, choices: [...arr], name: f.displayName })
  featureChoicesLocked[featureId] = true
  alert(`${f.displayName || featureId} validée.`)
}

/* ---------- equipementModel pour select multiple ---------- */
const equipementModel = computed({
  get(){
    if(Array.isArray(perso.equipement)) return perso.equipement
    if(!perso.equipement) return []
    if(typeof perso.equipement === 'string'){
      return perso.equipement.split(',').map((s:string)=>s.trim()).filter(Boolean)
    }
    return []
  },
  set(val: string[]|Set<string>){
    if(val instanceof Set) val = Array.from(val)
    perso.equipement = Array.isArray(val) ? val : []
  }
})

/* ---------- Choix de compétences (classe) ---------- */
const classSkillChoices = computed(() => {
  return classData.value?.raw?.skill_choices || classData.value?.skill_choices || null
})
const selectedSkills = ref<string[]>([])
const isSkillLocked = ref(false)

function toggleSkillChoice(skill: string) {
  if(isSkillLocked.value) return
  const idx = selectedSkills.value.indexOf(skill)
  if(idx === -1) {
    if(classSkillChoices.value && selectedSkills.value.length < classSkillChoices.value.choose) selectedSkills.value.push(skill)
    else alert(`Vous ne pouvez sélectionner que ${classSkillChoices.value.choose} compétences.`)
  } else selectedSkills.value.splice(idx, 1)
}

function validerSkills(){
  if(!classSkillChoices.value) return
  if(selectedSkills.value.length !== classSkillChoices.value.choose) return alert(`Sélectionnez exactement ${classSkillChoices.value.choose} compétences.`)
  selectedSkills.value.forEach(s=> perso.competences[String(s).toLowerCase()] = true)
  isSkillLocked.value = true
  alert('Compétences validées.')
}
function deverrouillerSkills(){
  if(!confirm('Déverrouiller les compétences supprimera la validation. Continuer ?')) return
  isSkillLocked.value = false
}

/* ---------- PV / DV calculs ---------- */
const dvComputed = computed(()=> {
  if(classData.value && (classData.value.raw?.hit_die || classData.value.raw?.hit_die_die)) {
    return Number(classData.value.raw?.hit_die || classData.value.raw?.hit_die_die) || perso.dv
  }
  return perso.dv
})
const pvMaxComputed = computed(()=> {
  const modCon = mod(perso.caracs.constitution)
  return pvMaxAuNiveau(dvComputed.value || perso.dv, perso.niveau, modCon)
})
const pvActuelsComputed = computed(()=> pvMaxComputed.value)

/* ---------- armes filtering (réutilisé) ---------- */
function extractWeaponProfSet(obj:any){
  const set = new Set<string>()
  if(!obj) return set
  const scan = (x:any)=>{
    if(!x) return
    if(Array.isArray(x)){ x.forEach(i=> scan(i)); return }
    if(typeof x === 'string'){ const t = x.toLowerCase(); if(t.includes('mart')) set.add('martiale'); if(t.includes('simple')) set.add('simple'); return }
    if(typeof x === 'object'){ Object.values(x).forEach(v=> scan(v)); return }
  }
  scan(obj)
  return set
}

const classWeaponProfSet = computed(()=>{
  const s = extractWeaponProfSet(classData.value?.raw || {})
  const t = extractWeaponProfSet(subclassData.value?.raw || {})
  t.forEach(x=> s.add(x))
  return s
})

const armesOptionsFiltered = computed(()=> {
  if(!armesOptionsAll.value.length) return []
  const profSet = classWeaponProfSet.value
  if(profSet.size === 0) return armesOptionsAll.value.map(a=>normalizeArme(a))
  return armesOptionsAll.value.filter(a=>{
    const raw = a.raw || {}
    const weaponObj = raw.weapon || raw.weapon_properties || raw.type || raw || {}
    const txt = JSON.stringify(weaponObj).toLowerCase()
    const isMartial = txt.includes('mart') || txt.includes('martial')
    const isSimple = txt.includes('simple')
    const nameTxt = String(a.name||'').toLowerCase()
    const matchesSpecific = Array.from(profSet).some(p=> nameTxt.includes(p))
    if(matchesSpecific) return true
    if(profSet.has('martiale') && isMartial) return true
    if(profSet.has('simple') && isSimple) return true
    return false
  }).map(a=>normalizeArme(a))
})

function normalizeArme(a:any){
  const raw = a.raw || {}
  let weaponType = 'inconnu'
  const w = raw.weapon || raw.weapon_properties || raw.type || {}
  const txt = JSON.stringify(w || {}).toLowerCase()
  if(txt.includes('mart')) weaponType = 'martiale'
  else if(txt.includes('simple')) weaponType = 'simple'
  else if(raw.category) weaponType = String(raw.category)
  return { id: a.id, name: a.name, weaponType, raw }
}

/* ---------- Misc functions ---------- */
function modificateur(cle:any){ return mod(perso.caracs[cle]) }
function scoreCompetence(c:any){ const base = mod(perso.caracs[c.carac]); const mait = perso.competences[c.id] ? bonusMaitrise.value : 0; return base + mait }

function generer(mode:'roll'|'array'|'buy'){
  let scores: number[] = []
  if(mode==='roll') scores = Array.from({length:6}, () => roll4d6DropLowest())
  if(mode==='array') scores = [...standardArray]
  if(mode==='buy') scores = pointBuy27()
  const clefs = ['force','dexterite','constitution','intelligence','sagesse','charisme'] as const
  clefs.forEach((k,i)=>{ perso.caracs[k] = scores[i] || perso.caracs[k] })
  perso.pvActuels = pvMaxAuNiveau(dvComputed.value || perso.dv, perso.niveau, mod(perso.caracs.constitution))
}

function precedent(){ if(etape.value>1) etape.value-- }
function suivant(){ if(etape.value<5) etape.value++ }
function sauvegarder(){
  // before saving, write computed fields into perso
  perso.dv = dvComputed.value
  perso.pvActuels = pvMaxAuNiveau(perso.dv, perso.niveau, mod(perso.caracs.constitution))
  store.sauvegarderLocal()
  alert('Personnage enregistré localement !')
}

// JSON utilities
function editerJSON(){ const s = JSON.stringify(perso, null, 2); const w = window.open('', '_blank'); if(w){ w.document.write('<pre>'+s.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</pre>') } }
function telechargerJSON(){ const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(perso, null, 2)); const a = document.createElement('a'); a.setAttribute('href', dataStr); a.setAttribute('download', (perso.nom||'personnage') + '.json'); document.body.appendChild(a); a.click(); a.remove() }
</script>

<style scoped>
/* Conteneur bloc */
.bloc{ border:1px solid var(--bord); border-radius:12px; padding:12px; background:var(--fond, #0b1225); }
/* Labels */
label{ display:block; font-size:12px; color:var(--texte-2); margin-bottom:6px; }
/* Inputs et selects */
input.input, select.input { width:100%; padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:var(--texte, #e6eefc); }
/* Assurer la visibilité des options (selon navigateur) */
select.input option { color: var(--texte, #e6eefc) !important; background: transparent; }
/* Badges */
.badge{ background: rgba(255,255,255,0.06); padding:2px 6px; border-radius:8px; font-size:11px; }
/* Table */
.table{ width:100%; border-collapse:collapse; }
.table th, .table td{ padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.03); color:var(--texte); }

/* Modal simple pour choix sous-classe */
.bw-modal {
  position: fixed;
  inset: 0;
  display:flex;
  align-items:center;
  justify-content:center;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
}
.bw-modal .card {
  background: var(--fond, #0b1225);
  padding: 16px;
  border-radius: 10px;
  width: 90%;
  max-width: 720px;
  color: var(--texte, #e6eefc);
  box-shadow: 0 6px 24px rgba(0,0,0,0.6);
}
.bw-modal .list { max-height: 60vh; overflow:auto; margin-top:8px; }
.bw-modal .list label { display:flex; align-items:center; gap:8px; padding:6px 0; }
</style>
