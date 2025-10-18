<template>
  <div class="fiche" :class="{ compact }">
    <h3 class="h2">Fiche personnage</h3>
    <div class="champs" style="margin-top:8px;">
      <div style="grid-column: span 6;">
        <div class="carte-mini header-card">
          <div class="header-card__identity">
            <strong>{{ p.nom || 'Sans-nom' }}</strong>
            <span class="header-card__subtitle">{{ p.lignee || 'Origine inconnue' }}</span>
          </div>
          <div class="header-card__levels">
            <div class="header-card__global">
              <span class="header-card__global-label">Niveau global</span>
              <span class="header-card__global-value">{{ globalLevel }}</span>
            </div>
            <div class="header-card__classes">
              <template v-if="classDisplayEntries.length">
                <span v-for="slot in classDisplayEntries" :key="slot.id" class="class-chip">
                  {{ slot.label }} <small v-if="slot.level">niv {{ slot.level }}</small>
                </span>
              </template>
              <span v-else class="muted">Classe inconnue</span>
            </div>
          </div>
          <div class="header-card__xp" v-if="xpProgress.nextThreshold !== null">
            <div class="header-card__xp-label">
              XP {{ xpProgress.current }} / {{ xpProgress.nextThreshold }}
              <span class="header-card__xp-remaining">({{ xpProgress.remaining }} restant)</span>
            </div>
            <div class="xp-bar">
              <div class="xp-bar__fill" :style="{ width: xpProgress.ratio + '%' }"></div>
            </div>
          </div>
          <div class="header-card__xp" v-else>
            <div class="header-card__xp-label">XP {{ xpProgress.current }} (niveau maximum)</div>
          </div>
          <div class="ligne header-card__badges">
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
          <strong>Maitrises</strong>
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
import { useDataStore } from '@/stores/data'
import { xpThresholdForLevel, MAX_SUPPORTED_LEVEL } from '@/composables/useExperienceLevelUp'

const props = defineProps<{ compact?: boolean }>()
const store = usePersonnage()
const dataStore = useDataStore()
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
const globalLevel = computed(() => Math.max(1, Number(p.niveau || 1)))
const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
}
const labelForClassId = (id: string | null, fallback: string | null = null): string | null => {
  if (!id) return fallback
  const raw = dataStore.maps.classes?.[id] ?? null
  const label = raw?.name ?? raw?.nom ?? raw?.label ?? raw?.slug ?? fallback ?? id
  return label ? String(label) : null
}
const classDisplayEntries = computed(() => {
  const entries: Array<{ id: string; label: string; level: number }> = []
  const slot1Id = normalizeId(p.classeId1 ?? p.classeId ?? null)
  const slot2Id = normalizeId(p.classeId2 ?? null)
  const slot1Level = Number(p.levelClasse1 ?? (slot1Id ? p.niveau : 0) ?? 0) || (slot1Id ? globalLevel.value : 0)
  const slot2Level = Number(p.levelClasse2 ?? 0) || 0
  if (slot1Id) {
    entries.push({
      id: slot1Id,
      label: labelForClassId(slot1Id, p.classe ? String(p.classe) : slot1Id) ?? slot1Id,
      level: slot1Level
    })
  } else if (p.classe) {
    entries.push({
      id: 'main',
      label: String(p.classe),
      level: globalLevel.value
    })
  }
  if (slot2Id) {
    entries.push({
      id: slot2Id,
      label: labelForClassId(slot2Id, slot2Id) ?? slot2Id,
      level: slot2Level > 0 ? slot2Level : 1
    })
  }
  return entries
})
const xpProgress = computed(() => {
  const current = Number(p.xp ?? 0) || 0
  const level = globalLevel.value
  const previousThreshold = xpThresholdForLevel(level)
  const nextThreshold =
    level >= MAX_SUPPORTED_LEVEL ? null : xpThresholdForLevel(Math.min(MAX_SUPPORTED_LEVEL, level + 1))
  if (nextThreshold === null) {
    return { current, previousThreshold, nextThreshold: null, remaining: 0, ratio: 100 }
  }
  const span = Math.max(1, nextThreshold - previousThreshold)
  const progress = Math.max(0, Math.min(1, (current - previousThreshold) / span))
  const remaining = Math.max(0, nextThreshold - current)
  return {
    current,
    previousThreshold,
    nextThreshold,
    remaining,
    ratio: Math.round(progress * 100)
  }
})

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
        const rank = entry?.rank === 'expertise' ? 'expertise' : 'maitrise'
        const baseLabel = prettifyLabel(String(label))
        return rank === 'expertise' ? `${baseLabel} (Expertise)` : baseLabel
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
.header-card{ display:flex; flex-direction:column; gap:10px; }
.header-card__identity{ display:flex; flex-direction:column; gap:2px; }
.header-card__subtitle{ color:var(--texte-2); font-size:13px; }
.header-card__levels{ display:flex; flex-direction:column; gap:6px; }
.header-card__global{ display:flex; align-items:center; gap:8px; }
.header-card__global-label{ font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:var(--texte-2); }
.header-card__global-value{ font-size:20px; font-weight:600; }
.header-card__classes{ display:flex; flex-wrap:wrap; gap:8px; }
.class-chip{ background:rgba(255,255,255,0.06); border-radius:999px; padding:4px 10px; font-size:13px; display:flex; align-items:center; gap:4px; }
.class-chip small{ font-size:11px; color:var(--texte-2); text-transform:uppercase; letter-spacing:0.04em; }
.header-card__xp{ display:flex; flex-direction:column; gap:4px; }
.header-card__xp-label{ font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:var(--texte-2); display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.header-card__xp-remaining{ text-transform:none; letter-spacing:normal; font-size:11px; color:var(--texte-3); }
.xp-bar{ position:relative; height:6px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; }
.xp-bar__fill{ background:#4f7cff; height:100%; border-radius:inherit; transition:width 0.3s ease; }
.header-card__badges{ gap:8px; margin-top:4px; flex-wrap:wrap; }
.muted{ color:var(--texte-2); }
.table th, .table td{ border-bottom:1px solid var(--bord); padding:8px 6px; text-align:left; }
.proficiency-groups{ margin-top:6px; display:flex; flex-direction:column; gap:8px; }
.proficiency-group .group-title{ font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:var(--texte-2); }
.proficiency-group .group-items{ margin-top:4px; display:flex; flex-wrap:wrap; gap:6px; }
</style>
