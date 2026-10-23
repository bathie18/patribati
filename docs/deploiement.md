# Déploiement

## 1. Démonstration sur GitHub Pages

### Créer le dépôt et pousser les fichiers

Sur github.com, compte `bathie18` : *New repository*, nom **`patribati`**, visibilité **Public**, sans README (le dépôt en fournit un).

Puis, depuis le dossier du projet :

```bash
git init -b main
git add .
git commit -m "PatriBâti : prototype web de démonstration"
git remote add origin https://github.com/bathie18/patribati.git
git push -u origin main
```

Sans ligne de commande : sur la page du dépôt vide, *uploading an existing file*, puis glisser-déposer **le contenu** du dossier (pas le dossier lui-même), y compris le fichier caché `.nojekyll`.

### Activer Pages

*Settings → Pages → Build and deployment → Source : Deploy from a branch*, branche **`main`**, dossier **`/ (root)`**, *Save*.
Après une à deux minutes : **https://bathie18.github.io/patribati/**.

### Mettre à jour

Chaque `git push` sur `main` republie le site. Pour changer les données : modifier `data/`, lancer `python3 tools/build_data.py`, valider et pousser.

### Vérifications

- La page d'accueil s'affiche avec les cinq profils.
- Dans la carte, le fond OpenStreetMap apparaît en zoomant sur Dakar (connexion internet requise) ; le fond « Simplifié » fonctionne sans connexion.
- `…/patribati/#bien/2` ouvre directement une fiche.

## 2. Base PostGIS (facultatif, poste ou serveur)

```bash
cd database
./installer.sh          # Linux / macOS ; installer.bat sous Windows
```

Le script crée la base `patribati` sur `localhost:5432` avec le compte `postgres` (à adapter dans le fichier), puis les schémas, nomenclatures, tables, déclencheurs, vues, rôles et le jeu de démonstration. Testé sur PostgreSQL 16 et PostGIS 3.4. Pour repartir de zéro : `99_supprimer_base.sql`.

Pour alimenter l'application web depuis cette base : `tools/exporter_depuis_postgis.sh`.

## 3. Production

Voir l'[architecture cible](architecture.md). Points d'attention :

- **Tuiles** : ne pas s'appuyer sur `tile.openstreetmap.org` (politique d'usage) ; servir ses propres tuiles OSM ou un fond national, plus les orthophotos.
- **Hébergement** : souverain, sauvegardes chiffrées et testées (pgBackRest), supervision.
- **Sécurité** : HTTPS, comptes nominatifs, droits appliqués par l'API et la base (Row-Level Security), journal d'audit.
- **Données réelles** : reprise de l'inventaire existant, géoréférencement des biens, numérisation des emprises sur orthophotos, rapprochement avec les titres fonciers et le cadastre.
