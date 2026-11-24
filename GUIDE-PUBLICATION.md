# Publier Double Jeu sur le Play Store : pas à pas

Version concernée : **3.2.0** (identifiant `io.github.adamlahlou05.doublejeu`). Guide mis à jour le 24 novembre 2026.

## Où tu en es

| Fait | À faire |
|---|---|
| Compte Play Console validé | Créer l'appli dans la Play Console (étape 5) |
| Compte AdMob créé, en cours de validation | Ajouter l'appli et le bloc d'annonces dans AdMob (étape 1) |
| AAB signé, visuels, textes, page de confidentialité : prêts | Lancer le test fermé au plus vite (étape 7) |

## Peut-on éviter les 14 jours de test ? Non

Ton compte Play Console est un compte personnel créé après le 13 novembre 2023 : Google impose un **test fermé
avec au moins 12 testeurs inscrits pendant 14 jours d'affilée** avant de pouvoir demander la mise en production.
Aucune catégorie d'appli n'y échappe, et ni le test interne ni le test ouvert ne comptent.

Seuls les comptes « organisation » en sont dispensés. Il faut une entité légale et un numéro D-U-N-S, dont
l'obtention peut prendre jusqu'à 30 jours : ce n'est pas plus rapide, et les coordonnées de l'entité sont
affichées sur Google Play.

Ce qui fait vraiment gagner du temps : **démarrer le test fermé dès aujourd'hui** et faire tout le reste
(AdMob, produits, fiche) pendant que les 14 jours tournent.

| Quand | Quoi |
|---|---|
| Jour 0 | Étapes 1 à 7 : AdMob, site, Play Console, test fermé envoyé en examen |
| Jour 0 à 3 | Google examine la première version ; tu recrutes tes 12 testeurs |
| 14 jours | Les testeurs restent inscrits ; tu vérifies pubs et achats (étapes 8 et 9) |
| Ensuite | Demande d'accès à la production : réponse en général sous 7 jours (étape 10) |
| Enfin | Mise en production et examen de la version (étape 11) |

Mon estimation : **3 à 5 semaines** entre aujourd'hui et l'appli visible par tout le monde. Les intitulés des
menus cités plus bas peuvent varier légèrement dans les consoles.

## Ce que tu dois m'envoyer

Trois choses, dès que tu as fait l'étape 1 :

1. L'**ID de l'application** AdMob : `ca-app-pub-…~…`
2. L'**ID du bloc d'annonces** avec récompense : `ca-app-pub-…/…`
3. L'**adresse e-mail de contact** à afficher sur la page de confidentialité et sur la fiche

Ces identifiants ne sont pas secrets. Avec eux, je te renvoie l'AAB définitif (3.2.1) et les trois fichiers du
site déjà remplis.

---

## 1. AdMob : ajouter l'appli et le bloc d'annonces (10 minutes)

Tu peux le faire tout de suite, même si le compte affiche « en cours de validation ».

Sur [admob.google.com](https://admob.google.com) :

1. Menu **Applications**, bouton **Ajouter une application**.
2. Plate-forme : **Android**.
3. À la question sur la plate-forme de téléchargement (l'appli y est-elle déjà ?) : **Non**.
4. Nom : `Double Jeu`. Laisse les métriques utilisateur activées. Clique sur **Ajouter**.
5. Dans l'appli, menu **Blocs d'annonces**, bouton **Démarrer**, puis **Sélectionner** sous **Avec récompense**.
6. Nom du bloc : `Recompense`. Montant de la récompense : `2`. Élément : `parties`. Ne touche pas aux
   paramètres avancés. Clique sur **Créer un bloc d'annonces**.

**À récupérer** (AdMob les affiche à la fin ; sinon : Applications, Double Jeu, « Paramètres de l'application »
pour l'un, « Blocs d'annonces » pour l'autre) :

- ID de l'application : `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (avec un tilde)
- ID du bloc d'annonces : `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ` (avec une barre)

Envoie-les-moi avec ton e-mail de contact.

Aide Google : [configurer une appli](https://support.google.com/admob/answer/9989980?hl=fr),
[créer un bloc avec récompense](https://support.google.com/admob/answer/7311747?hl=fr).

## 2. AdMob : terminer la validation du compte

- Menu **Paiements** : nom, adresse et téléphone doivent correspondre exactement à tes papiers officiels.
- La validation prend en général 24 heures, parfois jusqu'à deux semaines. Google prévient par e-mail.
- Un seul compte AdMob par personne : n'en crée pas un second si celui-ci tarde.

Aide Google : [validation du compte](https://support.google.com/admob/answer/9905175?hl=fr).

## 3. Mettre en ligne le petit site (15 minutes)

Google exige une adresse publique pour la politique de confidentialité. AdMob cherchera plus tard un fichier
`app-ads.txt` à la racine de ce site.

1. Sur GitHub, crée un dépôt **public** nommé exactement `adamlahlou05.github.io`.
2. Dépose dedans les trois fichiers que je te renvoie : `index.html`, `confidentialite.html`, `app-ads.txt`.
3. Réglages du dépôt, « Pages » : source = branche `main`, dossier racine.
4. Vérifie que ces deux adresses s'ouvrent :
   - `https://adamlahlou05.github.io/confidentialite.html`
   - `https://adamlahlou05.github.io/app-ads.txt`

**À récupérer** : ces deux adresses, à coller à l'étape 4 et à l'étape 6.

## 4. AdMob : message de consentement (10 minutes)

**Indispensable.** Sans message publié, l'appli n'affiche aucune pub en Europe : elle ne donne que les deux
parties de secours par jour.

Sur AdMob, menu **Confidentialité et messages** :

1. Sur la carte **Réglementations européennes**, clique sur **Créer**.
2. **Sélectionner des applications** : coche Double Jeu, puis **Confirmer**.
3. Langue par défaut : **Français**.
4. Choix de l'utilisateur : active le **bouton de refus en un clic** (« Ne pas consentir »). La CNIL demande
   qu'on puisse refuser aussi simplement qu'accepter.
5. Ciblage : **Pays soumis au RGPD**.
6. Nom du message : `Double Jeu RGPD`.
7. Ajoute l'adresse de ta politique de confidentialité (étape 3).
8. Clique sur **Publier**. Un message resté en brouillon ne sert à rien.

Puis **Paramètres, Appareils de test** : ajoute ton téléphone (son identifiant publicitaire se trouve dans
Paramètres Android, Google, Annonces). Ne regarde jamais une vraie pub de ta propre appli sur un téléphone non
déclaré : Google suspend les comptes pour ça.

Aide Google : [créer un message RGPD pour une appli](https://support.google.com/admob/answer/10113207?hl=fr).

## 5. Play Console : créer l'appli et le profil de paiement (15 minutes)

Sur [play.google.com/console](https://play.google.com/console) :

1. **Créer une application**. Nom : celui de `store/fiche-play-store.md`. Langue : Français (France).
   Type : **Jeu**. **Gratuite**. Accepte les déclarations.
2. **Paramètres, Profil de paiement** (menu du compte, pas de l'appli) : crée le profil et ajoute ton compte
   bancaire. Sans lui, impossible de créer les produits à vendre.

## 6. Play Console : fiche et déclarations (45 minutes)

Tout doit être rempli avant que Google accepte d'examiner une version, même en test.

**Fiche** (menu « Développer la base d'utilisateurs », « Présence sur le Play Store », « Fiche Play Store
principale ») : copie les textes de `store/fiche-play-store.md` et dépose les visuels du dossier `store/`
(`icone-512.png`, `banniere-1024x500.png`, `capture-1.png` à `capture-7.png`).

**Coordonnées de la fiche** : e-mail de contact, et **site web** `https://adamlahlou05.github.io` (AdMob s'en
servira pour trouver `app-ads.txt`).

**Contenu de l'application** (menu « Règles », « Contenu de l'application ») :

| Rubrique | Réponse |
|---|---|
| Règles de confidentialité | `https://adamlahlou05.github.io/confidentialite.html` |
| Annonces | Oui, l'appli contient des annonces |
| Accès à l'appli | Toutes les fonctionnalités sont accessibles sans identifiant |
| Classification du contenu | Questionnaire, catégorie Jeu. Pas de violence, pas de nudité ni d'images, pas de jeux d'argent. **Oui** aux références à l'alcool (pack Soirée) et **oui** aux références sexuelles en texte (pack Coquin : le vocabulaire y est explicite, avec des définitions de pratiques entre adultes, sans description crue). Les joueurs n'échangent rien en ligne. Réponds exactement : une classification trop basse est un motif de retrait. |
| Public cible | **18 ans et plus** uniquement. Avec de la publicité, un pack Soirée et un pack Coquin, c'est le seul choix cohérent, et il évite les règles « Familles ». |
| Identifiant publicitaire | Oui ; finalité : publicité ou marketing |
| Sécurité des données | Voir ci-dessous |
| Applications d'actualités, santé, finance, administration | Non à tout |

**Sécurité des données.** Les joueurs, photos et scores ne quittent pas le téléphone : ils ne sont pas à
déclarer. Ce qui est collecté l'est par le SDK publicitaire de Google. À déclarer au minimum :

| Donnée | Collectée | Partagée | Finalité |
|---|---|---|---|
| Identifiants de l'appareil ou autres (identifiant publicitaire) | Oui | Oui | Publicité, analyse, prévention de la fraude |
| Position approximative (déduite de l'adresse IP) | Oui | Oui | Publicité, analyse |
| Interactions avec l'appli (affichage et clics sur les pubs) | Oui | Oui | Publicité, analyse |
| Diagnostics (plantages, performances) | Oui | Oui | Analyse |

Chiffrement en transit : oui. Suppression des données : l'utilisateur peut réinitialiser son identifiant
publicitaire dans Android. Google publie la liste officielle à déclarer pour AdMob : cherche
« AdMob Play data safety » dans l'aide AdMob et aligne tes réponses dessus avant de valider.

**Statut de commerçant.** La Play Console te demandera si tu es « commerçant » au sens européen. Dès lors que
tu vends et affiches des pubs, la réponse est oui : une adresse postale, un e-mail et un téléphone seront
affichés sur ta fiche. Vendre demande aussi un profil de paiement et, en France, un statut pour déclarer ces
revenus (micro-entreprise le plus souvent). Je ne suis pas conseiller fiscal : vérifie ce point avant d'encaisser.

## 7. Lancer le test fermé (30 minutes, puis 14 jours)

C'est l'étape qui déclenche le compte à rebours : fais-la le plus tôt possible.

1. Menu **Tester et publier, Tests, Tests fermés**. Ouvre la piste proposée (« Alpha »), **Gérer la piste**.
2. Onglet **Pays/Régions** : ajoute au moins la France.
3. Onglet **Testeurs** : crée une liste d'e-mails avec les adresses **Gmail** de tes testeurs.
   Il en faut 12 ; **vise 15 à 20**, car un testeur qui se désinscrit ne compte plus.
4. **Créer une release** : importe l'AAB.
   - Accepte **la signature d'application par Google Play** (choix par défaut). Ta clé `.jks` devient la « clé
     d'importation » : il la faudra pour chaque mise à jour.
   - Notes de version : celles de `store/fiche-play-store.md`.
5. **Envoyer la release en examen**. Pour une première appli, compte souvent quelques jours.
6. Une fois la release validée : onglet Testeurs, copie le **lien de participation** et envoie-le aux testeurs.

Ce que chaque testeur doit faire, avec le compte Gmail que tu as inscrit :

1. Ouvrir le lien et toucher « Devenir testeur ».
2. Installer l'appli depuis le Play Store.
3. **Rester inscrit 14 jours** sans quitter le programme, et jouer quelques parties.

Règles du compte à rebours :

- La règle porte sur l'inscription continue de chaque testeur, pas sur une version précise : une mise à jour
  envoyée pendant le test ne désinscrit personne.
- Un testeur qui se désinscrit puis revient repart de zéro.
- Garde une trace de leurs retours (un groupe WhatsApp suffit) : Google te demandera de les résumer.
- N'achète pas de « testeurs » sur Internet : Google demande des personnes réelles qui utilisent l'appli, et
  le questionnaire final porte justement là-dessus.

Tu peux importer dès maintenant `double-jeu-3.2.0.aab` (pubs de test) pour démarrer le compte à rebours, puis
envoyer la 3.2.1 avec tes vrais identifiants sur la même piste dès que je te la renvoie.

Conséquence pour tes amis : la version du Play Store n'a pas la même signature que l'APK installé à la main.
Ils doivent exporter leur sauvegarde (Réglages, Exporter), désinstaller, installer depuis le Play Store, puis importer.

Aide Google : [exigences de test pour les nouveaux comptes personnels](https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr).

## 8. Créer les produits à vendre (30 minutes)

Possible seulement après l'import d'un premier AAB (étape 7) et la création du profil de paiement (étape 5).

Menu **Monétiser avec Play, Produits, Produits ponctuels**, bouton **Créer un produit ponctuel**. Dix produits.
Les identifiants doivent être **exactement** ceux-ci (ils ne se changent plus ensuite) :

| Identifiant | Nom affiché | Prix conseillé |
|---|---|---|
| `premium` | Double Jeu illimité | 5,99 € |
| `pack_quotidien` | Pack Quotidien | 1,99 € |
| `pack_culture` | Pack Culture | 1,99 € |
| `pack_loisirs` | Pack Écrans & loisirs | 1,99 € |
| `pack_esprit` | Pack Esprit | 1,99 € |
| `pack_soiree` | Pack Soirée | 0,99 € |
| `pack_coquin` | Pack Coquin | 0,99 € |
| `pack_politique` | Pack Politique & société | 0,99 € |
| `pack_foot` | Pack Foot | 0,99 € |
| `pack_tech` | Pack Tech & Indus | 0,99 € |

Pour chacun : nom, description d'une ligne, une option d'achat « Acheter » au prix indiqué, puis **Activer**.
C'est l'appli qui les traite comme des achats définitifs (rien à cocher pour ça).

Pourquoi ces prix : les neuf packs coûtent 12,91 € au total, l'illimité 5,99 €. Dès qu'un joueur veut plus de
deux gros packs, l'illimité est le meilleur choix, et c'est lui qui retire les pubs. Les packs servent surtout
de point de comparaison. Tu peux changer les prix à tout moment dans la Play Console, sans toucher à l'appli :
elle affiche ceux que Google lui renvoie. Un produit non créé s'affiche « Indisponible ».

Pour tester un achat sans payer : Play Console, Paramètres, **Test de licence**, ajoute ton adresse Gmail.

## 9. Pendant les 14 jours : vérifier sur ton téléphone

Avec la version installée depuis le Play Store :

- [ ] Écran Joueurs : crayon et corbeille sur chaque ligne ; la suppression demande une confirmation.
- [ ] « Qui joue ? » : la tuile « Modifier » permet de changer un nom ou une photo sans quitter l'écran.
- [ ] Sans achat, la partie se joue avec la « Sélection découverte » ; les niveaux ne sont pas proposés.
- [ ] Liste des thèmes : 26 thèmes avec un cadenas. Avant la première partie, aucun essai par pub n'est proposé.
- [ ] La première partie se lance sans aucune pub ni fenêtre de consentement.
- [ ] Après une partie : toucher un thème verrouillé, « L'essayer 12 h », vidéo marquée *Test Ad* regardée
      jusqu'au bout : le thème s'ouvre, coché, avec la mention « essai ». Vidéo fermée avant la fin : rien.
- [ ] L'accueil affiche « 3 parties » ; à 0, « Jouer » ouvre la réserve ; une pub vue en entier donne +2.
- [ ] En mode avion : la partie est offerte (2 fois par jour), puis un message demande de se reconnecter.
- [ ] Sur la carte d'un mot expliqué : le bouton « C'est quoi ? » ouvre l'explication. Pour l'essayer vite,
      prends un thème à l'essai avec une pub (Foot, Coquin, Soirée et Politique sont expliqués en entier).
- [ ] En fin de partie : « Que veulent dire ces mots ? » affiche les deux explications.
- [ ] La fenêtre de consentement de Google apparaît après la première partie.
- [ ] Une pub de test (marquée *Test Ad*) se lance et donne bien +2 parties quand elle est vue en entier.
- [ ] La Boutique affiche les dix prix ; un achat de test débloque le produit.
- [ ] Un pack acheté ouvre ses thèmes (cochés d'office) ; l'illimité ouvre tout et retire la réserve.
- [ ] Après désinstallation et réinstallation, « Restaurer mes achats » le retrouve.

Un point qui ne marche pas : dis-le-moi avec ce que tu vois à l'écran. Je corrige et je te renvoie un AAB à
déposer sur la même piste.

## 10. Demander l'accès à la production (jour 14)

Quand 12 testeurs sont inscrits depuis 14 jours, le **Tableau de bord** de l'appli affiche
**« Demander l'accès à la production »**. Trois séries de questions :

| Partie | Ce que Google demande | Quoi préparer |
|---|---|---|
| Ton test fermé | Comment tu as recruté les testeurs, s'ils ont utilisé toutes les fonctions, un résumé de leurs retours | Tes notes du groupe de testeurs |
| Ton jeu | Le public visé, ce qui rend le jeu unique, une estimation des installations la première année | Jeu de soirée pour adultes, hors ligne, 26 thèmes, explications des mots |
| Ta préparation | Ce que tu as changé grâce au test, pourquoi tu estimes l'appli prête | La liste des corrections faites pendant les 14 jours |

Réponds avec des faits précis. La réponse arrive en général sous 7 jours, par e-mail. Si Google demande de
prolonger le test, garde les mêmes testeurs inscrits et refais la demande.

## 11. Publier

1. **Tester et publier, Production, Créer une release** : promeus la version du test fermé.
2. Pays : France d'abord, ou tous les pays francophones (France, Belgique, Suisse, Canada, Luxembourg, Maroc…).
3. Envoie en examen. Compte quelques jours pour une première appli.

## 12. Juste après la sortie

- [ ] AdMob, Applications, Double Jeu : **associe l'appli à sa fiche Play Store**. Tant que ce n'est pas fait,
      la diffusion des pubs reste limitée.
- [ ] AdMob, Applications, onglet **app-ads.txt** : vérifie que le fichier de ton site est validé (compte 24 heures).
- [ ] AdMob examine alors l'appli (« état de préparation ») avant de diffuser les pubs sans limite.
- [ ] Rends le dépôt GitHub du jeu **privé** : il contient les mots des packs payants.
- [ ] Surveille les avis et les plantages (Play Console, « Qualité »).
- [ ] La bibliothèque publicitaire utilisée (Google Mobile Ads 25) est maintenue jusqu'au 30 juin 2027 et
      cessera d'être acceptée le 30 juin 2028. Une migration sera à prévoir d'ici là.

---

# Référence

## Fichiers

| Fichier | Rôle |
|---|---|
| `double-jeu-3.2.0.aab` | Version actuelle, avec des pubs **de test**. Peut servir à démarrer le test fermé. |
| `double-jeu-3.2.1.aab` | Version définitive avec tes identifiants AdMob : je la fabrique dès que tu me les envoies. |
| `double-jeu-3.2.0.apk` | Pour essayer sur ton téléphone, sans passer par le Play Store. |
| `double-jeu-release.jks` + son mot de passe | Clé de signature (déjà reçue). À garder précieusement, hors du dépôt. |
| `store/icone-512.png`, `store/banniere-1024x500.png`, `store/capture-1..7.png` | Visuels de la fiche. |
| `store/fiche-play-store.md` | Titre, descriptions et champs à copier. |
| `store/site/` | Page de confidentialité, `app-ads.txt`, page d'accueil du site. |

Dépôt GitHub : `adamlahlou05/Double-Jeu-Undercover-`, branche `main`. Chaque modification y relance les
tests, la compilation et un essai de l'APK sur émulateur (onglet Actions, artefact `android`).

**Compiler sans moi.** Dans le dépôt, remplace les deux valeurs de `android/monetization.properties`, puis
ajoute une seule fois la clé de signature (Settings, Secrets and variables, Actions) :

| Secret | Valeur |
|---|---|
| `DJ_KEYSTORE_BASE64` | le fichier `.jks` encodé en base64 |
| `DJ_KEYSTORE_PASSWORD` | le mot de passe du fichier `double-jeu-cle-de-signature.txt` |
| `DJ_KEY_ALIAS` | `doublejeu` |
| `DJ_KEY_PASSWORD` | le même mot de passe |

Sous Windows (PowerShell), pour copier le base64 dans le presse-papiers :
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("double-jeu-release.jks")) | Set-Clipboard`

Je ne peux pas déposer ces secrets moi-même : l'envoi de ta clé de signature m'est refusé.

**Ce qui est vérifié** : 45 tests de règles, 13 scénarios joués dans un navigateur avec une boutique simulée,
et l'APK installé et lancé automatiquement sur un émulateur Android 14. **Ce qui ne l'est pas** : les pubs, le
consentement, les paiements et l'appareil photo n'ont jamais tourné sur un vrai téléphone (étape 9).

## Comment l'appli gagne de l'argent

| | Sans payer | Un pack | Double Jeu illimité |
|---|---|---|---|
| Mots | Sélection découverte : 164 paires faciles, tous domaines mélangés | + les thèmes du pack, 3 niveaux | Les 26 thèmes, 2 596 paires, 3 niveaux |
| Choix des thèmes et du niveau | Non | Oui, pour ses thèmes | Oui |
| Parties | 3 offertes, puis 1 pub = 2 parties | Pareil | Illimitées |
| Publicité | Vidéos choisies par le joueur | Pareil | Aucune |

- Les 26 thèmes sont **tous visibles, avec un cadenas**. Toucher un thème verrouillé propose : l'essayer 12 h
  contre une pub, acheter son pack, ou tout débloquer.
- Les pubs sont uniquement des **vidéos avec récompense** : le joueur choisit de les lancer, et rien n'est
  donné s'il ferme avant la fin. Aucune bannière, aucune pub imposée.
- **Rien de publicitaire avant la fin de la première partie** : ni pub, ni essai par pub, ni fenêtre de consentement.
- Hors ligne ou sans pub disponible : 2 parties par jour restent offertes, pour ne jamais bloquer une soirée.
- Les achats sont définitifs et liés au compte Google (retrouvés après réinstallation).

Les 9 packs :

| Pack | Thèmes | Paires | Dont expliquées |
|---|---|---|---|
| Quotidien | Objets, À table, Animaux, Scènes du quotidien, Métiers, Marques & logos | 659 | 81 |
| Culture | Tour du monde, Histoire & mythes, Culture générale, Sciences & nature, Stars & personnages | 590 | 104 |
| Écrans & loisirs | Cinéma & séries, Musique, Sport, Loisirs & jeux, Tech & numérique | 536 | 29 |
| Esprit | Expressions, Idées & émotions, Insolite & humour, École & boulot, Red flags & débats | 476 | 87 |
| Soirée | Soirée | 60 | 60 |
| Coquin (adultes) | Coquin | 60 | 60 |
| Politique & société | Politique & société | 72 | 72 |
| Foot | Foot | 66 | 66 |
| Tech & Indus | Électricité & électronique | 77 | 0 |

**Explications des mots.** Sous le mot, un bouton « C'est quoi ? » ouvre deux phrases d'explication ; pour un
mot de niveau Corsé, elles s'affichent d'office (réglage dans Réglages). 559 paires sont expliquées ; les
autres n'affichent simplement pas le bouton. Pour en ajouter : colonnes « Explication A » et « Explication B »
du classeur `data/double-jeu-mots.xlsx`, puis `python3 scripts/import-words.py`.

## Référencement dans le Play Store

Le moteur du Play Store lit surtout le **titre**, la **description courte** et la **description complète**.
Il n'y a pas de champ « mots-clés ».

- Le mot « Undercover » est dans le titre et les deux descriptions ; « Mr. White », « imposteur », « intrus »,
  « jeu de soirée », « jeu entre amis » dans les descriptions.
- Le titre est limité à 30 caractères, la description courte à 80, la complète à 4 000.
- Interdits dans le titre : « gratuit », « n° 1 », « sans pub », émojis, majuscules en série.
- Ne cite pas d'autre application. « Undercover » est aussi le nom d'un jeu existant : s'il y a un refus,
  utilise le titre « sans risque » de `store/fiche-play-store.md`.
- Ce qui pèse ensuite : le nombre d'installations, la note, la part de gens qui gardent l'appli. Demande à tes
  12 testeurs et à tes amis de noter l'appli la semaine de la sortie.

## iPhone et App Store

**Faisable sans refaire le jeu, mais pas en deux heures, et pas depuis ici.**

| Point | Réponse |
|---|---|
| Coût | Apple Developer Program : 99 USD par an (converti en euros à l'inscription). Sans abonnement actif, l'appli est retirée de l'App Store. |
| Matériel | Un Mac avec Xcode pour compiler et envoyer l'appli : ton MacBook, s'il accepte une version récente de macOS. |
| Ce qui est réutilisé | Tout le dossier `web/` : règles, écrans, mots, boutique. |
| Ce qu'il faut écrire | Une coque iOS en Swift, l'équivalent de `android/` : affichage de la page, sauvegarde, appareil photo, pubs (Google Mobile Ads pour iOS), achats (StoreKit), demande d'autorisation de suivi publicitaire. |
| Ce que je peux faire | Écrire cette coque et le guide Xcode. Je ne peux ni la compiler ni l'essayer : cet environnement n'a pas de Mac. Les premiers essais et corrections se feraient avec toi. |
| Risques | Apple refuse parfois les applis qui ne sont « qu'une page web » ; l'appareil photo, les achats et le jeu hors ligne jouent en ta faveur. La validation est plus stricte que chez Google. |
| Achats | Obligatoirement par Apple, avec les mêmes produits à recréer dans App Store Connect. |

Mon conseil : sors d'abord sur le Play Store, regarde si le jeu prend, puis on fait iOS dans un second temps.

## Régler le modèle économique

Les constantes sont en haut de `web/js/shop.js` ; la sélection offerte se règle dans le classeur des mots :

| Fichier | Constante | Valeur | Effet |
|---|---|---|---|
| `web/js/shop.js` | `START` | 3 | Parties offertes à l'installation |
| `web/js/shop.js` | `REWARD` | 2 | Parties gagnées par pub vue jusqu'au bout |
| `web/js/shop.js` | `MAX` | 10 | Réserve maximale |
| `web/js/shop.js` | `RESCUE_PER_DAY` | 2 | Parties offertes par 24 h quand aucune pub n'est disponible |
| `web/js/shop.js` | `TRIAL_HOURS` | 12 | Durée d'essai d'un thème ouvert par une pub |
| `data/double-jeu-mots.xlsx` | colonne « Offert » | 164 « Oui » | Paires de la sélection découverte (à régénérer avec `scripts/import-words.py`) |

Pour rendre le jeu plus généreux ou plus serré, ce sont les seuls chiffres à toucher. Les tests vérifient les
valeurs actuelles : après un changement, lance `npm test` et corrige les deux ou trois nombres attendus.

Pour ajouter un pack : ses lignes dans le classeur, le thème et le pack déclarés dans `scripts/import-words.py`,
une ligne dans `PACKS` (`shop.js`), l'identifiant dans `Monetization.java`, et le produit dans la Play Console.

## Sécurité : ce qui est en place

- La page du jeu n'exécute que ses propres fichiers et ne contacte aucun serveur. Un nom, un mot ou une
  sauvegarde importée ne peut pas y glisser du code.
- Sauvegarde importée : photos et identifiants contrôlés ; ce qui n'a pas la bonne forme est écarté.
- Les joueurs et leurs photos ne partent plus dans la sauvegarde Google du téléphone. Conséquence : une
  réinstallation repart de zéro (les achats, eux, reviennent). Le transfert direct d'un téléphone à l'autre
  reste possible, ainsi que Réglages, Exporter puis Importer.
- Trafic non chiffré interdit ; seules les pages embarquées dans l'appli peuvent s'afficher.
- La clé de signature n'est ni dans le dépôt ni sur GitHub.

## Limites à connaître

- La réserve et les essais sont enregistrés sur le téléphone : effacer les données de l'appli les remet à
  zéro (3 parties). Les achats sont liés au compte Google et reviennent toujours.
- Les achats sont vérifiés par Google Play sur le téléphone, sans serveur. Quelqu'un qui modifie l'appli ou
  son téléphone peut contourner un achat ; l'empêcher demanderait un serveur de vérification. Pour un jeu à
  quelques euros, ce n'est pas rentable au départ.
- Le dépôt GitHub est **public** : tous les mots, packs payants compris, y sont lisibles. Passe-le en privé
  (Settings, General, Danger Zone, Change visibility) avant la sortie.
- Sur un téléphone sans services Google, il n'y a ni pub ni achat : seules la sélection découverte et les
  parties de secours restent.
- Explications sur des personnes réelles (Foot, Stars & personnages, Politique & société) : relues par
  sondage, pas vérifiées une à une. Clubs et fonctions changent : à relire avant chaque mise à jour.
- Marques & logos : les marques sont citées comme mots à deviner, sans aucun logo affiché. Si une marque
  réclame, il suffit de retirer sa ligne du classeur.
- Tes amis qui ont la 2.1 : après mise à jour, leurs joueurs et scores restent, mais les thèmes passent sous
  cadenas comme pour tout le monde.

## Sources

- [Exigences de test pour les nouveaux comptes personnels](https://support.google.com/googleplay/android-developer/answer/14151465?hl=fr) (Aide Play Console)
- [Choisir un type de compte de développeur](https://support.google.com/googleplay/android-developer/answer/13634885) (Aide Play Console)
- [Configurer une application dans AdMob](https://support.google.com/admob/answer/9989980?hl=fr)
- [Créer un bloc d'annonces avec récompense](https://support.google.com/admob/answer/7311747?hl=fr)
- [Validation du compte AdMob](https://support.google.com/admob/answer/9905175?hl=fr)
- [Créer un message lié aux réglementations européennes](https://support.google.com/admob/answer/10113207?hl=fr)
- [Configurer un fichier app-ads.txt](https://support.google.com/admob/answer/9363762?hl=fr)
