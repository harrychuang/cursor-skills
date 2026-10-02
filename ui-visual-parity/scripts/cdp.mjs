/**
 * Minimal Chrome DevTools Protocol driver with no npm dependencies.
 *
 * Needs Node 22+ (global WebSocket) and any Chromium-family browser. It exists so a
 * capture can run where no browser automation tool is installed; when the agent already
 * has one (Playwright, a browser MCP), that tool can evaluate the extractor instead.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FREEZE_CSS =
  "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;" +
  "transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important;" +
  "scroll-behavior:auto!important}";

function defaultCandidates() {
  const home = os.homedir();
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  // Browsers a Playwright install left behind are as good as any.
  for (const cache of [
    path.join(home, "Library", "Caches", "ms-playwright"),
    path.join(home, ".cache", "ms-playwright"),
    path.join(home, "AppData", "Local", "ms-playwright"),
  ]) {
    if (!fs.existsSync(cache)) continue;
    for (const entry of fs.readdirSync(cache).filter((name) => name.startsWith("chromium-")).sort().reverse()) {
      candidates.push(
        path.join(cache, entry, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(cache, entry, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(cache, entry, "chrome-linux", "chrome"),
        path.join(cache, entry, "chrome-win", "chrome.exe"),
      );
    }
  }
  return candidates;
}

/** The first browser executable that exists. `candidates` replaces the built-in list (used by tests). */
export function findChrome({ candidates = defaultCandidates() } = {}) {
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("No Chromium-family browser found. Set CHROME_PATH to the full path of a Chrome, Chromium, or Edge executable.");
  }
  return found;
}

class Connection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.waiters = new Map();
    ws.addEventListener("message", (event) => this.receive(JSON.parse(event.data)));
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }

  receive(message) {
    if (message.id) {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(`${entry.method}: ${message.error.message}`));
      else entry.resolve(message.result);
      return;
    }
    const key = `${message.sessionId || ""}:${message.method}`;
    const waiting = this.waiters.get(key);
    if (!waiting) return;
    this.waiters.delete(key);
    for (const resolve of waiting) resolve(message.params);
  }

  once(sessionId, method, timeoutMs = 30000) {
    const key = `${sessionId || ""}:${method}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      timer.unref(); // a wait nobody is left to hear must not keep the process alive
      const list = this.waiters.get(key) || [];
      list.push((params) => {
        clearTimeout(timer);
        resolve(params);
      });
      this.waiters.set(key, list);
    });
  }
}

export async function launchChrome({ executablePath, args = [] } = {}) {
  const executable = executablePath || findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ui-parity-chrome-"));
  const child = spawn(
    executable,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-background-networking",
      // Screenshots must be sRGB, or every colour differs from a design export by the
      // display profile.
      "--force-color-profile=srgb",
      // GPU rasterisation is not repeatable: the same page comes out with round corners and
      // thin strokes a shade different from one load to the next. Software rasterisation is.
      "--disable-gpu",
      ...args,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  const endpoint = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Browser did not expose a DevTools endpoint.")), 20000);
    child.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Browser exited early (code ${code}).\n${buffer}`));
    });
  });

  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("Cannot connect to the DevTools endpoint.")), { once: true });
  });
  const connection = new Connection(ws);

  return {
    executable,
    newPage(options) {
      return createPage(connection, options);
    },
    async close() {
      try {
        await connection.send("Browser.close");
      } catch {
        child.kill();
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

async function createPage(connection, { width = 390, height = 844, dpr = 2, mobile = false, theme = "light" } = {}) {
  const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => connection.send(method, params, sessionId);

  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");
  await send("CSS.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
  // The page's colour scheme is chosen here, not by the machine it happens to run on.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });

  const page = {
    viewport: { width, height, dpr },
    theme,

    async evaluate(expression, { awaitPromise = false } = {}) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
      if (result.exceptionDetails) {
        const detail = result.exceptionDetails;
        throw new Error(`Page evaluation failed: ${detail.exception?.description || detail.text}`);
      }
      return result.result.value;
    },

    /** Load a URL. A page that cannot be loaded is an error, never a capture of the browser's error page. */
    async goto(url) {
      const loaded = connection.once(sessionId, "Page.loadEventFired");
      loaded.catch(() => {});
      const { errorText } = await send("Page.navigate", { url });
      if (errorText) throw new Error(`Cannot load ${url}: ${errorText}`);
      await loaded;
      const status = await page.evaluate("(performance.getEntriesByType('navigation')[0] || {}).responseStatus || 0");
      if (status >= 400) throw new Error(`Cannot load ${url}: the server answered ${status}`);
      await page.settle();
    },

    /** Fonts loaded, motion frozen, two frames painted — the state every capture is taken in. */
    async settle() {
      await page.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true", { awaitPromise: true });
      await page.evaluate(
        `(() => { if (document.querySelector('style[data-ui-parity]')) return; const s = document.createElement('style');` +
          ` s.setAttribute('data-ui-parity', 'freeze'); s.textContent = ${JSON.stringify(FREEZE_CSS)};` +
          ` document.head.appendChild(s); })()`,
      );
      await page.evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))", {
        awaitPromise: true,
      });
    },

    /**
     * The first screenshot after a load can be rasterised slightly differently from every
     * later one, which would show up as a difference between two identical pages. So: one
     * throwaway capture, then capture until two in a row agree. Returns false when the
     * surface never settles — something on it is still moving.
     */
    async screenshot(file, clip) {
      const params = { format: "png", captureBeyondViewport: true };
      if (clip) params.clip = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 };
      await send("Page.captureScreenshot", params);
      let previous = (await send("Page.captureScreenshot", params)).data;
      let stable = false;
      for (let attempt = 0; attempt < 4 && !stable; attempt += 1) {
        const next = (await send("Page.captureScreenshot", params)).data;
        stable = next === previous;
        previous = next;
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(previous, "base64"));
      return stable;
    },

    async nodeId(selector) {
      const { root } = await send("DOM.getDocument", { depth: 0 });
      const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector });
      if (!nodeId) throw new Error(`No element matches ${selector}`);
      return nodeId;
    },

    /** Hold :hover / :focus-visible / :active on an element so its state can be measured like any other. */
    async forceState(selector, pseudoClasses) {
      const nodeId = await page.nodeId(selector);
      await send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: pseudoClasses });
      await page.settle();
      return nodeId;
    },

    /** The fonts the engine actually used for an element's text — the truth behind `font-family`. */
    async renderedFonts(selector) {
      const nodeId = await page.nodeId(selector);
      const { fonts } = await send("CSS.getPlatformFontsForNode", { nodeId });
      return fonts.map((font) => ({ family: font.familyName, glyphs: font.glyphCount, custom: font.isCustomFont }));
    },

    async close() {
      await connection.send("Target.closeTarget", { targetId });
    },
  };

  return page;
}

export function toUrl(target) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) return target;
  return `file://${path.resolve(target)}`;
}
