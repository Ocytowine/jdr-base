# Guide de création des UItemplates (UI personnalisés de classe)

## Vue d'ensemble

Chaque UItemplate est un composant Vue dédié à une classe ou sous-classe, affichant les pouvoirs, sorts et options spécifiques du personnage.  
Les données sont alimentées par le store Pinia (`useBonomeCreationStore`) et la base locale (`JDR_DATABASE_partie...`).

## Structure recommandée

- **Props attendues** : aucune, tout passe par le store.
- **Données à afficher** :
  - Le template UI (`ui_template`) de la classe.
  - Les sorts (`spellIds`) et pouvoirs (`featureIds`) non appliqués.
  - Les infos détaillées de chaque sort/pouvoir (nom, description, etc.).
- **Actions** :
  - Appliquer un sort/pouvoir (mutation du store).

## Exemple minimal

```vue
<template>
  <div>
    <div v-if="uiTemplate" v-html="uiTemplate"></div>
    <ul>
      <li v-for="id in nonAppliedIds" :key="id">
        <div v-if="spellDetails(id)">
          <strong>{{ spellDetails(id).name }}</strong>
          <span>{{ spellDetails(id).description }}</span>
          <button @click="applyPower(id, 'spell')">Appliquer</button>
        </div>
        <div v-else-if="featureDetails(id)">
          <strong>{{ featureDetails(id).name }}</strong>
          <span>{{ featureDetails(id).description }}</span>
          <button @click="applyPower(id, 'feature')">Appliquer</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useBonomeCreationStore } from '@/stores/bonomeCreation';
const store = useBonomeCreationStore();
const uiTemplate = computed(() => store.preview.value?.previewCharacter?.ui_template ?? null);
const spellIds = computed(() => store.preview.value?.spellIds ?? []);
const featureIds = computed(() => store.preview.value?.featureIds ?? []);
const appliedFeatures = computed(() => store.preview.value?.appliedFeatures ?? []);
const nonAppliedIds = computed(() => {
  const applied = new Set(appliedFeatures.value ?? []);
  return [
    ...spellIds.value.filter((id: string) => !applied.has(id)),
    ...featureIds.value.filter((id: string) => !applied.has(id))
  ];
});
const spellDetails = (id: string) => store.getSpellOrFeatureDetails(id, 'spell');
const featureDetails = (id: string) => store.getSpellOrFeatureDetails(id, 'feature');
const applyPower = async (id: string, type: 'spell' | 'feature') => {
  // À adapter selon la logique métier
};
</script>
```

## Bonnes pratiques

- Utilisez Tailwind CSS pour le style.
- Centralisez la logique métier dans le store.
- Utilisez les méthodes utilitaires du store pour accéder aux données.
- Documentez chaque nouveau UItemplate dans ce fichier.

## Pour aller plus loin

- Ajoutez des boutons d’action pour chaque pouvoir/sort.
- Affichez les effets ou prévisualisations en temps réel.
- Permettez la personnalisation du template via le store ou des props additionnelles.

---
