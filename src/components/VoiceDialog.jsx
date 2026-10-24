import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { RATES, SAMPLE, SERVER_VOICE, getSettings, setSettings, voices } from '../speech/engine.js';
import { useSpeech } from './Speech.jsx';

/** Choose the reading voice and speed; every choice plays a short sample right away. */
export default function VoiceDialog({ onClose }) {
  const { play, stop, playing } = useSpeech();
  const [, refresh] = useState(0);
  const closeRef = useRef(null);
  const list = voices();
  const current = getSettings();
  const sample = () => play('sample', current.voice === SERVER_VOICE
    ? [{ nodeId: 'digital-twin', part: 'summary', text: SAMPLE }]
    : [{ part: 'sample', text: SAMPLE }]);
  const choose = (patch) => {
    setSettings(patch);
    refresh((n) => n + 1);
    const now = getSettings();
    play('sample', now.voice === SERVER_VOICE ? [{ nodeId: 'digital-twin', part: 'summary', text: SAMPLE }] : [{ part: 'sample', text: SAMPLE }]);
  };
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); stop(); };
  }, [onClose, stop]);

  return createPortal(
    <motion.div className="src-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside
        className="src-panel voice"
        role="dialog"
        aria-modal="true"
        aria-label="朗讀的聲音"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <header className="src-panel__head">
          <h3 className="src-panel__title">朗讀的聲音</h3>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="關閉">✕</button>
        </header>
        {!list.some((v) => v.gender === 'male') && (
          <p className="voice__hint">這台裝置沒有內建的國語男聲，所以先用女聲朗讀。</p>
        )}
        <fieldset className="voice__group">
          <legend>語速</legend>
          <div className="voice__rates">
            {RATES.map((r) => (
              <button key={r.id} type="button" className={`voice__rate${current.rate === r.id ? ' is-on' : ''}`}
                aria-pressed={current.rate === r.id} onClick={() => choose({ rate: r.id })}>{r.label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="voice__group">
          <legend>聲音（點一下就會試聽）</legend>
          <ul className="voice__list">
            {list.map((v, i) => (
              <li key={v.id}>
                <button type="button" className={`voice__item${current.voice === v.id ? ' is-on' : ''}`}
                  aria-pressed={current.voice === v.id} onClick={() => choose({ voice: v.id })}>
                  <span className="voice__name">{v.label}{i === 0 && <em>建議</em>}</span>
                  <span className="voice__note">{v.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="voice__foot">
          <button type="button" className={`speak speak--wide${playing?.key === 'sample' ? ' is-active' : ''}`}
            onClick={() => (playing?.key === 'sample' ? stop() : sample())}>
            {playing?.key === 'sample' ? '停止試聽' : '再聽一次'}
          </button>
          <p>聲音來自這台手機或電腦。在 iPhone 的「設定 › 輔助使用 › 朗讀內容 › 聲音」下載「增強版」國語聲音，聽起來會更自然。</p>
        </div>
      </motion.aside>
    </motion.div>,
    document.body,
  );
}
