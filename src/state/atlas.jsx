import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { galaxiesOf, getNode, pathTo } from '../data/graph.js';

/**
 * One journey, four stops: 宇宙 → 銀河 → 星系 → 星星.
 * universe / galaxy / system = where the camera is; panel = what the reading panel shows.
 */
const AtlasContext = createContext(null);

const initial = { universe: null, galaxy: null, system: null, star: null, panel: null, dir: 1, origin: null, warp: 0, drtOpen: true };

const depth = (s) => (s.universe ? 1 : 0) + (s.galaxy ? 1 : 0) + (s.system ? 1 : 0);

function move(s, next, origin) {
  const changedView = next.universe !== s.universe || next.galaxy !== s.galaxy || next.system !== s.system;
  return {
    ...s,
    ...next,
    dir: depth(next) >= depth(s) ? 1 : -1,
    origin: changedView ? origin || null : s.origin,
    warp: changedView ? s.warp + 1 : s.warp,
  };
}

function reducer(s, a) {
  switch (a.type) {
    case 'go': {
      const n = getNode(a.id);
      if (!n || n.id === 'atlas') return move(s, { universe: null, galaxy: null, system: null, star: null, panel: null }, a.origin);
      if (n.level === 'L1') {
        if (galaxiesOf(n.id).length) return move(s, { universe: n.id, galaxy: null, system: null, star: null, panel: null }, a.origin);
        return { ...s, panel: n.id, star: null }; // universe still under construction → read about it
      }
      if (n.level === 'L2') return move(s, { universe: n.universe, galaxy: n.id, system: null, star: null, panel: null }, a.origin);
      if (n.level === 'L3') {
        if (n.status === 'active') {
          if (s.system === n.id) return { ...s, panel: n.id, star: null }; // tapping the sun: read about the system
          return move(s, { universe: n.universe, galaxy: n.galaxy, system: n.id, star: null, panel: null }, a.origin);
        }
        // preview system: show it inside its galaxy (or at the universe level if its universe is not open)
        if (n.galaxy) return move(s, { universe: n.universe, galaxy: n.galaxy, system: null, star: null, panel: n.id }, a.origin);
        return move(s, { universe: null, galaxy: null, system: null, star: null, panel: n.id }, a.origin);
      }
      if (n.level === 'L4') {
        const sys = getNode(n.system);
        return move(s, { universe: sys.universe, galaxy: sys.galaxy, system: sys.id, star: n.id, panel: n.id }, a.origin);
      }
      return s;
    }
    case 'back': {
      if (s.panel) return { ...s, panel: null, star: null };
      if (s.system) return move(s, { system: null, star: null });
      if (s.galaxy) return move(s, { galaxy: null });
      if (s.universe) return move(s, { universe: null });
      return s;
    }
    case 'closePanel':
      return { ...s, panel: null, star: null };
    case 'drtOpen':
      return { ...s, drtOpen: a.open };
    default:
      return s;
  }
}

export function AtlasProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) dispatch({ type: 'back' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const actions = useMemo(() => ({
    go: (id, origin) => dispatch({ type: 'go', id, origin }),
    back: () => dispatch({ type: 'back' }),
    closePanel: () => dispatch({ type: 'closePanel' }),
    setDrtOpen: (open) => dispatch({ type: 'drtOpen', open }),
  }), []);

  const derived = useMemo(() => {
    const s = state;
    const view = s.system ? 'stars' : s.galaxy ? 'systems' : s.universe ? 'galaxies' : 'universes';
    const viewKey = s.system || s.galaxy || s.universe || 'atlas';
    const panelNode = s.panel ? getNode(s.panel) : null;

    // breadcrumb: the deepest thing the visitor has picked
    let focus = s.star || s.system || s.galaxy || s.universe || 'atlas';
    if (panelNode && !s.star && (panelNode.level === 'L1' || panelNode.level === 'L3')) focus = panelNode.id;
    const crumbs = pathTo(focus);

    let drtKey;
    if (panelNode?.level === 'L4') drtKey = `star:${panelNode.id}`;
    else if (panelNode?.level === 'L3' && panelNode.status !== 'active') drtKey = `sys:${panelNode.id}`;
    else if (panelNode?.level === 'L1') drtKey = `u:${panelNode.id}`;
    else drtKey = view === 'universes' ? 'intro' : `in:${viewKey}`;

    return { view, viewKey, panelNode, crumbs, drtKey };
  }, [state]);

  const value = useMemo(() => ({ state, actions, ...derived }), [state, actions, derived]);
  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export const useAtlas = () => useContext(AtlasContext);

/** Click position relative to the stage, used as the zoom origin. */
export function originFrom(e) {
  const el = e?.currentTarget;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
