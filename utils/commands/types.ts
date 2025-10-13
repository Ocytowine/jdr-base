/**
 * Moteur de commandes — Types de base
 *
 * Objectif: fournir une base simple et extensible pour gérer des commandes
 * de jeu (ex. GET_PJ_XP:200) saisies dans l'UI ou déclenchées par le narrateur IA.
 */

export type CommandKey = string

/**
 * Contexte d'exécution minimal passé aux commandes.
 * - expose les stores nécessaires (ici: personnage)
 * - peut inclure l'id de la partie pour persister si nécessaire
 */
export type CommandContext = {
  partieId: string | null
  stores: {
    personnage: {
      ajouterXp: (montant: number) => void
      sauvegarderLocal: (partieId?: string) => void
      perso: any
    }
  }
}

export type ParseResult = {
  key: CommandKey
  rawArgs: string | null
}

export type CommandResult = {
  ok: boolean
  message: string
}

export type Command = {
  /** Clé de la commande, ex: GET_PJ_XP */
  key: CommandKey
  /** Alias acceptés, ex: XP */
  aliases?: string[]
  /**
   * Exécute la commande en contexte.
   * Retourne un message de synthèse destiné à l'UI (journal système).
   */
  run: (ctx: CommandContext, rawArgs: string | null) => CommandResult
}

