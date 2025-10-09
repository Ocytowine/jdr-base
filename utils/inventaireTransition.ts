import type { InventaireItem } from '@/components/aventure/AventureInventaire.vue'
import { copperToCoins } from '@/utils/creationHelpers'

export const DEFAULT_PARTIE_INVENTORY_IDS = ['item-epee', 'item-potion', 'item-grimoire'] as const

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

const toValueLabel = (coins: CoinBreakdown | null | undefined) => {
  if (!coins) return null
  const parts: string[] = []
  if (coins.gold) parts.push(`${coins.gold} po`)
  if (coins.silver) parts.push(`${coins.silver} pa`)
  if (coins.copper) parts.push(`${coins.copper} pc`)
  return parts.join(' ') || null
}

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
  const items: InventaireItem[] = entries.map((raw) => {
    const originId = getEntryKey(raw) ?? `creation-item-${keptIds.length}`
    const labelCandidate =
      String(raw?.label ?? raw?.name ?? raw?.title ?? raw?.itemId ?? originId)
    let slugBase = slugify(labelCandidate)
    if (!slugBase && raw?.itemId) {
      slugBase = slugify(String(raw.itemId))
    }
    if (!slugBase && originId) {
      slugBase = slugify(originId)
    }
    if (!slugBase) {
      slugBase = `item-${keptIds.length}`
    }
    const safeId = ensureUniqueSlug(slugBase, slugUsage)
    keptIds.push(safeId)
    const purseKey = input.purseKey ?? null
    const isPurse = purseKey ? originId === purseKey || safeId === purseKey : false
    const ownCoins = copperToCoins(Number((raw as any)?.totalCoinsCopper ?? 0))
    const coins = isPurse ? input.finalCoins ?? ownCoins : ownCoins
    const tagsSource = Array.isArray((raw as any)?.tags) ? (raw as any).tags : []
    const tags = (tagsSource as unknown[]).map((tag) => String(tag))
    return {
      id: safeId,
      originId,
      title: String((raw as any)?.label ?? (raw as any)?.itemId ?? 'Objet'),
      description: (raw as any)?.description ?? null,
      image: (raw as any)?.image ?? null,
      typeLabel: (raw as any)?.type ?? null,
      quantity: Number((raw as any)?.quantity ?? 1),
      weightTotal: Number((raw as any)?.weightTotal ?? 0),
      valueLabel: toValueLabel(coins),
      equipped: equippedKeys.has(originId),
      rarity: 'commun',
      tags
    }
  })

  const equippedIds = items.filter((item) => item.equipped).map((item) => item.id)

  return {
    items,
    keptIds,
    equippedIds
  }
}
