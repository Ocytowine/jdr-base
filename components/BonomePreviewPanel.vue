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

      <div class="preview__grid">
        <section class="preview-section">
          <h4 class="preview-section__title">Caractéristiques</h4>
          <table class="preview-table">
            <tr v-for="(val, key) in displayStats" :key="key">
              <td>{{ key }}</td>
              <td>{{ val }}</td>
            </tr>
          </table>

          <div class="preview-section__divider"></div>
          <h5 class="preview-section__subtitle">Compétences / Proficiencies</h5>
          <ul class="preview-list">
            <li v-for="p in preview?.previewCharacter?.proficiencies ?? []" :key="p">{{ p }}</li>
            <li v-if="!(preview?.previewCharacter?.proficiencies ?? []).length" class="preview-list__empty">Aucune</li>
          </ul>

          <div class="preview-section__divider"></div>
          <h5 class="preview-section__subtitle">Sens</h5>
          <ul class="preview-list">
            <li
              v-for="s in preview?.previewCharacter?.senses ?? []"
              :key="JSON.stringify(s)"
            >
              {{ s.sense_type ? `${s.sense_type} ${s.range ?? ''} ${s.units ?? ''}`.trim() : JSON.stringify(s) }}
            </li>
            <li v-if="!(preview?.previewCharacter?.senses ?? []).length" class="preview-list__empty">Aucun</li>
          </ul>
        </section>

        <section class="preview-section">
          <h4 class="preview-section__title">Magie & capacités</h4>
          <div v-if="preview?.previewCharacter?.spellcasting" class="preview-section__block">
            <p>Ability : {{ preview?.previewCharacter?.spellcasting?.ability ?? preview?.previewCharacter?.spellcasting?.meta?.ability ?? '-' }}</p>
            <p>Spell save DC : {{ preview?.previewCharacter?.spellcasting?.meta?.spell_save_dc ?? '-' }}</p>
            <p>Spell attack mod : {{ preview?.previewCharacter?.spellcasting?.meta?.spell_attack_mod ?? '-' }}</p>
            <div class="preview-section__divider"></div>
            <h5 class="preview-section__subtitle">Slots</h5>
            <div
              v-if="preview?.previewCharacter?.spellcasting?.slots && Object.keys(preview.previewCharacter.spellcasting.slots).length"
              class="preview-section__slots"
            >
              <span v-for="(num, lvl) in preview.previewCharacter.spellcasting.slots" :key="lvl">{{ lvl }} : {{ num }}</span>
            </div>
            <p v-else class="preview-list__empty">Aucun emplacement</p>
          </div>
          <p v-else class="preview-list__empty">Aucune donnée de magie disponible.</p>

          <div class="preview-section__divider"></div>
          <h5 class="preview-section__subtitle">Features appliqués</h5>
          <ul class="preview-list">
            <li v-for="f in preview?.appliedFeatures ?? []" :key="f">{{ f }}</li>
            <li v-if="!(preview?.appliedFeatures ?? []).length" class="preview-list__empty">Aucun</li>
          </ul>
        </section>
      </div>

      <div class="preview__grid">
        <section class="preview-section">
          <h4 class="preview-section__title">Préparation du matériel</h4>
          <div class="preview-section__tiles">
            <div v-for="entry in materialSummary" :key="entry.id" class="preview-tile">
              <span class="preview-tile__label">{{ entry.label }}</span>
              <span class="preview-tile__value">{{ entry.value || 'À définir' }}</span>
            </div>
          </div>
          <div class="preview-section__notes">
            <span class="preview-section__subtitle">Notes complémentaires</span>
            <p>{{ materialNotesDisplay || 'Aucune note pour le moment.' }}</p>
          </div>
        </section>

        <section class="preview-section">
          <h4 class="preview-section__title">Portrait narratif</h4>
          <div class="preview-section__tiles">
            <div v-for="entry in narrativeSummary" :key="entry.id" class="preview-tile">
              <span class="preview-tile__label">{{ entry.label }}</span>
              <span class="preview-tile__value preview-tile__value--multiline">{{ entry.value || 'À préciser' }}</span>
            </div>
          </div>
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
