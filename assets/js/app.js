/* PatriBâti — application : accueil et choix du profil, bandeau, navigation entre modules, recherche, routage. */
(function (PB) {
  'use strict';
  const { $, $$, esc, norm, mean, store } = PB.U;
  const S = PB.S;

  const LOGO = `<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="7" fill="var(--accent)"/><path d="M8 26V13l6-4v17M14 26V15h8l4 3v8M8 26h18" fill="none" stroke="var(--accent-fg)" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="10" r="2.6" fill="var(--gold)"/></svg>`;
  const LOGO_INV = `<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="7" fill="#fff"/><path d="M8 26V13l6-4v17M14 26V15h8l4 3v8M8 26h18" fill="none" stroke="#0a6b43" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="10" r="2.6" fill="#b98510"/></svg>`;
  const GLOBE = `<svg class="globe" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="100" cy="100" r="96"/><ellipse cx="100" cy="100" rx="40" ry="96"/><ellipse cx="100" cy="100" rx="75" ry="96"/><path d="M4 100h192M16 52h168M16 148h168M100 4v192"/></svg>`;
  const ICONS = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
  };

  /* ---------- Thème clair / sombre ---------- */
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme }
  const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(store.get('patribati.theme'));

  /* ---------- Accueil ---------- */
  let choice = 'gestionnaire';
  function login() {
    $('#app').innerHTML = `<div class="login">
      <section class="login-art">${GLOBE}
        <div class="brand">${LOGO_INV}<div><b>PatriBâti</b><span>Patrimoine bâti de l'État du Sénégal</span></div></div>
        <div style="position:relative">
          <h1>Connaître, gérer et valoriser chaque bien de l'État, ici et à l'étranger.</h1>
          <p>PatriBâti réunit dans une seule plateforme cartographique l'inventaire du patrimoine bâti de l'État, affecté ou non : fiches des biens, foncier, occupation, travaux, documents, et le suivi des biens en litige que l'État peine à recouvrer.</p>
          <ul>
            <li>Carte du monde jusqu'à l'emprise du bâtiment, avec dix thématiques d'analyse</li>
            <li>Fiche complète de chaque bien, mise à jour par les gestionnaires et les affectataires</li>
            <li>Contentieux et recouvrement : échéancier, montants, biens à reprendre</li>
            <li>Score de priorité d'intervention, alertes et tableau de bord</li>
          </ul>
        </div>
        <footer>Une solution du CEGIT · Centre d'Expertise en Géomatique et Ingénierie Territoriale · pile 100 % open source</footer>
      </section>
      <section class="login-form">
        <div><h2>Démonstration</h2><h1 class="vt">Choisissez un profil</h1><p class="sub">Chaque profil voit l'ensemble du parc mais n'a pas les mêmes droits de modification.</p></div>
        <div class="profiles" role="radiogroup" aria-label="Profils">${Object.entries(PB.PROFILES).map(([k, p]) => `<button class="profile" role="radio" data-p="${k}" aria-pressed="${k === choice}" aria-checked="${k === choice}"><span class="av">${esc(p.initiales)}</span><span><b>${esc(p.nom)}</b><small>${esc(p.structure)} · ${esc(p.desc)}</small></span><em>${{ tout: 'Saisie', affectataire: 'Ses biens', terrain: 'Terrain', aucun: 'Lecture' }[p.edit]}</em></button>`).join('')}</div>
        <button class="btn primary" id="enter">Entrer dans PatriBâti</button>
        <p class="fine">Prototype de démonstration : aucun mot de passe. Tous les biens, titres fonciers, montants, occupants et litiges sont <b>fictifs</b>. Les saisies restent dans ce navigateur.</p>
      </section></div>`;
    $('.profiles').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; choice = b.dataset.p; $$('.profile').forEach(x => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b) }) };
    $('.profiles').ondblclick = e => { if (e.target.closest('[data-p]')) $('#enter').click() };
    $('#enter').onclick = () => { PB.setRole(choice); shell(); window.scrollTo(0, 0); route() };
  }

  /* ---------- Coquille de l'application ---------- */
  function shell() {
    const r = PB.role, nLit = PB.DATA.filter(b => PB.ouverts(b).length).length;
    $('#app').innerHTML = `<div class="app">
      <header class="top">
        <a class="brand" href="#carte">${LOGO}<div><b>PatriBâti</b><span>Patrimoine bâti de l'État du Sénégal</span></div></a>
        <nav class="nav" aria-label="Modules">${PB.MODULES.map(([k, l]) => `<button data-view="${k}">${l}${k === 'litiges' && PB.canLitiges() ? ` <span class="badge">${nLit}</span>` : ''}</button>`).join('')}</nav>
        <div class="search"><svg viewBox="0 0 16 16" stroke-width="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>
          <input id="q" type="search" autocomplete="off" placeholder="Bien, TF, NICAD, litige, ville, pays, coordonnées…" aria-label="Rechercher" role="combobox" aria-expanded="false" aria-controls="sugg"><div class="sugg" id="sugg" role="listbox" hidden></div></div>
        <div class="tools">
          ${r.ajout ? '<button class="btn primary" id="addBtn" title="Ajouter un bien sur la carte">+ <span class="lbl">Ajouter un bien</span></button>' : ''}
          <button class="btn iconbtn" id="themeBtn" aria-label="Basculer clair / sombre"></button>
          <button class="who" id="whoBtn" title="Changer de profil"><span class="av">${esc(r.initiales)}</span><div><b>${esc(r.nom)}</b><small>${esc(r.structure)}</small></div></button>
        </div>
      </header>
      <div class="demo"><span><b>Démonstration.</b> Données fictives au ${PB.U.fdate(PB.TODAY)}.</span><span id="demoChanges"></span></div>
      <main class="view" id="vCarte">${PB.carteHTML()}</main>
      <main class="view" id="page" hidden></main>
    </div>`;
    $('.nav').onclick = e => { const b = e.target.closest('[data-view]'); if (b) location.hash = b.dataset.view };
    $('#whoBtn').onclick = () => { store.sset('patribati.profil', null); PB.M.m && PB.M.m.remove(); PB.M.m = null; S.sel = null; S.edit = false; location.hash = ''; login() };
    $('#themeBtn').onclick = () => { const t = isDark() ? 'light' : 'dark'; applyTheme(t); store.set('patribati.theme', t); themeIcon(); if (PB.M.m) PB.M.draw() };
    themeIcon();
    if (r.ajout) $('#addBtn').onclick = () => PB.setAdding(!S.adding);
    bindSearch();
    PB.bindCarte();
    PB.refresh();
  }
  function themeIcon() { $('#themeBtn').innerHTML = isDark() ? ICONS.sun : ICONS.moon }
  function demoChanges() {
    const el = $('#demoChanges'); if (!el) return;
    el.innerHTML = PB.LOG.length ? `${PB.LOG.length} saisie(s) conservée(s) dans ce navigateur · <button id="resetBtn">réinitialiser</button>` : '';
    const b = $('#resetBtn'); if (b) b.onclick = () => { if (confirm('Effacer toutes les saisies de la démo dans ce navigateur ?')) PB.reset() };
  }

  /* ---------- Navigation ---------- */
  PB.show = function (view) {
    if (S.view === view && view === 'carte' && !$('#vCarte').hidden) return;
    S.view = view;
    $$('.nav [data-view]').forEach(b => b.toggleAttribute('aria-current', false) || (b.dataset.view === view && b.setAttribute('aria-current', 'page')));
    const c = view === 'carte';
    $('#vCarte').hidden = !c; $('#page').hidden = c;
    if (c) { if (location.hash.slice(1).split('/')[0] !== 'carte' && !location.hash.startsWith('#bien')) history.replaceState(null, '', '#carte'); requestAnimationFrame(() => { PB.M.invalidate(); PB.M.draw() }) }
    else { if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view); PB.render(); window.scrollTo(0, 0); $('#page').scrollTop = 0 }
  };
  PB.render = function () { const v = PB.PAGES[S.view]; if (!v) return; $('#page').innerHTML = v.html(); v.bind() };
  PB.refresh = function () {
    PB.renderSide(); PB.M.draw(); PB.renderDetail(); demoChanges();
    if (S.view !== 'carte') PB.render();
  };
  function route() {
    const h = location.hash.slice(1);
    const m = h.match(/^bien\/(\d+)$/);
    if (m && PB.byId(+m[1])) { PB.show('carte'); return setTimeout(() => PB.select(+m[1], true), 50) }
    const v = PB.MODULES.some(x => x[0] === h) ? h : 'carte';
    PB.show(v);
  }
  addEventListener('hashchange', () => { if (PB.role && $('.app')) route() });

  /* ---------- Recherche avec autocomplétion ---------- */
  function bindSearch() {
    let sugg = [], cur = 0;
    const q = $('#q'), box = $('#sugg');
    function search(text) {
      const out = [], n = norm(text.trim()); if (!n) return out;
      const m = text.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/) || text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) { const la = +m[1].replace(',', '.'), lo = +m[2].replace(',', '.'); if (Math.abs(la) <= 90 && Math.abs(lo) <= 180) out.push({ k: 'Coord.', t: `Aller à ${la.toFixed(4)}, ${lo.toFixed(4)}`, s: 'lat, lon', go: () => PB.M.flyToLL(la, lo, 16) }) }
      [...new Set(PB.DATA.map(b => b.pays))].filter(p => norm(p).includes(n)).slice(0, 3).forEach(p => { const v = PB.DATA.filter(b => b.pays === p); out.push({ k: 'Pays', t: p, s: v.length + ' bien' + (v.length > 1 ? 's' : ''), go: () => p === 'Sénégal' ? PB.M.go('sn') : PB.M.fitList(v) }) });
      [...new Set(PB.DATA.map(b => b.ville))].filter(c => c && norm(c).includes(n)).slice(0, 3).forEach(c => { const v = PB.DATA.filter(b => b.ville === c); out.push({ k: 'Ville', t: c, s: v[0].pays + ' · ' + v.length + ' bien' + (v.length > 1 ? 's' : ''), go: () => PB.M.fitList(v) }) });
      PB.DATA.filter(b => norm([b.nom, b.code, b.tf, b.nicad, b.commune, b.affectataire].join(' ')).includes(n)).slice(0, 6).forEach(b => out.push({ k: 'Bien', t: b.nom, s: b.tf || b.code, go: () => PB.select(b.id, true) }));
      if (PB.canLitiges()) PB.DATA.forEach(b => b.litiges.filter(l => norm(l.ref + ' ' + l.type + ' ' + (l.partie || '')).includes(n)).slice(0, 2).forEach(l => out.push({ k: 'Litige', t: l.ref + ' – ' + b.nom, s: l.phase, go: () => PB.openTab(b.id, 'lit') })));
      return out.slice(0, 10);
    }
    const draw = () => { box.hidden = !sugg.length; q.setAttribute('aria-expanded', !!sugg.length); box.innerHTML = sugg.map((s, i) => `<button role="option" data-i="${i}" class="${i === cur ? 'on' : ''}" aria-selected="${i === cur}"><i>${esc(s.k)}</i><span>${esc(s.t)}</span><small>${esc(s.s)}</small></button>`).join('') };
    const choose = i => { const s = sugg[i]; if (!s) return; PB.show('carte'); s.go(); q.value = s.t; sugg = []; draw(); q.blur() };
    q.addEventListener('input', () => { sugg = search(q.value); cur = 0; draw() });
    q.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { cur = Math.min(cur + 1, sugg.length - 1); draw(); e.preventDefault() } else if (e.key === 'ArrowUp') { cur = Math.max(cur - 1, 0); draw(); e.preventDefault() } else if (e.key === 'Enter') choose(cur); else if (e.key === 'Escape') { sugg = []; draw() } });
    box.addEventListener('mousedown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); choose(+b.dataset.i) } });
    q.addEventListener('blur', () => setTimeout(() => { sugg = []; draw() }, 150));
  }

  /* ---------- Démarrage ---------- */
  PB.boot = function () {
    const saved = store.sget('patribati.profil');
    if (saved && PB.PROFILES[saved]) { PB.setRole(saved); shell(); route() } else login();
  };
})(window.PB);
