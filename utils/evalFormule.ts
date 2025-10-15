// utils/evalFormule.ts
// Évalue des formules additives simples: nombres, "mait", "mod.<ABRÉVIATION>"
// Séparées par des "+". Pas de parenthèses ni de multiplicateurs.

import { bonusDeMaitrise, mod as modCarac } from '@/utils/regles_du_jeu'

export type FormuleCaracs = { force: number; dexterite: number; constitution: number; intelligence: number; sagesse: number; charisme: number }

export function evalFormuleAdditive(formule: string, niveau: number, caracs: FormuleCaracs): number {
  if (!formule || typeof formule !== 'string') return 0
  const prof = bonusDeMaitrise(Number(niveau) || 1)

  const tokVal = (tokRaw: string): number => {
    const tok = (tokRaw || '').trim()
    if (!tok) return 0
    // entier positif
    if (/^\d+$/.test(tok)) return Number(tok)
    // bonus de maîtrise
    if (tok.toLowerCase() === 'mait') return prof
    // modificateur de caractéristique
    const m = tok.match(/^mod\.(.+)$/i)
    if (m) {
      const key = (m[1] || '').toLowerCase()
      const map: Record<string, keyof FormuleCaracs> = {
        for: 'force', force: 'force', str: 'force',
        dex: 'dexterite', dexterite: 'dexterite',
        con: 'constitution', constitution: 'constitution',
        int: 'intelligence', intelligence: 'intelligence',
        sag: 'sagesse', sagesse: 'sagesse', wis: 'sagesse',
        cha: 'charisme', charisme: 'charisme'
      }
      const caracKey = map[key]
      if (caracKey) return modCarac(Number(caracs[caracKey] || 10))
      return 0
    }
    // inconnu -> ignore
    return 0
  }

  try {
    return String(formule)
      .split('+')
      .map((t) => tokVal(t))
      .reduce((a, b) => a + b, 0)
  } catch {
    return 0
  }
}

const DICE_REGEX = /^\d+d\d+$/i

export function isAdditiveFormula(formule: string): boolean {
  if (typeof formule !== 'string') return false
  const tokens = formule.split('+').map((t) => t.trim()).filter(Boolean)
  if (!tokens.length) return false
  return tokens.every((raw) => {
    const tok = raw.toLowerCase()
    if (/^\d+$/.test(tok)) return true
    if (tok === 'mait') return true
    if (/^mod\.[a-z]+$/.test(tok)) return true
    if (DICE_REGEX.test(tok)) return true
    return false
  })
}

type FormattedFormula = { numeric: number | null; expression: string }

export function formatFormuleAdditive(formule: string, niveau: number, caracs: FormuleCaracs): FormattedFormula {
  const tokens = String(formule)
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean)
  const prof = bonusDeMaitrise(Number(niveau) || 1)
  let numericSum = 0
  const expressionParts: string[] = []
  let hasDice = false

  for (const tokenRaw of tokens) {
    const token = tokenRaw.trim()
    if (!token) continue
    const lower = token.toLowerCase()
    if (DICE_REGEX.test(lower)) {
      hasDice = true
      expressionParts.push(lower)
      continue
    }
    if (/^\d+$/.test(lower)) {
      const value = Number(lower)
      numericSum += value
      expressionParts.push(String(value))
      continue
    }
    if (lower === 'mait') {
      const value = prof
      numericSum += value
      expressionParts.push(String(value))
      continue
    }
    const modMatch = lower.match(/^mod\.(.+)$/)
    if (modMatch) {
      const key = modMatch[1]
      const map: Record<string, keyof FormuleCaracs> = {
        for: 'force', force: 'force', str: 'force',
        dex: 'dexterite', dexterite: 'dexterite',
        con: 'constitution', constitution: 'constitution',
        int: 'intelligence', intelligence: 'intelligence',
        sag: 'sagesse', sagesse: 'sagesse', wis: 'sagesse',
        cha: 'charisme', charisme: 'charisme'
      }
      const caracKey = map[key]
      const value = caracKey ? modCarac(Number(caracs[caracKey] || 10)) : 0
      numericSum += value
      expressionParts.push(String(value))
      continue
    }
    hasDice = true
    expressionParts.push(token)
  }

  if (!hasDice && expressionParts.every((part) => part !== undefined)) {
    return { numeric: numericSum, expression: String(numericSum) }
  }

  const expr = expressionParts
    .filter((part) => part !== '0')
    .join(' + ')
    .replace(/\s+\+/g, ' + ')
    .trim()

  return {
    numeric: hasDice ? null : numericSum,
    expression: expr.length ? expr : '0'
  }
}

const isPlainObject = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const resolveStatBaseValue = (value: any, niveau: number, caracs: FormuleCaracs): any => {
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  if (typeof value === 'string') {
    if (!isAdditiveFormula(value)) return value
    const formatted = formatFormuleAdditive(value, niveau, caracs)
    return formatted.numeric ?? formatted.expression
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveStatBaseValue(entry, niveau, caracs))
  }
  if (isPlainObject(value)) {
    const next: Record<string, any> = {}
    for (const [key, inner] of Object.entries(value)) {
      next[key] = resolveStatBaseValue(inner, niveau, caracs)
    }
    return next
  }
  return value
}

export function resolveStatBasePayload(payload: any, niveau: number, caracs: FormuleCaracs): Record<string, any> | null {
  if (!payload || typeof payload !== 'object') return null
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    result[key] = resolveStatBaseValue(value, niveau, caracs)
  }
  return Object.keys(result).length ? result : null
}
