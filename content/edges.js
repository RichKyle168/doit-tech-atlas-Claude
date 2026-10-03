/**
 * Knowledge-graph relations (beyond the primaryParent hierarchy).
 *
 * relation   enables   A provides a capability B depends on
 *            pairs     A and B are used together in the same system / project
 *            extends   B is the same idea seen from another chapter or domain
 * sourceType SOURCE  = the white paper itself connects the two (refs point to the passage)
 *            DERIVED = Tech Atlas connects them; refs show the passages the link is inferred from
 * label      shown on hover / in the detail view, written from A's side
 */

const E = (from, to, relation, sourceType, label, ...refs) => ({ from, to, relation, sourceType, label, refs });

export const EDGES = [
  // ── 感知 ↔ 決策
  E('machine-vision', 'edge-ai', 'enables', 'SOURCE', '邊緣 AI 晶片讓影像辨識可以即時完成', 'agri-dla', 'agri-tomato'),
  E('machine-vision', 'adv-sensing', 'pairs', 'SOURCE', '視覺感測元件屬於智慧機器人的精密組件', 'mech-components'),
  E('machine-vision', 'robot-brain', 'pairs', 'SOURCE', '機器視覺與大腦同為人型機器人的必要組件', 'robot-humanoid-parts'),
  E('adv-sensing', 'attitude-fusion', 'enables', 'SOURCE', '姿態融合感知仰賴核心姿態感測元件', 'robot-attitude-power'),
  E('robot-brain', 'edge-ai', 'enables', 'SOURCE', '大腦需要結合運算晶片及 AI 技術', 'mech-brain'),
  E('robot-brain', 'autonomous-decision', 'pairs', 'SOURCE', '語意理解、人機交互與自主決策是人型機器人被期待的能力', 'robot-humanoid-abilities'),
  // ── 決策 ↔ 控制
  E('robot-brain', 'motion-control', 'pairs', 'SOURCE', '大腦形成動作需求，小腦實現精密動作控制', 'mech-brain'),
  E('motion-control', 'power-joint', 'enables', 'DERIVED', '精密控制需要快速響應的馬達與減速機', 'robot-balance', 'tbl-act'),
  E('self-balance', 'power-joint', 'enables', 'SOURCE', '雙足平衡對減速機和馬達的響應速度要求更高', 'robot-balance'),
  E('self-balance', 'attitude-fusion', 'enables', 'DERIVED', '維持重心需要即時掌握身體姿態', 'robot-attitude-power', 'rm-cog'),
  E('motion-control', 'self-balance', 'pairs', 'DERIVED', '重心調整與自平衡屬於運動控制問題', 'rm-balance', 'mech-brain'),
  // ── 互動
  E('hrc', 'digital-human', 'enables', 'SOURCE', '數位人物感知改善人機協作策略不足的問題', 'digital-human-robot'),
  E('hrc', 'digital-twin', 'pairs', 'SOURCE', '數位雙生發展重點之一是人機協同', 'dt-focus'),
  E('hrc', 'xr-guidance', 'pairs', 'DERIVED', '同一項科專同時發展人機協作與 AR/VR/MR 導引', 'rm-hrc', 'rm-xr'),
  E('digital-human', 'digital-twin', 'extends', 'SOURCE', '數位人物是數位雙生中對「人」的映射', 'dt-roadmap-core'),
  E('xr-guidance', 'digital-twin', 'pairs', 'SOURCE', 'AR/VR 眼鏡提升使用者與虛實系統的互動', 'dt-arvr'),
  E('robot-brain', 'hrc', 'pairs', 'DERIVED', '聽懂人員命令，才能與人分工', 'mech-brain', 'robot-humanoid-abilities'),
  // ── 通訊
  E('multi-robot', 'navigation', 'pairs', 'DERIVED', '多機協作需要各自掌握位置與路徑', 'agri-amr', 'rm-multi'),
  E('multi-robot', 'edge-ai', 'enables', 'SOURCE', '晶片科專以雙機器人協作延遲 ≤100 ms 為目標', 'agri-roadmap-dual'),
  E('navigation', 'autonomous-decision', 'pairs', 'DERIVED', '自主導航、自主避障都需要即時判斷', 'trans-autonomy', 'tbl-dec'),
  E('navigation', 'machine-vision', 'pairs', 'DERIVED', 'AMR 巡檢同時用到導航與影像辨識', 'agri-amr', 'agri-apps'),
  // ── 系統整合
  E('digital-twin', 'edge-ai', 'enables', 'SOURCE', '數位雙生仰賴邊緣運算的低延遲優勢', 'dt-edge'),
  E('digital-twin', 'omo-platform', 'extends', 'DERIVED', '兩者都是在虛擬環境中先模擬、再落地', 'virtual-sim', 'hmi-omo'),
  E('omo-platform', 'unified-controller', 'pairs', 'SOURCE', 'OMO 平台結合機器人單一化控制器', 'omo-platform'),
  E('omo-platform', 'robot-brain', 'pairs', 'SOURCE', '以 AI 演算法自動生成組裝程序', 'fixture-free'),
  E('unified-controller', 'motion-control', 'enables', 'DERIVED', 'AI 生成最佳工作路徑並即時補償變異，交由運動控制執行', 'holon-path', 'mech-brain'),
  E('digital-twin', 'autonomous-decision', 'enables', 'DERIVED', '數位雙生是開發 AI 代理的絕佳手段，而代理式 AI 具備自主決策能力', 'tool-dt-agent', 'trend-agentic'),

  // ── 跨章節／跨領域（gateway links）
  E('robot-brain', 'ict-ai', 'extends', 'DERIVED', '生成式 AI、代理式 AI、物理 AI 是 AI 整合應用章的主題', 'ai-new-tech', 'mech-brain'),
  E('edge-ai', 'ict-ai', 'extends', 'SOURCE', '邊緣 AI 即時影像辨識與設備監控', 'ai-edge-vision'),
  E('machine-vision', 'ict-ai', 'extends', 'SOURCE', '邊緣 AI 實現即時影像辨識', 'ai-edge-vision'),
  E('autonomous-decision', 'ict-ai', 'extends', 'DERIVED', '代理式 AI（具自主決策能力）列於 AI 整合應用的新興技術', 'ai-new-tech', 'trend-agentic'),
  E('digital-twin', 'ict-hmi', 'extends', 'SOURCE', '數位雙生是人機虛實互動章的核心技術', 'hmi-dt-key'),
  E('hrc', 'ict-hmi', 'extends', 'SOURCE', '工業 5.0 以人為核心的人機協作', 'industry-5'),
  E('digital-human', 'ict-hmi', 'extends', 'SOURCE', '數位人物感知出自人機虛實互動章', 'digital-human'),
  E('xr-guidance', 'ict-hmi', 'extends', 'SOURCE', 'AR／VR 虛實互動應用於設備組裝與校正', 'dt-arvr'),
  E('digital-twin', 'machine-tool', 'extends', 'SOURCE', '虛擬工具機數位雙生平台', 'tool-dt'),
  E('digital-twin', 'smart-mfg', 'extends', 'SOURCE', '智慧化機台設備整合感測、AI、數位雙生', 'mech-smart-machine'),
  E('machine-vision', 'smart-mfg', 'extends', 'SOURCE', 'AI 輔助自動光學檢測', 'smfg-aoi'),
  E('adv-sensing', 'smart-mfg', 'extends', 'SOURCE', '多感測器數據融合識別設備異常', 'smfg-fusion'),
  E('autonomous-decision', 'smart-mfg', 'extends', 'SOURCE', '自適應人工智慧生產決策技術', 'smfg-tech'),
  E('omo-platform', 'smart-mfg', 'extends', 'SOURCE', '高擬真虛實融合是建立智慧工廠的關鍵之一', 'virtual-sim'),
  E('omo-platform', 'machine-tool', 'extends', 'SOURCE', 'OMO 平台導入工具機等產業', 'omo-industries'),
  E('navigation', 'trans-uv', 'extends', 'SOURCE', '無人載具的自主導航與避障', 'trans-autonomy'),
  E('multi-robot', 'trans-uv', 'extends', 'SOURCE', '無人載具間的協同控制與任務分配', 'trans-autonomy'),
  E('adv-sensing', 'sys-adv-process', 'extends', 'DERIVED', '先進感測的核心科技包含半導體製程與元件封裝測試', 'tbl-sense', 'toc-semi'),
  E('edge-ai', 'sys-adv-process', 'extends', 'DERIVED', '運算晶片設計製造連結半導體產業', 'tbl-dec', 'ai-new-tech'),
];

export const RELATION_LABEL = {
  enables: '支撐',
  pairs: '協同',
  extends: '延伸',
};
