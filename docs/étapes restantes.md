A débugger :

    en cours -> Niveau : il faut dicossier le niveau global au niveau de classe ! ca fausse tout

    en cours -> Classe de Mage : les sort préparé : nmbr de sort preparable = niveau de mage + mod.INT

    Mage.vue : 
        - il y'a les slots niveau 0 qui affiche NaN, cela devrait etre infinie
        - Les slots sont pas trés parlants revoir l'UI
        - ajouter le nombre de sort préparé !

    Création :
        - Les choix ne récupère pas les images et description (comme inventaire)

    Fiche personnage (aventure) :
        - il manque les sens : "payload": {"sense_type": "vision nocturne","range": 18]
        - vitesse calcul de CA (helper ?) niveau de fatique, besoin (créer une UI de jauge), "payload": {"vitesse": 9, "nivFatigueMax": 6, "initiative": "1d20 + mod.DEX", "CA": "10 + mod.DEX", 

    AJOUT DE MECANIQUE :
    ajout type : contenant subtype : grimoire, sac, bourse, carquois
    helpers mécanique de parenté, entre contenant et contenu
    modifier le grimoire : cela devient un contenant de sort
    modifier les munitions : il faut des contenant

    ajout de marchand : 
    - spécialsation (arme armure ...)
    - index des prix
    - récapitule l'argent contenu dans les bourses
    - narration pour marchandage
    - liste en grille comme d'habitude
