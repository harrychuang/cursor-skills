// Browser verification for 1:1 story restoration: renders
// test/story-fidelity-fixture.html (an inline component embedded in demo body
// copy, mirroring the 80sJP text-link Inline story) in headless Chromium and
// asserts the figma-export-capture spec scenarios "Story-root export scope"
// and the text geometry clauses of "Text style capture".
// Run from the addon root: node test/run-story-fidelity-fixture.mjs
import assert from "node:assert";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const addonRoot = path.dirname(testDir);
const bundlePath = path.join(testDir, ".story-fidelity-fixture.bundle.js");
const payloadPath = path.join(testDir, ".last-story-fidelity-payload.json");

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "No Chromium binary found. Set CHROME_PATH to a Chrome/Chromium executable.",
    );
  }
  return found;
}

function buildBundle() {
  const esbuild = path.join(addonRoot, "node_modules", ".bin", "esbuild");
  execFileSync(
    esbuild,
    [
      path.join(testDir, "export-fixture-entry.ts"),
      "--bundle",
      "--format=iife",
      "--global-name=FigmaExportFixture",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const urlPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const filePath = path.join(testDir, path.normalize(urlPath).replace(/^\/+/, ""));
      if (!filePath.startsWith(testDir) || !existsSync(filePath)) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
      });
      response.end(readFileSync(filePath));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function runChrome(chromeBinary, url) {
  return new Promise((resolve, reject) => {
    execFile(
      chromeBinary,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1200,900",
        "--virtual-time-budget=600000",
        "--dump-dom",
        url,
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 180_000 },
      (error, stdout) => {
        if (error && !stdout) reject(error);
        else resolve(stdout);
      },
    );
  });
}

function extractBase64(dom, elementId) {
  const match = dom.match(
    new RegExp(`<pre id="${elementId}"[^>]*>([A-Za-z0-9+/=]*)</pre>`),
  );
  return match?.[1] ? Buffer.from(match[1], "base64").toString("utf8") : undefined;
}

function collectTextNodes(node, out = []) {
  if (node.kind === "text") out.push(node);
  for (const child of node.children ?? []) collectTextNodes(child, out);
  return out;
}

function findComponentNode(node) {
  if (node.component) return node;
  for (const child of node.children ?? []) {
    const found = findComponentNode(child);
    if (found) return found;
  }
  return undefined;
}

function assertClose(actual, expected, tolerance, message) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}±${tolerance}, got ${actual}`,
  );
}

function assertPayload(payload) {
  const root = payload.root;

  // Story-root export scope: the paragraph survives as the export root even
  // though the story contains exactly one data-component element.
  assert.strictEqual(root.kind, "frame", "story root is the paragraph frame");
  assertClose(root.styles.width, 375, 1, "paragraph keeps its constrained width");
  assertClose(root.styles.height, 52.8, 1.5, "paragraph spans two line boxes");

  const texts = collectTextNodes(root);
  assert.ok(texts.length >= 3, `paragraph splits into runs + link (got ${texts.length} text nodes)`);

  const fullText = texts.map((node) => node.text).join("");
  assert.ok(
    fullText.includes("詳細は") &&
      fullText.includes("こちら") &&
      fullText.includes("をご確認ください"),
    "surrounding demo copy is captured",
  );

  // The nested component keeps its reference for importer-side extraction.
  const componentNode = findComponentNode(root);
  assert.ok(componentNode, "nested component reference survives");
  assert.notStrictEqual(componentNode, root, "component reference is not the root");
  assert.strictEqual(componentNode.component.sourceName, "text-link", "component source name");
  assert.strictEqual(componentNode.component.variant, "inline", "component variant");
  assert.strictEqual(payload.artifactKind, "component", "story title still maps to component kind");

  // Text style capture: exact width, single-line auto resize, and inline
  // line-box compensation on the link node.
  const link = texts.find((node) => node.text === "こちら");
  assert.ok(link, "link text node exported");
  assertClose(link.styles.width, 48, 1, "link width is exact (3 glyphs x 16px, no safety margin)");
  assertClose(link.styles.height, 26.4, 0.15, "link height is the line box");
  assertClose(link.styles.lineHeight, 26.4, 0.15, "link line-height captured in pixels");
  assert.strictEqual(
    link.styles.textAutoResize,
    "WIDTH_AND_HEIGHT",
    "single-line link hugs its content",
  );
  assert.strictEqual(link.styles.fontWeight, 700, "link font weight");
  assertClose(link.styles.fontSize, 16, 0.01, "link font size");
  // Half-leading shift: content box sat (26.4 - 16) / 2 below the line-box
  // top, so the compensated y lands on the first line box (paragraph top).
  assert.ok(
    link.styles.y >= -1 && link.styles.y <= 0.75,
    `link y lands on the first line box top: got ${link.styles.y}`,
  );

  const leadRun = texts.find((node) => node.text === "詳細は");
  assert.ok(leadRun, "leading bare run exported");
  assertClose(leadRun.styles.height, 26.4, 0.15, "leading run height is the line box");
  assert.strictEqual(
    leadRun.styles.textAutoResize,
    "WIDTH_AND_HEIGHT",
    "single-line bare run hugs its content",
  );
  assert.ok(
    leadRun.styles.y >= -1 && leadRun.styles.y <= 0.75,
    `leading run y lands on the first line box top: got ${leadRun.styles.y}`,
  );
  assert.ok(
    leadRun.styles.fontFamily.includes("Hiragino Mincho"),
    "body copy keeps the mincho stack",
  );

  // The trailing run starts mid-line after the link and wraps onto a second
  // line; it must split into one single-line node per rendered line so the
  // mid-line start position survives (a single rectangle cannot express it).
  const tailFirst = texts.find((node) => node.text?.startsWith("をご確認"));
  assert.ok(tailFirst, "first line of the wrapped run exported");
  assertClose(tailFirst.styles.x, 96, 2, "wrapped run first line starts after the link");
  assert.ok(
    tailFirst.styles.y >= -1 && tailFirst.styles.y <= 0.75,
    `wrapped run first line sits on line box 1: got ${tailFirst.styles.y}`,
  );
  assertClose(tailFirst.styles.height, 26.4, 0.15, "wrapped run first line is one line box");
  assert.strictEqual(
    tailFirst.styles.textAutoResize,
    "WIDTH_AND_HEIGHT",
    "split line runs hug their content",
  );

  const paragraphTail = "をご確認ください。本文は明朝、リンクはゴシックのまま強調します。";
  const tailSecond = texts.find(
    (node) => node !== tailFirst && node.text && paragraphTail.endsWith(node.text),
  );
  assert.ok(tailSecond, "second line of the wrapped run exported");
  assertClose(tailSecond.styles.x, 0, 2, "wrapped run second line returns to the left edge");
  assertClose(tailSecond.styles.y, 26.2, 1.2, "wrapped run second line sits on line box 2");

  const characterMultiset = (value) => [...value].sort().join("");
  assert.strictEqual(
    characterMultiset(texts.map((node) => node.text).join("")),
    characterMultiset(`詳細はこちら${paragraphTail}`),
    "run texts cover the paragraph exactly, no loss or duplication",
  );

  // Alignment sanity: the link starts right after the leading run.
  assertClose(
    link.styles.x,
    leadRun.styles.x + leadRun.styles.width,
    1,
    "link x continues the inline flow",
  );
}

async function main() {
  buildBundle();
  const chromeBinary = findChromeBinary();
  const server = await startServer();
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/story-fidelity-fixture.html`;

  try {
    let payload;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const dom = await runChrome(chromeBinary, url);
      const errorText = extractBase64(dom, "payload-error");
      if (errorText) throw new Error(`fixture export failed:\n${errorText}`);
      const payloadText = extractBase64(dom, "payload-output");
      if (payloadText) {
        payload = JSON.parse(payloadText);
        break;
      }
      console.log(`attempt ${attempt}: export did not finish, retrying...`);
    }
    if (!payload) throw new Error("fixture export never produced a payload");

    writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
    assertPayload(payload);
    console.log(
      `run-story-fidelity-fixture: all assertions passed (payload: ${payloadPath})`,
    );
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
