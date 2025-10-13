# JDR BASE – Guide du projet

## Aperçu rapide
JDR BASE est une application Nuxt 4 qui combine Pinia pour l'état global et Tailwind CSS pour le style. La configuration active la feuille de style Tailwind, le module Pinia et expose une configuration runtime dédiée au chargement de données depuis un dépôt GitHub (owner, repo, branche, token et répertoire de cache). 【F:nuxt.config.ts†L1-L48】

Le layout global définit un en-tête avec navigation vers l'accueil, l'espace joueur, l'assistant de création et l'aperçu d'aventure, le tout enveloppé dans un thème sombre personnalisé. 【F:app.vue†L1-L65】

## Parcours utilisateur principal
### 1. Accueil et session de test
La page d'accueil fournit un bouton de connexion fictive qui active l'état de session partagé (`useSession`) puis redirige vers l'espace joueur. 【F:pages/index.vue†L1-L21】【F:composables/useSession.ts†L1-L9】

### 2. Espace joueur
Depuis `/joueur`, l'utilisateur peut générer un nouvel identifiant de partie ou charger une partie existante. Les identifiants sont créés via `useUid` qui fabrique des chaînes pseudo-aléatoires. Une fois un ID choisi, des liens mènent vers l'assistant de création et la page aventure. 【F:pages/joueur.vue†L1-L43】【F:composables/useUid.ts†L1-L8】

### 3. Assistant de création du bonôme
La page `/creation` embarque un assistant en huit étapes (`BonomeWizard`). Chaque étape prépare les sélections (identité, race, classe, niveau/point-buy, choix complémentaires, matériel, description, récapitulatif) et déclenche la mise à jour de l'aperçu côté serveur via le store Pinia `useBonomeCreationStore`. 【F:pages/creation.vue†L1-L99】【F:components/BonomeWizard.vue†L1-L267】

Le store gère le catalogue (classes, races, backgrounds), le calcul des caractéristiques point-buy et expose `initialize()` qui restaure les choix locaux, charge les données distantes et génère un premier aperçu. Il fournit également `createPersonnagePayload()` qui traduit la prévisualisation en fiche de personnage exploitable. 【F:stores/bonomeCreation.ts†L1-L186】【F:stores/bonomeCreation.ts†L1195-L1385】

### 4. Prévisualisation et sauvegarde locale
Lorsque tous les choix sont valides, `BonomePreviewPanel` affiche un résumé complet : identité, statistiques, compétences, magie, équipement, matériel préparé et textes narratifs. Le bouton de sauvegarde sérialise la fiche via `createPersonnagePayload()`, l’enregistre dans Pinia `usePersonnage` puis en localStorage avant de rediriger vers `/aventure`. 【F:components/BonomePreviewPanel.vue†L1-L288】【F:stores/personnage.ts†L1-L86】【F:stores/bonomeCreation.ts†L1195-L1342】

### 5. Page aventure
La page `/aventure` recharge la fiche locale, affiche un message approprié en cas d’absence de sauvegarde et rend la fiche via `FichePersonnage`, laquelle calcule CA, PV et maîtrises à partir des règles utilitaires. 【F:pages/aventure.vue†L1-L47】【F:components/FichePersonnage.vue†L1-L73】【F:utils/regles_du_jeu.ts†L1-L29】

## Architecture front-end
- **Pages Nuxt** : `/` (session test), `/joueur` (gestion de partie), `/creation` (assistant), `/aventure` (fiche). Chaque page s’appuie sur le layout global et les composants tailwindisés. 【F:pages/index.vue†L1-L21】【F:pages/joueur.vue†L1-L43】【F:pages/creation.vue†L1-L99】【F:pages/aventure.vue†L1-L47】
- **Composants clés** : `BonomeWizard` orchestre les phases, `BonomePhase1-8` gèrent les formulaires (chargés dynamiquement), `BonomePreviewPanel` synthétise les données et `FichePersonnage` propose une version compacte pour l’aventure. 【F:components/BonomeWizard.vue†L1-L267】【F:components/BonomePreviewPanel.vue†L1-L288】【F:components/FichePersonnage.vue†L1-L73】
- **Stores Pinia** : `useBonomeCreationStore` concentre la logique métier (catalogues GitHub, choix, preview), `usePersonnage` stocke la fiche finale et expose des helpers de persistance locale. 【F:stores/bonomeCreation.ts†L1-L1385】【F:stores/personnage.ts†L1-L97】
- **Composables utilitaires** : `useSession` maintient l’état de connexion fake, `useUid` génère des identifiants. 【F:composables/useSession.ts†L1-L9】【F:composables/useUid.ts†L1-L8】
- **Stylisation** : Tailwind est configuré avec le plugin line-clamp local, et des styles globaux définissent l’apparence sombre. 【F:tailwind.config.ts†L1-L17】【F:packages/tailwindcss-line-clamp/index.js†L1-L50】

## Couche serveur & données
- **Endpoints de création** :
  - `POST /api/creation/preview` construit un aperçu via `CreationAdapterServer` et `DataAdapterV2GitHub`. 【F:server/api/creation/preview.post.ts†L1-L41】
  - `POST /api/creation/resolve-choice` applique un choix utilisateur avant de recalculer l’aperçu. 【F:server/api/creation/resolve-choice.post.ts†L1-L54】
  - `GET /api/creation/surface` expose la « surface » de création en mutualisant adaptateur et moteur d’effets. 【F:server/api/creation/surface.get.ts†L1-L25】
  - `POST /api/creation/commit` est un placeholder : à remplacer par votre persistance réelle. 【F:server/api/creation/commit.post.ts†L1-L9】
- **Catalogue** : Les handlers `/api/catalog/*` normalisent les entrées GitHub (classes, races, backgrounds, sorts) en détectant les champs texte, image et labels d’effet. Ils s’appuient sur un adaptateur singleton initialisé avec les variables d’environnement GitHub. 【F:server/api/catalog/_utils.ts†L1-L200】【F:server/utils/catalogAdapter.ts†L1-L34】
- **Adaptateurs & moteur** :
  - `DataAdapterV2GitHub` interroge l’API GitHub, gère un cache disque optionnel et fournit des helpers de recherche/normalisation. 【F:utils/dataAdapterV2GitHub.ts†L1-L200】
  - `CreationAdapterServer` agrège les features (depuis GitHub ou des JSON locaux) et transforme les choix en effets immédiats (proficiencies, sorts, etc.). 【F:utils/creationAdapterServer.ts†L1-L200】

## UI de classe personnalisée

Les templates d’UI de classe sont stockés dans `components/uiTemplates/classes/` et référencés par le champ `ui_template` dans la fiche personnage.  
Lors du passage à l’aventure, le template est chargé dynamiquement selon la classe du personnage.  
Les données (sorts, features, etc.) sont récupérées depuis le repo GitHub via l’adaptateur `DataAdapterV2GitHub` et enrichies localement lors de la sauvegarde.

Pour ajouter une nouvelle UI de classe :
1. Créez un composant Vue dans `components/uiTemplates/classes/` (ex: `mage.vue`).
2. Ajoutez le nom du template dans le champ `ui_template` du catalogue de classe sur le repo GitHub.
3. Lors de la sauvegarde, la base locale est enrichie avec les sorts/features du personnage.
4. L’UI de classe affichera dynamiquement les pouvoirs et sorts disponibles.

---

## Tests & outils
Le script `npm run test` compile et exécute les fichiers `tests/*.test.ts` via esbuild, tout en remappant les alias Nuxt. 【F:package.json†L5-L12】【F:scripts/run-tests.mjs†L1-L52】

## Mise en route
1. Installer les dépendances : `npm install`.
2. Lancer le serveur de développement : `npm run dev`.
3. Construire pour la production : `npm run build` puis `npm run preview` pour tester le bundle.
4. Renseigner les variables d’environnement GitHub (`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN`, `DATA_CACHE_DIR`) si vous souhaitez interroger votre propre dépôt de données. 【F:package.json†L5-L12】【F:nuxt.config.ts†L33-L47】

## Fichiers ou dossiers potentiellement obsolètes
- `components/CardArticleSpells old.vue` : composant d’aperçu de sort non importé nulle part (recherche textuelle vide). 【F:components/CardArticleSpells old.vue†L1-L160】【e58a43†L1-L1】
- `appff/` : ancien dossier (ne contient qu’un sous-dossier assets) non référencé dans le code source. 【c40bc5†L1-L3】【5d8da2†L1-L1】
- `schemas/effect.schema.json` : schéma JSON non consommé par le code actuel (aucune occurrence). 【F:schemas/effect.schema.json†L1-L40】【21862b†L1-L1】

Ces éléments peuvent être supprimés ou archivés si vous ne prévoyez pas de les réutiliser.

Exemple d'un fichier contenu dnas le repo github d'ou nous extrayons des informations via `DataAdapterV2GitHub`:
{
  "id": "mage_test",
  "name": "Mage test (sort niveau 1 index auto)",
  "description": "Lanceur d'art arcane basé sur l'intelligence",
  "effects": [
    {
      "id": "classe_test_spellcasting",
      "type": "spellcasting_feature",
      "payload": {
        "ability": "intelligence",
        "slots_table": { "1": 2 }
      }
    },
    {
      "id": "classe_test_spell_choice",
      "type": "choice",
      "source": "Choix des sorts de niveau 1",
      "payload": {
        "ui_id": "classe_test_spell_choice",
        "category": "spell",
        "choose": 2,
        "auto_from": {
          "collection": "spells",
          "filters": { "level": 1 },
          "id_fields": ["id", "slug"],
          "label_fields": ["name", "nom"]
        }
      }   
    }
  ]
}

Demande à faire : 

UI de classe : (présente les sorts, technique de combat...)

  j'aimerai créer une UI particulière à appliqué pour les classes de personnage, qui apparaitra dans l'onglet 'classe et pouvoirs' (déja existant) le template de l'UI de classes devra être téléchargé et appliqué lors du passage à l'aventure depuis la création (plus tard suite à l'aquisition d'un avantage à préciser), peut tu m'aider à concrétiser l'idée, (ne modifie rien pour l'instant) peut on ce servir de mon repo github pour cela ?

Runtime IA : (gère le comportement de l'IA)

  Je voudrai piloter le comportement de l'IA. Lui donner son contexte pour bien faire sont travail (L'histoire général, les connaissances du monde, géographie...) Les rêgles de narrations (comment elle intéragit, comment peuvent agir les PNJ, le tons de l'aventure, la difficulté), et surtout en fonctions du contexte (ex: le joueur veux acheté un objet), lui donner les commandes appropriées. c'est grace à ca que le temps défile, que le personnage commence à avoir faim, que les PNJ veulent ce battre...

Modules : (Gèrent les sous-aventures)

  En déclenchement, par commande ou résolution (dépassement d'un cap (XP, temps...)) Un module apparait, je pense au repos court et long, au combat, au besoin (fatique, faim, soif, autre). cela requiert une UI propore à chaque cas. un appel à des mécanique, et des données stockée soit en local soit sur Repo