import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../state/atlas.jsx';
import { scriptFor } from '../data/narrative.js';

const MODE_ZH = { Guide: '導覽', Explain: '解說', Connect: '連結', Recommend: '推薦' };

function Avatar({ speaking }) {
  return (
    <span className={`drt-avatar${speaking ? ' is-speaking' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" width="40" height="40">
        <defs>
          <radialGradient id="drtCore" cx="40%" cy="38%">
            <stop offset="0%" stopColor="#e9fdff" />
            <stop offset="45%" stopColor="#5fe3e8" />
            <stop offset="100%" stopColor="#2a4fd6" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22.5" className="drt-ring" />
        <g className="drt-orbit">
          <ellipse cx="24" cy="24" rx="17" ry="7" className="drt-orbit__path" />
          <circle cx="41" cy="24" r="1.8" className="drt-orbit__dot" />
        </g>
        <g className="drt-orbit drt-orbit--b">
          <ellipse cx="24" cy="24" rx="7" ry="17" className="drt-orbit__path" />
          <circle cx="24" cy="7" r="1.5" className="drt-orbit__dot drt-orbit__dot--b" />
        </g>
        <circle cx="24" cy="24" r="8" fill="url(#drtCore)" />
        <text x="24" y="24.6" textAnchor="middle" dominantBaseline="middle" className="drt-t">T</text>
      </svg>
    </span>
  );
}

/** Reveals text progressively; clicking the bubble completes it. */
function useTypewriter(text, key) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) { setN(text.length); return undefined; }
    setN(0);
    let i = 0;
    const id = setInterval(() => { i += 2; setN(i); if (i >= text.length) clearInterval(id); }, 24);
    return () => clearInterval(id);
  }, [key]);
  return [Math.min(n, text.length), () => setN(text.length)];
}

export default function DrT() {
  const { state, drtKey, panelNode, actions } = useAtlas();
  const msg = useMemo(() => scriptFor(drtKey), [drtKey]);
  const full = msg.lines.join('\n');
  const [shown, finish] = useTypewriter(full, drtKey);
  const done = shown >= full.length;
  const open = state.drtOpen;
  const [narrow, setNarrow] = useState(() => window.innerWidth < 960);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 960);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const hidden = narrow && Boolean(panelNode);

  // a new stop re-opens Dr. T so the visitor always hears the next hint
  useEffect(() => { actions.setDrtOpen(true); }, [drtKey]);

  let budget = shown;
  const lines = msg.lines.map((text) => {
    const take = Math.max(0, Math.min(text.length, budget));
    budget -= text.length + 1;
    return text.slice(0, take);
  });

  return (
    <motion.aside
      className={`drt${open ? '' : ' is-closed'}`}
      aria-label="Dr. T 科技導航員"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 20 : 0 }}
      style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      transition={{ delay: hidden ? 0 : 0.2, type: 'spring', stiffness: 200, damping: 24 }}
    >
      <div className="drt-head">
        <Avatar speaking={!done} />
        <span className="drt-id"><b>Dr. T</b><small>{MODE_ZH[msg.mode]} · AI Technology Navigator</small></span>
        <button type="button" className="drt-toggle" onClick={() => actions.setDrtOpen(!open)} aria-expanded={open} aria-label={open ? '收起 Dr. T' : '展開 Dr. T'}>
          {open ? '–' : '+'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key={drtKey} className="drt-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
            <div className="drt-speech" onClick={finish} aria-live="polite">
              {lines.map((visible, i) => (visible ? <p key={i}>{visible}</p> : null))}
            </div>
            {done && msg.actions?.length > 0 && (
              <motion.div className="drt-actions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {msg.actions.map((a) => (
                  <button key={a.label} type="button" className={`drt-btn${a.primary ? ' is-primary' : ''}`} onClick={() => actions.go(a.target)}>
                    {a.label}{a.primary && <span aria-hidden="true"> →</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
