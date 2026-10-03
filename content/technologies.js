/**
 * DOIT Tech Atlas — 星圖資料（摘星路徑：宇宙 → 銀河 → 星系 → 星星）
 *
 *   L0  ATLAS     產業技術星圖
 *   L1  宇宙      趨勢大方向：白皮書圖1-1-1 的五個面向與十大趨勢
 *   L2  銀河      硬體 / 軟體（Tech Atlas 的分類）
 *   L3  星系      技術載具：圖1-1-1 列出的技術課題（多數對應白皮書各章）
 *   L4  星星      關鍵技術
 *   星座         星星的分組（感知、決策…），只用來排版與說明，不是一層選單
 *
 * Every text field is a "sourced text":  { t, type, refs }
 *   type  SOURCE   = 白皮書明確記載（近原文改寫，refs 指向可驗證的原文摘錄）
 *         DERIVED  = Tech Atlas 依白皮書內容重新歸納、比喻或建立的關係
 *         EXTERNAL = 白皮書以外的資訊（本版未使用）
 * A field set to null renders as「資料持續建構中」. Nothing is filled in to look complete.
 * placement = why a node sits under its parent.
 */

const S = (t, ...refs) => ({ t, type: 'SOURCE', refs });
const D = (t, ...refs) => ({ t, type: 'DERIVED', refs });

const root = {
  id: 'atlas', level: 'L0', nameZh: '產業技術星圖', shortZh: '產業技術星圖', nameEn: 'DOIT Tech Atlas',
  category: 'root', status: 'active', sourceType: 'DERIVED',
};

// ─────────────────────────────────────────────────────────── L1 · 宇宙
const universes = [
  {
    id: 'u-social', aspect: '社會面', aspectEn: 'SOCIETY', megatrends: ['都市化', '高齡化'], angle: -90, hue: 268,
    headline: S('強化人才循環機制滿足產業與市場需求', 'trend-social'),
    issues: ['城市治理', '城鄉落差', '便利移動', '健康自立', '醫療照護', '無齡設施'], issuesRef: 'fig-issues-social',
    systems: ['智慧車輛', '無人載具', '智慧家庭', '智慧城市', '新藥', '醫療器材', '穿戴科技', '智慧醫療', '紡織科技', '再生醫學', '腦機介面', '智慧輔具'], systemsRef: 'fig-box-social',
  },
  {
    id: 'u-tech', aspect: '科技面', aspectEn: 'TECHNOLOGY', megatrends: ['超連接世界', '虛實融合'], angle: -18, hue: 222,
    headline: S('AI、運算與通訊科技加速先進科技創新', 'trend-tech'),
    summary: S('生成式 AI、運算科技和通訊科技的突破性進展，是驅動全球下世代科技創新的關鍵因子。', 'trend-tech-drivers'),
    issues: ['多重連接', '資訊安全', '科技治理', '基礎設施韌性', '沉浸體驗', '高速網路', '人機互動'], issuesRef: 'fig-issues-tech',
    systems: ['先進製程與封裝', '化合物半導體', '半導體設備', '矽光子／量子科技', '面板科技', '次世代行動通訊', 'AI整合應用', '人機虛實互動', '運算基礎設施', '資安維護與風險管理'], systemsRef: 'fig-box-tech',
  },
  {
    id: 'u-env', aspect: '環境面', aspectEn: 'ENVIRONMENT', megatrends: ['氣候變遷', '能資源稀缺'], angle: 54, hue: 160,
    headline: S('「再全球化」造成全球的淨零腳步趨緩', 'trend-env'),
    issues: ['災防韌性', '糧食短缺', '生物多樣性', '全球傳染病', '淨零轉型', '循環經濟', '能資源效率', '綠色能源'], issuesRef: 'fig-issues-env',
    systems: ['食品及生物資源', '材料開發與循環利用', '公衛防疫', '韌性基建', '氣象監測', '環境監控', '氫能應用', '先進電池', '再生能源', '產業減碳技術', '智慧儲能系統', '先進核能'], systemsRef: 'fig-box-env',
  },
  {
    id: 'u-pol', aspect: '政治面', aspectEn: 'GEOPOLITICS', megatrends: ['地緣政治', '多極體系'], angle: 126, hue: 205,
    headline: S('「川普2.0」與地緣政治格局變動', 'trend-pol'),
    issues: ['地緣政治', '公民參與', '網宇攻擊', '恐怖攻擊', '國家安全', '貿易壁壘', '供應鏈韌性'], issuesRef: 'fig-issues-pol',
    systems: ['太空科技', '衛星通訊與遙測', '公民科技', '軍事科技（實體戰／網路戰）'], systemsRef: 'fig-box-pol',
  },
  {
    id: 'u-econ', aspect: '經濟面', aspectEn: 'ECONOMY', megatrends: ['數位轉型', '跨界創新'], angle: 198, hue: 186,
    headline: S('「再全球化」尋求經濟與安全再平衡', 'trend-econ'),
    issues: ['產業轉型', '勞動力不足', '高齡再就業', '數位經濟', '新生活型態', '新型態工作'], issuesRef: 'fig-issues-econ',
    systems: ['工具機技術', '機器人', '智慧製造', '材料開發及循環利用', '積層製造（3D列印）', '感知與人體增強技術'], systemsRef: 'fig-box-econ',
  },
].map((u) => ({
  level: 'L1', category: 'universe', primaryParent: 'atlas', sourceType: 'SOURCE', sourcePage: [5],
  status: u.id === 'u-econ' ? 'active' : u.id === 'u-tech' ? 'partial' : 'preview',
  nameZh: u.megatrends.join(' × '), shortZh: u.megatrends.join('・'), nameEn: u.aspectEn,
  placement: D(`${u.aspect}的兩個趨勢「${u.megatrends.join('、')}」標示於圖1-1-1 圓環；議題與技術清單依該圖版面位置對應到此面向。`, 'fig-ring', u.issuesRef, u.systemsRef),
  ...u,
}));

// ─────────────────────────────────────────────────────────── L2 · 銀河（硬體 / 軟體）
const HW = D('硬體銀河：看得到、摸得到的機器、元件與材料。', 'fig-box-econ');
const SW = D('軟體銀河：讓機器與系統變聰明的演算法、平台與服務。', 'fig-box-tech');
const galaxies = [
  { id: 'g-econ-hw', universe: 'u-econ', kind: 'hw', systemIds: ['machine-tool', 'sys-materials', 'robot', 'sys-am', 'sys-human-aug'], summary: HW },
  { id: 'g-econ-sw', universe: 'u-econ', kind: 'sw', systemIds: ['smart-mfg'], summary: SW },
  { id: 'g-tech-hw', universe: 'u-tech', kind: 'hw', systemIds: ['sys-adv-process', 'sys-compound', 'sys-semi-equip', 'sys-siph', 'sys-display', 'sys-mobile', 'sys-computing'], summary: HW },
  { id: 'g-tech-sw', universe: 'u-tech', kind: 'sw', systemIds: ['ict-ai', 'ict-hmi', 'sys-security'], summary: SW },
].map((g) => ({
  level: 'L2', category: 'galaxy', primaryParent: g.universe, sourceType: 'DERIVED',
  status: g.systemIds.includes('robot') ? 'active' : 'preview',
  nameZh: g.kind === 'hw' ? '硬體銀河' : '軟體銀河', shortZh: g.kind === 'hw' ? '硬體銀河' : '軟體銀河',
  nameEn: g.kind === 'hw' ? 'HARDWARE GALAXY' : 'SOFTWARE GALAXY',
  placement: D('硬體／軟體的分法是 Tech Atlas 為了導覽所做的分類，白皮書沒有這一層。', g.universe === 'u-econ' ? 'fig-box-econ' : 'fig-box-tech'),
  ...g,
}));

// ─────────────────────────────────────────────────────────── L3 · 星系（技術載具）
const sys = (id, galaxy, nameZh, nameEn, chapter, extra = {}) => ({
  id, galaxy, nameZh, shortZh: nameZh, nameEn, chapter,
  level: 'L3', category: 'system', status: 'preview', sourceType: 'SOURCE',
  primaryParent: galaxy,
  placement: D('星系名稱出自圖1-1-1 的技術清單；歸入硬體或軟體銀河為 Tech Atlas 的分類。', galaxy?.startsWith('g-econ') ? 'fig-box-econ' : 'fig-box-tech'),
  ...extra,
});
// chapter = { label, page, ref } when the topic is also a chapter of the white paper; null when it appears only in 圖1-1-1
const systems = [
  sys('machine-tool', 'g-econ-hw', '工具機技術', 'Machine Tools', { label: '機械領域 第一章', page: 236, ref: 'toc-mech' }, {
    summary: S('工具機為工業之母，對產業的重要性不言而喻。', 'tool-mother'),
    description: S('研發目標鎖定五軸工具機空間精度及切削性能提升、綠智能工具機、工具機智慧零組件、工具機智動系統強健生產優化等關鍵技術。', 'tool-targets'),
    whyItMatters: S('工具機是我國機械業重要出口品項，2024 年出口金額達 22.1 億美元。', 'mech-tool-export'),
  }),
  sys('sys-materials', 'g-econ-hw', '材料開發及循環利用', 'Materials & Circularity', { label: '材化領域 第一章', page: 374, ref: 'toc-mat' }),
  sys('robot', 'g-econ-hw', '機器人', 'Robotics', { label: '機械領域 第二章', page: 252, ref: 'toc-mech' }, {
    status: 'active', sourcePage: [252, 253, 255, 256, 257, 258, 259, 260],
    placement: D('「機器人」列在圖1-1-1 的技術清單中，位置緊鄰經濟面的「數位轉型、跨界創新」；歸入硬體銀河為 Tech Atlas 的分類。', 'fig-box-econ', 'fig-ring'),
    summary: S('機器人依應用分為工業機器人與服務機器人兩大類；四足、人型等自主移動機器人的全球需求逐年攀升。', 'robot-types', 'robot-service'),
    description: S('人們期待的人型機器人要具備語意理解、人機交互、自主決策等能力，並具備大腦、小腦、機械臂、靈巧手、機器視覺等組件，實現對環境的感知交互、運動控制與任務執行。', 'robot-humanoid-abilities', 'robot-humanoid-parts'),
    whyItMatters: S('我國 25~54 歲勞動力預計 2024~2030 年將減少 39.5 萬人，發展自動化方案與各類智慧機器人是主要因應對策。', 'mech-labor'),
    industryValue: S('IFR 2025 年報告：全球工業機器人市場規模預估 165 億美元，全球工廠中運作的工業機器人高達 400 萬台；智慧工廠市場規模預計 2029 年達 5,643.8 億美元。', 'robot-ifr', 'robot-ifr-market', 'smart-factory-market'),
    taiwan: S('國內廠商具有一定的系統整合（SI）能力，但尚未具備高階感測模組及動力系統的自主開發能力。產業技術司以三項法人科專投入：機器人2.0+諧作化智造系統、晶片驅動精準農業、農工智慧轉型協作與示範。', 'robot-gap', 'robot-projects'),
  }),
  sys('sys-am', 'g-econ-hw', '積層製造（3D列印）', 'Additive Manufacturing', null),
  sys('sys-human-aug', 'g-econ-hw', '感知與人體增強技術', 'Human Augmentation', null),
  sys('smart-mfg', 'g-econ-sw', '智慧製造', 'Smart Manufacturing', { label: '機械領域 第三章', page: 261, ref: 'toc-mech-2' }, {
    summary: S('產業技術司主責智慧製造關鍵技術研發，聚焦智慧設備、AI 生產與智慧加工模組等重點領域。', 'smfg-focus'),
    description: S('打造智慧製造工廠需要遵循三個推動進程：自動化 → 數位化 → 智慧化（智造化）。', 'smart-3-steps'),
    whyItMatters: S('智慧製造是整合科技與數位技術於製造業的概念，利用機器人、感知融合、數據分析、自動化和 AI 等先進技術，提高生產效率、品質與彈性生產。', 'smart-mfg-def'),
  }),
  sys('sys-adv-process', 'g-tech-hw', '先進製程與封裝', 'Advanced Process & Packaging', { label: '半導體及光電領域 第一章', page: 134, ref: 'toc-semi' }),
  sys('sys-compound', 'g-tech-hw', '化合物半導體', 'Compound Semiconductors', { label: '半導體及光電領域 第二章', page: 147, ref: 'toc-semi' }),
  sys('sys-semi-equip', 'g-tech-hw', '半導體設備', 'Semiconductor Equipment', { label: '半導體及光電領域 第三章', page: 160, ref: 'toc-semi' }),
  sys('sys-siph', 'g-tech-hw', '矽光子／量子科技', 'Silicon Photonics & Quantum', { label: '半導體及光電領域 第四章', page: 174, ref: 'toc-semi' }),
  sys('sys-display', 'g-tech-hw', '面板科技', 'Display Technology', { label: '半導體及光電領域 第五章', page: 184, ref: 'toc-semi' }),
  sys('sys-mobile', 'g-tech-hw', '次世代行動通訊', 'Next-Gen Mobile Communications', { label: '資通訊領域 第一章', page: 196, ref: 'toc-ict' }),
  sys('sys-computing', 'g-tech-hw', '運算基礎設施', 'Computing Infrastructure', null),
  sys('ict-ai', 'g-tech-sw', 'AI整合應用', 'AI Integration & Applications', { label: '資通訊領域 第二章', page: 213, ref: 'toc-ict' }, {
    summary: S('從邊緣運算、生成式 AI、代理式 AI 到物理 AI，新興 AI 技術帶動各行各業的智慧轉型，也緊密鏈結我國半導體供應鏈。', 'ai-new-tech'),
    description: S('政府提出「AI產業化」與「產業AI化」的雙重發展策略。', 'ai-dual'),
  }),
  sys('ict-hmi', 'g-tech-sw', '人機虛實互動', 'Human-Machine & Virtual-Physical Interaction', { label: '資通訊領域 第三章', page: 223, ref: 'toc-ict' }, {
    summary: S('整合 IT、OT 和 AI 技術的數位雙生，將成為智慧製造發展的關鍵；人機互動正朝虛實融合（OMO）方向發展。', 'hmi-dt-key', 'hmi-omo'),
  }),
  sys('sys-security', 'g-tech-sw', '資安維護與風險管理', 'Cybersecurity & Risk Management', null),
  // a system in a universe that is not open yet: reachable only through cross-links
  {
    ...sys('trans-uv', null, '無人載具', 'Unmanned Vehicles', { label: '運輸領域 第二章', page: 301, ref: 'toc-trans' }),
    primaryParent: 'u-social', universe: 'u-social',
    placement: D('「無人載具」列在圖1-1-1 的技術清單中，位置緊鄰社會面的「都市化」。', 'fig-box-social', 'fig-ring'),
    summary: S('透過 AI 驅動的感測技術實現自主導航、目標識別、自主避障，並發展載具間的協同控制與任務分配。', 'trans-autonomy'),
  },
];
for (const s of systems) if (!s.universe && s.galaxy) s.universe = s.galaxy.startsWith('g-econ') ? 'u-econ' : 'u-tech';

// ─────────────────────────────────────────────────────────── 星座（機器人星系的星星分組）
const capPlacement = D('星座分組為 Tech Atlas 依表1-4-3「機械領域之功能需求」與第二章機器人內容重新整理。', 'tbl-si', 'robot-12-systems');
const constellations = [
  { id: 'cap-perception', nameZh: '感知', nameEn: 'Perception', glyph: 'eye', angle: -150,
    summary: D('機器人如何「感覺」世界：看見環境、量測力量與加速度、觸摸物體，也知道自己的姿態。', 'tbl-sense', 'robot-humanoid-parts') },
  { id: 'cap-decision', nameZh: '決策', nameEn: 'Decision', glyph: 'brain', angle: -90,
    summary: D('機器人的「大腦」：理解指令、規劃任務、在變化中自己做判斷。', 'mech-brain') },
  { id: 'cap-control', nameZh: '控制', nameEn: 'Control', glyph: 'joint', angle: -30,
    summary: D('機器人的「小腦」與肌肉：把決定變成精準、平穩、夠快的動作。', 'mech-brain', 'tbl-act') },
  { id: 'cap-interaction', nameZh: '互動', nameEn: 'Interaction', glyph: 'hands', angle: 30,
    summary: D('機器人如何與人一起工作：聽懂人、看懂人，並安全地分工合作。', 'robot-humanoid-abilities', 'industry-5') },
  { id: 'cap-communication', nameZh: '通訊', nameEn: 'Communication', glyph: 'signal', angle: 90,
    summary: D('機器人之間、機器人與系統之間如何連線：知道自己在哪，也能和隊友協作。', 'mech-components', 'robot-12-systems') },
  { id: 'cap-integration', nameZh: '系統整合', nameEn: 'Integration', glyph: 'layers', angle: 150,
    summary: D('把感知、決策、控制組成一台可靠的機器人，並先在虛擬世界驗證，再走進真實產線。', 'tbl-si', 'virtual-sim') },
].map((c) => ({ level: 'C', category: 'constellation', system: 'robot', status: 'active', sourceType: 'DERIVED', placement: capPlacement, shortZh: c.nameZh, ...c }));

// ─────────────────────────────────────────────────────────── L4 · 星星（機器人星系的關鍵技術）
const core = [
  // ── 感知
  {
    id: 'machine-vision', capability: 'cap-perception', nameZh: '機器視覺', nameEn: 'Machine Vision',
    tags: ['影像辨識', '邊緣 AI', '感知交互'],
    placement: S('白皮書列出人型機器人需具備「機器視覺」等組件，以實現對環境的感知交互。', 'robot-humanoid-parts'),
    summary: D('機器人的眼睛：把影像變成判斷，知道花在哪、果實在哪、瑕疵在哪。', 'robot-humanoid-parts', 'agri-tomato'),
    description: S('人型機器人要具備大腦、小腦、機械臂、靈巧手、機器視覺等組件，才能實現對環境的感知交互、運動控制與任務執行。', 'robot-humanoid-parts'),
    howItWorks: D('以農業機器人為例：機器人取得影像後，由國產邊緣 AI 運算晶片搭配深度學習加速器（DLA）即時推論，辨識番茄花與果實，再執行擾動授粉或精準採摘。推論影像更新率達 30 fps 以上、辨識精度 85% 以上。', 'agri-dla', 'agri-tomato'),
    whyItMatters: S('在邊緣端完成即時高精度辨識，可大幅改善過往推動生產智慧化時面對的通訊與控制問題；工廠端也以 AI 輔助提升自動光學檢測的功效。', 'agri-lightweight', 'smfg-aoi'),
    applications: [
      S('溫室番茄授粉與精準採摘', 'agri-tomato'),
      S('果園巡檢、自動病蟲害辨識', 'agri-apps'),
      S('禽舍異常行為辨識與即時通報', 'agri-apps'),
      S('魚群活動偵測（影像辨識＋水質感測）', 'agri-aqua'),
      S('產品品質檢測：AI 輔助自動光學檢測', 'smfg-aoi'),
    ],
    industryValue: null,
    taiwan: S('工研院執行「晶片驅動精準農業之晶片創新與關鍵模組研發計畫（2024~2028年）」，以國產 AI 邊緣運算模組（MTK Genio 與 DLA）設定 FPS ≥30、精準度 ≥85% 的研發目標。', 'agri-projects', 'agri-roadmap-chip'),
    sourcePage: [252, 259, 260, 265],
  },
  {
    id: 'adv-sensing', capability: 'cap-perception', nameZh: '先進感測元件', nameEn: 'Advanced Sensors',
    tags: ['力量', '加速度', '觸覺', '光學'],
    placement: S('表1-4-3 將力量、加速度、觸覺、光學等先進感測列為「感測」功能需求。', 'tbl-sense'),
    summary: D('機器人的觸覺與體感：力量、加速度、觸覺、光學感測，是所有智慧判斷的資料起點。', 'tbl-sense', 'mech-components'),
    description: S('智慧機器人的精密組件包含多種力量、加速度、視覺、觸覺感測元件；力量、加速度、觸覺、光學等先進感測，也是機械領域的關鍵功能需求。', 'mech-components', 'tbl-sense'),
    howItWorks: S('支撐先進感測的核心科技，包括精密機電元件設計、半導體製程與元件封裝測試。', 'tbl-sense'),
    whyItMatters: S('受惠於感測及資通訊元件效能進步與 AI 發展，智慧化機器人能透過訓練學習快速具備多工能力，也更適合在複雜環境下作業。', 'mech-ai-robot'),
    applications: [
      S('智慧製造：多感測器數據融合，即時識別設備異常狀態', 'smfg-fusion'),
      S('智慧化機台設備：整合感測、物聯網、5G、AI、數位雙生', 'mech-smart-machine'),
    ],
    industryValue: null,
    taiwan: S('國內廠商具一定系統整合能力，但尚未具備高階感測模組的自主開發能力。', 'robot-gap'),
    sourcePage: [103, 105, 106, 253],
  },
  {
    id: 'attitude-fusion', capability: 'cap-perception', nameZh: '自主姿態融合感知', nameEn: 'Attitude Fusion Sensing',
    tags: ['足式機器人', '平衡', '姿態'],
    placement: S('白皮書於足式步行機器人段落提及「自主姿態融合感知技術」。', 'robot-attitude-power'),
    summary: D('讓機器人隨時知道自己站得穩不穩、身體怎麼傾斜，是雙足與四足機器人行走的基礎。', 'robot-attitude-power', 'robot-balance'),
    description: S('足式步行機器人的開發涉及動力、控制、感知、AI、通訊群控及自主決策等 12 項核心系統；其中自主姿態融合感知技術的應用，仍面臨核心感測元件依賴進口姿態感測模組的問題。', 'robot-12-systems', 'robot-attitude-power'),
    howItWorks: null,
    whyItMatters: S('人型機器人靠雙足行走，需要適應不同的地面，每個關節受力更加複雜。', 'robot-balance'),
    applications: [D('四足、人型等自主移動機器人：巡檢、物品運輸、陪伴等場景', 'robot-service')],
    industryValue: null,
    taiwan: S('核心感測元件仍依賴進口姿態感測模組，是國內待突破的技術缺口。', 'robot-attitude-power'),
    sourcePage: [252, 253],
  },
  // ── 決策
  {
    id: 'robot-brain', capability: 'cap-decision', nameZh: '機器人大腦（AI）', nameEn: 'AI Robot Brain',
    tags: ['AI', '生成式 AI', '語意理解'],
    placement: S('白皮書以「大腦」比喻用於理解人員命令與形成動作需求的智慧控制。', 'mech-brain'),
    summary: D('機器人的大腦：聽懂人的指令、理解任務，再決定要做什麼動作。', 'mech-brain', 'robot-humanoid-abilities'),
    description: S('智慧控制包含實現精密動作控制的「小腦」，以及用於理解人員命令與形成動作需求的「大腦」，需要結合運算晶片及 AI 技術（如：生成式 AI）。', 'mech-brain'),
    howItWorks: S('對應的核心科技為 AI 演算法與運算晶片設計製造；生成式 AI 賦予機器人語言理解與環境適應能力，HPC 晶片與通訊科技則確保機器人能即時處理大量資料。', 'tbl-dec', 'trend-humanoid'),
    whyItMatters: S('IFR 2025 年提出的機器人五大趨勢，第一項就是「AI 機器人」：利用多種 AI 技術，機器人可以理解複雜的任務並有效率地執行。', 'robot-ifr', 'robot-ifr-trends'),
    applications: [
      S('免治具組裝：AI 演算法自動生成組裝程序，模仿技師組裝超過 120 種手工具', 'fixture-free'),
      S('AI 自動生成機器人最佳工作路徑、即時補償變異', 'holon-path'),
      S('醫院場所的任務工作規劃（虛擬互動反向加強式學習）', 'rm-rl'),
    ],
    industryValue: null,
    taiwan: S('機器人2.0＋諧作化智造系統開發及應用計畫（2024~2027年），由工研院、精密機械研究發展中心執行。', 'robot2-project'),
    sourcePage: [10, 105, 106, 255, 256, 257],
  },
  {
    id: 'autonomous-decision', capability: 'cap-decision', nameZh: '自主決策', nameEn: 'Autonomous Decision-making',
    tags: ['代理式 AI', '自適應'],
    placement: S('「自主決策」列於表1-4-3「分析與決策」，也是足式機器人的核心系統之一。', 'tbl-dec', 'robot-12-systems'),
    summary: D('不必每一步都等人下指令：根據環境變化，自己判斷下一步怎麼做。', 'trend-agentic', 'tbl-dec'),
    description: S('運動控制、作業最佳化、人員指令理解與自主決策，同屬機械領域的「分析與決策」功能需求；足式步行機器人的核心系統也包含自主決策系統。', 'tbl-dec', 'robot-12-systems'),
    howItWorks: S('代理式 AI 由諸多 AI 代理構成協作網路，具備自主決策能力，甚至可根據環境變化自行調整任務執行方向與方式。', 'trend-agentic'),
    whyItMatters: S('結合大數據及 AI，製造系統在生產條件變化時能提供分析資訊與決策建議；結合生成式 AI 更可降低人員干預需求，提升機台與產線的自主應變能力。', 'mech-adaptive'),
    applications: [
      S('無人載具：自主導航、目標識別、自主避障與協同任務分配', 'trans-autonomy'),
      S('智慧製造：自適應人工智慧生產決策技術', 'smfg-tech'),
    ],
    industryValue: null,
    taiwan: S('智慧製造科專布局「自適應人工智慧生產決策技術」。', 'smfg-tech'),
    sourcePage: [9, 105, 106, 253, 261],
  },
  {
    id: 'edge-ai', capability: 'cap-decision', nameZh: '邊緣運算與 AI 晶片', nameEn: 'Edge Computing & AI Chips',
    tags: ['邊緣運算', 'DLA', '低功耗晶片'],
    placement: D('Tech Atlas 將邊緣運算歸入「決策」星座：表1-4-3 指出分析與決策的核心科技包含運算晶片設計製造。', 'tbl-dec'),
    summary: D('把 AI 運算放在機器人身上或現場設備旁，不必把資料都送上雲端，判斷因此更即時、更省電。', 'agri-dla', 'dt-edge'),
    description: S('5G／6G 實現低延遲、高頻寬的資料傳輸環境，持續推動邊緣運算與物聯網應用；在農業機器人中，低功耗、高效率的晶片與 AI 邊緣運算被視為未來農業升級的關鍵。', 'trend-edge', 'agri-edge-key'),
    howItWorks: S('科技專案開發國產 AI 邊緣運算晶片模組，結合深度學習加速器（DLA）加速模型推論，突破運算延遲與能耗限制，推論影像更新率達 30 fps 以上、辨識精度提升至 85% 以上。', 'agri-dla'),
    whyItMatters: S('數位雙生須仰賴大量運算與即時感測資料，邊緣運算的低延遲優勢與智慧編排軟硬體資源的能力，是推動應用落地的關鍵。', 'dt-edge'),
    applications: [
      S('邊緣 AI 即時影像辨識與設備監控', 'ai-edge-vision'),
      S('授粉、採摘與巡檢的自主移動機器人（AMR）', 'agri-core'),
      S('雙機器人協作系統整合：系統整合延遲 ≤100 ms', 'agri-roadmap-dual'),
    ],
    industryValue: S('全球精準農業市場規模預計從 2023 年 97 億美元成長到 2031 年 219 億美元，年複合成長率 10.7%。', 'agri-market'),
    taiwan: S('以「晶片模組設計＋農工機器人製造＋場域服務」形成新商業模式，推動國產低功耗邊緣運算晶片導入農業場域。', 'agri-biz', 'agri-core'),
    sourcePage: [8, 213, 227, 258, 259, 260],
  },
  // ── 控制
  {
    id: 'motion-control', capability: 'cap-control', nameZh: '小腦：精密運動控制', nameEn: 'Motion Control',
    tags: ['小腦', '運動控制', '位力控制'],
    placement: D('白皮書以「小腦」比喻精密動作控制；表1-4-3 將運動控制列於「分析與決策」，Tech Atlas 將它歸入「控制」星座。', 'mech-brain', 'tbl-dec'),
    summary: D('機器人的小腦：把大腦的決定轉成精準、協調的動作。', 'mech-brain'),
    description: S('智慧控制包含實現精密動作控制的「小腦」；人型機器人需具備大腦、小腦、機械臂、靈巧手等組件，以實現運動控制與任務執行。', 'mech-brain', 'robot-humanoid-parts'),
    howItWorks: D('研發藍圖中的「位力協作控制技術」兼顧位置與力量的控制，控制精度達 0.5 mm。', 'rm-force'),
    whyItMatters: S('HPC 晶片和通訊科技的進展，可提升人型機器人的運動控制與決策速度，讓它能在複雜環境中執行任務。', 'trend-humanoid'),
    applications: [D('機器人2.0＋研發藍圖標示的產業應用：PCB、金屬加工、半導體、機械設備、醫療', 'rm-apps')],
    industryValue: null,
    taiwan: S('機器人2.0＋諧作化智造系統開發及應用計畫（2024~2027年），由工研院、精密機械研究發展中心執行。', 'robot2-project'),
    sourcePage: [10, 105, 252, 257],
  },
  {
    id: 'power-joint', capability: 'cap-control', nameZh: '一體化動力關節', nameEn: 'Integrated Actuator Joint',
    tags: ['馬達', '減速機', '驅動器', '編碼器'],
    placement: S('表1-4-3「致動」涵蓋驅動馬達、精密減速機、滑軌、螺桿等致動元件。', 'tbl-act'),
    summary: D('機器人的肌肉與關節：把馬達、減速機、驅動器、編碼器整合成一體，動作才能又快又穩。', 'robot-attitude-power'),
    description: S('足式機器人的動力系統須發展整合結構、減速機、馬達、驅動器與編碼器成一體化設計。', 'robot-attitude-power'),
    howItWorks: S('致動的核心科技為精密機電元件設計，以及精密金屬加工、組裝。', 'tbl-act'),
    whyItMatters: S('人型機器人靠雙足行走，每個關節受力更加複雜，對減速機和馬達響應的速度要更快。', 'robot-balance'),
    applications: [S('智慧機器人精密組件：驅動馬達、精密減速機、螺桿、夾爪', 'mech-components')],
    industryValue: null,
    taiwan: S('國內廠商尚未具備動力系統的自主開發能力。', 'robot-gap'),
    sourcePage: [105, 106, 252, 253],
  },
  {
    id: 'self-balance', capability: 'cap-control', nameZh: '自平衡與重心調整', nameEn: 'Self-balancing Control',
    tags: ['重心', '雙臂負荷', '不平地面'],
    placement: D('研發藍圖列出重心調整與自平衡控制技術，Tech Atlas 將其歸入「控制」星座。', 'rm-cog', 'rm-balance'),
    summary: D('讓機器人在不平的地面上、或雙手拿著重物時，依然站得穩。', 'rm-cog', 'rm-balance'),
    description: S('機器人2.0＋研發藍圖列出「機器人重心調整技術」，可應用於地面起伏不定（5 度內）的環境；「機器人自平衡控制技術」在雙臂負荷 20 Kg 時仍可維持重心。', 'robot2-project', 'rm-cog', 'rm-balance'),
    howItWorks: null,
    whyItMatters: S('講求靈活彈性的人型機器人靠雙足行走，需要適應不同的地面。', 'robot-balance'),
    applications: [D('雙臂搬運與作業時維持穩定（雙臂負荷 20 Kg）', 'rm-balance')],
    industryValue: null,
    taiwan: S('機器人2.0＋諧作化智造系統開發及應用計畫（2024~2027年）。', 'robot2-project'),
    sourcePage: [252, 257],
  },
  // ── 互動
  {
    id: 'hrc', capability: 'cap-interaction', nameZh: '人機協作', nameEn: 'Human-Robot Collaboration',
    tags: ['工業 5.0', '安全', '協作'],
    placement: S('研發藍圖列出「人機異質協作技術，支援二種人機協作情境」。', 'rm-hrc'),
    summary: D('人與機器人在同一現場分工：人負責判斷與創意，機器人負責重複、精準與吃力的部分。', 'industry-5', 'robot-in-mfg'),
    description: S('相較工業 4.0 著重自動化，工業 5.0 更關注以人為核心的協作模式，強調人類創造力與 AI 的協同整合，核心理念在於實現人機協作、彈性製造與永續發展。', 'industry-5'),
    howItWorks: S('以數位人物感知技術整合作業人員的影像、生理數據與作業環境資訊建構虛擬數位人物，可強化人形機器人導入實際場域前的行為學習與適應能力，改善過去人機協作策略不足的問題。', 'digital-human', 'digital-human-robot'),
    whyItMatters: S('人型機器人的主要挑戰來自成本控制與安全性，尤其是在人機協作場域中的倫理議題；系統整合也須考量人員安全性及資通安全性。', 'trend-humanoid-apps', 'mech-si'),
    applications: [
      S('製造業的瑕疵檢測、人機協作等 AI 應用需求', 'ict-ai-needs'),
      S('人機協同組裝試產線', 'dt-roadmap-hrc'),
      S('醫院場所的任務工作規劃', 'rm-rl'),
    ],
    industryValue: null,
    taiwan: S('「數位雙生關鍵技術研發與驗證（2025~2029年）」規劃人機協同組裝試產線，並推進人機協作應用的商業化驗證。', 'dt-project', 'dt-roadmap-hrc'),
    sourcePage: [10, 102, 227, 228, 229, 257],
  },
  {
    id: 'xr-guidance', capability: 'cap-interaction', nameZh: '沉浸式人機導引', nameEn: 'Immersive XR Guidance',
    tags: ['AR', 'VR', 'MR'],
    placement: S('研發藍圖列出人機作業 AI 偵測與導引技術，可結合 AR/VR/MR 沉浸式介面。', 'rm-xr'),
    summary: D('戴上眼鏡，就能看到疊在真實設備上的操作指引，讓人機作業更快、更不容易出錯。', 'rm-xr', 'dt-arvr'),
    description: S('人機互動正從鍵盤與螢幕構成的 2D 模式，轉向由 AR、VR 與腦機介面等新興人機互動介面構成的 3D 模式。', 'trend-hmi'),
    howItWorks: S('「人機作業 AI 偵測與導引／流程自動化技術」可結合三種沉浸式體驗介面（AR/VR/MR），提升工作效率 30% 以上。', 'rm-xr'),
    whyItMatters: S('整合光機技術的 AR／VR 眼鏡可大幅提升使用者與系統的互動體驗，虛實互動技術亦可應用於設備組裝與校正，提升作業精度與效率。', 'dt-arvr'),
    applications: [S('設備組裝與校正', 'dt-arvr'), S('人機作業偵測、導引與流程自動化', 'rm-xr')],
    industryValue: null,
    taiwan: S('機器人2.0＋諧作化智造系統開發及應用計畫（2024~2027年）。', 'robot2-project'),
    sourcePage: [9, 227, 257],
  },
  {
    id: 'digital-human', capability: 'cap-interaction', nameZh: '數位人物感知', nameEn: 'Digital Human Sensing',
    tags: ['數位分身', '行為學習'],
    placement: D('數位人物感知技術出自資通訊領域「人機虛實互動」章；Tech Atlas 將它放進機器人星系的「互動」星座。', 'digital-human-robot'),
    summary: D('把真實作業員的動作數位化，讓機器人先在虛擬世界學會怎麼和人一起工作。', 'digital-human', 'digital-human-robot'),
    description: S('透過「數位人物感知技術」整合作業人員的影像、生理數據與作業環境資訊，可建構高度擬真的虛擬數位人物，精準呈現作業行為模式，進而提供流程最佳化建議。', 'digital-human'),
    howItWorks: D('研發藍圖規劃多模態感知系統、數位分身動作暨組裝 SOP 生成框架，以及數位分身 AI 行為模型精進，逐步走向人機協同試產線。', 'dt-roadmap-dh', 'dt-roadmap-hrc'),
    whyItMatters: S('可強化人形機器人在導入實際場域前的行為學習與適應能力，改善過去人機協作策略不足的問題。', 'digital-human-robot'),
    applications: [S('電子製造服務業的大量人工組裝作業', 'digital-human-ems')],
    industryValue: null,
    taiwan: S('數位雙生關鍵技術研發與驗證（2025~2029年），由工研院、資策會執行。', 'dt-project'),
    sourcePage: [228, 229],
  },
  // ── 通訊
  {
    id: 'multi-robot', capability: 'cap-communication', nameZh: '通訊群控與多機協作', nameEn: 'Multi-robot Coordination',
    tags: ['群控', '遠距協作'],
    placement: S('足式步行機器人的 12 項核心系統包含「通訊群控系統」。', 'robot-12-systems'),
    summary: D('讓多台機器人像團隊一樣分工：彼此通訊、共享狀態、一起完成任務。', 'rm-multi', 'agri-roadmap-dual'),
    description: S('足式步行機器人的核心系統包含通訊群控系統；機器人2.0＋研發藍圖以「支援半導體場域，多機器人遠距協作提升效率 30%」為目標。', 'robot-12-systems', 'robot2-project', 'rm-multi'),
    howItWorks: D('以農業雙機器人系統為例，研發目標是系統整合延遲 ≤100 ms、作業效率 ≥20%：機器人之間的反應時間夠短，協作才有效率。', 'agri-roadmap-dual'),
    whyItMatters: S('無人載具領域同樣發展載具間的協同控制與任務分配技術，以集群方式高效執行大規模或複雜任務。', 'trans-autonomy'),
    applications: [S('半導體場域多機器人遠距協作', 'rm-multi'), S('農業設施雙機器人協作系統整合', 'agri-roadmap-dual')],
    industryValue: null,
    taiwan: S('農工智慧轉型關鍵協作與示範計畫（2023~2026年），由工研院執行。', 'agri-projects'),
    sourcePage: [107, 253, 257, 260],
  },
  {
    id: 'navigation', capability: 'cap-communication', nameZh: '定位導航與路徑規劃', nameEn: 'Localization & Navigation',
    tags: ['AMR', '定位', '路徑規劃'],
    placement: S('白皮書指出通訊、定位與導航是研發機器狗與人型機器人的重要元件。', 'mech-components'),
    summary: D('機器人的內建地圖：知道自己在哪、要去哪、怎麼走過去。', 'agri-amr'),
    description: S('通訊、定位與導航是研發機器狗與人型機器人的重要元件；AMR 共通載具整合了定位導航、路徑規劃與作業控制。', 'mech-components', 'agri-amr'),
    howItWorks: null,
    whyItMatters: S('在無人載具領域，AI 驅動的感測技術可實現自主導航、目標識別、自主避障。', 'trans-autonomy'),
    applications: [S('溫室授粉、採摘與巡檢的 AMR', 'agri-core'), S('四足、人型等自主移動機器人的巡檢與物品運輸', 'robot-service')],
    industryValue: null,
    taiwan: S('科技專案推動自主移動機器人（AMR）於授粉、採摘與巡檢等應用系統之開發。', 'agri-core'),
    sourcePage: [105, 107, 252, 258, 259],
  },
  // ── 系統整合
  {
    id: 'digital-twin', capability: 'cap-integration', nameZh: '數位雙生', nameEn: 'Digital Twin',
    tags: ['虛實整合', '模擬', '智慧製造'],
    placement: S('表1-4-3 將「數位雙生」列為系統整合需求的核心科技。', 'tbl-si'),
    summary: D('替真實的設備、產線甚至人員建立一個同步變化的虛擬分身：先在虛擬世界試，再到真實世界做。', 'dt-definition', 'trend-dt'),
    description: S('數位雙生是一種虛實整合技術，能同步模擬真實世界中的設備、系統或人員行為，常用於製造、交通、醫療等領域，以提升效率與決策精準度。', 'dt-definition'),
    howItWorks: S('數位雙生透過即時資料與 AI 模擬，創建實體世界的虛擬副本；工具機科專建立虛擬工具機數位雙生平台，以能耗輔助計算模組與能耗預測模型呈現製程模擬與能耗最佳化。', 'trend-dt', 'tool-dt'),
    whyItMatters: S('整合 IT、OT 與 AI 的數位雙生，將成為智慧製造發展的關鍵；它也可用於驗證評價生成式 AI 模型產生的資料，是開發 AI 代理的絕佳技術手段。', 'hmi-dt-key', 'tool-dt-agent'),
    applications: [
      S('半導體、電子、機械、金屬加工產業的 3D 模擬建構與製程提升', 'dt-focus'),
      S('工具機製程模擬與能耗最佳化', 'tool-dt'),
      S('人形機器人導入前的行為學習', 'digital-human-robot'),
      S('製造、城市與醫療：縮短產品開發週期', 'trend-dt'),
    ],
    industryValue: S('2022 年全球數位雙生市場規模突破 100 億美元，預計 2022 年至 2030 年複合成長率 38.7%。', 'dt-market'),
    taiwan: S('「數位雙生關鍵技術研發與驗證（2025~2029年）」由工研院、資策會執行，兩大主軸為全場域數位系統生成與模擬、虛實映射網路與數位人物感知。', 'dt-project', 'dt-roadmap-core'),
    sourcePage: [9, 106, 223, 226, 227, 228, 229, 242, 243],
  },
  {
    id: 'omo-platform', capability: 'cap-integration', nameZh: '高擬真虛實融合平台', nameEn: 'OMO Simulation Platform',
    tags: ['OMO', '虛擬仿真', '免治具'],
    placement: S('白皮書指出高擬真虛實融合（OMO）平台技術可賦能機器人。', 'omo-platform'),
    summary: D('先在虛擬產線把機器人排練好，再快速導入真實工廠，減少試錯。', 'virtual-sim', 'omo-platform'),
    description: S('高擬真虛實融合（虛擬仿真）是建立智慧工廠的關鍵之一，使製造業可以在虛擬環境中模擬各種狀況並獲得最佳製造方案，減少試誤成本和時間。', 'virtual-sim'),
    howItWorks: S('OMO 平台以擬真模擬、AI 分析與機器人單一化控制器等技術，建立機器人與產線間的快速整合；研發藍圖中的虛擬治具組裝技術，三種型態組裝成功率 >95%。', 'omo-platform', 'rm-fixture'),
    whyItMatters: S('現有機器人都必須搭配治具才能執行組裝任務；「高擬真仿人類雙手協作機器人」的目標是不使用治具，以 AI 演算法自動生成組裝程序。', 'fixture-free'),
    applications: [S('工具機、PCB、金屬加工、半導體、手工具、汽機車零件、廚具、精品刀具、自行車等產業', 'omo-industries')],
    industryValue: null,
    taiwan: S('參與歐盟 Horizon Europe（2023~2025年）的成果「高擬真仿人類雙手協作機器人」，已與國內手工具業者英發企業合作。', 'horizon', 'fixture-partner'),
    sourcePage: [256, 257],
  },
  {
    id: 'unified-controller', capability: 'cap-integration', nameZh: '單一化控制器', nameEn: 'Unified Robot Controller',
    tags: ['跨廠牌', '彈性生產'],
    placement: S('白皮書以「機器人單一化控制器」作為 OMO 平台的技術之一。', 'omo-platform'),
    summary: D('一套軟體控制不同品牌的機器人，產線換線、擴充都更容易。', 'holon-os'),
    description: S('Holon OS 以單一化控制器技術概念，支援控制國內外各大廠牌機器人，解決機器人跨廠牌整合及製程工藝資料管理的困難。', 'holon-os'),
    howItWorks: S('透過 AI 自動生成機器人最佳工作路徑、即時補償變異。', 'holon-path'),
    whyItMatters: S('提高生產靈活度及效率，滿足彈性生產需求。', 'holon-os'),
    applications: [D('多品牌機器人混合配置的產線整合', 'holon-os')],
    industryValue: null,
    taiwan: S('國內新創「赫侖」開發的 Holon OS，是單一化控制器的導入案例。', 'holon-startup'),
    sourcePage: [256],
  },
].map((n) => ({
  level: 'L4', category: 'star', status: 'active', universe: 'u-econ', galaxy: 'g-econ-hw', system: 'robot',
  primaryParent: 'robot', sourceType: 'SOURCE', ...n,
}));

export const NODES = [root, ...universes, ...galaxies, ...systems, ...constellations, ...core];
export const CONSTELLATIONS = constellations;
