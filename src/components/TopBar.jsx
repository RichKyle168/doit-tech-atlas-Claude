import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtlas } from '../state/atlas.jsx';

const LEVEL_WORD = { L0: '', L1: '宇宙', L2: '銀河', L3: '星系', L4: '星星' };

export default function TopBar() {
  const { crumbs, actions } = useAtlas();
  const list = useRef(null);
  useEffect(() => { if (list.current) list.current.scrollLeft = list.current.scrollWidth; }, [crumbs]);
  return (
    <header className="topbar">
      <button type="button" className="wordmark" onClick={() => actions.go('atlas')} aria-label="回到產業技術星圖起點">
        <svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
          <circle cx="14" cy="14" r="12.5" className="wm-ring" />
          <circle cx="14" cy="14" r="7" className="wm-ring wm-ring--inner" />
          <circle cx="14" cy="1.5" r="1.8" className="wm-dot" />
          <circle cx="20.1" cy="9.6" r="1.5" className="wm-dot wm-dot--b" />
          <circle cx="14" cy="14" r="2.2" className="wm-core" />
        </svg>
        <span><b>DOIT</b> TECH ATLAS</span>
      </button>
      <nav className="crumbs" aria-label="摘星路徑">
        <ol ref={list}>
          <AnimatePresence initial={false}>
            {crumbs.slice(1).map((n, i, arr) => {
              const last = i === arr.length - 1;
              return (
                <motion.li key={n.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <span className="crumbs__sep" aria-hidden="true">›</span>
                  <button type="button" className={last ? 'is-current' : ''} aria-current={last ? 'location' : undefined} onClick={() => actions.go(n.id)}>
                    <small>{LEVEL_WORD[n.level]}</small>{n.shortZh || n.nameZh}
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      </nav>
    </header>
  );
}
