// composables/useUid.ts
export function useUid(){
  function nouvelId(prefix: string){
    const rnd = Math.random().toString(16).slice(2,7)
    return `${prefix}_${rnd}`
  }
  return { nouvelId }
}
