# Architecture

## Prototype (ce dépôt)

Application web statique, sans serveur applicatif ni étape de compilation : GitHub Pages sert les fichiers tels quels.

```
index.html
  ├── assets/vendor/leaflet          Carte
  ├── assets/vendor/topojson         Décodage du fond « pays du monde »
  ├── assets/data/monde.js           window.WORLD : pays du monde (TopoJSON, Natural Earth 1:50 m)
  ├── assets/data/patribati-data.js  window.PATRIBATI : biens, assiettes, emprises (généré)
  └── assets/js/
        config.js   PB.PROFILES, PB.MODULES, seuils de zoom, listes
        core.js     PB.DATA, règles métier, PB.THEMES, droits, persistance locale, journal, exports
        map.js      PB.M : carte, regroupements, couches, fonds
        fiche.js    module Carte : colonne gauche, fiche du bien, saisies, ajout
        views.js    PB.PAGES : inventaire, litiges, tableau de bord, journal
        app.js      accueil, bandeau, navigation, recherche, routage (#carte, #bien/12…)
```

Les données sont chargées par des balises `<script>` plutôt que par `fetch()` : la démo s'ouvre ainsi aussi bien en ligne que par un double-clic sur `index.html`, sans serveur.

**Chaîne de données** : base PostGIS → `patrimoine.export_dashboard()` → `data/patribati-base.json` → `tools/build_data.py` (ajout des visites, des assiettes et des emprises depuis `data/`) → `assets/data/patribati-data.js`.

**État de l'interface** : objet `PB.S` (module actif, thématique, périmètre, bien sélectionné, onglet, fond). Toute modification appelle `PB.refresh()`, qui redessine la colonne gauche, la carte, la fiche et, le cas échéant, le module affiché.

**Persistance** : les biens modifiés et le journal sont enregistrés dans `localStorage` (clé `patribati.demo.v1`). Le profil choisi est gardé pour la session (`sessionStorage`).

## Cible de production

```
                 ┌─────────────────────────────┐
 Navigateur ───▶ │ Nginx (TLS, fichiers web)   │
 (agents SOGEPA, │   ├── application web        │
  ministères)    │   ├── /api  ──▶ API FastAPI  │──▶ PostgreSQL 16 + PostGIS 3
                 │   ├── /tuiles ─▶ Martin       │──▶   (schémas ref, patrimoine)
                 │   └── /auth ──▶ Keycloak     │
                 └─────────────────────────────┘
                              │
                              └──▶ MinIO (documents, photos)
```

| Brique | Rôle |
|---|---|
| PostgreSQL / PostGIS | Référentiel unique : biens, foncier, occupation, visites, travaux, litiges, documents, journal ([database/](../database)) |
| API REST (FastAPI ou PostgREST) | Lecture et écriture contrôlées, contrat [OpenAPI](../api/openapi.yaml), exports |
| Martin | Tuiles vectorielles des biens, assiettes et emprises, directement depuis PostGIS |
| Keycloak | Comptes, rôles, authentification unique (OpenID Connect) |
| MinIO | Stockage des pièces et des photos, compatible S3 |
| Application web | La même interface que ce prototype, branchée sur l'API au lieu du fichier de données |
| Collecte terrain | Formulaire de visite hors ligne (application web progressive), ou ODK Collect / KoboToolbox |

Toutes ces briques sont open source et peuvent être hébergées sur une infrastructure souveraine.
