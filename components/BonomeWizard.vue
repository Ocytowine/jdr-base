<template>
  <div class="p-4 max-w-4xl mx-auto">
    <h2 class="text-2xl font-semibold mb-4">Création de personnage — Wizard (light)</h2>

    <!-- Sélections -->
    <section class="mb-6 border rounded p-4 bg-white/80">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Classe</label>
          <select v-model="selectedClass" class="w-full border rounded p-2">
            <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Race</label>
          <select v-model="selectedRace" class="w-full border rounded p-2">
            <option v-for="r in races" :key="r" :value="r">{{ r }}</option>
          </select>
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
            <div class="font-medium">{{ choice.raw?.payload?.source_label ?? choice.type ?? choice.featureId ?? choice.ui_id }}</div>
            <div class="text-sm text-gray-600">Choisir {{ choice.choose }} / catégorie: {{ choice.type ?? choice.raw?.type ?? '—' }}</div>
          </div>
          <div class="text-sm text-gray-500">source: {{ choice.raw?.source ?? choice.raw?.payload?.source ?? 'unknown' }}</div>
        </div>

        <!-- selector -->
        <div class="mt-2">
          <template v-if="getChoiceOptions(choice).length">
            <label class="block text-xs text-gray-600 mb-1">Options</label>

            <!-- multiple selection if choose > 1 -->
            <select
              v-if="Number(choice.choose ?? 1) <= 1"
              v-model="localChosen[getChoiceKey(choice, idx) ?? idx]"
              class="w-full border rounded p-2"
            >
              <option value="">-- choisir --</option>
              <option
                v-for="(opt, optIdx) in getChoiceOptions(choice)"
                :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>

            <div v-else>
              <label class="text-xs text-gray-500">Sélectionner {{ choice.choose }} éléments</label>
              <select
                multiple
                v-model="localChosen[getChoiceKey(choice, idx) ?? idx]"
                class="w-full border rounded p-2 h-28"
              >
                <option
                  v-for="(opt, optIdx) in getChoiceOptions(choice)"
                  :key="typeof opt.value === 'object' ? optIdx : (opt.value ?? optIdx)"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
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
import { ref, reactive, computed } from 'vue';

const classes = ref<string[]>([]);
const races = ref<string[]>([]);
const selectedClass = ref<string>('');
const selectedRace = ref<string>('');
const niveau = ref<number>(1);
const loading = ref(false);

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

type ChoiceOption = { value: any; label: string };

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
      label
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
  try {
    const c = await $fetch('/api/catalog/classes').catch(() => null);
    if (c && Array.isArray(c)) {
      classes.value = c;
    } else {
      classes.value = ['mage']; // fallback
    }
  } catch (e) {
    classes.value = ['mage'];
  }

  try {
    const r = await $fetch('/api/catalog/races').catch(() => null);
    if (r && Array.isArray(r)) {
      races.value = r;
    } else {
      races.value = ['humain','elfe']; // fallback
    }
  } catch (e) {
    races.value = ['humain','elfe'];
  }

  // sensible defaults
  if (!selectedClass.value && classes.value.length) selectedClass.value = classes.value[0];
  if (!selectedRace.value && races.value.length) selectedRace.value = races.value[0];
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
