// Browser verification for the renderer-agnostic overlay and token-less
// export: bundles the preview entry, drives test/overlay-fixture.html and
// test/tokenless-fixture.html in headless Chromium, and asserts the
// figma-export-workflow and token-less capture spec scenarios.
// Run from the addon root: node test/run-overlay-fixture.mjs
import assert from "node:assert";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const addonRoot = path.dirname(testDir);
const bundlePath = path.join(testDir, ".export-overlay.bundle.js");

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
      path.join(testDir, "overlay-fixture-entry.ts"),
      "--bundle",
      "--format=iife",
      "--global-name=FigmaOverlayFixture",
      `--outfile=${bundlePath}`,
    ],
    { stdio: "inherit" },
  );
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function startServer(syncedPayloads) {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, "http://localhost");

      if (url.pathname === "/sync-payload") {
        if (request.method !== "POST") {
          response.writeHead(405).end();
          return;
        }
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
          try {
            syncedPayloads.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            response.writeHead(201, { "content-type": "application/json" });
            response.end('{"stored":true}');
          } catch {
            response.writeHead(400).end();
          }
        });
        return;
      }

      const filePath = path.join(
        testDir,
        path.normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, ""),
      );
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

function runChrome(chromeBinary, url, width = 1200, height = 900) {
  return new Promise((resolve, reject) => {
    execFile(
      chromeBinary,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${width},${height}`,
        "--virtual-time-budget=60000",
        "--dump-dom",
        url,
      ],
      { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
      (error, stdout) => {
        if (error && !stdout) reject(error);
        else resolve(stdout);
      },
    );
  });
}

function extractResult(dom) {
  const match = dom.match(
    /<pre id="fixture-result"[^>]*>([A-Za-z0-9+/=]*)<\/pre>/,
  );
  if (!match?.[1]) return undefined;
  return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
}

async function runFixture(chromeBinary, url, label, options = {}) {
  const { attempts = 3, height = 900, width = 1200 } = options;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const dom = await runChrome(chromeBinary, url, width, height);
    const result = extractResult(dom);
    if (result) {
      if (result.error) {
        throw new Error(`${label} failed:\n${result.error}`);
      }
      const failed = result.results.filter((entry) => !entry.passed);
      assert.strictEqual(
        failed.length,
        0,
        `${label} assertions failed: ${failed.map((entry) => `${entry.name}${entry.details ? ` (${entry.details})` : ""}`).join("; ")}`,
      );
      console.log(`${label}: ${result.results.length} assertions passed`);
      return result;
    }
    if (attempt < attempts) {
      console.warn(`${label} attempt ${attempt}: no result, retrying...`);
    }
  }
  throw new Error(`${label}: fixture did not finish`);
}

async function main() {
  buildBundle();
  const chromeBinary = findChromeBinary();
  const syncedPayloads = [];
  const server = await startServer(syncedPayloads);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const overlayResult = await runFixture(
      chromeBinary,
      `${base}/overlay-fixture.html?sync=/sync-payload`,
      "overlay-fixture-wide",
    );
    assert.deepStrictEqual(
      overlayResult.disclosurePaths,
      {
        collapsed:
          "M6.646.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 1.207 3.354 4.854a.5.5 0 01-.708-.708l4-4zM3.354 9.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 12.793 3.354 9.146z",
        expanded:
          "M3.354.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 3.793 3.354.146zM6.646 9.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 10.207l-3.646 3.647a.5.5 0 01-.708-.708l4-4z",
      },
      "overlay exposes exact outward/inward disclosure geometry",
    );

    await runFixture(
      chromeBinary,
      `${base}/overlay-fixture.html`,
      "overlay-fixture-narrow",
      { height: 800, width: 640 },
    );

    assert.strictEqual(syncedPayloads.length, 1, "bridge received exactly one POST");
    assert.strictEqual(
      syncedPayloads[0]?.storyId,
      overlayResult.payloadStoryId,
      "synced payload carries the story id",
    );
    assert.strictEqual(
      syncedPayloads[0]?.storyId,
      "demo-card--default",
      "synced storyId matches the fixture story",
    );

    await runFixture(chromeBinary, `${base}/tokenless-fixture.html`, "tokenless-fixture");
    assert.strictEqual(
      syncedPayloads.length,
      1,
      "no sync request without payloadSyncUrl",
    );

    console.log("run-overlay-fixture: all assertions passed");
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
