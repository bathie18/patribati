/* PatriBâti — module Administration : comptes, rôles et permissions, test des profils, journal des connexions. */
(function (PB) {
  'use strict';
  const { $, $$, esc, fdate } = PB.U;
  const A = PB.AUTH;
  let tab = 'comptes';
  const dt = t => t ? new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const affectataires = () => [...new Set(PB.DATA.map(b => b.affectataire).filter(Boolean))].sort();
  const roleOpts = v => Object.entries(A.roles).map(([k, r]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(r.nom)}</option>`).join('');
  const editLabel = v => (PB.EDIT_LEVELS.find(x => x[0] === v) || [, v])[1];

  function comptes() {
    const me = PB.realUser ? PB.realUser.id : PB.user.id;
    return `<div class="phead"><div><h2 style="margin:0">Comptes · ${A.users.length}</h2></div><div class="filters"><input type="search" id="admQ" placeholder="Filtrer les comptes…" aria-label="Filtrer les comptes"><button class="btn sm primary" id="admNew">+ Nouveau compte</button></div></div>
      <div class="tw"><table><thead><tr><th>Identifiant</th><th>Nom</th><th>Structure</th><th>Rôle</th><th>Périmètre de saisie</th><th>Statut</th><th>Dernière connexion</th><th>Actions</th></tr></thead><tbody id="admUsers">
      ${A.users.map(u => { const r = A.roles[u.role] || {}; return `<tr data-u="${u.id}" data-s="${esc((u.login + ' ' + u.nom + ' ' + u.structure + ' ' + (r.nom || '')).toLowerCase())}">
        <td class="code">${esc(u.login)}${u.id === me ? ' <span class="chip" style="font-family:var(--f-body)">vous</span>' : ''}</td><td>${esc(u.nom)}</td><td>${esc(u.structure || '—')}</td><td>${esc(r.nom || u.role)}</td>
        <td>${esc(r.edit === 'affectataire' ? (u.affectataire || 'Ministère non renseigné') : editLabel(r.edit))}</td>
        <td><span class="chip"><i class="sw" style="background:var(${u.actif ? '--v1' : '--v0'})"></i>${u.actif ? 'Actif' : 'Désactivé'}</span></td>
        <td class="num" style="text-align:left">${dt(u.derniere)}</td>
        <td><div class="acts-row">${u.id !== me && u.actif ? `<button class="btn sm" data-a="test">Tester ce profil</button>` : ''}<button class="btn sm" data-a="edit">Modifier</button>${u.id !== me ? `<button class="btn sm" data-a="toggle">${u.actif ? 'Désactiver' : 'Activer'}</button><button class="btn sm ghost danger" data-a="del">Supprimer</button>` : ''}</div></td></tr>` }).join('')}
      </tbody></table></div>
      <p class="note">« Tester ce profil » ouvre PatriBâti avec l'identité et les droits du compte choisi. Un bandeau permet de revenir à votre compte administrateur à tout moment.</p>`;
  }

  function roles() {
    const keys = Object.keys(A.roles);
    return `<div class="phead"><div><h2 style="margin:0">Rôles et permissions</h2><p class="sub">Les changements s'appliquent immédiatement à tous les comptes du rôle. Le rôle administrateur conserve toujours l'administration.</p></div>
      <div class="filters"><button class="btn sm" id="rolesReset">Rétablir les permissions par défaut</button></div></div>
      <div class="tw"><table class="perm"><thead><tr><th>Permission</th>${keys.map(k => `<th>${esc(A.roles[k].nom)}<br><small style="font-weight:400">${A.users.filter(u => u.role === k).length} compte(s)</small></th>`).join('')}</tr></thead><tbody>
      ${PB.PERMS.map(([p, label, kind]) => `<tr><td>${esc(label)}</td>${keys.map(k => { const r = A.roles[k], lock = k === 'admin' && (p === 'admin' || p === 'edit');
        return `<td>${kind === 'select' ? `<select data-r="${k}" data-p="${p}" ${lock ? 'disabled' : ''} aria-label="${esc(label)} · ${esc(r.nom)}">${PB.EDIT_LEVELS.map(([v, l]) => `<option value="${v}" ${r[p] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
          : `<input type="checkbox" data-r="${k}" data-p="${p}" ${r[p] ? 'checked' : ''} ${lock ? 'disabled' : ''} aria-label="${esc(label)} · ${esc(r.nom)}">`}</td>` }).join('')}</tr>`).join('')}
      <tr><td>Description</td>${keys.map(k => `<td><small>${esc(A.roles[k].desc || '')}</small></td>`).join('')}</tr>
      </tbody></table></div>`;
  }

  function connexions() {
    return `<div class="phead"><h2 style="margin:0">Journal des connexions · ${A.connexions.length}</h2>${A.connexions.length ? '<div class="filters"><button class="btn sm" id="cxClear">Vider le journal</button></div>' : ''}</div>
      ${A.connexions.length ? `<div class="tw"><table><thead><tr><th>Date</th><th>Compte</th><th>Évènement</th><th>Détail</th></tr></thead><tbody>${A.connexions.map(c => `<tr><td class="num" style="text-align:left">${dt(c.t)}</td><td class="code">${esc(c.login)}</td><td>${c.event.startsWith('Échec') ? `<span style="color:var(--c-e)">${esc(c.event)}</span>` : esc(c.event)}</td><td>${esc(c.detail)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Aucune connexion enregistrée.</p>'}`;
  }

  function donnees() {
    return `<div class="cards">
      <div class="card"><b>Saisies de la démonstration</b><small>${PB.LOG.length} saisie(s) conservée(s) dans ce navigateur (fiches modifiées, visites, actes, pièces, biens créés).</small><div style="margin-top:10px"><button class="btn sm" id="dReset" ${PB.LOG.length ? '' : 'disabled'}>Effacer les saisies</button></div></div>
      <div class="card"><b>Comptes et permissions</b><small>Revenir aux sept comptes et aux rôles d'origine. Vous serez déconnecté.</small><div style="margin-top:10px"><button class="btn sm" id="aReset">Réinitialiser les comptes</button></div></div>
      <div class="card"><b>Jeu de données</b><small>${PB.DATA.length} biens dans ${new Set(PB.DATA.map(b => b.pays)).size} pays, dont ${PB.DATA.filter(b => b.paysId !== '686').length} à l'étranger. Date de référence des alertes : ${fdate(PB.TODAY)}.</small></div>
    </div>
    <p class="note">Dans ce prototype, comptes, mots de passe et droits sont simulés dans le navigateur. En production : comptes nominatifs dans Keycloak, droits appliqués par l'API et par PostgreSQL (Row-Level Security), journal d'audit en base.</p>`;
  }

  function userForm(u) {
    const isNew = !u; u = u || { login: '', nom: '', structure: '', role: 'lecteur', affectataire: '', actif: true };
    const m = PB.modal(isNew ? 'Nouveau compte' : `Modifier le compte ${u.login}`, `<form class="form" id="uForm" style="margin:14px 16px;background:none;border:0;padding:0">
      <div class="row2"><label>Identifiant<input name="login" value="${esc(u.login)}" required autocomplete="off" autocapitalize="none"></label><label>${isNew ? 'Mot de passe' : 'Nouveau mot de passe <small>(laisser vide pour ne pas changer)</small>'}<input name="password" type="text" autocomplete="off" ${isNew ? 'required' : ''}></label></div>
      <label>Nom affiché<input name="nom" value="${esc(u.nom)}" required></label>
      <label>Structure<input name="structure" value="${esc(u.structure || '')}" placeholder="SOGEPA · Pôle gestion, ministère…"></label>
      <div class="row2"><label>Rôle<select name="role">${roleOpts(u.role)}</select></label><label>Ministère affectataire <small>(rôle affectataire)</small><select name="affectataire"><option value="">—</option>${affectataires().map(a => `<option ${a === u.affectataire ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label></div>
      <p class="err" id="uErr" hidden></p>
      <div class="acts"><button type="button" class="btn sm" data-close>Annuler</button><button class="btn sm primary">${isNew ? 'Créer le compte' : 'Enregistrer'}</button></div></form>`);
    $('#uForm', m).onsubmit = e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries()), err = $('#uErr', m);
      const fail = t => { err.textContent = t; err.hidden = false };
      f.login = f.login.trim();
      if (!/^[a-zA-Z0-9._-]{3,}$/.test(f.login)) return fail('Identifiant : au moins 3 caractères, lettres, chiffres, point, tiret ou souligné.');
      if (A.users.some(x => x.login.toLowerCase() === f.login.toLowerCase() && (!u.id || x.id !== u.id))) return fail('Cet identifiant est déjà utilisé.');
      if (isNew && f.password.length < 4) return fail('Mot de passe : au moins 4 caractères.');
      if (A.roles[f.role].edit === 'affectataire' && !f.affectataire) return fail('Choisissez le ministère affectataire de ce compte.');
      if (!isNew && A.roles[u.role].admin && !A.roles[f.role].admin && A.admins().length <= 1 && u.actif) return fail('Ce compte est le dernier administrateur actif : il doit garder un rôle administrateur.');
      const data = { login: f.login, nom: f.nom.trim(), structure: f.structure.trim(), role: f.role, affectataire: f.affectataire || null };
      if (isNew) { A.users.push({ id: A.nextId(), ...data, password: f.password, actif: true, cree: new Date().toISOString().slice(0, 10), derniere: null }); A.trace(PB.realUser.login, 'Création de compte', f.login) }
      else { Object.assign(A.byId(u.id), data, f.password ? { password: f.password } : {}); A.trace(PB.realUser.login, 'Modification de compte', f.login + (f.password ? ' · mot de passe changé' : '')) }
      A.save(); A.refreshCurrent(); m.remove(); PB.toast(isNew ? 'Compte créé' : 'Compte enregistré'); PB.render();
    };
  }

  PB.PAGES.admin = {
    html() {
      if (!PB.role.admin) return `<div class="page"><div class="page-in"><h1 class="vt">Administration</h1><div class="note">Ce module est réservé aux administrateurs.</div></div></div>`;
      const T = [['comptes', 'Comptes'], ['roles', 'Rôles et permissions'], ['connexions', 'Journal des connexions'], ['donnees', 'Données de la démo']];
      return `<div class="page"><div class="page-in">
        <div class="phead"><div><h1 class="vt">Administration</h1><p class="sub">Comptes des agents, rôles et permissions, traçabilité des connexions.</p></div></div>
        <div class="ftabs" role="tablist" id="admTabs">${T.map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
        <section>${{ comptes, roles, connexions, donnees }[tab]()}</section>
      </div></div>`;
    },
    bind() {
      if (!PB.role.admin) return;
      $('#admTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; PB.render() } };
      const page = $('#page');
      if (tab === 'comptes') {
        $('#admNew').onclick = () => userForm(null);
        $('#admQ').oninput = e => { const q = e.target.value.toLowerCase(); $$('#admUsers tr').forEach(tr => tr.hidden = !tr.dataset.s.includes(q)) };
        $('#admUsers').onclick = e => {
          const b = e.target.closest('[data-a]'); if (!b) return;
          const u = A.byId(+b.closest('tr').dataset.u), a = b.dataset.a;
          if (a === 'edit') userForm(u);
          else if (a === 'test') { A.impersonate(u.id); PB.restart('carte'); PB.toast(`Vous testez le profil ${u.nom}`) }
          else if (a === 'toggle') {
            if (u.actif && A.roles[u.role].admin && A.admins().length <= 1) return PB.toast('Impossible : dernier administrateur actif');
            u.actif = !u.actif; A.trace(PB.realUser.login, u.actif ? 'Activation de compte' : 'Désactivation de compte', u.login); A.save(); PB.render();
          } else if (a === 'del') {
            if (A.roles[u.role].admin && A.admins().length <= 1 && u.actif) return PB.toast('Impossible : dernier administrateur actif');
            if (!confirm(`Supprimer définitivement le compte « ${u.login} » ?`)) return;
            A.users = A.users.filter(x => x.id !== u.id); A.trace(PB.realUser.login, 'Suppression de compte', u.login); A.save(); PB.render(); PB.toast('Compte supprimé');
          }
        };
      }
      if (tab === 'roles') {
        page.querySelector('table.perm').onchange = e => {
          const el = e.target, r = A.roles[el.dataset.r]; if (!r) return;
          r[el.dataset.p] = el.type === 'checkbox' ? el.checked : el.value;
          A.trace(PB.realUser.login, 'Permission modifiée', `${r.nom} · ${(PB.PERMS.find(p => p[0] === el.dataset.p) || [])[1]} : ${el.type === 'checkbox' ? (el.checked ? 'oui' : 'non') : editLabel(el.value)}`);
          A.save(); A.refreshCurrent(); PB.toast('Permission enregistrée');
        };
        $('#rolesReset').onclick = () => { if (!confirm('Rétablir les permissions par défaut de tous les rôles ?')) return; A.roles = JSON.parse(JSON.stringify(PB.DEFAULT_ROLES)); A.trace(PB.realUser.login, 'Permissions réinitialisées'); A.save(); A.refreshCurrent(); PB.render() };
      }
      if (tab === 'connexions') { const c = $('#cxClear'); if (c) c.onclick = () => { A.connexions = []; A.save(); PB.render() } }
      if (tab === 'donnees') {
        $('#dReset').onclick = () => { if (confirm('Effacer toutes les saisies de la démo dans ce navigateur ?')) PB.reset() };
        $('#aReset').onclick = () => { if (!confirm('Réinitialiser les comptes et les permissions ? Vous serez déconnecté.')) return; A.resetAccounts(); PB.logout() };
      }
    }
  };
})(window.PB);
