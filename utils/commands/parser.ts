/**
 * Parser des commandes — détecte et découpe la forme "KEY:payload".
 */
import { getCommand, listCommandKeys } from './registry'
import type { ParseResult } from './types'

const COMMAND_HEAD = /^([A-Z_][A-Z0-9_]*)(?::(.*))?$/

/**
 * Renvoie true si la ligne ressemble à une commande reconnue (clé/alias connus).
 */
export const isCommandInput = (input: string): boolean => {
  const trimmed = (input || '').trim()
  if (!trimmed) return false
  const match = trimmed.match(COMMAND_HEAD)
  if (!match) return false
  const head = match[1]
  if (!head) return false
  const known = getCommand(head) || getCommand(head.toUpperCase())
  return Boolean(known)
}

/**
 * Parse une ligne au format KEY:payload → { key, rawArgs }
 */
export const parseInput = (input: string): ParseResult | null => {
  const trimmed = (input || '').trim()
  const match = trimmed.match(COMMAND_HEAD)
  if (!match) return null
  const key = match[1]
  const rawArgs = match[2] ?? null
  // normalise la clé si un alias correspond
  const cmd = getCommand(key) || getCommand(key.toUpperCase())
  if (!cmd) return null
  return { key: cmd.key, rawArgs }
}

