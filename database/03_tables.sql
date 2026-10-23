-- =====================================================================
-- PatriBâti — 03. Tables métier (schéma patrimoine) — SRID 4326 (WGS 84)
--
--   assiette_fonciere 1 ── n bien 1 ── n batiment (emprises)
--                              ├── n titre_occupation (baux, conventions, arriérés)
--                              ├── n visite           (surveillance)
--                              ├── n travaux          (suivi des chantiers)
--                              ├── n litige 1 ── n litige_evenement (contentieux)
--                              └── n document         (pièces, photos)
-- =====================================================================
SET search_path = patrimoine, ref, public;

-- Fond de carte : pays du monde (Natural Earth 1:50m). Facultatif : à remplir avec les limites de pays (Natural Earth ou couche CEGIT)
CREATE TABLE ref.fond_pays (
    id       serial PRIMARY KEY,
    code_n3  text,                 -- code ISO 3166-1 numérique
    iso3     char(3),              -- renseigné pour les pays où l'État détient un bien
    nom      text,                 -- nom anglais (source)
    nom_fr   text,
    geom     geometry(MultiPolygon, 4326)
);
CREATE INDEX fond_pays_geom_idx ON ref.fond_pays USING gist (geom);

-- ---------------------------------------------------------------- foncier
CREATE TABLE assiette_fonciere (
    id             serial PRIMARY KEY,
    code           text UNIQUE NOT NULL,
    nom            text NOT NULL,
    pays_iso3      char(3) NOT NULL DEFAULT 'SEN',
    pays           text NOT NULL DEFAULT 'Sénégal',
    region         text,
    departement    text,
    commune        text,
    ville          text,
    adresse        text,
    num_tf         text,
    titulaire_tf   text DEFAULT 'État du Sénégal',
    nicad          text,
    superficie_m2  numeric(12,2),
    nature         text NOT NULL DEFAULT 'Terrain bâti'
                   CHECK (nature IN ('Terrain bâti','Terrain nu','Terrain partiellement bâti')),
    observations   text,
    geom           geometry(MultiPolygon, 4326),
    cree_le        timestamptz NOT NULL DEFAULT now(),
    maj_le         timestamptz NOT NULL DEFAULT now(),
    maj_par        text DEFAULT current_user
);
CREATE INDEX assiette_fonciere_geom_idx ON assiette_fonciere USING gist (geom);
COMMENT ON TABLE assiette_fonciere IS 'Terrain d''assiette : titre foncier, références cadastrales, superficie';
COMMENT ON COLUMN assiette_fonciere.num_tf IS 'Numéro du titre foncier';
COMMENT ON COLUMN assiette_fonciere.nicad  IS 'Numéro d''identification cadastrale';

-- ------------------------------------------------------------------- bien
CREATE TABLE bien (
    id                     serial PRIMARY KEY,
    code                   text UNIQUE,                    -- généré si vide (PBE-<pays>-<n°>)
    nom                    text NOT NULL,
    assiette_id            integer REFERENCES assiette_fonciere(id) ON DELETE SET NULL,
    type_bien              text NOT NULL REFERENCES ref.type_bien ON UPDATE CASCADE,
    statut_propriete       text NOT NULL DEFAULT 'Propriété de l''État' REFERENCES ref.statut_propriete ON UPDATE CASCADE,
    regime                 text NOT NULL DEFAULT 'Non affecté' REFERENCES ref.regime ON UPDATE CASCADE,
    affectataire           text,
    occupation             text NOT NULL DEFAULT 'Inoccupé' REFERENCES ref.occupation ON UPDATE CASCADE,
    usage_actuel           text,
    effectif_agents        integer CHECK (effectif_agents >= 0),
    pays_iso3              char(3) NOT NULL DEFAULT 'SEN',
    pays                   text NOT NULL DEFAULT 'Sénégal',
    region                 text,
    commune                text,
    ville                  text,
    adresse                text,
    annee_construction     integer CHECK (annee_construction BETWEEN 1700 AND 2100),
    nb_niveaux             integer,
    surface_batie_m2       numeric(12,2),
    surface_utile_m2       numeric(12,2),
    etat_vetuste           text NOT NULL DEFAULT 'Non évalué' REFERENCES ref.etat_vetuste ON UPDATE CASCADE,
    cout_renov_fcfa        bigint,
    valeur_estimee_fcfa    bigint,
    potentiel_valorisation text NOT NULL DEFAULT 'À déterminer' REFERENCES ref.potentiel_valorisation ON UPDATE CASCADE,
    date_derniere_visite   date,
    observations           text,
    geom                   geometry(Point, 4326),
    cree_le                timestamptz NOT NULL DEFAULT now(),
    maj_le                 timestamptz NOT NULL DEFAULT now(),
    maj_par                text DEFAULT current_user
);
CREATE INDEX bien_geom_idx ON bien USING gist (geom);
CREATE INDEX bien_assiette_idx ON bien (assiette_id);
CREATE INDEX bien_regime_idx ON bien (regime);
COMMENT ON TABLE bien IS 'Bien du patrimoine bâti de l''État (bâtiment, ensemble bâti ou terrain nu), au Sénégal ou à l''étranger';
COMMENT ON COLUMN bien.regime IS 'Non affecté = géré par la SOGEPA ; affectation juridique ou fonctionnelle = entretien à la charge de l''affectataire';
COMMENT ON COLUMN bien.effectif_agents IS 'Nombre d''agents hébergés (ratio m² par agent)';
COMMENT ON COLUMN bien.potentiel_valorisation IS 'Orientation proposée pour la valorisation du bien';

-- --------------------------------------------------------------- batiment
CREATE TABLE batiment (
    id          serial PRIMARY KEY,
    bien_id     integer NOT NULL REFERENCES bien(id) ON DELETE CASCADE,
    nom         text,
    nb_niveaux  integer,
    emprise_m2  numeric(12,2),                 -- calculée à partir de la géométrie
    geom        geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX batiment_geom_idx ON batiment USING gist (geom);
CREATE INDEX batiment_bien_idx ON batiment (bien_id);
COMMENT ON TABLE batiment IS 'Emprise au sol de chaque bâtiment d''un bien';

-- ------------------------------------------------------- titre_occupation
CREATE TABLE titre_occupation (
    id                    serial PRIMARY KEY,
    bien_id               integer NOT NULL REFERENCES bien(id) ON DELETE CASCADE,
    sens                  text NOT NULL CHECK (sens IN ('État bailleur','État preneur')),
    type_titre            text NOT NULL REFERENCES ref.type_titre ON UPDATE CASCADE,
    occupant              text,
    reference_acte        text,
    date_debut            date,
    date_fin              date,
    loyer_mensuel_fcfa    bigint,
    arrieres_fcfa         bigint NOT NULL DEFAULT 0,
    date_dernier_paiement date,
    observations          text
);
CREATE INDEX titre_occupation_bien_idx ON titre_occupation (bien_id);
COMMENT ON TABLE titre_occupation IS 'Baux et conventions : l''État bailleur (recettes) ou preneur (loyers payés)';
COMMENT ON COLUMN titre_occupation.arrieres_fcfa IS 'Loyers ou redevances échus et non payés';

-- ----------------------------------------------------------------- visite
CREATE TABLE visite (
    id                    serial PRIMARY KEY,
    bien_id               integer NOT NULL REFERENCES bien(id) ON DELETE CASCADE,
    date_visite           date NOT NULL DEFAULT current_date,
    agent                 text,
    etat_constate         text REFERENCES ref.etat_vetuste ON UPDATE CASCADE,
    occupation_constatee  text REFERENCES ref.occupation ON UPDATE CASCADE,
    occupation_conforme   boolean,
    observations          text
);
CREATE INDEX visite_bien_idx ON visite (bien_id);
COMMENT ON TABLE visite IS 'Visites de surveillance (saisie terrain) : état physique et conditions d''occupation';

-- ---------------------------------------------------------------- travaux
CREATE TABLE travaux (
    id              serial PRIMARY KEY,
    bien_id         integer NOT NULL REFERENCES bien(id) ON DELETE CASCADE,
    type_travaux    text NOT NULL REFERENCES ref.type_travaux ON UPDATE CASCADE,
    statut          text NOT NULL DEFAULT 'Programmé' REFERENCES ref.statut_travaux ON UPDATE CASCADE,
    date_debut      date,
    date_fin        date,
    avancement_pct  integer NOT NULL DEFAULT 0 CHECK (avancement_pct BETWEEN 0 AND 100),
    entreprise      text,
    cout_fcfa       bigint,
    observations    text
);
CREATE INDEX travaux_bien_idx ON travaux (bien_id);

-- ----------------------------------------------------------------- litige
CREATE TABLE litige (
    id                     serial PRIMARY KEY,
    bien_id                integer NOT NULL REFERENCES bien(id) ON DELETE CASCADE,
    reference              text UNIQUE,                   -- générée si vide (LIT-<année>-<n°>)
    objet                  text NOT NULL,
    type_litige            text NOT NULL REFERENCES ref.type_litige ON UPDATE CASCADE,
    partie_adverse_type    text NOT NULL REFERENCES ref.partie_adverse_type ON UPDATE CASCADE,
    partie_adverse         text,
    date_ouverture         date NOT NULL DEFAULT current_date,
    phase                  text NOT NULL DEFAULT 'Mise en demeure' REFERENCES ref.phase_litige ON UPDATE CASCADE,
    juridiction            text,
    service_en_charge      text,
    prochaine_echeance     date,
    objet_echeance         text,
    montant_reclame_fcfa   bigint NOT NULL DEFAULT 0,
    montant_recouvre_fcfa  bigint NOT NULL DEFAULT 0,
    niveau_risque          text NOT NULL DEFAULT 'Moyen' REFERENCES ref.niveau_risque ON UPDATE CASCADE,
    bien_a_recuperer       boolean NOT NULL DEFAULT false,
    bien_recupere          boolean NOT NULL DEFAULT false,
    issue                  text CHECK (issue IN ('Favorable à l''État','Défavorable à l''État','Transaction','Désistement')),
    date_cloture           date,
    observations           text,
    cree_le                timestamptz NOT NULL DEFAULT now(),
    maj_le                 timestamptz NOT NULL DEFAULT now(),
    maj_par                text DEFAULT current_user
);
CREATE INDEX litige_bien_idx ON litige (bien_id);
CREATE INDEX litige_phase_idx ON litige (phase);
COMMENT ON TABLE litige IS 'Dossier de litige entre l''État et un occupant, un constructeur ou un tiers';
COMMENT ON COLUMN litige.bien_a_recuperer IS 'Vrai si l''enjeu est la reprise de possession du bien';
COMMENT ON COLUMN litige.montant_reclame_fcfa IS 'Somme réclamée par l''État (arriérés, indemnités, pénalités, reprise de malfaçons)';

CREATE TABLE litige_evenement (
    id              serial PRIMARY KEY,
    litige_id       integer NOT NULL REFERENCES litige(id) ON DELETE CASCADE,
    date_evenement  date NOT NULL DEFAULT current_date,
    type_evenement  text NOT NULL REFERENCES ref.type_evenement ON UPDATE CASCADE,
    description     text
);
CREATE INDEX litige_evenement_litige_idx ON litige_evenement (litige_id);
COMMENT ON TABLE litige_evenement IS 'Chronologie de la procédure';

-- --------------------------------------------------------------- document
CREATE TABLE document (
    id           serial PRIMARY KEY,
    bien_id      integer REFERENCES bien(id) ON DELETE CASCADE,
    assiette_id  integer REFERENCES assiette_fonciere(id) ON DELETE CASCADE,
    litige_id    integer REFERENCES litige(id) ON DELETE CASCADE,
    categorie    text NOT NULL REFERENCES ref.categorie_document ON UPDATE CASCADE,
    titre        text NOT NULL,
    chemin       text NOT NULL,               -- clé de l'objet dans le stockage de fichiers (MinIO), ou URL
    date_doc     date,
    ajoute_par   text DEFAULT current_user,
    ajoute_le    timestamptz NOT NULL DEFAULT now(),
    CHECK (bien_id IS NOT NULL OR assiette_id IS NOT NULL OR litige_id IS NOT NULL)
);
CREATE INDEX document_bien_idx ON document (bien_id);
CREATE INDEX document_litige_idx ON document (litige_id);
COMMENT ON TABLE document IS 'Fonds documentaire et album photo, rattachés à un bien, une assiette ou un litige';

-- ---------------------------------------------------------------- journal
CREATE TABLE journal (
    id                bigserial PRIMARY KEY,
    horodatage        timestamptz NOT NULL DEFAULT now(),
    utilisateur       text NOT NULL DEFAULT session_user,
    table_nom         text NOT NULL,
    operation         text NOT NULL,
    enregistrement_id integer,
    avant             jsonb,
    apres             jsonb
);
CREATE INDEX journal_cible_idx ON journal (table_nom, enregistrement_id);
COMMENT ON TABLE journal IS 'Journal d''audit : qui a modifié quoi et quand';
