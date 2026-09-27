# Khadidja Boutique

Boutique statique de robes pour femme, publiée avec GitHub Pages. Le catalogue, le panier et la préparation de commande se trouvent dans `store.js`. Le panier est conservé dans le navigateur du client.

Les deux robes sont affichées à 23 900 DA. Le panier reste dans le navigateur du client. Le formulaire en dinars calcule la livraison selon la grille des 58 wilayas fournie par le propriétaire le 27 septembre 2026 (`shipping-data.js`). Un tarif bureau à 0 signifie que le retrait en bureau n'est pas proposé. Le paiement en dinars s'effectue à la livraison. Le formulaire prépare un e-mail à `youcefkhaldi11@hotmail.com` : le client doit l'envoyer depuis sa messagerie pour transmettre sa commande. Il n'y a pas encore de traitement serveur ni de confirmation automatique.

Les devises EUR et USD utilisent des taux d'affichage indicatifs datés du 26 septembre 2026 (`pro.js`). Le montant final, la livraison internationale et le paiement par carte ne sont pas actifs. Le panneau Stripe est volontairement désactivé tant que le compte marchand et un serveur de paiement ne sont pas connectés ; aucune donnée de carte n'est recueillie. Les préférences FR/EN/AR et DZD/EUR/USD sont conservées localement dans le navigateur. L'arabe utilise la mise en page RTL.
