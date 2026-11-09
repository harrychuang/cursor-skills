/* 2-1、2-2 的說明動畫：元件整理、組件到界面
   沿用 anim.js 的播放器與小工具；每一幕只講一件事，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）] */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  const { rail, steps } = DSC.animKit;
  DSC.ANIMS = DSC.ANIMS || {};

  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker></defs></svg>`;
  const TEE = () => `<span class="a-pimg">${DSC.tee('#8FA8C8')}</span>`;
  const CHIPS = (on = 'M', list = ['S', 'M', 'L', 'XL']) => `<span class="a-chipset">${list.map(z => `<i${z === on ? ' class="on"' : ''}>${z}</i>`).join('')}</span>`;
  const STEPPER = '<span class="a-stepper"><i>−</i><b>1</b><i>+</i></span>';
  const CART = '<svg class="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>';
  const HEART = '<svg class="h" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/></svg>';

  /* ================= 2-1 元件整理：找出還不是元件的 UI ================= */
  // 還沒整理的商品頁：一樣的尺寸選項和按鈕畫了好幾次
  const page = (hot = true) => `<span class="f-page__img">${TEE()}</span><b class="f-page__t">簡約短袖上衣</b>
    <div class="f-grp"${hot ? ' data-b="g1"' : ''}>${CHIPS()}<span class="f-grp__tag">重複 ×4</span></div>
    <div class="f-grp"${hot ? ' data-b="g2"' : ''}><span class="a-btn a-btn--S">加入購物車</span><span class="a-btn a-btn--S a-btn--ol">立即購買</span><span class="f-grp__tag">重複 ×2</span></div>`;
  const LAYERS = [['#', '商品頁', 'frame'], ['▭', 'Rectangle 12', 'raw'], ['T', '加入購物車', 'raw'], ['▭', 'Rectangle 13', 'raw'], ['T', '立即購買', 'raw'], ['▢', 'Group 4', 'raw'], ['▢', 'Group 5', 'raw'], ['▢', 'Group 6', 'raw'], ['▢', 'Group 7', 'raw']];
  const SIZES = [['S', 'a-btn--S'], ['M', ''], ['L', 'a-btn--L']];
  const ROWS = [['Filled', '', 'one'], ['Outlined', ' a-btn--ol', 'style'], ['Disabled', ' a-btn--off', 'state']];
  const XS3 = [220, 400, 580];
  const STEP21 = [
    { no: '步驟 1', name: '先存一個版本', desc: '改壞了，就從 Figma 的版本紀錄還原', art: '<div class="g-save"><span class="g-save__dot">✓</span><span class="g-save__msg">版本：元件化之前</span></div>' },
    { no: '步驟 2', name: 'Components 頁', desc: '元件都建在這一頁，由小到大：先圖示、按鈕，再組成面板', art: '<div class="g-comp"><span>◇ Icon</span><span>◇ Button</span><span>◇ SizeChip</span><span>◇ AddToCartSheet</span></div>' },
    { no: '步驟 3', name: '接著 token 化', desc: '呼叫 figma-m3-variables，把數值變成 Variables', art: '<div class="g-tokenize"><span class="g-skill">figma-m3-variables</span><span class="a-tok">#111111 → color/primary</span></div>' }
  ];

  DSC.ANIMS.fig21 = {
    length: '約 1 分鐘',
    poster: 9000,
    scenes: [
      {
        title: '還不是元件', dur: 12,
        caption: '設計稿裡很多 UI 只是長方形加文字：一樣的尺寸選項畫了四次、按鈕畫了兩次，卻還不是元件，圖層名字也看不出是什麼。',
        beats: [[0.2, 't'], [0.8, 'page'], [1.8, 'ly'], [3.4, 'ly', 'is-hot'], [5.0, 'g1', 'is-hot'], [6.6, 'g2', 'is-hot'], [8.6, 'end']]
      },
      {
        title: '交給 skill', dur: 12,
        caption: '把 section、frame 或單一元素的連結交給 figma-componentize。它會掃過整塊設計，找出還不是用元件做的 UI；不一定要重複出現，只有一個也算。',
        beats: [[0.2, 't'], [0.8, 'prompt'], [2.0, 'page'], [2.8, 'scan', 'is-go', 5.0], [5.0, 'found'], [5.6, 'f0'], [6.4, 'f1'], [7.2, 'f2']]
      },
      {
        title: '長相不同 → variants', dur: 12.5,
        caption: '長相不同的，做成 variants：尺寸（S、M、L）、樣式（Filled、Outlined）、狀態（預設、停用），都放進同一個元件組。',
        beats: [[0.2, 't'], [0.8, 'set'], [1.4, 'one'], [2.8, 'size'], [4.6, 'style'], [6.4, 'state']]
      },
      {
        title: '內容不同 → 屬性', dur: 12.5,
        caption: '內容不同的，做成元件屬性：按鈕上的文字、要換哪一個圖示、要不要顯示圖示。同一個元件，就能長出很多用法。',
        beats: [[0.2, 't'], [0.8, 'pre'], [1.6, 'panel'], [2.6, 'p0', 'is-hot', 4.8], [3.4, 'txt', 'is-go'], [3.4, 'pv0', 'is-go'],
          [5.0, 'p1', 'is-hot', 7.2], [5.8, 'ico', 'is-go'], [5.8, 'pv1', 'is-go'], [7.4, 'p2', 'is-hot', 9.4], [8.2, 'sw', 'is-go'], [8.2, 'ico', 'is-done'], [9.8, 'end']]
      },
      {
        title: '三個步驟', dur: 12,
        caption: '動手前先存一個 Figma 版本；元件建在 Components 頁，由小到大；建好之後，接著呼叫 figma-m3-variables 把數值 token 化。',
        beats: [[0.2, 't'], [0.6, 'rail']].concat(steps('c', 1.2, 3.4, 3))
      }
    ],
    html: () => [
      // 1 還不是元件：圖層名字看不出是什麼，一樣的東西畫了好幾次
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">設計稿裡，很多 UI 還不是元件</div>
        <div class="x f-layers b b--left" data-b="ly" style="left:110px;top:92px;width:210px"><p>圖層</p>${LAYERS.map(([i, n, k]) => `<div class="f-ly f-ly--${k}"><i>${i}</i>${n}</div>`).join('')}</div>
        <div class="x f-page b" data-b="page" style="left:380px;top:96px;width:260px">${page()}</div>
        <div class="x a-note a-note--warn b" data-b="end" style="top:384px">長得一樣卻還不是元件，圖層名字也看不出是什麼</div>
      </div>`,
      // 2 交給 skill：掃過一遍，找出重複的 UI
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">交給 skill：找出還不是元件的 UI</div>
        <div class="x a-prompt b" data-b="prompt" style="left:100px;top:86px;width:600px">幫我把這個 section 元件化 <code>figma.com/design/…?node-id=…</code><span class="a-prompt__send">↑</span></div>
        <div class="x f-page b b--left" data-b="page" style="left:100px;top:160px;width:250px">${page(false)}<span class="a-vscan" data-b="scan"></span></div>
        <div class="x a-box b" data-b="found" style="left:400px;top:160px;width:300px">
          <span class="a-box__tag">找到還不是元件的 UI</span>
          <div class="a-box__rows" style="margin-top:12px">
            <div class="a-row b" data-b="f0"><span class="a-btn a-btn--S">加入購物車</span><small>按鈕 ×2</small></div>
            <div class="a-row b" data-b="f1">${CHIPS('M', ['S', 'M', 'L'])}<small>尺寸選項 ×4</small></div>
            <div class="a-row b" data-b="f2">${STEPPER}<small>數量加減器 ×1</small></div>
          </div>
        </div>
      </div>`,
      // 3 長相不同 → variants：元件組一格一格長出來
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">長相不同 → 做成 variants</div>
        <div class="x f-set b" data-b="set" style="left:150px;top:86px;width:500px">
          <div class="f-set__head">◇ Button · 元件組</div>
          <div class="f-grid">
            <span></span>${SIZES.map(([z]) => `<span class="f-colh b b--fade" data-b="${z === 'M' ? 'one' : 'size'}">${z}</span>`).join('')}
            ${ROWS.map(([label, cls, key]) => `<span class="b b--fade" data-b="${key}">${label}</span>${SIZES.map(([z, sz]) => `<div class="f-cell b b--pop" data-b="${key === 'one' ? (z === 'M' ? 'one' : 'size') : key}"><span class="a-btn ${sz}${cls}">加入購物車</span></div>`).join('')}`).join('')}
          </div>
        </div>
        <div class="x f-dims" style="left:0;right:0;top:384px">
          <span class="f-dim b b--pop" data-b="size"><b>Size</b>S · M · L</span>
          <span class="f-dim b b--pop" data-b="style"><b>Style</b>Filled · Outlined</span>
          <span class="f-dim b b--pop" data-b="state"><b>State</b>預設 · 停用</span>
        </div>
      </div>`,
      // 4 內容不同 → 元件屬性：文字、換圖示、顯示開關
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">內容不同 → 做成元件屬性</div>
        <div class="x f-preview b b--left" data-b="pre" style="left:70px;top:112px;width:270px;height:200px"><small>◇ Button 的一個 instance</small>
          <span class="a-btn a-btn--icon"><span class="a-ico" data-b="ico">${CART}${HEART}</span><span class="a-swap" data-b="txt"><span class="a-swap__old">加入購物車</span><span class="a-swap__new">立即購買</span></span></span></div>
        <div class="x f-panel b" data-b="panel" style="left:380px;top:104px;width:360px">
          <p class="f-panel__head">元件屬性</p>
          <div class="f-row f-row--prop" data-b="p0"><b>Text</b><span class="a-swap" data-b="pv0"><span class="a-swap__old f-val">加入購物車</span><span class="a-swap__new f-val">立即購買</span></span><span class="f-type">文字屬性</span></div>
          <div class="f-row f-row--prop" data-b="p1"><b>Icon</b><span class="a-swap" data-b="pv1"><span class="a-swap__old f-val">購物車</span><span class="a-swap__new f-val">愛心</span></span><span class="f-type">換 instance</span></div>
          <div class="f-row f-row--prop" data-b="p2"><b>Show icon</b><span class="f-switch" data-b="sw"></span><span class="f-type">開關屬性</span></div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">內容不同（文字、圖示、開關）→ 元件屬性</div>
      </div>`,
      // 5 三個步驟：存版本、Components 頁由小到大、token 化
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">動手的三個步驟</div>
        ${STEP21.map((s, i) => `<div class="x a-focus" data-b="c${i}" style="left:0;right:0;top:96px">
          <div class="a-focus__art">${s.art}</div>
          <div class="a-focus__txt"><span class="a-focus__no">${s.no}</span><b>${s.name}</b><p>${s.desc}</p></div>
        </div>`).join('')}
        ${rail(372, XS3, ['存版本', 'Components 頁', 'token 化'], { segs: true })}
      </div>`
    ].join('')
  };

  /* ================= 2-2 組件到界面，不再重複建元件 ================= */
  const SWAPS = [['Group 4', '◇ Button', true], ['Group 5', '◇ SizeChip', true], ['Group 6', '◇ Stepper', true], ['Group 7', '◇ Button', false]];

  DSC.ANIMS.fig22 = {
    length: '約 1 分鐘',
    poster: 10000,
    scenes: [
      {
        title: '由小到大', dur: 13,
        caption: '先做最小的元件：按鈕、尺寸選項、數量加減器；再組成組件，也就是加入購物車面板；最後才放進界面：商品頁。',
        beats: [[0.2, 't'], [0.6, 'rail']].concat(steps('st', 1.0, 3.8, 3))
      },
      {
        title: 'instance', dur: 12,
        caption: '小元件放進大元件時，是一個 instance，也就是分身。改原本的元件，所有用到它的地方都會一起更新。',
        beats: [[0.2, 't'], [0.8, 'main'], [2.0, 'i0'], [2.6, 'i1'], [3.2, 'i2'], [3.8, 'lines'], [5.2, 'edit'], [6.2, 'mb', 'is-done'], [6.2, 'ib', 'is-done'], [8.2, 'end']]
      },
      {
        title: '先比對', dur: 13,
        caption: '動手前，先跟 Components 頁上現有的元件比對：完全一樣就直接沿用；只是部分相似，skill 會放出審核板問你。',
        beats: [[0.2, 't'], [0.8, 'found'], [1.8, 'arr'], [2.4, 'lib'], [3.6, 'm0', 'is-hot'], [5.0, 'o1'], [7.4, 'o2'], [9.4, 'end']]
      },
      {
        title: '審核板', dur: 12,
        caption: '審核板把現有的元件和新找到的樣本並排。你選沿用、加一個 variant，或新建；你沒決定之前，skill 不會自己新建元件。',
        beats: [[0.2, 't'], [0.8, 'board'], [1.8, 'c0'], [2.8, 'c1'], [4.0, 'ops'], [6.0, 'op1', 'is-hot'], [7.4, 'res'], [9.2, 'end']]
      },
      {
        title: '逐項比對', dur: 11,
        caption: '換成 instance 之前，skill 一定先附上截圖問你。換的時候一項一項比對外觀，比對不過的地方保留原稿並回報給你，不會硬換。',
        beats: [[0.2, 't'], [0.8, 'list'], [1.0, 'r0'], [1.2, 'r1'], [1.4, 'r2'], [1.6, 'r3'],
          [2.4, 'w0', 'is-go'], [2.8, 'k0'], [3.8, 'w1', 'is-go'], [4.2, 'k1'], [5.2, 'w2', 'is-go'], [5.6, 'k2'], [7.0, 'r3', 'is-hot'], [7.0, 'k3'], [8.8, 'end']]
      }
    ],
    html: () => [
      // 1 由小到大：元件 → 組件 → 界面
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">由小到大：元件 → 組件 → 界面</div>
        <div class="x a-focus" data-b="st0" style="left:0;right:0;top:120px"><div class="a-parts">
          <div class="a-part"><span class="a-btn">加入購物車</span><small>按鈕</small></div>
          <div class="a-part">${CHIPS('M', ['S', 'M', 'L'])}<small>尺寸選項</small></div>
          <div class="a-part">${STEPPER}<small>數量加減器</small></div>
        </div></div>
        <div class="x a-focus" data-b="st1" style="left:0;right:0;top:92px"><div class="a-sheetmini">
          <span class="a-sheetmini__tag">組件：加入購物車面板</span>
          <div class="a-sheetmini__top">${TEE()}簡約短袖上衣</div>
          <div class="a-sheetmini__row"><span>尺寸</span>${CHIPS('M', ['S', 'M', 'L'])}</div>
          <div class="a-sheetmini__row"><span>數量</span>${STEPPER}</div>
          <span class="a-btn">加入購物車</span>
        </div></div>
        <div class="x a-focus" data-b="st2" style="left:0;right:0;top:84px"><div class="a-pagephone"><div class="a-pagephone__in">
          ${TEE()}<b>簡約短袖上衣</b>
          <div class="a-pagephone__dock">${CHIPS('M', ['S', 'M', 'L'])}<span class="a-btn">加入購物車</span></div>
        </div></div><div class="a-focus__txt" style="width:220px"><span class="a-focus__no">界面</span><b>商品頁</b><p>組件放進一整頁</p></div></div>
        ${rail(380, [240, 400, 560], ['元件', '組件', '界面'], { segs: true })}
      </div>`,
      // 2 instance：改主元件，所有分身一起更新
      `<div class="anim__scene" data-s="1">${arrowDefs('a-ar22')}
        <div class="x a-title b" data-b="t">instance：改一次，處處更新</div>
        <div class="x a-maincomp b b--left" data-b="main" style="left:60px;top:126px;width:230px"><small>◇ Button · 主元件</small><span class="a-btn a-btn--L a-btn--inst" data-b="mb">加入購物車</span><span class="a-edit b b--pop" data-b="edit">改：圓角 → 全圓</span></div>
        ${['商品頁', '購物車', '面板'].map((n, i) => `<div class="x a-scr b b--pop" data-b="i${i}" style="left:${360 + i * 130}px;top:136px;width:116px"><small>${n}</small><i></i><i></i><span class="a-btn a-btn--inst" data-b="ib">加入購物車</span></div>`).join('')}
        <svg class="x b b--fade" data-b="lines" style="left:290px;top:120px" width="490" height="190" viewBox="0 0 490 190" aria-hidden="true">
          <path class="a-dash" d="M4 84 C 50 172, 110 176, 128 138" marker-end="url(#a-ar22)"/>
          <path class="a-dash" d="M4 84 C 70 184, 230 186, 258 138" marker-end="url(#a-ar22)"/>
          <path class="a-dash" d="M4 84 C 90 196, 360 196, 388 138" marker-end="url(#a-ar22)"/>
        </svg>
        <div class="x a-note b" data-b="end" style="top:384px">改原本的元件，所有分身一起更新</div>
      </div>`,
      // 3 先比對：完全一樣就沿用，部分相似就問你
      `<div class="anim__scene" data-s="2">${arrowDefs('a-ar22b')}
        <div class="x a-title b" data-b="t">動手前，先比對現有元件</div>
        <div class="x a-panelcard b b--left" data-b="found" style="left:56px;top:150px;width:190px;text-align:center"><span class="a-box__tag">找到的 UI</span><div style="display:grid;justify-items:center;gap:8px"><span class="a-btn">加入購物車</span><span class="f-raw">Group 4</span></div></div>
        <svg class="x b b--fade" data-b="arr" style="left:248px;top:200px" width="52" height="30" viewBox="0 0 52 30" aria-hidden="true"><path class="a-dash" d="M4 15 H46" marker-end="url(#a-ar22b)"/></svg>
        <div class="x f-layers b" data-b="lib" style="left:302px;top:112px;width:214px"><p>Components 頁</p>
          <div class="f-ly f-ly--comp" data-b="m0"><i>◇</i>Button</div><div class="f-ly f-ly--comp"><i>◇</i>SizeChip</div><div class="f-ly f-ly--comp"><i>◇</i>Stepper</div><div class="f-ly f-ly--comp"><i>◇</i>AddToCartSheet</div>
        </div>
        <svg class="x b b--fade" data-b="o1" style="left:516px;top:118px" width="34" height="170" viewBox="0 0 34 170" aria-hidden="true"><path class="a-dash" d="M2 44 L28 34" marker-end="url(#a-ar22b)"/></svg>
        <svg class="x b b--fade" data-b="o2" style="left:516px;top:118px" width="34" height="170" viewBox="0 0 34 170" aria-hidden="true"><path class="a-dash" d="M2 60 C 16 70, 14 140, 28 144" marker-end="url(#a-ar22b)"/></svg>
        <div class="x a-out a-out--ok b b--pop" data-b="o1" style="left:548px;top:104px;width:200px"><b>完全一樣</b><small>直接沿用，不用問你</small></div>
        <div class="x a-out a-out--ask b b--pop" data-b="o2" style="left:548px;top:216px;width:200px"><b>部分相似</b><small>放出審核板問你：沿用、加 variant，或新建</small></div>
        <div class="x a-note b" data-b="end" style="top:384px">完全一樣才沿用；部分相似，一定先問你</div>
      </div>`,
      // 4 審核板：你來決定
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">審核板：你來決定</div>
        <div class="x f-review b" data-b="board" style="left:100px;top:86px;width:600px">
          <div class="f-review__head">審核板 · 部分相似的按鈕</div>
          <div class="f-cols">
            <div class="f-colbox b" data-b="c0"><small>現有：Button（Filled）</small><span class="a-btn">加入購物車</span></div>
            <div class="f-colbox b" data-b="c1"><small>新找到的樣本</small><span class="a-btn a-btn--round">加入購物車</span></div>
          </div>
          <div class="f-opts b" data-b="ops"><span class="f-opt">沿用現有的</span><span class="f-opt" data-b="op1">加一個 variant</span><span class="f-opt">新建元件</span></div>
        </div>
        <div class="x b b--pop" data-b="res" style="left:0;right:0;top:340px;text-align:center"><span class="a-result">◇ Button 多了一個 Style = Rounded</span></div>
        <div class="x a-note b" data-b="end" style="top:396px">你沒決定之前，skill 不會自己新建元件</div>
      </div>`,
      // 5 換成 instance，逐項比對外觀
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">換成 instance，逐項比對外觀</div>
        <div class="x f-swaplist b" data-b="list" style="left:120px;top:92px;width:560px">
          <div class="f-sw f-sw--head"><span>原本的圖層 → 換成 instance</span><span>外觀比對</span></div>
          ${SWAPS.map(([a, b, ok], i) => `<div class="f-sw b b--left" data-b="r${i}"><span class="a-swap" data-b="${ok ? `w${i}` : `x${i}`}"><span class="a-swap__old"><span class="f-raw">${a}</span></span><span class="a-swap__new"><span class="f-raw">${a}</span>→<span class="f-new">${b}</span></span></span><span class="b b--pop" data-b="k${i}">${ok ? '<span class="f-ok">✓ 外觀一致</span>' : '<span class="f-bad">差 2px · 保留原稿並回報</span>'}</span></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">比對不過的，不會硬換</div>
      </div>`
    ].join('')
  };
})();
