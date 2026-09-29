# Khadidja Boutique

Boutique publiée sur GitHub Pages à [khadidja.shop](https://khadidja.shop). Les produits et les commandes proviennent de Firestore ; l'administration se trouve sous `/admin/`. Le panier et les préférences de langue/devise sont conservés dans le navigateur du client.

## Catalogue et stock

`catalog-data.js` définit cinq catégories : robes de soirée, bijoux et accessoires, chaussures et sacs, robes grande taille et sous-vêtements. Les quatre dernières ont leur propre page et restent vides jusqu'à l'ajout de produits dans l'administration. Les photos de catégories dans `assets/category-*.jpg` sont des visuels d'illustration créés pour la navigation ; elles ne représentent pas des articles en vente. Un ancien produit sans champ `category` appartient par défaut aux robes de soirée.

Dans l'administration, chaque produit possède une catégorie, des tailles (34 à 58 ou TU pour taille unique), plusieurs photos et un stock entier. Le tableau de bord et la liste des produits signalent les stocks inconnus, nuls ou de 1 à 5 articles. Les anciens produits gardent leur quantité inconnue jusqu'à ce qu'elle soit renseignée. **Le stock est mis à jour manuellement après les commandes** ; le site limite le panier à la quantité enregistrée, mais ne réserve ni ne décrémente automatiquement les articles.

## Commandes et livraison

Le paiement en dinars s'effectue à la livraison. Le formulaire crée la commande dans Firestore. Les communes proviennent de `communes-data.js` et apparaissent immédiatement ; les tarifs de livraison sont récupérés auprès de Yalidine via le relais Apps Script décrit dans `apps-script/README.md`. Les commandes peuvent être consultées et modifiées dans l'administration.

Les devises EUR et USD utilisent les taux boutique 1 EUR = 280 DA et 1 USD = 250 DA. Le paiement international par Stripe reste indisponible jusqu'à la connexion du compte marchand et d'un serveur de paiement.
