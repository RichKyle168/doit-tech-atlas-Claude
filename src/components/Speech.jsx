import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { partText, speakable, STAR_PARTS } from '../../shared/speech.js';
import { initSpeech, onModeChange, speak, stopSpeech } from '../speech/engine.js';

/**
 * Read-aloud for the star page: one button per field, plus「朗讀全文」.
 * playing = { key, part, loading } while something is being read.
 */
const SpeechCtx = createContext({ mode: null, playing: null, play() {}, stop() {} });

export function SpeechProvider({ children }) {
  const [mode, setMode] = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    const off = onModeChange(setMode);
    initSpeech();
    return () => { off(); stopSpeech(); };
  }, []);

  const stop = useCallback(() => { stopSpeech(); setPlaying(null); }, []);

  const play = useCallback((key, segments) => {
    if (!segments.length) return;
    const mine = (p) => p && p.key === key;
    setPlaying({ key, part: segments[0].part, loading: true });
    speak(segments, {
      onSegment: (i) => setPlaying((p) => (mine(p) ? { ...p, part: segments[i].part, loading: p.loading } : p)),
      onPlaying: () => setPlaying((p) => (mine(p) ? { ...p, loading: false } : p)),
      onEnd: () => setPlaying((p) => (mine(p) ? null : p)),
      onError: () => setPlaying((p) => (mine(p) ? null : p)),
    });
  }, []);

  const value = useMemo(() => ({ mode, playing, play, stop }), [mode, playing, play, stop]);
  return <SpeechCtx.Provider value={value}>{children}</SpeechCtx.Provider>;
}

export const useSpeech = () => useContext(SpeechCtx);

const segment = (node, part) => {
  const raw = partText(node, part);
  return raw ? { nodeId: node.id, part, text: speakable(raw) } : null;
};

/** One field of a node. */
export const fieldSegments = (node, part) => [segment(node, part)].filter(Boolean);

/** The whole star page: its name, the summary, then every filled field with its heading. */
export function pageSegments(node) {
  const list = [segment(node, 'name'), segment(node, 'summary')];
  for (const [part, label] of STAR_PARTS) {
    if (!label || !partText(node, part)) continue;
    list.push(segment(node, `label-${part}`), segment(node, part));
  }
  return list.filter(Boolean);
}

/** Which field of this node is being read right now (for highlighting), or null. */
export function readingPart(playing, nodeId) {
  if (!playing || !playing.key.endsWith(`:${nodeId}`)) return null;
  return (playing.part || '').replace(/^label-/, '');
}

const Speaker = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const Bars = () => (
  <span className="speak__bars" aria-hidden="true"><i /><i /><i /><i /></span>
);
const Spinner = () => <span className="speak__spin" aria-hidden="true" />;

export function SpeakButton({ id, segments, label = '朗讀', title = '', wide = false }) {
  const { mode, playing, play, stop } = useSpeech();
  if (!mode || !segments.length) return null;
  const active = playing?.key === id;
  return (
    <button
      type="button"
      className={`speak${active ? ' is-active' : ''}${wide ? ' speak--wide' : ''}`}
      onClick={() => (active ? stop() : play(id, segments))}
      aria-pressed={active}
      aria-label={active ? `停止朗讀${title}` : `${label}${title && label !== title ? `：${title}` : ''}`}
    >
      {active ? (playing.loading ? <Spinner /> : <Bars />) : <Speaker />}
      <span>{active ? '停止' : label}</span>
    </button>
  );
}
