-- =====================================================================
-- PatriBâti — 10. Requêtes de gestion et d'analyse spatiale (exemples)
-- =====================================================================
SET search_path = patrimoine, ref, public;

-- 1. Biens que l'État peine à récupérer : litige ouvert avec reprise de possession attendue
SELECT bien_code, bien_nom, ville, type_litige, phase, partie_adverse,
       round(anciennete_jours / 365.25, 1) AS anciennete_annees, prochaine_echeance, niveau_risque
  FROM v_litige
 WHERE ouvert AND bien_a_recuperer AND NOT bien_recupere
 ORDER BY anciennete_jours DESC;

-- 2. Sommes à recouvrer : contentieux et arriérés de loyers, par bien
SELECT code, nom, ville, reste_a_recouvrer_fcfa, arrieres_fcfa,
       reste_a_recouvrer_fcfa + arrieres_fcfa AS total_a_recouvrer_fcfa
  FROM v_bien_situation
 WHERE reste_a_recouvrer_fcfa + arrieres_fcfa > 0
 ORDER BY total_a_recouvrer_fcfa DESC;

-- 3. Litiges avec les constructeurs : montants en jeu par entreprise
SELECT partie_adverse, count(*) AS nb_litiges, sum(montant_reclame_fcfa) AS reclame_fcfa, sum(montant_recouvre_fcfa) AS recouvre_fcfa
  FROM v_litige WHERE famille = 'Constructeur' GROUP BY 1 ORDER BY 3 DESC;

-- 4. Échéancier de procédure des 90 prochains jours
SELECT prochaine_echeance, objet_echeance, reference, bien_nom, phase, juridiction, service_en_charge
  FROM v_litige WHERE ouvert AND prochaine_echeance BETWEEN current_date AND current_date + 90
 ORDER BY 1;

-- 5. Priorités d'intervention : les 15 biens au score le plus élevé
SELECT code, nom, ville, pays, statut_gestion, etat_vetuste, occupation, score_priorite, cout_renov_fcfa
  FROM v_bien_situation ORDER BY score_priorite DESC, cout_renov_fcfa DESC NULLS LAST LIMIT 15;

-- 6. Gisement de valorisation : biens non affectés inoccupés, avec leur valeur estimée
SELECT code, nom, ville, etat_vetuste, potentiel_valorisation, surface_batie_m2, valeur_estimee_fcfa
  FROM v_bien_situation WHERE regime = 'Non affecté' AND occupation = 'Inoccupé'
 ORDER BY valeur_estimee_fcfa DESC;

-- 7. Rationalisation des locations : biens pris à bail par l'État alors qu'un bien
--    de l'État est inoccupé à moins de 5 km
SELECT l.nom AS bien_loue, l.ville, l.loyer_paye_mensuel_fcfa, v.nom AS bien_etat_inoccupe,
       round(ST_Distance(l.geom::geography, v.geom::geography)) AS distance_m
  FROM v_bien_situation l
  JOIN v_bien_situation v ON v.statut_propriete = 'Propriété de l''État' AND v.occupation = 'Inoccupé'
                         AND v.type_bien <> 'Terrain nu'
                         AND ST_DWithin(l.geom::geography, v.geom::geography, 5000)
 WHERE l.statut_propriete = 'Pris à bail par l''État';

-- 8. Densité d'occupation des bureaux (m² utiles par agent), du plus au moins dense
SELECT code, nom, affectataire, surface_utile_m2, effectif_agents, m2_par_agent
  FROM v_bien_situation WHERE m2_par_agent IS NOT NULL ORDER BY m2_par_agent;

-- 9. Emprise au sol et coefficient d'emprise par assiette
SELECT a.code, a.nom, a.superficie_m2, sum(bt.emprise_m2) AS emprise_batie_m2,
       round(100 * sum(bt.emprise_m2) / NULLIF(a.superficie_m2, 0), 1) AS emprise_pct
  FROM assiette_fonciere a JOIN bien b ON b.assiette_id = a.id JOIN batiment bt ON bt.bien_id = b.id
 GROUP BY a.id ORDER BY emprise_pct DESC;

-- 10. Biens dans un rayon de 2 km autour d'un point (ici le centre de Dakar-Plateau)
SELECT code, nom, round(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(-17.438, 14.669), 4326)::geography)) AS distance_m
  FROM bien WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(-17.438, 14.669), 4326)::geography, 2000)
 ORDER BY 3;

-- 11. Historique des modifications d'un bien (journal d'audit)
SELECT horodatage, utilisateur, operation, avant->>'etat_vetuste' AS etat_avant, apres->>'etat_vetuste' AS etat_apres
  FROM journal WHERE table_nom = 'bien' AND enregistrement_id = 1 ORDER BY horodatage DESC;

-- 12. Données du tableau de bord au format JSON
SELECT patrimoine.export_dashboard();
