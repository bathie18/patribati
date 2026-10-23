#!/usr/bin/env python3
"""PatriBâti — prépare le jeu de données de l'application web.

Lit les couches ouvertes du dossier data/ (GeoJSON + CSV) et produit
assets/data/patribati-data.js, chargé directement par index.html.
Un fichier JavaScript (et non un fetch de JSON) permet d'ouvrir la démo
aussi bien depuis GitHub Pages que par un double-clic sur index.html.

Usage :  python3 tools/build_data.py [--date AAAA-MM-JJ]
"""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "assets" / "data" / "patribati-data.js"


def rd(p):
    return json.loads((DATA / "geojson" / p).read_text(encoding="utf-8"))


def rcsv(p):
    with open(DATA / "csv" / p, encoding="utf-8") as f:
        return list(csv.DictReader(f, delimiter=";"))


def d(s):
    return s.replace("/", "-")[:10] if s else None


def rnd(geom, n=6):
    def r(c):
        return [r(x) for x in c] if isinstance(c[0], list) else [round(c[0], n), round(c[1], n)]
    return {"type": geom["type"], "coordinates": r(geom["coordinates"])}


def num(v):
    if v in (None, ""):
        return None
    f = float(v)
    return int(f) if f.is_integer() else f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="2026-10-10", help="date de référence des alertes")
    a = ap.parse_args()

    base = json.loads((DATA / "patribati-base.json").read_text(encoding="utf-8"))
    biens = base["biens"]
    by_id = {b["id"]: b for b in biens}
    by_code = {b["code"]: b for b in biens}

    # Visites de surveillance (historique complet)
    for b in biens:
        b["visites"] = []
    for v in rcsv("visites.csv"):
        b = by_id.get(int(v["bien_id"]))
        if b:
            b["visites"].append({
                "date": d(v["date_visite"]), "agent": v["agent"] or None,
                "etat": v["etat_constate"] or None, "occupation": v["occupation_constatee"] or None,
                "conforme": None if v["occupation_conforme"] == "" else v["occupation_conforme"] == "1",
                "obs": v["observations"] or None,
            })
    for b in biens:
        b["visites"].sort(key=lambda x: x["date"] or "", reverse=True)

    # Lien bien -> assiette foncière
    pts = rd("biens.geojson")
    assiette_of = {f["properties"]["code"]: f["properties"].get("assiette_code") for f in pts["features"]}
    usage_of = {f["properties"]["code"]: f["properties"].get("usage_actuel") for f in pts["features"]}
    adr_of = {f["properties"]["code"]: f["properties"].get("adresse") for f in pts["features"]}
    for b in biens:
        b["assietteCode"] = assiette_of.get(b["code"])
        b["usage"] = usage_of.get(b["code"])
        b["adresse"] = adr_of.get(b["code"])

    ass = rd("assiettes_foncieres.geojson")
    assiettes = [{
        "type": "Feature", "geometry": rnd(f["geometry"]),
        "properties": {k: f["properties"][k] for k in ("code", "nom", "num_tf", "titulaire_tf", "nicad", "superficie_m2", "nature")},
    } for f in ass["features"]]

    bat = rd("batiments.geojson")
    batiments = [{
        "type": "Feature", "geometry": rnd(f["geometry"]),
        "properties": {"bien": f["properties"]["bien_id"], "nom": f["properties"]["nom"],
                       "niveaux": f["properties"]["nb_niveaux"], "emprise": num(f["properties"]["emprise_m2"]),
                       "etat": f["properties"]["etat_vetuste"]},
    } for f in bat["features"]]

    out = {"date": a.date, "biens": biens,
           "assiettes": {"type": "FeatureCollection", "features": assiettes},
           "batiments": {"type": "FeatureCollection", "features": batiments}}
    js = ("/* PatriBâti — jeu de données de démonstration (fictif). Généré par tools/build_data.py, ne pas modifier à la main. */\n"
          "window.PATRIBATI = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    OUT.write_text(js, encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} : {len(biens)} biens, {len(assiettes)} assiettes, {len(batiments)} emprises, "
          f"{sum(len(b['visites']) for b in biens)} visites ({len(js)//1024} Ko)")
    _ = by_code


if __name__ == "__main__":
    main()
