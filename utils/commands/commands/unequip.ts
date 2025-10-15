/**
 * Commande: UNEQUIP
 *
 * Usage:
 *   - UNEQUIP:longsword
 *   - UNEQ:amulet_of_health
 */
import type { Command } from '../types'

export const unequipCommand: Command = {
  key: 'UNEQUIP',
  aliases: ['UNEQ'],
  run(ctx, rawArgs) {
    const id = String(rawArgs ?? '').trim()
    if (!id) return { ok: false, message: 'UNEQUIP: itemId requis' }
    try {
      try { (ctx.stores.personnage as any).unequip?.(id) } catch {}
      if (ctx.partieId) {
        try { ctx.stores.personnage.sauvegarderLocal(ctx.partieId) } catch {}
      }
      return { ok: true, message: `Déséquipé: ${id}` }
    } catch (error: any) {
      return { ok: false, message: `Echec UNEQUIP: ${error?.message || 'inconnu'}` }
    }
  }
}

export default unequipCommand
