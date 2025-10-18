import { computed, type ComputedRef, ref, type Ref, watch } from 'vue'
import { useRequestFetch } from '#app'
import { useDataStore } from '@/stores/data'
import { usePersonnage } from '@/stores/personnage'

const DND5E_XP_THRESHOLDS: number[] = [
  0, // level 0 (unused, keeps indexes aligned)
  0, // level 1
  300, // level 2
  900, // level 3
  2700, // level 4
  6500, // level 5
  14000, // level 6
  23000, // level 7
  34000, // level 8
  48000, // level 9
  64000, // level 10
  85000, // level 11
  100000, // level 12
  120000, // level 13
  140000, // level 14
  165000, // level 15
  195000, // level 16
  225000, // level 17
  265000, // level 18
  305000, // level 19
  355000 // level 20
]

export const MAX_SUPPORTED_LEVEL = DND5E_XP_THRESHOLDS.length - 1

const clampLevel = (value: number, maxLevel: number): number => {
  const numeric = Math.floor(Number.isFinite(value) ? value : 0)
  if (numeric < 1) return 1
  if (numeric > maxLevel) return maxLevel
  return numeric
}

const toNonNegativeInt = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  const numeric = Math.floor(value)
  return numeric >= 0 ? numeric : 0
}

const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export const xpThresholdForLevel = (level: number): number => {
  const clamped = clampLevel(level, MAX_SUPPORTED_LEVEL)
  return DND5E_XP_THRESHOLDS[clamped] ?? 0
}

export const inferLevelFromXp = (xp: number, maxLevel: number = MAX_SUPPORTED_LEVEL): number => {
  const cap = clampLevel(maxLevel, MAX_SUPPORTED_LEVEL)
  const value = toNonNegativeInt(xp)
  let resolved = 1
  for (let lvl = 2; lvl <= cap; lvl += 1) {
    const threshold = DND5E_XP_THRESHOLDS[lvl] ?? Number.POSITIVE_INFINITY
    if (value >= threshold) {
      resolved = lvl
    } else {
      break
    }
  }
  return resolved
}

type LevelSource = Ref<number> | ComputedRef<number>

export type ExperienceLevelUpState = {
  activeTargetLevel: ComputedRef<number | null>
  queuedTargets: ComputedRef<number[]>
  pendingCount: ComputedRef<number>
  ready: ComputedRef<boolean>
  nextLevelThreshold: ComputedRef<number | null>
  xpUntilNextLevel: ComputedRef<number | null>
  availableClasses: ComputedRef<AvailableClassEntry[]>
  acknowledge: (level: number) => void
  dismissUntilProgress: (level: number) => void
}

type ExperienceLevelUpOptions = {
  maxLevel?: number
}

type AbilityKey = 'force' | 'dexterite' | 'constitution' | 'intelligence' | 'sagesse' | 'charisme'

type RequirementNode = {
  stat?: string
  min_value?: number
  min?: number
  all?: RequirementNode[]
  any?: RequirementNode[]
  [key: string]: any
}

export type AvailableClassEntry = {
  id: string
  label: string
  eligible: boolean
  reasons: string[]
  existingLevel: number
  requirements: RequirementNode | null
  raw: Record<string, any> | null
}

const MAX_CLASS_SLOTS = 2

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

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
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
  return `${label} ≥ ${threshold}`
}

const evaluateRequirementNode = (
  node: RequirementNode,
  abilities: Record<AbilityKey, number>
): { ok: boolean; failures: string[] } => {
  if (!node) return { ok: true, failures: [] }
  if (Array.isArray(node.all) && node.all.length) {
    const failures: string[] = []
    let ok = true
    for (const child of node.all) {
      const res = evaluateRequirementNode(child, abilities)
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
      const res = evaluateRequirementNode(child, abilities)
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
  const value = Number(abilities[abilityKey] ?? 0)
  if (Number.isFinite(value) && value >= threshold) {
    return { ok: true, failures: [] }
  }
  return { ok: false, failures: [`${ABILITY_LABELS[abilityKey]} ≥ ${threshold}`] }
}


export const useExperienceLevelUp = (
  currentLevel: LevelSource,
  currentXp: LevelSource,
  opts: ExperienceLevelUpOptions = {}
): ExperienceLevelUpState => {
  const requestFetch = useRequestFetch()
  const dataStore = useDataStore()
  const personnageStore = usePersonnage()
  const maxLevel = clampLevel(opts.maxLevel ?? MAX_SUPPORTED_LEVEL, MAX_SUPPORTED_LEVEL)

  const dismissedLevels = ref<number[]>([])
  const queue = ref<number[]>([])
  const catalogLoaded = ref(false)
  const catalogLoading = ref<Promise<void> | null>(null)

  const evaluateQueue = () => {
    const lvl = clampLevel(currentLevel.value ?? 1, maxLevel)
    const xp = toNonNegativeInt(currentXp.value ?? 0)
    const reachable = Math.min(inferLevelFromXp(xp, maxLevel), maxLevel)

    const filteredDismissed = dismissedLevels.value.filter(
      (entry) => entry > lvl && entry <= maxLevel
    )
    const dismissedSet = new Set<number>(filteredDismissed)

    const maxTarget = Math.min(lvl + 1, reachable)
    const nextQueue: number[] = []
    for (let target = lvl + 1; target <= maxTarget; target += 1) {
      if (!dismissedSet.has(target)) {
        nextQueue.push(target)
      }
    }

    if (!arraysEqual(filteredDismissed, dismissedLevels.value)) {
      dismissedLevels.value = filteredDismissed
    }
    if (!arraysEqual(nextQueue, queue.value)) {
      queue.value = nextQueue
    }
  }

  watch(
    () => [currentLevel.value, currentXp.value],
    () => evaluateQueue(),
    { immediate: true }
  )

  const activeTargetLevel = computed<number | null>(() =>
    queue.value.length ? queue.value[0] : null
  )
  const queuedTargets = computed<number[]>(() => [...queue.value])
  const pendingCount = computed(() => queue.value.length)
  const ready = computed(() => queue.value.length > 0)

  const nextLevelThreshold = computed<number | null>(() => {
    const lvl = clampLevel(currentLevel.value ?? 1, maxLevel)
    if (lvl >= maxLevel) return null
    return xpThresholdForLevel(lvl + 1)
  })

  const xpUntilNextLevel = computed<number | null>(() => {
    const threshold = nextLevelThreshold.value
    if (threshold === null) return null
    const xp = toNonNegativeInt(currentXp.value ?? 0)
    return Math.max(0, threshold - xp)
  })

  const acknowledge = (level: number) => {
    const target = clampLevel(level, maxLevel)
    const nextQueue = queue.value.filter((entry) => entry !== target)
    if (!arraysEqual(nextQueue, queue.value)) {
      queue.value = nextQueue
    }
    const nextDismissed = dismissedLevels.value.filter((entry) => entry !== target)
    if (!arraysEqual(nextDismissed, dismissedLevels.value)) {
      dismissedLevels.value = nextDismissed
    }
    evaluateQueue()
  }

  const dismissUntilProgress = (level: number) => {
    const target = clampLevel(level, maxLevel)
    if (target <= clampLevel(currentLevel.value ?? 1, maxLevel)) return
    if (!dismissedLevels.value.includes(target)) {
      dismissedLevels.value = [...dismissedLevels.value, target]
    }
    evaluateQueue()
  }

  const abilityScores = computed<Record<AbilityKey, number>>(() => {
    const caracs = ((personnageStore as any).perso?.caracs ?? {}) as Record<string, any>
    return {
      force: Number(caracs.force ?? 0) || 0,
      dexterite: Number(caracs.dexterite ?? 0) || 0,
      constitution: Number(caracs.constitution ?? 0) || 0,
      intelligence: Number(caracs.intelligence ?? 0) || 0,
      sagesse: Number(caracs.sagesse ?? 0) || 0,
      charisme: Number(caracs.charisme ?? 0) || 0
    }
  })

  const classLevels = computed<Record<string, number>>(() => {
    const p: any = (personnageStore as any).perso || {}
    const levels: Record<string, number> = {}
    const add = (id: unknown, lvl: unknown) => {
      const key = normalizeId(id)
      if (!key) return
      const value = Math.max(0, Math.floor(Number(lvl) || 0))
      if (!value) return
      levels[key] = (levels[key] ?? 0) + value
    }
    if (p && typeof p.classes === 'object' && p.classes !== null) {
      for (const entry of Object.values(p.classes as Record<string, any>)) {
        if (!entry || typeof entry !== 'object') continue
        add(entry.classeId ?? entry.classId ?? entry.id ?? null, entry.niveau ?? entry.level ?? entry.levels ?? 0)
      }
    }
    add(p.classeId1 ?? p.classeId ?? null, p.levelClasse1 ?? p.niveau ?? 0)
    add(p.classeId2 ?? null, p.levelClasse2 ?? 0)
    return levels
  })

  const loadCatalogClasses = async () => {
    if (!process.client) return
    if (catalogLoading.value) return catalogLoading.value
    catalogLoading.value = (async () => {
      try {
        try {
          await (dataStore.load?.() ?? Promise.resolve())
        } catch {
          // ignore local load errors
        }
        const response = await requestFetch('/api/catalog/classes')
        if (Array.isArray(response) && response.length) {
          const map: Record<string, any> = {}
          for (const entry of response as Array<Record<string, any>>) {
            const id = normalizeId(entry?.id ?? null)
            if (!id) continue
            const raw =
              (entry.raw && typeof entry.raw === 'object' ? entry.raw : null) ??
              (entry.data && typeof entry.data === 'object' ? entry.data : null)
            const next: Record<string, any> = raw ? { ...raw } : {}
            if (!next.id) next.id = id
            if (!next.name) next.name = entry.name ?? next.nom ?? next.label ?? id
            if (entry?.multiclassing_requirements !== undefined && next.multiclassing_requirements === undefined) {
              next.multiclassing_requirements = entry.multiclassing_requirements
            }
            if (!next.label && entry?.name) next.label = entry.name
            map[id] = next
          }
          if (Object.keys(map).length) {
            dataStore.merge({ classes: map })
          }
        }
      } catch (error) {
        console.warn('[useExperienceLevelUp] catalogue classes indisponible', error)
      } finally {
        catalogLoaded.value = true
        catalogLoading.value = null
      }
    })()
    return catalogLoading.value
  }

  const ensureClassesLoaded = async () => {
    if (catalogLoaded.value) return
    await loadCatalogClasses()
  }

  watch(
    () => ready.value,
    (isReady) => {
      if (isReady) {
        ensureClassesLoaded()
      }
    },
    { immediate: true }
  )

  const availableClasses = computed<AvailableClassEntry[]>(() => {
    const classesMap = dataStore.maps.classes || {}
    const entries: AvailableClassEntry[] = []
    const usedIds = new Set<string>(Object.keys(classLevels.value))
    const abilities = abilityScores.value
    const classKeys = Object.keys(classesMap)
    if (!classKeys.length && !catalogLoaded.value) {
      // data not yet loaded (but request triggered), we still return empty listing; ensure load triggered
      ensureClassesLoaded()
    }
    const seen = new Set<string>()
    const collectEntry = (raw: any) => {
      const clsId = normalizeId(raw?.id ?? raw?.slug ?? raw?.name ?? raw?.nom ?? null)
      if (!clsId || seen.has(clsId)) return
      seen.add(clsId)
      const label = String(raw?.name ?? raw?.nom ?? raw?.label ?? clsId)
      const existingLevel = classLevels.value[clsId] ?? 0
      const requirements = (raw?.multiclassing_requirements ?? null) as RequirementNode | null
      const reasons: string[] = []
      let eligible = true
      if (!usedIds.has(clsId) && usedIds.size >= MAX_CLASS_SLOTS) {
        eligible = false
        reasons.push('Limite de deux classes atteinte')
      }
      if (eligible && requirements) {
        const validation = evaluateRequirementNode(requirements, abilities)
        if (!validation.ok) {
          eligible = false
          reasons.push(...validation.failures)
        }
      }
      entries.push({
        id: clsId,
        label,
        eligible,
        reasons,
        existingLevel,
        requirements,
        raw
      })
    }
    for (const key of classKeys) {
      const raw = classesMap[key]
      if (!raw || typeof raw !== 'object') continue
      collectEntry(raw)
    }
    entries.sort((a, b) => {
      const aExisting = a.existingLevel > 0 ? 0 : 1
      const bExisting = b.existingLevel > 0 ? 0 : 1
      if (aExisting !== bExisting) return aExisting - bExisting
      return a.label.localeCompare(b.label)
    })
    return entries
  })

  return {
    activeTargetLevel,
    queuedTargets,
    pendingCount,
    ready,
    nextLevelThreshold,
    xpUntilNextLevel,
    availableClasses,
    acknowledge,
    dismissUntilProgress
  }
}

export default useExperienceLevelUp
