@echo off
rem PatriBati - installation de la base (Windows). Adapter le compte si besoin.
chcp 65001 >nul
cd /d "%~dp0"
set PGCLIENTENCODING=UTF8
psql -h localhost -p 5432 -U postgres -d postgres -f installer.sql
pause
