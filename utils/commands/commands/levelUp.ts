/**
 * Commande: LEVEL_UP
 *
 * Usage:
 *   - LEVEL_UP            (incrémente de 1 niveau)
 *   - LEVEL_UP:2          (incrémente de 2 niveaux)
 *   - NIVEAU:1            (alias)
 */
import type { Command } from '../types'

const toPositiveInt = (raw: string | null): number | null => {
  if (!raw) return 1
  const n = Number(String(raw).trim())
  if (!Number.isFinite(n)) return null
  const v = Math.floor(n)
  return v > 0 ? v : null
}

export const levelUpCommand: Command = {
  key: 'LEVEL_UP',
  aliases: ['NIVEAU'],
  run(ctx, rawArgs) {
    try {
      const delta = toPositiveInt(rawArgs) ?? 1
      try { (ctx.stores.personnage as any).levelUp?.(delta) } catch {}
      if (ctx.partieId) {
        try { ctx.stores.personnage.sauvegarderLocal(ctx.partieId) } catch {}
      }
      return { ok: true, message: `Niveau +${delta} appliqué.` }
    } catch (error: any) {
      return { ok: false, message: `Echec LEVEL_UP: ${error?.message || 'inconnu'}` }
    }
  }
}

export default levelUpCommand
