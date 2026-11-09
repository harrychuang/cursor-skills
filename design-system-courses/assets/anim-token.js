/* 1-1、1-2 的說明動畫：三層 token、Figma M3 Variables
   沿用 anim.js 的播放器與 anim-intro.js 的元素；每一幕只講一件事，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）] */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  DSC.ANIMS = DSC.ANIMS || {};

  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker><marker id="${id}r" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#D7263D"/></marker></defs></svg>`;

  /* ================= 1-1 三層 token：AI 讀名字比讀色碼準 ================= */
  // ref 色票的數字是亮度（0 最暗、100 最亮），跟 figma-m3-variables 的命名規則一樣
  const REF6 = [['neutral-5', '#111111'], ['neutral-45', '#6B6B6B'], ['neutral-95', '#F2F2F2'], ['neutral-100', '#FFFFFF'], ['red-47', '#D7263D'], ['red-96', '#FFF1F2']];
  const REF4 = [['neutral-5', '#111111'], ['neutral-95', '#F2F2F2'], ['neutral-100', '#FFFFFF'], ['red-47', '#D7263D']];
  const SYS4 = [['primary', '主色'], ['on-primary', '主色上的文字'], ['surface', '卡片表面'], ['on-surface', '表面上的文字']];
  // sys 第 i 列指向 ref 第幾列：primary→neutral-5、on-primary→neutral-100、surface→neutral-95、on-surface→neutral-5
  const ROW = [22, 80, 138, 196];
  const link = (from, to) => `M180 ${ROW[from]} C 90 ${ROW[from]}, 90 ${ROW[to]}, 6 ${ROW[to]}`;
  const LINKS = [[0, 0], [1, 2], [2, 1], [3, 0]];
  // 名字的順序：七欄跟命名結構圖一樣（黑：前綴、類型、角色；灰：元件，只有 comp；紫：變體、目標、狀態）
  // [標題, 組別, left, width]
  const NCOLS = [['前綴', 'base', 40, 76], ['類型', 'base', 130, 76], ['元件', 'comp', 220, 92], ['角色', 'base', 326, 84], ['變體', 'mod', 424, 100], ['目標', 'mod', 538, 112], ['狀態', 'mod', 664, 96]];
  const NROWS = [
    ['shop', 'comp', 'button', 'color', 'primary', 'container', 'hovered'],
    ['shop', 'sys', '', 'color', 'primary', '', ''],
    ['shop', 'ref', '', 'color', 'neutral', '', '5']
  ];
  const NKEY = (r, c) => (r === 0 ? `c${c}` : r === 1 ? 'sr' : 'rr');
  // 每一格後面還有字，就在空隙放一個連字號：省略的段落直接跳過
  const nameRow = (row, r) => row.map((v, c) => {
    const [, g, x, w] = NCOLS[c];
    const top = 128 + r * 54;
    const cell = `<div class="x a-ncell ${v ? `a-ncell--${g}` : 'a-ncell--none'} b b--pop" data-b="${NKEY(r, c)}" style="left:${x}px;top:${top}px;width:${w}px">${v}</div>`;
    const more = v && row.slice(c + 1).some(Boolean);
    return cell + (more ? `<div class="x a-nhy b b--fade" data-b="${NKEY(r, c)}" style="left:${x + w}px;top:${top}px">-</div>` : '');
  }).join('');

  DSC.ANIMS.tokens11 = {
    length: '約 70 秒',
    poster: 9200,
    scenes: [
      {
        title: '色碼 vs 名字', dur: 10.5,
        caption: 'AI 看到 #111111，只能猜它是主色、文字，還是邊框；看到 shop-comp-button-color-primary-container-default，馬上知道這是主要按鈕的底色。名字，就是寫給 AI 的說明。',
        beats: [[0.2, 't'], [0.8, 'ca'], [1.8, 'robot'], [2.8, 'q'], [5.0, 'cb'], [6.4, 'q', 'is-out'], [6.4, 'ok'], [6.4, 'ca', 'is-done'], [8.2, 'end']]
      },
      {
        title: 'ref 原始層', dur: 10.5,
        caption: '第一層是 ref，原始層。它像冰箱裡標示清楚的食材：只放原始的值，名字只描述值本身。shop-ref-color-neutral-5 的 neutral 是灰階，5 是亮度，不寫拿來做什麼。',
        beats: [[0.2, 't'], [0.8, 'fr'], [1.4, 'r0'], [1.9, 'r1'], [2.4, 'r2'], [2.9, 'r3'], [3.4, 'r4'], [3.9, 'r5'], [5.0, 'r0', 'is-hot'], [5.6, 'name'], [7.2, 'tone']]
      },
      {
        title: 'sys 語意層', dur: 12,
        caption: '第二層是 sys，語意層。它寫的是用途，例如主色、卡片表面，再指向某一個 ref。按鈕、連結、勾選框，都用同一個 primary。',
        beats: [[0.2, 't'], [0.8, 'refs'], [1.8, 's0'], [2.4, 'l0'], [3.6, 's1'], [4.2, 'l1'], [5.4, 's2'], [6.0, 'l2'], [7.2, 's3'], [7.8, 'l3'], [9.4, 'end']]
      },
      {
        title: 'comp 元件層', dur: 11.5,
        caption: '第三層是 comp，元件層。只有這一層可以寫元件名稱：主要按鈕的底色 shop-comp-button-color-primary-container-default 指向 sys 的主色，主色再指向 ref 的黑色。',
        beats: [[0.2, 't'], [0.8, 'btn'], [2.0, 'c0'], [3.6, 'c1'], [5.2, 'c2'], [7.6, 'c0', 'is-hot'], [8.4, 'end']]
      },
      {
        title: '換主題', dur: 12,
        caption: '換主題時，只改 sys 指向哪一個 ref：主色從黑色改指向紅色。ref 的值一個都沒動，comp 也不用改，按鈕就跟著換了。',
        beats: [[0.2, 't'], [0.8, 'cols'], [2.0, 'la'], [2.8, 'lc'], [3.6, 'tabs'], [6.0, 'la', 'is-out'], [6.0, 'lb'], [6.0, 'tabs', 'is-go'], [6.0, 'pbtn', 'is-go'],
          [6.0, 'sp', 'is-hot', 7.6], [8.0, 'marks'], [9.6, 'end']]
      },
      {
        title: '名字的順序', dur: 13.5,
        caption: 'token 的名字照固定的順序組成：前綴、類型、元件、角色、變體、目標、狀態。元件只有 comp 才寫，用不到的段落就省略。順序每家公司可以不同，但定案之後，每個 token 都照同一個順序。',
        beats: [[0.2, 't'], [0.8, 'hd'], [1.6, 'c0'], [2.1, 'c1'], [2.6, 'c2'], [3.1, 'c3'], [3.6, 'c4'], [4.1, 'c5'], [4.6, 'c6'], [6.0, 'sr'], [7.0, 'rr'], [8.2, 'bx'], [9.8, 'end']]
      }
    ],
    html: () => [
      // 1 色碼 vs 名字
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">AI 讀名字，比讀色碼準</div>
        <div class="x a-code b b--left" data-b="ca" style="left:40px;top:100px;width:500px"><span class="a-code__k">background:</span><b class="a-code__hex">#111111</b></div>
        <div class="x a-code a-code--long b b--left" data-b="cb" style="left:40px;top:232px;width:580px"><span class="a-code__k">background:</span><b class="a-code__tok">var(--shop-comp-button-color-primary-container-default)</b></div>
        <div class="x a-who b b--pop" data-b="robot" style="left:636px;top:178px;width:140px">${img('ai-read')}<span class="a-label">AI</span></div>
        <div class="x a-say a-say--r a-say--swap b b--pop" data-b="q" style="left:556px;top:108px">主色？文字？還是邊框？</div>
        <div class="x a-say a-say--r a-say--ok b b--pop" data-b="ok" style="left:572px;top:108px">這是主要按鈕的底色！</div>
        <div class="x a-note b" data-b="end" style="top:378px">名字，就是寫給 AI 的說明</div>
      </div>`,
      // 2 ref：冰箱裡標示清楚的食材
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">ref：冰箱裡標示清楚的食材</div>
        <div class="x a-fridge b" data-b="fr" style="left:100px;top:84px;width:600px">
          <div class="a-fridge__head"><span class="a-box__tag">ref 原始層</span><span>只描述值本身，不寫用途</span></div>
          <div class="a-jars">${REF6.map(([n, h], i) => `<div class="a-jar b b--pop" data-b="r${i}"><i style="background:${h}"></i><b>${n}</b><small>${h}</small></div>`).join('')}</div>
        </div>
        <div class="x a-note b" data-b="name" style="top:330px">neutral 是灰階，5 是亮度</div>
        <div class="x a-sub b" data-b="tone" style="left:0;right:0;top:372px">亮度從 0 到 100，數字越小越暗；名字裡不寫拿來做什麼</div>
      </div>`,
      // 3 sys：寫用途，再指向 ref
      `<div class="anim__scene" data-s="2">${arrowDefs('a-ar11')}
        <div class="x a-title b" data-b="t">sys：寫用途，再指向 ref</div>
        <div class="x a-colhead b" data-b="refs" style="left:80px;top:92px;width:220px">ref 原始層</div>
        ${REF4.map(([n, h], i) => `<div class="x a-pill b b--left" data-b="refs" style="left:80px;top:${126 + i * 58}px;width:220px"><i style="background:${h}"></i>${n}</div>`).join('')}
        <div class="x a-colhead b" data-b="s0" style="left:480px;top:92px;width:250px">sys 語意層</div>
        ${SYS4.map(([n, l], i) => `<div class="x a-pill b" data-b="s${i}" style="left:480px;top:${126 + i * 58}px;width:250px"><b>${n}</b><small>${l}</small></div>`).join('')}
        <svg class="x" style="left:300px;top:126px" width="180" height="240" viewBox="0 0 180 240" aria-hidden="true">${LINKS.map(([f, t], i) => `<path class="a-link" data-b="l${i}" d="${link(f, t)}" marker-end="url(#a-ar11)"/>`).join('')}</svg>
        <div class="x a-note b" data-b="end" style="top:378px">按鈕、連結、勾選框，都用同一個 primary</div>
      </div>`,
      // 4 comp：只有這一層寫元件名稱
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">comp：只有這一層寫元件名稱</div>
        <div class="x a-prev b b--pop" data-b="btn" style="left:612px;top:104px;width:170px"><span class="a-btn a-btn--lg">加入購物車</span><small>這顆按鈕的底色</small></div>
        <svg class="x b b--fade" data-b="c0" style="left:580px;top:112px" width="32" height="60" viewBox="0 0 32 60" aria-hidden="true"><path class="a-dash" d="M2 12 C 18 12, 14 48, 30 48"/></svg>
        <div class="x a-chain2 a-chain2--sm b b--left" data-b="c0" style="left:40px;top:96px;width:540px"><span class="a-layer-tag">comp</span><code class="a-tk">shop-comp-<mark>button</mark>-color-primary-container-default</code></div>
        <div class="x a-down b b--fade" data-b="c1" style="left:296px;top:152px">↓</div>
        <div class="x a-chain2 a-chain2--sm b b--left" data-b="c1" style="left:40px;top:186px;width:540px"><span class="a-layer-tag">sys</span><code class="a-tk">shop-sys-color-primary</code></div>
        <div class="x a-down b b--fade" data-b="c2" style="left:296px;top:242px">↓</div>
        <div class="x a-chain2 a-chain2--sm b b--left" data-b="c2" style="left:40px;top:276px;width:540px"><span class="a-layer-tag">ref</span><code class="a-tk">shop-ref-color-neutral-5</code><span class="a-hexchip"><i style="background:#111111"></i>#111111</span></div>
        <div class="x a-note b" data-b="end" style="top:378px">元件名稱（button）只能出現在 comp 這一層</div>
      </div>`,
      // 5 換主題：只改 sys 指向哪個 ref
      `<div class="anim__scene" data-s="4">${arrowDefs('a-ar11b')}
        <div class="x a-title b" data-b="t">換主題：只改 sys 指向哪個 ref</div>
        <div class="x b" data-b="tabs" style="left:0;right:0;top:76px;text-align:center"><span class="a-theme" data-b="tabs"><span>經典黑白</span><span>週年慶</span></span></div>
        <div class="x a-colhead b" data-b="cols" style="left:40px;top:120px;width:170px">ref</div>
        <div class="x a-pill b" data-b="cols" style="left:40px;top:150px;width:170px"><i style="background:#111111"></i>neutral-5</div>
        <div class="x a-pill b" data-b="cols" style="left:40px;top:230px;width:170px"><i style="background:#D7263D"></i>red-47</div>
        <div class="x a-colhead b" data-b="cols" style="left:270px;top:120px;width:170px">sys</div>
        <div class="x a-pill b" data-b="cols sp" style="left:270px;top:190px;width:170px"><b>primary</b></div>
        <div class="x a-colhead b" data-b="cols" style="left:500px;top:120px;width:270px">comp</div>
        <div class="x a-pill a-pill--long b" data-b="cols" style="left:500px;top:150px;width:270px"><b>button-color-primary-container</b></div>
        <div class="x b" data-b="cols" style="left:500px;top:226px;width:270px;text-align:center"><span class="a-btn a-btn--lg" data-b="pbtn">加入購物車</span></div>
        <svg class="x" style="left:200px;top:150px" width="310" height="130" viewBox="0 0 310 130" aria-hidden="true">
          <path class="a-link" data-b="la" d="M70 62 C 44 62, 40 22, 16 22" marker-end="url(#a-ar11b)"/>
          <path class="a-link a-link--red" data-b="lb" d="M70 62 C 44 62, 40 102, 16 102" marker-end="url(#a-ar11br)"/>
          <path class="a-link" data-b="lc" d="M300 22 C 274 22, 272 62, 246 62" marker-end="url(#a-ar11b)"/>
        </svg>
        <div class="x b" data-b="marks" style="left:40px;top:300px;width:170px;text-align:center"><span class="a-mark">值沒改</span></div>
        <div class="x b" data-b="marks" style="left:270px;top:300px;width:170px;text-align:center"><span class="a-mark a-mark--hot">只改這裡的指向</span></div>
        <div class="x b" data-b="marks" style="left:500px;top:300px;width:270px;text-align:center"><span class="a-mark">也沒改</span></div>
        <div class="x a-note b" data-b="end" style="top:378px">換主題，只動 sys 這一層</div>
      </div>`,
      // 6 名字的順序：跟命名結構圖一樣排成七欄，定案後每個 token 都照這個順序
      `<div class="anim__scene" data-s="5">
        <div class="x a-title b" data-b="t">名字照固定的順序組成</div>
        <div class="x a-nbox b b--fade" data-b="hd" style="left:212px;top:82px;width:108px;height:206px"></div>
        <div class="x a-nbox a-nbox--mod b b--fade" data-b="hd" style="left:416px;top:82px;width:352px;height:206px"></div>
        ${NCOLS.map(([l, g, x, w]) => `<div class="x a-nhead a-nhead--${g} b b--fade" data-b="hd" style="left:${x}px;top:92px;width:${w}px">${l}</div>`).join('')}
        ${NROWS.map(nameRow).join('')}
        <div class="x a-nsub b b--fade" data-b="bx" style="left:212px;top:296px;width:108px">只有 comp</div>
        <div class="x a-nsub a-nsub--mod b b--fade" data-b="bx" style="left:416px;top:296px;width:352px">用得到才加，用不到就省略</div>
        <div class="x a-note b" data-b="end" style="top:368px">順序每家公司可以不同，定案後每個 token 都照這個順序</div>
      </div>`
    ].join('')
  };

  /* ================= 1-2 Figma M3 Variables：把寫死的值變成三層 Variables ================= */
  // 名字照 Mini Shop 定案的順序：元件/角色/變體/目標/狀態（前綴 shop 和類型由集合決定，這裡省略）
  const PROPS = [
    ['Fill', '#111111', 'button/color/primary/container/default'],
    ['Radius', '10', 'button/size/corner'],
    ['Padding', '12 · 20', 'button/spacing/padding'],
    ['Text', '15 · Semibold', 'font/label/md'],
    ['Shadow', '0 4 8', 'elevation/1']
  ];
  const HEX = [['#111111', 70, 108], ['#111111', 214, 140], ['#F2F2F2', 92, 190], ['#111111', 234, 232], ['#F2F2F2', 82, 272], ['#121212', 222, 312]];
  const VTABS = [
    { head: ['名稱（shop/ref/…）', '值'], rows: [['color/neutral/5', '#111111', '#111111'], ['color/neutral/95', '#F2F2F2', '#F2F2F2'], ['color/neutral/100', '#FFFFFF', '#FFFFFF'], ['size/10', '10', '']] },
    { head: ['名稱（shop/sys/…）', '指向 Ref'], rows: [['color/primary', 'neutral/5', '#111111'], ['color/on-primary', 'neutral/100', '#FFFFFF'], ['color/surface', 'neutral/95', '#F2F2F2'], ['size/corner/md', 'size/10', '']] },
    { head: ['名稱（shop/comp/…）', '指向 Sys'], rows: [['button/color/primary/container/default', 'primary', '#111111'], ['button/color/primary/label', 'on-primary', '#FFFFFF'], ['button/size/corner', 'size/corner/md', '']] }
  ];
  const sw = h => (h ? `<i style="background:${h}"></i>` : '');
  const ORD = [['button', '元件'], ['color', '角色'], ['primary', '變體'], ['container', '目標'], ['default', '狀態']];

  DSC.ANIMS.vars12 = {
    length: '約 1 分鐘',
    poster: 8200,
    scenes: [
      {
        title: '寫死的值', dur: 11,
        caption: '設計稿裡的「加入購物車」按鈕，顏色、圓角、間距、字級、陰影都是直接寫上去的數字。要改一次主色，就得找遍每一個按鈕。',
        beats: [[0.2, 't'], [0.8, 'frame'], [1.6, 'panel'], [2.2, 'v0'], [2.7, 'v1'], [3.2, 'v2'], [3.7, 'v3'], [4.2, 'v4'], [5.6, 'hard'], [7.6, 'end']]
      },
      {
        title: '收集數值', dur: 13,
        caption: 'figma-m3-variables 先收集設計稿裡所有的值：一模一樣的自動合併；兩個幾乎一樣的黑色，就放到比對板上，由你決定要不要合併。',
        beats: [[0.2, 't'], [0.8, 'h0'], [1.3, 'h1'], [1.8, 'h2'], [2.3, 'h3'], [2.8, 'h4'], [3.3, 'h5'], [4.4, 'mg'], [4.4, 'same', 'is-done'], [6.4, 'cmp'], [6.4, 'h5', 'is-done'], [8.4, 'you']]
      },
      {
        title: '建立 Variables', dur: 14,
        caption: '接著建立三層 Variables：Ref 放原始值、Sys 放用途、Comp 給元件用，名字照你們定案的順序：元件、角色、變體、目標、狀態。文字變成 Text Style，陰影變成 Effect Style。',
        beats: [[0.2, 't'], [0.8, 'vp'], [1.4, 'col0', 'is-hot', 4.4], [1.6, 'tab0'], [4.6, 'tab0', 'is-out'], [4.4, 'col1', 'is-hot', 7.4], [4.6, 'tab1'], [7.6, 'tab1', 'is-out'],
          [7.4, 'col2', 'is-hot'], [7.6, 'tab2'], [9.0, 'ord'], [9.4, 'o0'], [9.8, 'o1'], [10.2, 'o2'], [10.6, 'o3'], [11.0, 'o4'], [11.8, 'st']]
      },
      {
        title: '綁定', dur: 12.5,
        caption: '把 Variables 綁回按鈕上。只是讀取不會打擾你；要綁定之前，skill 會先列出對照表，等你點頭才套用。會改到外觀的變更，例如合併相近的值，還會附上比對圖一組一組問你。',
        beats: [[0.2, 't'], [0.6, 'frame'], [0.6, 'panel'], [1.8, 'ask'], [3.4, 'you'], [4.4, 'bd0', 'is-go'], [5.0, 'bd1', 'is-go'], [5.6, 'bd2', 'is-go'], [6.2, 'bd3', 'is-go'], [6.8, 'bd4', 'is-go'], [8.4, 'end']]
      },
      {
        title: '截圖比對', dur: 10,
        caption: '最後截圖比對綁定前後的樣子。外觀一樣才算完成；有差異，skill 會回報給你，不會硬改。',
        beats: [[0.2, 't'], [0.8, 'before'], [1.8, 'after'], [3.0, 'scan', 'is-go', 5.0], [5.0, 'scan', 'is-done'], [5.0, 'eq'], [5.6, 'res'], [7.2, 'end']]
      }
    ],
    html: () => [
      // 1 設計稿裡寫死的值
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">設計稿裡，數值都是寫死的</div>
        <div class="x f-frame b b--left" data-b="frame" style="left:60px;top:116px;width:280px;height:200px"><span class="f-frame__label">商品頁 / 加入購物車</span><span class="a-btn">加入購物車</span></div>
        <div class="x f-panel b" data-b="panel" style="left:390px;top:96px;width:350px">
          <p class="f-panel__head">屬性</p>
          ${PROPS.map(([k, v], i) => `<div class="f-row b b--left" data-b="v${i}"><b>${k}</b><span class="f-val">${v}</span><span class="f-hard b b--pop" data-b="hard" style="margin-left:auto">寫死</span></div>`).join('')}
        </div>
        <div class="x a-note a-note--warn b" data-b="end" style="top:384px">改一次主色，就得找遍每一個按鈕</div>
      </div>`,
      // 2 收集數值：一樣的合併，相近的問你
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">先收集：一樣的合併，相近的問你</div>
        ${HEX.map(([h, x, y], i) => `<div class="x a-hx b b--pop" data-b="h${i}${i < 5 ? ' same' : ''}" style="left:${x}px;top:${y}px"><i style="background:${h}"></i>${h}</div>`).join('')}
        <div class="x a-panelcard b" data-b="mg" style="left:430px;top:92px;width:310px">
          <span class="a-box__tag">一模一樣 · 自動合併</span>
          <div class="a-hxrow"><span class="a-hx"><i style="background:#111111"></i>#111111 <em>×3</em></span><span class="a-hx"><i style="background:#F2F2F2"></i>#F2F2F2 <em>×2</em></span></div>
        </div>
        <div class="x a-panelcard b" data-b="cmp" style="left:430px;top:226px;width:310px">
          <span class="a-box__tag">相近的值 · 比對板</span>
          <div class="a-cmp"><span><i style="background:#111111"></i>#111111</span><span><i style="background:#121212"></i>#121212</span><b>要合併嗎？</b></div>
          <div class="a-ask b b--pop" data-b="you">${img('coding-1')}<span class="a-bubble">合併，由我決定</span></div>
        </div>
      </div>`,
      // 3 建立三層 Variables
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">建立三層 Variables</div>
        <div class="x f-vars b" data-b="vp" style="left:50px;top:84px;width:700px">
          <div class="f-vars__side"><p>COLLECTIONS</p><span class="f-col" data-b="col0">Ref</span><span class="f-col" data-b="col1">Sys</span><span class="f-col" data-b="col2">Comp</span></div>
          <div class="f-vars__main">${VTABS.map((t, i) => `<div class="f-tab" data-b="tab${i}"><div class="f-trow f-trow--head"><span>${t.head[0]}</span><span>${t.head[1]}</span></div>${t.rows.map(([n, v, h]) => `<div class="f-trow"><span>${n}</span><span>${sw(h)}${v}</span></div>`).join('')}</div>`).join('')}</div>
        </div>
        <div class="x a-anat a-anat--sm b" data-b="ord" style="left:0;right:0;top:350px"><span class="a-anat__lead">Comp 的名字照定案的順序</span>${ORD.map(([w, l], i) => `${i ? '<i>/</i>' : ''}<span><b>${w}</b><small class="b b--fade" data-b="o${i}">${l}</small></span>`).join('')}</div>
        <div class="x f-styles b" data-b="st" style="left:0;right:0;top:404px"><span class="f-style">文字 → Text Style <code>font/label/md</code></span><span class="f-style">陰影 → Effect Style <code>elevation/1</code></span></div>
      </div>`,
      // 4 綁定：會改外觀的先問你
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">綁定：先給你看對照表</div>
        <div class="x f-frame b b--left" data-b="frame" style="left:40px;top:116px;width:220px;height:140px"><span class="f-frame__label">商品頁 / 加入購物車</span><span class="a-btn">加入購物車</span></div>
        <div class="x a-say a-say--l b b--pop" data-b="ask" style="left:40px;top:280px">照這張對照表綁定，好嗎？</div>
        <div class="x a-ask b b--pop" data-b="you" style="left:120px;top:340px">${img('coding-1')}<span class="a-bubble">好，套用</span></div>
        <div class="x f-panel f-panel--tight b" data-b="panel" style="left:284px;top:96px;width:496px">
          <p class="f-panel__head">屬性</p>
          ${PROPS.map(([k, v, n], i) => `<div class="f-row"><b>${k}</b><span class="a-swap" data-b="bd${i}"><span class="a-swap__old"><span class="f-val">${v}</span><span class="f-hard">寫死</span></span><span class="a-swap__new"><span class="f-var">${n}</span><span class="f-ok">✓ 已綁定</span></span></span></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:392px;left:290px;right:30px">只是讀取，不會打擾你</div>
      </div>`,
      // 5 截圖比對：外觀不變
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">截圖比對：外觀不能變</div>
        <div class="x f-snap b b--left" data-b="before" style="left:90px;top:104px;width:240px"><span class="f-snap__label">綁定前</span><span class="a-btn">加入購物車</span></div>
        <div class="x a-eq b b--pop" data-b="eq" style="left:374px;top:163px">=</div>
        <div class="x f-snap b" data-b="after" style="left:470px;top:104px;width:240px"><span class="f-snap__label">綁定後</span><span class="a-btn">加入購物車</span><span class="a-scan" data-b="scan"></span></div>
        <div class="x b b--pop" data-b="res" style="left:0;right:0;top:300px;text-align:center"><span class="a-result">✓ 差異 0 px · 外觀不變</span></div>
        <div class="x a-note b" data-b="end" style="top:372px">有差異就回報給你，不會硬改</div>
      </div>`
    ].join('')
  };
})();
