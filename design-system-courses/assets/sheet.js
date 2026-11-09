/* 一堂課的大卡片（對話框）：打開、換上一堂／下一堂、看完了、小測驗、筆記
   另外一個小視窗放歡迎說明和名詞解釋 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, md, plain, img, S, save, ICON, pad } = DSC;

  /* ---------- 共用：打開、關閉對話框 ---------- */
  const lock = () => document.documentElement.classList.toggle('is-locked', !!document.querySelector('dialog.sheet[open]'));
  function show(d) {
    if (!d.open) d.showModal();
    lock();
    if (DSC.reduceMotion) d.classList.add('is-in');
    else requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-in')));
  }
  function hide(d, after) {
    if (!d.open) { if (after) after(); return; }
    d.classList.remove('is-in');
    const fin = () => { if (d.open) d.close(); lock(); if (after) after(); };
    if (DSC.reduceMotion) fin(); else setTimeout(fin, 220);
  }

  /* ---------- 一堂課的內容 ---------- */
  const partLabel = pi => (pi ? `第 ${pi} 部 · ` : '');
  const pager = (c, dir) => `<button class="pager pager--${dir}" type="button" data-open="${c.id}"><span class="pager__dir">${dir === 'prev' ? ICON.chevL + '上一堂' : '下一堂' + ICON.chevR}</span><span class="pager__t">${c.id} ${esc(plain(c.title))}</span></button>`;

  function bodyHTML(c) {
    const out = [`<header class="sh-head">
        <div>
          <p class="sh-eyebrow">${partLabel(c.partIndex)}${esc(c.part.short)}</p>
          <h2 class="sh-title" id="sheet-title" tabindex="-1">${md(c.title)}</h2>
          <p class="sh-meta"><span class="tag">${c.id} · ${c.kind} · ${c.mins} 分鐘</span><span data-sh-role></span><span class="sh-done" data-sh-done hidden>${ICON.check}已看完</span></p>
        </div>
        ${img(c.img, 'sh-head__img', '', true)}
      </header>
      <p class="sh-goal"><span class="sh-goal__label">這堂學到</span>${md(c.goal)}</p>`];
    if (c.anim) out.push(`<section class="sh-sec sh-anim"><div class="sh-sec__head"><h3 class="sh-sec__title">先看動畫</h3><p class="sh-sec__hint">${md(c.animHint || '')}</p></div><div class="anim" data-anim="${c.anim}"></div></section>`);
    out.push(`<section class="sh-sec"><div class="sh-sec__head"><h3 class="sh-sec__title">重點</h3></div>
      <ol class="sh-points">${c.points.map((p, i) => `<li><span class="sh-points__no">${pad(i + 1)}</span><p>${md(p)}</p></li>`).join('')}</ol>
      ${c.skills.length ? `<p class="sh-skills">用到的 skill：${c.skills.map(s => `<code>${esc(s)}</code>`).join('')}</p>` : ''}</section>`);
    if (c.widget) out.push(`<section class="sh-sec"><div class="sh-sec__head"><h3 class="sh-sec__title">動手玩</h3><p class="sh-sec__hint">${md(c.hint)}</p></div><div class="play" data-widget="${c.widget}"></div></section>`);
    if (c.prompt) out.push(`<section class="sh-sec"><div class="sh-sec__head"><h3 class="sh-sec__title">跟著做</h3><p class="sh-sec__hint">${md(c.prompt.hint)}</p></div><div class="prompt"><pre>${esc(c.prompt.text)}</pre><button class="btn btn--light btn--sm prompt__copy" type="button" data-copy-pre>複製</button></div></section>`);
    if (c.quiz) out.push(`<section class="sh-sec"><div class="sh-sec__head"><h3 class="sh-sec__title">小測驗</h3><p class="sh-sec__hint">選完馬上看解說，答錯可以再試一次。</p></div><div class="sh-tile quiz" data-quiz="${c.id}"></div></section>`);
    out.push(`<details class="notes"><summary><span>我的筆記</span><span class="notes__ic" aria-hidden="true">${ICON.plus}</span></summary><div class="notes__in"><textarea data-note="${c.id}" aria-label="${c.id} 的筆記" placeholder="寫下重點或想問的問題，會自動存在這台電腦的瀏覽器。"></textarea><span class="notes__saved" aria-live="polite"></span></div></details>`);
    out.push(`<footer class="sh-foot">
        <div class="sh-done-row"><button class="btn btn--primary btn--lg done-btn" type="button" data-done="${c.id}" aria-pressed="false">看完了</button><span class="sh-done-row__hint"></span></div>
        <nav class="sh-pager" aria-label="換一堂">${c.prev ? pager(c.prev, 'prev') : ''}${c.next ? pager(c.next, 'next') : `<a class="pager pager--next" href="#finish" data-act="to-finish"><span class="pager__dir">最後一步${ICON.chevR}</span><span class="pager__t">結業檢查</span></a>`}</nav>
      </footer>`);
    return out.join('');
  }

  function renderQuiz(el, c) {
    const q = c.quiz;
    const draw = () => {
      const st = S.quiz[c.id];
      el.innerHTML = `<p class="quiz__q">${md(q.q)}</p><div class="quiz__opts">${q.options.map((o, i) => {
        const cls = st ? (i === q.answer ? ' is-right' : i === st.pick ? ' is-wrong' : '') : '';
        return `<button class="quiz__opt${cls}" type="button" data-pick="${i}"${st ? ' aria-disabled="true"' : ''}><span class="quiz__letter">${'ABC'[i]}</span><span>${md(o)}</span></button>`;
      }).join('')}</div><div class="quiz__feedback" aria-live="polite">${st ? `<p class="res ${st.right ? 'res--ok' : 'res--bad'}"><strong>${st.right ? '答對了！' : `再想想：正確答案是 ${'ABC'[q.answer]}。`}</strong>${md(q.explain)}</p><div class="w-actions"><button class="btn btn--quiet btn--sm" type="button" data-retry>再試一次</button></div>` : ''}</div>`;
    };
    el.addEventListener('click', e => {
      if (e.target.closest('[data-retry]')) { delete S.quiz[c.id]; save(); draw(); DSC.refreshProgress(); const f = $('[data-pick]', el); if (f) f.focus(); return; }
      const b = e.target.closest('[data-pick]');
      if (!b || S.quiz[c.id]) return;
      const pick = Number(b.dataset.pick);
      S.quiz[c.id] = { pick, right: pick === q.answer }; save(); draw(); DSC.refreshProgress();
    });
    draw();
  }

  // 內容要先放進打開的對話框，再掛上互動練習（有些練習要量尺寸）
  function mountWidgets(el, c) {
    const w = $('[data-widget]', el);
    if (w && DSC.WIDGETS[c.widget]) {
      try { DSC.WIDGETS[c.widget](w, c); } catch (err) { w.innerHTML = '<p class="w-help">這個練習暫時無法載入，請重新整理頁面。</p>'; if (window.console) console.error(err); }
    }
    const an = $('[data-anim]', el);
    if (an && DSC.animPlayer && DSC.ANIMS && DSC.ANIMS[c.anim]) {
      try { DSC.animPlayer(an, DSC.ANIMS[c.anim]); } catch (err) { an.closest('.sh-sec').hidden = true; if (window.console) console.error(err); }
    }
    const q = $('[data-quiz]', el); if (q) renderQuiz(q, c);
    const ta = $('[data-note]', el), saved = $('.notes__saved', el);
    if (ta) {
      ta.value = S.notes[c.id] || '';
      if (ta.value) $('details.notes', el).open = true;
      let t = 0;
      ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.notes[c.id] = ta.value; save(); saved.textContent = '已儲存'; DSC.refreshProgress(); setTimeout(() => { saved.textContent = ''; }, 1400); }, 400); });
    }
    el.dataset.ready = '1';
  }

  /* ---------- 大卡片：打開、換堂、關閉 ---------- */
  const sheet = $('#sheet'), body = $('#sheet-body');
  const cache = {};
  let cur = null, pushed = false, popClosing = false, opener = null;
  const pauseAnims = () => $$('.anim', body).forEach(a => { if (a.dscPause) a.dscPause(); });

  function refresh() {
    if (!cur) return;
    const el = cache[cur.id], d = !!S.done[cur.id];
    $('[data-sh-done]', el).hidden = !d;
    const btn = $('[data-done]', el);
    btn.setAttribute('aria-pressed', String(d));
    btn.innerHTML = d ? `${ICON.check}已看完` : '看完了';
    $('.sh-done-row__hint', el).textContent = d ? '再按一次可以取消' : '進度會存在這台電腦的瀏覽器';
    $('[data-sh-role]', el).innerHTML = DSC.flagHTML(cur);
  }

  function open(id, opts = {}) {
    const c = DSC.CHMAP[id]; if (!c) return;
    if (DSC.modal.isOpen()) DSC.modal.close(true);
    if (DSC.nav) DSC.nav.closeAll();
    if (!sheet.open) opener = document.activeElement;
    pauseAnims();
    show(sheet);
    let el = cache[id];
    if (!el) { el = document.createElement('div'); el.className = 'sh'; el.innerHTML = bodyHTML(c); cache[id] = el; }
    body.replaceChildren(el);
    if (!el.dataset.ready) mountWidgets(el, c);
    cur = c; refresh();
    sheet.scrollTop = 0;
    const h = $('.sh-title', el); if (h) h.focus({ preventScroll: true });
    const hash = '#ch-' + id;
    if (location.hash !== hash) {
      if (opts.push !== false && !pushed) { history.pushState({ sheet: id }, '', hash); pushed = true; }
      else history.replaceState(history.state, '', hash);
    }
    if (opts.play) {
      const a = $('.anim', el);
      if (a) setTimeout(() => { a.scrollIntoView({ block: 'center', behavior: DSC.reduceMotion ? 'auto' : 'smooth' }); setTimeout(() => { if (a.dscPlay) a.dscPlay(); }, 500); }, 380);
    }
  }
  function close(after) { if (!sheet.open) return; pauseAnims(); hide(sheet, after); }

  sheet.addEventListener('cancel', e => { e.preventDefault(); close(); });
  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-act="sheet-close"]')) { close(); return; }
    const fin = e.target.closest('[data-act="to-finish"]');
    if (fin) {
      e.preventDefault(); pushed = false;
      history.replaceState(null, '', '#finish');
      close(() => document.getElementById('finish').scrollIntoView({ behavior: DSC.reduceMotion ? 'auto' : 'smooth' }));
      return;
    }
    const done = e.target.closest('[data-done]');
    if (done) {
      const id = done.dataset.done;
      if (S.done[id]) delete S.done[id];
      else { S.done[id] = Date.now(); DSC.toast(DSC.CH.every(c => S.done[c.id]) ? `${DSC.CH.length} 堂全部看完了！` : '已記下進度'); }
      save(); DSC.refreshProgress(); return;
    }
    const cp = e.target.closest('[data-copy-pre]');
    if (cp) { const pre = $('pre', cp.parentElement); DSC.copy(pre.textContent).then(ok => DSC.toast(ok ? '已複製，貼到 agent 的對話框' : '複製失敗，請手動選取')); }
  });
  sheet.addEventListener('close', () => {
    sheet.classList.remove('is-in'); lock();
    const fromPop = popClosing; popClosing = false;
    if (!fromPop && /^#ch-/.test(location.hash)) {
      if (pushed) { pushed = false; history.back(); }
      else history.replaceState(null, '', location.pathname + location.search);
    }
    pushed = false; cur = null;
    if (opener && opener.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    opener = null;
  });
  // 瀏覽器的上一頁：關掉大卡片；下一頁：再打開
  window.addEventListener('popstate', () => {
    const m = /^#ch-(\d-\d)$/.exec(location.hash);
    if (m && DSC.CHMAP[m[1]]) { open(m[1], { push: false }); return; }
    if (sheet.open) { popClosing = true; pushed = false; close(); }
  });

  // 列印時每堂只印文字
  const printHTML = c => `<article class="print-ch"><h3>${c.id} ${esc(plain(c.title))}</h3><p><strong>這堂學到：</strong>${md(c.goal)}</p><ul>${c.points.map(p => `<li>${md(p)}</li>`).join('')}</ul>${c.prompt ? `<p><strong>跟著做：</strong>${esc(c.prompt.text)}</p>` : ''}${c.quiz ? `<p><strong>小測驗：</strong>${md(c.quiz.q)}</p>` : ''}</article>`;

  DSC.sheet = { open, close, refresh, printHTML, isOpen: () => sheet.open };

  /* ---------- 小視窗：歡迎、名詞解釋 ---------- */
  const modal = $('#modal'), mbody = $('#modal-body');
  let mOpener = null;
  DSC.modal = {
    open(html) {
      if (!modal.open) mOpener = document.activeElement;
      mbody.innerHTML = html;
      const t = $('h2', mbody); if (t) { t.id = 'modal-title'; modal.setAttribute('aria-labelledby', 'modal-title'); }
      show(modal); modal.scrollTop = 0;
    },
    close(instant) {
      if (!modal.open) return;
      if (instant) { modal.classList.remove('is-in'); modal.close(); lock(); } else hide(modal);
    },
    isOpen: () => modal.open
  };
  modal.addEventListener('cancel', e => { e.preventDefault(); DSC.modal.close(); });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-act="modal-close"]')) DSC.modal.close(); });
  modal.addEventListener('close', () => {
    modal.classList.remove('is-in'); lock();
    if (mOpener && mOpener.isConnected && mOpener !== document.body && !sheet.open) mOpener.focus({ preventScroll: true });
    mOpener = null;
  });
})();
