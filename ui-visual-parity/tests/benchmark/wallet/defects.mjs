// Wallet benchmark (mobile, 390 wide): seeded differences and equivalent rewrites.
//
// Each difference changes exactly one thing a designer would notice and declares, as
// `expect`, the cause a cycle must report for it. Each decoy changes how the page is written
// without changing a pixel, so a cycle must report nothing for it.
export const DEFECTS = [
  { id: "D01", what: "card padding 24 → 16", css: ".balance-card{padding:16px}", expect: /balance-card padding-(top|right|bottom|left) 24 → 16/ },
  { id: "D02", what: "button label weight 600 → 500", css: ".btn{font-weight:500}", expect: /font weight 600 → 500/ },
  { id: "D03", what: "button radius 12 → 8", css: ".btn{border-radius:8px}", expect: /corner radius 12px → 8px/ },
  { id: "D04", what: "row title colour #111827 → #374151", css: ".tx-title{color:#374151}", expect: /text colour #111827 → #374151/ },
  { id: "D05", what: "primary button fill #4f46e5 → #6366f1", css: ".btn-primary{background:#6366f1}", expect: /fill #4f46e5 → #6366f1/ },
  { id: "D06", what: "gap between the two buttons 12 → 16", css: ".actions{gap:16px}", expect: /actions gap 12 → 16/ },
  { id: "D07", what: "row subtitle size 13 → 12", css: ".tx-sub{font-size:12px}", expect: /font size 13px → 12px/ },
  { id: "D08", what: "row vertical padding 12 → 11 (1px)", css: ".tx-row{padding:11px 0}", expect: /tx-row padding-(top|bottom) 12 → 11/ },
  { id: "D09", what: "card label line-height 18 → 22", css: ".label{line-height:22px}", expect: /line height 18px → 22px/ },
  { id: "D10", what: "balance letter-spacing -0.5 → 0", css: ".amount{letter-spacing:0}", expect: /letter spacing -0\.5px → 0px/ },
  { id: "D11", what: "section title line-height 24 → not set", css: ".section-title{line-height:normal}", expect: /line height 24px → [\d.]+px \(not set/ },
  { id: "D12", what: "card shadow 0 8 24 → 0 4 12", css: ".balance-card{box-shadow:0 4px 12px rgba(79,70,229,.24)}", expect: /shadow 0 8 24 0 #4f46e53d → 0 4 12 0 #4f46e53d/ },
  { id: "D13", what: "card gradient end stop #7c3aed → #6d28d9", css: ".balance-card{background:linear-gradient(135deg,#4f46e5 0%,#6d28d9 100%)}", expect: /gradient .*#7c3aed 100%\) → .*#6d28d9 100%\)/ },
  { id: "D14", what: "row dividers missing", css: ".tx-row{border-bottom:none}", expect: /bottom border is missing/ },
  { id: "D15", what: "row icon glyph 20 → 24", css: ".tx-icon svg{width:24px;height:24px}", expect: /svg: (width|height) 20px → 24px/ },
  { id: "D16", what: "tab icon stroke 1.5 → 2", css: ".tab svg{stroke-width:2}", expect: /icon stroke 1\.5px → 2px/ },
  { id: "D17", what: "'See all' link gains an underline", css: ".link{text-decoration:underline}", expect: /text decoration none → underline/ },
  { id: "D18", what: "balance pushed down 3px by a stray wrapper", dom: (html) => html.replace(/<p class="amount">\$12,480\.50<\/p>/, (m) => `<div style="padding-top:3px">${m}</div>`), expect: /div padding-top 0 → 3/ },
  { id: "D19", what: "avatar image stretched (cover → fill)", css: ".avatar{object-fit:fill}", expect: /image fit cover → fill/ },
  { id: "D20", what: "primary button hover colour wrong", css: ".btn-primary:hover{background:#3730a3}", expect: /hover background #4338ca → #3730a3/ },
  { id: "D21", what: "long subtitle wraps instead of truncating", css: ".tx-sub{white-space:normal;overflow:visible;text-overflow:clip}", expect: /wraps to \d lines|should truncate/ },
  { id: "D22", what: "caption opacity .72 → .6", css: ".caption{opacity:.6}", expect: /opacity 0\.72 → 0\.6/ },
  { id: "D23", what: "input border 1 → 2", css: ".input{border-width:2px}", expect: /border width 1px → 2px/ },
  { id: "D24", what: "row items top-aligned instead of centred", css: ".tx-row{align-items:flex-start}", expect: /centred vertically in the reference/ },
  { id: "D25", what: "badge offset -4/-4 → 0/0", css: ".badge{top:0;right:0}", expect: /badge.* 5\.5(px)? → 9\.5/ },
  { id: "D26", what: "avatar 36 → 32", css: ".avatar-wrap,.avatar{width:32px;height:32px}", expect: /avatar: (width|height) 36px → 32px/ },
  { id: "D27", what: "outline button 2px taller (border added outside)", css: ".btn-outline{box-sizing:content-box}", expect: /btn-outline: height 48px → 50px/ },
  { id: "D28", what: "active tab colour #4f46e5 → #6366f1", css: ".tab.is-active{color:#6366f1}", expect: /colour #4f46e5 → #6366f1/ },
  { id: "D29", what: "chip pill radius → 8", css: ".chip{border-radius:8px}", expect: /chip: corner radius 12px → 8px/ },
  { id: "D31", what: "field label loses uppercase", css: ".field-label{text-transform:none}", expect: /text-transform uppercase → none/ },
  { id: "D32", what: "placeholder colour #9ca3af → #6b7280", css: ".input::placeholder{color:#6b7280}", expect: /placeholder colour #9ca3af → #6b7280/ },
  { id: "D33", what: "tab bar top hairline missing", css: ".tab-bar{border-top:none}", expect: /top border is missing/ },
  { id: "D34", what: "gap inside a row 12 → 10", css: ".tx-row{gap:10px}", expect: /tx-row gap 12 → 10/ },
  { id: "D35", what: "app bar hairline colour #e5e7eb → #d1d5db", css: ".app-bar{border-bottom-color:#d1d5db}", expect: /bottom border colour #e5e7eb → #d1d5db/ },
  { id: "D36", what: "wrong menu icon (3 bars → 2 bars)", dom: (html) => html.replace(`<path d="M4 6h16M4 12h16M4 18h16"/>`, `<path d="M4 8h16M4 16h16"/>`), expect: /icon artwork differs/ },
  { id: "D37", what: "one row's positive amount not green", css: ".tx-amount.is-positive{color:#111827}", expect: /text colour #059669 → #111827/ },
  { id: "D38", what: "text inside the input starts at 16 instead of 12", css: ".input{padding:0 16px}", expect: /input padding-left 12 → 16/ },
];

export const DECOYS = [
  { id: "FP1", what: "badge radius written as 9999px (same pill)", css: ".badge{border-radius:9999px}" },
  { id: "FP2", what: "same 8px spacing via margin instead of gap", css: ".delta-row{gap:0}.delta-row .caption{margin-left:8px}" },
  { id: "FP3", what: "same 48px button via padding instead of height", css: ".btn{height:auto;padding:14px 0}.btn-outline{padding:13px 0}" },
  { id: "FP4", what: "row dividers drawn as 1px elements instead of borders", css: ".tx-row{border-bottom:none}.tx-rule{height:1px;background:var(--color-border)}", dom: (html) => html.replace(/<\/li>(\s*)<li class="tx-row">/g, (m, space) => `</li>${space}<li class="tx-rule"></li>${space}<li class="tx-row">`) },
  { id: "FP5", what: "same gradient written without stop positions", css: ".balance-card{background:linear-gradient(135deg,var(--color-primary),var(--color-primary-2))}" },
];

export const SURFACE = { root: ".screen", viewport: { width: 390, height: 844, dpr: 2 } };

/**
 * The implementation side of every wallet variant: same picture, different element tree —
 * extra wrappers and changed tags, the way a real build never mirrors a design file's
 * layers. Nothing here may change a pixel, so nothing may be paired by structure.
 */
export function restructure(html) {
  const steps = [
    [/<section class="balance-card">/, (m) => `${m}<div class="card-inner">`],
    ["</section>", "</div></section>"],
    [/<ul class="tx-list">/, (m) => `<div class="list-wrap">${m}`],
    ["</ul>", "</ul></div>"],
    [/<h2 class="section-title">Recent activity<\/h2>/, (m) => `<div class="head-left">${m}</div>`],
    [/<span>(Home|Cards|Stats|Profile)<\/span>/g, (m, word) => `<span><span>${word}</span></span>`],
    [/<p class="tx-title">([^<]*)<\/p>/g, (m, text) => `<div class="tx-title">${text}</div>`],
  ];
  let out = html;
  for (const [find, replace] of steps) {
    const next = out.replace(find, replace);
    if (next === out) throw new Error(`restructure: nothing matched ${find}`);
    out = next;
  }
  return out;
}

export const prepare = restructure;
