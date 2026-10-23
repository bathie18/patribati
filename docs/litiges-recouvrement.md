# Litiges et recouvrement

PatriBâti suit les biens que l'État peine à recouvrer : occupants qui se maintiennent sans titre ou ne paient pas, constructeurs défaillants, contestations foncières. Chaque litige est un **dossier rattaché à un bien**.

## Le dossier contentieux

| Élément | Contenu |
|---|---|
| Référence | `LIT-AAAA-NNNN`, attribuée automatiquement en base |
| Type | Regroupé en trois **familles** : **occupant** (occupation sans titre, refus de libérer les lieux, impayés, sous-location ou usage non autorisé), **constructeur** (malfaçons, retard ou abandon de chantier, contestation de décompte), **foncier** (contestation de propriété, empiètement ou bornage) |
| Partie adverse | Nom et nature (occupant, constructeur / entreprise, bailleur, tiers) |
| Phase | Mise en demeure, médiation / négociation, première instance, appel, cassation, exécution de la décision, clos |
| Étape | Regroupement des phases : **précontentieux**, **contentieux**, **exécution** |
| Juridiction, service en charge, niveau de risque | Faible, moyen, élevé |
| Prochaine échéance | Date et objet (audience, fin d'un délai de mise en demeure, réunion…) |
| Montants | Réclamé et recouvré, en FCFA |
| Reprise de possession | Bien à récupérer, bien récupéré |
| Chronologie | Actes datés : constat, mise en demeure, conciliation, assignation, audience, décision, paiement, expulsion… |
| Pièces | Documents rattachés au dossier |

Les **arriérés de loyers** sont suivis sur chaque titre d'occupation, en dehors des litiges : un bien peut avoir des arriérés sans dossier contentieux ouvert. Le module le signale (« Non : à engager »).

## Dans l'application

- **Carte** : thématique « Litiges » (étape la plus avancée par bien).
- **Fiche du bien**, onglet Litiges : dossier complet, barre de recouvrement, chronologie, et pour les profils autorisés, **ajout d'un acte** (avec mise à jour du montant recouvré et de la prochaine échéance). Un acte « Expulsion / reprise » marque le bien comme récupéré.
- **Module Litiges et recouvrement** :
  - indicateurs : litiges ouverts, montants réclamés, recouvrés, à recouvrer (contentieux et arriérés), biens à reprendre, échéances à 45 jours ;
  - **échéancier des 90 jours** (en rouge sous 45 jours) ;
  - montants à recouvrer par partie adverse, répartition par étape et par famille ;
  - liste filtrable des dossiers (ouverts / clos, famille, étape, risque) ;
  - arriérés de loyers par titre d'occupation.
- **Alertes** : litige en cours, échéance sous 45 jours, dossier sans acte depuis 6 mois, arriérés.

## Accès

Par défaut, le détail des litiges et les montants sont ouverts aux rôles administrateur, gestionnaire, juriste contentieux et lecteur ; les actes de procédure sont saisis par l'administrateur, le gestionnaire et le juriste. L'affectataire et l'agent de terrain voient qu'un bien fait l'objet d'un contentieux, sans le détail. L'administrateur peut modifier ces permissions. Voir [Rôles et permissions](roles-permissions.md).

## Requêtes prêtes à l'emploi (base PostGIS)

[`database/10_requetes_utiles.sql`](../database/10_requetes_utiles.sql) contient notamment : les biens que l'État peine à récupérer, l'échéancier des 90 jours, les montants par entreprise, et la rationalisation des locations (biens pris à bail alors qu'un bien de l'État est inoccupé à moins de 5 km).
