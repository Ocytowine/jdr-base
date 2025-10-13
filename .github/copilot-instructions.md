# Instructions Copilot pour JDR BASE

## Vue d'ensemble
Ce projet est une application Nuxt 4 orientée jeu de rôle, utilisant Pinia pour la gestion d'état et Tailwind CSS pour le style. Les données de catalogue (classes, races, backgrounds, sorts) sont chargées dynamiquement depuis un dépôt GitHub configuré via des variables d'environnement.

## Architecture principale
- **Pages Nuxt** : `/`, `/joueur`, `/creation`, `/aventure` — chaque page s'appuie sur un layout global sombre et des composants tailwindisés.
- **Composants clés** :
  - `BonomeWizard` (assistant de création en 8 étapes)
  - `BonomePhase1-8` (formulaires dynamiques)
  - `BonomePreviewPanel` (récapitulatif)
  - `FichePersonnage` (fiche compacte pour l'aventure)
- **Stores Pinia** :
  - `useBonomeCreationStore` (logique métier, catalogue, preview)
  - `usePersonnage` (fiche finale, persistance locale)
- **Composables** :
  - `useSession` (état de connexion fictif)
  - `useUid` (génération d'identifiants)
- **Serveur** :
  - Endpoints `/api/creation/*` pour la gestion des choix et de la prévisualisation
  - Adaptateurs : `DataAdapterV2GitHub`, `CreationAdapterServer`, `EffectEngine`

## Conventions et patterns spécifiques
- **Catalogue GitHub** : Les données sont normalisées via des adaptateurs et mises en cache localement si configuré.
- **Preview et commit** : La création de personnage s'effectue en plusieurs étapes, chaque choix déclenchant un recalcul côté serveur.
- **Persistance** : La fiche finale est stockée dans Pinia puis en localStorage avant d'être utilisée dans l'aventure.
- **Alias Nuxt** : Les imports utilisent les alias Nuxt, attention lors des tests ou scripts custom (voir `scripts/run-tests.mjs`).
- **Styles** : Tailwind est configuré avec un plugin local `tailwindcss-line-clamp`.

## Workflows développeur
- **Installation** : `npm install`
- **Développement** : `npm run dev`
- **Build production** : `npm run build` puis `npm run preview`
- **Tests** : `npm run test` (compile et exécute les fichiers `tests/*.test.ts` via esbuild)
- **Variables d'environnement** : Renseigner les variables GitHub pour charger votre propre catalogue.

## Points d'intégration et dépendances
- **API GitHub** : Les adaptateurs interagissent avec l'API GitHub pour charger les données du jeu.
- **Cache local** : Optionnel, configuré via `DATA_CACHE_DIR`.
- **Pinia** : Centralise la logique métier et la persistance.

## Fichiers clés à consulter
- `nuxt.config.ts` : configuration globale, variables d'environnement
- `stores/bonomeCreation.ts` : logique de création et preview
- `components/BonomeWizard.vue` : assistant de création
- `server/api/creation/*` : endpoints serveur
- `utils/dataAdapterV2GitHub.ts` : adaptateur catalogue
- `engine/effectEngine.ts` : application des effets
- `scripts/run-tests.mjs` : workflow de test

## Nettoyage
- Les fichiers/dossiers obsolètes sont listés dans le README et peuvent être supprimés.

---

> **Pour toute nouvelle fonctionnalité, suivez les patterns existants (stores Pinia, adaptateurs, composants tailwindisés) et respectez la logique de preview/commit côté serveur.**
