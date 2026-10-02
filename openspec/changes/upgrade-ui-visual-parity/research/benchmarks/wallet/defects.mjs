// Ground truth for the seeded benchmark. Each defect is one CSS override (or one DOM edit),
// so every variant differs from the reference in exactly one designer-visible way.
// `tier`: coarse = the kind of drift a first pass is expected to catch; detail = the fine
// visual detail the upgraded skill is aiming at.
export const DEFECTS = [
  { id: "D01", tier: "coarse", what: "card padding 24 → 16", css: ".balance-card{padding:16px}" },
  { id: "D02", tier: "coarse", what: "button label weight 600 → 500", css: ".btn{font-weight:500}" },
  { id: "D03", tier: "coarse", what: "button radius 12 → 8", css: ".btn{border-radius:8px}" },
  { id: "D04", tier: "coarse", what: "row title colour #111827 → #374151", css: ".tx-title{color:#374151}" },
  { id: "D05", tier: "coarse", what: "primary button fill #4f46e5 → #6366f1", css: ".btn-primary{background:#6366f1}" },
  { id: "D06", tier: "coarse", what: "gap between the two buttons 12 → 16", css: ".actions{gap:16px}" },
  { id: "D07", tier: "coarse", what: "row subtitle size 13 → 12", css: ".tx-sub{font-size:12px}" },
  { id: "D08", tier: "detail", what: "row vertical padding 12 → 11 (1px)", css: ".tx-row{padding:11px 0}" },
  { id: "D09", tier: "detail", what: "card label line-height 18 → 22", css: ".label{line-height:22px}" },
  { id: "D10", tier: "detail", what: "balance letter-spacing -0.5 → 0", css: ".amount{letter-spacing:0}" },
  { id: "D11", tier: "detail", what: "section title line-height 24 → not set", css: ".section-title{line-height:normal}" },
  { id: "D12", tier: "detail", what: "card shadow 0 8 24 → 0 4 12", css: ".balance-card{box-shadow:0 4px 12px rgba(79,70,229,.24)}" },
  { id: "D13", tier: "detail", what: "card gradient end stop #7c3aed → #6d28d9", css: ".balance-card{background:linear-gradient(135deg,#4f46e5 0%,#6d28d9 100%)}" },
  { id: "D14", tier: "detail", what: "row dividers missing", css: ".tx-row{border-bottom:none}" },
  { id: "D15", tier: "detail", what: "row icon glyph 20 → 24", css: ".tx-icon svg{width:24px;height:24px}" },
  { id: "D16", tier: "detail", what: "tab icon stroke 1.5 → 2", css: ".tab svg{stroke-width:2}" },
  { id: "D17", tier: "detail", what: "'See all' link gains an underline", css: ".link{text-decoration:underline}" },
  { id: "D18", tier: "detail", what: "balance pushed down 3px by a stray wrapper", dom: (html) => html.replace(/<p( data-testid="t\d+")? class="amount">\$12,480\.50<\/p>/, (m) => `<div style="padding-top:3px">${m}</div>`) },
  { id: "D19", tier: "detail", what: "avatar image stretched (cover → fill)", css: ".avatar{object-fit:fill}" },
  { id: "D20", tier: "detail", what: "primary button hover colour wrong", css: ".btn-primary:hover{background:#3730a3}", state: "hover" },
  { id: "D21", tier: "detail", what: "long subtitle wraps instead of truncating", css: ".tx-sub{white-space:normal;overflow:visible;text-overflow:clip}" },
  { id: "D22", tier: "detail", what: "caption opacity .72 → .6", css: ".caption{opacity:.6}" },
  { id: "D23", tier: "detail", what: "input border 1 → 2", css: ".input{border-width:2px}" },
  { id: "D24", tier: "detail", what: "row items top-aligned instead of centred", css: ".tx-row{align-items:flex-start}" },
  { id: "D25", tier: "detail", what: "badge offset -4/-4 → 0/0", css: ".badge{top:0;right:0}" },
  { id: "D26", tier: "detail", what: "avatar 36 → 32", css: ".avatar-wrap,.avatar{width:32px;height:32px}" },
  { id: "D27", tier: "detail", what: "outline button 2px taller (border added outside)", css: ".btn-outline{box-sizing:content-box}" },
  { id: "D28", tier: "detail", what: "active tab colour #4f46e5 → #6366f1", css: ".tab.is-active{color:#6366f1}" },
  { id: "D29", tier: "detail", what: "chip pill radius → 8", css: ".chip{border-radius:8px}" },
  { id: "D31", tier: "detail", what: "field label loses uppercase", css: ".field-label{text-transform:none}" },
  { id: "D32", tier: "detail", what: "placeholder colour #9ca3af → #6b7280", css: ".input::placeholder{color:#6b7280}" },
  { id: "D33", tier: "detail", what: "tab bar top hairline missing", css: ".tab-bar{border-top:none}" },
  { id: "D34", tier: "detail", what: "gap inside a row 12 → 10", css: ".tx-row{gap:10px}" },
  { id: "D35", tier: "detail", what: "app bar hairline colour #e5e7eb → #d1d5db", css: ".app-bar{border-bottom-color:#d1d5db}" },
  { id: "D36", tier: "detail", what: "wrong menu icon (3 bars → 2 bars)", dom: (html) => html.replace(`<path d="M4 6h16M4 12h16M4 18h16"/>`, `<path d="M4 8h16M4 16h16"/>`) },
  { id: "D37", tier: "detail", what: "one row's positive amount not green", css: ".tx-amount.is-positive{color:#111827}" },
];

// Visually identical rewrites. Any finding raised for these is a false alarm.
export const DECOYS = [
  { id: "FP1", what: "badge radius written as 9999px (same pill)", css: ".badge{border-radius:9999px}" },
  { id: "FP2", what: "same 8px spacing via margin instead of gap", css: ".delta-row{gap:0}.delta-row .caption{margin-left:8px}" },
  { id: "FP3", what: "same 48px button via padding instead of height", css: ".btn{height:auto;padding:14px 0}.btn-outline{padding:13px 0}" },
];

export function applyVariant(html, items) {
  let out = html;
  const css = [];
  for (const item of items) {
    if (item.css) css.push(`/* ${item.id} */ ${item.css}`);
    if (item.dom) {
      const next = item.dom(out);
      if (next === out) throw new Error(`${item.id}: DOM anchor not found`);
      out = next;
    }
  }
  if (css.length) out = out.replace("</head>", `<style id="seeded">\n${css.join("\n")}\n</style>\n</head>`);
  return out;
}

// "Tagged" copies give every element a unique data-testid, which is the best case for the
// documented snippet: every element is collected and every pair matches by id.
export function tagAll(html) {
  let n = 0;
  const [head, body] = html.split("<body>");
  const tagged = body.replace(/<(?!\/)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)>/g, (m, tag, rest) => {
    if (["path", "circle", "rect"].includes(tag)) return m;
    n += 1;
    return `<${tag} data-testid="t${String(n).padStart(3, "0")}"${rest}>`;
  });
  return `${head}<body>${tagged}`;
}

// Same picture, different element tree: extra wrappers and changed tags, the way a real
// implementation never mirrors a design file's layer structure. Nothing here may change a pixel.
export function restructure(html) {
  const steps = [
    [/<section( data-testid="t\d+")? class="balance-card">/, (m) => `${m}<div class="card-inner">`],
    ["</section>", "</div></section>"],
    [/<ul( data-testid="t\d+")? class="tx-list">/, (m) => `<div class="list-wrap">${m}`],
    ["</ul>", "</ul></div>"],
    [/<h2( data-testid="t\d+")? class="section-title">Recent activity<\/h2>/, (m) => `<div class="head-left">${m}</div>`],
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
