# Commandes de test en jeu

Ces commandes s'utilisent dans le moteur de commandes (par ex. chat admin) sous la forme `CLE:ARGUMENTS`.

Important:
- Les effets dérivés (PV max, maîtrise, spellcasting, etc.) sont recalculés automatiquement via le moteur d'effets après chaque commande.
- Les identifiants d'objets (`itemId`) sont des IDs de repo (pas des slugs UI). Ils doivent exister dans la base locale (DATABASE).

## XP / Niveau

- `GET_PJ_XP:200` (alias `XP:200`)
  - Ajoute 200 XP au personnage courant (persiste la fiche).

- `LEVEL_UP` (alias `NIVEAU`)
  - Incrémente le niveau de 1, recalcule les dérivés.

- `LEVEL_UP:2`
  - Incrémente le niveau de 2, recalcule les dérivés.

Notes niveau:
- Politique PV: Option A/A
  - Création: `pvActuels = pvMax`.
  - Level-up: `pvActuels += (pvMax_nouveau - pvMax_ancien)`, borné à `pvMax`.
  - Changement de CON: `pvActuels = min(pvActuels, pvMax)`.

## Équipement

- `EQUIP:longsword`
  - Équipe l'item repo `longsword`. Ajoute l'ID aux listes `keptIds` et `equippedIds` si nécessaire, puis recalcule.

- `EQUIP:shield_basic,slot=bouclier`
  - Idem, en affectant le slot `bouclier` (slots acceptés: `armePrincipale`, `armeSecondaire`, `protection`, `bouclier`, `accessoire`).

- `EQ:amulet_of_health`
  - Alias d'`EQUIP`.

- `UNEQUIP:longsword` (alias `UNEQ:...`)
  - Déséquipe l'item, supprime l'ID des slots qu'il occupait, recalcule.

## Exemples

1. Monter de 2 niveaux:
   - `LEVEL_UP:2`

2. Équiper une épée longue en arme principale:
   - `EQUIP:longsword,slot=armePrincipale`

3. Équiper un bouclier:
   - `EQUIP:shield_basic,slot=bouclier`

4. Déséquiper l'épée:
   - `UNEQUIP:longsword`

## Pré-requis

- La base locale (`DATABASE`) doit contenir les entités d'items (IDs repo). Si un item est introuvable, ses effets ne seront pas appliqués.
- Les `itemId` doivent correspondre aux IDs de repo utilisés dans les données (ex: `longsword`, `shield_basic`).

