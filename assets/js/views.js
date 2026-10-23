/* PatriBâti — modules pleine page : Inventaire, Litiges et recouvrement, Tableau de bord, Journal. */
(function (PB) {
  'use strict';
  const { $, $$, esc, norm, nf, fcfa, short, fdate, sum, group } = PB.U;
  const V = PB.PAGES = {};
  const link = (b, tab) => `<a data-id="${b.id}" ${tab ? `data-tab="${tab}"` : ''} tabindex="0" role="button">${esc(b.nom)}</a>`;
  const swatch = v => `<i class="sw" style="background:var(${v})"></i>`;
  const lockNote = '<div class="note">Ce module est réservé aux profils SOGEPA (gestionnaire, administrateur) et à la direction. Changez de profil depuis le bandeau pour le consulter.</div>';

  /* ================= Inventaire ================= */
  const INV = { q: '', perim: 'tous', regime: '', etat: '', gestion: '', aff: '', sort: 'score', dir: -1 };
  const COLS = [
    ['code', 'Code', b => b.code], ['nom', 'Bien', b => b.nom], ['ville', 'Localisation', b => b.ville + ' ' + b.pays], ['type', 'Type', b => b.type],
    ['regime', 'Régime', b => b.regime], ['occupation', 'Occupation', b => b.occupation], ['etat', 'État', b => PB.NOTE[b.etat] || 0],
    ['surface', 'Surface bâtie', b => b.surface || 0, 1], ['cout', 'Rénovation', b => b.cout || 0, 1], ['score', 'Score', b => PB.score(b), 1], ['gestion', 'Statut de gestion', b => PB.gestion(b)]
  ];
  const invList = () => {
    const n = norm(INV.q);
    const r = PB.DATA.filter(b => (INV.perim === 'tous' || (INV.perim === 'sn') === (b.paysId === '686'))
      && (!INV.regime || b.regime === INV.regime) && (!INV.etat || b.etat === INV.etat) && (!INV.gestion || PB.gestion(b) === INV.gestion)
      && (!INV.aff || (INV.aff === '__mine' ? PB.mine(b) : (b.affectataire || 'Non affecté (SOGEPA)') === INV.aff))
      && (!n || norm([b.nom, b.code, b.tf, b.nicad, b.ville, b.pays, b.commune, b.affectataire].join(' ')).includes(n)));
    const c = COLS.find(c => c[0] === INV.sort);
    return r.sort((a, b) => { const x = c[2](a), y = c[2](b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'fr')) * INV.dir });
  };
  const sel = (id, label, list, val) => `<select id="${id}" aria-label="${label}"><option value="">${label}</option>${list.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  V.inventaire = {
    html() {
      const affs = [...new Set(PB.DATA.map(b => b.affectataire || 'Non affecté (SOGEPA)'))].sort();
      return `<div class="page"><div class="page-in">
        <div class="phead"><div><h1 class="vt">Inventaire du patrimoine</h1><p class="sub">Tous les biens de l'État, affectés ou non, au Sénégal et à l'étranger.</p></div>
          <div class="filters"><button class="btn sm" id="invMap">Voir sur la carte</button><button class="btn sm" id="invCsv">Exporter CSV</button><button class="btn sm" id="invGeo">Exporter GeoJSON</button></div></div>
        <div class="filters">
          <input type="search" id="invQ" placeholder="Filtrer : nom, code, TF, NICAD, ville, affectataire…" value="${esc(INV.q)}" aria-label="Filtrer l'inventaire">
          ${sel('invPerim', 'Périmètre', [['sn', 'Sénégal'], ['etr', 'Étranger']], INV.perim === 'tous' ? '' : INV.perim)}
          ${sel('invRegime', 'Régime', PB.THEMES.regime.cats.map(c => [c[0], c[0]]), INV.regime)}
          ${sel('invEtat', 'État', PB.THEMES.etat.cats.map(c => [c[0], c[0]]), INV.etat)}
          ${sel('invGestion', 'Statut de gestion', PB.THEMES.gestion.cats.map(c => [c[0], c[0]]), INV.gestion)}
          ${sel('invAff', 'Affectataire', [...(PB.role.affectataire ? [['__mine', 'Mon ministère']] : []), ...affs.map(a => [a, a])], INV.aff)}
          <span class="count" id="invCount"></span>
        </div>
        <div class="tw"><table><thead><tr>${COLS.map(([k, l, , n]) => `<th class="${n ? 'num' : ''}"><button data-sort="${k}" ${INV.sort === k ? `data-dir="${INV.dir > 0 ? '▲' : '▼'}"` : ''}>${l}</button></th>`).join('')}</tr></thead><tbody id="invBody"></tbody></table></div>
      </div></div>`;
    },
    bind() {
      const body = () => {
        const L = invList();
        $('#invCount').textContent = `${L.length} bien${L.length > 1 ? 's' : ''} sur ${PB.DATA.length}`;
        $('#invBody').innerHTML = L.map(b => `<tr><td class="code">${esc(b.code)}</td><td>${link(b)}${PB.alertes(b).length ? `<span class="al">${PB.alertes(b).length} alerte${PB.alertes(b).length > 1 ? 's' : ''}</span>` : ''}</td><td>${esc(b.ville)}, ${esc(b.pays)}</td><td>${esc(b.type)}</td>
          <td><span class="chip">${swatch(PB.colorVar(b, 'regime'))}${esc(b.regime)}</span></td><td>${esc(b.occupation)}</td><td><span class="chip">${swatch(PB.colorVar(b, 'etat'))}${esc(b.etat)}</span></td>
          <td class="num">${b.surface ? nf.format(b.surface) + ' m²' : '—'}</td><td class="num">${fcfa(b.cout)}</td><td class="num"><b>${PB.score(b)}</b></td><td>${esc(PB.gestion(b))}</td></tr>`).join('') || `<tr><td colspan="${COLS.length}" class="empty">Aucun bien ne correspond aux filtres.</td></tr>`;
      };
      body();
      const on = (id, k) => $(id).addEventListener(id === '#invQ' ? 'input' : 'change', e => { INV[k] = e.target.value || (k === 'perim' ? 'tous' : ''); body() });
      on('#invQ', 'q'); on('#invPerim', 'perim'); on('#invRegime', 'regime'); on('#invEtat', 'etat'); on('#invGestion', 'gestion'); on('#invAff', 'aff');
      $('thead').addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (!b) return; INV.dir = INV.sort === b.dataset.sort ? -INV.dir : (COLS.find(c => c[0] === b.dataset.sort)[3] ? -1 : 1); INV.sort = b.dataset.sort; PB.render() });
      $('#invCsv').onclick = () => PB.exportCSV(invList(), 'patribati_inventaire');
      $('#invGeo').onclick = () => PB.exportGeoJSON(invList(), 'patribati_inventaire');
      $('#invMap').onclick = () => { const L = invList(); PB.show('carte'); PB.M.fitList(L) };
    }
  };

  /* ================= Litiges et recouvrement ================= */
  const LIT = { fam: '', etape: '', risque: '', etat: 'ouverts' };
  V.litiges = {
    html() {
      if (!PB.canLitiges()) return `<div class="page"><div class="page-in"><div><h1 class="vt">Litiges et recouvrement</h1></div>${lockNote}</div></div>`;
      const all = PB.DATA.flatMap(b => b.litiges.map(l => [b, l])), lo = all.filter(x => x[1].ouvert);
      const reclame = sum(lo, x => x[1].reclame || 0), recouvre = sum(lo, x => x[1].recouvre || 0), arr = sum(PB.DATA, PB.arrieres);
      const due = lo.filter(x => x[1].echeance && PB.joursAvant(x[1].echeance) >= -1 && PB.joursAvant(x[1].echeance) <= 90).sort((a, b) => a[1].echeance.localeCompare(b[1].echeance));
      const parties = [...group(lo, x => x[1].partie).entries()].map(([p, v]) => [p, v.length, sum(v, x => Math.max((x[1].reclame || 0) - (x[1].recouvre || 0), 0)), v[0][1].partieType]).sort((a, b) => b[2] - a[2]);
      const baux = PB.DATA.flatMap(b => b.baux.filter(x => x.arrieres > 0).map(x => [b, x])).sort((a, b) => b[1].arrieres - a[1].arrieres);
      return `<div class="page"><div class="page-in">
        <div class="phead"><div><h1 class="vt">Litiges et recouvrement</h1><p class="sub">Biens que l'État peine à recouvrer : contentieux avec les occupants, les constructeurs ou sur le foncier.</p></div></div>
        <div class="dkpis">
          <div class="kpi warn"><b>${lo.length}</b><span>litiges ouverts sur ${new Set(lo.map(x => x[0].id)).size} biens</span></div>
          <div class="kpi"><b>${short(reclame)}</b><span>FCFA réclamés</span></div>
          <div class="kpi"><b>${short(recouvre)}</b><span>FCFA recouvrés (${reclame ? Math.round(100 * recouvre / reclame) : 0} %)</span></div>
          <div class="kpi warn"><b>${short(reclame - recouvre + arr)}</b><span>FCFA à recouvrer, dont ${short(arr)} d'arriérés de loyers</span></div>
          <div class="kpi warn"><b>${lo.filter(x => x[1].aRecuperer && !x[1].recupere).length}</b><span>biens à reprendre en possession</span></div>
          <div class="kpi"><b>${due.filter(x => PB.joursAvant(x[1].echeance) <= 45).length}</b><span>échéances dans les 45 jours</span></div>
        </div>
        <div class="dgrid">
          <section><h2>Échéancier des 90 prochains jours</h2>${due.length ? `<div style="display:grid;gap:10px">${due.map(([b, l]) => { const d = new Date(l.echeance); return `<div class="due ${PB.joursAvant(l.echeance) <= 45 ? 'soon' : ''}"><time datetime="${l.echeance}"><b>${d.getDate()}</b><span>${d.toLocaleDateString('fr-FR', { month: 'short' })}</span></time><div><b>${esc(l.objetEcheance || l.phase)}</b><small style="display:block;color:var(--muted)">${esc(l.ref)} · ${link(b, 'lit')} · ${esc(l.partie)}</small></div></div>` }).join('')}</div>` : '<p class="empty">Aucune échéance dans les 90 jours.</p>'}</section>
          <section><h2>Montants à recouvrer par partie adverse</h2>${parties.map(([p, n, m, t]) => `<div class="row wide"><span>${esc(p)}<br><small style="color:var(--muted)">${esc(t)} · ${n} dossier${n > 1 ? 's' : ''}</small></span><div class="bar"><i style="width:${m / (parties[0][2] || 1) * 100}%;background:var(--c-e)"></i></div><em>${short(m)}</em></div>`).join('')}</section>
          <section><h2>Litiges ouverts par étape</h2>${PB.ETAPES.map(e => { const n = lo.filter(x => x[1].etape === e).length; return `<div class="row"><span>${e}</span><div class="bar"><i style="width:${n / (lo.length || 1) * 100}%;background:var(${PB.ETAPE_COL[e]})"></i></div><em>${n}</em></div>` }).join('')}
            <h2 style="margin-top:18px">Par famille</h2>${['Occupant', 'Constructeur', 'Foncier'].map(f => { const n = lo.filter(x => x[1].famille === f).length; return `<div class="row"><span>${f}</span><div class="bar"><i style="width:${n / (lo.length || 1) * 100}%;background:var(--c-e)"></i></div><em>${n}</em></div>` }).join('')}</section>
        </div>
        <section class="dtable"><div class="phead" style="margin-bottom:10px"><h2 style="margin:0">Dossiers contentieux</h2>
          <div class="filters">${sel('litEtat', 'Tous les dossiers', [['ouverts', 'Ouverts'], ['clos', 'Clos']], LIT.etat)}${sel('litFam', 'Famille', [['Occupant', 'Occupant'], ['Constructeur', 'Constructeur'], ['Foncier', 'Foncier']], LIT.fam)}${sel('litEtape', 'Étape', PB.ETAPES.map(e => [e, e]), LIT.etape)}${sel('litRisque', 'Risque', [['Élevé', 'Élevé'], ['Moyen', 'Moyen'], ['Faible', 'Faible']], LIT.risque)}</div></div>
          <div class="tw"><table><thead><tr><th>Bien</th><th>Litige</th><th>Partie adverse</th><th>Phase</th><th>Ouverture</th><th>Prochaine échéance</th><th class="num">Réclamé</th><th class="num">Recouvré</th><th>Risque</th><th>À récupérer</th></tr></thead><tbody id="litBody"></tbody></table></div></section>
        <section class="dtable"><h2>Arriérés de loyers · ${baux.length} titres d'occupation</h2><div class="tw"><table><thead><tr><th>Bien</th><th>Titre</th><th>Occupant</th><th class="num">Loyer mensuel</th><th class="num">Arriérés</th><th class="num">Mois de loyer</th><th>Litige ouvert</th></tr></thead><tbody>
          ${baux.map(([b, x]) => `<tr><td>${link(b, 'occ')}<br><small style="color:var(--muted)">${esc(b.ville)}, ${esc(b.pays)}</small></td><td>${esc(x.titre)} · ${esc(x.sens)}</td><td>${esc(x.occupant)}</td><td class="num">${fcfa(x.loyer)}</td><td class="num"><b>${fcfa(x.arrieres)}</b></td><td class="num">${x.loyer ? Math.round(x.arrieres / x.loyer) : '—'}</td><td>${PB.ouverts(b).length ? 'Oui' : '<span style="color:var(--c-e)">Non : à engager</span>'}</td></tr>`).join('')}</tbody></table></div></section>
      </div></div>`;
    },
    bind() {
      if (!PB.canLitiges()) return;
      const body = () => {
        const L = PB.DATA.flatMap(b => b.litiges.map(l => [b, l])).filter(([, l]) => (!LIT.etat || (LIT.etat === 'ouverts') === l.ouvert) && (!LIT.fam || l.famille === LIT.fam) && (!LIT.etape || l.etape === LIT.etape) && (!LIT.risque || l.risque === LIT.risque))
          .sort((a, b) => (a[1].echeance || '9').localeCompare(b[1].echeance || '9'));
        $('#litBody').innerHTML = L.map(([b, l]) => `<tr><td>${link(b, 'lit')}<br><small style="color:var(--muted)">${esc(b.ville)}, ${esc(b.pays)}</small></td><td>${esc(l.type)}<br><small style="color:var(--muted)">${esc(l.ref)} · ${esc(l.famille)}</small></td><td>${esc(l.partie)}</td>
          <td><span class="chip">${swatch(PB.ETAPE_COL[l.etape])}${esc(l.phase)}</span></td><td class="num">${fdate(l.ouverture)}</td><td class="num">${fdate(l.echeance)}</td><td class="num">${fcfa(l.reclame || null)}</td><td class="num">${l.reclame ? fcfa(l.recouvre || 0) : '—'}</td><td>${esc(l.risque)}</td><td>${l.aRecuperer ? (l.recupere ? 'Récupéré' : 'Oui') : '—'}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Aucun dossier ne correspond aux filtres.</td></tr>';
      };
      body();
      [['#litEtat', 'etat'], ['#litFam', 'fam'], ['#litEtape', 'etape'], ['#litRisque', 'risque']].forEach(([id, k]) => $(id).addEventListener('change', e => { LIT[k] = e.target.value; body() }));
    }
  };

  /* ================= Tableau de bord ================= */
  function bars(title, key, measure) {
    const t = PB.THEMES[key], rows = t.cats.map(([name, v]) => { const g = PB.DATA.filter(b => t.get(b) === name); return { name, v, val: measure ? sum(g, measure) : g.length } }).filter(r => r.val > 0), max = Math.max(1, ...rows.map(r => r.val));
    return `<section><h2>${title}</h2>${rows.map(r => `<div class="row"><span>${esc(r.name)}</span><div class="bar"><i style="width:${r.val / max * 100}%;background:var(${r.v})"></i></div><em>${measure ? short(r.val) : r.val}</em></div>`).join('')}</section>`;
  }
  V.tableau = {
    html() {
      const D = PB.DATA, al = D.map(b => [b, PB.alertes(b)]).filter(x => x[1].length), tr = D.flatMap(b => b.travaux.map(t => [b, t]));
      const loc = [...group(D, b => b.paysId === '686' ? b.region : b.pays).entries()].map(([k, v]) => [k, sum(v, b => b.cout || 0), v.length]).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = loc[0] ? loc[0][1] : 1;
      const loyers = sum(D.flatMap(b => b.baux).filter(x => x.sens === 'État preneur'), x => x.loyer || 0) * 12;
      const percus = sum(D.flatMap(b => b.baux).filter(x => x.sens === 'État bailleur'), x => x.loyer || 0) * 12;
      const prio = [...D].sort((a, b) => PB.score(b) - PB.score(a)).slice(0, 10);
      const aff = [...group(D, b => b.affectataire || 'Non affecté (SOGEPA)').entries()].map(([n, v]) => [n, { n: v.length, u: sum(v, b => b.utile || 0), e: sum(v, b => b.effectif || 0), ue: sum(v.filter(b => b.effectif), b => b.utile || 0), l: 12 * sum(v.flatMap(b => b.baux).filter(x => x.sens === 'État preneur'), x => x.loyer || 0) }]).sort((a, b) => b[1].n - a[1].n);
      const pays = [...group(D.filter(b => b.paysId !== '686'), b => b.pays).entries()].map(([p, v]) => [p, v.length, sum(v, b => b.surface || 0), sum(v, b => b.cout || 0), v.filter(b => PB.ouverts(b).length).length]).sort((a, b) => b[1] - a[1]);
      const canL = PB.canLitiges();
      return `<div class="page"><div class="page-in">
        <div class="phead"><div><h1 class="vt">Tableau de bord</h1><p class="sub">Synthèse du parc au ${fdate(PB.TODAY)} · ${D.length} biens dans ${new Set(D.map(b => b.pays)).size} pays.</p></div>
          <div class="filters"><button class="btn sm" id="dashCsv">Exporter l'inventaire (CSV)</button><button class="btn sm" onclick="window.print()">Imprimer</button></div></div>
        <div class="dkpis">
          <div class="kpi"><b>${D.length}</b><span>biens inventoriés dans ${new Set(D.map(b => b.pays)).size} pays</span></div>
          <div class="kpi"><b>${D.filter(b => b.regime === 'Non affecté').length}</b><span>biens non affectés, gérés par la SOGEPA</span></div>
          <div class="kpi"><b>${nf.format(Math.round(sum(D, b => b.surface || 0) / 1000))} k m²</b><span>de surface bâtie</span></div>
          <div class="kpi"><b>${short(sum(D, b => b.cout || 0))}</b><span>FCFA de rénovation estimée</span></div>
          <div class="kpi warn"><b>${D.filter(b => PB.ouverts(b).length).length}</b><span>biens en litige, dont ${D.filter(b => PB.ouverts(b).some(l => l.aRecuperer && !l.recupere)).length} à récupérer</span></div>
          ${canL ? `<div class="kpi warn"><b>${short(sum(D, PB.aRecouvrer))}</b><span>FCFA à recouvrer (contentieux et arriérés)</span></div>` : ''}
          <div class="kpi"><b>${short(loyers)}</b><span>FCFA de loyers payés par l'État par an</span></div>
          <div class="kpi"><b>${short(percus)}</b><span>FCFA de loyers attendus des occupants par an</span></div>
        </div>
        <div class="dgrid">${bars("Biens par régime d'affectation", 'regime')}${bars('Biens par état de vétusté', 'etat')}${bars('Biens par occupation', 'occupation')}${bars('Biens par statut de gestion', 'gestion')}${bars("Biens par priorité d'intervention", 'priorite')}${bars('Potentiel de valorisation', 'potentiel')}${bars('Coût de rénovation par état (FCFA)', 'etat', b => b.cout || 0)}
          <section><h2>Coût de rénovation par région ou pays (FCFA)</h2>${loc.map(([n, v, c]) => `<div class="row"><span>${esc(n)}<br><small style="color:var(--muted)">${c} bien${c > 1 ? 's' : ''}</small></span><div class="bar"><i style="width:${v / mx * 100}%"></i></div><em>${short(v)}</em></div>`).join('')}</section>
          ${bars('Biens par type', 'type')}</div>
        <section class="dtable"><h2>Priorités d'intervention · les 10 scores les plus élevés</h2><div class="tw"><table><thead><tr><th>Bien</th><th>Localisation</th><th>Statut de gestion</th><th>État</th><th>Occupation</th><th class="num">Score</th><th class="num">Coût de rénovation</th></tr></thead><tbody>${prio.map(b => `<tr><td>${link(b)}</td><td>${esc(b.ville)}, ${esc(b.pays)}</td><td>${PB.gestion(b)}</td><td>${esc(b.etat)}</td><td>${esc(b.occupation)}</td><td class="num"><b>${PB.score(b)}</b> / 100</td><td class="num">${fcfa(b.cout)}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="dtable"><h2>Patrimoine à l'étranger · ${pays.length} pays</h2><div class="tw"><table><thead><tr><th>Pays</th><th class="num">Biens</th><th class="num">Surface bâtie</th><th class="num">Rénovation estimée</th><th class="num">Biens en litige</th></tr></thead><tbody>${pays.map(([p, n, s, c, l]) => `<tr><td><a data-pays="${esc(p)}" tabindex="0" role="button">${esc(p)}</a></td><td class="num">${n}</td><td class="num">${nf.format(Math.round(s))} m²</td><td class="num">${fcfa(c)}</td><td class="num">${l || '—'}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="dtable"><h2>Suivi des travaux · ${tr.length} chantiers</h2><div class="tw"><table><thead><tr><th>Bien</th><th>Travaux</th><th>Statut</th><th class="num">Début</th><th class="num">Fin prévue</th><th class="num">Avancement</th><th>Entreprise</th><th class="num">Coût</th></tr></thead><tbody>${tr.sort((a, b) => (a[1].debut || '').localeCompare(b[1].debut || '')).map(([b, t]) => `<tr><td>${link(b, 'trav')}</td><td>${esc(t.type)}</td><td>${esc(t.statut)}</td><td class="num">${fdate(t.debut)}</td><td class="num">${fdate(t.fin)}</td><td class="num">${t.av} %</td><td>${esc(t.entreprise || 'À attribuer')}</td><td class="num">${fcfa(t.cout)}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="dtable"><h2>Inventaire par affectataire</h2><div class="tw"><table><thead><tr><th>Affectataire</th><th class="num">Biens</th><th class="num">Surface utile</th><th class="num">Agents hébergés</th><th class="num">m² par agent</th><th class="num">Loyers payés par an</th></tr></thead><tbody>${aff.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${v.n}</td><td class="num">${nf.format(Math.round(v.u))} m²</td><td class="num">${v.e ? nf.format(v.e) : '—'}</td><td class="num">${v.e ? (v.ue / v.e).toFixed(1).replace('.', ',') : '—'}</td><td class="num">${v.l ? fcfa(v.l) : '—'}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="dtable"><h2>Alertes de gestion · ${al.length} biens</h2><div class="tw"><table><thead><tr><th>Bien</th><th>Localisation</th><th>Régime</th><th>Alertes</th></tr></thead><tbody>${al.sort((a, b) => b[1].length - a[1].length).map(([b, a]) => `<tr><td>${link(b)}</td><td>${esc(b.ville)}, ${esc(b.pays)}</td><td>${esc(b.regime)}</td><td>${a.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div></section>
      </div></div>`;
    },
    bind() {
      $('#dashCsv').onclick = () => PB.exportCSV(PB.DATA, 'patribati_inventaire');
    }
  };

  /* ================= Journal ================= */
  V.journal = {
    html() {
      const canJ = PB.role.journal;
      return `<div class="page"><div class="page-in" style="max-width:900px">
        <div class="phead"><div><h1 class="vt">Journal des modifications</h1><p class="sub">Chaque création, modification, visite, pièce ou acte est tracé avec son auteur et sa date.</p></div>
          ${PB.LOG.length ? '<div class="filters"><button class="btn sm" id="logCsv">Exporter</button><button class="btn sm" id="logReset">Réinitialiser la démo</button></div>' : ''}</div>
        ${!canJ ? '<div class="note">Le journal complet est réservé aux profils administrateur et gestionnaire. Vous voyez ci-dessous vos propres saisies.</div>' : ''}
        ${(() => { const L = PB.LOG.filter(x => canJ || x.profil === PB.roleKey); return L.length ? `<ul class="log">${L.map(x => { const b = PB.byId(x.bien); return `<li><time>${new Date(x.t).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><div><b>${esc(x.action)}</b> · ${b ? link(b) : esc(x.nom)} <small>${esc(x.code)}</small><br><small>${esc(x.qui)}${x.detail ? ' · ' + esc(x.detail) : ''}</small></div></li>` }).join('')}</ul>` : `<div class="card"><b>Aucune modification pour l'instant.</b><small>Ouvrez une fiche depuis la carte, cliquez sur « Modifier », saisissez une visite ou ajoutez un bien : chaque action apparaîtra ici. Les saisies sont conservées dans ce navigateur uniquement.</small></div>` })()}
        <div class="note">En production, ce journal est alimenté par des déclencheurs PostgreSQL (table <code>patrimoine.journal</code>) : il couvre aussi les modifications faites par l'API et permet de restituer l'état d'un bien à une date donnée.</div>
      </div></div>`;
    },
    bind() {
      const r = $('#logReset'); if (r) r.onclick = () => { if (confirm('Effacer toutes les saisies de la démo dans ce navigateur ?')) PB.reset() };
      const c = $('#logCsv'); if (c) c.onclick = () => PB.download('patribati_journal.csv', '﻿' + ['date;auteur;action;bien;detail', ...PB.LOG.map(x => [x.t, x.qui, x.action, x.code + ' ' + x.nom, x.detail].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))].join('\n'), 'text/csv;charset=utf-8');
    }
  };

  /* Liens communs vers une fiche */
  document.addEventListener('click', e => {
    const p = e.target.closest('#page a[data-pays]'); if (p) { const L = PB.DATA.filter(b => b.pays === p.dataset.pays); PB.show('carte'); return PB.M.fitList(L) }
    const a = e.target.closest('#page a[data-id]'); if (!a) return;
    a.dataset.tab ? PB.openTab(+a.dataset.id, a.dataset.tab) : PB.select(+a.dataset.id, true);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = e.target.closest && e.target.closest('#page a[data-id], #page a[data-pays]'); if (a) a.click() } });
})(window.PB);
