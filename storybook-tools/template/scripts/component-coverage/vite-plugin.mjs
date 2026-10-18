import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

// API path contract shared with src/storybook/component-coverage/coverageApi.ts.
export const componentCoverageApiPath = "/__component-coverage";

// Mirrors coverageRequestIdPattern in
// src/storybook/component-coverage/coverageTypes.ts. Request directories
// created by this API always use this shape; deletion additionally receives
// the directory-backed storage id instead of trusting request.json's id.
const requestIdPattern = /^\d{8}-\d{6}-[a-z0-9][a-z0-9-]*$/;

const maxBodyBytes = 50 * 1024 * 1024;
const dataUrlPattern = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/;
const extensionByMime = { jpeg: "jpg" };

function toRequestIdSlug(title) {
  const slug = String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "request";
}

function toRequestIdTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let bytes = 0;

    req.on("data", (chunk) => {
      bytes += chunk.length;

      if (bytes > maxBodyBytes) {
        rejectBody(new Error(`request body exceeds ${maxBodyBytes} bytes`));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        rejectBody(new Error(`invalid JSON body (${error.message})`));
      }
    });
    req.on("error", rejectBody);
  });
}

// Review contract mirror of src/storybook/component-coverage/coverageTypes.ts.
const reviewStatuses = new Set(["draft", "confirmed"]);
const reviewDecisionsBySection = {
  missing: new Set(["build-new", "use-existing", "skip"]),
  extend: new Set(["extend", "no-extend", "use-existing", "skip"]),
  reusable: new Set(["approve", "use-existing", "skip"]),
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function classifyBlock(block) {
  if (block.gap?.status === "missing") {
    return "missing";
  }

  if (block.gap?.status === "extend") {
    return "extend";
  }

  return Array.isArray(block.matches) &&
    block.matches.some((blockMatch) => blockMatch.fit === "exact")
    ? "reusable"
    : "extend";
}

export function applyReviewUpdate(report, body) {
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "composition")) {
    throw new Error(
      '"composition" is analyzer-owned and cannot be replaced by a review payload',
    );
  }

  const reviews = body?.reviews;
  const reviewStatus = body?.reviewStatus;

  if (typeof reviews !== "object" || reviews === null || Array.isArray(reviews)) {
    throw new Error('"reviews" must be an object map of block id to review');
  }

  if (!reviewStatuses.has(reviewStatus)) {
    throw new Error(
      `invalid reviewStatus "${reviewStatus}" (expected draft or confirmed)`,
    );
  }

  if (!Array.isArray(report.blocks)) {
    throw new Error("report has no blocks array");
  }

  const blockById = new Map(report.blocks.map((block) => [block.id, block]));

  for (const [blockId, review] of Object.entries(reviews)) {
    const block = blockById.get(blockId);

    if (!block) {
      throw new Error(`unknown block id "${blockId}"`);
    }

    const section = classifyBlock(block);
    const allowedDecisions = reviewDecisionsBySection[section];

    if (
      typeof review !== "object" ||
      review === null ||
      !allowedDecisions.has(review.decision)
    ) {
      throw new Error(
        `disallowed decision "${review?.decision}" for ${section} block "${blockId}" (allowed: ${[...allowedDecisions].join(", ")})`,
      );
    }

    if (
      review.decision === "use-existing" &&
      !isNonEmptyString(review.overrideComponentId)
    ) {
      throw new Error(
        `decision "use-existing" on block "${blockId}" requires a non-empty overrideComponentId`,
      );
    }

    if (!isNonEmptyString(review.reviewedAt)) {
      throw new Error(`review on block "${blockId}" requires a non-empty reviewedAt`);
    }
  }

  const nextBlocks = report.blocks.map((block) => {
    const { review: _previousReview, ...rest } = block;
    const nextReview = reviews[block.id];

    return nextReview ? { ...rest, review: nextReview } : rest;
  });

  if (reviewStatus === "confirmed") {
    const unreviewed = nextBlocks.filter((block) => {
      const section = classifyBlock(block);

      return (
        (section === "extend" || section === "missing") &&
        !isNonEmptyString(block.review?.decision)
      );
    });

    if (unreviewed.length > 0) {
      throw new Error(
        `cannot confirm: ${unreviewed.length} extend/missing block(s) lack a review decision`,
      );
    }
  }

  return { ...report, blocks: nextBlocks, reviewStatus };
}

function writeRequestIndexManifest(reportsDir) {
  if (!existsSync(reportsDir)) {
    return;
  }

  const reportFiles = readdirSync(reportsDir)
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .sort();

  writeFileSync(
    join(reportsDir, "index.json"),
    `${JSON.stringify({ reports: reportFiles }, null, 2)}\n`,
  );
}

function collectState(requestsDir, reportsDir) {
  const requests = [];
  const reports = [];

  if (existsSync(requestsDir)) {
    for (const entry of readdirSync(requestsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const requestFile = join(requestsDir, entry.name, "request.json");

      if (!existsSync(requestFile)) {
        continue;
      }

      try {
        const request = JSON.parse(readFileSync(requestFile, "utf8"));

        requests.push({ ...request, storageId: entry.name });
      } catch (error) {
        requests.push({
          id: entry.name,
          parseError: error.message,
          storageId: entry.name,
        });
      }
    }
  }

  if (existsSync(reportsDir)) {
    for (const file of readdirSync(reportsDir).sort()) {
      if (!file.endsWith(".json") || file === "index.json") {
        continue;
      }

      reports.push({
        fileName: file,
        raw: readFileSync(join(reportsDir, file), "utf8"),
      });
    }
  }

  return { requests, reports };
}

function handleCreateRequest(body, requestsDir) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const prdText = typeof body?.prdText === "string" ? body.prdText.trim() : "";
  const images = Array.isArray(body?.images) ? body.images : [];

  if (!prdText && images.length === 0) {
    throw new Error("a request needs at least one image or PRD text");
  }

  const decodedImages = images.map((image, index) => {
    const dataUrl = typeof image === "string" ? image : image?.dataUrl;
    const match = typeof dataUrl === "string" ? dataUrl.match(dataUrlPattern) : null;

    if (!match) {
      throw new Error(`images[${index}] is not a supported base64 image data URL`);
    }

    const extension = extensionByMime[match[1]] ?? match[1];

    return {
      fileName: `image-${index + 1}.${extension}`,
      buffer: Buffer.from(match[2], "base64"),
    };
  });

  const now = new Date();
  const baseId = `${toRequestIdTimestamp(now)}-${toRequestIdSlug(title)}`;
  let id = baseId;

  for (let suffix = 2; existsSync(join(requestsDir, id)); suffix += 1) {
    id = `${baseId}-${suffix}`;
  }

  const requestDir = join(requestsDir, id);

  mkdirSync(requestDir, { recursive: true });

  for (const image of decodedImages) {
    writeFileSync(join(requestDir, image.fileName), image.buffer);
  }

  const request = {
    id,
    createdAt: now.toISOString(),
    title: title || id,
    prdText,
    images: decodedImages.map((image) => image.fileName),
    status: "pending",
  };

  writeFileSync(
    join(requestDir, "request.json"),
    `${JSON.stringify(request, null, 2)}\n`,
  );

  return request;
}

export function createComponentCoverageApiPlugin({
  apiPath = componentCoverageApiPath,
  rootDir = process.cwd(),
} = {}) {
  const coverageDir = resolve(rootDir, "outputs/component-coverage");
  const requestsDir = join(coverageDir, "requests");
  const reportsDir = join(coverageDir, "reports");

  return {
    name: "component-coverage-api",
    configResolved() {
      // Regenerated on every dev/build start so the static bundle can list
      // reports without a directory index.
      writeRequestIndexManifest(reportsDir);
    },
    configureServer(server) {
      server.middlewares.use(apiPath, (req, res, next) => {
        const route = `${req.method} ${(req.url ?? "").split("?")[0]}`;

        if (route === "GET /state") {
          sendJson(res, 200, collectState(requestsDir, reportsDir));
          return;
        }

        if (route === "POST /requests") {
          readJsonBody(req)
            .then((body) => {
              mkdirSync(requestsDir, { recursive: true });
              const request = handleCreateRequest(body, requestsDir);
              sendJson(res, 201, { id: request.id });
            })
            .catch((error) => {
              sendJson(res, 400, { error: error.message });
            });
          return;
        }

        const reviewMatch =
          req.method === "PUT" &&
          (req.url ?? "").split("?")[0].match(/^\/reports\/(.+)\/review$/);

        if (reviewMatch) {
          const fileName = decodeURIComponent(reviewMatch[1]);
          const isValidName =
            fileName.endsWith(".json") &&
            fileName !== "index.json" &&
            basename(fileName) === fileName;

          if (!isValidName) {
            sendJson(res, 400, { error: `invalid report file name "${fileName}"` });
            return;
          }

          const filePath = join(reportsDir, fileName);

          if (!existsSync(filePath)) {
            sendJson(res, 404, { error: `report "${fileName}" not found` });
            return;
          }

          readJsonBody(req)
            .then((body) => {
              const report = JSON.parse(readFileSync(filePath, "utf8"));
              const updated = applyReviewUpdate(report, body);

              writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`);
              sendJson(res, 200, { ok: true });
            })
            .catch((error) => {
              sendJson(res, 400, { error: error.message });
            });
          return;
        }

        const deleteMatch =
          req.method === "DELETE" &&
          (req.url ?? "").split("?")[0].match(/^\/reports\/(.+)$/);

        if (deleteMatch) {
          const fileName = decodeURIComponent(deleteMatch[1]);
          const isValidName =
            fileName.endsWith(".json") &&
            fileName !== "index.json" &&
            basename(fileName) === fileName;

          if (!isValidName) {
            sendJson(res, 400, { error: `invalid report file name "${fileName}"` });
            return;
          }

          const filePath = join(reportsDir, fileName);

          if (!existsSync(filePath)) {
            sendJson(res, 404, { error: `report "${fileName}" not found` });
            return;
          }

          unlinkSync(filePath);
          writeRequestIndexManifest(reportsDir);
          sendJson(res, 200, { ok: true });
          return;
        }

        const deleteRequestMatch =
          req.method === "DELETE" &&
          (req.url ?? "").split("?")[0].match(/^\/requests\/(.+)$/);

        if (deleteRequestMatch) {
          const id = decodeURIComponent(deleteRequestMatch[1]);
          const isValidId = requestIdPattern.test(id) && basename(id) === id;

          if (!isValidId) {
            sendJson(res, 400, { error: `invalid request id "${id}"` });
            return;
          }

          const requestDir = join(requestsDir, id);

          if (!existsSync(requestDir)) {
            sendJson(res, 404, { error: `request "${id}" not found` });
            return;
          }

          rmSync(requestDir, { recursive: true, force: true });
          sendJson(res, 200, { ok: true });
          return;
        }

        next();
      });
    },
  };
}
