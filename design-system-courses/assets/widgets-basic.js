/* 互動練習（一）：流水線、對照、Git、token、分類、排序、決策樹、AI 味、停點、來源、addon、清單 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, md, img } = DSC;
  const W = (DSC.WIDGETS = DSC.WIDGETS || {});
  let uidN = 0;
  const uid = p => `${p}${++uidN}`;

  /* ---------- 共用：分頁 ---------- */
  function tabs(el, list, onShow) {
    const id = uid('tb');
    el.innerHTML = `<div class="tabs__list" role="tablist">${list.map((t, i) => `<button class="tabs__btn" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" data-tab="${i}">${esc(t.label)}</button>`).join('')}</div>` +
      list.map((t, i) => `<div class="tabs__panel" role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}"${i ? ' hidden' : ''}>${t.html || ''}</div>`).join('');
    const btns = $$(':scope > .tabs__list .tabs__btn', el);
    const panels = $$(':scope > .tabs__panel', el);
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach((x, j) => x.setAttribute('aria-selected', String(j === i)));
      panels.forEach((p, j) => { p.hidden = j !== i; });
      if (onShow) onShow(i, panels[i]);
    }));
    return panels;
  }
  DSC.tabs = tabs;

  /* ---------- 0-1 五站流水線 ---------- */
  W.pipeline = el => {
    el.innerHTML = `<div class="pipe" role="tablist" aria-label="五站流水線">${DSC.PIPE.map((s, i) =>
      `<button class="pipe__st" role="tab" aria-selected="${i === 0}" data-i="${i}">${img(s.img, 'pipe__img')}<span class="pipe__no">第 ${i + 1} 站</span><span class="pipe__name">${esc(s.name)}</span></button>${i < DSC.PIPE.length - 1 ? '<span class="pipe__arrow" aria-hidden="true">→</span>' : ''}`).join('')}</div><div class="pipe__detail" role="tabpanel" aria-live="polite"></div>`;
    const show = i => {
      $$('.pipe__st', el).forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
      const s = DSC.PIPE[i];
      $('.pipe__detail', el).innerHTML = `<div class="io"><div><span class="io__label">放進去</span>${md(s.in)}</div><div class="io__arrow" aria-hidden="true">→</div><div><span class="io__label">拿出來</span>${md(s.out)}</div></div>
        <p class="pipe__skill">負責的 skill：${s.skills.map(k => `<code>${esc(k)}</code>`).join(' ')}　<a href="#part-${s.part}">看第 ${s.part} 部 →</a></p>`;
    };
    el.addEventListener('click', e => { const b = e.target.closest('.pipe__st'); if (b) show(+b.dataset.i); });
    show(0);
  };

  /* ---------- 0-2 沒有設計系統 vs 有設計系統 ---------- */
  W.chaos = el => {
    const cap = {
      chaos: '同一個需求，AI 每天做出不一樣的按鈕：顏色、圓角、字重都不同。三個月後，沒有人知道哪一個才是對的。',
      system: 'AI 照著 token 和元件庫做，三天做出來的按鈕都一樣。要改主色，只要改一個 token。'
    };
    el.innerHTML = `<div class="evo">
        <figure>${img('designer')}<figcaption>設計師設計產品</figcaption></figure><span class="evo__arrow" aria-hidden="true">→</span>
        <figure>${img('coding')}<figcaption>工程師開發</figcaption></figure><span class="evo__arrow" aria-hidden="true">→</span>
        <figure>${img('ai-coding')}<figcaption>AI 一起開發，速度快很多</figcaption></figure></div>
      <div class="tabs__list" role="radiogroup" aria-label="比較兩種做法"><button class="tabs__btn" role="radio" aria-checked="true" aria-pressed="true" data-m="chaos">沒有設計系統</button><button class="tabs__btn" role="radio" aria-checked="false" aria-pressed="false" data-m="system">有設計系統＋元件庫</button></div>
      <div class="chaos" data-mode="chaos">${[1, 2, 3].map(d => `<div class="chaos__screen chaos__screen--d${d}"><span class="chaos__day">AI 第 ${d} 天做的</span><span class="chaos__img"></span><span class="chaos__title">簡約短袖上衣</span><span class="chaos__field"></span><button class="chaos__btn" tabindex="-1" aria-hidden="true">加入購物車</button></div>`).join('')}</div>
      <p class="chaos__caption" aria-live="polite"></p>`;
    const set = m => {
      $('.chaos', el).dataset.mode = m;
      $$('[data-m]', el).forEach(b => { b.setAttribute('aria-checked', String(b.dataset.m === m)); b.setAttribute('aria-pressed', String(b.dataset.m === m)); });
      $('.chaos__caption', el).textContent = cap[m];
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) set(b.dataset.m); });
    set('chaos');
  };

  /* ---------- 0-3 Git ---------- */
  W.git = el => {
    el.innerHTML = `<div class="git"><div class="git__art">${img('game-timeline', '', '存檔點的時間軸')}</div>
      <table class="git__table"><thead><tr><th>我想…</th><th>指令</th><th>在編輯器裡</th></tr></thead><tbody>${DSC.GIT.map(r =>
        `<tr><td>${esc(r.want)}</td><td><code>${esc(r.cmd)}</code><button class="copy-mini" data-copy-text="${esc(r.cmd)}" aria-label="複製指令 ${esc(r.cmd)}">複製</button></td><td>${esc(r.ui)}</td></tr>`).join('')}</tbody></table></div>
      <ul class="git__rules">${DSC.GIT_RULES.map(r => `<li>${md(r)}</li>`).join('')}</ul>`;
  };

  /* ---------- 1-1 token 遊樂場 + 命名檢查器 ---------- */
  const hex = id => (DSC.SHOP_REF.find(r => r[0] === id) || [])[1] || '#000000';
  const lum = h => {
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  function playground(el) {
    let theme = 'classic';
    let map = Object.assign({}, DSC.SHOP_THEMES.classic.map);
    el.innerHTML = `<div class="tk__themes"><span>主題：</span>${Object.entries(DSC.SHOP_THEMES).map(([k, t]) => `<button class="tabs__btn" data-theme="${k}" aria-pressed="${k === theme}">${esc(t.name)}</button>`).join('')}</div>
      <div class="tk__cols">
        <div class="tk__col"><h5>ref 原始層<small>值一個都不會變</small></h5><div class="tk__refs"></div></div>
        <div class="tk__col"><h5>sys 語意層<small>換主題只改這裡：指向哪個 ref</small></h5>${DSC.SHOP_SYS.map(([k, n]) => `<div class="tk__row"><code>shop-sys-color-${k}</code><select data-sys="${k}" aria-label="${esc(n)}指向的 ref">${DSC.SHOP_REF.map(r => `<option value="${r[0]}">→ ref ${r[0]}</option>`).join('')}</select></div>`).join('')}</div>
        <div class="tk__col"><h5>comp 元件層<small>不用改，跟著 sys 走</small></h5>${DSC.SHOP_COMP.map(([k, s]) => `<div class="tk__comp">shop-comp-${k}<br><span>→ sys ${s}</span></div>`).join('')}</div>
      </div>
      <div class="tk__preview"><div class="tk__card"><small>限時優惠 · 剩 3 件</small><b>簡約短袖上衣</b><span>NT$490</span><button class="tk__btn" tabindex="-1" aria-hidden="true">加入購物車</button></div></div>
      <p class="tk__warn" aria-live="polite"></p>
      <p class="tk__note">ref 的值一個都沒改，comp 也沒改；換主題時，只改了 <strong>sys 指向哪一個 ref</strong>。</p>
      <pre class="tk__code"></pre>`;
    const draw = () => {
      const used = new Set(Object.values(map));
      $('.tk__refs', el).innerHTML = DSC.SHOP_REF.map(([id, h]) => `<div class="tk__ref${used.has(id) ? ' is-used' : ''}"><span class="tk__sw" style="background:${h}"></span>${id}<span style="margin-left:auto;color:var(--dsc-sys-color-muted)">${h}</span></div>`).join('');
      $$('[data-sys]', el).forEach(s => { s.value = map[s.dataset.sys]; });
      const card = $('.tk__card', el);
      card.style.setProperty('--p', hex(map.primary)); card.style.setProperty('--op', hex(map['on-primary']));
      card.style.setProperty('--s', hex(map.surface)); card.style.setProperty('--os', hex(map['on-surface']));
      const warn = [];
      if (contrast(hex(map.primary), hex(map['on-primary'])) < 4.5) warn.push('按鈕文字和按鈕底色對比不夠，可能看不清楚。');
      if (contrast(hex(map.surface), hex(map['on-surface'])) < 4.5) warn.push('卡片文字和卡片底色對比不夠。');
      $('.tk__warn', el).textContent = warn.length ? '注意：' + warn.join('') + '（這就是為什麼換主題時要檢查 sys 的搭配。）' : '';
      $$('[data-theme]', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === theme)));
      $('.tk__code', el).innerHTML = DSC.SHOP_SYS.map(([k]) => `--shop-sys-color-${k}: var(--shop-ref-color-${map[k]});`).join('\n') +
        '\n\n<span class="c">/* comp 不用改 */</span>\n' + DSC.SHOP_COMP.map(([k, s]) => `--shop-comp-${k}: var(--shop-sys-color-${s});`).join('\n');
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-theme]'); if (!b) return; theme = b.dataset.theme; map = Object.assign({}, DSC.SHOP_THEMES[theme].map); draw(); });
    el.addEventListener('change', e => { const s = e.target.closest('[data-sys]'); if (!s) return; map[s.dataset.sys] = s.value; theme = ''; draw(); });
    draw();
  }

  const SEM = ['primary', 'secondary', 'tertiary', 'surface', 'background', 'on', 'error', 'success', 'warning', 'outline', 'disabled', 'hover', 'focus', 'pressed', 'accent', 'brand', 'muted', 'inverse', 'container'];
  const COMPS = ['button', 'btn', 'card', 'product', 'chip', 'stepper', 'swatch', 'price', 'cart', 'nav', 'navigation', 'tag', 'dialog', 'modal', 'alert', 'icon', 'input', 'field', 'list', 'tab', 'tabs', 'toast', 'header', 'avatar', 'badge', 'menu', 'sheet', 'toolbar', 'bottom'];
  const ROLES = ['color', 'font', 'size', 'spacing', 'shadow', 'elevation', 'motion'];
  DSC.checkTokenName = name => {
    const p = String(name).trim().toLowerCase().replace(/^--/, '').split(/[-/.\s]+/).filter(Boolean);
    const res = [];
    if (!p.length) return res;
    res.push(p[0] === 'shop' ? { ok: true, t: '前綴是 shop' } : { ok: false, t: '開頭要是前綴 shop（這門課的範例前綴）' });
    const layer = p[1];
    const layerOk = ['ref', 'sys', 'comp'].includes(layer);
    res.push(layerOk ? { ok: true, t: `類型是 ${layer}` } : { ok: false, t: '第二段要寫類型：ref、sys 或 comp' });
    const rest = p.slice(2);
    const roleAt = rest.findIndex(x => ROLES.includes(x));
    if (rest.length < 2) res.push({ ok: false, t: '後面至少要有「角色-變體」，例如 color-primary' });
    const hasComp = rest.some(x => COMPS.includes(x));
    const hasSem = rest.some(x => SEM.includes(x));
    if (layer === 'ref' || layer === 'sys') {
      res.push(roleAt === 0 ? { ok: true, t: `類型後面接角色 ${rest[0]}` } : { ok: false, t: '照 Mini Shop 的順序，類型後面要接角色：color、font、size、spacing、shadow、elevation 或 motion' });
    }
    if (layer === 'ref') {
      res.push(hasSem ? { ok: false, t: 'ref 只描述值本身，不放 primary、surface 這類用途' } : { ok: true, t: 'ref 沒有放用途' });
      res.push(hasComp ? { ok: false, t: 'ref 不放元件名稱，元件名稱只能出現在 comp' } : { ok: true, t: 'ref 沒有放元件名稱' });
    } else if (layer === 'sys') {
      res.push(hasComp ? { ok: false, t: 'sys 是共用的用途，不放元件名稱' } : { ok: true, t: 'sys 沒有放元件名稱' });
    } else if (layer === 'comp') {
      const comp = roleAt > 0 ? rest.slice(0, roleAt) : [];
      if (!hasComp) res.push({ ok: false, t: 'comp 要寫出是哪個元件，例如 button、card' });
      else if (roleAt === -1) res.push({ ok: false, t: '元件後面要接角色：color、font、size、spacing、shadow、elevation 或 motion' });
      else if (!comp.some(x => COMPS.includes(x))) res.push({ ok: false, t: '照 Mini Shop 的順序，comp 後面先寫元件，再寫角色（comp-button-color-…）' });
      else res.push({ ok: true, t: `comp 後面先寫元件 ${comp.join('-')}，再寫角色 ${rest[roleAt]}` });
    }
    return res;
  };

  function nameChecker(el) {
    const id = uid('nc');
    el.innerHTML = `<div class="nc"><label for="${id}">輸入一個 token 名字</label><input id="${id}" type="text" spellcheck="false" autocomplete="off" value="shop-ref-spacing-card-padding">
      <div class="nc__ex"><span class="w-help" style="margin:0 4px 0 0">試試這些：</span>${DSC.NAME_EXAMPLES.map(n => `<button type="button" data-name="${n}">${n}</button>`).join('')}</div>
      <ul class="nc__checks" aria-live="polite"></ul><div class="nc__verdict"></div></div>`;
    const input = $('input', el);
    const draw = () => {
      const r = DSC.checkTokenName(input.value);
      $('.nc__checks', el).innerHTML = r.map(x => `<li class="${x.ok ? 'ok' : 'bad'}">${esc(x.t)}</li>`).join('');
      const ok = r.length && r.every(x => x.ok);
      $('.nc__verdict', el).innerHTML = !input.value.trim() ? '' : ok ? '<p class="res res--ok"><strong>這個名字沒問題。</strong></p>' : '<p class="res res--bad"><strong>還要調整</strong>：看上面打叉的那幾條。</p>';
    };
    input.addEventListener('input', draw);
    el.addEventListener('click', e => { const b = e.target.closest('[data-name]'); if (!b) return; input.value = b.dataset.name; draw(); });
    draw();
  }

  /* 命名結構：七欄跟命名結構圖一樣；欄位可以換位置，下面三個 token 會一起照新順序重排 */
  function nameBuilder(el) {
    const SLOTS = DSC.NAME_SLOTS;
    const first = SLOTS.map(x => x.id);
    let order = first.slice();
    const pick = Object.assign({}, DSC.NAME_START);
    const slot = id => SLOTS.find(x => x.id === id);
    const nameOf = t => order.filter(id => t[id]).map(id => `<span class="nb__seg nb__seg--${slot(id).group}">${esc(t[id])}</span>`).join('<i>-</i>');
    el.innerHTML = `<div class="nb">
      <p class="w-help">點每一欄的選項，組出一個 token 名字；再點一次可以拿掉。用不到的段落就省略。</p>
      <p class="nb__out" aria-live="polite"><code class="nb__name"></code></p>
      <div class="nb__grid"></div>
      <div class="nb__order"><p class="nb__badge"></p><button type="button" class="link-more nb__reset" hidden>回到 Mini Shop 的順序</button></div>
      <p class="nb__hint" aria-live="polite"></p>
      <div class="nb__samples"><p>照這個順序，Mini Shop 的 token 長這樣：</p><ul></ul></div>
      <p class="tk__note">欄位上的 ‹ › 可以換位置。順序每家公司不一定一樣，例如有的團隊把目標放在角色前面；但<strong>定案之後，每一個 token 都照同一個順序</strong>，AI 才讀得懂、也才會照著建立。</p>
    </div>`;
    const draw = () => {
      const isComp = pick.category === 'comp';
      $('.nb__grid', el).innerHTML = order.map((id, pos) => {
        const x = slot(id);
        const off = id === 'component' && !isComp;
        const mv = !x.fixed ? `<span class="nb__move"><button type="button" data-move="-1" data-slot="${id}" aria-label="${esc(x.label)}往前移"${pos <= 2 ? ' disabled' : ''}>‹</button><button type="button" data-move="1" data-slot="${id}" aria-label="${esc(x.label)}往後移"${pos >= order.length - 1 ? ' disabled' : ''}>›</button></span>` : '';
        return `<div class="nb__col nb__col--${x.group}${off ? ' is-off' : ''}" role="group" aria-label="${esc(x.label)}">
          <div class="nb__head"><b>${esc(x.label)}</b><small>${esc(x.en)}</small>${mv}</div>
          <div class="nb__opts">${x.opts.map(v => `<button type="button" class="nb__opt" data-slot="${id}" data-v="${esc(v)}" aria-pressed="${pick[id] === v}"${off ? ' disabled' : ''}>${esc(v)}</button>`).join('')}</div>
        </div>`;
      }).join('');
      $('.nb__name', el).innerHTML = nameOf(pick);
      $('.nb__samples ul', el).innerHTML = DSC.NAME_SAMPLES.map(t => `<li><span class="nb__tier">${esc(t.category)}</span><code>${nameOf(t)}</code></li>`).join('');
      const moved = order.join() !== first.join();
      $('.nb__badge', el).textContent = moved ? '這是你排的順序：下面三個 token 都跟著換了。' : '現在是 Mini Shop 定案的順序（跟 1-1 動畫最後一段一樣）。';
      $('.nb__reset', el).hidden = !moved;
      const hint = [];
      if (pick.category === 'ref' && ['primary', 'secondary', 'error'].includes(pick.variant)) hint.push('ref 只描述值本身：primary、error 這類用途放到 sys。');
      if (pick.category === 'ref' && pick.target) hint.push('ref 通常不寫目標：container、padding 這類用途交給 sys 或 comp。');
      $('.nb__hint', el).textContent = hint.join('');
    };
    el.addEventListener('click', e => {
      const mv = e.target.closest('[data-move]');
      if (mv) {
        const i = order.indexOf(mv.dataset.slot), j = i + Number(mv.dataset.move);
        if (j < 2 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        draw();
        const again = $(`[data-move="${mv.dataset.move}"][data-slot="${mv.dataset.slot}"]`, el);
        if (again && !again.disabled) again.focus();
        return;
      }
      if (e.target.closest('.nb__reset')) { order = first.slice(); draw(); return; }
      const b = e.target.closest('.nb__opt');
      if (!b || b.disabled) return;
      const id = b.dataset.slot, v = b.dataset.v;
      const must = ['prefix', 'category', 'role'].includes(id) || (id === 'component' && pick.category === 'comp');
      pick[id] = pick[id] === v && !must ? '' : v;
      if (id === 'category') pick.component = v === 'comp' ? (pick.component || 'button') : '';
      draw();
      const again = $(`.nb__opt[data-slot="${id}"][data-v="${v}"]`, el);
      if (again) again.focus();
    });
    draw();
  }

  W.tokens = el => {
    const panels = tabs(el, [{ label: '換主題' }, { label: '命名結構' }, { label: '命名檢查器' }]);
    panels[0].classList.add('tabs__panel--bare');
    panels[1].classList.add('tabs__panel--bare');
    playground(panels[0]);
    nameBuilder(panels[1]);
    nameChecker(panels[2]);
  };

  /* ---------- 分類遊戲 ---------- */
  function sortGame(el, d) {
    const state = {};
    d.items.forEach(it => { state[it.id] = 'pool'; });
    let sel = null;
    el.innerHTML = `<p class="w-help">先點一張卡片，再點它該去的格子；用滑鼠也可以直接拖曳。</p>
      <div class="sort__pool" data-b="pool" aria-label="還沒分類的卡片"></div>
      <div class="sort__buckets" style="--n:${d.buckets.length}">${d.buckets.map(b => `<div class="sort__bucket" data-b="${b.id}" tabindex="0" role="button" aria-label="放進「${esc(b.label)}」"><div class="sort__bhead">${esc(b.label)}<small>${esc(b.hint)}</small></div><div class="sort__drop"></div></div>`).join('')}</div>
      <div class="w-actions"><button class="btn btn--primary btn--sm" data-a="check">檢查答案</button><button class="btn btn--quiet btn--sm" data-a="reset">重來</button></div>
      <div class="w-result" aria-live="polite"></div>`;
    const result = $('.w-result', el);
    const itemHTML = it => `<button class="sort__item" type="button" draggable="true" data-id="${it.id}" aria-pressed="${sel === it.id}">${md(it.text)}</button>`;
    const draw = () => {
      const left = d.items.filter(it => state[it.id] === 'pool');
      $('.sort__pool', el).innerHTML = left.length ? left.map(itemHTML).join('') : '<span class="sort__empty">全部分好了，按「檢查答案」。</span>';
      d.buckets.forEach(b => { $(`.sort__bucket[data-b="${b.id}"] .sort__drop`, el).innerHTML = d.items.filter(it => state[it.id] === b.id).map(itemHTML).join(''); });
      el.classList.toggle('is-picking', !!sel);
    };
    const place = (id, b) => { state[id] = b; sel = null; result.innerHTML = ''; draw(); };
    const check = () => {
      const left = d.items.filter(it => state[it.id] === 'pool').length;
      if (left) { result.innerHTML = `<p class="res res--bad">還有 ${left} 張卡片沒分類喔。</p>`; return; }
      const wrong = [];
      d.items.forEach(it => {
        const r = state[it.id] === it.bucket;
        $(`.sort__item[data-id="${it.id}"]`, el).classList.add(r ? 'is-right' : 'is-wrong');
        if (!r) wrong.push(it);
      });
      const label = id => d.buckets.find(b => b.id === id).label;
      result.innerHTML = !wrong.length
        ? `<p class="res res--ok"><strong>全部答對！</strong>${md(d.done || '')}</p>`
        : `<p class="res res--bad"><strong>答對 ${d.items.length - wrong.length} / ${d.items.length}。</strong>紅色的再看一下：</p><ul class="res__list">${wrong.map(it => `<li>${md(it.text)} → 應該放「${esc(label(it.bucket))}」。${md(it.why)}</li>`).join('')}</ul>`;
    };
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (a) { if (a.dataset.a === 'check') check(); else { d.items.forEach(it => { state[it.id] = 'pool'; }); sel = null; result.innerHTML = ''; draw(); } return; }
      const item = e.target.closest('.sort__item');
      if (item) { sel = sel === item.dataset.id ? null : item.dataset.id; draw(); const again = $(`.sort__item[data-id="${item.dataset.id}"]`, el); if (again) again.focus(); return; }
      const bucket = e.target.closest('[data-b]');
      if (bucket && sel) place(sel, bucket.dataset.b);
    });
    el.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.sort__bucket') && sel) { e.preventDefault(); place(sel, e.target.dataset.b); }
    });
    el.addEventListener('dragstart', e => { const it = e.target.closest('.sort__item'); if (!it) return; e.dataTransfer.setData('text/plain', it.dataset.id); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', e => { const b = e.target.closest('[data-b]'); if (b) { e.preventDefault(); b.classList.add('is-target'); } });
    el.addEventListener('dragleave', e => { const b = e.target.closest('[data-b]'); if (b && !b.contains(e.relatedTarget)) b.classList.remove('is-target'); });
    el.addEventListener('drop', e => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      e.preventDefault(); b.classList.remove('is-target');
      const id = e.dataTransfer.getData('text/plain');
      if (id && id in state) place(id, b.dataset.b);
    });
    draw();
  }
  W.sortLayers = el => sortGame(el, DSC.SORTS.sortLayers);
  W.sortVariant = el => sortGame(el, DSC.SORTS.sortVariant);
  W.sortAtomic = el => sortGame(el, DSC.SORTS.sortAtomic);

  /* ---------- 排序遊戲 ---------- */
  function orderGame(el, d) {
    let order = d.start.slice();
    let dragId = null;
    el.innerHTML = `<p class="w-help">用 ↑ ↓ 調整順序（用滑鼠也可以拖曳）。</p><ol class="order"></ol>
      <div class="w-actions"><button class="btn btn--primary btn--sm" data-a="check">檢查順序</button><button class="btn btn--quiet btn--sm" data-a="reset">重來</button></div><div class="w-result" aria-live="polite"></div>`;
    const result = $('.w-result', el);
    const draw = () => {
      $('.order', el).innerHTML = order.map((id, i) => `<li class="order__item" draggable="true" data-id="${id}"><span class="order__text">${esc(d.items[id])}</span><span class="order__btns"><button type="button" data-mv="-1" aria-label="把「${esc(d.items[id])}」往上移"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" data-mv="1" aria-label="把「${esc(d.items[id])}」往下移"${i === order.length - 1 ? ' disabled' : ''}>↓</button></span></li>`).join('');
    };
    el.addEventListener('click', e => {
      const mv = e.target.closest('[data-mv]');
      if (mv) {
        const id = mv.closest('.order__item').dataset.id;
        const i = order.indexOf(id), j = i + Number(mv.dataset.mv);
        if (j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        result.innerHTML = ''; draw();
        const again = $(`.order__item[data-id="${id}"] [data-mv="${mv.dataset.mv}"]`, el);
        if (again && !again.disabled) again.focus();
        return;
      }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'reset') { order = d.start.slice(); result.innerHTML = ''; draw(); return; }
      let ok = 0;
      order.forEach((id, i) => { const r = d.answer[i] === id; $(`.order__item[data-id="${id}"]`, el).classList.add(r ? 'is-right' : 'is-wrong'); if (r) ok++; });
      result.innerHTML = ok === order.length ? `<p class="res res--ok"><strong>順序正確！</strong>${md(d.explain)}</p>` : `<p class="res res--bad"><strong>${ok} / ${order.length} 個位置對了。</strong>${md(d.hint)}</p>`;
    });
    el.addEventListener('dragstart', e => { const li = e.target.closest('.order__item'); if (!li) return; dragId = li.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', e => { if (e.target.closest('.order__item')) e.preventDefault(); });
    el.addEventListener('drop', e => {
      const li = e.target.closest('.order__item'); if (!li || !dragId) return;
      e.preventDefault();
      const to = order.indexOf(li.dataset.id);
      order.splice(order.indexOf(dragId), 1); order.splice(to, 0, dragId);
      dragId = null; result.innerHTML = ''; draw();
    });
    draw();
  }
  W.orderBuild = el => orderGame(el, DSC.ORDER_BUILD);

  /* ---------- 決策樹 ---------- */
  function treeGame(el, d) {
    let path = [], cur = d.start;
    const draw = focus => {
      const n = d.nodes[cur];
      const crumbs = path.length ? `<div class="tree__path">${path.map(p => `<span>${esc(p)}</span>`).join('<span aria-hidden="true">›</span>')}</div>` : '';
      el.innerHTML = crumbs + (n.result
        ? `<div class="tree__result tree__result--${n.tone}" aria-live="polite"><p class="tree__title">${md(n.title)}</p><p>${md(n.result)}</p></div><button class="btn btn--quiet btn--sm" data-a="restart">從頭再走一次</button>`
        : `<p class="tree__q">${md(n.q)}</p><div class="tree__answers">${n.a.map((a, i) => `<button class="quiz__opt" type="button" data-i="${i}"><span class="quiz__letter">${'ABC'[i]}</span><span>${md(a.t)}</span></button>`).join('')}</div>`);
      if (focus) { const f = $('button', el); if (f) f.focus(); }
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) { const a = d.nodes[cur].a[+b.dataset.i]; path.push(a.t); cur = a.next; draw(true); return; }
      if (e.target.closest('[data-a="restart"]')) { path = []; cur = d.start; draw(true); }
    });
    draw(false);
  }
  W.treeReuse = el => treeGame(el, DSC.TREE_REUSE);
  // 2-2：元件、組件、界面分類 + 會不會重複建元件
  W.componentFlow = el => {
    const panels = tabs(el, [{ label: '元件、組件、界面' }, { label: '會不會重複建？' }]);
    panels.forEach(p => p.classList.add('tabs__panel--bare'));
    sortGame(panels[0], DSC.SORTS.sortAtomic);
    treeGame(panels[1], DSC.TREE_REUSE);
  };

  /* ---------- 3-1 去除 AI 味 ---------- */
  W.slop = el => {
    const on = {};
    DSC.SLOP_RULES.forEach(([k]) => { on[k] = true; });
    el.innerHTML = `<div class="slop-wrap"><div class="slop-demo"><div class="slop"><div class="slop__inner">
        <div class="slop__top"><span class="slop__tag">限時優惠</span><span class="slop__tag">剩 3 件</span></div>
        <div class="slop__title">簡約短袖上衣</div>
        <div class="slop__stats"><div class="slop__stat"><b>NT$490</b><small>特價</small></div><div class="slop__stat"><b>4.8</b><small>平均評分</small></div></div>
        <button class="slop__btn" tabindex="-1" aria-hidden="true">加入購物車</button></div></div></div>
      <div><p class="slop__meter" aria-live="polite"></p><div class="slop-rules">${DSC.SLOP_RULES.map(([k, t]) => `<button class="slop-rule" type="button" data-k="${k}" aria-pressed="false">${esc(t)}</button>`).join('')}</div>
      <div class="w-actions"><button class="btn btn--quiet btn--sm" data-a="all">一次全部套用</button><button class="btn btn--quiet btn--sm" data-a="undo">恢復 AI 味</button></div></div></div>`;
    const card = $('.slop', el);
    const draw = () => {
      DSC.SLOP_RULES.forEach(([k]) => { card.dataset[k] = on[k] ? 'on' : 'off'; });
      $$('.slop-rule', el).forEach(b => b.setAttribute('aria-pressed', String(!on[b.dataset.k])));
      const n = Object.values(on).filter(Boolean).length;
      $('.slop__meter', el).innerHTML = n ? `AI 味：${DSC.SLOP_RULES.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')} ${n} / ${DSC.SLOP_RULES.length}` : '乾淨了！這就是規則想要的樣子：重點清楚，不靠特效。';
    };
    el.addEventListener('click', e => {
      const r = e.target.closest('.slop-rule');
      if (r) { on[r.dataset.k] = !on[r.dataset.k]; draw(); return; }
      const a = e.target.closest('[data-a]');
      if (a) { const v = a.dataset.a === 'undo'; Object.keys(on).forEach(k => { on[k] = v; }); draw(); }
    });
    draw();
  };

  /* ---------- 3-2 三個停點 ---------- */
  W.stops = el => {
    tabs(el, DSC.STOPS.map(s => ({
      label: s.label,
      html: `<div class="stop"><p class="stop__eg">例：${md(s.eg)}</p><dl><dt>什麼時候問</dt><dd>${esc(s.when)}</dd><dt>可以回答</dt><dd>${s.answers.map(a => `<button class="kw" type="button" data-copy-text="${esc(a)}" aria-label="複製 ${esc(a)}">${esc(a)}</button>`).join('')}</dd><dt>寫在哪裡</dt><dd>${md(s.file)}</dd></dl></div>`
    })));
  };

  /* ---------- 3-4 三種來源 ---------- */
  W.sources = el => {
    tabs(el, DSC.SOURCES.map(s => ({
      label: s.label,
      html: `<div class="src">${img(s.img)}<div><h5>skill 讀得到</h5><ul>${s.reads.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="src__watch"><strong>要注意：</strong>${esc(s.watch)}</p>
        <div class="meters">${DSC.SOURCE_METERS.map((m, i) => `<div class="meter"><span>${esc(m)}</span><span class="meter__dots" role="img" aria-label="${s.m[i]} 分（滿分 5）">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= s.m[i] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div></div></div>`
    })));
  };

  /* ---------- 4-2 addon ---------- */
  W.addons = el => {
    let f = 'all';
    const kinds = Object.assign({ all: '全部' }, DSC.ADDON_KINDS);
    el.innerHTML = `<div class="tabs__list" role="group" aria-label="篩選 addon">${Object.entries(kinds).map(([k, l]) => `<button class="tabs__btn" type="button" data-f="${k}" aria-pressed="${k === f}">${esc(l)}</button>`).join('')}</div><div class="addons" aria-live="polite"></div>`;
    const badge = { core: 'badge--talk', tpl: 'badge--demo', add: 'badge--must' };
    const draw = () => {
      $$('[data-f]', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      $('.addons', el).innerHTML = DSC.ADDONS.filter(a => f === 'all' || a.kind === f).map(a => `<div class="addon"><div class="addon__top"><b>${esc(a.name)}</b><span class="badge ${badge[a.kind]}">${esc(DSC.ADDON_KINDS[a.kind])}</span></div><p>${md(a.what)}</p><p class="addon__when">什麼時候用：${md(a.when)}</p>${a.pkg ? `<code>${esc(a.pkg)}</code>` : ''}</div>`).join('');
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; draw(); } });
    draw();
  };

  /* ---------- 清單（會記住勾選） ---------- */
  DSC.checklist = (el, id, items, onChange) => {
    const st = (DSC.S.checks[id] = DSC.S.checks[id] || {});
    el.innerHTML = `<ul class="checklist">${items.map((it, i) => `<li><label class="check"><input type="checkbox" data-ck="${i}"${st[i] ? ' checked' : ''}><span>${md(it.t)}${it.cmd ? `<span class="check__cmd"><code>${esc(it.cmd)}</code><button class="copy-mini" type="button" data-copy-text="${esc(it.cmd)}" aria-label="複製指令 ${esc(it.cmd)}">複製</button></span>` : ''}</span></label></li>`).join('')}</ul><p class="check__sum" aria-live="polite"></p>`;
    const sum = () => {
      const n = items.filter((_, i) => st[i]).length;
      $('.check__sum', el).textContent = n === items.length ? '全部完成！' : `完成 ${n} / ${items.length}`;
    };
    el.addEventListener('change', e => {
      const c = e.target.closest('[data-ck]'); if (!c) return;
      st[c.dataset.ck] = c.checked; DSC.save(); sum();
      if (onChange) onChange();
    });
    sum();
  };
  W.envChecklist = el => DSC.checklist(el, 'env', DSC.ENV_CHECKS);
})();
