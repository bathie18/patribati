-- =====================================================================
-- PatriBâti — 05. Vues (carte, alertes, contentieux, tableau de bord)
-- =====================================================================
SET search_path = patrimoine, ref, public;

-- ---------------------------------------------------------------------
-- v_bien_situation : la fiche complète d'un bien, avec sa situation de
-- gestion (litiges, arriérés, alertes, score de priorité). Couche carto.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_bien_situation AS
WITH lit AS (
    SELECT l.bien_id,
           count(*)                                                    AS nb_litiges,
           count(*) FILTER (WHERE p.ouvert)                            AS nb_litiges_ouverts,
           (array_agg(l.phase       ORDER BY p.ordre DESC) FILTER (WHERE p.ouvert))[1] AS phase_litige,
           (array_agg(p.etape       ORDER BY p.ordre DESC) FILTER (WHERE p.ouvert))[1] AS etape_litige,
           (array_agg(l.type_litige ORDER BY p.ordre DESC) FILTER (WHERE p.ouvert))[1] AS type_litige,
           COALESCE(bool_or(p.ouvert AND l.niveau_risque = 'Élevé'), false)            AS risque_eleve,
           COALESCE(bool_or(p.ouvert AND l.bien_a_recuperer AND NOT l.bien_recupere), false) AS a_recuperer,
           COALESCE(sum(l.montant_reclame_fcfa)  FILTER (WHERE p.ouvert), 0)           AS montant_reclame_fcfa,
           COALESCE(sum(l.montant_recouvre_fcfa) FILTER (WHERE p.ouvert), 0)           AS montant_recouvre_fcfa,
           min(l.prochaine_echeance) FILTER (WHERE p.ouvert AND l.prochaine_echeance >= current_date) AS prochaine_echeance
      FROM litige l JOIN ref.phase_litige p ON p.libelle = l.phase
     GROUP BY l.bien_id
), occ AS (
    SELECT bien_id,
           COALESCE(sum(arrieres_fcfa), 0)                                         AS arrieres_fcfa,
           COALESCE(sum(loyer_mensuel_fcfa) FILTER (WHERE sens = 'État bailleur'), 0) AS loyer_percu_mensuel_fcfa,
           COALESCE(sum(loyer_mensuel_fcfa) FILTER (WHERE sens = 'État preneur'), 0)  AS loyer_paye_mensuel_fcfa,
           min(date_fin) FILTER (WHERE date_fin >= current_date)                   AS prochaine_fin_bail
      FROM titre_occupation GROUP BY bien_id
), s AS (
    SELECT b.id, b.code, b.nom, b.type_bien, b.statut_propriete, b.regime, b.affectataire,
           CASE WHEN b.regime = 'Non affecté' THEN 'SOGEPA' ELSE 'Affectataire' END AS responsable_entretien,
           b.occupation, b.usage_actuel, b.effectif_agents,
           b.pays_iso3, b.pays, b.region, b.commune, b.ville, b.adresse,
           b.annee_construction, b.nb_niveaux, b.surface_batie_m2, b.surface_utile_m2,
           CASE WHEN b.effectif_agents > 0 THEN round(b.surface_utile_m2 / b.effectif_agents, 1) END AS m2_par_agent,
           b.etat_vetuste, ev.note AS note_vetuste, b.cout_renov_fcfa, b.valeur_estimee_fcfa,
           b.potentiel_valorisation, b.date_derniere_visite,
           a.code AS assiette_code, a.num_tf, a.titulaire_tf, a.nicad, a.superficie_m2 AS superficie_assiette_m2,
           COALESCE(lit.nb_litiges, 0)          AS nb_litiges,
           COALESCE(lit.nb_litiges_ouverts, 0)  AS nb_litiges_ouverts,
           COALESCE(lit.nb_litiges_ouverts, 0) > 0 AS en_litige,
           COALESCE(lit.etape_litige, CASE WHEN lit.nb_litiges > 0 THEN 'Clos' ELSE 'Aucun litige' END) AS etape_litige,
           lit.phase_litige, lit.type_litige,
           COALESCE(lit.risque_eleve, false)    AS risque_eleve,
           COALESCE(lit.a_recuperer, false)     AS a_recuperer,
           COALESCE(lit.montant_reclame_fcfa, 0)  AS montant_reclame_fcfa,
           COALESCE(lit.montant_recouvre_fcfa, 0) AS montant_recouvre_fcfa,
           GREATEST(COALESCE(lit.montant_reclame_fcfa, 0) - COALESCE(lit.montant_recouvre_fcfa, 0), 0) AS reste_a_recouvrer_fcfa,
           lit.prochaine_echeance,
           COALESCE(occ.arrieres_fcfa, 0)            AS arrieres_fcfa,
           COALESCE(occ.loyer_percu_mensuel_fcfa, 0) AS loyer_percu_mensuel_fcfa,
           COALESCE(occ.loyer_paye_mensuel_fcfa, 0)  AS loyer_paye_mensuel_fcfa,
           occ.prochaine_fin_bail,
           (SELECT count(*) FROM document d WHERE d.bien_id = b.id AND d.categorie = 'Photo')   AS nb_photos,
           (SELECT count(*) FROM document d WHERE d.bien_id = b.id AND d.categorie <> 'Photo')  AS nb_documents,
           (SELECT count(*) FROM travaux t  WHERE t.bien_id = b.id AND t.statut <> 'Terminé')   AS nb_travaux_ouverts,
           b.geom
      FROM bien b
      JOIN ref.etat_vetuste ev ON ev.libelle = b.etat_vetuste
      LEFT JOIN assiette_fonciere a ON a.id = b.assiette_id
      LEFT JOIN lit ON lit.bien_id = b.id
      LEFT JOIN occ ON occ.bien_id = b.id
)
SELECT s.*,
       -- Score de priorité d'intervention (0 à 100) : vétusté, occupation, contentieux, surveillance
       LEAST(100,
             COALESCE((s.note_vetuste - 1) * 10, 0)
           + CASE WHEN s.occupation = 'Occupé sans titre' THEN 20
                  WHEN s.occupation = 'Inoccupé' AND s.regime = 'Non affecté' THEN 15 ELSE 0 END
           + CASE WHEN s.en_litige THEN 20 ELSE 0 END
           + CASE WHEN s.risque_eleve THEN 10 ELSE 0 END
           + CASE WHEN s.arrieres_fcfa > 0 THEN 5 ELSE 0 END
           + CASE WHEN s.date_derniere_visite IS NULL OR s.date_derniere_visite < current_date - 365 THEN 10 ELSE 0 END
       )::int AS score_priorite,
       CASE WHEN s.en_litige                                              THEN 'En litige'
            WHEN s.occupation = 'Occupé sans titre'                       THEN 'Occupation irrégulière'
            WHEN s.regime = 'Non affecté' AND s.occupation = 'Inoccupé'   THEN 'À valoriser'
            WHEN s.etat_vetuste IN ('Très dégradé','En ruine')            THEN 'À réhabiliter'
            ELSE 'Gestion courante' END AS statut_gestion
  FROM s;
COMMENT ON VIEW v_bien_situation IS 'Fiche complète du bien et situation de gestion (litiges, arriérés, score de priorité)';

-- ---------------------------------------------------------------------
-- v_litige : dossiers de litige localisés (point du bien)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_litige AS
SELECT l.id, l.reference, l.objet, l.type_litige, t.famille, l.partie_adverse_type, l.partie_adverse,
       l.date_ouverture, l.phase, p.etape, p.ouvert, l.juridiction, l.service_en_charge,
       l.prochaine_echeance, l.objet_echeance,
       (l.prochaine_echeance - current_date)                         AS jours_avant_echeance,
       l.montant_reclame_fcfa, l.montant_recouvre_fcfa,
       GREATEST(l.montant_reclame_fcfa - l.montant_recouvre_fcfa, 0) AS reste_a_recouvrer_fcfa,
       CASE WHEN l.montant_reclame_fcfa > 0
            THEN round(100.0 * l.montant_recouvre_fcfa / l.montant_reclame_fcfa)::int END AS taux_recouvrement_pct,
       l.niveau_risque, l.bien_a_recuperer, l.bien_recupere, l.issue, l.date_cloture,
       (COALESCE(l.date_cloture, current_date) - l.date_ouverture)   AS anciennete_jours,
       (SELECT max(e.date_evenement) FROM litige_evenement e WHERE e.litige_id = l.id) AS dernier_evenement,
       l.bien_id, b.code AS bien_code, b.nom AS bien_nom, b.regime, b.ville, b.pays,
       l.observations, b.geom
  FROM litige l
  JOIN bien b              ON b.id = l.bien_id
  JOIN ref.type_litige t   ON t.libelle = l.type_litige
  JOIN ref.phase_litige p  ON p.libelle = l.phase;

-- ---------------------------------------------------------------------
-- v_alertes : ce qui demande une action (gravité 1 = information, 3 = urgent)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_alertes AS
SELECT row_number() OVER (ORDER BY x.gravite DESC, x.bien_id, x.alerte)::int AS id, x.*
  FROM (
    SELECT b.id AS bien_id, b.code, b.nom, b.ville, b.pays, 'Occupation' AS categorie, 3 AS gravite,
           'Occupation sans titre' AS alerte, b.geom
      FROM bien b WHERE b.occupation = 'Occupé sans titre'
    UNION ALL
    SELECT b.id, b.code, b.nom, b.ville, b.pays, 'Valorisation', 2, 'Bien non affecté inoccupé : à valoriser', b.geom
      FROM bien b WHERE b.regime = 'Non affecté' AND b.occupation = 'Inoccupé'
    UNION ALL
    SELECT b.id, b.code, b.nom, b.ville, b.pays, 'Surveillance', 1,
           CASE WHEN b.date_derniere_visite IS NULL THEN 'Aucune visite enregistrée'
                ELSE 'Aucune visite depuis plus de 12 mois' END, b.geom
      FROM bien b WHERE b.date_derniere_visite IS NULL OR b.date_derniere_visite < current_date - 365
    UNION ALL
    SELECT b.id, b.code, b.nom, b.ville, b.pays, 'Bail', 2,
           t.type_titre || ' à échéance le ' || to_char(t.date_fin, 'DD/MM/YYYY'), b.geom
      FROM bien b JOIN titre_occupation t ON t.bien_id = b.id
     WHERE t.date_fin BETWEEN current_date AND current_date + 183
    UNION ALL
    SELECT b.id, b.code, b.nom, b.ville, b.pays, 'Recouvrement', 2,
           'Arriérés de loyers : ' || to_char(t.arrieres_fcfa, 'FM999G999G999G999') || ' FCFA', b.geom
      FROM bien b JOIN titre_occupation t ON t.bien_id = b.id WHERE t.arrieres_fcfa > 0
    UNION ALL
    SELECT b.id, b.code, b.nom, b.ville, b.pays, 'Vétusté', 3, 'État très dégradé sans travaux programmés', b.geom
      FROM bien b
     WHERE b.etat_vetuste IN ('Très dégradé','En ruine')
       AND NOT EXISTS (SELECT 1 FROM travaux t WHERE t.bien_id = b.id AND t.statut <> 'Terminé')
    UNION ALL
    SELECT l.bien_id, l.bien_code, l.bien_nom, l.ville, l.pays, 'Litige',
           CASE WHEN l.niveau_risque = 'Élevé' THEN 3 ELSE 2 END,
           'Litige en cours (' || lower(l.phase) || ') : ' || lower(l.type_litige), l.geom
      FROM v_litige l WHERE l.ouvert
    UNION ALL
    SELECT l.bien_id, l.bien_code, l.bien_nom, l.ville, l.pays, 'Litige', 3,
           'Échéance de procédure le ' || to_char(l.prochaine_echeance, 'DD/MM/YYYY')
             || COALESCE(' : ' || l.objet_echeance, ''), l.geom
      FROM v_litige l WHERE l.ouvert AND l.jours_avant_echeance BETWEEN 0 AND 45
    UNION ALL
    SELECT l.bien_id, l.bien_code, l.bien_nom, l.ville, l.pays, 'Litige', 2,
           'Litige sans acte de procédure depuis plus de 6 mois', l.geom
      FROM v_litige l WHERE l.ouvert AND COALESCE(l.dernier_evenement, l.date_ouverture) < current_date - 183
  ) x;

-- ---------------------------------------------------------------------
-- Synthèses
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_synthese_pays AS
SELECT row_number() OVER (ORDER BY s.pays)::int AS id, s.pays_iso3, s.pays,
       count(*)                                         AS nb_biens,
       count(*) FILTER (WHERE s.regime = 'Non affecté') AS nb_non_affectes,
       count(*) FILTER (WHERE s.occupation = 'Inoccupé') AS nb_inoccupes,
       count(*) FILTER (WHERE s.en_litige)              AS nb_en_litige,
       count(*) FILTER (WHERE s.note_vetuste >= 4)      AS nb_tres_degrades,
       sum(s.surface_batie_m2)                          AS surface_batie_m2,
       sum(s.cout_renov_fcfa)                           AS cout_renov_fcfa,
       sum(s.valeur_estimee_fcfa)                       AS valeur_estimee_fcfa,
       sum(s.reste_a_recouvrer_fcfa + s.arrieres_fcfa)  AS a_recouvrer_fcfa,
       ST_Centroid(ST_Collect(s.geom))::geometry(Point, 4326) AS geom
  FROM v_bien_situation s GROUP BY s.pays_iso3, s.pays;

CREATE OR REPLACE VIEW v_synthese_region AS
SELECT s.region,
       count(*) AS nb_biens,
       count(*) FILTER (WHERE s.regime = 'Non affecté') AS nb_non_affectes,
       count(*) FILTER (WHERE s.en_litige)              AS nb_en_litige,
       sum(s.surface_batie_m2)    AS surface_batie_m2,
       sum(s.cout_renov_fcfa)     AS cout_renov_fcfa,
       round(avg(s.score_priorite)) AS score_priorite_moyen
  FROM v_bien_situation s WHERE s.pays_iso3 = 'SEN' GROUP BY s.region;

-- Inventaire par affectataire (réponse à la demande d'inventaire par ministère)
CREATE OR REPLACE VIEW v_inventaire_affectataire AS
SELECT COALESCE(s.affectataire, 'Non affecté (SOGEPA)') AS affectataire,
       count(*)                       AS nb_biens,
       sum(s.surface_utile_m2)        AS surface_utile_m2,
       sum(s.effectif_agents)         AS effectif_agents,
       CASE WHEN sum(s.effectif_agents) > 0
            THEN round(sum(s.surface_utile_m2) FILTER (WHERE s.effectif_agents > 0) / sum(s.effectif_agents), 1) END AS m2_par_agent,
       sum(s.loyer_paye_mensuel_fcfa) * 12 AS loyers_payes_annuels_fcfa,
       sum(s.cout_renov_fcfa)         AS cout_renov_fcfa
  FROM v_bien_situation s GROUP BY 1;

CREATE OR REPLACE VIEW v_suivi_travaux AS
SELECT t.id, b.code AS bien_code, b.nom AS bien_nom, b.ville, b.pays, t.type_travaux, t.statut,
       t.date_debut, t.date_fin, t.avancement_pct, t.entreprise, t.cout_fcfa,
       (t.statut IN ('En cours','Suspendu') AND t.date_fin < current_date) AS en_retard
  FROM travaux t JOIN bien b ON b.id = t.bien_id;

-- Loyers : ce que l'État doit encaisser et ce qui reste dû
CREATE OR REPLACE VIEW v_recouvrement_loyers AS
SELECT t.id, b.code AS bien_code, b.nom AS bien_nom, b.ville, t.type_titre, t.occupant,
       t.loyer_mensuel_fcfa, t.arrieres_fcfa, t.date_dernier_paiement,
       CASE WHEN t.loyer_mensuel_fcfa > 0 THEN round(t.arrieres_fcfa::numeric / t.loyer_mensuel_fcfa, 1) END AS mois_impayes,
       EXISTS (SELECT 1 FROM v_litige l WHERE l.bien_id = b.id AND l.ouvert) AS litige_ouvert
  FROM titre_occupation t JOIN bien b ON b.id = t.bien_id
 WHERE t.sens = 'État bailleur';

-- Indicateurs clés (une ligne)
CREATE OR REPLACE VIEW v_tableau_de_bord AS
SELECT count(*)                                            AS nb_biens,
       count(DISTINCT s.pays_iso3)                         AS nb_pays,
       count(*) FILTER (WHERE s.regime = 'Non affecté')    AS nb_non_affectes,
       sum(s.surface_batie_m2)                             AS surface_batie_m2,
       sum(s.valeur_estimee_fcfa)                          AS valeur_estimee_fcfa,
       sum(s.cout_renov_fcfa)                              AS cout_renov_fcfa,
       sum(s.loyer_percu_mensuel_fcfa) * 12                AS loyers_percus_annuels_fcfa,
       sum(s.loyer_paye_mensuel_fcfa) * 12                 AS loyers_payes_annuels_fcfa,
       count(*) FILTER (WHERE s.en_litige)                 AS nb_biens_en_litige,
       count(*) FILTER (WHERE s.a_recuperer)               AS nb_biens_a_recuperer,
       sum(s.reste_a_recouvrer_fcfa)                       AS contentieux_a_recouvrer_fcfa,
       sum(s.arrieres_fcfa)                                AS arrieres_loyers_fcfa,
       (SELECT count(DISTINCT bien_id) FROM v_alertes)     AS nb_biens_avec_alerte
  FROM v_bien_situation s;

-- Recherche unifiée (barre de recherche du WebSIG)
CREATE OR REPLACE VIEW v_recherche AS
SELECT 'bien-' || b.id AS uid, 'Bien' AS categorie, b.nom || ' (' || b.code || ')' AS libelle,
       concat_ws(', ', b.commune, b.ville, b.pays) AS localisation, b.geom
  FROM bien b
UNION ALL
SELECT 'tf-' || a.id, 'Titre foncier', a.num_tf || ' – ' || a.nom, concat_ws(', ', a.commune, a.ville, a.pays),
       ST_PointOnSurface(a.geom)
  FROM assiette_fonciere a WHERE a.num_tf IS NOT NULL
UNION ALL
SELECT 'lit-' || l.id, 'Litige', l.reference || ' – ' || l.bien_nom, concat_ws(', ', l.ville, l.pays), l.geom
  FROM v_litige l;

-- ---------------------------------------------------------------------
-- Export JSON pour l'application web (voir tools/exporter_depuis_postgis.sh)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION patrimoine.export_dashboard() RETURNS jsonb LANGUAGE sql STABLE AS $$
SELECT jsonb_build_object('date', current_date, 'biens', COALESCE(jsonb_agg(x.o ORDER BY x.id), '[]'::jsonb))
FROM (
  SELECT s.id, jsonb_build_object(
    'id', s.id, 'code', s.code, 'nom', s.nom, 'type', s.type_bien,
    'pays', s.pays, 'paysId', COALESCE(fp.code_n3, ''), 'region', s.region, 'commune', s.commune, 'ville', s.ville,
    'lon', round(ST_X(s.geom)::numeric, 6), 'lat', round(ST_Y(s.geom)::numeric, 6),
    'regime', s.regime, 'affectataire', s.affectataire, 'occupation', s.occupation, 'statut', s.statut_propriete,
    'etat', s.etat_vetuste, 'annee', s.annee_construction, 'niveaux', s.nb_niveaux,
    'surface', s.surface_batie_m2, 'utile', s.surface_utile_m2, 'effectif', s.effectif_agents,
    'assiette', s.superficie_assiette_m2, 'tf', s.num_tf, 'nicad', s.nicad,
    'cout', s.cout_renov_fcfa, 'valeur', s.valeur_estimee_fcfa, 'potentiel', s.potentiel_valorisation,
    'visite', s.date_derniere_visite, 'score', s.score_priorite, 'gestion', s.statut_gestion
  ) || jsonb_build_object(
    'baux', COALESCE((SELECT jsonb_agg(jsonb_build_object('sens', t.sens, 'titre', t.type_titre, 'occupant', t.occupant,
              'debut', t.date_debut, 'fin', t.date_fin, 'loyer', t.loyer_mensuel_fcfa, 'arrieres', t.arrieres_fcfa) ORDER BY t.id)
              FROM patrimoine.titre_occupation t WHERE t.bien_id = s.id), '[]'::jsonb),
    'travaux', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', t.type_travaux, 'statut', t.statut, 'debut', t.date_debut,
              'fin', t.date_fin, 'av', t.avancement_pct, 'entreprise', t.entreprise, 'cout', t.cout_fcfa) ORDER BY t.id)
              FROM patrimoine.travaux t WHERE t.bien_id = s.id), '[]'::jsonb),
    'docs', COALESCE((SELECT jsonb_agg(jsonb_build_object('cat', d.categorie, 'titre', d.titre, 'date', d.date_doc,
              'ext', upper(substring(d.chemin from '\.([A-Za-z0-9]{2,4})$'))) ORDER BY d.id)
              FROM patrimoine.document d WHERE d.bien_id = s.id AND d.categorie <> 'Photo'), '[]'::jsonb),
    'photos', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', d.titre) ORDER BY d.id)
              FROM patrimoine.document d WHERE d.bien_id = s.id AND d.categorie = 'Photo'), '[]'::jsonb),
    'litiges', COALESCE((SELECT jsonb_agg(jsonb_build_object('ref', l.reference, 'objet', l.objet, 'type', l.type_litige,
              'famille', l.famille, 'partieType', l.partie_adverse_type, 'partie', l.partie_adverse,
              'ouverture', l.date_ouverture, 'phase', l.phase, 'etape', l.etape, 'ouvert', l.ouvert,
              'juridiction', l.juridiction, 'service', l.service_en_charge,
              'echeance', l.prochaine_echeance, 'objetEcheance', l.objet_echeance,
              'reclame', l.montant_reclame_fcfa, 'recouvre', l.montant_recouvre_fcfa, 'risque', l.niveau_risque,
              'aRecuperer', l.bien_a_recuperer, 'recupere', l.bien_recupere, 'issue', l.issue, 'cloture', l.date_cloture,
              'evenements', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', e.date_evenement, 'type', e.type_evenement,
                              'desc', e.description) ORDER BY e.date_evenement, e.id)
                              FROM patrimoine.litige_evenement e WHERE e.litige_id = l.id), '[]'::jsonb)) ORDER BY l.date_ouverture)
              FROM patrimoine.v_litige l WHERE l.bien_id = s.id), '[]'::jsonb)
  ) AS o
  FROM patrimoine.v_bien_situation s
  LEFT JOIN LATERAL (SELECT code_n3 FROM ref.fond_pays f WHERE f.iso3 = s.pays_iso3 LIMIT 1) fp ON true
) x
$$;
COMMENT ON FUNCTION patrimoine.export_dashboard() IS 'Renvoie tout le patrimoine au format attendu par le tableau de bord HTML';
