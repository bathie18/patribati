# Rôles et permissions

## Matrice par défaut

| Permission | Administrateur | Gestionnaire | Juriste contentieux | Affectataire | Agent de terrain | Lecteur |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Consulter la carte, les fiches, l'inventaire, le tableau de bord | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Saisie des fiches | tous les biens | tous les biens | — | biens de son ministère | visites et pièces | — |
| Créer des biens | ✔ | ✔ | — | — | — | — |
| Voir les litiges et les montants | ✔ | ✔ | ✔ | — | — | ✔ |
| Saisir des actes de procédure | ✔ | ✔ | ✔ | — | — | — |
| Exporter (CSV, GeoJSON) | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| Journal complet des modifications | ✔ | ✔ | ses saisies | ses saisies | ses saisies | ses saisies |
| Administration | ✔ | — | — | — | — | — |

« Biens de son ministère » : les biens dont l'affectataire est le ministère renseigné sur le compte (par exemple le ministère chargé des Affaires étrangères, qui porte les ambassades, résidences et consulats).
« Visites et pièces » : saisie des visites de surveillance, des documents et des photos, sur tous les biens.

## Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin` | Administrateur |
| `gestionnaire` | `Gestion2026` | Gestionnaire de patrimoine |
| `juriste` | `Juriste2026` | Juriste contentieux |
| `mae` | `Mae2026` | Correspondant affectataire (ministère chargé des Affaires étrangères) |
| `ministere.c` | `MinC2026` | Correspondant affectataire (Ministère C, fictif) |
| `terrain` | `Terrain2026` | Agent de terrain |
| `direction` | `Direction2026` | Lecteur |

## Module Administration

Réservé aux rôles qui ont la permission « Administration » (par défaut, l'administrateur seul).

- **Comptes** : création, modification (identifiant, mot de passe, nom, structure, rôle, ministère affectataire), désactivation, suppression. Le dernier administrateur actif ne peut être ni désactivé, ni supprimé, ni changé de rôle.
- **Rôles et permissions** : chaque case s'applique immédiatement à tous les comptes du rôle. Le rôle administrateur garde toujours la saisie complète et l'administration.
- **Tester ce profil** : l'administrateur ouvre l'application avec l'identité et les droits d'un autre compte. Un bandeau doré le rappelle et permet de revenir à son compte. Les saisies faites pendant le test sont attribuées au compte testé.
- **Journal des connexions** : connexions, échecs (mauvais mot de passe, compte désactivé), déconnexions, tests de profil, créations et modifications de comptes et de permissions.
- **Données de la démo** : effacer les saisies, réinitialiser les comptes et les permissions.

## Dans le prototype

Rôles, permissions et comptes par défaut sont définis dans [`assets/js/config.js`](../assets/js/config.js) (`PB.DEFAULT_ROLES`, `PB.DEFAULT_USERS`). La connexion, la session et le test de profil sont dans [`assets/js/auth.js`](../assets/js/auth.js), le module dans [`assets/js/admin.js`](../assets/js/admin.js). Les contrôles sont faits dans l'interface (`PB.canEdit`, `PB.canField`, `PB.canLitiges`, `PB.canActes`, `PB.canExport` dans `core.js`).

C'est une **simulation** : les comptes et leurs mots de passe sont stockés en clair dans le navigateur, et rien n'empêche techniquement un visiteur averti de contourner ces contrôles. Elle sert à montrer le fonctionnement attendu.

## En production

1. **Identité** : Keycloak (OpenID Connect), comptes nominatifs, mots de passe hachés, double authentification possible, rattachement à une structure (SOGEPA, ministère) et à un rôle.
2. **API** : chaque requête porte le jeton ; l'API refuse les lectures et écritures non autorisées.
3. **Base** : rôles PostgreSQL (`patribati_admin`, `patribati_gestionnaire`, `patribati_terrain`, `patribati_lecteur`, déjà créés par [`database/06_roles_droits.sql`](../database/06_roles_droits.sql)) ; à ajouter : rôles juriste et affectataire, et des politiques **Row-Level Security** qui limitent l'affectataire aux biens de son ministère.
4. **Traçabilité** : déclencheurs `trg_journal()` sur les tables métier, qui inscrivent l'auteur, la date, l'action et les valeurs avant / après dans `patrimoine.journal` ; journal des connexions tenu par Keycloak.
5. **Circuit de validation** (proposé) : une modification saisie par un affectataire est soumise à validation par un gestionnaire avant publication.
