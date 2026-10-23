#!/usr/bin/env python3
"""PatriBâti — complète le jeu de démonstration avec le réseau diplomatique et consulaire.

Ajoute des biens FICTIFS à l'étranger (chancelleries, résidences, consulats, missions
permanentes, logements de fonction, foyer d'étudiants) avec leurs assiettes foncières,
emprises bâties, baux, visites, travaux, documents et quelques litiges.

Reproductible (graine fixe) et idempotent : les biens d'identifiant > 53 sont retirés puis régénérés.
Met à jour data/patribati-base.json, data/geojson/{biens,assiettes_foncieres,batiments}.geojson
et data/csv/visites.csv. Lancer ensuite tools/build_data.py.
"""
import csv
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BASE_MAX_ID = 53
rng = random.Random(221)

MAE = "Ministère chargé des Affaires étrangères"
# (pays, iso3, code numérique ISO, ville, lat, lon, [(type, intitulé)])
CH, RE, CO, MP, LF, AU = "Chancellerie / ambassade", "Résidence diplomatique", "Consulat", "Chancellerie / ambassade", "Logement de fonction", "Autre"
SITES = [
    ("France", "FRA", "250", "Marseille", 43.2965, 5.3698, [(CO, "Consulat général")]),
    ("France", "FRA", "250", "Lyon", 45.7640, 4.8357, [(CO, "Consulat général")]),
    ("France", "FRA", "250", "Bordeaux", 44.8378, -0.5792, [(CO, "Consulat")]),
    ("France", "FRA", "250", "Paris", 48.8530, 2.2700, [(LF, "Logement de fonction"), (AU, "Foyer des étudiants")]),
    ("États-Unis", "USA", "840", "Washington", 38.9400, -77.0600, [(RE, "Résidence de l'ambassadeur")]),
    ("États-Unis", "USA", "840", "New York", 40.7505, -73.9680, [(MP, "Mission permanente auprès des Nations unies"), (RE, "Résidence du représentant permanent")]),
    ("Italie", "ITA", "380", "Milan", 45.4642, 9.1900, [(CO, "Consulat général")]),
    ("Italie", "ITA", "380", "Rome", 41.9200, 12.4800, [(RE, "Résidence de l'ambassadeur")]),
    ("Espagne", "ESP", "724", "Madrid", 40.4400, -3.6900, [(CH, "Chancellerie")]),
    ("Espagne", "ESP", "724", "Barcelone", 41.3900, 2.1700, [(CO, "Consulat général")]),
    ("Espagne", "ESP", "724", "Las Palmas", 28.1200, -15.4300, [(CO, "Consulat")]),
    ("Belgique", "BEL", "056", "Bruxelles", 50.8200, 4.3800, [(RE, "Résidence de l'ambassadeur")]),
    ("Suisse", "CHE", "756", "Berne", 46.9480, 7.4474, [(CH, "Chancellerie")]),
    ("Suisse", "CHE", "756", "Genève", 46.2200, 6.1400, [(MP, "Mission permanente auprès de l'Office des Nations unies")]),
    ("Allemagne", "DEU", "276", "Berlin", 52.4700, 13.2700, [(RE, "Résidence de l'ambassadeur")]),
    ("Royaume-Uni", "GBR", "826", "Londres", 51.5000, -0.1900, [(CH, "Chancellerie")]),
    ("Pays-Bas", "NLD", "528", "La Haye", 52.0800, 4.3000, [(CH, "Chancellerie")]),
    ("Portugal", "PRT", "620", "Lisbonne", 38.7200, -9.1400, [(CH, "Chancellerie")]),
    ("Autriche", "AUT", "040", "Vienne", 48.2100, 16.3700, [(CH, "Chancellerie")]),
    ("Suède", "SWE", "752", "Stockholm", 59.3300, 18.0700, [(CH, "Chancellerie")]),
    ("Russie", "RUS", "643", "Moscou", 55.7500, 37.6200, [(CH, "Chancellerie"), (RE, "Résidence de l'ambassadeur")]),
    ("Turquie", "TUR", "792", "Ankara", 39.9300, 32.8600, [(CH, "Chancellerie")]),
    ("Turquie", "TUR", "792", "Istanbul", 41.0100, 28.9800, [(CO, "Consulat général")]),
    ("Canada", "CAN", "124", "Montréal", 45.5000, -73.5700, [(CO, "Consulat général")]),
    ("Cuba", "CUB", "192", "La Havane", 23.1100, -82.3700, [(CH, "Chancellerie")]),
    ("Mexique", "MEX", "484", "Mexico", 19.4300, -99.1300, [(CH, "Chancellerie")]),
    ("Argentine", "ARG", "032", "Buenos Aires", -34.6000, -58.3800, [(CH, "Chancellerie")]),
    ("Chine", "CHN", "156", "Canton", 23.1300, 113.2600, [(CO, "Consulat général")]),
    ("Japon", "JPN", "392", "Tokyo", 35.6500, 139.7200, [(RE, "Résidence de l'ambassadeur")]),
    ("Corée du Sud", "KOR", "410", "Séoul", 37.5700, 126.9800, [(CH, "Chancellerie")]),
    ("Inde", "IND", "356", "New Delhi", 28.6000, 77.2000, [(CH, "Chancellerie")]),
    ("Malaisie", "MYS", "458", "Kuala Lumpur", 3.1400, 101.6900, [(CH, "Chancellerie")]),
    ("Indonésie", "IDN", "360", "Jakarta", -6.2000, 106.8500, [(CH, "Chancellerie")]),
    ("Iran", "IRN", "364", "Téhéran", 35.6900, 51.3900, [(CH, "Chancellerie")]),
    ("Arabie saoudite", "SAU", "682", "Djeddah", 21.5400, 39.1700, [(CO, "Consulat général")]),
    ("Émirats arabes unis", "ARE", "784", "Abou Dhabi", 24.4500, 54.3800, [(CH, "Chancellerie")]),
    ("Émirats arabes unis", "ARE", "784", "Dubaï", 25.2000, 55.2700, [(CO, "Consulat général")]),
    ("Qatar", "QAT", "634", "Doha", 25.2900, 51.5300, [(CH, "Chancellerie")]),
    ("Koweït", "KWT", "414", "Koweït", 29.3700, 47.9800, [(CH, "Chancellerie")]),
    ("Égypte", "EGY", "818", "Le Caire", 30.0600, 31.2200, [(RE, "Résidence de l'ambassadeur")]),
    ("Algérie", "DZA", "012", "Alger", 36.7500, 3.0600, [(CH, "Chancellerie")]),
    ("Tunisie", "TUN", "788", "Tunis", 36.8100, 10.1800, [(CH, "Chancellerie")]),
    ("Libye", "LBY", "434", "Tripoli", 32.8900, 13.1900, [(CH, "Chancellerie")]),
    ("Maroc", "MAR", "504", "Casablanca", 33.5700, -7.5900, [(CO, "Consulat général")]),
    ("Maroc", "MAR", "504", "Rabat", 34.0100, -6.8300, [(RE, "Résidence de l'ambassadeur")]),
    ("Mauritanie", "MRT", "478", "Nouadhibou", 20.9400, -17.0400, [(CO, "Consulat")]),
    ("Mali", "MLI", "466", "Kayes", 14.4500, -11.4300, [(CO, "Consulat général")]),
    ("Gambie", "GMB", "270", "Banjul", 13.4500, -16.6800, [(RE, "Résidence du haut-commissaire")]),
    ("Guinée-Bissau", "GNB", "624", "Bissau", 11.8600, -15.6000, [(CH, "Chancellerie")]),
    ("Côte d'Ivoire", "CIV", "384", "Abidjan", 5.3300, -4.0200, [(CH, "Chancellerie")]),
    ("Burkina Faso", "BFA", "854", "Ouagadougou", 12.3700, -1.5200, [(CH, "Chancellerie")]),
    ("Niger", "NER", "562", "Niamey", 13.5100, 2.1100, [(CH, "Chancellerie")]),
    ("Ghana", "GHA", "288", "Accra", 5.6000, -0.1900, [(CH, "Chancellerie")]),
    ("Bénin", "BEN", "204", "Cotonou", 6.3700, 2.3900, [(CH, "Chancellerie")]),
    ("Nigeria", "NGA", "566", "Lagos", 6.4500, 3.3900, [(CO, "Consulat général")]),
    ("Cameroun", "CMR", "120", "Yaoundé", 3.8700, 11.5200, [(CH, "Chancellerie")]),
    ("Gabon", "GAB", "266", "Libreville", 0.3900, 9.4500, [(CH, "Chancellerie")]),
    ("Tchad", "TCD", "148", "N'Djamena", 12.1300, 15.0500, [(CH, "Chancellerie")]),
    ("République démocratique du Congo", "COD", "180", "Kinshasa", -4.3200, 15.3100, [(CH, "Chancellerie")]),
    ("Kenya", "KEN", "404", "Nairobi", -1.2900, 36.8200, [(CH, "Chancellerie")]),
    ("Rwanda", "RWA", "646", "Kigali", -1.9500, 30.0600, [(CH, "Chancellerie")]),
    ("Afrique du Sud", "ZAF", "710", "Pretoria", -25.7600, 28.2400, [(RE, "Résidence de l'ambassadeur")]),
    ("Cabo Verde", "CPV", "132", "Praia", 14.9300, -23.5100, [(CH, "Chancellerie")]),
]

# Quelques dossiers contentieux à l'étranger : (ville, intitulé, famille, type, partie, partieType, phase, étape, risque, objet, réclamé, à récupérer)
LITIGES = {
    ("Abou Dhabi", "Chancellerie"): ("Constructeur", "Malfaçons ou désordres de construction", "Entreprise démo n° 7", "Constructeur / entreprise", "Première instance", "Contentieux", "Élevé",
                                    "Infiltrations et fissures sur le bâtiment neuf ; mise en jeu de la garantie décennale", 185000000, False),
    ("Kinshasa", "Chancellerie"): ("Constructeur", "Retard ou abandon de chantier", "Entreprise démo n° 8", "Constructeur / entreprise", "Mise en demeure", "Précontentieux", "Moyen",
                                  "Chantier de réhabilitation arrêté à 40 % ; pénalités de retard et reprise du marché", 96000000, False),
    ("Libreville", "Chancellerie"): ("Foncier", "Empiètement ou bornage", "Propriétaire riverain (démo)", "Tiers", "Médiation / négociation", "Précontentieux", "Faible",
                                    "Clôture du voisin construite sur la parcelle de l'État ; demande de bornage contradictoire", None, False),
    ("Banjul", "Résidence du haut-commissaire"): ("Occupant", "Occupation sans titre", "Ancien agent (démo)", "Occupant", "Première instance", "Contentieux", "Moyen",
                                                 "Ancien agent maintenu dans les lieux après la fin de ses fonctions ; demande d'expulsion", 18000000, True),
    ("Montréal", "Consulat général"): ("Constructeur", "Contestation de décompte ou de paiement", "Bailleur privé (démo)", "Bailleur", "Médiation / négociation", "Précontentieux", "Faible",
                                      "Désaccord avec le bailleur sur l'indexation du loyer et la remise en état", 24000000, False),
}
ETATS = [("Bon", 30), ("Moyen", 32), ("Dégradé", 22), ("Très dégradé", 10), ("En ruine", 2), ("Non évalué", 4)]
NOTE = {"Bon": 1, "Moyen": 2, "Dégradé": 3, "Très dégradé": 4, "En ruine": 5, "Non évalué": 2}
PHOTOS = ["Façade principale", "Entrée", "Salle de réception", "Bureaux", "Jardin", "Toiture"]


def pick(pairs):
    t = rng.uniform(0, sum(w for _, w in pairs))
    for v, w in pairs:
        t -= w
        if t <= 0:
            return v
    return pairs[-1][0]


def day(y0=2023, y1=2026, m1=9):
    y = rng.randint(y0, y1)
    m = rng.randint(1, 12 if y < y1 else m1)
    return f"{y}-{m:02d}-{rng.randint(1, 28):02d}"


def rect(lat, lon, w, h, rot):
    """Rectangle (largeur w, hauteur h en mètres) centré sur lat/lon, tourné de rot degrés."""
    k = 111320.0
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    pts = []
    for dx, dy in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2), (-w / 2, -h / 2)]:
        x, y = dx * c - dy * s, dx * s + dy * c
        pts.append([round(lon + x / (k * math.cos(math.radians(lat))), 7), round(lat + y / k, 7)])
    return {"type": "Polygon", "coordinates": [pts]}


def main():
    base = json.loads((DATA / "patribati-base.json").read_text(encoding="utf-8"))
    base["biens"] = [b for b in base["biens"] if b["id"] <= BASE_MAX_ID]
    gb = json.loads((DATA / "geojson/biens.geojson").read_text(encoding="utf-8"))
    ga = json.loads((DATA / "geojson/assiettes_foncieres.geojson").read_text(encoding="utf-8"))
    gt = json.loads((DATA / "geojson/batiments.geojson").read_text(encoding="utf-8"))
    gb["features"] = [f for f in gb["features"] if f["properties"]["id"] <= BASE_MAX_ID]
    ga["features"] = [f for f in ga["features"] if not f["properties"].get("_genere")]
    gt["features"] = [f for f in gt["features"] if f["properties"]["bien_id"] <= BASE_MAX_ID]
    with open(DATA / "csv/visites.csv", encoding="utf-8") as f:
        vis = [r for r in csv.DictReader(f, delimiter=";") if int(r["bien_id"]) <= BASE_MAX_ID]

    bid, aid = BASE_MAX_ID, max(f["properties"]["id"] for f in ga["features"])
    tid = max(f["properties"]["id"] for f in gt["features"])
    lit_n = 12
    new = []
    for pays, iso3, pid, ville, lat, lon, items in SITES:
        for j, (typ, intit) in enumerate(items):
            bid += 1
            la, lo = lat + rng.uniform(-0.012, 0.012) + j * 0.004, lon + rng.uniform(-0.012, 0.012) + j * 0.004
            residence = typ in (RE, LF)
            bail = rng.random() < (0.5 if typ == CO else 0.35)
            etat = pick(ETATS)
            occ = pick([("Occupé", 70), ("Partiellement occupé", 16), ("En travaux", 8), ("Inoccupé", 6)])
            annee = rng.randint(1950, 2018)
            niv = rng.randint(1, 3) if residence else rng.randint(2, 8)
            surf = round(rng.uniform(380, 1200) if residence else rng.uniform(600, 4200), -1)
            utile = round(surf * 0.8, 1)
            eff = None if residence or typ == AU else rng.randint(8, 90)
            cout = int(round(surf * {1: 6000, 2: 35000, 3: 120000, 4: 230000, 5: 320000}[NOTE[etat]] / 1e6) * 1e6)
            valeur = int(round(surf * rng.uniform(0.9, 3.2) * 1e6 / 1e6) * 1e6)
            code = f"PBE-{iso3}-{bid:04d}"
            nom = f"{intit} – {ville}"
            b = {"id": bid, "code": code, "nom": nom, "type": typ, "pays": pays, "paysId": pid, "region": None, "commune": None, "ville": ville,
                 "lat": round(la, 6), "lon": round(lo, 6), "regime": "Affectation juridique", "affectataire": MAE,
                 "occupation": occ, "statut": "Pris à bail par l'État" if bail else "Propriété de l'État", "etat": etat, "annee": annee,
                 "niveaux": niv, "surface": surf, "utile": utile, "effectif": eff, "cout": cout, "valeur": None if bail else valeur,
                 "potentiel": "Réhabilitation" if NOTE[etat] >= 3 else "Conservation en l'état", "tf": None, "nicad": None,
                 "assiette": None, "baux": [], "travaux": [], "docs": [], "photos": [], "litiges": [], "visite": None,
                 "gestion": None, "score": None}
            if typ == AU:
                b["occupation"] = "Occupé"
                b["potentiel"] = "Réhabilitation"
            # Foncier / bail
            if bail:
                debut = day(2016, 2024)
                fin = f"{int(debut[:4]) + rng.choice([6, 9, 9, 12])}{debut[4:]}"
                if rng.random() < .25:
                    fin = f"2027-0{rng.randint(1, 3)}-{rng.randint(10, 28)}"
                b["baux"].append({"titre": "Bail", "sens": "État preneur", "debut": debut, "fin": fin,
                                  "loyer": int(round(rng.uniform(1.2, 9.5), 1) * 1e6), "arrieres": 0, "occupant": "Bailleur privé (démo)"})
                b["docs"].append({"cat": "Bail / convention", "ext": "PDF", "date": debut, "titre": "Bail signé"})
            else:
                aid += 1
                acode = f"AF-{iso3}-{aid:04d}"
                sup = round(rng.uniform(surf * 0.7, surf * 2.2), -1)
                b["assiette"], b["assietteCode"] = sup, acode
                b["tf"] = f"Acte de propriété n° {rng.randint(1000, 9999)} (démo)"
                side = math.sqrt(sup)
                ga["features"].append({"type": "Feature", "geometry": rect(la, lo, side * 1.15, side / 1.15, rng.uniform(-25, 25)),
                                       "properties": {"id": aid, "code": acode, "nom": f"Assiette – {nom}", "pays_iso3": iso3, "pays": pays, "region": None,
                                                      "commune": None, "ville": ville, "num_tf": b["tf"], "titulaire_tf": "État du Sénégal", "nicad": None,
                                                      "superficie_m2": sup, "nature": "Terrain bâti", "_genere": True}})
                b["docs"].append({"cat": "Titre foncier", "ext": "PDF", "date": None, "titre": "Acte de propriété"})
            b["docs"].append({"cat": "Acte d'affectation" if not bail else "Autre", "ext": "PDF", "date": day(2005, 2020), "titre": "Acte d'affectation au ministère"})
            # Emprises bâties (une ou deux)
            nb = 2 if (not residence and rng.random() < .35) else 1
            for k in range(nb):
                tid += 1
                emp = surf / niv / nb
                side = math.sqrt(emp)
                gt["features"].append({"type": "Feature", "geometry": rect(la + k * 0.00018, lo + k * 0.00022, side * 1.3, side / 1.3, rng.uniform(-20, 20)),
                                       "properties": {"id": tid, "bien_id": bid, "bien_code": code, "bien_nom": nom, "nom": "Bâtiment principal" if k == 0 else "Bâtiment annexe",
                                                      "nb_niveaux": niv, "emprise_m2": round(emp, 2), "etat_vetuste": etat, "regime": "Affectation juridique"}})
            # Visites
            for v in range(rng.choice([0, 1, 1, 2, 2])):
                dv = day(2023, 2026)
                vis.append({"id": "", "bien_id": str(bid), "date_visite": dv.replace("-", "/"), "agent": f"Agent {rng.choice('ABCDEFG')} (démo)",
                            "etat_constate": etat, "occupation_constatee": occ, "occupation_conforme": "1", "observations": "Visite de l'inspection des postes diplomatiques",
                            "bien_code": code})
                b["docs"].append({"cat": "PV de visite", "ext": "PDF", "date": dv, "titre": "Procès-verbal de visite"})
            # Travaux
            if occ == "En travaux" or (NOTE[etat] >= 3 and rng.random() < .4):
                st = "En cours" if occ == "En travaux" else rng.choice(["Programmé", "En cours"])
                d0 = day(2025, 2026)
                b["travaux"].append({"type": rng.choice(["Réhabilitation complète", "Toiture / étanchéité", "Climatisation", "Électricité", "Sécurité incendie", "Peinture"]),
                                     "statut": st, "debut": d0, "fin": f"{int(d0[:4]) + 1}{d0[4:]}", "av": 0 if st == "Programmé" else rng.randint(10, 85),
                                     "cout": int(max(cout * rng.uniform(.3, .9), 15e6) // 1e6 * 1e6), "entreprise": None if st == "Programmé" else f"Entreprise démo n° {rng.randint(9, 20)}"})
                b["docs"].append({"cat": "Devis / marché", "ext": "PDF", "date": d0, "titre": "Marché de travaux"})
            b["photos"] = [{"label": p} for p in rng.sample(PHOTOS, rng.randint(1, 4))]
            # Litiges
            key = (ville, intit)
            if key in LITIGES:
                fam, ty, partie, ptype, phase, etape, risque, objet, recl, arec = LITIGES[key]
                ouv = day(2025, 2026, 6)
                ev = [{"date": ouv, "type": "Constat / PV", "desc": "Constat dressé sur place"},
                      {"date": f"{ouv[:4]}-{min(int(ouv[5:7]) + 2, 12):02d}-{ouv[8:]}", "type": "Mise en demeure", "desc": "Mise en demeure adressée à la partie adverse"}]
                if etape == "Contentieux":
                    ev.append({"date": "2026-05-12", "type": "Assignation", "desc": "Assignation devant la juridiction compétente"})
                ref = f"LIT-2026-{lit_n:04d}"
                lit_n += 1
                b["litiges"].append({"ref": ref, "type": ty, "famille": fam, "partie": partie, "partieType": ptype, "phase": phase, "etape": etape,
                                     "risque": risque, "objet": objet, "ouverture": ouv, "cloture": None, "ouvert": True, "issue": None,
                                     "juridiction": "Juridiction locale (démo)" if etape == "Contentieux" else None, "service": "Agent judiciaire de l'État",
                                     "echeance": rng.choice(["2026-10-29", "2026-11-12", "2026-11-26", "2026-12-08"]),
                                     "objetEcheance": "Audience" if etape == "Contentieux" else "Réunion de conciliation",
                                     "reclame": recl, "recouvre": 0, "aRecuperer": arec, "recupere": False, "evenements": ev})
                b["docs"].append({"cat": "Mise en demeure", "ext": "PDF", "date": ev[1]["date"], "titre": f"Mise en demeure – {ref}"})
                if fam == "Occupant":
                    b["occupation"] = "Occupé sans titre"
            dates = sorted([r["date_visite"].replace("/", "-") for r in vis if r["bien_id"] == str(bid)])
            b["visite"] = dates[-1] if dates else None
            new.append(b)
            gb["features"].append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [b["lon"], b["lat"]]},
                                   "properties": {"id": bid, "code": code, "nom": nom, "type_bien": typ, "statut_propriete": b["statut"], "regime": b["regime"],
                                                  "affectataire": MAE, "responsable_entretien": "Affectataire", "occupation": b["occupation"], "usage_actuel": "Logement" if residence else "Bureaux",
                                                  "effectif_agents": eff, "pays_iso3": iso3, "pays": pays, "region": None, "commune": None, "ville": ville, "adresse": None,
                                                  "annee_construction": annee, "nb_niveaux": niv, "surface_batie_m2": surf, "surface_utile_m2": utile,
                                                  "etat_vetuste": etat, "cout_renov_fcfa": cout, "valeur_estimee_fcfa": b["valeur"], "potentiel_valorisation": b["potentiel"],
                                                  "date_derniere_visite": b["visite"], "assiette_code": b.get("assietteCode"), "num_tf": b["tf"],
                                                  "superficie_assiette_m2": b["assiette"], "nb_litiges": len(b["litiges"])}})
    base["biens"].extend(new)
    for i, r in enumerate(vis, 1):
        r["id"] = str(i)
    (DATA / "patribati-base.json").write_text(json.dumps(base, ensure_ascii=False, indent=1), encoding="utf-8")
    for p, g in (("biens", gb), ("assiettes_foncieres", ga), ("batiments", gt)):
        (DATA / f"geojson/{p}.geojson").write_text(json.dumps(g, ensure_ascii=False), encoding="utf-8")
    with open(DATA / "csv/visites.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(vis[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(vis)
    et = [b for b in base["biens"] if b["paysId"] != "686"]
    print(f"{len(new)} biens ajoutés · total {len(base['biens'])} biens, dont {len(et)} à l'étranger dans {len({b['pays'] for b in et})} pays")


if __name__ == "__main__":
    main()
