import { defineStore } from 'pinia'

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
    } as Personnage,
  }),
  getters: {
    listeCompetences: () => DEF_COMPETENCES,
  },
  actions: {
    chargerDepuisLocal(){
      if(process.client){
        const brut = localStorage.getItem('JDR_PERSO')
        if(brut){ this.perso = JSON.parse(brut) as Personnage }
      }
    },
    sauvegarderLocal(){
      if(process.client){
        localStorage.setItem('JDR_PERSO', JSON.stringify(this.perso))
      }
    },
    reinitialiser(){
      if(process.client){
        localStorage.removeItem('JDR_PERSO')
        location.reload()
      }
    }
  }
})
