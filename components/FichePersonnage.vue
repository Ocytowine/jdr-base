<template>
  <div class="fiche" :class="{ compact }">
    <h3 class="h2">Fiche personnage</h3>
    <div class="champs" style="margin-top:8px;">
      <div style="grid-column: span 6;">
        <div class="carte-mini">
          <strong>{{ p.nom || 'Sans-nom' }}</strong>
          <div style="color:var(--texte-2);">{{ p.lignee }} — {{ p.classe }} {{ p.niveau }}</div>
          <div class="ligne" style="gap:8px; margin-top:6px;">
            <span class="badge">CA {{ ca }}</span>
            <span class="badge" v-if="pvMax > 0">PV {{ p.pvActuels }}/{{ pvMax }}</span>
            <span class="badge" v-else>PV ...</span>
            <span class="badge">Init {{ init >= 0 ? '+' : '' }}{{ init }}</span>
            <span class="badge">Maitrise +{{ mait }}</span>
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
          <strong>Competences maitrisees</strong>
          <div style="margin-top:6px; display:flex; flex-wrap: wrap; gap:6px;">
            <span v-for="c in competencesMaitrisees" :key="c.id" class="badge">
              {{ c.nom }} ({{ scoreCompetence(c) >=0?'+':'' }}{{ scoreCompetence(c) }})
            </span>
            <span v-if="!competencesMaitrisees.length" style="color:var(--texte-2);">Aucune</span>
          </div>
        </div>
      </div>
    </div>

    <div class="champs" style="margin-top:8px;" v-if="proficiencyCategories.length">
      <div style="grid-column: span 12;">
        <div class="carte-mini">
          <strong>Maitrises debloquees</strong>
          <div class="proficiency-groups">
            <div v-for="group in proficiencyCategories" :key="group.category" class="proficiency-group">
              <div class="group-title">{{ group.label }}</div>
              <div class="group-items">
                <span v-for="item in group.items" :key="item" class="badge">{{ item }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="champs" style="margin-top:8px;" v-if="savingThrowsDisplay.length">
      <div style="grid-column: span 12;">
        <div class="carte-mini">
          <strong>Jets de sauvegarde</strong>
          <div style="margin-top:6px; display:flex; flex-wrap: wrap; gap:6px;">
            <span v-for="save in savingThrowsDisplay" :key="save.id" class="badge">
              {{ save.label }} ({{ save.total >= 0 ? '+' : '' }}{{ save.total }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="champs" style="margin-top:8px;" v-if="p.monture?.nom">
      <div style="grid-column: span 12;">
        <div class="carte-mini">
          <strong>Monture / Creature</strong>
          <div style="margin-top:6px;">{{ p.monture.nom }} — {{ p.monture.vitesse || 'vitesse ?' }}</div>
          <div style="color:var(--texte-2);">{{ p.monture.notes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePersonnage } from '@/stores/personnage'
import { mod, classeArmureDeBase } from '@/utils/regles_du_jeu'

const props = defineProps<{ compact?: boolean }>()
const store = usePersonnage()
const p: any = store.perso || {
  nom: '',
  lignee: '',
  classe: '',
  niveau: 1,
  dv: 0,
  pvActuels: 0,
  caracs: { force: 10, dexterite: 10, constitution: 10, intelligence: 10, sagesse: 10, charisme: 10 },
  armure: { type: 'aucune' },
  bouclier: false,
  monture: { nom: '', vitesse: '', notes: '' },
  competences: {}
}

const derived = computed(() => (store as any).derived)
const mait = computed(() => Number(derived.value?.proficiencyBonus || 0))
const init = computed(() => mod(Number(p.caracs?.dexterite || 10)))
const ca = computed(() => classeArmureDeBase(Number(p.caracs?.dexterite || 10), p.armure?.type || 'aucune', !!p.bouclier))
const pvMax = computed(() => Number(derived.value?.pvMax || 0))

const competencesMaitrisees = computed(() => (store.listeCompetences as any[]).filter((c: any) => Boolean(p.competences?.[c.id])))

function scoreCompetence(c: { id: string; nom: string; carac: keyof typeof p.caracs }) {
  const base = mod(Number(p.caracs?.[c.carac] ?? 10))
  const maitB = p.competences?.[c.id] ? mait.value : 0
  return base + maitB
}

const prettify = (value: string): string => {
  const cleaned = String(value || '').replace(/[_-]+/g, ' ').trim()
  if (!cleaned.length) return ''
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const categoryLabels: Record<string, string> = {
  armor: 'Armures',
  armure: 'Armures',
  weapons: 'Armes',
  armes: 'Armes',
  tools: 'Outils',
  outils: 'Outils',
  languages: 'Langues',
  langue: 'Langues',
  vehicles: 'Vehicules',
  vehicules: 'Vehicules',
  instruments: 'Instruments',
  gaming_sets: 'Jeux',
  other: 'Divers'
}

const categoryOrder = ['armor', 'weapons', 'tools', 'languages', 'vehicles', 'instruments', 'gaming_sets', 'other']

const abilityMeta: Record<string, { key: string; label: string }> = {
  force: { key: 'force', label: 'Force' },
  strength: { key: 'force', label: 'Force' },
  dexterite: { key: 'dexterite', label: 'Dexterite' },
  dexterity: { key: 'dexterite', label: 'Dexterite' },
  constitution: { key: 'constitution', label: 'Constitution' },
  intelligence: { key: 'intelligence', label: 'Intelligence' },
  sagesse: { key: 'sagesse', label: 'Sagesse' },
  wisdom: { key: 'sagesse', label: 'Sagesse' },
  charisme: { key: 'charisme', label: 'Charisme' },
  charisma: { key: 'charisme', label: 'Charisme' }
}

const abilityOrder = ['force', 'dexterite', 'constitution', 'intelligence', 'sagesse', 'charisme']

const proficiencyCategories = computed(() => {
  const summary = (derived.value?.proficiencySummary && typeof derived.value.proficiencySummary === 'object'
    ? derived.value.proficiencySummary
    : (p.proficienciesDetail && typeof p.proficienciesDetail === 'object' ? p.proficienciesDetail : {})) as Record<
    string,
    Array<{ id: string; label?: string }>
  >
  const groups: Array<{ category: string; label: string; items: string[] }> = []
  for (const [rawCategory, list] of Object.entries(summary || {})) {
    const category = String(rawCategory || '').toLowerCase()
    if (category === 'skills' || category === 'saving_throws') continue
    const items = Array.isArray(list)
      ? list
          .map((entry) => {
            const label = entry?.label ?? entry?.nom ?? entry?.name ?? entry?.id ?? ''
            return label ? prettify(label) : ''
          })
          .filter((label) => label.length)
      : []
    if (!items.length) continue
    const label = categoryLabels[category] ?? prettify(category)
    groups.push({ category, label, items })
  }
  const indexFor = (cat: string) => {
    const idx = categoryOrder.indexOf(cat)
    return idx === -1 ? categoryOrder.length + 1 : idx
  }
  groups.sort((a, b) => {
    const ai = indexFor(a.category)
    const bi = indexFor(b.category)
    if (ai !== bi) return ai - bi
    return a.label.localeCompare(b.label)
  })
  return groups
})

const savingThrowsDisplay = computed(() => {
  const rawList = Array.isArray(derived.value?.savingThrows) && derived.value?.savingThrows?.length
    ? derived.value.savingThrows
    : (Array.isArray(p.savingThrows) ? p.savingThrows : [])
  const entries: Array<{ id: string; label: string; total: number; sortKey: string }> = []
  for (const entry of rawList || []) {
    if (entry === null || entry === undefined) continue
    const id = String(entry).trim()
    if (!id.length) continue
    const key = id.toLowerCase()
    const meta = abilityMeta[key]
    const abilityKey = meta?.key ?? null
    const abilityScore = abilityKey ? Number((p.caracs as any)?.[abilityKey] ?? 10) : 10
    const total = mod(abilityScore) + mait.value
    const label = meta?.label ?? prettify(id)
    const sortKey = meta?.key ?? key
    entries.push({ id: key, label, total, sortKey })
  }
  const orderIndex = (key: string) => {
    const idx = abilityOrder.indexOf(key)
    return idx === -1 ? abilityOrder.length + 1 : idx
  }
  return entries
    .sort((a, b) => {
      const ai = orderIndex(a.sortKey)
      const bi = orderIndex(b.sortKey)
      if (ai !== bi) return ai - bi
      return a.label.localeCompare(b.label)
    })
    .map(({ id, label, total }) => ({ id, label, total }))
})
</script>

<style scoped>
.fiche.compact .carte-mini{ padding:10px; }
.carte-mini{ background:#0f1330; border:1px solid var(--bord); border-radius:12px; padding:14px; }
.table th, .table td{ border-bottom:1px solid var(--bord); padding:8px 6px; text-align:left; }
.proficiency-groups{ margin-top:6px; display:flex; flex-direction:column; gap:8px; }
.proficiency-group .group-title{ font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:var(--texte-2); }
.proficiency-group .group-items{ margin-top:4px; display:flex; flex-wrap:wrap; gap:6px; }
</style>
