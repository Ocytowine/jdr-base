<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-semibold mb-4">Création de personnage — Wizard (light)</h2>

    <!-- Sélections -->
    <section class="mb-6 border rounded p-4 bg-white/80">
      <div class="space-y-6">
        <div
          v-for="group in primarySelectionGroups"
          :key="group.id"
          class="border border-slate-200/70 rounded-xl p-4 bg-white"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold">{{ group.title }}</h3>
              <p class="text-sm text-gray-600">Choisir une option obligatoire.</p>
            </div>
            <span class="text-xs uppercase tracking-wide text-gray-500">1 sélection</span>
          </div>

          <div v-if="group.options.length" class="-mx-1 px-1">
            <div
              class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] lg:auto-cols-[18rem] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
            >
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="snap-center w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="{
                  'ring-2 ring-blue-500 border-blue-500 shadow-md': group.selected === option.id
                }"
                :aria-pressed="group.selected === option.id"
                @click="selectPrimaryOption(group.id, option.id)"
              >
                <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-200">
                  <img
                    :src="option.image"
                    :alt="`Illustration ${option.label}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div class="mt-3 space-y-1">
                  <div class="text-base font-medium text-slate-900">{{ option.label }}</div>
                  <div class="text-sm leading-snug text-gray-600 min-h-[3.5rem]">{{ option.description }}</div>
                </div>
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">Aucune option disponible pour l'instant.</div>

          <div class="mt-3 text-sm text-gray-600">
            Option sélectionnée :
            <span class="font-medium">{{ getPrimarySelectedLabel(group) }}</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Niveau</label>
          <input type="number" v-model.number="niveau" min="1" max="20" class="w-full border rounded p-2" />
        </div>
      </div>

      <hr class="my-3" />

      <!-- Base stats quick edit -->
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div v-for="(v,k) in baseStats" :key="k">
          <label class="block text-xs text-gray-600">{{ k }}</label>
          <input type="number" v-model.number="baseStats[k]" class="w-full border rounded p-1" />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button @click="sendPreview" :disabled="loading" class="px-3 py-2 rounded bg-blue-600 text-white">
          {{ loading ? 'Prévisualisation...' : 'Prévisualiser' }}
        </button>
        <button @click="resetChosenOptions" class="px-3 py-2 rounded border">Réinitialiser choix</button>
      </div>
    </section>

    <!-- Pending choices -->
    <section v-if="preview && preview.pendingChoices && preview.pendingChoices.length" class="mb-6 p-4 border rounded bg-white/80">
      <h3 class="font-semibold mb-2">Choix à faire</h3>
      <div
        v-for="(choice, idx) in preview.pendingChoices"
        :key="getChoiceKey(choice, idx) ?? idx"
        class="mb-3 p-3 border rounded"
      >
        <div class="flex items-center justify-between mb-1">
          <div>
            <div class="font-medium">{{ getChoiceTitle(choice) }}</div>
            <div class="text-sm text-gray-600">
              Choisir {{ choice.choose }} / catégorie: {{ getChoiceCategoryLabel(choice) }}
            </div>
          </div>
          <div class="text-sm text-gray-500">source: {{ getChoiceSourceLabel(choice) }}</div>
        </div>

        <!-- selector -->
        <div class="mt-2">
          <template v-if="getChoiceOptions(choice).length">
            <label class="block text-xs text-gray-600 mb-2 uppercase tracking-wide">Options</label>

            <div class="-mx-1 px-1">
              <div
                class="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] lg:auto-cols-[18rem] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
              >
                <button
                  v-for="(opt, optIdx) in getChoiceOptions(choice)"
                  :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
                  type="button"
                  class="snap-center w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  :class="{
                    'ring-2 ring-blue-500 border-blue-500 shadow-md': isChoiceOptionSelected(choice, opt),
                    'opacity-60 cursor-not-allowed': isChoiceOptionDisabled(choice, opt)
                  }"
                  :disabled="isChoiceOptionDisabled(choice, opt)"
                  @click="handleChoiceOptionClick(choice, opt)"
                >
                  <div class="h-32 w-full overflow-hidden rounded-lg bg-slate-200">
                    <img
                      :src="getChoiceOptionImage(opt)"
                      :alt="`Illustration ${opt.label}`"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div class="mt-3 space-y-1">
                    <div class="text-base font-medium text-slate-900">{{ opt.label }}</div>
                    <div class="text-sm leading-snug text-gray-600 min-h-[3.5rem]">
                      {{ getChoiceOptionDescription(opt) }}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              Sélection :
              {{ getLocalChoiceCount(choice) }} / {{ getChoiceRequirement(choice) }}
              <span v-if="getChoiceRequirement(choice) > 1">(sélection multiple autorisée)</span>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <button @click="applyChoice(choice)" class="px-3 py-1 rounded bg-green-600 text-white">Appliquer</button>
              <button
                @click="resetChoice(choice)"
                class="px-3 py-1 rounded border"
                :disabled="!hasLocalChoiceValue(choice)"
              >
                Réinitialiser
              </button>
            </div>
          </template>

          <template v-else>
            <div class="text-sm italic text-gray-600">Aucune option lisible pour ce choix (vérifier la donnée).</div>
          </template>
        </div>
      </div>
    </section>

    <!-- Applied choices overview -->
    <section
      v-if="appliedChoices.length"
      class="mb-6 p-4 border rounded bg-white/80"
    >
      <h3 class="font-semibold mb-2">Choix appliqués</h3>
      <ul class="space-y-2">
        <li
          v-for="choice in appliedChoices"
          :key="choice.id"
          class="flex items-start justify-between gap-4 border rounded p-3 bg-white"
        >
          <div>
            <div class="font-medium">{{ choice.label }}</div>
            <div class="text-sm text-gray-600">{{ choice.displayValue }}</div>
          </div>
          <button @click="resetChoiceById(choice.id)" class="px-3 py-1 rounded border">Réinitialiser</button>
        </li>
      </ul>
    </section>

    <!-- Preview area -->
    <section v-if="preview" class="mb-6 p-4 border rounded bg-white/80">
      <div class="flex items-start justify-between">
        <h3 class="text-lg font-semibold">Preview</h3>
        <div class="text-sm text-gray-600">applied: {{ preview.appliedFeatures?.length ?? 0 }}</div>
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Left: stats & proficiencies -->
        <div class="border rounded p-3 bg-white">
          <h4 class="font-medium mb-2">Caractéristiques</h4>
          <table class="w-full text-sm">
            <tr v-for="(val, key) in displayStats" :key="key">
              <td class="pr-3 font-medium">{{ key }}</td>
              <td>{{ val }}</td>
            </tr>
          </table>

          <hr class="my-2" />
          <h4 class="font-medium">Compétences / Proficiencies</h4>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="p in preview.previewCharacter?.proficiencies ?? []" :key="p">{{ p }}</li>
            <li v-if="!(preview.previewCharacter?.proficiencies ?? []).length" class="text-gray-500">Aucune</li>
          </ul>

          <hr class="my-2" />
          <h4 class="font-medium">Senses</h4>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="s in preview.previewCharacter?.senses ?? []" :key="JSON.stringify(s)">{{ s.sense_type ? (s.sense_type + ' ' + (s.range??'') + (s.units?(' '+s.units):'')) : JSON.stringify(s) }}</li>
            <li v-if="!(preview.previewCharacter?.senses ?? []).length" class="text-gray-500">Aucune</li>
          </ul>
        </div>

        <!-- Right: spells / equipment / features -->
        <div class="border rounded p-3 bg-white">
          <h4 class="font-medium mb-2">Magie</h4>
          <div v-if="preview.previewCharacter?.spellcasting">
            <div class="text-sm">Ability: {{ preview.previewCharacter.spellcasting.ability ?? preview.previewCharacter.spellcasting?.meta?.ability ?? '—' }}</div>
            <div class="text-sm">
              Spell save DC:
              {{
                preview.previewCharacter.spellcasting?.meta?.spell_save_dc ??
                  preview.previewCharacter.spellcasting?.spell_save_dc ??
                  '—'
              }}
            </div>
            <div class="text-sm">
              Spell attack mod:
              {{
                preview.previewCharacter.spellcasting?.meta?.spell_attack_mod ??
                  preview.previewCharacter.spellcasting?.spell_attack_mod ??
                  '—'
              }}
            </div>
            <div class="mt-2">
              <div class="font-medium">Slots</div>
              <div v-if="preview.previewCharacter.spellcasting.slots && Object.keys(preview.previewCharacter.spellcasting.slots).length">
                <div v-for="(num, lvl) in preview.previewCharacter.spellcasting.slots" :key="lvl" class="text-sm">{{ lvl }} : {{ num }}</div>
              </div>
              <div v-else class="text-sm text-gray-500">Aucun</div>
            </div>

            <div class="mt-2">
              <div class="font-medium">Sorts connus</div>
              <ul class="list-disc ml-5 text-sm">
                <li v-for="s in preview.previewCharacter.spellcasting.known ?? []" :key="s">{{ s }}</li>
                <li v-if="!(preview.previewCharacter.spellcasting.known ?? []).length" class="text-gray-500">Aucun</li>
              </ul>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">Aucune capacité de lanceur de sorts détectée</div>

          <hr class="my-2" />
          <h4 class="font-medium">Équipement</h4>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="e in preview.previewCharacter?.equipment ?? []" :key="JSON.stringify(e)">{{ e }}</li>
            <li v-if="!(preview.previewCharacter?.equipment ?? []).length" class="text-gray-500">Aucun</li>
          </ul>

          <hr class="my-2" />
          <h4 class="font-medium">Features appliqués</h4>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="f in preview.appliedFeatures ?? []" :key="f">{{ f }}</li>
            <li v-if="!(preview.appliedFeatures ?? []).length" class="text-gray-500">Aucun</li>
          </ul>
        </div>
      </div>

      <!-- Errors / unhandled effects -->
      <div v-if="preview.errors && preview.errors.length" class="mt-4 p-3 border rounded bg-red-50 text-sm text-red-700">
        <div class="font-medium">Erreurs détectées</div>
        <ul class="list-disc ml-5">
          <li v-for="(e, i) in preview.errors" :key="i">{{ e.type }} — {{ e.message }}</li>
        </ul>
      </div>
    </section>

    <!-- Raw response debug -->
    <div class="mb-6">
      <button @click="showRaw = !showRaw" class="px-3 py-1 rounded border">
        {{ showRaw ? 'Cacher Raw response (debug)' : 'Voir Raw response (debug)' }}
      </button>
      <div v-if="showRaw" class="mt-3">
        <pre class="whitespace-pre-wrap bg-slate-100 p-3 rounded text-sm overflow-auto" style="max-height:400px">{{ rawText }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

const placeholderCardImage =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczMjAnIGhlaWdodD0nMTgwJz4KICA8cmVjdCB3aWR0aD0nMzIwJyBoZWlnaHQ9JzE4MCcgZmlsbD0nIzJmMzY1ZicvPgogIDx0ZXh0IHg9JzUwJScgeT0nNTAlJyBkb21pbmFudC1iYXNlbGluZT0nbWlkZGxlJyB0ZXh0LWFuY2hvcj0nbWlkZGxlJyBmaWxsPScjZmZmZmZmJyBmb250LXNpemU9JzI4JyBmb250LWZhbWlseT0nc2Fucy1zZXJpZic+SW1hZ2U8L3RleHQ+Cjwvc3ZnPg==';

type PrimarySelectionKey = 'class' | 'race' | 'background';

type CatalogEntry = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

const classes = ref<CatalogEntry[]>([]);
const races = ref<CatalogEntry[]>([]);
const backgrounds = ref<CatalogEntry[]>([]);
const primarySelection = reactive<Record<PrimarySelectionKey, string>>({
  class: '',
  race: '',
  background: ''
});
const niveau = ref<number>(1);
const loading = ref(false);

type PrimaryOption = {
  id: string;
  label: string;
  description: string;
  image: string;
};

type PrimarySelectionGroup = {
  id: PrimarySelectionKey;
  title: string;
  options: PrimaryOption[];
  selected: string;
};

const prettifyLabel = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const normalized = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const upper = normalized.toUpperCase();
  if (normalized === lower || normalized === upper) {
    return normalized.replace(/\b(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) =>
      `${first.toUpperCase()}${rest.toLowerCase()}`
    );
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const resolveEntryDescription = (entry: CatalogEntry, typeLabel: string, label: string): string => {
  const candidates = [entry.description, (entry as any).desc, (entry as any).summary];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return `Option de ${typeLabel.toLowerCase()} : ${label}.`;
};

const resolveEntryImage = (entry: CatalogEntry): string => {
  const candidates = [entry.image, (entry as any).img, (entry as any).icon];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return placeholderCardImage;
};

const buildPrimaryOptions = (values: CatalogEntry[], typeLabel: string): PrimaryOption[] => {
  return values.map((entry) => {
    const labelSource = typeof entry.name === 'string' && entry.name.trim().length ? entry.name : entry.id;
    const label = prettifyLabel(labelSource);
    return {
      id: entry.id,
      label,
      description: resolveEntryDescription(entry, typeLabel, label),
      image: resolveEntryImage(entry)
    };
  });
};

const pickFirstString = (values: unknown[]): string | null => {
  for (const candidate of values) {
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return null;
};

const toIdString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (value === null || value === undefined) {
    return null;
  }
  const stringified = String(value).trim();
  return stringified.length ? stringified : null;
};

const normalizeCatalogEntries = (payload: unknown): CatalogEntry[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries = new Map<string, CatalogEntry>();

  for (const item of payload) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, any>;
      const id =
        toIdString(record.id) ??
        toIdString(record.slug) ??
        toIdString(record.uid) ??
        toIdString(record.key) ??
        toIdString(record.value) ??
        toIdString(record.name);
      if (!id) {
        continue;
      }

      const name = pickFirstString([record.name, record.label, record.title, record.text, id]) ?? id;
      const description = pickFirstString([
        record.description,
        record.desc,
        record.summary,
        record.flavor,
        record.flavor_text,
        record.text
      ]);
      const image = pickFirstString([
        record.image,
        record.img,
        record.icon,
        record.art,
        record.avatar,
        record.illustration,
        record.picture,
        record.thumbnail
      ]);

      entries.set(id, {
        id,
        name,
        description: description ?? undefined,
        image: image ?? undefined
      });
      continue;
    }

    if (typeof item === 'string' || typeof item === 'number') {
      const id = toIdString(item);
      if (!id) {
        continue;
      }
      entries.set(id, {
        id,
        name: id
      });
    }
  }

  return Array.from(entries.values());
};

const fallbackCatalogEntries = (ids: string[]): CatalogEntry[] =>
  ids.map((id) => ({
    id,
    name: id
  }));

const primarySelectionGroups = computed<PrimarySelectionGroup[]>(() => [
  {
    id: 'class',
    title: 'Classe',
    options: buildPrimaryOptions(classes.value, 'Classe'),
    selected: primarySelection.class
  },
  {
    id: 'race',
    title: 'Race',
    options: buildPrimaryOptions(races.value, 'Race'),
    selected: primarySelection.race
  },
  {
    id: 'background',
    title: 'Background',
    options: buildPrimaryOptions(backgrounds.value, 'Background'),
    selected: primarySelection.background
  }
]);

const selectPrimaryOption = (groupId: PrimarySelectionGroup['id'], optionId: string) => {
  if (!optionId) return;
  primarySelection[groupId] = optionId;
};

const getPrimarySelectedLabel = (group: PrimarySelectionGroup): string => {
  const found = group.options.find((option) => option.id === group.selected);
  if (found) {
    return found.label;
  }
  return '—';
};

const baseStats = reactive({
  strength: 8,
  dexterity: 14,
  constitution: 12,
  intelligence: 16,
  wisdom: 10,
  charisma: 11
});

// preview response container
const preview = ref<any | null>(null);
const rawText = ref<string>('');
const showRaw = ref(false);

// chosenOptions: map ui_id -> value (string or array)
const chosenOptions = reactive<Record<string, any>>({});
// localChosen used for UI selection before applying
const localChosen = reactive<Record<string, any>>({});
// cache options & metadata for displaying applied choices later
const choiceOptionCache = reactive<Record<string, ChoiceOption[]>>({});
const choiceMetadata = reactive<Record<string, { label: string }>>({});

type ChoiceOption = { value: any; label: string; description?: string; image?: string };

const extractChoiceFrom = (choice: any): any[] => {
  if (Array.isArray(choice?.from) && choice.from.length) {
    return choice.from;
  }
  if (Array.isArray(choice?.payload?.from) && choice.payload.from.length) {
    return choice.payload.from;
  }
  if (choice?.from && typeof choice.from === 'object') {
    return Object.keys(choice.from);
  }
  if (choice?.payload?.from && typeof choice.payload.from === 'object') {
    return Object.keys(choice.payload.from);
  }
  return [];
};

const extractChoiceLabels = (choice: any): Record<string, string> => {
  const out: Record<string, string> = {};
  const source = choice?.from_labels ?? choice?.payload?.from_labels ?? null;
  if (!source) return out;

  if (Array.isArray(source)) {
    source.forEach((entry: any, idx: number) => {
      if (entry && typeof entry === 'object') {
        const id = entry.id ?? entry.value ?? entry.key ?? entry.uid ?? null;
        const label = entry.label ?? entry.name ?? entry.title ?? entry.text ?? entry.value ?? entry.id ?? null;
        if (id !== null && id !== undefined) {
          out[String(id)] = String(label ?? id);
        } else if (entry.label) {
          out[String(idx)] = String(entry.label);
        }
      } else if (entry !== null && entry !== undefined) {
        out[String(idx)] = String(entry);
      }
    });
  } else if (typeof source === 'object') {
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined) {
        out[String(key)] = String(value as any);
      }
    }
  }

  return out;
};

const extractDescriptionFromValue = (value: any, fallbackLabel: string): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidates = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
  for (const key of candidates) {
    const candidate = (value as Record<string, any>)[key];
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }
  const entries = (value as Record<string, any>).entries;
  if (Array.isArray(entries)) {
    const firstText = entries.find((entry: any) => typeof entry === 'string');
    if (typeof firstText === 'string' && firstText.trim().length) {
      return firstText.trim();
    }
  }
  const name = (value as Record<string, any>).name;
  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed.length && trimmed.toLowerCase() !== fallbackLabel.toLowerCase()) {
      return trimmed;
    }
  }
  return null;
};

const extractImageFromValue = (value: any): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const keys = ['image', 'img', 'icon'];
  for (const key of keys) {
    const candidate = (value as Record<string, any>)[key];
    if (typeof candidate === 'string' && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return null;
};

const getChoiceOptions = (choice: any): ChoiceOption[] => {
  const from = extractChoiceFrom(choice);
  if (!from.length) return [];

  const labels = extractChoiceLabels(choice);

  return from.map((value: any, idx: number) => {
    const key = typeof value === 'string' || typeof value === 'number' ? String(value) : String(idx);
    let label = labels[key] ?? labels[String(idx)] ?? null;
    if (!label && value && typeof value === 'object') {
      label = value.label ?? value.name ?? value.title ?? null;
    }
    if (!label) {
      label = typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);
    }
    if (label) {
      label = prettifyLabel(label);
    }
    const description = extractDescriptionFromValue(value, label);
    const image = extractImageFromValue(value);
    return {
      value,
      label,
      description: description ?? undefined,
      image: image ?? undefined
    };
  });
};

const getChoiceKey = (choice: any, fallback?: string | number | null): string | null => {
  const candidates = [choice?.ui_id, choice?.featureId, choice?.id, fallback];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return String(candidate);
    }
  }
  const rawKey = choice?.ui_id ?? choice?.featureId ?? choice?.id ?? fallback;
  if (rawKey === undefined || rawKey === null) return null;
  return String(rawKey);
};

const registerChoiceMetadata = (choice: any, key: string | null) => {
  if (!key) return;
  const rawLabel =
    choice?.raw?.payload?.source_label ??
    choice?.raw?.payload?.label ??
    choice?.raw?.payload?.title ??
    choice?.raw?.payload?.name ??
    choice?.type ??
    choice?.featureId ??
    choice?.ui_id ??
    key;
  choiceMetadata[key] = { label: prettifyLabel(String(rawLabel)) };
};

const getChoiceTitle = (choice: any): string => {
  const fallbackKey = getChoiceKey(choice);
  const label =
    pickFirstString([
      choice?.raw?.payload?.source_label,
      choice?.raw?.payload?.label,
      choice?.raw?.payload?.title,
      choice?.raw?.payload?.name,
      choice?.label,
      choice?.type,
      choice?.featureId,
      choice?.ui_id,
      fallbackKey ?? undefined
    ]) ?? 'Choix';
  return prettifyLabel(label);
};

const getChoiceCategoryLabel = (choice: any): string => {
  const label =
    pickFirstString([
      choice?.type,
      choice?.raw?.type,
      choice?.raw?.payload?.type
    ]) ?? null;
  if (!label) {
    return '—';
  }
  return prettifyLabel(label);
};

const getChoiceSourceLabel = (choice: any): string => {
  const label =
    pickFirstString([
      choice?.raw?.source,
      choice?.raw?.payload?.source,
      choice?.source
    ]) ?? null;
  if (!label) {
    return 'Inconnue';
  }
  return prettifyLabel(label);
};

const cacheChoiceOptions = (key: string | null, options: ChoiceOption[]) => {
  if (!key) return;
  choiceOptionCache[key] = options;
};

const valueExists = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
};

const hasLocalChoiceValue = (choice: any): boolean => {
  const key = getChoiceKey(choice);
  if (!key) return false;
  return valueExists(localChosen[key]);
};

const isSameChoiceValue = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  }
  return false;
};

const formatChoiceValue = (key: string, value: any): string => {
  const options = choiceOptionCache[key] ?? [];
  const toLabel = (val: any): string => {
    for (const opt of options) {
      if (isSameChoiceValue(opt.value, val)) {
        return opt.label;
      }
    }
    if (typeof val === 'string') {
      return prettifyLabel(val);
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    if (val === null || val === undefined) {
      return '—';
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  if (Array.isArray(value)) {
    if (!value.length) return '—';
    return value.map((entry) => toLabel(entry)).join(', ');
  }

  return toLabel(value);
};

const getChoiceRequirement = (choice: any): number => {
  const choose = Number(choice?.choose ?? 1);
  if (!Number.isFinite(choose) || choose <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(choose));
};

const choiceAllowsMultiple = (choice: any): boolean => getChoiceRequirement(choice) > 1;

const getLocalChoiceCount = (choice: any): number => {
  const key = getChoiceKey(choice);
  if (!key) return 0;
  const current = localChosen[key];
  if (Array.isArray(current)) {
    return current.length;
  }
  return valueExists(current) ? 1 : 0;
};

const isChoiceOptionSelected = (choice: any, option: ChoiceOption): boolean => {
  const key = getChoiceKey(choice);
  if (!key) return false;
  const current = localChosen[key];
  if (Array.isArray(current)) {
    return current.some((entry) => isSameChoiceValue(entry, option.value));
  }
  return isSameChoiceValue(current, option.value);
};

const isChoiceOptionDisabled = (choice: any, option: ChoiceOption): boolean => {
  if (!choiceAllowsMultiple(choice)) {
    return false;
  }
  const key = getChoiceKey(choice);
  if (!key) return false;
  const current = Array.isArray(localChosen[key]) ? localChosen[key] : [];
  if (current.some((entry) => isSameChoiceValue(entry, option.value))) {
    return false;
  }
  const requirement = getChoiceRequirement(choice);
  return Number.isFinite(requirement) && requirement > 0 && current.length >= requirement;
};

const handleChoiceOptionClick = (choice: any, option: ChoiceOption) => {
  if (isChoiceOptionDisabled(choice, option)) {
    return;
  }
  const key = getChoiceKey(choice);
  if (!key) return;

  if (!choiceAllowsMultiple(choice)) {
    const current = localChosen[key];
    if (isSameChoiceValue(current, option.value)) {
      localChosen[key] = null;
    } else {
      localChosen[key] = option.value;
    }
    return;
  }

  const existing = Array.isArray(localChosen[key]) ? [...localChosen[key]] : [];
  const index = existing.findIndex((entry) => isSameChoiceValue(entry, option.value));
  if (index >= 0) {
    existing.splice(index, 1);
  } else {
    const requirement = getChoiceRequirement(choice);
    if (!Number.isFinite(requirement) || requirement <= 0 || existing.length < requirement) {
      existing.push(option.value);
    }
  }
  localChosen[key] = existing;
};

const getChoiceOptionDescription = (option: ChoiceOption): string => {
  if (typeof option.description === 'string' && option.description.trim().length) {
    return option.description.trim();
  }
  if (typeof option.value === 'string' && option.value.trim().length) {
    return prettifyLabel(option.value);
  }
  if (typeof option.value === 'number' || typeof option.value === 'boolean') {
    return String(option.value);
  }
  return `Option disponible : ${option.label}`;
};

const getChoiceOptionImage = (option: ChoiceOption): string => {
  if (typeof option.image === 'string' && option.image.trim().length) {
    return option.image;
  }
  return placeholderCardImage;
};

const appliedChoices = computed(() => {
  return Object.entries(chosenOptions)
    .map(([id, value]) => {
      const label = choiceMetadata[id]?.label ?? id;
      const displayValue = formatChoiceValue(id, value);
      return { id, label, displayValue };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
});

const loadCatalog = async () => {
  const ensureSelection = (values: CatalogEntry[], key: PrimarySelectionKey, fallbacks: string[]) => {
    const list = values.length ? values : fallbackCatalogEntries(fallbacks);
    if (key === 'class') classes.value = list;
    if (key === 'race') races.value = list;
    if (key === 'background') backgrounds.value = list;
    if (!list.length) {
      primarySelection[key] = '';
      return;
    }
    const current = primarySelection[key];
    if (!current || !list.some((entry) => entry.id === current)) {
      primarySelection[key] = list[0].id;
    }
  };

  try {
    const c = await $fetch('/api/catalog/classes').catch(() => null);
    ensureSelection(normalizeCatalogEntries(c), 'class', ['mage']);
  } catch (e) {
    ensureSelection([], 'class', ['mage']);
  }

  try {
    const r = await $fetch('/api/catalog/races').catch(() => null);
    ensureSelection(normalizeCatalogEntries(r), 'race', ['humain', 'elfe']);
  } catch (e) {
    ensureSelection([], 'race', ['humain', 'elfe']);
  }

  try {
    const b = await $fetch('/api/catalog/backgrounds').catch(() => null);
    ensureSelection(normalizeCatalogEntries(b), 'background', ['acolyte', 'artisan']);
  } catch (e) {
    ensureSelection([], 'background', ['acolyte', 'artisan']);
  }
};

// helper to create body and call preview endpoint
const sendPreview = async () => {
  loading.value = true;
  preview.value = null;
  rawText.value = '';
  try {
    const body = {
      selection: {
        class: primarySelection.class || null,
        race: primarySelection.race || null,
        background: primarySelection.background || null,
        niveau: Number(niveau.value || 1),
        manual_features: [],
        chosenOptions: { ...chosenOptions }
      },
      baseCharacter: {
        base_stats_before_race: { ...baseStats }
      }
    };

    const res = await $fetch('/api/creation/preview', {
      method: 'POST',
      body
    });

    preview.value = res;
    rawText.value = JSON.stringify(res, null, 2);
    // prepopulate localChosen for pending choices from server
    if (res?.pendingChoices && Array.isArray(res.pendingChoices)) {
      for (const [idx, pc] of (res.pendingChoices as any[]).entries()) {
        const key = getChoiceKey(pc, idx);
        registerChoiceMetadata(pc, key);
        const options = getChoiceOptions(pc);
        cacheChoiceOptions(key, options);
        if (!key) continue;
        if (key in chosenOptions) {
          const existing = chosenOptions[key];
          localChosen[key] = Array.isArray(existing) ? [...existing] : existing;
          continue;
        }
        if (!(key in localChosen)) {
          if (options.length === 1) {
            localChosen[key] = options[0].value;
          } else if (Number(pc.choose ?? 1) > 1) {
            localChosen[key] = [];
          } else if (options.length) {
            localChosen[key] = '';
          } else {
            localChosen[key] = null;
          }
        }
      }
    }
  } catch (err: any) {
    preview.value = {
      ok: false,
      errors: [{ type: 'network', message: String(err?.message ?? err) }]
    };
    rawText.value = String(err?.message ?? err);
  } finally {
    loading.value = false;
  }
};

const applyChoice = async (choice: any) => {
  // store chosen value(s) into chosenOptions and re-send preview
  const key = getChoiceKey(choice);
  if (!key) {
    // fallback: ignore
    alert('Choice has no ui_id/featureId — cannot apply from UI');
    return;
  }
  registerChoiceMetadata(choice, key);
  cacheChoiceOptions(key, getChoiceOptions(choice));

  const val = localChosen[key];
  if (!valueExists(val)) {
    alert('Aucune valeur sélectionnée');
    return;
  }
  // if choice.choose > 1 ensure array
  if (Number(choice.choose ?? 1) > 1) {
    chosenOptions[key] = Array.isArray(val) ? [...val] : [val];
  } else {
    chosenOptions[key] = Array.isArray(val) ? [...val] : val;
  }
  // re-request preview (server expects chosenOptions in selection)
  await sendPreview();
};

const resetChosenOptions = async () => {
  for (const k of Object.keys(chosenOptions)) {
    delete chosenOptions[k];
  }
  for (const k of Object.keys(localChosen)) {
    delete localChosen[k];
  }
  for (const k of Object.keys(choiceOptionCache)) {
    delete choiceOptionCache[k];
  }
  for (const k of Object.keys(choiceMetadata)) {
    delete choiceMetadata[k];
  }
  // optional: refresh preview without choices
  await sendPreview();
};

const resetChoiceById = async (id: string | number) => {
  if (id === null || id === undefined) return;
  const key = String(id);
  if (key in chosenOptions) {
    delete chosenOptions[key];
  }
  if (key in localChosen) {
    delete localChosen[key];
  }
  await sendPreview();
};

const resetChoice = async (choice: any) => {
  const key = getChoiceKey(choice);
  if (!key) return;
  await resetChoiceById(key);
};

const displayStats = computed(() => {
  // merge base_stats_before_race and final_stats if available
  const out: Record<string, any> = {};
  // base
  for (const k of Object.keys(baseStats)) out[k] = baseStats[k];
  // apply preview final_stats (if present and specific)
  try {
    const fs = preview.value?.previewCharacter?.final_stats ?? {};
    if (fs && typeof fs === 'object') {
      for (const kk of Object.keys(fs)) {
        out[kk] = fs[kk];
      }
    }
  } catch (e) { /* ignore */ }
  return out;
});

// initial load
loadCatalog();

</script>

<style scoped>
/* minimal */
</style>
