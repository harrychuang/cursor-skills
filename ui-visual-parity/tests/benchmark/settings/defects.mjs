// Settings benchmark (desktop, 1280 wide, dark): seeded differences and equivalent rewrites.
// See the wallet benchmark for what `expect` and a decoy mean.
export const DEFECTS = [
  { id: "H01", what: "stats grid gap 16 → 24", css: ".stats{gap:24px}", expect: /stats gap 16 → 24/ },
  { id: "H02", what: "stat card padding 20 → 16", css: ".stat{padding:16px}", expect: /stat padding-(top|right|bottom|left) 20 → 16/ },
  { id: "H03", what: "h1 size 28 → 26", css: "h1{font-size:26px}", expect: /font size 28px → 26px/ },
  { id: "H04", what: "intro paragraph line-height 24 → 22", css: ".lede{line-height:22px}", expect: /line height 24px → 22px/ },
  { id: "H05", what: "intro paragraph max-width 640 → 720", css: ".lede{max-width:720px}", expect: /"Invite teammates.*: width [\d.]+px → [\d.]+px/ },
  { id: "H06", what: "nav background alpha .8 → .6", css: ".nav{background:rgba(18,21,28,.6)}", expect: /fill #12151ccc → #12151c99/ },
  { id: "H07", what: "active tab underline colour (pseudo-element)", css: ".links a.on::after{background:#a78bfa}", expect: /::after fill #6ea8fe → #a78bfa/ },
  { id: "H08", what: "table header letter-spacing .06em → 0", css: "th{letter-spacing:0}", expect: /letter spacing 0\.72px → 0px/ },
  { id: "H09", what: "table cell horizontal padding 16 → 12", css: "td{padding:12px}", expect: /td(\.num)? padding-(left|right) 16 → 12/ },
  { id: "H10", what: "owner tag uses the default tag colours", css: ".tag.owner{background:rgba(110,168,254,.14);color:#6ea8fe}", expect: /text colour #f5a524 → #6ea8fe/ },
  { id: "H11", what: "status dot 8 → 6 (pseudo-element)", css: ".state::before{width:6px;height:6px}", expect: /::before size 8×8px → 6×6px/ },
  { id: "H12", what: "last-active column left-aligned", css: ".num{text-align:left}", expect: /text alignment right → left/ },
  { id: "H13", what: "avatar initials weight 600 → 700", css: ".who i{font-weight:700}", expect: /font weight 600 → 700/ },
  { id: "H14", what: "toggle track 36 → 40", css: ".toggle span{width:40px}", expect: /span: width 36px → 40px/ },
  { id: "H15", what: "drop zone border dashed → solid", css: ".drop{border-style:solid}", expect: /border style dashed → solid/ },
  { id: "H16", what: "button horizontal padding 16 → 20", css: ".btn{padding:0 20px}", expect: /btn(\.go)? padding-(left|right) 16 → 20/ },
  { id: "H17", what: "gap between buttons 8 → 12", css: ".actions{gap:12px}", expect: /actions gap 8 → 12/ },
  { id: "H18", what: "form control height 40 → 36", css: ".form input[type=text],.form select{height:36px}", expect: /(input|select): height 40px → 36px/ },
  { id: "H19", what: "card radius 12 → 10", css: ".stat,.form,table{border-radius:10px}", expect: /corner radius 12px → 10px/ },
  { id: "H20", what: "input inner shadow missing", css: ".form input[type=text],.form select{box-shadow:none}", expect: /shadow inset 0 1 2 0 #00000080 → none/ },
  { id: "H21", what: "sidebar width 240 → 232", css: ".side{width:232px}", expect: /aside\.side: width 240px → 232px/ },
  { id: "H22", what: "active sidebar item fill", css: ".side a.on{background:#1f2633}", expect: /fill #171b24 → #1f2633/ },
  { id: "H23", what: "count badge padding 6 → 10", css: ".side a b{padding:0 10px}", expect: /b padding-(left|right) 6 → 10/ },
  { id: "H24", what: "sparkline colour", css: ".stat svg{color:#a78bfa}", expect: /icon colour #6ea8fe → #a78bfa/ },
  { id: "H25", what: "footer centred → left", css: ".foot{text-align:left}", expect: /text alignment center → left/ },
  { id: "H26", what: "brand font serif → sans", css: ".brand{font-family:var(--sans)}", expect: /font ui-serif → system-ui/ },
  { id: "H27", what: "row divider colour", css: "td{border-bottom-color:#2f3644}", expect: /bottom border colour #1d222c → #2f3644/ },
  { id: "H28", what: "table header size 12 → 11", css: "th{font-size:11px}", expect: /font size 12px → 11px/ },
  { id: "H29", what: "search icon offset 12 → 8", css: ".search svg{left:8px}", expect: /svg.* 12(px)? → 8/ },
  { id: "H30", what: "toggle thumb position (pseudo-element) 18 → 16", css: ".toggle span::after{left:16px}", expect: /::after offset (right 2px → 4px|left 18px → 16px)/ },
  { id: "H31", what: "nav blur 12 → 4", css: ".nav{backdrop-filter:blur(4px)}", expect: /backdropFilter blur\(12px\) → blur\(4px\)/ },
  { id: "H32", what: "gap between form rows 20 → 16", css: ".form{row-gap:16px}", expect: /form row-gap 20 → 16/ },
  { id: "H33", what: "gap between form columns 24 → 32", css: ".form{column-gap:32px}", expect: /form gap 24 → 32/ },
  { id: "H34", what: "text inside the form controls starts at 16 instead of 12", css: ".form input[type=text],.form select{padding:0 16px}", expect: /(input|select) padding-left 12 → 16/ },
  { id: "H35", what: "intro paragraph cut to one line", css: ".lede{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}", expect: /is truncated; the reference shows it in full/ },
];

export const DECOYS = [
  { id: "HF1", what: "same grid gap via margins", css: ".stats{gap:0;display:flex}.stat{flex:1}.stat+.stat{margin-left:16px}" },
  { id: "HF2", what: "same colours written as hsl()", css: ".app{background:hsl(223,24%,6%)}.btn.go{background:hsl(218,90%,60%);border-color:hsl(218,90%,60%)}" },
  { id: "HF3", what: "same 1px outline drawn as a ring shadow instead of a border", css: ".me{border:none;padding:5px 11px 5px 5px;box-shadow:0 0 0 1px #262b36 inset}" },
  { id: "HF4", what: "same gradient written with a side keyword and stop positions", css: ".me i{background:linear-gradient(to bottom,#6ea8fe 0%,#a78bfa 100%)}" },
];

export const SURFACE = { root: ".app", viewport: { width: 1280, height: 800, dpr: 2 } };

export const prepare = (html) => html;
