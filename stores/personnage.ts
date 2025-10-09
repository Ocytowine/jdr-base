import { defineStore } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'

export type Caracs = {
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
}

export type CompetenceDef = { id:string, nom:string, carac: keyof Caracs }

export type Personnage = {
  id: string
  nom: string
  lignee: string
  age: number
  alignement: string
  historique: string
  classe: string
  sousClasse: string
  niveau: number
  dv: number
  pvActuels: number
  caracs: Caracs
  competences: Record<string, boolean>
  langues: string
  equipement: string
  armure?: { type: 'aucune'|'legere'|'intermediaire'|'lourde', nom?: string }
  bouclier?: boolean
  monture: { nom: string, vitesse: string, notes: string }
  inspiration: boolean
  materielPersonnalise: {
    armePrincipale: string | null
    armeSecondaire: string | null
    protection: string | null
    paquetage: string | null
    accessoires: string | null
    notes: string
  }
  descriptionDetaillee: {
    bio: string
    physique: string
    personnalite: string
    objectifs: string
    relations: string
    defauts: string
  }
}

const DEF_COMPETENCES: CompetenceDef[] = [
  { id:'athletisme', nom:'Athlétisme', carac:'force' },
  { id:'acrobaties', nom:'Acrobaties', carac:'dexterite' },
  { id:'discretion', nom:'Discrétion', carac:'dexterite' },
  { id:'escamotage', nom:'Escamotage', carac:'dexterite' },
  { id:'dressage', nom:'Dressage', carac:'sagesse' },
  { id:'intimidation', nom:'Intimidation', carac:'charisme' },
  { id:'persuasion', nom:'Persuasion', carac:'charisme' },
  { id:'representation', nom:'Représentation', carac:'charisme' },
  { id:'histoire', nom:'Histoire', carac:'intelligence' },
  { id:'arcanes', nom:'Arcanes', carac:'intelligence' },
  { id:'investigation', nom:'Investigation', carac:'intelligence' },
  { id:'nature', nom:'Nature', carac:'intelligence' },
  { id:'religion', nom:'Religion', carac:'intelligence' },
  { id:'medecine', nom:'Médecine', carac:'sagesse' },
  { id:'perception', nom:'Perception', carac:'sagesse' },
  { id:'perspicacite', nom:'Perspicacité', carac:'sagesse' },
  { id:'survie', nom:'Survie', carac:'sagesse' },
]

export const usePersonnage = defineStore('personnage', {
  state: () => ({
    perso: {
      id: 'pj_0001',
      nom: '',
      lignee: 'Humain',
      age: 18,
      alignement: 'Neutre',
      historique: '',
      classe: 'Guerrier',
      sousClasse: '',
      niveau: 1,
      dv: 10,
      pvActuels: 10,
      caracs: {
        force: 15,
        dexterite: 14,
        constitution: 13,
        intelligence: 12,
        sagesse: 10,
        charisme: 8,
      } as Caracs,
      competences: {} as Record<string, boolean>,
      langues: 'Commun',
      equipement: '',
      armure: { type: 'aucune' },
      bouclier: false,
      monture: { nom:'', vitesse:'', notes:'' },
      inspiration: false,
      materielPersonnalise: {
        armePrincipale: null,
        armeSecondaire: null,
        protection: null,
        paquetage: null,
        accessoires: null,
        notes: ''
      },
      descriptionDetaillee: {
        bio: '',
        physique: '',
        personnalite: '',
        objectifs: '',
        relations: '',
        defauts: ''
      }
    } as Personnage,
  }),
  getters: {
    listeCompetences: () => DEF_COMPETENCES,
  },
  actions: {
    /**
     * Construit la clé de stockage locale pour une partie donnée.
     * Si aucun id n'est fourni, on tente d'utiliser la partie courante ;
     * en dernier recours, on retombe sur la clé historique globale.
     */
    _storageKey(partieId?: string | null) {
      const id =
        partieId ??
        // Préférence: store des parties s'il est initialisé
        (() => {
          try {
            const parties = useParties()
            return parties.currentPartyId
          } catch {
            return null
          }
        })() ??
        // Fallback: session légère
        (() => {
          try {
            const { idCourant } = useSession()
            return idCourant.value
          } catch {
            return null
          }
        })()

      return id ? `JDR_PERSO_${id}` : 'JDR_PERSO'
    },

    chargerDepuisLocal(partieId?: string){
      if(!process.client) return
      const key = this._storageKey(partieId)
      const brut = localStorage.getItem(key) ?? (!partieId ? localStorage.getItem('JDR_PERSO') : null)
      if(brut){ this.perso = JSON.parse(brut) as Personnage }
    },

    sauvegarderLocal(partieId?: string){
      if(!process.client) return
      const key = this._storageKey(partieId)
      localStorage.setItem(key, JSON.stringify(this.perso))
    },

    reinitialiser(partieId?: string){
      if(!process.client) return
      const key = this._storageKey(partieId)
      localStorage.removeItem(key)
      // on ne supprime pas l'ancienne clé globale à moins d'être hors partie
      if(!partieId) localStorage.removeItem('JDR_PERSO')
      location.reload()
    }
  }
})
