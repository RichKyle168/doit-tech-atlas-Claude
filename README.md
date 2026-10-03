# DOIT Tech Atlas｜產業技術星圖

> 探索科技，看見產業未來 · Explore Technology. Discover the Future of Industry.

一張可以「摘星」的 3D 產業技術星圖：**宇宙 → 銀河 → 星系 → 星星**，每一層都是一個繞著中心公轉的系統，Dr. T 一路引導。
星圖資料存放在 PostgreSQL，由 API 提供給前端；內容以《2025/2026產業技術白皮書》為基礎整理。

線上版本：**https://doit-tech-atlas.onrender.com**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/RichKyle168/doit-tech-atlas-Claude)

## 快速開始

```bash
npm install
npm run dev        # http://localhost:5173 ：前端（熱更新）＋ API ＋ 內建資料庫，不需要另外安裝 PostgreSQL
```

本機開發時，資料庫是內建的 PGlite（真正的 Postgres，跑在 Node 裡），資料存放在 `.data/pglite/`。
要改用自己的 PostgreSQL，設定 `DATABASE_URL` 即可：

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/atlas npm run dev
```

## 部署到 Vercel（建議）

網頁由 Vercel 的 CDN 提供，`/api/*` 交給 `api/index.js`（Vercel Function，設在新加坡 `sin1`），資料庫用 Neon（新加坡）。設定都在 `vercel.json`。

1. Vercel → Add New → Project → 匯入這個 repo（Framework 會自動辨識為 Vite）。
2. 專案的 Storage → Create Database → **Neon**，區域選 **Singapore**，連到這個專案：會自動加上 `DATABASE_URL`。
3. Settings → Environment Variables：加上 `ADMIN_TOKEN`（自訂一串長密碼）；要自然人聲再加 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION`。
4. 重新部署。第一個請求會自動建表並寫入星圖內容。

Vercel 免費方案（Hobby）限個人、非商業用途；正式對外的商業服務請用 Pro。

## 部署到 Render

點上方的 **Deploy to Render** 按鈕，Render 會讀取 `render.yaml`，建立：

| 資源 | 方案 | 說明 |
|---|---|---|
| `doit-tech-atlas`（Web Service） | Free | Node 伺服器：API ＋ 3D 前端，同一個網址 |
| `doit-tech-atlas-db`（PostgreSQL 16） | Free | 只允許 Render 內部網路連線 |

`DATABASE_URL` 會自動接上資料庫，`ADMIN_TOKEN`（編輯用的密碼）會自動產生，可在 Render 的 Environment 頁面查看。
伺服器每次啟動都會自動建立資料表，並把 `content/` 的內容同步進資料庫。

**免費方案要注意：**

* Web Service 閒置 15 分鐘會休眠，下一位訪客要等約一分鐘喚醒。
* 免費的 Render PostgreSQL **建立 30 天後到期**。到期後網站不會壞：伺服器偵測到資料庫連不上，會自動改用內建的唯讀副本繼續提供星圖（`/api/health` 會顯示 `readOnly: true`）。要恢復可編輯，只要把 `DATABASE_URL` 換成新的資料庫（Render 付費方案，或任何 PostgreSQL 服務），重新部署即可；資料會自動重建。
* 到期前可以先用 `GET /api/admin/export` 備份編輯過的內容。

## 語音朗讀與大字

* 技術星星的說明面板，每個欄位都有「朗讀」按鈕，最上方另有「朗讀全文」。正在朗讀的段落會在左側亮起，換頁或關閉面板就停止。
* **自然人聲（建議）**：在 Render 的 Environment 加上 `AZURE_SPEECH_KEY` 與 `AZURE_SPEECH_REGION`，伺服器會用 Azure 神經語音 `zh-TW-YunJheNeural`（溫暖的臺灣男聲），語速放慢 8%、音調略低。每段文字只合成一次，之後從資料庫的 `tts_cache` 直接播放。Azure Speech 免費方案（F0）每月 50 萬字元，整個星圖目前不到 1 萬字元。
  * 可調整：`TTS_VOICE`（例如 `zh-TW-HsiaoChenNeural` 女聲）、`TTS_RATE`（預設 `-8%`）、`TTS_PITCH`（預設 `-2%`）。
* **沒有設定時**：改用訪客裝置內建的國語語音，優先選擇臺灣國語、自然／神經語音、較低沉的聲音，語速 0.88 倍。音色取決於裝置（iPhone、Android、Windows 各不相同）。
* 文字會先整理成適合朗讀的形式：≥ 讀作「大於等於」、2024~2027 讀作「2024到2027」、ms 讀作「毫秒」等。
* 字級：內文 17px 以上、按鈕至少 40–44px 高，次要文字提高對比，Dr. T 與清單改用黑體以便閱讀。

## 架構

```
瀏覽器（React ＋ Three.js）
   │  GET /api/graph（一次載入整張星圖，約 15 KB gzip）
   │  GET /api/sources?ids=…（打開「資料來源」時才載入原文）
   ▼
Node 伺服器（Express）── server/app.js
   │  驗證每一次寫入不會破壞星圖（shared/graph.js）
   ▼
PostgreSQL ── nodes / edges / sources / documents / meta
   ▲
   └─ 每次啟動同步 content/（內建內容 = 資料庫的種子資料）
```

| 層級 | 中心 | 繞著中心公轉的天體 |
|---|---|---|
| 星圖起點 | 2025–2035 | 5 個宇宙（五大面向的趨勢） |
| 宇宙 | 宇宙中心 | 硬體銀河、軟體銀河 |
| 銀河 | 銀河中心 | 星系＝技術載具（機器人、工具機、智慧製造…） |
| 星系 | 星系的恆星 | 星星＝關鍵技術；一圈軌道一個星座（感知、決策…） |

```
content/              內建內容（資料庫的種子資料）
│  technologies.js    宇宙／銀河／星系／星座／星星
│  edges.js           技術之間的關係（支撐／協同／延伸）
│  sources.js         原文摘錄
shared/graph.js       節點規則與完整性驗證（前端、API、腳本共用）
api/index.js          Vercel Function 入口
vercel.json           Vercel：CDN、新加坡區、/api 轉送、安全標頭
server/
│  boot.js            共用的啟動流程：資料庫 → 建表 → 同步內容 → API
│  serverless.js      Vercel 用：第一個請求時啟動一次，之後重複使用
│  index.js           長駐伺服器（本機、Render）：API ＋ 前端
│  app.js             API 路由
│  cli.js             資料庫指令（migrate / seed / export / import）
│  db/client.js       PostgreSQL 或內建 PGlite，連不上時自動退回唯讀副本
│  db/migrations.js   資料表定義（依序套用一次）
│  db/repo.js         所有 SQL
│  db/sync.js         內容同步（不覆蓋編輯過的資料）
src/                  3D 前端
│  data/client.js     向 API 取資料
│  data/graph.js      前端的星圖索引
│  data/narrative.js  Dr. T 的台詞（新內容會自動產生台詞）
│  space/             Three.js 軌道儀、星空、相機飛行
│  components/        畫面元件
test/api.test.mjs     API 與資料庫測試
```

### 資料表

| 表 | 內容 |
|---|---|
| `nodes` | 每個宇宙、銀河、星系、星座、星星。常用欄位（層級、父節點、名稱、狀態）獨立成欄，其餘欄位（說明文字、應用、標籤…）放在 JSONB `props` |
| `edges` | 技術之間的關係：`from_id`、`to_id`、`relation`、`label`、`refs` |
| `sources` | 原文摘錄，每段文字的 `refs` 指向這裡 |
| `documents` | 資料來源文件 |
| `meta` | 內容版本（content hash）、同步時間 |

每一列都有 `origin`：`seed` 來自 `content/`，啟動時會跟著同步；`admin` 是透過 API 編輯過的，同步時不會被覆蓋。

## API

公開（唯讀）：

| | |
|---|---|
| `GET /api/health` | 資料庫狀態、筆數、是否為唯讀副本 |
| `GET /api/graph` | 整張星圖：`document`、`nodes`、`edges` |
| `GET /api/nodes?level=L4&parent=robot` | 節點清單 |
| `GET /api/nodes/:id` | 單一節點：路徑、子節點、關係、引用來源 |
| `GET /api/sources?ids=a,b` | 原文摘錄 |
| `GET /api/search?q=數位` | 搜尋名稱、標籤與說明 |
| `GET /api/tts` | 是否已設定自然人聲 |
| `GET /api/tts/:id/:part` | 朗讀音檔（mp3），例如 `/api/tts/digital-twin/summary` |

編輯（需要 `Authorization: Bearer $ADMIN_TOKEN`）：

| | |
|---|---|
| `PUT /api/admin/nodes/:id` | 新增或更新節點 |
| `DELETE /api/admin/nodes/:id` | 刪除節點（有子節點時拒絕） |
| `PUT /api/admin/edges` / `DELETE /api/admin/edges` | 新增、更新或刪除關係 |
| `PUT /api/admin/sources/:id` | 新增或更新原文摘錄 |
| `GET /api/admin/export` | 完整備份 |
| `POST /api/admin/sync` | 重新套用內建內容（`{"overwriteAdmin": true}` 會連編輯過的也覆蓋） |

每次寫入前都會用整張星圖驗證：引用不存在的來源、找不到父節點、星星沒有星系…都會被拒絕（422），並列出原因。

新增一顆星的例子：

```bash
curl -X PUT https://<你的網址>/api/admin/nodes/force-sensor \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "level": "L4", "category": "star", "status": "active",
    "universe": "u-econ", "galaxy": "g-econ-hw", "system": "robot", "primaryParent": "robot",
    "capability": "cap-perception", "nameZh": "力覺感測", "nameEn": "Force Sensing", "sourceType": "DERIVED",
    "summary": { "t": "讓機器人知道自己用了多少力。", "type": "DERIVED", "refs": ["mech-components"] }
  }'
```

畫面會在下次載入時出現這顆星；要開放新的星系，把它的 `status` 設為 `active` 並加上星星，3D 場景會自動長出新的軌道，Dr. T 也會自動產生導覽台詞。

## 指令

```bash
npm run dev               # 開發
npm run build             # 建置前端到 dist/
npm start                 # 正式環境：API ＋ dist/
npm test                  # API 與資料庫測試（TEST_DATABASE_URL=… 可改測真正的 PostgreSQL）
npm run check             # 內建內容的完整性檢查
npm run db:migrate        # 建表／升級
npm run db:seed           # 同步 content/ 進資料庫（加 -- --reset 連編輯過的也覆蓋）
npm run db:export > backup.json
npm run db:import -- backup.json
npm run build:artifact    # 不需要伺服器的單一 HTML 版本（內容直接打包進去）
```

## 資料的可信度

每段說明文字都保留 `{ t, type, refs }`：`type` 是 `SOURCE`（原文明確記載）或 `DERIVED`（星圖重新整理、比喻或建立的關係），`refs` 指向 `sources` 表的原文摘錄。
畫面上只呈現技術本身；每個說明面板最下方的「資料來源」可以打開對應的原文。欄位是空的時候，畫面顯示「資料持續建構中」，不會為了看起來完整而補寫。
