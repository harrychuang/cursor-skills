/* 講義主程式：章節資料、角色路線、課程地圖、每一部的章節卡、Skill 速查、名詞小卡、進度、事件
   一堂課的完整內容在 sheet.js（點卡片打開的大卡片），導覽列在 nav.js */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, md, plain, img, S, save, ICON, pad } = DSC;
  const smooth = () => (DSC.reduceMotion ? 'auto' : 'smooth');

  /* ---------- 資料：攤平所有章節，補上所屬的部、上一堂、下一堂 ---------- */
  const CH = [];
  DSC.COURSE.forEach((p, pi) => p.chapters.forEach(c => { c.part = p; c.partIndex = pi; CH.push(c); }));
  CH.forEach((c, i) => { c.prev = CH[i - 1] || null; c.next = CH[i + 1] || null; });
  const CHMAP = Object.fromEntries(CH.map(c => [c.id, c]));
  const partMins = p => p.chapters.reduce((s, c) => s + c.mins, 0);
  const TOTAL = CH.reduce((s, c) => s + c.mins, 0);
  Object.assign(DSC, { CH, CHMAP, partMins, TOTAL });
  DSC.role = () => (S.role && DSC.ROLES[S.role] ? S.role : null);
  // 一條路線：選了角色只算必看的章節，沒選就是全部
  const routeOf = r => { const list = r ? CH.filter(c => c.roles.includes(r)) : CH; return { list, mins: list.reduce((s, c) => s + c.mins, 0) }; };
  // 下一堂照目前的路線走；必看都看完了，再補選看的
  DSC.nextChapter = () => routeOf(DSC.role()).list.find(c => !S.done[c.id]) || CH.find(c => !S.done[c.id]) || null;
  // 角色名稱接中文：英文名稱（PM）後面空一格，例如「PM 必看」「設計師必看」
  const roleSays = (r, txt) => { const n = DSC.ROLES[r].name; return /[A-Za-z0-9]$/.test(n) ? `${n} ${txt}` : n + txt; };
  DSC.flagHTML = c => {
    const r = DSC.role(); if (!r) return '';
    return c.roles.includes(r) ? `<span class="flag flag--must">${esc(roleSays(r, '必看'))}</span>` : '<span class="flag">選看</span>';
  };
  // 「Design Token：讓 AI 讀得懂的設計值」→ 眉標「Design Token」＋大標「讓 AI 讀得懂的設計值。」
  const partHead = p => { const i = p.title.indexOf('：'); return i > 0 ? { eyebrow: p.title.slice(0, i), headline: p.title.slice(i + 1) } : { eyebrow: p.short, headline: p.title }; };

  /* ---------- 路線：角色選擇就放在課程地圖正上方，選了之後地圖和時間馬上跟著變 ---------- */
  function renderRoles() {
    const pill = (key, name, art) => {
      const { list, mins } = routeOf(key === 'all' ? null : key);
      return `<button class="role" type="button" aria-pressed="false" data-role="${key}">
        <span class="role__art" aria-hidden="true">${art}</span>
        <span class="role__txt"><span class="role__name">${esc(name)}</span><span class="role__stat">${list.length} 堂 · ${mins} 分鐘</span></span>
      </button>`;
    };
    // 「全部都看」用三個角色的頭像疊在一起
    const faces = Object.values(DSC.ROLES).map(r => img(r.img, 'role__face')).join('');
    $('#roles').innerHTML = pill('all', '全部都看', `<span class="role__faces">${faces}</span>`) +
      Object.entries(DSC.ROLES).map(([k, r]) => pill(k, r.name, img(r.img, 'role__img'))).join('');
  }
  // 數字從舊值滑到新值，看得出變了多少；減少動態效果時直接換
  function countTo(el, to, instant) {
    const from = Number(el.textContent) || 0;
    cancelAnimationFrame(el.dscRaf);
    if (instant || DSC.reduceMotion || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 450);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) el.dscRaf = requestAnimationFrame(step);
    };
    el.dscRaf = requestAnimationFrame(step);
  }
  function applyRole(instant) {
    const r = DSC.role();
    const { list, mins } = routeOf(r);
    const must = new Set(list.map(c => c.id));
    $$('.role').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === (r || 'all'))));
    // 標題：這條路線要幾分鐘、幾堂
    $('#route-name').textContent = r ? roleSays(r, '的必看路線') : '全部都看';
    countTo($('[data-route="mins"]'), mins, instant);
    countTo($('[data-route="count"]'), list.length, instant);
    $('[data-route="unit"]').textContent = r ? '必看' : '課';
    // 地圖：必看是紫色、選看是灰色（全部都看時每一格都是必看），每一部改成顯示必看幾分鐘
    $$('.map__cell').forEach(a => { const on = must.has(a.dataset.map); a.classList.toggle('is-must', on); a.classList.toggle('is-opt', !on); });
    DSC.COURSE.forEach((p, pi) => {
      const el = $(`[data-part-min="${pi}"]`); if (!el) return;
      const m = p.chapters.filter(c => must.has(c.id)).reduce((s, c) => s + c.mins, 0);
      el.textContent = r ? `必看 ${m}／${partMins(p)} 分鐘` : `${partMins(p)} 分鐘`;
    });
    // 每一部的章節卡：標出必看和選看
    $$('.ch-card').forEach(card => {
      const c = CHMAP[card.dataset.open];
      $('[data-role-flag]', card).innerHTML = DSC.flagHTML(c);
      card.classList.toggle('is-opt', !!r && !c.roles.includes(r));
    });
    drawRoute();
    if (DSC.sheet) DSC.sheet.refresh();
  }
  // 地圖下面一行：這條路線的重點、比全部少看哪幾堂、下一堂從哪裡開始
  function drawRoute() {
    const r = DSC.role();
    const { list, mins } = routeOf(r);
    const opt = CH.filter(c => !list.includes(c));
    const next = DSC.nextChapter();
    const label = next && (list.some(c => S.done[c.id]) ? `繼續看 ${next.id}` : `從 ${next.id} 開始`);
    const go = next ? `<button class="link-more route__go" type="button" data-act="continue-route">${label}</button>` : '';
    $('#route').innerHTML = `<div class="route__txt">${r
      ? `<p class="route__lead">${esc(DSC.ROLES[r].desc)}</p><p>比全部都看少 <strong>${opt.length} 堂、${TOTAL - mins} 分鐘</strong>${opt.length ? `；${opt.map(c => c.id).join('、')} 當選看，有空再補` : ''}。</p>`
      : '<p class="route__lead">還沒選角色，就全部都看。</p><p>選一個角色，地圖會標出你的必看章節；下面每一堂的卡片，也會標出必看和選看。</p>'}</div>${go}`;
  }

  /* ---------- 課程地圖 ---------- */
  function renderMap() {
    const map = $('#map');
    map.style.setProperty('--cols', DSC.COURSE.map(p => `${partMins(p)}fr`).join(' '));
    map.innerHTML = DSC.COURSE.map((p, pi) => `<div class="map__part"><a class="map__head" href="#part-${pi}"><b>${pad(pi)}</b><span class="map__name">${esc(p.short)}</span><span class="map__min" data-part-min="${pi}">${partMins(p)} 分鐘</span></a><div class="map__cells">${p.chapters.map(c =>
      `<a class="map__cell" href="#ch-${c.id}" data-map="${c.id}" style="flex-grow:${c.mins}" title="${c.id} ${esc(plain(c.title))}（${c.mins} 分）" aria-label="${c.id} ${esc(plain(c.title))}，${c.mins} 分鐘">${c.id}</a>`).join('')}</div></div>`).join('');
  }

  /* ---------- 每一部：大標、學完能做到、章節卡 ---------- */
  const cardHTML = (c, i) => `<button class="ch-card rv" type="button" data-open="${c.id}" aria-haspopup="dialog" style="--rv-d:${i * 0.08}s">
      <span class="ch-card__meta tag">${c.id} · ${c.kind} · ${c.mins} 分鐘${c.anim ? ' · 含動畫' : ''}</span>
      <span class="ch-card__title">${md(c.title)}</span>
      <span class="ch-card__goal">${md(c.goal)}</span>
      <span class="ch-card__flag" data-role-flag></span>
      <span class="ch-card__art">${img(c.img)}</span>
      <span class="ch-card__done">${ICON.check}<span class="sr-only">已看完</span></span>
      <span class="plus" aria-hidden="true">${ICON.plus}</span>
    </button>`;
  function renderParts() {
    $('#parts').innerHTML = DSC.COURSE.map((p, pi) => {
      const h = partHead(p);
      return `<section class="section part${pi % 2 ? ' section--gray' : ''}" id="part-${pi}" aria-labelledby="part-${pi}-title">
        <div class="wrap">
          <div class="part-head rv">
            <div class="part-head__main">
              <p class="part-head__no" aria-hidden="true">${pad(pi)}</p>
              <div class="part-head__text">
                <p class="eyebrow">${esc(h.eyebrow)}</p>
                <h2 class="headline" id="part-${pi}-title">${md(h.headline)}。</h2>
                <p class="lede">${md(p.tagline)}</p>
              </div>
            </div>
            ${img(p.img, 'part-head__img')}
          </div>
          <div class="rail" data-rail>
            <div class="cards rail__track" style="--n:${p.chapters.length}">${p.chapters.map(cardHTML).join('')}</div>
            <div class="rail__nav" hidden><button class="paddle" type="button" data-rail-prev aria-label="上一堂卡片"></button><button class="paddle" type="button" data-rail-next aria-label="下一堂卡片"></button></div>
          </div>
          <!-- 「學完這部，你能」放在章節卡下面：先看這一部有哪幾堂，再看學完能做到什麼 -->
          <div class="part-goals rv"><p class="part-goals__label">學完這部（${p.chapters.length} 堂 · ${partMins(p)} 分鐘<span data-part-count="${pi}"></span>），你能</p><ul>${p.goals.map(g => `<li>${ICON.check}<span>${md(g)}</span></li>`).join('')}</ul></div>
          <div class="part__print" hidden></div>
        </div>
      </section>`;
    }).join('');
  }

  // 窄螢幕的卡片列可以左右滑；左右鍵只在真的放不下時出現
  function setupRails() {
    $$('[data-rail]').forEach(r => {
      const track = $('.rail__track', r), nav = $('.rail__nav', r), prev = $('[data-rail-prev]', r), next = $('[data-rail-next]', r);
      prev.innerHTML = ICON.chevL; next.innerHTML = ICON.chevR;
      const upd = () => {
        const max = track.scrollWidth - track.clientWidth;
        nav.hidden = max < 8;
        prev.disabled = track.scrollLeft <= 4;
        next.disabled = track.scrollLeft >= max - 4;
      };
      const step = dir => {
        const [a, b] = track.children;
        const w = a && b ? b.getBoundingClientRect().left - a.getBoundingClientRect().left : track.clientWidth * 0.8;
        track.scrollBy({ left: dir * w, behavior: smooth() });
      };
      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      track.addEventListener('scroll', upd, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(upd).observe(track); else window.addEventListener('resize', upd);
      upd();
    });
  }

  /* ---------- Skill 速查：點一個情況展開說明，右邊大卡片換成那個 skill ---------- */
  const visualIdle = () => `${img('laptop')}<p class="sit-visual__empty">先在左邊點一個最像你現在的情況。</p>`;
  function renderPicker() {
    $('#picker').innerHTML = DSC.SITUATIONS.map((s, i) => `<li class="sit">
      <button class="sit__btn" type="button" data-sit="${i}" aria-expanded="false" aria-controls="sit-${i}"><span class="sit__ic" aria-hidden="true">${ICON.plus}</span><span>${esc(s.need)}</span></button>
      <div class="sit__body" id="sit-${i}"><div class="sit__inner"><div class="sit__content">
        <p class="sit__skill"><code>${esc(s.skill)}</code></p>
        <p>${md(s.what)}</p>
        <p class="sit__say">可以這樣說：「${esc(s.say)}」</p>
        <div class="sit__acts"><a class="link-more" href="#ch-${s.ch}">看第 ${s.ch} 堂</a><button class="btn btn--secondary btn--sm" type="button" data-copy-text="${esc(s.say)}">複製這句話</button></div>
      </div></div></div>
    </li>`).join('');
    $('#picker-visual').innerHTML = visualIdle();
  }
  function pickSituation(i, fromSearch) {
    const items = $$('.sit');
    const on = fromSearch || !items[i].classList.contains('is-open');
    items.forEach((li, k) => { const o = on && k === i; li.classList.toggle('is-open', o); $('.sit__btn', li).setAttribute('aria-expanded', String(o)); });
    const s = DSC.SITUATIONS[i];
    $('#picker-visual').innerHTML = on ? `${img('laptop')}<p class="sit-visual__eyebrow">用這個 skill</p><p class="sit-visual__name">${esc(s.skill)}</p><p class="sit-visual__say">可以這樣說：「${esc(s.say)}」</p>` : visualIdle();
    if (fromSearch) items[i].scrollIntoView({ behavior: smooth(), block: 'center' });
  }
  DSC.pickSituation = pickSituation;

  /* ---------- 名詞小卡：先放 8 張，按鈕展開全部；點卡片看解釋 ---------- */
  const GL_FIRST = 8;
  let glAll = false;
  function drawGlossary() {
    const q = $('#gl-filter').value.trim().toLowerCase();
    const list = DSC.GLOSSARY.map((g, i) => ({ g, i })).filter(({ g }) => !q || (g.term + g.def + (g.eg || '')).toLowerCase().includes(q));
    const shown = q || glAll ? list : list.slice(0, GL_FIRST);
    $('#gl').innerHTML = shown.length ? shown.map(({ g, i }) => `<button class="gl-card" type="button" data-term="${i}" aria-haspopup="dialog"><span class="gl-card__term">${esc(g.term)}</span>${g.eg ? `<span class="gl-card__eg">例：${md(g.eg)}</span>` : ''}<span class="plus" aria-hidden="true">${ICON.plus}</span></button>`).join('')
      : `<p class="gl-empty">找不到「${esc(q)}」，換個關鍵字試試。</p>`;
    const more = $('#gl-more');
    more.parentElement.hidden = !!q || list.length <= GL_FIRST;
    more.textContent = glAll ? '收起來' : `顯示全部 ${DSC.GLOSSARY.length} 個名詞`;
    more.setAttribute('aria-expanded', String(glAll));
    $('#gl-count').textContent = q ? `找到 ${list.length} 個` : `共 ${DSC.GLOSSARY.length} 個名詞`;
  }
  function showTerm(i) {
    const g = DSC.GLOSSARY[i], t = g.term.toLowerCase();
    const rel = CH.filter(c => [c.title, c.goal].concat(c.points).join(' ').toLowerCase().includes(t)).slice(0, 3);
    DSC.modal.open(`<p class="term__eyebrow">名詞小卡</p><h2 class="term__title">${esc(g.term)}</h2><p class="term__def">${md(g.def)}</p>${g.eg ? `<p class="term__eg"><b>例：</b>${md(g.eg)}</p>` : ''}${rel.length ? `<div class="term__rel"><h3>在這幾堂會用到</h3><ul>${rel.map(c => `<li><a href="#ch-${c.id}"><span>${c.id} ${esc(plain(c.title))}</span>${ICON.chevR}</a></li>`).join('')}</ul></div>` : ''}`);
  }
  DSC.showTerm = showTerm;

  /* ---------- 進度 ---------- */
  function refreshProgress() {
    const doneN = CH.filter(c => S.done[c.id]).length;
    const quizN = CH.filter(c => S.quiz[c.id] && S.quiz[c.id].right).length;
    const notesN = CH.filter(c => (S.notes[c.id] || '').trim()).length;
    const pct = doneN / CH.length;
    const ring = $('#ring-fg'), circ = 2 * Math.PI * 14;
    ring.style.strokeDasharray = circ.toFixed(2); ring.style.strokeDashoffset = (circ * (1 - pct)).toFixed(2);
    $('#ring-txt').textContent = `${doneN}/${CH.length}`;
    $('#top-progress').setAttribute('aria-label', `已看完 ${doneN} / ${CH.length} 堂`);
    const label = doneN === 0 ? '開始上課' : doneN === CH.length ? '結業檢查' : '繼續上課';
    $$('[data-act="continue"]').forEach(b => { b.textContent = label; });
    $$('.ch-card').forEach(card => card.classList.toggle('is-done', !!S.done[card.dataset.open]));
    $$('.map__cell').forEach(a => a.classList.toggle('is-done', !!S.done[a.dataset.map]));
    DSC.COURSE.forEach((p, pi) => {
      const n = p.chapters.filter(c => S.done[c.id]).length;
      const el = $(`[data-part-count="${pi}"]`); if (el) el.textContent = n ? ` · 看完 ${n} / ${p.chapters.length}` : '';
    });
    const set = (k, v) => { const e = $(`[data-stat="${k}"]`); if (e) e.textContent = v; };
    set('done', doneN); set('quiz', quizN); set('notes', notesN);
    $('#complete').classList.toggle('is-on', doneN === CH.length);
    drawRoute();
    if (DSC.nav) DSC.nav.refresh();
    if (DSC.sheet) DSC.sheet.refresh();
  }
  DSC.refreshProgress = refreshProgress;

  /* ---------- 捲到才淡入 ---------- */
  function setupReveal() {
    if (DSC.reduceMotion || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('rv-on');
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.rv').forEach(el => io.observe(el));
  }

  /* ---------- 事件 ---------- */
  function onClick(e) {
    const t = e.target;
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'tour') DSC.startTour();
      else if (a === 'welcome-tour') { DSC.modal.close(true); DSC.startTour(); }
      else if (a === 'continue' || a === 'continue-route') {
        const n = DSC.nextChapter();
        if (n) DSC.sheet.open(n.id);
        else { DSC.nav.closeAll(); $('#finish').scrollIntoView({ behavior: smooth() }); }
      }
      else if (a === 'watch') DSC.sheet.open('0-1', { play: true });
      else if (a === 'gl-more') { glAll = !glAll; drawGlossary(); if (!glAll) $('#glossary').scrollIntoView({ behavior: smooth() }); }
      else if (a === 'copy-notes') {
        const txt = CH.filter(c => (S.notes[c.id] || '').trim()).map(c => `【${c.id} ${plain(c.title)}】\n${S.notes[c.id].trim()}`).join('\n\n');
        if (!txt) DSC.toast('還沒有任何筆記');
        else DSC.copy(txt).then(ok => DSC.toast(ok ? '已複製全部筆記' : '複製失敗，請手動選取'));
      }
      else if (a === 'reset') {
        if (act.dataset.armed) { DSC.resetAll(); history.replaceState(null, '', location.pathname); location.reload(); return; }
        act.dataset.armed = '1'; act.textContent = '確定要清除嗎？再按一次';
        setTimeout(() => { delete act.dataset.armed; act.textContent = '清除進度，重新開始'; }, 3500);
      }
      // 目錄、搜尋、關閉大卡片在 nav.js、sheet.js 處理
      return;
    }
    const open = t.closest('[data-open]');
    if (open) { DSC.sheet.open(open.dataset.open); return; }
    const link = t.closest('a[href^="#ch-"]');
    if (link) { e.preventDefault(); const id = link.getAttribute('href').slice(4); if (CHMAP[id]) DSC.sheet.open(id); return; }
    const ct = t.closest('[data-copy-text]');
    if (ct) { e.preventDefault(); DSC.copy(ct.dataset.copyText).then(ok => DSC.toast(ok ? `已複製：${ct.dataset.copyText}` : '複製失敗，請手動選取')); return; }
    const role = t.closest('[data-role]');
    if (role) { S.role = role.dataset.role === 'all' ? null : role.dataset.role; save(); applyRole(); return; }
    const sit = t.closest('[data-sit]');
    if (sit) { pickSituation(Number(sit.dataset.sit), false); return; }
    const term = t.closest('[data-term]');
    if (term) showTerm(Number(term.dataset.term));
  }

  /* ---------- 啟動 ---------- */
  function fillMeta() {
    const skills = new Set();
    CH.forEach(c => c.skills.forEach(s => skills.add(s)));
    const meta = { parts: DSC.COURSE.length, chapters: CH.length, mins: TOTAL, skills: skills.size };
    $$('[data-meta]').forEach(el => { if (el.dataset.meta in meta) el.textContent = meta[el.dataset.meta]; });
  }
  function fillPrint() {
    DSC.COURSE.forEach((p, pi) => {
      const box = $(`#part-${pi} .part__print`);
      if (box && !box.innerHTML) box.innerHTML = p.chapters.map(DSC.sheet.printHTML).join('');
    });
    $$('.rv').forEach(el => el.classList.add('is-in'));
  }
  function init() {
    $$('[data-act="search"]').forEach(b => { b.innerHTML = ICON.search; });
    $$('.gnav__toggle').forEach(b => { b.innerHTML = ICON.chevD; });
    $$('.sheet__close').forEach(b => { b.innerHTML = ICON.close; });
    $$('.search-field__ic, .gl-filter__ic').forEach(s => { s.innerHTML = ICON.search; });
    fillMeta(); renderRoles(); renderMap(); renderParts(); renderPicker(); drawGlossary();
    DSC.checklist($('#final-checks'), 'final', DSC.FINAL_CHECKS);
    DSC.nav.init();
    applyRole(true); refreshProgress(); setupRails(); setupReveal();
    document.addEventListener('click', onClick);
    $('#gl-filter').addEventListener('input', drawGlossary);
    window.addEventListener('beforeprint', fillPrint);
    const m = /^#ch-(\d-\d)$/.exec(location.hash);
    if (m && CHMAP[m[1]]) setTimeout(() => DSC.sheet.open(m[1], { push: false }), 60);
    else if (!S.tourSeen && !S.welcomed) {
      S.welcomed = true; save();
      setTimeout(() => DSC.modal.open($('#tpl-welcome').innerHTML), 600);
    }
    document.documentElement.classList.add('is-ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
