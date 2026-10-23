# Feuille de route

Ce que le prototype ne fait pas encore et qui aurait du sens pour la gestion du patrimoine bâti de l'État.

## Socle

- **Branchement sur la base PostGIS** par une API (FastAPI ou PostgREST), à la place du fichier de données statique.
- **Comptes réels** (Keycloak) et droits appliqués côté serveur, dont l'accès des affectataires à leurs seuls biens.
- **Stockage des pièces** (MinIO) avec aperçu des PDF et des photos, et versions des documents.
- **Collecte terrain hors ligne** : visites de surveillance et photos saisies sur tablette, synchronisées au retour (application web progressive, ou ODK Collect / KoboToolbox).

## Foncier et inventaire

- **Emprises réelles** : numérisation sur orthophotos ou import du bâti existant, à la place des formes de démonstration.
- **Rapprochement cadastral** : lien avec les références NICAD et les titres fonciers tenus par les services des Domaines et du Cadastre ; contrôle des biens sans titre ou en cours d'immatriculation.
- **Campagne d'inventaire** : avancement par région et par ministère, taux de biens visités, taux de fiches complètes.
- **Découpage administratif** : régions, départements et communes (couches PostGIS du CEGIT) pour les synthèses territoriales.

## Contentieux et recouvrement

- **Échéancier de loyers** : une ligne par échéance et par paiement, pour produire relances et états de recouvrement.
- **Provision pour risque** : exposition financière estimée par dossier.
- **Modèles de courriers** : mise en demeure et relance générées depuis la fiche.
- **Notifications** : courriel ou SMS avant une audience, une fin de bail ou une échéance de mise en demeure.

## Valorisation et pilotage

- **Valeur vénale et valeur locative** par bien, avec la date et la source de l'estimation.
- **Scénarios de valorisation** : réhabilitation, location, cession ou partenariat, avec coût et recette attendus.
- **Programmation pluriannuelle des travaux** à partir du score de priorité et des budgets.
- **Rationalisation des locations** : repérer les biens pris à bail alors qu'un bien de l'État est inoccupé à proximité (requête déjà prête dans la base).
- **Performance énergétique et sécurité** : consommations, diagnostics, conformité incendie et accessibilité.
- **Assurances et contrats de maintenance** : échéances et coûts par bien.
- **Atlas** : une fiche PDF par bien, générée côté serveur, pour les dossiers de séance.

## Gouvernance des données

- **Circuit de validation** : une modification saisie par un affectataire est validée par un gestionnaire avant publication.
- **Historique** : restituer l'état d'un bien à une date donnée à partir du journal d'audit.
- **Ouverture** : publication de données agrégées non sensibles (open data) et API pour les autres administrations.
