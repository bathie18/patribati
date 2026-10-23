-- =====================================================================
-- PatriBâti — 02. Nomenclatures (schéma ref)
-- Chaque liste : libelle (clé), ordre d'affichage, couleur de légende.
-- Les tables métier pointent sur « libelle » : les données restent lisibles
-- dans l'application, l'API, les exports et le tableau de bord.
-- =====================================================================
SET search_path = patrimoine, ref, public;

CREATE TABLE ref.type_bien            (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.statut_propriete     (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.regime               (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.occupation           (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.etat_vetuste         (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text, note smallint);
CREATE TABLE ref.potentiel_valorisation(libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.type_titre           (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.type_travaux         (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.statut_travaux       (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.categorie_document   (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.type_litige          (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text, famille text NOT NULL);
CREATE TABLE ref.phase_litige         (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text, etape text NOT NULL, ouvert boolean NOT NULL);
CREATE TABLE ref.partie_adverse_type  (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.niveau_risque        (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.type_evenement       (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);
CREATE TABLE ref.issue_litige         (libelle text PRIMARY KEY, ordre smallint NOT NULL, couleur text);

COMMENT ON COLUMN ref.etat_vetuste.note   IS 'Note de 1 (bon) à 5 (en ruine) ; NULL si non évalué';
COMMENT ON COLUMN ref.type_litige.famille IS 'Occupant, Constructeur ou Foncier';
COMMENT ON COLUMN ref.phase_litige.etape  IS 'Regroupement pour la carte : Précontentieux, Contentieux, Exécution, Clos';
COMMENT ON COLUMN ref.phase_litige.ouvert IS 'Vrai tant que le litige n''est pas clos';

INSERT INTO ref.type_bien VALUES
 ('Immeuble administratif',1,'#2f6fb3'),('Logement de fonction',2,'#16939a'),('Villa',3,'#7b4fa3'),
 ('Immeuble de logements',4,'#c98a12'),('Entrepôt / local technique',5,'#868d95'),('Terrain nu',6,'#0b7a4b'),
 ('Chancellerie / ambassade',7,'#c2412d'),('Consulat',8,'#b3a81f'),('Résidence diplomatique',9,'#7d1d2c'),('Autre',10,'#9aa0a6');
INSERT INTO ref.statut_propriete VALUES
 ('Propriété de l''État',1,'#0b7a4b'),('Pris à bail par l''État',2,'#c98a12'),('Mis à disposition',3,'#2f6fb3'),('En cours de régularisation',4,'#c2412d');
INSERT INTO ref.regime VALUES
 ('Non affecté',1,'#0b7a4b'),('Affectation juridique',2,'#2f6fb3'),('Affectation fonctionnelle',3,'#c98a12');
INSERT INTO ref.occupation VALUES
 ('Occupé',1,'#2f6fb3'),('Partiellement occupé',2,'#c98a12'),('Inoccupé',3,'#868d95'),('Occupé sans titre',4,'#c2412d'),('En travaux',5,'#7b4fa3');
INSERT INTO ref.etat_vetuste VALUES
 ('Bon',1,'#2f9e5b',1),('Moyen',2,'#b3a81f',2),('Dégradé',3,'#e0912a',3),('Très dégradé',4,'#d2502f',4),('En ruine',5,'#7d1d2c',5),('Non évalué',6,'#9aa0a6',NULL);
INSERT INTO ref.potentiel_valorisation VALUES
 ('Conservation en l''état',1,'#868d95'),('Réhabilitation',2,'#e0912a'),('Mise en location',3,'#2f6fb3'),
 ('Cession',4,'#7b4fa3'),('Partenariat (bail emphytéotique, PPP)',5,'#16939a'),('À déterminer',6,'#9aa0a6');
INSERT INTO ref.type_titre VALUES
 ('Bail',1,NULL),('Convention d''occupation',2,NULL),('Logement de fonction',3,NULL),('Acte d''affectation',4,NULL),('Sans titre',5,NULL);
INSERT INTO ref.type_travaux VALUES
 ('Gros œuvre',1,NULL),('Toiture / étanchéité',2,NULL),('Peinture',3,NULL),('Carrelage',4,NULL),('Menuiserie',5,NULL),('Plomberie',6,NULL),
 ('Électricité',7,NULL),('Climatisation',8,NULL),('Sécurité incendie',9,NULL),('Réhabilitation complète',10,NULL),('Autre',11,NULL);
INSERT INTO ref.statut_travaux VALUES
 ('Programmé',1,'#868d95'),('En cours',2,'#2f6fb3'),('Suspendu',3,'#c2412d'),('Terminé',4,'#2f9e5b');
INSERT INTO ref.categorie_document VALUES
 ('Photo',1,NULL),('Titre foncier',2,NULL),('Plan cadastral',3,NULL),('Plan du bâtiment',4,NULL),('Acte d''affectation',5,NULL),
 ('Bail / convention',6,NULL),('PV de visite',7,NULL),('Dossier foncier',8,NULL),('Mise en demeure',9,NULL),
 ('Acte de procédure',10,NULL),('Décision de justice',11,NULL),('Marché de travaux',12,NULL),('Autre',13,NULL);
INSERT INTO ref.type_litige VALUES
 ('Occupation sans titre',1,'#c2412d','Occupant'),
 ('Refus de libérer les lieux',2,'#7d1d2c','Occupant'),
 ('Impayés de loyers ou de redevances',3,'#e0912a','Occupant'),
 ('Sous-location ou usage non autorisé',4,'#c98a12','Occupant'),
 ('Malfaçons ou désordres de construction',5,'#7b4fa3','Constructeur'),
 ('Retard ou abandon de chantier',6,'#2f6fb3','Constructeur'),
 ('Contestation de décompte ou de paiement',7,'#16939a','Constructeur'),
 ('Contestation de propriété',8,'#0b7a4b','Foncier'),
 ('Empiètement ou bornage',9,'#b3a81f','Foncier'),
 ('Autre',10,'#9aa0a6','Foncier');
INSERT INTO ref.phase_litige VALUES
 ('Mise en demeure',1,'#c98a12','Précontentieux',true),
 ('Médiation / négociation',2,'#c98a12','Précontentieux',true),
 ('Première instance',3,'#c2412d','Contentieux',true),
 ('Appel',4,'#c2412d','Contentieux',true),
 ('Cassation',5,'#c2412d','Contentieux',true),
 ('Exécution de la décision',6,'#7b4fa3','Exécution',true),
 ('Clos',7,'#0b7a4b','Clos',false);
INSERT INTO ref.partie_adverse_type VALUES
 ('Occupant',1,NULL),('Constructeur / entreprise',2,NULL),('Bailleur',3,NULL),('Tiers revendiquant',4,NULL),('Collectivité ou organisme public',5,NULL),('Autre',6,NULL);
INSERT INTO ref.niveau_risque VALUES ('Faible',1,'#2f9e5b'),('Moyen',2,'#e0912a'),('Élevé',3,'#c2412d');
INSERT INTO ref.type_evenement VALUES
 ('Constat / PV',1,NULL),('Mise en demeure',2,NULL),('Réunion de conciliation',3,NULL),('Assignation',4,NULL),('Audience',5,NULL),
 ('Expertise',6,NULL),('Jugement / arrêt',7,NULL),('Recours',8,NULL),('Paiement reçu',9,NULL),('Protocole d''accord',10,NULL),
 ('Expulsion / reprise des lieux',11,NULL),('Clôture du dossier',12,NULL),('Autre',13,NULL);
INSERT INTO ref.issue_litige VALUES
 ('Favorable à l''État',1,'#2f9e5b'),('Défavorable à l''État',2,'#c2412d'),('Transaction',3,'#c98a12'),('Désistement',4,'#868d95');
