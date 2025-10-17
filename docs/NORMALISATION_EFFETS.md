- Maitrises (proficiency_grant / saving_throws):
  - Les categories sont harmonisees et converties en identifiants canoniques (`armes`, `armures`, `outils`, `competences`, `langues`, `vehicules`, `instruments`, `jeux`, `sauvegardes`, `divers`).
  - Les alias FR/EN de `docs/ITEMS-EXPLICATION` sont resolus pour retrouver l'identifiant mecanique :
    - Armes : `simple`, `martiale`, `speciale`, `monastique`.
    - Armures : `legere`, `intermediaire`, `lourde`, `bouclier`.
    - Outils : `outils_artisan`, `outils_voleur`, `trousse_herboriste`, `trousse_soins`, `instrument_musique`, `trousse_deguisement`, `trousse_faussaire`, `trousse_brasseur`, `outils_navigation`, `outils_cartographe`.
    - Competences : identifiants du catalogue (cf. `utils/competences.ts`).
  - Chaque entree de `proficiency_summary` expose un champ `rank` (`maitrise` ou `expertise`). Recevoir deux fois la meme competence (ou un outil) fait automatiquement evoluer le rang en `expertise`.
  - Les `saving_throws` sont ajoutes dans le meme resume canonique (categorie `sauvegardes`).
  - Les donnees existantes sont normalisees a la volee : les anciens tableaux `{id,label}` sont convertis vers la structure enrichie.

  - Les donnees existantes sont normalisees � la volee : les anciens tableaux `{id,label}` sont mapp�s vers la structure enrichie.

# Normalisation des Effets (spécification)

But
- Convertir des contenus hétérogènes (JSON classes/races/backgrounds/features) en une forme canonique simple, directement exploitable par le moteur d’effets.
- L’UI reste en français. La normalisation agit sur les clés/structures, pas sur les labels visibles.

Principes
- Conserver l’effet original dans `raw` pour le debug.
- Écrire les champs normalisés dans `id`, `type`, `source`, `priority`, `payload`.
- Par défaut, tout ce qui n’est pas reconnu est ignoré (jamais bloquant).

Champs canoniques
- Effet (niveau racine):
  - `id`: identifiant de l’effet (priorité à payload.feature_id/id, sinon celui d’origine)
  - `type`: type en minuscules si connu (ex: `traits`, `spellcasting_feature`, `grant_feature`, `proficiency_grant`, `items_proposal`, `stat_modifier`, `choice`)
  - `source`: provenance (ex: `mage`, `humain`, `noble`)
  - `priority`: nombre (0 par défaut)
  - `payload`: objet (jamais nul)
  - `raw`: copie profonde de l’entrée brute (pour traçabilité)

Alias et clés normalisées (payload)
- Grant feature:
  - `feature_id`: dérive de `featureId`/`feature`/`id` si nécessaire
- Sorts:
  - `spell_id`: dérive de `spellId`/`spell`/`id`
- Spellcasting:
  - `slots_table`: si `slots` existe (objet), l’assigner à `slots_table`
  - Si `slots_table` est une chaîne JSON → parse (sinon ignore)
- Choix (choices):
  - Si `choose` ou `from` détectés (ou variantes), produire `payload.choose: number`, `payload.from: string[]`, `payload.from_labels?: Array<{id,label}>`
  - Aplatir les variantes: tableaux, objets `{ items: [...] }`, mappages clé→valeur
- Dé de vie (DV):
  - Si `dv`/`hit_die`/`dice` existent: tenter de normaliser en valeur numérique (voir ci-dessous) et fixer `payload.hit_die`

Normalisation du DV
- Entrées acceptées:
  - Chaînes: `"1d6"`, `"d8"`, `"1D6"` → `6` ; `"6"` → `6`
  - Nombres: `6`, `8` → inchangé
- Sortie (payload):
  - `hit_die: number` (ex: `6`)
- Remarque: Si plusieurs clés existent, la priorité d’interprétation est `dv` → `hit_die` → `dice`.

Formules textuelles
- Laisser les champs textuels tels quels: ex. `spell_save_dc_mod: "8 + mait + mod.INT"`, `spell_attack_mod: "mait + mod.INT"`.
- Leur évaluation est faite par le moteur (voir REGLES_MOTEUR.md). La normalisation ne doit pas « traduire » ces expressions.

Items / propositions de matériel
- Si un effet liste des items avec des structures variées:
  - Accepter `items`, `item`, `entries`, `proposals` (tableaux ou objets)
  - Dériver pour chaque entrée: `id`, `quantity`, `label`, `image`, `description`, `type`, `coins`/`sellValue`, `weight`
  - Toujours retourner une liste d’items normalisés dans un groupement (avec `effect_id`, `source`, `label`, `description`)

Robustesse
- Ne jamais lever d’erreur bloquante: si un champ n’est pas normalisable, l’ignorer.
- Si une clé est manquante: définir un fallback raisonnable (ex: `payload: {}`), ne pas forcer de valeur sémantique.

Exemples
- DV
  - In: `{ payload: { dv: "1d6" } }` → Out: `{ payload: { hit_die: 6, dv: "1d6" }, raw: {...} }`
- Spellcasting
  - In: `{ payload: { slots: { "1": 2 } } }` → Out: `{ payload: { slots_table: { "1": 2 } } }`
- Choice
  - In: `{ payload: { choose: "2", from: { items: ["acrobaties", "athletisme"] } } }`
  - Out: `{ payload: { choose: 2, from: ["acrobaties", "athletisme"], from_labels: [{id:"acrobaties",label:"acrobaties"}, ...] } }`

Affichage & langue
- Les labels d’UI (titres, descriptions, noms d’effets) restent en français. La normalisation n’altère pas ces valeurs.
- Les identifiants techniques peuvent tolérer des alias FR/EN (ex: `dexterite`/`dexterity`) mais l’UI ne présente que le français.

Traçabilité et debug
- Chaque effet normalisé conserve `raw` (copie profonde) pour permettre un diagnostic aisé si un mapping ne fonctionne pas comme attendu.


