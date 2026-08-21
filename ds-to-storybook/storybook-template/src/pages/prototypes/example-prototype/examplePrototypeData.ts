import type { ExamplePrototypeRouteId } from "./examplePrototypeFlow";

export type ExamplePrototypeRequest = {
  id: string;
  name: string;
  owner: string;
  targetDate: string;
  status: "draft" | "review" | "approved";
  summary: string;
  requirements: string[];
  risks: string[];
};

export const examplePrototypeRequest: ExamplePrototypeRequest = {
  id: "REQ-1042",
  name: "Project Intake Workspace",
  owner: "Design Systems",
  targetDate: "2026-07-15",
  status: "review",
  summary:
    "A starter flow for collecting project scope, review notes, and implementation handoff details.",
  requirements: [
    "Capture product problem, target user, and core workflow.",
    "Attach deterministic fixture data before UI implementation starts.",
    "Confirm prototype docs and UI Flow metadata are complete.",
  ],
  risks: [
    "Missing acceptance criteria can make handoff ambiguous.",
    "Unscoped fixture fields can drift from the route model.",
  ],
};

export const examplePrototypeRouteDataRequirements = [
  {
    api: "/api/project-requests/:id",
    requiredData: ["request id", "name", "owner", "summary", "requirements"],
    route: "intake" satisfies ExamplePrototypeRouteId,
    state: "editable request draft",
  },
  {
    api: "/api/project-requests/:id/review",
    requiredData: ["requirements", "risks", "target date", "review notes"],
    route: "review" satisfies ExamplePrototypeRouteId,
    state: "request ready for review",
  },
  {
    api: "/api/project-requests/:id/handoff",
    requiredData: ["approved scope", "owner", "next steps", "target date"],
    route: "handoff" satisfies ExamplePrototypeRouteId,
    state: "approved implementation handoff",
  },
];

export const examplePrototypeApiContracts = [
  {
    endpoint: "/api/project-requests/:id",
    method: "GET",
    mock: "examplePrototypeRequest",
    request: "request id",
    response: "ExamplePrototypeRequest",
    routes: ["intake", "review", "handoff"],
    usage: "Loads the deterministic request fixture used by every route.",
  },
  {
    endpoint: "/api/project-requests/:id/approval",
    method: "POST",
    mock: "approval branch fixture",
    request: "request id, reviewer decision, notes",
    response: "approved | needs_changes",
    routes: ["review", "approval-decision", "handoff"],
    usage:
      "Represents the branch that UI Flow shows as a decision node. The prototype keeps this local.",
  },
];

export const examplePrototypeDataSources = [
  {
    description: "Project request details entered by a product or design owner.",
    id: "request-service",
    owner: "Product Operations",
    refresh: "On draft save or review submit",
    source: "Future project request API",
  },
  {
    description: "Review decision and handoff readiness signals.",
    id: "review-service",
    owner: "Design Systems",
    refresh: "On approval action",
    source: "Future review workflow API",
  },
];
