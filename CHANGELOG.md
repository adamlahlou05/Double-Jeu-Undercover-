# Journal des versions

## 3.2.1

- Identifiants AdMob du compte de l'éditeur : l'application affiche de vraies publicités (plus de publicités de test).
- Site : adresse de contact et fichier `app-ads.txt` renseignés.

## 3.2.0

### Explications des mots

- **Un bouton « C’est quoi ? » sous le mot**, sur la carte et dans « Revoir mon mot » : il ouvre une explication
  de deux phrases au plus. Pour les mots de niveau Corsé, elle s’affiche d’office (réglage « Explication des
  mots corsés »). Un mot sans explication n’affiche rien.
- **En fin de partie**, « Que veulent dire ces mots ? » explique les deux mots.
- 559 paires expliquées (1 118 mots) : Coquin, Soirée, Foot, Politique & société, Stars & personnages, Marques
  & logos, Red flags & débats en entier. Une explication ne cite jamais l’autre mot de la paire.
- Aucun mot n’est plus coupé en deux sur les petits écrans.

### Mots

- La base de mots vient maintenant d’un classeur, `data/double-jeu-mots.xlsx` : `scripts/import-words.py` en
  fabrique `web/js/words/library.js`. 2 596 paires dans 26 thèmes.
- Deux nouveaux thèmes : **Marques & logos** (Pack Quotidien) et **Red flags & débats** (Pack Esprit).
- Thèmes Coquin, Soirée, Foot, Politique & société et Stars & personnages refondus ; doublons entre thèmes
  supprimés, paires d’opposés ou de synonymes remplacées.
- Le thème Électricité & électronique quitte le Pack Esprit et devient le **Pack Tech & Indus** (77 paires).
- La sélection découverte suit la colonne « Offert » du classeur : 164 paires.

## 3.1.0

### Modèle économique

- **Sélection découverte offerte** : 150 paires faciles (300 mots), piochées dans tous les thèmes de base.
  C’est ce que joue une installation sans achat, sans choix de thème ni de niveau.
- **Les 24 thèmes sont tous visibles, verrouillés.** Trois façons d’en ouvrir : acheter son pack, acheter
  « Double Jeu illimité » (tout, sans pub), ou regarder une pub jusqu’au bout pour essayer un thème pendant 12 h.
- **Huit packs** : Quotidien, Culture, Écrans & loisirs, Esprit (5 thèmes chacun), Soirée, Coquin, Politique &
  société, Foot. Un pack ouvre ses thèmes mais ne retire pas les pubs ; l’illimité fait les deux.
- **Nouveau thème « Coquin »** (60 paires : séduction, flirt, sous-entendus), vendu en pack, pour adultes.
- La réserve de parties ne change pas : 3 offertes, +2 par pub vue jusqu’au bout, 2 parties de secours par
  jour hors ligne. Aucune pub, ni essai par pub, avant la fin de la première partie.

### Joueurs

- **Modifier et supprimer depuis la liste** : un crayon et une corbeille sur chaque ligne de l’écran Joueurs.
- Fiche d’un joueur : boutons « Modifier » et « Supprimer ». Éditeur : bouton « Supprimer ce joueur ».
- Écran « Qui joue ? » : une tuile « Modifier » ; on touche ensuite un joueur pour changer son nom ou sa photo.
- Une installation neuve ne contient aucun joueur (vérifié par un test automatique).

### Sécurité

- La page du jeu n’exécute que ses propres fichiers (politique de sécurité du contenu) et ne contacte aucun serveur.
- Sauvegarde importée : photos et identifiants contrôlés strictement, tout enregistrement trafiqué est écarté.
- Android : plus de copie des données dans la sauvegarde Google (les photos restent sur le téléphone, une
  réinstallation repart de zéro) ; le transfert direct vers un nouveau téléphone reste possible. Trafic non
  chiffré interdit, géolocalisation et ouverture de fenêtres désactivées dans la page.

## 3.0.0

Version prévue pour le Play Store.

- **Boutique.** Parties en réserve (3 offertes, +2 par pub vidéo vue jusqu’au bout, 10 au plus), achat unique
  « Double Jeu illimité » (sans pub, tous les packs), trois packs de thèmes : Soirée, Politique & société, Foot.
- **Rien de publicitaire pendant la première partie** : ni pub, ni fenêtre de consentement avant qu’elle soit finie.
- **Jamais bloqué hors ligne** : si aucune pub n’est disponible, 2 parties par jour restent offertes.
- **Photo de profil** : le bouton est en haut de l’écran, sur l’avatar.
- **Niveau « Corsé » décoché par défaut.**
- **Nouveau logo** (deux cartes : un joueur comme les autres, et l’intrus au chapeau), icône et visuels de fiche.
- Android : Google Mobile Ads 25.5.0, consentement UMP 4.0.0, Play Billing 9.1.0 ; fichier AAB pour le Play Store.
- Identifiants AdMob dans `android/monetization.properties` (identifiants de démonstration par défaut).

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
