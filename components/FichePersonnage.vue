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
          <strong>Competences</strong>
          <div style="margin-top:6px; display:flex; flex-wrap: wrap; gap:6px;">
            <span v-for="c in competencesAffichees" :key="c.id" class="badge">
              {{ c.nom }}{{ c.rank === 'expertise' ? ' (Expertisee)' : '' }} ({{ c.total >= 0 ? '+' : '' }}{{ c.total }})
            </span>
            <span v-if="!competencesAffichees.length" style="color:var(--texte-2);">Aucune</span>
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
import {
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_CATEGORY_ORDER,
  prettifyLabel,
  type ProficiencyCategory,
  type ProficiencyRank,
  type ProficiencySummary
} from '@/utils/proficiencies'
import type { CompetenceDef } from '@/utils/competences'

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

const rankFromValue = (value: unknown): ProficiencyRank | null => {
  if (!value) return null
  if (value === 'expertise') return 'expertise'
  if (value === 'maitrise') return 'maitrise'
  if (value === true) return 'maitrise'
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'expertise') return 'expertise'
    if (lower === 'maitrise' || lower === 'proficiency') return 'maitrise'
  }
  return null
}

const scoreCompetence = (def: CompetenceDef, rank: ProficiencyRank | null) => {
  const base = mod(Number(p.caracs?.[def.carac] ?? 10))
  if (rank === 'expertise') return base + mait.value * 2
  if (rank === 'maitrise') return base + mait.value
  return base
}

const competencesAffichees = computed(() => {
  const map = (p.competences ?? {}) as Record<string, unknown>
  return (store.listeCompetences as CompetenceDef[])
    .map((def) => {
      const rank = rankFromValue(map[def.id])
      if (!rank) return null
      return {
        ...def,
        rank,
        total: scoreCompetence(def, rank)
      }
    })
    .filter(Boolean) as Array<CompetenceDef & { rank: ProficiencyRank; total: number }>
})

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
    ? (derived.value.proficiencySummary as ProficiencySummary)
    : (p.proficienciesDetail && typeof p.proficienciesDetail === 'object'
        ? (p.proficienciesDetail as ProficiencySummary)
        : {}))

  const groups: Array<{ category: string; label: string; items: string[] }> = []
  for (const [rawCategory, list] of Object.entries(summary || {})) {
    const category = String(rawCategory || '').toLowerCase()
    if (category === 'competences' || category === 'skills' || category === 'sauvegardes' || category === 'saving_throws') continue
    const entries = Array.isArray(list) ? list : []
    const items = entries
      .map((entry: any) => {
        const label = entry?.label ?? entry?.nom ?? entry?.name ?? entry?.id ?? ''
        if (!label) return ''
        return prettifyLabel(String(label))
      })
      .filter((label: string) => label.length)
    if (!items.length) continue
    const defaultLabel = DEFAULT_CATEGORY_LABELS[category as keyof typeof DEFAULT_CATEGORY_LABELS] ?? prettifyLabel(category)
    groups.push({ category, label: defaultLabel, items })
  }

  groups.sort((a, b) => {
    const ai = DEFAULT_CATEGORY_ORDER.indexOf(a.category as ProficiencyCategory)
    const bi = DEFAULT_CATEGORY_ORDER.indexOf(b.category as ProficiencyCategory)
    const safeAi = ai === -1 ? DEFAULT_CATEGORY_ORDER.length + 1 : ai
    const safeBi = bi === -1 ? DEFAULT_CATEGORY_ORDER.length + 1 : bi
    if (safeAi !== safeBi) return safeAi - safeBi
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
