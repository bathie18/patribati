-- =====================================================================
-- PatriBâti — Installation complète avec psql
--   psql -U postgres -d postgres -f installer.sql
-- (se placer dans le dossier database ; voir aussi installer.bat / installer.sh)
-- Sans psql : exécuter les fichiers 00 à 09 un par un (sauf 07, absent) dans pgAdmin,
-- le 00 sur la base « postgres », les suivants sur la base « patribati ».
-- =====================================================================
\set ON_ERROR_STOP on
\encoding UTF8
\ir 00_creer_base.sql
\connect patribati
\ir 01_schemas_extensions.sql
\ir 02_nomenclatures.sql
\ir 03_tables.sql
\ir 04_fonctions_triggers.sql
\ir 05_vues.sql
\ir 06_roles_droits.sql
\ir 08_donnees_demo.sql
\ir 09_controles.sql
