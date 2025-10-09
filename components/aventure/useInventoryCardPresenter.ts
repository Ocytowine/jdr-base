import type { InventaireItem, InventaireValue } from './AventureInventaire.vue'

export type CardItemStat = {
  label: string
  value: string
}

export type PresentedCardItem = {
  title: string
  description: string | null
  imageId: string | null
  image: string | null
  typeLabel: string | null
  badges: CardItemStat[]
  extraStats: CardItemStat[]
  typeDetails: CardItemStat[]
  equipped: boolean
  equipActionLabel: string
  unequipActionLabel: string
}

const DEFAULT_VALUE = '-'

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

  if (normalizedType === 'arme') {
    details.push(...getCombatDetails(item.properties_fight ?? null))
  }

  if (normalizedType === 'armure') {
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

export const toPresentedCardItem = (item: InventaireItem): PresentedCardItem => {
  const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
  const normalizedType = normalizeType(item.type)
  const valueDisplay = formatValue(item.value ?? null)
  const isWeapon = normalizedType === 'arme' || normalizedType === 'weapon'

  return {
    title: item.name,
    description: item.description ?? null,
    imageId: item.id ?? null,
    image: null,
    typeLabel: item.type ?? null,
    badges: computeBadges(item),
    extraStats: computeExtraStats(item, quantity),
    typeDetails: computeTypeDetails(item, normalizedType, valueDisplay),
    equipped: Boolean(item.equipped),
    equipActionLabel: 'Equiper',
    unequipActionLabel: isWeapon ? 'Ranger' : 'Retirer'
  }
}
