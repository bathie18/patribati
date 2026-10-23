#!/bin/sh
# PatriBâti — régénère data/patribati-base.json depuis la base PostGIS « patribati »,
# puis reconstruit assets/data/patribati-data.js pour l'application web.
# Adapter l'hôte, le port et le compte si besoin.
set -e
cd "$(dirname "$0")/.."
PGCLIENTENCODING=UTF8 psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d patribati -At \
  -c "SELECT patrimoine.export_dashboard()::text" -o data/patribati-base.json
python3 tools/build_data.py --date "$(date +%F)"
echo "Données de l'application mises à jour."
