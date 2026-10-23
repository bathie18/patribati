/* PatriBâti — configuration : rôles, permissions et comptes par défaut, modules, nomenclatures d'affichage.
   En production, les comptes et les rôles sont portés par le fournisseur d'identité (Keycloak) et
   les droits appliqués par l'API et par PostgreSQL (Row-Level Security). Ici, tout est simulé
   dans le navigateur pour la démonstration. */
window.PB = window.PB || {};
(function (PB) {
  'use strict';

  PB.VERSION = '1.1.0';
  PB.STORE_KEY = 'patribati.demo.v1';
  PB.ACCOUNTS_KEY = 'patribati.comptes.v1';
  PB.SESSION_KEY = 'patribati.session';

  const MAE = 'Ministère chargé des Affaires étrangères';

  /* Rôles et permissions par défaut (modifiables dans le module Administration).
     edit    : 'tout' | 'affectataire' (biens de son ministère) | 'terrain' (visites et pièces) | 'aucun'
     ajout   : créer des biens            litiges : voir les dossiers contentieux et les montants
     actes   : saisir des actes de procédure   exports : exporter CSV / GeoJSON
     journal : journal complet des modifications   admin : module Administration */
  PB.PERMS = [
    ['edit', 'Saisie des fiches', 'select'],
    ['ajout', 'Créer des biens', 'bool'],
    ['litiges', 'Voir les litiges et montants', 'bool'],
    ['actes', 'Saisir des actes de procédure', 'bool'],
    ['exports', 'Exporter', 'bool'],
    ['journal', 'Journal complet', 'bool'],
    ['admin', 'Administration', 'bool']
  ];
  PB.EDIT_LEVELS = [['tout', 'Tous les biens'], ['affectataire', 'Biens de son ministère'], ['terrain', 'Visites et pièces'], ['aucun', 'Aucune']];
  PB.DEFAULT_ROLES = {
    admin: { nom: 'Administrateur', desc: 'Tous les droits, gestion des comptes et des permissions.', edit: 'tout', ajout: true, litiges: true, actes: true, exports: true, journal: true, admin: true },
    gestionnaire: { nom: 'Gestionnaire de patrimoine', desc: 'Met à jour les fiches, les baux, les travaux et les litiges.', edit: 'tout', ajout: true, litiges: true, actes: true, exports: true, journal: true, admin: false },
    juriste: { nom: 'Juriste contentieux', desc: 'Suit les dossiers contentieux et le recouvrement ; ne modifie pas les fiches.', edit: 'aucun', ajout: false, litiges: true, actes: true, exports: true, journal: false, admin: false },
    affectataire: { nom: 'Correspondant affectataire', desc: 'Consulte tout le parc ; ne modifie que les biens affectés à son ministère.', edit: 'affectataire', ajout: false, litiges: false, actes: false, exports: true, journal: false, admin: false },
    terrain: { nom: 'Agent de terrain', desc: 'Saisit les visites de surveillance, les photos et les pièces.', edit: 'terrain', ajout: false, litiges: false, actes: false, exports: false, journal: false, admin: false },
    lecteur: { nom: 'Lecteur', desc: 'Consultation, tableau de bord et exports, sans modification.', edit: 'aucun', ajout: false, litiges: true, actes: false, exports: true, journal: false, admin: false }
  };

  /* Comptes de démonstration (fictifs). Mots de passe stockés en clair : simulation navigateur uniquement. */
  PB.DEFAULT_USERS = [
    { id: 1, login: 'admin', password: 'admin', nom: 'Administrateur PatriBâti', structure: 'SOGEPA · Direction du patrimoine', role: 'admin' },
    { id: 2, login: 'gestionnaire', password: 'Gestion2026', nom: 'Gestionnaire SOGEPA (démo)', structure: 'SOGEPA · Pôle gestion', role: 'gestionnaire' },
    { id: 3, login: 'juriste', password: 'Juriste2026', nom: 'Juriste contentieux (démo)', structure: "Agence judiciaire de l'État", role: 'juriste' },
    { id: 4, login: 'mae', password: 'Mae2026', nom: 'Correspondant MAE (démo)', structure: MAE, role: 'affectataire', affectataire: MAE },
    { id: 5, login: 'ministere.c', password: 'MinC2026', nom: 'Correspondant Ministère C (démo)', structure: 'Ministère C (démo)', role: 'affectataire', affectataire: 'Ministère C (démo)' },
    { id: 6, login: 'terrain', password: 'Terrain2026', nom: 'Agent de terrain (démo)', structure: 'SOGEPA · Brigade de surveillance', role: 'terrain' },
    { id: 7, login: 'direction', password: 'Direction2026', nom: 'Direction générale (démo)', structure: 'Direction générale · Tutelle', role: 'lecteur' }
  ];

  PB.MODULES = [
    ['carte', 'Carte'],
    ['inventaire', 'Inventaire'],
    ['litiges', 'Litiges'],
    ['tableau', 'Tableau de bord'],
    ['journal', 'Journal'],
    ['admin', 'Administration']
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
