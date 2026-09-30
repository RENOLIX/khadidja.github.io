# Khadidja Boutique

Boutique publiée sur GitHub Pages à [khadidja.shop](https://khadidja.shop). Les produits et les commandes proviennent de Firestore ; l'administration se trouve sous `/admin/`. Le panier et les préférences de langue/devise sont conservés dans le navigateur du client.

## Catalogue et stock

`catalog-data.js` définit cinq catégories : robes de soirée, bijoux et accessoires, chaussures et sacs, robes grande taille et sous-vêtements. Les quatre dernières ont leur propre page et restent vides jusqu'à l'ajout de produits dans l'administration. Les photos de catégories dans `assets/category-*.jpg` sont des visuels d'illustration créés pour la navigation ; elles ne représentent pas des articles en vente. Un ancien produit sans champ `category` appartient par défaut aux robes de soirée.

Dans l'administration, chaque produit possède une catégorie, des tailles (34 à 58 ou TU pour taille unique), plusieurs photos et un stock entier. Le tableau de bord et la liste des produits signalent les stocks inconnus, nuls ou de 1 à 5 articles. Les anciens produits gardent leur quantité inconnue jusqu'à ce qu'elle soit renseignée. **Le stock est mis à jour manuellement après les commandes** ; le site limite le panier à la quantité enregistrée, mais ne réserve ni ne décrémente automatiquement les articles.

## Commandes et livraison

Le paiement en dinars s'effectue à la livraison. Le formulaire crée la commande dans Firestore. Les communes proviennent de `communes-data.js` et apparaissent immédiatement ; les tarifs de livraison sont récupérés auprès de Yalidine via le relais Apps Script décrit dans `apps-script/README.md`. Les commandes peuvent être consultées et modifiées dans l'administration.

Les devises EUR et USD utilisent les taux boutique 1 EUR = 280 DA et 1 USD = 250 DA. Le paiement international par Stripe reste indisponible jusqu'à la connexion du compte marchand et d'un serveur de paiement.

## Meta Pixel

Le pixel `1385772229937734` est chargé uniquement après l'accord publicitaire dans le bandeau cookies. Les anciens choix de cookies sont renouvelés avec la version 2 du consentement. Aucun pixel ni image `noscript` ne contacte Meta avant cet accord. Le refus n'empêche pas de commander ; le retrait du consentement bloque les événements suivants.

Événements : `PageView` une fois par page, `ViewContent` sur une fiche produit, `AddToCart` lors d'une augmentation effective du panier, `InitiateCheckout` sur le formulaire avec des articles, et `Purchase` sur `/merci/` seulement après une commande Firestore enregistrée. `Purchase` transmet le total en DZD, livraison incluse, les identifiants/quantités des articles et un `eventID` dérivé de la référence pour éviter les doublons. Aucun nom, numéro de téléphone ou adresse n'est envoyé par notre code. L'achat n'est pas retransmis lors d'un rechargement de la page de remerciement. Les paiements EUR/USD inactifs ne produisent pas de `Purchase`.

Test local : `node scripts/test-meta-pixel.js`. Dans le Gestionnaire d'événements Meta, ouvrez « Tester les événements », acceptez les cookies publicitaires sur le site, puis parcourez une fiche produit, le panier et une commande réelle. Ne créez pas de fausse commande de production seulement pour tester le pixel.
