import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const addonRoot = path.dirname(testDir);
const bundlePath = path.join(testDir, ".visual-comment-fixture.bundle.js");
const bundleCssPath = path.join(testDir, ".visual-comment-fixture.bundle.css");
const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find(existsSync);
if (!chrome) throw new Error("No Chrome/Chromium binary found.");

execFileSync(
  path.join(addonRoot, "node_modules/.bin/esbuild"),
  [
    path.join(testDir, "visual-comment-fixture-entry.ts"),
    "--bundle",
    "--format=iife",
    "--loader:.css=css",
    `--outfile=${bundlePath}`,
  ],
  { stdio: "inherit" },
);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const filePath = path.join(testDir, path.normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, ""));
  if (!filePath.startsWith(testDir) || !existsSync(filePath)) {
    response.writeHead(404).end("not found");
    return;
  }
  const extension = path.extname(filePath);
  response.writeHead(200, {
    "content-type": extension === ".html"
      ? "text/html; charset=utf-8"
      : extension === ".css"
        ? "text/css; charset=utf-8"
        : "text/javascript; charset=utf-8",
  });
  response.end(readFileSync(filePath));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const fixtureUrl = `http://127.0.0.1:${server.address().port}/visual-comment-fixture.html`;
const profileDir = await mkdtemp(path.join(tmpdir(), "sbfx-comment-chrome-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

function browserWebSocketUrl() {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`Chrome CDP did not start.\n${stderr}`)), 15_000);
    browser.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    browser.once("exit", (code) => reject(new Error(`Chrome exited before CDP was ready (${code}).\n${stderr}`)));
  });
}

class CdpClient {
  id = 0;
  pending = new Map();

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

let socket;
try {
  socket = new WebSocket(await browserWebSocketUrl());
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const cdp = new CdpClient(socket);
  for (const viewport of [
    { height: 800, label: "wide", width: 1000 },
    { height: 800, label: "narrow", width: 640 },
  ]) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { flatten: true, targetId });
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      {
        deviceScaleFactor: 1,
        height: viewport.height,
        mobile: false,
        width: viewport.width,
      },
      sessionId,
    );
    await cdp.send(
      "Page.navigate",
      { url: `${fixtureUrl}?viewport=${viewport.label}` },
      sessionId,
    );

    const deadline = Date.now() + 45_000;
    let encoded = "";
    let stage = "not-loaded";
    while (Date.now() < deadline) {
      const evaluation = await cdp.send(
        "Runtime.evaluate",
        {
          expression: `(() => { const node = document.querySelector('#fixture-result'); return { text: node?.textContent || '', stage: node?.dataset.stage || 'missing' }; })()`,
          returnByValue: true,
        },
        sessionId,
      );
      encoded = evaluation.result?.value?.text ?? "";
      stage = evaluation.result?.value?.stage ?? stage;
      if (encoded) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(
      encoded,
      `visual comment fixture (${viewport.label}) did not finish (stage: ${stage})`,
    );
    const result = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (result.error) {
      throw new Error(`${result.error}\nfixture viewport: ${viewport.label}\nfixture stage: ${stage}`);
    }
    const failed = result.results.filter((entry) => !entry.passed);
    assert.equal(
      failed.length,
      0,
      failed.map((entry) => `${entry.name}: ${entry.detail ?? "failed"}`).join("; "),
    );
    console.log(
      `visual-comment-fixture (${viewport.label}): ${result.results.length} assertions passed`,
    );
    await cdp.send("Target.closeTarget", { targetId });
  }
} finally {
  socket?.close();
  const browserExited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill("SIGTERM");
  await Promise.race([
    browserExited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  await new Promise((resolve) => server.close(resolve));
  await rm(profileDir, { recursive: true, force: true });
  await unlink(bundlePath).catch(() => undefined);
  await unlink(bundleCssPath).catch(() => undefined);
}
