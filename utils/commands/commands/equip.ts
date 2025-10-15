/**
 * Commande: EQUIP
 *
 * Usage:
 *   - EQUIP:longsword
 *   - EQUIP:shield_basic
 *   - EQ:amulet_of_health
 *   - EQUIP:longsword,slot=armePrincipale
 *
 * Slots acceptés (optionnels): armePrincipale | armeSecondaire | protection | bouclier | accessoire
 */
import type { Command } from '../types'

function parseArgs(raw: string | null): { id: string | null; slot?: string | null } {
  const s = String(raw ?? '').trim()
  if (!s) return { id: null }
  const parts = s.split(',')
  const id = parts[0]?.trim() || null
  let slot: string | null = null
  for (const p of parts.slice(1)) {
    const [k, v] = p.split('=').map((x) => x.trim())
    if (k && k.toLowerCase() === 'slot') slot = v || null
  }
  return { id, slot }
}

export const equipCommand: Command = {
  key: 'EQUIP',
  aliases: ['EQ'],
  run(ctx, rawArgs) {
    const { id, slot } = parseArgs(rawArgs)
    if (!id) return { ok: false, message: 'EQUIP: itemId requis' }
    try {
      const validSlot = (slot && ['armePrincipale','armeSecondaire','protection','bouclier','accessoire'].includes(slot)) ? (slot as any) : undefined
      try { (ctx.stores.personnage as any).equip?.(id, validSlot) } catch {}
      if (ctx.partieId) {
        try { ctx.stores.personnage.sauvegarderLocal(ctx.partieId) } catch {}
      }
      return { ok: true, message: `Équipé: ${id}${validSlot ? ' (slot='+validSlot+')' : ''}` }
    } catch (error: any) {
      return { ok: false, message: `Echec EQUIP: ${error?.message || 'inconnu'}` }
    }
  }
}

export default equipCommand
