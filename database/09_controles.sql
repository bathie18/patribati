-- =====================================================================
-- PatriBâti — 09. Contrôles après installation
-- =====================================================================
SET search_path = patrimoine, ref, public;

-- Volumes chargés
SELECT 'assiette_fonciere' AS table_nom, count(*) FROM assiette_fonciere
UNION ALL SELECT 'bien', count(*) FROM bien
UNION ALL SELECT 'batiment', count(*) FROM batiment
UNION ALL SELECT 'titre_occupation', count(*) FROM titre_occupation
UNION ALL SELECT 'visite', count(*) FROM visite
UNION ALL SELECT 'travaux', count(*) FROM travaux
UNION ALL SELECT 'litige', count(*) FROM litige
UNION ALL SELECT 'litige_evenement', count(*) FROM litige_evenement
UNION ALL SELECT 'document', count(*) FROM document
UNION ALL SELECT 'ref.fond_pays', count(*) FROM ref.fond_pays;

-- Indicateurs clés
SELECT * FROM v_tableau_de_bord;

-- Qualité : géométries invalides, biens sans point, bâtiments hors de leur assiette
SELECT 'assiettes invalides' AS controle, count(*) FROM assiette_fonciere WHERE NOT ST_IsValid(geom)
UNION ALL SELECT 'bâtiments invalides', count(*) FROM batiment WHERE NOT ST_IsValid(geom)
UNION ALL SELECT 'biens sans géométrie', count(*) FROM bien WHERE geom IS NULL
UNION ALL SELECT 'bâtiments hors assiette', count(*)
  FROM batiment bt JOIN bien b ON b.id = bt.bien_id JOIN assiette_fonciere a ON a.id = b.assiette_id
 WHERE NOT ST_Intersects(bt.geom, a.geom)
UNION ALL SELECT 'biens non affectés avec affectataire', count(*) FROM bien WHERE regime = 'Non affecté' AND affectataire IS NOT NULL
UNION ALL SELECT 'litiges clos sans date de clôture', count(*) FROM litige WHERE phase = 'Clos' AND date_cloture IS NULL;
