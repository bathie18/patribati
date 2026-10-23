/* PatriBâti — carte (Leaflet).
   Vue monde : biens regroupés par pays. En zoomant : regroupement de proximité, puis chaque bien,
   puis les assiettes foncières (≥ z14) et les emprises bâties (≥ z15).
   Fonds : automatique (pays du monde en vue d'ensemble, OpenStreetMap au-delà du zoom 6), OpenStreetMap seul,
   ou fond simplifié « Pays du monde » (Natural Earth, fonctionne hors ligne). */
(function (PB) {
  'use strict';
  const { $, esc, css, mean, group } = PB.U;
  const S = PB.S;
  const M = PB.M = { m: null };
  let tiles, countries, gPts, gAss, gBat, assIndex = {};

  /* Recolle les longitudes des anneaux qui traversent l'antiméridien (Russie, Fidji…) */
  function unwrap(geom) {
    const fix = ring => { let off = 0; return ring.map((p, i) => { if (i) { const d = p[0] - ring[i - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360 } return [p[0] + off, p[1]] }) };
    if (geom.type === 'Polygon') geom.coordinates = geom.coordinates.map(fix);
    if (geom.type === 'MultiPolygon') geom.coordinates = geom.coordinates.map(pg => pg.map(fix));
    return geom;
  }

  M.init = function () {
    if (M.m) return;
    const m = M.m = L.map('map', { zoomControl: false, minZoom: 2, maxZoom: 19, zoomSnap: .5, worldCopyJump: false, maxBounds: [[-85, -230], [85, 230]], maxBoundsViscosity: .8, attributionControl: true });
    shown = null;
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.control.scale({ imperial: false, position: 'bottomright' }).addTo(m);
    m.createPane('assPane').style.zIndex = 410;
    m.createPane('batPane').style.zIndex = 420;

    const has = new Set(PB.DATA.map(b => b.paysId));
    const feats = topojson.feature(WORLD, WORLD.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
    feats.forEach(f => unwrap(f.geometry));
    countries = L.geoJSON({ type: 'FeatureCollection', features: feats }, {
      interactive: false, style: { weight: 1, fillOpacity: 1 },
      onEachFeature: (f, l) => { l.options.className = 'country' + (f.id === '686' ? ' sn' : has.has(f.id) ? ' has' : '') }
    });
    tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>' });

    gAss = L.geoJSON(PB.SRC.assiettes, {
      pane: 'assPane', style: { className: 'assiette', weight: 1.6 },
      onEachFeature: (f, l) => {
        assIndex[f.properties.code] = l;
        l.bindTooltip(() => `<b>${esc(f.properties.code)}</b> · ${esc(f.properties.num_tf || 'Sans titre')}<br>${PB.U.nf.format(f.properties.superficie_m2)} m² · ${esc(f.properties.nature || '')}`, { className: 'lbl', sticky: true });
        l.on('click', e => { if (S.adding) return; L.DomEvent.stopPropagation(e); const b = PB.DATA.find(b => b.assietteCode === f.properties.code); if (b) PB.select(b.id, false) });
      }
    });
    gBat = L.layerGroup();
    gPts = L.layerGroup().addTo(m);

    m.on('zoomend', M.draw);
    m.on('mousemove', e => { $('#coords').textContent = `lat ${e.latlng.lat.toFixed(4)}, lon ${e.latlng.lng.toFixed(4)} · z${m.getZoom()}` });
    m.on('click', e => { if (S.adding) PB.addAt(e.latlng.lng, e.latlng.lat) });
    M.setBase(S.base, true);
    M.go('monde', true);
    M.draw();
  };

  /* Fond « auto » : pays du monde en vue d'ensemble, OpenStreetMap dès qu'on zoome sur une ville */
  let shown = null;
  function applyBase() {
    const want = S.base === 'auto' ? (M.m.getZoom() >= 6 ? 'osm' : 'simple') : S.base;
    if (want === shown) return; shown = want;
    if (want === 'osm') { M.m.removeLayer(countries); tiles.addTo(M.m) }
    else { M.m.removeLayer(tiles); countries.addTo(M.m); countries.bringToBack() }
  }
  M.setBase = function (base, silent) { S.base = base; applyBase(); if (!silent) M.draw() };

  const pinIcon = (b, sel) => { const s = (sel ? 20 : 15) - (M.m && M.m.getZoom() >= 17 ? 4 : 0); return L.divIcon({ className: '', iconSize: [s, s], html: `<div class="pin${sel ? ' sel' : ''}" style="background:${css(PB.colorVar(b, S.theme))}"></div>` }) };
  const cluIcon = n => { const s = Math.round(24 + Math.sqrt(n) * 5); return L.divIcon({ className: '', iconSize: [s, s], html: `<div class="clu">${n}</div>` }) };

  /* Regroupement glouton à l'écran (rayon en pixels) */
  function clusters(list, radius) {
    const m = M.m, out = [];
    list.map(b => ({ b, p: m.latLngToLayerPoint([b.lat, b.lon]) })).sort((a, c) => a.p.y - c.p.y).forEach(o => {
      /* Le bien sélectionné n'est jamais regroupé : il reste visible */
      const c = o.b.id === S.sel ? null : out.find(c => !c.sel && c.p.distanceTo(o.p) < radius);
      if (o.b.id === S.sel) { out.push({ p: o.p, items: [o.b], sel: true }); return }
      if (c) { c.items.push(o.b); } else out.push({ p: o.p, items: [o.b] });
    });
    return out;
  }

  M.draw = function () {
    const m = M.m; if (!m) return;
    const z = m.getZoom(), vis = PB.visible(), th = PB.THEMES[S.theme];
    applyBase();
    gPts.clearLayers();
    if (z < PB.Z.pays) {
      group(vis, b => b.paysId).forEach(v => {
        const n = v.length, lat = mean(v, b => b.lat), lon = mean(v, b => b.lon);
        L.marker([lat, lon], { icon: cluIcon(n), keyboard: true, zIndexOffset: n * 10, title: `${v[0].pays} · ${n} bien${n > 1 ? 's' : ''}` })
          .bindTooltip(`${esc(v[0].pays)} · ${n} bien${n > 1 ? 's' : ''}`, { className: 'lbl', direction: 'top', offset: [0, -10] })
          .on('click', e => { if (S.adding) return; v[0].paysId === '686' ? M.go('sn') : m.fitBounds(L.latLngBounds(v.map(b => [b.lat, b.lon])).pad(.6), { maxZoom: 13 }) })
          .addTo(gPts);
      });
    } else {
      const radius = z >= 16 ? 0 : 34;
      clusters(vis, radius).forEach(c => {
        if (c.items.length === 1 || radius === 0) {
          c.items.forEach(b => {
            const mk = L.marker([b.lat, b.lon], { icon: pinIcon(b, b.id === S.sel), keyboard: true, title: b.nom, zIndexOffset: b.id === S.sel ? 1000 : 0, riseOnHover: true })
              .on('click', e => { if (S.adding) return; PB.select(b.id, false) }).addTo(gPts);
            if (z >= PB.Z.etiquettes) mk.bindTooltip(esc(b.nom), { permanent: true, direction: 'right', offset: [10, 0], className: 'lbl' });
            else mk.bindTooltip(`${esc(b.nom)}<br><small>${esc(th.get(b))}</small>`, { className: 'lbl', direction: 'top', offset: [0, -8] });
          });
        } else {
          const ll = L.latLngBounds(c.items.map(b => [b.lat, b.lon]));
          L.marker(m.layerPointToLatLng(c.p), { icon: cluIcon(c.items.length), title: `${c.items.length} biens` })
            .bindTooltip(`${c.items.length} biens · ${esc([...new Set(c.items.map(b => b.ville))].slice(0, 3).join(', '))}`, { className: 'lbl', direction: 'top', offset: [0, -10] })
            .on('click', () => { if (S.adding) return; ll.getNorthEast().equals(ll.getSouthWest()) ? m.setView(ll.getCenter(), Math.min(z + 3, 18)) : m.fitBounds(ll.pad(.5), { maxZoom: Math.max(z + 2, 15) }) })
            .addTo(gPts);
        }
      });
    }
    // Assiettes foncières
    const showA = S.layers.assiettes && z >= PB.Z.assiettes;
    showA ? gAss.addTo(m) : m.removeLayer(gAss);
    // Emprises bâties, colorées selon la thématique
    gBat.clearLayers();
    if (S.layers.emprises && z >= PB.Z.emprises) {
      const ids = new Set(vis.map(b => b.id));
      PB.SRC.batiments.features.filter(f => ids.has(f.properties.bien)).forEach(f => {
        const b = PB.byId(f.properties.bien);
        L.geoJSON(f, { pane: 'batPane', style: { className: 'emprise', fillColor: css(PB.colorVar(b, S.theme)), color: css('--fg'), weight: b.id === S.sel ? 2.5 : 1, fillOpacity: .55 } })
          .bindTooltip(`${esc(f.properties.nom)} · ${esc(b.nom)}<br><small>${f.properties.niveaux ?? '?'} niveau(x) · ${PB.U.nf.format(f.properties.emprise)} m² d'emprise</small>`, { className: 'lbl', sticky: true })
          .on('click', e => { if (S.adding) return; L.DomEvent.stopPropagation(e); PB.select(b.id, false) })
          .addTo(gBat);
      });
      gBat.addTo(m);
    } else m.removeLayer(gBat);
  };

  M.go = function (k, instant) {
    const v = PB.VIEWS[k], o = { animate: !instant, duration: .7 };
    if (v.b) M.m.flyToBounds(v.b, { ...o, padding: [10, 10] }); else M.m.flyTo(v.c, v.z, o);
    if (instant) { if (v.b) M.m.fitBounds(v.b, { padding: [10, 10], animate: false }); else M.m.setView(v.c, v.z, { animate: false }) }
  };
  M.flyTo = function (b, z) { M.m.flyTo([b.lat, b.lon], Math.max(z || 16, M.m.getZoom()), { duration: .8 }) };
  M.flyToLL = (lat, lon, z) => M.m.flyTo([lat, lon], z, { duration: .8 });
  M.fitList = list => { if (!list.length) return; if (list.length === 1) return M.flyTo(list[0], 17); M.m.flyToBounds(L.latLngBounds(list.map(b => [b.lat, b.lon])).pad(.3), { maxZoom: 14, duration: .8 }) };
  M.invalidate = () => { if (M.m) M.m.invalidateSize() };
  M.zoomBy = d => M.m.setZoom(M.m.getZoom() + d);
  M.countryAt = function (lon, lat) {
    /* Pays sous un point (test point dans polygone, fond Natural Earth) */
    const inRing = (pt, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c } return c };
    const inPoly = (pt, pg) => inRing(pt, pg[0]) && !pg.slice(1).some(h => inRing(pt, h));
    let hit = null;
    countries.eachLayer(l => { const g = l.feature.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; if (!hit && polys.some(pg => inPoly([lon, lat], pg) || inPoly([lon + 360, lat], pg) || inPoly([lon - 360, lat], pg))) hit = l.feature });
    return hit;
  };
})(window.PB);
