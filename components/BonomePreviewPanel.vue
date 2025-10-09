<template>
  <section class="preview">
    <div class="preview__header">
      <h3 class="preview__title">Prévisualisation</h3>
      <div class="preview__counter">Appliqués : {{ preview?.appliedFeatures?.length ?? 0 }}</div>
    </div>

    <div v-if="preview" class="preview__panel">
      <div class="preview__hero">
        <div class="preview__portrait">
          <img :src="previewPortrait" :alt="`Portrait ${displayCharacterName}`" class="preview__portrait-image" />
        </div>
        <div class="preview__identity">
          <div class="preview__identity-header">
            <span class="preview__identity-label">Nom du personnage</span>
            <h4 class="preview__identity-name">{{ displayCharacterName }}</h4>
            <div v-if="hasNameParts" class="preview__identity-details">
              <p v-if="trimmedFirstName"><span>Prénom :</span> {{ trimmedFirstName }}</p>
              <p v-if="trimmedLastName"><span>Nom :</span> {{ trimmedLastName }}</p>
              <p v-if="trimmedNickname"><span>Surnom :</span> {{ trimmedNickname }}</p>
            </div>
            <p v-else-if="trimmedFullName" class="preview__identity-details">
              Nom complet : {{ trimmedFullName }}
            </p>
          </div>
          <div class="preview__identity-grid">
            <article v-for="summary in identitySummary" :key="summary.id" class="preview-card">
              <div class="preview-card__media">
                <img :src="summary.image" :alt="`Illustration ${summary.name}`" loading="lazy" />
              </div>
              <div class="preview-card__body">
                <span class="preview-card__overline">{{ summary.title }}</span>
                <strong class="preview-card__title">{{ summary.name }}</strong>
                <p class="preview-card__description">{{ summary.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="preview__grid"> <section class="preview-section"> <h4 class="preview-section__title">Preparation du materiel (choix par slot)</h4> <div class="preview-section__form"> <div v-for="slot in uiSlots" :key="slot.id" class="preview-form__row"> <label class="preview-form__label">{{ slot.label }}</label> <select class="preview-form__select" :value="assignmentFor(slot.id)" @change="onAssign(slot.id, ($event.target as HTMLSelectElement).value)" > <option :value="''">-- A definir --</option> <option v-for="it in candidatesFor(slot.id)" :key="String(it.key || it.itemId)" :value="String(it.key || it.itemId)" > {{ formatItem(it) }} </option> </select> </div> </div>
        <div class="preview-section__divider"></div>
        <h5 class="preview-section__subtitle">Inventaire</h5>
        <ul class="preview-list">
          <li v-for="it in assignedList" :key="'a-'+String(it.item.key || it.item.itemId)">
            {{ formatItem(it.item) }} — <strong>porté</strong>
          </li>
          <li v-for="it in unassignedList" :key="'u-'+String(it.key || it.itemId)">
            {{ formatItem(it) }} — rangé
          </li>
          <li v-if="!assignedList.length && !unassignedList.length" class="preview-list__empty">
            Aucun objet
          </li>
        </ul>
        <p class="preview-list__hint" v-if="coinPurseFinalLabel">
          {{ coinPurseLabel }} : {{ coinPurseFinalLabel }}
        </p>
      </section>
      </div>

      <div v-if="preview?.errors && preview.errors.length" class="preview__errors">
        <div class="preview__errors-title">Erreurs détectées</div>
        <ul class="preview__errors-list">
          <li v-for="(e, i) in preview.errors" :key="i">{{ e.type }} - {{ e.message }}</li>
        </ul>
      </div>
    </div>

    <p v-else class="preview__empty">Lancez une prévisualisation pour voir un aperçu détaillé du personnage.</p>

    <div class="preview__footer">
      <p v-if="saveError" class="preview__save-error">{{ saveError }}</p>
      <button class="btn" type="button" @click="handleSave" :disabled="saving || !canSave">
        <span v-if="saving">Sauvegarde.</span>
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
import { useParties } from '@/stores/parties';

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

// Liste simple des objets conservés et bourse finale
const keptItemsDisplay = computed(() => {
  const arr = (creation.materialKeptItems?.value ?? []) as Array<{ item: any; keep: boolean }>
  const fmt = creation.formatMaterialItemDisplay as (item: any) => string
  return arr.map((entry) => ({ key: String(entry.item.key || entry.item.itemId), label: fmt(entry.item) }))
})

const coinPurseLabel = computed(() => creation.materialCoinPurseLabel?.value || 'Bourse')
const coinPurseFinalLabel = computed(() => {
  const coins = creation.materialFinalCoins?.value
  if (!coins) return ''
  const parts: string[] = []
  if (coins.gold) parts.push(`${coins.gold} po`)
  if (coins.silver) parts.push(`${coins.silver} pa`)
  if (coins.copper) parts.push(`${coins.copper} pc`)
  return parts.join(' ')
})

// Helpers for slot assignment UI
const formatItem = (it: any) => (creation.formatMaterialItemDisplay as (item: any) => string)(it)
const candidatesFor = (slotId: string) => (creation.slotCandidates as any).value?.[slotId] ?? []
const assignmentFor = (slotId: string) => {
  const a = creation.materialAssignments as any
  switch (slotId) {
    case 'primaryWeapon': return a.primaryWeaponKey
    case 'secondaryWeapon': return a.secondaryWeaponKey
    case 'protection': return a.protectionKey
    case 'shield': return a.shieldKey
    case 'accessories': return '' // multi-select not provided in this UI version
    default: return ''
  }
}
const onAssign = (slotId: string, key: string) => {
  (creation.setMaterialAssignment as any)(slotId, key && key.length ? key : null)
}
const unassignedList = computed(() => (creation.unassignedKeptItems as any).value ?? [])
const assignedList = computed(() => ((creation.materialAcquired as any).value ?? []).filter((e: any) => e.status === 'porte'))

// UI slots: base definitions minus 'pack' + add 'shield'
const uiSlots = computed(() => {
  const list = [...(MATERIAL_SLOT_DEFINITIONS as any)]
    .filter((s: any) => s.id !== 'pack')
  if (!list.some((s: any) => s.id === 'shield')) {
    list.splice(3, 0, { id: 'shield', label: 'Bouclier', hint: '', placeholder: '' })
  }
  return list
})

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
    const partiesStore = useParties();
    if (process.client) {
      partiesStore.initialiser();
    }
    let partieId = partiesStore.currentPartyId as string | null;
    if (!partieId) {
      partieId = partiesStore.creerPartie() as string | null;
      if (partieId) {
        partiesStore.setCurrentParty(partieId);
      }
    }
    personnageStore.sauvegarderLocal(partieId ?? undefined);
    creation.lockCreation();

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
.preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid var(--bord);
  border-radius: 18px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(20, 24, 50, 0.85), rgba(12, 15, 32, 0.95));
  color: var(--texte);
}

.preview__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 640px) {
  .preview__header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.preview__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.preview__counter {
  font-size: 13px;
  color: var(--texte-2);
}

.preview__panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.preview__hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (min-width: 768px) {
  .preview__hero {
    flex-direction: row;
  }
}

.preview__portrait {
  flex: 0 0 200px;
  max-width: 220px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--bord);
  background: var(--carte-2);
}

.preview__portrait-image {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
}

.preview__identity {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1 1 auto;
}

.preview__identity-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview__identity-label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.preview__identity-name {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--texte);
}

.preview__identity-details {
  font-size: 13px;
  color: var(--texte-2);
}

.preview__identity-details span {
  font-weight: 600;
  color: var(--texte);
  margin-right: 6px;
}

.preview__identity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.preview-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(18, 22, 47, 0.9), rgba(9, 12, 28, 0.94));
  overflow: hidden;
}

.preview-card__media {
  height: 120px;
  background: var(--carte-2);
}

.preview-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px 16px;
}

.preview-card__overline {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent-2);
}

.preview-card__title {
  font-size: 15px;
  margin: 0;
}

.preview-card__description {
  margin: 0;
  font-size: 12px;
  color: var(--texte-2);
  line-height: 1.45;
}

.preview__grid {
  display: grid;
  gap: 18px;
}

@media (min-width: 1024px) {
  .preview__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid var(--bord);
  background: linear-gradient(180deg, rgba(17, 21, 45, 0.92), rgba(10, 13, 30, 0.95));
  padding: 20px 22px;
}

.preview-section__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--texte);
}

.preview-section__subtitle {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-2);
}

.preview-section__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table td {
  padding: 6px 4px;
}

.preview-table td:first-child {
  color: var(--texte-2);
  font-weight: 600;
  width: 40%;
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.preview-list__empty {
  color: var(--texte-2);
  font-style: italic;
}

.preview-section__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--texte-2);
}

.preview-section__block p {
  margin: 0;
  font-size: 13px;
  color: var(--texte-2);
}

.preview-section__tiles {
  display: grid;
  gap: 12px;
}

.preview-tile {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 28, 0.7);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-tile__label {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--texte-2);
}

.preview-tile__value {
  font-size: 13px;
  color: var(--texte);
  word-break: break-word;
}

.preview-tile__value--multiline {
  white-space: pre-line;
}

.preview-section__notes {
  border: 1px dashed var(--bord);
  border-radius: 14px;
  background: rgba(12, 16, 34, 0.6);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--texte-2);
}

.preview__errors {
  border-radius: 14px;
  border: 1px solid var(--ko-soft-border);
  background: var(--ko-soft);
  color: var(--ko);
  padding: 16px;
  font-size: 13px;
}

.preview__errors-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.preview__errors-list {
  margin: 0;
  padding-left: 18px;
}

.preview__empty {
  font-size: 13px;
  color: var(--texte-2);
  font-style: italic;
}

.preview__footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

@media (min-width: 640px) {
  .preview__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.preview__save-error {
  margin: 0;
  font-size: 13px;
  color: var(--ko);
}
</style>

 
