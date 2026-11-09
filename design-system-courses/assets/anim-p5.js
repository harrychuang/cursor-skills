/* 5-1、5-2、5-3 的說明動畫：測試元件與回流 Figma、中央工廠、做成正式產品
   沿用 anim.js 的播放器；每一幕只講一件事，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）]
   class 前綴 p-（Part 5）：動畫的 CSS 都是全域的，避免跟其他章節撞名
   內容照 ui-visual-parity、figma-storybook-sync、design-system-governance 的 SKILL.md 寫 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  DSC.ANIMS = DSC.ANIMS || {};

  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker></defs></svg>`;
  // 往下的虛線箭頭（5-2 工廠 → 三個角色）
  const downArrow = (key, x, y, h, marker) => `<svg class="x b b--fade" data-b="${key}" style="left:${x - 10}px;top:${y}px" width="20" height="${h}" viewBox="0 0 20 ${h}" aria-hidden="true"><path class="a-dash" d="M10 2 V${h - 4}" marker-end="url(#${marker})"/></svg>`;
  // 迷你商品頁：商品圖、名稱、價格、加入購物車；按鈕帶 data-b 才能在動畫裡發亮或變色
  const shop = (btnKey = '', top = '') => `<div class="p-scr">${top}<span class="p-scr__img">${DSC.tee('#8FA8C8')}</span><b>簡約短袖上衣</b><small>NT$490</small><span class="p-btn p-btn--block"${btnKey ? ` data-b="${btnKey}"` : ''}>加入購物車</span></div>`;
  const avatar = k => img(DSC.ROLES[k].img, 'p-av');
  const FIGIC = '<span class="p-figic" aria-hidden="true"></span>';

  /* ================= 5-1 測試元件：視覺比對與回流 Figma ================= */
  // 三種檢查：[名稱, 比什麼, 這一輪的分數, 過了沒]
  const CHECK51 = [
    ['外觀', '顏色、字、圓角、陰影', '100%', true],
    ['位置', '大小，和旁邊的距離', '92.4%', false],
    ['像素', '兩張圖疊起來比', '97.1%', false]
  ];
  const CHECK_IC = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.6" fill="currentColor"/><circle cx="12" cy="7.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="10" r="1.6" fill="currentColor"/><path d="M12 21a3 3 0 0 1 0-6h2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3M3 5v14M21 5v14"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2" fill="currentColor" fill-opacity=".25"/></svg>'
  ];
  // 報告每一種標記的白話說明（報告內容跟 5-1 的練習用同一份 DSC.PARITY）
  const NOTE51 = { fix: '原因：要修', follow: '連帶結果：不用動', leave: '刻意的差異：不要改', untrusted: '量測不可信：先修環境' };
  const ROWS51 = () => (DSC.PARITY || []).slice(0, 4).map(l => [l.id, l.mark, l.k, l.text.replace(/（.*?）/, '')]);
  const LAYER51 = ['Token／主題', '共用元件', '組版', '單一頁面'];
  const CYCLE51 = [['cycle-01', '', 'NOT AT PARITY', '原因 2'], ['cycle-02', '--previous cycle-01', 'NOT AT PARITY', '原因 1'], ['cycle-03', '--previous cycle-02', 'PARITY', '原因 0']];
  const SRC51 = [['上次同步', 'baseline'], ['現在的程式', 'Storybook'], ['現在的 Figma', 'Figma']];
  // [差異, 誰改的, 類別, 交給誰]
  const ROUTE51 = [
    ['Button 圓角 10 → 12', 'Figma 改了', 'token', 'design-system-extractor'],
    ['面板內距 16 → 20', 'Figma 改了', '外觀', 'ui-visual-parity'],
    ['數量加減器的圖示', '兩邊都改了', '衝突', '一筆一筆由你決定']
  ];

  DSC.ANIMS.par51 = {
    length: '約 1 分鐘',
    poster: 9400,
    scenes: [
      {
        title: '量出來，不用猜', dur: 11,
        caption: '元件做好了，跟設計稿一樣嗎？差 4px，眼睛很難看出來。ui-visual-parity 不靠眼睛，而是把設計稿和實作都量出來，一項一項比。',
        beats: [[0.2, 't'], [0.8, 'ref'], [1.4, 'imp'], [2.6, 'eye'], [4.4, 'eye', 'is-out'], [4.6, 'm0'], [5.2, 'm1'], [6.0, 'm2'], [6.6, 'm3'], [7.6, 'tool'], [8.8, 'end']]
      },
      {
        title: '三種檢查', dur: 12,
        caption: '一輪比對做三種檢查：外觀比顏色、字、圓角和陰影；位置比每個東西的大小和間距；像素把兩張圖疊起來比。三種都通過才是 PARITY（一致），有一種沒過就是 NOT AT PARITY。',
        beats: [[0.2, 't'], [0.8, 'c0'], [1.8, 'c1'], [2.8, 'c2'], [4.4, 'v0'], [5.0, 'v1'], [5.6, 'v2'], [6.6, 'term'], [7.4, 'verdict'], [9.0, 'end']]
      },
      {
        title: '看報告：只修 fix', dur: 12,
        caption: '報告裡每一筆都有標記：fix 是原因，要修；↳ 是上面某個原因的連帶結果，不用動，修好原因就會消失；leave 是刻意的差異；? 表示量測不可信，通常是字型沒載入。',
        beats: [[0.2, 't'], [0.8, 'rep'], [1.4, 'r0'], [1.8, 'r1'], [2.2, 'r2'], [2.6, 'r3'], [3.6, 'n0'], [4.8, 'n1'], [6.0, 'n2'], [7.2, 'n3'],
          [8.6, 'r0', 'is-hot'], [8.6, 'r1', 'is-done'], [9.6, 'end']]
      },
      {
        title: '照順序修，修完再量', dur: 13,
        caption: '修的順序是 token → 共用元件 → 組版 → 頁面，先修源頭。每修完一層，就重跑一輪比對，用 --previous 指向上一輪。原因越來越少，直到 PARITY；不再減少，就停下來回報。',
        beats: [[0.2, 't'], [0.8, 'lad'], [1.2, 'k0'], [1.4, 'k1'], [1.6, 'k2'], [1.8, 'k3'], [2.4, 'y0'],
          [3.6, 'k0', 'is-hot', 6.4], [6.4, 'k0', 'is-done'], [5.0, 'y1'],
          [7.0, 'k1', 'is-hot', 9.8], [9.8, 'k1', 'is-done'], [8.4, 'y2'], [10.2, 'pass'], [11.0, 'end']]
      },
      {
        title: '回流 Figma：三方比對', dur: 12,
        caption: '元件可以從 Storybook 匯出到 Figma。之後兩邊都改過時，figma-storybook-sync 拿上次同步、現在的程式和現在的 Figma 三方比對，指出每一筆差異該交給誰。它只分類，不改程式。',
        beats: [[0.2, 't'], [0.8, 'exp'], [2.0, 's0'], [2.5, 's1'], [3.0, 's2'], [3.8, 'lk'], [4.0, 'sync'], [5.0, 'w0'], [6.0, 'w1'], [7.0, 'w2'], [8.6, 'end']]
      }
    ],
    html: () => [
      // 1 量出來，不用猜：設計稿和實作看起來一樣，量了才知道差 4px
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">跟設計稿一樣嗎？量出來，不用猜</div>
        ${[['ref', '設計稿 · Figma', ''], ['imp', '實作 · Storybook', ' p-cmp--imp']].map(([k, tag, cls], i) => `<div class="x p-cmp${cls} b${i ? '' : ' b--left'}" data-b="${k}" style="left:${i ? 470 : 70}px;top:90px;width:260px">
          <span class="a-box__tag">${tag}</span>
          <div class="p-cmp__scr"><span class="p-scr__img">${DSC.tee('#8FA8C8')}</span><b>簡約短袖上衣</b><small>NT$490</small>
            <div class="p-cmp__bar"><span class="p-btn">加入購物車</span>
              <span class="p-cmp__marks"><em class="p-red b b--pop" data-b="m${i}">內距 ${i ? 12 : 16}px</em><em class="p-red b b--pop" data-b="m${i + 2}">高 ${i ? 80 : 84}px</em></span></div></div>
        </div>`).join('')}
        <div class="x a-say p-eye b b--pop" data-b="eye" style="left:342px;top:168px">看起來一樣？</div>
        <div class="x p-tool b" data-b="tool" style="left:150px;top:326px;width:500px"><span class="p-tool__ic">${CHECK_IC[1]}</span><code>ui-visual-parity</code>兩邊都量出來，一項一項比</div>
        <div class="x a-note b" data-b="end" style="top:384px">差 4px，看不出來，但量得出來</div>
      </div>`,
      // 2 三種檢查：外觀、位置、像素，三種都過才是 PARITY
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">一輪比對，做三種檢查</div>
        ${CHECK51.map(([n, d, s, ok], i) => `<div class="x p-chk b b--pop" data-b="c${i}" style="left:${60 + i * 240}px;top:88px;width:200px">
          <span class="p-chk__ic">${CHECK_IC[i]}</span><b>${n}</b><small>${d}</small>
          <em class="p-res ${ok ? 'p-res--ok' : 'p-res--no'} b b--pop" data-b="v${i}">${s} ${ok ? '✓' : '✗'}</em></div>`).join('')}
        <div class="x p-term b" data-b="term" style="left:60px;top:270px;width:680px">
          <div class="p-term__l"><span class="p-verdict b b--pop" data-b="verdict">NOT AT PARITY</span><span class="p-term__sub">三種都通過，才是 <b>PARITY</b></span></div>
          <div class="p-term__l p-term__score">appearance 100% · geometry 92.4% · pixels 97.1%</div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">三種都過關，才算一致</div>
      </div>`,
      // 3 看報告：每一筆的標記告訴你要不要修
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">看報告：只修標成 fix 的原因</div>
        <div class="x p-rep b" data-b="rep" style="left:60px;top:84px;width:680px">
          <p class="p-rep__head"><code>cycle-01 / parity.json</code><span class="p-verdict p-verdict--sm">NOT AT PARITY</span></p>
          ${ROWS51().map(([id, mark, k, text], i) => `<div class="p-row b b--left" data-b="r${i}"><code class="p-row__id">${id}</code><span class="p-mark p-mark--${k}">${mark}</span><span class="p-row__t">${text}</span><em class="p-row__n p-row__n--${k} b b--fade" data-b="n${i}">${NOTE51[k]}</em></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">修好原因，連帶結果會自己消失</div>
      </div>`,
      // 4 照順序修：一層一層修，每修完一層重跑一輪
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">照順序修，每修完一層就再量一次</div>
        <div class="x p-lad b b--left" data-b="lad" style="left:60px;top:86px;width:300px"><p class="p-lad__head">修的順序：先修源頭</p>
          ${LAYER51.map((n, i) => `<div class="p-step b b--left" data-b="k${i}"><i>${i + 1}</i><b>${n}</b><em class="p-step__ok">修好了</em></div>`).join('')}
        </div>
        <div class="x" style="left:400px;top:86px;width:340px">
          ${CYCLE51.map(([f, prev, v, n], i) => `<div class="p-cyc${i === 2 ? ' p-cyc--pass' : ''} b" data-b="y${i}"><span class="p-cyc__dir"></span><span class="p-cyc__main"><code>${f}</code>${prev ? `<small><code>${prev}</code></small>` : '<small>第一輪</small>'}</span><span class="p-cyc__v"><em class="p-verdict p-verdict--sm${i === 2 ? ' p-verdict--ok' : ''}">${v}</em><small>${n}</small></span></div>`).join('')}
        </div>
        <div class="x p-stamp b b--pop" data-b="pass" style="left:612px;top:300px">PARITY ✓</div>
        <div class="x a-note b" data-b="end" style="top:384px">先修源頭，下游的差異常常自己消失</div>
      </div>`,
      // 5 回流 Figma：匯出到 Figma；兩邊都改過，三方比對、分類、交給誰
      `<div class="anim__scene" data-s="4">${arrowDefs('p-ar51')}
        <div class="x a-title b" data-b="t">回流 Figma：兩邊都改過，就三方比對</div>
        <div class="x p-exp b" data-b="exp" style="left:150px;top:96px;width:500px"><span class="p-pill"><span class="p-sbic">S</span>Storybook</span>
          <svg width="150" height="20" viewBox="0 0 150 20" aria-hidden="true"><path class="a-dash" d="M4 10 H140" marker-end="url(#p-ar51)"/></svg><small>Figma Export 匯出</small>
          <span class="p-pill">${FIGIC}Mini Shop.fig</span></div>
        ${SRC51.map(([n, s], i) => `<div class="x p-src b b--pop" data-b="s${i}" style="left:${60 + i * 240}px;top:142px;width:200px"><b>${n}</b><code>${s}</code></div>`).join('')}
        <svg class="x b b--fade" data-b="lk" style="left:60px;top:190px" width="680" height="28" viewBox="0 0 680 28" aria-hidden="true"><path class="p-lk" d="M100 2 C100 18, 340 10, 340 26 M340 2 V26 M580 2 C580 18, 340 10, 340 26"/></svg>
        <div class="x p-sync b b--pop" data-b="sync" style="left:250px;top:214px;width:300px"><code>figma-storybook-sync</code>分類，指出交給誰</div>
        ${ROUTE51.map(([d, who, cat, to], i) => `<div class="x p-route b b--left" data-b="w${i}" style="left:60px;top:${260 + i * 36}px;width:680px"><span class="p-route__d">${d}</span><em class="p-who${i === 2 ? ' p-who--both' : ''}">${who}</em><i class="p-to">→</i><span class="p-cat">${cat}</span><code class="p-route__to">${to}</code></div>`).join('')}
        <div class="x a-note b" data-b="end" style="top:384px">它只分類、指出交給誰，不改程式</div>
      </div>`
    ].join('')
  };

  /* ================= 5-2 中央工廠：每個角色用同一套積木 ================= */
  const ROLE52 = [['designer', '自己畫一套', ' p-btn--d'], ['pm', '原型自己做一套', ' p-btn--p'], ['engineer', '自己再寫一套', ' p-btn--e']];
  const DIFF52 = ['圓角 10px', '直角、灰色', '膠囊形、細字'];
  const BLOCKS52 = ['Button', 'Stepper', 'SizeChip', 'AddToCartSheet'];
  const USE52 = [['designer', '檢查狀態，同步回 Figma'], ['pm', '拼出原型，先驗證流程'], ['engineer', '做正式頁面，接真的資料']];

  DSC.ANIMS.fac52 = {
    length: '約 1 分鐘',
    poster: 9000,
    scenes: [
      {
        title: '各做各的', dur: 11,
        caption: '如果每個角色各做一套：設計師畫一套，PM 的原型再做一套，工程師又寫一套。同一顆「加入購物車」按鈕，做著做著就有三個版本，要改的時候得改三次。',
        beats: [[0.2, 't'], [0.8, 'r0'], [1.6, 'r1'], [2.4, 'r2'], [4.0, 'x0'], [4.6, 'x1'], [5.2, 'x2'], [6.6, 'warn'], [8.4, 'end']]
      },
      {
        title: '中央工廠', dur: 12,
        caption: '第 4 部說過，Storybook 元件庫是產品的中央工廠。token 和元件只在這裡做一次（4-3），驗收一次（5-1），每個角色都從這裡拿。',
        beats: [[0.2, 't'], [0.8, 'fac'], [1.8, 'tk'], [2.6, 'b0'], [3.0, 'b1'], [3.4, 'b2'], [3.8, 'b3'], [5.2, 'g0'], [6.2, 'g1'], [7.4, 'ok'], [8.8, 'end']]
      },
      {
        title: '同一套積木，三種用法', dur: 13,
        caption: '每個角色都從工廠拿同一套積木：設計師在 Storybook 檢查每個狀態，再同步回 Figma；PM 拼出能點的原型，先驗證流程；工程師用同一批元件做正式頁面，接上真的資料。',
        beats: [[0.2, 't'], [0.6, 'bar'], [1.4, 'a0'], [1.8, 'u0'], [4.0, 'a1'], [4.4, 'u1'], [6.6, 'a2'], [7.0, 'u2'],
          [9.0, 'hb', 'is-hot'], [9.0, 'h0', 'is-hot'], [9.0, 'h1', 'is-hot'], [9.0, 'h2', 'is-hot'], [10.0, 'end']]
      },
      {
        title: '原型直接變產品', dur: 12,
        caption: '原型和產品用的是同一批積木。PM 驗證過的原型，接上真的資料，就能往正式產品走，不用再重畫一次。',
        beats: [[0.2, 't'], [0.8, 'pr'], [2.2, 'ok'], [3.4, 'arr'], [4.2, 'no'], [5.4, 'prod'], [6.8, 'hp', 'is-hot'], [6.8, 'hq', 'is-hot'], [7.6, 'same'], [9.0, 'end']]
      },
      {
        title: '改一次，全部跟著變', dur: 12,
        caption: '改一個 token，例如把主色從經典黑換成週年慶紅，Figma、原型和正式頁面一起變，不用各改一次。缺積木的時候，先補進工廠，不在頁面裡另做一個。',
        beats: [[0.2, 't'], [0.8, 'code'], [1.4, 'o0'], [1.6, 'o1'], [1.8, 'o2'], [3.0, 'sw', 'is-go'], [3.4, 'q0', 'is-go'], [3.4, 'q1', 'is-go'], [3.4, 'q2', 'is-go'], [4.4, 'ck'],
          [6.0, 'miss'], [7.0, 'into'], [8.0, 'nope'], [9.4, 'end']]
      }
    ],
    html: () => [
      // 1 各做各的：三個角色各做一顆按鈕，長得都不一樣
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">各做各的：同一顆按鈕，三個版本</div>
        ${ROLE52.map(([k, d, cls], i) => `<div class="x p-role b" data-b="r${i}" style="left:${60 + i * 240}px;top:86px;width:200px">
          <div class="p-role__who">${avatar(k)}<span><b>${DSC.ROLES[k].name}</b><small>${d}</small></span></div>
          <div class="p-role__stage"><span class="p-btn${cls}">加入購物車</span></div>
          <em class="p-diff b b--pop" data-b="x${i}">${DIFF52[i]}</em></div>`).join('')}
        <div class="x p-warn b b--pop" data-b="warn" style="left:170px;top:318px;width:460px">三個版本，哪一個才對？</div>
        <div class="x a-note b" data-b="end" style="top:384px">要改的時候，得改三次</div>
      </div>`,
      // 2 中央工廠：token 和元件只做一次、驗收一次
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">中央工廠：做一次，驗收一次</div>
        <div class="x p-fac b b--pop" data-b="fac" style="left:130px;top:84px;width:540px">
          <div class="p-fac__head">${img('play-lego', 'p-fac__art')}<span><b>Storybook 元件庫</b><small>第 4 部：產品的中央工廠</small></span></div>
          <div class="p-fac__row b b--fade" data-b="tk"><span class="p-fac__k">token</span><span class="a-layer-tag">ref</span><i class="p-to">→</i><span class="a-layer-tag">sys</span><i class="p-to">→</i><span class="a-layer-tag">comp</span></div>
          <div class="p-fac__row"><span class="p-fac__k">元件</span>${BLOCKS52.map((n, i) => `<span class="p-blk b b--pop" data-b="b${i}">${n}</span>`).join('')}</div>
          <div class="p-fac__row"><span class="p-gate b b--left" data-b="g0"><i>4-3</i>做一次</span><span class="p-gate b b--left" data-b="g1"><i>5-1</i>驗收一次</span></div>
        </div>
        <div class="x p-stamp b b--pop" data-b="ok" style="left:560px;top:100px">PARITY ✓</div>
        <div class="x a-note b" data-b="end" style="top:384px">token 和元件，只在這裡做一次</div>
      </div>`,
      // 3 同一套積木，三種用法：工廠往下發給三個角色
      `<div class="anim__scene" data-s="2">${arrowDefs('p-ar52')}
        <div class="x a-title b" data-b="t">同一套積木，三種用法</div>
        <div class="x p-bar b" data-b="bar" style="left:120px;top:80px;width:560px"><b>Storybook 元件庫</b>${BLOCKS52.map((n, i) => `<span class="p-blk p-blk--sm"${i ? '' : ' data-b="hb"'}>${n}</span>`).join('')}</div>
        ${[160, 400, 640].map((x, i) => downArrow(`a${i}`, x, 132, 38, 'p-ar52')).join('')}
        ${USE52.map(([k, d], i) => `<div class="x p-use b" data-b="u${i}" style="left:${60 + i * 240}px;top:172px;width:200px">
          <div class="p-role__who p-role__who--sm">${avatar(k)}<span><b>${DSC.ROLES[k].name}</b><small>${d}</small></span></div>
          ${i === 0 ? `<div class="p-states"><span class="p-st"><span class="p-btn p-btn--xs" data-b="h0">加入</span><small>Default</small></span><span class="p-st"><span class="p-btn p-btn--xs p-btn--hover">加入</span><small>Hover</small></span><span class="p-st"><span class="p-btn p-btn--xs p-btn--off">加入</span><small>Disabled</small></span></div><span class="p-pill p-pill--sm">${FIGIC}同步回 Figma</span>`
            : i === 1 ? `<div class="p-phone p-phone--xs"><span class="p-fake">假資料</span>${shop('h1')}</div>`
              : `<div class="p-web p-web--xs"><p class="p-web__bar"><i></i><i></i><i></i></p><div class="p-web__in"><code class="p-api">GET /api/products/42</code><span class="p-btn p-btn--block p-btn--sm" data-b="h2">加入購物車</span></div></div>`}
        </div>`).join('')}
        <div class="x a-note b" data-b="end" style="top:384px">大家拿的，都是同一顆 Button</div>
      </div>`,
      // 4 原型直接變產品：同一批元件，接上真的資料就好
      `<div class="anim__scene" data-s="3">${arrowDefs('p-ar52b')}
        <div class="x a-title b" data-b="t">原型驗證過，接上真的資料就是產品</div>
        <div class="x p-side b b--left" data-b="pr" style="left:90px;top:84px;width:210px"><span class="a-box__tag">PM 的原型 · 假資料</span>
          <div class="p-phone"><span class="p-fake">假資料</span>${shop('hp')}</div></div>
        <div class="x p-stamp p-stamp--sm b b--pop" data-b="ok" style="left:214px;top:122px">流程驗證過 ✓</div>
        <div class="x p-flow b b--fade" data-b="arr" style="left:316px;top:178px;width:160px"><small>接上真的資料</small>
          <svg width="150" height="20" viewBox="0 0 150 20" aria-hidden="true"><path class="a-dash" d="M4 10 H140" marker-end="url(#p-ar52b)"/></svg></div>
        <div class="x p-nope b b--pop" data-b="no" style="left:340px;top:232px">重畫一次</div>
        <div class="x p-side b" data-b="prod" style="left:490px;top:84px;width:250px"><span class="a-box__tag">正式頁面 · 真的資料</span>
          <div class="p-web"><p class="p-web__bar"><i></i><i></i><i></i><span>shop.example.com/products/42</span></p><div class="p-web__in"><code class="p-api">GET /api/products/42 → 200</code>${shop('hq')}</div></div></div>
        <div class="x p-same b b--pop" data-b="same" style="left:250px;top:334px;width:300px">用的是同一批元件</div>
        <div class="x a-note b" data-b="end" style="top:384px">驗證過的畫面，不用重畫</div>
      </div>`,
      // 5 改一次，全部跟著變：主色 token 換成週年慶紅，三邊一起變；缺積木先補進工廠
      `<div class="anim__scene" data-s="4">${arrowDefs('p-ar52c')}
        <div class="x a-title b" data-b="t">改一次 token，全部跟著變</div>
        <div class="x p-code1 b" data-b="code" style="left:90px;top:80px;width:620px"><span class="p-code1__k">--shop-sys-color-primary:</span>
          <span class="a-swap" data-b="sw"><span class="a-swap__old"><code>var(--shop-ref-color-neutral-5)</code><em class="p-hex"><i style="background:#111111"></i>經典黑</em></span><span class="a-swap__new"><code>var(--shop-ref-color-red-47)</code><em class="p-hex"><i style="background:#D7263D"></i>週年慶紅</em></span></span></div>
        ${[['designer', '設計師 · Figma'], ['pm', 'PM · 原型'], ['engineer', '工程師 · 正式頁面']].map(([k, n], i) => `<div class="x p-out b b--pop" data-b="o${i}" style="left:${60 + i * 240}px;top:146px;width:200px">
          <span class="p-out__h">${avatar(k)}${n}</span><span class="p-btn p-btn--lg" data-b="q${i}">加入購物車</span><em class="p-ck b b--pop" data-b="ck">一起變了 ✓</em></div>`).join('')}
        <div class="x p-miss b" data-b="miss" style="left:60px;top:312px;width:680px"><span class="p-miss__q">缺積木？</span>
          <span class="p-blk p-blk--new b b--pop" data-b="miss">CouponField</span>
          <svg class="b b--fade" data-b="into" width="70" height="20" viewBox="0 0 70 20" aria-hidden="true"><path class="a-dash" d="M4 10 H60" marker-end="url(#p-ar52c)"/></svg>
          <span class="p-in b b--pop" data-b="into">先補進工廠</span>
          <span class="p-nope p-nope--inline b b--pop" data-b="nope">在頁面裡另做一個</span></div>
        <div class="x a-note b" data-b="end" style="top:384px">改一次，三邊一起變</div>
      </div>`
    ].join('')
  };

  /* ================= 5-3 做成正式產品：先查再做 ================= */
  const TREE53 = [['tokens/', 'ref · sys · comp 三層', 'dir'], ['src/components/', '共用元件', 'dir'], ['locales/zh-TW.json', '畫面文字（文案檔）', 'file']];
  const COMPS53 = ['Button', 'Stepper', 'SizeChip', 'AddToCartSheet', 'ProductCard', 'TopBar'];
  // 新畫面「購物車」的區塊，跟 5-3 的練習用同一份 DSC.COV：ok 可以直接用、variant 要加 variant、missing 元件庫沒有
  const COV53 = DSC.COV || [];
  const COV_CLS = { ok: 'is-done', variant: 'is-hot', missing: 'is-go' };
  const covBeats = () => COV53.map((b, i) => [2.0 + i * 0.4, `k${i}`, COV_CLS[b.st]]);
  const STORY53 = ['Default', 'Hover', 'FocusVisible', 'Disabled'];
  // 組頁面的程式：[程式, 標籤, 標籤的種類]
  const CODE53 = [
    ['const { items, status } = useCart()', 'GET /api/cart', 'api'],
    ['&lt;TopBar title={t("cart.title")} /&gt;', '文案檔', 'txt'],
    ['&lt;Button&gt;{t("cart.checkout")}&lt;/Button&gt;', '共用元件', 'cmp'],
    ['background: var(--shop-sys-color-surface);', 'token ✓', 'tok']
  ];
  // governance 的回報：[種類, 內容, 為什麼]
  const REPORT53 = [
    ['重用', 'TopBar、ProductCard、Stepper、Button', 'token 全部沿用，沒有新增'],
    ['加 variant', 'ProductCard「橫式」', '購物車要橫的商品卡'],
    ['新建', 'CouponField', '元件庫裡沒有，你確認過'],
    ['story', 'CouponField 四種、ProductCard 橫式', '在 Storybook 看得到']
  ];
  const RAIL53 = ['Token', 'Figma 整理', '文件', 'Storybook', '產品'];
  const railBeats = () => {
    const b = [];
    RAIL53.forEach((_, i) => { b.push([4.4 + i * 0.45, `d${i}`, 'is-done']); if (i) b.push([4.2 + i * 0.45, `seg${i - 1}`]); });
    return b.concat([[6.6, 'd4', 'is-hot']]);
  };

  DSC.ANIMS.gov53 = {
    length: '約 1 分鐘',
    poster: 8800,
    scenes: [
      {
        title: 'Phase 0：先看專案', dur: 11,
        caption: '做正式產品之前，design-system-governance 先跑 Phase 0：找出 token 的前綴和分層、有哪些共用元件、畫面文字放在哪個文案檔。先記下來，再開始寫。',
        beats: [[0.2, 't'], [0.8, 'bot'], [1.2, 'tree'], [1.6, 'd0'], [2.0, 'd1'], [2.4, 'd2'],
          [3.2, 'd0', 'is-hot', 4.6], [3.6, 'f0'], [4.6, 'd1', 'is-hot', 6.0], [5.0, 'f1'], [6.0, 'd2', 'is-hot', 7.4], [6.4, 'f2'], [8.2, 'end']]
      },
      {
        title: '先查現有元件', dur: 13,
        caption: '新畫面「購物車」進來了。governance 先對照元件庫，列出可以直接用的、需要加 variant 的、還缺的元件，然後停下來等你確認，先不寫程式。',
        beats: [[0.2, 't'], [0.8, 'scr']].concat(covBeats(), [[5.0, 'lst'], [5.4, 'g0'], [6.4, 'g1'], [7.4, 'g2'], [8.8, 'stop'], [10.4, 'end']])
      },
      {
        title: '缺元件，先補進元件庫', dur: 13,
        caption: '優惠券輸入框在元件庫裡沒有。governance 不會在頁面裡隨手寫一個，而是停下來問你；你回答「是」，它先把 CouponField 補進 Storybook 的共用元件庫，加上 story，再回來組頁面。',
        beats: [[0.2, 't'], [0.8, 'bot'], [1.4, 'ask'], [2.2, 'miss'], [3.2, 'q'], [5.4, 'yes'], [6.4, 'sb'], [6.8, 'e0'], [7.2, 'e1'], [7.5, 'e2'], [7.8, 'e3'], [8.1, 'e4'], [9.0, 'prev'], [10.0, 'nope'], [11.0, 'end']]
      },
      {
        title: '組頁面：只用 token', dur: 12,
        caption: '組頁面時，只用 --shop-sys-* 和 --shop-comp-* token，畫面文字放進文案檔，資料接真的購物車 API。載入中、沒有資料、出錯，這三種狀態也要做好。',
        beats: [[0.2, 't'], [0.8, 'code'], [1.4, 'l0'], [2.2, 'l1'], [3.0, 'l2'], [3.8, 'l3'], [4.8, 'page'], [6.2, 'z0'], [7.0, 'z1'], [7.8, 'z2'], [9.2, 'end']]
      },
      {
        title: '回報，走完五站', dur: 11,
        caption: '完成後，governance 會回報：重用了哪些元件和 token、新建了什麼、為什麼要新建，又加了哪些 story。走完五站了！到頁面最下面做結業檢查吧。',
        beats: [[0.2, 't'], [0.8, 'rep'], [1.2, 'w0'], [1.8, 'w1'], [2.4, 'w2'], [3.0, 'w3'], [4.0, 'rail']].concat(railBeats(), [[7.4, 'end']])
      }
    ],
    html: () => [
      // 1 Phase 0：先找出 token 前綴、共用元件、文案檔
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">Phase 0：先看專案裡有什麼</div>
        <div class="x p-bot b b--pop" data-b="bot" style="left:60px;top:104px;width:118px">${img('ai-use-computer')}</div>
        <div class="x p-tree b b--left" data-b="tree" style="left:196px;top:88px;width:270px"><p class="p-tree__head"><span class="p-dir"></span>mini-shop/</p>
          ${TREE53.map(([n, d, k], i) => `<div class="p-trow b b--left" data-b="d${i}"><span class="${k === 'dir' ? 'p-dir' : 'p-fic'}"></span><span class="p-trow__t"><code>${n}</code><small>${d}</small></span></div>`).join('')}
        </div>
        <div class="x p-find b" data-b="tree" style="left:486px;top:88px;width:254px"><p class="p-find__head">Phase 0 記下來</p>
          <div class="p-fnd b b--left" data-b="f0"><small>token 前綴</small><b><code>shop</code>　ref → sys → comp</b></div>
          <div class="p-fnd b b--left" data-b="f1"><small>共用元件 ${COMPS53.length} 個</small><span class="p-fnd__chips">${COMPS53.map(n => `<code>${n}</code>`).join('')}</span></div>
          <div class="p-fnd b b--left" data-b="f2"><small>文案檔</small><b><code>locales/zh-TW.json</code></b></div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">先記下來，再開始寫</div>
      </div>`,
      // 2 先查：新畫面的每一塊對照元件庫，列出清單後停下來等你確認
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">新畫面進來：先查，再做</div>
        <div class="x p-shot b b--left" data-b="scr" style="left:60px;top:82px;width:200px"><p class="p-shot__f">shop-cart.png</p>
          ${COV53.map((b, i) => `<div class="p-cov p-cov--${b.h}" data-b="k${i}">${b.label}</div>`).join('')}
        </div>
        <div class="x p-list b" data-b="lst" style="left:280px;top:82px;width:460px"><p class="p-list__head"><code>design-system-governance</code>對照元件庫</p>
          <div class="p-grp p-grp--ok b b--left" data-b="g0"><b><i></i>直接用</b><span>${['TopBar', 'Stepper', 'ProductCard', 'Button'].map(n => `<code>${n}</code>`).join('')}</span></div>
          <div class="p-grp p-grp--var b b--left" data-b="g1"><b><i></i>加 variant</b><span><code>ProductCard</code>加一個「橫式」</span></div>
          <div class="p-grp p-grp--miss b b--left" data-b="g2"><b><i></i>還沒有</b><span><code>CouponField</code>優惠券輸入框</span></div>
        </div>
        <div class="x p-ask2 b b--pop" data-b="stop" style="left:300px;top:300px">${img('ai-use-computer')}<span class="a-say a-say--l">先停在這裡，等你確認清單</span></div>
        <div class="x a-note b" data-b="end" style="top:384px">你確認清單之後，才開始寫程式</div>
      </div>`,
      // 3 缺元件：governance 的固定問句，回答「是」才補進共用元件庫
      `<div class="anim__scene" data-s="2">
        <div class="x p-bot b b--pop" data-b="bot" style="left:64px;top:90px;width:116px">${img('ai-use-computer')}</div>
        <div class="x a-title b" data-b="t">缺元件：先補進共用元件庫</div>
        <div class="x p-askcard b b--left" data-b="ask" style="left:214px;top:84px;width:526px">
          <span class="a-box__tag">組「優惠券」這一塊時</span>
          <p class="p-need">需要 <code>CouponField</code>（優惠券輸入框）<em class="b b--pop" data-b="miss">元件庫裡沒有</em></p>
          <p class="p-q b b--fade" data-b="q">目前既有元件無法完整組裝此組件。是否要先建立新的共用子元件，再繼續？</p>
        </div>
        <div class="x a-say a-say--r p-yes b b--pop" data-b="yes" style="left:676px;top:176px">是</div>
        <div class="x p-sbcard b b--left" data-b="sb" style="left:60px;top:250px;width:310px"><p class="p-sbcard__g">COMPONENTS</p>
          <span class="p-sbit">▸ Button</span><span class="p-sbit">▸ Stepper</span>
          <span class="p-sbit p-sbit--new b b--left" data-b="e0">▾ CouponField<em>新</em></span>
          <span class="p-sbstories">${STORY53.map((s, i) => `<i class="b b--pop" data-b="e${i + 1}">${s}</i>`).join('')}</span></div>
        <div class="x p-prev b" data-b="prev" style="left:390px;top:250px;width:350px"><p class="p-prev__h"><code>CouponField</code> · Default</p>
          <div class="p-coupon"><span class="p-coupon__in">輸入優惠碼</span><span class="p-btn p-btn--sm">套用</span></div>
          <span class="p-nope p-nope--inline b b--pop" data-b="nope">在頁面裡隨手寫一個</span></div>
        <div class="x a-note b" data-b="end" style="top:384px">先補進元件庫、加上 story，再回來組頁面</div>
      </div>`,
      // 4 組頁面：只用 token、文字放文案檔、接真的資料；三種狀態
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">組頁面：只用 token，三種狀態都做好</div>
        <div class="x p-code b b--left" data-b="code" style="left:60px;top:82px;width:430px"><p class="p-code__f">src/pages/cart/CartPage.tsx</p>
          ${CODE53.map(([c, tag, k], i) => `<div class="p-cl b b--fade" data-b="l${i}"><code>${c}</code><em class="p-tag p-tag--${k}">${tag}</em></div>`).join('')}
        </div>
        <div class="x p-cart b" data-b="page" style="left:510px;top:82px;width:230px">
          <p class="p-cart__top">購物車</p>
          ${[0, 1].map(() => `<div class="p-cart__item"><span class="p-cart__th">${DSC.tee('#8FA8C8')}</span><span class="p-cart__nm"><b>簡約短袖上衣</b><small>NT$490</small></span><span class="p-mstep"><i>−</i>1<i>＋</i></span></div>`).join('')}
          <div class="p-coupon p-coupon--sm"><span class="p-coupon__in">輸入優惠碼</span><span class="p-btn p-btn--xs">套用</span></div>
          <span class="p-btn p-btn--block p-btn--sm">結帳</span>
        </div>
        ${[['載入中', '<span class="p-skel"><i></i><i></i><i></i></span>'], ['沒有資料', '<span class="p-empty"><b>購物車是空的</b><span class="p-btn p-btn--xs">去逛逛</span></span>'], ['出錯', '<span class="p-err"><b>!</b><span>載入失敗<span class="p-btn p-btn--xs">再試一次</span></span></span>']].map(([n, body], i) => `<div class="x p-state b b--pop" data-b="z${i}" style="left:${60 + i * 232}px;top:298px;width:216px"><small>${n}</small>${body}</div>`).join('')}
        <div class="x a-note b" data-b="end" style="top:390px">只用 token，文字放文案檔，資料接真的 API</div>
      </div>`,
      // 5 回報，走完五站：重用、新建、為什麼；五站都亮起來
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">完成後回報：重用了什麼、新建了什麼</div>
        <div class="x p-report b" data-b="rep" style="left:60px;top:80px;width:680px"><p class="p-report__head"><code>design-system-governance</code>回報</p>
          ${REPORT53.map(([k, what, why], i) => `<div class="p-rrow b b--left" data-b="w${i}"><span class="p-rk p-rk--${i}">${k}</span><span class="p-rrow__w">${what}</span><small>${why}</small></div>`).join('')}
        </div>
        ${DSC.animKit.rail(330, [140, 270, 400, 530, 660], RAIL53, { segs: true })}
        <div class="x a-note b" data-b="end" style="top:390px">走完五站了！到頁面最下面，做結業檢查吧</div>
      </div>`
    ].join('')
  };
})();
