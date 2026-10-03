import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DOCUMENT } from '../data/graph.js';
import { loadSources } from '../data/client.js';

/**
 * Sources stay in the data (every text keeps its type and refs) but out of the way:
 * the reading flow shows only the technology, and one quiet link at the end of a panel
 * opens the passages it was written from.
 */
const SourceCtx = createContext(null);

export function SourceProvider({ children }) {
  const [open, setOpen] = useState(null); // { refs, title }
  const openSource = useCallback((payload) => setOpen(payload), []);
  const value = useMemo(() => ({ openSource }), [openSource]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <SourceCtx.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {open && <SourcePanel key="panel" {...open} onClose={() => setOpen(null)} />}
        </AnimatePresence>,
        document.body,
      )}
    </SourceCtx.Provider>
  );
}

export const useSource = () => useContext(SourceCtx);

const pageLabel = (s) => (typeof s.page === 'number' ? `p.${s.page}` : s.page);

function SourcePanel({ refs, title, onClose }) {
  const closeRef = useRef(null);
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    let live = true;
    loadSources(refs).then((list) => { if (live) setItems(list); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [refs]);

  return (
    <motion.div className="src-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside
        className="src-panel glass"
        role="dialog"
        aria-modal="true"
        aria-label="資料來源"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <header className="src-panel__head">
          <div>
            <p className="eyebrow">資料來源</p>
            {title && <h3 className="src-panel__title">{title}</h3>}
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="關閉資料來源">✕</button>
        </header>
        {failed && <p className="pending">資料來源暫時讀不到，稍後再試一次。</p>}
        {!failed && !items && <p className="src-loading">讀取中…</p>}
        {items && items.length === 0 && <p className="pending">這段說明是星圖的導覽語句。</p>}
        {items && (
          <ol className="src-list">
            {items.map((s) => (
              <li key={s.id} className="src-item">
                <p className="src-item__label">{s.label}</p>
                <blockquote className="src-item__quote">
                  {s.excerpt.split('｜').map((part, i) => (
                    <span key={i} className={s.kind === 'quote' ? '' : 'src-cell'}>{part}</span>
                  ))}
                </blockquote>
                <p className="src-item__section">{s.section}<span>{pageLabel(s)}</span></p>
              </li>
            ))}
          </ol>
        )}
        {DOCUMENT && (
          <footer className="src-panel__foot">
            《{DOCUMENT.title}》｜{DOCUMENT.publisher}｜{DOCUMENT.published}
          </footer>
        )}
      </motion.aside>
    </motion.div>
  );
}

/** A text field. null →「資料持續建構中」. */
export function Text({ value, as: Tag = 'p', className = '' }) {
  if (!value) return <Tag className={`pending ${className}`}>資料持續建構中</Tag>;
  return <Tag className={className}>{value.t}</Tag>;
}

/** Opens the source dialog for a list of source ids. */
export function SourceListButton({ refs, title, children, className = '' }) {
  const { openSource } = useSource();
  if (!refs.length) return null;
  return (
    <button type="button" className={className} onClick={() => openSource({ refs, title })}>
      {children}
    </button>
  );
}
