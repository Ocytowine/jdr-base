<template>
  <div class="levelup">
    <header class="levelup__header">
      <div>
        <h2>Amelioration de niveau</h2>
        <p>Apercu des changements pour passer du niveau {{ currentLevel }} -> {{ targetLevel }}.</p>
        <p class="levelup__xp">
          XP {{ xpProgress.current }}
          <template v-if="xpProgress.next !== null">
            / {{ xpProgress.next }} &middot; reste {{ xpProgress.remaining }} ({{ xpProgress.ratio }}%)
          </template>
          <template v-else>
            &middot; niveau maximum atteint
          </template>
        </p>
      </div>
      <div class="levelup__actions">
        <button class="btn" type="button" @click="handleCancel">Annuler</button>
        <button
          class="btn btn-primaire"
          type="button"
          :disabled="saving || hasPendingChoices || !classEligibility.allowed"
          @click="confirmLevelUp"
        >
          <span v-if="saving">Validation...</span>
          <span v-else>Valider le niveau {{ targetLevel }}</span>
        </button>
      </div>
    </header>

    <section class="class-select">
      <h3 class="class-select__title">Classe choisie pour ce niveau</h3>
      <div class="class-select__slots">
        <button
          class="class-slot"
          type="button"
          :class="{
            'class-slot--selected': selectedSlot === 1,
            'class-slot--disabled': !slotSummaries.slot1.clickable
          }"
          :disabled="!slotSummaries.slot1.clickable"
          @click="handleSlotClick(1)"
        >
          <span class="class-slot__label">{{ slotSummaries.slot1.label }}</span>
          <span class="class-slot__level" v-if="slotSummaries.slot1.level">niv {{ slotSummaries.slot1.level }}</span>
        </button>
        <button
          class="class-slot"
          type="button"
          :class="{
            'class-slot--selected': selectedSlot === 2,
            'class-slot--empty': slotSummaries.slot2.isEmpty,
            'class-slot--disabled': !slotSummaries.slot2.clickable
          }"
          :disabled="!slotSummaries.slot2.clickable"
          @click="handleSlotClick(2)"
        >
          <template v-if="slotSummaries.slot2.isEmpty">
            <span class="class-slot__plus">+</span>
            <span class="class-slot__label">Ajouter une classe</span>
          </template>
          <template v-else>
            <span class="class-slot__label">{{ slotSummaries.slot2.label }}</span>
            <span class="class-slot__level">niv {{ slotSummaries.slot2.level }}</span>
          </template>
        </button>
      </div>
      <span v-if="classSelectionSummary" class="class-select__summary">{{ classSelectionSummary }}</span>
      <p v-if="classEligibility.allowed && classSelectionHint" class="class-select__hint">
        {{ classSelectionHint }}
      </p>
      <p v-else-if="!classEligibility.allowed" class="class-select__error">
        {{ classEligibility.reason }}
      </p>
      <div
        v-if="selectedSlot === 2 && slotSummaries.slot2.isEmpty"
        class="class-select__new"
      >
        <div class="class-select__new-title">Classes disponibles</div>
        <div v-if="eligibleNewClasses.length" class="class-select__new-grid">
          <button
            v-for="cls in eligibleNewClasses"
            :key="cls.id"
            type="button"
            class="class-card"
            :class="{ 'class-card--selected': selectedClassId === cls.id }"
            @click="selectNewClass(cls)"
          >
            <span class="class-card__label">{{ cls.label }}</span>
            <span class="class-card__info">Multiclassage possible</span>
          </button>
        </div>
        <p v-else class="class-select__error">Aucune classe ne remplit les conditions pour l'instant.</p>
        <div v-if="lockedNewClasses.length" class="class-select__locked">
          <p>Classes indisponibles :</p>
          <ul>
            <li v-for="cls in lockedNewClasses" :key="cls.id">
              <strong>{{ cls.label }}</strong>
              <span> - {{ cls.reasons.length ? cls.reasons.join(', ') : 'Conditions non remplies' }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

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
        <ul class="list list--features">
          <li v-for="entry in newFeatureEntries" :key="entry.featureId">
            <div class="feature-entry">
              <strong>{{ entry.featureLabel }}</strong>
              <span v-if="entry.rootLabel && entry.rootLabel !== entry.featureLabel" class="feature-entry__origin">
                - {{ entry.rootLabel }}
              </span>
              <ul v-if="entry.effectsSummary.length" class="feature-entry__effects">
                <li v-for="(summary, idx) in entry.effectsSummary" :key="idx">{{ summary }}</li>
              </ul>
            </div>
          </li>
          <li v-if="!newFeatureEntries.length" class="muted">Aucune nouvelle capacite detectee.</li>
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
        <div class="choice__options" v-if="isCardChoice(pc)">
          <article
            v-for="opt in pc.resolvedOptions"
            :key="opt.id"
            class="choice-card"
            :class="{ 'choice-card--selected': localChoices[pc.ui_id] === opt.id }"
          >
            <header class="choice-card__head">
              <h4>{{ opt.label }}</h4>
            </header>
            <p v-if="opt.description" class="choice-card__description">{{ opt.description }}</p>
            <p v-if="opt.longDescription" class="choice-card__description muted">{{ opt.longDescription }}</p>
            <footer class="choice-card__actions">
              <button type="button" class="btn" @click="selectCardOption(pc, opt.id)">
                Sélectionner
              </button>
            </footer>
          </article>
        </div>
        <div class="choice__options" v-else>
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
import { xpThresholdForLevel, MAX_SUPPORTED_LEVEL, type AvailableClassEntry } from '@/composables/useExperienceLevelUp'
import {
  normalizeFeatureLedger,
  flattenFeatureLedger,
  mergeFeatureLedgers,
  ledgerAddFeature,
  type FeatureLedger
} from '@/utils/featureLedger'

type FeaturePreviewEntry = {
  featureId: string
  featureLabel: string
  parentId: string | null
  parentLabel: string | null
  rootId: string | null
  rootLabel: string | null
  sourceKind: 'class' | 'race' | 'background' | 'feature' | 'manual' | 'item' | 'unknown'
  effects: Array<Record<string, any>>
  effectsSummary: string[]
}

const summarizeEffectForDisplay = (effect: any): string => {
  if (!effect || typeof effect !== 'object') return 'Effet'
  const type = String(effect.type ?? 'effet')
  const payload = effect.payload ?? {}
  const entries = Object.entries(payload)
  if (!entries.length) return type
  const formatted = entries.slice(0, 3).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}=${value.map((v) => String(v)).join(', ')}`
    if (value && typeof value === 'object') {
      const inner = Object.entries(value)
        .slice(0, 2)
        .map(([k, v]) => `${k}:${String(v)}`)
        .join(', ')
      return `${key}={${inner}${Object.keys(value).length > 2 ? ', ...' : ''}}`
    }
    return `${key}=${String(value)}`
  })
  const suffix = entries.length > 3 ? ', ...' : ''
  return `${type}: ${formatted.join(', ')}${suffix}`
}

const emit = defineEmits<{
  (e: 'close', payload?: { reason: 'cancel' | 'confirmed'; level: number }): void
}>()

const store = usePersonnage()
const dataStore = useDataStore()
const requestFetch = useRequestFetch()
const partiesStore = useParties()

const saving = ref(false)
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
const previewFeatureDetails = computed<FeaturePreviewEntry[]>(() => {
  const raw =
    (Array.isArray(preview.value?.appliedFeatureDetails) ? preview.value?.appliedFeatureDetails : null) ??
    (Array.isArray(preview.value?.previewCharacter?.featureDetails) ? preview.value?.previewCharacter?.featureDetails : null) ??
    []
  if (!Array.isArray(raw)) return []
  return raw
    .map((detail: any) => {
      const featureId = String(detail?.featureId ?? detail?.id ?? '').trim()
      if (!featureId.length) return null
      const featureLabel = String(detail?.featureLabel ?? detail?.label ?? featureId)
      const effectsArray = Array.isArray(detail?.effects) ? detail.effects : []
      const summaries = Array.isArray(detail?.effectsSummary) && detail.effectsSummary.length
        ? detail.effectsSummary.map((entry: any) => String(entry))
        : effectsArray.map((effect: any) => summarizeEffectForDisplay(effect))
      const sourceKindRaw = String(detail?.sourceKind ?? '').toLowerCase()
      const allowedKinds: FeaturePreviewEntry['sourceKind'][] = ['class', 'race', 'background', 'feature', 'manual', 'item', 'unknown']
      const sourceKind = (allowedKinds.includes(sourceKindRaw as FeaturePreviewEntry['sourceKind'])
        ? (sourceKindRaw as FeaturePreviewEntry['sourceKind'])
        : 'feature')
      const entry: FeaturePreviewEntry = {
        featureId,
        featureLabel,
        parentId: detail?.parentId ? String(detail.parentId) : null,
        parentLabel: detail?.parentLabel ? String(detail.parentLabel) : null,
        rootId: detail?.rootId ? String(detail.rootId) : null,
        rootLabel: detail?.rootLabel ? String(detail.rootLabel) : null,
        sourceKind,
        effects: effectsArray,
        effectsSummary: summaries
      }
      return entry
    })
    .filter((entry): entry is FeaturePreviewEntry => Boolean(entry))
})

const previewFeatureLedger = computed<FeatureLedger>(() => {
  const rawLedger =
    preview.value?.featureLedger ??
    preview.value?.previewCharacter?.featureLedger ??
    (Array.isArray(preview.value?.appliedFeatures) ? preview.value?.appliedFeatures : null) ??
    (Array.isArray(preview.value?.previewCharacter?.features) ? preview.value?.previewCharacter?.features : null) ??
    (Array.isArray(preview.value?.previewCharacter?.featureIds) ? preview.value?.previewCharacter?.featureIds : null) ??
    []
  return normalizeFeatureLedger(rawLedger)
})

const currentFeatureLedger = computed<FeatureLedger>(() => normalizeFeatureLedger((store as any).perso?.featureIds ?? []))

const currentFeatureSet = computed(() => new Set(flattenFeatureLedger(currentFeatureLedger.value)))

const newFeatureEntries = computed<FeaturePreviewEntry[]>(() => {
  const currentSet = currentFeatureSet.value
  const entries = previewFeatureDetails.value.filter((detail) => !currentSet.has(detail.featureId))
  if (entries.length) return entries
  const previewIds = flattenFeatureLedger(previewFeatureLedger.value)
  const fallbackIds = previewIds.filter((id) => !currentSet.has(id))
  return fallbackIds.map((fid) => ({
    featureId: fid,
    featureLabel: featureLabel(fid),
    parentId: null,
    parentLabel: null,
    rootId: null,
    rootLabel: null,
    sourceKind: 'feature',
    effects: [],
    effectsSummary: []
  }))
})

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
}
const normalizeClassId = (value: unknown): string | null => normalizeId(value)

const selectedClassId = ref<string | null>(null)
const selectedSlot = ref<1 | 2>(1)

type AbilityKey = 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'
const ABILITY_MAP: Record<string, AbilityKey> = {
  strength: 'force',
  str: 'force',
  force: 'force',
  dexterity: 'dexterite',
  dex: 'dexterite',
  dexterite: 'dexterite',
  constitution: 'constitution',
  con: 'constitution',
  intelligence: 'intelligence',
  int: 'intelligence',
  sagesse: 'sagesse',
  wisdom: 'sagesse',
  wis: 'sagesse',
  charisme: 'charisme',
  charisma: 'charisme',
  cha: 'charisme'
}
const ABILITY_LABELS: Record<AbilityKey, string> = {
  force: 'Force',
  dexterite: 'Dexterite',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  sagesse: 'Sagesse',
  charisme: 'Charisme'
}

const abilityScores = computed<Record<AbilityKey, number>>(() => {
  const caracs = ((store as any).perso?.caracs ?? {}) as Record<string, any>
  return {
    force: Number(caracs.force ?? 0) || 0,
    dexterite: Number(caracs.dexterite ?? 0) || 0,
    constitution: Number(caracs.constitution ?? 0) || 0,
    intelligence: Number(caracs.intelligence ?? 0) || 0,
    sagesse: Number(caracs.sagesse ?? 0) || 0,
    charisme: Number(caracs.charisme ?? 0) || 0
  }
})

const currentClassLevels = computed<Record<string, number>>(() => {
  const p: any = (store as any).perso || {}
  const levels: Record<string, number> = {}
  const add = (id: string | null, lvl: unknown) => {
    const key = normalizeId(id)
    if (!key) return
    const value = Math.max(0, Math.floor(Number(lvl) || 0))
    if (!value) return
    levels[key] = (levels[key] ?? 0) + value
  }
  const hasStructuredClasses =
    p && typeof p.classes === 'object' && p.classes !== null && Object.keys(p.classes).length > 0
  if (hasStructuredClasses) {
    for (const entry of Object.values(p.classes as Record<string, any>)) {
      if (!entry || typeof entry !== 'object') continue
      add(entry.classeId ?? entry.classId ?? entry.id ?? null, entry.niveau ?? entry.level ?? entry.levels ?? 0)
    }
  } else {
    add(p.classeId1 ?? p.classeId ?? null, p.levelClasse1 ?? p.niveau ?? 0)
    add(p.classeId2 ?? null, p.levelClasse2 ?? 0)
  }
  return levels
})

const currentLevel = computed(() => {
  const values = Object.values(currentClassLevels.value)
  if (values.length === 0) return Number((store as any).perso?.niveau || 1)
  return values.reduce((sum, value) => sum + value, 0)
})
const targetLevel = computed(() => currentLevel.value + 1)

const usedClassIds = computed<Set<string>>(() => new Set(Object.keys(currentClassLevels.value)))
const MAX_CLASSES = 2

const resolveClassEntry = (id: string | null): any | null => {
  if (!id) return null
  const classes = dataStore.maps.classes || {}
  if (classes[id]) return classes[id]
  const low = id.toLowerCase()
  if (classes[low]) return classes[low]
  const entries = Object.values(classes || {})
  return entries.find((entry: any) => String(entry?.id ?? '').toLowerCase() === low) ?? null
}

const labelForClassId = (id: string | null, fallback: string | null = null): string => {
  const entry = resolveClassEntry(id)
  const raw = entry?.name ?? entry?.nom ?? entry?.label ?? entry?.slug ?? fallback ?? id ?? 'Classe'
  return String(raw)
}

const slot1Id = computed(() => normalizeClassId((store as any).perso?.classeId1 ?? (store as any).perso?.classeId ?? null))
const slot2Id = computed(() => normalizeClassId((store as any).perso?.classeId2 ?? null))

const availableClasses = computed<AvailableClassEntry[]>(() => {
  const classesMap = dataStore.maps.classes || {}
  const entries: AvailableClassEntry[] = []
  const abilities = abilityScores.value
  const usedIds = usedClassIds.value
  const seen = new Set<string>()

  const collect = (raw: any) => {
    if (!raw || typeof raw !== 'object') return
    const clsId = normalizeClassId(raw.id ?? raw.slug ?? raw.name ?? raw.nom ?? null)
    if (!clsId || seen.has(clsId)) return
    seen.add(clsId)
    const existingLevel = currentClassLevels.value[clsId] ?? 0
    const requirements = (raw.multiclassing_requirements ?? null) as RequirementNode | null
    const reasons: string[] = []
    let eligible = true
    if (!usedIds.has(clsId) && usedIds.size >= MAX_CLASSES) {
      eligible = false
      reasons.push('Limite de deux classes atteinte')
    }
    if (eligible && requirements) {
      const validation = evaluateRequirementNode(requirements)
      if (!validation.ok) {
        eligible = false
        reasons.push(...validation.failures)
      }
    }
    entries.push({
      id: clsId,
      label: labelForClassId(clsId),
      eligible,
      reasons,
      existingLevel,
      requirements,
      raw
    })
  }

  for (const value of Object.values(classesMap)) {
    collect(value)
  }

  entries.sort((a, b) => {
    const aExisting = a.existingLevel > 0 ? 0 : 1
    const bExisting = b.existingLevel > 0 ? 0 : 1
    if (aExisting !== bExisting) return aExisting - bExisting
    return a.label.localeCompare(b.label)
  })

  return entries
})

const choiceDetailsCache = reactive<Record<string, any>>({})

const getNestedValue = (source: any, path: string): any => {
  if (!source || typeof source !== 'object') return undefined
  const segments = String(path).split('.')
  let current: any = source
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    current = current[segment]
  }
  return current
}

const pickFirstField = (record: Record<string, any>, fields: string[] | undefined, fallback: unknown) => {
  if (!Array.isArray(fields)) return fallback
  for (const field of fields) {
    const value = getNestedValue(record, field)
    if (value !== undefined && value !== null) {
      const str = String(value).trim()
      if (str.length) return str
    }
  }
  return fallback
}

const collectionToMapKey: Record<string, keyof ReturnType<typeof useDataStore>['maps']> = {
  classes: 'classes',
  races: 'races',
  backgrounds: 'backgrounds',
  features: 'features',
  spells: 'spells',
  items: 'items',
  subclasses: 'classes'
}

const optionFromPayload = (payload: Record<string, any>, fallbackId: string, collection?: string | null) => {
  const label =
    payload?.name ??
    payload?.nom ??
    payload?.label ??
    payload?.title ??
    payload?.slug ??
    fallbackId
  const description =
    payload?.description ??
    payload?.desc ??
    payload?.summary ??
    payload?.flavor ??
    null
  const longDescription =
    payload?.description_longue ??
    payload?.description_long ??
    payload?.long_description ??
    payload?.details ??
    null
  return {
    id: fallbackId,
    label: String(label),
    description: description ? String(description) : null,
    longDescription: longDescription ? String(longDescription) : null,
    payload,
    collection: collection ?? null
  }
}

const persistDataStore = () => {
  try {
    const partyId = partiesStore.currentPartyId || null
    if (partyId) dataStore.save(partyId)
  } catch (error) {
    console.warn('[AventureLevelUp] sauvegarde dataStore impossible', error)
  }
}

const mergeCatalogEntryIntoStore = (collection: string | null | undefined, id: string, payload: Record<string, any>) => {
  if (!collection) return
  const mapKey = collectionToMapKey[collection]
  if (!mapKey) return
  const current = (dataStore.maps as any)[mapKey] ?? {}
  ;(dataStore.maps as any)[mapKey] = { ...current, [id]: payload }
  persistDataStore()
}

const fetchCatalogEntry = async (collection: string, id: string): Promise<Record<string, any> | null> => {
  if (!collection || !id) return null
  const key = `${collection}:${id}`
  const cached = choiceDetailsCache[key]
  if (cached) return cached
  try {
    const payload = await requestFetch(`/api/catalog/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`)
    if (payload && typeof payload === 'object') {
      choiceDetailsCache[key] = payload
      return payload as Record<string, any>
    }
  } catch (error) {
    console.warn('[AventureLevelUp] fetch catalog entry failed', collection, id, error)
  }
  return null
}

const ensureClassDetails = async (classId: string | null) => {
  const id = normalizeClassId(classId)
  if (!id) return
  try {
    const payload = await fetchCatalogEntry('classes', id)
    if (payload && typeof payload === 'object') {
      mergeCatalogEntryIntoStore('classes', id, payload)
    }
  } catch (error) {
    console.warn('[AventureLevelUp] impossible de charger la classe', id, error)
  }
}

const fetchAutoFromOptions = async (
  autoFrom: any
): Promise<Array<{ id: string; label: string; description: string | null; longDescription: string | null; payload: Record<string, any>; collection: string | null }>> => {
  if (!autoFrom || typeof autoFrom !== 'object' || !autoFrom.collection) return []
  try {
    const response = await requestFetch('/api/catalog/search', {
      method: 'POST',
      body: {
        collection: autoFrom.collection,
        filters: autoFrom.filters ?? {},
        refresh: false
      }
    })
    if (!Array.isArray(response)) return []
    return response
      .map((entry: any) => {
        const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {}
        const resolvedId =
          pickFirstField(payload, autoFrom.id_fields, entry?.id ?? payload?.id ?? payload?.slug ?? null) ?? null
        if (!resolvedId) return null
        const resolvedLabel = pickFirstField(payload, autoFrom.label_fields, payload?.name ?? payload?.nom ?? resolvedId)
        return optionFromPayload(payload, String(resolvedId ?? resolvedLabel ?? 'option'), String(autoFrom.collection))
      })
      .filter(Boolean) as Array<{ id: string; label: string; description: string | null; longDescription: string | null; payload: Record<string, any>; collection: string | null }>
  } catch (error) {
    console.warn('[AventureLevelUp] recherche auto_from impossible', autoFrom, error)
    return []
  }
}

const hydratePendingChoices = async (choices: any[]): Promise<any[]> => {
  if (!Array.isArray(choices)) return []
  const hydrated: any[] = []
  for (const choice of choices) {
    const cloned = { ...choice }
    let options: Array<{ id: string; label: string; description: string | null; longDescription: string | null; payload: Record<string, any>; collection: string | null }> = []
    if (choice?.auto_from?.collection) {
      options = await fetchAutoFromOptions(choice.auto_from)
    }
    if (!options.length && Array.isArray(choice?.from) && choice?.auto_from?.collection) {
      options = []
      for (const rawId of choice.from) {
        const id = normalizeId(rawId)
        if (!id) continue
        const payload = await fetchCatalogEntry(choice.auto_from.collection, id)
        if (!payload) continue
        options.push(optionFromPayload(payload, id, String(choice.auto_from.collection)))
      }
    }
    if (options.length) {
      cloned.render_mode = 'cards'
      cloned.resolvedOptions = options
    }
    hydrated.push(cloned)
  }
  return hydrated
}

const isCardChoice = (choice: any): boolean =>
  Array.isArray(choice?.resolvedOptions) && choice.resolvedOptions.length > 0

const ensureChoiceDetail = async (choice: any, optionId: string) => {
  const options = Array.isArray(choice?.resolvedOptions) ? choice.resolvedOptions : []
  const option = options.find((opt: any) => String(opt?.id) === String(optionId)) ?? null
  const collection: string | null =
    (option && option.collection ? String(option.collection) : null) ??
    (choice?.auto_from?.collection ? String(choice.auto_from.collection) : null)
  if (!collection) return
  if (option && option.payload && typeof option.payload === 'object') {
    mergeCatalogEntryIntoStore(collection, String(optionId), option.payload)
    return
  }
  const payload = await fetchCatalogEntry(collection, String(optionId))
  if (payload) {
    mergeCatalogEntryIntoStore(collection, String(optionId), payload)
    if (option) option.payload = payload
  }
}

const selectCardOption = async (choice: any, optionId: string) => {
  const uiId = String(choice?.ui_id ?? '')
  if (!uiId || !optionId) return
  localChoices[uiId] = optionId
  try {
    await ensureChoiceDetail(choice, optionId)
  } catch (error) {
    console.warn('[AventureLevelUp] ensureChoiceDetail failed', choice?.auto_from?.collection, optionId, error)
  }
}

const normalizeStatKey = (value: unknown): AbilityKey | null => {
  if (value === null || value === undefined) return null
  const normalized = String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
  return ABILITY_MAP[normalized] ?? null
}

type RequirementNode = {
  stat?: string
  min_value?: number
  min?: number
  all?: RequirementNode[]
  any?: RequirementNode[]
  [key: string]: any
}

const describeRequirementNode = (node: RequirementNode): string => {
  if (Array.isArray(node?.all) && node.all.length) {
    return node.all.map((child) => describeRequirementNode(child)).join(' et ')
  }
  if (Array.isArray(node?.any) && node.any.length) {
    return node.any.map((child) => describeRequirementNode(child)).join(' ou ')
  }
  const abilityKey = normalizeStatKey(node?.stat)
  const label = abilityKey ? ABILITY_LABELS[abilityKey] : String(node?.stat ?? 'stat')
  const threshold = Number(node?.min_value ?? node?.min ?? 0) || 0
  return `${label} >= ${threshold}`
}

const evaluateRequirementNode = (node: RequirementNode): { ok: boolean; failures: string[] } => {
  if (!node) return { ok: true, failures: [] }
  if (Array.isArray(node.all) && node.all.length) {
    const failures: string[] = []
    let ok = true
    for (const child of node.all) {
      const res = evaluateRequirementNode(child)
      if (!res.ok) {
        ok = false
        failures.push(...res.failures)
      }
    }
    return { ok, failures }
  }
  if (Array.isArray(node.any) && node.any.length) {
    const childDescriptions: string[] = []
    let ok = false
    for (const child of node.any) {
      const res = evaluateRequirementNode(child)
      if (res.ok) {
        ok = true
        break
      }
      childDescriptions.push(describeRequirementNode(child))
    }
    return ok
      ? { ok: true, failures: [] }
      : {
          ok: false,
          failures: [
            childDescriptions.length
              ? `Remplir au moins une des conditions suivantes: ${childDescriptions.join(', ')}`
              : 'Conditions alternatives non remplies'
          ]
        }
  }
  const abilityKey = normalizeStatKey(node?.stat)
  const threshold = Number(node?.min_value ?? node?.min ?? 0) || 0
  if (!abilityKey) {
    return { ok: false, failures: ['Condition de multiclassage inconnue'] }
  }
  const score = abilityScores.value[abilityKey]
  if (Number.isFinite(score) && score >= threshold) {
    return { ok: true, failures: [] }
  }
  return { ok: false, failures: [`${ABILITY_LABELS[abilityKey]} >= ${threshold}`] }
}

const evaluateClassRequirements = (classId: string, isExistingClass: boolean): { allowed: boolean; reason?: string } => {
  if (!classId) {
    return { allowed: false, reason: 'Choisissez une classe' }
  }
  const entry = resolveClassEntry(classId)
  if (!entry) {
    return { allowed: true }
  }
  if (isExistingClass) {
    return { allowed: true }
  }
  const requirements = entry?.multiclassing_requirements ?? null
  if (!requirements) {
    return { allowed: true }
  }
  const result = evaluateRequirementNode(requirements)
  if (result.ok) return { allowed: true }
  const message = result.failures.length ? `Conditions non remplies: ${result.failures.join(', ')}` : 'Conditions non remplies'
  return { allowed: false, reason: message }
}

const selectedClassEntry = computed(() => availableClasses.value.find((entry) => entry.id === selectedClassId.value) ?? null)
const eligibleNewClasses = computed(() => availableClasses.value.filter((entry) => entry.existingLevel === 0 && entry.eligible))
const lockedNewClasses = computed(() => availableClasses.value.filter((entry) => entry.existingLevel === 0 && !entry.eligible))

const slotSummaries = computed(() => {
  const primaryId = slot1Id.value
  const secondaryId = slot2Id.value
  const primaryLabel = primaryId
    ? labelForClassId(primaryId)
    : labelForClassId(normalizeClassId((store as any).perso?.classe ?? null)) ?? (store as any).perso?.classe ?? 'Classe principale'
  const primaryLevel = primaryId ? currentClassLevels.value[primaryId] ?? 0 : Object.values(currentClassLevels.value)[0] ?? currentLevel.value
  const secondaryEntry = secondaryId ? availableClasses.value.find((entry) => entry.id === secondaryId) : null
  const selectedNewEntry =
    !secondaryId && selectedSlot.value === 2 && selectedClassEntry.value?.existingLevel === 0 ? selectedClassEntry.value : null

  return {
    slot1: {
      id: primaryId,
      label: primaryLabel,
      level: primaryLevel > 0 ? primaryLevel : currentLevel.value,
      isEmpty: !primaryId,
      clickable: Boolean(primaryId)
    },
    slot2: {
      id: secondaryId ?? (selectedNewEntry ? selectedNewEntry.id : null),
      label: secondaryId
        ? secondaryEntry?.label ?? labelForClassId(secondaryId) ?? secondaryId
        : selectedNewEntry?.label ?? null,
      level: secondaryId ? currentClassLevels.value[secondaryId] ?? 0 : 0,
      isEmpty: !secondaryId && !selectedNewEntry,
      clickable: secondaryId ? true : eligibleNewClasses.value.length > 0
    }
  }
})

const classSelectionSummary = computed(() => {
  const parts: string[] = []
  if (slotSummaries.value.slot1.label) {
    parts.push(`${slotSummaries.value.slot1.label} (${slotSummaries.value.slot1.level})`)
  }
  if (!slotSummaries.value.slot2.isEmpty && slotSummaries.value.slot2.label) {
    const lvl = slotSummaries.value.slot2.level > 0 ? slotSummaries.value.slot2.level : 1
    parts.push(`${slotSummaries.value.slot2.label} (${lvl})`)
  }
  return parts.length ? `Actuellement : ${parts.join(' / ')}` : ''
})

const classEligibility = computed<{ allowed: boolean; reason: string }>(() => {
  if (selectedSlot.value === 2 && slot2Id.value === null && !selectedClassId.value) {
    return { allowed: false, reason: 'Choisissez une classe à ajouter' }
  }
  const classId = selectedClassId.value
  if (!classId) {
    return { allowed: false, reason: 'Aucune classe sélectionnée' }
  }
  const used = usedClassIds.value
  const limitReached = used.size >= MAX_CLASSES
  if (limitReached && !used.has(classId)) {
    return { allowed: false, reason: 'Limite de deux classes atteinte (selectionnez une classe deja acquise)' }
  }
  const requirement = evaluateClassRequirements(classId, used.has(classId))
  if (requirement.allowed) {
    return { allowed: true, reason: '' }
  }
  return { allowed: false, reason: requirement.reason ?? 'Conditions non remplies' }
})

const classSelectionHint = computed(() => {
  if (!classEligibility.value.allowed || !selectedClassId.value) return ''
  const currentLevelInClass = currentClassLevels.value[selectedClassId.value] ?? 0
  const label = labelForClassId(selectedClassId.value)
  if (selectedSlot.value === 2 && currentLevelInClass === 0) {
    return `Ajout d'une nouvelle classe : ${label}`
  }
  return `Ajout du niveau ${currentLevelInClass + 1} dans ${label}`
})

const currentXp = computed(() => Number((store as any).perso?.xp || 0))
const xpProgress = computed(() => {
  const level = currentLevel.value
  const previous = xpThresholdForLevel(level)
  const next =
    level >= MAX_SUPPORTED_LEVEL ? null : xpThresholdForLevel(Math.min(MAX_SUPPORTED_LEVEL, level + 1))
  if (next === null) {
    return { current: currentXp.value, next: null, ratio: 100, remaining: 0 }
  }
  const span = Math.max(1, next - previous)
  const ratio = Math.max(0, Math.min(1, (currentXp.value - previous) / span))
  return {
    current: currentXp.value,
    next,
    ratio: Math.round(ratio * 100),
    remaining: Math.max(0, next - currentXp.value)
  }
})

const ensureDefaultSelection = () => {
  if (selectedSlot.value === 1 && slot1Id.value) {
    selectedClassId.value = slot1Id.value
    return
  }
  if (selectedSlot.value === 2 && slot2Id.value) {
    selectedClassId.value = slot2Id.value
    return
  }
  if (slot1Id.value) {
    selectedSlot.value = 1
    selectedClassId.value = slot1Id.value
    return
  }
  if (slot2Id.value) {
    selectedSlot.value = 2
    selectedClassId.value = slot2Id.value
    return
  }
  const firstEligible = eligibleNewClasses.value[0]
  if (firstEligible) {
    selectedSlot.value = 2
    selectedClassId.value = firstEligible.id
  } else {
    selectedClassId.value = null
  }
}

watch(
  () => [
    slot1Id.value,
    slot2Id.value,
    availableClasses.value.map((entry) => `${entry.id}:${entry.eligible ? 1 : 0}:${entry.existingLevel}`).join('|')
  ],
  () => ensureDefaultSelection(),
  { immediate: true }
)

const handleSlotClick = (slot: 1 | 2) => {
  if (slot === 1) {
    if (!slotSummaries.value.slot1.clickable) return
    selectedSlot.value = 1
    if (slot1Id.value) {
      selectedClassId.value = slot1Id.value
    }
    return
  }
  if (!slotSummaries.value.slot2.clickable) return
  selectedSlot.value = 2
  if (slot2Id.value) {
    selectedClassId.value = slot2Id.value
    return
  }
  const existing = eligibleNewClasses.value.find((entry) => entry.id === selectedClassId.value)
  selectedClassId.value = existing?.id ?? eligibleNewClasses.value[0]?.id ?? null
}

const selectNewClass = (cls: AvailableClassEntry) => {
  if (!cls || !cls.eligible) return
  selectedSlot.value = 2
  selectedClassId.value = cls.id
}

const nextPvMax = computed(() => {
  const candidate = Number(preview.value?.previewCharacter?.pv_max ?? NaN)
  return Number.isFinite(candidate) && candidate > 0 ? candidate : currentPvMax.value
})
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

const buildBaseCharacterSnapshot = (p: any) => ({
  base_stats_before_race: {
    strength: Number(p?.caracs?.force ?? 10),
    dexterity: Number(p?.caracs?.dexterite ?? 10),
    constitution: Number(p?.caracs?.constitution ?? 10),
    intelligence: Number(p?.caracs?.intelligence ?? 10),
    wisdom: Number(p?.caracs?.sagesse ?? 10),
    charisma: Number(p?.caracs?.charisme ?? 10)
  }
})

const buildClassLevelsForPreview = (): Record<string, number> => {
  const classes: Record<string, number> = {}
  for (const [id, lvl] of Object.entries(currentClassLevels.value)) {
    const key = normalizeId(id)
    if (!key) continue
    classes[key] = Math.max(0, Math.floor(Number(lvl) || 0))
  }
  const classId = selectedClassId.value
  if (classId) {
    classes[classId] = (classes[classId] ?? 0) + 1
  }
  return classes
}

const buildSelectionPayload = (
  extraSelection: Record<string, any> = {}
): { selection: any; baseCharacter: any } | null => {
  const classId = selectedClassId.value
  if (!classId) return null
  const p: any = (store as any).perso || {}
  const classLevels = buildClassLevelsForPreview()
  const niveau = Object.values(classLevels).reduce((sum, lvl) => sum + lvl, 0)
  const selection = {
    class: classId,
    race: p.raceId || p.lignee || null,
    background: p.backgroundId || p.historique || null,
    niveau,
    classLevels,
    chosenOptions: {},
    ...extraSelection
  }
  const baseCharacter = buildBaseCharacterSnapshot(p)
  return { selection, baseCharacter }
}

async function loadPreview() {
  if (!classEligibility.value.allowed) {
    preview.value = null
    resetLocalChoices()
    return
  }
  const payload = buildSelectionPayload()
  if (!payload) {
    preview.value = null
    resetLocalChoices()
    return
  }
  try {
    if (selectedClassId.value) {
      await ensureClassDetails(selectedClassId.value)
    }
    const res = await requestFetch('/api/creation/preview', {
      method: 'POST',
      body: payload
    })
    const hydratedChoices = await hydratePendingChoices(res?.pendingChoices ?? [])
    preview.value = { ...res, pendingChoices: hydratedChoices }
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
  if (!classEligibility.value.allowed) return
  const payload = buildSelectionPayload()
  if (!payload) return
  const value =
    pc.choose && pc.choose > 1
      ? Array.isArray(localChoices[ui_id])
        ? localChoices[ui_id]
        : []
      : (localChoices[ui_id] ?? null)

  try {
    const res = await requestFetch('/api/creation/resolve-choice', {
      method: 'POST',
      body: { ...payload, ui_id, value }
    })
    const hydratedChoices = await hydratePendingChoices(res?.pendingChoices ?? [])
    preview.value = { ...res, pendingChoices: hydratedChoices }
    resetLocalChoices()
  } catch (error) {
    console.warn('[AventureLevelUp] applyChoice failed', error)
  }
}

async function confirmLevelUp() {
  if (hasPendingChoices.value || !classEligibility.value.allowed || !selectedClassId.value) return
  saving.value = true
  try {
    const nextClassLevels = buildClassLevelsForPreview()
    const validatedLevel = Object.values(nextClassLevels).reduce((sum, lvl) => sum + lvl, 0)
    const selectedId = selectedClassId.value
    const currentLedger = normalizeFeatureLedger((store as any).perso?.featureIds ?? [])
    let mergedLedger = mergeFeatureLedgers(currentLedger, previewFeatureLedger.value)
    for (const entry of newFeatureEntries.value) {
      const rootTarget = normalizeId(entry.rootId) ?? normalizeId(entry.parentId) ?? entry.featureId
      mergedLedger = ledgerAddFeature(mergedLedger, rootTarget ?? entry.featureId, entry.featureId)
      if (entry.parentId && entry.parentId !== entry.featureId) {
        mergedLedger = ledgerAddFeature(mergedLedger, entry.parentId, entry.featureId)
      }
    }
    ;(store as any).perso.featureIds = mergedLedger

    const p: any = (store as any).perso || {}
    let slot1Id = normalizeClassId(p.classeId1 ?? p.classeId ?? null)
    let slot2Id = normalizeClassId(p.classeId2 ?? null)

    if (slot1Id && !nextClassLevels[slot1Id]) slot1Id = null
    if (slot2Id && !nextClassLevels[slot2Id]) slot2Id = null

    const classEntries = Object.keys(nextClassLevels).filter((id) => nextClassLevels[id] > 0)
    if (!slot1Id) slot1Id = classEntries[0] ?? selectedId ?? null
    if (slot1Id === null && slot2Id) {
      slot1Id = slot2Id
      slot2Id = null
    }
    if (!slot2Id) {
      const candidate = classEntries.find((id) => id !== slot1Id) ?? null
      slot2Id = candidate ?? null
    }
    if (slot2Id === slot1Id) slot2Id = null

    const levelClasse1 = slot1Id ? nextClassLevels[slot1Id] ?? 0 : 0
    const levelClasse2 = slot2Id ? nextClassLevels[slot2Id] ?? 0 : 0

    const previousSlot1 = normalizeClassId(p.classeId1 ?? p.classeId ?? null)
    const previousSlot2 = normalizeClassId(p.classeId2 ?? null)

    const newlyAddedClasses: string[] = []
    if (slot1Id && slot1Id !== previousSlot1) newlyAddedClasses.push(slot1Id)
    if (slot2Id && slot2Id !== previousSlot2) newlyAddedClasses.push(slot2Id)
    if (newlyAddedClasses.length) {
      for (const clsId of newlyAddedClasses) {
        await ensureClassDetails(clsId).catch((error) => {
          console.warn('[AventureLevelUp] unable to cache class details', clsId, error)
        })
      }
    }

    ;(store as any).perso.classeId = slot1Id ?? null
    ;(store as any).perso.classeId1 = slot1Id ?? null
    ;(store as any).perso.classeId2 = slot2Id ?? null

    if (slot1Id !== previousSlot1) {
      (store as any).perso.subclasseId1 = null
    }
    if (slot2Id !== previousSlot2) {
      (store as any).perso.subclasseId2 = null
    }

    ;(store as any).perso.levelClasse1 = levelClasse1
    ;(store as any).perso.levelClasse2 = levelClasse2
    ;(store as any).perso.classes = {
      1: { classeId: slot1Id ?? null, subclasseId: (store as any).perso.subclasseId1 ?? null, niveau: levelClasse1 },
      2: { classeId: slot2Id ?? null, subclasseId: (store as any).perso.subclasseId2 ?? null, niveau: levelClasse2 }
    }

    if (slot1Id) {
      (store as any).perso.classe = labelForClassId(slot1Id, (store as any).perso.classe ?? null)
    }
    ;(store as any).perso.niveau = validatedLevel

    const requiredXp = xpThresholdForLevel(validatedLevel)
    ;(store as any).perso.xp = requiredXp

    try {
      await (store as any).recomputeDerived?.()
    } catch (error) {
      console.warn('[AventureLevelUp] recompute after level up failed', error)
    }

    try {
      const parties = useParties()
      const id = parties.currentPartyId || null
      if (id) (store as any).sauvegarderLocal?.(id)
    } catch (error) {
      console.warn('[AventureLevelUp] sauvegarde locale impossible', error)
    }
    try {
      (store as any).sauvegarderLocal?.()
    } catch (error) {
      console.warn('[AventureLevelUp] sauvegarde globale impossible', error)
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
  try {
    if (!Object.keys(dataStore.maps.classes || {}).length) {
      const parties = useParties()
      await (dataStore.load?.(parties.currentPartyId ?? undefined) ?? Promise.resolve())
    }
  } catch (error) {
    console.warn('[AventureLevelUp] chargement des classes impossible', error)
  }
  ensureDefaultSelection()
  await loadPreview()
})

watch(
  () => [targetLevel.value, selectedClassId.value],
  async ([nextLevel, nextClass], [prevLevel, prevClass]) => {
    if (nextLevel !== prevLevel || nextClass !== prevClass) {
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
.levelup__xp {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--texte-2);
}
.levelup__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.class-select {
  border: 1px solid var(--bord);
  border-radius: 16px;
  padding: 16px;
  background: rgba(12, 16, 38, 0.9);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.class-select__title {
  margin: 0;
  font-size: 16px;
}
.class-select__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.class-slot {
  flex: 1 1 180px;
  min-width: 180px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 24, 56, 0.9);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.class-slot__label {
  font-size: 14px;
  font-weight: 600;
}
.class-slot__level {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--texte-2);
}
.class-slot__plus {
  font-size: 28px;
  line-height: 1;
}
.class-slot--empty {
  align-items: center;
  justify-content: center;
  text-align: center;
}
.class-slot--selected {
  border-color: #4f7cff;
  background: rgba(79, 124, 255, 0.15);
}
.class-slot--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.class-select__summary {
  color: var(--texte-2);
  font-size: 13px;
}
.class-select__hint {
  color: var(--texte-2);
  font-size: 13px;
  margin: 0;
}
.class-select__error {
  color: #ff8a8a;
  font-size: 13px;
  margin: 0;
}
.class-select__new {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}
.class-select__new-title {
  font-size: 14px;
  font-weight: 600;
}
.class-select__new-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.class-card {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(18, 24, 56, 0.85);
  color: #fff;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.class-card:hover {
  border-color: #4f7cff;
}
.class-card--selected {
  border-color: #4f7cff;
  background: rgba(79, 124, 255, 0.15);
}
.class-card__label {
  font-size: 14px;
  font-weight: 600;
}
.class-card__info {
  font-size: 12px;
  color: var(--texte-2);
}
.class-select__locked {
  font-size: 12px;
  color: var(--texte-2);
}
.class-select__locked ul {
  margin: 4px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.class-select__locked strong {
  color: #fff;
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
.feature-entry {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.feature-entry__origin {
  margin-left: 4px;
  font-size: 13px;
  color: var(--texte-2);
}
.feature-entry__effects {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--texte-2);
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
.choice-card {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px;
  background: rgba(12, 16, 38, 0.85);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 280px;
}
.choice-card--selected {
  border-color: #4f7cff;
  background: rgba(79, 124, 255, 0.15);
}
.choice-card__head h4 {
  margin: 0;
  font-size: 15px;
}
.choice-card__description {
  margin: 0;
  font-size: 13px;
}
.choice-card__actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
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








