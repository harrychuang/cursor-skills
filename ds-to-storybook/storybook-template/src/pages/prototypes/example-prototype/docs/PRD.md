# Example Prototype PRD

## Product Summary

Example Prototype is a neutral Project Intake flow for validating the reusable Storybook prototype contract. It demonstrates how a project request moves from intake, through review, into implementation handoff.

## Problem

New projects need a repeatable way to align product scope, flow metadata, local fixtures, and acceptance criteria before implementation starts.

## Users

- Product owner who submits a project request.
- Design-system reviewer who checks completeness.
- Engineer or AI agent who needs a deterministic implementation handoff.

## Goals

- Capture project request details in a deterministic Storybook story.
- Review requirements and risks before approval.
- Show a decision node in UI Flow without making it a full product route.
- Provide docs, flow metadata, data contracts, and acceptance criteria in one Storybook surface.

## Non-Goals

- No real approval API.
- No authentication, permissioning, or notifications.
- No production project management integration.

## Core Journeys

1. A user opens Project Intake and submits the request for review.
2. A reviewer inspects requirements and requests approval.
3. The approval decision sends complete requests to Implementation Handoff.
4. Incomplete requests can return to review or intake as reference transitions.

## AI Implementation Scope

The example exists as a contract test for future prototypes. Agents should mirror the folder shape, route metadata, deterministic data, and `parameters.prototype` attachment.

## Dependencies

- Storybook prototype inspector.
- Template tokens generated from `.storybook/project.config.ts`.
- Local fixture data in `examplePrototypeData.ts`.
