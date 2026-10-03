/**
 * Read-aloud engine.
 *
 *   server  — the site has a natural neural voice (/api/tts): play its mp3 for each part
 *   browser — otherwise the device's own Mandarin voice (Web Speech API), chosen for warmth:
 *             Taiwanese Mandarin first, natural/neural voices first, a deeper voice first,
 *             read a little slower and lower than default, one sentence at a time
 *   null    — nothing that can speak Mandarin: read-aloud buttons are not shown
 *
 * One thing speaks at a time; starting a new reading stops the previous one.
 */
import { sentences } from '../../shared/speech.js';
import { loadVoiceStatus } from '../data/client.js';
import { VERSION } from '../data/graph.js';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) audio.preload = 'auto';

const NATURAL = /natural|neural|online|premium|enhanced|增強|優化|高音質/i;
const DEEP = /yunjhe|zhiwei|yunxi|yunyang|yunjian|li-?mu|\bhan\b|male|男/i;

let mode = null;
let voice = null;
let serverVoice = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(mode));

export function onModeChange(fn) {
  listeners.add(fn);
  fn(mode);
  return () => listeners.delete(fn);
}

function bestBrowserVoice() {
  if (!synth) return null;
  const scored = synth.getVoices()
    .map((v) => {
      const lang = v.lang.replace('_', '-').toLowerCase();
      if (!(lang.startsWith('zh') || lang.startsWith('cmn')) || /hk|yue|mo/.test(lang)) return null; // Cantonese voices read the wrong language
      let score = lang.includes('tw') || lang.includes('hant') ? 50 : 20;
      if (NATURAL.test(v.name)) score += 25;
      if (DEEP.test(v.name)) score += 15;
      if (!v.localService) score += 3;
      return { v, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.v || null;
}

function pickMode() {
  voice = bestBrowserVoice();
  mode = serverVoice ? 'server' : voice ? 'browser' : null;
  notify();
}

let ready = null;
export function initSpeech() {
  if (ready) return ready;
  ready = (async () => {
    serverVoice = Boolean((await loadVoiceStatus()).available) && Boolean(audio);
    if (synth) {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', pickMode);
      else synth.onvoiceschanged = pickMode;
    }
    pickMode();
  })();
  window.addEventListener('pagehide', stopSpeech);
  return ready;
}

let session = 0;

export function stopSpeech() {
  session += 1;
  if (audio && audio.src) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

/**
 * Reads segments in order: [{ nodeId, part, text }].
 * cb: { onSegment(index), onPlaying(), onEnd(), onError() }
 * Must be called from a click / tap so phones allow sound.
 */
export function speak(segments, cb = {}) {
  stopSpeech();
  const mine = session;
  const live = () => mine === session;
  let i = 0;

  const browser = (seg, done) => {
    if (!synth) { done(); return; }
    const parts = sentences(seg.text);
    let k = 0;
    const deep = DEEP.test(voice?.name || '');
    const say = () => {
      if (!live()) return;
      if (k >= parts.length) { done(); return; }
      const u = new SpeechSynthesisUtterance(parts[k]);
      k += 1;
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'zh-TW';
      u.rate = 0.88;             // unhurried
      u.pitch = deep ? 1 : 0.9;  // a touch lower when the voice itself is light
      u.onstart = () => live() && cb.onPlaying?.();
      u.onend = say;
      u.onerror = (e) => {
        if (!live() || e.error === 'interrupted' || e.error === 'canceled') return;
        say();
      };
      synth.speak(u);
    };
    say();
  };

  const server = (seg, done) => {
    audio.onended = () => live() && done();
    audio.onerror = () => live() && browser(seg, done); // voice service unavailable: fall back to the device voice
    audio.onplaying = () => live() && cb.onPlaying?.();
    audio.src = `/api/tts/${encodeURIComponent(seg.nodeId)}/${encodeURIComponent(seg.part)}?v=${VERSION}`;
    const p = audio.play();
    if (p?.catch) {
      p.catch((err) => {
        if (!live()) return;
        if (err?.name === 'NotAllowedError') { cb.onError?.(err); return; }
        if (err?.name !== 'AbortError') browser(seg, done);
      });
    }
  };

  const next = () => {
    if (!live()) return;
    if (i >= segments.length) { cb.onEnd?.(); return; }
    const seg = segments[i];
    cb.onSegment?.(i);
    i += 1;
    if (mode === 'server') server(seg, next);
    else browser(seg, next);
  };
  next();
}
