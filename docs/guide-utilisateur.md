# Guide utilisateur

## Parcours de démonstration (10 minutes)

1. **Connexion** : identifiant `admin`, mot de passe `admin` (les autres comptes sont listés dans le [README](../README.md#accès-à-la-démonstration)).
2. **Vue monde** : chaque point est un bien (ambassade, résidence, consulat…), coloré selon la thématique ; les anneaux regroupent les biens proches, avec leur nombre au centre. Cliquer un anneau pour zoomer, un point pour ouvrir la fiche.
3. **Thématiques** : dans la colonne de gauche, passer de « Régime d'affectation » à « État de vétusté », puis « Litiges ». Cliquer une entrée de la légende pour la masquer.
4. **Liste « À traiter »** (colonne de droite) : cliquer le premier bien. La carte se centre sur lui : l'assiette foncière apparaît en pointillés dorés, les emprises bâties en aplat coloré.
5. **Fiche** : parcourir les onglets. Dans *Litiges*, ouvrir la chronologie. Dans *Visites*, saisir une visite. Cliquer *Modifier*, changer l'état de vétusté, *Enregistrer* : la couleur sur la carte et le score changent.
6. **Ajouter un bien** : bouton en haut à droite, puis clic sur la carte. La fiche s'ouvre en saisie.
7. **Litiges** : l'échéancier des 90 jours, les montants à recouvrer, la liste des dossiers. Un clic sur un nom de bien ouvre sa fiche à l'onglet Litiges.
8. **Tableau de bord** : la synthèse du parc et les priorités d'intervention.
9. **Journal** : toutes les saisies de la démonstration, avec leur auteur.
10. **Administration** : onglet *Comptes*, bouton *Tester ce profil* sur le compte `mae` : seuls les biens du ministère des Affaires étrangères sont modifiables et le module Litiges disparaît. Le bandeau doré ramène au compte administrateur. Dans *Rôles et permissions*, cocher ou décocher une permission change aussitôt ce que voit le rôle.

## La carte

| Élément | Usage |
|---|---|
| Périmètre | Monde, Sénégal ou Étranger : filtre les biens et recadre la carte |
| Thématique affichée | Couleur des biens et des emprises |
| Légende | Clic pour masquer / réafficher une catégorie ; le nombre de biens est indiqué à droite |
| Fond et couches | *Auto* (pays du monde en vue d'ensemble, OpenStreetMap à partir du zoom 6), *OSM*, ou *Simplifié* (sans connexion) ; assiettes foncières (zoom ≥ 14) et emprises bâties (zoom ≥ 15) |
| Sélection affichée | Indicateurs recalculés sur les biens visibles |
| Boutons Monde / Sénégal / Dakar | Vues rapides |
| Coordonnées | En bas à gauche : position du curseur et niveau de zoom |

Les anneaux regroupent les biens proches : leurs couleurs reprennent la part de chaque catégorie de la thématique, le nombre au centre est le nombre de biens ; un clic zoome dessus. À partir du zoom 15, le nom de chaque bien s'affiche.

## La fiche d'un bien

| Onglet | Contenu |
|---|---|
| Identité | Alertes, type, usage, année, niveaux, surfaces, vétusté, coût de rénovation, valeur, potentiel, score de priorité, statut de gestion, dernière visite |
| Foncier | Titre foncier, NICAD, assiette, statut de propriété, localisation, coordonnées |
| Occupation | Régime, affectataire, occupation, agents hébergés et m² par agent, titres d'occupation et baux, arriérés |
| Visites | Historique des visites de surveillance ; saisie d'une visite (avec mise à jour de l'état et de l'occupation) |
| Travaux | Chantiers, entreprise, dates, coût, avancement |
| Litiges | Dossiers contentieux, phase, partie adverse, échéance, montants, chronologie ; ajout d'un acte |
| Documents | Pièces du bien ; ajout d'un document avec sa catégorie |
| Album | Photos ; téléversement ; clic pour agrandir |

*Imprimer* produit une fiche synthétique au format A4 (ou PDF, selon l'imprimante choisie).
L'adresse `#bien/<identifiant>` ouvre directement la fiche d'un bien : pratique pour un lien dans un courriel ou une présentation.

## Recherche

Le champ du bandeau cherche dans les biens (nom, code, titre foncier, NICAD, commune, affectataire), les villes, les pays et les litiges (référence, type, partie adverse). On peut aussi taper des coordonnées : `14.6928, -17.4467`. Flèches haut / bas puis Entrée pour choisir.

## Inventaire

Filtres combinables, tri par clic sur l'en-tête de colonne. *Exporter CSV* produit un fichier lisible par un tableur (séparateur point-virgule, UTF-8) ; *Exporter GeoJSON* un fichier ouvrable dans tout logiciel SIG. *Voir sur la carte* recadre la carte sur les biens filtrés.

## Compte et administration

Le menu du compte (en haut à droite) donne le nom, le rôle et l'identifiant, et permet de se déconnecter. Les administrateurs y trouvent aussi l'accès au module Administration (voir [Rôles et permissions](roles-permissions.md)).

## Saisies de la démonstration

Elles sont enregistrées dans le stockage local du navigateur : elles restent après un rechargement, sur ce poste et ce navigateur uniquement. Le lien *réinitialiser* du bandeau (ou du Journal) les efface. Les photos lourdes peuvent ne pas être conservées après rechargement (« non conservée ») si l'espace du navigateur est plein.
