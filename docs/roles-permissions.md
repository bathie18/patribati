# Rôles et permissions

## Matrice des droits

| Action | Administrateur | Gestionnaire | Affectataire | Agent de terrain | Lecteur |
|---|:-:|:-:|:-:|:-:|:-:|
| Consulter la carte, les fiches, l'inventaire, le tableau de bord | ✔ | ✔ | ✔ | ✔ | ✔ |
| Exporter (CSV, GeoJSON) | ✔ | ✔ | ✔ | ✔ | ✔ |
| Modifier une fiche | ✔ | ✔ | ses biens | — | — |
| Changer le régime d'affectation | ✔ | ✔ | — | — | — |
| Créer un bien | ✔ | ✔ | — | — | — |
| Saisir une visite de surveillance | ✔ | ✔ | ses biens | ✔ | — |
| Ajouter des documents et des photos | ✔ | ✔ | ses biens | ✔ | — |
| Voir le détail des litiges et les montants | ✔ | ✔ | — | — | ✔ |
| Ajouter un acte de procédure | ✔ | ✔ | — | — | — |
| Consulter le journal complet | ✔ | ✔ | ses saisies | ses saisies | ses saisies |

« Ses biens » : les biens dont l'affectataire est le ministère du profil (dans la démonstration, le ministère chargé des Affaires étrangères, qui porte la plupart des biens à l'étranger).

## Dans le prototype

Les profils sont définis dans [`assets/js/config.js`](../assets/js/config.js) (`PB.PROFILES`) et les contrôles sont faits dans l'interface (`PB.canEdit`, `PB.canField`, `PB.canLitiges` dans `core.js`). C'est une **simulation** : rien n'empêche techniquement un visiteur de contourner ces contrôles, et les saisies restent dans son navigateur.

## En production

1. **Identité** : Keycloak (OpenID Connect), comptes nominatifs, rattachement à une structure (SOGEPA, ministère) et à un rôle.
2. **API** : chaque requête porte le jeton ; l'API refuse les écritures non autorisées.
3. **Base** : rôles PostgreSQL (`patribati_admin`, `patribati_gestionnaire`, `patribati_terrain`, `patribati_lecteur`, déjà créés par [`database/06_roles_droits.sql`](../database/06_roles_droits.sql)) ; à ajouter : un rôle affectataire et des politiques **Row-Level Security** qui le limitent aux biens de son ministère.
4. **Traçabilité** : déclencheurs `trg_journal()` sur les tables métier, qui inscrivent l'auteur, la date, l'action et les valeurs avant / après dans `patrimoine.journal`.
5. **Circuit de validation** (proposé) : une modification saisie par un affectataire est soumise à validation par un gestionnaire avant publication.
