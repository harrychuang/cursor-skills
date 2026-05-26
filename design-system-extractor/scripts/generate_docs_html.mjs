#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const targetRoot = path.resolve(process.argv[2] || process.cwd());
const outputPath = path.resolve(
  process.argv[3] || path.join(targetRoot, "docs", "design-system", "index.html"),
);

const designSystemDir = path.join(targetRoot, "design-system");
const componentDocsDir = path.join(designSystemDir, "components");
const tokensDir = path.join(targetRoot, "tokens");

const coreDocumentFiles = [
  ["Kickstart", "DESIGN_SYSTEM_KICKSTART.md"],
  ["Session State", "SESSION_STATE.md"],
  ["Evidence Map", "DESIGN_EVIDENCE_MAP.md"],
  ["Design Principles", "DESIGN_PRINCIPLES.md"],
  ["Design Elements", "DESIGN_ELEMENTS.md"],
  ["Token Architecture", "TOKEN_ARCHITECTURE.md"],
  ["Component Inventory", "COMPONENT_INVENTORY.md"],
  ["Component Spec Template", "COMPONENT_SPEC_TEMPLATE.md"],
  ["Interaction States", "INTERACTION_STATES.md"],
  ["Page Composition", "PAGE_COMPOSITION_RULES.md"],
  ["Anti-AI Style Rules", "ANTI_AI_STYLE_RULES.md"],
];

const tokenFiles = [
  ["Reference Tokens", "tokens-ref.css", "ref"],
  ["System Tokens", "tokens-sys.css", "sys"],
  ["Component Tokens", "tokens-comp.css", "comp"],
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function formatInline(raw) {
  let text = escapeHtml(raw);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safeHref = String(href).trim().startsWith("javascript:") ? "#" : href;
    return `<a href="${escapeAttr(safeHref)}">${label}</a>`;
  });
  return text;
}

function isTableDivider(line) {
  return /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

function parseTable(lines, startIndex) {
  const tableLines = [];
  let index = startIndex;
  while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
    tableLines.push(lines[index]);
    index += 1;
  }
  if (tableLines.length < 2 || !isTableDivider(tableLines[1])) return null;

  const rows = tableLines
    .filter((_line, rowIndex) => rowIndex !== 1)
    .map((line) => {
      let trimmed = line.trim();
      if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
      return trimmed.split("|").map((cell) => cell.trim());
    });

  const header = rows[0] || [];
  const body = rows.slice(1);
  const html = [
    "<div class=\"table-wrap\"><table>",
    "<thead><tr>",
    ...header.map((cell) => `<th>${formatInline(cell)}</th>`),
    "</tr></thead>",
    "<tbody>",
    ...body.map(
      (row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join("")}</tr>`,
    ),
    "</tbody></table></div>",
  ].join("");

  return { html, nextIndex: index };
}

function markdownToHtml(markdown, idPrefix = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let index = 0;
  let paragraph = [];
  let listItems = [];
  let orderedItems = [];
  const headingCounts = new Map();

  function flushParagraph() {
    if (!paragraph.length) return;
    output.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushLists() {
    if (listItems.length) {
      output.push(`<ul>${listItems.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
    if (orderedItems.length) {
      output.push(`<ol>${orderedItems.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ol>`);
      orderedItems = [];
    }
  }

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushLists();
      const lang = trimmed.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      output.push(
        `<pre><code data-lang="${escapeAttr(lang)}">${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      flushParagraph();
      flushLists();
      output.push(table.html);
      index = table.nextIndex;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushLists();
      const level = heading[1].length;
      const title = heading[2].trim();
      const baseId = idPrefix ? `${idPrefix}-${slugify(title)}` : slugify(title);
      const count = headingCounts.get(baseId) || 0;
      headingCounts.set(baseId, count + 1);
      const id = count ? `${baseId}-${count + 1}` : baseId;
      output.push(`<h${level} id="${escapeAttr(id)}">${formatInline(title)}</h${level}>`);
      index += 1;
      continue;
    }

    const list = trimmed.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      orderedItems = [];
      listItems.push(list[1]);
      index += 1;
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      listItems = [];
      orderedItems.push(ordered[1]);
      index += 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushLists();
      index += 1;
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  flushLists();
  return output.join("\n");
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function listMarkdownDocs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function parseTokens(css, layer) {
  const props = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const pattern = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = pattern.exec(withoutComments))) {
    props.push({
      layer,
      name: match[1],
      value: match[2].trim(),
    });
  }
  return props;
}

function resolveToken(name, tokenMap, seen = new Set()) {
  if (seen.has(name)) return "";
  seen.add(name);
  const value = tokenMap.get(name);
  if (!value) return "";
  const variable = value.match(/^var\((--[A-Za-z0-9_-]+)\)$/);
  if (variable) return resolveToken(variable[1], tokenMap, seen) || value;
  return value;
}

function isColor(value) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value) || /^hsla?\(/.test(value);
}

function tokenTableHtml(title, tokens, tokenMap) {
  if (!tokens.length) {
    return `<section class="panel" id="${slugify(title)}"><h2>${escapeHtml(title)}</h2><p class="muted">No tokens found.</p></section>`;
  }

  const rows = tokens
    .map((token) => {
      const resolved = resolveToken(token.name, tokenMap);
      const swatch = isColor(resolved)
        ? `<span class="swatch" style="background:${escapeAttr(resolved)}"></span>`
        : "";
      return `<tr>
        <td><code>${escapeHtml(token.name)}</code></td>
        <td><code>${escapeHtml(token.value)}</code></td>
        <td>${swatch}<code>${escapeHtml(resolved || token.value)}</code></td>
      </tr>`;
    })
    .join("");

  return `<section class="panel" id="${slugify(title)}">
    <h2>${escapeHtml(title)}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Token</th><th>Value</th><th>Resolved</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function pageCss() {
  return `
    :root {
      color-scheme: light;
      --doc-bg: #f7f7f4;
      --doc-surface: #ffffff;
      --doc-text: #141414;
      --doc-muted: #5f625d;
      --doc-border: #d9ddd6;
      --doc-accent: #174a2a;
      --doc-code-bg: #eef1eb;
      --doc-shadow: 0 12px 32px rgba(20, 20, 20, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--doc-bg);
      color: var(--doc-text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.55;
    }
    a { color: var(--doc-accent); }
    .layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 28px 20px;
      border-right: 1px solid var(--doc-border);
      background: var(--doc-surface);
    }
    main {
      width: min(1120px, 100%);
      padding: 40px 32px 80px;
    }
    .brand {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0;
      margin: 0 0 4px;
    }
    .subtitle {
      color: var(--doc-muted);
      font-size: 13px;
      margin: 0 0 24px;
    }
    nav a {
      display: block;
      padding: 7px 0;
      color: var(--doc-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 650;
    }
    nav a:hover { color: var(--doc-text); }
    .hero {
      padding: 32px;
      background: var(--doc-surface);
      border: 1px solid var(--doc-border);
      border-radius: 8px;
      box-shadow: var(--doc-shadow);
      margin-bottom: 24px;
    }
    .hero h1 {
      font-size: clamp(32px, 4vw, 56px);
      line-height: 1;
      margin: 0 0 16px;
      letter-spacing: 0;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }
    .pill {
      border: 1px solid var(--doc-border);
      background: var(--doc-code-bg);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 13px;
      color: var(--doc-muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat {
      padding: 18px;
      border: 1px solid var(--doc-border);
      border-radius: 8px;
      background: var(--doc-surface);
    }
    .stat strong {
      display: block;
      font-size: 28px;
      line-height: 1;
      margin-bottom: 6px;
    }
    .stat span {
      color: var(--doc-muted);
      font-size: 13px;
    }
    .panel {
      padding: 28px;
      background: var(--doc-surface);
      border: 1px solid var(--doc-border);
      border-radius: 8px;
      margin: 0 0 20px;
      overflow: hidden;
    }
    .panel h1, .panel h2, .panel h3, .panel h4 {
      letter-spacing: 0;
      line-height: 1.15;
      margin-top: 0;
    }
    .panel h1 { font-size: 34px; }
    .panel h2 { font-size: 26px; margin-top: 28px; }
    .panel h3 { font-size: 20px; margin-top: 24px; }
    .panel p, .panel li { color: var(--doc-text); }
    .muted { color: var(--doc-muted); }
    .source {
      display: inline-block;
      color: var(--doc-muted);
      font-size: 13px;
      margin-bottom: 16px;
    }
    code {
      background: var(--doc-code-bg);
      border-radius: 5px;
      padding: 2px 5px;
      font-size: 0.92em;
    }
    pre {
      overflow: auto;
      padding: 16px;
      border-radius: 8px;
      background: #1d211b;
      color: #f5f7f2;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--doc-border);
      border-radius: 8px;
      margin: 16px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
    }
    th, td {
      border-bottom: 1px solid var(--doc-border);
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: var(--doc-code-bg);
      color: var(--doc-muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    tr:last-child td { border-bottom: 0; }
    .swatch {
      display: inline-block;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid var(--doc-border);
      margin-right: 8px;
      vertical-align: middle;
    }
    @media (max-width: 860px) {
      .layout { display: block; }
      aside {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--doc-border);
      }
      main { padding: 24px 16px 56px; }
      .grid { grid-template-columns: 1fr; }
      .hero, .panel { padding: 20px; }
    }
  `;
}

const docs = [];
const missingDocs = [];
const coreFileNames = new Set(coreDocumentFiles.map(([_label, file]) => file));
const allMarkdownFiles = await listMarkdownDocs(designSystemDir);
const componentMarkdownFiles = await listMarkdownDocs(componentDocsDir);
const extraDocumentFiles = allMarkdownFiles
  .filter((file) => !coreFileNames.has(file))
  .map((file) => [file.replace(/\.md$/, "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()), file]);
const componentDocumentFiles = componentMarkdownFiles.map((file) => {
  const label = file
    .replace(/\.md$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return [`Component: ${label}`, path.join("components", file)];
});

for (const [label, file] of coreDocumentFiles) {
  const fullPath = path.join(designSystemDir, file);
  const content = await readOptional(fullPath);
  if (content === null) {
    missingDocs.push(file);
  } else {
    docs.push({ label, file, content });
  }
}

for (const [label, file] of [...extraDocumentFiles, ...componentDocumentFiles]) {
  const fullPath = path.join(designSystemDir, file);
  const content = await readOptional(fullPath);
  if (content !== null) docs.push({ label, file, content });
}

const tokensByLayer = new Map();
const tokenMap = new Map();
for (const [label, file, layer] of tokenFiles) {
  const fullPath = path.join(tokensDir, file);
  const content = await readOptional(fullPath);
  const tokens = content ? parseTokens(content, layer) : [];
  tokensByLayer.set(layer, { label, file, tokens });
  for (const token of tokens) tokenMap.set(token.name, token.value);
}

const totalTokens = [...tokensByLayer.values()].reduce((sum, entry) => sum + entry.tokens.length, 0);
const generatedAt = new Date().toISOString();
const navItems = [
  ["Overview", "overview"],
  ["Tokens", "tokens"],
  ...docs.map((doc) => [doc.label, `doc-${slugify(doc.file)}`]),
];

const docSections = docs
  .map((doc) => {
    const id = `doc-${slugify(doc.file)}`;
    return `<section class="panel" id="${escapeAttr(id)}">
      <span class="source">${escapeHtml(doc.file)}</span>
      ${markdownToHtml(doc.content, id)}
    </section>`;
  })
  .join("\n");

const tokenSections = tokenFiles
  .map((_entry) => {
    const layer = _entry[2];
    const tokenEntry = tokensByLayer.get(layer);
    return tokenTableHtml(tokenEntry.label, tokenEntry.tokens, tokenMap);
  })
  .join("\n");

const missingSection = missingDocs.length
  ? `<section class="panel" id="missing-documents">
      <h2>Missing Documents</h2>
      <p class="muted">These expected design-system documents were not found in this package.</p>
      <ul>${missingDocs.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul>
    </section>`
  : "";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Design System Documentation</title>
  <style>${pageCss()}</style>
</head>
<body>
  <div class="layout">
    <aside>
      <p class="brand">Design System</p>
      <p class="subtitle">Generated documentation</p>
      <nav>
        ${navItems.map(([label, id]) => `<a href="#${escapeAttr(id)}">${escapeHtml(label)}</a>`).join("")}
        ${missingDocs.length ? '<a href="#missing-documents">Missing Documents</a>' : ""}
      </nav>
    </aside>
    <main>
      <section class="hero" id="overview">
        <h1>Design System Documentation</h1>
        <p>This static reference was generated from <code>design-system/</code> Markdown files and <code>tokens/</code> CSS custom properties.</p>
        <div class="meta">
          <span class="pill">Generated ${escapeHtml(generatedAt)}</span>
          <span class="pill">${docs.length} documents</span>
          <span class="pill">${totalTokens} tokens</span>
        </div>
      </section>

      <section class="grid" aria-label="Documentation summary">
        <div class="stat"><strong>${docs.length}</strong><span>Design-system documents</span></div>
        <div class="stat"><strong>${totalTokens}</strong><span>Total tokens</span></div>
        <div class="stat"><strong>${missingDocs.length}</strong><span>Missing expected docs</span></div>
      </section>

      <section id="tokens">
        ${tokenSections}
      </section>

      ${missingSection}
      ${docSections}
    </main>
  </div>
</body>
</html>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, "utf8");

console.log(`Generated ${path.relative(process.cwd(), outputPath) || outputPath}`);
console.log(`Documents: ${docs.length}`);
console.log(`Tokens: ${totalTokens}`);
if (missingDocs.length) {
  console.log(`Missing documents: ${missingDocs.join(", ")}`);
}
