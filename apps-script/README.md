# Relais Yalidine sur Firebase Spark

Le site statique ne reçoit jamais les identifiants Yalidine. Le projet Google Apps Script « Khadidja Boutique — Yalidine » exécute `Code.gs` sous le compte propriétaire.

## Configuration

1. Dans **Paramètres du projet → Propriétés du script**, définir `YALIDINE_API_ID` et `YALIDINE_API_TOKEN`.
2. Déployer une **Application Web** exécutée en tant que propriétaire, accessible à **Tout le monde**. Le script exige ensuite un jeton Firebase valide et le rôle `admin` dans Firestore.
3. Reporter l’URL `/exec` du déploiement dans le module `KB.yalidine` de `firebase-client.js`.
4. Publier `firestore.rules` avant d’utiliser l’envoi afin de permettre à l’admin d’enregistrer le suivi.

Le relais accepte uniquement les commandes DZD payées à la livraison, nouvelles ou injoignables. Le départ est Alger. Dans l’admin, une livraison en bureau affiche les villes et les agences récupérées depuis l’API Yalidine. Le choix est enregistré dans la commande avant l’envoi. Le poids et les dimensions sont estimés automatiquement à partir du nombre de robes ; il faut contrôler les valeurs réelles dans Yalidine si le colis est atypique. Un verrou et une propriété par commande bloquent les doubles envois. En cas de réponse incertaine, vérifier la commande dans Yalidine avant toute nouvelle tentative.

Les frais de livraison sont déjà inclus dans `order.total`; le colis est marqué `freeshipping` chez Yalidine afin que le destinataire ne paie pas deux fois les frais.

Le formulaire client charge les communes livrables depuis `/v1/communes/`, filtrées par wilaya. Le nom officiel et l’identifiant sont enregistrés dans la commande. L’admin peut choisir la commune exacte pour une ancienne commande. Les bureaux restent choisis dans l’admin pour une livraison en bureau. Seules les listes géographiques sont conservées temporairement ; aucune commande ni aucun jeton de connexion n’est mis dans ce cache.
