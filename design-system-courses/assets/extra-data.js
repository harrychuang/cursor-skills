/* 互動練習、Skill 速查、名詞小卡用的資料 */
(function () {
  'use strict';
  const DSC = (window.DSC = window.DSC || {});

  DSC.PIPE = [
    { name: 'Design Token', img: 'design-element', part: 1, in: '設計稿裡的顏色、字級、間距、圓角', out: '三層 token：ref → sys → comp', skills: ['figma-m3-variables'] },
    { name: 'Figma 整理', img: 'bricks', part: 2, in: '散落各處、還不是元件的 UI', out: 'Components 頁上的元件、variants 和 instance', skills: ['figma-componentize'] },
    { name: '設計系統文件', img: 'bricks-document', part: 3, in: 'Figma 連結、截圖，或 vibe coding 原型', out: '設計原則、token、元件規格和 HTML 文件', skills: ['design-system-extractor'] },
    { name: 'Storybook 元件庫', img: 'play-lego', part: 4, in: '設計系統文件', out: '程式寫好的元件、story 和 Docs 頁', skills: ['design-system-to-storybook', 'design-system-governance'] },
    { name: '產品界面', img: 'product', part: 5, in: '元件庫加上產品需求', out: '驗收過的元件，加上用同一套積木做出的原型和正式產品', skills: ['ui-visual-parity', 'figma-storybook-sync', 'design-system-governance'] }
  ];

  DSC.GIT = [
    { want: '存檔', cmd: 'git add -A && git commit -m "訊息"', ui: '原始檔控制面板輸入訊息，按 Commit' },
    { want: '看哪些檔案變了', cmd: 'git status', ui: '面板的變更清單' },
    { want: '看改了什麼', cmd: 'git diff', ui: '點檔案，看左右對照' },
    { want: '丟掉一個檔案的修改', cmd: 'git restore 檔名', ui: '檔案旁的「捨棄變更」' },
    { want: '撤銷一次已存檔的修改', cmd: 'git revert 存檔編號', ui: '存檔紀錄上按右鍵' },
    { want: '開分支試試看', cmd: 'git switch -c 名字', ui: '左下角的分支名稱' }
  ];
  DSC.GIT_RULES = [
    'agent **新增**的檔案不會被 `git restore` 刪掉，先用 `git status` 確認，再決定要不要刪。',
    '`.env`、密鑰和 `node_modules` 放進 `.gitignore`。commit 過的東西就算刪掉，仍然留在歷史裡。',
    '公司資料只放私有 repo。要公開 repo 之前，先檢查整個歷史。'
  ];

  // 1-1 token 遊樂場：Mini Shop 的 ref 色票與三個主題
  // ref 色票的數字是亮度（CIE L*，0 最暗、100 最亮），跟 figma-m3-variables 的命名規則一樣
  DSC.SHOP_REF = [
    ['neutral-5', '#111111'], ['neutral-10', '#1C1C1E'], ['neutral-45', '#6B6B6B'], ['neutral-95', '#F2F2F2'], ['neutral-100', '#FFFFFF'],
    ['red-47', '#D7263D'], ['red-96', '#FFF1F2']
  ];
  DSC.SHOP_SYS = [['primary', '主色'], ['on-primary', '主色上的文字'], ['surface', '卡片表面'], ['on-surface', '表面上的文字']];
  // comp 名字照 Mini Shop 定案的順序：元件-角色-變體-目標-狀態
  DSC.SHOP_COMP = [['button-color-primary-container-default', 'primary'], ['button-color-primary-label', 'on-primary'], ['card-color-container', 'surface'], ['card-color-heading', 'on-surface']];
  DSC.SHOP_THEMES = {
    classic: { name: '經典黑白', map: { primary: 'neutral-5', 'on-primary': 'neutral-100', surface: 'neutral-95', 'on-surface': 'neutral-5' } },
    sale: { name: '週年慶', map: { primary: 'red-47', 'on-primary': 'neutral-100', surface: 'red-96', 'on-surface': 'neutral-5' } },
    night: { name: '夜間模式', map: { primary: 'neutral-100', 'on-primary': 'neutral-5', surface: 'neutral-10', 'on-surface': 'neutral-100' } }
  };
  DSC.NAME_EXAMPLES = ['shop-ref-color-neutral-5', 'shop-ref-color-primary', 'shop-sys-color-primary', 'shop-sys-color-button-container', 'shop-comp-button-color-primary-container-default', 'shop-comp-color-button-primary-container-default', 'shop-ref-spacing-card-padding', 'shop-comp-card-spacing-padding'];

  // 1-1 命名結構：Mini Shop 定案的順序（跟課程附的命名結構圖一樣）。順序每家公司可以不同，定案後所有 token 都照這個順序
  DSC.NAME_SLOTS = [
    { id: 'prefix', label: '前綴', en: 'Prefix', group: 'base', fixed: true, opts: ['shop'] },
    { id: 'category', label: '類型', en: 'Category', group: 'base', fixed: true, opts: ['ref', 'sys', 'comp'] },
    { id: 'component', label: '元件', en: '只有 comp', group: 'comp', opts: ['button', 'chip', 'card', 'input', 'modal', 'alert'] },
    { id: 'role', label: '角色', en: 'Role', group: 'base', opts: ['color', 'font', 'size', 'spacing', 'shadow', 'elevation', 'motion'] },
    { id: 'variant', label: '變體', en: 'Variant', group: 'mod', opts: ['primary', 'secondary', 'neutral', 'light', 'dark', 'error'] },
    { id: 'target', label: '目標', en: 'Target', group: 'mod', opts: ['container', 'corner', 'padding', 'border', 'heading', 'label'] },
    { id: 'state', label: '狀態', en: 'State', group: 'mod', opts: ['5', '50', 'sm', 'md', 'bold', 'default', 'hovered', 'disabled', 'selected', 'slower'] }
  ];
  DSC.NAME_START = { prefix: 'shop', category: 'comp', component: 'button', role: 'color', variant: 'primary', target: 'container', state: 'hovered' };
  // 換順序時，這三個 token 一起跟著變：定案後，每個 token 都照同一個順序
  DSC.NAME_SAMPLES = [
    { prefix: 'shop', category: 'ref', role: 'color', variant: 'neutral', state: '5' },
    { prefix: 'shop', category: 'sys', role: 'color', variant: 'primary' },
    { prefix: 'shop', category: 'comp', component: 'button', role: 'color', variant: 'primary', target: 'container', state: 'hovered' }
  ];

  DSC.SORTS = {
    sortLayers: {
      buckets: [
        { id: 'ref', label: 'ref 原始層', hint: '只描述值本身' },
        { id: 'sys', label: 'sys 語意層', hint: '很多元件共用的用途' },
        { id: 'comp', label: 'comp 元件層', hint: '某個元件專用' }
      ],
      items: [
        { id: 'a', text: '`#111111`：設計稿裡寫死的黑色', bucket: 'ref', why: '原始值先變成 ref，例如 `shop-ref-color-neutral-5`：neutral 是灰階，5 是亮度。' },
        { id: 'b', text: '`16px`：設計稿裡寫死的間距', bucket: 'ref', why: '原始數值放 ref，例如 `shop-ref-spacing-16`。' },
        { id: 'c', text: '按鈕、連結、勾選框共用的主色', bucket: 'sys', why: '很多元件共用的用途放 sys：`shop-sys-color-primary`。' },
        { id: 'd', text: '卡片和彈出面板共用的中等圓角', bucket: 'sys', why: '共用的圓角用途：`shop-sys-size-corner-md`（角色 size、目標 corner、狀態 md）。' },
        { id: 'e', text: '錯誤訊息的文字顏色', bucket: 'sys', why: '「錯誤」是共用語意：`shop-sys-color-error`。' },
        { id: 'f', text: '按鈕的背景色', bucket: 'comp', why: '只屬於按鈕：`shop-comp-button-color-primary-container-default`，指向 sys 的 primary。' },
        { id: 'g', text: '商品卡片的內距', bucket: 'comp', why: '只屬於商品卡片：`shop-comp-card-spacing-padding`。' },
        { id: 'h', text: '尺寸選項「已選取」時的底色', bucket: 'comp', why: '只屬於尺寸選項：`shop-comp-chip-color-container-selected`，狀態 selected 放在最後；沒選取時寫成 `…-container-default`。' }
      ],
      done: '原始值放 ref，共用用途放 sys，元件專用放 comp。'
    },
    sortVariant: {
      buckets: [
        { id: 'variant', label: 'Variant', hint: '長相不同：樣式、尺寸、狀態' },
        { id: 'prop', label: '元件屬性', hint: '內容不同：文字、開關、換圖示' }
      ],
      items: [
        { id: 'a', text: 'Filled 和 Outlined 兩種樣式', bucket: 'variant', why: '樣式不同 → Style variant。' },
        { id: 'b', text: 'Small、Medium、Large 三種尺寸', bucket: 'variant', why: '尺寸不同 → Size variant。' },
        { id: 'c', text: '停用、按下、載入中這些狀態', bucket: 'variant', why: '狀態不同 → State variant。' },
        { id: 'd', text: '按鈕上的文字「加入購物車」「立即購買」', bucket: 'prop', why: '只有文字不同 → 文字屬性。' },
        { id: 'e', text: '要不要顯示左邊的圖示', bucket: 'prop', why: '顯示或隱藏 → 開關屬性。' },
        { id: 'f', text: '把圖示從購物車換成愛心', bucket: 'prop', why: '換掉裡面的小元件 → 換 instance 的屬性。' }
      ],
      done: '長相不同用 variant，內容不同用屬性。'
    },
    sortAtomic: {
      buckets: [
        { id: 'atom', label: '元件', hint: '最小、可以重複用的零件' },
        { id: 'group', label: '組件', hint: '用幾個元件組成的區塊' },
        { id: 'screen', label: '界面', hint: '使用者看到的一整頁' }
      ],
      items: [
        { id: 'a', text: '按鈕', bucket: 'atom', why: '最小的零件，到處都會用到。' },
        { id: 'b', text: '尺寸選項（S、M、L）', bucket: 'atom', why: '最小的零件，一個尺寸就是一個選項。' },
        { id: 'c', text: '數量加減器', bucket: 'atom', why: '單一功能的小零件：減一、加一。' },
        { id: 'd', text: '商品卡片', bucket: 'group', why: '由商品圖、價格和按鈕組成。' },
        { id: 'e', text: '加入購物車面板', bucket: 'group', why: '由顏色、尺寸選項、數量加減器和按鈕組成。' },
        { id: 'f', text: '底部導覽列', bucket: 'group', why: '由好幾個圖示按鈕組成。' },
        { id: 'g', text: '商品頁', bucket: 'screen', why: '一整頁，放了商品圖、價格和加入購物車面板。' },
        { id: 'h', text: '購物車頁', bucket: 'screen', why: '一整頁，放了已選商品的列表和結帳按鈕。' }
      ],
      done: '由小到大：元件組成組件，組件組成界面。'
    }
  };

  DSC.ORDER_BUILD = {
    items: { button: '按鈕（Button）', stepper: '數量加減器（Stepper）', sheet: '加入購物車面板（AddToCartSheet）', page: '商品頁' },
    start: ['page', 'button', 'sheet', 'stepper'],
    answer: ['button', 'stepper', 'sheet', 'page'],
    explain: '數量加減器的 − 和 ＋ 用的是按鈕 → 加入購物車面板裡有數量加減器和按鈕 → 商品頁會打開這個面板。被用到的要先存在，後面的元件才能直接沿用，所以第一批（B01）先做按鈕。',
    hint: '想一想：誰「裡面」用到了誰？被用到的要排在前面。'
  };

  DSC.TREE_REUSE = {
    start: 'q1',
    nodes: {
      q1: { q: 'skill 在設計稿裡找到一個按鈕，看起來很像 Components 頁上的 Button（Style=Filled）。結構、名稱、樣式都一模一樣嗎？', a: [{ t: '一模一樣', next: 'r_exact' }, { t: '不完全一樣', next: 'q2' }] },
      q2: { q: '差在哪裡？', a: [{ t: '結構一樣，但現有的 variant 都對不上（例如多了一種顏色）', next: 'r_variant' }, { t: '只是有點像，不確定是不是同一個元件', next: 'r_partial' }] },
      r_exact: { tone: 'ok', title: '直接沿用，不用問你', result: '完全符合（exact）。skill 直接沿用 Button（Style=Filled），不會問你要不要沿用；真正把原稿換成 instance 之前，還是會附上截圖等你確認。' },
      r_variant: { tone: 'ask', title: '停下來問你：要不要加一個 variant？', result: 'skill 會放出審核板，把現有元件和原始樣本並排。你可以選：幫 Button 加一個 variant、新建一個元件，或保持原樣。' },
      r_partial: { tone: 'ask', title: '停下來問你：沿用、新建，還是沿用另一個元件？', result: '部分相似（partial）或無法確定（unconfirmed）一定會問。你沒決定之前，skill 不會自己新建元件。' }
    }
  };

  DSC.SLOP_RULES = [
    ['gradient', '非必要不用漸層背景'],
    ['glass', '非必要不用半透明背景'],
    ['nested', '避免卡片包卡片'],
    ['outline', '非必要不加外框線'],
    ['neon', '克制使用深色霓虹']
  ];

  DSC.STOPS = [
    { label: '① 重複來源', when: '萃取第 1 步結尾', eg: '商品頁有 0920 和 1105 兩個版本，要以哪個為準？', answers: ['reuse existing source', 'ignore duplicate', 'keep distinct'], file: '`DESIGN_EVIDENCE_MAP.md` 的 Source Duplicate Review' },
    { label: '② 相近 token', when: '萃取第 4 步結尾', eg: 'Figma 裡兩個設定好的黑色 `#111111` 和 `#121212` 只差一點點，要合併嗎？', answers: ['merge', 'keep distinct'], file: '`TOKEN_ARCHITECTURE.md` 的 Near Token Decisions' },
    { label: '③ 相似元件', when: '萃取第 5 步結尾', eg: '「商品卡片」和「推薦商品卡片」長得很像，是同一個元件嗎？', answers: ['merge', 'make variant', 'keep distinct', 'blocked'], file: '`COMPONENT_INVENTORY.md` 的 Component Similarity Review' }
  ];

  DSC.SOURCES = [
    { label: 'Figma 設計稿', img: 'comp-doc', reads: ['Variables 和樣式', '元件與 variants', '圖層名稱、Auto Layout 間距'], watch: '圖層亂的話，AI 讀到的也亂。先做第 2 部的整理。', m: [5, 5, 4, 5] },
    { label: '截圖圖片', img: 'research', reads: ['顏色、字級', '間距、圓角（用量的）'], watch: '看不到名字和互動狀態，量到的值會有誤差。多截幾張，把狀態截齊。', m: [3, 1, 1, 2] },
    { label: 'Vibe Coding 原型', img: 'coding', reads: ['程式裡真實的顏色和字級', '元件結構與互動狀態'], watch: '常常到處寫死數值、重複做元件。萃取時要整理成三層 token，相似元件交給你決定。', m: [4, 2, 4, 3] }
  ];
  DSC.SOURCE_METERS = ['顏色準不準', '有沒有名字', '互動狀態', '元件結構'];

  DSC.ADDON_KINDS = { core: 'Storybook 內建', tpl: '課程 template 附', add: '需要加裝' };
  DSC.ADDONS = [
    { name: 'Controls', kind: 'core', what: '在面板裡即時改元件的屬性。', when: '試不同的文字、尺寸、狀態。' },
    { name: 'Actions', kind: 'core', what: '記錄點擊這類事件。', when: '確認按鈕有沒有觸發。' },
    { name: 'Viewport', kind: 'core', what: '切換手機、平板、桌機尺寸。', when: '檢查響應式。' },
    { name: 'Backgrounds', kind: 'core', what: '切換畫布的背景色。', when: '看元件放在深色底上的樣子。' },
    { name: 'Measure 與 Outline', kind: 'core', what: '量尺和外框線。', when: '檢查間距和對齊。' },
    { name: 'Docs', kind: 'tpl', what: '自動產生文件頁：說明、屬性表、所有 story。', when: '當成規格書給大家看。', pkg: '@storybook/addon-docs' },
    { name: 'Figma Export', kind: 'tpl', what: '把 story 匯出成 Figma 能匯入的圖層，用到 token 的地方會綁 Variables。', when: '讓程式做好的元件回到 Figma。', pkg: '@harrychuang/storybook-addon-figma-export' },
    { name: 'a11y', kind: 'add', what: '檢查顏色對比、標籤這類無障礙問題。', when: '上線前的檢查。', pkg: '@storybook/addon-a11y' },
    { name: 'Vitest', kind: 'add', what: '把 story 變成自動測試。', when: '確認互動和狀態沒有被改壞。', pkg: '@storybook/addon-vitest' }
  ];

  DSC.ENV_CHECKS = [
    { t: '確認 Node 版本是 v22.18 以上', cmd: 'node -v' },
    { t: '安裝套件', cmd: 'npm install' },
    { t: '換成自己的名字和前綴', cmd: 'npm run init-template -- --name "Mini Shop" --prefix shop' },
    { t: '把設計系統文件放進 `design-system/`、token 放進 `tokens/`，先存檔一次', cmd: 'git add -A && git commit -m "放入設計系統"' },
    { t: '啟動 Storybook，打開 http://localhost:6006', cmd: 'npm run storybook' },
    { t: '在側欄找到 Foundations，看得到三層 token' }
  ];

  DSC.PARITY = [
    { id: 'PV-001', mark: 'fix', k: 'fix', text: '按鈕內距 12px → 16px', title: 'fix：要修的原因', body: '這是原因，要修。先看它屬於哪一層：這裡是按鈕內距的 token，所以改 token，不改頁面。' },
    { id: 'PV-002', mark: '↳', k: 'follow', text: '底部按鈕列高度 80px → 84px（+4）', title: '↳：連帶結果', body: '這是 PV-001 造成的。不要動它，修好 PV-001 之後再量一次，它就會消失。' },
    { id: 'PV-003', mark: 'leave', k: 'leave', text: '手機版商品名稱改成兩行', title: 'leave：刻意的差異', body: '刻意的調整，或為了無障礙核准過的值。不要改。' },
    { id: 'PV-004', mark: '?', k: 'untrusted', text: '字級 15px → 16px（字型沒載入）', title: '?：量測不可信', body: '量測不可信，通常是字型沒有載入。要修的是量測環境，不是程式。' }
  ];
  DSC.FIX_ORDER = ['Token／主題', '共用元件', '組版', '單一頁面'];

  DSC.COV = [
    { label: '頂部標題列', h: 'sm', st: 'ok', comp: 'TopBar' },
    { label: '購物車裡的商品 ×2', h: 'lg', st: 'variant', comp: 'ProductCard 加一個「橫式」variant' },
    { label: '數量加減器', h: 'sm', st: 'ok', comp: 'Stepper' },
    { label: '優惠券輸入框', h: 'sm', st: 'missing', comp: 'CouponField（元件庫裡沒有）' },
    { label: '你可能也喜歡', h: 'md', st: 'ok', comp: 'ProductCard' },
    { label: '結帳按鈕', h: 'sm', st: 'ok', comp: 'Button' }
  ];

  DSC.SITUATIONS = [
    { need: 'Figma 設計稿裡都是寫死的顏色和數字', skill: 'figma-m3-variables', what: '把寫死的值變成三層 Variables，外觀不變。', say: '把這個元件寫死的數值轉成 token 並綁定', ch: '1-2' },
    { need: 'Figma 裡的 UI 還不是元件', skill: 'figma-componentize', what: '找出該做成元件的 UI，建元件、variants，再換成 instance。', say: '幫我把這個 section 元件化', ch: '2-1' },
    { need: '有 Figma 連結，想要一份設計系統文件', skill: 'design-system-extractor', what: '萃取設計原則、token、元件規格和 HTML 文件。', say: '從這個 Figma 連結整理出一套設計系統', ch: '3-2' },
    { need: '手上只有幾張產品截圖', skill: 'design-system-extractor', what: '從截圖量出顏色、間距、字級，整理成設計系統。', say: '從這幾張截圖整理出一套設計系統', ch: '3-3' },
    { need: '有一個 vibe coding 做的原型', skill: 'design-system-extractor', what: '把原型裡寫死的值整理成三層 token 和元件清單。', say: '從這個原型反推出一套設計系統', ch: '3-3' },
    { need: '有設計系統文件，想做成元件庫', skill: 'design-system-to-storybook', what: '照依賴順序分批生成元件、樣式、story 和 Docs。', say: '設計系統在 ./design-system，幫我做第一批元件', ch: '4-3' },
    { need: '寫 UI 時怕 AI 寫死樣式', skill: 'design-system-governance', what: '全程盯著：只用 token、能組合就不新建、缺東西先問。', say: '盯著我，不要寫死樣式', ch: '4-3' },
    { need: '畫面和設計稿對不齊', skill: 'ui-visual-parity', what: '量測差異，照 token → 共用元件 → 組版 → 頁面的順序修。', say: '這頁跟設計稿不一樣，幫我量測並修正', ch: '5-1' },
    { need: 'Figma 和程式都改過了', skill: 'figma-storybook-sync', what: '三方比對，指出每一筆差異該交給誰處理。', say: 'Figma 和程式都改了，幫我看差在哪', ch: '5-1' },
    { need: '想用現有元件拼出能點的原型', skill: 'design-system-governance', what: '從元件庫拿現有的元件和假資料拼出原型：不寫死樣式，缺元件先問你。', say: '用現有元件把這個流程拼成能點的原型，不要寫死樣式', ch: '5-2' },
    { need: '要做正式產品的頁面', skill: 'design-system-governance', what: '同一套規則、同一批元件：接上真的資料，補齊載入中、沒有資料、出錯這些狀態。', say: '照 governance 的規則，把這個畫面做成正式產品的頁面', ch: '5-3' },
    { need: '拿到新畫面，想知道現有元件夠不夠', skill: 'design-system-governance', what: '先查再做：對照元件庫，列出可以直接用的、要加 variant 的、還缺的元件，等你確認才動手。', say: '先查這張截圖能用哪些現有元件，列出來給我確認，先不要寫程式', ch: '5-3' }
  ];

  DSC.GLOSSARY = [
    { term: 'Design Token', def: '設計稿裡的設定值，也是程式碼裡的變數。顏色、字級、間距、圓角都可以是 token。', eg: '`shop-sys-color-primary`' },
    { term: 'ref token', def: '原始層。只描述值本身，就像冰箱裡標示清楚的食材。', eg: '`shop-ref-color-neutral-5`' },
    { term: 'sys token', def: '語意層。很多元件共用的用途，只指向 ref。', eg: '`shop-sys-color-primary`' },
    { term: 'comp token', def: '元件層。某個元件專用，只指向 sys；只有這一層可以出現元件名稱。', eg: '`shop-comp-button-color-primary-container-default`' },
    { term: 'token 命名順序', def: '名字照固定的順序組成：前綴、類型、元件（只有 comp）、角色、變體、目標、狀態，用不到的段落就省略；有不同狀態時，預設狀態也寫出來（default）。每家公司的順序可以不同，定案之後，所有 token 都照同一個順序。', eg: '`shop-comp-button-color-primary-container-hovered`' },
    { term: 'Figma Variables', def: 'Figma 裡存放 token 的地方，可以分組，也可以有淺色、深色等模式。' },
    { term: '元件', def: '可以重複使用的最小零件。', eg: '按鈕、尺寸選項、圖示' },
    { term: '組件', def: '用幾個元件組成的區塊。', eg: '商品卡片、加入購物車面板' },
    { term: '界面', def: '使用者真正看到的一整頁。', eg: '商品頁、購物車頁' },
    { term: 'Instance', def: '元件放進設計稿裡的「分身」。改原本的元件，所有分身一起更新。' },
    { term: 'Variants', def: '同一個元件的不同長相：樣式、尺寸、狀態。', eg: 'Filled／Outlined、S／M／L' },
    { term: 'Storybook', def: '元件的展示櫃兼說明書，也是產品的中央工廠：設計師、PM、工程師都從這裡拿同一套元件，做原型和正式產品。' },
    { term: 'Story', def: '一個元件的一種狀態，每個都有自己的網址。', eg: '停用的按鈕' },
    { term: 'Addon', def: 'Storybook 的外掛，幫它加功能。', eg: 'a11y、Docs' },
    { term: 'Skill', def: '寫給 AI 的工作說明書：步驟、檢查點，還有什麼時候要停下來問人。' },
    { term: 'Agent', def: '會自己讀檔、改檔、跑指令的 AI。', eg: 'Cursor、Claude Code 裡的 AI' },
    { term: 'MCP', def: '讓 AI 連上其他工具的接頭。', eg: 'Figma MCP 讓 AI 讀得到設計稿' },
    { term: 'Commit', def: '一次存檔，記下改了什麼、誰改的、為什麼改。' },
    { term: 'Parity', def: '「一致」。實作和設計稿量起來一樣，就是 PARITY。' }
  ];

  DSC.FINAL_CHECKS = [
    { t: '我能說出五站流水線，以及每一站用哪個 skill' },
    { t: '我能把一個設計值放進 ref、sys、comp 正確的那一層' },
    { t: '我能請 skill 把 Figma 整理成元件，並避免重複建立' },
    { t: '我能從 Figma、截圖或原型萃取設計系統，並回答三個停點' },
    { t: '我能在 Storybook 找元件、切狀態、看文件，並建好第一個元件' },
    { t: '我說得出每個角色怎麼用同一套積木，也能讓 governance 盯著，用「先查再做」把新畫面做進正式產品' }
  ];

  DSC.TOUR = [
    { sel: '#roles', title: '先選你的路線', text: '設計師、PM 或工程師。選了之後，上面的分鐘數、下面地圖的必看格子馬上跟著變。' },
    { sel: '#map', title: '課程地圖', text: '每一格是一堂課，格子越寬，那一堂越長。紫色是你的必看；點一下就會打開那一堂，看完的會變成綠色。' },
    { sel: '#part-0 .ch-card', title: '點卡片，打開一堂課', text: '每一堂會打開成一張大卡片：重點、互動練習、可以複製的提示詞，最後一題小測驗。看完按「看完了」，進度會存在這台電腦。' },
    { sel: '#gnav [data-act="search"]', title: '找不到就搜尋', text: '按右上角的放大鏡，或在電腦上按 / 鍵，就能搜尋章節、名詞和 skill。' },
    { sel: '#top-progress', alt: '#gnav .gnav__cta', title: '隨時看進度', text: '這裡顯示看完幾堂。按「繼續上課」，會直接打開下一堂還沒看的課。' }
  ];
})();
