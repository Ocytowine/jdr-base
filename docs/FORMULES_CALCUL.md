# Règles d’écriture des formules (canon)

But
- Définir une seule façon d’écrire les formules pour tous les contenus (classes, historiques, etc.).
- Aucune normalisation automatique: les fichiers de données doivent déjà respecter cette convention.
- Tous les textes/identifiants visibles restent en français.

Jeu de caractères et encodage
- Les fichiers de données et cette convention utilisent l’encodage UTF-8.
- Les caractères spéciaux (accents comme « é », apostrophes ' ou guillemets ") sont autorisés dans toutes les chaînes d’interface (titres, descriptions, noms, etc.).
- Dans les formules elles-mêmes, seuls les éléments listés dans la « Syntaxe générale » sont autorisés; ils sont séparés par « + » et des espaces. Pas d’autres caractères au sein des tokens.

Syntaxe générale
- Une formule est une somme de termes séparés par des « + » (pas de parenthèses, pas de multiplications/divisions).
- Espaces optionnels autour de « + ».
- Terme autorisé = un des éléments suivants:
  - Un entier positif (constante numérique), p. ex. `6`, `8`, `10`, `12`.
  - Un tirage de dés en notation `XdY` (ex: `1d6`, `2d10`, `3d12`).
    - Interprétation: lancer X dés à Y faces et sommer le résultat.
    - Exemple: `1d6 + mod.CON` signifie « lancer un d6 puis ajouter le modificateur de CON ».
  - `mait` (bonus de maîtrise, dépend du niveau total du personnage).
  - `mod.CON` | `mod.DEX` | `mod.FOR` | `mod.INT` | `mod.SAG` | `mod.CHA` (modificateur de caractéristique).
- Tout autre token est interdit.
  - Remarque: les espaces restent libres (y compris insécables), mais aucun autre caractère de ponctuation ne doit apparaître au sein des tokens.

Caractéristiques (abréviations officielles)
- Force → `FOR`
- Dextérité → `DEX`
- Constitution → `CON`
- Intelligence → `INT`
- Sagesse → `SAG`
- Charisme → `CHA`

Exemples valides
- `6 + mod.CON` (6 est une constante)
- `1d6 + mod.CON` (tirage d’un d6, puis ajout du modificateur de CON)
- `8 + mait + mod.INT`
- `mait + mod.CHA`

Points de vie (hit_points)
- Chaque classe doit fournir un objet `hit_points` avec 2 clés obligatoires:
  - `level_1`: formule à appliquer au niveau 1
  - `per_level_after_1`: formule à appliquer pour chaque niveau strictement supérieur à 1
- Exemple simple (valeurs constantes):
```
{
  "hit_points": {
    "level_1": "6 + mod.CON",
    "per_level_after_1": "4 + mod.CON"
  }
}
```
- Exemple avec tirages de dés (alternative autorisée):
```
{
  "hit_points": {
    "level_1": "1d6 + mod.CON",
    "per_level_after_1": "1d4 + mod.CON"
  }
}
```
- Règles d’évaluation PV:
  - PV niveau 1 = évaluation de `level_1`, minimum 1.
  - Pour chaque niveau N > 1, ajouter l’évaluation de `per_level_after_1`, minimum 1 par niveau.
  - `pvActuels` au moment de la création = `pvMax` (peut ensuite baisser/monter en jeu, mais reste borné à `pvMax`).

Sortilèges (facultatif mais recommandé pour l’uniformité)

- Sauvegarde (DC): écrire la clé `spell_save_dc_mod` avec une formule additive.
  - Exemple: `"8 + mait + mod.INT"`
- Attaque de sort (bonus): écrire la clé `spell_attack_mod` avec une formule additive.
  - Exemple: `"mait + mod.INT"`
- La caractéristique de lancement (`ability`) doit aussi être fournie (ex: `"intelligence"`), mais n’intervient pas dans l’écriture de la formule.


Effets de base (`add_stat_base`)
- Utilises par les races et certaines classes pour definir des valeurs comme la vitesse, la limite de fatigue, l'initiative ou la CA.
- Les champs numeriques sont calcules directement a partir du niveau et des caracteristiques du personnage.
- Les formules additives utilisent la meme syntaxe que ci-dessus (`mait`, `mod.<ABR�%VIATION>`, `XdY`).
  - Sans tirage de des, la valeur est evaluee immediatement (ex. `10 + mod.DEX` -> `12`).
  - Avec un tirage (`1d20`, `2d6`, ...), le resultat reste une expression ou les modificateurs sont substitues (ex. `1d20 + mod.DEX` -> `1d20 + 2`).
- Les structures imbriquees (ex. `besoin`) sont conservees telles quelles : seules les chaines correspondant a des formules additives sont evaluees.
Dés (tirage aléatoire)
- `XdY` signifie lancer X dés à Y faces et sommer les résultats (ex: `2d10`).
- Si vous souhaitez un comportement non aléatoire, utilisez des constantes numériques explicites (ex: `6`, `8`) dans vos formules.

Bonnes pratiques
- Rester cohérent: toujours `mait`, toujours `mod.<ABRÉVIATION>`.
- Ne pas mélanger d’autres mots-clés (pas de `prof`, pas de `mod.INTELLIGENCE`, etc.).

Exemple complet (classe)
```
{
  "id": "mage",
  "type": "class",
  "hit_points": {
    "level_1": "6 + mod.CON",
    "per_level_after_1": "4 + mod.CON"
  },
  "spellcasting_feature": {
    "ability": "intelligence",
    "spell_save_dc_mod": "8 + mait + mod.INT",
    "spell_attack_mod": "mait + mod.INT"
  }
}
```

Remarques
- Cette convention décrit uniquement l’écriture des formules. Le calcul concret est assuré par le moteur côté application.
- Si une classe ne lance pas de sorts, omettre la section correspondante.

