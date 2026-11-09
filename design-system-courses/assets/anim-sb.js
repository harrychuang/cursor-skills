/* 4-1、4-2、4-3 的說明動畫：Storybook 介面、建立 Storybook 環境、從設計系統文件生成元件庫
   沿用 anim.js 的播放器；每一幕只講一件事，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）]
   class 前綴 s-（Storybook）：動畫的 CSS 都是全域的，避免跟其他章節撞名
   內容照 design-system-to-storybook 的 template 與腳本、design-system-governance 的停點寫 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  DSC.ANIMS = DSC.ANIMS || {};

  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker></defs></svg>`;
  // 工具列的四個圖示：手機尺寸、背景、量尺、外框（跟 4-1 的模擬 Storybook 一樣）
  const IC = {
    vp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    bg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'
  };
  const CURSOR = '<svg class="s-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.5-6.2 1.3 3.6 6.6-2.6 1.4-3.6-6.6L5 18.6z" fill="#14132B" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const icons = vpKey => `<span class="s-icons">${['vp', 'bg', 'ruler', 'box'].map(k => `<span class="s-ic"${k === 'vp' && vpKey ? ` data-b="${vpKey}"` : ''}>${IC[k]}</span>`).join('')}</span>`;
  // Storybook 側欄：[文字, 類型, data-b]；g 分組、c 元件、i story、on 目前這個 story、off 收起來的元件
  const SIDE_CLS = { g: 's-grp', c: 's-comp', i: 's-it', on: 's-it s-it--on', off: 's-comp s-comp--off' };
  const side = (items, cls = '', key = '', style = '') => `<div class="s-side${cls}"${key ? ` data-b="${key}"` : ''}${style ? ` style="${style}"` : ''}><span class="s-search">搜尋元件…</span>${items.map(([t, k, b]) => `<span class="${SIDE_CLS[k]}"${b ? ` data-b="${b}"` : ''}>${t}</span>`).join('')}</div>`;
  const BUTTON_TREE = [['COMPONENTS', 'g'], ['▾ Button', 'c'], ['Docs', 'i'], ['Default', 'on'], ['Hover', 'i'], ['FocusVisible', 'i'], ['Disabled', 'i'], ['▸ AddToCartSheet', 'off']];
  const win = (url, body, key, style, cls = '') => `<div class="x s-sb b${cls}" data-b="${key}" style="${style}"><div class="a-win__bar"><i></i><i></i><i></i><span>${url}</span></div>${body}</div>`;

  /* ================= 4-1 Storybook 介面、功能列與 Addon ================= */
  const miniSheet = () => `<div class="s-msheet"><div class="s-msheet__top"><span class="s-msheet__th">${DSC.tee('#8FA8C8')}</span><span><b>簡約短袖上衣</b><small>NT$490</small></span></div>
    <span class="s-msheet__chips"><i>S</i><i class="on">M</i><i>L</i></span><span class="s-btn s-btn--off s-btn--block">已售完</span></div>`;
  const STEPS41 = ['打開 App', '找到商品', '按「加入購物車」', '選到售完的尺寸'];
  const STORIES41 = [['default', '預設', ''], ['hover', '滑鼠移上去', ' s-btn--hover'], ['disabled', '停用', ' s-btn--off']];
  const ZONES41 = [['元件目錄', '所有元件和 story'], ['畫布', '真正用程式寫的元件'], ['工具列', '尺寸、背景、量尺、外框'], ['面板', 'Controls 改屬性、Actions 看事件'], ['Docs', '自動整理的說明書']];
  const ADDON41 = [
    { tag: 'Storybook 10 內建', t: '裝好就能用', items: ['Controls', 'Actions', 'Viewport', 'Backgrounds', 'Measure、Outline'] },
    { tag: '課程 template 附', t: 'template 已經裝好', items: ['Docs', 'Figma Export'] },
    { tag: '需要自己加裝', t: '用到再裝', items: ['a11y', 'Vitest'], sub: ['無障礙檢查', '互動測試'], add: true }
  ];
  const ADDON_T = [[0.8, 1.2, 0.3], [3.4, 3.8, 0.4], [5.8, 6.3, 0.5]];
  const addonBeats = () => {
    const b = []; let k = 0;
    ADDON41.forEach((g, gi) => {
      const [gt, first, gap] = ADDON_T[gi];
      b.push([gt, `g${gi}`]);
      g.items.forEach((_, i) => b.push([first + i * gap, `a${k++}`]));
    });
    return b;
  };
  // 四區：每一區亮 2.2 秒，右邊的說明同時亮起；最後一區是 Docs，畫布換成文件頁
  const zoneBeats = () => {
    const b = [];
    ZONES41.forEach((_, i) => {
      const s = 1.4 + i * 2.2;
      b.push([s, `l${i}`], [s, `l${i}`, 'is-hot', i === 4 ? undefined : s + 2.2], [s, `z${i}`, 'is-hot', s + 2.2]);
    });
    return b.concat([[0, 'ct', 'is-hot', 10.2], [10.2, 'dt', 'is-hot'], [10.4, 'dp']]);
  };
  let addonKey = 0;

  DSC.ANIMS.sb41 = {
    length: '約 1 分鐘',
    poster: 8800,
    scenes: [
      {
        title: '元件的展示櫃', dur: 11,
        caption: 'Storybook 是元件的展示櫃兼說明書。想看「已售完」的加入購物車面板，在 App 裡要走好幾步；在 Storybook 裡，點一下就看到。',
        beats: [[0.2, 't'], [0.8, 'app'], [1.4, 'p0'], [2.0, 'p1'], [2.6, 'p2'], [3.2, 'p3'], [3.9, 'r1'], [4.5, 'slow'],
          [5.4, 'sb'], [6.3, 'pick', 'is-hot'], [6.8, 'r2'], [7.3, 'fast'], [8.6, 'end']]
      },
      {
        title: '一種狀態，一個 story', dur: 11,
        caption: '一個元件的一種狀態，就是一個 story。例如 Button 的預設、Hover、停用，各是一個 story，每個都有自己的網址，可以直接傳給同事看。',
        beats: [[0.2, 't'], [0.8, 'side'], [1.2, 'view'],
          [1.8, 'i0', 'is-hot', 4.2], [1.8, 'u0', 'is-in', 4.2], [1.8, 'v0', 'is-in', 4.2],
          [4.2, 'i1', 'is-hot', 6.6], [4.2, 'u1', 'is-in', 6.6], [4.2, 'v1', 'is-in', 6.6],
          [6.6, 'i2', 'is-hot'], [6.6, 'u2'], [6.6, 'v2'], [8.6, 'end']]
      },
      {
        title: '介面四區', dur: 14,
        caption: '介面分四區：左邊是元件目錄，中間是畫布，上面是工具列，下面是面板。每個元件還有一頁 Docs，自動整理說明、屬性表和所有 story。',
        beats: [[0.2, 't'], [0.6, 'win']].concat(zoneBeats())
      },
      {
        title: '改屬性、換尺寸', dur: 12,
        caption: '在 Controls 打開 disabled，按鈕馬上變成停用；按工具列的手機圖示，畫布就換成手機寬度。不用改程式，就能看各種組合。',
        beats: [[0.2, 't'], [0.6, 'win'], [1.4, 'c1'], [1.8, 'r1', 'is-hot', 4.6], [2.4, 'sw', 'is-go'], [2.4, 'val', 'is-go'], [2.8, 'btn', 'is-done'],
          [5.0, 'c2'], [5.4, 'vp', 'is-hot'], [5.8, 'frame', 'is-go'], [8.4, 'end']]
      },
      {
        title: 'Addon：外掛', dur: 12,
        caption: 'Addon 是 Storybook 的外掛。Controls、Viewport 這些已經內建；課程 template 另外裝了 Docs、Figma Export 這些外掛；無障礙檢查（a11y）和互動測試（Vitest）要自己加裝。',
        beats: [[0.2, 't']].concat(addonBeats(), [[8.4, 'end']])
      }
    ],
    html: () => [
      // 1 元件的展示櫃：App 裡要走四步，Storybook 點一下
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">Storybook：元件的展示櫃兼說明書</div>
        <div class="x s-way b b--left" data-b="app" style="left:60px;top:92px;width:320px">
          <span class="a-box__tag">在 App 裡</span><span class="s-badge s-badge--slow b b--pop" data-b="slow">要走 4 步</span>
          <ol class="s-steps">${STEPS41.map((s, i) => `<li class="b b--left" data-b="p${i}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>
          <div class="s-way__res b b--pop" data-b="r1"><span class="s-btn s-btn--off">已售完</span><small>終於看到了</small></div>
        </div>
        <div class="x s-way b" data-b="sb" style="left:420px;top:92px;width:320px">
          <span class="a-box__tag">在 Storybook 裡</span><span class="s-badge s-badge--fast b b--pop" data-b="fast">點一下</span>
          <div class="s-way__sb">${side([['AddToCartSheet', 'c'], ['Default', 'i'], ['SoldOut', 'i', 'pick']], ' s-side--mini')}
            <div class="s-way__canvas"><div class="b b--pop" data-b="r2">${miniSheet()}</div></div></div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">不用打開整個 App，每一種狀態都看得到</div>
      </div>`,
      // 2 一種狀態一個 story：點哪個 story，畫布和網址就換成哪個
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">一種狀態，就是一個 story</div>
        ${side([['COMPONENTS', 'g'], ['▾ Button', 'c'], ['Default', 'i', 'i0'], ['Hover', 'i', 'i1'], ['FocusVisible', 'i'], ['Disabled', 'i', 'i2'], ['▸ AddToCartSheet', 'off']], ' s-side--card s-side--tight x b b--left', 'side', 'left:60px;top:96px;width:190px;height:258px')}
        <div class="x s-view b" data-b="view" style="left:270px;top:96px;width:470px;height:258px">
          <div class="a-win__bar"><i></i><i></i><i></i><div class="s-urls">${STORIES41.map(([k], i) => `<div class="s-url b b--fade" data-b="u${i}">localhost:6006/?path=/story/components-button--<mark>${k}</mark></div>`).join('')}</div></div>
          <div class="s-view__stage">${STORIES41.map(([, label, cls], i) => `<div class="s-state b b--fade" data-b="v${i}"><span class="s-btn s-btn--lg${cls}">加入購物車</span>${i === 1 ? CURSOR : ''}<small>${label}</small></div>`).join('')}</div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">每個 story 都有自己的網址，不用打開整個 App</div>
      </div>`,
      // 3 介面四區：一區一區亮，右邊同步說明；最後打開 Docs
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">Storybook 介面：四區，加上 Docs</div>
        ${win('localhost:6006', `<div class="s-body">${side(BUTTON_TREE, ' s-z', 'z0')}
          <div class="s-main">
            <div class="s-tool s-z" data-b="z2"><span class="s-tabs"><span data-b="ct">Canvas</span><span data-b="dt"><span class="s-z s-z--tab" data-b="z4">Docs</span></span></span>${icons()}</div>
            <div class="s-canvas s-z" data-b="z1"><span class="s-btn">加入購物車</span></div>
            <div class="s-panel s-z" data-b="z3"><div class="s-ptabs"><span class="on">Controls</span><span>Actions</span></div>
              <div class="s-ctl"><code>label</code><span class="s-input">加入購物車</span></div>
              <div class="s-ctl"><code>disabled</code><span class="s-switch"></span></div></div>
            <div class="s-docs b b--fade" data-b="dp"><small>Components / Button</small><b>Button</b><i></i><i class="s-docs__short"></i>
              <div class="s-docs__prev"><span class="s-btn">加入購物車</span></div>
              <div class="s-docs__tbl"><span>屬性</span><span>可以選</span><code>label</code><span>文字</span><code>variant</code><span>filled / outlined</span><code>disabled</code><span>true / false</span></div></div>
          </div></div>`, 'win', 'left:50px;top:84px;width:470px;height:290px')}
        <div class="x" style="left:546px;top:84px;width:210px">${ZONES41.map(([n, d], i) => `<div class="s-leg b b--left" data-b="l${i}"><i>${i + 1}</i><b>${n}</b><small>${d}</small></div>`).join('')}</div>
      </div>`,
      // 4 改屬性、換尺寸：Controls 打開 disabled，工具列切到手機
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">Controls 改屬性，工具列換尺寸</div>
        ${win('localhost:6006/?path=/story/components-button--default', `<div class="s-body">${side(BUTTON_TREE)}
          <div class="s-main">
            <div class="s-tool"><span class="s-tabs"><span class="is-hot">Canvas</span><span>Docs</span></span>${icons('vp')}</div>
            <div class="s-canvas"><div class="s-frame" data-b="frame"><span class="s-btn" data-b="btn">加入購物車</span></div></div>
            <div class="s-panel"><div class="s-ptabs"><span class="on">Controls</span><span>Actions</span></div>
              <div class="s-ctl"><code>label</code><span class="s-input">加入購物車</span></div>
              <div class="s-ctl" data-b="r1"><code>disabled</code><span class="s-swrow"><span class="s-switch" data-b="sw"></span><span class="a-swap" data-b="val"><span class="a-swap__old"><code>false</code></span><span class="a-swap__new"><code>true</code></span></span></span></div></div>
          </div></div>`, 'win', 'left:60px;top:84px;width:520px;height:284px')}
        <div class="x s-call b b--left" data-b="c2" style="left:598px;top:108px"><i>2</i>切到手機尺寸</div>
        <div class="x s-call b b--left" data-b="c1" style="left:598px;top:332px"><i>1</i>打開 disabled</div>
        <div class="x a-note b" data-b="end" style="top:386px">不用改程式，就能看各種組合</div>
      </div>`,
      // 5 Addon：內建、template 附、要自己加裝
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">Addon：幫 Storybook 加功能的外掛</div>
        ${(addonKey = 0, ADDON41.map((g, gi) => `<div class="x s-addcol${g.add ? ' s-addcol--add' : ''} b b--pop" data-b="g${gi}" style="left:${50 + gi * 240}px;top:92px;width:220px">
          <span class="s-addcol__tag">${g.tag}</span><b>${g.t}</b>
          ${g.items.map((n, i) => `<span class="s-addon b b--left" data-b="a${addonKey++}">${g.add ? '<i>＋</i>' : ''}${n}${g.sub ? `<small>${g.sub[i]}</small>` : ''}</span>`).join('')}
        </div>`).join(''))}
        <div class="x a-note b" data-b="end" style="top:384px">內建的直接用；要檢查無障礙、跑互動測試，再自己加裝</div>
      </div>`
    ].join('')
  };

  /* ================= 4-2 建立 Storybook 環境 ================= */
  const TREE42 = [['.storybook/', 'Storybook 設定好了'], ['tokens/', '三層 token 範本'], ['design-system/', '放設計系統文件'], ['src/components/', '元件放這裡'], ['src/stories/foundations/', 'token 說明頁']];
  // init-template 換掉的地方：template 的前綴是 sbt
  const DIFF42 = [
    ['專案名字', 'package.json', '"name": "storybook-template"', '"name": "mini-shop"'],
    ['token 前綴', 'tokens/*.css', '--sbt-sys-color-surface', '--shop-sys-color-surface'],
    ['設定檔', '.storybook/project.config.ts', 'tokenPrefix: "sbt"', 'tokenPrefix: "shop"']
  ];
  // 第 3 部產出的檔案：[檔名, 放進哪個資料夾]
  const MOVE42 = [['DESIGN_PRINCIPLES.md', 0], ['TOKEN_ARCHITECTURE.md', 0], ['components/', 0], ['tokens-ref.css', 1], ['tokens-sys.css', 1], ['tokens-comp.css', 1]];
  const moveBeats = () => MOVE42.flatMap((_, i) => { const s = 2.2 + i * 0.55; return [[s, `m${i}`, 'is-done'], [s, `n${i}`]]; });
  const CAT42 = [['ref', '--shop-ref-color-neutral-5', '<i style="background:#111111"></i>#111111'], ['sys', '--shop-sys-color-primary', '→ neutral-5'], ['comp', '--shop-comp-button-color-primary-container-default', '→ primary']];

  DSC.ANIMS.env42 = {
    length: '約 1 分鐘',
    poster: 6000,
    scenes: [
      {
        title: '課程 template', dur: 11,
        caption: '課程 template 是一個設定好的 Storybook 工作區，用的是 React、Vite 和 Storybook 10。token、設計系統資料夾和 Foundations 說明頁都準備好了，你只要換名字，再放進自己的設計系統。',
        beats: [[0.2, 't'], [0.8, 'art'], [1.2, 'tree'], [1.8, 'r0'], [2.4, 'r1'], [3.0, 'r2'], [3.6, 'r3'], [4.2, 'r4'], [5.6, 'r1', 'is-hot'], [5.6, 'r2', 'is-hot'], [7.6, 'end']]
      },
      {
        title: '確認 Node 版本', dur: 12,
        caption: '先用 node -v 確認版本，要 22.18 以上。版本太舊，會漏裝需要的原生套件，Storybook 啟動時就出現 oxc-parser 錯誤。版本對了，再執行 npm install。',
        beats: [[0.2, 't'], [0.8, 'term'], [1.4, 'o0'], [2.2, 'o1'], [3.0, 'warn'], [5.0, 'o2'], [5.6, 'o3'], [6.4, 'o4'], [7.4, 'o5'], [8.4, 'o6'], [9.4, 'end']]
      },
      {
        title: '換成自己的前綴', dur: 12,
        caption: 'init-template 會把專案名字和 token 前綴換成你的。template 原本的前綴是 sbt，換完以後，設定檔和 token 都變成 shop 開頭。',
        beats: [[0.2, 't'], [0.8, 'cmd'], [2.0, 'tbl'], [2.6, 'd0'], [3.4, 'x0', 'is-done'], [3.6, 'w0'], [4.6, 'd1'], [5.4, 'x1', 'is-done'], [5.6, 'w1'],
          [6.6, 'd2'], [7.4, 'x2', 'is-done'], [7.6, 'w2'], [9.0, 'end']]
      },
      {
        title: '放進設計系統，先存檔', dur: 11,
        caption: '把第 3 部產出的設計系統文件放進 design-system/，token 放進 tokens/。動手做元件之前，先存檔一次；之後改壞了，隨時回得來。',
        beats: [[0.2, 't'], [0.8, 'src'], [1.4, 'fd'], [1.4, 'ft'], [1.6, 'arr']].concat(moveBeats(), [[6.2, 'save'], [7.2, 'ok']])
      },
      {
        title: '啟動 Storybook', dur: 11,
        caption: '執行 npm run storybook，打開 localhost:6006。在側欄的 Foundations 找到 Token Catalog，看得到 ref、sys、comp 三層 token，環境就建好了。',
        beats: [[0.2, 't'], [0.8, 'cmd'], [1.8, 'out'], [2.8, 'win'], [4.0, 'k0'], [4.6, 'k1'], [5.2, 'k2'], [6.6, 'ok'], [7.6, 'end']]
      }
    ],
    html: () => [
      // 1 課程 template：設定好的工作區，裡面有什麼
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">課程 template：設定好的 Storybook 工作區</div>
        <div class="x s-art b b--pop" data-b="art" style="left:76px;top:116px;width:170px">${img('folder')}<span class="s-fname">storybook-template</span></div>
        <div class="x s-tree b" data-b="tree" style="left:280px;top:90px;width:460px">
          <div class="s-tree__head"><span>裡面已經準備好</span><span class="s-stack"><i>React</i><i>Vite</i><i>Storybook 10</i></span></div>
          ${TREE42.map(([d, t], i) => `<div class="s-trow b b--left" data-b="r${i}"><span class="s-dir"></span><code>${d}</code>${i === 1 || i === 2 ? '<em>換成你的</em>' : ''}<small>${t}</small></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">換名字、放進自己的設計系統，就能開始用</div>
      </div>`,
      // 2 確認 Node 版本：太舊會漏裝原生套件
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">先確認 Node 版本：22.18 以上</div>
        <div class="x s-term b" data-b="term" style="left:80px;top:88px;width:470px">
          <div class="s-tl b b--fade" data-b="o0"><span class="s-ps">$</span>node -v</div>
          <div class="s-tl b b--fade" data-b="o1">v20.11.1<em class="s-bad">太舊</em></div>
          <div class="s-tl s-tl--sep b b--fade" data-b="o2">升級 Node 之後</div>
          <div class="s-tl b b--fade" data-b="o3"><span class="s-ps">$</span>node -v</div>
          <div class="s-tl b b--fade" data-b="o4">v22.18.0<em class="s-good">✓ 22.18 以上</em></div>
          <div class="s-tl b b--fade" data-b="o5"><span class="s-ps">$</span>npm install</div>
          <div class="s-tl s-tl--ok b b--fade" data-b="o6">✓ 套件安裝完成</div>
        </div>
        <div class="x s-warn b b--pop" data-b="warn" style="left:574px;top:118px;width:176px"><b>版本太舊會怎樣？</b><p>漏裝需要的原生套件，Storybook 啟動時出現 <code>oxc-parser</code> 錯誤</p></div>
        <div class="x a-note b" data-b="end" style="top:384px">先確認版本，再安裝套件</div>
      </div>`,
      // 3 換成自己的名字和前綴：sbt → shop
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">換成自己的名字和前綴</div>
        <div class="x s-cmd b" data-b="cmd" style="left:50px;top:86px;width:700px"><span class="s-ps">$</span>npm run init-template -- --name "Mini Shop" --prefix shop</div>
        <div class="x s-diff b" data-b="tbl" style="left:50px;top:150px;width:700px"><p class="s-diff__head">init-template 換掉了什麼</p>
          ${DIFF42.map(([k, f, o, n], i) => `<div class="s-drow b b--left" data-b="d${i}"><span class="s-drow__k"><b>${k}</b><small>${f}</small></span><code class="s-old" data-b="x${i}">${o}</code><span class="s-newwrap b b--left" data-b="w${i}"><i class="s-to">→</i><code class="s-new">${n}</code></span></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">template 原本的前綴是 sbt，換完都變成 shop</div>
      </div>`,
      // 4 放進設計系統，先存檔：文件進 design-system/，token 進 tokens/
      `<div class="anim__scene" data-s="3">${arrowDefs('s-ar42')}
        <div class="x a-title b" data-b="t">放進你的設計系統，先存檔一次</div>
        <div class="x s-files s-files--compact b b--left" data-b="src" style="left:60px;top:88px;width:290px"><p class="s-files__head">第 3 部產出的檔案</p>
          ${MOVE42.map(([n, to], i) => `<div class="s-file" data-b="m${i}"><span class="${n.endsWith('/') ? 's-dir' : 's-fic'}"></span><code>${n}</code><small>${to ? 'token' : '文件'}</small></div>`).join('')}
        </div>
        <svg class="x b b--fade" data-b="arr" style="left:356px;top:184px" width="58" height="30" viewBox="0 0 58 30" aria-hidden="true"><path class="a-dash" d="M4 15 H50" marker-end="url(#s-ar42)"/></svg>
        ${['design-system/', 'tokens/'].map((d, fi) => `<div class="x s-folder b" data-b="${fi ? 'ft' : 'fd'}" style="left:420px;top:${fi ? 206 : 88}px;width:320px"><p class="s-folder__head"><span class="s-dir"></span>${d}</p>
          <div class="s-folder__in">${MOVE42.map(([n, to], i) => to === fi ? `<span class="s-chip b b--left" data-b="n${i}">${n}</span>` : '').join('')}</div></div>`).join('')}
        <div class="x s-save b" data-b="save" style="left:60px;top:334px;width:680px"><span class="s-ps">$</span>git add -A &amp;&amp; git commit -m "放入設計系統"<span class="s-saved b b--pop" data-b="ok">✓ 存檔點：改壞了回得來</span></div>
      </div>`,
      // 5 啟動 Storybook：Token Catalog 看得到三層 token
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">啟動 Storybook，看到三層 token</div>
        <div class="x s-cmd b" data-b="cmd" style="left:40px;top:84px;width:720px"><span class="s-ps">$</span>npm run storybook<span class="s-cmd__out b b--fade" data-b="out">Local: http://localhost:6006/</span></div>
        ${win('localhost:6006/?path=/docs/foundations-token-catalog--docs', `<div class="s-body s-body--wide">${side([['FOUNDATIONS', 'g'], ['Color Guides', 'i'], ['Typography Guide', 'i'], ['Spacing Guide', 'i'], ['Token Catalog', 'on']])}
          <div class="s-cat"><b class="s-cat__t">Token Catalog</b>
            ${CAT42.map(([l, n, v], i) => `<div class="s-crow b b--left" data-b="k${i}"><span class="a-layer-tag">${l}</span><code>${n}</code><small>${v}</small></div>`).join('')}
          </div></div>`, 'win', 'left:40px;top:146px;width:720px;height:222px')}
        <div class="x s-okstamp b b--pop" data-b="ok" style="left:610px;top:124px">環境建好了！</div>
        <div class="x a-note b" data-b="end" style="top:384px">看得到三層 token，環境就建好了</div>
      </div>`
    ].join('')
  };

  /* ================= 4-3 從設計系統文件自動生成元件庫 ================= */
  // 元件規格 → Figma 節點：右邊故意換個順序，連線才看得出「對回去」
  const SPECS43 = ['button.md', 'stepper.md', 'size-chip.md', 'add-to-cart-sheet.md'];
  const NODES43 = [['AddToCartSheet', '40:2'], ['Button', '12:34'], ['SizeChip', '13:2'], ['Stepper', '12:58']];
  const LINKS43 = [[0, 1], [1, 3], [2, 2], [3, 0]];
  const ROW_Y = [58, 96, 134, 172];
  const linkBeats = () => LINKS43.flatMap(([a, b], i) => { const s = 2.4 + i * 1.0; return [[s, `l${i}`], [s, `sp${a}`, 'is-hot', s + 1.0], [s, `fn${b}`, 'is-hot', s + 1.0]]; });
  // 依賴：面板用到加減器、尺寸選項和按鈕；加減器用到按鈕
  const BLK43 = [['Button', 140, 276], ['Stepper', 50, 186], ['SizeChip', 230, 186], ['AddToCartSheet', 140, 96]];
  const PLAN43 = [['Button', '最多元件用到'], ['Stepper', '用到 Button'], ['SizeChip', '尺寸選項'], ['AddToCartSheet', '用到上面三個']];
  const CSS43 = [['background', '#111111', 'var(--shop-comp-button-color-primary-container-default)'], ['border-radius', '10px', 'var(--shop-comp-button-size-corner)'], ['padding', '12px 20px', 'var(--shop-comp-button-spacing-padding)']];
  const cssBeats = () => CSS43.flatMap((_, i) => [[2.2 + i * 0.6, `h${i}`, 'is-hot', 5.0 + i * 0.6], [5.0 + i * 0.6, `h${i}`, 'is-done'], [5.0 + i * 0.6, `f${i}`, 'is-go']]);
  const TOK43 = [['ref', '--shop-ref-color-neutral-25', '<i style="background:#3B3B3B"></i>#3B3B3B'], ['sys', '--shop-sys-color-hovered', '→ ref neutral-25'], ['comp', '--shop-comp-button-color-primary-container-hovered', '→ sys hovered']];
  const STORY43 = ['Default', 'Hover', 'FocusVisible', 'Disabled'];

  DSC.ANIMS.gen43 = {
    length: '約 1 分鐘',
    poster: 8800,
    scenes: [
      {
        title: '對回設計來源', dur: 11,
        caption: '寫程式之前，trace_sources.mjs 先把每個元件對回原始設計，例如 Figma 上的節點。之後每個 story 都帶著設計稿的連結，隨時可以回去對照。',
        beats: [[0.2, 't'], [0.8, 'specs'], [1.4, 'fig'], [1.8, 'tool']].concat(linkBeats(), [[6.8, 'out'], [7.6, 'param', 'is-hot'], [8.8, 'end']])
      },
      {
        title: '排出建造順序', dur: 12,
        caption: 'plan_component_batches.mjs 照依賴排順序：被用到的先做。Button 被數量加減器和加入購物車面板用到，排第一；面板用到前面三個，排最後。這次只做第一批（B01）的 Button。',
        beats: [[0.2, 't'], [0.8, 'b3'], [1.0, 'b1'], [1.2, 'b2'], [1.4, 'b0'], [2.0, 'arr'], [2.4, 'lg'], [3.4, 'plan'],
          [4.2, 'o0'], [4.2, 'q0'], [5.0, 'o1'], [5.0, 'q1'], [5.8, 'o2'], [5.8, 'q2'], [6.6, 'o3'], [6.6, 'q3'],
          [8.0, 'blk0', 'is-hot'], [8.0, 'q0', 'is-hot'], [8.0, 'pk', 'is-go'], [9.4, 'end']]
      },
      {
        title: 'CSS 只能用 token', dur: 12,
        caption: 'design-system-governance 全程盯著：元件的 CSS 只能用 --shop-sys-* 和 --shop-comp-* token。寫死的 #111111、10px 會被攔下來，連 ref token 也不能直接用。',
        beats: [[0.2, 't'], [0.8, 'code'], [1.4, 'gov']].concat(cssBeats(), [[7.6, 'rules'], [9.0, 'end']])
      },
      {
        title: '缺 token 先問你', dur: 13,
        caption: '做到 Hover 狀態，需要的 comp token 不存在。agent 不會自己亂加，而是用中文停下來問你；缺共用子元件時也一樣。你回答「是」，它才照三層規則新增：comp 指向 sys，sys 指向 ref。',
        beats: [[0.2, 't'], [0.8, 'bot'], [1.4, 'ask'], [2.4, 'miss'], [3.4, 'q'], [5.6, 'yes'], [6.6, 'tok'], [7.2, 'z0'], [8.0, 'z1'], [8.8, 'z2']]
      },
      {
        title: '四種 story 和 Docs', dur: 12,
        caption: '元件、樣式和 story 放在同一個資料夾。可以互動的元件，例如 Button，有 Default、Hover、FocusVisible、Disabled 四種 story；加上 tags: ["autodocs"]，Docs 頁就自動產生。這次跳過了設計比對報告，所以進度表先記 in-progress，比對過才算 done。',
        beats: [[0.2, 't'], [0.8, 'dir'], [1.2, 'fs'], [2.0, 'c0'], [2.6, 'c1'], [3.2, 'side'],
          [3.8, 'e0'], [3.8, 'k1'], [4.4, 'e1'], [4.4, 'k2'], [5.0, 'e2'], [5.0, 'k3'], [5.6, 'e3'], [5.6, 'k4'],
          [6.6, 'k0'], [6.6, 'k0', 'is-hot'], [6.6, 'c0', 'is-hot'], [8.0, 'q'], [9.0, 'nx']]
      }
    ],
    html: () => [
      // 1 對回設計來源：元件規格連到 Figma 節點，story 帶著連結
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">先把每個元件，對回原始設計</div>
        <div class="x s-files s-files--tall b b--left" data-b="specs" style="left:60px;top:92px;width:270px"><p class="s-files__head">design-system/components/</p>
          ${SPECS43.map((n, i) => `<div class="s-file s-file--tall" data-b="sp${i}"><span class="s-fic"></span><code>${n}</code></div>`).join('')}
        </div>
        <div class="x s-tool43 b b--fade" data-b="tool" style="left:336px;top:104px;width:138px">trace_sources.mjs</div>
        <svg class="x" style="left:330px;top:92px" width="150" height="210" viewBox="0 0 150 210" aria-hidden="true">${LINKS43.map(([a, b], i) => `<path class="a-link" data-b="l${i}" d="M2 ${ROW_Y[a]} C 75 ${ROW_Y[a]}, 75 ${ROW_Y[b]}, 148 ${ROW_Y[b]}"/>`).join('')}</svg>
        <div class="x s-files s-files--tall b" data-b="fig" style="left:480px;top:92px;width:260px"><p class="s-files__head"><span class="s-figic"></span>Mini Shop.fig</p>
          ${NODES43.map(([n, id], i) => `<div class="s-file s-file--tall" data-b="fn${i}"><span class="s-frameic">#</span><code>${n}</code><small>node ${id}</small></div>`).join('')}
        </div>
        <div class="x s-out b" data-b="out" style="left:60px;top:316px;width:680px"><code class="s-out__file">STORYBOOK_SOURCE_TRACE.md</code><i class="s-to">→</i><code class="s-out__param" data-b="param">parameters: { figmaSourceUrl: "…?node-id=12-34" }</code></div>
        <div class="x a-note b" data-b="end" style="top:384px">每個 story 都帶著設計稿連結，隨時回去對照</div>
      </div>`,
      // 2 排出建造順序：箭頭是「用到」，被用到的先做
      `<div class="anim__scene" data-s="1">${arrowDefs('s-ar43')}
        <div class="x a-title b" data-b="t">排出建造順序：被用到的先做</div>
        <svg class="x b b--fade" data-b="arr" style="left:40px;top:90px" width="360" height="200" viewBox="0 0 360 200" aria-hidden="true">
          <path class="a-dash" d="M130 50 L88 92" marker-end="url(#s-ar43)"/><path class="a-dash" d="M220 50 L262 92" marker-end="url(#s-ar43)"/>
          <path class="a-dash" d="M175 50 V182" marker-end="url(#s-ar43)"/><path class="a-dash" d="M88 140 L128 182" marker-end="url(#s-ar43)"/></svg>
        ${BLK43.map(([n, x, y], i) => `<div class="x s-blk b b--pop" data-b="b${i} blk${i}" style="left:${x}px;top:${y}px;width:150px">${n}<em class="s-ord b b--pop" data-b="o${i}">${i + 1}</em></div>`).join('')}
        <div class="x s-lg b b--fade" data-b="lg" style="left:50px;top:334px"><i>→</i>箭頭：誰用到誰</div>
        <div class="x s-plan b" data-b="plan" style="left:440px;top:96px;width:300px"><p class="s-plan__head"><code>STORYBOOK_COMPONENT_PLAN.md</code><span class="s-batch">B01</span></p>
          ${PLAN43.map(([n, d], i) => `<div class="s-prow b b--left" data-b="q${i}"><b>${i + 1}</b><code>${n}</code>${i ? `<small>${d}</small>` : `<span class="a-swap" data-b="pk"><span class="a-swap__old"><small>${d}</small></span><span class="a-swap__new"><em>這次只做這個</em></span></span>`}</div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">被用到的先做；這次只做第一個：Button</div>
      </div>`,
      // 3 CSS 只能用 token：寫死的值被攔下來，換成 comp token
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">CSS 只能用 token，不寫死數值</div>
        <div class="x s-code s-code--wide b b--left" data-b="code" style="left:40px;top:86px;width:720px">
          <p class="s-code__f">src/components/Button/Button.css<span class="s-govb b b--pop" data-b="gov">design-system-governance 檢查中</span></p>
          <div class="s-cl">.shop-button {</div>
          ${CSS43.map(([p, v, t], i) => `<div class="s-cl s-cl--in" data-b="h${i}"><span class="a-swap" data-b="f${i}"><span class="a-swap__old">${p}: <mark>${v}</mark>;</span><span class="a-swap__new">${p}: <ins>${t}</ins>;</span></span><em class="s-flag"><span class="s-flag__bad">寫死</span><span class="s-flag__ok">token ✓</span></em></div>`).join('')}
          <div class="s-cl">}</div>
        </div>
        <div class="x s-rules b" data-b="rules" style="left:40px;top:316px;width:720px">
          <span class="s-rule s-rule--ok">可以用<code>--shop-sys-*</code><code>--shop-comp-*</code></span>
          <span class="s-rule s-rule--no">不能用<code>#111111</code><code>10px</code><code>--shop-ref-*</code></span>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">換主題時跟著變，AI 一看名字就知道用途</div>
      </div>`,
      // 4 缺 token 先問你：governance 的固定問句，回答「是」才照三層新增
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">缺 token：先停下來問你</div>
        <div class="x s-bot b b--pop" data-b="bot" style="left:64px;top:92px;width:120px">${img('ai-use-computer')}</div>
        <div class="x s-askcard b b--left" data-b="ask" style="left:220px;top:84px;width:520px">
          <span class="a-box__tag">做 Hover 狀態時</span>
          <p class="s-need">需要 <code>--shop-comp-button-color-primary-container-hovered</code><em class="b b--pop" data-b="miss">找不到</em></p>
          <p class="s-q b b--fade" data-b="q">找不到對應的 design token（sys/comp 層）。是否要先建立這組 token，再繼續元件開發？</p>
        </div>
        <div class="x a-say a-say--r s-yes b b--pop" data-b="yes" style="left:668px;top:162px">是</div>
        <div class="x s-tok3 b" data-b="tok" style="left:60px;top:262px;width:680px"><p class="s-tok3__head">照三層規則新增：comp 指向 sys，sys 指向 ref</p>
          ${TOK43.map(([l, n, v], i) => `<div class="s-crow b b--left" data-b="z${i}"><span class="a-layer-tag">${l}</span><code>${n}</code><small>${v}</small><em class="s-newb">新增</em></div>`).join('')}
        </div>
      </div>`,
      // 5 四種 story 和 Docs：同一個資料夾，做完一個更新進度表
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">Button：四種 story，加一頁 Docs</div>
        <div class="x s-files b b--left" data-b="dir" style="left:60px;top:86px;width:380px"><p class="s-files__head">src/components/Button/</p>
          <div class="s-chips3 b b--fade" data-b="fs"><span class="s-chip">Button.tsx</span><span class="s-chip">Button.css</span><span class="s-chip s-chip--on">Button.stories.tsx</span></div>
          <div class="s-snip">
            <div class="s-sl b b--fade" data-b="c0">tags: ["autodocs"]</div>
            <div class="s-sl b b--fade" data-b="c1">parameters: { figmaSourceUrl }</div>
            ${STORY43.map((s, i) => `<div class="s-sl b b--fade" data-b="e${i}">export const <b>${s}</b></div>`).join('')}
          </div>
        </div>
        ${side([['COMPONENTS', 'g'], ['▾ Button', 'c'], ['Docs', 'i', 'k0']].concat(STORY43.map((s, i) => [s, 'i', `k${i + 1}`])), ' s-side--card s-side--grow x b', 'side', 'left:466px;top:86px;width:274px;height:220px')}
        <div class="x s-queue b" data-b="q" style="left:60px;top:322px;width:680px"><code>STORYBOOK_COMPONENT_QUEUE.md</code><span class="s-batch">B01</span><b>Button</b>
          <em class="s-st">in-progress</em><small class="b b--fade" data-b="nx">沒比對過，先不標 done</small></div>
      </div>`
    ].join('')
  };
})();
