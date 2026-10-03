import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getNode } from '../data/graph.js';
import { useAtlas } from '../state/atlas.jsx';

const LEVEL = { galaxies: '宇宙', systems: '銀河', stars: '星系' };

/** Words that sit on top of the sky: the opening title, then one quiet header per level. */
export default function Overlay() {
  const { view, viewKey, actions } = useAtlas();
  const n = getNode(viewKey);
  const parent = n && n.primaryParent && n.primaryParent !== 'atlas' ? getNode(n.primaryParent) : null;
  // the hint goes away once the visitor has turned the sky by hand
  const [spun, setSpun] = useState(false);
  useEffect(() => {
    const on = () => setSpun(true);
    window.addEventListener('atlas:spun', on, { once: true });
    return () => window.removeEventListener('atlas:spun', on);
  }, []);
  return (
    <div className="overlay">
      <AnimatePresence mode="wait">
        {view === 'universes' ? (
          <motion.div key="intro" className="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 1 } }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <p className="intro__eyebrow">DOIT · TECH ATLAS</p>
            <h1 className="intro__title">產業技術星圖</h1>
            <p className="intro__tag">探索科技，看見產業未來</p>
            <p className="intro__steps" aria-label="摘星路徑">
              <span className="is-on">宇宙</span><i />
              <span>銀河</span><i />
              <span>星系</span><i />
              <span>星星</span>
            </p>
            <AnimatePresence>
              {!spun && (
                <motion.p className="intro__hint" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 2.4, duration: 1 } }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  拖曳或滑動，轉動星空
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.header key={viewKey} className="level-head" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.9, duration: 0.6 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <p className="level-head__eyebrow"><span>{LEVEL[view]}</span>{parent ? parent.nameZh : n.aspect}</p>
            <h2 className="level-head__title">{n.level === 'L3' ? `${n.nameZh}星系` : n.nameZh}</h2>
          </motion.header>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {view !== 'universes' && (
          <motion.button key="back" type="button" className="back" onClick={actions.back}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <span aria-hidden="true">‹</span> 上一層
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
