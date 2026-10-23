-- =====================================================================
-- PatriBâti — 04. Fonctions et déclencheurs
-- =====================================================================
SET search_path = patrimoine, ref, public;

-- Horodatage et auteur de la dernière modification
CREATE OR REPLACE FUNCTION patrimoine.trg_maj() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.maj_le  := now();
    NEW.maj_par := current_user;
    RETURN NEW;
END $$;
CREATE TRIGGER t_assiette_maj BEFORE UPDATE ON assiette_fonciere FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_maj();
CREATE TRIGGER t_bien_maj     BEFORE UPDATE ON bien              FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_maj();
CREATE TRIGGER t_litige_maj   BEFORE UPDATE ON litige            FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_maj();

-- Code du bien généré à la création si non saisi : PBE-SEN-0054
CREATE OR REPLACE FUNCTION patrimoine.trg_bien_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
        NEW.code := 'PBE-' || COALESCE(NEW.pays_iso3, 'XXX') || '-' || lpad(NEW.id::text, 4, '0');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER t_bien_code BEFORE INSERT ON bien FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_bien_code();

-- Superficie de l'assiette et emprise des bâtiments calculées depuis la géométrie
CREATE OR REPLACE FUNCTION patrimoine.trg_assiette_superficie() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.geom IS NOT NULL AND (NEW.superficie_m2 IS NULL OR NEW.superficie_m2 = 0) THEN
        NEW.superficie_m2 := round(ST_Area(NEW.geom::geography)::numeric, 2);
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER t_assiette_superficie BEFORE INSERT OR UPDATE OF geom ON assiette_fonciere
    FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_assiette_superficie();

CREATE OR REPLACE FUNCTION patrimoine.trg_batiment_emprise() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.emprise_m2 := round(ST_Area(NEW.geom::geography)::numeric, 2);
    RETURN NEW;
END $$;
CREATE TRIGGER t_batiment_emprise BEFORE INSERT OR UPDATE OF geom ON batiment
    FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_batiment_emprise();

-- Un bien saisi sans point reçoit le centre de son assiette
CREATE OR REPLACE FUNCTION patrimoine.trg_bien_point() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.geom IS NULL AND NEW.assiette_id IS NOT NULL THEN
        SELECT ST_PointOnSurface(a.geom) INTO NEW.geom FROM patrimoine.assiette_fonciere a WHERE a.id = NEW.assiette_id;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER t_bien_point BEFORE INSERT OR UPDATE OF assiette_id ON bien
    FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_bien_point();

-- La visite la plus récente met à jour la fiche du bien
CREATE OR REPLACE FUNCTION patrimoine.trg_visite_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE patrimoine.bien
       SET date_derniere_visite = NEW.date_visite,
           etat_vetuste = COALESCE(NEW.etat_constate, etat_vetuste),
           occupation   = COALESCE(NEW.occupation_constatee, occupation)
     WHERE id = NEW.bien_id
       AND (date_derniere_visite IS NULL OR date_derniere_visite <= NEW.date_visite);
    RETURN NEW;
END $$;
CREATE TRIGGER t_visite_sync AFTER INSERT ON visite FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_visite_sync();

-- Litige : référence automatique, cohérence de la clôture
CREATE OR REPLACE FUNCTION patrimoine.trg_litige_regles() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.reference IS NULL OR btrim(NEW.reference) = '' THEN
        NEW.reference := 'LIT-' || to_char(NEW.date_ouverture, 'YYYY') || '-' || lpad(NEW.id::text, 4, '0');
    END IF;
    IF NEW.phase = 'Clos' AND NEW.date_cloture IS NULL THEN
        NEW.date_cloture := current_date;
    END IF;
    IF NEW.phase <> 'Clos' THEN
        NEW.date_cloture := NULL;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER t_litige_regles BEFORE INSERT OR UPDATE ON litige FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_litige_regles();

-- Un paiement reçu ou une clôture saisis dans la chronologie se répercutent sur le dossier
CREATE OR REPLACE FUNCTION patrimoine.trg_evenement_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.type_evenement = 'Clôture du dossier' THEN
        UPDATE patrimoine.litige SET phase = 'Clos', date_cloture = NEW.date_evenement WHERE id = NEW.litige_id AND phase <> 'Clos';
    ELSIF NEW.type_evenement = 'Expulsion / reprise des lieux' THEN
        UPDATE patrimoine.litige SET bien_recupere = true WHERE id = NEW.litige_id;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER t_evenement_sync AFTER INSERT ON litige_evenement FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_evenement_sync();

-- Journal d'audit (la géométrie n'est pas recopiée)
CREATE OR REPLACE FUNCTION patrimoine.trg_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE av jsonb; ap jsonb;
BEGIN
    IF TG_OP <> 'INSERT' THEN av := to_jsonb(OLD) - 'geom'; END IF;
    IF TG_OP <> 'DELETE' THEN ap := to_jsonb(NEW) - 'geom'; END IF;
    INSERT INTO patrimoine.journal (table_nom, operation, enregistrement_id, avant, apres)
    VALUES (TG_TABLE_NAME, TG_OP, COALESCE((ap->>'id')::int, (av->>'id')::int), av, ap);
    RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER t_journal_bien     AFTER INSERT OR UPDATE OR DELETE ON bien              FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_journal();
CREATE TRIGGER t_journal_assiette AFTER INSERT OR UPDATE OR DELETE ON assiette_fonciere FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_journal();
CREATE TRIGGER t_journal_titre    AFTER INSERT OR UPDATE OR DELETE ON titre_occupation  FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_journal();
CREATE TRIGGER t_journal_litige   AFTER INSERT OR UPDATE OR DELETE ON litige            FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_journal();
CREATE TRIGGER t_journal_travaux  AFTER INSERT OR UPDATE OR DELETE ON travaux           FOR EACH ROW EXECUTE FUNCTION patrimoine.trg_journal();
