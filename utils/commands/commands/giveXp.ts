/**
 * Commande: GET_PJ_XP
 *
 * Usage minimal (pour tests):
 *   - GET_PJ_XP:200
 *   - XP:200 (alias)
 *
 * Effet: ajoute N points d'XP au personnage courant via le store Pinia.
 */
import type { Command } from '../types'

const toPositiveInt = (raw: string | null): number | null => {
  if (!raw) return null
  const n = Number(String(raw).trim())
  if (!Number.isFinite(n)) return null
  const v = Math.floor(n)
  return v > 0 ? v : null
}

export const giveXpCommand: Command = {
  key: 'GET_PJ_XP',
  aliases: ['XP'],
  run(ctx, rawArgs) {
    const amount = toPositiveInt(rawArgs)
    if (!amount) {
      return { ok: false, message: "Arguments invalides: utilisez GET_PJ_XP:NombrePositif" }
    }
    try {
      ctx.stores.personnage.ajouterXp(amount)
      // Persiste localement si possible (partie courante)
      if (ctx.partieId) {
        try { ctx.stores.personnage.sauvegarderLocal(ctx.partieId) } catch {}
      }
      const nom = String(ctx.stores.personnage.perso?.nom || 'le personnage')
      return { ok: true, message: `+${amount} XP attribués à ${nom}.` }
    } catch (error: any) {
      return { ok: false, message: `Echec de l'attribution d'XP: ${error?.message || 'inconnu'}` }
    }
  }
}

export default giveXpCommand

