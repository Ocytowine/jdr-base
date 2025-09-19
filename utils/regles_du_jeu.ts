export function mod(score: number){
  return Math.floor((score - 10) / 2)
}

export function bonusDeMaitrise(niveau: number){
  if(niveau >= 17) return 6
  if(niveau >= 13) return 5
  if(niveau >= 9)  return 4
  if(niveau >= 5)  return 3
  return 2
}

export function classeArmureDeBase(dex: number, type: 'aucune'|'legere'|'intermediaire'|'lourde', bouclier: boolean){
  const d = mod(dex)
  let ca = 10 + d
  if(type==='legere') ca = 11 + d
  if(type==='intermediaire') ca = 12 + Math.min(d, 2)
  if(type==='lourde') ca = 16
  if(bouclier) ca += 2
  return ca
}

export function pvMaxAuNiveau(dv: number, niveau: number, modCon: number){
  if(niveau <= 0) return 0
  const premier = dv + modCon
  const moyen = Math.floor(dv/2) + 1 + modCon
  if(niveau===1) return Math.max(1, premier)
  return Math.max(1, premier + (niveau-1) * Math.max(1, moyen))
}
