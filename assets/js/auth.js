/* PatriBâti — comptes, rôles et session (simulation navigateur).
   Comptes et rôles : localStorage (PB.ACCOUNTS_KEY), modifiables dans le module Administration.
   Session : sessionStorage (PB.SESSION_KEY) — { uid, as } où « as » est le compte testé par un administrateur.
   En production : Keycloak (OpenID Connect) + contrôle des droits par l'API et par PostgreSQL. */
(function (PB) {
  'use strict';
  const { store } = PB.U;
  const clone = o => JSON.parse(JSON.stringify(o));
  const A = PB.AUTH = {};

  function load() {
    const s = store.get(PB.ACCOUNTS_KEY) || {};
    A.users = Array.isArray(s.users) && s.users.length ? s.users : clone(PB.DEFAULT_USERS).map(u => ({ ...u, actif: true, cree: '2026-10-01', derniere: null }));
    const roles = clone(PB.DEFAULT_ROLES);
    Object.entries(s.roles || {}).forEach(([k, r]) => { roles[k] = { ...(roles[k] || {}), ...r } });
    roles.admin.admin = true; roles.admin.edit = 'tout'; /* le rôle administrateur garde toujours l'administration */
    A.roles = roles;
    A.connexions = s.connexions || [];
  }
  A.save = () => store.set(PB.ACCOUNTS_KEY, { users: A.users, roles: A.roles, connexions: A.connexions.slice(0, 200) });
  A.resetAccounts = () => { store.del(PB.ACCOUNTS_KEY); load(); A.save() };
  A.trace = (login, event, detail) => { A.connexions.unshift({ t: new Date().toISOString(), login, event, detail: detail || '' }); A.save() };
  A.byId = id => A.users.find(u => u.id === id);
  A.nextId = () => Math.max(0, ...A.users.map(u => u.id)) + 1;
  A.initiales = nom => String(nom || '?').replace(/\(.*?\)/g, '').trim().split(/[\s'’-]+/).filter(w => w.length > 1 && w[0] === w[0].toUpperCase()).slice(0, 2).map(w => w[0]).join('').toUpperCase() || nom.slice(0, 2).toUpperCase();
  A.admins = () => A.users.filter(u => u.actif && A.roles[u.role] && A.roles[u.role].admin);
  load();

  /* Applique un compte à l'interface : PB.user (compte actif), PB.role (permissions du rôle + infos du compte) */
  function apply(u) {
    const r = A.roles[u.role] || A.roles.lecteur;
    PB.user = u; PB.roleKey = u.role;
    PB.role = { ...r, key: u.role, roleNom: r.nom, nom: u.nom, structure: u.structure, initiales: A.initiales(u.nom), affectataire: r.edit === 'affectataire' ? u.affectataire || null : u.affectataire || null };
  }

  A.login = function (login, password) {
    const u = A.users.find(x => x.login.toLowerCase() === String(login).trim().toLowerCase());
    if (!u || u.password !== password) { A.trace(login || '—', 'Échec de connexion', 'Identifiant ou mot de passe incorrect'); return { ok: false, msg: 'Identifiant ou mot de passe incorrect.' } }
    if (!u.actif) { A.trace(u.login, 'Échec de connexion', 'Compte désactivé'); return { ok: false, msg: 'Ce compte est désactivé. Contactez l\'administrateur.' } }
    u.derniere = new Date().toISOString(); A.trace(u.login, 'Connexion');
    PB.realUser = u; apply(u);
    store.sset(PB.SESSION_KEY, JSON.stringify({ uid: u.id, as: null }));
    return { ok: true };
  };
  A.logout = function () {
    if (PB.realUser) A.trace(PB.realUser.login, 'Déconnexion');
    PB.realUser = PB.user = PB.role = null; store.sset(PB.SESSION_KEY, null);
  };
  /* L'administrateur prend l'identité d'un autre compte pour tester ses droits */
  A.impersonate = function (id) {
    const u = A.byId(id); if (!u || !PB.realUser) return false;
    A.trace(PB.realUser.login, 'Test de profil', `${u.login} (${(A.roles[u.role] || {}).nom || u.role})`);
    apply(u); store.sset(PB.SESSION_KEY, JSON.stringify({ uid: PB.realUser.id, as: u.id }));
    return true;
  };
  A.stopImpersonate = function () {
    if (!PB.realUser) return; apply(PB.realUser);
    store.sset(PB.SESSION_KEY, JSON.stringify({ uid: PB.realUser.id, as: null }));
  };
  A.testing = () => !!(PB.realUser && PB.user && PB.realUser.id !== PB.user.id);
  A.restore = function () {
    let s = null; try { s = JSON.parse(store.sget(PB.SESSION_KEY)) } catch (e) { }
    if (!s) return false;
    const real = A.byId(s.uid); if (!real || !real.actif) return false;
    PB.realUser = real;
    const as = s.as && A.roles[real.role] && A.roles[real.role].admin ? A.byId(s.as) : null;
    apply(as || real);
    return true;
  };
  /* Réapplique le compte courant après une modification de rôle ou de compte */
  A.refreshCurrent = function () { if (!PB.user) return; const u = A.byId(PB.user.id); if (u) apply(u); if (PB.realUser) PB.realUser = A.byId(PB.realUser.id) || PB.realUser };
})(window.PB);
