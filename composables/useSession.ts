export function useSession(){
  const sessionActive = useState('sessionActive', () => false)
  const idCourant = useState<string | null>('idPartie', () => null)

  function activerSession(){ sessionActive.value = true }
  function definirIdPartie(id: string){ idCourant.value = id }

  return { sessionActive, idCourant, activerSession, definirIdPartie }
}
