import { computed, type ComputedRef, ref, type Ref, watch } from 'vue'

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
  acknowledge: (level: number) => void
  dismissUntilProgress: (level: number) => void
}

type ExperienceLevelUpOptions = {
  maxLevel?: number
}

export const useExperienceLevelUp = (
  currentLevel: LevelSource,
  currentXp: LevelSource,
  opts: ExperienceLevelUpOptions = {}
): ExperienceLevelUpState => {
  const maxLevel = clampLevel(opts.maxLevel ?? MAX_SUPPORTED_LEVEL, MAX_SUPPORTED_LEVEL)

  const dismissedLevels = ref<number[]>([])
  const queue = ref<number[]>([])

  const evaluateQueue = () => {
    const lvl = clampLevel(currentLevel.value ?? 1, maxLevel)
    const xp = toNonNegativeInt(currentXp.value ?? 0)
    const reachable = Math.min(inferLevelFromXp(xp, maxLevel), maxLevel)

    const filteredDismissed = dismissedLevels.value.filter(
      (entry) => entry > lvl && entry <= maxLevel
    )
    const dismissedSet = new Set<number>(filteredDismissed)

    const nextQueue: number[] = []
    for (let target = lvl + 1; target <= reachable; target += 1) {
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

  return {
    activeTargetLevel,
    queuedTargets,
    pendingCount,
    ready,
    nextLevelThreshold,
    xpUntilNextLevel,
    acknowledge,
    dismissUntilProgress
  }
}

export default useExperienceLevelUp
