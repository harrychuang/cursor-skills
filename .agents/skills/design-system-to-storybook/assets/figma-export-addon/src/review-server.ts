import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import type { FigmaReviewEntry, FigmaReviewStatus } from "./review";

export const defaultFigmaReviewStatusApiPath = "/__figma_export_review_status";

export type FigmaReviewStatusFile = {
  stories: Record<string, FigmaReviewEntry>;
  version: 1;
};

export type FigmaReviewStatusPluginOptions = {
  apiPath?: string;
  cwd?: string;
  filePath?: string;
  name?: string;
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

export function createFigmaReviewStatusPlugin(
  options: FigmaReviewStatusPluginOptions = {},
) {
  const apiPath = options.apiPath ?? defaultFigmaReviewStatusApiPath;
  const filePath = resolve(
    options.cwd ?? process.cwd(),
    options.filePath ?? "design-system/figma-export-review-status.json",
  );

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
    },
    name: options.name ?? "figma-export-review-status-api",
  };
}
