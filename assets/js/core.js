/* PatriBâti — noyau : utilitaires, données, règles métier (alertes, score, statut de gestion),
   thématiques cartographiques, droits du profil, persistance locale de la démo, journal. */
(function (PB) {
  'use strict';

  /* ---------- Utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nf = new Intl.NumberFormat('fr-FR');
  const fcfa = v => v == null ? '—' : v >= 1e9 ? (v / 1e9).toFixed(1).replace('.', ',') + ' Md FCFA' : v >= 1e6 ? Math.round(v / 1e6) + ' M FCFA' : nf.format(v) + ' FCFA';
  const short = v => fcfa(v).replace(' FCFA', '');
  const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const iso = d => d.toISOString().slice(0, 10);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
  const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
  const group = (a, f) => { const m = new Map(); a.forEach(x => { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x) }); return m };
  const mean = (a, f) => a.length ? sum(a, f) / a.length : 0;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch (e) { return false } },
    del(k) { try { localStorage.removeItem(k) } catch (e) { } },
    sget(k) { try { return sessionStorage.getItem(k) } catch (e) { return null } },
    sset(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v) } catch (e) { } }
  };
  PB.U = { $, $$, esc, norm, nf, fcfa, short, fdate, iso, css, sum, group, mean, store };

  /* ---------- Données ---------- */
  const SRC = window.PATRIBATI || { date: iso(new Date()), biens: [], assiettes: { features: [] }, batiments: { features: [] } };
  PB.TODAY = new Date(SRC.date);
  PB.SRC = SRC;
  const clone = o => JSON.parse(JSON.stringify(o));
  const prep = b => ({ ...b, assiette: +b.assiette || 0, baux: b.baux || [], travaux: b.travaux || [], docs: b.docs || [], photos: b.photos || [], litiges: b.litiges || [], visites: b.visites || [] });
  PB.DATA = SRC.biens.map(b => prep(clone(b)));
  PB.LOG = [];
  PB.byId = id => PB.DATA.find(b => b.id === id);

  /* Persistance locale : les modifications faites pendant la démo sont conservées dans ce navigateur. */
  function load() {
    const s = store.get(PB.STORE_KEY); if (!s) return;
    (s.biens || []).forEach(nb => { const i = PB.DATA.findIndex(b => b.id === nb.id); i >= 0 ? PB.DATA[i] = prep(nb) : PB.DATA.push(prep(nb)) });
    PB.LOG = s.log || [];
  }
  PB.save = function () {
    const dirty = PB.DATA.filter(b => b._dirty);
    let ok = store.set(PB.STORE_KEY, { biens: dirty, log: PB.LOG.slice(0, 300) });
    if (!ok) { /* quota : on retire les photos téléversées du stockage, elles restent visibles pendant la session */
      const light = dirty.map(b => ({ ...b, photos: b.photos.map(p => p.src && p.src.startsWith('data:') ? { label: p.label, local: true } : p) }));
      store.set(PB.STORE_KEY, { biens: light, log: PB.LOG.slice(0, 300) });
    }
  };
  PB.reset = function () { store.del(PB.STORE_KEY); location.reload() };
  PB.hasChanges = () => PB.LOG.length > 0;
  load();
  PB.seq = Math.max(0, ...PB.DATA.map(b => b.id));

  PB.log = function (b, action, detail) {
    PB.LOG.unshift({ t: new Date().toISOString(), qui: PB.user ? PB.user.nom : '—', uid: PB.user ? PB.user.id : null, login: PB.user ? PB.user.login : '', profil: PB.roleKey, bien: b ? b.id : null, nom: b ? b.nom : '', code: b ? b.code : '', action, detail: detail || '' });
    if (b) b._dirty = true;
    PB.save();
  };

  /* ---------- Règles métier ---------- */
  const T = () => PB.TODAY;
  const days = d => (new Date(d) - T()) / 864e5;
  PB.ouverts = b => b.litiges.filter(l => l.ouvert);
  PB.etape = b => { const o = PB.ouverts(b); if (!o.length) return b.litiges.length ? 'Clos' : 'Aucun litige'; return PB.ETAPES[Math.max(...o.map(l => PB.ETAPES.indexOf(l.etape)))] };
  PB.arrieres = b => sum(b.baux, x => x.arrieres || 0);
  PB.aRecouvrer = b => sum(PB.ouverts(b), l => Math.max((l.reclame || 0) - (l.recouvre || 0), 0)) + PB.arrieres(b);
  PB.derniereVisite = b => (b.visites[0] && b.visites[0].date) || b.visite || null;
  PB.score = function (b) {
    const o = PB.ouverts(b), v = PB.derniereVisite(b);
    return Math.min(100,
      (PB.NOTE[b.etat] ? (PB.NOTE[b.etat] - 1) * 10 : 0) +
      (b.occupation === 'Occupé sans titre' ? 20 : b.occupation === 'Inoccupé' && b.regime === 'Non affecté' ? 15 : 0) +
      (o.length ? 20 : 0) + (o.some(l => l.risque === 'Élevé') ? 10 : 0) +
      (PB.arrieres(b) > 0 ? 5 : 0) +
      (!v || -days(v) > 365 ? 10 : 0));
  };
  PB.priorite = b => { const v = PB.score(b); return v >= 60 ? 'Très forte' : v >= 40 ? 'Forte' : v >= 20 ? 'Modérée' : 'Faible' };
  PB.gestion = b => PB.ouverts(b).length ? 'En litige' : b.occupation === 'Occupé sans titre' ? 'Occupation irrégulière' : b.regime === 'Non affecté' && b.occupation === 'Inoccupé' ? 'À valoriser' : ['Très dégradé', 'En ruine'].includes(b.etat) ? 'À réhabiliter' : 'Gestion courante';
  PB.alertes = function (b) {
    const a = [], v = PB.derniereVisite(b);
    if (b.occupation === 'Occupé sans titre') a.push('Occupation sans titre');
    if (b.regime === 'Non affecté' && b.occupation === 'Inoccupé') a.push('Bien non affecté inoccupé : à valoriser');
    if (!v || -days(v) > 365) a.push(v ? 'Aucune visite depuis plus de 12 mois' : 'Aucune visite enregistrée');
    b.baux.forEach(x => { if (x.fin) { const j = days(x.fin); if (j >= 0 && j < 183) a.push(`${x.titre} à échéance le ${fdate(x.fin)}`) } });
    if (['Très dégradé', 'En ruine'].includes(b.etat) && !b.travaux.some(t => t.statut !== 'Terminé')) a.push('État très dégradé sans travaux programmés');
    if (PB.arrieres(b) > 0) a.push(`Arriérés de loyers : ${fcfa(PB.arrieres(b))}`);
    PB.ouverts(b).forEach(l => {
      a.push(`Litige en cours (${l.phase.toLowerCase()}) : ${l.type.toLowerCase()}`);
      if (l.echeance) { const j = days(l.echeance); if (j >= 0 && j <= 45) a.push(`Échéance de procédure le ${fdate(l.echeance)}`) }
      const last = l.evenements.length ? l.evenements[l.evenements.length - 1].date : l.ouverture;
      if (last && -days(last) > 183) a.push(`Dossier ${l.ref} sans acte depuis plus de 6 mois`);
    });
    return a;
  };
  PB.joursAvant = days;

  /* ---------- Thématiques ---------- */
  PB.THEMES = {
    regime: { label: "Régime d'affectation", get: b => b.regime, cats: [['Non affecté', '--c-a'], ['Affectation juridique', '--c-b'], ['Affectation fonctionnelle', '--c-c']] },
    occupation: { label: 'Occupation', get: b => b.occupation, cats: [['Occupé', '--c-b'], ['Partiellement occupé', '--c-c'], ['Inoccupé', '--c-d'], ['Occupé sans titre', '--c-e'], ['En travaux', '--c-f']] },
    etat: { label: 'État de vétusté', get: b => b.etat, cats: [['Bon', '--v1'], ['Moyen', '--v2'], ['Dégradé', '--v3'], ['Très dégradé', '--v4'], ['En ruine', '--v5'], ['Non évalué', '--v0']] },
    statut: { label: 'Statut de propriété', get: b => b.statut, cats: [["Propriété de l'État", '--c-a'], ["Pris à bail par l'État", '--c-c'], ['En cours de régularisation', '--c-e']] },
    litige: { label: 'Litiges', get: b => PB.etape(b), cats: [['Aucun litige', '--c-d'], ['Précontentieux', '--c-c'], ['Contentieux', '--c-e'], ['Exécution', '--c-f'], ['Clos', '--c-a']] },
    priorite: { label: "Priorité d'intervention", get: b => PB.priorite(b), cats: [['Très forte', '--v4'], ['Forte', '--v3'], ['Modérée', '--v2'], ['Faible', '--c-d']] },
    gestion: { label: 'Statut de gestion', get: b => PB.gestion(b), cats: [['En litige', '--c-e'], ['Occupation irrégulière', '--v5'], ['À valoriser', '--c-g'], ['À réhabiliter', '--v3'], ['Gestion courante', '--c-d']] },
    potentiel: { label: 'Potentiel de valorisation', get: b => b.potentiel, cats: [["Conservation en l'état", '--c-d'], ['Réhabilitation', '--v3'], ['Mise en location', '--c-b'], ['Cession', '--c-f'], ['Partenariat (bail emphytéotique, PPP)', '--c-g'], ['À déterminer', '--v0']] },
    visite: { label: 'Dernière visite', get: b => { const v = PB.derniereVisite(b); if (!v) return 'Jamais visité'; const d = -days(v); return d <= 183 ? 'Moins de 6 mois' : d <= 365 ? '6 à 12 mois' : 'Plus de 12 mois' }, cats: [['Moins de 6 mois', '--v1'], ['6 à 12 mois', '--v2'], ['Plus de 12 mois', '--v3'], ['Jamais visité', '--v4']] },
    type: { label: 'Type de bien', get: b => b.type, cats: [['Immeuble administratif', '--c-b'], ['Logement de fonction', '--c-g'], ['Villa', '--c-f'], ['Immeuble de logements', '--c-c'], ['Entrepôt / local technique', '--c-d'], ['Terrain nu', '--c-a'], ['Chancellerie / ambassade', '--c-e'], ['Consulat', '--v2'], ['Résidence diplomatique', '--v5'], ['Autre', '--v0']] }
  };
  PB.colorVar = (b, t) => { const th = PB.THEMES[t]; const c = th.cats.find(c => c[0] === th.get(b)); return c ? c[1] : '--v0' };

  /* ---------- État de l'interface ---------- */
  PB.S = { view: 'carte', theme: 'regime', perim: 'tous', off: new Set(), sel: null, tab: 'id', edit: false, adding: false, base: 'auto', layers: { assiettes: true, emprises: true } };
  PB.inPerim = b => PB.S.perim === 'tous' || (PB.S.perim === 'sn') === (b.paysId === '686');
  PB.visible = () => PB.DATA.filter(b => PB.inPerim(b) && !PB.S.off.has(PB.THEMES[PB.S.theme].get(b)));

  /* ---------- Droits du profil ---------- */
  PB.canEdit = b => { const r = PB.role; if (!r) return false; if (r.edit === 'tout') return true; if (r.edit === 'affectataire') return !!b && b.affectataire === r.affectataire; return false };
  PB.canField = b => PB.canEdit(b) || (PB.role && PB.role.edit === 'terrain');
  PB.canLitiges = () => !!(PB.role && PB.role.litiges);
  PB.canActes = () => !!(PB.role && PB.role.litiges && PB.role.actes);
  PB.canExport = () => !!(PB.role && PB.role.exports);
  PB.mine = b => PB.role && PB.role.affectataire && b.affectataire === PB.role.affectataire;

  /* ---------- Interface commune ---------- */
  let tt;
  PB.toast = function (m) { const el = $('#toast'); el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2600) };
  PB.modal = function (title, html) {
    const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
    m.innerHTML = `<div class="modal-in"><header><b>${esc(title)}</b><button class="btn sm" data-close>Fermer</button></header>${html}</div>`;
    const close = () => { m.remove(); document.removeEventListener('keydown', key) };
    const key = e => { if (e.key === 'Escape') close() };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close() });
    document.addEventListener('keydown', key);
    document.body.appendChild(m); $('[data-close]', m).focus();
    return m;
  };
  PB.download = function (name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500);
  };
  const flat = b => ({
    code: b.code, nom: b.nom, type: b.type, pays: b.pays, region: b.region || '', commune: b.commune || '', ville: b.ville || '',
    latitude: b.lat, longitude: b.lon, regime: b.regime, affectataire: b.affectataire || '', occupation: b.occupation, statut_propriete: b.statut,
    etat_vetuste: b.etat, annee_construction: b.annee ?? '', surface_batie_m2: b.surface ?? '', surface_utile_m2: b.utile ?? '', superficie_assiette_m2: b.assiette || '',
    titre_foncier: b.tf || '', nicad: b.nicad || '', cout_renovation_fcfa: b.cout ?? '', valeur_estimee_fcfa: b.valeur ?? '', potentiel: b.potentiel,
    derniere_visite: PB.derniereVisite(b) || '', litiges_ouverts: PB.ouverts(b).length, a_recouvrer_fcfa: PB.aRecouvrer(b), score_priorite: PB.score(b),
    priorite: PB.priorite(b), statut_gestion: PB.gestion(b), alertes: PB.alertes(b).join(' | ')
  });
  PB.exportCSV = function (list, name) {
    const rows = list.map(flat), cols = Object.keys(rows[0] || flat(PB.DATA[0]));
    const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s };
    PB.download(name + '.csv', '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => q(r[c])).join(';'))].join('\n'), 'text/csv;charset=utf-8');
  };
  PB.exportGeoJSON = function (list, name) {
    const fc = { type: 'FeatureCollection', name, features: list.map(b => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lon, b.lat] }, properties: flat(b) })) };
    PB.download(name + '.geojson', JSON.stringify(fc, null, 1), 'application/geo+json');
  };
})(window.PB);
