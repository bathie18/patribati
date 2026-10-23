/* PatriBâti — configuration : profils d'accès, modules, nomenclatures d'affichage.
   En production, les profils sont portés par le fournisseur d'identité (Keycloak) et
   les droits appliqués par l'API et par PostgreSQL (Row-Level Security). Ici, tout est simulé
   dans le navigateur pour la démonstration. */
window.PB = window.PB || {};
(function (PB) {
  'use strict';

  PB.VERSION = '1.0.0';
  PB.STORE_KEY = 'patribati.demo.v1';

  /* Profils de démonstration.
     edit : 'tout' | 'affectataire' (uniquement les biens de son ministère) | 'terrain' (visites et pièces) | 'aucun'
     litiges : accès aux dossiers contentieux et aux montants */
  PB.PROFILES = {
    admin: {
      nom: 'Administrateur', initiales: 'AD', structure: 'SOGEPA · Direction du patrimoine',
      desc: 'Tous les droits : saisie, contentieux, journal des modifications.',
      edit: 'tout', litiges: true, ajout: true, journal: true
    },
    gestionnaire: {
      nom: 'Gestionnaire de patrimoine', initiales: 'GP', structure: 'SOGEPA · Pôle gestion',
      desc: 'Met à jour les fiches, les baux, les travaux et les litiges.',
      edit: 'tout', litiges: true, ajout: true, journal: true
    },
    affectataire: {
      nom: 'Correspondant affectataire', initiales: 'MAE', structure: 'Ministère chargé des Affaires étrangères',
      affectataire: 'Ministère chargé des Affaires étrangères',
      desc: 'Consulte tout le parc ; ne modifie que les biens affectés à son ministère.',
      edit: 'affectataire', litiges: false, ajout: false, journal: false
    },
    terrain: {
      nom: 'Agent de terrain', initiales: 'AT', structure: 'SOGEPA · Brigade de surveillance',
      desc: 'Saisit les visites de surveillance, les photos et les pièces.',
      edit: 'terrain', litiges: false, ajout: false, journal: false
    },
    lecteur: {
      nom: 'Lecteur', initiales: 'LE', structure: 'Direction générale · Tutelle',
      desc: 'Consultation, tableau de bord et exports, sans modification.',
      edit: 'aucun', litiges: true, ajout: false, journal: false
    }
  };

  PB.MODULES = [
    ['carte', 'Carte'],
    ['inventaire', 'Inventaire'],
    ['litiges', 'Litiges'],
    ['tableau', 'Tableau de bord'],
    ['journal', 'Journal']
  ];

  /* Vues rapides de la carte : [lon, lat, zoom] */
  PB.VIEWS = {
    monde: { b: [[-45, -60], [70, 140]] },
    sn: { b: [[12.2, -17.6], [16.7, -11.3]] },
    dakar: { c: [14.692, -17.44], z: 13 }
  };

  /* Seuils d'affichage de la carte (niveaux de zoom Leaflet) */
  PB.Z = { pays: 4, assiettes: 14, emprises: 15, etiquettes: 15, detail: 13 };

  PB.ETAPES = ['Précontentieux', 'Contentieux', 'Exécution'];
  PB.ETAPE_COL = { 'Aucun litige': '--c-d', 'Précontentieux': '--c-c', 'Contentieux': '--c-e', 'Exécution': '--c-f', 'Clos': '--c-a' };
  PB.NOTE = { 'Bon': 1, 'Moyen': 2, 'Dégradé': 3, 'Très dégradé': 4, 'En ruine': 5 };

  PB.TYPES_ACTE = ['Constat / PV', 'Mise en demeure', 'Réunion de conciliation', 'Assignation', 'Audience', 'Décision', 'Signification', 'Expulsion / reprise', 'Paiement reçu', 'Autre'];
  PB.CAT_DOCS = ['Titre foncier', 'Plan cadastral', 'Bail / convention', 'PV de visite', 'Mise en demeure', 'Décision de justice', 'Devis / marché', 'Photo', 'Autre'];

  /* Fichier de démonstration ouvert par le lien « Ouvrir » des documents */
  PB.DOC_DEMO = 'assets/img/document_demo.pdf';
})(window.PB);
