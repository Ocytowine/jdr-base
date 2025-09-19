export function roll(n: number, faces: number){
  let total = 0
  for(let i=0;i<n;i++) total += Math.floor(Math.random()*faces)+1
  return total
}

export function roll4d6DropLowest(){
  const lancers = [0,0,0,0].map(()=>Math.floor(Math.random()*6)+1).sort((a,b)=>a-b)
  return lancers.slice(1).reduce((a,b)=>a+b,0)
}

export function d20(){ return roll(1,20) }
export function d20Avantage(){ return Math.max(d20(), d20()) }
export function d20Desavantage(){ return Math.min(d20(), d20()) }

export const standardArray = [15,14,13,12,10,8] as const

export function pointBuy27(){
  return [15,14,13,12,10,8]
}
