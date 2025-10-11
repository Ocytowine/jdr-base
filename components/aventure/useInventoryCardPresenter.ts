import type { InventaireItem, InventaireValue } from './AventureInventaire.vue'
import { useDataStore } from '@/stores/data'

export type CardItemStat = {
  label: string
  value: string
}

export type CardItemActionKind = 'equip' | 'unequip' | 'inspect' | 'drop'

export type CardItemAction = {
  key: string
  label: string
  kind: CardItemActionKind
}

export type PresentedCardItem = {
  name: string
  title?: string
  description: string | null
  imageId: string | null
  image: string | null
  typeLabel: string | null
  badges: CardItemStat[]
  extraStats: CardItemStat[]
  typeDetails: CardItemStat[]
  actions: CardItemAction[]
  equipped: boolean
}

const DEFAULT_VALUE = '-'

const EQUIP_TYPES = [
  'arme',
  'armes',
  'weapon',
  'weapons',
  'munition',
  'munitions',
  'ammo',
  'accessoire',
  'accessoires',
  'accessory',
  'accessories',
  'grimoire',
  'grimoires',
  'spellbook',
  'spellbooks',
  'outil',
  'outils',
  'tool',
  'tools'
]

const WEAPON_TYPE_TOKENS = ['arme', 'armes', 'weapon', 'weapons']
const ARMOR_TYPE_TOKENS = ['armure', 'armures', 'armor', 'armors', 'bouclier', 'shield']

const tokenizeType = (normalizedType: string): string[] =>
  normalizedType.split(/[^a-z0-9]+/).filter((token) => token.length > 0)

const matchesTypeTokens = (normalizedType: string, tokens: string[]): boolean => {
  if (!normalizedType) return false
  const parts = tokenizeType(normalizedType)
  return parts.some((part) => tokens.includes(part))
}

const formatWeight = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return DEFAULT_VALUE
  const numeric = Number(value)
  if (!numeric) return '0 kg'
  if (Math.abs(numeric) >= 10) return `${numeric.toFixed(0)} kg`
  return `${numeric.toFixed(2)} kg`
}

const formatValue = (value: InventaireValue | null | undefined): string => {
  if (!value) return DEFAULT_VALUE
  const parts: string[] = []
  if (value.gold) parts.push(`${value.gold} po`)
  if (value.silver) parts.push(`${value.silver} pa`)
  if (value.copper) parts.push(`${value.copper} pc`)
  return parts.length ? parts.join(' ') : DEFAULT_VALUE
}

const normalizeType = (input?: string | null): string => {
  if (!input) return ''
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

const computeBadges = (item: InventaireItem): CardItemStat[] => {
  const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
  return [
    { label: 'Quantite', value: String(quantity) },
    { label: 'Etat', value: item.equipped ? 'Equipe' : 'Sac' }
  ]
}

const computeExtraStats = (item: InventaireItem, quantity: number): CardItemStat[] => {
  const weightTotal = item.weight === null || item.weight === undefined ? null : item.weight * quantity
  const stats: CardItemStat[] = [
    { label: 'Valeur', value: formatValue(item.value ?? null) },
    { label: 'Poids total', value: formatWeight(weightTotal) },
    { label: 'Poids (unite)', value: formatWeight(item.weight ?? null) }
  ]

  return stats.filter((stat) => stat.value !== DEFAULT_VALUE)
}

const getCombatDetails = (propertiesFight: Record<string, any> | null | undefined): CardItemStat[] => {
  if (!propertiesFight) return []

  const damage = propertiesFight.damage ?? propertiesFight.degats ?? null
  const damageType =
    propertiesFight.damage_type ?? propertiesFight.type ?? propertiesFight.damageType ?? propertiesFight.degats_type ?? null

  const details: CardItemStat[] = []

  if (damage) {
    details.push({ label: 'Degats', value: String(damage) })
  }

  if (damageType) {
    details.push({ label: 'Type', value: String(damageType) })
  }

  const range = propertiesFight.range ?? propertiesFight.portee ?? null
  if (range) {
    details.push({ label: 'Portee', value: String(range) })
  }

  return details
}

const getArmorDetails = (propertiesEquip: Record<string, any> | null | undefined): CardItemStat[] => {
  if (!propertiesEquip) return []
  const defense = propertiesEquip.armor_class ?? propertiesEquip.defense ?? propertiesEquip.ca
  if (defense === undefined || defense === null) return []
  return [{ label: "Classe d'armure", value: String(defense) }]
}

const computeTypeDetails = (
  item: InventaireItem,
  normalizedType: string,
  valueDisplay: string
): CardItemStat[] => {
  const details: CardItemStat[] = []

  if (normalizedType === 'bourse') {
    details.push({ label: 'Contenu', value: valueDisplay })
  }

  if (matchesTypeTokens(normalizedType, WEAPON_TYPE_TOKENS)) {
    details.push(...getCombatDetails(item.properties_fight ?? null))
  }

  if (matchesTypeTokens(normalizedType, ARMOR_TYPE_TOKENS)) {
    details.push(...getArmorDetails(item.properties_equip ?? null))
  }

  if (item.allow_stack) {
    details.push({ label: 'Empilable', value: 'Oui' })
  }

  if (item.harmonisable) {
    details.push({ label: 'Harmonisable', value: 'Oui' })
  }

  return details
}

const computeActions = (item: InventaireItem, normalizedType: string): CardItemAction[] => {
  const actions: CardItemAction[] = []
  const canEquip = EQUIP_TYPES.includes(normalizedType)

  if (canEquip) {
    actions.push(
      item.equipped
        ? { key: 'unequip', label: 'Ranger', kind: 'unequip' }
        : { key: 'equip', label: 'Equiper', kind: 'equip' }
    )
  }

  actions.push({ key: 'inspect', label: 'Inspecter', kind: 'inspect' })
  actions.push({ key: 'drop', label: 'Jeter', kind: 'drop' })

  return actions
}

const enrichWithData = (item: InventaireItem): InventaireItem => {
  try {
    const data = useDataStore()
    const raw = data?.maps?.items?.[item.id]
    if (!raw || typeof raw !== 'object') return item
    const coalesce = <T>(a: T | undefined, b: T | undefined): T | undefined => (a !== undefined && a !== null ? a : b)

    const rawName = (raw.name ?? raw.nom ?? raw.label) as any
    const existingName = item.name as any
    const isPlaceholder = !existingName || /^item-\d+$/i.test(String(existingName))
    const name = (rawName ?? (isPlaceholder ? undefined : existingName) ?? item.id) as any

    const description = coalesce((raw.description ?? raw.desc) as any, item.description as any) ?? null
    const type = coalesce((raw.type ?? raw.resolved?.type) as any, item.type as any) ?? null
    const weight = coalesce((raw.weight ?? raw.resolved?.weight) as any, item.weight as any) ?? null
    const value = ((): InventaireValue | null => {
      const v = raw.value ?? raw.resolved?.value
      if (v && typeof v === 'object') {
        return { gold: Number(v.gold)||0, silver: Number(v.silver)||0, copper: Number(v.copper)||0 }
      }
      return item.value ?? null
    })()
    const properties_fight = coalesce(item.properties_fight as any, raw.properties_fight as any) ?? null
    const properties_equip = coalesce(item.properties_equip as any, raw.properties_equip as any) ?? null
    const allow_stack = Boolean(coalesce(item.allow_stack as any, (raw.allow_stack ?? raw.allowStack) as any))
    const harmonisable = Boolean(coalesce(item.harmonisable as any, (raw.harmonisable ?? raw.harmonizable) as any))
    return {
      ...item,
      name: String(name),
      description: description ? String(description) : null,
      type: type ? String(type) : null,
      weight: typeof weight === 'number' ? weight : item.weight ?? null,
      value: value ?? item.value ?? null,
      properties_fight,
      properties_equip,
      allow_stack,
      harmonisable
    }
  } catch {
    return item
  }
}

export const toPresentedCardItem = (item: InventaireItem): PresentedCardItem => {
  const base = enrichWithData(item)
  const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
  const normalizedType = normalizeType(base.type)
  const valueDisplay = formatValue(base.value ?? null)

  return {
    name: base.name,
    title: base.name,
    description: base.description ?? null,
    imageId: base.id ?? null,
    image: null,
    typeLabel: base.type ?? null,
    badges: computeBadges(base),
    extraStats: computeExtraStats(base, quantity),
    typeDetails: computeTypeDetails(base, normalizedType, valueDisplay),
    actions: computeActions(base, normalizedType),
    equipped: Boolean(base.equipped)
  }
}







