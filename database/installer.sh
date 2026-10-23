#!/bin/sh
# PatriBati - installation de la base (Linux / macOS)
cd "$(dirname "$0")"
PGCLIENTENCODING=UTF8 psql -h localhost -p 5432 -U postgres -d postgres -f installer.sql
