/**
 * Dr. T — AI Technology Navigator.
 * One or two short lines per stop, then at most two suggestions.
 * Modes: Guide · Explain · Connect · Recommend
 * Action: { label, target, primary } → target is any node id; the app decides how to get there.
 *
 * Hand-written lines exist for the stops of the opened route. Every other stop gets lines
 * generated from the data, so new universes, galaxies, systems and stars added to the database
 * are narrated without touching this file.
 */
import { galaxiesOf, getNode, linksOf, starsOf, systemsOf, UNIVERSES } from './graph.js';

const firstActive = (list) => list.find((n) => n.status === 'active') || null;

function written() {
  return {
    intro: {
      mode: 'Guide',
      lines: [
        '歡迎來到產業技術星圖。我是 Dr. T，陪你一層一層摘星。',
        '從五個面向看 2025–2035 年的世界：每個面向都是一個宇宙。',
        '機器人住在「數位轉型 × 跨界創新」宇宙。要從那裡出發嗎？',
      ],
      actions: [{ label: '前往這個宇宙', target: 'u-econ', primary: true }, { label: '看看 AI 在哪裡', target: 'u-tech' }],
    },
    'in:u-econ': {
      mode: 'Explain',
      lines: [
        '這個宇宙關心的是產業轉型、勞動力不足、高齡再就業……',
        '裡面有兩座銀河：硬體與軟體。機器人在硬體銀河。',
      ],
      actions: [{ label: '進入硬體銀河', target: 'g-econ-hw', primary: true }],
    },
    'in:u-tech': {
      mode: 'Explain',
      lines: [
        '「超連接世界 × 虛實融合」宇宙裡，住著半導體、通訊與 AI。',
        '這裡的星系還在建構中，但 AI 整合應用和人機虛實互動，已經和機器人星系連上線。',
      ],
      actions: [{ label: '進入軟體銀河', target: 'g-tech-sw', primary: true }],
    },
    'in:g-econ-hw': {
      mode: 'Guide',
      lines: [
        `硬體銀河裡有 ${systemsOf('g-econ-hw').length} 個星系：從工具機、材料、積層製造，到機器人。`,
        '今天開放的是最亮的那一個：機器人星系。',
      ],
      actions: [{ label: '進入機器人星系', target: 'robot', primary: true }],
    },
    'in:g-econ-sw': {
      mode: 'Explain',
      lines: [
        '軟體銀河目前只有一個星系：智慧製造，聚焦智慧設備、AI 生產與智慧加工模組。',
        '它還在建構中，但和機器人星系共享好幾顆星。',
      ],
      actions: [{ label: '看智慧製造', target: 'smart-mfg', primary: true }],
    },
    'in:g-tech-hw': {
      mode: 'Explain',
      lines: [
        '這座銀河是半導體、通訊與運算的硬體基礎。',
        '星系還在建構中；點一下，可以先看看它是什麼。',
      ],
      actions: [],
    },
    'in:g-tech-sw': {
      mode: 'Connect',
      lines: [
        'AI 整合應用、人機虛實互動、資安維護與風險管理，組成這座軟體銀河。',
        '前兩個已經和機器人星系的星星連上線，點進去看看。',
      ],
      actions: [{ label: '看 AI 整合應用', target: 'ict-ai', primary: true }],
    },
    'in:robot': {
      mode: 'Explain',
      lines: [
        '智慧機器人有理解指令的「大腦」，也有負責精密動作的「小腦」。',
        `這個星系有 ${starsOf('robot').length} 顆星，分成 6 個星座。點一顆星，就能讀它的故事。`,
      ],
      actions: [{ label: '從機器視覺開始', target: 'machine-vision', primary: true }, { label: '看數位雙生', target: 'digital-twin' }],
    },
  };
}

const CONNECT = {
  'machine-vision': '同樣的「邊緣 AI 即時影像辨識」，也出現在 AI 整合應用星系和智慧製造的自動光學檢測。亮起的線，就是它們的關係。',
  'digital-twin': '數位雙生是連線最多的一顆星：它同時連到工具機、智慧製造、人機虛實互動，也連到人機協作與邊緣運算。',
  'edge-ai': '邊緣運算把機器人、數位雙生和半導體串在一起：數位雙生仰賴它的低延遲，而它的心臟是運算晶片。',
  hrc: '人機協作牽起兩個宇宙：機器人星系，和「虛實融合」裡的人機虛實互動。',
  'robot-brain': '大腦往下連著小腦（運動控制），往外連到 AI 整合應用星系的生成式 AI 與代理式 AI。',
  'autonomous-decision': '自主決策同時出現在機器人、無人載具與智慧製造。名字不同，問題相同：在變化中自己做出好判斷。',
};

/** Lines for a level nobody has written lines for yet. */
function generatedArrival(n) {
  if (n.level === 'L1') {
    const gs = galaxiesOf(n.id);
    const open = firstActive(gs) || gs[0];
    return {
      mode: 'Explain',
      lines: [`「${n.nameZh}」宇宙裡有 ${gs.length} 座銀河。`, '點一座銀河，飛進去看看。'],
      actions: open ? [{ label: `進入${open.nameZh}`, target: open.id, primary: true }] : [],
    };
  }
  if (n.level === 'L2') {
    const ss = systemsOf(n.id);
    const open = firstActive(ss);
    return {
      mode: 'Guide',
      lines: [`這座銀河有 ${ss.length} 個星系。`, open ? `已經開放的是${open.nameZh}星系。` : '星系還在建構中，點一下可以先看看它是什麼。'],
      actions: open ? [{ label: `進入${open.nameZh}星系`, target: open.id, primary: true }] : [],
    };
  }
  if (n.level === 'L3') {
    const stars = starsOf(n.id);
    return {
      mode: 'Explain',
      lines: [n.summary?.t || `歡迎來到${n.nameZh}星系。`, `這個星系有 ${stars.length} 顆星。點一顆星，就能讀它的故事。`],
      actions: stars[0] ? [{ label: `從${stars[0].nameZh}開始`, target: stars[0].id, primary: true }] : [],
    };
  }
  return null;
}

/** Builds Dr. T's message for the current stop. */
export function scriptFor(key) {
  const scripts = written();
  if (scripts[key]) return { key, ...scripts[key] };
  const [kind, id] = key.split(':');
  const n = getNode(id);
  if (!n) return { key, ...scripts.intro };

  if (kind === 'in') {
    const generated = generatedArrival(n);
    if (generated) return { key, ...generated };
  }

  if (kind === 'star') {
    const links = linksOf(id);
    const peers = links.map((l) => getNode(l.other)).filter((o) => o?.level === 'L4');
    const systems = [...new Set(links.map((l) => getNode(l.other)).filter((o) => o?.level === 'L3').map((o) => o.nameZh))];
    const line = CONNECT[id]
      || `${n.nameZh}和 ${peers.length} 顆星相連${systems.length ? `，也延伸到「${systems.join('」「')}」星系` : ''}。亮起的線就是它們的關係。`;
    return {
      key, mode: 'Connect', lines: [line],
      actions: peers[0] ? [{ label: `看${peers[0].nameZh}`, target: peers[0].id }] : [],
    };
  }

  if (kind === 'sys') {
    const shared = starsOf('robot').filter((s) => linksOf(s.id).some((l) => l.other === id));
    // the panel already shows the summary; Dr. T points to where to go next
    const lines = [`${n.nameZh}星系還在建構中，星星會陸續點亮。`];
    if (shared.length) lines.push(`它已經和 ${shared.length} 顆星連上線，面板裡點一下就能跳過去。`);
    return { key, mode: 'Recommend', lines, actions: shared[0] ? [{ label: `看${shared[0].nameZh}`, target: shared[0].id, primary: true }] : [] };
  }

  if (kind === 'u') {
    const open = firstActive(UNIVERSES);
    const list = n.systems || [];
    return {
      key, mode: 'Recommend',
      lines: [
        list.length ? `「${n.nameZh}」宇宙裡有 ${list.length} 個星系，例如${list.slice(0, 3).join('、')}。` : `「${n.nameZh}」宇宙正在成形。`,
        open && open.id !== n.id ? `這個宇宙還在建構中。先去「${open.nameZh}」看看？` : '這個宇宙還在建構中。',
      ],
      actions: open && open.id !== n.id ? [{ label: `前往${open.shortZh || open.nameZh}`, target: open.id, primary: true }] : [],
    };
  }
  return { key, ...scripts.intro };
}
