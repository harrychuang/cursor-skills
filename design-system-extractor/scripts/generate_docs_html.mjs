#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_LOCALES = ["zh-Hant", "en", "ja"];

const rawArgs = process.argv.slice(2);
let localeArg = null;
const positionalArgs = [];
for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--locale") {
    localeArg = rawArgs[index + 1] ?? "";
    index += 1;
  } else if (arg.startsWith("--locale=")) {
    localeArg = arg.slice("--locale=".length);
  } else {
    positionalArgs.push(arg);
  }
}

const targetRoot = path.resolve(positionalArgs[0] || process.cwd());
const outputPath = path.resolve(
  positionalArgs[1] || path.join(targetRoot, "docs", "design-system", "index.html"),
);

const designSystemDir = path.join(targetRoot, "design-system");
const componentDocsDir = path.join(designSystemDir, "components");
const tokensDir = path.join(targetRoot, "tokens");
const designSystemAssetsDir = path.join(designSystemDir, "assets");

let DEFAULT_LOCALE = "zh-Hant";
if (localeArg !== null) {
  if (SUPPORTED_LOCALES.includes(localeArg)) {
    DEFAULT_LOCALE = localeArg;
  } else {
    console.warn(
      `Unsupported --locale value "${localeArg}". Supported values: ${SUPPORTED_LOCALES.join(", ")}. Falling back to "zh-Hant".`,
    );
  }
}

const coreDocumentFiles = [
  ["docKickstart", "DESIGN_SYSTEM_KICKSTART.md"],
  ["docSessionState", "SESSION_STATE.md"],
  ["docIntegrationReview", "INTEGRATION_REVIEW.md"],
  ["docEvidenceMap", "DESIGN_EVIDENCE_MAP.md"],
  ["docDesignPrinciples", "DESIGN_PRINCIPLES.md"],
  ["docDesignElements", "DESIGN_ELEMENTS.md"],
  ["docTokenArchitecture", "TOKEN_ARCHITECTURE.md"],
  ["docComponentInventory", "COMPONENT_INVENTORY.md"],
  ["docComponentSpecTemplate", "COMPONENT_SPEC_TEMPLATE.md"],
  ["docInteractionStates", "INTERACTION_STATES.md"],
  ["docPageComposition", "PAGE_COMPOSITION_RULES.md"],
  ["docAntiAiStyleRules", "ANTI_AI_STYLE_RULES.md"],
];

const tokenFiles = [
  ["tokenRef", "tokens-ref.css", "ref"],
  ["tokenSys", "tokens-sys.css", "sys"],
  ["tokenComp", "tokens-comp.css", "comp"],
];

const uiCopy = {
  "zh-Hant": {
    htmlLang: "zh-Hant",
    pageTitle: "設計系統文件",
    brand: "設計系統",
    subtitle: "自動產生文件",
    langSelectorLabel: "語言",
    navOverview: "總覽",
    navTokens: "Tokens",
    navReviewQueue: "審查佇列",
    navMissingDocuments: "缺少文件",
    heroTitle: "設計系統文件",
    heroLead:
      "此靜態參考文件由 <code>design-system/</code> Markdown 與 <code>tokens/</code> CSS 自訂屬性自動產生。",
    pillGenerated: "產生時間",
    pillDocuments: "份文件",
    pillTokens: "個 tokens",
    summaryAriaLabel: "文件摘要",
    statDocuments: "設計系統文件",
    statTokens: "Token 總數",
    statTokenRef: "Reference tokens",
    statTokenSys: "System tokens",
    statTokenComp: "Component tokens",
    statMissing: "缺少預期文件",
    tokenRef: "Reference Tokens",
    tokenSys: "System Tokens",
    tokenComp: "Component Tokens",
    tokenColumnName: "Token",
    tokenColumnValue: "值",
    tokenColumnResolved: "解析值",
    noTokensFound: "找不到 tokens。",
    missingDocumentsTitle: "缺少文件",
    missingDocumentsLead: "此套件中找不到以下預期的設計系統文件。",
    componentPrefix: "元件：",
    docKickstart: "Kickstart",
    docSessionState: "Session 狀態",
    docIntegrationReview: "整併審查",
    docEvidenceMap: "設計證據對照",
    docDesignPrinciples: "設計原則",
    docDesignElements: "設計元素",
    docTokenArchitecture: "Token 架構",
    docComponentInventory: "元件盤點",
    docComponentSpecTemplate: "元件規格範本",
    docInteractionStates: "互動狀態",
    docPageComposition: "頁面組成",
    docAntiAiStyleRules: "Anti-AI 風格規則",
  },
  en: {
    htmlLang: "en",
    pageTitle: "Design System Documentation",
    brand: "Design System",
    subtitle: "Generated documentation",
    langSelectorLabel: "Language",
    navOverview: "Overview",
    navTokens: "Tokens",
    navReviewQueue: "Review Queue",
    navMissingDocuments: "Missing Documents",
    heroTitle: "Design System Documentation",
    heroLead:
      "This static reference was generated from <code>design-system/</code> Markdown files and <code>tokens/</code> CSS custom properties.",
    pillGenerated: "Generated",
    pillDocuments: "documents",
    pillTokens: "tokens",
    summaryAriaLabel: "Documentation summary",
    statDocuments: "Design-system documents",
    statTokens: "Total tokens",
    statTokenRef: "Reference tokens",
    statTokenSys: "System tokens",
    statTokenComp: "Component tokens",
    statMissing: "Missing expected docs",
    tokenRef: "Reference Tokens",
    tokenSys: "System Tokens",
    tokenComp: "Component Tokens",
    tokenColumnName: "Token",
    tokenColumnValue: "Value",
    tokenColumnResolved: "Resolved",
    noTokensFound: "No tokens found.",
    missingDocumentsTitle: "Missing Documents",
    missingDocumentsLead:
      "These expected design-system documents were not found in this package.",
    componentPrefix: "Component: ",
    docKickstart: "Kickstart",
    docSessionState: "Session State",
    docIntegrationReview: "Integration Review",
    docEvidenceMap: "Evidence Map",
    docDesignPrinciples: "Design Principles",
    docDesignElements: "Design Elements",
    docTokenArchitecture: "Token Architecture",
    docComponentInventory: "Component Inventory",
    docComponentSpecTemplate: "Component Spec Template",
    docInteractionStates: "Interaction States",
    docPageComposition: "Page Composition",
    docAntiAiStyleRules: "Anti-AI Style Rules",
  },
  ja: {
    htmlLang: "ja",
    pageTitle: "デザインシステムドキュメント",
    brand: "Design System",
    subtitle: "自動生成ドキュメント",
    langSelectorLabel: "言語",
    navOverview: "概要",
    navTokens: "Tokens",
    navReviewQueue: "Review Queue",
    navMissingDocuments: "不足ドキュメント",
    heroTitle: "デザインシステムドキュメント",
    heroLead:
      "この静的リファレンスは <code>design-system/</code> の Markdown と <code>tokens/</code> CSS カスタムプロパティから生成されました。",
    pillGenerated: "生成",
    pillDocuments: "件のドキュメント",
    pillTokens: "件の tokens",
    summaryAriaLabel: "ドキュメント概要",
    statDocuments: "デザインシステムドキュメント",
    statTokens: "Token 総数",
    statTokenRef: "Reference tokens",
    statTokenSys: "System tokens",
    statTokenComp: "Component tokens",
    statMissing: "不足している想定ドキュメント",
    tokenRef: "Reference Tokens",
    tokenSys: "System Tokens",
    tokenComp: "Component Tokens",
    tokenColumnName: "Token",
    tokenColumnValue: "値",
    tokenColumnResolved: "解決値",
    noTokensFound: "tokens が見つかりません。",
    missingDocumentsTitle: "不足ドキュメント",
    missingDocumentsLead:
      "このパッケージで次の想定デザインシステムドキュメントが見つかりませんでした。",
    componentPrefix: "コンポーネント：",
    docKickstart: "Kickstart",
    docSessionState: "Session 状態",
    docIntegrationReview: "Integration Review",
    docEvidenceMap: "Evidence Map",
    docDesignPrinciples: "デザイン原則",
    docDesignElements: "デザイン要素",
    docTokenArchitecture: "Token アーキテクチャ",
    docComponentInventory: "コンポーネント一覧",
    docComponentSpecTemplate: "コンポーネント仕様テンプレート",
    docInteractionStates: "インタラクション状態",
    docPageComposition: "ページ構成",
    docAntiAiStyleRules: "Anti-AI スタイルルール",
  },
};

function t(locale, key) {
  const messages = uiCopy[locale] || uiCopy[DEFAULT_LOCALE];
  return messages[key] ?? uiCopy[DEFAULT_LOCALE][key] ?? key;
}

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
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, href) => {
    const safeHref = String(href).trim().startsWith("javascript:") ? "#" : href;
    return `<img class="doc-image" src="${escapeAttr(safeHref)}" alt="${escapeAttr(alt)}" loading="lazy">`;
  });
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

function tokenTableHtml(i18nKey, layerId, tokens, tokenMap) {
  const sectionId = layerId;
  if (!tokens.length) {
    return `<section class="panel" id="${escapeAttr(sectionId)}">
      <h2 data-i18n="${escapeAttr(i18nKey)}">${escapeHtml(t(DEFAULT_LOCALE, i18nKey))}</h2>
      <p class="muted" data-i18n="noTokensFound">${escapeHtml(t(DEFAULT_LOCALE, "noTokensFound"))}</p>
    </section>`;
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

  return `<section class="panel" id="${escapeAttr(sectionId)}">
    <h2 data-i18n="${escapeAttr(i18nKey)}">${escapeHtml(t(DEFAULT_LOCALE, i18nKey))}</h2>
    <div class="table-wrap"><table>
      <thead><tr>
        <th data-i18n="tokenColumnName">${escapeHtml(t(DEFAULT_LOCALE, "tokenColumnName"))}</th>
        <th data-i18n="tokenColumnValue">${escapeHtml(t(DEFAULT_LOCALE, "tokenColumnValue"))}</th>
        <th data-i18n="tokenColumnResolved">${escapeHtml(t(DEFAULT_LOCALE, "tokenColumnResolved"))}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function pageCss() {
  return `
    :root {
      color-scheme: light;
      --doc-bg: #ffffff;
      --doc-surface: #ffffff;
      --doc-surface-subtle: #f5f6f3;
      --doc-text: #141414;
      --doc-muted: #60645f;
      --doc-border: #d7dbd3;
      --doc-border-strong: #aeb5aa;
      --doc-accent: #2f5d3a;
      --doc-code-bg: #f0f2ee;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--doc-bg);
      color: var(--doc-text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Noto Sans JP", sans-serif;
      line-height: 1.55;
    }
    a { color: var(--doc-accent); }
    .layout {
      display: grid;
      grid-template-columns: 288px minmax(0, 1fr);
      min-height: 100vh;
    }
    aside {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 28px 22px;
      border-right: 1px solid var(--doc-border);
      background: var(--doc-surface);
    }
    main {
      width: min(1160px, 100%);
      padding: 34px 32px 72px;
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
    .language-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 20px;
    }
    .language-nav button {
      appearance: none;
      border: 1px solid var(--doc-border);
      border-radius: 6px;
      background: var(--doc-surface);
      padding: 6px 12px;
      color: var(--doc-muted);
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
    }
    .language-nav button:hover,
    .language-nav button:focus-visible {
      color: var(--doc-text);
      border-color: var(--doc-border-strong);
    }
    .language-nav button[aria-selected="true"] {
      background: var(--doc-surface-subtle);
      border-color: var(--doc-border-strong);
      color: var(--doc-text);
    }
    .hero {
      padding: 0 0 24px;
      border-bottom: 1px solid var(--doc-border);
      margin-bottom: 18px;
    }
    .hero h1 {
      max-width: 760px;
      font-size: 34px;
      line-height: 1.12;
      margin: 0 0 12px;
      letter-spacing: 0;
    }
    .hero p {
      max-width: 820px;
      margin: 0;
      color: var(--doc-muted);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .pill {
      border: 1px solid var(--doc-border);
      background: var(--doc-surface);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      color: var(--doc-muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0;
      border-bottom: 1px solid var(--doc-border);
      margin-bottom: 8px;
    }
    .stat {
      padding: 14px 18px 16px;
      border-right: 1px solid var(--doc-border);
    }
    .stat:first-child { padding-left: 0; }
    .stat:last-child { border-right: 0; }
    .stat strong {
      display: block;
      font-size: 24px;
      line-height: 1;
      margin-bottom: 6px;
    }
    .stat span {
      color: var(--doc-muted);
      font-size: 13px;
    }
    .panel {
      padding: 24px 0;
      background: transparent;
      border-top: 1px solid var(--doc-border);
      margin: 0;
      overflow: hidden;
    }
    .panel h1, .panel h2, .panel h3, .panel h4 {
      letter-spacing: 0;
      line-height: 1.15;
      margin-top: 0;
    }
    .panel h1 { font-size: 30px; }
    .panel h2 { font-size: 23px; margin-top: 26px; }
    .panel h3 { font-size: 18px; margin-top: 22px; }
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
      border-radius: 6px;
      margin: 16px 0;
    }
    .doc-image {
      display: block;
      max-width: min(220px, 100%);
      max-height: 160px;
      margin: 4px 0;
      border: 1px solid var(--doc-border);
      border-radius: 6px;
      background: var(--doc-surface);
      object-fit: contain;
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
      background: var(--doc-surface-subtle);
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
      .stat,
      .stat + .stat,
      .stat:last-child {
        border-right: 0;
        border-top: 1px solid var(--doc-border);
        padding: 14px 0;
      }
      .hero { padding-bottom: 20px; }
      .panel { padding: 22px 0; }
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
    docs.push({ i18nKey: label, label: t(DEFAULT_LOCALE, label), file, content });
  }
}

for (const [label, file] of [...extraDocumentFiles, ...componentDocumentFiles]) {
  const fullPath = path.join(designSystemDir, file);
  const content = await readOptional(fullPath);
  if (content !== null) {
    const isComponent = file.startsWith("components/");
    const componentName = isComponent
      ? label.replace(/^Component:\s*/i, "")
      : null;
    docs.push({
      i18nKey: null,
      label,
      file,
      content,
      isComponent,
      componentName,
    });
  }
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
const tokenCounts = Object.fromEntries(
  tokenFiles.map(([_i18nKey, _file, layer]) => [
    layer,
    tokensByLayer.get(layer)?.tokens.length || 0,
  ]),
);
const generatedAt = new Date().toISOString();

function navLink(doc) {
  const id = `doc-${slugify(doc.file)}`;
  if (doc.i18nKey) {
    return `<a href="#${escapeAttr(id)}" data-i18n="${escapeAttr(doc.i18nKey)}">${escapeHtml(t(DEFAULT_LOCALE, doc.i18nKey))}</a>`;
  }
  if (doc.isComponent && doc.componentName) {
    return `<a href="#${escapeAttr(id)}" data-i18n-template="component" data-i18n-name="${escapeAttr(doc.componentName)}">${escapeHtml(t(DEFAULT_LOCALE, "componentPrefix") + doc.componentName)}</a>`;
  }
  return `<a href="#${escapeAttr(id)}">${escapeHtml(doc.label)}</a>`;
}

const navItems = [
  `<a href="#overview" data-i18n="navOverview">${escapeHtml(t(DEFAULT_LOCALE, "navOverview"))}</a>`,
  `<a href="#tokens" data-i18n="navTokens">${escapeHtml(t(DEFAULT_LOCALE, "navTokens"))}</a>`,
  `<a href="review.html" data-i18n="navReviewQueue">${escapeHtml(t(DEFAULT_LOCALE, "navReviewQueue"))}</a>`,
  ...docs.map((doc) => navLink(doc)),
  ...(missingDocs.length
    ? [`<a href="#missing-documents" data-i18n="navMissingDocuments">${escapeHtml(t(DEFAULT_LOCALE, "navMissingDocuments"))}</a>`]
    : []),
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
  .map((entry) => {
    const i18nKey = entry[0];
    const layer = entry[2];
    const tokenEntry = tokensByLayer.get(layer);
    return tokenTableHtml(i18nKey, layer, tokenEntry.tokens, tokenMap);
  })
  .join("\n");

const missingSection = missingDocs.length
  ? `<section class="panel" id="missing-documents">
      <h2 data-i18n="missingDocumentsTitle">${escapeHtml(t(DEFAULT_LOCALE, "missingDocumentsTitle"))}</h2>
      <p class="muted" data-i18n="missingDocumentsLead">${escapeHtml(t(DEFAULT_LOCALE, "missingDocumentsLead"))}</p>
      <ul>${missingDocs.map((file) => `<li><code>${escapeHtml(file)}</code></li>`).join("")}</ul>
    </section>`
  : "";

function i18nScript() {
  return `<script>
(() => {
  const STORAGE_KEY = "design-system-docs-lang";
  const DEFAULT_LOCALE = ${JSON.stringify(DEFAULT_LOCALE)};
  const copy = ${JSON.stringify(uiCopy)};

  const buttons = Array.from(document.querySelectorAll("[data-language-button]"));

  function setLanguage(language) {
    const messages = copy[language] || copy[DEFAULT_LOCALE];
    document.documentElement.lang = messages.htmlLang;
    document.title = messages.pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const value = messages[node.dataset.i18n];
      if (typeof value !== "string") return;
      if (node.dataset.i18nHtml === "true") {
        node.innerHTML = value;
      } else {
        node.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-template]").forEach((node) => {
      if (node.dataset.i18nTemplate === "component" && node.dataset.i18nName) {
        node.textContent = (messages.componentPrefix || "") + node.dataset.i18nName;
      }
    });

    buttons.forEach((button) => {
      const selected = button.dataset.languageButton === language;
      button.setAttribute("aria-selected", String(selected));
    });

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (_error) {
      /* ignore storage failures */
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.languageButton);
    });
  });

  let initial = DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && copy[stored]) initial = stored;
  } catch (_error) {
    /* ignore storage failures */
  }
  setLanguage(initial);
})();
</script>`;
}

const html = `<!doctype html>
<html lang="${escapeAttr(t(DEFAULT_LOCALE, "htmlLang"))}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(t(DEFAULT_LOCALE, "pageTitle"))}</title>
  <style>${pageCss()}</style>
</head>
<body>
  <div class="layout">
    <aside>
      <p class="brand" data-i18n="brand">${escapeHtml(t(DEFAULT_LOCALE, "brand"))}</p>
      <p class="subtitle" data-i18n="subtitle">${escapeHtml(t(DEFAULT_LOCALE, "subtitle"))}</p>
      <div class="language-nav" role="tablist" aria-label="${escapeAttr(t(DEFAULT_LOCALE, "langSelectorLabel"))}">
        <button type="button" role="tab" data-language-button="zh-Hant" aria-selected="true">繁中</button>
        <button type="button" role="tab" data-language-button="en" aria-selected="false">EN</button>
        <button type="button" role="tab" data-language-button="ja" aria-selected="false">日本語</button>
      </div>
      <nav>
        ${navItems.join("")}
      </nav>
    </aside>
    <main>
      <section class="hero" id="overview">
        <h1 data-i18n="heroTitle">${escapeHtml(t(DEFAULT_LOCALE, "heroTitle"))}</h1>
        <p data-i18n="heroLead" data-i18n-html="true">${t(DEFAULT_LOCALE, "heroLead")}</p>
        <div class="meta">
          <span class="pill"><span data-i18n="pillGenerated">${escapeHtml(t(DEFAULT_LOCALE, "pillGenerated"))}</span> ${escapeHtml(generatedAt)}</span>
          <span class="pill">${docs.length} <span data-i18n="pillDocuments">${escapeHtml(t(DEFAULT_LOCALE, "pillDocuments"))}</span></span>
          <span class="pill">${totalTokens} <span data-i18n="pillTokens">${escapeHtml(t(DEFAULT_LOCALE, "pillTokens"))}</span></span>
        </div>
      </section>

      <section class="grid" aria-label="${escapeAttr(t(DEFAULT_LOCALE, "summaryAriaLabel"))}">
        <div class="stat"><strong>${docs.length}</strong><span data-i18n="statDocuments">${escapeHtml(t(DEFAULT_LOCALE, "statDocuments"))}</span></div>
        <div class="stat"><strong>${totalTokens}</strong><span data-i18n="statTokens">${escapeHtml(t(DEFAULT_LOCALE, "statTokens"))}</span></div>
        <div class="stat"><strong>${tokenCounts.ref}</strong><span data-i18n="statTokenRef">${escapeHtml(t(DEFAULT_LOCALE, "statTokenRef"))}</span></div>
        <div class="stat"><strong>${tokenCounts.sys}</strong><span data-i18n="statTokenSys">${escapeHtml(t(DEFAULT_LOCALE, "statTokenSys"))}</span></div>
        <div class="stat"><strong>${tokenCounts.comp}</strong><span data-i18n="statTokenComp">${escapeHtml(t(DEFAULT_LOCALE, "statTokenComp"))}</span></div>
        <div class="stat"><strong>${missingDocs.length}</strong><span data-i18n="statMissing">${escapeHtml(t(DEFAULT_LOCALE, "statMissing"))}</span></div>
      </section>

      <section id="tokens">
        ${tokenSections}
      </section>

      ${missingSection}
      ${docSections}
    </main>
  </div>
  ${i18nScript()}
</body>
</html>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, "utf8");

let copiedAssets = false;
try {
  const assetEntries = await fs.readdir(designSystemAssetsDir);
  if (assetEntries.length) {
    await fs.cp(designSystemAssetsDir, path.join(path.dirname(outputPath), "assets"), {
      recursive: true,
    });
    copiedAssets = true;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

console.log(`Generated ${path.relative(process.cwd(), outputPath) || outputPath}`);
console.log(`Documents: ${docs.length}`);
console.log(`Tokens: ${totalTokens}`);
console.log(`Reference tokens: ${tokenCounts.ref}`);
console.log(`System tokens: ${tokenCounts.sys}`);
console.log(`Component tokens: ${tokenCounts.comp}`);
console.log(`Assets copied: ${copiedAssets ? "yes" : "no"}`);
if (missingDocs.length) {
  console.log(`Missing documents: ${missingDocs.join(", ")}`);
}
