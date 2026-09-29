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

## Tarifs de livraison du compte

Le mode public `fees` lit `/v1/fees/?from_wilaya_id=16&to_wilaya_id=…` avec les identifiants conservés dans les propriétés du script. L’ancien endpoint `deliveryfees` renvoie HTTP 410. Le relais ne transmet au navigateur que les tarifs Express `express_home` et `express_desk` par commune, leur source et leur date de lecture. Les montants sont conservés au maximum 15 minutes côté serveur pour limiter les appels API.

Le checkout charge les communes et les tarifs en parallèle, puis calcule le montant à partir de la commune et du mode sélectionnés. Une valeur `null` signifie indisponible. Si la lecture échoue, les anciens tarifs manuels ne sont pas utilisés et la confirmation est désactivée jusqu’à une nouvelle lecture réussie. La commande conserve son montant et la provenance du tarif dans `shippingRate`; les commandes déjà enregistrées ne sont pas recalculées.
