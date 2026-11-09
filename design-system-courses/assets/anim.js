/* 說明動畫：場景時間軸播放器，以及 0-1「五站流水線」的四幕內容
   每一幕有時長（秒）、字幕與 beats：[開始秒數, 元素代號, 加上的 class（預設 is-in）, 結束秒數（可省略）]
   版面原則：一次只放大講一件事，底部用細軌道標出走到哪一站，不把五個東西擠成一排 */
(function () {
  'use strict';
  const DSC = window.DSC;
  const { $, $$, esc, img } = DSC;
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
  };
  const fmt = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const CANVAS_W = 800;
  const STATE = ['is-in', 'is-go', 'is-done', 'is-hot', 'is-out'];

  /* ---------- 播放器 ---------- */
  DSC.animPlayer = (root, def) => {
    const scenes = def.scenes, n = scenes.length;
    const starts = [];
    let acc = 0;
    scenes.forEach((s, i) => { starts[i] = acc; acc += s.dur * 1000; });
    const total = acc;
    // 段落標籤統一放在影片上方，像分頁一樣先看得到整支動畫分成哪幾段
    root.innerHTML = `<ol class="anim__chapters" aria-label="段落">${scenes.map((s, i) => `<li><button type="button" data-c="seek" data-i="${i}">${i + 1}. ${esc(s.title)}</button></li>`).join('')}</ol>
      <div class="anim__stage"><div class="anim__canvas" aria-hidden="true">${def.html()}</div>
        <button class="anim__big" type="button" aria-label="播放說明動畫"><span class="anim__big-ic">${ICON.play}</span><span class="anim__big-txt">播放說明動畫 · ${esc(def.length)}</span></button></div>
      <div class="anim__bar">
        <button class="anim__btn" type="button" data-c="toggle" aria-label="播放">${ICON.play}</button>
        <div class="anim__track" role="slider" tabindex="0" aria-label="動畫進度，左右鍵可快轉或倒轉" aria-valuemin="0" aria-valuemax="${Math.round(total / 1000)}" aria-valuenow="0" aria-valuetext="0:00"><div class="anim__fill"></div>${starts.slice(1).map(s => `<span class="anim__tick" style="left:${(s / total * 100).toFixed(2)}%"></span>`).join('')}</div>
        <span class="anim__time">0:00 / ${fmt(total)}</span>
        <button class="anim__btn anim__btn--ghost" type="button" data-c="full" aria-label="全螢幕播放">${ICON.full}</button>
      </div>
      <p class="anim__hint">畫面比較小？把手機橫放，再按右邊的全螢幕按鈕。</p>
      <p class="anim__caption" aria-live="polite"><span class="anim__step"></span><span class="anim__text"></span></p>`;

    const stage = $('.anim__stage', root), canvas = $('.anim__canvas', root), layers = $$('.anim__scene', canvas);
    const toggleBtn = $('[data-c="toggle"]', root), big = $('.anim__big', root), track = $('.anim__track', root);
    const fill = $('.anim__fill', root), time = $('.anim__time', root);
    let t = 0, playing = false, last = 0, raf = 0, cur = -1, started = false;

    const fit = () => { canvas.style.transform = `scale(${stage.clientWidth / CANVAS_W})`; };
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage); else window.addEventListener('resize', fit);
    fit();

    const sceneAt = ms => { for (let i = n - 1; i > 0; i--) if (ms >= starts[i]) return i; return 0; };
    const apply = (k, local) => {
      const layer = layers[k];
      scenes[k].beats.forEach(([bt, key, cls, et]) => {
        const on = local >= bt * 1000 && (et == null || local < et * 1000);
        layer.querySelectorAll(`[data-b~="${key}"]`).forEach(el => el.classList.toggle(cls || 'is-in', on));
      });
    };
    const caption = k => {
      $('.anim__step', root).textContent = `${k + 1} / ${n} · ${scenes[k].title}`;
      $('.anim__text', root).textContent = scenes[k].caption;
      $$('[data-c="seek"]', root).forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
    };
    // jump=true：直接跳到該時間點的畫面（不播放過場）
    const render = jump => {
      const k = sceneAt(Math.min(t, total - 1));
      const layer = layers[k];
      if (k !== cur) {
        layers.forEach((l, i) => l.classList.toggle('is-active', i === k));
        layer.classList.add('no-tr');
        layer.querySelectorAll('[data-b]').forEach(el => el.classList.remove(...STATE));
        void layer.offsetWidth;
        if (!jump) layer.classList.remove('no-tr');
        cur = k; caption(k);
      } else if (jump) layer.classList.add('no-tr');
      apply(k, t - starts[k]);
      if (jump) { void layer.offsetWidth; layer.classList.remove('no-tr'); }
      fill.style.width = (Math.min(t, total) / total * 100).toFixed(2) + '%';
      time.textContent = `${fmt(t)} / ${fmt(total)}`;
      track.setAttribute('aria-valuenow', String(Math.round(t / 1000)));
      track.setAttribute('aria-valuetext', fmt(t));
    };
    const setBtn = () => {
      const ended = !playing && t >= total;
      toggleBtn.innerHTML = playing ? ICON.pause : ended ? ICON.replay : ICON.play;
      toggleBtn.setAttribute('aria-label', playing ? '暫停' : ended ? '重播' : '播放');
      root.classList.toggle('is-playing', playing);
      root.classList.toggle('is-ended', ended);
      $('.anim__big-txt', root).textContent = ended ? '再看一次' : `播放說明動畫 · ${def.length}`;
      $('.anim__big-ic', root).innerHTML = ended ? ICON.replay : ICON.play;
    };
    const tick = now => {
      if (!playing) return;
      t += now - last; last = now;
      if (t >= total) { t = total; playing = false; render(false); setBtn(); return; }
      render(false);
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (playing) return;
      if (!started || t >= total) { t = 0; cur = -1; }
      started = true; playing = true;
      root.classList.add('is-started');
      last = performance.now(); render(false); setBtn();
      raf = requestAnimationFrame(tick);
    };
    const pause = () => { if (!playing) return; playing = false; cancelAnimationFrame(raf); setBtn(); };
    // 關掉章節大卡片或換一堂時，外面可以叫它暫停；也可以從外面開始播放
    root.dscPause = pause;
    root.dscPlay = play;
    const seek = (ms, keepPlaying) => {
      t = Math.max(0, Math.min(total - 1, ms));
      started = true; root.classList.add('is-started');
      render(true);
      if (keepPlaying && !playing) { playing = true; last = performance.now(); raf = requestAnimationFrame(tick); }
      setBtn();
    };

    big.addEventListener('click', play);
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-c]'); if (!c) return;
      if (c.dataset.c === 'toggle') { if (playing) pause(); else play(); }
      if (c.dataset.c === 'seek') seek(starts[Number(c.dataset.i)], true);
      if (c.dataset.c === 'full') {
        if (document.fullscreenElement === root) document.exitFullscreen();
        else if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
      }
    });
    track.addEventListener('click', e => { const r = track.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * total, playing); });
    track.addEventListener('keydown', e => {
      const step = { ArrowRight: 5000, ArrowLeft: -5000 }[e.key];
      if (step) { e.preventDefault(); seek(t + step, playing); }
      if (e.key === 'Home') { e.preventDefault(); seek(0, playing); }
    });
    document.addEventListener('fullscreenchange', () => requestAnimationFrame(fit));
    // 捲走或切換分頁時自動暫停，回來再自己按播放
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) pause(); }), { threshold: 0.2 }).observe(stage);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    // 封面：先擺好第一幕的畫面，時間仍從 0 開始
    t = def.poster || 0; render(true); t = 0;
    fill.style.width = '0%'; time.textContent = `0:00 / ${fmt(total)}`;
    setBtn();
  };

  /* ---------- 0-1：五站流水線 ---------- */
  const ST = [
    { img: 'design-element', name: 'Design Token', short: 'Token', desc: '把設計值變成 AI 讀得懂的名字' },
    { img: 'bricks', name: 'Figma 整理', short: 'Figma 整理', desc: '把散落的 UI 整理成元件' },
    { img: 'bricks-document', name: '設計系統文件', short: '文件', desc: '寫給 AI 看的規則書' },
    { img: 'play-lego', name: 'Storybook 元件庫', short: 'Storybook', desc: '用程式做好、能直接用的元件' },
    { img: 'product', name: '產品界面', short: '產品', desc: '用元件組出原型和產品' }
  ];
  const screen = label => `<div class="a-screen"><span class="a-pimg">${DSC.tee('#8FA8C8')}</span><b>簡約短袖上衣</b><i></i><span class="a-btn">${label}</span></div>`;

  // 細軌道：一條線、五個點、點下面一行字。xs 是五個點的 x，y 是線的位置
  const rail = (y, xs, labels, opt = {}) => {
    const r = opt.big ? 11 : 9;
    const left = opt.from != null ? opt.from : xs[0];
    let h = `<div class="x a-rail b b--fade" data-b="rail" style="left:${left}px;top:${y - 2}px;width:${xs[xs.length - 1] - left}px"></div>`;
    if (opt.segs) h += xs.slice(1).map((x, i) => `<div class="x a-seg" data-b="seg${i}" style="left:${xs[i]}px;top:${y - 2}px;width:${x - xs[i]}px"></div>`).join('');
    h += xs.map((x, i) => `<div class="x a-node${opt.big ? ' a-node--lg' : ''} b b--fade" data-b="rail d${i}" style="left:${x - r}px;top:${y - r}px"></div>`).join('');
    h += xs.map((x, i) => `<div class="x a-nlabel b b--fade" data-b="rail d${i}" style="left:${x - 70}px;top:${y + 20}px">${labels[i]}</div>`).join('');
    return h;
  };
  const XS = [120, 260, 400, 540, 680];

  // 一站一站輪流放大：第 i 張在 s 進場、s+gap 退場；軌道上的點同步亮起
  const steps = (prefix, t0, gap, count) => {
    const b = [];
    for (let i = 0; i < count; i++) {
      const s = t0 + i * gap;
      const last = i === count - 1;
      b.push([s, `${prefix}${i}`]);
      if (!last) b.push([s + gap, `${prefix}${i}`, 'is-out']);
      b.push([s, `d${i}`, 'is-hot', last ? undefined : s + gap]);
      b.push([s, `d${i}`, 'is-done']);
      if (i > 0) b.push([s - 0.3, `seg${i - 1}`]);
    }
    return b;
  };
  // 給其他章節的動畫（anim-intro.js）共用
  DSC.animKit = { rail, steps, screen };

  DSC.ANIMS = DSC.ANIMS || {};
  DSC.ANIMS.pipeline01 = {
    length: '約 45 秒',
    poster: 5600,
    scenes: [
      {
        title: '從設計到產品', dur: 8.5,
        caption: '設計稿要怎麼一路變成產品，做得快，又不會越做越亂？這門課走的是一條固定的路。',
        beats: [[0.2, 't'], [1.0, 'file'], [2.4, 'phone'], [3.8, 'path'], [5.0, 'q']]
      },
      {
        title: '五站流水線', dur: 12.5,
        caption: '整條路分成五站：Design Token、Figma 整理、設計系統文件、Storybook 元件庫，最後是產品界面。',
        beats: [[0.2, 't'], [0.6, 'rail']].concat(steps('c', 1.2, 2.1, 5))
      },
      {
        title: 'skill 是工作說明書', dur: 12.5,
        caption: '每一站都有 skill 負責。skill 是寫給 AI 的工作說明書：照什麼步驟做，遇到要做決定的地方，一定先停下來問你。',
        beats: [[0.2, 't'], [0.6, 'robot'], [1.4, 'card'], [2.8, 's1'], [4.4, 's2'], [6.0, 's2', 'is-hot'], [6.6, 'ask'], [8.4, 's3']]
      },
      {
        title: '出發', dur: 9,
        caption: '接下來的五個部分，就是這五站。每走完一站，你都會拿到下一站用得到的東西。準備好，就出發吧！',
        beats: [[0.2, 't'], [0.6, 'rail'], [1.4, 'pin'],
          [2.2, 'd0', 'is-hot', 3.2], [2.2, 'd0', 'is-done'], [3.0, 'd1', 'is-hot', 4.0], [3.0, 'd1', 'is-done'],
          [3.8, 'd2', 'is-hot', 4.8], [3.8, 'd2', 'is-done'], [4.6, 'd3', 'is-hot', 5.6], [4.6, 'd3', 'is-done'],
          [5.4, 'd4', 'is-hot'], [5.4, 'd4', 'is-done'], [6.4, 'end']]
      }
    ],
    html: () => [
      // 1 從設計到產品
      `<div class="anim__scene" data-s="0">
        <div class="x a-title b" data-b="t">一份設計，怎麼變成產品？</div>
        <div class="x b b--left" data-b="file" style="left:70px;top:104px;width:250px"><div class="a-win"><div class="a-win__bar"><i></i><i></i><i></i><span>Mini Shop.fig</span></div>${screen('加入購物車')}</div><div class="a-label" style="margin-top:14px">設計稿</div></div>
        <svg class="x b b--fade" data-b="path" style="left:330px;top:196px" width="190" height="90" viewBox="0 0 190 90"><path class="a-dash" d="M8 45 C 60 0, 130 90, 182 45"/></svg>
        <div class="x a-q b b--pop" data-b="q" style="left:393px;top:166px">?</div>
        <div class="x b" data-b="phone" style="left:532px;top:88px;width:168px"><div class="a-phone">${screen('加入購物車')}</div><div class="a-label" style="margin-top:14px">產品</div></div>
      </div>`,
      // 2 五站流水線：一次放大一站，底部軌道標出走到哪
      `<div class="anim__scene" data-s="1">
        <div class="x a-title b" data-b="t">五站流水線</div>
        ${ST.map((s, i) => `<div class="x a-focus" data-b="c${i}" style="left:0;right:0;top:96px">
          <div class="a-focus__art">${img(s.img)}</div>
          <div class="a-focus__txt"><span class="a-focus__no">第 ${i + 1} 站</span><b>${s.name}</b><p>${s.desc}</p></div>
        </div>`).join('')}
        ${rail(372, XS, ST.map(s => s.short), { segs: true })}
      </div>`,
      // 3 skill 是工作說明書
      `<div class="anim__scene" data-s="2">
        <div class="x a-title b" data-b="t">skill：寫給 AI 的工作說明書</div>
        <div class="x b b--left" data-b="robot" style="left:58px;top:104px;width:190px;text-align:center"><div class="a-robot">${img('ai-read')}</div><div class="a-label" style="margin-top:8px">AI agent</div></div>
        <div class="x a-card b" data-b="card" style="left:282px;top:100px;width:470px">
          <div class="a-card__head"><span class="a-chip">skill</span><b>figma-m3-variables</b></div>
          <p class="a-card__sub">第 1 站：Design Token</p>
          <ol class="a-steps">
            <li class="b" data-b="s1"><span>1</span>收集設計稿裡的顏色、字級、間距</li>
            <li class="b" data-b="s2"><span>2</span>相近的值，先停下來問你</li>
            <li class="b" data-b="s3"><span>3</span>綁定成三層 Variables，外觀不變</li>
          </ol>
        </div>
        <div class="x a-ask b b--pop" data-b="ask" style="left:588px;top:268px">${img('coding-1')}<span class="a-bubble">我來決定</span></div>
      </div>`,
      // 4 出發
      `<div class="anim__scene" data-s="3">
        <div class="x a-title b" data-b="t">接下來五個部分，就是這五站</div>
        <div class="x a-pin b b--pop" data-b="pin" style="left:25px;top:142px;width:90px"><span class="a-pin__txt">你在這裡</span><span class="a-pin__dot"></span></div>
        ${rail(238, [150, 285, 420, 555, 690], ST.map((s, i) => `<span class="a-partno">第 ${i + 1} 部</span>${s.name}`), { big: true, from: 70 })}
        <div class="x a-note b" data-b="end" style="top:372px">準備好，就出發吧！</div>
        <div class="x a-jump b b--pop" data-b="end" style="left:612px;top:326px;width:86px">${img('jump')}</div>
      </div>`
    ].join('')
  };
})();
