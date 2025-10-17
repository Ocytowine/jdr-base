<template>
  <section class="mage-ui">
    <header class="mage-ui__header">
      <div class="mage-ui__heading">
        <h2>{{ classeHeading }}</h2>
        <p v-if="subtitle" class="mage-ui__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="subclassName" class="mage-ui__tag">
        <span>Specialisation</span>
        <strong>{{ subclassName }}</strong>
      </div>
    </header>

    <section v-if="spellcastingCards.length" class="mage-ui__stats">
      <article v-for="card in spellcastingCards" :key="card.label" class="mage-ui__stat-card">
        <span class="mage-ui__stat-label">{{ card.label }}</span>
        <strong class="mage-ui__stat-value">{{ card.value }}</strong>
      </article>
    </section>

    <p v-if="spellcastingNotes" class="mage-ui__spec-note">
      {{ spellcastingNotes }}
    </p>

    <section v-if="spells.length" class="mage-ui__spells">
      <h3>Grimoire</h3>
      <div class="mage-ui__spell-grid">
        <article v-for="spell in spells" :key="spell.id" class="mage-ui__spell-card">
          <div v-if="spell.image" class="mage-ui__spell-thumb">
            <img :src="spell.image" :alt="spell.name" loading="lazy" />
          </div>
          <div class="mage-ui__spell-body">
            <header class="mage-ui__spell-header">
              <span class="mage-ui__pill">{{ spell.levelLabel }}</span>
              <h4>{{ spell.name }}</h4>
              <p v-if="spell.school" class="mage-ui__spell-school">{{ spell.school }}</p>
            </header>
            <p v-if="spell.description" class="mage-ui__spell-description">
              {{ spell.description }}
            </p>
            <p v-if="spell.effectLabel" class="mage-ui__spell-effect">
              {{ spell.effectLabel }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <section v-if="traits.length" class="mage-ui__traits">
      <h3>Traits et fonctionnalites</h3>
      <ul>
        <li v-for="trait in traits" :key="trait.id" class="mage-ui__trait">
          <strong>{{ trait.title }}</strong>
          <p v-if="trait.description" class="mage-ui__trait-text">{{ trait.description }}</p>
          <footer v-if="trait.usage || trait.cooldown" class="mage-ui__trait-meta">
            <span v-if="trait.usage">Usage: {{ trait.usage }}</span>
            <span v-if="trait.cooldown">Recharge: {{ trait.cooldown }}</span>
          </footer>
        </li>
      </ul>
    </section>

    <p v-if="!spells.length && !traits.length" class="mage-ui__empty">
      Aucune donnee de classe disponible pour ce personnage.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePersonnage } from '@/stores/personnage'
import { useDataStore } from '@/stores/data'

type ClasseModule = {
  id?: string | number
  title?: string
  name?: string
  description?: string
  usage?: string
  cooldown?: string
  image?: string
  type?: string
  category?: string
  [key: string]: unknown
}

type SpellRecord = {
  id: string
  name: string
  level: number | null
  levelLabel: string
  school: string | null
  description: string
  effectLabel: string | null
  image: string | null
}

const props = defineProps<{ classeLabel?: string; modules?: ClasseModule[] | null }>()

const personnage = usePersonnage()
const dataStore = useDataStore()

const classeHeading = computed(() => {
  if (props.classeLabel && props.classeLabel.trim().length) return props.classeLabel
  return 'Mage'
})

const rawModules = computed<ClasseModule[]>(() => (Array.isArray(props.modules) ? props.modules : []))

const rawSpellIds = computed(() => {
  const ids = (personnage.perso as any)?.spellIds
  if (!Array.isArray(ids)) return [] as string[]
  return ids.map((entry: any) => String(entry))
})

const moduleMap = computed(() => {
  const map = new Map<string, ClasseModule>()
  for (const module of rawModules.value) {
    if (!module) continue
    if (module.id !== undefined && module.id !== null) {
      map.set(String(module.id), module)
    } else if (module.title) {
      map.set(String(module.title), module)
    }
  }
  return map
})

const looksLikeSpell = (module: ClasseModule): boolean => {
  const byType = String(module?.type || module?.category || '').toLowerCase()
  if (byType.includes('spell') || byType.includes('sort')) return true
  const title = String(module?.title || '').toLowerCase()
  return title.startsWith('sort ') || title.includes('sort niv') || title.includes('sort -')
}

const baseSpells = computed<SpellRecord[]>(() => {
  const collected: SpellRecord[] = []
  const seen = new Set<string>()
  const ids = rawSpellIds.value
  const rawSpells = dataStore.maps.spells || {}
  const fallbackModules = rawModules.value.filter((mod) => looksLikeSpell(mod))

  const collectFrom = (id: string, module?: ClasseModule | null) => {
    const key = id || (module && module.title ? String(module.title) : '')
    if (!key || seen.has(key)) return
    seen.add(key)

    const sourceModule = module ?? moduleMap.value.get(id) ?? null
    const raw = rawSpells[id] || null

    const resolveName = () => {
      if (raw && (raw.name || raw.nom || raw.label)) return raw.name || raw.nom || raw.label
      if (sourceModule && (sourceModule.title || sourceModule.name)) return sourceModule.title || sourceModule.name
      return id
    }

    const resolveLevel = (): number | null => {
      if (raw && typeof raw.level === 'number') return raw.level
      const levelFromModule = sourceModule && (sourceModule as any).level
      if (typeof levelFromModule === 'number') return levelFromModule
      const niveau = sourceModule && (sourceModule as any).niveau
      if (typeof niveau === 'number') return niveau
      const numeric = Number(levelFromModule)
      if (Number.isFinite(numeric)) return numeric
      return null
    }

    const resolveSchool = () => {
      if (raw && (raw.school || raw.ecole || raw.tradition)) return raw.school || raw.ecole || raw.tradition
      if (sourceModule && ((sourceModule as any).school || (sourceModule as any).ecole)) {
        return (sourceModule as any).school || (sourceModule as any).ecole
      }
      return null
    }

    const resolveDescription = () => {
      if (raw && (raw.description || raw.desc || raw.summary || raw.flavor)) {
        return raw.description || raw.desc || raw.summary || raw.flavor || ''
      }
      if (sourceModule && (sourceModule.description || (sourceModule as any).summary || (sourceModule as any).flavor)) {
        return sourceModule.description || (sourceModule as any).summary || (sourceModule as any).flavor || ''
      }
      return ''
    }

    const resolveEffect = () => {
      if (
        raw &&
        (raw.effect_label !== undefined ||
          raw.effectLabel !== undefined ||
          raw.effect !== undefined)
      ) {
        return raw.effect_label ?? raw.effectLabel ?? raw.effect ?? null
      }
      if (
        sourceModule &&
        ((sourceModule as any).effect_label !== undefined ||
          (sourceModule as any).effectLabel !== undefined ||
          sourceModule.usage !== undefined ||
          sourceModule.cooldown !== undefined)
      ) {
        return (
          (sourceModule as any).effect_label ??
          (sourceModule as any).effectLabel ??
          sourceModule.usage ??
          sourceModule.cooldown ??
          null
        )
      }
      return null
    }

    const resolveImage = () => {
      if (raw && (raw.image || raw.icon || raw.illustration || raw.art)) {
        return raw.image || raw.icon || raw.illustration || raw.art || null
      }
      if (sourceModule && (sourceModule.image || (sourceModule as any).icon || (sourceModule as any).art)) {
        return sourceModule.image || (sourceModule as any).icon || (sourceModule as any).art || null
      }
      return null
    }

    const level = resolveLevel()
    const levelLabel = (() => {
      if (level === null || Number.isNaN(level)) return 'Niv. ?'
      if (level <= 0) return 'Niv. 0'
      return `Niv. ${level}`
    })()

    collected.push({
      id: key,
      name: String(resolveName()),
      level,
      levelLabel,
      school: (() => {
        const school = resolveSchool()
        return school ? String(school) : null
      })(),
      description: String(resolveDescription()),
      effectLabel: (() => {
        const effect = resolveEffect()
        return effect !== null ? String(effect) : null
      })(),
      image: (() => {
        const image = resolveImage()
        return image ? String(image) : null
      })()
    })
  }

  for (const id of ids) {
    collectFrom(id, moduleMap.value.get(id) ?? null)
  }

  fallbackModules.forEach((module, index) => {
    const key = module.id !== undefined && module.id !== null ? String(module.id) : `spell-${index}`
    collectFrom(key, module)
  })

  return collected
})

const spells = computed<SpellRecord[]>(() => {
  const items = baseSpells.value.slice()
  items.sort((a, b) => {
    const levelA = a.level ?? Number.POSITIVE_INFINITY
    const levelB = b.level ?? Number.POSITIVE_INFINITY
    if (levelA !== levelB) return levelA - levelB
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' })
  })
  return items
})

const spellIdSet = computed(() => new Set(spells.value.map((spell) => spell.id)))

const traits = computed(() =>
  rawModules.value
    .filter((module) => {
      const id = module && module.id !== undefined && module.id !== null ? String(module.id) : ''
      if (id && spellIdSet.value.has(id)) return false
      if (looksLikeSpell(module)) return false
      return true
    })
    .map((module, index) => {
      const id = module && module.id !== undefined && module.id !== null ? String(module.id) : `trait-${index}`
      const title = module?.title || module?.name || `Trait ${index + 1}`
      const description = module?.description || ''
      const usage =
        module?.usage ??
        (module as any)?.effect_label ??
        (module as any)?.effectLabel ??
        null
      const cooldown = module?.cooldown ?? null
      return {
        id,
        title: String(title),
        description: String(description),
        usage: usage ? String(usage) : null,
        cooldown: cooldown ? String(cooldown) : null
      }
    })
)

const subtitle = computed(() => {
  if (spells.value.length || traits.value.length) return 'Pouvoirs et sorts disponibles'
  return ''
})

const subclassName = computed(() => {
  const raw = (personnage.perso as any)?.sousClasse
  if (!raw) return ''
  const text = String(raw).trim()
  return text
})

const spellcastingSpec = computed(() => {
  const spec = (personnage.spellcastingSpec as any) || (personnage.perso as any)?.spellcastingSpec
  return spec || null
})

const abilityLabels: Record<string, string> = {
  intelligence: 'Intelligence',
  sagesse: 'Sagesse',
  wisdom: 'Sagesse',
  charisme: 'Charisme',
  charisma: 'Charisme',
  force: 'Force',
  strength: 'Force',
  constitution: 'Constitution',
  dexterite: 'Dexterite',
  dexterity: 'Dexterite'
}

const formattedAbility = computed(() => {
  const ability = spellcastingSpec.value?.ability
  if (!ability) return ''
  const key = String(ability).toLowerCase()
  return abilityLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)
})

const formatSigned = (value: unknown): string | null => {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const rounded = Math.round(num)
  return rounded >= 0 ? `+${rounded}` : `${rounded}`
}

const spellSlotSummary = computed(() => {
  const slots = spellcastingSpec.value?.slots
  if (!slots || typeof slots !== 'object') return ''
  const entries = Object.entries(slots as Record<string, unknown>).filter(([_, val]) => val !== undefined && val !== '')
  if (!entries.length) return ''
  return entries
    .map(([level, val]) => {
      const label = Number.isFinite(Number(level)) ? `Niv. ${level}` : String(level)
      if (val === null) return `${label}: illimite`
      if (val === undefined || val === '') return `${label}: 0`
      return `${label}: ${val}`
    })
    .join(' | ')
})

const spellcastingCards = computed(() => {
  const cards: Array<{ label: string; value: string }> = []
  if (formattedAbility.value) {
    cards.push({ label: 'Caracteristique', value: formattedAbility.value })
  }
  const dc =
    spellcastingSpec.value?.spellSaveDc ??
    spellcastingSpec.value?.spell_save_dc ??
    null
  const attack =
    spellcastingSpec.value?.spellAttackMod ??
    spellcastingSpec.value?.spell_attack_mod ??
    null
  const formattedDc = Number.isFinite(Number(dc)) ? String(Math.round(Number(dc))) : ''
  const formattedAttack = formatSigned(attack)
  if (formattedDc) cards.push({ label: 'DD de sauvegarde', value: formattedDc })
  if (formattedAttack) cards.push({ label: 'Bonus d attaque', value: formattedAttack })
  const slotsSummary = spellSlotSummary.value
  if (slotsSummary) cards.push({ label: 'Emplacements', value: slotsSummary })
  if (spells.value.length) cards.push({ label: 'Sorts écrits', value: String(spells.value.length) })
  return cards
})

const spellcastingNotes = computed(() => {
  const note = spellcastingSpec.value?.description || spellcastingSpec.value?.notes || null
  return note ? String(note) : ''
})
</script>

<style scoped>
.mage-ui {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 18px;
  background: rgba(8, 12, 30, 0.75);
  border: 1px solid var(--bord);
  border-radius: 16px;
  color: var(--texte);
}

.mage-ui__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.mage-ui__heading h2 {
  margin: 0;
  font-size: 20px;
}

.mage-ui__subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--texte-2);
}

.mage-ui__tag {
  margin-left: auto;
  padding: 10px 14px;
  background: rgba(30, 40, 90, 0.65);
  border: 1px solid rgba(120, 160, 255, 0.35);
  border-radius: 12px;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mage-ui__tag span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texte-2);
}

.mage-ui__tag strong {
  font-size: 15px;
}

.mage-ui__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.mage-ui__stat-card {
  background: rgba(12, 18, 45, 0.65);
  border: 1px solid rgba(110, 150, 255, 0.25);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 100px;
}

.mage-ui__stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texte-2);
}

.mage-ui__stat-value {
  font-size: 22px;
  font-weight: 600;
}

.mage-ui__spec-note {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
  background: rgba(0, 0, 0, 0.25);
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(110, 150, 255, 0.2);
  white-space: pre-wrap;
}

.mage-ui__spells h3,
.mage-ui__traits h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.mage-ui__spell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.mage-ui__spell-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: rgba(16, 22, 50, 0.9);
  border: 1px solid rgba(120, 160, 255, 0.25);
  overflow: hidden;
  min-height: 240px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.mage-ui__spell-card:hover {
  transform: translateY(-2px);
  border-color: rgba(150, 190, 255, 0.55);
}

.mage-ui__spell-thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mage-ui__spell-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mage-ui__spell-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  flex: 1;
}

.mage-ui__spell-header h4 {
  margin: 4px 0 0;
  font-size: 16px;
}

.mage-ui__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(120, 160, 255, 0.12);
  border-radius: 999px;
  color: rgba(200, 220, 255, 0.95);
}

.mage-ui__spell-school {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.mage-ui__spell-description {
  margin: 0;
  color: var(--texte);
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
  flex: 1;
}

.mage-ui__spell-effect {
  margin: 0;
  font-size: 12px;
  color: var(--accent-2);
  white-space: pre-wrap;
}

.mage-ui__traits ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.mage-ui__trait {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(120, 160, 255, 0.2);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mage-ui__trait-text {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
  white-space: pre-wrap;
}

.mage-ui__trait-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--accent-2);
  flex-wrap: wrap;
}

.mage-ui__empty {
  margin: 0;
  font-size: 14px;
  color: var(--texte-2);
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px dashed rgba(110, 150, 255, 0.25);
}

@media (max-width: 640px) {
  .mage-ui {
    padding: 14px;
  }

  .mage-ui__spell-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
