import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, dirname, join, resolve } from "node:path";
import type { FigmaReviewEntry, FigmaReviewStatus } from "./review";
import {
  VISUAL_COMMENT_LIMITS,
  defaultVisualCommentsApiPath,
  defaultVisualCommentsDir,
} from "./visualComment";
import {
  VisualCommentStoreError,
  createVisualCommentStore,
} from "./visualCommentStore";

export const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";
export const defaultFigmaExportPayloadApiPath = "/__figma-export/payloads";
export const defaultFigmaExportPayloadDir = "design-system/figma-export-payloads";

export type FigmaReviewStatusFile = {
  stories: Record<string, FigmaReviewEntry>;
  version: 1;
};

export type FigmaReviewStatusPluginOptions = {
  apiPath?: string;
  cwd?: string;
  filePath?: string;
  name?: string;
  payloadApiPath?: string;
  payloadDir?: string;
  commentsEnabled?: boolean;
  commentsApiPath?: string;
  commentsDir?: string;
};

type MiddlewareHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  next?: (error?: unknown) => void,
) => void;

type MiddlewareServer = {
  middlewares: {
    use(path: string, handler: MiddlewareHandler): void;
  };
};

const reviewStatusValues = new Set<FigmaReviewStatus>([
  "not-started",
  "exported",
  "imported",
  "needs-fix",
  "approved",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isFigmaReviewStatus(value: unknown): value is FigmaReviewStatus {
  return typeof value === "string" && reviewStatusValues.has(value as FigmaReviewStatus);
}

function normalizeReviewEntry(value: unknown): FigmaReviewEntry {
  const source = isRecord(value) ? value : {};
  const reviewStatus = source.figmaReviewStatus;
  const notes = typeof source.notes === "string" ? source.notes : undefined;

  return {
    componentTitle:
      typeof source.componentTitle === "string" ? source.componentTitle : undefined,
    figmaNodeUrl:
      typeof source.figmaNodeUrl === "string" ? source.figmaNodeUrl : undefined,
    figmaReviewStatus: isFigmaReviewStatus(reviewStatus) ? reviewStatus : "not-started",
    name: typeof source.name === "string" ? source.name : undefined,
    notes,
    notesOpen:
      typeof source.notesOpen === "boolean" ? source.notesOpen : Boolean(notes),
    storyTitle: typeof source.storyTitle === "string" ? source.storyTitle : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

async function readReviewStatusFile(
  reviewStatusFilePath: string,
): Promise<FigmaReviewStatusFile> {
  try {
    const raw = await readFile(reviewStatusFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.stories)) {
      return { stories: {}, version: 1 };
    }

    const stories: Record<string, FigmaReviewEntry> = {};
    for (const [storyId, entry] of Object.entries(parsed.stories)) {
      stories[storyId] = normalizeReviewEntry(entry);
    }

    return { stories, version: 1 };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { stories: {}, version: 1 };
    }
    throw error;
  }
}

async function writeReviewStatusFile(
  reviewStatusFilePath: string,
  file: FigmaReviewStatusFile,
): Promise<void> {
  await mkdir(dirname(reviewStatusFilePath), { recursive: true });
  await writeFile(reviewStatusFilePath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  return body ? JSON.parse(body) : {};
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function handleReviewStatusRequest({
  filePath,
  request,
  response,
}: {
  filePath: string;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://storybook.local");

  if (method === "GET") {
    const file = await readReviewStatusFile(filePath);
    const storyId = url.searchParams.get("storyId");
    sendJson(response, 200, {
      entry: storyId ? (file.stories[storyId] ?? null) : null,
      file,
    });
    return;
  }

  if (method !== "PUT" && method !== "PATCH" && method !== "POST") {
    sendJson(response, 405, { error: `Unsupported method ${method}.` });
    return;
  }

  const body = await readRequestBody(request);
  if (!isRecord(body) || typeof body.storyId !== "string") {
    sendJson(response, 400, { error: "storyId is required." });
    return;
  }

  const file = await readReviewStatusFile(filePath);
  const previous = file.stories[body.storyId];
  const entry = normalizeReviewEntry({
    ...previous,
    ...(isRecord(body.entry) ? body.entry : {}),
    updatedAt: new Date().toISOString(),
  });

  file.stories[body.storyId] = entry;
  await writeReviewStatusFile(filePath, file);
  sendJson(response, 200, { entry, file });
}

class RequestBodyError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

async function readRequestBodyLimited(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > VISUAL_COMMENT_LIMITS.maxRequestBytes) {
      throw new RequestBodyError("Request body exceeds 4 MiB.", 413);
    }
    chunks.push(buffer);
  }
  const value = Buffer.concat(chunks).toString("utf8").trim();
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new RequestBodyError("Body must be valid JSON.", 400);
  }
}

function visualCommentSegments(basePath: string, requestUrl: string | undefined) {
  const url = new URL(requestUrl ?? "/", "http://storybook.local");
  const pathname = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length)
    : url.pathname;
  return {
    segments: pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          throw new RequestBodyError("Invalid URL path encoding.", 400);
        }
      }),
    url,
  };
}

function sendVisualCommentError(response: ServerResponse, error: unknown): void {
  const storeError =
    error instanceof Error &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string";
  const statusCode =
    error instanceof RequestBodyError || storeError
      ? (error as RequestBodyError | VisualCommentStoreError).statusCode
      : 500;
  sendJson(response, statusCode, {
    error: error instanceof Error ? error.message : "Unknown visual comments error.",
    ...(storeError
      ? {
          code: (error as VisualCommentStoreError).code,
          ...("activeMeeting" in error
            ? { activeMeeting: (error as VisualCommentStoreError & { activeMeeting?: unknown }).activeMeeting }
            : {}),
        }
      : {}),
  });
}

async function serveVisualCommentReport(
  response: ServerResponse,
  store: ReturnType<typeof createVisualCommentStore>,
  segments: string[],
) {
  let filePath: string | null = null;
  let refreshSessionId: string | undefined;
  let contentType = "text/html; charset=utf-8";
  if (segments.length === 1 || (segments.length === 2 && segments[1] === "index.html")) {
    filePath = join(store.root, "index.html");
  } else if (
    segments.length === 4 &&
    segments[1] === "sessions" &&
    /^[a-z0-9-]+$/.test(segments[2]) &&
    segments[3] === "index.html"
  ) {
    refreshSessionId = segments[2];
    filePath = join(store.root, "sessions", segments[2], "index.html");
  } else if (
    segments.length === 5 &&
    segments[1] === "sessions" &&
    /^[a-z0-9-]+$/.test(segments[2]) &&
    segments[3] === "assets" &&
    /^[a-f0-9]{64}\.(?:png|webp)$/.test(segments[4])
  ) {
    filePath = join(store.root, "sessions", segments[2], "assets", segments[4]);
    contentType = segments[4].endsWith(".png") ? "image/png" : "image/webp";
  }
  if (!filePath) {
    sendJson(response, 404, { error: "Unknown report route." });
    return;
  }
  try {
    if (contentType === "text/html; charset=utf-8") {
      await store.refreshReports(refreshSessionId);
    }
    const content = await readFile(filePath);
    response.statusCode = 200;
    response.setHeader("Content-Type", contentType);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.end(content);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      sendJson(response, 404, { error: "Report not found." });
      return;
    }
    throw error;
  }
}

export async function handleVisualCommentsRequest({
  basePath,
  request,
  response,
  store,
}: {
  basePath: string;
  request: IncomingMessage;
  response: ServerResponse;
  store: ReturnType<typeof createVisualCommentStore>;
}): Promise<void> {
  try {
    const { segments, url } = visualCommentSegments(basePath, request.url);
    const method = request.method ?? "GET";
    if (
      method === "GET" &&
      segments.length === 1 &&
      segments[0] === "reports" &&
      !url.pathname.endsWith("/")
    ) {
      response.statusCode = 308;
      response.setHeader("Location", `${basePath}/reports/${url.search}`);
      response.end();
      return;
    }
    if (method === "GET" && segments[0] === "reports") {
      await serveVisualCommentReport(response, store, segments);
      return;
    }
    if (method === "GET" && segments.length === 0) {
      const overview = await store.getOverview(url.searchParams.get("storyId") ?? undefined);
      sendJson(response, 200, {
        ...overview,
        comments: overview.comments.map((comment) => ({
          ...comment,
          preview: comment.preview
            ? {
                imageUrl: `${basePath}/reports/sessions/${encodeURIComponent(overview.activeSession!.id)}/assets/${encodeURIComponent(basename(comment.preview.imagePath))}`,
                width: comment.preview.width,
                height: comment.preview.height,
                pin: comment.preview.pin,
              }
            : null,
        })),
        reportUrl: `${basePath}/reports`,
        activeReportUrl: overview.activeSession
          ? `${basePath}/reports/sessions/${encodeURIComponent(overview.activeSession.id)}/index.html`
          : null,
      });
      return;
    }
    if (method === "POST" && segments[0] === "sessions" && segments.length === 1) {
      const requestBody = await readRequestBodyLimited(request);
      sendJson(
        response,
        201,
        await store.startMeeting(isRecord(requestBody) ? requestBody.title as string : ""),
      );
      return;
    }
    if (segments[0] !== "sessions" || !segments[1]) {
      sendJson(response, 404, { error: "Unknown visual comments route." });
      return;
    }
    const sessionId = segments[1];
    if (method === "GET" && segments.length === 2) {
      sendJson(response, 200, await store.getMeeting(sessionId));
      return;
    }
    if (method === "POST" && segments[2] === "close" && segments.length === 3) {
      sendJson(response, 200, await store.closeMeeting(sessionId));
      return;
    }
    if (method === "POST" && segments[2] === "comments" && segments.length === 3) {
      const result = await store.createComment(sessionId, await readRequestBodyLimited(request));
      sendJson(response, result.replay ? 200 : 201, result);
      return;
    }
    if (segments[2] === "comments" && segments[3] && segments.length === 4) {
      const commentId = segments[3];
      if (method === "PATCH") {
        const requestBody = await readRequestBodyLimited(request);
        if (!isRecord(requestBody)) {
          throw new RequestBodyError(
            "Body must contain resolved, body, pin, or body and pin fields.",
            400,
          );
        }
        const keys = Object.keys(requestBody);
        if (
          keys.length === 1 &&
          keys[0] === "resolved" &&
          typeof requestBody.resolved === "boolean"
        ) {
          sendJson(
            response,
            200,
            await store.resolveComment(sessionId, commentId, requestBody.resolved),
          );
          return;
        }
        if (
          keys.length >= 1 &&
          keys.length <= 2 &&
          keys.every((key) => key === "body" || key === "pin")
        ) {
          sendJson(
            response,
            200,
            await store.updateCommentDetails(sessionId, commentId, requestBody),
          );
          return;
        }
        throw new RequestBodyError(
          "Body must contain exclusive boolean resolved or one or both of body and pin.",
          400,
        );
      }
      if (method === "DELETE") {
        sendJson(response, 200, await store.deleteComment(sessionId, commentId));
        return;
      }
    }
    sendJson(response, 405, { error: `Unsupported visual comments method ${method}.` });
  } catch (error) {
    sendVisualCommentError(response, error);
  }
}

export function createVisualCommentsHandler(options: {
  basePath?: string;
  store: ReturnType<typeof createVisualCommentStore>;
}): MiddlewareHandler {
  const basePath = options.basePath ?? defaultVisualCommentsApiPath;
  return (request, response) => {
    void handleVisualCommentsRequest({
      basePath,
      request,
      response,
      store: options.store,
    });
  };
}

// --- Figma export payload store -------------------------------------------
// Exports pushed from the Storybook overlay land here; the Figma plugin's
// "Load from Storybook" flow reads them back. The plugin UI runs in a
// null-origin iframe, so every response carries permissive CORS headers.

// Lowercase letters, digits, and hyphens only; everything else (including
// path separators and dots) is stripped so storyIds can never escape the
// payload directory.
export function sanitizePayloadStoryId(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "");
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
}

type PayloadSummary = {
  componentTitle: string;
  generatedAt: string;
  storyId: string;
  storyName: string;
};

function toPayloadSummary(storyId: string, payload: unknown): PayloadSummary {
  const source = isRecord(payload) ? payload : {};
  return {
    componentTitle:
      typeof source.componentTitle === "string" ? source.componentTitle : "",
    generatedAt: typeof source.generatedAt === "string" ? source.generatedAt : "",
    storyId,
    storyName: typeof source.storyName === "string" ? source.storyName : "",
  };
}

async function listStoredPayloads(payloadDir: string): Promise<PayloadSummary[]> {
  let files: string[] = [];
  try {
    files = (await readdir(payloadDir)).filter((file) => file.endsWith(".json"));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const summaries: PayloadSummary[] = [];
  for (const file of files.sort()) {
    const storyId = file.slice(0, -".json".length);
    try {
      const raw = await readFile(join(payloadDir, file), "utf8");
      summaries.push(toPayloadSummary(storyId, JSON.parse(raw)));
    } catch {
      // Skip unreadable or corrupt payload files instead of failing the list.
    }
  }
  return summaries;
}

export async function handleFigmaExportPayloadRequest({
  payloadDir,
  request,
  response,
}: {
  payloadDir: string;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  setCorsHeaders(response);
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://storybook.local");
  const pathStoryId = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));

  if (method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (method === "POST") {
    let body: unknown;
    try {
      body = await readRequestBody(request);
    } catch {
      sendJson(response, 400, { error: "Body must be valid JSON." });
      return;
    }

    if (!isRecord(body) || typeof body.storyId !== "string" || !isRecord(body.root)) {
      sendJson(response, 400, {
        error: "Body must be a Figma export payload with storyId and root.",
      });
      return;
    }

    const storyId = sanitizePayloadStoryId(body.storyId);
    if (!storyId) {
      sendJson(response, 400, { error: "storyId sanitized to an empty value." });
      return;
    }

    await mkdir(payloadDir, { recursive: true });
    await writeFile(join(payloadDir, `${storyId}.json`), JSON.stringify(body), "utf8");
    sendJson(response, 201, { stored: true, storyId });
    return;
  }

  if (method !== "GET") {
    sendJson(response, 405, { error: `Unsupported method ${method}.` });
    return;
  }

  if (!pathStoryId) {
    sendJson(response, 200, await listStoredPayloads(payloadDir));
    return;
  }

  const storyId = sanitizePayloadStoryId(pathStoryId);
  if (!storyId) {
    sendJson(response, 400, { error: "storyId sanitized to an empty value." });
    return;
  }

  try {
    const raw = await readFile(join(payloadDir, `${storyId}.json`), "utf8");
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(raw);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      sendJson(response, 404, { error: `No stored payload for ${storyId}.` });
      return;
    }
    throw error;
  }
}

export function createFigmaExportPayloadStoreHandler(options: {
  payloadDir: string;
}): MiddlewareHandler {
  return (request, response) => {
    void handleFigmaExportPayloadRequest({
      payloadDir: options.payloadDir,
      request,
      response,
    }).catch((error: unknown) => {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown payload store error.",
      });
    });
  };
}

export function createFigmaReviewStatusPlugin(
  options: FigmaReviewStatusPluginOptions = {},
) {
  const apiPath = options.apiPath ?? defaultFigmaReviewStatusApiPath;
  const filePath = resolve(
    options.cwd ?? process.cwd(),
    options.filePath ?? "design-system/figma-export-review-status.json",
  );
  const payloadApiPath = options.payloadApiPath ?? defaultFigmaExportPayloadApiPath;
  const payloadDir = resolve(
    options.cwd ?? process.cwd(),
    options.payloadDir ?? defaultFigmaExportPayloadDir,
  );
  const commentsApiPath = options.commentsApiPath ?? defaultVisualCommentsApiPath;
  const commentsStore = createVisualCommentStore({
    cwd: options.cwd,
    commentsDir: options.commentsDir ?? defaultVisualCommentsDir,
  });

  return {
    configureServer(server: MiddlewareServer) {
      server.middlewares.use(apiPath, (request, response) => {
        void handleReviewStatusRequest({
          filePath,
          request,
          response,
        }).catch((error: unknown) => {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : "Unknown review status error.",
          });
        });
      });
      server.middlewares.use(
        payloadApiPath,
        createFigmaExportPayloadStoreHandler({ payloadDir }),
      );
      if (options.commentsEnabled !== false) {
        server.middlewares.use(
          commentsApiPath,
          createVisualCommentsHandler({ basePath: commentsApiPath, store: commentsStore }),
        );
      }
    },
    name: options.name ?? "figma-export-review-status-api",
  };
}
