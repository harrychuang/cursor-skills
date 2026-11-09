/* 0-2、0-3 的說明動畫：沿用 anim.js 的播放器（DSC.animPlayer）和小工具（DSC.animKit）
   跟 0-1 一樣：每一幕只講一件事，元素一個一個出現，步調慢、重點清楚，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）] */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  const { rail, steps } = DSC.animKit;
  DSC.ANIMS = DSC.ANIMS || {};

  // 箭頭（給虛線路徑用）；id 每支動畫各一個，避免重複
  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker></defs></svg>`;

  /* ================= 0-2 為什麼 AI 時代更需要同一套架構 ================= */
  // 小手機裡的商品頁；day 1～3 是「每天長得不一樣」的版本，0 是照設計系統做的版本
  const phone = (day, btnKey) => `<div class="a-phone a-phone--sm"><div class="a-screen${day ? ` a-screen--d${day}` : ''}"><span class="a-pimg">${DSC.tee('#8FA8C8')}</span><b>簡約短袖上衣</b><i></i><span class="a-btn${day ? ` a-btn--d${day}` : ''}"${btnKey ? ` data-b="${btnKey}"` : ''}>加入購物車</span></div></div>`;
  const PX = [140, 325, 510];
  const LAYERS = [['設計原則', '簡單、一致、好用'], ['設計元素', '色彩、字體、間距、圓角'], ['元件', '按鈕、尺寸選項'], ['組件', '加入購物車面板'], ['產品界面', '商品頁']];

  DSC.ANIMS.arch02 = {
    length: '約 1 分鐘',
    poster: 9000,
    scenes: [
      {
        title: '以前的做法', dur: 11,
        caption: '以前的做法是：設計師畫好，工程師照著做，再來回溝通細節。改來改去、時間又不夠，最後常常做出「妥協後的產品」。',
        beats: [[0.2, 't'], [0.8, 'p1'], [1.8, 'p2'], [2.8, 'loop'], [3.6, 'm1'], [5.0, 'm2'], [6.4, 'm3'], [8.2, 'end']]
      },
      {
        title: 'AI 時代的問題', dur: 13,
        caption: '到了 AI 時代，開發快得像火箭。可是 AI 每次生成，都可能多一種按鈕、多一個顏色。做得越多，就越亂到沒人敢改。',
        beats: [[0.2, 't'], [1.0, 'v1'], [2.8, 'v2'], [4.6, 'v3'], [6.8, 'tally'], [8.8, 'mess']]
      },
      {
        title: '解法', dur: 13,
        caption: '解法是兩件事一起做：設計系統是規則，告訴 AI 該怎麼做；產品元件庫是做好的零件，讓 AI 直接拿來用。',
        beats: [[0.2, 't'], [0.8, 'a'], [1.8, 'a1'], [2.6, 'a2'], [3.4, 'a3'], [4.6, 'plus'], [5.4, 'b'], [6.4, 'b1'], [7.2, 'b2'], [8.0, 'b3'], [9.6, 'end']]
      },
      {
        title: '有了之後', dur: 11,
        caption: '有了規則和零件，AI 三天做出來的按鈕都一樣。要換主色，只要改一個 token，所有畫面一起換。',
        beats: [[0.2, 't'], [0.8, 'w1'], [1.8, 'w2'], [2.8, 'w3'], [4.4, 'tok'], [6.6, 'swap', 'is-go'], [6.6, 'btn', 'is-go'], [8.0, 'end']]
      },
      {
        title: '五層架構', dur: 13.5,
        caption: '設計系統由抽象到具體分成五層：設計原則、設計元素、元件、組件、產品界面。Design Token 就是把「設計元素」這一層，變成程式讀得懂的名字。',
        beats: [[0.2, 't'], [0.8, 'axis'], [1.4, 'l0'], [2.8, 'l1'], [4.2, 'l2'], [5.6, 'l3'], [7.0, 'l4'], [8.8, 'l1', 'is-hot'], [9.6, 'tk']]
      }
    ],
    html: () => [
      // 1 以前：設計和開發來回溝通
      `<div class="anim__scene" data-s="0">${arrowDefs('a-ar02')}
        <div class="x a-title b" data-b="t">以前：設計和開發，來回溝通</div>
        <div class="x a-who b b--left" data-b="p1" style="left:60px;top:104px;width:180px">${img('designer')}<span class="a-label">設計師</span></div>
        <div class="x a-who b" data-b="p2" style="left:560px;top:104px;width:180px">${img('coding')}<span class="a-label">工程師</span></div>
        <svg class="x b b--fade" data-b="loop" style="left:250px;top:150px" width="300" height="150" viewBox="0 0 300 150" aria-hidden="true">
          <path class="a-dash" d="M12 46 C 90 4, 210 4, 288 46" marker-end="url(#a-ar02)"/>
          <path class="a-dash" d="M288 104 C 210 146, 90 146, 12 104" marker-end="url(#a-ar02)"/>
        </svg>
        <div class="x a-say a-say--l b b--pop" data-b="m1" style="left:300px;top:110px">這裡差 2px</div>
        <div class="x a-say a-say--r b b--pop" data-b="m2" style="left:320px;top:196px">顏色跟設計稿不一樣</div>
        <div class="x a-say a-say--r b b--pop" data-b="m3" style="left:316px;top:284px">時間不夠，先這樣吧</div>
        <div class="x a-note b" data-b="end" style="top:378px">最後做出來的，是「妥協後的產品」</div>
      </div>`,
      // 2 AI 時代：三天做出三種按鈕
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">AI 時代：做得很快，也越做越亂</div>
        ${[1, 2, 3].map((d, i) => `<div class="x b b--pop" data-b="v${d}" style="left:${PX[i]}px;top:84px;width:150px"><span class="a-day">AI 第 ${d} 天</span>${phone(d)}</div>`).join('')}
        <div class="x a-stamp b b--pop" data-b="mess" style="left:548px;top:146px">亂到沒人敢改</div>
        <div class="x a-note a-note--warn b" data-b="tally" style="top:378px">三天、三種按鈕：顏色、圓角、字距都不一樣</div>
      </div>`,
      // 3 解法：規則＋零件
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">解法：設計系統＋產品元件庫</div>
        <div class="x a-box b b--left" data-b="a" style="left:70px;top:96px;width:290px">
          <span class="a-box__tag">設計系統</span><b class="a-box__t">規則：該怎麼做</b>
          <div class="a-box__rows">
            <div class="a-row b" data-b="a1">主色<span class="a-tok">shop-sys-color-primary</span></div>
            <div class="a-row b" data-b="a2">按鈕圓角一律 10px</div>
            <div class="a-row b" data-b="a3">按鈕只有 2 種樣式</div>
          </div>
        </div>
        <div class="x a-plus b b--pop" data-b="plus" style="left:372px;top:196px">+</div>
        <div class="x a-box b" data-b="b" style="left:440px;top:96px;width:290px">
          <span class="a-box__tag">產品元件庫</span><b class="a-box__t">零件：做好的元件</b>
          <div class="a-box__rows">
            <div class="a-row b" data-b="b1"><span class="a-btn">加入購物車</span><small>Button</small></div>
            <div class="a-row b" data-b="b2"><span class="a-chipset"><i>S</i><i class="on">M</i><i>L</i></span><small>SizeChip</small></div>
            <div class="a-row b" data-b="b3"><span class="a-stepper"><i>−</i><b>1</b><i>+</i></span><small>Stepper</small></div>
          </div>
        </div>
        <div class="x a-note b" data-b="end" style="top:382px">AI 有規則可讀、有零件可用，就不會每次重新發明</div>
      </div>`,
      // 4 有了之後：三天都一樣，改一個 token 全部換
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">有規則也有零件：三天都一樣</div>
        ${[1, 2, 3].map((d, i) => `<div class="x b b--pop" data-b="w${d}" style="left:${PX[i]}px;top:84px;width:150px"><span class="a-day">AI 第 ${d} 天</span>${phone(0, 'btn')}</div>`).join('')}
        <div class="x a-tokbar b" data-b="tok" style="left:0;right:0;top:340px">
          <span>只改一個 token</span><span class="a-tok">shop-sys-color-primary</span>
          <span class="a-swap" data-b="swap"><span class="a-swap__old"><i class="a-dot" style="background:#111111"></i>#111111</span><span class="a-swap__new"><i class="a-dot" style="background:#D7263D"></i>#D7263D</span></span>
        </div>
        <div class="x a-note b" data-b="end" style="top:388px">三個畫面的按鈕，一起換成紅色</div>
      </div>`,
      // 5 設計系統的五層
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">設計系統：由抽象到具體</div>
        <div class="x a-axis b b--fade" data-b="axis" style="left:52px;top:96px;width:70px"><span>抽象</span><i></i><span>具體</span></div>
        ${LAYERS.map(([n, eg], i) => { const w = 380 + i * 50; return `<div class="x a-layer b b--left" data-b="l${i}" style="left:${440 - w / 2}px;top:${96 + i * 56}px;width:${w}px"><b>${n}</b><span>${eg}</span></div>`; }).join('')}
        <div class="x a-note b" data-b="tk" style="top:388px">Design Token：把「設計元素」變成程式讀得懂的名字</div>
      </div>`
    ].join('')
  };

  /* ================= 0-3 Git：讓 agent 改檔前先存檔 ================= */
  const BACK_SVG = '<svg viewBox="0 0 96 54" aria-hidden="true"><path d="M82 40 C 76 8, 30 6, 18 32" fill="none" stroke="#4945FF" stroke-width="4" stroke-linecap="round"/><path d="M8 24 L18 35 L29 26" fill="none" stroke="#4945FF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const BRANCH_SVG = `<svg class="g-branch" viewBox="0 0 156 116" aria-hidden="true">
      <path d="M10 84 H146" stroke="#DCDAFF" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M62 84 C 84 84, 84 36, 108 36 H146" stroke="#20FDA4" stroke-width="6" stroke-linecap="round" fill="none"/>
      <circle cx="22" cy="84" r="8" fill="#4945FF"/><circle cx="62" cy="84" r="8" fill="#4945FF"/><circle cx="130" cy="84" r="8" fill="#4945FF"/>
      <circle cx="112" cy="36" r="8" fill="#0FB981"/><circle cx="142" cy="36" r="8" fill="#0FB981"/>
      <text x="10" y="110" font-size="12" font-weight="800" fill="#6E6D88">主線</text><text x="96" y="20" font-size="12" font-weight="800" fill="#0FB981">試試看</text>
    </svg>`;
  const ACTS = [
    { cmd: 'git commit', name: '存檔', desc: '記下現在的樣子，之後隨時回得來', art: '<div class="g-save"><span class="g-save__dot">✓</span><span class="g-save__msg">步驟 3：換主色</span></div>' },
    { cmd: 'git diff', name: '看差異', desc: '存檔之前，先看清楚改了什麼', art: '<div class="g-diff"><span class="g-del">− 圓角 12px</span><span class="g-add">+ 圓角 10px</span></div>' },
    { cmd: 'git restore', name: '還原', desc: '不想要的修改，一個檔案一個檔案丟掉', art: `<div class="g-restore"><span class="g-file">Header.tsx</span>${BACK_SVG}</div>` },
    { cmd: 'git switch -c', name: '開分支', desc: '想試新做法就開分支，不影響主線', art: BRANCH_SVG }
  ];
  const XS4 = [190, 330, 470, 610];
  const SECRETS = [['.env', '環境設定'], ['API key', '密鑰、密碼'], ['公司資料', '客戶、合約、內部文件']];

  DSC.ANIMS.git03 = {
    length: '約 45 秒',
    poster: 9800,
    scenes: [
      {
        title: '像遊戲存檔', dur: 12,
        caption: 'Git 就像遊戲存檔：打魔王之前先存檔。叫 AI 一次改一堆檔案，就像在打魔王；改壞了，隨時讀檔，回到改之前。',
        beats: [[0.2, 't'], [0.8, 'rail'], [1.2, 'd0', 'is-done'], [1.7, 'seg0'], [2.0, 'd1', 'is-done'], [2.5, 'seg1'], [2.8, 'd2', 'is-done'], [2.8, 'd2', 'is-hot', 7.4],
          [3.8, 'go'], [4.4, 'boss'], [6.0, 'fail'], [7.4, 'back'], [9.4, 'end']]
      },
      {
        title: '四個動作', dur: 14,
        caption: '最常用的只有四個動作：存檔（commit）、看差異（diff）、還原（restore），還有開分支試試看（branch）。不用背指令，編輯器左邊的「原始檔控制」都按得到。',
        beats: [[0.2, 't'], [0.6, 'rail']].concat(steps('c', 1.2, 3.0, 4))
      },
      {
        title: '存檔前先檢查', dur: 11,
        caption: '.env 和密鑰不要存檔；公司資料只放公司的私有 repo，不要放進公開的 repo。存過的東西就算之後刪掉，也還留在歷史紀錄裡，別人翻得到。',
        beats: [[0.2, 't'], [0.8, 'x0'], [1.6, 'x1'], [2.4, 'x2'], [3.4, 'no'], [4.8, 'hist'], [5.4, 'h1'], [6.8, 'h2'], [8.2, 'still']]
      },
      {
        title: '養成習慣', dur: 9.5,
        caption: '養成一個習慣：叫 AI 做事前先存檔，做完先看差異，滿意了再存檔。失敗了也不怕，讀檔重來就好。',
        beats: [[0.2, 't'], [0.6, 'rail'], [1.2, 'd0', 'is-hot', 2.6], [1.2, 'd0', 'is-done'], [2.6, 'd1', 'is-hot', 4.0], [2.6, 'd1', 'is-done'],
          [4.0, 'd2', 'is-hot'], [4.0, 'd2', 'is-done'], [5.4, 'loop'], [6.8, 'end']]
      }
    ],
    html: () => [
      // 1 像遊戲存檔：三個存檔點、打魔王、改壞了就讀檔
      `<div class="anim__scene" data-s="0">${arrowDefs('a-ar03')}
        <div class="x a-title b" data-b="t">Git 就像遊戲存檔</div>
        ${rail(250, [110, 250, 390], ['存檔 1', '存檔 2', '存檔 3'], { segs: true, big: true })}
        <svg class="x b b--fade" data-b="go" style="left:404px;top:236px" width="152" height="28" viewBox="0 0 152 28" aria-hidden="true"><path class="a-dash" d="M4 14 H148"/></svg>
        <div class="x a-boss b b--pop" data-b="boss" style="left:560px;top:132px;width:190px">${img('ai-use-computer')}<b>打魔王</b><small>叫 AI 一次改很多檔案</small></div>
        <div class="x a-stamp b b--pop" data-b="fail" style="left:650px;top:122px">改壞了！</div>
        <svg class="x b b--fade" data-b="back" style="left:380px;top:126px" width="190" height="112" viewBox="0 0 190 112" aria-hidden="true"><path class="a-dash" d="M176 36 C 140 2, 40 10, 18 96" marker-end="url(#a-ar03)"/></svg>
        <div class="x a-label b" data-b="back" style="left:330px;top:96px;width:220px">讀檔：回到改之前</div>
        <div class="x a-note b" data-b="end" style="top:378px">叫 AI 做事之前，先存檔</div>
      </div>`,
      // 2 四個動作：一次放大一個
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">四個動作就夠用</div>
        ${ACTS.map((a, i) => `<div class="x a-focus" data-b="c${i}" style="left:0;right:0;top:96px">
          <div class="a-focus__art">${a.art}</div>
          <div class="a-focus__txt"><span class="a-focus__no a-focus__no--code">${a.cmd}</span><b>${a.name}</b><p>${a.desc}</p></div>
        </div>`).join('')}
        ${rail(372, XS4, ACTS.map(a => a.name), { segs: true })}
      </div>`,
      // 3 不要存進去：.env、密鑰、公司資料；刪掉了，歷史裡還在
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">存檔前，先檢查這三樣</div>
        ${SECRETS.map(([b, s], i) => `<div class="x a-secret b b--pop" data-b="x${i}" style="left:${100 + i * 210}px;top:96px;width:180px"><b>${b}</b><small>${s}</small><span class="a-no b b--pop" data-b="no">${i === 2 ? '只放私有 repo' : '不要存檔'}</span></div>`).join('')}
        <div class="x a-rail b b--fade" data-b="hist" style="left:230px;top:298px;width:340px"></div>
        <div class="x a-node a-node--lg a-node--bad b b--fade" data-b="h1" style="left:219px;top:289px"></div>
        <div class="x a-node a-node--lg a-node--ok b b--fade" data-b="h2" style="left:559px;top:289px"></div>
        <div class="x a-nlabel b b--fade" data-b="h1" style="left:130px;top:322px;width:200px">存檔 4<br>不小心存了 .env</div>
        <div class="x a-nlabel b b--fade" data-b="h2" style="left:470px;top:322px;width:200px">存檔 5<br>把 .env 刪掉</div>
        <div class="x a-find b b--pop" data-b="still" style="left:150px;top:230px">刪掉了，歷史裡還翻得到</div>
      </div>`,
      // 4 養成習慣：存檔 → 叫 AI 做事 → 看差異、再存檔
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">養成習慣：先存檔，再叫 AI</div>
        ${rail(250, [200, 400, 600], ['1. 存檔', '2. 叫 AI 做事', '3. 看差異、再存檔'], { big: true })}
        <svg class="x b b--fade" data-b="loop" style="left:190px;top:120px" width="420" height="120" viewBox="0 0 420 120" aria-hidden="true"><path class="a-dash" d="M410 112 C 390 10, 30 10, 12 104" marker-end="url(#a-ar03)"/></svg>
        <div class="x a-label b" data-b="loop" style="left:0;right:0;top:100px">失敗了也不怕：讀檔重來就好</div>
        <div class="x a-note b" data-b="end" style="top:378px">準備好了，就從第 1 部 Design Token 開始</div>
      </div>`
    ].join('')
  };
})();
