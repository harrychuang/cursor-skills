/* 頂部導覽列：課程目錄、搜尋、標出目前在哪一區、30 秒導覽 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, plain, S, save } = DSC;
  const smooth = () => (DSC.reduceMotion ? 'auto' : 'smooth');

  let gnav, scrim, flyout, panel, input, results;
  let openName = null;

  /* ---------- 課程目錄 ---------- */
  const LINKS = [['#how-to', '怎麼用這份講義'], ['#course-map', '選路線、看課程地圖'], ['#skills', 'Skill 速查'], ['#glossary', '名詞小卡'], ['#finish', '結業檢查']];
  function renderFlyout() {
    $('#flyout-in').innerHTML = `<ul class="fo-links">${LINKS.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
      <div class="fo-parts">${DSC.COURSE.map((p, pi) => `<div class="fo-part">
        <a class="fo-part__head" href="#part-${pi}"><span class="fo-part__no">${pi ? `第 ${pi} 部 · ` : ''}${DSC.partMins(p)} 分鐘</span><span class="fo-part__name">${esc(p.short)}</span></a>
        <ul>${p.chapters.map(c => `<li><a class="fo-ch" href="#ch-${c.id}" data-fo="${c.id}"><span class="fo-ch__no">${c.id}</span><span>${esc(plain(c.title))}</span><span class="fo-ch__st"></span></a></li>`).join('')}</ul>
      </div>`).join('')}</div>`;
  }
  function refresh() {
    $$('.fo-ch').forEach(a => {
      const d = !!S.done[a.dataset.fo];
      a.classList.toggle('is-done', d);
      $('.fo-ch__st', a).innerHTML = d ? '<span class="sr-only">已看完</span>' : '';
    });
  }

  /* ---------- 展開、收起：目錄或搜尋，一次只開一個 ---------- */
  function setOpen(name) {
    const was = openName;
    openName = name;
    flyout.hidden = name !== 'course';
    panel.hidden = name !== 'search';
    scrim.hidden = !name;
    gnav.classList.toggle('is-open', !!name);
    document.documentElement.classList.toggle('is-nav-open', !!name);
    $$('[data-act="course"]').forEach(b => b.setAttribute('aria-expanded', String(name === 'course')));
    $$('[data-act="search"]').forEach(b => b.setAttribute('aria-expanded', String(name === 'search')));
    if (name === 'search') { input.value = ''; drawResults(); setTimeout(() => input.focus(), 30); }
    if (name === 'course') flyout.scrollTop = 0;
    if (!name && was === 'search' && document.activeElement === input) input.blur();
  }
  const toggle = name => setOpen(openName === name ? null : name);

  /* ---------- 搜尋 ---------- */
  let IDX = [], res = [], act = 0;
  function buildIndex() {
    IDX = [].concat(
      DSC.CH.map(c => ({ type: '章節', label: `${c.id} ${plain(c.title)}`, sub: c.part.short, go: () => DSC.sheet.open(c.id), text: [c.id, c.title, c.goal].concat(c.points, c.skills).join(' ').toLowerCase() })),
      DSC.GLOSSARY.map((g, i) => ({ type: '名詞', label: g.term, sub: plain(g.def), go: () => DSC.showTerm(i), text: (g.term + ' ' + g.def + ' ' + (g.eg || '')).toLowerCase() })),
      DSC.SITUATIONS.map((s, i) => ({ type: 'skill', label: s.skill, sub: s.need, go: () => DSC.pickSituation(i, true), text: (s.skill + ' ' + s.need + ' ' + s.say + ' ' + s.what).toLowerCase() }))
    );
  }
  const goTo = sel => () => { const t = $(sel); if (t) t.scrollIntoView({ behavior: smooth() }); };
  const QUICK = [['從第一堂開始', () => DSC.sheet.open('0-1')], ['怎麼用這份講義', goTo('#how-to')], ['Skill 速查', goTo('#skills')], ['名詞小卡', goTo('#glossary')], ['結業檢查', goTo('#finish')]];
  function drawResults() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      res = []; results.removeAttribute('role');
      results.innerHTML = `<p class="search__head">快速連結</p><ul class="search__quick">${QUICK.map((x, i) => `<li><button type="button" data-quick="${i}">${x[0]}</button></li>`).join('')}</ul>`;
      return;
    }
    res = IDX.map(it => ({ it, s: it.label.toLowerCase().includes(q) ? 2 : it.text.includes(q) ? 1 : 0 })).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 8).map(x => x.it);
    act = 0;
    results.setAttribute('role', 'listbox');
    results.innerHTML = res.length
      ? `<p class="search__head">搜尋結果</p>${res.map((it, i) => `<button class="search__item" type="button" role="option" aria-selected="${i === act}" data-i="${i}"><span class="search__type">${esc(it.type)}</span><span class="search__label">${esc(it.label)}</span><span class="search__sub">${esc(it.sub)}</span></button>`).join('')}`
      : `<p class="search__none">找不到「${esc(input.value.trim())}」，換個關鍵字試試。</p>`;
  }
  const pick = i => { const it = res[i]; if (!it) return; setOpen(null); it.go(); };

  /* ---------- 標出目前在哪一區 ---------- */
  function watchSections() {
    if (!('IntersectionObserver' in window)) return;
    const KEY = { 'how-to': 'how-to', 'course-map': 'route', skills: 'skills', glossary: 'glossary' };
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      const key = /^part-/.test(id) ? 'course' : KEY[id] || null;
      $$('.gnav__links [data-nav]').forEach(a => a.setAttribute('aria-current', String(a.dataset.nav === key)));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('#main > section, #parts > section').forEach(s => io.observe(s));
  }

  /* ---------- 30 秒導覽 ---------- */
  let tourI = -1, T = null;
  const isVisible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const tourTarget = st => { let t = $(st.sel); if (!isVisible(t) && st.alt) t = $(st.alt); return isVisible(t) ? t : null; };
  function startTour() {
    if (!T) {
      T = { block: document.createElement('div'), spot: document.createElement('div'), tip: document.createElement('div') };
      T.block.className = 'tour-block'; T.spot.className = 'tour-spot'; T.tip.className = 'tour-tip';
      T.tip.setAttribute('role', 'dialog'); T.tip.setAttribute('aria-modal', 'true'); T.tip.setAttribute('aria-label', '講義導覽');
      T.tip.addEventListener('click', e => {
        const a = e.target.closest('[data-tour]'); if (!a) return;
        if (a.dataset.tour === 'next') stepTour(tourI + 1);
        else if (a.dataset.tour === 'prev') stepTour(tourI - 1);
        else endTour(false);
      });
      window.addEventListener('resize', placeTour);
      window.addEventListener('scroll', placeTour, { passive: true });
    }
    setOpen(null);
    if (DSC.sheet.isOpen()) DSC.sheet.close();
    document.body.append(T.block, T.spot, T.tip);
    stepTour(0);
  }
  function stepTour(i) {
    if (i < 0) return;
    if (i >= DSC.TOUR.length) { endTour(true); return; }
    tourI = i;
    const st = DSC.TOUR[i];
    const t = tourTarget(st);
    if (t && !t.closest('.gnav')) {
      const r = t.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight - 40) t.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: smooth() });
    }
    const last = i === DSC.TOUR.length - 1;
    T.tip.innerHTML = `<p class="tour-tip__count">${i + 1} / ${DSC.TOUR.length}</p><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p><div class="tour-tip__foot"><button class="btn btn--quiet btn--sm" type="button" data-tour="end">跳過</button>${i ? '<button class="btn btn--secondary btn--sm" type="button" data-tour="prev">上一步</button>' : ''}<button class="btn btn--primary btn--sm" type="button" data-tour="next">${last ? '開始上課！' : '下一步'}</button></div>`;
    placeTour();
    setTimeout(placeTour, 500);
    const nb = $('[data-tour="next"]', T.tip); if (nb) nb.focus({ preventScroll: true });
  }
  function placeTour() {
    if (tourI < 0 || !T) return;
    const t = tourTarget(DSC.TOUR[tourI]);
    const tw = T.tip.offsetWidth, th = T.tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    if (!t) {
      Object.assign(T.spot.style, { left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' });
      Object.assign(T.tip.style, { left: Math.max(12, (vw - tw) / 2) + 'px', top: Math.max(12, (vh - th) / 2) + 'px' });
      return;
    }
    const r = t.getBoundingClientRect(), p = 10;
    const top = Math.max(r.top - p, 4), bottom = Math.min(r.bottom + p, vh - 4);
    Object.assign(T.spot.style, { left: r.left - p + 'px', top: top + 'px', width: r.width + p * 2 + 'px', height: Math.max(bottom - top, 0) + 'px' });
    let y = bottom + 14;
    if (y + th > vh - 12) y = top - 14 - th;
    if (y < 12) y = vh - th - 16;
    const x = Math.min(Math.max(12, r.left), vw - tw - 12);
    Object.assign(T.tip.style, { left: x + 'px', top: y + 'px' });
  }
  function endTour(start) {
    if (!T) return;
    tourI = -1; T.block.remove(); T.spot.remove(); T.tip.remove();
    S.tourSeen = true; save();
    if (start) DSC.sheet.open('0-1');
  }
  DSC.startTour = startTour;

  /* ---------- 啟動 ---------- */
  function init() {
    gnav = $('#gnav'); scrim = $('#scrim'); flyout = $('#flyout'); panel = $('#search-panel');
    input = $('#search-input'); results = $('#search-results');
    renderFlyout(); refresh(); buildIndex(); watchSections();
    $$('[data-act="course"]').forEach(b => b.addEventListener('click', () => toggle('course')));
    $$('[data-act="search"]').forEach(b => b.addEventListener('click', () => toggle('search')));
    scrim.addEventListener('click', () => setOpen(null));
    // 目錄裡點了任何連結就收起來（章節連結會另外打開大卡片）
    flyout.addEventListener('click', e => { if (e.target.closest('a')) setOpen(null); });
    input.addEventListener('input', drawResults);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { setOpen(null); return; }
      if (!res.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + res.length) % res.length;
        $$('.search__item', results).forEach((b, i) => b.setAttribute('aria-selected', String(i === act)));
      } else if (e.key === 'Enter') { e.preventDefault(); pick(act); }
    });
    results.addEventListener('mousedown', e => e.preventDefault());
    results.addEventListener('click', e => {
      const b = e.target.closest('.search__item'); if (b) { pick(Number(b.dataset.i)); return; }
      const qk = e.target.closest('[data-quick]'); if (qk) { setOpen(null); QUICK[Number(qk.dataset.quick)][1](); }
    });
    document.addEventListener('keydown', e => {
      if (tourI >= 0) {
        if (e.key === 'Escape') endTour(false);
        else if (e.key === 'ArrowRight') stepTour(tourI + 1);
        else if (e.key === 'ArrowLeft') stepTour(tourI - 1);
        return;
      }
      if (e.key === 'Escape' && openName) { setOpen(null); return; }
      const el = document.activeElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
      if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) { e.preventDefault(); setOpen('search'); }
    });
  }

  DSC.nav = { init, refresh, closeAll: () => { if (openName) setOpen(null); } };
})();
