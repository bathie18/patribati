-- =====================================================================
-- PatriBâti — 00. Création des rôles et de la base « patribati »
-- À exécuter connecté à la base « postgres » avec un compte administrateur.
-- (CREATE DATABASE ne peut pas s'exécuter dans une transaction.)
-- =====================================================================

-- Rôles de groupe (sans connexion) : on y rattache ensuite les comptes nominatifs.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['patribati_admin','patribati_gestionnaire','patribati_terrain','patribati_lecteur'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
  END LOOP;
END $$;

CREATE DATABASE patribati WITH ENCODING 'UTF8' TEMPLATE template0;
COMMENT ON DATABASE patribati IS 'PatriBâti — cartographie et gestion du patrimoine bâti de l''État du Sénégal (prototype)';
