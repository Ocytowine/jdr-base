/**
 * Moteur de commandes — point d'entrée unique
 *
 * Fournit:
 *  - l'enregistrement des commandes par défaut
 *  - la détection/parse d'une ligne d'entrée
 *  - l'exécution d'une commande en contexte
 */
import type { CommandContext, CommandResult } from './types'
import { registerCommand, getCommand } from './registry'
import { isCommandInput, parseInput } from './parser'
import { giveXpCommand } from './commands/giveXp'

// Enregistre les commandes de base à l'import
registerCommand(giveXpCommand)

export { isCommandInput } from './parser'

/**
 * Traite une ligne brute: détecte, parse et exécute
 */
export const processInput = (input: string, ctx: CommandContext): CommandResult | null => {
  if (!isCommandInput(input)) return null
  const parsed = parseInput(input)
  if (!parsed) return { ok: false, message: 'Commande invalide.' }
  const cmd = getCommand(parsed.key)
  if (!cmd) return { ok: false, message: 'Commande inconnue.' }
  return cmd.run(ctx, parsed.rawArgs)
}

