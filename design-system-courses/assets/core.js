/* 共用小工具：選取、跳脫、簡易 Markdown、插圖、圖示、進度儲存 */
(function () {
  'use strict';
  const DSC = (window.DSC = window.DSC || {});

  DSC.$ = (s, r = document) => r.querySelector(s);
  DSC.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  DSC.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // **粗體** 與 `程式碼`，先跳脫再轉換
  DSC.md = s => DSC.esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  DSC.plain = s => String(s || '').replace(/\*\*|`/g, '');
  DSC.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  DSC.pad = n => String(n).padStart(2, '0');

  // 線條圖示：跟著文字顏色走
  const line = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  DSC.ICON = {
    plus: line('<path d="M12 5v14M5 12h14"/>'),
    close: line('<path d="M7 7l10 10M17 7 7 17"/>'),
    check: line('<path d="m6 12.5 4 4 8-9"/>'),
    chevR: line('<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>'),
    chevL: line('<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>'),
    chevD: line('<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>'),
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>'
  };

  // Mini Shop 範例的商品圖：一件 T 恤的剪影（不用真的商品照片）
  DSC.tee = (color, cls = '') => `<svg class="${cls}" viewBox="0 0 100 80" aria-hidden="true"><path d="M38 6 Q50 17 62 6 L80 14 L91 30 L78 38 L72 32 V74 H28 V32 L22 38 L9 30 L20 14 Z" fill="${color}" stroke="rgba(0,0,0,.1)" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

  // 插圖：images/web/ 底下的 WebP，寬高先寫好，避免版面跳動
  DSC.IMG = {
    'ai-coding': [677, 900], 'ai-read': [459, 900], 'ai-use-computer': [720, 900],
    'bricks': [900, 474], 'bricks-document': [900, 874], 'builders': [900, 571], 'builders-people': [757, 900], 'building': [900, 360],
    'coding': [819, 900], 'coding-1': [899, 900], 'coding-2': [900, 900], 'coding-3': [900, 900],
    'comp-doc': [900, 630], 'confuse': [525, 900], 'delivery': [900, 808],
    'design-doc': [900, 852], 'design-element': [866, 900], 'designer': [900, 884],
    'dog-cat-run': [900, 663], 'dog-cat-table': [900, 802], 'earth': [900, 839], 'folder': [900, 829],
    'game-save-data': [744, 900], 'game-timeline': [900, 650],
    'heart': [611, 900], 'idea': [698, 900], 'intro': [900, 773], 'jump': [877, 900],
    'laptop': [900, 834], 'lego': [900, 834], 'like': [900, 698], 'like-close': [692, 900], 'paper': [771, 900],
    'play': [900, 839], 'play-lego': [868, 900], 'product': [864, 900], 'read-book': [900, 869], 'read-news': [587, 900],
    'research': [900, 804], 'sort': [889, 900], 'stars': [900, 886], 'study': [900, 880],
    'suprise': [834, 900], 'terminal': [900, 788], 'timemachine': [893, 900],
    'ui-browser': [900, 639], 'ui-flow': [900, 680], 'ui-pc': [900, 793], 'use-appliances': [900, 756],
    'use-house': [900, 754], 'use-laptop': [819, 900], 'use-paint': [900, 784], 'whiteboard': [900, 771],
    'whiteboard-with-people': [900, 845]
  };
  DSC.img = (name, cls = '', alt = '', eager = false) => {
    const d = DSC.IMG[name] || [800, 800];
    return `<img class="${cls}" src="images/web/${name}.webp" width="${d[0]}" height="${d[1]}" alt="${DSC.esc(alt)}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  };

  // 進度、測驗、筆記只存在這台電腦的瀏覽器；讀寫失敗也不影響使用
  const KEY = 'dsc-handout:v2';
  let S = {};
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { S = {}; }
  ['done', 'quiz', 'notes', 'checks'].forEach(k => { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
  DSC.S = S;
  DSC.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 私密視窗等情況：只在這次瀏覽有效 */ } };
  DSC.resetAll = () => { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } };

  // 對話框打開時，頁面其他地方點不到；提示和暫存的元素要放進對話框裡
  const host = () => document.querySelector('dialog[open]') || document.body;

  // 複製到剪貼簿（有些瀏覽器不支援 clipboard API，退回舊做法）
  DSC.copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      host().appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove(); return ok;
    }
  };

  let toastTimer = 0;
  DSC.toast = msg => {
    const t = DSC.$('#toast'); if (!t) return;
    const h = host(); if (t.parentNode !== h) h.appendChild(t);
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 1800);
  };
})();
