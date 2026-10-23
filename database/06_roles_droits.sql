-- =====================================================================
-- PatriBâti — 06. Droits par profil
--   patribati_admin         : tout, y compris les nomenclatures
--   patribati_gestionnaire  : lecture / écriture des données métier
--   patribati_terrain       : lecture + saisie des visites et des pièces
--   patribati_lecteur       : lecture seule (direction, affectataires, WebSIG)
-- Créer ensuite les comptes nominatifs, par exemple :
--   CREATE ROLE a_diop LOGIN PASSWORD '...' IN ROLE patribati_gestionnaire;
-- =====================================================================
GRANT CONNECT ON DATABASE patribati TO patribati_admin, patribati_gestionnaire, patribati_terrain, patribati_lecteur;
GRANT USAGE ON SCHEMA ref, patrimoine TO patribati_admin, patribati_gestionnaire, patribati_terrain, patribati_lecteur;

GRANT ALL ON ALL TABLES    IN SCHEMA ref, patrimoine TO patribati_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ref, patrimoine TO patribati_admin;

GRANT SELECT ON ALL TABLES IN SCHEMA ref, patrimoine TO patribati_gestionnaire, patribati_terrain, patribati_lecteur;
REVOKE SELECT ON patrimoine.journal FROM patribati_terrain, patribati_lecteur;

GRANT INSERT, UPDATE, DELETE ON patrimoine.assiette_fonciere, patrimoine.bien, patrimoine.batiment,
      patrimoine.titre_occupation, patrimoine.visite, patrimoine.travaux, patrimoine.litige,
      patrimoine.litige_evenement, patrimoine.document TO patribati_gestionnaire;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA patrimoine TO patribati_gestionnaire, patribati_terrain;

GRANT INSERT ON patrimoine.visite, patrimoine.document TO patribati_terrain;

GRANT EXECUTE ON FUNCTION patrimoine.export_dashboard() TO patribati_gestionnaire, patribati_lecteur;

-- Les déclencheurs écrivent dans le journal et mettent à jour la fiche du bien
-- au nom de l'utilisateur : ces deux fonctions s'exécutent avec les droits du propriétaire.
ALTER FUNCTION patrimoine.trg_journal()     SECURITY DEFINER;
ALTER FUNCTION patrimoine.trg_visite_sync() SECURITY DEFINER;
ALTER FUNCTION patrimoine.trg_journal()     SET search_path = patrimoine, ref, public;
ALTER FUNCTION patrimoine.trg_visite_sync() SET search_path = patrimoine, ref, public;
