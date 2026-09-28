# Relais Yalidine sur Firebase Spark

Le site statique ne reçoit jamais les identifiants Yalidine. Le projet Google Apps Script « Khadidja Boutique — Yalidine » exécute `Code.gs` sous le compte propriétaire.

## Configuration

1. Dans **Paramètres du projet → Propriétés du script**, définir `YALIDINE_API_ID` et `YALIDINE_API_TOKEN`.
2. Déployer une **Application Web** exécutée en tant que propriétaire, accessible à **Tout le monde**. Le script exige ensuite un jeton Firebase valide et le rôle `admin` dans Firestore.
3. Reporter l’URL `/exec` du déploiement dans `YALIDINE_RELAY_URL` de `admin/admin.js`.
4. Publier `firestore.rules` avant d’utiliser l’envoi afin de permettre à l’admin d’enregistrer le suivi.

Le relais accepte uniquement les commandes DZD payées à la livraison, nouvelles ou injoignables. Le départ est Alger. Pour une livraison en bureau, saisir l’identifiant numérique du bureau Yalidine dans la page de commande. Un verrou et une propriété par commande bloquent les doubles envois. En cas de réponse incertaine, vérifier la commande dans Yalidine avant toute nouvelle tentative.

Les frais de livraison sont déjà inclus dans `order.total`; le colis est marqué `freeshipping` chez Yalidine afin que le destinataire ne paie pas deux fois les frais.
