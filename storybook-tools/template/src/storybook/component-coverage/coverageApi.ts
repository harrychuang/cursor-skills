import {
  validateCoverageComposition,
  type CoverageCompositionIssue,
  CoverageBlockReview,
  CoverageReport,
  CoverageRequest,
  CoverageReviewStatus,
} from "./coverageTypes";

// Must stay equal to componentCoverageApiPath in
// scripts/component-coverage/vite-plugin.mjs.
export const componentCoverageApiPath = "/__component-coverage";

// Must stay equal to the staticDirs mapping in .storybook/main.ts.
export const componentCoverageStaticBase = "/component-coverage";

export type CoverageRequestListEntry =
  | { kind: "request"; request: CoverageRequest }
  | { kind: "invalid"; id: string; error: string };

export type CoverageReportListEntry =
  | {
      kind: "report";
      fileName: string;
      report: CoverageReport;
      compositionIssues?: readonly CoverageCompositionIssue[];
    }
  | { kind: "invalid"; fileName: string; error: string };

export type CoverageToolState = {
  mode: "dev" | "static";
  requests: CoverageRequestListEntry[];
  reports: CoverageReportListEntry[];
};

export type CoverageImagePayload = {
  name: string;
  dataUrl: string;
};

export type CoverageSubmitPayload = {
  title: string;
  prdText: string;
  images: readonly CoverageImagePayload[];
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type RawCoverageReport = Omit<CoverageReport, "composition"> & {
  composition?: unknown;
};

export function parseCoverageReportEntry(
  fileName: string,
  raw: string,
): CoverageReportListEntry {
  try {
    const parsed: unknown = JSON.parse(raw);
    const report = parsed as RawCoverageReport;

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !Array.isArray(report.blocks) ||
      typeof report.summary !== "object" ||
      report.summary === null
    ) {
      throw new Error("缺少 blocks 或 summary 欄位");
    }

    const blocksAreWellFormed = report.blocks.every(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        Array.isArray(block.matches) &&
        typeof block.gap === "object" &&
        block.gap !== null,
    );

    if (!blocksAreWellFormed) {
      throw new Error("blocks 內容不符合報告契約");
    }

    const { composition, ...baseReport } = report;

    if (composition !== undefined) {
      const compositionResult = validateCoverageComposition(
        composition,
        report.blocks,
      );

      if (compositionResult.ok) {
        return {
          kind: "report",
          fileName,
          report: {
            ...baseReport,
            composition: compositionResult.composition,
          },
        };
      }

      return {
        kind: "report",
        fileName,
        report: baseReport,
        compositionIssues: compositionResult.issues,
      };
    }

    return { kind: "report", fileName, report: baseReport };
  } catch (error) {
    return { kind: "invalid", fileName, error: toErrorMessage(error) };
  }
}

type DevStatePayload = {
  requests?: readonly (Partial<CoverageRequest> & { parseError?: string })[];
  reports?: readonly { fileName?: string; raw?: string }[];
};

function toRequestListEntries(
  requests: DevStatePayload["requests"],
): CoverageRequestListEntry[] {
  return (requests ?? []).map((entry) => {
    if (entry.parseError || typeof entry.id !== "string" || !entry.status) {
      return {
        kind: "invalid",
        id: entry.id ?? "unknown-request",
        error: entry.parseError ?? "request.json 不符合請求契約",
      };
    }

    return { kind: "request", request: entry as CoverageRequest };
  });
}

async function fetchStaticReports(): Promise<CoverageReportListEntry[]> {
  const indexResponse = await fetch(
    `${componentCoverageStaticBase}/reports/index.json`,
  );

  if (!indexResponse.ok) {
    throw new Error(`index.json responded ${indexResponse.status}`);
  }

  const { reports } = (await indexResponse.json()) as { reports?: string[] };

  return Promise.all(
    (reports ?? []).map(async (fileName): Promise<CoverageReportListEntry> => {
      const response = await fetch(
        `${componentCoverageStaticBase}/reports/${fileName}`,
      );

      if (!response.ok) {
        return {
          kind: "invalid",
          fileName,
          error: `無法讀取報告（HTTP ${response.status}）`,
        };
      }

      return parseCoverageReportEntry(fileName, await response.text());
    }),
  );
}

export async function fetchCoverageToolState(): Promise<CoverageToolState> {
  try {
    const response = await fetch(`${componentCoverageApiPath}/state`);

    if (response.ok) {
      const state = (await response.json()) as DevStatePayload;

      return {
        mode: "dev",
        requests: toRequestListEntries(state.requests),
        reports: (state.reports ?? []).map((entry) =>
          parseCoverageReportEntry(entry.fileName ?? "unknown.json", entry.raw ?? ""),
        ),
      };
    }
  } catch {
    // Dev API unavailable — fall through to the static bundle.
  }

  try {
    return { mode: "static", requests: [], reports: await fetchStaticReports() };
  } catch {
    return { mode: "static", requests: [], reports: [] };
  }
}

export async function submitCoverageRequest(
  payload: CoverageSubmitPayload,
): Promise<{ id: string }> {
  const response = await fetch(`${componentCoverageApiPath}/requests`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: string;
  };

  if (!response.ok || typeof body.id !== "string") {
    throw new Error(body.error ?? `收件 API 回應 ${response.status}`);
  }

  return { id: body.id };
}

export type CoverageReviewSubmitPayload = {
  /** Full review state: block id → review. Blocks omitted here lose their review. */
  reviews: Record<string, CoverageBlockReview>;
  reviewStatus: CoverageReviewStatus;
};

export async function submitCoverageReview(
  fileName: string,
  payload: CoverageReviewSubmitPayload,
): Promise<void> {
  const response = await fetch(
    `${componentCoverageApiPath}/reports/${encodeURIComponent(fileName)}/review`,
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || body.ok !== true) {
    throw new Error(body.error ?? `Review 更新失敗（${response.status}）`);
  }
}

export async function deleteCoverageReport(fileName: string): Promise<void> {
  const response = await fetch(
    `${componentCoverageApiPath}/reports/${encodeURIComponent(fileName)}`,
    { method: "DELETE" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || body.ok !== true) {
    throw new Error(body.error ?? `刪除失敗（${response.status}）`);
  }
}

export async function deleteCoverageRequest(requestId: string): Promise<void> {
  const response = await fetch(
    `${componentCoverageApiPath}/requests/${encodeURIComponent(requestId)}`,
    { method: "DELETE" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || body.ok !== true) {
    throw new Error(body.error ?? `刪除失敗（${response.status}）`);
  }
}

let storyIndexCache: Map<string, string> | null = null;

/**
 * Maps Storybook story titles to their first story id via ./index.json
 * (available in both dev and static builds). Returns an empty Map on any
 * fetch or shape failure — callers degrade to link-only rendering.
 */
export async function fetchStoryIndex(): Promise<Map<string, string>> {
  if (storyIndexCache) {
    return storyIndexCache;
  }

  try {
    const response = await fetch("./index.json");

    if (!response.ok) {
      throw new Error(`index.json responded ${response.status}`);
    }

    const data = (await response.json()) as {
      entries?: Record<string, { id?: string; title?: string; type?: string }>;
    };
    const titleToStoryId = new Map<string, string>();

    for (const entry of Object.values(data.entries ?? {})) {
      if (
        entry?.type === "story" &&
        typeof entry.title === "string" &&
        typeof entry.id === "string" &&
        !titleToStoryId.has(entry.title)
      ) {
        titleToStoryId.set(entry.title, entry.id);
      }
    }

    storyIndexCache = titleToStoryId;
  } catch {
    storyIndexCache = new Map();
  }

  return storyIndexCache;
}

// Mirrors the request id rules in scripts/component-coverage/vite-plugin.mjs
// so the static-mode download produces the same <YYYYMMDD-HHmmss>-<slug> ids.
export function buildDownloadableRequest(
  payload: CoverageSubmitPayload,
): CoverageRequest {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp = [
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
  const slug =
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "request";
  const id = `${timestamp}-${slug}`;

  return {
    id,
    createdAt: now.toISOString(),
    title: payload.title || id,
    prdText: payload.prdText,
    images: payload.images.map((image) => image.name),
    status: "pending",
  };
}
