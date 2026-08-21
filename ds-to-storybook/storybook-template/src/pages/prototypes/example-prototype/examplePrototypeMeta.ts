import acceptance from "./docs/ACCEPTANCE.md?raw";
import dataSpec from "./docs/DATA_SPEC.md?raw";
import flowSpec from "./docs/FLOW_SPEC.md?raw";
import implementationGuide from "./docs/IMPLEMENTATION_GUIDE.md?raw";
import prd from "./docs/PRD.md?raw";
import uiSpec from "./docs/UI_SPEC.md?raw";
import {
  examplePrototypeApiContracts,
  examplePrototypeDataSources,
  examplePrototypeRequest,
  examplePrototypeRouteDataRequirements,
} from "./examplePrototypeData";
import { examplePrototypeFlow } from "./examplePrototypeFlow";

export const examplePrototypeMeta = {
  data: {
    apiContracts: examplePrototypeApiContracts,
    dataSources: examplePrototypeDataSources,
    fixtures: {
      request: examplePrototypeRequest,
    },
    overview: {
      contract:
        "Local fixture data demonstrates how prototype routes, docs, and UI Flow metadata stay aligned.",
      environment: "Storybook only. No external service calls are made.",
      owner: "Storybook Template",
      status: "Starter example",
    },
    routeDataRequirements: examplePrototypeRouteDataRequirements,
    schemas: [
      {
        description: "Project request fixture used by all example prototype routes.",
        fields: [
          {
            description: "Stable request identifier.",
            name: "id",
            required: true,
            source: "request-service",
            type: "string",
          },
          {
            description: "Human-readable project name.",
            name: "name",
            required: true,
            source: "request-service",
            type: "string",
          },
          {
            description: "Team accountable for review and handoff.",
            name: "owner",
            required: true,
            source: "request-service",
            type: "string",
          },
          {
            description: "Deterministic requirement list rendered in review.",
            name: "requirements",
            required: true,
            source: "request-service",
            type: "string[]",
          },
        ],
        name: "ExamplePrototypeRequest",
      },
    ],
    stateRules: [
      {
        rule: "routeId owns the currently visible route.",
      },
      {
        rule: "Approval is local and deterministic; no real review API is called.",
      },
      {
        rule: "The decision node appears in UI Flow metadata but is not a product route.",
      },
    ],
  },
  description:
    "A neutral Project Intake prototype that demonstrates Story, Docs, UI Flow, Data, and Static Flow export contracts for new projects.",
  docs: {
    acceptance,
    dataSpec,
    flowSpec,
    implementationGuide,
    prd,
    uiSpec,
  },
  figmaExport: {
    flowStoryId: "pages-prototypes-example-prototype--static-flow",
  },
  flow: examplePrototypeFlow,
  id: "example-prototype",
  owner: "Storybook Template",
  status: "Template example",
  title: "Example Prototype",
};
