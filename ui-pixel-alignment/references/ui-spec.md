# UI Spec — Platform-Neutral Comparison Format

Both sides of every comparison are normalized into this format before diffing. The reference may be Figma, web code, or app code; the implementation may be web or app. Once both are UI Specs, the comparison is a structural diff instead of an eyeball guess.

Write two files per comparison:

- `spec/reference.json` — the source of truth side
- `spec/implementation.json` — the side being audited

Never diff a Figma frame directly against source code. Extract both, then diff.

## Units

Everything numeric is stored in **CSS-equivalent pixels at density 1** (`px@1x`). Record the original value in `raw` when the conversion is lossy or surprising.

| Platform | Native unit | Conversion to `px@1x` |
|---|---|---|
| Figma | px | identity (Figma frames are already 1x unless the frame was designed at 2x/3x — check frame width against the target viewport) |
| Web CSS | px | identity |
| Web CSS | rem / em | `value × root font-size` (default 16, read the project's actual root size) |
| React Native | dp (unitless) | identity — RN dp and CSS px are the same reference unit |
| Flutter | logical pixel | identity |
| SwiftUI / UIKit | pt | identity |
| Jetpack Compose | dp | identity |
| Compose / Android text | sp | identity for the spec; note that sp scales with user font settings, dp does not |

`density` in `surface` records the capture scale factor (2 for a `@2x` screenshot). Divide measured screenshot pixels by `density` before writing them into the spec. A mismatch of exactly 2x or 3x across every value means a density error, not design drift — fix the capture, do not file findings.

## Schema

```jsonc
{
  "specVersion": "1.0",
  "surface": {
    "name": "Dashboard",
    "platform": "figma | web | react-native | flutter | ios | android",
    "source": "https://figma.com/design/...  |  src/pages/Dashboard.tsx  |  http://localhost:3000/dashboard",
    "viewport": { "width": 1440, "height": 900 },
    "density": 1,
    "theme": "light",
    "direction": "ltr",
    "locale": "en",
    "capturedAt": "2026-08-04T02:00:00Z",
    "fidelity": "measured | inspected | estimated",
    "fonts": {
      "requested": ["PingFang TC", "Inter"],
      "loaded": ["Helvetica", "Inter"],
      "aligned": false,
      "notes": "headless Chromium lacks PingFang; fallback ink height ~30% taller than iOS"
    }
  },

  "accessibilityRemaps": [
    {
      "authored": "#f14f2b",
      "accessible": "#e21e28",
      "token": "--lp-sys-color-warning-text",
      "record": "TOKEN_ARCHITECTURE.md a11y-remap D-56",
      "fields": ["fill", "background", "border.color"]
    }
  ],

  "tokens": {
    "color": { "surface": "#ffffff", "on-surface": "#111827" },
    "space": { "4": 16, "6": 24 },
    "radius": { "lg": 12 },
    "type": { "title-md": { "size": 16, "lineHeight": 24, "weight": 600 } }
  },

  "nodes": [
    {
      "id": "summary-card",
      "path": "root/main/summary-card",
      "role": "region | container | text | image | icon | control | input | list | item | divider | overlay",
      "name": "Portfolio summary card",
      "component": "SummaryCard",
      "order": 0,

      "layout": {
        "mode": "flow | row | column | stack | grid | absolute",
        "justify": "start | center | end | space-between | space-around",
        "align": "start | center | end | stretch | baseline",
        "gap": 16,
        "wrap": false,
        "columns": null
      },

      "box": {
        "width": 320,
        "height": null,
        "minWidth": null,
        "maxWidth": 480,
        "padding": [24, 24, 24, 24],
        "margin": [0, 0, 16, 0],
        "position": { "x": 32, "y": 96 }
      },

      "type": {
        "family": "Inter",
        "size": 16,
        "weight": 600,
        "lineHeight": 24,
        "letterSpacing": 0,
        "align": "left",
        "transform": "none",
        "numberOfLines": null
      },

      "fill": "#111827",
      "background": "#ffffff",
      "border": { "width": 1, "color": "#e5e7eb", "style": "solid", "sides": "all" },
      "radius": [12, 12, 12, 12],
      "shadow": "0 1px 2px rgba(0,0,0,0.06)",
      "elevation": 1,
      "opacity": 1,

      "text": "Total balance",
      "asset": "icons/wallet.svg",

      "tokenRefs": {
        "background": "--sys-surface",
        "radius": "--sys-radius-lg",
        "padding": "--sys-space-6"
      },

      "states": {
        "hover":   { "background": "#f9fafb" },
        "pressed": { "opacity": 0.9 },
        "focus":   { "border": { "width": 2, "color": "#2563eb" } },
        "disabled":{ "opacity": 0.4 }
      },

      "platformOnly": false,
      "notes": "iOS large-title header; no web equivalent"
    }
  ]
}
```

### Field rules

- **`id`** — stable across both sides. This is what makes the diff meaningful. Derive it from the design layer name, the component name, or the visible text, lowercased and kebab-cased. If the two sides use different names, pick the reference's id and reuse it on the implementation side.
- **`path`** — slash-joined ancestor ids. Used as the fallback matcher when ids disagree.
- **`role`** — semantic, not markup. A `<div>` acting as a card is `container`; a `Text` node and an `<h2>` are both `text`.
- **`box.padding` / `box.margin` / `radius`** — always 4-element arrays in `[top, right, bottom, left]` order, even when the source writes a shorthand. `radius` order is `[topLeft, topRight, bottomRight, bottomLeft]`.
- **`null`** means "not specified / inherited". It is not the same as `0` and never produces a finding on its own.
- **`tokenRefs`** — record the token name whenever the value came from a token, variable, or theme entry. A finding that names a token is actionable; one that names a hex value is not.
- **`platformOnly: true`** — this node legitimately exists on one platform only (a native tab bar, a web breadcrumb). The diff reports it as an adaptation, never as drift.
- **`fidelity`** — `measured` for Figma MCP values or computed styles, `inspected` for values read out of source code, `estimated` for anything eyeballed from an image. Findings derived from `estimated` specs must be flagged as approximate in the report.
- **`fonts`** — the capture environment's font reality, recorded during the font environment preflight. `requested` is what the surface asks for; `loaded` is what actually rendered (from `document.fonts`, a rendered-font inspector, or OS font tooling); `aligned: false` declares the environment could not match the source platform's fonts. When either side carries `aligned: false`, the diff downgrades typography metrics and text-node box sizes to `low` with an explicit warning — those numbers must never drive token changes.
- **`accessibilityRemaps`** — sanctioned authored→accessible value replacements copied from the design system's `a11y-remap` records (see `references/parity-policy.md`). The diff classifies a matching expected/actual color pair as `required-adaptation` instead of drift. Only list remaps that have a design-system record; `record` should cite it.

## Depth

Do not attempt a full node-by-node dump of a complex screen. Capture the nodes a reviewer would actually name:

1. Every layout region (header, sidebar, main, footer, sheet, tab bar).
2. Every repeated component instance type — one representative node per type, not all 40 list rows.
3. Every text style in the visible type ramp.
4. Any node the user pointed at, plus anything visibly wrong.

Aim for 15–60 nodes. Beyond that the diff produces noise faster than value.

## Coverage record

Add a `coverage` block when nodes were deliberately skipped, so the report does not read as exhaustive when it is not:

```jsonc
"coverage": {
  "captured": ["header", "summary-card", "chart", "transaction-row"],
  "skipped": ["footer legal text — below fold, not in reference"],
  "blocked": ["settings sheet — requires auth state not available"]
}
```
