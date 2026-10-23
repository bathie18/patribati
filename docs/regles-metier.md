# Règles métier

Les règles ci-dessous sont calculées dans le navigateur par `assets/js/core.js`. En production, elles sont portées par la vue `patrimoine.v_bien_situation` et par `patrimoine.v_alertes` (voir [database/05_vues.sql](../database/05_vues.sql)), pour que la carte, l'API, les exports et le tableau de bord donnent tous le même résultat.

La démonstration calcule les délais à partir d'une **date de référence fixe** (10 octobre 2026, date du jeu de données), pour que les alertes et l'échéancier restent cohérents d'une présentation à l'autre. En production, la date de référence est la date du jour.

## Alertes de gestion

Un bien porte une alerte dès qu'une des conditions suivantes est vraie.

| Alerte | Condition |
|---|---|
| Occupation sans titre | Occupation = « Occupé sans titre » |
| Bien non affecté inoccupé : à valoriser | Régime = « Non affecté » et occupation = « Inoccupé » |
| Aucune visite depuis plus de 12 mois | Dernière visite de surveillance il y a plus de 365 jours |
| Aucune visite enregistrée | Aucune visite sur le bien |
| Bail à échéance | Fin d'un titre d'occupation dans les 6 mois (183 jours) |
| État très dégradé sans travaux programmés | État « Très dégradé » ou « En ruine » et aucun chantier non terminé |
| Arriérés de loyers | Somme des arriérés des titres d'occupation > 0 |
| Litige en cours | Au moins un litige ouvert (une alerte par litige) |
| Échéance de procédure | Prochaine échéance d'un litige ouvert dans les 45 jours |
| Dossier sans acte depuis plus de 6 mois | Dernier acte d'un litige ouvert (ou ouverture) il y a plus de 183 jours |

La liste « À traiter », affichée dans la colonne de droite quand aucune fiche n'est ouverte, reprend les biens avec au moins une alerte, classés par score de priorité. Pour le profil affectataire, elle se limite aux biens de son ministère.

## Score de priorité d'intervention

Score de 0 à 100, plafonné à 100.

| Critère | Points |
|---|---|
| Vétusté : (note − 1) × 10, la note allant de 1 (bon) à 5 (en ruine) | 0 à 40 |
| Occupation sans titre | 20 |
| Bien non affecté inoccupé | 15 |
| Au moins un litige ouvert | 20 |
| Au moins un litige à risque élevé | 10 |
| Arriérés de loyers | 5 |
| Aucune visite depuis 12 mois, ou aucune visite | 10 |

Classes de priorité : **très forte** ≥ 60, **forte** ≥ 40, **modérée** ≥ 20, **faible** en dessous.
La pondération est une proposition de départ, à régler avec la SOGEPA.

## Statut de gestion

Un seul statut par bien, attribué dans cet ordre (la première condition vraie l'emporte) :

1. **En litige** : au moins un litige ouvert ;
2. **Occupation irrégulière** : occupé sans titre ;
3. **À valoriser** : non affecté et inoccupé ;
4. **À réhabiliter** : très dégradé ou en ruine ;
5. **Gestion courante** : tous les autres biens.

## Thématiques de la carte

| Thématique | Source |
|---|---|
| Régime d'affectation | Non affecté (géré par la SOGEPA), affectation juridique, affectation fonctionnelle |
| Occupation | Occupé, partiellement occupé, inoccupé, occupé sans titre, en travaux |
| État de vétusté | Bon, moyen, dégradé, très dégradé, en ruine, non évalué |
| Statut de propriété | Propriété de l'État, pris à bail par l'État, en cours de régularisation |
| Litiges | Étape la plus avancée parmi les litiges ouverts : précontentieux, contentieux, exécution ; « clos » si tous les litiges sont clos |
| Priorité d'intervention | Classe du score ci-dessus |
| Statut de gestion | Statut ci-dessus |
| Potentiel de valorisation | Conservation, réhabilitation, mise en location, cession, partenariat (bail emphytéotique, PPP), à déterminer |
| Dernière visite | Moins de 6 mois, 6 à 12 mois, plus de 12 mois, jamais visité |
| Type de bien | Immeuble administratif, logement de fonction, villa, entrepôt, chancellerie, consulat, résidence diplomatique… |

La couleur s'applique aux points des biens et aux emprises bâties. Un clic sur une entrée de la légende la masque ou la réaffiche.

## Responsable de l'entretien

Un bien **non affecté** est entretenu par la SOGEPA ; un bien **affecté** l'est par son affectataire. La fiche l'indique dans l'onglet Identité.
