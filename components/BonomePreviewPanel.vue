<template>
  <section class="border rounded p-4 bg-white/80 space-y-4">
    <div class="flex items-start justify-between">
      <h3 class="text-lg font-semibold">Prévisualisation</h3>
      <div class="text-sm text-gray-600">appliqués : {{ preview?.appliedFeatures?.length ?? 0 }}</div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" v-if="preview">
      <div class="flex flex-col gap-4 sm:flex-row">
        <div class="sm:w-40">
          <div class="aspect-[4/5] w-full overflow-hidden rounded-lg bg-slate-200">
            <img :src="previewPortrait" :alt="`Portrait ${displayCharacterName}`" class="h-full w-full object-cover" />
          </div>
        </div>
        <div class="flex-1 space-y-4">
          <div class="space-y-2">
            <div class="text-xs uppercase tracking-wide text-gray-500">Nom du personnage</div>
            <div class="text-xl font-semibold text-slate-900">{{ displayCharacterName }}</div>
            <div v-if="hasNameParts" class="space-y-1 text-sm text-slate-600">
              <p v-if="trimmedFirstName"><span class="font-medium text-slate-700">Prénom :</span> {{ trimmedFirstName }}</p>
              <p v-if="trimmedLastName"><span class="font-medium text-slate-700">Nom :</span> {{ trimmedLastName }}</p>
              <p v-if="trimmedNickname"><span class="font-medium text-slate-700">Surnom :</span> {{ trimmedNickname }}</p>
            </div>
            <p v-else-if="trimmedFullName" class="text-sm text-slate-600">Nom complet : {{ trimmedFullName }}</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <article
              v-for="summary in identitySummary"
              :key="summary.id"
              class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div class="mb-2 h-20 overflow-hidden rounded-md bg-slate-200">
                <img
                  :src="summary.image"
                  :alt="`Illustration ${summary.name}`"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="space-y-2">
                <div>
                  <div class="text-xs uppercase tracking-wide text-gray-500">{{ summary.title }}</div>
                  <div class="text-sm font-medium text-slate-900">{{ summary.name }}</div>
                </div>
                <p class="text-xs leading-snug text-gray-600 line-clamp-6">{{ summary.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
            <li v-for="p in preview?.previewCharacter?.proficiencies ?? []" :key="p">{{ p }}</li>
            <li v-if="!(preview?.previewCharacter?.proficiencies ?? []).length" class="text-gray-500">Aucune</li>
          </ul>

          <hr class="my-2" />
          <h4 class="font-medium">Senses</h4>
          <ul class="list-disc ml-5 text-sm">
            <li
              v-for="s in preview?.previewCharacter?.senses ?? []"
              :key="JSON.stringify(s)"
            >{{ s.sense_type ? `${s.sense_type} ${s.range ?? ''} ${s.units ?? ''}`.trim() : JSON.stringify(s) }}</li>
            <li v-if="!(preview?.previewCharacter?.senses ?? []).length" class="text-gray-500">Aucune</li>
          </ul>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 class="font-medium mb-2">Magie</h4>
          <div v-if="preview?.previewCharacter?.spellcasting">
            <div class="text-sm">
              Ability:
              {{ preview?.previewCharacter?.spellcasting?.ability ?? preview?.previewCharacter?.spellcasting?.meta?.ability ?? '—' }}
            </div>
            <div class="text-sm">
              Spell save DC: {{ preview?.previewCharacter?.spellcasting?.meta?.spell_save_dc ?? '—' }}
            </div>
            <div class="text-sm">
              Spell attack mod: {{ preview?.previewCharacter?.spellcasting?.meta?.spell_attack_mod ?? '—' }}
            </div>
            <div class="mt-2">
              <div class="font-medium">Slots</div>
              <div
                v-if="preview?.previewCharacter?.spellcasting?.slots && Object.keys(preview.previewCharacter.spellcasting.slots).length"
              >
                <div v-for="(num, lvl) in preview.previewCharacter.spellcasting.slots" :key="lvl" class="text-sm">{{ lvl }}: {{ num }}</div>
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
            <li v-for="e in preview?.previewCharacter?.equipment ?? []" :key="JSON.stringify(e)">{{ e }}</li>
            <li v-if="!(preview?.previewCharacter?.equipment ?? []).length" class="text-gray-500">Aucun</li>
          </ul>

          <hr class="my-2" />
          <h4 class="font-medium">Features appliqués</h4>
          <ul class="list-disc ml-5 text-sm">
            <li v-for="f in preview?.appliedFeatures ?? []" :key="f">{{ f }}</li>
            <li v-if="!(preview?.appliedFeatures ?? []).length" class="text-gray-500">Aucun</li>
          </ul>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 class="font-medium mb-2">Préparation du matériel</h4>
          <div class="space-y-2">
            <div
              v-for="entry in materialSummary"
              :key="entry.id"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ entry.label }}</p>
              <p class="mt-1 text-sm text-slate-700">{{ entry.value || 'À définir' }}</p>
            </div>
          </div>
          <div class="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes complémentaires</p>
            <p class="mt-1 whitespace-pre-line">{{ materialNotesDisplay || 'Aucune note pour le moment.' }}</p>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h4 class="font-medium mb-2">Portrait narratif</h4>
          <div class="space-y-2">
            <div
              v-for="entry in narrativeSummary"
              :key="entry.id"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ entry.label }}</p>
              <p class="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{{ entry.value || 'À préciser' }}</p>
            </div>
          </div>
        </section>
      </div>

      <div v-if="preview?.errors && preview.errors.length" class="p-3 border rounded bg-red-50 text-sm text-red-700">
        <div class="font-medium">Erreurs détectées</div>
        <ul class="list-disc ml-5">
          <li v-for="(e, i) in preview.errors" :key="i">{{ e.type }} — {{ e.message }}</li>
        </ul>
      </div>
    </div>

    <div v-else class="text-sm text-gray-600">Lancez une prévisualisation pour voir un aperçu détaillé du personnage.</div>

    <div class="pt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
      <button
        class="btn self-end sm:self-auto"
        type="button"
        @click="handleSave"
        :disabled="saving || !canSave"
      >
        <span v-if="saving">Sauvegarde…</span>
        <span v-else>Sauvegarder ce personnage</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from '#app';
import {
  DESCRIPTION_FIELD_DEFINITIONS,
  MATERIAL_SLOT_DEFINITIONS,
  useBonomeCreationStore,
  type DescriptionFields,
  type MaterialPlan
} from '@/stores/bonomeCreation';
import { usePersonnage } from '@/stores/personnage';

const router = useRouter();
const creation = useBonomeCreationStore();
const personnageStore = usePersonnage();

const {
  preview,
  identitySummary,
  displayCharacterName,
  previewPortrait,
  displayStats,
  characterFirstName,
  characterLastName,
  characterNickname,
  fullCharacterName
} = storeToRefs(creation);

const materialPlan = creation.materialPlan as MaterialPlan;
const descriptionFields = creation.descriptionFields as DescriptionFields;

const equipmentSlots = MATERIAL_SLOT_DEFINITIONS;
const descriptionFieldDefinitions = DESCRIPTION_FIELD_DEFINITIONS;

const trimmedFirstName = computed(() => characterFirstName.value.trim());
const trimmedLastName = computed(() => characterLastName.value.trim());
const trimmedNickname = computed(() => characterNickname.value.trim());
const hasNameParts = computed(
  () =>
    Boolean(trimmedFirstName.value) ||
    Boolean(trimmedLastName.value) ||
    Boolean(trimmedNickname.value)
);
const trimmedFullName = computed(() => fullCharacterName.value.trim());

const materialSummary = computed(() =>
  equipmentSlots.map((slot) => {
    const value = materialPlan[slot.id];
    return {
      id: slot.id,
      label: slot.label,
      value: typeof value === 'string' ? value.trim() : ''
    };
  })
);

const narrativeSummary = computed(() =>
  descriptionFieldDefinitions.map((field) => ({
    id: field.id,
    label: field.label,
    value: descriptionFields[field.id].trim()
  }))
);

const materialNotesDisplay = computed(() =>
  typeof materialPlan.notes === 'string' ? materialPlan.notes.trim() : ''
);

const canSave = computed(() => preview.value?.ok && !(preview.value?.errors?.length));
const saving = ref(false);
const saveError = ref<string | null>(null);

async function handleSave() {
  if (!canSave.value || saving.value) {
    return;
  }

  saving.value = true;
  saveError.value = null;

  try {
    const payload = await creation.createPersonnagePayload();
    if (!payload) {
      throw new Error("La génération du personnage n'a retourné aucune donnée.");
    }

    personnageStore.perso = payload;
    personnageStore.sauvegarderLocal();

    await router.push('/aventure');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[BonomePreviewPanel] handleSave failed', err);
    const message = err?.message ?? err;
    saveError.value = message ? `Impossible de sauvegarder la fiche : ${String(message)}` : 'Impossible de sauvegarder la fiche.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* minimal */
</style>
