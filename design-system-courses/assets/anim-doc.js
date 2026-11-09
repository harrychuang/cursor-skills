/* 3-1、3-2、3-3 的說明動畫：設計系統文件裡有什麼、從 Figma 建立、從截圖和原型建立
   沿用 anim.js 的播放器與小工具；每一幕只講一件事，每支約 1 分鐘
   beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）]
   停點的說法照 design-system-extractor：兩個都是 Figma 設定的值一定問；截圖量到、差到看不出來的會自動合併並記在表上 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { img } = DSC;
  const { rail, steps } = DSC.animKit;
  DSC.ANIMS = DSC.ANIMS || {};

  const arrowDefs = id => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4945FF"/></marker></defs></svg>`;
  const TEE = () => `<span class="a-pimg">${DSC.tee('#8FA8C8')}</span>`;
  const sw = hex => `<i style="background:${hex}"></i>`;
  // 停點的關鍵字；pick 是你選的那一個，會亮起來
  const keys = (list, pick, key) => `<div class="d-keys">${list.map((k, i) => `<code${i === pick ? ` data-b="${key}"` : ''}>${k}</code>`).join('')}</div>`;
  // 小手機：同一個商品頁的兩個版本
  const miniPhone = label => `<span class="d-mini"><span class="d-mini__ph"><span><i class="d-mini__img"></i><i></i><i></i><i class="d-mini__btn"></i></span></span><small>${label}</small></span>`;
  // 小商品卡：長得很像的兩張卡片
  const miniCard = (label, tag) => `<span class="d-pcard"><span class="d-pcard__in">${tag ? `<em>${tag}</em>` : ''}${TEE()}<i></i><i></i></span><small>${label}</small></span>`;
  // 文件頁的縮圖：側欄、色票、token 表、按鈕
  const docPage = (cls = '') => `<div class="d-page ${cls}"><div class="d-page__side"><i class="on"></i><i></i><i></i><i></i><i></i></div><div class="d-page__main"><b>Mini Shop 設計系統</b><span class="d-sws">${['#111111', '#6B6B6B', '#F2F2F2', '#D7263D', '#FFF1F2'].map(sw).join('')}</span><span class="d-lines"><i></i><i></i><i></i></span><span class="a-btn">加入購物車</span></div></div>`;
  const CMP = (a, b) => `<div class="a-cmp"><span>${sw(a)}${a}</span><b>≈</b><span>${sw(b)}${b}</span></div>`;
  const XS3 = [220, 400, 580];

  /* ================= 3-1 設計系統文件裡有什麼 ================= */
  const BOOK = ['設計原則', '色彩 · 字體 · 間距', '三層 token', '元件規格'];
  const FILES = [['', 'DESIGN_PRINCIPLES.md', '設計原則'], ['', 'DESIGN_ELEMENTS.md', '設計元素'], ['dir', 'tokens/', '三層 token'],
    ['', 'COMPONENT_INVENTORY.md', '元件清單'], ['dir', 'components/', '元件規格'], ['web', 'index.html', '靜態 HTML 文件']];
  // 「去除 AI 味」的五條規則（文字在 extra-data.js 的 SLOP_RULES），一條一條套用
  const SLOP_KEYS = ['gradient', 'glass', 'nested', 'outline', 'neon'];
  const slopBeats = () => {
    const b = [];
    SLOP_KEYS.forEach((k, i) => {
      const s = 2.4 + i * 1.4;
      b.push([s, `u${i}`], [s + 0.6, `u${i}`, 'is-done'], [s + 0.6, `k${i}`, `no-${k}`], [s + 0.6, `m${i}`, 'is-done']);
    });
    return b;
  };
  const STOP31 = [
    { no: '停點 1', name: '重複來源', desc: '商品頁有 0920 和 1105 兩個版本，要以哪個為準？', keys: ['reuse existing source', 'ignore duplicate', 'keep distinct'],
      art: `<div class="d-dup">${miniPhone('0920')}<b>?</b>${miniPhone('1105')}</div>` },
    { no: '停點 2', name: '相近 token', desc: 'Figma 裡的兩個黑色只差一點點，要合併嗎？', keys: ['merge', 'keep distinct'], art: CMP('#111111', '#121212') },
    { no: '停點 3', name: '相似元件', desc: '「商品卡片」和「推薦商品卡片」是同一個元件嗎？', keys: ['merge', 'make variant', 'keep distinct', 'blocked'],
      art: `<div class="d-cards">${miniCard('商品卡片')}${miniCard('推薦商品卡片', '推薦')}</div>` }
  ];

  DSC.ANIMS.doc31 = {
    length: '約 1 分鐘',
    poster: 9600,
    scenes: [
      {
        title: '寫給 AI 的規則書', dur: 11,
        caption: '設計系統文件是寫給 AI 看的規則書。開發前，AI 先讀這份文件；開發時，AI 就在文件的規範裡工作，不用每次重新猜。',
        beats: [[0.2, 't'], [0.8, 'book'], [1.4, 'r0'], [1.8, 'r1'], [2.2, 'r2'], [2.6, 'r3'], [3.4, 'robot'], [4.2, 'arr'], [5.0, 'say'], [7.2, 'sw', 'is-go'], [8.8, 'end']]
      },
      {
        title: '文件裡有什麼', dur: 13,
        caption: '文件裡有設計原則、設計元素、三層 token、元件清單和元件規格。最後還會產生一份靜態 HTML 文件，用瀏覽器打開就能看。',
        beats: [[0.2, 't'], [0.8, 'panel'], [1.4, 'f0'], [2.6, 'f1'], [3.8, 'f2'], [5.0, 'f3'], [6.2, 'f4'], [7.4, 'f5'], [8.6, 'f5', 'is-hot'], [8.8, 'web']]
      },
      {
        title: '去除 AI 味', dur: 12,
        caption: '還有一份「去除 AI 味」的規則：非必要不用漸層、半透明背景和外框線，避免卡片包卡片，克制使用霓虹。AI 照著做，畫面就不會千篇一律。',
        beats: [[0.2, 't'], [0.8, 'card'], [1.6, 'rules']].concat(slopBeats(), [[9.6, 'clean', 'is-go']])
      },
      {
        title: '三個停點', dur: 13,
        caption: '遇到要做決定的地方，AI 會停下來問你。三個停點：重複的來源、相近的 token、相似的元件。你用表上的關鍵字回答就好。',
        beats: [[0.2, 't'], [0.6, 'rail']].concat(steps('c', 1.2, 3.8, 3))
      },
      {
        title: '回答寫進表格', dur: 11,
        caption: '你的回答不會只留在對話裡。skill 會把它寫進表格，例如 TOKEN_ARCHITECTURE.md 的 Near Token Decisions；下一站的 skill 讀這張表，就知道你決定了什麼。',
        beats: [[0.2, 't'], [0.8, 'ask'], [2.2, 'me'], [3.6, 'tbl'], [4.6, 'row'], [5.6, 'dec', 'is-hot'], [7.2, 'next']]
      }
    ],
    html: () => [
      // 1 寫給 AI 的規則書：開發前先讀，開發時照著做
      `<div class="anim__scene" data-s="0">${arrowDefs('a-ar31')}
        <div class="x a-title b" data-b="t">設計系統文件：寫給 AI 看的規則書</div>
        <div class="x d-book b b--left" data-b="book" style="left:90px;top:96px;width:270px">
          <span class="a-box__tag">設計系統文件</span><b class="d-book__t">Mini Shop 設計系統</b>
          <div class="d-book__rows">${BOOK.map((t, i) => `<span class="b b--fade" data-b="r${i}">${t}</span>`).join('')}</div>
        </div>
        <svg class="x b b--fade" data-b="arr" style="left:376px;top:206px" width="190" height="40" viewBox="0 0 190 40" aria-hidden="true"><path class="a-dash" d="M6 20 H180" marker-end="url(#a-ar31)"/></svg>
        <div class="x a-who b b--pop" data-b="robot" style="left:580px;top:150px;width:150px">${img('ai-read')}<span class="a-label">AI</span></div>
        <div class="x a-say a-say--r b b--pop" data-b="say" style="left:496px;top:88px"><span class="a-swap" data-b="sw"><span class="a-swap__old">開發前：先讀規則</span><span class="a-swap__new">開發時：照規則做</span></span></div>
        <div class="x a-note b" data-b="end" style="top:384px">不用每次重新猜，做出來的畫面才會一致</div>
      </div>`,
      // 2 文件裡有什麼：一個檔案一個檔案出現，最後打開 HTML
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">文件裡有什麼</div>
        <div class="x d-files b b--left" data-b="panel" style="left:80px;top:92px;width:420px"><p class="d-files__head">萃取出來的檔案</p>
          ${FILES.map(([k, n, l], i) => `<div class="d-file b b--left" data-b="f${i}"><span class="d-ic${k ? ` d-ic--${k}` : ''}"></span><code>${n}</code><small>${l}</small></div>`).join('')}
        </div>
        <div class="x b b--pop" data-b="web" style="left:532px;top:116px;width:220px"><div class="a-win"><div class="a-win__bar"><i></i><i></i><i></i><span>index.html</span></div>${docPage()}</div><div class="a-label d-weblabel">用瀏覽器打開就能看</div></div>
      </div>`,
      // 3 去除 AI 味：一條規則拿掉一種特效
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">去除 AI 味：不做千篇一律的畫面</div>
        <div class="x b b--left" data-b="card" style="left:96px;top:96px;width:290px">
          <div class="d-slop" data-b="k0 k1 k2 k3 k4"><div class="d-slop__in">
            <div class="d-slop__top"><span>限時優惠</span><span>剩 3 件</span></div>
            <b class="d-slop__t">簡約短袖上衣</b>
            <div class="d-slop__stats"><span><b>NT$490</b><small>特價</small></span><span><b>4.8</b><small>平均評分</small></span></div>
            <span class="d-slop__btn">加入購物車</span>
          </div></div>
          <div class="d-meter"><span class="a-swap" data-b="clean"><span class="a-swap__old">AI 味 ${SLOP_KEYS.map((_, i) => `<i data-b="m${i}"></i>`).join('')}</span><span class="a-swap__new">乾淨了！重點清楚，不靠特效</span></span></div>
        </div>
        <div class="x d-rules b" data-b="rules" style="left:428px;top:96px;width:300px"><p class="d-rules__head"><code>ANTI_AI_STYLE_RULES.md</code></p>
          ${(DSC.SLOP_RULES || []).map(([, t], i) => `<div class="d-rule b b--left" data-b="u${i}">${t}<em>✓</em></div>`).join('')}
        </div>
      </div>`,
      // 4 三個停點：一次放大一個，底部軌道標出第幾個
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">三個停點：AI 停下來問你</div>
        ${STOP31.map((s, i) => `<div class="x a-focus" data-b="c${i}" style="left:0;right:0;top:92px">
          <div class="a-focus__art">${s.art}</div>
          <div class="a-focus__txt d-stoptxt"><span class="a-focus__no">${s.no}</span><b>${s.name}</b><p>${s.desc}</p>${keys(s.keys)}</div>
        </div>`).join('')}
        ${rail(372, XS3, ['重複來源', '相近 token', '相似元件'], { segs: true })}
      </div>`,
      // 5 回答寫進表格：下一站讀得到
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">你的回答，會寫進表格</div>
        <div class="x d-ask b b--left" data-b="ask" style="left:110px;top:92px"><span class="d-ask__tag">停點 2 · 相近 token</span>#121212 要合併到 #111111 嗎？</div>
        <div class="x a-say a-say--r d-me b b--pop" data-b="me" style="left:600px;top:96px">merge</div>
        <div class="x d-table b" data-b="tbl" style="left:110px;top:172px;width:580px">
          <p class="d-table__head"><code>TOKEN_ARCHITECTURE.md</code> · Near Token Decisions</p>
          <div class="d-tr d-tr--h"><span>Candidate A</span><span>Candidate B</span><span>Decision</span><span>Confirmed by</span></div>
          <div class="d-tr b b--left" data-b="row"><span>${sw('#121212')}#121212</span><span>${sw('#111111')}#111111</span><span><b class="d-dec" data-b="dec">merge</b></span><span>你</span></div>
        </div>
        <div class="x d-next b" data-b="next" style="left:0;right:0;top:318px">${img('play-lego')}<span>下一站的 skill 讀這張表，照你的決定做</span></div>
      </div>`
    ].join('')
  };

  /* ================= 3-2 從 Figma 設計稿建立 ================= */
  const READS = [['Variables 和樣式', '<span class="f-var">color/primary</span>'], ['元件和 variants', '<span class="d-chip">◇ Button</span>'], ['圖層名稱、Auto Layout', '<span class="d-chip">gap 12</span>']];
  const INV = [['Button', 'extracted'], ['SizeChip', 'planned'], ['Stepper', 'planned'], ['AddToCartSheet', 'planned']];
  const STOP32 = [
    { tag: '停點 2 · 相近 token', q: '兩個都是 Figma 設定的值，只差一點點，要合併嗎？', art: CMP('#111111', '#121212'), keys: ['merge', 'keep distinct'], pick: 0, file: 'TOKEN_ARCHITECTURE.md' },
    { tag: '停點 3 · 相似元件', q: '「商品卡片」和「推薦商品卡片」長得很像，是同一個元件嗎？', art: `<div class="d-cards">${miniCard('商品卡片')}${miniCard('推薦商品卡片', '推薦')}</div>`, keys: ['merge', 'make variant', 'keep distinct', 'blocked'], pick: 1, file: 'COMPONENT_INVENTORY.md' }
  ];
  const CHECKS = ['audit_sources.mjs', 'audit_tokens.mjs', 'audit_components.mjs', 'generate_docs_html.mjs', 'generate_review_html.mjs'];
  const REVIEW = [['相近 token', '#121212 → #111111', 'ok', 'merge'], ['相似元件', '推薦商品卡片', 'ok', 'make variant'], ['相似元件', 'SizeChip ≈ ColorChip', 'wait', '待決定']];

  DSC.ANIMS.ext32 = {
    length: '約 1 分鐘',
    poster: 8400,
    scenes: [
      {
        title: 'Figma 證據最完整', dur: 12,
        caption: 'Figma 是證據最完整的來源：Variables 和樣式、元件和 variants、圖層名稱和 Auto Layout 都讀得到。第 2 部整理好的設計稿，這時候派上用場。',
        beats: [[0.2, 't'], [0.8, 'file'], [2.2, 'r0'], [3.8, 'r1'], [3.8, 'hb', 'is-hot'], [5.4, 'r2'], [7.6, 'end']]
      },
      {
        title: '先萃取 1 到 3 個元件', dur: 12,
        caption: '預設是快速萃取：先只把 1 到 3 個最重要的元件寫成規格，例如主要按鈕，其他先標成 planned。方向和 token 都對了，再請 skill 擴大。',
        beats: [[0.2, 't'], [0.8, 'prompt'], [2.2, 'inv'], [2.8, 'v0'], [3.2, 'v1'], [3.6, 'v2'], [4.0, 'v3'], [5.2, 'v0', 'is-hot'], [5.8, 'arr'], [6.2, 'spec'], [8.2, 'end']]
      },
      {
        title: '停點：用關鍵字回答', dur: 14,
        caption: '遇到停點，用表上的關鍵字回答：兩個 Figma 顏色只差一點點，回答 merge；兩張卡片長得很像，回答 make variant。你的回答會寫進對應的檔案。',
        beats: [[0.2, 't'], [0.8, 's0'], [2.2, 'k0'], [3.4, 'y0'], [4.0, 'p0', 'is-hot'], [4.8, 'w0'],
          [7.0, 's0', 'is-out'], [7.0, 's1'], [8.4, 'k1'], [9.6, 'y1'], [10.2, 'p1', 'is-hot'], [11.0, 'w1']]
      },
      {
        title: '跑檢查腳本', dur: 11,
        caption: '萃取完，執行 extract_check.mjs：它會跑三個檢查，再產生兩份 HTML。每一列都是 PASS 才算完成；有 FAIL，就修好再跑一次。',
        beats: [[0.2, 't'], [0.8, 'term'], [1.8, 'o0'], [2.4, 'o1'], [3.0, 'o2'], [3.6, 'o3'], [4.0, 'g0'], [4.8, 'o4'], [5.4, 'o5'], [5.8, 'g1'], [6.6, 'o6'], [8.0, 'end']]
      },
      {
        title: '打開兩份 HTML', dur: 11,
        caption: '打開 index.html 看整份文件，打開 review.html 看還沒決定的事。這兩份是產生出來的：要修改，就改 Markdown 或 token 再重跑，不要直接改 HTML。',
        beats: [[0.2, 't'], [0.8, 'w0'], [2.4, 'w1'], [3.8, 'q2', 'is-hot'], [5.6, 'end']]
      }
    ],
    html: () => [
      // 1 Figma 讀得到的東西
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">Figma：證據最完整的來源</div>
        <div class="x b b--left" data-b="file" style="left:80px;top:100px;width:250px"><div class="a-win"><div class="a-win__bar"><i></i><i></i><i></i><span>Mini Shop.fig</span></div>
          <div class="a-screen">${TEE()}<b>簡約短袖上衣</b><i></i><span class="a-btn" data-b="hb">加入購物車</span></div></div></div>
        <div class="x" style="left:380px;top:110px;width:350px">${READS.map(([t, chip], i) => `<div class="d-read b b--left" data-b="r${i}"><i>✓</i><span>${t}</span>${chip}</div>`).join('')}</div>
        <div class="x a-note b" data-b="end" style="top:384px">第 2 部整理好的設計稿，這時候派上用場</div>
      </div>`,
      // 2 先求快：只寫 1 個元件的規格，其他先 planned
      `<div class="anim__scene" data-s="1">${arrowDefs('a-ar32')}
        <div class="x a-title b" data-b="t">先求快：只萃取 1 到 3 個元件</div>
        <div class="x a-prompt b" data-b="prompt" style="left:100px;top:84px;width:600px"><code>$design-system-extractor</code>只萃取 1 個主要元件（primary button）<span class="a-prompt__send">↑</span></div>
        <div class="x d-inv b" data-b="inv" style="left:100px;top:160px;width:360px"><p class="d-inv__head"><code>COMPONENT_INVENTORY.md</code></p>
          ${INV.map(([n, st], i) => `<div class="d-inv__row b b--left" data-b="v${i}"><span>${n}</span><span class="d-st d-st--${st}">${st}</span></div>`).join('')}
        </div>
        <svg class="x b b--fade" data-b="arr" style="left:466px;top:200px" width="60" height="30" viewBox="0 0 60 30" aria-hidden="true"><path class="a-dash" d="M4 15 H52" marker-end="url(#a-ar32)"/></svg>
        <div class="x d-spec b b--pop" data-b="spec" style="left:534px;top:160px;width:190px"><span class="d-spec__file">components/button.md</span><b>Button</b><span class="d-spec__sec">Evidence</span><span class="d-spec__sec">Anatomy</span><span class="d-spec__sec">Token Contract</span></div>
        <div class="x a-note b" data-b="end" style="top:384px">方向對了，再請 skill 擴大</div>
      </div>`,
      // 3 停點：用關鍵字回答，回答寫進對應的檔案
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">停點：用關鍵字回答</div>
        ${STOP32.map((s, i) => `<div class="x a-focus" data-b="s${i}" style="left:0;right:0;top:86px"><div class="d-stop">
          <span class="a-box__tag">${s.tag}</span>
          <p class="d-stop__q">${s.q}</p>
          <div class="d-stop__art">${s.art}</div>
          <div class="d-keyrow b b--fade" data-b="k${i}">${keys(s.keys, s.pick, `p${i}`)}<span class="a-say a-say--r d-me b b--pop" data-b="y${i}">${s.keys[s.pick]}</span></div>
          <span class="d-rec b" data-b="w${i}">✓ 寫進 <code>${s.file}</code></span>
        </div></div>`).join('')}
      </div>`,
      // 4 跑檢查腳本：三個檢查＋兩份 HTML
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">跑檢查腳本：每一列都要 PASS</div>
        <div class="x d-term b" data-b="term" style="left:96px;top:88px;width:520px">
          <div class="d-term__cmd"><span>$</span>node …/extract_check.mjs . --locale zh-Hant</div>
          <div class="d-tl d-tl--head b b--fade" data-b="o0">STEP | RESULT</div>
          ${CHECKS.map((c, i) => `<div class="d-tl b b--fade" data-b="o${i + 1}"><span>${c}</span><b>PASS</b></div>`).join('')}
          <div class="d-tl d-tl--ok b b--fade" data-b="o6">extract_check passed (5 steps).</div>
        </div>
        <div class="x d-brace b b--left" data-b="g0" style="left:630px;top:169px;height:78px">三個檢查</div>
        <div class="x d-brace b b--left" data-b="g1" style="left:630px;top:247px;height:52px">產生兩份 HTML</div>
        <div class="x a-note b" data-b="end" style="top:384px">有 FAIL，就修好再跑一次</div>
      </div>`,
      // 5 打開兩份 HTML：文件、還沒決定的事
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">打開兩份 HTML</div>
        <div class="x b b--left" data-b="w0" style="left:80px;top:92px;width:300px"><div class="a-win"><div class="a-win__bar"><i></i><i></i><i></i><span>index.html</span></div>${docPage('d-page--lg')}</div><div class="a-label d-weblabel">看整份文件</div></div>
        <div class="x b" data-b="w1" style="left:420px;top:92px;width:300px"><div class="a-win"><div class="a-win__bar"><i></i><i></i><i></i><span>review.html</span></div>
          <div class="d-rv">${REVIEW.map(([k, t, st, v], i) => `<div class="d-rv__row" data-b="q${i}"><span class="d-rv__k">${k}</span><span>${t}</span><em class="${st}">${v}</em></div>`).join('')}</div></div>
          <div class="a-label d-weblabel">看還沒決定的事</div></div>
        <div class="x a-note b" data-b="end" style="top:384px">要修改，就改 Markdown 或 token 再重跑，不要直接改 HTML</div>
      </div>`
    ].join('')
  };

  /* ================= 3-3 從圖片、Vibe Coding 原型建立 ================= */
  const SRC33 = [
    { img: 'comp-doc', name: 'Figma 設計稿', sub: '證據最完整', tag: '上一堂' },
    { img: 'research', name: '截圖', sub: '量得到顏色、間距、圓角', tag: '這一堂' },
    { img: 'coding', name: 'Vibe coding 原型', sub: '程式碼裡有真實的值', tag: '這一堂' }
  ];
  const MEAS = [['顏色', '#111111', '<span class="d-mart" style="background:#111111"></span>'], ['間距', '16px', '<span class="d-mart">↔</span>'],
    ['圓角', '10px', '<span class="d-mart"><i class="d-mart__corner"></i></span>'], ['字級', '17px', '<span class="d-mart">Aa</span>']];
  const TIERS = [['ref', 'shop-ref-color-neutral-5'], ['sys', 'shop-sys-color-primary'], ['comp', 'shop-comp-button-color-primary-container-default']];

  DSC.ANIMS.ext33 = {
    length: '約 1 分鐘',
    poster: 8000,
    scenes: [
      {
        title: '沒有 Figma 也可以', dur: 11,
        caption: '沒有 Figma 也能萃取。手上只有截圖，或只有一個用 vibe coding 做出來的原型，都可以當作來源，只是各有要注意的地方。',
        beats: [[0.2, 't'], [0.8, 's0'], [2.4, 's0', 'is-done'], [2.8, 's1'], [4.2, 's2'], [6.2, 'end']]
      },
      {
        title: '截圖量得到', dur: 12,
        caption: '截圖量得到顏色、間距、圓角和字級。這些值是從畫面上量出來的，會標成 measured，代表可能有一點誤差。',
        beats: [[0.2, 't'], [0.8, 'shot'], [2.0, 'm0'], [2.0, 'h0', 'is-in', 3.6], [3.6, 'm1'], [3.6, 'h1', 'is-in', 5.2],
          [5.2, 'm2'], [5.2, 'h2', 'is-in', 6.8], [6.8, 'm3'], [6.8, 'h3', 'is-in', 8.4], [8.8, 'end']]
      },
      {
        title: '截圖看不到', dur: 12,
        caption: '但截圖看不到名字，也看不到互動狀態：hover、停用、載入中。截圖越多張、狀態越齊全越好；沒截到的狀態會記成「缺少的狀態」，在 skill 最後列出下一步時告訴它怎麼處理。',
        beats: [[0.2, 't'], [0.8, 'one'], [2.0, 'nm'], [3.0, 'q0'], [3.6, 'q1'], [4.2, 'q2'], [4.8, 'q3'], [6.4, 'more'], [7.2, 'f1', 'is-go'], [7.8, 'f2', 'is-go'], [8.8, 'miss'], [9.8, 'end']]
      },
      {
        title: '原型的程式碼', dur: 13,
        caption: 'Vibe coding 原型的程式碼裡，有真實的顏色、字級和元件結構，但常常到處寫死數值、重複做元件。萃取時，這些值會整理成三層 token。',
        beats: [[0.2, 't'], [0.8, 'code'], [2.0, 'h0', 'is-hot'], [2.8, 'h1', 'is-hot'], [3.6, 'h2', 'is-hot'], [5.0, 'h3', 'is-hot'],
          [6.6, 'arr'], [7.0, 'tiers'], [7.6, 'z0'], [8.2, 'z1'], [8.8, 'z2'], [10.2, 'end']]
      },
      {
        title: '兩個停點特別重要', dur: 12,
        caption: '截圖量到的值有誤差：差到看不出來的，skill 自動合併並記在表上；差多一點的，列成表請你確認。原型程式碼裡是確切的數字，相近的也不會自動合併。相似的元件，一定停下來問你。',
        beats: [[0.2, 't'], [0.8, 'ca'], [1.8, 'pa0'], [3.4, 'pa1'], [5.2, 'cb'], [6.0, 'pb0'], [7.0, 'pb1'], [7.8, 'pb2'], [9.4, 'end']]
      }
    ],
    html: () => [
      // 1 三種來源：Figma 是上一堂，這一堂看截圖和原型
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">沒有 Figma，也能萃取</div>
        ${SRC33.map((s, i) => `<div class="x d-src b b--pop" data-b="s${i}" style="left:${95 + i * 210}px;top:96px;width:190px"><span class="d-src__tag${i ? ' d-src__tag--on' : ''}">${s.tag}</span>${img(s.img)}<b>${s.name}</b><small>${s.sub}</small></div>`).join('')}
        <div class="x a-note b" data-b="end" style="top:384px">截圖、原型，都可以當作來源</div>
      </div>`,
      // 2 截圖量得到：一次量一種，手機上亮出量的位置
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">截圖：量得到顏色、間距、圓角、字級</div>
        <div class="x d-shot b b--left" data-b="shot" style="left:110px;top:80px;width:180px">
          <div class="a-phone"><div class="a-screen">${TEE()}<b>簡約短袖上衣</b><i></i><span class="a-btn">加入購物車</span>
            <span class="d-hl" data-b="h0" style="left:11px;top:159px;width:110px;height:44px"></span>
            <span class="d-hl d-hl--pad" data-b="h1" style="left:0;top:0;bottom:0;width:16px"></span>
            <span class="d-hl d-hl--corner" data-b="h2" style="left:9px;top:157px;width:34px;height:34px"></span>
            <span class="d-hl" data-b="h3" style="left:11px;top:98px;width:116px;height:32px"></span>
          </div></div>
          <small class="d-shot__name">product-page.png</small>
        </div>
        <div class="x" style="left:350px;top:100px;width:370px">${MEAS.map(([k, v, art], i) => `<div class="d-mrow b b--left" data-b="m${i}">${art}<span>${k}</span><code>${v}</code><em>measured</em></div>`).join('')}</div>
        <div class="x a-note b" data-b="end" style="top:384px">量出來的值會標成 measured：可能有一點誤差</div>
      </div>`,
      // 3 截圖看不到：名字、互動狀態；多截幾張補齊
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">截圖看不到：名字和互動狀態</div>
        <div class="x d-one b b--left" data-b="one" style="left:80px;top:96px;width:230px"><small>截到的按鈕</small><span class="a-btn a-btn--lg">加入購物車</span><span class="d-noname b b--pop" data-b="nm">元件名字<b>？</b></span></div>
        <div class="x d-states" style="left:340px;top:96px;width:390px">
          <div class="d-state b b--pop" data-b="q0"><small>預設</small><span class="a-btn">加入購物車</span></div>
          <div class="d-state d-state--q b b--pop" data-b="q1"><small>Hover</small><span class="a-swap" data-b="f1"><span class="a-swap__old"><b class="d-q">？</b></span><span class="a-swap__new"><span class="a-btn d-hover">加入購物車</span></span></span></div>
          <div class="d-state d-state--q b b--pop" data-b="q2"><small>停用</small><span class="a-swap" data-b="f2"><span class="a-swap__old"><b class="d-q">？</b></span><span class="a-swap__new"><span class="a-btn a-btn--off">加入購物車</span></span></span></div>
          <div class="d-state d-state--q b b--pop" data-b="q3"><small>載入中</small><b class="d-q">？</b><em class="d-miss b b--fade" data-b="miss">沒截到 → 記成缺少的狀態</em></div>
        </div>
        <div class="x d-more b b--pop" data-b="more" style="left:118px;top:318px">＋ 補截 hover、停用</div>
        <div class="x a-note b" data-b="end" style="top:384px">截圖越多張、狀態越齊全越好</div>
      </div>`,
      // 4 原型的程式碼：值是真的，但到處寫死、重複做元件
      `<div class="anim__scene" data-s="3">${arrowDefs('a-ar33')}
        <div class="x a-title b" data-b="t">原型：值是真的，但到處寫死</div>
        <div class="x d-code b b--left" data-b="code" style="left:50px;top:88px;width:370px">
          <p class="d-code__f">ProductPage.jsx</p>
          <div class="d-cl" data-b="h0">background: <mark>'#111111'</mark><em>寫死</em></div>
          <div class="d-cl" data-b="h1">borderRadius: <mark>'10px'</mark><em>寫死</em></div>
          <p class="d-code__f">CartPage.jsx</p>
          <div class="d-cl" data-b="h2">background: <mark>'#121212'</mark><em>寫死</em></div>
          <p class="d-code__f">components/</p>
          <div class="d-cl d-cl--dup" data-b="h3">BuyButton.jsx<em>很像</em></div>
          <div class="d-cl d-cl--dup" data-b="h3">AddToCartButton.jsx<em>很像</em></div>
        </div>
        <svg class="x b b--fade" data-b="arr" style="left:426px;top:196px" width="44" height="30" viewBox="0 0 44 30" aria-hidden="true"><path class="a-dash" d="M4 15 H36" marker-end="url(#a-ar33)"/></svg>
        <div class="x d-tiers b" data-b="tiers" style="left:476px;top:112px;width:300px"><span class="a-box__tag">整理成三層 token</span>
          ${TIERS.map(([l, n], i) => `<div class="d-t3 b b--left" data-b="z${i}"><span class="a-layer-tag">${l}</span><code>${n}</code></div>`).join('')}
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">寫死的值，整理成三層 token</div>
      </div>`,
      // 5 兩個停點：相近 token、相似元件
      `<div class="anim__scene" data-s="4">
        <div class="x a-title b" data-b="t">這兩個停點，特別重要</div>
        <div class="x d-stopcard b b--left" data-b="ca" style="left:70px;top:92px;width:320px"><span class="a-box__tag">相近 token · 截圖量到的值</span>
          <div class="d-pair b" data-b="pa0"><span class="d-sw">${sw('#111111')}${sw('#131313')}</span><span class="d-pair__txt"><b>#111111 ≈ #131313</b><small class="ok">看不出差別：自動合併，記在表上</small></span></div>
          <div class="d-pair b" data-b="pa1"><span class="d-sw">${sw('#111111')}${sw('#1A1A1A')}</span><span class="d-pair__txt"><b>#111111 ≈ #1A1A1A</b><small class="ask">差多一點：列成表，請你確認</small></span></div>
        </div>
        <div class="x d-stopcard b" data-b="cb" style="left:410px;top:92px;width:320px"><span class="a-box__tag">相似元件</span>
          <div class="d-twins b" data-b="pb0"><span class="d-twin"><span class="a-btn a-btn--S">立即購買</span><code>BuyButton</code></span><span class="d-twin"><span class="a-btn a-btn--S">加入購物車</span><code>AddToCartButton</code></span></div>
          <p class="d-ask2 b" data-b="pb1">一定停下來問你</p>
          <div class="b" data-b="pb2">${keys(['merge', 'make variant', 'keep distinct', 'blocked'])}</div>
        </div>
        <div class="x a-note b" data-b="end" style="top:384px">差多一點的值、相似的元件，都由你決定</div>
      </div>`
    ].join('')
  };
})();
