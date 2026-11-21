# Journal des versions

## 2.1.0

La mise à jour s’installe par-dessus la 2.0 : profils, scores, historique et partie en cours sont conservés.

### Jeu

- **Tour de parole sur un seul écran.** L’ordre complet du tour est affiché d’un coup, avec un seul bouton
  « Passer au vote ». Il n’y a plus rien à valider après chaque joueur. La règle du tirage ne change pas :
  Mr. White ne parle jamais en premier.
- **Indices notés sans ordre imposé.** Si la prise de notes est activée, on touche un joueur pour noter son mot,
  le corriger ou l’effacer. Rien n’est obligatoire avant de voter ; les répétitions restent refusées.
- **Chrono du débat lancé à la demande**, en bandeau au-dessus de l’ordre de parole.
- Une partie enregistrée par la 2.0 pendant les indices ou le débat reprend sur le nouvel écran.

### Joueurs

- **Nom par défaut.** « Joueur 1 », « Joueur 2 »… sont un texte indicatif : le champ est vide, on tape le nom
  directement. Laissé vide, le joueur s’appelle « Joueur N ».
- **Photo de profil prise dans l’application** : caméra avant par défaut, bouton pour passer à la caméra arrière,
  aperçu dans une fenêtre, « Prendre », puis « Garder » ou « Reprendre ». Recadrage carré, 256 × 256 px.
  Le choix dans la galerie est retiré. L’autorisation « Appareil photo » est demandée au premier usage ;
  en cas de refus, un message l’explique et l’on garde un personnage.
- **25 nouveaux personnages** aux silhouettes bien distinctes, lisibles sur fond clair comme sombre.
  Les profils existants reçoivent le personnage le plus proche de leur ancien déguisement.
- Palette des 12 couleurs retouchée pour mieux séparer les teintes voisines.

### Mots

- Relecture complète : 72 paires supprimées, 43 corrigées, 70 ajoutées (2 229 paires au total).
- Nouveau thème **Électricité & électronique** : 100 paires sur 3 niveaux (19 d’entre elles viennent
  d’autres thèmes où elles étaient dispersées).
- Après la mise à jour, le nouveau thème est coché d’office.

### Technique

- Android : permission `CAMERA` (photo de profil uniquement, vidéo sans micro), demandée à l’usage et accordée
  à la seule page embarquée. Le `FileProvider` et la requête `IMAGE_CAPTURE` ne servent plus et sont retirés.
- La caméra est coupée dès que sa fenêtre se ferme ou que l’application passe en arrière-plan.
- Tests : caméra factice, reprise d’une sauvegarde 2.0, nouvel ordre de parole (29 tests du moteur, 11 scénarios).

## 2.0.0

Refonte complète : application Android hors ligne, moteur de jeu testé, profils, scores, historique.
