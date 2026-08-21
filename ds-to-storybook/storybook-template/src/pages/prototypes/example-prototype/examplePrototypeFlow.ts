export const examplePrototypeRouteIds = [
  "intake",
  "review",
  "handoff",
] as const;

export type ExamplePrototypeRouteId =
  (typeof examplePrototypeRouteIds)[number];

export const examplePrototypeFlowNodeIds = [
  "approval-decision",
] as const;

export type ExamplePrototypeFlowNodeId =
  (typeof examplePrototypeFlowNodeIds)[number];

export type ExamplePrototypeFlowTargetId =
  | ExamplePrototypeRouteId
  | ExamplePrototypeFlowNodeId;

export type ExamplePrototypeRoute = {
  id: ExamplePrototypeRouteId;
  title: string;
  navigationId: string;
  component?: string;
  description?: string;
  flowGroup?: string;
  flowPosition?: {
    x: number;
    y: number;
  };
};

export type ExamplePrototypeFlowNode = {
  id: ExamplePrototypeFlowNodeId;
  title: string;
  description?: string;
  flowGroup?: string;
  flowPosition?: {
    x: number;
    y: number;
  };
  shape: "decision" | "state";
  tone?: "default" | "success" | "error";
};

export type ExamplePrototypeTransition = {
  from: ExamplePrototypeFlowTargetId;
  to: ExamplePrototypeFlowTargetId;
  trigger: string;
  label: string;
  flowLine?: "key" | "reference" | "hidden";
  kind?: "primary" | "return" | "global" | "secondary" | "outcome" | "condition";
};

export const examplePrototypeRoutes = [
  {
    component: "ExamplePrototype",
    description: "Collects a new project request and validates required intake fields.",
    flowGroup: "entry",
    flowPosition: { x: 0, y: 0 },
    id: "intake",
    navigationId: "intake",
    title: "Project Intake",
  },
  {
    component: "ExamplePrototype",
    description: "Lets a reviewer inspect scope, risks, and fixture readiness before approval.",
    flowGroup: "review",
    flowPosition: { x: 560, y: 0 },
    id: "review",
    navigationId: "review",
    title: "Review Request",
  },
  {
    component: "ExamplePrototype",
    description: "Summarizes accepted scope and the next implementation handoff steps.",
    flowGroup: "handoff",
    flowPosition: { x: 1120, y: 0 },
    id: "handoff",
    navigationId: "handoff",
    title: "Implementation Handoff",
  },
] as const satisfies readonly ExamplePrototypeRoute[];

export const examplePrototypeFlowNodes = [
  {
    description:
      "Approves complete requests or sends incomplete requests back to review with notes.",
    flowGroup: "branch",
    flowPosition: { x: 660, y: 1030 },
    id: "approval-decision",
    shape: "decision",
    title: "Ready for handoff?",
  },
] as const satisfies readonly ExamplePrototypeFlowNode[];

export const examplePrototypeTransitions = [
  {
    flowLine: "key",
    from: "intake",
    kind: "primary",
    label: "Submit intake",
    to: "review",
    trigger: "intakeForm.submit",
  },
  {
    flowLine: "key",
    from: "review",
    kind: "primary",
    label: "Request approval",
    to: "approval-decision",
    trigger: "reviewPanel.requestApproval",
  },
  {
    flowLine: "key",
    from: "approval-decision",
    kind: "condition",
    label: "Approved",
    to: "handoff",
    trigger: "approvalDecision.approved",
  },
  {
    flowLine: "reference",
    from: "approval-decision",
    kind: "condition",
    label: "Needs changes",
    to: "review",
    trigger: "approvalDecision.needsChanges",
  },
  {
    flowLine: "reference",
    from: "review",
    kind: "return",
    label: "Edit intake",
    to: "intake",
    trigger: "reviewPanel.editIntake",
  },
  {
    flowLine: "reference",
    from: "handoff",
    kind: "return",
    label: "Start another request",
    to: "intake",
    trigger: "handoff.startNew",
  },
] as const satisfies readonly ExamplePrototypeTransition[];

export const examplePrototypeFlow = {
  nodes: examplePrototypeFlowNodes,
  routes: examplePrototypeRoutes,
  transitions: examplePrototypeTransitions,
};
