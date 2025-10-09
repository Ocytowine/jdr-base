import type { InventaireItem } from '@/components/aventure/AventureInventaire.vue'
import { copperToCoins } from '@/utils/creationHelpers'

export const DEFAULT_PARTIE_INVENTORY_IDS = [
  'item-epee',
  'item-potion',
  'item-grimoire',
  'epee-longue',
  'potion-soin-mineure',
  'grimoire-bataille'
] as const

export const DEFAULT_PARTIE_INVENTORY_ID_SET = new Set(DEFAULT_PARTIE_INVENTORY_IDS)

type CoinBreakdown = { gold?: number; silver?: number; copper?: number }

type CreationAssignments = {
  primaryWeaponKey?: string | null
  secondaryWeaponKey?: string | null
  protectionKey?: string | null
  shieldKey?: string | null
}

type CreationInventoryTransitionInput = {
  entries: unknown[]
  assignments?: CreationAssignments | null
  purseKey?: string | null
  finalCoins?: CoinBreakdown | null
}

export type CreationInventoryTransition = {
  items: InventaireItem[]
  keptIds: string[]
  equippedIds: string[]
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const getEntryKey = (entry: any): string | null => {
  if (!entry || typeof entry !== 'object') return null
  const key = entry.key ?? entry.itemId
  if (isNonEmptyString(key)) return key
  if (typeof key === 'number') return String(key)
  return null
}

const collectAssignmentKeys = (assignments?: CreationAssignments | null) => {
  const keys = new Set<string>()
  if (!assignments) return keys
  ;['primaryWeaponKey', 'secondaryWeaponKey', 'protectionKey', 'shieldKey'].forEach((slot) => {
    const keyValue = (assignments as Record<string, unknown>)[slot]
    if (isNonEmptyString(keyValue)) {
      keys.add(keyValue)
    } else if (typeof keyValue === 'number') {
      keys.add(String(keyValue))
    }
  })
  return keys
}

const fallbackEquipHeuristics = (entries: any[], equippedKeys: Set<string>) => {
  if (equippedKeys.size > 0) return
  const findFirstKey = (predicate: (it: any) => boolean): string | null => {
    const found = entries.find((candidate) => predicate(candidate))
    return getEntryKey(found)
  }
  const weapon = findFirstKey((it) => /arme|weapon/i.test(String(it?.type ?? '')))
  if (weapon) equippedKeys.add(weapon)
  const protection = findFirstKey((it) => /armure|bouclier|protection|armor|shield/i.test(String(it?.type ?? '')))
  if (protection) equippedKeys.add(protection)
}

const slugify = (value: string): string => {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

const ensureUniqueSlug = (slug: string, usage: Map<string, number>): string => {
  if (!usage.has(slug)) {
    usage.set(slug, 1)
    return slug
  }
  const count = usage.get(slug) ?? 1
  const nextSlug = `${slug}-${count}`
  usage.set(slug, count + 1)
  if (usage.has(nextSlug)) {
    return ensureUniqueSlug(slug, usage)
  }
  usage.set(nextSlug, 1)
  return nextSlug
}

export const buildCreationInventoryTransition = (
  input: CreationInventoryTransitionInput
): CreationInventoryTransition => {
  const entries = Array.isArray(input.entries) ? input.entries : []
  const assignments = input.assignments ?? null
  const equippedKeys = collectAssignmentKeys(assignments)
  fallbackEquipHeuristics(entries, equippedKeys)

  const keptIds: string[] = []
  const slugUsage = new Map<string, number>()
  let items: InventaireItem[] = entries.map((raw) => {
    const originId = getEntryKey(raw) ?? `creation-item-${keptIds.length}`
    const rawItem = (raw as any)?.raw ?? (raw as any)?.resolved ?? raw

    const resolveString = (...candidates: unknown[]): string | null => {
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length) {
          return candidate.trim()
        }
      }
      return null
    }

    const resolveNumber = (value: unknown): number | null => {
      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : null
    }

    const baseIdCandidate = resolveString(rawItem?.id, raw?.itemId, originId)
    let slugBase = baseIdCandidate ? slugify(baseIdCandidate) : ''
    if (!slugBase) {
      const nameCandidate = resolveString(rawItem?.name, raw?.label, raw?.title)
      slugBase = nameCandidate ? slugify(nameCandidate) : ''
    }
    if (!slugBase) {
      slugBase = `item-${keptIds.length}`
    }
    const safeId = ensureUniqueSlug(slugBase, slugUsage)
    keptIds.push(safeId)

    const name = resolveString(rawItem?.name, raw?.label, raw?.title, originId) ?? safeId
    const description = resolveString(rawItem?.description, raw?.description) ?? null
    const type = resolveString(rawItem?.type, raw?.type)

    const quantity = Math.max(1, resolveNumber(raw?.quantity) ?? resolveNumber(rawItem?.quantity) ?? 1)

    const weight = (() => {
      const base = resolveNumber(rawItem?.weight)
      if (base !== null) return base
      const perUnit = resolveNumber(raw?.weightPerUnit)
      if (perUnit !== null) return perUnit
      const total = resolveNumber(raw?.weightTotal)
      if (total !== null && quantity) {
        return total / quantity
      }
      return null
    })()

    const purseKey = input.purseKey ?? null
    const isPurse = purseKey ? originId === purseKey || safeId === purseKey : false
    const coinsFallback = copperToCoins(Number((raw as any)?.totalCoinsCopper ?? 0))
    const normalizeValueObject = (value: any, fallback?: CoinBreakdown | null) => {
      if (value && typeof value === 'object') {
        const gold = resolveNumber(value.gold) ?? 0
        const silver = resolveNumber(value.silver) ?? 0
        const copper = resolveNumber(value.copper) ?? 0
        return { gold, silver, copper }
      }
      if (fallback) {
        return {
          gold: resolveNumber(fallback.gold) ?? 0,
          silver: resolveNumber(fallback.silver) ?? 0,
          copper: resolveNumber(fallback.copper) ?? 0
        }
      }
      return null
    }

    const baseValue = normalizeValueObject(rawItem?.value) ?? normalizeValueObject(raw?.value)
    const coins = isPurse ? input.finalCoins ?? coinsFallback : baseValue ? null : coinsFallback
    const value = normalizeValueObject(baseValue ?? null, coins)

    const allowStack = Boolean(
      rawItem?.allow_stack ?? rawItem?.allowStack ?? raw?.allow_stack ?? raw?.allowStack ?? false
    )
    const harmonisable = Boolean(
      rawItem?.harmonisable ?? rawItem?.harmonizable ?? raw?.harmonisable ?? raw?.harmonizable ?? false
    )

    const propertiesFight = (rawItem?.properties_fight ?? rawItem?.propertiesFight ?? raw?.properties_fight ?? raw?.propertiesFight) ?? null
    const propertiesEquip = (rawItem?.properties_equip ?? rawItem?.propertiesEquip ?? raw?.properties_equip ?? raw?.propertiesEquip) ?? null

    return {
      id: safeId,
      originId,
      name,
      description,
      type,
      quantity,
      weight,
      value,
      equipped: equippedKeys.has(originId),
      allow_stack: allowStack,
      harmonisable,
      properties_fight: propertiesFight,
      properties_equip: propertiesEquip
    }
  })

  if (!items.length && entries.length) {
    slugUsage.clear()
    items = entries.map((raw, index) => {
      const originId = getEntryKey(raw) ?? `creation-item-${index}`
      const rawItem = (raw as any)?.raw ?? (raw as any)?.resolved ?? raw
      const resolveString = (...candidates: unknown[]): string | null => {
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim().length) {
            return candidate.trim()
          }
        }
        return null
      }
      const resolveNumber = (value: unknown): number | null => {
        const numeric = Number(value)
        return Number.isFinite(numeric) ? numeric : null
      }
      const labelCandidate =
        resolveString(rawItem?.name, rawItem?.label, rawItem?.title, raw?.label, raw?.title, originId) ??
        `item-${index}`
      const slugBase = slugify(labelCandidate) || slugify(originId) || `item-${index}`
      const safeId = ensureUniqueSlug(slugBase, slugUsage)
      keptIds.push(safeId)

      const quantity = Math.max(1, resolveNumber(rawItem?.quantity) ?? resolveNumber(raw?.quantity) ?? 1)
      const weight = (() => {
        const unit = resolveNumber(rawItem?.weight ?? raw?.weight ?? raw?.weightPerUnit)
        if (unit !== null) return unit
        const total = resolveNumber(rawItem?.weightTotal ?? raw?.weightTotal)
        if (total !== null) return total / quantity
        return null
      })()

      const normalizeValue = (value: any) => {
        if (value && typeof value === 'object') {
          const gold = resolveNumber(value.gold) ?? 0
          const silver = resolveNumber(value.silver) ?? 0
          const copper = resolveNumber(value.copper) ?? 0
          return { gold, silver, copper }
        }
        return null
      }

      const value = normalizeValue(rawItem?.value ?? raw?.value)

      return {
        id: safeId,
        originId,
        name: labelCandidate,
        description: resolveString(rawItem?.description, raw?.description),
        type: resolveString(rawItem?.type, raw?.type),
        quantity,
        weight,
        value,
        equipped: equippedKeys.has(originId),
        allow_stack: Boolean(rawItem?.allow_stack ?? rawItem?.allowStack ?? raw?.allow_stack ?? raw?.allowStack ?? false),
        harmonisable: Boolean(rawItem?.harmonisable ?? rawItem?.harmonizable ?? raw?.harmonisable ?? raw?.harmonizable ?? false),
        properties_fight: rawItem?.properties_fight ?? rawItem?.propertiesFight ?? raw?.properties_fight ?? raw?.propertiesFight ?? null,
        properties_equip: rawItem?.properties_equip ?? rawItem?.propertiesEquip ?? raw?.properties_equip ?? raw?.propertiesEquip ?? null
      }
    })
  }

  const equippedIds = items.filter((item) => item.equipped).map((item) => item.id)

  return {
    items,
    keptIds,
    equippedIds
  }
}
