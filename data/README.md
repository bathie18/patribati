# Données de démonstration

**Toutes les données sont fictives.** Biens, titres fonciers, NICAD, montants, occupants, entreprises et litiges ont été générés pour la démonstration ; les localisations sont approximatives et les emprises sont des rectangles schématiques.

Jeu de démonstration : 53 biens dans 26 pays, 42 assiettes foncières, 61 emprises bâties, 46 titres d'occupation, 86 visites, 21 chantiers, 13 litiges (11 ouverts), 307 documents et photos.

## Fichiers

| Fichier | Contenu |
|---|---|
| `patribati-base.json` | Export de la base PostGIS (`patrimoine.export_dashboard()`) : un objet par bien avec ses baux, travaux, litiges et chronologies, documents et photos |
| `geojson/biens.geojson` | Biens (points), avec les champs de la vue `v_bien_situation` |
| `geojson/assiettes_foncieres.geojson` | Assiettes foncières (polygones) : titre foncier, NICAD, superficie |
| `geojson/batiments.geojson` | Emprises bâties (polygones), rattachées à un bien |
| `geojson/litiges.geojson` | Litiges (points sur le bien concerné) |
| `geojson/alertes.geojson` | Alertes de gestion calculées à la date de l'export |
| `geojson/synthese_pays.geojson` | Synthèse par pays |
| `csv/*.csv` | Tables liées : titres d'occupation, visites, travaux, événements de litige, documents, recouvrement des loyers, inventaire par affectataire (séparateur `;`, UTF-8) |

Système de coordonnées : WGS 84 (EPSG:4326).

## Reconstruire les données de l'application

```bash
python3 tools/build_data.py                 # date de référence par défaut : 2026-10-10
python3 tools/build_data.py --date 2026-11-15
```

Le script lit `patribati-base.json`, ajoute l'historique des visites (`csv/visites.csv`), les assiettes et les emprises (`geojson/`), et écrit `assets/data/patribati-data.js`.
