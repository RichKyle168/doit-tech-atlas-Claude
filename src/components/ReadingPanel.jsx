import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NODES, constellationsOf, getNode, linksOf, refsOf, starsOf } from '../data/graph.js';
import { originFrom, useAtlas } from '../state/atlas.jsx';
import { SourceListButton, Text } from './Source.jsx';

const FIELDS = [
  ['description', '這是什麼'],
  ['howItWorks', '它如何運作'],
  ['whyItMatters', '為什麼重要'],
  ['applications', '應用在哪裡'],
  ['industryValue', '產業價值'],
  ['taiwan', '臺灣布局'],
];

function Section({ label, children }) {
  return (
    <section className="rp-sec">
      <h4>{label}</h4>
      {children}
    </section>
  );
}

function StarChips({ ids, label }) {
  const { actions } = useAtlas();
  if (!ids.length) return null;
  return (
    <Section label={label}>
      <ul className="chips">
        {ids.map((id) => {
          const n = getNode(id);
          return (
            <li key={id}>
              <button type="button" className="chip" onClick={(e) => actions.go(id, originFrom(e))}>
                <i className="chip__star" aria-hidden="true" />{n.nameZh}
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SystemChips({ ids }) {
  const { actions } = useAtlas();
  if (!ids.length) return null;
  return (
    <Section label="也連到其他星系">
      <ul className="chips">
        {ids.map((id) => {
          const n = getNode(id);
          const u = getNode(n.universe);
          return (
            <li key={id}>
              <button type="button" className="chip chip--system" onClick={(e) => actions.go(id, originFrom(e))}>
                <i className="chip__sun" aria-hidden="true" />{n.nameZh}<small>{u.nameZh}</small>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Pending({ node, fields }) {
  const missing = fields.filter(([key]) => !(Array.isArray(node[key]) ? node[key].length : node[key])).map(([, label]) => label);
  if (!missing.length) return null;
  return <p className="rp-pending"><span className="pending">資料持續建構中</span>{missing.join('、')}</p>;
}

function StarBody({ n }) {
  const links = linksOf(n.id);
  const peers = links.filter((l) => getNode(l.other).level === 'L4').map((l) => l.other);
  const systems = links.filter((l) => getNode(l.other).level === 'L3').map((l) => l.other);
  return (
    <>
      <Text value={n.summary} className="rp-lead" />
      {FIELDS.map(([key, label]) => {
        const v = n[key];
        if (!v || (Array.isArray(v) && !v.length)) return null;
        return (
          <Section key={key} label={label}>
            {Array.isArray(v) ? (
              <ul className="rp-list">{v.map((a) => <li key={a.t}>{a.t}</li>)}</ul>
            ) : <Text value={v} />}
          </Section>
        );
      })}
      <StarChips ids={peers} label="相關的星星" />
      <SystemChips ids={systems} />
      <Pending node={n} fields={FIELDS} />
    </>
  );
}

function SystemBody({ n }) {
  const shared = NODES.filter((s) => s.level === 'L4' && s.system !== n.id && linksOf(s.id).some((l) => l.other === n.id)).map((s) => s.id);
  const own = starsOf(n.id);
  const groups = constellationsOf(n.id).map((c) => ({ id: c.id, name: c.nameZh, ids: own.filter((s) => s.capability === c.id).map((s) => s.id) }));
  const loose = own.filter((s) => !groups.some((g) => g.ids.includes(s.id))).map((s) => s.id);
  if (loose.length) groups.push({ id: 'other', name: '其他', ids: loose });
  return (
    <>
      {n.summary ? <Text value={n.summary} className="rp-lead" /> : null}
      {FIELDS.filter(([k]) => k !== 'applications' && k !== 'howItWorks').map(([key, label]) => (n[key] ? (
        <Section key={key} label={label}><Text value={n[key]} /></Section>
      ) : null))}
      {own.length > 0 && (
        <Section label={`這個星系的 ${own.length} 顆星`}>
          {groups.filter((g) => g.ids.length).map((g) => (
            <div key={g.id} className="rp-const">
              <span>{g.name}</span>
              <StarLinks ids={g.ids} />
            </div>
          ))}
        </Section>
      )}
      {n.status !== 'active' && (
        <>
          <StarChips ids={shared} label={`已經連上的星星 · ${shared.length}`} />
          <p className="rp-pending"><span className="pending">資料持續建構中</span>這個星系的星星將陸續匯入。</p>
        </>
      )}
    </>
  );
}

function StarLinks({ ids }) {
  const { actions } = useAtlas();
  return (
    <span className="rp-const__stars">
      {ids.map((id) => (
        <button key={id} type="button" className="link" onClick={() => actions.go(id)}>{getNode(id).nameZh}</button>
      ))}
    </span>
  );
}

function UniverseBody({ n }) {
  const { actions } = useAtlas();
  const known = Object.fromEntries(NODES.filter((x) => x.level === 'L3' && x.universe === n.id).map((x) => [x.nameZh, x.id]));
  return (
    <>
      <Text value={n.headline} className="rp-lead" />
      {n.summary && <Text value={n.summary} />}
      {n.issues?.length > 0 && (
        <Section label="這個宇宙關心的課題">
          <p className="rp-tags">{n.issues.map((t) => <span key={t} className="tag">{t}</span>)}</p>
        </Section>
      )}
      {n.systems?.length > 0 && (
        <Section label={`宇宙裡的 ${n.systems.length} 個星系`}>
          <p className="rp-tags">
            {n.systems.map((t) => (known[t]
              ? <button key={t} type="button" className="tag tag--link" onClick={() => actions.go(known[t])}>{t}</button>
              : <span key={t} className="tag">{t}</span>))}
          </p>
        </Section>
      )}
      <p className="rp-pending"><span className="pending">資料持續建構中</span>銀河與星系將陸續開放。</p>
    </>
  );
}

const KICKER = {
  L1: (n) => `宇宙${n.aspect ? ` · ${n.aspect}` : ''}`,
  L2: () => '銀河',
  L3: (n) => `星系 · ${n.status === 'active' ? '可探索' : '建構中'}`,
  L4: (n) => `星星${getNode(n.capability) ? ` · ${getNode(n.capability).nameZh}星座` : ''}`,
};

export default function ReadingPanel() {
  const { panelNode: n, actions } = useAtlas();
  const scroller = useRef(null);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [n?.id]);

  return (
    <AnimatePresence>
      {n && (
        <motion.aside
          key="panel"
          className="panel"
          role="dialog"
          aria-label={`${n.nameZh} 說明`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          <div className="panel__scroll" ref={scroller}>
            <header className="panel__head">
              <p className="panel__kicker">{KICKER[n.level](n)}</p>
              <button type="button" className="icon-btn" onClick={actions.closePanel} aria-label="關閉說明">✕</button>
            </header>
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <h3 className="panel__name">{n.nameZh}</h3>
              <p className="panel__en">{n.nameEn}</p>
              {n.level === 'L4' && <StarBody n={n} />}
              {n.level === 'L3' && <SystemBody n={n} />}
              {n.level === 'L1' && <UniverseBody n={n} />}
              {n.level === 'L2' && n.summary && <Text value={n.summary} className="rp-lead" />}
              <footer className="panel__foot">
                <SourceListButton refs={refsOf(n.id)} title={n.nameZh} className="link link--quiet">資料來源</SourceListButton>
              </footer>
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
