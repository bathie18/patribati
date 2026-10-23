-- =====================================================================
-- PatriBâti — 01. Extensions et schémas (à exécuter dans la base patribati)
-- Architecture fonctionnelle :
--   ref         : nomenclatures (listes de valeurs) et fond de carte des pays
--   patrimoine  : données métier (foncier, biens, occupation, surveillance,
--                 travaux, contentieux, documents) + vues + journal d'audit
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS patrimoine;
COMMENT ON SCHEMA ref IS 'Nomenclatures et référentiels';
COMMENT ON SCHEMA patrimoine IS 'Patrimoine bâti de l''État : données métier, vues et journal';

ALTER DATABASE patribati SET search_path = patrimoine, ref, public;
SET search_path = patrimoine, ref, public;
