# Journal des versions

## 1.1.0 — 2026-10-23

- **Connexion** par identifiant et mot de passe à la place du choix de profil ; menu du compte et déconnexion.
- **Module Administration** : comptes (création, modification, désactivation, suppression), rôles et permissions modifiables, **test des profils** avec bandeau de retour, journal des connexions, réinitialisation de la démo.
- Nouveau rôle **Juriste contentieux** ; nouvelles permissions « actes de procédure » et « exports ».
- **Réseau diplomatique et consulaire** étoffé : 119 biens, dont 93 à l'étranger dans 55 pays (chancelleries, résidences, consulats généraux, missions permanentes, logements de fonction, foyer d'étudiants), avec assiettes, emprises, baux, visites, travaux et cinq nouveaux litiges.
- **Vue monde** : chaque bien est visible et coloré selon la thématique ; les biens proches sont regroupés dans un anneau aux couleurs de leurs catégories.
- Dixième thématique : **dernière visite**.

## 1.0.0 — 2026-10-23

Première version web autonome, publiable sur GitHub Pages.

- Application web sans serveur : accueil et cinq profils de démonstration, carte Leaflet (vue monde, regroupements, assiettes foncières, emprises bâties, fonds automatique / OpenStreetMap / simplifié), neuf thématiques, fiche du bien en huit onglets, saisies (fiche, visite, acte de procédure, documents, photos), ajout d'un bien, recherche avec autocomplétion.
- Modules Inventaire (filtres, tri, exports CSV et GeoJSON), Litiges et recouvrement (échéancier 90 jours, montants par partie adverse, arriérés), Tableau de bord, Journal des modifications.
- Persistance des saisies dans le navigateur, thèmes clair et sombre, affichage mobile, impression d'une fiche.
- Documentation, scripts PostGIS de la base cible, contrat d'API, données ouvertes de la démonstration.
- Retrait de tout ce qui dépendait d'un logiciel SIG bureautique ou d'un serveur cartographique : projets et styles, publication WebSIG, fichiers GeoPackage et Shapefile.
