import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { loadGraph } from './data/client.js';
import { setGraph } from './data/graph.js';
import './styles/global.css';

/** Loads the atlas from the server before the sky opens. */
function Boot() {
  const [status, setStatus] = useState('loading');
  const load = useCallback(() => {
    setStatus('loading');
    loadGraph()
      .then((graph) => { setGraph(graph); setStatus('ready'); })
      .catch((err) => { console.error(err); setStatus('error'); });
  }, []);
  useEffect(load, [load]);

  if (status === 'ready') return <App />;
  return (
    <div className="boot" role="status" aria-live="polite">
      <span className={`boot__star${status === 'error' ? ' is-dim' : ''}`} aria-hidden="true" />
      {status === 'loading' ? (
        <p className="boot__text">正在展開星圖…</p>
      ) : (
        <>
          <p className="boot__text">星圖暫時連不上。</p>
          <button type="button" className="boot__retry" onClick={load}>重新連線</button>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
);
