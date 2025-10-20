// utils/featureLedger.ts
// Central helpers to manage the mapping between feature sources (classes, races, backgrounds, etc.)
// and the feature ids they grant. Also exposes a helper to flatten ledgers and merge them.

export type FeatureLedger = Record<string, string[]>

export type FeatureLedgerInput =
  | FeatureLedger
  | string[]
  | Array<{ parent?: string | null; featureId?: string | null; id?: string | null }>
  | null
  | undefined

export type AppliedFeatureDetail = {
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

const toCleanId = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str.length ? str : null
}

const toIdArray = (value: unknown): string[] => {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === null || entry === undefined) return null
        if (typeof entry === 'object') {
          return (
            toCleanId((entry as any).id) ??
            toCleanId((entry as any).featureId) ??
            toCleanId((entry as any).feature_id) ??
            toCleanId((entry as any).value) ??
            toCleanId((entry as any).key)
          )
        }
        return toCleanId(entry)
      })
      .filter((id): id is string => Boolean(id))
  }
  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry) => {
        if (entry === null || entry === undefined) return null
        if (typeof entry === 'object') {
          return toCleanId((entry as any).id ?? (entry as any).featureId ?? (entry as any).feature_id ?? entry)
        }
        return toCleanId(entry)
      })
      .filter((id): id is string => Boolean(id))
  }
  const single = toCleanId(value)
  return single ? [single] : []
}

export const normalizeFeatureLedger = (input: FeatureLedgerInput): FeatureLedger => {
  const ledger: FeatureLedger = {}
  if (!input) return ledger

  const ensureEntry = (parentId: string, featureId: string) => {
    if (!ledger[parentId]) ledger[parentId] = []
    if (!ledger[parentId].includes(featureId)) ledger[parentId].push(featureId)
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (entry === null || entry === undefined) continue
      if (typeof entry === 'object' && !(entry instanceof String)) {
        const parent = toCleanId((entry as any).parent ?? (entry as any).rootId ?? (entry as any).root ?? (entry as any).source)
        const featureId =
          toCleanId((entry as any).featureId) ??
          toCleanId((entry as any).feature_id) ??
          toCleanId((entry as any).id) ??
          (parent ?? null)
        if (!featureId) continue
        const parentId = parent ?? featureId
        ensureEntry(parentId, featureId)
      } else {
        const id = toCleanId(entry)
        if (!id) continue
        ensureEntry(id, id)
      }
    }
    return ledger
  }

  if (typeof input === 'object') {
    for (const [rawParent, rawValue] of Object.entries(input)) {
      const parentId = toCleanId(rawParent)
      if (!parentId) continue
      const ids = toIdArray(rawValue)
      if (!ids.length) continue
      for (const id of ids) {
        ensureEntry(parentId, id)
      }
      // ensure parent itself is registered (useful when ids list does not include it)
      ensureEntry(parentId, parentId)
    }
  }

  return ledger
}

export const flattenFeatureLedger = (ledger: FeatureLedger | null | undefined): string[] => {
  if (!ledger || typeof ledger !== 'object') return []
  const out = new Set<string>()
  for (const features of Object.values(ledger)) {
    if (!Array.isArray(features)) continue
    for (const featureId of features) {
      const id = toCleanId(featureId)
      if (id) out.add(id)
    }
  }
  return Array.from(out)
}

export const mergeFeatureLedgers = (base: FeatureLedger, extra: FeatureLedger): FeatureLedger => {
  const merged: FeatureLedger = {}
  const parents = new Set<string>([...Object.keys(base ?? {}), ...Object.keys(extra ?? {})])
  for (const parent of parents) {
    const set = new Set<string>()
    for (const id of toIdArray(base?.[parent])) {
      if (id) set.add(id)
    }
    for (const id of toIdArray(extra?.[parent])) {
      if (id) set.add(id)
    }
    if (set.size === 0) continue
    merged[parent] = Array.from(set)
  }
  return merged
}

export const ledgerHasFeature = (ledger: FeatureLedger | null | undefined, featureId: string): boolean => {
  if (!ledger) return false
  const wanted = toCleanId(featureId)
  if (!wanted) return false
  const entries = flattenFeatureLedger(ledger)
  return entries.includes(wanted)
}

export const ledgerAddFeature = (ledger: FeatureLedger | null | undefined, parentId: string, featureId: string): FeatureLedger => {
  const next = normalizeFeatureLedger(ledger)
  const parent = toCleanId(parentId) ?? toCleanId(featureId)
  const feature = toCleanId(featureId)
  if (!parent || !feature) return next
  if (!next[parent]) next[parent] = []
  if (!next[parent].includes(parent)) {
    next[parent].unshift(parent)
  }
  if (!next[parent].includes(feature)) next[parent].push(feature)
  return next
}

export const ledgerAddFeatures = (
  ledger: FeatureLedger | null | undefined,
  parentId: string | null | undefined,
  featureIds: Array<string | null | undefined>
): FeatureLedger => {
  let next = normalizeFeatureLedger(ledger)
  const parent = toCleanId(parentId)
  for (const feature of featureIds) {
    const cleanFeature = toCleanId(feature)
    if (!cleanFeature) continue
    next = ledgerAddFeature(next, parent ?? cleanFeature, cleanFeature)
  }
  return next
}

export const pruneFeatureLedger = (ledger: FeatureLedger, filter: (parentId: string, featureId: string) => boolean): FeatureLedger => {
  const next: FeatureLedger = {}
  for (const [parent, list] of Object.entries(ledger || {})) {
    if (!Array.isArray(list)) continue
    const filtered = list.filter((fid) => filter(parent, fid))
    if (filtered.length) {
      next[parent] = Array.from(new Set(filtered))
    }
  }
  return next
}
