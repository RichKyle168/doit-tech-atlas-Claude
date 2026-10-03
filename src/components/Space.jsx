import { useEffect, useRef, useState } from 'react';
import { UNIVERSES, constellationsOf, galaxiesOf, getNode, linksOf, starsOf, systemsOf } from '../data/graph.js';
import { useAtlas } from '../state/atlas.jsx';
import { SpaceScene } from '../space/SpaceScene.js';

const FRONT = Math.PI / 2; // angle of the point on a ring closest to the camera
const galaxyHue = (g) => (g.kind === 'hw' ? 32 : 228);

/** Translates the atlas state into the scene description the 3D orrery understands. */
function specFor(state) {
  if (state.system) {
    const s = getNode(state.system);
    const stars = starsOf(s.id);
    // one ring per constellation; stars without one share an outer ring
    const groups = constellationsOf(s.id).map((c) => ({ label: c.nameZh, stars: stars.filter((st) => st.capability === c.id) }));
    const loose = stars.filter((st) => !groups.some((g) => g.stars.includes(st)));
    if (loose.length || !groups.length) groups.push({ label: groups.length ? '其他' : '', stars: loose });
    return {
      key: s.id, kind: 'system', elev: 50,
      center: { id: s.id, label: s.nameZh, sub: `${s.nameEn || ''} · 星系中心`, pickable: true },
      rings: groups.filter((g) => g.stars.length).map((g, i) => ({
        r: 10 + i * 5,
        label: g.label,
        bodies: g.stars.map((st) => ({ id: st.id, kind: 'star', label: st.nameZh.replace(/（.*）/, ''), status: st.status || 'active' })),
      })),
    };
  }
  if (state.galaxy) {
    const g = getNode(state.galaxy);
    const list = systemsOf(g.id);
    return {
      key: g.id, kind: 'galaxy', elev: 30,
      center: { id: g.id, label: g.nameZh, sub: '銀河中心', hue: galaxyHue(g) },
      rings: list.map((s, i) => ({
        r: 12 + i * 6.5,
        bodies: [{
          // spread the systems evenly round the galaxy, with the open one at the front
          phase: FRONT - 0.55 + ((i - Math.max(0, list.findIndex((x) => x.status === 'active'))) / list.length) * Math.PI * 2,
          id: s.id, kind: 'system', label: s.nameZh, status: s.status,
          sub: s.status === 'active' ? `${starsOf(s.id).length} 顆星 · 點我進入` : '建構中',
          hue: s.status === 'active' ? 42 : 215,
        }],
      })),
    };
  }
  if (state.universe) {
    const u = getNode(state.universe);
    const list = galaxiesOf(u.id);
    return {
      key: u.id, kind: 'universe', elev: 24,
      center: { id: u.id, label: u.nameZh, sub: `${u.aspect || ''} · 宇宙中心`, hue: u.hue ?? 210 },
      rings: [{
        r: 30,
        bodies: list.map((g, i) => ({
          id: g.id, kind: 'spiral', label: g.nameZh, hue: galaxyHue(g), arms: g.kind === 'hw' ? 2 : 3, status: g.status,
          sub: `${systemsOf(g.id).length} 個星系${systemsOf(g.id).some((x) => x.status === 'active') ? ` · ${systemsOf(g.id).find((x) => x.status === 'active').nameZh}在這裡` : ''}`,
          phase: FRONT - 0.85 + (i / list.length) * Math.PI * 2,
        })),
      }],
    };
  }
  const ordered = [...UNIVERSES].sort((a, b) => (a.angle ?? 0) - (b.angle ?? 0));
  const start = Math.max(0, ordered.findIndex((u) => u.status === 'active'));
  return {
    key: 'atlas', kind: 'atlas', elev: 22,
    center: { id: 'atlas', label: '2025 — 2035', sub: '全球前瞻趨勢' },
    rings: [{
      r: 34,
      bodies: ordered.map((u, i) => ({
        id: u.id, kind: 'nebula', label: u.nameZh, hue: u.hue ?? 210, status: u.status,
        sub: `${u.aspect || ''}${u.systems?.length ? ` · ${u.systems.length} 個星系` : ''}${u.status === 'preview' ? ' · 建構中' : ''}`,
        phase: FRONT - 0.5 + ((i - start) / ordered.length) * Math.PI * 2,
      })),
    }],
  };
}

export default function Space() {
  const { state, viewKey, panelNode, actions } = useAtlas();
  const host = useRef(null);
  const labels = useRef(null);
  const flash = useRef(null);
  const scene = useRef(null);
  const prevKey = useRef(null);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const [wide, setWide] = useState(() => window.innerWidth >= 960);

  useEffect(() => {
    const s = new SpaceScene({
      container: host.current,
      labelLayer: labels.current,
      flash: flash.current,
      onPick: (id) => actionsRef.current.go(id),
    });
    scene.current = s;
    const onResize = () => setWide(window.innerWidth >= 960);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); s.destroy(); };
  }, []);

  // level changes → camera flight
  useEffect(() => {
    const spec = specFor(state);
    const prev = prevKey.current;
    prevKey.current = spec.key;
    let mode = 'jump'; let via = null;
    if (prev) {
      const next = getNode(spec.key); const before = getNode(prev);
      if (next?.primaryParent === prev) { mode = 'in'; via = spec.key; }
      else if (before?.primaryParent === spec.key) { mode = 'out'; via = prev; }
    }
    scene.current.goTo(spec, { mode, via });
  }, [viewKey]);

  // selected star → highlight its relations; preview bodies → just highlight
  useEffect(() => {
    if (state.star) {
      const related = linksOf(state.star)
        .filter((l) => getNode(l.other)?.level === 'L4')
        .map((l) => ({ id: l.other, type: l.sourceType }));
      scene.current.setSelection({ id: state.star, related });
    } else {
      scene.current.setSelection({ id: state.panel, related: [] });
    }
  }, [state.star, state.panel]);

  useEffect(() => { scene.current.setPanelOffset(panelNode && wide ? 200 : 0); }, [panelNode, wide]);

  return (
    <div className="space">
      <div ref={host} className="space__gl" />
      <div ref={labels} className="space__labels" />
      <div ref={flash} className="space__flash" aria-hidden="true" />
    </div>
  );
}
