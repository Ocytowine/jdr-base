// Mapping classe â†’ template UI
function getUiTemplateForClasse(classe: string): string | null {
  switch (classe?.toLowerCase()) {
    case 'mage':
      return 'mage.vue'
    case 'guerrier':
      return 'guerrier.vue'
    // Ajoute d'autres classes ici
    default:
      return null
  }
}
import { defineStore } from 'pinia'
import { useSession } from '@/composables/useSession'
import { useParties } from '@/stores/parties'
import { useDataStore } from '@/stores/data'
import { bonusDeMaitrise } from '@/utils/regles_du_jeu'
import { evalFormuleAdditive } from '@/utils/evalFormule'
import { mod, pvMaxAuNiveau } from '@/utils/regles_du_jeu'

const DEF_COMPETENCES: CompetenceDef[] = [
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

type Personnage = {
  id: string
  nom: string
  lignee: string
  age: number
  alignement: string
  historique: string
  classe: string
  sousClasse: string
  niveau: number
  xp?: number
  dv: number
  pvActuels: number
  caracs: Caracs
  competences: Record<string, boolean>
  langues: string
  armure?: { type: 'aucune' | 'legere' | 'intermediaire' | 'lourde'; nom?: string }
  bouclier?: boolean
  monture: { nom: string; vitesse: string; notes: string }
  inspiration: boolean
  inventaire: PersonnageInventoryEntry[]
  classeId?: string | null
  raceId?: string | null
  backgroundId?: string | null
  featureIds?: string[]
  spellIds?: string[]
  materielPersonnalise: {
    armePrincipale: string | null
    armePrincipaleId: string | null
    armeSecondaire: string | null
    armeSecondaireId: string | null
    protection: string | null
    protectionId: string | null
    bouclier: string | null
    bouclierId: string | null
    paquetage: string | null
    paquetageId: string | null
    accessoires: string | null
    accessoiresIds: string[]
    keptIds: string[]
    equippedIds: string[]
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
  ui_template?: string | null
}

const createDefaultPerso = (): Personnage => ({
  id: 'pj_0001',
  nom: '',
  lignee: 'Humain',
  age: 18,
  alignement: 'Neutre',
  historique: '',
  classe: 'Guerrier',
  sousClasse: '',
  niveau: 1,
  xp: 0,
  dv: 10,
  pvActuels: 10,
  caracs: {
    force: 15,
    dexterite: 14,
    constitution: 13,
    intelligence: 12,
    sagesse: 10,
    charisme: 8
  } as Caracs,
  competences: {} as Record<string, boolean>,
  langues: 'Commun',
  armure: { type: 'aucune' },
  bouclier: false,
  monture: { nom: '', vitesse: '', notes: '' },
  inspiration: false,
  inventaire: [],
  materielPersonnalise: {
    armePrincipale: null,
    armePrincipaleId: null,
    armeSecondaire: null,
    armeSecondaireId: null,
    protection: null,
    protectionId: null,
    bouclier: null,
    bouclierId: null,
    paquetage: null,
    paquetageId: null,
    accessoires: null,
    accessoiresIds: [],
    keptIds: [],
    equippedIds: [],
    notes: ''
  },
  descriptionDetaillee: {
    bio: '',
    physique: '',
    personnalite: '',
    objectifs: '',
    relations: '',
    defauts: ''
  },
  ui_template: null
})

export type Caracs = {
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
}

export type CompetenceDef = { id: string; nom: string; carac: keyof Caracs }

type InventaireSnapshotItem = CreationInventoryTransition['items'][number]

export type PersonnageInventoryEntry = {
  id: string
  quantity: number
  coins?: { gold: number; silver: number; copper: number } | null
}


// Version asynchrone pour garantir le chargement du catalogue avant la normalisation
const sanitizePersonnage = async (raw: unknown): Promise<Personnage> => {
  const base = createDefaultPerso()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const source = raw as Record<string, any>
  const { equipement: _discardedEquipement, ...restSource } = source

  const dataStore = useDataStore()
  // On attend le chargement du catalogue si nÃ©cessaire (maps.classes doit Ãªtre non vide)
  if (!Object.keys(dataStore.maps.classes).length) {
    await dataStore.load()
  }

  const caracs = {
    ...base.caracs,
    ...(typeof source.caracs === 'object' && source.caracs ? source.caracs : {})
  } as Caracs

  const competences =
    source.competences && typeof source.competences === 'object'
      ? (source.competences as Record<string, boolean>)
      : {}

  const slugify = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')

  const makeUniqueSlug = (base: string, usage: Map<string, number>) => {
    const existing = usage.get(base) ?? 0
    usage.set(base, existing + 1)
    return existing === 0 ? base : `${base}-${existing}`
  }

  const parseValueLabelToCoins = (label: unknown): { gold: number; silver: number; copper: number } | null => {
    if (typeof label !== 'string') return null
    const gold = Number(label.match(/(\d+)\s*po/i)?.[1] ?? 0)
    const silver = Number(label.match(/(\d+)\s*pa/i)?.[1] ?? 0)
    const copper = Number(label.match(/(\d+)\s*pc/i)?.[1] ?? 0)
    if (!gold && !silver && !copper) return null
    return { gold, silver, copper }
  }

  const normalizeInventoryBase = (entry: any, fallbackName: string) => {
    const ensureValue = (value: any) =>
      value && typeof value === 'object'
        ? {
            gold: Number(value.gold) || 0,
            silver: Number(value.silver) || 0,
            copper: Number(value.copper) || 0
          }
        : null

    if (entry && typeof entry === 'object' && 'name' in entry) {
      const item = entry as Record<string, any>
      const quantity = Number.isFinite(item.quantity) ? Number(item.quantity) : 1
      const weight = Number.isFinite(item.weight) ? Number(item.weight) : null
      return {
        idCandidate: typeof item.id === 'string' ? item.id : null,
        originId: item.originId ? String(item.originId) : (typeof item.id === 'string' ? item.id : null),
        name: String(item.name ?? fallbackName),
        description: item.description ?? null,
        type: item.type ?? null,
        quantity,
        weight,
        value: ensureValue(item.value),
        equipped: Boolean(item.equipped ?? item.equiped),
        allow_stack: Boolean(item.allow_stack ?? item.allowStack),
        harmonisable: Boolean(item.harmonisable ?? item.harmonizable),
        properties_fight: item.properties_fight ?? item.propertiesFight ?? null,
        properties_equip: item.properties_equip ?? item.propertiesEquip ?? null
      }
    }

    const legacy = entry ?? {}
    const quantity = Number.isFinite(legacy.quantity) ? Number(legacy.quantity) : 1
    const weightTotal = Number.isFinite(legacy.weightTotal) ? Number(legacy.weightTotal) : null
    const weight = weightTotal !== null ? weightTotal / (quantity || 1) : null
    return {
      idCandidate: typeof legacy.id === 'string' ? legacy.id : null,
      originId: legacy.originId ? String(legacy.originId) : (typeof legacy.id === 'string' ? legacy.id : null),
      name: String(legacy.title ?? legacy.name ?? fallbackName),
      description: legacy.description ?? null,
      type: legacy.typeLabel ?? legacy.type ?? null,
      quantity,
      weight,
      value: parseValueLabelToCoins(legacy.valueLabel),
      equipped: Boolean(legacy.equipped ?? legacy.equiped),
      allow_stack: Boolean(legacy.allow_stack ?? legacy.allowStack ?? false),
      harmonisable: Boolean(legacy.harmonisable ?? legacy.harmonizable ?? false),
      properties_fight: legacy.properties_fight ?? legacy.propertiesFight ?? null,
      properties_equip: legacy.properties_equip ?? legacy.propertiesEquip ?? null
    }
  }

  const slugUsage = new Map<string, number>()
  const rawInventaire = Array.isArray(source.inventaire) ? source.inventaire : []
  const inventaire: PersonnageInventoryEntry[] = rawInventaire.map((entry: any, index: number) => {
    // support nouveau format deja minimal
    if (entry && typeof entry === 'object' && 'id' in entry && 'quantity' in entry && !('name' in entry)) {
      const e = entry as any
      return {
        id: String(e.id),
        quantity: Number(e.quantity) || 1,
        coins: e.coins ? { gold: Number(e.coins.gold) || 0, silver: Number(e.coins.silver) || 0, copper: Number(e.coins.copper) || 0 } : null
      }
    }
    // fallback: ancien format riche -> convertir en minimal
    const fallbackName = `Objet ${index + 1}`
    const normalized = normalizeInventoryBase(entry, fallbackName)
    const baseId = normalized.idCandidate ?? normalized.originId ?? normalized.name ?? `item-${index}`
    let slugBase = baseId ? slugify(String(baseId)) : ''
    if (!slugBase && normalized.name) slugBase = slugify(normalized.name)
    if (!slugBase) slugBase = `item-${index}`
    const id = makeUniqueSlug(slugBase, slugUsage)
    // detect purse value -> store as coins
    const coins = normalized.value ?? null
    return {
      id,
      quantity: Number(normalized.quantity) || 1,
      coins
    }
  })

  const slugByOrigin = new Map<string, string>()
  const adaptId = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value).trim()
    if (!str.length) return null
    return str
  }

  const adaptIdArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return []
    const results: string[] = []
    for (const entry of value) {
      const mapped = adaptId(entry)
      if (mapped) {
        results.push(mapped)
      }
    }
    return results
  }

  const materielSource =
    source.materielPersonnalise && typeof source.materielPersonnalise === 'object'
      ? (source.materielPersonnalise as Record<string, any>)
      : {}

  const toNullableString = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    const str = String(value)
    return str.trim().length ? str : null
  }

  // RÃ©solution robuste d'identifiants Ã  partir d'ID ou de labels
  const findByIdOrName = (map: Record<string, any>, key?: string | null): { id: string | null; entity: any | null } => {
    const k = (key ?? '').toString().trim()
    if (!k) return { id: null, entity: null }
    const low = k.toLowerCase()
    if (map[low]) return { id: low, entity: map[low] }
    const byId = Object.keys(map).find((id) => id.toLowerCase() === low)
    if (byId) return { id: byId, entity: map[byId] }
    const byName = Object.entries(map).find(([_, v]) => {
      const name = String((v as any)?.name ?? (v as any)?.nom ?? (v as any)?.label ?? '').toLowerCase()
      const slug = String((v as any)?.slug ?? '').toLowerCase()
      return name === low || slug === low
    })
    if (byName) return { id: byName[0] as string, entity: byName[1] }
    return { id: null, entity: null }
  }

  const displayLabel = (entity: any, fallback: string): string => {
    if (!entity || typeof entity !== 'object') return fallback
    return String(entity.name ?? entity.nom ?? entity.label ?? fallback)
  }

  const numberFromKeys = (obj: any, keys: string[], fallback = 0): number => {
    for (const k of keys) {
      let cur: any = obj
      for (const part of k.split('.')) {
        if (cur && typeof cur === 'object' && part in cur) cur = cur[part]
        else { cur = undefined; break }
      }
      const n = Number(cur)
      if (Number.isFinite(n) && n > 0) return n
    }
    return fallback
  }

  // RÃ©soudre classe/race/background IDs depuis la source
  const srcClasseId = typeof (source as any).classeId === 'string' ? (source as any).classeId : null
  const srcRaceId = typeof (source as any).raceId === 'string' ? (source as any).raceId : null
  const srcBackgroundId = typeof (source as any).backgroundId === 'string' ? (source as any).backgroundId : null

  const resolvedClasse = findByIdOrName(dataStore.maps.classes, srcClasseId ?? ((source as any).classe as any))
  const resolvedRace = findByIdOrName(dataStore.maps.races, srcRaceId ?? ((source as any).lignee as any))
  const resolvedBackground = findByIdOrName(dataStore.maps.backgrounds, srcBackgroundId ?? ((source as any).historique as any))

  // UI template depuis la classe
  const uiTemplate: string | null = (resolvedClasse.entity?.ui_template ?? null) || null

  // DÃ©terminer le DV depuis la classe
  const derivedDv = numberFromKeys(resolvedClasse.entity, ['dv', 'hit_die', 'hitdie', 'hitDie', 'hit_dice', 'dice.hit_die']) || (base as any).dv

  // Calcul PV max et pvActuels bornÃ©s
  const niveau = Number.isFinite((source as any).niveau) ? Number((source as any).niveau) : (base as any).niveau
  const modCon = mod(Number((caracs as any).constitution || (base as any).caracs.constitution))
  const pvMax = pvMaxAuNiveau(derivedDv, niveau, modCon)
  const pvActuels = (() => {
    const rawPv = Number((source as any).pvActuels)
    if (!Number.isFinite(rawPv) || rawPv <= 0) return pvMax
    return Math.min(rawPv, pvMax)
  })()

  return {
    ...base,
    // ne pas propager tel-quel la source pour Ã©viter doublons non normalisÃ©s
    id: String((source as any).id ?? (base as any).id),
    nom: String((source as any).nom ?? (base as any).nom),
    niveau,
    // XP
    xp: Number.isFinite((source as any).xp) ? Number((source as any).xp) : 0,
    // RÃ¨gles
    dv: derivedDv,
    pvActuels,
    caracs,
    competences,
    inventaire,
    // IDs normalisÃ©s (source de vÃ©ritÃ©)
    classeId: resolvedClasse.id ?? (base as any).classeId ?? null,
    raceId: resolvedRace.id ?? (base as any).raceId ?? null,
    backgroundId: resolvedBackground.id ?? (base as any).backgroundId ?? null,
    // Labels d'affichage (dÃ©rivÃ©s des IDs)
    classe: displayLabel(resolvedClasse.entity, (base as any).classe),
    lignee: displayLabel(resolvedRace.entity, (base as any).lignee),
    historique: displayLabel(resolvedBackground.entity, (base as any).historique),
    featureIds: Array.isArray(source.featureIds) ? source.featureIds.map((x: any) => String(x)) : (base.featureIds ?? []),
    spellIds: Array.isArray(source.spellIds) ? source.spellIds.map((x: any) => String(x)) : (base.spellIds ?? []),
    materielPersonnalise: {
      ...base.materielPersonnalise,
      ...materielSource,
      armePrincipale: toNullableString(materielSource.armePrincipale ?? base.materielPersonnalise.armePrincipale),
      armePrincipaleId: adaptId(materielSource.armePrincipaleId),
      armeSecondaire: toNullableString(materielSource.armeSecondaire ?? base.materielPersonnalise.armeSecondaire),
      armeSecondaireId: adaptId(materielSource.armeSecondaireId),
      protection: toNullableString(materielSource.protection ?? base.materielPersonnalise.protection),
      protectionId: adaptId(materielSource.protectionId),
      bouclier: toNullableString(materielSource.bouclier ?? base.materielPersonnalise.bouclier),
      bouclierId: adaptId(materielSource.bouclierId),
      paquetage: toNullableString(materielSource.paquetage ?? base.materielPersonnalise.paquetage),
      paquetageId: adaptId(materielSource.paquetageId),
      accessoires: toNullableString(materielSource.accessoires ?? base.materielPersonnalise.accessoires),
      accessoiresIds: adaptIdArray(materielSource.accessoiresIds),
      keptIds: adaptIdArray(materielSource.keptIds),
      equippedIds: adaptIdArray(materielSource.equippedIds),
      notes: typeof materielSource.notes === 'string' ? materielSource.notes : base.materielPersonnalise.notes
    },
    // Injection du template UI depuis le catalogue
    ui_template: uiTemplate
  }
}


export const usePersonnage = defineStore('personnage', {
  state: () => ({
    perso: createDefaultPerso(),
    loading: false
  }),
  getters: {
    listeCompetences: () => DEF_COMPETENCES,
    ui_template: (state) => {
      // On suppose que le champ est stockÃ© dans perso ou Ã  dÃ©faut dans la classe
      return state.perso?.ui_template || null
    }
  },
  actions: {
    _storageKey(partieId?: string | null) {
      const id =
        partieId ??
        (() => {
          try {
            const parties = useParties()
            return parties.currentPartyId
          } catch {
            return null
          }
        })() ??
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

    async chargerDepuisLocal(partieId?: string) {
      if (!process.client) return
      this.loading = true
      const key = this._storageKey(partieId)
      const brut = localStorage.getItem(key)
      // Log de debug pour la clÃ© et le contenu
      console.info('[Perso] Tentative de chargement', { key, brut })

      let loaded = false
      if (brut) {
        try {
          const parsed = JSON.parse(brut)
          this.perso = await sanitizePersonnage(parsed)
          loaded = true
        } catch (error) {
          console.warn('Chargement de personnage invalide', error)
        }
      }

      // Fallback : tente de restaurer la derniÃ¨re sauvegarde gÃ©nÃ©rique si rien n'a Ã©tÃ© chargÃ©
      if (!loaded && !partieId) {
        const fallbackRaw = localStorage.getItem('JDR_PERSO')
        console.info('[Perso] Fallback sur JDR_PERSO', { fallbackRaw })
        if (fallbackRaw) {
          try {
            const parsed = JSON.parse(fallbackRaw)
            this.perso = await sanitizePersonnage(parsed)
            loaded = true
          } catch (error) {
            console.warn('Chargement fallback invalide', error)
          }
        }
      }

      // Si aucune sauvegarde trouvÃ©e, conserve le personnage courant (Ã©vite la rÃ©initialisation accidentelle)
      if (!loaded) {
        console.warn('[Perso] Aucune sauvegarde trouvÃ©e, conservation du perso courant')
        // Ne pas Ã©craser le perso courant par dÃ©faut
      }
      this.loading = false
    },

    sauvegarderLocal(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      try {
        const existingRaw = localStorage.getItem(key)
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw) as any
            const prevInv = Array.isArray(existing?.inventaire) ? existing.inventaire : []
            const curInv = Array.isArray((this as any).perso?.inventaire) ? (this as any).perso.inventaire : []
            if (prevInv.length > 0 && curInv.length === 0) {
              ;(this as any).perso.inventaire = prevInv
            }
          } catch {}
        }
      } catch {}
      // Sauvegarde minimale: évite les doublons (labels) et blobs lourds
      const toPersist = (() => {
        const p: any = (this as any).perso || {}
        const minimalInventory = Array.isArray(p.inventaire)
          ? p.inventaire.map((it: any) => ({ id: String(it.id), quantity: Number(it.quantity)||1, coins: it.coins ?? null }))
          : []
        return {
          id: String(p.id ?? ''),
          nom: String(p.nom ?? ''),
          niveau: Number(p.niveau) || 1,
          xp: Number(p.xp) || 0,
          dv: Number(p.dv) || 0,
          pvActuels: Number(p.pvActuels) || 0,
          caracs: p.caracs || {},
          competences: p.competences || {},
          armure: p.armure || { type: 'aucune' },
          bouclier: Boolean(p.bouclier || false),
          monture: p.monture || { nom:'', vitesse:'', notes:'' },
          inspiration: Boolean(p.inspiration || false),
          inventaire: minimalInventory,
          classeId: p.classeId ?? null,
          raceId: p.raceId ?? null,
          backgroundId: p.backgroundId ?? null,
          featureIds: Array.isArray(p.featureIds) ? p.featureIds.map(String) : [],
          spellIds: Array.isArray(p.spellIds) ? p.spellIds.map(String) : [],
          materielPersonnalise: p.materielPersonnalise || {},
          descriptionDetaillee: p.descriptionDetaillee || {},
          ui_template: p.ui_template ?? null
        }
      })()
      localStorage.setItem(key, JSON.stringify(toPersist))
    },

    reinitialiser(partieId?: string) {
      if (!process.client) return
      const key = this._storageKey(partieId)
      localStorage.removeItem(key)
      if (!partieId) {
        localStorage.removeItem('JDR_PERSO')
      }
      this.perso = createDefaultPerso()
      location.reload()
    }
    ,
    /**
     * Ajoute un montant d'expÃ©rience au personnage courant.
     * - N'accepte que des montants positifs.
     * - Sauvegarde locale Ã  la charge de l'appelant (connaÃ®t la partie courante).
     */
    ajouterXp(montant: number) {
      const val = Number(montant) || 0
      if (val <= 0) return
      const current = Number((this.perso as any).xp) || 0
      ;(this.perso as any).xp = current + val
    }
  }
})


