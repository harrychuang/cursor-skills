// Held-out page: written after the prototype, which was not changed to fit it.
export const DEFECTS = [
  { id: "H01", what: "stats grid gap 16 → 24", css: ".stats{gap:24px}" },
  { id: "H02", what: "stat card padding 20 → 16", css: ".stat{padding:16px}" },
  { id: "H03", what: "h1 size 28 → 26", css: "h1{font-size:26px}" },
  { id: "H04", what: "intro paragraph line-height 24 → 22", css: ".lede{line-height:22px}" },
  { id: "H05", what: "intro paragraph max-width 640 → 720", css: ".lede{max-width:720px}" },
  { id: "H06", what: "nav background alpha .8 → .6", css: ".nav{background:rgba(18,21,28,.6)}" },
  { id: "H07", what: "active tab underline colour (pseudo-element)", css: ".links a.on::after{background:#a78bfa}" },
  { id: "H08", what: "table header letter-spacing .06em → 0", css: "th{letter-spacing:0}" },
  { id: "H09", what: "table cell horizontal padding 16 → 12", css: "td{padding:12px}" },
  { id: "H10", what: "owner tag uses the default tag colours", css: ".tag.owner{background:rgba(110,168,254,.14);color:#6ea8fe}" },
  { id: "H11", what: "status dot 8 → 6 (pseudo-element)", css: ".state::before{width:6px;height:6px}" },
  { id: "H12", what: "last-active column left-aligned", css: ".num{text-align:left}" },
  { id: "H13", what: "avatar initials weight 600 → 700", css: ".who i{font-weight:700}" },
  { id: "H14", what: "toggle track 36 → 40", css: ".toggle span{width:40px}" },
  { id: "H15", what: "drop zone border dashed → solid", css: ".drop{border-style:solid}" },
  { id: "H16", what: "button horizontal padding 16 → 20", css: ".btn{padding:0 20px}" },
  { id: "H17", what: "gap between buttons 8 → 12", css: ".actions{gap:12px}" },
  { id: "H18", what: "form control height 40 → 36", css: ".form input[type=text],.form select{height:36px}" },
  { id: "H19", what: "card radius 12 → 10", css: ".stat,.form,table{border-radius:10px}" },
  { id: "H20", what: "input inner shadow missing", css: ".form input[type=text],.form select{box-shadow:none}" },
  { id: "H21", what: "sidebar width 240 → 232", css: ".side{width:232px}" },
  { id: "H22", what: "active sidebar item fill", css: ".side a.on{background:#1f2633}" },
  { id: "H23", what: "count badge padding 6 → 4", css: ".side a b{padding:0 4px}" },
  { id: "H24", what: "sparkline colour", css: ".stat svg{color:#a78bfa}" },
  { id: "H25", what: "footer centred → left", css: ".foot{text-align:left}" },
  { id: "H26", what: "brand font serif → sans", css: ".brand{font-family:var(--sans)}" },
  { id: "H27", what: "row divider colour", css: "td{border-bottom-color:#2f3644}" },
  { id: "H28", what: "table header size 12 → 11", css: "th{font-size:11px}" },
  { id: "H29", what: "search icon offset 12 → 8", css: ".search svg{left:8px}" },
  { id: "H30", what: "toggle thumb position (pseudo-element) 18 → 16", css: ".toggle span::after{left:16px}" },
  { id: "H31", what: "nav blur 12 → 4", css: ".nav{backdrop-filter:blur(4px)}" },
  { id: "H32", what: "delta chip vertical alignment", css: ".stat em{align-self:end}" },
];
export const DECOYS = [
  { id: "HF1", what: "same grid gap via margins", css: ".stats{gap:0;display:flex}.stat{flex:1}.stat+.stat{margin-left:16px}" },
  { id: "HF2", what: "same colours written as hsl()", css: ".app{background:hsl(223,24%,6%)}.btn.go{background:hsl(218,90%,60%);border-color:hsl(218,90%,60%)}" },
  { id: "HF3", what: "same 1px outline drawn as a ring shadow instead of a border", css: ".me{border:none;padding:5px 11px 5px 5px;box-shadow:0 0 0 1px #262b36 inset}" },
];
export function applyVariant(html, items) {
  const css = items.filter((i) => i.css).map((i) => `/* ${i.id} */ ${i.css}`);
  return css.length ? html.replace("</head>", `<style id="seeded">\n${css.join("\n")}\n</style>\n</head>`) : html;
}
export function tagAll(html) {
  let n = 0;
  const [head, body] = html.split("<body>");
  return `${head}<body>${body.replace(/<(?!\/)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)>/g, (m, tag, rest) => (["path", "circle", "rect", "option"].includes(tag) ? m : `<${tag} data-testid="t${String((n += 1)).padStart(3, "0")}"${rest}>`))}`;
}
