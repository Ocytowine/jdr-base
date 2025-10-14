// utils/evalFormule.ts
// Évalue des formules additives simples: nombres, "mait", "mod.<ABRÉVIATION>"
// Séparées par des "+". Pas de parenthèses ni de multiplicateurs.

import { bonusDeMaitrise, mod as modCarac } from '@/utils/regles_du_jeu'

type Caracs = { force: number; dexterite: number; constitution: number; intelligence: number; sagesse: number; charisme: number }

export function evalFormuleAdditive(formule: string, niveau: number, caracs: Caracs): number {
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
      const map: Record<string, keyof Caracs> = {
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

