/* 互動練習（二）：模擬 Storybook、中央工廠、先查現有元件、視覺比對報告 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, md } = DSC;
  const W = (DSC.WIDGETS = DSC.WIDGETS || {});

  /* ---------- 4-1 模擬 Storybook ---------- */
  const SBC = {
    button: {
      title: 'Button', slug: 'button',
      desc: 'Mini Shop 的主要按鈕，例如「加入購物車」。背景、文字和圓角都綁 comp token，不寫死數值。',
      argTypes: { label: { type: 'text' }, variant: { type: 'select', options: ['filled', 'outlined'] }, size: { type: 'radio', options: ['S', 'M', 'L'] }, disabled: { type: 'boolean' } },
      stories: {
        default: { name: 'Default', args: { label: '加入購物車', variant: 'filled', size: 'M', disabled: false } },
        hover: { name: 'Hover', hover: true, args: { label: '加入購物車', variant: 'filled', size: 'M', disabled: false } },
        'focus-visible': { name: 'FocusVisible', focus: true, args: { label: '加入購物車', variant: 'filled', size: 'M', disabled: false } },
        disabled: { name: 'Disabled', args: { label: '加入購物車', variant: 'filled', size: 'M', disabled: true } }
      },
      render: (a, s) => `<button class="shop-btn shop-btn--${a.variant} shop-btn--${a.size}${s.hover ? ' is-hover' : ''}${s.focus ? ' is-focus' : ''}" data-sb-click${a.disabled ? ' disabled' : ''}>${esc(a.label || ' ')}</button>`,
      log: a => `{ label: "${a.label}" }`
    },
    sheet: {
      title: 'AddToCartSheet', slug: 'addtocartsheet',
      desc: '加入購物車面板：用尺寸選項、數量加減器和 Button 組成的「組件」。',
      argTypes: { size: { type: 'radio', options: ['S', 'M', 'L'] }, qty: { type: 'range', min: 1, max: 3 }, soldOut: { type: 'boolean' } },
      stories: {
        default: { name: 'Default', args: { size: 'M', qty: 1, soldOut: false } },
        'sold-out': { name: 'SoldOut', args: { size: 'M', qty: 1, soldOut: true } }
      },
      render: a => `<div class="shop-card shop-sheet"><div class="shop-sheet__top"><span class="shop-thumb">${DSC.tee('#8FA8C8')}</span><span><b>簡約短袖上衣</b><span class="shop-price">NT$490</span></span></div>
        <span class="shop-sheet__label">尺寸</span><span class="shop-chips">${['S', 'M', 'L'].map(z => `<span class="shop-chip${z === a.size ? ' is-on' : ''}">${z}</span>`).join('')}</span>
        <span class="shop-sheet__row"><span class="shop-sheet__label">數量</span><span class="shop-stepper" role="img" aria-label="數量 ${a.qty}"><span aria-hidden="true">−</span><b>${a.qty}</b><span aria-hidden="true">+</span></span></span>
        <button class="shop-btn shop-btn--M shop-btn--block" data-sb-click${a.soldOut ? ' disabled' : ''}>${a.soldOut ? '已售完' : '加入購物車'}</button></div>`,
      log: a => `{ action: "加入購物車", size: "${a.size}", qty: ${a.qty} }`
    }
  };
  const ICON = {
    vp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    measure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/></svg>',
    outline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.5" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'
  };
  const TOOLS = [['vp', '切換手機尺寸'], ['dark', '切換深色背景'], ['measure', '量尺'], ['outline', '顯示外框']];
  const LEGEND = [
    '元件目錄：專案裡所有元件都列在這裡。元件底下的每一個項目就是一個 story，也就是一種狀態。',
    '畫布：顯示真正用程式寫出來的元件，不是截圖。點一下按鈕試試看。',
    '工具列：切換手機尺寸、深色背景，打開量尺和外框來檢查間距。',
    '面板：Controls 可以即時改屬性；Actions 會記錄按鈕被點了幾次。',
    'Docs 文件頁：自動整理元件說明、屬性表和所有 story，可以直接當規格看。'
  ];

  W.storybook = el => {
    const st = { comp: 'button', story: 'default', view: 'canvas', vp: false, dark: false, measure: false, outline: false, panel: 'controls', args: {}, log: [], hl: 0 };
    const setStory = (c, s) => { st.comp = c; st.story = s; st.args = Object.assign({}, SBC[c].stories[s].args); };
    setStory('button', 'default');
    const item = (go, label) => `<button class="sbm__item" type="button" data-go="${go}">${label}</button>`;
    el.innerHTML = `<div class="sbm">
      <div class="sbm__url"><span class="sbm__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="sbm__addr" aria-label="這個 story 的網址"></span></div>
      <div class="sbm__body">
        <nav class="sbm__side sbm-r" data-r="1" aria-label="元件目錄"><button class="hs" type="button" data-hs="1" aria-label="說明 1：元件目錄">1</button>
          <div class="sbm__search" aria-hidden="true">搜尋元件…</div>
          <div class="sbm__group">FOUNDATIONS</div>${item('colors', 'Color Guides')}
          <div class="sbm__group">COMPONENTS</div><div class="sbm__comp">Button</div>${item('button:docs', 'Docs')}${item('button:default', 'Default')}${item('button:hover', 'Hover')}${item('button:focus-visible', 'FocusVisible')}${item('button:disabled', 'Disabled')}
          <div class="sbm__comp">AddToCartSheet</div>${item('sheet:docs', 'Docs')}${item('sheet:default', 'Default')}${item('sheet:sold-out', 'SoldOut')}
        </nav>
        <div class="sbm__main">
          <div class="sbm__toolbar sbm-r" data-r="3"><button class="hs" type="button" data-hs="3" aria-label="說明 3：工具列">3</button>
            <div class="sbm__tabs" role="tablist"><button type="button" role="tab" data-view="canvas">Canvas</button><button type="button" role="tab" data-view="docs" class="sbm-r" data-r="5">Docs</button><button class="hs hs--inline" type="button" data-hs="5" aria-label="說明 5：Docs 文件頁">5</button></div>
            <div class="sbm__tools">${TOOLS.map(([k, t]) => `<button class="sbm__tool" type="button" data-tool="${k}" aria-pressed="false" title="${t}" aria-label="${t}">${ICON[k]}</button>`).join('')}</div>
          </div>
          <div class="sbm__canvas sbm-r" data-r="2"><button class="hs" type="button" data-hs="2" aria-label="說明 2：畫布">2</button><div class="sbm__frame"></div></div>
          <div class="sbm__panel sbm-r" data-r="4"><button class="hs" type="button" data-hs="4" aria-label="說明 4：面板">4</button>
            <div class="sbm__ptabs" role="tablist"><button type="button" role="tab" data-p="controls">Controls</button><button type="button" role="tab" data-p="actions">Actions <span class="sbm__count"></span></button></div>
            <div class="sbm__pbody"></div>
          </div>
        </div>
      </div></div>
      <ol class="sbm-legend">${LEGEND.map((t, i) => `<li><button type="button" data-hs="${i + 1}" aria-pressed="false"><b>${i + 1}</b><span>${esc(t)}</span></button></li>`).join('')}</ol>`;

    const frame = $('.sbm__frame', el), canvas = $('.sbm__canvas', el), pbody = $('.sbm__pbody', el);
    const C = () => SBC[st.comp];
    const path = () => st.view === 'colors' ? '/docs/foundations-color-guides--docs' : st.view === 'docs' ? `/docs/components-${C().slug}--docs` : `/story/components-${C().slug}--${st.story}`;
    const docsPage = () => {
      const c = C(); const first = Object.keys(c.stories)[0]; const s = c.stories[first];
      return `<div class="sbm-docs"><p class="sbm-docs__crumb">Components / ${c.title}</p><h4>${c.title}</h4><p>${esc(c.desc)}</p>
        <div class="sbm-docs__preview shop">${c.render(s.args, s)}</div>
        <table><thead><tr><th>屬性</th><th>可以選</th><th>預設值</th></tr></thead><tbody>${Object.entries(c.argTypes).map(([k, t]) => `<tr><td><code>${k}</code></td><td>${t.options ? t.options.join(' / ') : t.type === 'range' ? `${t.min}–${t.max}` : t.type}</td><td>${esc(String(s.args[k]))}</td></tr>`).join('')}</tbody></table>
        <p>Stories：${Object.entries(c.stories).map(([k, v]) => `<button class="sbm-docs__story" type="button" data-story="${k}">${v.name}</button>`).join('')}</p></div>`;
    };
    const colorsPage = () => `<div class="sbm-docs"><p class="sbm-docs__crumb">Foundations / Color Guides</p><h4>Color Guides</h4><p>三層 token：sys 指向 ref，comp 再指向 sys。</p><div class="sbm-colors">${[
      ['--shop-sys-color-primary', '#111111', '→ ref neutral-5'], ['--shop-sys-color-on-primary', '#FFFFFF', '→ ref neutral-100'],
      ['--shop-sys-color-surface', '#F2F2F2', '→ ref neutral-95'], ['--shop-sys-color-on-surface', '#111111', '→ ref neutral-5']
    ].map(([n, c, r]) => `<div class="sbm-color"><span style="background:${c}"></span><code>${n}</code><small>${r}</small></div>`).join('')}</div></div>`;
    const measure = () => {
      let m = $('.sbm__measure', canvas);
      if (!st.measure || st.view !== 'canvas') { if (m) m.remove(); return; }
      const t = $('.shop > *', frame); if (!t) return;
      const r = t.getBoundingClientRect();
      if (!m) { m = document.createElement('span'); m.className = 'sbm__measure'; canvas.appendChild(m); }
      m.textContent = `寬 ${Math.round(r.width)} × 高 ${Math.round(r.height)} px`;
    };
    const drawCanvas = () => {
      canvas.classList.toggle('is-dark', st.dark && st.view === 'canvas');
      frame.classList.toggle('is-mobile', st.vp && st.view === 'canvas');
      frame.classList.toggle('is-outline', st.outline);
      if (st.view === 'colors') frame.innerHTML = colorsPage();
      else if (st.view === 'docs') frame.innerHTML = docsPage();
      else frame.innerHTML = `<div class="shop">${C().render(st.args, C().stories[st.story])}</div>`;
      measure();
    };
    const ctl = (k, t, v) => {
      const id = `sb-${k}`;
      if (t.type === 'text') return `<input id="${id}" type="text" data-arg="${k}" value="${esc(v)}">`;
      if (t.type === 'select') return `<select id="${id}" data-arg="${k}">${t.options.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
      if (t.type === 'radio') return `<div class="sbm__radio" role="radiogroup" aria-labelledby="${id}-l">${t.options.map(o => `<label><input type="radio" name="${id}" data-arg="${k}" value="${o}"${o === v ? ' checked' : ''}> ${o}</label>`).join('')}</div>`;
      if (t.type === 'boolean') return `<label class="sbm__switch"><input id="${id}" type="checkbox" data-arg="${k}"${v ? ' checked' : ''}><span>${v}</span></label>`;
      if (t.type === 'range') return `<input id="${id}" type="range" min="${t.min}" max="${t.max}" data-arg="${k}" value="${v}"> <span>${v}</span>`;
      return '';
    };
    const drawPanel = () => {
      $$('[data-p]', el).forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === st.panel)));
      $('.sbm__count', el).textContent = st.log.length ? `(${st.log.length})` : '';
      if (st.view !== 'canvas') { pbody.innerHTML = '<p class="sbm__empty">Docs 頁不用 Controls。切回 Canvas 或點一個 story，就能調整屬性。</p>'; return; }
      if (st.panel === 'actions') {
        pbody.innerHTML = st.log.length ? st.log.slice().reverse().map(l => `<div class="sbm__log">${esc(l)}</div>`).join('') : '<p class="sbm__empty">點一下畫布上的按鈕，這裡會記錄 onClick 事件。</p>';
        return;
      }
      pbody.innerHTML = Object.entries(C().argTypes).map(([k, t]) => `<div class="sbm__ctl"><label for="sb-${k}" id="sb-${k}-l">${k}</label><div>${ctl(k, t, st.args[k])}</div></div>`).join('');
    };
    const drawAll = () => {
      $('.sbm__addr', el).textContent = 'localhost:6006/?path=' + path();
      $$('.sbm__item', el).forEach(b => {
        const go = b.dataset.go;
        const cur = st.view === 'colors' ? go === 'colors' : st.view === 'docs' ? go === `${st.comp}:docs` : go === `${st.comp}:${st.story}`;
        b.setAttribute('aria-current', String(cur));
      });
      $$('[data-view]', el).forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === (st.view === 'canvas' ? 'canvas' : 'docs'))));
      drawCanvas(); drawPanel();
    };
    const highlight = n => {
      st.hl = st.hl === n ? 0 : n;
      $$('.sbm-r', el).forEach(r => r.classList.toggle('is-hl', Number(r.dataset.r) === st.hl));
      $$('.sbm-legend [data-hs]', el).forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.hs) === st.hl)));
    };

    el.addEventListener('click', e => {
      const hs = e.target.closest('[data-hs]');
      if (hs) { highlight(Number(hs.dataset.hs)); return; }
      const go = e.target.closest('[data-go]');
      if (go) {
        const g = go.dataset.go;
        if (g === 'colors') st.view = 'colors';
        else { const [c, s] = g.split(':'); if (s === 'docs') { st.comp = c; st.view = 'docs'; } else { setStory(c, s); st.view = 'canvas'; } }
        drawAll(); return;
      }
      const v = e.target.closest('[data-view]');
      if (v) { if (v.dataset.view === 'canvas' && st.view !== 'canvas') { if (st.view === 'colors') setStory('button', 'default'); st.view = 'canvas'; } else if (v.dataset.view === 'docs') { if (st.view === 'colors') st.comp = 'button'; st.view = 'docs'; } drawAll(); return; }
      const story = e.target.closest('[data-story]');
      if (story) { setStory(st.comp, story.dataset.story); st.view = 'canvas'; drawAll(); return; }
      const tool = e.target.closest('[data-tool]');
      if (tool) { const k = tool.dataset.tool; st[k] = !st[k]; tool.setAttribute('aria-pressed', String(st[k])); drawCanvas(); return; }
      const p = e.target.closest('[data-p]');
      if (p) { st.panel = p.dataset.p; drawPanel(); return; }
      const c = e.target.closest('[data-sb-click]');
      if (c && !c.disabled && st.view === 'canvas') {
        const t = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        st.log.push(`${t}  onClick  ${C().log(st.args)}`);
        drawPanel();
        if (st.panel !== 'actions') DSC.toast('Actions 面板記下了一次點擊');
      }
    });
    el.addEventListener('input', e => {
      const i = e.target.closest('[data-arg]'); if (!i) return;
      const k = i.dataset.arg; const t = C().argTypes[k];
      st.args[k] = t.type === 'boolean' ? i.checked : t.type === 'range' ? Number(i.value) : i.value;
      if ((t.type === 'boolean' || t.type === 'range') && i.nextElementSibling) i.nextElementSibling.textContent = String(st.args[k]);
      drawCanvas();
    });
    drawAll();
  };

  // 4-1：模擬 Storybook + addon 一覽
  W.storybookAddons = el => {
    const panels = DSC.tabs(el, [{ label: '模擬 Storybook' }, { label: 'Addon 一覽' }]);
    panels.forEach(p => p.classList.add('tabs__panel--bare'));
    W.storybook(panels[0]);
    W.addons(panels[1]);
  };

  /* ---------- 5-2 中央工廠：同一套積木，設計師、PM、工程師各自拿去用 ---------- */
  W.factory = el => {
    const BLOCKS = [
      { id: 'button', name: 'Button', prev: '<span class="shop-btn shop-btn--S">加入</span>' },
      { id: 'stepper', name: 'Stepper', prev: '<span class="shop-stepper"><span>−</span><b>1</b><span>＋</span></span>' },
      { id: 'chip', name: 'SizeChip', prev: '<span class="shop-chip is-on">M</span>' },
      { id: 'sheet', name: 'AddToCartSheet', prev: '<span class="fac__sheet-ic"><i></i><i></i><i></i></span>' }
    ];
    let hl = null, sale = false, screen = 'product', note = '先點上面的一個積木，看它用在哪裡；再換一次主色。';
    const tee = cls => `<span class="${cls}">${DSC.tee('#8FA8C8')}</span>`;
    const chips = () => '<span class="shop-chips" data-part="chip"><span class="shop-chip">S</span><span class="shop-chip is-on">M</span><span class="shop-chip">L</span></span>';
    const stepper = () => '<span class="shop-stepper" data-part="stepper"><span>−</span><b>1</b><span>＋</span></span>';
    const btn = (cls = '') => `<span class="shop-btn shop-btn--S${cls}" data-part="button">加入購物車</span>`;
    const sheet = cta => `<div class="fac__sheet" data-part="sheet">${chips()}<div class="fac__row"><small>數量</small>${stepper()}</div>${cta}</div>`;
    // 設計師：Figma 裡的元件和每一個狀態
    const figma = `<div class="fac__win"><p class="fac__bar"><i></i><i></i><i></i><span>Figma · Mini Shop 元件</span></p><div class="fac__fig">
        <span class="fac__inst">${btn()}<small>Default</small></span>
        <span class="fac__inst">${btn(' is-off')}<small>Disabled</small></span>
        <span class="fac__inst">${chips()}<small>SizeChip</small></span>
        <span class="fac__inst">${stepper()}<small>Stepper</small></span>
        <span class="fac__inst fac__inst--wide">${sheet(btn())}<small>AddToCartSheet</small></span>
      </div></div>`;
    // 工程師：正式頁面，資料從 API 來
    const web = `<div class="fac__win"><p class="fac__bar"><i></i><i></i><i></i><span>shop.example.com/products/42</span></p><div class="fac__web">
        <div class="fac__prod">${tee('fac__thumb')}<div><b>簡約短袖上衣</b><span class="fac__price">NT$490</span></div></div>
        <code class="fac__api">GET /api/products/42 → 200</code>
        ${sheet(btn())}
      </div></div>`;
    // PM：能點的原型，資料是假的
    const phone = () => screen === 'product'
      ? `<span class="fac__tag">假資料</span>${tee('fac__img')}<b class="fac__h">簡約短袖上衣</b><span class="fac__price">NT$490</span><button type="button" class="shop-btn shop-btn--S fac__cta" data-part="button" data-go="sheet">加入購物車</button>`
      : screen === 'sheet'
        ? `<span class="fac__tag">假資料</span><div class="fac__behind" aria-hidden="true">${tee('fac__img')}</div>${sheet('<button type="button" class="shop-btn shop-btn--S fac__cta" data-part="button" data-go="done">加入購物車</button>')}`
        : '<div class="fac__done"><span aria-hidden="true">✓</span><b>已加入購物車</b><button type="button" class="link-more" data-go="product">再走一次</button></div>';
    const role = (k, txt, out) => `<section class="fac__role"><div class="fac__who">${DSC.img(DSC.ROLES[k].img, '')}<div><b>${esc(DSC.ROLES[k].name)}</b><span>${txt}</span></div></div><div class="fac__out shop">${out}</div></section>`;
    el.innerHTML = `<div class="fac">
      <div class="fac__top">
        <div><p class="fac__label">中央工廠：Storybook 元件庫</p>
          <div class="fac__blocks shop" role="group" aria-label="工廠裡的積木">${BLOCKS.map(b => `<button type="button" class="fac__blk" data-blk="${b.id}" aria-pressed="false"><span class="fac__prev" aria-hidden="true">${b.prev}</span><code>${b.name}</code></button>`).join('')}</div></div>
        <div class="fac__theme" role="group" aria-label="主色 token"><span>主色 token</span><button type="button" data-sale="0" aria-pressed="true">經典黑</button><button type="button" data-sale="1" aria-pressed="false">週年慶紅</button></div>
      </div>
      <p class="fac__down" aria-hidden="true">三個角色拿同一套積木</p>
      <div class="fac__roles">
        ${role('designer', '檢查每個狀態，同步回 Figma', figma)}
        ${role('pm', '拼出能點的原型，先驗證流程', '<div class="phone fac__phone"><div class="phone__screen fac__screen" data-screen></div></div>')}
        ${role('engineer', '做正式頁面，接上真的資料', web)}
      </div>
      <p class="fac__note" aria-live="polite"></p>
    </div>`;
    const root = $('.fac', el);
    const draw = () => {
      $('[data-screen]', el).innerHTML = phone();
      root.classList.toggle('fac--sale', sale);
      $$('.fac__blk', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.blk === hl)));
      $$('[data-sale]', el).forEach(b => b.setAttribute('aria-pressed', String((b.dataset.sale === '1') === sale)));
      $$('.fac__roles [data-part]', el).forEach(n => n.classList.toggle('is-hl', n.dataset.part === hl));
      $('.fac__note', el).textContent = note;
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-blk]');
      if (b) {
        hl = hl === b.dataset.blk ? null : b.dataset.blk;
        // 原型停在商品頁時看不到面板裡的積木，先幫你打開面板
        if (hl && hl !== 'button' && screen !== 'sheet') screen = 'sheet';
        const name = (BLOCKS.find(x => x.id === hl) || {}).name;
        note = hl ? `${name}：設計師的 Figma、PM 的原型、工程師的正式頁面，用的都是同一個元件。改它一次，三邊一起變。` : '先點上面的一個積木，看它用在哪裡；再換一次主色。';
        draw(); return;
      }
      const t = e.target.closest('[data-sale]');
      if (t) {
        sale = t.dataset.sale === '1';
        note = sale ? '主色 token 換成週年慶紅：Figma、原型和正式頁面一起變了，不用各改一次。' : '主色換回經典黑，三邊也一起換回來。';
        draw(); return;
      }
      const g = e.target.closest('[data-go]');
      if (g) {
        screen = g.dataset.go;
        if (screen === 'done') note = '原型走完了。接上真的資料，就是右邊工程師做的正式頁面：同一套積木，不用重畫。';
        draw();
      }
    });
    draw();
  };

  /* ---------- 5-3 先查現有元件：governance 對照元件庫，算出能用現有元件拼出幾成 ---------- */
  W.coverage = el => {
    const B = DSC.COV;
    el.innerHTML = `<div class="cov"><div class="cov__screen shop" aria-label="新畫面：購物車">${B.map((b, i) => `<div class="cov__blk cov__blk--${b.h}" data-i="${i}">${esc(b.label)}</div>`).join('')}</div>
      <div><p class="cov__intro">新畫面「購物車」的截圖進來了。先別急著寫程式，按下面的按鈕，讓 governance 對照元件庫，看看能用現有元件拼出幾成。</p>
      <div class="w-actions"><button class="btn btn--primary btn--sm" type="button" data-a="run">先查現有元件</button><button class="btn btn--quiet btn--sm" type="button" data-a="reset">重來</button></div>
      <div class="cov__out" aria-live="polite"></div></div></div>`;
    let timers = [];
    const out = $('.cov__out', el);
    const reset = () => { timers.forEach(clearTimeout); timers = []; $$('.cov__blk', el).forEach(b => { b.className = b.className.replace(/\sis-\w+/g, ''); }); out.innerHTML = ''; };
    const run = () => {
      reset();
      const step = DSC.reduceMotion ? 0 : 260;
      B.forEach((b, i) => timers.push(setTimeout(() => $(`.cov__blk[data-i="${i}"]`, el).classList.add(`is-${b.st}`), step * (i + 1))));
      timers.push(setTimeout(() => {
        const score = B.reduce((s, b) => s + (b.st === 'ok' ? 1 : b.st === 'variant' ? 0.5 : 0), 0) / B.length;
        const pct = Math.round(score * 100);
        const group = (st, color, title) => {
          const list = B.filter(b => b.st === st);
          return list.length ? `<div class="cov__group"><b><span class="cov__dot" style="background:${color}"></span>${title}</b>${list.map(b => `${esc(b.label)} → ${md(b.comp)}`).join('<br>')}</div>` : '';
        };
        out.innerHTML = `<p style="margin:12px 0 0"><strong>約 ${pct}% 可以用現有元件拼出來。</strong></p><div class="cov__bar"><span></span></div>
          <div class="cov__groups">${group('ok', '#10A86E', '可以直接用')}${group('variant', '#D99A00', '現有元件加一個 variant')}${group('missing', '#D61F5A', '元件庫裡還沒有')}</div>
          <p style="margin:10px 0 0">下一步：你確認這張清單後，缺的元件先補進 Storybook 的共用元件庫，再用元件組出整頁。governance 全程盯著，不寫死樣式。</p>`;
        requestAnimationFrame(() => { const bar = $('.cov__bar span', out); if (bar) bar.style.width = pct + '%'; });
      }, step * (B.length + 1)));
    };
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'run') run(); else reset();
    });
  };

  /* ---------- 5-1 視覺比對報告 ---------- */
  W.parity = el => {
    el.innerHTML = `<div class="pv"><div class="pv__report"><div class="pv__verdict">NOT AT PARITY</div>${DSC.PARITY.map((l, i) =>
      `<button class="pv__line" type="button" data-i="${i}" aria-pressed="false"><span>${l.id}</span><span class="pv__mark pv__mark--${l.k}">${esc(l.mark)}</span><span>${esc(l.text)}</span></button>`).join('')}</div>
      <div class="pv__explain" aria-live="polite"><p>點左邊報告裡的任何一行，看看它要不要修。</p></div></div>
      <p class="pv__order-title">修的順序（先修源頭）：</p><ol class="pv__order">${DSC.FIX_ORDER.map(t => `<li>${esc(t)}</li>`).join('')}</ol>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('.pv__line'); if (!b) return;
      const l = DSC.PARITY[Number(b.dataset.i)];
      $$('.pv__line', el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('.pv__explain', el).innerHTML = `<p><b>${esc(l.title)}</b></p><p>${md(l.body)}</p>`;
    });
  };
})();
