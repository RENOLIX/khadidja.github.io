# Envoi Yalidine sécurisé

Déployer depuis un environnement connecté au projet Firebase :

```bash
firebase functions:secrets:set YALIDINE_API_ID
firebase functions:secrets:set YALIDINE_API_TOKEN
firebase functions:deploy --only functions:createYalidineShipment
```

La fonction utilise `YALIDINE_FROM_WILAYA=Alger` par défaut. Les secrets restent dans Secret Manager et ne sont jamais envoyés au navigateur.
