/* PatriBâti — module Carte : colonne des thématiques, fiche du bien (8 onglets), saisie, ajout d'un bien. */
(function (PB) {
  'use strict';
  const { $, $$, esc, nf, fcfa, short, fdate, iso, sum } = PB.U;
  const S = PB.S;
  let draft = null, form = null;
  const LBL = { nom: 'nom', type: 'type', etat: 'état de vétusté', regime: 'régime', occupation: 'occupation', potentiel: 'potentiel', statut: 'statut de propriété', ville: 'ville', tf: 'titre foncier', nicad: 'NICAD', annee: 'année', niveaux: 'niveaux', surface: 'surface bâtie', utile: 'surface utile', cout: 'coût de rénovation', valeur: 'valeur', effectif: 'agents hébergés', affectataire: 'affectataire' };

  PB.carteHTML = () => `<div class="main" id="carte">
    <aside class="side" aria-label="Thématiques et filtres">
      <section><h2>Périmètre</h2><div class="seg" id="perim">
        <button data-p="tous" aria-pressed="true">Monde</button><button data-p="sn" aria-pressed="false">Sénégal</button><button data-p="etr" aria-pressed="false">Étranger</button></div></section>
      <section><h2>Thématique affichée</h2><div class="themes" id="themes"></div></section>
      <section><h2>Légende <span style="text-transform:none;letter-spacing:0;font-weight:400">· cliquer pour filtrer</span></h2><div class="legend" id="legend"></div></section>
      <section><h2>Fond et couches</h2>
        <div class="seg" id="baseSeg" style="margin-bottom:8px"><button data-base="auto" aria-pressed="true" title="Pays du monde en vue d'ensemble, OpenStreetMap en vue rapprochée">Auto</button><button data-base="osm" aria-pressed="false">OSM</button><button data-base="simple" aria-pressed="false" title="Pays du monde, sans connexion">Simplifié</button></div>
        <label class="opt"><input type="checkbox" checked disabled> Biens <small>points</small></label>
        <label class="opt"><input type="checkbox" id="ly-assiettes" checked> Assiettes foncières <small>zoom ≥ 14</small></label>
        <label class="opt"><input type="checkbox" id="ly-emprises" checked> Emprises bâties <small>zoom ≥ 15</small></label>
      </section>
      <section><h2>Sélection affichée</h2><div class="kpis" id="kpis"></div></section>
    </aside>
    <div class="mapwrap" id="mapwrap">
      <div id="map" role="region" aria-label="Carte mondiale du patrimoine bâti de l'État"></div>
      <div class="mapctl"><button class="btn sm" data-go="monde">Monde</button><button class="btn sm" data-go="sn">Sénégal</button><button class="btn sm" data-go="dakar">Dakar</button></div>
      <div class="zoomctl"><button id="zin" aria-label="Zoom avant">+</button><button id="zout" aria-label="Zoom arrière">−</button></div>
      <div class="coords" id="coords">lat —, lon —</div>
      <div class="hint" id="hint" hidden>Cliquez sur la carte pour placer le nouveau bien. <button class="btn sm" id="cancelAdd">Annuler</button></div>
    </div>
    <aside class="detail" id="detail" aria-label="Fiche du bien"></aside>
  </div>`;

  PB.bindCarte = function () {
    $('#themes').innerHTML = Object.entries(PB.THEMES).map(([k, t]) => `<label><input type="radio" name="theme" value="${k}" ${k === S.theme ? 'checked' : ''}>${esc(t.label)}</label>`).join('');
    $('#themes').onchange = e => { S.theme = e.target.value; S.off.clear(); PB.refresh() };
    $('#perim').onclick = e => { const b = e.target.closest('button'); if (!b) return; setPerim(b.dataset.p); PB.refresh(); if (S.perim === 'sn') PB.M.go('sn'); else if (S.perim === 'tous') PB.M.go('monde'); else PB.M.fitList(PB.visible()) };
    $('#legend').onclick = e => { const b = e.target.closest('button'); if (!b) return; const c = b.dataset.cat; S.off.has(c) ? S.off.delete(c) : S.off.add(c); PB.refresh() };
    $('#baseSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; $$('#baseSeg button').forEach(x => x.setAttribute('aria-pressed', x === b)); PB.M.setBase(b.dataset.base) };
    $('#ly-assiettes').onchange = e => { S.layers.assiettes = e.target.checked; PB.M.draw() };
    $('#ly-emprises').onchange = e => { S.layers.emprises = e.target.checked; PB.M.draw() };
    $$('[data-go]').forEach(b => b.onclick = () => PB.M.go(b.dataset.go));
    $('#zin').onclick = () => PB.M.zoomBy(1); $('#zout').onclick = () => PB.M.zoomBy(-1);
    $('#cancelAdd').onclick = () => PB.setAdding(false);
    $('#detail').addEventListener('click', onDetailClick);
    $('#detail').addEventListener('change', onDetailChange);
    $('#detail').addEventListener('submit', onSubmit);
    PB.M.init();
  };
  function setPerim(p) { S.perim = p; $$('#perim button').forEach(x => x.setAttribute('aria-pressed', x.dataset.p === p)) }

  /* ---------- Colonne gauche ---------- */
  PB.renderSide = function () {
    const t = PB.THEMES[S.theme], base = PB.DATA.filter(PB.inPerim);
    $('#legend').innerHTML = t.cats.map(([name, v]) => { const n = base.filter(b => t.get(b) === name).length; return n ? `<button class="${S.off.has(name) ? 'off' : ''}" data-cat="${esc(name)}" aria-pressed="${!S.off.has(name)}"><i class="sw" style="background:var(${v})"></i>${esc(name)}<em>${n}</em></button>` : '' }).join('');
    const vis = PB.visible(), nA = vis.filter(b => PB.alertes(b).length).length;
    $('#kpis').innerHTML = `<div class="kpi"><b>${vis.length}</b><span>biens affichés</span></div><div class="kpi"><b>${new Set(vis.map(b => b.pays)).size}</b><span>pays</span></div>
      <div class="kpi"><b>${nf.format(Math.round(sum(vis, b => b.surface || 0) / 100) / 10)} k m²</b><span>surface bâtie</span></div><div class="kpi"><b>${short(sum(vis, b => b.cout || 0))}</b><span>FCFA de rénovation estimée</span></div>
      <div class="kpi warn"><b>${nA}</b><span>biens avec alerte</span></div><div class="kpi warn"><b>${vis.filter(b => PB.ouverts(b).length).length}</b><span>biens en litige</span></div>`;
  };

  /* ---------- Fiche du bien ---------- */
  const chip = (b, t) => `<span class="chip"><i class="sw" style="background:var(${PB.colorVar(b, t)})"></i>${esc(PB.THEMES[t].get(b))}</span>`;
  const FT = [['id', 'Identité'], ['foncier', 'Foncier'], ['occ', 'Occupation'], ['vis', 'Visites'], ['trav', 'Travaux'], ['lit', 'Litiges'], ['docs', 'Documents'], ['album', 'Album']];
  const ICON = '<svg viewBox="0 0 38 38" stroke-width="1.6" aria-hidden="true"><rect x="4" y="8" width="30" height="22" rx="2"/><circle cx="13" cy="16" r="3"/><path d="M4 26l9-7 7 5 5-4 9 7"/></svg>';
  const opts = (key, val) => PB.THEMES[key].cats.map(c => `<option ${c[0] === val ? 'selected' : ''}>${esc(c[0])}</option>`).join('');
  const optList = (list, val) => list.map(c => `<option ${c === val ? 'selected' : ''}>${esc(c)}</option>`).join('');

  function aTraiter() {
    const mineFirst = PB.role.affectataire;
    const list = PB.DATA.filter(PB.inPerim).filter(b => !mineFirst || PB.mine(b)).map(b => [b, PB.alertes(b)]).filter(x => x[1].length).sort((a, c) => PB.score(c[0]) - PB.score(a[0]));
    return `<div class="pad"><h2>${mineFirst ? 'Biens de votre ministère à traiter' : 'À traiter'} · ${list.length} biens</h2>
      <p class="empty" style="margin:0 0 10px">Cliquez sur un bien de la carte pour ouvrir sa fiche, ou partez d'une alerte. Classement par score de priorité.</p>
      <div class="alist">${list.map(([b, a]) => `<button data-id="${b.id}"><b>${esc(b.nom)}</b><small>${esc(b.ville)}, ${esc(b.pays)} · score ${PB.score(b)} · ${a.slice(0, 3).map(esc).join(' · ')}${a.length > 3 ? ` · +${a.length - 3}` : ''}</small></button>`).join('')}</div></div>`;
  }

  PB.renderDetail = function () {
    const el = $('#detail'); if (!el) return;
    const b = PB.byId(S.sel);
    if (!b) { el.innerHTML = aTraiter(); return }
    const al = PB.alertes(b), E = S.edit, lvl = ['Bon', 'Moyen', 'Dégradé', 'Très dégradé', 'En ruine'].indexOf(b.etat);
    const canE = PB.canEdit(b), canF = PB.canField(b), canL = PB.canLitiges();
    const body = {
      id: () => `<dl>
        <dt>Nom</dt><dd>${E ? `<input id="e-nom" value="${esc(b.nom)}">` : esc(b.nom)}</dd>
        <dt>Type de bien</dt><dd>${E ? `<select id="e-type">${opts('type', b.type)}</select>` : esc(b.type)}</dd>
        ${b.usage ? `<dt>Usage actuel</dt><dd>${esc(b.usage)}</dd>` : ''}
        <dt>Année de construction</dt><dd>${E ? `<input id="e-annee" type="number" min="1800" max="2100" value="${b.annee ?? ''}">` : b.annee ?? '—'}</dd>
        <dt>Niveaux</dt><dd>${E ? `<input id="e-niveaux" type="number" min="0" max="80" value="${b.niveaux ?? ''}">` : b.niveaux ?? '—'}</dd>
        <dt>Surface bâtie</dt><dd>${E ? `<input id="e-surface" type="number" min="0" value="${b.surface ?? ''}">` : b.surface ? nf.format(b.surface) + ' m²' : '—'}</dd>
        <dt>Surface utile</dt><dd>${E ? `<input id="e-utile" type="number" min="0" value="${b.utile ?? ''}">` : b.utile ? nf.format(b.utile) + ' m²' : '—'}</dd>
        <dt>État de vétusté</dt><dd>${E ? `<select id="e-etat">${opts('etat', b.etat)}</select>` : esc(b.etat) + `<div class="gauge">${[0, 1, 2, 3, 4].map(i => `<i style="${lvl >= 0 && i <= lvl ? `background:var(${PB.colorVar(b, 'etat')})` : ''}"></i>`).join('')}</div>`}</dd>
        <dt>Coût de rénovation</dt><dd>${E ? `<input id="e-cout" type="number" min="0" step="1000000" value="${b.cout ?? ''}">` : fcfa(b.cout)}</dd>
        <dt>Valeur estimée</dt><dd>${E ? `<input id="e-valeur" type="number" min="0" step="1000000" value="${b.valeur ?? ''}">` : fcfa(b.valeur)}</dd>
        <dt>Potentiel de valorisation</dt><dd>${E ? `<select id="e-potentiel">${opts('potentiel', b.potentiel)}</select>` : esc(b.potentiel)}</dd>
        <dt>Priorité d'intervention</dt><dd>${PB.priorite(b)} · ${PB.score(b)} / 100<div class="bar"><i style="width:${PB.score(b)}%;background:var(${PB.colorVar(b, 'priorite')})"></i></div></dd>
        <dt>Statut de gestion</dt><dd>${PB.gestion(b)}</dd>
        <dt>Dernière visite</dt><dd>${fdate(PB.derniereVisite(b))}</dd>
        <dt>Entretien à la charge de</dt><dd>${b.regime === 'Non affecté' ? 'SOGEPA' : 'Affectataire'}</dd></dl>`,
      foncier: () => `<dl>
        <dt>Titre foncier</dt><dd class="mono">${E ? `<input id="e-tf" value="${esc(b.tf ?? '')}">` : esc(b.tf ?? '—')}</dd>
        <dt>Titulaire</dt><dd>${b.statut.startsWith('Pris') ? 'Bailleur privé (démo)' : 'État du Sénégal'}</dd>
        <dt>NICAD</dt><dd class="mono">${E ? `<input id="e-nicad" value="${esc(b.nicad ?? '')}">` : esc(b.nicad ?? '—')}</dd>
        <dt>Assiette foncière</dt><dd class="mono">${esc(b.assietteCode ?? '—')}</dd>
        <dt>Superficie de l'assiette</dt><dd>${b.assiette ? nf.format(b.assiette) + ' m²' : '—'}</dd>
        <dt>Statut de propriété</dt><dd>${E ? `<select id="e-statut">${opts('statut', b.statut)}</select>` : esc(b.statut)}</dd>
        <dt>Pays</dt><dd>${esc(b.pays)}</dd>
        ${b.region ? `<dt>Région</dt><dd>${esc(b.region)}</dd><dt>Commune</dt><dd>${esc(b.commune)}</dd>` : ''}
        <dt>Ville</dt><dd>${E ? `<input id="e-ville" value="${esc(b.ville ?? '')}">` : esc(b.ville ?? '—')}</dd>
        ${b.adresse ? `<dt>Adresse</dt><dd>${esc(b.adresse)}</dd>` : ''}
        <dt>Coordonnées</dt><dd class="mono">${b.lat.toFixed(5)}, ${b.lon.toFixed(5)}</dd></dl>
        ${b.assietteCode ? '<p class="note">« Localiser » centre la carte sur le bien : l\'assiette foncière apparaît en pointillés dorés, les emprises bâties en aplat. Les formes de la démonstration sont schématiques.</p>' : ''}`,
      occ: () => `<dl style="margin-bottom:14px">
        <dt>Régime</dt><dd>${E && PB.role.edit === 'tout' ? `<select id="e-regime">${opts('regime', b.regime)}</select>` : esc(b.regime)}</dd>
        <dt>Affectataire</dt><dd>${esc(b.affectataire ?? 'Aucun')}</dd>
        <dt>Occupation</dt><dd>${E ? `<select id="e-occupation">${opts('occupation', b.occupation)}</select>` : esc(b.occupation)}</dd>
        <dt>Agents hébergés</dt><dd>${E ? `<input id="e-effectif" type="number" min="0" value="${b.effectif ?? ''}">` : b.effectif ? nf.format(b.effectif) + (b.utile ? ` · ${(b.utile / b.effectif).toFixed(1).replace('.', ',')} m² utiles par agent` : '') : '—'}</dd></dl>
        <h2>Titres d'occupation et baux</h2>${b.baux.length ? b.baux.map(x => `<div class="item"><b>${esc(x.titre)} · ${esc(x.sens)}</b><small>${esc(x.occupant)}${x.fin ? ` · du ${fdate(x.debut)} au ${fdate(x.fin)}` : ''}${x.loyer ? ` · ${fcfa(x.loyer)} / mois` : ''}</small>${x.arrieres > 0 ? `<div class="alert" style="margin:8px 0 0">Arriérés : ${fcfa(x.arrieres)}</div>` : ''}</div>`).join('') : '<p class="empty">Aucun titre enregistré.</p>'}`,
      vis: () => `${canF ? (form === 'visite' ? `<form class="form" id="f-visite"><b>Nouvelle visite de surveillance</b>
          <div class="row2"><label>Date<input type="date" name="date" value="${iso(new Date())}" required></label><label>Agent<input name="agent" value="${esc(PB.user.nom)}"></label></div>
          <div class="row2"><label>État constaté<select name="etat">${optList(['Bon', 'Moyen', 'Dégradé', 'Très dégradé', 'En ruine'], b.etat)}</select></label><label>Occupation constatée<select name="occupation">${optList(PB.THEMES.occupation.cats.map(c => c[0]), b.occupation)}</select></label></div>
          <label>Observations<textarea name="obs" rows="2" placeholder="Constats, désordres, occupants rencontrés…"></textarea></label>
          <label class="opt" style="padding:0;color:var(--fg)"><input type="checkbox" name="maj" checked> Mettre à jour l'état et l'occupation du bien</label>
          <div class="acts"><button type="button" class="btn sm" data-act="cancel-form">Annuler</button><button class="btn sm primary">Enregistrer la visite</button></div></form>`
          : `<button class="btn sm primary" data-act="form-visite" style="margin-bottom:10px">+ Saisir une visite</button>`) : ''}
        ${b.visites.length ? `<ol class="chrono">${b.visites.map(v => `<li><time>${fdate(v.date)}</time><span>${esc(v.obs || 'Visite')}${v.agent ? ` · ${esc(v.agent)}` : ''}<small>${[v.etat ? 'État : ' + v.etat : '', v.occupation ? 'Occupation : ' + v.occupation : '', v.conforme === false ? 'Occupation non conforme au titre' : ''].filter(Boolean).map(esc).join(' · ')}</small></span></li>`).join('')}</ol>` : '<p class="empty">Aucune visite enregistrée.</p>'}`,
      trav: () => b.travaux.length ? b.travaux.map(t => `<div class="item"><b>${esc(t.type)} · ${esc(t.statut)}</b><small>${esc(t.entreprise || 'Entreprise à attribuer')} · ${fdate(t.debut)} → ${fdate(t.fin)} · ${fcfa(t.cout)}</small><div class="bar"><i style="width:${t.av}%"></i></div><small>Avancement ${t.av} %</small></div>`).join('') : '<p class="empty">Aucuns travaux programmés ou en cours.</p>',
      lit: () => !canL ? `<p class="note">${b.litiges.length ? `${b.litiges.length} dossier(s) contentieux sur ce bien. ` : ''}Le détail des litiges et des montants n'est pas ouvert à votre profil.</p>` :
        b.litiges.length ? b.litiges.map((l, i) => `<div class="item"><b>${esc(l.type)}</b><small>${esc(l.ref)} · ouvert le ${fdate(l.ouverture)}${l.cloture ? ' · clos le ' + fdate(l.cloture) : ''}</small>
          <div class="chips"><span class="chip"><i class="sw" style="background:var(${PB.ETAPE_COL[l.etape]})"></i>${esc(l.phase)}</span><span class="chip">Risque ${esc(String(l.risque).toLowerCase())}</span>${l.aRecuperer ? `<span class="chip">${l.recupere ? 'Bien récupéré' : 'Bien à récupérer'}</span>` : ''}${l.issue ? `<span class="chip">${esc(l.issue)}</span>` : ''}</div>
          <p class="obj">${esc(l.objet)}</p>
          <dl><dt>Partie adverse</dt><dd>${esc(l.partie)} <small>(${esc(String(l.partieType).toLowerCase())})</small></dd>
          ${l.juridiction ? `<dt>Juridiction</dt><dd>${esc(l.juridiction)}</dd>` : ''}${l.service ? `<dt>Suivi par</dt><dd>${esc(l.service)}</dd>` : ''}
          ${l.echeance ? `<dt>Prochaine échéance</dt><dd>${fdate(l.echeance)}${l.objetEcheance ? '<br><small>' + esc(l.objetEcheance) + '</small>' : ''}</dd>` : ''}</dl>
          ${l.reclame ? `<div class="bar"><i style="width:${Math.min(100, 100 * (l.recouvre || 0) / l.reclame)}%"></i></div><small>${fcfa(l.recouvre || 0)} recouvrés sur ${fcfa(l.reclame)} réclamés</small>` : ''}
          <details ${form === 'acte' + i ? 'open' : ''}><summary>Chronologie (${l.evenements.length})</summary><ol class="chrono">${l.evenements.map(e => `<li><time>${fdate(e.date)}</time><span>${esc(e.type)}<small>${esc(e.desc || '')}</small></span></li>`).join('')}</ol>
          ${PB.canActes() && l.ouvert ? (form === 'acte' + i ? `<form class="form" data-lit="${i}" id="f-acte"><b>Nouvel acte de procédure</b>
            <div class="row2"><label>Date<input type="date" name="date" value="${iso(new Date())}" required></label><label>Type d'acte<select name="type">${optList(PB.TYPES_ACTE, '')}</select></label></div>
            <label>Description<input name="desc" placeholder="Ex. : audience renvoyée au…"></label>
            <div class="row2"><label>Montant recouvré (FCFA)<input type="number" name="recouvre" min="0" step="100000" value="${l.recouvre || 0}"></label><label>Prochaine échéance<input type="date" name="echeance" value="${l.echeance || ''}"></label></div>
            <div class="acts"><button type="button" class="btn sm" data-act="cancel-form">Annuler</button><button class="btn sm primary">Ajouter l'acte</button></div></form>`
            : `<button class="btn sm" data-act="form-acte" data-i="${i}" style="margin-top:8px">+ Ajouter un acte</button>`) : ''}</details></div>`).join('') : '<p class="empty">Aucun litige enregistré sur ce bien.</p>',
      docs: () => `${b.docs.length ? b.docs.map(d => `<div class="doc"><span class="ico">${esc(d.ext)}</span><div><b>${esc(d.titre)}</b><small>${esc(d.cat)}${d.date ? ' · ' + fdate(d.date) : ''}</small></div>${d.url ? `<a href="${esc(d.url)}" download="${esc(d.titre)}">Ouvrir</a>` : `<a href="${PB.DOC_DEMO}" target="_blank" rel="noopener">Ouvrir</a>`}</div>`).join('') : '<p class="empty">Aucun document.</p>'}
        ${canF ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px"><select id="docCat" aria-label="Catégorie du document" style="padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)">${optList(PB.CAT_DOCS, 'Autre')}</select><label class="upload" style="margin:0"><input type="file" id="up-doc"><span class="btn sm">Ajouter un document</span></label></div>` : ''}`,
      album: () => `<div class="album">${b.photos.map((p, i) => `<button class="ph" data-ph="${i}" aria-label="Agrandir : ${esc(p.label)}">${p.src ? `<img src="${p.src}" alt="${esc(p.label)}">` : ICON}<span>${esc(p.label)}${p.local ? ' (non conservée)' : ''}</span></button>`).join('')}</div>
        ${canF ? `<label class="upload"><input type="file" id="up-photo" accept="image/*" multiple><span class="btn sm">Téléverser des photos</span></label>` : ''}
        <p class="empty">Les vignettes hachurées tiennent lieu de photos dans cette démonstration. Les photos téléversées restent dans ce navigateur.</p>`
    };
    if (!body[S.tab]) S.tab = 'id';
    const editable = canE ? (E ? `<button class="btn sm primary" id="save">Enregistrer</button><button class="btn sm" id="cancel">Annuler</button>` : `<button class="btn sm" id="edit">Modifier</button>`) : '';
    el.innerHTML = `<div class="fhead">
      <div class="code">${esc(b.code)}${PB.mine(b) ? ' · <span style="color:var(--accent)">bien de votre ministère</span>' : ''}</div><h3>${esc(b.nom)}</h3>
      <div class="where">${esc([b.commune, b.ville !== b.commune ? b.ville : null, b.pays].filter(Boolean).join(', '))}</div>
      <div class="chips">${chip(b, 'regime')}${chip(b, 'occupation')}${chip(b, 'etat')}${PB.ouverts(b).length ? chip(b, 'litige') : ''}</div>
      <div class="factions">${editable}<button class="btn sm" id="loc">Localiser</button><button class="btn sm" id="print">Imprimer</button>${!canE && !E ? `<span class="ro">${canF ? 'Saisie terrain : visites, documents, photos' : 'Lecture seule'}</span>` : ''}<button class="btn sm" id="close" style="margin-left:auto">Fermer</button></div>
      <div class="ftabs" role="tablist">${FT.map(([k, l]) => { const n = { docs: b.docs.length, album: b.photos.length, trav: b.travaux.length, lit: b.litiges.length, vis: b.visites.length }[k]; return `<button role="tab" data-ft="${k}" aria-selected="${S.tab === k}">${l}${n ? ` (${n})` : ''}</button>` }).join('')}</div>
    </div>
    <div class="pad">${S.tab === 'id' ? al.map(a => `<div class="alert">${esc(a)}</div>`).join('') : ''}${body[S.tab]()}</div>`;
  };

  function onDetailClick(e) {
    const a = e.target.closest('.alist button'); if (a) return PB.select(+a.dataset.id, true);
    const t = e.target.closest('[data-ft]'); if (t) { if (S.edit) grab(); S.tab = t.dataset.ft; form = null; return PB.renderDetail() }
    const b = PB.byId(S.sel); if (!b) return;
    const ph = e.target.closest('[data-ph]'); if (ph) { const p = b.photos[+ph.dataset.ph]; return PB.modal(p.label, `<div class="ph">${p.src ? `<img src="${p.src}" alt="${esc(p.label)}">` : ICON}</div>`) }
    const act = e.target.closest('[data-act]');
    if (act) { const k = act.dataset.act; form = k === 'form-visite' ? 'visite' : k === 'form-acte' ? 'acte' + act.dataset.i : null; return PB.renderDetail() }
    const id = e.target.id;
    if (id === 'close') { S.sel = null; S.edit = false; draft = null; form = null; PB.refresh() }
    else if (id === 'loc') PB.M.flyTo(b, 18);
    else if (id === 'print') printFiche(b);
    else if (id === 'edit') { S.edit = true; draft = {}; if (!['id', 'foncier', 'occ'].includes(S.tab)) S.tab = 'id'; PB.renderDetail() }
    else if (id === 'cancel') { S.edit = false; draft = null; PB.renderDetail() }
    else if (id === 'save') {
      grab(); const changed = Object.keys(draft).filter(k => JSON.stringify(draft[k]) !== JSON.stringify(b[k]));
      Object.assign(b, draft); S.edit = false; draft = null;
      if (changed.length) { PB.log(b, 'Modification de la fiche', changed.map(k => LBL[k] || k).join(', ')); PB.toast('Fiche enregistrée') } else PB.toast('Aucune modification');
      PB.refresh();
    }
  }
  function grab() {
    if (!draft) return;
    const v = id => { const el = document.getElementById(id); return el ? el.value : undefined }, num = x => x === '' ? null : +x;
    ['nom', 'type', 'etat', 'regime', 'occupation', 'potentiel', 'statut', 'ville', 'tf', 'nicad'].forEach(k => { const x = v('e-' + k); if (x !== undefined) draft[k] = x === '' && ['tf', 'nicad'].includes(k) ? null : x });
    ['annee', 'niveaux', 'surface', 'utile', 'cout', 'valeur', 'effectif'].forEach(k => { const x = v('e-' + k); if (x !== undefined) draft[k] = num(x) });
    if (draft.regime === 'Non affecté') draft.affectataire = null;
  }
  function onSubmit(e) {
    e.preventDefault();
    const b = PB.byId(S.sel); if (!b) return;
    const fd = Object.fromEntries(new FormData(e.target).entries());
    if (e.target.id === 'f-visite') {
      b.visites.unshift({ date: fd.date, agent: fd.agent || PB.user.nom, etat: fd.etat, occupation: fd.occupation, conforme: null, obs: fd.obs || 'Visite de surveillance' });
      b.visites.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
      if (fd.maj) { b.etat = fd.etat; b.occupation = fd.occupation }
      b.visite = b.visites[0].date;
      PB.log(b, 'Visite de surveillance', `${fdate(fd.date)} · ${fd.etat} · ${fd.occupation}`);
      form = null; PB.toast('Visite enregistrée'); PB.refresh();
    } else if (e.target.id === 'f-acte') {
      const l = b.litiges[+e.target.dataset.lit];
      l.evenements.push({ date: fd.date, type: fd.type, desc: fd.desc || '' });
      l.evenements.sort((x, y) => x.date.localeCompare(y.date));
      l.recouvre = +fd.recouvre || 0; l.echeance = fd.echeance || null;
      if (fd.type === 'Expulsion / reprise' && l.aRecuperer) l.recupere = true;
      PB.log(b, 'Acte de procédure', `${l.ref} · ${fd.type}${fd.desc ? ' · ' + fd.desc : ''}`);
      form = 'acte' + e.target.dataset.lit; PB.toast('Acte ajouté au dossier'); PB.refresh(); form = null;
    }
  }
  function onDetailChange(e) {
    const b = PB.byId(S.sel); if (!b) return;
    if (e.target.id === 'up-photo') {
      const files = [...e.target.files]; let n = 0;
      files.forEach(f => { const r = new FileReader(); r.onload = () => { b.photos.push({ label: f.name, src: r.result }); if (++n === files.length) { PB.log(b, 'Photos ajoutées', files.map(f => f.name).join(', ')); PB.renderDetail(); PB.toast(`${n} photo(s) ajoutée(s) à l'album`) } }; r.readAsDataURL(f) });
    }
    if (e.target.id === 'up-doc' && e.target.files[0]) {
      const f = e.target.files[0], cat = ($('#docCat') || {}).value || 'Autre';
      const doc = { cat, titre: f.name, date: iso(new Date()), ext: (f.name.split('.').pop() || 'DOC').slice(0, 4).toUpperCase() };
      if (f.size < 400e3) { const r = new FileReader(); r.onload = () => { doc.url = r.result; fin() }; r.readAsDataURL(f) } else fin();
      function fin() { b.docs.unshift(doc); PB.log(b, 'Document ajouté', `${cat} · ${f.name}`); PB.renderDetail(); PB.toast('Document ajouté') }
    }
  }

  function printFiche(b) {
    const area = $('#printArea');
    const row = (k, v) => `<dt>${k}</dt><dd>${esc(v ?? '—')}</dd>`;
    area.innerHTML = `<p style="font-size:9pt;color:#555;margin:0 0 4mm">PatriBâti · Patrimoine bâti de l'État du Sénégal · fiche éditée le ${fdate(new Date())} · données de démonstration</p>
      <h1>${esc(b.nom)}</h1><p style="margin:0 0 3mm">${esc(b.code)} · ${esc([b.commune, b.ville, b.pays].filter(Boolean).join(', '))}</p>
      <h2>Identité</h2><dl>${row('Type', b.type)}${row('Année de construction', b.annee)}${row('Niveaux', b.niveaux)}${row('Surface bâtie', b.surface ? nf.format(b.surface) + ' m²' : null)}${row('État de vétusté', b.etat)}${row('Coût de rénovation', fcfa(b.cout))}${row('Valeur estimée', fcfa(b.valeur))}${row('Potentiel', b.potentiel)}${row("Priorité d'intervention", PB.priorite(b) + ' · ' + PB.score(b) + ' / 100')}${row('Statut de gestion', PB.gestion(b))}</dl>
      <h2>Foncier</h2><dl>${row('Titre foncier', b.tf)}${row('NICAD', b.nicad)}${row('Assiette', b.assiette ? nf.format(b.assiette) + ' m²' : null)}${row('Statut de propriété', b.statut)}${row('Coordonnées', b.lat.toFixed(5) + ', ' + b.lon.toFixed(5))}</dl>
      <h2>Occupation</h2><dl>${row('Régime', b.regime)}${row('Affectataire', b.affectataire || 'Aucun')}${row('Occupation', b.occupation)}${row('Dernière visite', fdate(PB.derniereVisite(b)))}</dl>
      ${PB.alertes(b).length ? `<h2>Alertes</h2><ul>${PB.alertes(b).map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      ${b.litiges.length && PB.canLitiges() ? `<h2>Litiges</h2><table><thead><tr><th>Réf.</th><th>Type</th><th>Phase</th><th>Partie adverse</th><th>Échéance</th><th>Réclamé</th><th>Recouvré</th></tr></thead><tbody>${b.litiges.map(l => `<tr><td>${esc(l.ref)}</td><td>${esc(l.type)}</td><td>${esc(l.phase)}</td><td>${esc(l.partie)}</td><td>${fdate(l.echeance)}</td><td>${fcfa(l.reclame || null)}</td><td>${fcfa(l.recouvre || 0)}</td></tr>`).join('')}</tbody></table>` : ''}`;
    document.body.classList.add('print-fiche');
    window.print();
    setTimeout(() => document.body.classList.remove('print-fiche'), 500);
  }

  /* ---------- Sélection ---------- */
  PB.select = function (id, move) {
    S.sel = id; S.tab = 'id'; S.edit = false; draft = null; form = null;
    const b = PB.byId(id); if (!b) return;
    const v = PB.THEMES[S.theme].get(b); if (S.off.has(v)) S.off.delete(v);
    if (!PB.inPerim(b)) setPerim('tous');
    PB.show('carte');
    PB.refresh();
    if (move || PB.M.m.getZoom() < PB.Z.detail) PB.M.flyTo(b, 18);
    if (matchMedia('(max-width:980px)').matches) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  PB.openTab = function (id, tab) { PB.select(id, true); S.tab = tab; PB.renderDetail() };

  /* ---------- Ajout d'un bien ---------- */
  PB.setAdding = function (on) {
    S.adding = on; $('#hint').hidden = !on; $('#map').classList.toggle('adding', on);
    if (on) { PB.show('carte'); if (PB.M.m.getZoom() < 5) PB.M.go('sn') }
  };
  PB.addAt = function (lon, lat) {
    const f = PB.M.countryAt(lon, lat), sn = !f || f.id === '686';
    const id = ++PB.seq;
    const b = { id, code: `PBE-${sn ? 'SEN' : 'EXT'}-${String(id).padStart(4, '0')}`, nom: 'Nouveau bien', type: 'Immeuble administratif', pays: sn ? 'Sénégal' : (f.properties.name || 'Étranger'), paysId: f ? f.id : '686', region: null, commune: null, ville: 'À renseigner', lon: +lon.toFixed(6), lat: +lat.toFixed(6), regime: 'Non affecté', affectataire: null, occupation: 'Inoccupé', statut: "Propriété de l'État", etat: 'Non évalué', annee: null, niveaux: null, surface: null, utile: null, assiette: 0, tf: null, nicad: null, cout: null, valeur: null, visite: null, potentiel: 'À déterminer', effectif: null, baux: [], travaux: [], docs: [], photos: [], litiges: [], visites: [] };
    PB.DATA.push(b); PB.setAdding(false); S.off.clear();
    PB.log(b, 'Création du bien', `${b.pays} · ${b.lat}, ${b.lon}`);
    S.sel = b.id; S.tab = 'id'; S.edit = true; draft = {}; PB.refresh(); PB.toast('Bien créé : complétez la fiche puis enregistrez');
  };
})(window.PB);
