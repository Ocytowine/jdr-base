/**
 * Registre des commandes — enregistrement et résolution par clé/alias.
 */
import type { Command } from './types'

const REGISTRY = new Map<string, Command>()
const ALIASES = new Map<string, string>()

export const registerCommand = (cmd: Command) => {
  REGISTRY.set(cmd.key, cmd)
  for (const alias of cmd.aliases || []) {
    ALIASES.set(alias, cmd.key)
  }
}

export const getCommand = (keyOrAlias: string): Command | null => {
  const key = REGISTRY.has(keyOrAlias)
    ? keyOrAlias
    : (ALIASES.get(keyOrAlias) || null)
  return key ? REGISTRY.get(key) || null : null
}

export const listCommandKeys = (): string[] => Array.from(REGISTRY.keys())

