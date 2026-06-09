# Design Evidence Map

Use this file to trace design decisions back to source evidence.

## Source Inventory

For Figma sources, keep the original Figma URL in `Path / URL / Node`, use `figma:<file-key>#<node-id>` or `figma:<file-key>#page:<page-name>` in `Source fingerprint`, and fill `Figma MCP target` with file key, MCP node id, page/frame/node names, and suggested MCP calls. Use `unresolved - <reason>` when the MCP target cannot be resolved.

| Source ID | Type | Path / URL / Node | Source fingerprint | Screen or state | Notes | Confidence | Figma MCP target |
|---|---|---|---|---|---|---|---|

## Source Duplicate Review

Use this table when two screenshots, Figma nodes, routes, or exports are exact duplicates or visually/functionally very close. Record the decision before counting both as separate evidence.

| Candidate source | Duplicate of | Match type | Fingerprint / normalized key | Suggested action | Developer decision | Rationale |
|---|---|---|---|---|---|---|

## Evidence

| Evidence ID | Source ID | Region | Observed pattern | Design decision | Affected output | Confidence |
|---|---|---|---|---|---|---|
