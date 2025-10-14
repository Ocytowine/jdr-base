# Règles de Calcul — Moteur d’effets (spécification)

Objectif
- Fournir une logique unique et déterministe pour calculer tous les champs dérivés d’un personnage à partir des données « base » et des effets (classes, races, historiques, choix).
- Ne pas persister les valeurs dérivées. La persistance reste minimale (IDs et entrées utilisateur). L’UI reste en français.

Entrées du moteur
- Base personnage (persistée) minimale: `id`, `nom`, `niveau`, `caracs`, `classeId`, `raceId`, `backgroundId`, `featureIds`, `spellIds`, `inspiration`, `armure`, `bouclier`, `inventaire`, `pvActuels` (courant), `ui_template` (si connu).
- Effets (voir docs/NORMALISATION_EFFETS.md) issus des entités de classe, race, historique et choix.
- Données catalogue (maps locales) pour contextualiser: classes/races/backgrounds/features/spells/items.

Sorties (dérivées à l’exécution, non persistées)
- `pvMax` (PV maximum calculé)
- `proficiency_bonus` (bonus de maîtrise)
- `spellcasting.meta` (par ex. `spell_save_dc`, `spell_attack_mod`, `slots`)
- `proficiencies`, `saving_throws`, caractéristiques finales (`final_stats`) si modifiées par des effets
- Tout autre indicateur dérivé utile à l’UI (jamais persistant)

Conventions et helpers
- Modificateur de caractéristique: `mod(score) = floor((score - 10) / 2)`
- Bonus de maîtrise (niveau):
  - 1–4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6
- Évaluation de formules (voir docs/FORMULES_CALCUL.md):
  - Tokens autorisés: entiers positifs (constantes), tirages `XdY`, `mait`, `mod.<ABRÉVIATION>` (FOR/DEX/CON/INT/SAG/CHA)
  - Sommes additives seulement, séparées par « + » (espaces optionnels)
- Points de vie (hit_points):
  - Chaque classe fournit `hit_points.level_1` et `hit_points.per_level_after_1` (formules additives)
  - PV niveau 1 = évaluation de `level_1`, minimum 1
  - Pour chaque niveau N > 1, ajouter l’évaluation de `per_level_after_1`, minimum 1 par niveau
  - Valeur totale bornée à `>= 1`
- `pvActuels` n’est pas recalculé: on borne simplement `pvActuels ≤ pvMax` et si absent/0 on l’initialise à `pvMax` lors de la création.

Évaluation de formules (additives)
- Le moteur évalue des formules additives simples (ordre non significatif, pas de parenthèses, pas de multiplicateurs):
  - `nombre` (entier positif)
  - `XdY` (tirage aléatoire: lancer X dés à Y faces et sommer)
  - `mait` (bonus de maîtrise)
  - `mod.<carac>` (modificateur de carac): `mod.FOR`, `mod.DEX`, `mod.CON`, `mod.INT`, `mod.SAG`, `mod.CHA`
  - Exemples: "8 + mait + mod.INT", "1d6 + mod.CON", "mait + mod.CHA"
  - Tokens inconnus: ignorés (ne cassent pas le calcul; fallback si prévu)

Sortilèges (spellcasting)
- Si une `spellcasting_feature` fournit des formules:
  - `spell_save_dc_mod`: DC = évaluation de la formule si valide, sinon fallback `8 + bonusDeMaitrise + mod(ability)`
  - `spell_attack_mod`: ATK = évaluation de la formule si valide, sinon fallback `bonusDeMaitrise + mod(ability)`
- `ability` (carac de lancement) est attendue dans l’effet. Si absente, fallback `intelligence`.
- `slots_table`: objet `{ niveau: nombre }`. Les valeurs non numériques sont ignorées.

Proficiencies, jets de sauvegarde
- Les effets `proficiency_grant` alimentent `proficiencies`.
- Les effets `saving_throws` (ex: ["intelligence", "sagesse"]) sont acceptés tels quels et exposés en derived.

Règles d’agrégation
- Les effets sont appliqués dans l’ordre (priorité si nécessaire). Les champs agrégés (ex: listes) sont fusionnés sans doublons.
- Les valeurs numériques s’additionnent si l’effet l’implique (ex: `stat_modifier`).

Persistance et UI
- Ne pas persister `pvMax`, `proficiency_bonus`, `spellcasting.meta`. Ces champs sont recalculés à chaque chargement.
- Persister `pvActuels` (courant), mais l’UI doit afficher `pvActuels / pvMax` (avec `pvMax` dérivé).
- Toute chaîne d’UI reste en français (les noms d’effets, labels, titres). Le moteur ne produit pas de texte utilisateur.

Exemple (Mage niveau 3, INT=13, CON=14)
- Entrées:
  - caracs: INT=13 → `mod.INT=+1`, CON=14 → `mod.CON=+2`
  - classe (hit_points): `level_1 = "6 + mod.CON"`, `per_level_after_1 = "4 + mod.CON"`
  - sortilèges: `spell_save_dc_mod = "8 + mait + mod.INT"`, `spell_attack_mod = "mait + mod.INT"`
- Dérivés:
  - `bonusDeMaitrise(3) = +2`
  - `pvMax` = (niv1) `6+2` + (niv2) `4+2` + (niv3) `4+2` = 8 + 6 + 6 = 20
  - `DC` = `8 + 2 + 1` = 11
  - `ATK` = `2 + 1` = 3

Notes d’implémentation
- Le moteur appelle les helpers de `utils/regles_du_jeu.ts` (pour `mod`, `bonusDeMaitrise`).
- Les effets doivent fournir `hit_points` (formules). Aucune dépendance à un champ `dv` n’est requise.
