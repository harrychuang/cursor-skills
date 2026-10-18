import { DesignAutomationError } from "./contract.mjs";

const REVIEW_METHODS = [
  "listPendingReviews",
  "submitReviewDecision",
  "getWorkflowOverview",
];

export function inspectHostAdapter(adapter, { requireReview = false } = {}) {
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    throw new DesignAutomationError("invalid-host-adapter", "Host adapter export is missing.");
  }
  if (adapter.contractVersion !== 1) {
    throw new DesignAutomationError("unsupported-host-contract", "Host adapter contractVersion must be 1.");
  }
  for (const method of ["resolveProject", "resolveMember"]) {
    if (typeof adapter[method] !== "function") {
      throw new DesignAutomationError("invalid-host-adapter", `Host adapter is missing ${method}.`);
    }
  }
  const review = adapter.review;
  const present = REVIEW_METHODS.filter((method) => typeof review?.[method] === "function");
  if (review !== undefined && present.length !== REVIEW_METHODS.length) {
    throw new DesignAutomationError("incomplete-review-adapter", "Review adapter methods must be supplied as one complete group.");
  }
  if (requireReview && present.length !== REVIEW_METHODS.length) {
    throw new DesignAutomationError("incomplete-review-adapter", "Compatible host requires the complete review group.");
  }
  return {
    contractVersion: 1,
    reviewEnabled: present.length === REVIEW_METHODS.length,
    reviewMethods: present,
  };
}

export function registerDesignAutomationHub(hostAdapter) {
  const descriptor = inspectHostAdapter(hostAdapter);
  return {
    descriptor,
    adapter: hostAdapter,
    features: {
      cleanup: true,
      workflowStatus: true,
      review: descriptor.reviewEnabled,
    },
  };
}

export async function smokeHostAdapter(adapter) {
  const descriptor = inspectHostAdapter(adapter);
  const context = Object.freeze({
    dryRun: true,
    noWrite: true,
    projectId: "aurora",
    fileKey: "fixture-file",
    memberId: "fixture-member",
  });
  await adapter.resolveProject(context);
  await adapter.resolveMember(context);
  if (descriptor.reviewEnabled) {
    await adapter.review.listPendingReviews(context);
    await adapter.review.getWorkflowOverview(context);
  }
  return descriptor;
}
