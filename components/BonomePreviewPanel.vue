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
          <div>
            <div class="text-xs uppercase tracking-wide text-gray-500">Nom du personnage</div>
            <div class="text-xl font-semibold text-slate-900">{{ displayCharacterName }}</div>
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
                <p class="text-xs leading-snug text-gray-600 min-h-[3rem]">{{ summary.description }}</p>
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

      <div v-if="preview?.errors && preview.errors.length" class="p-3 border rounded bg-red-50 text-sm text-red-700">
        <div class="font-medium">Erreurs détectées</div>
        <ul class="list-disc ml-5">
          <li v-for="(e, i) in preview.errors" :key="i">{{ e.type }} — {{ e.message }}</li>
        </ul>
      </div>
    </div>

    <div v-else class="text-sm text-gray-600">Lancez une prévisualisation pour voir un aperçu détaillé du personnage.</div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useBonomeCreationStore } from '@/stores/bonomeCreation';

const creation = useBonomeCreationStore();
const { preview, identitySummary, displayCharacterName, previewPortrait, displayStats } = storeToRefs(creation);
</script>

<style scoped>
/* minimal */
</style>
