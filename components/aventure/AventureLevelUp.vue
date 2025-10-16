<template>
  <div class="levelup">
    <header class="levelup__header">
      <div>
        <h2>Amelioration de niveau</h2>
        <p>Apercu des changements pour passer du niveau {{ currentLevel }} -> {{ targetLevel }}.</p>
      </div>
      <div class="levelup__actions">
        <button class="btn" type="button" @click="handleCancel">Annuler</button>
        <button
          class="btn btn-primaire"
          type="button"
          :disabled="saving || hasPendingChoices"
          @click="confirmLevelUp"
        >
          <span v-if="saving">Validation...</span>
          <span v-else>Valider le niveau {{ targetLevel }}</span>
        </button>
      </div>
    </header>

    <section class="levelup__grid">
      <article class="card">
        <h3 class="card__title">Resume des statistiques</h3>
        <ul class="diff">
          <li>
            <span>Niveau</span>
            <strong>{{ currentLevel }} -> {{ targetLevel }}</strong>
          </li>
          <li>
            <span>PV maximum</span>
            <strong>{{ currentPvMax }} -> {{ nextPvMax }}</strong>
          </li>
          <li>
            <span>Maitrise</span>
            <strong>+{{ currentProf }} -> +{{ nextProf }}</strong>
          </li>
          <li>
            <span>Magie (DD / ATK)</span>
            <strong>{{ currentSpell }} -> {{ nextSpell }}</strong>
          </li>
        </ul>
      </article>

      <article class="card">
        <h3 class="card__title">Nouvelles capacites</h3>
        <ul class="list">
          <li v-for="fid in newFeatureIds" :key="fid">{{ featureLabel(fid) }}</li>
          <li v-if="!newFeatureIds.length" class="muted">Aucune nouvelle capacite detectee.</li>
        </ul>
      </article>
    </section>

    <section class="choices" v-if="pendingChoices.length">
      <h3>Choix a effectuer ({{ pendingChoices.length }})</h3>
      <div v-for="pc in pendingChoices" :key="pc.ui_id" class="choice">
        <div class="choice__head">
          <strong>{{ pc.title || pc.ui_id }}</strong>
          <span class="muted" v-if="pc.choose && pc.choose > 1">Selectionnez {{ pc.choose }}</span>
        </div>
        <div class="choice__options">
          <template v-if="pc.choose && pc.choose > 1">
            <label v-for="opt in optionLabels(pc)" :key="opt.id" class="option">
              <input type="checkbox" :value="opt.id" v-model="localChoices[pc.ui_id]" />
              <span>{{ opt.label }}</span>
            </label>
          </template>
          <template v-else>
            <label v-for="opt in optionLabels(pc)" :key="opt.id" class="option">
              <input type="radio" :name="pc.ui_id" :value="opt.id" v-model="localChoices[pc.ui_id]" />
              <span>{{ opt.label }}</span>
            </label>
          </template>
        </div>
        <div class="choice__actions">
          <button class="btn" type="button" @click="applyChoice(pc)">Appliquer ce choix</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRequestFetch } from '#app'
import { usePersonnage } from '@/stores/personnage'
import { bonusDeMaitrise } from '@/utils/regles_du_jeu'
import { useDataStore } from '@/stores/data'
import { useParties } from '@/stores/parties'

const emit = defineEmits<{
  (e: 'close', payload?: { reason: 'cancel' | 'confirmed'; level: number }): void
}>()

const store = usePersonnage()
const dataStore = useDataStore()
const requestFetch = useRequestFetch()

const saving = ref(false)
const currentLevel = computed(() => Number((store as any).perso?.niveau || 1))
const targetLevel = computed(() => currentLevel.value + 1)
const currentPvMax = computed(() => Number(((store as any).derived?.pvMax) || 0))
const currentProf = computed(() => Number(((store as any).derived?.proficiencyBonus) || 0))
const currentSpell = computed(() => {
  try {
    const d: any = (store as any).derived || {}
    const dc = d?.spellcasting?.dc ?? null
    const atk = d?.spellcasting?.attack ?? null
    if (dc === null && atk === null) return '-'
    return `${dc ?? '-'} / ${atk ?? '-'}`
  } catch {
    return '-'
  }
})

const preview = ref<any | null>(null)
const pendingChoices = computed<any[]>(() =>
  Array.isArray(preview.value?.pendingChoices) ? preview.value.pendingChoices : []
)
const hasPendingChoices = computed(() => pendingChoices.value.length > 0)
const appliedFeatures = computed<string[]>(() =>
  Array.isArray(preview.value?.appliedFeatures)
    ? preview.value.appliedFeatures.map((x: any) => String(x))
    : []
)
const nextPvMax = computed(() => Number(preview.value?.previewCharacter?.pv_max ?? 0))
const nextProf = computed(() => bonusDeMaitrise(targetLevel.value))
const nextSpell = computed(() => {
  const sc = (preview.value?.previewCharacter?.spellcasting ?? {}) as any
  const dc = sc?.meta?.spell_save_dc ?? null
  const atk = sc?.meta?.spell_attack_mod ?? null
  if (dc === null && atk === null) return '-'
  return `${dc ?? '-'} / ${atk ?? '-'}`
})

const localChoices = reactive<Record<string, string | string[] | null>>({})

const resetLocalChoices = () => {
  const choices = Array.isArray(preview.value?.pendingChoices) ? preview.value.pendingChoices : []
  const validIds = new Set<string>()
  for (const choice of choices) {
    const id = String(choice?.ui_id ?? '')
    if (!id) continue
    validIds.add(id)
    if (choice?.choose && choice.choose > 1) {
      if (!Array.isArray(localChoices[id])) {
        localChoices[id] = []
      }
    } else {
      if (typeof localChoices[id] !== 'string') {
        localChoices[id] = null
      }
    }
  }
  for (const key of Object.keys(localChoices)) {
    if (!validIds.has(key)) {
      delete localChoices[key]
    }
  }
}

function optionLabels(pc: any): Array<{ id: string; label: string }> {
  const labels = Array.isArray(pc?.from_labels) ? pc.from_labels : []
  if (labels.length) {
    return labels.map((l: any) => ({ id: String(l.id), label: String(l.label ?? l.id) }))
  }
  const ids = Array.isArray(pc?.from) ? pc.from : []
  return ids.map((id: any) => ({ id: String(id), label: String(id) }))
}

function featureLabel(id: string): string {
  const raw = (dataStore.maps.features || {})[id]
  if (!raw) return id
  return String(raw?.name || raw?.label || id)
}

async function loadPreview() {
  const p: any = (store as any).perso || {}
  const selection = {
    class: p.classeId || p.classe || null,
    race: p.raceId || p.lignee || null,
    background: p.backgroundId || p.historique || null,
    niveau: targetLevel.value,
    chosenOptions: {}
  }
  const baseCharacter = {
    base_stats_before_race: {
      strength: Number(p?.caracs?.force ?? 10),
      dexterity: Number(p?.caracs?.dexterite ?? 10),
      constitution: Number(p?.caracs?.constitution ?? 10),
      intelligence: Number(p?.caracs?.intelligence ?? 10),
      wisdom: Number(p?.caracs?.sagesse ?? 10),
      charisma: Number(p?.caracs?.charisme ?? 10)
    }
  }
  try {
    const res = await requestFetch('/api/creation/preview', {
      method: 'POST',
      body: { selection, baseCharacter }
    })
    preview.value = res
    resetLocalChoices()
  } catch (error) {
    preview.value = null
    resetLocalChoices()
    console.warn('[AventureLevelUp] preview failed', error)
  }
}

async function applyChoice(pc: any) {
  const ui_id = String(pc?.ui_id || '')
  if (!ui_id) return
  const p: any = (store as any).perso || {}
  const selection = {
    class: p.classeId || p.classe || null,
    race: p.raceId || p.lignee || null,
    background: p.backgroundId || p.historique || null,
    niveau: targetLevel.value,
    chosenOptions: {}
  }
  const baseCharacter = {
    base_stats_before_race: {
      strength: Number(p?.caracs?.force ?? 10),
      dexterity: Number(p?.caracs?.dexterite ?? 10),
      constitution: Number(p?.caracs?.constitution ?? 10),
      intelligence: Number(p?.caracs?.intelligence ?? 10),
      wisdom: Number(p?.caracs?.sagesse ?? 10),
      charisma: Number(p?.caracs?.charisme ?? 10)
    }
  }
  const value =
    pc.choose && pc.choose > 1
      ? Array.isArray(localChoices[ui_id])
        ? localChoices[ui_id]
        : []
      : (localChoices[ui_id] ?? null)

  try {
    const res = await requestFetch('/api/creation/resolve-choice', {
      method: 'POST',
      body: { selection, baseCharacter, ui_id, value }
    })
    preview.value = res
    resetLocalChoices()
  } catch (error) {
    console.warn('[AventureLevelUp] applyChoice failed', error)
  }
}

const newFeatureIds = computed(() => {
  try {
    const current: string[] = Array.isArray((store as any).perso?.featureIds)
      ? (store as any).perso.featureIds.map((x: any) => String(x))
      : []
    const next: string[] = appliedFeatures.value
    const currentSet = new Set(current)
    return next.filter((fid) => !currentSet.has(fid))
  } catch {
    return []
  }
})

async function confirmLevelUp() {
  if (hasPendingChoices.value) return
  saving.value = true
  try {
    const validatedLevel = targetLevel.value
    const cur = Array.isArray((store as any).perso?.featureIds)
      ? (store as any).perso.featureIds.map((x: any) => String(x))
      : []
    const merged = Array.from(new Set([...cur, ...newFeatureIds.value]))
    ;(store as any).perso.featureIds = merged
    await (store as any).levelUp?.(1)
    try {
      const parties = useParties()
      const id = parties.currentPartyId || null
      if (id) (store as any).sauvegarderLocal?.(id)
    } catch (error) {
      console.warn('[AventureLevelUp] sauvegarde locale impossible', error)
    }
    emit('close', { reason: 'confirmed', level: validatedLevel })
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('close', { reason: 'cancel', level: targetLevel.value })
}

onMounted(async () => {
  await loadPreview()
})

watch(
  () => targetLevel.value,
  async (next, prev) => {
    if (next !== prev) {
      await loadPreview()
    }
  }
)
</script>

<style scoped>
.levelup {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.levelup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.levelup__actions {
  display: flex;
  gap: 8px;
}
.levelup__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.card {
  border: 1px solid var(--bord);
  border-radius: 16px;
  padding: 16px;
  background: rgba(12, 16, 38, 0.9);
}
.card__title {
  margin: 0 0 8px;
  font-size: 16px;
}
.diff {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.diff li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--bord);
}
.diff li:last-child {
  border-bottom: none;
}
.muted {
  color: var(--texte-2);
}
.choices {
  border: 1px solid var(--bord);
  border-radius: 16px;
  padding: 16px;
  background: rgba(12, 16, 38, 0.9);
}
.choice {
  border-top: 1px solid var(--bord);
  padding-top: 12px;
  margin-top: 12px;
}
.choice:first-child {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.choice__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  justify-content: space-between;
}
.choice__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 8px;
}
.option {
  display: flex;
  gap: 6px;
  align-items: center;
}
.btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #1d2350;
  border: 1px solid var(--bord);
  color: #fff;
  cursor: pointer;
}
.btn[disabled] {
  opacity: 0.6;
  cursor: default;
}
.btn-primaire {
  background: #2b3cb8;
  border-color: #2b3cb8;
}
</style>
