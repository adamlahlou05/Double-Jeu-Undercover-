# Publier Double Jeu sur le Play Store

Version concernée : **3.0.0** (identifiant `io.github.adamlahlou05.doublejeu`).

## Où on en est

| Fait | Reste à faire par toi |
|---|---|
| Jeu, boutique, pubs avec récompense, achats : intégrés | Essayer l'APK sur ton téléphone (étape 1) |
| Fichier AAB signé, prêt pour le Play Store | Créer ton compte AdMob et tes identifiants (étapes 3 et 4) |
| Icône, bannière, 7 captures, textes de la fiche | Remplir la Play Console (étapes 5 à 7) |
| Page de confidentialité rédigée | La mettre en ligne (étape 2) |
| Guide App Store (étape 11) | Test fermé : 12 testeurs pendant 14 jours (étape 8) |

**Ce qui n'a pas pu être vérifié de mon côté** : les pubs et les paiements n'ont jamais tourné sur un vrai
téléphone. Le code compile, les règles sont testées, mais le premier essai réel, c'est toi (étapes 1 et 8).

## Fichiers

| Fichier | Rôle |
|---|---|
| `double-jeu-3.0.0.aab` | À envoyer au Play Store. Pubs **de test** tant que l'étape 4 n'est pas faite. |
| `double-jeu-3.0.0.apk` | Pour essayer sur ton téléphone, sans passer par le Play Store. |
| `double-jeu-release.jks` + son mot de passe | Clé de signature (déjà reçue). À garder précieusement, hors du dépôt. |
| `store/icone-512.png`, `store/banniere-1024x500.png`, `store/capture-1..7.png` | Visuels de la fiche. |
| `store/fiche-play-store.md` | Titre, descriptions et champs à copier. |
| `store/site/` | Page de confidentialité, `app-ads.txt`, page d'accueil du site. |

---

## 1. Essayer l'APK (10 minutes)

Installe `double-jeu-3.0.0.apk` par-dessus ta version actuelle (les joueurs et scores sont conservés).

- [ ] La première partie se lance sans aucune pub ni fenêtre de consentement.
- [ ] L'accueil affiche « 3 parties » en haut à droite ; le compteur baisse à chaque partie.
- [ ] À 0, « Jouer » ouvre la feuille de réserve. « Regarder une pub » affiche une vidéo marquée *Test Ad*.
- [ ] Vidéo regardée jusqu'au bout : +2 parties, la partie démarre. Vidéo fermée avant la fin : rien.
- [ ] En mode avion : la partie est offerte (2 fois par jour), puis un message demande de se reconnecter.
- [ ] Dans la Boutique, les prix affichent « Indisponible » : normal tant que l'étape 7 n'est pas faite.
- [ ] Nouveau joueur : le bouton photo est en haut, sur l'avatar.
- [ ] Réglages de partie : « Corsé » est décoché.

Un point qui ne marche pas : dis-le-moi avec ce que tu vois à l'écran.

## 2. Mettre en ligne le petit site (15 minutes)

Google exige une adresse publique pour la politique de confidentialité, et AdMob te demandera un fichier
`app-ads.txt` à la racine de ton site.

1. Sur GitHub, crée un dépôt **public** nommé exactement `adamlahlou05.github.io`.
2. Dépose dedans les trois fichiers de `store/site/` : `index.html`, `confidentialite.html`, `app-ads.txt`.
3. Dans `confidentialite.html`, remplace les deux `ADRESSE-A-COMPLETER` par ton adresse e-mail de contact.
4. Réglages du dépôt, « Pages » : source = branche `main`, dossier racine.
5. Vérifie que `https://adamlahlou05.github.io/confidentialite.html` s'ouvre.

Tes deux adresses pour la suite :

- Site web : `https://adamlahlou05.github.io`
- Confidentialité : `https://adamlahlou05.github.io/confidentialite.html`

## 3. AdMob : compte, appli, bloc d'annonces (30 minutes)

Les intitulés peuvent varier légèrement dans la console.

1. Va sur `admob.google.com`, connecte-toi avec le compte Google de ta Play Console, crée le compte
   (pays : France, devise : EUR) et renseigne les informations de paiement.
2. **Applications, Ajouter une application** : Android, « non, elle n'est pas encore sur une plateforme »,
   nom « Double Jeu ». Note l'**ID de l'application** : `ca-app-pub-…~…`.
3. Dans cette appli : **Blocs d'annonces, Ajouter, Avec récompense**. Nom « Parties ». Garde les réglages
   par défaut. Note l'**ID du bloc** : `ca-app-pub-…/…`.
4. **Confidentialité et messages, Réglementations européennes** : crée un message pour l'appli Double Jeu,
   en français, avec les boutons « Autoriser » et « Ne pas autoriser », puis **publie-le**.
   Sans ce message, aucune pub ne s'affiche en Europe : le jeu donne alors seulement les parties de secours.
5. **Paramètres, Appareils de test** : ajoute ton téléphone. Ne clique jamais sur une vraie pub de ta propre
   appli : Google suspend les comptes pour ça.
6. Ton identifiant d'éditeur (`pub-…`, dans Paramètres, Compte) : mets-le dans `app-ads.txt` sur ton site,
   à la place de `pub-0000000000000000`.

## 4. Mettre tes identifiants dans l'appli

Tant que ce n'est pas fait, l'appli affiche des pubs de test qui ne rapportent rien.

**Le plus simple** : envoie-moi ici les deux identifiants de l'étape 3 (ils ne sont pas secrets).
Je recompile et je te renvoie l'AAB définitif.

**En autonomie, avec GitHub** :

1. Dans le dépôt, ouvre `android/monetization.properties`, remplace les deux valeurs, valide.
2. Une seule fois, ajoute la clé de signature : Settings, Secrets and variables, Actions, quatre secrets :

   | Secret | Valeur |
   |---|---|
   | `DJ_KEYSTORE_BASE64` | le fichier `.jks` encodé en base64 (commande ci-dessous) |
   | `DJ_KEYSTORE_PASSWORD` | le mot de passe du fichier `double-jeu-cle-de-signature.txt` |
   | `DJ_KEY_ALIAS` | `doublejeu` |
   | `DJ_KEY_PASSWORD` | le même mot de passe |

   Sous Windows (PowerShell), pour copier le base64 dans le presse-papiers :
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("double-jeu-release.jks")) | Set-Clipboard`
3. Onglet Actions : la compilation se lance à chaque modification. À la fin, télécharge l'artefact
   `android` : il contient l'AAB et l'APK.

Je n'ai pas pu déposer ces secrets moi-même : l'envoi de ta clé de signature m'est refusé, c'est à toi de le faire.

## 5. Play Console : créer l'appli et envoyer une première version

1. **Créer une application** : nom du tableau ci-dessous, langue Français (France), « Jeu », « Gratuite ».
2. **Tests, Tests internes, Créer une release** : envoie `double-jeu-3.0.0.aab`.
   - À la question sur la signature, accepte **la signature d'application par Google Play** (choix par défaut).
     Ta clé `.jks` devient la « clé d'importation » : il la faudra pour chaque mise à jour.
   - Ajoute ton adresse Gmail à la liste des testeurs, ouvre le lien de participation sur ton téléphone.
3. Conséquence pour tes amis : la version du Play Store n'a pas la même signature que l'APK installé à la
   main. Ils devront exporter leur sauvegarde (Réglages, Exporter), désinstaller, installer depuis le Play
   Store, puis importer.

Envoyer cette première version tôt est utile : les produits à vendre (étape 7) ne peuvent être créés qu'après.

## 6. Fiche et déclarations

**Fiche principale** : tout est dans `store/fiche-play-store.md` (titre, descriptions, visuels, catégorie).

**Contenu de l'application** (menu « Règles », « Contenu de l'application ») :

| Rubrique | Réponse |
|---|---|
| Règles de confidentialité | `https://adamlahlou05.github.io/confidentialite.html` |
| Annonces | Oui, l'appli contient des annonces |
| Accès à l'appli | Toutes les fonctionnalités sont accessibles sans identifiant |
| Classification du contenu | Questionnaire, catégorie Jeu. Pas de violence, pas de contenu sexuel, pas de jeux d'argent. **Oui** aux références à l'alcool (pack Soirée). Les joueurs n'échangent rien en ligne. |
| Public cible | **18 ans et plus** uniquement. Avec de la publicité et un pack Soirée, c'est le choix qui évite les règles « Familles ». |
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

## 7. Produits à vendre

Menu **Monétiser avec Play, Produits, Produits ponctuels** (ancien nom : « produits intégrés à l'application »). Les identifiants doivent être **exactement** ceux-ci
(ils ne se changent plus ensuite) :

| Identifiant | Nom affiché | Prix conseillé |
|---|---|---|
| `premium` | Double Jeu illimité | 4,99 € |
| `pack_soiree` | Pack Soirée | 1,99 € |
| `pack_politique` | Pack Politique & société | 1,99 € |
| `pack_foot` | Pack Foot | 1,99 € |

Pour chacun : nom, description d'une ligne, une option d'achat « Acheter » au prix indiqué, puis **Activer**.
C'est l'appli qui les traite comme des achats définitifs (rien à cocher pour ça).
Pourquoi ces prix : l'illimité coûte moins que trois packs, donc il se vend ; à 4,99 €, il vaut plusieurs
centaines de pubs regardées. Tu peux les changer à tout moment sans toucher à l'appli.

Pour tester un achat sans payer : Play Console, Paramètres, **Test de licence**, ajoute ton adresse Gmail.

## 8. Tests : interne, puis fermé

1. **Test interne** (toi seul, disponible en quelques minutes) : refais la liste de l'étape 1 avec la version
   du Play Store, plus :
   - [ ] La fenêtre de consentement de Google apparaît après la première partie.
   - [ ] La Boutique affiche les quatre prix ; un achat de test débloque le produit.
   - [ ] Après désinstallation et réinstallation, « Restaurer mes achats » le retrouve.
2. **Test fermé** : obligatoire si ton compte personnel a été créé après le 13 novembre 2023. Il faut
   **12 testeurs inscrits pendant 14 jours d'affilée** avant de pouvoir demander l'accès à la production.
   - Crée la piste « Test fermé », envoie le même AAB, ajoute les adresses Gmail de 12 personnes (prévois-en 15).
   - Envoie-leur le lien de participation : ils doivent l'accepter puis installer l'appli.
   - Ne remplace pas la version pendant ces 14 jours, sauf bug bloquant.
3. Au bout de 14 jours : **Demander l'accès à la production** et répondre au questionnaire (comment tu as
   recruté les testeurs, ce qu'ils ont remonté, ce que tu as corrigé).

## 9. Publier

1. **Production, Créer une release** : promeus la version du test fermé.
2. Pays : France d'abord, ou tous les pays francophones (France, Belgique, Suisse, Canada, Luxembourg, Maroc…).
3. Envoie en examen. Compte quelques jours pour une première appli.

## 10. Après la sortie

- [ ] AdMob, Applications : associe l'appli à sa fiche Play Store. AdMob vérifie alors ton `app-ads.txt`.
- [ ] Play Console, fiche : renseigne le site web, pour qu'AdMob trouve `app-ads.txt`.
- [ ] Surveille les avis et les plantages (Play Console, « Qualité »).
- [ ] La bibliothèque publicitaire utilisée (Google Mobile Ads 25) est maintenue jusqu'au 30 juin 2027 et
      cessera d'être acceptée le 30 juin 2028. Une migration vers la nouvelle version sera à prévoir d'ici là.
- [ ] Pense à rendre le dépôt GitHub du jeu **privé** : il est public et contient les mots des packs payants.

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

## 11. iPhone et App Store

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

Tout est dans `web/js/shop.js`, en haut du fichier :

| Constante | Valeur | Effet |
|---|---|---|
| `START` | 3 | Parties offertes à l'installation |
| `REWARD` | 2 | Parties gagnées par pub vue jusqu'au bout |
| `MAX` | 10 | Réserve maximale |
| `RESCUE_PER_DAY` | 2 | Parties offertes par 24 h quand aucune pub n'est disponible |

Pour ajouter un pack : un thème dans `web/js/words/premium.js` avec son champ `pack`, une ligne dans `PACKS`
(`shop.js`), l'identifiant dans `Monetization.java`, et le produit dans la Play Console.

## Limites à connaître

- La réserve est enregistrée sur le téléphone : effacer les données de l'appli la remet à 3. Les achats, eux,
  sont liés au compte Google et reviennent toujours.
- Les achats sont vérifiés par Google Play sur le téléphone, sans serveur. C'est suffisant pour démarrer.
- Sur un téléphone sans services Google, il n'y a ni pub ni achat : seules les parties de secours restent.
