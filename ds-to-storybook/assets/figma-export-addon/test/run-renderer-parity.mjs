#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storybookCli = path.join(
  addonRoot,
  "node_modules",
  "storybook",
  "dist",
  "bin",
  "dispatcher.js",
);
const probeVueGap = process.argv.includes("--probe-vue-gap");
const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find((candidate) => fs.existsSync(candidate));

if (!chrome) throw new Error("No Chrome/Chromium binary found.");

async function main() {
  const browser = await startBrowser(chrome);
  const cdp = await connectBrowser(browser);
  const sharedDataRoot = fs.mkdtempSync(path.join(
    process.env.TMPDIR || "/tmp",
    "sbfx-parity-data-",
  ));

  try {
    const results = {};
    for (const renderer of ["react", "vue"]) {
      results[renderer] = await runRendererContract(
        renderer,
        cdp,
        sharedDataRoot,
      );
    }

    assertContractPassed("react", results.react);
    if (probeVueGap) {
      const failedVueCases = results.vue.filter((entry) => !entry.passed);
      assert.ok(
        failedVueCases.length > 0,
        "Vue gap probe expected at least one renderer-specific failure",
      );
      console.log(
        `Vue gap probe detected ${failedVueCases.length} pending case(s): ${failedVueCases
          .map((entry) => entry.name)
          .join(", ")}`,
      );
    } else {
      assertContractPassed("vue", results.vue);
    }
  } finally {
    cdp.socket.close();
    await stopProcess(browser);
    fs.rmSync(sharedDataRoot, { recursive: true, force: true });
  }
}

function assertContractPassed(renderer, results) {
  const failed = results.filter((entry) => !entry.passed);
  assert.equal(
    failed.length,
    0,
    `${renderer} renderer parity failures: ${failed
      .map((entry) => `${entry.name} (${entry.detail})`)
      .join("; ")}`,
  );
  console.log(`${renderer} renderer parity baseline: ${results.length} cases passed`);
}

async function runRendererContract(renderer, cdp, sharedDataRoot) {
  const fixtureRoot = path.join(addonRoot, "test", "fixtures", renderer);
  fs.rmSync(path.join(fixtureRoot, ".data"), { recursive: true, force: true });
  const port = await getAvailablePort();
  const storybook = spawn(
    process.execPath,
    [
      storybookCli,
      "dev",
      "--ci",
      "--no-open",
      "--port",
      String(port),
      "--config-dir",
      path.join(fixtureRoot, ".storybook"),
    ],
    {
      cwd: fixtureRoot,
      env: {
        ...process.env,
        SBFX_PARITY_DATA_DIR: sharedDataRoot,
        STORYBOOK_DISABLE_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let serverOutput = "";
  storybook.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  storybook.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForUrl(`http://127.0.0.1:${port}/index.json`, storybook, () => serverOutput);
    const target = await openPage(
      cdp,
      `http://127.0.0.1:${port}/iframe.html?id=parity-fixture--default&viewMode=story&globals=figmaExport:on`,
    );
    try {
      await waitForPageReady(cdp, target.sessionId);
      return await evaluateContract(cdp, target.sessionId, renderer);
    } finally {
      await cdp.send("Target.closeTarget", { targetId: target.targetId });
    }
  } finally {
    await stopProcess(storybook);
  }
}

async function evaluateContract(cdp, sessionId, renderer) {
  const evaluation = await cdp.send(
    "Runtime.evaluate",
    {
      expression: `Promise.resolve((async () => {
        const renderer = ${JSON.stringify(renderer)};
        const waitUntil = async (predicate, timeout = 15000) => {
          const startedAt = Date.now();
          while (Date.now() - startedAt < timeout) {
            if (predicate()) return true;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return false;
        };
        await waitUntil(() =>
          document.querySelector('[data-parity-story]') ||
          document.querySelector('[aria-label="Figma export review"]') ||
          document.querySelector('.sb-errordisplay'),
        );
        await new Promise((resolve) => setTimeout(resolve, 500));

        const text = document.body.textContent || '';
        const story = document.querySelector('[data-parity-story]');
        const review = document.querySelector('[aria-label="Figma export review"]');
        const exportWorkspace = document.querySelector('[aria-label="Figma export"]');
        const visualComments = document.querySelector('[aria-label="Visual comments"]');
        const reviewToggle = review?.querySelector(
          'button[aria-label*="export review panel"]',
        );
        reviewToggle?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const collapsedReview = document.querySelector(
          '[aria-label="Figma export review"]',
        );
        const collapsed = collapsedReview?.getAttribute('data-collapsed') === 'true';
        collapsedReview?.querySelector(
          'button[aria-label*="export review panel"]',
        )?.click();
        let overviewStatus = 0;
        let reportStatus = 0;
        let failureStatus = 0;
        let meetingStarted = false;
        let meetingJoined = false;
        let commentEdited = false;
        let commentDeleted = false;
        let meetingEnded = false;
        let historyAvailable = false;
        let captureSurfaceComplete = false;
        let crossRendererDataAvailable = renderer === 'react';
        try {
          const overviewResponse = await fetch('/__sbfx_fixture_comments?storyId=parity-fixture--default');
          overviewStatus = overviewResponse.status;
          if (overviewResponse.ok) {
            const overview = await overviewResponse.json();
            if (overview.reportUrl) {
              reportStatus = (await fetch(overview.reportUrl)).status;
            }
            if (renderer === 'vue') {
              const reactMeeting = overview.recentSessions?.find(
                (entry) => entry.title === 'React parity meeting',
              );
              if (reactMeeting) {
                const reactReport = await fetch(
                  '/__sbfx_fixture_comments/reports/sessions/' +
                    encodeURIComponent(reactMeeting.id) +
                    '/index.html',
                );
                crossRendererDataAvailable =
                  reactReport.ok &&
                  (await reactReport.text()).includes('Shared react evidence');
              }
            }
          }
          failureStatus = (
            await fetch('/__sbfx_fixture_comments/not-a-valid-route')
          ).status;

          visualComments?.querySelector(
            'button[aria-label="Open comments"]',
          )?.click();
          await waitUntil(() => {
            const detail = document.querySelector(
              '[aria-label="Visual comments"] [data-comments-capability]',
            );
            return detail && !detail.hidden &&
              detail.getAttribute('data-comments-capability') === 'available';
          });

          const meetingTitle = document.querySelector(
            '[aria-label="Meeting title"]',
          );
          if (meetingTitle) {
            meetingTitle.value =
              renderer[0].toUpperCase() + renderer.slice(1) + ' parity meeting';
            meetingTitle.dispatchEvent(new Event('input', { bubbles: true }));
          }
          await waitUntil(() => {
            const button = [...document.querySelectorAll('button')].find(
              (entry) => entry.textContent?.trim() === 'Start meeting',
            );
            return button && !button.disabled;
          });
          [...document.querySelectorAll('button')].find(
            (entry) => entry.textContent?.trim() === 'Start meeting',
          )?.click();
          meetingStarted = await waitUntil(
            () =>
              document.querySelector('[aria-label="Visual comments"]')
                ?.textContent?.includes(
                  renderer[0].toUpperCase() +
                    renderer.slice(1) +
                    ' parity meeting',
                ),
          );

          const joinedA = await (
            await fetch('/__sbfx_fixture_comments?storyId=parity-fixture--default')
          ).json();
          const joinedB = await (
            await fetch('/__sbfx_fixture_comments?storyId=parity-fixture--default')
          ).json();
          const meetingId = joinedA.activeSession?.id;
          meetingJoined = Boolean(meetingId && meetingId === joinedB.activeSession?.id);

          if (meetingId) {
            const addCommentButton = [...document.querySelectorAll('button')].find(
              (entry) => entry.textContent?.trim() === 'Add comment',
            );
            addCommentButton?.click();
            const captureArmed = await waitUntil(
              () => document.documentElement.dataset.sbfxCaptureMode === 'true',
            );
            const action = document.querySelector('[data-parity-action]');
            const stateBeforeCapture = document.querySelector(
              '[data-parity-state]',
            )?.textContent;
            if (captureArmed && action) {
              const rect = action.getBoundingClientRect();
              const eventInit = {
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width * 0.4,
                clientY: rect.top + rect.height * 0.6,
                pointerId: 1,
              };
              action.dispatchEvent(new PointerEvent('pointerdown', eventInit));
              action.dispatchEvent(new PointerEvent('pointerup', eventInit));
              action.dispatchEvent(new MouseEvent('click', eventInit));
            }
            const composerReady = await waitUntil(
              () => Boolean(document.querySelector('[data-pending-comment-preview="true"]')),
            );
            const pendingPin = document.querySelector(
              '[data-pending-comment-pin="true"]',
            );
            const leftRatio = Number.parseFloat(pendingPin?.style.left ?? '') / 100;
            const topRatio = Number.parseFloat(pendingPin?.style.top ?? '') / 100;
            captureSurfaceComplete =
              composerReady &&
              stateBeforeCapture === 'State B' &&
              document.querySelector('[data-parity-state]')?.textContent === 'State B' &&
              Number.isFinite(leftRatio) &&
              leftRatio >= 0 &&
              leftRatio <= 1 &&
              Number.isFinite(topRatio) &&
              topRatio >= 0 &&
              topRatio <= 1 &&
              !document.querySelector('#storybook-root')?.contains(
                document.querySelector('[data-pending-comment-preview="true"]'),
              ) &&
              Boolean(
                document
                  .querySelector('[aria-label="Visual comments"]')
                  ?.hasAttribute('data-sbfx-capture-ignore'),
              );
            [...document.querySelectorAll('button')].find(
              (entry) => entry.textContent?.trim() === 'Close',
            )?.click();
            await waitUntil(
              () => !document.querySelector('[data-pending-comment-preview="true"]'),
            );

            const createResponse = await fetch(
              '/__sbfx_fixture_comments/sessions/' +
                encodeURIComponent(meetingId) +
                '/comments',
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  clientRequestId: 'parity-comment-' + Date.now(),
                  authorName: 'Mina',
                  body: 'Parity comment',
                  story: {
                    id: 'parity-fixture--default',
                    title: 'Parity/Fixture',
                    name: 'Default',
                  },
                  pin: { xRatio: 0.25, yRatio: 0.75 },
                  viewport: {
                    width: 800,
                    height: 600,
                    devicePixelRatio: 1,
                    scrollX: 0,
                    scrollY: 0,
                  },
                  capture: {
                    dataUrl:
                      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                    mimeType: 'image/png',
                    width: 1,
                    height: 1,
                    cssWidth: 800,
                    cssHeight: 600,
                  },
                }),
              },
            );
            const created = await createResponse.json();
            const commentId = created.comment?.id;
            await waitUntil(
              () => document.querySelector('[data-comment-id="' + commentId + '"]'),
              7000,
            );

            const article = document.querySelector(
              '[data-comment-id="' + commentId + '"]',
            );
            article?.querySelector('button[aria-label="Edit comment"]')?.click();
            await waitUntil(() => document.querySelector('[data-comment-edit-modal="true"]'));
            const editTextarea = document.querySelector(
              '[data-comment-edit-modal="true"] textarea',
            );
            if (editTextarea) {
              editTextarea.value = 'Updated parity comment';
              editTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            await waitUntil(() => {
              const button = document.querySelector('[data-comment-edit-save="true"]');
              return button && !button.disabled;
            });
            document.querySelector('[data-comment-edit-save="true"]')?.click();
            commentEdited = await waitUntil(
              () =>
                document.querySelector('[data-comment-id="' + commentId + '"]')
                  ?.textContent?.includes('Updated parity comment'),
            );

            document
              .querySelector('[data-comment-id="' + commentId + '"]')
              ?.querySelector('button[aria-label="Delete comment"]')
              ?.click();
            await waitUntil(() =>
              document.querySelector('[data-comment-delete-confirm="true"]'),
            );
            document.querySelector('[data-comment-delete-confirm="true"]')?.click();
            commentDeleted = await waitUntil(
              () => !document.querySelector('[data-comment-id="' + commentId + '"]'),
            );

            await fetch(
              '/__sbfx_fixture_comments/sessions/' +
                encodeURIComponent(meetingId) +
                '/comments',
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  clientRequestId: 'shared-' + renderer + '-' + Date.now(),
                  authorName: 'Shared reviewer',
                  body: 'Shared ' + renderer + ' evidence',
                  story: {
                    id: 'parity-fixture--default',
                    title: 'Parity/Fixture',
                    name: 'Default',
                  },
                  pin: { xRatio: 0.4, yRatio: 0.6 },
                  viewport: {
                    width: 800,
                    height: 600,
                    devicePixelRatio: 1,
                    scrollX: 0,
                    scrollY: 0,
                  },
                  capture: {
                    dataUrl:
                      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                    mimeType: 'image/png',
                    width: 1,
                    height: 1,
                    cssWidth: 800,
                    cssHeight: 600,
                  },
                }),
              },
            );
            [...document.querySelectorAll('button')].find(
              (entry) => entry.textContent?.trim() === 'End meeting',
            )?.click();
            meetingEnded = await waitUntil(
              () => Boolean(document.querySelector('[aria-label="Meeting title"]')),
            );
            historyAvailable = Boolean(
              document.querySelector(
                '[aria-label="Recent meetings"] [data-meeting-id="' +
                  meetingId +
                  '"] a[href*="/reports/sessions/"]',
              ),
            );
          }
        } catch {}

        return [
          {
            name: 'story-render-result',
            passed: Boolean(story),
            detail: story ? 'rendered' : text.slice(0, 180),
          },
          {
            name: 'export-workspace',
            passed: Boolean(exportWorkspace),
            detail: exportWorkspace ? 'available' : 'missing',
          },
          {
            name: 'review-workspace',
            passed: Boolean(review),
            detail: review ? 'available' : 'missing',
          },
          {
            name: 'review-workspace-outside-story',
            passed:
              Boolean(review) &&
              !document.querySelector('#storybook-root')?.contains(review) &&
              !document.querySelector('#storybook-root')?.contains(visualComments) &&
              Boolean(document.body.querySelector('[data-sbfx-review-host="true"]')),
            detail: 'body-mounted DOM host',
          },
          {
            name: 'review-workspace-collapse',
            passed: collapsed,
            detail: collapsed ? 'interaction passed' : 'collapse did not persist',
          },
          {
            name: 'visual-comments',
            passed: Boolean(visualComments),
            detail: visualComments?.textContent?.slice(0, 180) || 'comments missing',
          },
          {
            name: 'persistence-api',
            passed: overviewStatus === 200,
            detail: 'HTTP ' + overviewStatus,
          },
          {
            name: 'report-surface',
            passed: reportStatus === 200,
            detail: 'HTTP ' + reportStatus,
          },
          {
            name: 'source-action',
            passed: Boolean(review?.querySelector('a[href*="figma.com/design/"]')),
            detail: review?.querySelector('a')?.getAttribute('href') || 'link missing',
          },
          {
            name: 'failure-state-contract',
            passed: failureStatus === 404,
            detail: 'HTTP ' + failureStatus,
          },
          {
            name: 'meeting-start-and-join',
            passed: meetingStarted && meetingJoined,
            detail: meetingStarted + '/' + meetingJoined,
          },
          {
            name: 'cross-renderer-persisted-data',
            passed: crossRendererDataAvailable,
            detail: crossRendererDataAvailable
              ? 'shared meeting, comment evidence, and report passed'
              : 'Vue could not read React-created review data',
          },
          {
            name: 'pre-action-capture-and-pin',
            passed: captureSurfaceComplete,
            detail: captureSurfaceComplete
              ? 'pre-action state, composer, portal, and normalized pin passed'
              : 'capture surface contract failed',
          },
          {
            name: 'comment-edit-and-delete',
            passed: commentEdited && commentDeleted,
            detail: commentEdited + '/' + commentDeleted,
          },
          {
            name: 'meeting-end-and-history',
            passed: meetingEnded && historyAvailable,
            detail: meetingEnded + '/' + historyAvailable,
          },
        ];
      })())`,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
  );
  if (evaluation.exceptionDetails) {
    throw new Error(evaluation.exceptionDetails.text ?? "Renderer contract evaluation failed");
  }
  return evaluation.result.value;
}

async function startBrowser(binary) {
  const profileDir = fs.mkdtempSync(path.join(
    process.env.TMPDIR || "/tmp",
    "sbfx-parity-chrome-",
  ));
  const processHandle = spawn(
    binary,
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
  processHandle.profileDir = profileDir;
  return processHandle;
}

async function connectBrowser(processHandle) {
  const webSocketUrl = await new Promise((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(
      () => reject(new Error(`Chrome CDP did not start.\n${stderr}`)),
      15_000,
    );
    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    processHandle.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chrome exited before CDP was ready (${code}).\n${stderr}`));
    });
  });
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return new CdpClient(socket);
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
      this.socket.send(JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }));
    });
  }
}

async function openPage(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    flatten: true,
    targetId,
  });
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Page.navigate", { url }, sessionId);
  return { targetId, sessionId };
}

async function waitForPageReady(cdp, sessionId) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const result = await cdp.send(
      "Runtime.evaluate",
      {
        expression: "document.readyState",
        returnByValue: true,
      },
      sessionId,
    );
    if (result.result?.value === "complete") return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Storybook iframe did not finish loading");
}

async function waitForUrl(url, processHandle, getOutput) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Storybook exited before ready:\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Storybook did not become ready:\n${getOutput()}`);
}

async function getAvailablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stopProcess(processHandle) {
  if (processHandle.exitCode === null) {
    processHandle.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => processHandle.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
  if (processHandle.profileDir) {
    fs.rmSync(processHandle.profileDir, { recursive: true, force: true });
  }
}

await main();
