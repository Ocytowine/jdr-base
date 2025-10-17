export type CompetenceCarac =
  | 'force'
  | 'dexterite'
  | 'constitution'
  | 'intelligence'
  | 'sagesse'
  | 'charisme'

export type CompetenceDef = {
  id: string
  nom: string
  carac: CompetenceCarac
}

export const COMPETENCE_DEFS: CompetenceDef[] = [
  { id: 'athletisme', nom: 'Athletisme', carac: 'force' },
  { id: 'acrobaties', nom: 'Acrobaties', carac: 'dexterite' },
  { id: 'discretion', nom: 'Discretion', carac: 'dexterite' },
  { id: 'escamotage', nom: 'Escamotage', carac: 'dexterite' },
  { id: 'dressage', nom: 'Dressage', carac: 'sagesse' },
  { id: 'intimidation', nom: 'Intimidation', carac: 'charisme' },
  { id: 'persuasion', nom: 'Persuasion', carac: 'charisme' },
  { id: 'representation', nom: 'Representation', carac: 'charisme' },
  { id: 'histoire', nom: 'Histoire', carac: 'intelligence' },
  { id: 'arcanes', nom: 'Arcanes', carac: 'intelligence' },
  { id: 'investigation', nom: 'Investigation', carac: 'intelligence' },
  { id: 'nature', nom: 'Nature', carac: 'intelligence' },
  { id: 'religion', nom: 'Religion', carac: 'intelligence' },
  { id: 'medecine', nom: 'Medecine', carac: 'sagesse' },
  { id: 'perception', nom: 'Perception', carac: 'sagesse' },
  { id: 'perspicacite', nom: 'Perspicacite', carac: 'sagesse' },
  { id: 'survie', nom: 'Survie', carac: 'sagesse' }
]

export const COMPETENCE_INDEX: Record<string, CompetenceDef> = COMPETENCE_DEFS.reduce(
  (acc, def) => {
    acc[def.id] = def
    return acc
  },
  {} as Record<string, CompetenceDef>
)
