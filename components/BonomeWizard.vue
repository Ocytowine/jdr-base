<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-semibold mb-4">Création de personnage — Wizard (light)</h2>

    <!-- Sélections -->
    <section class="mb-6 border rounded p-4 bg-white/80">
      <div class="space-y-6">
        <div
          v-for="group in primarySelectionGroups"
          :key="group.id"
          class="border border-slate-200/70 rounded-xl p-4 bg-white shadow-sm"
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
              Choisir {{ getChoiceRequirement(choice) }} / catégorie: {{ getChoiceCategoryLabel(choice) }}
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
            <div class="text-sm">Spell save DC: {{ preview.previewCharacter.spellcasting?.meta?.spell_save_dc ?? preview.previewCharacter.spellcasting?.meta?.spell_save_dc ?? '—' }}</div>
            <div class="text-sm">Spell attack mod: {{ preview.previewCharacter.spellcasting?.meta?.spell_attack_mod ?? '—' }}</div>
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
import { computed, reactive, ref } from 'vue';

type CatalogEntry = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

type PrimaryCardOption = {
  id: string;
  label: string;
  description: string;
  image: string;
};

type PrimarySelectionGroup = {
  id: 'class' | 'race' | 'background';
  title: string;
  options: PrimaryCardOption[];
  selected: string;
};

type ChoiceOption = {
  value: any;
  label: string;
  description?: string | null;
  image?: string | null;
};

const classes = ref<CatalogEntry[]>([]);
const races = ref<CatalogEntry[]>([]);
const backgrounds = ref<CatalogEntry[]>([]);
const selectedClass = ref<string>('');
const selectedRace = ref<string>('');
const selectedBackground = ref<string>('');
const niveau = ref<number>(1);
const loading = ref(false);

const TEXT_FIELDS = ['description', 'desc', 'summary', 'flavor', 'flavor_text', 'text'];
const IMAGE_FIELDS = ['image', 'img', 'icon', 'art', 'avatar', 'illustration', 'picture', 'thumbnail'];
const DEFAULT_CARD_DESCRIPTION = 'Aucune description disponible.';

const pickFirstString = (values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
  }
  return null;
};

const normalizeId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const stringValue = String(value).trim();
  if (!stringValue.length) {
    return null;
  }
  const withoutJson = stringValue.replace(/\.json$/i, '');
  const segments = withoutJson.split('/');
  const candidate = segments[segments.length - 1]?.trim();
  return candidate && candidate.length ? candidate : null;
};

const humanizeLabel = (value: string): string => {
  const safe = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!safe.length) {
    return value;
  }
  return safe.replace(/\b(\p{L})(\p{L}*)/gu, (_, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`);
};

const escapeForSvg = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const createCardPlaceholder = (label: string): string => {
  const base = label && label.trim().length ? label.trim() : 'Option';
  const truncated = base.length <= 32 ? base : `${base.slice(0, 29)}…`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">\n  <defs>\n    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#e2e8f0"/>\n      <stop offset="100%" stop-color="#cbd5f5"/>\n    </linearGradient>\n  </defs>\n  <rect width="320" height="180" fill="url(#grad)" rx="16"/>\n  <text x="160" y="98" text-anchor="middle" font-family="'Inter', 'Segoe UI', sans-serif" font-size="20" fill="#475569">${escapeForSvg(truncated)}</text>\n</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const ensureCardImage = (image: string | null | undefined, label: string): string => {
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return createCardPlaceholder(label);
};

const ensureDescription = (description: string | null | undefined, fallbackLabel: string, categoryLabel: string): string => {
  if (typeof description === 'string') {
    const trimmed = description.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return `Sélectionnez ce ${categoryLabel.toLowerCase()} pour ${fallbackLabel}.`;
};

const normalizeCatalogEntries = (payload: unknown): CatalogEntry[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  const entries = new Map<string, CatalogEntry>();

  payload.forEach((item, idx) => {
    if (item && typeof item === 'object') {
      const record = item as Record<string, any>;
      const id =
        normalizeId(record.id) ??
        normalizeId(record.slug) ??
        normalizeId(record.uid) ??
        normalizeId(record.key) ??
        normalizeId(record.value) ??
        normalizeId(record.name) ??
        `entry_${idx}`;
      if (!id) {
        return;
      }

      const name = pickFirstString([record.label, record.name, record.title, record.text]) ?? humanizeLabel(id);
      const description = pickFirstString(TEXT_FIELDS.map((key) => record[key]));
      const image = pickFirstString(IMAGE_FIELDS.map((key) => record[key]));

      entries.set(id, {
        id,
        name,
        description: description ?? null,
        image: image ?? null
      });
      return;
    }

    const id = normalizeId(item);
    if (!id) {
      return;
    }
    if (!entries.has(id)) {
      entries.set(id, {
        id,
        name: humanizeLabel(id),
        description: null,
        image: null
      });
    }
  });

  return Array.from(entries.values());
};

const fallbackCatalogEntries = (ids: string[]): CatalogEntry[] =>
  ids.map((id) => ({
    id,
    name: humanizeLabel(id),
    description: null,
    image: null
  }));

const buildPrimaryOptions = (entries: CatalogEntry[], categoryLabel: string): PrimaryCardOption[] =>
  entries.map((entry) => {
    const label = entry.name?.trim().length ? entry.name.trim() : humanizeLabel(entry.id);
    return {
      id: entry.id,
      label,
      description: ensureDescription(entry.description ?? null, label, categoryLabel),
      image: ensureCardImage(entry.image ?? null, label)
    };
  });

const primarySelectionGroups = computed<PrimarySelectionGroup[]>(() => [
  {
    id: 'class',
    title: 'Classe',
    options: buildPrimaryOptions(classes.value, 'Classe'),
    selected: selectedClass.value
  },
  {
    id: 'race',
    title: 'Race',
    options: buildPrimaryOptions(races.value, 'Race'),
    selected: selectedRace.value
  },
  {
    id: 'background',
    title: 'Background',
    options: buildPrimaryOptions(backgrounds.value, 'Background'),
    selected: selectedBackground.value
  }
]);

const selectPrimaryOption = (groupId: PrimarySelectionGroup['id'], optionId: string) => {
  if (!optionId) {
    return;
  }
  if (groupId === 'class') {
    selectedClass.value = optionId;
    return;
  }
  if (groupId === 'race') {
    selectedRace.value = optionId;
    return;
  }
  if (groupId === 'background') {
    selectedBackground.value = optionId;
  }
};

const getPrimarySelectedLabel = (group: PrimarySelectionGroup): string => {
  const found = group.options.find((option) => option.id === group.selected);
  return found?.label ?? '—';
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

  const record = value as Record<string, any>;
  const description = pickFirstString(TEXT_FIELDS.map((key) => record[key]));
  if (description) {
    return description;
  }

  if (Array.isArray(record.entries)) {
    const text = record.entries.find((entry: any) => typeof entry === 'string' && entry.trim().length);
    if (typeof text === 'string') {
      return text.trim();
    }
  }

  if (typeof record.name === 'string') {
    const trimmed = record.name.trim();
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
  const record = value as Record<string, any>;
  return pickFirstString(IMAGE_FIELDS.map((key) => record[key]));
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
    return {
      value,
      label,
      description: extractDescriptionFromValue(value, label),
      image: extractImageFromValue(value)
    };
  });
};

const getChoiceRequirement = (choice: any): number => {
  const raw = Number(
    choice?.choose ??
      choice?.payload?.choose ??
      choice?.raw?.choose ??
      choice?.raw?.payload?.choose ??
      1
  );
  if (!Number.isFinite(raw) || raw <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(raw));
};

const getChoiceTitle = (choice: any): string =>
  pickFirstString([
    choice?.raw?.payload?.source_label,
    choice?.raw?.payload?.label,
    choice?.raw?.payload?.title,
    choice?.label,
    choice?.title,
    choice?.name,
    choice?.type,
    choice?.featureId,
    choice?.ui_id
  ]) ?? 'Choix';

const getChoiceCategoryLabel = (choice: any): string =>
  pickFirstString([
    choice?.type,
    choice?.raw?.type,
    choice?.raw?.payload?.type,
    choice?.category
  ]) ?? '—';

const getChoiceSourceLabel = (choice: any): string =>
  pickFirstString([
    choice?.raw?.source,
    choice?.raw?.payload?.source,
    choice?.source,
    choice?.featureId
  ]) ?? 'inconnue';

const getChoiceOptionDescription = (option: ChoiceOption): string => {
  const description = typeof option.description === 'string' ? option.description.trim() : '';
  return description.length ? description : DEFAULT_CARD_DESCRIPTION;
};

const getChoiceOptionImage = (option: ChoiceOption): string => ensureCardImage(option.image ?? null, option.label);

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
  const label =
    choice?.raw?.payload?.source_label ??
    choice?.raw?.payload?.label ??
    choice?.raw?.payload?.title ??
    choice?.raw?.payload?.name ??
    choice?.type ??
    choice?.featureId ??
    choice?.ui_id ??
    key;
  choiceMetadata[key] = { label: String(label) };
};

const cacheChoiceOptions = (key: string | null, options: ChoiceOption[]) => {
  if (!key) return;
  choiceOptionCache[key] = options;
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

const getLocalChoiceCount = (choice: any): number => {
  const key = getChoiceKey(choice);
  if (!key) return 0;
  const current = localChosen[key];
  if (Array.isArray(current)) {
    return current.length;
  }
  return current === null || current === undefined || current === '' ? 0 : 1;
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

const handleChoiceOptionClick = (choice: any, option: ChoiceOption) => {
  const key = getChoiceKey(choice);
  if (!key) return;

  const requirement = getChoiceRequirement(choice);
  if (requirement > 1) {
    const current = Array.isArray(localChosen[key]) ? (localChosen[key] as any[]) : [];
    const index = current.findIndex((entry) => isSameChoiceValue(entry, option.value));
    if (index >= 0) {
      localChosen[key] = [...current.slice(0, index), ...current.slice(index + 1)];
      return;
    }
    if (current.length >= requirement) {
      return;
    }
    localChosen[key] = [...current, option.value];
    return;
  }

  if (isSameChoiceValue(localChosen[key], option.value)) {
    localChosen[key] = null;
  } else {
    localChosen[key] = option.value;
  }
};

const isChoiceOptionDisabled = (choice: any, option: ChoiceOption): boolean => {
  const requirement = getChoiceRequirement(choice);
  if (requirement <= 1) {
    return false;
  }
  if (isChoiceOptionSelected(choice, option)) {
    return false;
  }
  return getLocalChoiceCount(choice) >= requirement;
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

const formatChoiceValue = (key: string, value: any): string => {
  const options = choiceOptionCache[key] ?? [];
  const toLabel = (val: any): string => {
    for (const opt of options) {
      if (isSameChoiceValue(opt.value, val)) {
        return opt.label;
      }
    }
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
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
  const assignCatalog = (
    target: { value: CatalogEntry[] },
    payload: unknown,
    fallbackIds: string[]
  ) => {
    const normalized = normalizeCatalogEntries(payload);
    target.value = normalized.length ? normalized : fallbackCatalogEntries(fallbackIds);
  };

  try {
    const response = await $fetch('/api/catalog/classes').catch(() => null);
    assignCatalog(classes, response, ['mage']);
  } catch (error) {
    classes.value = fallbackCatalogEntries(['mage']);
  }

  try {
    const response = await $fetch('/api/catalog/races').catch(() => null);
    assignCatalog(races, response, ['humain', 'elfe']);
  } catch (error) {
    races.value = fallbackCatalogEntries(['humain', 'elfe']);
  }

  try {
    const response = await $fetch('/api/catalog/backgrounds').catch(() => null);
    assignCatalog(backgrounds, response, ['acolyte']);
  } catch (error) {
    backgrounds.value = fallbackCatalogEntries(['acolyte']);
  }

  if (!selectedClass.value && classes.value.length) selectedClass.value = classes.value[0].id;
  if (!selectedRace.value && races.value.length) selectedRace.value = races.value[0].id;
  if (!selectedBackground.value && backgrounds.value.length) selectedBackground.value = backgrounds.value[0].id;
};

// helper to create body and call preview endpoint
const sendPreview = async () => {
  loading.value = true;
  preview.value = null;
  rawText.value = '';
  try {
    const body = {
      selection: {
        class: selectedClass.value || null,
        race: selectedRace.value || null,
        background: selectedBackground.value || null,
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
          const requirement = getChoiceRequirement(pc);
          if (requirement > 1) {
            localChosen[key] = [];
          } else if (options.length === 1) {
            localChosen[key] = options[0].value;
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
