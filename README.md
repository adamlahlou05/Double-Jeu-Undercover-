# Double Jeu

Jeu de mots et de bluff pour une tablée d’amis, sur un seul téléphone que l’on se passe.
Tout le monde reçoit le même mot secret, sauf un ou deux infiltrés : l’**Undercover** a un mot voisin
(et ne sait pas qu’il est l’Undercover), **Mr. White** n’a aucun mot. Chacun donne un indice,
on débat, on vote, et on recommence jusqu’à la victoire d’un camp.

Application Android. Le jeu lui-même fonctionne hors ligne : joueurs, photos, scores et historique restent
sur le téléphone et ne sont envoyés nulle part.

Depuis la version 3, l’application est prévue pour le Play Store :

- **Parties en réserve.** 3 parties offertes à l’installation (la première se joue donc sans rien de
  publicitaire), puis une pub vidéo regardée jusqu’au bout redonne 2 parties. Sans pub disponible
  (hors ligne), 2 parties par jour restent offertes.
- **Sélection découverte offerte** : 164 paires faciles piochées dans tous les thèmes de base.
- **Thèmes à débloquer.** Les 26 thèmes sont visibles, verrouillés. On les ouvre en achetant un pack, ou
  l’illimité, ou en regardant une pub pour essayer un thème pendant 12 h.
- **Double Jeu illimité** : un achat unique qui retire les pubs et ouvre tous les thèmes et niveaux.
- **Neuf packs** vendus à l’unité : Quotidien, Culture, Écrans & loisirs, Esprit, Soirée, Coquin,
  Politique & société, Foot, Tech & Indus.
- **Explications des mots** : un bouton « C’est quoi ? » sous le mot ouvre deux phrases d’explication ;
  elles s’affichent d’office pour les mots corsés.

Les pubs (Google AdMob, avec recueil du consentement) et les achats (Google Play) sont les seuls usages
d’Internet. L’**appareil photo** n’est demandé que pour prendre une photo de profil, qui reste sur le
téléphone ; le micro n’est jamais utilisé.

Pour publier : **[GUIDE-PUBLICATION.md](GUIDE-PUBLICATION.md)**. Textes et visuels de la fiche : dossier `store/`.

## Ce qu’il y a dedans

- **3 à 16 joueurs**, avec une composition conseillée selon le nombre et réglable à la main.
- **Trois modes** : Classique, Éclair (un seul vote) et Mystère (nombre d’infiltrés secret).
- **Deux façons de voter** : à main levée, ou en secret sur le téléphone avec dépouillement automatique.
  Égalité : départage entre ex æquo, puis tirage au sort.
- **2 596 paires de mots** dans 26 thèmes et 3 niveaux (« Corsé » décoché par défaut), dont 164 offertes,
  sans répétition tant que la sélection n’est pas épuisée, plus vos propres paires (« Nos mots »).
  Dans un navigateur (sans boutique), les 21 thèmes de base sont ouverts. Un thème « Électricité & électronique » de 100 paires, du disjoncteur
  au régulateur PID.
- **Tour de parole sur un seul écran** : l’ordre complet du tour (Mr. White ne parle jamais en premier)
  et un bouton « Passer au vote ». Rien à valider joueur par joueur.
- **Profils** avec couleur, personnage (25 au choix) ou photo prise dans l’appli ; **scores**, classement général et de la soirée,
  statistiques par joueur et par rôle, **historique** détaillé de chaque partie.
- **Parties sauvegardées à chaque étape** : appli fermée par erreur, on reprend où on en était.
- Options : chrono du débat (lancé à la demande), prise de notes des indices en touchant un joueur
  (sans ordre imposé, répétitions refusées), thème clair ou sombre,
  sons, vibrations, export et import d’une sauvegarde.

## Installer sur un téléphone

1. Télécharger le fichier `double-jeu-x.y.z.apk` (onglet **Releases** du dépôt, ou **Actions → dernière exécution → Artifacts**).
2. L’ouvrir sur le téléphone et autoriser l’installation depuis cette source si Android le demande.

Android 8.0 ou plus récent. Les mises à jour s’installent par-dessus l’ancienne version en gardant
joueurs et scores, à condition d’être signées avec la même clé (voir « Signature »).

## Organisation du dépôt

```
web/                  le jeu : HTML, CSS, JavaScript sans dépendance ni étape de compilation
  js/engine.js        règles et déroulement d’une partie (logique pure, sans interface)
  js/words/           bibliothèque de mots, un fichier par famille de thèmes
  js/stats.js         classements et statistiques, recalculés depuis l’historique
  js/store.js         sauvegarde locale (fichiers natifs sur Android, localStorage dans un navigateur)
  js/shop.js          règles de la boutique : réserve de parties, pubs, packs, essais de thèmes
  js/logo.js          le logo, dessiné en vectoriel
  js/views*.js        écrans ; js/app.js : gestes, navigation, enchaînement des phases
android/              coque Android : WebView servie localement, sauvegarde sur fichiers, bouton retour,
                      autorisation de l’appareil photo, vibrations, écran maintenu allumé
  …/Monetization.java pubs avec récompense (AdMob + consentement) et achats (Google Play Billing)
  monetization.properties   identifiants AdMob (démonstration par défaut)
store/                fiche Play Store : textes, icône 512, bannière, captures, page de confidentialité
tests/unit/           moteur de jeu, tirage des mots, règles de la boutique (Node)
tests/e2e/            parties complètes jouées dans Chromium à la taille d’un téléphone (Playwright)
scripts/              serveur local, contrôle des mots, page autonome, icônes et captures de la fiche
.github/workflows/    tests, compilation de l’AAB et de l’APK, essai sur émulateur à chaque envoi
```

Le dossier `web/` est copié tel quel dans l’APK au moment de la compilation : le même code tourne
dans l’application et dans un navigateur.

## Développer

Prérequis : Node 22. Pour l’APK : JDK 17 ou plus et le SDK Android (plateforme 36).

```bash
npm install
npm run serve          # le jeu dans un navigateur : http://127.0.0.1:8080
npm run check:words    # doublons, mots identiques, longueurs
npm test               # moteur : règles, votes, égalités, 2 500 parties aléatoires
npm run e2e            # scénarios complets dans Chromium (SHOTS=1 pour garder les captures)
npm run bundle         # dist/double-jeu.html : le jeu en un seul fichier

cd android
./gradlew :app:testDebugUnitTest :app:assembleDebug     # APK de test
./gradlew :app:assembleRelease                          # APK final
```

L’APK se trouve ensuite dans `android/app/build/outputs/apk/`.

### Ajouter ou corriger des mots

Les mots vivent dans le classeur `data/double-jeu-mots.xlsx`, feuille « Mots » : une ligne par paire, avec
le pack, le thème, le niveau, les deux mots, leurs explications (facultatives) et la colonne « Offert ».

```bash
python3 scripts/import-words.py   # classeur → web/js/words/library.js (dépendance : openpyxl)
npm run check:words               # doublons, explications qui donnent l'autre mot, longueurs
npm test
```

`library.js` est un fichier généré : on ne le modifie pas à la main. Un nouveau thème se déclare dans
`scripts/import-words.py` (identifiant, description) et dans `PACKS` (`web/js/shop.js`).

## Signature

Android n’accepte une mise à jour que si elle est signée avec la même clé que la version installée.
La compilation lit quatre variables d’environnement :

| Variable | Contenu |
| --- | --- |
| `DJ_KEYSTORE_FILE` | chemin du fichier de clés (`.jks`) |
| `DJ_KEYSTORE_PASSWORD` | mot de passe du fichier |
| `DJ_KEY_ALIAS` | nom de la clé (`doublejeu`) |
| `DJ_KEY_PASSWORD` | mot de passe de la clé |

Sans elles, l’APK est signé avec la clé de débogage de la machine : il s’installe, mais ne peut pas
remplacer une version signée autrement (il faut alors désinstaller, ce qui efface les données ;
penser à exporter une sauvegarde depuis les réglages).

Pour la compilation automatique, enregistrer dans **Settings → Secrets and variables → Actions** :
`DJ_KEYSTORE_BASE64` (le fichier `.jks` encodé avec `base64 -w0`), `DJ_KEYSTORE_PASSWORD`, `DJ_KEY_ALIAS`
et `DJ_KEY_PASSWORD`. Le fichier de clés ne doit jamais être ajouté au dépôt.

## Publier une version

1. Mettre à jour `versionCode` et `versionName` dans `android/app/build.gradle.kts` (et `APP_VERSION` dans `web/js/state.js`).
2. `git tag v2.1.0 && git push --tags` : l’APK est compilé, essayé sur émulateur et attaché à la release.

## Règles du moteur, en bref

- Mr. White ne parle jamais en premier. Le premier orateur de chaque tour est tiré au sort parmi les
  autres joueurs (et non « le suivant », ce qui trahirait Mr. White), sans redonner la main à quelqu’un
  qui a déjà ouvert un tour.
- Si celui qui ouvre le tour quitte la table avant qu’un indice soit noté, l’ordre est retiré au sort
  (dans tous les cas, pour que le changement d’ordre ne désigne personne).
- Les Civils gagnent quand tous les infiltrés sont éliminés ; les infiltrés quand il ne reste qu’un Civil ;
  Mr. White seul s’il devine le mot des Civils au moment de son élimination.
- Points : Civil 2, Mr. White 6, Undercover 10. Tout le camp vainqueur marque, éliminés compris.
- Toute action impossible dans la phase en cours est refusée par le moteur : une fausse manipulation
  ne peut pas mettre la partie dans un état incohérent.

## Crédits

Polices [Fraunces](https://github.com/undercasetype/Fraunces) et [Figtree](https://github.com/erikdkennedy/figtree),
sous licence SIL Open Font License 1.1 (textes dans `web/fonts/`).
