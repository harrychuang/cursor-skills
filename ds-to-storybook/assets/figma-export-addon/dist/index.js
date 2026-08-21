// src/collapsePreference.ts
var exporterCollapseStorageKey = "sbfx:exporter-collapsed";
function readCollapsePreference(storageKey) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}
function writeCollapsePreference(storageKey, collapsed) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
  } catch {
  }
}

// src/domExport.ts
import { toPng } from "html-to-image";

// src/color.ts
var colorContext;
var normalizedColorCache = /* @__PURE__ */ new Map();
var parsedColorCache = /* @__PURE__ */ new Map();
var simpleColorPattern = /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\([^()]*\))$/i;
function getColorContext() {
  if (colorContext !== void 0) return colorContext;
  if (typeof document === "undefined") {
    colorContext = null;
    return colorContext;
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorContext = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    colorContext = null;
  }
  return colorContext;
}
function roundTripFillStyle(context, value, sentinel) {
  context.fillStyle = sentinel;
  context.fillStyle = value;
  return String(context.fillStyle);
}
function parseFillStyle(value) {
  const context = getColorContext();
  if (!context) return void 0;
  const first = roundTripFillStyle(context, value, "#010203");
  const second = roundTripFillStyle(context, value, "#030201");
  return first === second ? first : void 0;
}
function readPixelRgba(value) {
  const context = getColorContext();
  if (!context) return void 0;
  try {
    context.save();
    context.globalCompositeOperation = "copy";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    context.restore();
    return {
      a: Math.round(a / 255 * 1e4) / 1e4,
      b: b / 255,
      g: g / 255,
      r: r / 255
    };
  } catch {
    return void 0;
  }
}
function parseHexChannel(hex) {
  return Number.parseInt(hex.length === 1 ? `${hex}${hex}` : hex, 16);
}
function rgbaFromNormalizedString(value) {
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      return {
        a: digits.length === 4 ? parseHexChannel(digits[3]) / 255 : 1,
        b: parseHexChannel(digits[2]) / 255,
        g: parseHexChannel(digits[1]) / 255,
        r: parseHexChannel(digits[0]) / 255
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        a: digits.length === 8 ? parseHexChannel(digits.slice(6, 8)) / 255 : 1,
        b: parseHexChannel(digits.slice(4, 6)) / 255,
        g: parseHexChannel(digits.slice(2, 4)) / 255,
        r: parseHexChannel(digits.slice(0, 2)) / 255
      };
    }
    return void 0;
  }
  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return void 0;
  const parts = rgb[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) {
    return void 0;
  }
  return {
    a: Number.isFinite(parts[3]) ? Math.min(1, Math.max(0, parts[3])) : 1,
    b: Math.min(1, Math.max(0, parts[2] / 255)),
    g: Math.min(1, Math.max(0, parts[1] / 255)),
    r: Math.min(1, Math.max(0, parts[0] / 255))
  };
}
function serializeRgba(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  if (color.a >= 1) {
    const toHex = (channel) => channel.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.round(color.a * 1e4) / 1e4})`;
}
function normalizeCssColorString(value) {
  const input = value.trim();
  if (!input) return void 0;
  if (simpleColorPattern.test(input)) return input;
  const cached = normalizedColorCache.get(input);
  if (cached !== void 0 || normalizedColorCache.has(input)) return cached;
  let normalized;
  const parsed = parseFillStyle(input);
  if (parsed !== void 0) {
    if (simpleColorPattern.test(parsed)) {
      normalized = parsed;
    } else {
      const rgba = readPixelRgba(input);
      normalized = rgba ? serializeRgba(rgba) : void 0;
    }
  }
  normalizedColorCache.set(input, normalized);
  return normalized;
}
function parseCssColorToRgba(value) {
  const input = value.trim();
  if (!input) return void 0;
  const cached = parsedColorCache.get(input);
  if (cached !== void 0 || parsedColorCache.has(input)) return cached;
  let parsed;
  const fillStyle = parseFillStyle(input);
  if (fillStyle !== void 0) {
    parsed = rgbaFromNormalizedString(fillStyle) ?? readPixelRgba(input);
  }
  parsedColorCache.set(input, parsed);
  return parsed;
}
function isFullyTransparentColor(value) {
  const match = value.trim().match(/^rgba\([^)]*,\s*(-?\d*\.?\d+)\s*\)$/i);
  return match ? Number(match[1]) === 0 : false;
}

// src/tokenExport.ts
var tokenLayerOrder = {
  comp: 2,
  ref: 0,
  sys: 1
};
var tokenLayers = ["ref", "sys", "comp"];
var cssGenericFontFamilies = /* @__PURE__ */ new Set([
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "math",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif"
]);
function getCssFontFamilyCandidates(value) {
  const candidates = [];
  let buffer = "";
  let quote;
  let escaped = false;
  function pushCandidate() {
    const candidate = buffer.trim().replace(/^['\"]|['\"]$/g, "");
    buffer = "";
    if (!candidate || cssGenericFontFamilies.has(candidate.toLowerCase())) return;
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }
  for (const character of String(value ?? "")) {
    if (escaped) {
      buffer += character;
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = void 0;
      } else {
        buffer += character;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ",") {
      pushCandidate();
    } else {
      buffer += character;
    }
  }
  pushCandidate();
  return candidates;
}
function isFontFamilyTokenName(name) {
  return /-typeface(?:-|$)/.test(name) || /-font-family(?:-|$)/.test(name) || name.includes("-typescale-") && name.endsWith("-family");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getTokenFamily(name) {
  if (name.includes("-color-")) return "color";
  if (name.includes("-opacity-")) return "opacity";
  if (name.includes("-shadow-")) return "shadow";
  if (isFontFamilyTokenName(name) || name.includes("-typescale-") || name.includes("-weight-") || name.includes("-line-height")) {
    return "type";
  }
  if (name.includes("-spacing-")) return "spacing";
  if (name.includes("-shape-") || name.includes("-radius-")) return "shape";
  if (name.includes("-duration-") || name.includes("-easing-")) return "motion";
  if (name.includes("-size-")) return "size";
  return "other";
}
function normalizeTokenValue(value) {
  return value.trim().replace(/\s+/g, " ");
}
function collectCssCustomProperties() {
  const tokens = /* @__PURE__ */ new Map();
  const targetElements = [document.documentElement, document.body].filter(Boolean);
  function collectFromStyle(style, overwrite) {
    for (const property of Array.from(style)) {
      if (!property.startsWith("--")) continue;
      const value = style.getPropertyValue(property).trim();
      if (!value) continue;
      if (!overwrite && tokens.has(property)) continue;
      tokens.set(property, normalizeTokenValue(value));
    }
  }
  function ruleMatchesTokenTarget(rule) {
    return targetElements.some((element) => {
      try {
        return element.matches(rule.selectorText);
      } catch {
        return false;
      }
    });
  }
  function mediaRuleIsActive(rule) {
    try {
      return window.matchMedia(rule.conditionText).matches;
    } catch {
      return true;
    }
  }
  function collectRuleList(ruleList) {
    for (const rule of Array.from(ruleList)) {
      if (rule instanceof CSSStyleRule) {
        if (ruleMatchesTokenTarget(rule)) {
          collectFromStyle(rule.style, true);
        }
        continue;
      }
      if (rule instanceof CSSImportRule) {
        try {
          if (rule.styleSheet) collectRuleList(rule.styleSheet.cssRules);
        } catch {
        }
        continue;
      }
      if (rule instanceof CSSMediaRule && !mediaRuleIsActive(rule)) {
        continue;
      }
      if ("cssRules" in rule) {
        try {
          collectRuleList(rule.cssRules);
        } catch {
        }
      }
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectRuleList(sheet.cssRules);
    } catch {
    }
  }
  let adoptedSheets = [];
  try {
    adoptedSheets = Array.from(document.adoptedStyleSheets ?? []);
  } catch {
    adoptedSheets = [];
  }
  for (const sheet of adoptedSheets) {
    try {
      collectRuleList(sheet.cssRules);
    } catch {
    }
  }
  collectFromStyle(document.documentElement.style, true);
  if (document.body) collectFromStyle(document.body.style, true);
  collectFromStyle(window.getComputedStyle(document.documentElement), false);
  if (document.body) collectFromStyle(window.getComputedStyle(document.body), false);
  return tokens;
}
function getTokenLayer(name, prefix, layers) {
  for (const layer of tokenLayers) {
    const segment = layers[layer];
    if (name.startsWith(`--${prefix}-${segment}-`)) return layer;
  }
  return void 0;
}
function detectTokenPrefix(tokenNames, options) {
  if (options.tokenPrefix) return options.tokenPrefix;
  const candidates = /* @__PURE__ */ new Map();
  for (const name of tokenNames) {
    for (const layer of tokenLayers) {
      const segment = options.tokenLayers[layer];
      const match = name.match(new RegExp(`^--(.+?)-${escapeRegExp(segment)}-`));
      if (!match) continue;
      const prefix = match[1];
      const candidate = candidates.get(prefix) ?? {
        count: 0,
        layers: /* @__PURE__ */ new Set()
      };
      candidate.count += 1;
      candidate.layers.add(layer);
      candidates.set(prefix, candidate);
    }
  }
  if (candidates.size === 0) return void 0;
  const completeCandidates = Array.from(candidates.entries()).filter(([, candidate]) => tokenLayers.every((layer) => candidate.layers.has(layer))).sort(([, a], [, b]) => b.count - a.count);
  if (completeCandidates.length > 0) return completeCandidates[0][0];
  throw new Error(
    "Unable to detect a ref/sys/comp token prefix. Pass tokenPrefix in the Storybook Figma export addon options."
  );
}
var emptyTokenSystemPrefix = "";
function detectTokenSystem(options) {
  const customProperties = collectCssCustomProperties();
  const prefix = detectTokenPrefix(customProperties.keys(), options);
  if (prefix === void 0) {
    return {
      catalog: [],
      collections: options.collections,
      layers: options.tokenLayers,
      pluginDataKey: options.pluginDataKey,
      prefix: emptyTokenSystemPrefix
    };
  }
  const catalog = [];
  customProperties.forEach((value, name) => {
    const layer = getTokenLayer(name, prefix, options.tokenLayers);
    if (!layer) return;
    catalog.push({
      family: getTokenFamily(name),
      layer,
      name,
      value
    });
  });
  return {
    catalog,
    collections: options.collections,
    layers: options.tokenLayers,
    pluginDataKey: options.pluginDataKey,
    prefix
  };
}
function parseHexColor(value) {
  const normalized = value.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return void 0;
  const hex = match[1];
  const expanded = hex.length === 3 ? hex.split("").map((part) => `${part}${part}`).join("") : hex;
  const intValue = Number.parseInt(expanded, 16);
  return {
    r: (intValue >> 16 & 255) / 255,
    g: (intValue >> 8 & 255) / 255,
    b: (intValue & 255) / 255,
    a: 1
  };
}
function parseRawValue(value) {
  const trimmed = value.trim();
  const color = parseHexColor(trimmed);
  if (color) {
    return {
      type: "COLOR",
      value: color
    };
  }
  const px = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) {
    return {
      type: "FLOAT",
      value: Number(px[1])
    };
  }
  const number = trimmed.match(/^(-?\d+(?:\.\d+)?)$/);
  if (number) {
    return {
      type: "FLOAT",
      value: Number(number[1])
    };
  }
  if (trimmed === "true" || trimmed === "false") {
    return {
      type: "BOOLEAN",
      value: trimmed === "true"
    };
  }
  const cssColor = parseCssColorToRgba(trimmed);
  if (cssColor) {
    return {
      type: "COLOR",
      value: cssColor
    };
  }
  return {
    type: "STRING",
    value: trimmed.replace(/^["']|["']$/g, "")
  };
}
function getFallbackType(token) {
  if (token.family === "color") return "COLOR";
  if (token.family === "size" || token.family === "spacing" || token.family === "shape" || token.family === "opacity" || token.name.includes("-weight-") || token.name.includes("-typescale-")) {
    return "FLOAT";
  }
  return "STRING";
}
function getTokenType(token, tokenByName, tokenSystem, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(token.name)) return getFallbackType(token);
  seen.add(token.name);
  const alias = getAliasTokenName(token, tokenSystem);
  const aliasToken = alias ? tokenByName.get(alias) : void 0;
  if (aliasToken) return getTokenType(aliasToken, tokenByName, tokenSystem, seen);
  return parseRawValue(token.value).type;
}
function nameHasSegment(name, segment) {
  return name.includes(`-${segment}-`) || name.endsWith(`-${segment}`);
}
function getTokenScopes(token, type) {
  if (type === "COLOR") {
    return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  }
  if (type === "STRING") {
    if (isFontFamilyTokenName(token.name)) return ["FONT_FAMILY"];
    return ["TEXT_CONTENT"];
  }
  if (type !== "FLOAT") return [];
  if (nameHasSegment(token.name, "opacity")) return ["OPACITY"];
  if (nameHasSegment(token.name, "radius") || nameHasSegment(token.name, "shape")) {
    return ["CORNER_RADIUS"];
  }
  if (nameHasSegment(token.name, "spacing") || nameHasSegment(token.name, "gap")) {
    return ["GAP", "WIDTH_HEIGHT"];
  }
  if (nameHasSegment(token.name, "weight")) return ["FONT_WEIGHT"];
  if (token.name.includes("-line-height")) return ["LINE_HEIGHT"];
  if ((token.name.includes("-typescale-") || token.name.includes("-text-")) && nameHasSegment(token.name, "size")) {
    return ["FONT_SIZE"];
  }
  if (nameHasSegment(token.name, "size")) return ["WIDTH_HEIGHT"];
  return ["WIDTH_HEIGHT"];
}
function extractCssVariableNames(value, tokenSystem) {
  if (!tokenSystem.prefix) return [];
  const layerPattern = tokenLayers.map((layer) => escapeRegExp(tokenSystem.layers[layer])).join("|");
  const variablePattern = new RegExp(
    `var\\(\\s*(--${escapeRegExp(tokenSystem.prefix)}-(?:${layerPattern})-[a-z0-9-]+)`,
    "gi"
  );
  return Array.from(value.matchAll(variablePattern), (match) => match[1]);
}
function getAliasTokenName(token, tokenSystem) {
  return extractCssVariableNames(token.value, tokenSystem)[0];
}
function resolveTokenComparableValue(cssName, tokenSystem, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(cssName)) return void 0;
  seen.add(cssName);
  const token = tokenSystem.catalog.find((candidate) => candidate.name === cssName);
  if (!token) return void 0;
  const alias = getAliasTokenName(token, tokenSystem);
  if (alias) return resolveTokenComparableValue(alias, tokenSystem, seen);
  return { ...parseRawValue(token.value), raw: token.value };
}
function toFigmaVariableName(cssName) {
  return cssName.replace(/^--/, "").replaceAll("-", "/");
}
function getExportTokenValue(token, parsed) {
  if (parsed?.type === "STRING" && isFontFamilyTokenName(token.name)) {
    return getCssFontFamilyCandidates(token.value)[0] ?? "Inter";
  }
  if (token.family !== "opacity" || parsed?.type !== "FLOAT" || typeof parsed.value !== "number") {
    return parsed?.value;
  }
  return parsed.value >= 0 && parsed.value <= 1 ? parsed.value * 100 : parsed.value;
}
function toExportToken(token, tokenByName, tokenSystem) {
  const alias = getAliasTokenName(token, tokenSystem);
  const type = getTokenType(token, tokenByName, tokenSystem);
  const parsed = alias ? void 0 : parseRawValue(token.value);
  return {
    ...alias ? { alias } : { value: getExportTokenValue(token, parsed) },
    collection: token.layer,
    cssName: token.name,
    figmaName: toFigmaVariableName(token.name),
    rawValue: token.value,
    scopes: getTokenScopes(token, type),
    type
  };
}
function collectTokensForExport(cssNames, tokenSystem) {
  const visited = /* @__PURE__ */ new Set();
  const result = [];
  const tokenByName = new Map(
    tokenSystem.catalog.map((token) => [token.name, token])
  );
  function visit(cssName) {
    if (visited.has(cssName)) return;
    visited.add(cssName);
    const token = tokenByName.get(cssName);
    if (!token) return;
    const alias = getAliasTokenName(token, tokenSystem);
    if (alias) visit(alias);
    result.push(toExportToken(token, tokenByName, tokenSystem));
  }
  Array.from(cssNames).sort().forEach(visit);
  return result.sort((a, b) => {
    const byLayer = tokenLayerOrder[a.collection] - tokenLayerOrder[b.collection];
    if (byLayer !== 0) return byLayer;
    return a.figmaName.localeCompare(b.figmaName);
  });
}

// src/domExport.ts
var exportTraversalProgressIntervalMs = 160;
var exportTraversalYieldIntervalMs = 32;
var bindingProperties = {
  backgroundColor: ["background-color", "background"],
  borderColor: ["border-color", "border"],
  borderWidth: ["border-width", "border"],
  cornerRadius: ["border-radius"],
  fontFamily: ["font-family"],
  fontSize: ["font-size"],
  fontWeight: ["font-weight"],
  gap: ["gap", "column-gap", "row-gap"],
  height: ["block-size", "height"],
  lineHeight: ["line-height"],
  opacity: ["opacity"],
  paddingBottom: ["padding-bottom", "padding-block-end", "padding-block", "padding"],
  paddingLeft: ["padding-left", "padding-inline-start", "padding-inline", "padding"],
  paddingRight: ["padding-right", "padding-inline-end", "padding-inline", "padding"],
  paddingTop: ["padding-top", "padding-block-start", "padding-block", "padding"],
  textColor: ["color"],
  width: ["inline-size", "width"]
};
var transparentValues = /* @__PURE__ */ new Set([
  "rgba(0, 0, 0, 0)",
  "rgba(0,0,0,0)",
  "transparent"
]);
var inheritedBindings = /* @__PURE__ */ new Set([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textColor"
]);
var borderSides = ["top", "right", "bottom", "left"];
function getExportTime() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}
function waitForExportFrame() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      window.requestAnimationFrame(settle);
      globalThis.setTimeout(settle, 120);
      return;
    }
    globalThis.setTimeout(resolve, 0);
  });
}
async function markExportNodeVisited(traversalState) {
  traversalState.nodeCount += 1;
  const now = getExportTime();
  if (traversalState.onProgress && (traversalState.nodeCount === 1 || now - traversalState.lastProgressAt >= exportTraversalProgressIntervalMs)) {
    traversalState.lastProgressAt = now;
    traversalState.onProgress({
      nodeCount: traversalState.nodeCount,
      phase: "nodes"
    });
  }
  if (now - traversalState.lastYieldAt >= exportTraversalYieldIntervalMs) {
    await waitForExportFrame();
    traversalState.lastYieldAt = getExportTime();
  }
}
function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : fallback;
}
function cssLengthToNumber(value) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : void 0;
}
function cssPercentToNumber(value, basis) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  return match ? Number(match[1]) / 100 * basis : void 0;
}
function cssPositionToNumber(value, basis) {
  return cssLengthToNumber(value) ?? cssPercentToNumber(value, basis);
}
function cssMatrixTranslationToNumber(transform) {
  const matrix3d = transform.trim().match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values2 = matrix3d[1].split(",").map((value) => Number(value.trim()));
    if (values2.length === 16 && values2.every(Number.isFinite)) {
      return { x: values2[12], y: values2[13] };
    }
  }
  const matrix = transform.trim().match(/^matrix\((.+)\)$/);
  if (!matrix) return void 0;
  const values = matrix[1].split(",").map((value) => Number(value.trim()));
  if (values.length !== 6 || !values.every(Number.isFinite)) return void 0;
  return { x: values[4], y: values[5] };
}
function cssLineHeightToNumber(value) {
  if (value === "normal") return "normal";
  return cssLengthToNumber(value);
}
var identityAffine = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
var linearIdentityTolerance = 1e-3;
var rotationEmitThresholdRadians = 8e-3;
function parseCssTransformAffine(transform) {
  const normalized = transform.trim();
  if (!normalized || normalized === "none") return void 0;
  const matrix3d = normalized.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values2 = matrix3d[1].split(",").map((value) => Number(value.trim()));
    if (values2.length !== 16 || !values2.every(Number.isFinite)) return void 0;
    return {
      a: values2[0],
      b: values2[1],
      c: values2[4],
      d: values2[5],
      tx: values2[12],
      ty: values2[13]
    };
  }
  const matrix = normalized.match(/^matrix\((.+)\)$/);
  if (!matrix) return void 0;
  const values = matrix[1].split(",").map((value) => Number(value.trim()));
  if (values.length !== 6 || !values.every(Number.isFinite)) return void 0;
  return { a: values[0], b: values[1], c: values[2], d: values[3], tx: values[4], ty: values[5] };
}
function hasNonIdentityLinearPart(matrix) {
  if (!matrix) return false;
  return Math.abs(matrix.a - 1) > linearIdentityTolerance || Math.abs(matrix.b) > linearIdentityTolerance || Math.abs(matrix.c) > linearIdentityTolerance || Math.abs(matrix.d - 1) > linearIdentityTolerance;
}
function parseTransformOriginPoint(computed) {
  const parts = computed.transformOrigin.split(/\s+/).map((part) => Number.parseFloat(part));
  return {
    x: Number.isFinite(parts[0]) ? parts[0] : 0,
    y: Number.isFinite(parts[1]) ? parts[1] : 0
  };
}
function affineAboutOrigin(matrix, origin) {
  return {
    a: matrix.a,
    b: matrix.b,
    c: matrix.c,
    d: matrix.d,
    tx: origin.x - (matrix.a * origin.x + matrix.c * origin.y) + matrix.tx,
    ty: origin.y - (matrix.b * origin.x + matrix.d * origin.y) + matrix.ty
  };
}
function composeAffine(outer, inner) {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    tx: outer.a * inner.tx + outer.c * inner.ty + outer.tx,
    ty: outer.b * inner.tx + outer.d * inner.ty + outer.ty
  };
}
function getUntransformedBoxSize(element, rect) {
  if (element instanceof HTMLElement && element.offsetWidth > 0 && element.offsetHeight > 0) {
    return { height: element.offsetHeight, width: element.offsetWidth };
  }
  if (element.clientWidth > 0 && element.clientHeight > 0) {
    return { height: element.clientHeight, width: element.clientWidth };
  }
  return { height: rect.height, width: rect.width };
}
function resolveElementTransformGeometry(element, computed, rect, parentRect, parentClientTransform) {
  const ownMatrix = parseCssTransformAffine(computed.transform);
  const ownLinearActive = hasNonIdentityLinearPart(ownMatrix);
  if (!parentClientTransform && !ownLinearActive) return void 0;
  const box = getUntransformedBoxSize(element, rect);
  if (box.width <= 0 || box.height <= 0) return void 0;
  const ownAffine = ownLinearActive && ownMatrix ? affineAboutOrigin(ownMatrix, parseTransformOriginPoint(computed)) : identityAffine;
  const parentTransform = parentClientTransform ?? {
    ...identityAffine,
    tx: parentRect.left,
    ty: parentRect.top
  };
  const linear = composeAffine(parentTransform, ownAffine);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const [cornerX, cornerY] of [
    [0, 0],
    [box.width, 0],
    [box.width, box.height],
    [0, box.height]
  ]) {
    minX = Math.min(minX, linear.a * cornerX + linear.c * cornerY);
    minY = Math.min(minY, linear.b * cornerX + linear.d * cornerY);
  }
  const clientTransform = {
    a: linear.a,
    b: linear.b,
    c: linear.c,
    d: linear.d,
    tx: rect.left - minX,
    ty: rect.top - minY
  };
  const cumulativeScaleX = Math.hypot(clientTransform.a, clientTransform.b);
  const cumulativeDet = clientTransform.a * clientTransform.d - clientTransform.b * clientTransform.c;
  if (cumulativeScaleX < 1e-6 || cumulativeDet <= 0) return void 0;
  const cumulativeScaleY = cumulativeDet / cumulativeScaleX;
  const parentScaleX = Math.hypot(parentTransform.a, parentTransform.b);
  const parentDet = parentTransform.a * parentTransform.d - parentTransform.b * parentTransform.c;
  if (parentScaleX < 1e-6 || parentDet <= 0) return void 0;
  const rotation = Math.atan2(clientTransform.b, clientTransform.a);
  const parentRotation = Math.atan2(parentTransform.b, parentTransform.a);
  const relativeRotation = rotation - parentRotation;
  const width = toFiniteNumber(box.width * cumulativeScaleX);
  const height = toFiniteNumber(box.height * cumulativeScaleY);
  const deltaX = clientTransform.tx - parentTransform.tx;
  const deltaY = clientTransform.ty - parentTransform.ty;
  const parentCos = Math.cos(parentRotation);
  const parentSin = Math.sin(parentRotation);
  const x = toFiniteNumber(parentCos * deltaX + parentSin * deltaY);
  const y = toFiniteNumber(-parentSin * deltaX + parentCos * deltaY);
  const matrixComponent = (value) => Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : 0;
  const cos = Math.cos(relativeRotation);
  const sin = Math.sin(relativeRotation);
  const hasRotation = Math.abs(relativeRotation) > rotationEmitThresholdRadians;
  return {
    clientTransform,
    fontScale: cumulativeScaleY,
    height,
    scaleX: cumulativeScaleX,
    scaleY: cumulativeScaleY,
    ...hasRotation ? {
      transformMatrix: [
        [matrixComponent(cos), matrixComponent(-sin), x],
        [matrixComponent(sin), matrixComponent(cos), y]
      ]
    } : {},
    width,
    x,
    y
  };
}
function cssColorValue(value) {
  const normalized = value.trim();
  if (!normalized || transparentValues.has(normalized)) return void 0;
  const canonical = normalizeCssColorString(normalized) ?? normalized;
  if (transparentValues.has(canonical) || isFullyTransparentColor(canonical)) {
    return void 0;
  }
  return canonical;
}
function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}
function splitGradientArguments(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
function parseLinearGradientAngle(value, width, height) {
  if (!value) return void 0;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const degree = normalized.match(/^(-?\d*\.?\d+)(deg|grad|rad|turn)$/);
  if (degree) {
    const amount = Number(degree[1]);
    if (degree[2] === "grad") return amount * 0.9;
    if (degree[2] === "rad") return amount * 180 / Math.PI;
    if (degree[2] === "turn") return amount * 360;
    return amount;
  }
  if (normalized === "to right") return 90;
  if (normalized === "to bottom") return 180;
  if (normalized === "to left") return 270;
  if (normalized === "to top") return 0;
  const cornerAngle = width > 0 && height > 0 ? Math.atan2(height, width) * 180 / Math.PI : 45;
  if (normalized === "to top right" || normalized === "to right top") {
    return cornerAngle;
  }
  if (normalized === "to bottom right" || normalized === "to right bottom") {
    return 180 - cornerAngle;
  }
  if (normalized === "to bottom left" || normalized === "to left bottom") {
    return 180 + cornerAngle;
  }
  if (normalized === "to top left" || normalized === "to left top") {
    return 360 - cornerAngle;
  }
  return void 0;
}
function parseGradientStop(value, index, total) {
  const colorMatch = value.trim().match(/^(#[0-9a-f]{3,8}|[a-z][a-z-]*\((?:[^()]|\([^()]*\))*\))/i);
  if (!colorMatch) return void 0;
  const color = cssColorValue(colorMatch[1]);
  if (!color) return void 0;
  const positionMatch = value.slice(colorMatch[1].length).match(/(-?\d*\.?\d+)%/);
  const position = positionMatch ? clampUnit(Number(positionMatch[1]) / 100) : total > 1 ? index / (total - 1) : 0;
  return { color, position };
}
function parseLinearGradient(layer, width, height) {
  const match = layer.trim().match(/^linear-gradient\((.*)\)$/i);
  if (!match) return void 0;
  const parts = splitGradientArguments(match[1]);
  if (parts.length < 2) return void 0;
  const angle = parseLinearGradientAngle(parts[0], width, height);
  const stopParts = angle === void 0 ? parts : parts.slice(1);
  const stops = stopParts.map((part, index) => parseGradientStop(part, index, stopParts.length)).filter((stop) => Boolean(stop));
  return stops.length >= 2 ? { angle: angle ?? 180, stops } : void 0;
}
function parseRadialGradient(layer) {
  const match = layer.trim().match(/^radial-gradient\((.*)\)$/i);
  if (!match) return void 0;
  const parts = splitGradientArguments(match[1]);
  if (parts.length < 2) return void 0;
  const stopParts = parseGradientStop(parts[0], 0, parts.length) === void 0 ? parts.slice(1) : parts;
  const stops = stopParts.map((part, index) => parseGradientStop(part, index, stopParts.length)).filter((stop) => Boolean(stop));
  return stops.length >= 2 ? { stops } : void 0;
}
function getBackgroundImageLayers(backgroundImage) {
  const normalized = backgroundImage.trim();
  if (!normalized || normalized === "none") return [];
  return splitGradientArguments(normalized).filter((layer) => layer !== "none");
}
function getBackgroundImageUrl(layer) {
  const match = layer.trim().match(/^url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)$/i);
  if (!match) return void 0;
  const url = match[1] ?? match[2] ?? match[3];
  return url && !url.startsWith("data:image/svg") ? url : void 0;
}
function getBackgroundScaleMode(computed) {
  const size = (computed.backgroundSize || "").trim().toLowerCase();
  return size === "contain" ? "FIT" : "FILL";
}
function parseShadowListToEffects(value) {
  const normalized = value.trim();
  if (!normalized || normalized === "none") return [];
  const effects = [];
  for (const part of splitGradientArguments(normalized)) {
    const inset = /\binset\b/.test(part);
    let rest = part.replace(/\binset\b/g, " ");
    const colorMatch = rest.match(
      /(#[0-9a-f]{3,8}|[a-z][a-z-]*\((?:[^()]|\([^()]*\))*\))/i
    );
    if (!colorMatch) continue;
    rest = rest.replace(colorMatch[1], " ");
    const color = cssColorValue(colorMatch[1]);
    if (!color) continue;
    const lengths = Array.from(
      rest.matchAll(/(-?\d*\.?\d+)px/g),
      (match) => Number(match[1])
    );
    const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = lengths;
    effects.push({
      blur: toFiniteNumber(blur),
      color,
      offsetX: toFiniteNumber(offsetX),
      offsetY: toFiniteNumber(offsetY),
      spread: toFiniteNumber(spread),
      type: inset ? "INNER_SHADOW" : "DROP_SHADOW"
    });
  }
  return effects;
}
function getBoxShadowEffects(computed) {
  return parseShadowListToEffects(computed.boxShadow);
}
function getTextShadowEffects(computed) {
  return parseShadowListToEffects(computed.textShadow);
}
function parseFilterBlurRadius(filterValue) {
  const normalized = filterValue.trim();
  if (!normalized || normalized === "none") return void 0;
  const match = normalized.match(/(?:^|\s)blur\(\s*(-?\d*\.?\d+)px\s*\)/i);
  if (!match) return void 0;
  const radius = Number(match[1]);
  return Number.isFinite(radius) && radius > 0 ? toFiniteNumber(radius) : void 0;
}
function getBlurEffects(computed) {
  const effects = [];
  const layerBlur = parseFilterBlurRadius(computed.filter ?? "");
  if (layerBlur !== void 0) {
    effects.push({
      blur: layerBlur,
      offsetX: 0,
      offsetY: 0,
      spread: 0,
      type: "LAYER_BLUR"
    });
  }
  const backdropValue = computed.backdropFilter || computed.getPropertyValue("-webkit-backdrop-filter") || "";
  const backgroundBlur = parseFilterBlurRadius(backdropValue);
  if (backgroundBlur !== void 0) {
    effects.push({
      blur: backgroundBlur,
      offsetX: 0,
      offsetY: 0,
      spread: 0,
      type: "BACKGROUND_BLUR"
    });
  }
  return effects;
}
function cssRadiusToNumber(value, width, height) {
  const length = cssLengthToNumber(value);
  if (length !== void 0) return length;
  const percent = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    return toFiniteNumber(Number(percent[1]) / 100 * Math.min(width, height));
  }
  return 0;
}
function getRadiusStyles(computed, width, height) {
  const topLeft = cssRadiusToNumber(computed.borderTopLeftRadius, width, height);
  const topRight = cssRadiusToNumber(computed.borderTopRightRadius, width, height);
  const bottomRight = cssRadiusToNumber(
    computed.borderBottomRightRadius,
    width,
    height
  );
  const bottomLeft = cssRadiusToNumber(
    computed.borderBottomLeftRadius,
    width,
    height
  );
  if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
    return topLeft > 0 ? { radius: topLeft } : {};
  }
  return { radiusCorners: { bottomLeft, bottomRight, topLeft, topRight } };
}
function isColorTokenName(token) {
  return token.includes("-color-") || token.endsWith("-color");
}
function findLinearGradientTokens(declarations, tokenSystem) {
  if (!tokenSystem.prefix) return [];
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!["background", "background-image"].includes(declaration.property)) {
      continue;
    }
    if (!declaration.value.includes("linear-gradient")) continue;
    const tokens = extractCssVariableNames(declaration.value, tokenSystem).filter(
      isColorTokenName
    );
    if (tokens.length >= 2) return tokens;
  }
  return [];
}
function addLinearGradientStopTokens(gradient, declarations, tokenSystem) {
  if (!gradient) return void 0;
  const tokens = findLinearGradientTokens(declarations, tokenSystem);
  if (tokens.length === 0) return gradient;
  return {
    ...gradient,
    stops: gradient.stops.map((stop, index) => ({
      ...stop,
      ...tokens[index] ? { token: tokens[index] } : {}
    }))
  };
}
function cssBorderWidth(computed, side) {
  return cssLengthToNumber(computed.getPropertyValue(`border-${side}-width`)) ?? 0;
}
function cssBorderStyle(computed, side) {
  return computed.getPropertyValue(`border-${side}-style`).trim();
}
function cssBorderColor(computed, side) {
  return computed.getPropertyValue(`border-${side}-color`).trim();
}
function isVisibleBorderSide(computed, side) {
  const width = cssBorderWidth(computed, side);
  const style = cssBorderStyle(computed, side);
  return width > 0 && style !== "none" && style !== "hidden";
}
function getUniformVisibleBorder(computed) {
  const visibleSides = borderSides.filter((side) => isVisibleBorderSide(computed, side));
  if (visibleSides.length !== borderSides.length) return void 0;
  const width = cssBorderWidth(computed, "top");
  const style = cssBorderStyle(computed, "top");
  const color = cssColorValue(cssBorderColor(computed, "top"));
  if (!color) return void 0;
  const isUniform = borderSides.every(
    (side) => cssBorderWidth(computed, side) === width && cssBorderStyle(computed, side) === style && cssBorderColor(computed, side) === cssBorderColor(computed, "top")
  );
  if (!isUniform) return void 0;
  return {
    color,
    width,
    ...style === "dashed" || style === "dotted" ? { style } : {}
  };
}
function getElementName(element, options) {
  const component = element.getAttribute("data-component");
  const variant = element.getAttribute("data-variant");
  const icon = element.getAttribute("data-icon");
  const classNames = Array.from(element.classList);
  const preferredClassName = options.componentClassPrefixes.length ? classNames.find(
    (name) => options.componentClassPrefixes.some((prefix) => name.startsWith(prefix))
  ) : void 0;
  const className = preferredClassName ?? classNames[0];
  const base = component || icon || className || element.tagName.toLowerCase();
  return variant ? `${base}/${variant}` : base;
}
function toComponentKey(value) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "component";
}
function toComponentLabel(value) {
  return value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\b[a-z]/g, (match) => match.toUpperCase());
}
function getComponentReference(element, fallbackName) {
  const sourceName = element.getAttribute("data-component");
  if (!sourceName && !fallbackName) return void 0;
  const variant = element.getAttribute("data-figma-variant") || element.getAttribute("data-variant") || void 0;
  const source = sourceName || fallbackName || "component";
  const name = fallbackName || toComponentLabel(source);
  const baseKey = toComponentKey(source);
  const key = variant ? `${baseKey}--${toComponentKey(variant)}` : baseKey;
  return {
    key,
    name,
    sourceName: source,
    ...variant ? { variant, variantProperties: { Variant: variant } } : {}
  };
}
function getArtifactKind(storyTitle) {
  return storyTitle.startsWith("Pages/") ? "page" : "component";
}
function hasComponentReference(node) {
  return Boolean(node.component) || node.children.some(hasComponentReference);
}
function stripComponentReferences(node) {
  delete node.component;
  node.children.forEach(stripComponentReferences);
}
function isAbsoluteFidelityRoot(element, options) {
  const component = element.getAttribute("data-component");
  return Boolean(component && options.absoluteFidelityComponents.has(component));
}
function isFlexDisplay(display) {
  return display.includes("flex");
}
function isOutOfFlowPositioned(computed) {
  return computed.position === "absolute" || computed.position === "fixed";
}
function isFlexItem(element, computed) {
  if (isOutOfFlowPositioned(computed)) return false;
  const parentElement = element.parentElement;
  if (!parentElement) return false;
  return isFlexDisplay(window.getComputedStyle(parentElement).display);
}
function getLayoutStrategy(element, computed, forceAbsoluteLayout) {
  if (forceAbsoluteLayout) return "absolute";
  return isFlexDisplay(computed.display) || isFlexItem(element, computed) ? "autoLayout" : "absolute";
}
function getExportDisplay(computed, layoutStrategy) {
  if (layoutStrategy === "absolute" && isFlexDisplay(computed.display)) {
    return "block";
  }
  return computed.display;
}
function escapeSvgAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function normalizeSvgStrokeDashValue(value) {
  const normalized = value.trim();
  if (!normalized || normalized === "none") return void 0;
  return normalized.replace(/(-?\d+(?:\.\d+)?)px\b/g, "$1");
}
function serializeInlineSvg(element, width, height) {
  const clone = element.cloneNode(true);
  const originalNodes = [element, ...Array.from(element.querySelectorAll("*"))];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.hasAttribute("viewBox")) {
    const intrinsicWidth = Number.parseFloat(element.getAttribute("width") ?? "");
    const intrinsicHeight = Number.parseFloat(element.getAttribute("height") ?? "");
    if (intrinsicWidth > 0 && intrinsicHeight > 0) {
      clone.setAttribute("viewBox", `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
    }
  }
  clonedNodes.forEach((clonedNode, index) => {
    const originalNode = originalNodes[index];
    if (!(originalNode instanceof Element) || !(clonedNode instanceof Element)) return;
    const originalStyle = window.getComputedStyle(originalNode);
    const fill = cssColorValue(originalStyle.fill);
    const stroke = cssColorValue(originalStyle.stroke);
    const strokeWidth = originalStyle.strokeWidth;
    const strokeLinecap = originalStyle.strokeLinecap;
    const strokeLinejoin = originalStyle.strokeLinejoin;
    const strokeDasharray = normalizeSvgStrokeDashValue(
      originalStyle.strokeDasharray
    );
    const strokeDashoffset = normalizeSvgStrokeDashValue(
      originalStyle.strokeDashoffset
    );
    const fillOpacity = originalStyle.fillOpacity;
    const strokeOpacity = originalStyle.strokeOpacity;
    const nodeOpacity = originalStyle.opacity;
    if (fill) clonedNode.setAttribute("fill", fill);
    if (originalStyle.fill === "none") clonedNode.setAttribute("fill", "none");
    if (stroke) clonedNode.setAttribute("stroke", stroke);
    if (strokeWidth && strokeWidth !== "0px") {
      clonedNode.setAttribute("stroke-width", strokeWidth.replace("px", ""));
    }
    if (strokeLinecap) clonedNode.setAttribute("stroke-linecap", strokeLinecap);
    if (strokeLinejoin) clonedNode.setAttribute("stroke-linejoin", strokeLinejoin);
    if (strokeDasharray) clonedNode.setAttribute("stroke-dasharray", strokeDasharray);
    if (strokeDashoffset) clonedNode.setAttribute("stroke-dashoffset", strokeDashoffset);
    if (fillOpacity && fillOpacity !== "1") {
      clonedNode.setAttribute("fill-opacity", fillOpacity);
    }
    if (strokeOpacity && strokeOpacity !== "1") {
      clonedNode.setAttribute("stroke-opacity", strokeOpacity);
    }
    if (clonedNode !== clone && nodeOpacity && nodeOpacity !== "1") {
      clonedNode.setAttribute("opacity", nodeOpacity);
    }
  });
  return clone.outerHTML;
}
function splitTopLevelComma(value) {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "," && depth === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
    }
  }
  return [value.trim(), void 0];
}
function resolveCssVarInSvgValue(value, fallbackValue = "#000000") {
  let result = "";
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf("var(", cursor);
    if (start === -1) {
      result += value.slice(cursor);
      break;
    }
    result += value.slice(cursor, start);
    let depth = 0;
    let end = start;
    for (; end < value.length; end += 1) {
      const character = value[end];
      if (character === "(") depth += 1;
      if (character === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (end >= value.length) {
      result += fallbackValue;
      break;
    }
    const content = value.slice(start + 4, end);
    const [propertyName, fallback] = splitTopLevelComma(content);
    const resolved = document.documentElement.style.getPropertyValue(propertyName).trim() || window.getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim() || (document.body ? window.getComputedStyle(document.body).getPropertyValue(propertyName).trim() : "") || fallback || fallbackValue;
    result += resolved.trim();
    cursor = end + 1;
  }
  return result;
}
function sanitizeSvgTextForFigma(svgText) {
  if (!svgText.includes("var(")) return svgText;
  try {
    const documentValue = new DOMParser().parseFromString(svgText, "image/svg+xml");
    if (documentValue.querySelector("parsererror")) {
      return resolveCssVarInSvgValue(svgText);
    }
    documentValue.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (!attribute.value.includes("var(")) return;
        element.setAttribute(attribute.name, resolveCssVarInSvgValue(attribute.value));
      });
    });
    return new XMLSerializer().serializeToString(documentValue.documentElement);
  } catch {
    return resolveCssVarInSvgValue(svgText);
  }
}
function parsePolygonPoint(value, size) {
  const normalized = value.trim();
  if (normalized.endsWith("%")) {
    return Number(normalized.slice(0, -1)) / 100 * size;
  }
  return Number(normalized.replace("px", ""));
}
function getPolygonPoints(clipPath, width, height) {
  const match = clipPath.trim().match(/^polygon\((.+)\)$/);
  if (!match) return void 0;
  const points = match[1].split(",").map((point) => point.trim().split(/\s+/)).filter((parts) => parts.length >= 2).map(([xValue, yValue]) => {
    const x = toFiniteNumber(parsePolygonPoint(xValue, width));
    const y = toFiniteNumber(parsePolygonPoint(yValue, height));
    return `${x},${y}`;
  });
  return points.length >= 3 ? points.join(" ") : void 0;
}
function createClipPathSvgNode(element, computed, rect, parentRect, rules, tokenSystem, options) {
  if (!computed.clipPath || computed.clipPath === "none") return void 0;
  const width = toFiniteNumber(rect.width);
  const height = toFiniteNumber(rect.height);
  const points = getPolygonPoints(computed.clipPath, width, height);
  if (!points) return void 0;
  const fill = cssColorValue(computed.backgroundColor) ?? cssColorValue(computed.color);
  if (!fill) return void 0;
  const transform = computed.transform && computed.transform.startsWith("matrix(-1") ? ` transform="rotate(180 ${width / 2} ${height / 2})"` : "";
  const layoutStrategy = element.getAttribute("data-figma-layout-strategy") === "auto-layout" || isFlexItem(element, computed) ? "autoLayout" : "absolute";
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polygon points="${escapeSvgAttribute(points)}" fill="${escapeSvgAttribute(fill)}"${transform}/></svg>`;
  return {
    bindings: collectBindings(element, rules, false, tokenSystem),
    children: [],
    kind: "svg",
    layoutStrategy,
    name: getElementName(element, options),
    svgText,
    styles: {
      display: computed.display,
      height,
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      width,
      x: toFiniteNumber(rect.left - parentRect.left),
      y: toFiniteNumber(rect.top - parentRect.top)
    }
  };
}
function createInlineSvgNode(element, computed, rect, parentRect, options, geometry) {
  const width = toFiniteNumber(geometry?.width ?? rect.width);
  const height = toFiniteNumber(geometry?.height ?? rect.height);
  const component = getComponentReference(element);
  return {
    bindings: {},
    children: [],
    ...component ? { component } : {},
    kind: "svg",
    layoutStrategy: "absolute",
    name: getElementName(element, options),
    svgText: serializeInlineSvg(element, width, height),
    styles: {
      display: computed.display,
      height,
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      ...geometry?.transformMatrix ? { transformMatrix: geometry.transformMatrix } : {},
      width,
      x: geometry ? geometry.x : toFiniteNumber(rect.left - parentRect.left),
      y: geometry ? geometry.y : toFiniteNumber(rect.top - parentRect.top)
    }
  };
}
function mediaRuleMatches(rule) {
  try {
    return window.matchMedia(rule.conditionText).matches;
  } catch {
    return true;
  }
}
function collectRulesFromStyleSheets(sheets) {
  const rules = [];
  function collect(ruleList) {
    for (const rule of Array.from(ruleList)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
        continue;
      }
      if (rule instanceof CSSMediaRule && !mediaRuleMatches(rule)) {
        continue;
      }
      if ("cssRules" in rule) {
        try {
          collect(rule.cssRules);
        } catch {
        }
      }
    }
  }
  for (const sheet of sheets) {
    try {
      collect(sheet.cssRules);
    } catch {
    }
  }
  return rules;
}
function getDocumentAdoptedStyleSheets() {
  try {
    return Array.from(document.adoptedStyleSheets ?? []);
  } catch {
    return [];
  }
}
function createCssRuleIndex() {
  return {
    documentRules: collectRulesFromStyleSheets([
      ...Array.from(document.styleSheets),
      ...getDocumentAdoptedStyleSheets()
    ]),
    rulesByShadowRoot: /* @__PURE__ */ new Map()
  };
}
function getRulesForElement(index, element) {
  const root = element.getRootNode();
  if (!(root instanceof ShadowRoot)) return index.documentRules;
  let combined = index.rulesByShadowRoot.get(root);
  if (!combined) {
    let adopted = [];
    try {
      adopted = Array.from(root.adoptedStyleSheets ?? []);
    } catch {
      adopted = [];
    }
    combined = index.documentRules.concat(
      collectRulesFromStyleSheets([...Array.from(root.styleSheets), ...adopted])
    );
    index.rulesByShadowRoot.set(root, combined);
  }
  return combined;
}
function getRenderChildren(element) {
  const shadowRoot = element.shadowRoot;
  const baseChildren = shadowRoot ? Array.from(shadowRoot.children) : Array.from(element.children);
  const expanded = [];
  for (const child of baseChildren) {
    if (child instanceof HTMLSlotElement) {
      const assigned = child.assignedElements({ flatten: true });
      expanded.push(...assigned.length > 0 ? assigned : Array.from(child.children));
      continue;
    }
    if (window.getComputedStyle(child).display === "contents") {
      expanded.push(...getRenderChildren(child));
      continue;
    }
    expanded.push(child);
  }
  return expanded;
}
function calculateSelectorSpecificity(selector) {
  const withoutPseudoElements = selector.replace(/::[a-z-]+(\([^)]*\))?/gi, " x");
  const ids = withoutPseudoElements.match(/#[\w-]+/g)?.length ?? 0;
  const classLike = withoutPseudoElements.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(\([^)]*\))?/g)?.length ?? 0;
  const typeLike = withoutPseudoElements.match(/(^|[\s>+~(,])[a-z][\w-]*/gi)?.length ?? 0;
  const pseudoElements = selector.match(/::[a-z-]+/gi)?.length ?? 0;
  return ids * 1e6 + classLike * 1e3 + typeLike + pseudoElements;
}
function getMatchedSelectorSpecificity(element, selectorText) {
  let best;
  for (const selector of selectorText.split(",")) {
    const trimmed = selector.trim();
    if (!trimmed || trimmed.includes(":hover") || trimmed.includes(":focus")) {
      continue;
    }
    try {
      if (!element.matches(trimmed)) continue;
    } catch {
      continue;
    }
    const specificity = calculateSelectorSpecificity(trimmed);
    if (best === void 0 || specificity > best) best = specificity;
  }
  return best;
}
function parseCssTextDeclarations(cssText) {
  const declarations = [];
  let current = "";
  let depth = 0;
  const chunks = [];
  for (const character of cssText) {
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === ";" && depth === 0) {
      chunks.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) chunks.push(current);
  chunks.forEach((chunk) => {
    const separatorIndex = chunk.indexOf(":");
    if (separatorIndex === -1) return;
    const property = chunk.slice(0, separatorIndex).trim();
    const value = chunk.slice(separatorIndex + 1).trim();
    if (!property || !value) return;
    declarations.push({ property, value });
  });
  return declarations;
}
function getMatchedDeclarations(element, rules) {
  const collected = [];
  let order = 0;
  const push = (property, value, specificity) => {
    collected.push({ order: order += 1, property, specificity, value });
  };
  for (const rule of rules) {
    const specificity = getMatchedSelectorSpecificity(element, rule.selectorText);
    if (specificity === void 0) continue;
    for (const property of Array.from(rule.style)) {
      push(property, rule.style.getPropertyValue(property).trim(), specificity);
    }
    for (const declaration of parseCssTextDeclarations(rule.style.cssText)) {
      push(declaration.property, declaration.value, specificity);
    }
  }
  const inlineStyle = element.getAttribute("style");
  if (inlineStyle && element instanceof HTMLElement) {
    for (const declaration of parseCssTextDeclarations(element.style.cssText)) {
      push(declaration.property, declaration.value, Number.MAX_SAFE_INTEGER);
    }
    for (const property of Array.from(element.style)) {
      push(
        property,
        element.style.getPropertyValue(property).trim(),
        Number.MAX_SAFE_INTEGER
      );
    }
  }
  return collected.sort((a, b) => a.specificity - b.specificity || a.order - b.order).map(({ property, value }) => ({ property, value }));
}
function findTokenForProperty(declarations, bindingName, tokenSystem) {
  const properties = bindingProperties[bindingName];
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!properties.includes(declaration.property)) continue;
    const tokens = extractCssVariableNames(declaration.value, tokenSystem);
    if (tokens.length === 0) return void 0;
    if (declaration.property === "padding") {
      if (bindingName === "paddingTop" || bindingName === "paddingBottom") {
        return tokens[0];
      }
      if (bindingName === "paddingLeft" || bindingName === "paddingRight") {
        return tokens[1] || tokens[0];
      }
    }
    if (declaration.property === "padding-inline") {
      if (bindingName === "paddingLeft" || bindingName === "paddingRight") {
        return tokens[0];
      }
    }
    if (declaration.property === "padding-block") {
      if (bindingName === "paddingTop" || bindingName === "paddingBottom") {
        return tokens[0];
      }
    }
    if (declaration.property === "border") {
      if (bindingName === "borderColor") {
        return tokens.find(isColorTokenName);
      }
      if (bindingName === "borderWidth") {
        return tokens.find((token) => !isColorTokenName(token)) || tokens[0];
      }
    }
    if (bindingName === "backgroundColor" || bindingName === "textColor") {
      return tokens.find(isColorTokenName) || tokens[0];
    }
    return tokens[0];
  }
  return void 0;
}
function pickBindings(bindings, names) {
  const picked = {};
  names.forEach((name) => {
    const token = bindings[name];
    if (token) picked[name] = token;
  });
  return picked;
}
function justifyContentFromTextAlign(textAlign) {
  const normalized = textAlign.trim().toLowerCase();
  if (normalized === "center") return "center";
  if (normalized === "right" || normalized === "end") return "flex-end";
  return "flex-start";
}
function hasFixedFlexBasis(computed) {
  if (!computed.flexBasis || computed.flexBasis === "auto" || computed.flexBasis === "content") {
    return false;
  }
  return cssLengthToNumber(computed.flexBasis) !== void 0;
}
function isClippedSingleLineText(computed) {
  const overflowX = computed.overflowX.toLowerCase();
  const overflow = computed.overflow.toLowerCase();
  const textOverflow = computed.textOverflow.toLowerCase();
  const whiteSpace = computed.whiteSpace.toLowerCase();
  const clipsInline = overflowX === "hidden" || overflowX === "clip" || overflow === "hidden" || overflow === "clip";
  return clipsInline && textOverflow === "ellipsis" && whiteSpace === "nowrap";
}
function getLineClampCount(computed) {
  if (isClippedSingleLineText(computed)) return 1;
  const clampValue = computed.getPropertyValue("-webkit-line-clamp").trim();
  const clamp = Number.parseInt(clampValue, 10);
  if (!Number.isFinite(clamp) || clamp < 1) return void 0;
  const overflowTokens = `${computed.overflow} ${computed.overflowY}`.toLowerCase();
  return /(hidden|clip)/.test(overflowTokens) ? clamp : void 0;
}
function isRenderedMultilineText(computed, height) {
  if (computed.whiteSpace.toLowerCase().includes("nowrap")) return false;
  const fontSize = cssLengthToNumber(computed.fontSize) ?? 14;
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  const lineHeightPx = typeof lineHeight === "number" && lineHeight > 0 ? lineHeight : fontSize * 1.2;
  return height >= lineHeightPx * 1.8;
}
function shouldAutoResizeText(element, computed) {
  if (isFlexItem(element, computed)) {
    if (hasFixedFlexBasis(computed)) return false;
    return Number.parseFloat(computed.flexGrow || "0") === 0;
  }
  return true;
}
function getTextAutoResize(element, computed, height) {
  if (getLineClampCount(computed) !== void 0) return void 0;
  if (element.getAttribute("data-figma-text-auto-width") === "true") {
    return "WIDTH_AND_HEIGHT";
  }
  if (isRenderedMultilineText(computed, height)) return "HEIGHT";
  return shouldAutoResizeText(element, computed) ? "WIDTH_AND_HEIGHT" : void 0;
}
function getLayoutAlign(element) {
  return element.getAttribute("data-figma-layout-align") === "stretch" ? "STRETCH" : void 0;
}
var verticalSizeProperties = [
  "height",
  "block-size",
  "min-height",
  "min-block-size"
];
var horizontalSizeProperties = [
  "width",
  "inline-size",
  "min-width",
  "min-inline-size"
];
function hasExplicitSizeDeclaration(declarations, properties) {
  return declarations.some(
    (declaration) => properties.includes(declaration.property) && declaration.value.trim().toLowerCase() !== "auto"
  );
}
function isStretchAlignment(value) {
  return value === "stretch" || value === "normal";
}
function getResolvedFlexAlignment(element, computed) {
  const alignSelf = computed.alignSelf;
  if (alignSelf && alignSelf !== "auto") return alignSelf;
  const parentElement = element.parentElement;
  if (!parentElement) return "auto";
  return window.getComputedStyle(parentElement).alignItems || "auto";
}
function getFlexParentCrossAxisInfo(element, computed) {
  if (!isFlexItem(element, computed)) return void 0;
  const parentElement = element.parentElement;
  if (!parentElement) return void 0;
  const parentComputed = window.getComputedStyle(parentElement);
  if (!isFlexDisplay(parentComputed.display)) return void 0;
  return {
    crossAxis: parentComputed.flexDirection.startsWith("column") ? "horizontal" : "vertical",
    stretched: isStretchAlignment(getResolvedFlexAlignment(element, computed))
  };
}
function getInferredFrameLayoutAlign(element, computed, declarations) {
  const crossAxisInfo = getFlexParentCrossAxisInfo(element, computed);
  if (!crossAxisInfo || !crossAxisInfo.stretched) return void 0;
  const crossSizeProperties = crossAxisInfo.crossAxis === "horizontal" ? horizontalSizeProperties : verticalSizeProperties;
  if (hasExplicitSizeDeclaration(declarations, crossSizeProperties)) {
    return void 0;
  }
  return "STRETCH";
}
function getLayoutSizingVertical(element, computed, bindings, declarations) {
  if (bindings.height) return void 0;
  if (hasExplicitSizeDeclaration(declarations, verticalSizeProperties)) {
    return void 0;
  }
  if (element.getAttribute("data-figma-layout-sizing-vertical") === "hug") {
    return "HUG";
  }
  if (!isFlexDisplay(computed.display)) return void 0;
  const crossAxisInfo = getFlexParentCrossAxisInfo(element, computed);
  if (crossAxisInfo?.crossAxis === "vertical" && crossAxisInfo.stretched) {
    return void 0;
  }
  return "HUG";
}
function getLayoutGrow(element, computed) {
  if (element.getAttribute("data-figma-layout-grow") === "1") return 1;
  const flexGrow = Number.parseFloat(computed.flexGrow || "0");
  return Number.isFinite(flexGrow) && flexGrow > 0 ? flexGrow : void 0;
}
function getLayoutSizingHorizontal(element, computed, bindings, declarations) {
  if (bindings.width) return void 0;
  if (hasExplicitSizeDeclaration(declarations, horizontalSizeProperties)) {
    return void 0;
  }
  if (element.getAttribute("data-figma-layout-sizing-horizontal") === "hug") {
    return "HUG";
  }
  if (isFlexItem(element, computed) || computed.display.includes("inline-flex")) {
    if (hasFixedFlexBasis(computed)) return void 0;
    if (Number.parseFloat(computed.flexGrow || "0") > 0) return void 0;
    return "HUG";
  }
  if (isFlexDisplay(computed.display) && isOutOfFlowPositioned(computed)) {
    return "HUG";
  }
  const parentElement = element.parentElement;
  if (parentElement && isFlexDisplay(computed.display) && !isOutOfFlowPositioned(computed)) {
    const parentComputed = window.getComputedStyle(parentElement);
    if (parentComputed.display.includes("grid")) {
      const justifySelf = computed.justifySelf;
      const resolved = justifySelf && justifySelf !== "auto" ? justifySelf : parentComputed.justifyItems;
      if (["start", "center", "end", "flex-start", "flex-end"].includes(resolved)) {
        return "HUG";
      }
    }
  }
  return void 0;
}
function getTextAlignVertical(element) {
  return element.getAttribute("data-figma-text-align-vertical") === "center" ? "CENTER" : void 0;
}
function createTextLeafNode({
  bindings,
  colorOverride,
  computed,
  fontScale = 1,
  height,
  inlineLineBox,
  layoutStrategy,
  lineCount,
  name,
  outOfFlow,
  text,
  textAutoResize,
  layoutAlign,
  layoutGrow,
  textAlignVertical,
  transformMatrix,
  width,
  x,
  y
}) {
  const color = colorOverride ?? cssColorValue(computed.color);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const fontSize = toFiniteNumber(
    (cssLengthToNumber(computed.fontSize) ?? 14) * fontScale
  );
  const rawLineHeight = cssLineHeightToNumber(computed.lineHeight);
  const lineHeight = typeof rawLineHeight === "number" ? toFiniteNumber(rawLineHeight * fontScale) : rawLineHeight;
  const textShadowEffects = getTextShadowEffects(computed);
  const rawLetterSpacing = cssLengthToNumber(computed.letterSpacing);
  const letterSpacing = rawLetterSpacing !== void 0 ? toFiniteNumber(rawLetterSpacing * fontScale) : void 0;
  const textDecoration = getTextDecoration(computed);
  const italic = isItalicFontStyle(computed);
  const clampedLineCount = getLineClampCount(computed);
  let exportHeight = height;
  let exportY = y;
  if ((inlineLineBox || computed.display === "inline") && !text.includes("\n") && typeof lineHeight === "number" && lineHeight > 0) {
    const lines = lineCount ?? Math.max(1, Math.ceil(height / lineHeight - 0.05));
    const contentHeight = height - (lines - 1) * lineHeight;
    if (contentHeight >= fontSize * 0.7 && contentHeight < lineHeight - 0.1) {
      const leading = lineHeight - contentHeight;
      exportHeight = toFiniteNumber(height + leading);
      exportY = toFiniteNumber(y - leading / 2);
    }
  }
  return {
    bindings: pickBindings(bindings, [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "textColor"
    ]),
    children: [],
    kind: "text",
    layoutStrategy: layoutStrategy ?? (layoutAlign ? "autoLayout" : "absolute"),
    name,
    text,
    styles: {
      ...color ? { color } : {},
      display: computed.display,
      ...textShadowEffects.length > 0 ? { effects: textShadowEffects } : {},
      fontFamily: computed.fontFamily,
      fontSize,
      ...italic ? { fontStyle: "italic" } : {},
      ...Number.isFinite(fontWeight) ? { fontWeight } : {},
      height: exportHeight,
      ...letterSpacing !== void 0 && letterSpacing !== 0 ? { letterSpacing } : {},
      ...textDecoration ? { textDecoration } : {},
      ...layoutAlign ? { layoutAlign } : {},
      ...layoutGrow ? { layoutGrow } : {},
      ...lineHeight ? { lineHeight } : {},
      opacity: Number(computed.opacity),
      ...outOfFlow ? { outOfFlow: true } : {},
      overflow: computed.overflow,
      ...clampedLineCount !== void 0 ? { maxLines: clampedLineCount, textTruncation: "ENDING" } : {},
      textAlign: computed.textAlign,
      ...textAlignVertical ? { textAlignVertical } : {},
      ...textAutoResize === "HEIGHT" ? { textGrowHeight: true } : textAutoResize ? { textAutoResize } : {},
      ...transformMatrix ? { transformMatrix } : {},
      width,
      x,
      y: exportY
    }
  };
}
function hasBoxedTextStyle(computed, border) {
  return Boolean(
    cssColorValue(computed.backgroundColor) || border || cssLengthToNumber(computed.borderTopLeftRadius) || cssLengthToNumber(computed.paddingBottom) || cssLengthToNumber(computed.paddingLeft) || cssLengthToNumber(computed.paddingRight) || cssLengthToNumber(computed.paddingTop)
  );
}
function getPseudoMatchedDeclarations(element, rules, pseudo) {
  const declarations = [];
  const pseudoSelector = `::${pseudo}`;
  for (const rule of rules) {
    const matchesPseudoSelector = rule.selectorText.split(",").some((selector) => {
      if (!selector.includes(pseudoSelector)) return false;
      const baseSelector = selector.replace(pseudoSelector, "").trim();
      if (!baseSelector || baseSelector.includes(":hover") || baseSelector.includes(":focus")) {
        return false;
      }
      try {
        return element.matches(baseSelector);
      } catch {
        return false;
      }
    });
    if (!matchesPseudoSelector) continue;
    for (const property of Array.from(rule.style)) {
      declarations.push({
        property,
        value: rule.style.getPropertyValue(property).trim()
      });
    }
    declarations.push(...parseCssTextDeclarations(rule.style.cssText));
  }
  return declarations;
}
function collectPseudoBindings(element, rules, pseudo, tokenSystem) {
  if (!tokenSystem.prefix) return {};
  const declarations = getPseudoMatchedDeclarations(element, rules, pseudo);
  const bindings = {};
  for (const bindingName of ["backgroundColor", "height", "width"]) {
    const token = findTokenForProperty(declarations, bindingName, tokenSystem);
    if (token) bindings[bindingName] = token;
  }
  return bindings;
}
function declarationsIncludeProperty(declarations, properties) {
  return declarations.some(
    (declaration) => properties.includes(declaration.property)
  );
}
function getPseudoConstraints(declarations) {
  const hasTop = declarationsIncludeProperty(declarations, [
    "top",
    "inset-block-start",
    "inset-block",
    "inset"
  ]);
  const hasBottom = declarationsIncludeProperty(declarations, [
    "bottom",
    "inset-block-end",
    "inset-block",
    "inset"
  ]);
  const hasLeft = declarationsIncludeProperty(declarations, [
    "left",
    "inset-inline-start",
    "inset-inline",
    "inset"
  ]);
  const hasRight = declarationsIncludeProperty(declarations, [
    "right",
    "inset-inline-end",
    "inset-inline",
    "inset"
  ]);
  return {
    horizontal: hasLeft && hasRight ? "STRETCH" : hasRight && !hasLeft ? "MAX" : "MIN",
    vertical: hasTop && hasBottom ? "STRETCH" : hasBottom && !hasTop ? "MAX" : "MIN"
  };
}
function createPseudoNode(element, rules, pseudo, parentWidth, parentHeight, tokenSystem, options) {
  const style = window.getComputedStyle(element, `::${pseudo}`);
  const content = style.content.trim();
  const width = cssLengthToNumber(style.width) ?? 0;
  const height = cssLengthToNumber(style.height) ?? 0;
  const backgroundColor = cssColorValue(style.backgroundColor);
  if (content === "none" || content === "normal" || width <= 0 || height <= 0 || !backgroundColor) {
    return void 0;
  }
  const left = cssPositionToNumber(style.left, parentWidth) ?? 0;
  const top = cssPositionToNumber(style.top, parentHeight) ?? 0;
  const transformTranslation = cssMatrixTranslationToNumber(style.transform);
  const fallbackTranslateX = style.transform.includes("translate") ? -width / 2 : 0;
  const fallbackTranslateY = style.transform.includes("translate") ? -height / 2 : 0;
  const translateX = transformTranslation?.x ?? fallbackTranslateX;
  const translateY = transformTranslation?.y ?? fallbackTranslateY;
  return {
    bindings: collectPseudoBindings(element, rules, pseudo, tokenSystem),
    children: [],
    kind: "frame",
    layoutStrategy: "absolute",
    name: `${getElementName(element, options)}::${pseudo}`,
    styles: {
      backgroundColor,
      constraints: getPseudoConstraints(
        getPseudoMatchedDeclarations(element, rules, pseudo)
      ),
      display: style.display,
      height,
      opacity: Number(style.opacity),
      outOfFlow: true,
      overflow: style.overflow,
      width,
      x: toFiniteNumber(left + translateX),
      y: toFiniteNumber(top + translateY)
    }
  };
}
function getBorderLineProperties(side) {
  const logicalProperties = {
    bottom: ["border-block-end", "border-block"],
    left: ["border-inline-start", "border-inline"],
    right: ["border-inline-end", "border-inline"],
    top: ["border-block-start", "border-block"]
  };
  return [
    `border-${side}`,
    `border-${side}-color`,
    `border-${side}-width`,
    ...logicalProperties[side],
    ...logicalProperties[side].map((property) => `${property}-color`),
    ...logicalProperties[side].map((property) => `${property}-width`),
    "border",
    "border-color",
    "border-width"
  ];
}
function findBorderLineToken(declarations, side, target, tokenSystem) {
  const properties = getBorderLineProperties(side);
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!properties.includes(declaration.property)) continue;
    const tokens = extractCssVariableNames(declaration.value, tokenSystem);
    if (tokens.length === 0) continue;
    if (target === "color") {
      return tokens.find(isColorTokenName) || tokens[0];
    }
    return tokens.find((token) => !isColorTokenName(token)) || tokens[0];
  }
  return void 0;
}
function getVisibleBorderSides(computed) {
  if (getUniformVisibleBorder(computed)) return void 0;
  const sides = {};
  for (const side of borderSides) {
    if (!isVisibleBorderSide(computed, side)) continue;
    const width = cssBorderWidth(computed, side);
    const color = cssColorValue(cssBorderColor(computed, side));
    if (!color || width <= 0) continue;
    sides[side] = { color, width };
  }
  return Object.keys(sides).length > 0 ? sides : void 0;
}
function collectBorderSideBindings(element, rules, sides, tokenSystem) {
  if (!tokenSystem.prefix) return {};
  const declarations = getMatchedDeclarations(element, rules);
  const bindings = {};
  for (const side of borderSides) {
    if (!sides[side]) continue;
    if (!bindings.borderColor) {
      const colorToken = findBorderLineToken(declarations, side, "color", tokenSystem);
      if (colorToken) bindings.borderColor = colorToken;
    }
    if (!bindings.borderWidth) {
      const widthToken = findBorderLineToken(declarations, side, "width", tokenSystem);
      if (widthToken) bindings.borderWidth = widthToken;
    }
  }
  return bindings;
}
function collectBindings(element, rules, hasUniformVisibleBorder, tokenSystem) {
  if (!tokenSystem.prefix) return {};
  const declarations = getMatchedDeclarations(element, rules);
  const bindings = {};
  Object.keys(bindingProperties).forEach((bindingName) => {
    if (!hasUniformVisibleBorder && (bindingName === "borderColor" || bindingName === "borderWidth")) {
      return;
    }
    let token = findTokenForProperty(declarations, bindingName, tokenSystem);
    let ancestor = element.parentElement;
    while (!token && inheritedBindings.has(bindingName) && ancestor) {
      token = findTokenForProperty(
        getMatchedDeclarations(ancestor, rules),
        bindingName,
        tokenSystem
      );
      ancestor = ancestor.parentElement;
    }
    if (token) bindings[bindingName] = token;
  });
  return bindings;
}
function getDirectText(element) {
  return Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join("").replace(/\s+/g, " ").trim();
}
var textlessInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range"
]);
function getFormControlTextContent(element) {
  if (element instanceof HTMLInputElement) {
    const type = (element.getAttribute("type") || "text").trim().toLowerCase();
    if (textlessInputTypes.has(type)) return void 0;
    if (type === "button" || type === "submit" || type === "reset") {
      const label = element.value || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "");
      return label ? { isPlaceholder: false, text: label } : void 0;
    }
    if (type === "password" && element.value) {
      return { isPlaceholder: false, text: "\u2022".repeat(element.value.length) };
    }
    if (element.value) return { isPlaceholder: false, text: element.value };
    if (element.placeholder) return { isPlaceholder: true, text: element.placeholder };
    return void 0;
  }
  if (element instanceof HTMLTextAreaElement) {
    if (element.value) return { isPlaceholder: false, text: element.value };
    if (element.placeholder) return { isPlaceholder: true, text: element.placeholder };
    return void 0;
  }
  if (element instanceof HTMLSelectElement) {
    const label = element.selectedOptions[0]?.textContent?.replace(/\s+/g, " ").trim();
    return label ? { isPlaceholder: false, text: label } : void 0;
  }
  return void 0;
}
function getPlaceholderTextColor(element) {
  try {
    return cssColorValue(window.getComputedStyle(element, "::placeholder").color);
  } catch {
    return void 0;
  }
}
function countLineRects(range) {
  return Array.from(range.getClientRects()).filter(
    (lineRect) => lineRect.width > 0 && lineRect.height > 0
  ).length;
}
function splitTextNodeIntoLineRuns(node) {
  const content = node.textContent ?? "";
  const runs = [];
  const probe = document.createRange();
  let start = 0;
  for (let guard = 0; guard < 200 && start < content.length; guard += 1) {
    let low = start + 1;
    let high = content.length;
    while (low < high) {
      const middle = Math.floor((low + high + 1) / 2);
      probe.setStart(node, start);
      probe.setEnd(node, middle);
      if (countLineRects(probe) <= 1) low = middle;
      else high = middle - 1;
    }
    probe.setStart(node, start);
    probe.setEnd(node, low);
    const rect = probe.getBoundingClientRect();
    const text = content.slice(start, low).replace(/\s+/g, " ").trim();
    if (text && rect.width > 0 && rect.height > 0) {
      runs.push({ lineCount: 1, rect, text });
    }
    start = low;
  }
  probe.detach();
  return runs;
}
function getDirectTextRuns(element) {
  const runs = [];
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      const lineCount = countLineRects(range);
      range.detach();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (lineCount > 1) {
        const lineRuns = splitTextNodeIntoLineRuns(node);
        if (lineRuns.length > 1) {
          runs.push(...lineRuns);
          continue;
        }
      }
      runs.push({ lineCount: Math.max(1, lineCount), rect, text });
    } catch {
    }
  }
  return runs;
}
function getAbsoluteStackingKey(element) {
  const computed = window.getComputedStyle(element);
  const zIndex = Number.parseInt(computed.zIndex, 10);
  if (Number.isFinite(zIndex)) return zIndex;
  return computed.position !== "static" ? 0.5 : 0;
}
function sortEntriesForAbsoluteStacking(entries) {
  return entries.map((entry, index) => ({
    entry,
    index,
    key: getAbsoluteStackingKey(entry.element)
  })).sort((a, b) => a.key - b.key || a.index - b.index).map((item) => item.entry);
}
function getRenderedLeafText(element) {
  if (element instanceof HTMLElement) {
    const rendered = element.innerText.trim();
    if (rendered) return rendered;
  }
  return getDirectText(element);
}
function applyTextTransformToText(text, computed) {
  const transform = computed.textTransform.trim().toLowerCase();
  if (transform.includes("uppercase")) return text.toUpperCase();
  if (transform.includes("lowercase")) return text.toLowerCase();
  if (transform.includes("capitalize")) {
    return text.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
  }
  return text;
}
function getTextDecoration(computed) {
  const line = (computed.textDecorationLine || "").toLowerCase();
  if (line.includes("line-through")) return "STRIKETHROUGH";
  if (line.includes("underline")) return "UNDERLINE";
  return void 0;
}
function isItalicFontStyle(computed) {
  const fontStyle = computed.fontStyle.trim().toLowerCase();
  return fontStyle.startsWith("italic") || fontStyle.startsWith("oblique");
}
function hasElementChildren(element) {
  return Array.from(element.children).some((child) => {
    if (child.tagName === "BR") return false;
    const style = window.getComputedStyle(child);
    return style.display !== "none";
  });
}
function hasOutOfFlowPositionedChildren(elements) {
  return elements.some((child) => {
    const position = window.getComputedStyle(child).position;
    return position === "absolute" || position === "fixed";
  });
}
function findExportRoot(scope) {
  return scope.firstElementChild ?? void 0;
}
var rasterImageMaxDimension = 2048;
function getImageScaleMode(computed) {
  const objectFit = (computed.objectFit || "").trim().toLowerCase();
  if (objectFit === "contain" || objectFit === "none" || objectFit === "scale-down") {
    return "FIT";
  }
  return "FILL";
}
function dataUrlToRasterCapture(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return void 0;
  return { imageBase64: match[2], imageMimeType: match[1] };
}
function drawSourceToRasterCapture(source, naturalWidth, naturalHeight) {
  if (naturalWidth <= 0 || naturalHeight <= 0) return void 0;
  const scale = Math.min(
    1,
    rasterImageMaxDimension / Math.max(naturalWidth, naturalHeight)
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return void 0;
    context.drawImage(source, 0, 0, width, height);
    return dataUrlToRasterCapture(canvas.toDataURL("image/png"));
  } catch {
    return void 0;
  }
}
async function captureSubtreeRaster(element) {
  try {
    const dataUrl = await toPng(element, { cacheBust: false, pixelRatio: 1 });
    return dataUrl ? dataUrlToRasterCapture(dataUrl) : void 0;
  } catch {
    return void 0;
  }
}
async function fetchRasterCapture(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) return void 0;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.type === "image/svg+xml") {
      return void 0;
    }
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        const capture = drawSourceToRasterCapture(bitmap, bitmap.width, bitmap.height);
        bitmap.close();
        if (capture) return capture;
      } catch {
      }
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return dataUrlToRasterCapture(dataUrl);
  } catch {
    return void 0;
  }
}
async function captureRasterImage(element) {
  const src = element.currentSrc || element.src;
  if (!src || src.startsWith("data:image/svg+xml")) return void 0;
  const drawn = drawSourceToRasterCapture(
    element,
    element.naturalWidth,
    element.naturalHeight
  );
  if (drawn) return drawn;
  return fetchRasterCapture(src);
}
async function fetchSvgText(element, options) {
  const graphicName = element.getAttribute("data-graphic");
  if (element.getAttribute("data-component") === "graphic" && graphicName) {
    const svgText = options.embeddedSvgByDataGraphic[graphicName];
    return svgText ? sanitizeSvgTextForFigma(svgText) : void 0;
  }
  const src = element.currentSrc || element.src;
  if (!src) return void 0;
  if (src.startsWith("data:image/svg+xml")) {
    const [, encodedSvg = ""] = src.split(",", 2);
    return sanitizeSvgTextForFigma(decodeURIComponent(encodedSvg));
  }
  try {
    const response = await fetch(src);
    if (!response.ok) return void 0;
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("svg") || text.trimStart().startsWith("<svg")) {
      return sanitizeSvgTextForFigma(text);
    }
    return void 0;
  } catch {
    return void 0;
  }
}
function isUniformSpacing(values) {
  if (values.length === 0) return true;
  return Math.max(...values) - Math.min(...values) <= 1;
}
function averageSpacing(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function measureAutoLayoutChildren({
  childEntries,
  computed,
  containerRect
}) {
  const flowEntries = childEntries.filter((entry) => !entry.node.styles.outOfFlow);
  const outOfFlowNodes = childEntries.filter((entry) => entry.node.styles.outOfFlow).map((entry) => entry.node);
  if (flowEntries.length === 0) return void 0;
  const isColumn = computed.flexDirection.startsWith("column");
  const measured = flowEntries.map(({ element, node }) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    return {
      crossEnd: isColumn ? x + rect.width : y + rect.height,
      crossStart: isColumn ? x : y,
      mainEnd: isColumn ? y + rect.height : x + rect.width,
      mainStart: isColumn ? y : x,
      node
    };
  });
  const sortedByCross = [...measured].sort(
    (a, b) => a.crossStart - b.crossStart || a.mainStart - b.mainStart
  );
  const lines = [];
  for (const item of sortedByCross) {
    const line = lines[lines.length - 1];
    const lineEnd = line ? Math.max(...line.map((entry) => entry.crossEnd)) : Number.NEGATIVE_INFINITY;
    if (!line || item.crossStart >= lineEnd - 0.5) {
      lines.push([item]);
    } else {
      line.push(item);
    }
  }
  lines.forEach((line) => line.sort((a, b) => a.mainStart - b.mainStart));
  const mainGaps = [];
  for (const line of lines) {
    for (let index = 0; index < line.length - 1; index += 1) {
      mainGaps.push(line[index + 1].mainStart - line[index].mainEnd);
    }
  }
  const crossGaps = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const currentEnd = Math.max(...lines[index].map((entry) => entry.crossEnd));
    const nextStart = Math.min(...lines[index + 1].map((entry) => entry.crossStart));
    crossGaps.push(nextStart - currentEnd);
  }
  const justify = computed.justifyContent.trim();
  const isSpaceBetween = justify === "space-between";
  const hasOverlap = mainGaps.some((value) => value < -0.5) || crossGaps.some((value) => value < -0.5);
  if (hasOverlap || !isUniformSpacing(crossGaps) || !isUniformSpacing(mainGaps) && !isSpaceBetween) {
    return {
      children: childEntries.map((entry) => entry.node),
      strategy: "absolute"
    };
  }
  const wrapDeclared = computed.flexWrap === "wrap" || computed.flexWrap === "wrap-reverse";
  const measurement = {
    children: [
      ...lines.flatMap((line) => line.map((entry) => entry.node)),
      ...outOfFlowNodes
    ],
    strategy: "autoLayout"
  };
  if (mainGaps.length > 0 && !isSpaceBetween) {
    measurement.gap = Math.max(0, toFiniteNumber(averageSpacing(mainGaps)));
  }
  if (wrapDeclared && lines.length > 1) {
    measurement.layoutWrap = "WRAP";
    if (crossGaps.length > 0) {
      measurement.counterAxisSpacing = Math.max(
        0,
        toFiniteNumber(averageSpacing(crossGaps))
      );
    }
  }
  const isStartJustified = justify === "" || ["flex-start", "left", "normal", "start"].includes(justify);
  const isSpaceDistributed = justify === "space-around" || justify === "space-evenly";
  if (isStartJustified || isSpaceDistributed) {
    const leading = Math.min(...measured.map((entry) => entry.mainStart));
    const containerMainSize = isColumn ? containerRect.height : containerRect.width;
    const trailing = containerMainSize - Math.max(...measured.map((entry) => entry.mainEnd));
    const leadingPadding = Math.max(0, toFiniteNumber(leading));
    const trailingPadding = Math.max(0, toFiniteNumber(trailing));
    measurement.paddingOverrides = isColumn ? { bottom: trailingPadding, top: leadingPadding } : { left: leadingPadding, right: trailingPadding };
  }
  return measurement;
}
async function createExportNode(element, rootRect, parentRect, ruleIndex, tokenSystem, options, traversalState, forceAbsoluteLayout = false, parentClientTransform) {
  await markExportNodeVisited(traversalState);
  const computed = window.getComputedStyle(element);
  if (computed.display === "none" || computed.visibility === "hidden" || Number(computed.opacity) === 0) {
    return void 0;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return void 0;
  if (element instanceof HTMLElement && element.getAttribute("data-figma-rasterize") === "true") {
    const rasterized = await captureSubtreeRaster(element);
    if (rasterized) {
      return {
        bindings: {},
        children: [],
        ...rasterized,
        kind: "image",
        layoutStrategy: "absolute",
        name: getElementName(element, options),
        styles: {
          display: computed.display,
          height: toFiniteNumber(rect.height),
          imageScaleMode: "FILL",
          opacity: 1,
          overflow: computed.overflow,
          width: toFiniteNumber(rect.width),
          x: toFiniteNumber(rect.left - parentRect.left),
          y: toFiniteNumber(rect.top - parentRect.top)
        }
      };
    }
  }
  const transformGeometry = resolveElementTransformGeometry(
    element,
    computed,
    rect,
    parentRect,
    parentClientTransform
  );
  const width = toFiniteNumber(transformGeometry?.width ?? rect.width);
  const height = toFiniteNumber(transformGeometry?.height ?? rect.height);
  if (width <= 0 || height <= 0) return void 0;
  const localX = transformGeometry ? transformGeometry.x : toFiniteNumber(rect.left - parentRect.left);
  const localY = transformGeometry ? transformGeometry.y : toFiniteNumber(rect.top - parentRect.top);
  const transformMatrix = transformGeometry?.transformMatrix;
  const fontScale = transformGeometry?.fontScale ?? 1;
  const insetScaleX = transformGeometry?.scaleX ?? 1;
  const insetScaleY = transformGeometry?.scaleY ?? 1;
  const rules = getRulesForElement(ruleIndex, element);
  const forceAutoLayout = element.getAttribute("data-figma-layout-strategy") === "auto-layout";
  const nextForceAbsoluteLayout = !forceAutoLayout && (forceAbsoluteLayout || isAbsoluteFidelityRoot(element, options));
  const component = getComponentReference(element);
  if (element instanceof SVGElement) {
    return createInlineSvgNode(
      element,
      computed,
      rect,
      parentRect,
      options,
      transformGeometry
    );
  }
  const clipPathNode = createClipPathSvgNode(
    element,
    computed,
    rect,
    parentRect,
    rules,
    tokenSystem,
    options
  );
  if (clipPathNode) return clipPathNode;
  const childElements = getRenderChildren(element);
  const hasPositionedChildren = hasOutOfFlowPositionedChildren(childElements);
  const childNodeResults = await Promise.all(
    childElements.map(
      (child) => createExportNode(
        child,
        rootRect,
        rect,
        ruleIndex,
        tokenSystem,
        options,
        traversalState,
        nextForceAbsoluteLayout && !child.hasAttribute("data-component"),
        transformGeometry?.clientTransform
      )
    )
  );
  const childEntries = [];
  childElements.forEach((childElement, index) => {
    const node = childNodeResults[index];
    if (node) childEntries.push({ element: childElement, node });
  });
  const childNodes = childEntries.map((entry) => entry.node);
  const directText = getDirectText(element);
  const backgroundColor = cssColorValue(computed.backgroundColor);
  const declarations = getMatchedDeclarations(element, rules);
  const backgroundLayers = getBackgroundImageLayers(computed.backgroundImage);
  const backgroundLinearGradient = addLinearGradientStopTokens(
    backgroundLayers.map((layer) => parseLinearGradient(layer, width, height)).find(Boolean),
    declarations,
    tokenSystem
  );
  const backgroundRadialGradient = backgroundLayers.map(parseRadialGradient).find(Boolean);
  const backgroundImageUrl = backgroundLayers.map(getBackgroundImageUrl).find(Boolean);
  const color = cssColorValue(computed.color);
  const border = getUniformVisibleBorder(computed);
  const borderSideMap = getVisibleBorderSides(computed);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const radiusStyles = getRadiusStyles(computed, width, height);
  const boxShadowEffects = getBoxShadowEffects(computed);
  const blurEffects = getBlurEffects(computed);
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  const gap = computed.flexDirection.startsWith("column") ? cssLengthToNumber(computed.rowGap) ?? cssLengthToNumber(computed.gap) : cssLengthToNumber(computed.columnGap) ?? cssLengthToNumber(computed.gap);
  const layoutAlign = getLayoutAlign(element);
  const layoutGrow = getLayoutGrow(element, computed);
  const textLayoutStrategy = element.getAttribute("data-figma-layout-strategy") === "auto-layout" ? "autoLayout" : getLayoutStrategy(element, computed, nextForceAbsoluteLayout);
  const textAlignVertical = getTextAlignVertical(element);
  const bindings = collectBindings(element, rules, Boolean(border), tokenSystem);
  if (borderSideMap) {
    Object.assign(
      bindings,
      collectBorderSideBindings(element, rules, borderSideMap, tokenSystem)
    );
  }
  const layoutSizingHorizontal = getLayoutSizingHorizontal(
    element,
    computed,
    bindings,
    declarations
  );
  const layoutSizingVertical = getLayoutSizingVertical(
    element,
    computed,
    bindings,
    declarations
  );
  const frameLayoutAlign = layoutAlign ?? getInferredFrameLayoutAlign(element, computed, declarations);
  if (backgroundLinearGradient) {
    delete bindings.backgroundColor;
  }
  const layoutStrategy = getLayoutStrategy(element, computed, nextForceAbsoluteLayout);
  const pseudoNodes = ["before", "after"].map(
    (pseudo) => createPseudoNode(element, rules, pseudo, width, height, tokenSystem, options)
  ).filter((node) => Boolean(node));
  const shouldPreserveComputedAutoLayout = layoutStrategy === "autoLayout" && isFlexDisplay(computed.display) && !hasPositionedChildren;
  const frameLayoutStrategy = element.getAttribute("data-figma-layout-strategy") === "auto-layout" ? layoutStrategy : shouldPreserveComputedAutoLayout ? layoutStrategy : pseudoNodes.length > 0 || hasPositionedChildren ? "absolute" : layoutStrategy;
  const elementOutOfFlow = isOutOfFlowPositioned(computed);
  const formControlText = getFormControlTextContent(element);
  const isWrappedInlineText = computed.display === "inline" && Array.from(element.getClientRects()).filter(
    (lineRect) => lineRect.width > 0 && lineRect.height > 0
  ).length > 1;
  if (formControlText !== void 0 || directText && !hasElementChildren(element) && !element.shadowRoot && !isWrappedInlineText) {
    const leafText = applyTextTransformToText(
      formControlText !== void 0 ? formControlText.text : getRenderedLeafText(element),
      computed
    );
    const leafColorOverride = formControlText?.isPlaceholder ? getPlaceholderTextColor(element) : void 0;
    const leafTextAlignVertical = textAlignVertical ?? (formControlText !== void 0 && !(element instanceof HTMLTextAreaElement) ? "CENTER" : void 0);
    if (hasBoxedTextStyle(computed, border)) {
      const paddingLeft = (cssLengthToNumber(computed.paddingLeft) ?? 0) * insetScaleX;
      const paddingRight = (cssLengthToNumber(computed.paddingRight) ?? 0) * insetScaleX;
      const paddingTop = (cssLengthToNumber(computed.paddingTop) ?? 0) * insetScaleY;
      const paddingBottom = (cssLengthToNumber(computed.paddingBottom) ?? 0) * insetScaleY;
      const borderLeftWidth = cssBorderWidth(computed, "left") * insetScaleX;
      const borderRightWidth = cssBorderWidth(computed, "right") * insetScaleX;
      const borderTopWidth = cssBorderWidth(computed, "top") * insetScaleY;
      const borderBottomWidth = cssBorderWidth(computed, "bottom") * insetScaleY;
      const contentHeight = Math.max(
        1,
        height - paddingTop - paddingBottom - borderTopWidth - borderBottomWidth
      );
      const textNode = createTextLeafNode({
        bindings,
        colorOverride: leafColorOverride,
        computed,
        fontScale,
        height: contentHeight,
        layoutStrategy: textLayoutStrategy,
        name: `${getElementName(element, options)}__text`,
        text: leafText,
        textAutoResize: getTextAutoResize(
          element,
          computed,
          contentHeight / insetScaleY
        ),
        layoutAlign,
        layoutGrow,
        textAlignVertical: leafTextAlignVertical,
        width: Math.max(
          1,
          width - paddingLeft - paddingRight - borderLeftWidth - borderRightWidth
        ),
        x: borderLeftWidth + paddingLeft,
        y: borderTopWidth + paddingTop
      });
      if (textLayoutStrategy === "autoLayout") {
        return {
          bindings,
          children: [textNode],
          ...component ? { component } : {},
          kind: "frame",
          layoutStrategy: "autoLayout",
          name: getElementName(element, options),
          styles: {
            alignItems: "center",
            ...backgroundColor ? { backgroundColor } : {},
            ...backgroundLinearGradient ? { backgroundLinearGradient } : {},
            ...backgroundRadialGradient ? { backgroundRadialGradient } : {},
            ...boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {},
            ...blurEffects.length > 0 ? { blurEffects } : {},
            ...border ? {
              borderColor: border.color,
              ...border.style ? { borderStyle: border.style } : {},
              borderWidth: border.width
            } : {},
            ...borderSideMap ? { borderSides: borderSideMap } : {},
            display: "flex",
            flexDirection: "row",
            height,
            justifyContent: justifyContentFromTextAlign(computed.textAlign),
            opacity: Number(computed.opacity),
            ...elementOutOfFlow ? { outOfFlow: true } : {},
            overflow: computed.overflow,
            paddingBottom: paddingBottom + borderBottomWidth,
            paddingLeft: paddingLeft + borderLeftWidth,
            paddingRight: paddingRight + borderRightWidth,
            paddingTop: paddingTop + borderTopWidth,
            ...radiusStyles,
            ...layoutSizingHorizontal ? { layoutSizingHorizontal } : {},
            ...layoutSizingHorizontal && !bindings.height ? { layoutSizingVertical: "HUG" } : {},
            ...transformMatrix ? { transformMatrix } : {},
            width,
            x: localX,
            y: localY
          }
        };
      }
      return {
        bindings,
        children: [textNode],
        ...component ? { component } : {},
        kind: "frame",
        layoutStrategy: "absolute",
        name: getElementName(element, options),
        styles: {
          ...backgroundColor ? { backgroundColor } : {},
          ...backgroundLinearGradient ? { backgroundLinearGradient } : {},
          ...backgroundRadialGradient ? { backgroundRadialGradient } : {},
          ...boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {},
          ...blurEffects.length > 0 ? { blurEffects } : {},
          ...border ? {
            borderColor: border.color,
            ...border.style ? { borderStyle: border.style } : {},
            borderWidth: border.width
          } : {},
          ...borderSideMap ? { borderSides: borderSideMap } : {},
          display: getExportDisplay(computed, "absolute"),
          height,
          opacity: Number(computed.opacity),
          ...elementOutOfFlow ? { outOfFlow: true } : {},
          overflow: computed.overflow,
          paddingBottom,
          paddingLeft,
          paddingRight,
          paddingTop,
          ...radiusStyles,
          ...layoutSizingHorizontal ? { layoutSizingHorizontal } : {},
          ...transformMatrix ? { transformMatrix } : {},
          width,
          x: localX,
          y: localY
        }
      };
    }
    const textLeafNode = createTextLeafNode({
      bindings,
      colorOverride: leafColorOverride,
      computed,
      fontScale,
      height,
      layoutStrategy: textLayoutStrategy,
      name: getElementName(element, options),
      outOfFlow: elementOutOfFlow,
      text: leafText,
      textAutoResize: getTextAutoResize(element, computed, height / insetScaleY),
      layoutAlign,
      layoutGrow,
      textAlignVertical: leafTextAlignVertical,
      transformMatrix,
      width,
      x: localX,
      y: localY
    });
    return component ? { ...textLeafNode, component } : textLeafNode;
  }
  const kind = element instanceof HTMLImageElement || element instanceof HTMLCanvasElement ? "image" : "frame";
  let imageSvgText;
  let imageCapture;
  if (element instanceof HTMLImageElement) {
    imageSvgText = await fetchSvgText(element, options);
    if (!imageSvgText) imageCapture = await captureRasterImage(element);
  } else if (element instanceof HTMLCanvasElement) {
    imageCapture = drawSourceToRasterCapture(element, element.width, element.height);
  } else if (backgroundImageUrl) {
    imageCapture = await fetchRasterCapture(backgroundImageUrl);
  }
  const elementName = getElementName(element, options);
  const inlineTextRunNodes = kind === "frame" && directText && !element.shadowRoot ? getDirectTextRuns(element).map(
    (run, index) => createTextLeafNode({
      bindings,
      computed,
      height: toFiniteNumber(run.rect.height),
      // Range rects measure the font content area like inline boxes do,
      // so single-line runs get the same line-box compensation.
      inlineLineBox: true,
      layoutStrategy: "absolute",
      lineCount: run.lineCount,
      name: `${elementName}__text-${index + 1}`,
      text: applyTextTransformToText(run.text, computed),
      textAutoResize: run.lineCount > 1 ? "HEIGHT" : "WIDTH_AND_HEIGHT",
      width: toFiniteNumber(run.rect.width),
      x: toFiniteNumber(run.rect.left - rect.left),
      y: toFiniteNumber(run.rect.top - rect.top)
    })
  ) : [];
  const hasTransformedChildNodes = childNodes.some(
    (node) => node.styles.transformMatrix
  );
  const forceAbsoluteChildren = inlineTextRunNodes.length > 0 || Boolean(transformGeometry) || hasTransformedChildNodes;
  const autoLayoutMeasurement = kind === "frame" && !forceAbsoluteChildren && frameLayoutStrategy === "autoLayout" && isFlexDisplay(computed.display) && childEntries.length > 0 ? measureAutoLayoutChildren({ childEntries, computed, containerRect: rect }) : void 0;
  const effectiveLayoutStrategy = forceAbsoluteChildren ? "absolute" : autoLayoutMeasurement?.strategy ?? frameLayoutStrategy;
  const orderedChildNodes = effectiveLayoutStrategy === "absolute" ? [
    ...inlineTextRunNodes,
    ...sortEntriesForAbsoluteStacking(childEntries).map((entry) => entry.node)
  ] : autoLayoutMeasurement?.children ?? childNodes;
  const paddingOverrides = effectiveLayoutStrategy === "autoLayout" ? autoLayoutMeasurement?.paddingOverrides : void 0;
  const measuredGap = effectiveLayoutStrategy === "autoLayout" ? autoLayoutMeasurement?.gap : void 0;
  const effectiveGap = measuredGap ?? gap;
  const frameStyles = {
    ...computed.alignItems ? { alignItems: computed.alignItems } : {},
    ...backgroundColor ? { backgroundColor } : {},
    ...backgroundLinearGradient ? { backgroundLinearGradient } : {},
    ...backgroundRadialGradient ? { backgroundRadialGradient } : {},
    ...boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {},
    ...blurEffects.length > 0 ? { blurEffects } : {},
    ...border ? {
      borderColor: border.color,
      ...border.style ? { borderStyle: border.style } : {},
      borderWidth: border.width
    } : {},
    ...borderSideMap ? { borderSides: borderSideMap } : {},
    ...color ? { color } : {},
    ...effectiveLayoutStrategy === "autoLayout" && autoLayoutMeasurement?.counterAxisSpacing !== void 0 ? { counterAxisSpacing: autoLayoutMeasurement.counterAxisSpacing } : {},
    display: getExportDisplay(computed, effectiveLayoutStrategy),
    ...effectiveLayoutStrategy === "autoLayout" ? { flexDirection: computed.flexDirection.replace("-reverse", "") } : {},
    fontFamily: computed.fontFamily,
    fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
    ...Number.isFinite(fontWeight) ? { fontWeight } : {},
    ...effectiveGap !== void 0 && effectiveGap >= 0 ? { gap: effectiveGap } : {},
    height,
    ...computed.justifyContent ? { justifyContent: computed.justifyContent } : {},
    ...frameLayoutAlign ? { layoutAlign: frameLayoutAlign } : {},
    ...layoutGrow ? { layoutGrow } : {},
    ...layoutSizingHorizontal ? { layoutSizingHorizontal } : {},
    ...layoutSizingVertical ? { layoutSizingVertical } : {},
    ...effectiveLayoutStrategy === "autoLayout" && autoLayoutMeasurement?.layoutWrap ? { layoutWrap: autoLayoutMeasurement.layoutWrap } : {},
    ...lineHeight ? { lineHeight } : {},
    opacity: Number(computed.opacity),
    ...elementOutOfFlow ? { outOfFlow: true } : {},
    overflow: computed.overflow,
    // CSS borders take layout space before the padding; Figma inside strokes
    // do not, so the border width folds into the exported padding.
    paddingBottom: paddingOverrides?.bottom ?? (cssLengthToNumber(computed.paddingBottom) ?? 0) + cssBorderWidth(computed, "bottom"),
    paddingLeft: paddingOverrides?.left ?? (cssLengthToNumber(computed.paddingLeft) ?? 0) + cssBorderWidth(computed, "left"),
    paddingRight: paddingOverrides?.right ?? (cssLengthToNumber(computed.paddingRight) ?? 0) + cssBorderWidth(computed, "right"),
    paddingTop: paddingOverrides?.top ?? (cssLengthToNumber(computed.paddingTop) ?? 0) + cssBorderWidth(computed, "top"),
    ...radiusStyles,
    ...textAlignVertical ? { textAlignVertical } : {},
    ...transformMatrix ? { transformMatrix } : {},
    width,
    x: localX,
    y: localY
  };
  return {
    bindings,
    children: kind === "image" ? [] : [...orderedChildNodes, ...pseudoNodes],
    ...component ? { component } : {},
    ...imageCapture ? { ...imageCapture } : {},
    kind,
    layoutStrategy: kind === "image" ? "absolute" : effectiveLayoutStrategy,
    name: elementName,
    ...imageSvgText ? { svgText: imageSvgText } : {},
    styles: imageCapture ? {
      ...frameStyles,
      imageScaleMode: kind === "image" ? getImageScaleMode(computed) : getBackgroundScaleMode(computed)
    } : frameStyles
  };
}
var bindingNumberTolerance = 0.6;
function bindingNumbersMatch(tokenValue, styleValue) {
  if (!Number.isFinite(tokenValue) || !Number.isFinite(styleValue)) return false;
  if (Math.abs(tokenValue - styleValue) <= bindingNumberTolerance) return true;
  return styleValue !== 0 && Math.abs(tokenValue - styleValue) / Math.abs(styleValue) <= 0.01;
}
function bindingColorsMatch(tokenColor, styleColor) {
  return Math.abs(tokenColor.r - styleColor.r) <= 0.012 && Math.abs(tokenColor.g - styleColor.g) <= 0.012 && Math.abs(tokenColor.b - styleColor.b) <= 0.012 && Math.abs(tokenColor.a - styleColor.a) <= 0.02;
}
function firstFontFamilyName(value) {
  if (!value) return void 0;
  return getCssFontFamilyCandidates(value)[0]?.toLowerCase();
}
function getBindingExpectation(node, bindingName) {
  const styles = node.styles;
  switch (bindingName) {
    case "backgroundColor":
      return styles.backgroundColor ? { kind: "color", value: styles.backgroundColor } : void 0;
    case "borderColor": {
      const color = styles.borderColor ?? (styles.borderSides ? Object.values(styles.borderSides).find(Boolean)?.color : void 0);
      return color ? { kind: "color", value: color } : void 0;
    }
    case "textColor":
      return styles.color ? { kind: "color", value: styles.color } : void 0;
    case "fontFamily":
      return styles.fontFamily ? { kind: "font", value: styles.fontFamily } : void 0;
    case "fontSize":
      return typeof styles.fontSize === "number" ? { kind: "number", value: styles.fontSize } : void 0;
    case "fontWeight":
      return typeof styles.fontWeight === "number" ? { kind: "number", value: styles.fontWeight } : void 0;
    case "lineHeight":
      return typeof styles.lineHeight === "number" ? { kind: "number", value: styles.lineHeight } : void 0;
    case "gap":
      return typeof styles.gap === "number" ? { kind: "number", value: styles.gap } : void 0;
    case "height":
      return { kind: "number", value: styles.height };
    case "width":
      return { kind: "number", value: styles.width };
    case "opacity":
      return typeof styles.opacity === "number" ? { kind: "number", value: styles.opacity } : void 0;
    case "borderWidth": {
      const width = styles.borderWidth ?? (styles.borderSides ? Object.values(styles.borderSides).find(Boolean)?.width : void 0);
      return typeof width === "number" ? { kind: "number", value: width } : void 0;
    }
    case "cornerRadius":
      return { kind: "number", value: styles.radius ?? 0 };
    case "paddingBottom":
      return typeof styles.paddingBottom === "number" ? { kind: "number", value: styles.paddingBottom } : void 0;
    case "paddingLeft":
      return typeof styles.paddingLeft === "number" ? { kind: "number", value: styles.paddingLeft } : void 0;
    case "paddingRight":
      return typeof styles.paddingRight === "number" ? { kind: "number", value: styles.paddingRight } : void 0;
    case "paddingTop":
      return typeof styles.paddingTop === "number" ? { kind: "number", value: styles.paddingTop } : void 0;
    default:
      return void 0;
  }
}
function bindingSurvivesValueCheck(node, bindingName, tokenName, tokenSystem) {
  const resolved = resolveTokenComparableValue(tokenName, tokenSystem);
  if (!resolved) return true;
  const expected = getBindingExpectation(node, bindingName);
  if (!expected) return false;
  if (expected.kind === "number") {
    return resolved.type === "FLOAT" && typeof resolved.value === "number" && bindingNumbersMatch(resolved.value, expected.value);
  }
  if (expected.kind === "color") {
    if (resolved.type !== "COLOR" || typeof resolved.value !== "object") return false;
    const styleColor = parseCssColorToRgba(expected.value);
    return styleColor ? bindingColorsMatch(resolved.value, styleColor) : false;
  }
  if (resolved.type !== "STRING") return false;
  const tokenFamily = firstFontFamilyName(resolved.raw);
  const styleFamily = firstFontFamilyName(expected.value);
  return Boolean(tokenFamily && styleFamily && tokenFamily === styleFamily);
}
function pruneMismatchedBindings(node, tokenSystem) {
  for (const [bindingName, tokenName] of Object.entries(node.bindings)) {
    if (!tokenName) continue;
    if (!bindingSurvivesValueCheck(
      node,
      bindingName,
      tokenName,
      tokenSystem
    )) {
      delete node.bindings[bindingName];
    }
  }
  const gradient = node.styles.backgroundLinearGradient;
  if (gradient) {
    for (const stop of gradient.stops) {
      if (!stop.token) continue;
      const resolved = resolveTokenComparableValue(stop.token, tokenSystem);
      if (!resolved) continue;
      const stopColor = parseCssColorToRgba(stop.color);
      const matches = resolved.type === "COLOR" && typeof resolved.value === "object" && stopColor !== void 0 && bindingColorsMatch(resolved.value, stopColor);
      if (!matches) delete stop.token;
    }
  }
  node.children.forEach((child) => pruneMismatchedBindings(child, tokenSystem));
}
async function createFigmaExportPayload({
  componentTitle,
  onProgress,
  options,
  scope,
  storyId,
  storyName,
  storyTitle
}) {
  const root = findExportRoot(scope);
  if (!root) {
    throw new Error("No exportable story root was found.");
  }
  const artifactKind = getArtifactKind(storyTitle);
  onProgress?.({ phase: "preparing" });
  await waitForExportFrame();
  const ruleIndex = createCssRuleIndex();
  const tokenSystem = detectTokenSystem(options);
  const rootRect = root.getBoundingClientRect();
  const traversalState = {
    lastProgressAt: 0,
    lastYieldAt: getExportTime(),
    nodeCount: 0,
    onProgress
  };
  const rootNode = await createExportNode(
    root,
    rootRect,
    rootRect,
    ruleIndex,
    tokenSystem,
    options,
    traversalState
  );
  if (!rootNode) {
    throw new Error("The story root has no visible exportable bounds.");
  }
  rootNode.styles.x = 0;
  rootNode.styles.y = 0;
  if (tokenSystem.prefix) {
    pruneMismatchedBindings(rootNode, tokenSystem);
  }
  if (artifactKind === "page") {
    stripComponentReferences(rootNode);
  }
  const component = artifactKind === "component" ? rootNode.component ?? (!hasComponentReference(rootNode) ? getComponentReference(root, componentTitle) : void 0) : void 0;
  let reference;
  const rootPixels = rootRect.width * rootRect.height;
  if (options.referenceImage && root instanceof HTMLElement && rootPixels > 0 && rootPixels <= 8e6) {
    const capture = await captureSubtreeRaster(root);
    if (capture) {
      reference = {
        height: toFiniteNumber(rootRect.height),
        imageBase64: capture.imageBase64,
        imageMimeType: capture.imageMimeType,
        width: toFiniteNumber(rootRect.width)
      };
    }
  }
  const tokenNames = /* @__PURE__ */ new Set();
  onProgress?.({ nodeCount: traversalState.nodeCount, phase: "tokens" });
  await waitForExportFrame();
  function collectNodeTokens(node) {
    Object.values(node.bindings).forEach((token) => {
      if (token) tokenNames.add(token);
    });
    node.styles.backgroundLinearGradient?.stops.forEach((stop) => {
      if (stop.token) tokenNames.add(stop.token);
    });
    node.children.forEach(collectNodeTokens);
  }
  collectNodeTokens(rootNode);
  return {
    artifactKind,
    ...component ? { component } : {},
    componentTitle,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...reference ? { reference } : {},
    root: rootNode,
    storyId,
    storyName,
    storyTitle,
    tokenSystem: {
      collections: tokenSystem.collections,
      layers: tokenSystem.layers,
      pluginDataKey: tokenSystem.pluginDataKey,
      prefix: tokenSystem.prefix
    },
    tokens: collectTokensForExport(tokenNames, tokenSystem),
    version: 2
  };
}

// src/disclosureIcon.ts
var collapseDisclosurePath = "M3.354.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 3.793 3.354.146zM6.646 9.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 10.207l-3.646 3.647a.5.5 0 01-.708-.708l4-4z";
var unfoldMoreDisclosurePath = "M6.646.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 1.207 3.354 4.854a.5.5 0 01-.708-.708l4-4zM3.354 9.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 12.793 3.354 9.146z";
function createDisclosureSvg(path) {
  return `<svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
}
var collapseDisclosureSvg = createDisclosureSvg(collapseDisclosurePath);
var unfoldMoreDisclosureSvg = createDisclosureSvg(unfoldMoreDisclosurePath);

// src/options.ts
var defaultFigmaExportGlobalName = "figmaExport";
var defaultTokenLayers = {
  comp: "comp",
  ref: "ref",
  sys: "sys"
};
function normalizeTokenPrefix(prefix) {
  if (!prefix) return void 0;
  return prefix.replace(/^--/, "").replace(/-$/, "");
}
function normalizeStoryTitlePrefix(prefix) {
  if (prefix === false) return false;
  if (Array.isArray(prefix)) return prefix;
  if (typeof prefix === "string") return [prefix];
  return false;
}
function resolveFigmaExportAddonOptions(options) {
  return {
    absoluteFidelityComponents: new Set(options?.absoluteFidelityComponents ?? []),
    collections: {
      ...defaultTokenLayers,
      ...options?.collections
    },
    componentClassPrefixes: options?.componentClassPrefixes ?? [],
    embeddedSvgByDataGraphic: options?.embeddedSvgByDataGraphic ?? {},
    globalName: options?.globalName ?? defaultFigmaExportGlobalName,
    ...options?.payloadSyncUrl ? { payloadSyncUrl: options.payloadSyncUrl } : {},
    pluginDataKey: options?.pluginDataKey ?? "storybookCssToken",
    referenceImage: options?.referenceImage ?? true,
    storyTitlePrefix: normalizeStoryTitlePrefix(options?.storyTitlePrefix),
    tokenLayers: {
      ...defaultTokenLayers,
      ...options?.tokenLayers
    },
    tokenPrefix: normalizeTokenPrefix(options?.tokenPrefix),
    visualComments: {
      enabled: options?.visualComments?.enabled ?? true,
      apiPath: options?.visualComments?.apiPath ?? "/__figma_export_review_comments",
      captureSelector: options?.visualComments?.captureSelector ?? "#storybook-root",
      authorStorageKey: options?.visualComments?.authorStorageKey ?? "sbfx:review-author"
    }
  };
}
function isStoryIncludedForFigmaExport(title, options) {
  if (!title) return true;
  if (options.storyTitlePrefix === false) return true;
  return options.storyTitlePrefix.some((prefix) => title.startsWith(prefix));
}

// src/pluginCode.ts
function createFigmaExportJson(payload) {
  return JSON.stringify(payload, null, 2);
}
function createFigmaPluginCode(payload) {
  const serializedPayload = createFigmaExportJson(payload);
  return `// Storybook -> Figma
// Legacy fallback: paste this script into a Figma plugin main context or the plugin console.
// Primary flow: use Storybook "Copy JSON", then paste it into your Storybook Figma importer plugin.
// It upserts ref/sys/comp variables, creates the selected story as Figma layers,
// and binds supported properties to variables without creating duplicates.

const STORYBOOK_FIGMA_EXPORT = ${serializedPayload};

void (async function importStorybookStory(payload) {
  const tokenSystem = payload.tokenSystem || {};
  const componentSystem = payload.componentSystem || {};
  const COLLECTION_NAMES = tokenSystem.collections || {
    ref: "ref",
    sys: "sys",
    comp: "comp",
  };
  const PLUGIN_DATA_TOKEN_KEY =
    tokenSystem.pluginDataKey || "storybookCssToken";
  const PLUGIN_DATA_COMPONENT_KEY =
    componentSystem.pluginDataKey || "storybookComponentKey";

  const BINDABLE_RADIUS_FIELDS = [
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
  ];

  const layerOrder = { ref: 0, sys: 1, comp: 2 };
  const registry = new Map();
  const componentRegistry = new Map();
  let componentDefinitionOffsetY = 0;
  const rawTokenByName = new Map(
    (payload.tokens || []).map((token) => [token.cssName, token]),
  );
  const fontFamilyTokenNames = collectFontFamilyTokenNames(payload.root, rawTokenByName);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function valueOr(value, fallback) {
    return value === undefined || value === null ? fallback : value;
  }

  function cloneColor(color) {
    const source = color || {};
    return {
      r: clamp(Number(source.r) || 0, 0, 1),
      g: clamp(Number(source.g) || 0, 0, 1),
      b: clamp(Number(source.b) || 0, 0, 1),
      a: clamp(Number(valueOr(source.a, 1)), 0, 1),
    };
  }

  function colorFromCss(cssValue) {
    if (!cssValue) return { r: 0, g: 0, b: 0, a: 1 };
    const hex = String(cssValue).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const expanded = hex[1].length === 3
        ? hex[1].split("").map((part) => part + part).join("")
        : hex[1];
      const intValue = parseInt(expanded, 16);
      return {
        r: ((intValue >> 16) & 255) / 255,
        g: ((intValue >> 8) & 255) / 255,
        b: (intValue & 255) / 255,
        a: 1,
      };
    }

    const rgba = String(cssValue).match(/rgba?\\(([^)]+)\\)/i);
    if (rgba) {
      const parts = rgba[1].split(",").map((part) => Number(part.trim()));
      return {
        r: clamp((parts[0] || 0) / 255, 0, 1),
        g: clamp((parts[1] || 0) / 255, 0, 1),
        b: clamp((parts[2] || 0) / 255, 0, 1),
        a: clamp(valueOr(parts[3], 1), 0, 1),
      };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  function solidPaint(cssValue, variable) {
    const color = variable && variable.resolvedType === "COLOR" && variable.valuesByMode
      ? { r: 0, g: 0, b: 0 }
      : colorFromCss(cssValue);
    const paint = {
      type: "SOLID",
      color: { r: color.r, g: color.g, b: color.b },
      opacity: valueOr(color.a, 1),
    };

    if (variable && figma.variables && figma.variables.setBoundVariableForPaint) {
      try {
        return figma.variables.setBoundVariableForPaint(paint, "color", variable);
      } catch (_error) {
        return paint;
      }
    }

    return paint;
  }

  async function getCollection(layer) {
    const name = COLLECTION_NAMES[layer] || layer;
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const existing = collections.find((collection) => collection.name === name);
    if (existing) return existing;

    const created = figma.variables.createVariableCollection(name);
    if (created.modes[0] && created.modes[0].name !== "Default") {
      created.renameMode(created.modes[0].modeId, "Default");
    }
    return created;
  }

  function getVariablePluginData(variable, key) {
    try {
      return typeof variable.getPluginData === "function" ? variable.getPluginData(key) : "";
    } catch (_error) {
      return "";
    }
  }

  function setVariablePluginData(variable, key, value) {
    try {
      if (typeof variable.setPluginData === "function") {
        variable.setPluginData(key, value);
      }
    } catch (_error) {
      // Older Figma runtimes may not support plugin data on variables.
    }
  }

  function getNodePluginData(node, key) {
    try {
      return typeof node.getPluginData === "function" ? node.getPluginData(key) : "";
    } catch (_error) {
      return "";
    }
  }

  function setNodePluginData(node, key, value) {
    try {
      if (typeof node.setPluginData === "function") {
        node.setPluginData(key, value);
      }
    } catch (_error) {
      // Plugin data is metadata only; continue if unsupported.
    }
  }

  function getComponentDisplayName(component) {
    if (!component) return "";
    if (component.variant) {
      return component.name + ", Variant=" + component.variant;
    }
    return component.name;
  }

  function findLocalComponent(component) {
    if (!component || !component.key) return undefined;
    const cached = componentRegistry.get(component.key);
    if (cached) return cached;

    const nodes = figma.root.findAll((node) => node.type === "COMPONENT");
    const displayName = getComponentDisplayName(component);
    const sourceName = component.sourceName || component.key;
    const found = nodes.find((node) => {
      const nodeKey = getNodePluginData(node, PLUGIN_DATA_COMPONENT_KEY);
      if (nodeKey === component.key) {
        return true;
      }
      if (nodeKey) return false;

      const nodeSource = getNodePluginData(node, "storybookComponentSource");
      const parentSource =
        node.parent && node.parent.type === "COMPONENT_SET"
          ? getNodePluginData(node.parent, "storybookComponentSource")
          : "";
      const knownSource = nodeSource || parentSource;
      if (knownSource && knownSource !== sourceName) return false;

      if (component.variant) return node.name === displayName;
      return node.name === displayName || node.name === component.name;
    });

    if (found) componentRegistry.set(component.key, found);
    return found;
  }

  function tagComponentNode(node, component) {
    if (!component || !component.key) return;
    setNodePluginData(node, PLUGIN_DATA_COMPONENT_KEY, component.key);
    setNodePluginData(node, "storybookComponentName", component.name);
    setNodePluginData(node, "storybookComponentSource", component.sourceName || component.key);
  }

  function getOrCreatePage(name) {
    const normalizedName = String(name || "").trim() || "Components";
    const existing = figma.root.children.find(
      (page) => page.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (existing) return existing;

    const page = figma.createPage();
    page.name = normalizedName;
    return page;
  }

  function getComponentsPageName() {
    return componentSystem.componentsPageName || "Components";
  }

  function isComponentsPage(page) {
    return String((page && page.name) || "").toLowerCase() ===
      String(getComponentsPageName()).toLowerCase();
  }

  function getPageArtifactPageName() {
    const title = String(payload.storyTitle || payload.componentTitle || "").trim();
    const normalizedTitle = title.startsWith("Pages/")
      ? title.slice("Pages/".length)
      : title;
    return normalizedTitle.replace(/\\//g, " / ") || "Storybook Pages";
  }

  function getPageArtifactTargetPage() {
    if (!isComponentsPage(figma.currentPage)) return figma.currentPage;
    return getOrCreatePage(getPageArtifactPageName());
  }

  function getComponentDefinitionParentPage() {
    return getOrCreatePage(getComponentsPageName());
  }

  function getNextComponentDefinitionY(page) {
    if (componentDefinitionOffsetY === 0 && page.children.length > 0) {
      componentDefinitionOffsetY = page.children.reduce((maxBottom, child) => {
        const bottom = (child.y || 0) + (child.height || 0);
        return Math.max(maxBottom, bottom);
      }, 0);
      if (componentDefinitionOffsetY > 0) componentDefinitionOffsetY += 24;
    }

    return componentDefinitionOffsetY;
  }

  function parkComponentDefinition(node) {
    const parentPage = getComponentDefinitionParentPage();
    const nextY = getNextComponentDefinitionY(parentPage);
    if (node.parent !== parentPage) parentPage.appendChild(node);
    const rootWidth = (payload.root && payload.root.styles && payload.root.styles.width) || 0;
    node.x = payload.artifactKind === "page" ? 0 : rootWidth + 80;
    node.y = nextY;
    componentDefinitionOffsetY += (node.height || 0) + 24;
  }

  function moveExistingComponentDefinitionToTargetPage(componentNode) {
    if (payload.artifactKind !== "page" || !componentNode) return;

    const parentPage = getComponentDefinitionParentPage();
    const definitionNode = getComponentSetParent(componentNode) || componentNode;
    if (definitionNode.parent === parentPage) return;

    const nextY = getNextComponentDefinitionY(parentPage);
    parentPage.appendChild(definitionNode);
    definitionNode.x = 0;
    definitionNode.y = nextY;
    componentDefinitionOffsetY += (definitionNode.height || 0) + 24;
  }

  function createSvgSceneNode(spec) {
    const svgNode = figma.createNodeFromSvg(spec.svgText || "");
    svgNode.name = spec.name || "svg";
    safeResize(svgNode, spec.styles.width, spec.styles.height);
    svgNode.x = spec.styles.x || 0;
    svgNode.y = spec.styles.y || 0;
    return svgNode;
  }

  function getLinearGradientTransform(angle) {
    const normalized = ((Number(angle) % 360) + 360) % 360;
    if (normalized === 270) return [[-1, 0, 1], [0, 1, 0]];
    if (normalized === 180) return [[0, 1, 0], [-1, 0, 1]];
    if (normalized === 0) return [[0, -1, 1], [1, 0, 0]];
    return [[1, 0, 0], [0, 1, 0]];
  }

  function linearGradientPaint(gradient) {
    return {
      type: "GRADIENT_LINEAR",
      gradientTransform: getLinearGradientTransform(valueOr(gradient && gradient.angle, 90)),
      gradientStops: ((gradient && gradient.stops) || []).map((stop, index, stops) => {
        const variable = registry.get(stop.token);
        const colorStop = {
          position:
            typeof stop.position === "number"
              ? clamp(stop.position, 0, 1)
              : stops.length > 1
                ? index / (stops.length - 1)
                : 0,
          color: cloneColor(colorFromCss(stop.color)),
        };
        if (variable && variable.id) {
          colorStop.boundVariables = {
            color: { type: "VARIABLE_ALIAS", id: variable.id },
          };
        }
        return colorStop;
      }),
    };
  }

  function canCreateComponentDefinition(spec) {
    return spec.kind === "frame" || ((spec.kind === "image" || spec.kind === "svg") && Boolean(spec.svgText));
  }

  function shouldCreateComponentInstance(spec, context) {
    const importContext = context || {};
    return (
      importContext.reuseComponents !== false &&
      importContext.isRoot !== true &&
      spec.component &&
      spec.component.key &&
      canCreateComponentDefinition(spec)
    );
  }

  function collectComponentDefinitionSpecs(spec, componentTitle, output, seen) {
    const specs = output || [];
    const seenKeys = seen || new Set();
    if (!spec) return specs;

    const component = spec.component;
    if (
      component &&
      component.key &&
      component.name === componentTitle &&
      canCreateComponentDefinition(spec) &&
      !seenKeys.has(component.key)
    ) {
      seenKeys.add(component.key);
      specs.push(spec);
      return specs;
    }

    for (const childSpec of spec.children || []) {
      collectComponentDefinitionSpecs(childSpec, componentTitle, specs, seenKeys);
    }
    return specs;
  }

  function collectPageComponentDefinitionSpecs(spec, output, seen, isRoot) {
    const specs = output || [];
    const seenKeys = seen || new Set();
    const isRootNode = isRoot !== false;
    if (!spec) return specs;

    const component = spec.component;
    if (
      !isRootNode &&
      component &&
      component.key &&
      canCreateComponentDefinition(spec) &&
      !seenKeys.has(component.key)
    ) {
      seenKeys.add(component.key);
      specs.push(spec);
    }

    for (const childSpec of spec.children || []) {
      collectPageComponentDefinitionSpecs(childSpec, specs, seenKeys, false);
    }
    return specs;
  }

  function getComponentSetParent(node) {
    return node && node.parent && node.parent.type === "COMPONENT_SET" ? node.parent : undefined;
  }

  async function importComponentVariantSet(specs) {
    const existingComponents = specs
      .map((spec) => ({ spec, component: findLocalComponent(spec.component) }))
      .filter((entry) => Boolean(entry.component));
    const existingSet = existingComponents.map((entry) => getComponentSetParent(entry.component)).find(Boolean);
    if (existingSet) {
      for (const { spec, component } of existingComponents) {
        await updateExistingComponentDefinition(component, spec);
      }
      return existingSet;
    }

    const componentNodes = [];
    for (const spec of specs) {
      componentNodes.push(
        await ensureComponentDefinition(spec, spec.component, {
          reuseComponents: true,
        }),
      );
    }

    if (componentNodes.length > 1 && typeof figma.combineAsVariants === "function") {
      const parentPage = getComponentDefinitionParentPage();
      const componentSet = figma.combineAsVariants(componentNodes, parentPage);
      const nextY = payload.artifactKind === "page" ? getNextComponentDefinitionY(parentPage) : 0;
      componentSet.name = payload.componentTitle;
      componentSet.x = 0;
      componentSet.y = nextY;
      if (payload.artifactKind === "page") {
        componentDefinitionOffsetY = nextY + (componentSet.height || 0) + 24;
      }
      setNodePluginData(componentSet, "storybookComponentName", payload.componentTitle);
      setNodePluginData(
        componentSet,
        "storybookComponentSource",
        (specs[0] && specs[0].component && specs[0].component.sourceName) || payload.componentTitle,
      );
      return componentSet;
    }

    return componentNodes[0];
  }

  async function applyInstanceOverrides(node, spec) {
    if (!node || !spec) return;

    if (spec.kind === "text" && node.type === "TEXT") {
      await loadTextNodeFonts(node);
      const nextText = spec.text || "";
      if (node.characters !== nextText) {
        node.characters = nextText;
      }

      if (spec.styles && spec.styles.textAutoResize && "textAutoResize" in node) {
        try {
          node.textAutoResize = spec.styles.textAutoResize;
        } catch (_error) {
          // Some instance text overrides cannot change auto-resize mode.
        }
      } else {
        safeResize(node, spec.styles && spec.styles.width, spec.styles && spec.styles.height);
      }
      applyTextTruncation(node, spec.styles || {});
      return;
    }

    if (!("children" in node)) return;

    const nodeChildren = Array.from(node.children || []);
    const specChildren = spec.children || [];
    for (let index = 0; index < specChildren.length; index += 1) {
      await applyInstanceOverrides(nodeChildren[index], specChildren[index]);
    }
  }

  async function updateExistingComponentDefinition(node, spec) {
    if (!node || !spec) return;

    if (spec.kind === "text" && node.type === "TEXT") {
      await applyInstanceOverrides(node, spec);
      const styles = spec.styles || {};
      const bindings = spec.bindings || {};
      if (styles.color) {
        node.fills = [solidPaint(styles.color, registry.get(bindings.textColor))];
      }
      safeBind(node, "fontSize", bindings.fontSize);
      safeBind(node, "fontWeight", bindings.fontWeight);
      safeBind(node, "lineHeight", bindings.lineHeight);
      return;
    }

    if ("fills" in node && spec.kind !== "text") {
      const styles = spec.styles || {};
      const bindings = spec.bindings || {};
      safeResize(node, styles.width, styles.height);
      if ("clipsContent" in node) {
        node.clipsContent = /(hidden|clip|auto|scroll|overlay)/i.test(
          String(styles.overflow || ""),
        );
      }
      if ("opacity" in node) node.opacity = valueOr(styles.opacity, 1);
      setFrameFills(node, styles, bindings);
      setStrokes(node, styles, bindings);
      applyRadius(node, styles, bindings);
      applyAutoLayout(node, spec, styles, bindings);
      safeBind(node, "width", bindings.width);
      safeBind(node, "height", bindings.height);
      safeBind(node, "opacity", bindings.opacity);
      if (!styles.borderSides) safeBind(node, "strokeWeight", bindings.borderWidth);
    }

    if (!("children" in node)) return;

    const nodeChildren = Array.from(node.children || []);
    const specChildren = spec.children || [];
    for (let index = 0; index < specChildren.length; index += 1) {
      const childSpec = specChildren[index];
      const childNode = nodeChildren[index];
      await updateExistingComponentDefinition(childNode, childSpec);
      if (childNode) {
        applyAutoLayoutChildSizing(node, childNode, childSpec);
        positionChildNode(node, childNode, childSpec);
      }
    }
  }

  function collectFontFamilyTokenNames(root, tokenByName) {
    const names = new Set();

    function addAliasChain(tokenName) {
      let current = tokenName;
      while (current && !names.has(current)) {
        names.add(current);
        const token = tokenByName.get(current);
        current = token && token.alias;
      }
    }

    function visit(node) {
      if (!node) return;
      addAliasChain(node.bindings && node.bindings.fontFamily);
      for (const child of node.children || []) visit(child);
    }

    visit(root);
    return names;
  }

  async function findExistingVariable(collection, spec) {
    const variables = await figma.variables.getLocalVariablesAsync();
    return variables.find((variable) => {
      if (variable.variableCollectionId !== collection.id) return false;
      if (getVariablePluginData(variable, PLUGIN_DATA_TOKEN_KEY) === spec.cssName) return true;
      return variable.name === spec.figmaName;
    });
  }

  function isOpacityVariableSpec(spec) {
    return spec.type === "FLOAT" && (
      (Array.isArray(spec.scopes) && spec.scopes.includes("OPACITY")) ||
      String(spec.cssName || "").includes("-opacity-") ||
      String(spec.figmaName || "").includes("/opacity/")
    );
  }

  function getVariableValueForMode(spec) {
    if (
      spec.type === "STRING" &&
      ((Array.isArray(spec.scopes) && spec.scopes.includes("FONT_FAMILY")) ||
        fontFamilyTokenNames.has(spec.cssName))
    ) {
      return getFontFamily(valueOr(spec.rawValue, spec.value));
    }

    if (!isOpacityVariableSpec(spec)) return spec.value;

    const value = Number(spec.value);
    if (!Number.isFinite(value)) return spec.value;
    return value >= 0 && value <= 1 ? value * 100 : value;
  }

  async function upsertVariable(spec) {
    const collection = await getCollection(spec.collection);
    const modeId = collection.modes[0].modeId;
    let variable = await findExistingVariable(collection, spec);

    if (variable && variable.resolvedType !== spec.type) {
      throw new Error(
        "Variable type mismatch for " + spec.cssName + ": existing " +
          variable.resolvedType + ", export " + spec.type,
      );
    }

    if (!variable) {
      variable = figma.variables.createVariable(spec.figmaName, collection, spec.type);
    }

    if (Array.isArray(spec.scopes)) {
      try {
        variable.scopes = spec.scopes;
      } catch (_error) {
        // Scope support differs by variable type and Figma runtime.
      }
    }

    try {
      variable.setVariableCodeSyntax("WEB", "var(" + spec.cssName + ")");
    } catch (_error) {
      // Code syntax is metadata only; continue if unsupported.
    }

    setVariablePluginData(variable, PLUGIN_DATA_TOKEN_KEY, spec.cssName);

    if (spec.alias) {
      const target = registry.get(spec.alias);
      if (!target) {
        throw new Error("Missing alias target " + spec.alias + " for " + spec.cssName);
      }
      variable.setValueForMode(modeId, { type: "VARIABLE_ALIAS", id: target.id });
    } else if (spec.type === "COLOR") {
      variable.setValueForMode(modeId, cloneColor(spec.value));
    } else {
      variable.setValueForMode(modeId, getVariableValueForMode(spec));
    }

    registry.set(spec.cssName, variable);
    return variable;
  }

  async function upsertVariables(tokens) {
    const sorted = [...tokens].sort((a, b) => {
      const byLayer = valueOr(layerOrder[a.collection], 9) - valueOr(layerOrder[b.collection], 9);
      if (byLayer !== 0) return byLayer;
      return a.figmaName.localeCompare(b.figmaName);
    });

    for (const token of sorted) {
      await upsertVariable(token);
    }
  }

  function safeResize(node, width, height) {
    if (typeof node.resize !== "function") return;
    try {
      node.resize(Math.max(1, width || 1), Math.max(1, height || 1));
    } catch (_error) {
      // Some imported nodes do not allow direct resize.
    }
  }

  function safeBind(node, field, tokenName) {
    const variable = registry.get(tokenName);
    if (!variable || typeof node.setBoundVariable !== "function") return;

    try {
      node.setBoundVariable(field, variable);
    } catch (_error) {
      // Not every node supports every variable binding field.
    }
  }

  function setFrameLayoutMode(node, mode) {
    if (!("layoutMode" in node)) return;

    try {
      node.layoutMode = mode;
    } catch (_error) {
      // Some nodes cannot change layout mode after import.
    }
  }

  function isBorderFallbackNode(spec) {
    return String((spec && spec.name) || "").includes("__border-");
  }

  function isAbsoluteLayoutNodeSpec(spec) {
    return (spec && spec.layoutStrategy) === "absolute" || isBorderFallbackNode(spec);
  }

  function applyNodeConstraints(child, constraints) {
    if (!constraints || !("constraints" in child)) return;

    try {
      child.constraints = constraints;
    } catch (_error) {
      // Some Figma nodes do not support constraints.
    }
  }

  function getAbsoluteChildX(parent, child, childSpec, styles) {
    const name = String((childSpec && childSpec.name) || "");
    if (!name.includes("__border-right")) return styles.x || 0;

    const parentWidth = typeof parent.width === "number" ? parent.width : 0;
    const childWidth = styles.width || child.width || 1;
    return Math.max(0, parentWidth - childWidth);
  }

  function getAbsoluteChildY(parent, child, childSpec, styles) {
    const name = String((childSpec && childSpec.name) || "");
    if (!name.includes("__border-bottom")) return styles.y || 0;

    const parentHeight = typeof parent.height === "number" ? parent.height : 0;
    const childHeight = styles.height || child.height || 1;
    return Math.max(0, parentHeight - childHeight);
  }

  function positionChildNode(parent, child, childSpec) {
    const styles = childSpec.styles || {};
    applyNodeConstraints(child, styles.constraints);

    if (isAbsoluteLayoutNodeSpec(childSpec)) {
      if ("layoutPositioning" in child) {
        try {
          child.layoutPositioning = "ABSOLUTE";
        } catch (_error) {
          // Older Figma nodes may not allow absolute positioning.
        }
      }

      child.x = getAbsoluteChildX(parent, child, childSpec, styles);
      child.y = getAbsoluteChildY(parent, child, childSpec, styles);
      return;
    }

    if ("layoutPositioning" in child) {
      try {
        child.layoutPositioning = "AUTO";
      } catch (_error) {
        // Older Figma nodes may not allow layout positioning changes.
      }
    }

    if (parent.layoutMode === "NONE") {
      child.x = styles.x || 0;
      child.y = styles.y || 0;
    }
  }

  function setFrameFills(node, styles, bindings) {
    const variable = registry.get(bindings.backgroundColor);
    if (styles.backgroundLinearGradient) {
      node.fills = [linearGradientPaint(styles.backgroundLinearGradient)];
    } else if (styles.backgroundColor || variable) {
      node.fills = [solidPaint(styles.backgroundColor, variable)];
    } else {
      node.fills = [];
    }
  }

  function setStrokes(node, styles, bindings) {
    const colorVariable = registry.get(bindings.borderColor);

    if (styles.borderSides) {
      const firstSide = ["top", "right", "bottom", "left"]
        .map((side) => styles.borderSides[side])
        .find(Boolean);
      if (!firstSide) return;

      node.strokes = [solidPaint(firstSide.color, colorVariable)];
      try {
        node.strokeAlign = "INSIDE";
        node.strokeTopWeight = valueOr(styles.borderSides.top && styles.borderSides.top.width, 0);
        node.strokeRightWeight = valueOr(styles.borderSides.right && styles.borderSides.right.width, 0);
        node.strokeBottomWeight = valueOr(styles.borderSides.bottom && styles.borderSides.bottom.width, 0);
        node.strokeLeftWeight = valueOr(styles.borderSides.left && styles.borderSides.left.width, 0);
      } catch (_error) {
        // Per-side stroke weights are unsupported on some node types.
      }
      return;
    }

    const widthVariable = registry.get(bindings.borderWidth);
    if (!styles.borderWidth && !widthVariable) return;
    if (!styles.borderColor && !colorVariable) return;

    node.strokes = [solidPaint(styles.borderColor, colorVariable)];
    if (styles.borderWidth) node.strokeWeight = styles.borderWidth;
  }

  function applyRadius(node, styles, bindings) {
    if ("cornerRadius" in node && styles.radius !== undefined) {
      node.cornerRadius = styles.radius;
    }

    if (bindings.cornerRadius) {
      for (const field of BINDABLE_RADIUS_FIELDS) {
        safeBind(node, field, bindings.cornerRadius);
      }
    }
  }

  function mapAxisAlignment(value) {
    if (value === "center") return "CENTER";
    if (value === "flex-end" || value === "end") return "MAX";
    if (value === "space-between") return "SPACE_BETWEEN";
    return "MIN";
  }

  function mapCounterAlignment(value) {
    if (value === "center") return "CENTER";
    if (value === "flex-end" || value === "end") return "MAX";
    return "MIN";
  }

  function mapTextAlignHorizontal(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "center") return "CENTER";
    if (normalized === "right" || normalized === "end") return "RIGHT";
    if (normalized === "justify") return "JUSTIFIED";
    return "LEFT";
  }

  function applyAutoLayout(node, spec, styles, bindings) {
    if (spec.layoutStrategy !== "autoLayout") {
      setFrameLayoutMode(node, "NONE");
      return;
    }

    if (!String(styles.display || "").includes("flex")) {
      setFrameLayoutMode(node, "NONE");
      return;
    }

    setFrameLayoutMode(
      node,
      String(styles.flexDirection || "").startsWith("column")
        ? "VERTICAL"
        : "HORIZONTAL",
    );
    const isHorizontalLayout = !String(styles.flexDirection || "").startsWith("column");
    const horizontalSizingMode =
      styles.layoutSizingHorizontal === "HUG" ? "AUTO" : "FIXED";
    const verticalSizingMode =
      styles.layoutSizingVertical === "HUG" ? "AUTO" : "FIXED";
    node.primaryAxisSizingMode = isHorizontalLayout
      ? horizontalSizingMode
      : verticalSizingMode;
    node.counterAxisSizingMode = isHorizontalLayout
      ? verticalSizingMode
      : horizontalSizingMode;
    node.primaryAxisAlignItems = mapAxisAlignment(styles.justifyContent);
    node.counterAxisAlignItems = mapCounterAlignment(styles.alignItems);
    node.itemSpacing = valueOr(styles.gap, 0);
    node.paddingLeft = valueOr(styles.paddingLeft, 0);
    node.paddingRight = valueOr(styles.paddingRight, 0);
    node.paddingTop = valueOr(styles.paddingTop, 0);
    node.paddingBottom = valueOr(styles.paddingBottom, 0);

    safeBind(node, "itemSpacing", bindings.gap);
    safeBind(node, "paddingLeft", bindings.paddingLeft);
    safeBind(node, "paddingRight", bindings.paddingRight);
    safeBind(node, "paddingTop", bindings.paddingTop);
    safeBind(node, "paddingBottom", bindings.paddingBottom);
  }

  function applyAutoLayoutChildSizing(parent, child, spec) {
    if (parent.layoutMode === "NONE") return;

    const styles = spec.styles || {};
    const layoutGrow = Number(styles.layoutGrow || 0);
    if (layoutGrow > 0 && "layoutGrow" in child) {
      try {
        child.layoutGrow = 1;
      } catch (_error) {
        // Some Figma nodes do not support fill-container sizing.
      }
    }

    if (styles.layoutAlign !== "STRETCH") return;

    try {
      child.layoutAlign = "STRETCH";
    } catch (_error) {
      // Some Figma nodes do not support auto-layout child sizing.
    }
  }

  const loadedFontKeys = new Set();

  function getFontStyleFromWeight(weight) {
    if (weight >= 700) return "Bold";
    if (weight >= 600) return "Semibold";
    if (weight >= 500) return "Medium";
    return "Regular";
  }

  function getFontStyleCandidates(weight) {
    const preferred = getFontStyleFromWeight(weight);
    const candidates = [preferred];

    if (preferred === "Semibold") candidates.push("SemiBold", "Medium");
    if (preferred === "Bold") candidates.push("Semibold", "SemiBold", "Medium");
    if (preferred === "Medium") candidates.push("Regular");
    if (!candidates.includes("Regular")) candidates.push("Regular");

    return candidates;
  }

  const CSS_GENERIC_FONT_FAMILIES = new Set([
    "cursive",
    "emoji",
    "fangsong",
    "fantasy",
    "math",
    "monospace",
    "sans-serif",
    "serif",
    "system-ui",
    "ui-monospace",
    "ui-rounded",
    "ui-sans-serif",
    "ui-serif",
  ]);

  function getFontFamilyCandidates(fontFamily) {
    const candidates = [];
    let buffer = "";
    let quote;
    let escaped = false;

    function pushCandidate() {
      const candidate = buffer.trim().replace(/^["']|["']$/g, "");
      buffer = "";
      if (!candidate || CSS_GENERIC_FONT_FAMILIES.has(candidate.toLowerCase())) return;
      if (!candidates.includes(candidate)) candidates.push(candidate);
    }

    for (const character of String(fontFamily || "")) {
      if (escaped) {
        buffer += character;
        escaped = false;
        continue;
      }
      if (quote) {
        if (character === "\\\\") {
          escaped = true;
        } else if (character === quote) {
          quote = undefined;
        } else {
          buffer += character;
        }
        continue;
      }
      if (character === String.fromCharCode(34) || character === "'") {
        quote = character;
      } else if (character === ",") {
        pushCandidate();
      } else {
        buffer += character;
      }
    }
    pushCandidate();
    return candidates;
  }

  function getFontFamily(fontFamily) {
    return getFontFamilyCandidates(fontFamily)[0] || "Inter";
  }

  function normalizeFontName(fontName) {
    if (!fontName || fontName === figma.mixed) return undefined;
    if (typeof fontName === "string") {
      const parts = fontName.trim().split(/\\s+/);
      if (parts.length >= 2) {
        return {
          family: parts.slice(0, -1).join(" "),
          style: parts[parts.length - 1],
        };
      }
      return { family: fontName, style: "Regular" };
    }
    if (fontName.family && fontName.style) return fontName;
    return undefined;
  }

  function resolveTokenValue(tokenName, seen) {
    if (!tokenName) return undefined;

    const visited = seen || new Set();
    if (visited.has(tokenName)) return undefined;
    visited.add(tokenName);

    const token = rawTokenByName.get(tokenName);
    if (!token) return undefined;
    if (token.alias) return resolveTokenValue(token.alias, visited);
    return valueOr(token.rawValue, token.value);
  }

  function getFontFamilyFromToken(tokenName) {
    const value = resolveTokenValue(tokenName);
    if (typeof value !== "string") return undefined;
    return getFontFamily(value);
  }

  async function loadFont(fontName) {
    const normalizedFontName = normalizeFontName(fontName);
    if (!normalizedFontName) return false;

    const key = normalizedFontName.family + "\\n" + normalizedFontName.style;
    if (loadedFontKeys.has(key)) return true;

    await figma.loadFontAsync(normalizedFontName);
    loadedFontKeys.add(key);
    return true;
  }

  async function loadBoundFontFamily(tokenName, fontWeight) {
    const family = getFontFamilyFromToken(tokenName);
    if (!family) return false;

    const styleCandidates = getFontStyleCandidates(fontWeight || 400);
    for (const style of styleCandidates) {
      try {
        await loadFont({ family, style });
        return true;
      } catch (_error) {
        // Try next style before skipping the font-family binding.
      }
    }

    return false;
  }

  async function loadTextFont(styles) {
    const families = getFontFamilyCandidates(styles.fontFamily);
    const styleCandidates = getFontStyleCandidates(styles.fontWeight || 400);

    for (const family of families) {
      for (const style of styleCandidates) {
        const fontName = { family, style };
        try {
          await loadFont(fontName);
          return fontName;
        } catch (_error) {
          // Try the next style, then the next concrete CSS family.
        }
      }
    }

    const fallback = { family: "Inter", style: "Regular" };
    await loadFont(fallback);
    return fallback;
  }

  async function loadTextNodeFonts(node) {
    const fonts = [];

    if (node.fontName && node.fontName !== figma.mixed) {
      fonts.push(node.fontName);
    }

    if (typeof node.getRangeAllFontNames === "function" && node.characters.length > 0) {
      try {
        fonts.push(...node.getRangeAllFontNames(0, node.characters.length));
      } catch (_error) {
        // Some runtimes do not allow range font inspection before insertion.
      }
    }

    for (const fontName of fonts) {
      try {
        await loadFont(fontName);
      } catch (_error) {
        const fallback = { family: "Inter", style: "Regular" };
        await loadFont(fallback);
        node.fontName = fallback;
        return;
      }
    }
  }

  async function loadNodeFonts(node) {
    if (node.type === "TEXT") {
      await loadTextNodeFonts(node);
      return;
    }

    if ("children" in node) {
      for (const child of node.children) {
        await loadNodeFonts(child);
      }
    }
  }

  function applyTextTruncation(node, styles) {
    if (!node || !styles) return;

    if (styles.maxLines !== undefined && "maxLines" in node) {
      try {
        node.maxLines = styles.maxLines;
      } catch (_error) {
        // Some Figma runtimes may not support max line limits.
      }
    }

    if (styles.textTruncation && "textTruncation" in node) {
      try {
        node.textTruncation = styles.textTruncation;
      } catch (_error) {
        // Some Figma runtimes may not support text truncation.
      }
    }
  }

  async function createTextNode(spec) {
    const node = figma.createText();
    const styles = spec.styles;
    const bindings = spec.bindings || {};
    node.name = spec.name;
    node.fontName = await loadTextFont(styles);
    node.characters = spec.text || "";
    node.fontSize = styles.fontSize || 14;
    if ("textAutoResize" in node) {
      try {
        node.textAutoResize = "NONE";
      } catch (_error) {
        // Keep default text sizing if fixed text resize is not supported.
      }
    }
    if (styles.lineHeight && styles.lineHeight !== "normal") {
      node.lineHeight = { unit: "PIXELS", value: styles.lineHeight };
    }
    node.fills = [solidPaint(styles.color, registry.get(bindings.textColor))];
    safeResize(node, styles.width, styles.height);
    applyTextTruncation(node, styles);
    if (styles.textAlign && "textAlignHorizontal" in node) {
      try {
        node.textAlignHorizontal = mapTextAlignHorizontal(styles.textAlign);
      } catch (_error) {
        // Some imported text nodes may not allow text alignment changes.
      }
    }
    if (styles.textAutoResize && "textAutoResize" in node) {
      try {
        node.textAutoResize = styles.textAutoResize;
      } catch (_error) {
        // Some imported text nodes may not allow auto-resize changes.
      }
    }
    if (
      !bindings.fontFamily ||
      (await loadBoundFontFamily(bindings.fontFamily, styles.fontWeight || 400))
    ) {
      safeBind(node, "fontFamily", bindings.fontFamily);
    }
    safeBind(node, "fontSize", bindings.fontSize);
    safeBind(node, "fontWeight", bindings.fontWeight);
    safeBind(node, "lineHeight", bindings.lineHeight);
    await loadTextNodeFonts(node);
    return node;
  }

  async function createImageNode(spec) {
    const wrapper = figma.createFrame();
    wrapper.name = spec.name;
    wrapper.fills = [];
    wrapper.clipsContent = false;
    safeResize(wrapper, spec.styles.width, spec.styles.height);

    if (spec.svgText) {
      try {
        const svgNode = figma.createNodeFromSvg(spec.svgText);
        svgNode.name = spec.name + "/svg";
        safeResize(svgNode, spec.styles.width, spec.styles.height);
        svgNode.x = 0;
        svgNode.y = 0;
        await loadNodeFonts(svgNode);
        wrapper.appendChild(svgNode);
      } catch (_error) {
        // Keep an empty wrapper if SVG import fails.
      }
    }

    return wrapper;
  }

  async function createFrameNode(spec, context, asComponent) {
    const node = asComponent ? figma.createComponent() : figma.createFrame();
    const styles = spec.styles;
    const bindings = spec.bindings || {};
    node.name = spec.name;
    safeResize(node, styles.width, styles.height);
    node.clipsContent = /(hidden|clip|auto|scroll|overlay)/i.test(
      String(styles.overflow || ""),
    );
    node.opacity = valueOr(styles.opacity, 1);
    setFrameFills(node, styles, bindings);
    setStrokes(node, styles, bindings);
    applyRadius(node, styles, bindings);
    applyAutoLayout(node, spec, styles, bindings);
    safeBind(node, "width", bindings.width);
    safeBind(node, "height", bindings.height);
    safeBind(node, "opacity", bindings.opacity);
    if (!styles.borderSides) safeBind(node, "strokeWeight", bindings.borderWidth);

    const childContext = {
      ...(context || {}),
      isRoot: false,
      reuseComponents: !context || context.reuseComponents !== false,
    };
    for (const childSpec of spec.children || []) {
      const child = await createNode(childSpec, childContext);
      await loadNodeFonts(child);
      node.appendChild(child);
      applyAutoLayoutChildSizing(node, child, childSpec);
      positionChildNode(node, child, childSpec);
    }

    if (spec.layoutStrategy === "absolute") {
      setFrameLayoutMode(node, "NONE");
    }

    return node;
  }

  async function ensureComponentDefinition(spec, component, context) {
    const existing = findLocalComponent(component);
    if (existing) {
      if (!context || context.updateExistingComponent !== false) {
        await updateExistingComponentDefinition(existing, spec);
        tagComponentNode(existing, component);
        moveExistingComponentDefinitionToTargetPage(existing);
      }
      return existing;
    }

    const componentNode =
      (spec.kind === "image" || spec.kind === "svg") && spec.svgText
        ? figma.createComponentFromNode(createSvgSceneNode(spec))
        : await createFrameNode(
            spec,
            { ...(context || {}), reuseComponents: true },
            true,
          );
    componentNode.name = getComponentDisplayName(component);
    tagComponentNode(componentNode, component);
    parkComponentDefinition(componentNode);
    componentRegistry.set(component.key, componentNode);
    return componentNode;
  }

  async function createComponentInstance(spec, context) {
    const component = await ensureComponentDefinition(
      spec,
      spec.component,
      { ...(context || {}), updateExistingComponent: false },
    );
    const instance = component.createInstance();
    instance.name = spec.component.name;
    safeResize(instance, spec.styles.width, spec.styles.height);
    instance.x = spec.styles.x || 0;
    instance.y = spec.styles.y || 0;
    await applyInstanceOverrides(instance, spec);
    return instance;
  }

  async function createNode(spec, context) {
    const importContext = context || {};
    if (shouldCreateComponentInstance(spec, importContext)) {
      return createComponentInstance(spec, importContext);
    }

    const node =
      spec.kind === "text"
        ? await createTextNode(spec)
        : spec.kind === "image" || spec.kind === "svg"
          ? await createImageNode(spec)
          : await createFrameNode(spec, importContext, false);

    node.x = spec.styles.x || 0;
    node.y = spec.styles.y || 0;
    return node;
  }

  await upsertVariables(payload.tokens || []);
  const shouldImportAsComponent = payload.artifactKind === "component";
  const rootComponent = payload.component || (payload.root && payload.root.component);
  const componentVariantSpecs =
    shouldImportAsComponent && !rootComponent
      ? collectComponentDefinitionSpecs(payload.root, payload.componentTitle)
      : [];
  const pageComponentSpecs =
    shouldImportAsComponent
      ? collectPageComponentDefinitionSpecs(payload.root)
      : [];
  for (const spec of pageComponentSpecs) {
    await ensureComponentDefinition(spec, spec.component, {
      reuseComponents: true,
    });
  }

  const rootNode =
    shouldImportAsComponent && rootComponent && canCreateComponentDefinition(payload.root)
      ? await ensureComponentDefinition(
          payload.root,
          rootComponent,
          { reuseComponents: true },
        )
      : componentVariantSpecs.length > 1
        ? await importComponentVariantSet(componentVariantSpecs)
      : await createNode(payload.root, {
          isRoot: true,
          reuseComponents: shouldImportAsComponent,
        });

  rootNode.name = shouldImportAsComponent && rootComponent
    ? getComponentDisplayName(rootComponent)
    : componentVariantSpecs.length > 1
      ? payload.componentTitle
    : payload.componentTitle + " / " + payload.storyName;
  rootNode.x = 0;
  rootNode.y = 0;
  await loadNodeFonts(rootNode);
  const targetPage = shouldImportAsComponent
    ? getComponentDefinitionParentPage()
    : getPageArtifactTargetPage();
  if (!rootNode.parent) targetPage.appendChild(rootNode);
  if (figma.currentPage.id !== targetPage.id && typeof figma.setCurrentPageAsync === "function") {
    await figma.setCurrentPageAsync(targetPage);
  }
  figma.viewport.scrollAndZoomIntoView([rootNode]);

  figma.notify(
    "Imported " + (payload.artifactKind || "story") + " " + payload.componentTitle + " with " +
      (payload.tokens || []).length + " variables checked.",
  );
})(STORYBOOK_FIGMA_EXPORT).catch((error) => {
  console.error(error);
  figma.notify("Storybook import failed: " + ((error && error.message) || String(error)));
});
`;
}

// src/version.ts
function getAddonVersion() {
  return true ? "0.9.0" : "dev";
}

// src/workspace.ts
var workspaceSelector = "[data-sbfx-workspace]";
var workspaceNarrowQuery = "(max-width: 720px)";
var workspaceRoot = null;
var workspaceMedia = null;
var workspaceMediaCleanup = null;
function setWorkspaceOrientation(root, media) {
  const orientation = media.matches ? "bottom" : "side";
  root.dataset.orientation = orientation;
  document.documentElement.dataset.sbfxWorkspaceOrientation = orientation;
}
function connectWorkspaceOrientation(root) {
  workspaceMediaCleanup?.();
  workspaceMedia = window.matchMedia(workspaceNarrowQuery);
  const update = () => setWorkspaceOrientation(root, workspaceMedia);
  update();
  workspaceMedia.addEventListener?.("change", update);
  workspaceMediaCleanup = () => {
    workspaceMedia?.removeEventListener?.("change", update);
    workspaceMedia = null;
    workspaceMediaCleanup = null;
  };
}
function ensureWorkspaceRoot() {
  if (workspaceRoot?.isConnected) return workspaceRoot;
  const existing = document.querySelector(workspaceSelector);
  if (existing) {
    workspaceRoot = existing;
    connectWorkspaceOrientation(existing);
    document.documentElement.dataset.sbfxWorkspaceOpen = "true";
    return existing;
  }
  const root = document.createElement("aside");
  root.className = "sbfx-workspace";
  root.dataset.sbfxCaptureIgnore = "true";
  root.dataset.sbfxWorkspace = "true";
  root.setAttribute("aria-label", "Figma workspace");
  for (const name of ["export", "review"]) {
    const slot = document.createElement("div");
    slot.className = `sbfx-workspace__slot sbfx-workspace__slot--${name}`;
    slot.dataset.sbfxWorkspaceSlot = name;
    root.append(slot);
  }
  document.body.append(root);
  workspaceRoot = root;
  document.documentElement.dataset.sbfxWorkspaceOpen = "true";
  connectWorkspaceOrientation(root);
  return root;
}
function releaseWorkspaceIfEmpty() {
  window.setTimeout(() => {
    const root = workspaceRoot?.isConnected ? workspaceRoot : document.querySelector(workspaceSelector);
    if (!root) return;
    const activeSlot = Array.from(
      root.querySelectorAll("[data-sbfx-workspace-slot]")
    ).some((slot) => slot.dataset.active === "true" || slot.childElementCount > 0);
    if (activeSlot) return;
    root.remove();
    workspaceRoot = null;
    workspaceMediaCleanup?.();
    delete document.documentElement.dataset.sbfxWorkspaceOpen;
    delete document.documentElement.dataset.sbfxWorkspaceOrientation;
  }, 0);
}
function acquireFigmaWorkspaceSlot(name) {
  const root = ensureWorkspaceRoot();
  const slot = root.querySelector(
    `[data-sbfx-workspace-slot="${name}"]`
  );
  if (!slot) throw new Error(`Figma workspace slot ${name} is unavailable.`);
  slot.dataset.active = "true";
  let released = false;
  return {
    root,
    slot,
    release() {
      if (released) return;
      released = true;
      delete slot.dataset.active;
      releaseWorkspaceIfEmpty();
    }
  };
}

// src/overlay.ts
var statusLabels = {
  copied: "Copied",
  copying: "Exporting",
  error: "Failed",
  idle: "Ready"
};
var actionLabels = {
  design: { busy: "", done: "", idle: "" },
  file: { busy: "Preparing", done: "Downloaded", idle: "Download JSON" },
  json: { busy: "Copying", done: "Copied", idle: "Copy JSON" },
  script: { busy: "Copying", done: "Copied", idle: "Console script" }
};
var svgIcons = {
  check: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 7.5 5.5 10.5 11.5 3.5"/></svg>',
  collapse: collapseDisclosureSvg,
  command: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M5 5h4v4H5zM5 5H3.5A1.5 1.5 0 1 1 5 3.5V5zm4 0h1.5A1.5 1.5 0 1 0 9 3.5V5zM5 9H3.5A1.5 1.5 0 1 0 5 10.5V9zm4 0h1.5A1.5 1.5 0 1 1 9 10.5V9z"/></svg>',
  copy: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="7" rx="1"/><path d="M9.5 4.5v-1a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1"/></svg>',
  download: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M7 2v7m0 0L4.5 6.5M7 9l2.5-2.5M2.5 11.5h9"/></svg>',
  figma: '<svg viewBox="0 0 14 14" width="14" height="14" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.2 0H4.803A2.603 2.603 0 003.41 4.802a2.603 2.603 0 000 4.396 2.602 2.602 0 103.998 2.199v-2.51a2.603 2.603 0 103.187-4.085A2.604 2.604 0 009.2 0zM7.407 7a1.793 1.793 0 103.586 0 1.793 1.793 0 00-3.586 0zm-.81 2.603H4.803a1.793 1.793 0 101.794 1.794V9.603zM4.803 4.397h1.794V.81H4.803a1.793 1.793 0 000 3.587zm0 .81a1.793 1.793 0 000 3.586h1.794V5.207H4.803zm4.397-.81H7.407V.81H9.2a1.794 1.794 0 010 3.587z"/></svg>',
  close: '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5"/></svg>',
  unfoldMore: unfoldMoreDisclosureSvg
};
function getExportComponentTitle(title, options) {
  if (!title) return "Component";
  if (options.storyTitlePrefix === false) return title;
  const matchingPrefix = options.storyTitlePrefix.find(
    (prefix) => title.startsWith(prefix)
  );
  return matchingPrefix ? title.slice(matchingPrefix.length) : title;
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}
function sanitizeExportFilename(value) {
  return String(value ?? "storybook-figma-export").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "storybook-figma-export";
}
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = downloadUrl;
  downloadLink.style.display = "none";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
function getExporterTime() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}
function waitForExporterPanelPaint() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(settle);
      });
      globalThis.setTimeout(settle, 120);
      return;
    }
    globalThis.setTimeout(resolve, 0);
  });
}
function formatExportDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "0.0s";
  return `${(durationMs / 1e3).toFixed(1)}s`;
}
function getTextSizeLabel(text) {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeSvgAttribute2(value) {
  return escapeXml(value).replace(/"/g, "&quot;");
}
function formatSvgNumber(value) {
  const numberValue = Number.isFinite(value) ? Number(value) : 0;
  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
}
function svgDataUrl(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}
function getSvgPaint(value, fallback = "none") {
  return value ? escapeSvgAttribute2(value) : fallback;
}
function renderSvgImageNode(node, isRoot) {
  const { height, width, x, y } = node.styles;
  const transform = isRoot ? "" : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;
  if (!node.svgText) {
    return "";
  }
  return `<g${transform}><image href="${escapeSvgAttribute2(svgDataUrl(node.svgText))}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="none"/></g>`;
}
function renderSvgTextNode(node, isRoot) {
  const { color, fontFamily, fontSize, fontWeight, height, textAlign, textAlignVertical, width, x, y } = node.styles;
  const transform = isRoot ? "" : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;
  const resolvedFontSize = fontSize ?? 12;
  const textAnchor = textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start";
  const textX = textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width : 0;
  const isCentered = textAlignVertical === "CENTER";
  const textY = isCentered ? height / 2 : resolvedFontSize;
  const baseline = isCentered ? "middle" : "alphabetic";
  return `<text${transform} x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" fill="${getSvgPaint(color, "#000000")}" font-family="${escapeSvgAttribute2(fontFamily ?? "sans-serif")}" font-size="${formatSvgNumber(resolvedFontSize)}" font-weight="${escapeSvgAttribute2(String(fontWeight ?? 400))}" text-anchor="${textAnchor}" dominant-baseline="${baseline}">${escapeXml(node.text ?? "")}</text>`;
}
function renderSvgFrameNode(node, isRoot) {
  const {
    backgroundColor,
    borderColor,
    borderWidth,
    height,
    opacity,
    radius,
    width,
    x,
    y
  } = node.styles;
  const transform = isRoot ? "" : ` transform="translate(${formatSvgNumber(x)} ${formatSvgNumber(y)})"`;
  const groupOpacity = typeof opacity === "number" && opacity >= 0 && opacity < 1 ? ` opacity="${formatSvgNumber(opacity)}"` : "";
  const hasRect = Boolean(backgroundColor || borderColor && borderWidth);
  const rect = hasRect ? `<rect width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" rx="${formatSvgNumber(radius)}" fill="${getSvgPaint(backgroundColor)}"${borderColor && borderWidth ? ` stroke="${getSvgPaint(borderColor)}" stroke-width="${formatSvgNumber(borderWidth)}"` : ""}/>` : "";
  const children = node.children.map((child) => renderSvgNode(child)).join("");
  return `<g${transform}${groupOpacity}>${rect}${children}</g>`;
}
function renderSvgNode(node, isRoot = false) {
  if (node.kind === "text") return renderSvgTextNode(node, isRoot);
  if (node.kind === "image" || node.kind === "svg") {
    return renderSvgImageNode(node, isRoot);
  }
  return renderSvgFrameNode(node, isRoot);
}
function createFigmaDesignSvg(payload) {
  const width = Math.max(1, payload.root.styles.width);
  const height = Math.max(1, payload.root.styles.height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" viewBox="0 0 ${formatSvgNumber(width)} ${formatSvgNumber(height)}" role="img" aria-label="${escapeSvgAttribute2(payload.root.name)}">${renderSvgNode(payload.root, true)}</svg>`;
}
async function copySvgDesign(svgText) {
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    const plainText = new Blob([svgText], { type: "text/plain" });
    const htmlText = new Blob([svgText], { type: "text/html" });
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svgText], { type: "image/svg+xml" }),
          "text/html": htmlText,
          "text/plain": plainText
        })
      ]);
      return;
    } catch {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlText,
          "text/plain": plainText
        })
      ]);
      return;
    }
  }
  await copyText(svgText);
}
function syncPayloadToBridge(payload, syncUrl) {
  try {
    return fetch(syncUrl, {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST"
    }).then(
      (response) => response.ok ? "synced" : "sync failed",
      () => "sync failed"
    );
  } catch {
    return Promise.resolve("sync failed");
  }
}
function resolveExportScope() {
  const root = document.getElementById("storybook-root");
  if (root) return { scope: root };
  return {
    scope: document.body,
    warning: "storybook-root not found; exported from document.body"
  };
}
var overlayRefs = null;
var overlayState = null;
var overlayWorkspace = null;
var overlayCollapsed = null;
function isOverlayCollapsed() {
  if (overlayCollapsed === null) {
    overlayCollapsed = readCollapsePreference(exporterCollapseStorageKey);
  }
  return overlayCollapsed;
}
function setOverlayCollapsed(collapsed) {
  overlayCollapsed = collapsed;
  writeCollapsePreference(exporterCollapseStorageKey, collapsed);
  renderOverlay();
}
function createIconSpan(icon) {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.style.display = "inline-flex";
  span.innerHTML = icon;
  return span;
}
function createActionButton(format, icon, className, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
    button.title = ariaLabel;
  }
  const iconSpan = createIconSpan(icon);
  button.append(iconSpan);
  let label = null;
  if (actionLabels[format].idle) {
    label = document.createTextNode(actionLabels[format].idle);
    button.append(label);
  }
  button.addEventListener("click", () => {
    void handleCopy(format);
  });
  return { button, iconSpan, label };
}
function buildOverlay() {
  const aside = document.createElement("aside");
  aside.setAttribute("aria-label", "Figma export");
  aside.className = "sbfx-exporter";
  aside.dataset.status = "idle";
  aside.dataset.version = getAddonVersion();
  const header = document.createElement("header");
  header.className = "sbfx-exporter__header";
  const mark = createIconSpan(svgIcons.figma);
  mark.className = "sbfx-exporter__mark";
  const heading = document.createElement("span");
  heading.className = "sbfx-exporter__heading";
  const title = document.createElement("span");
  title.className = "sbfx-exporter__title";
  const titleLabel = document.createElement("span");
  titleLabel.className = "sbfx-exporter__title-label";
  titleLabel.textContent = "Figma export";
  const versionBadge = document.createElement("span");
  versionBadge.className = "sbfx-exporter__version";
  versionBadge.textContent = `v${getAddonVersion()}`;
  versionBadge.title = `Figma export addon v${getAddonVersion()}`;
  title.append(titleLabel, versionBadge);
  const subtitle = document.createElement("span");
  subtitle.className = "sbfx-exporter__subtitle";
  heading.append(title, subtitle);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sbfx-exporter__toggle";
  const toggleIcon = createIconSpan(svgIcons.collapse);
  toggleIcon.classList.add("sbfx-exporter__toggle-icon");
  toggle.append(toggleIcon);
  toggle.addEventListener("click", () => {
    setOverlayCollapsed(!isOverlayCollapsed());
  });
  header.append(mark, heading, toggle);
  const info = document.createElement("div");
  info.className = "sbfx-exporter__info";
  const status = document.createElement("span");
  status.className = "sbfx-exporter__status";
  const statusDot = document.createElement("span");
  statusDot.className = "sbfx-exporter__status-dot";
  statusDot.setAttribute("aria-hidden", "true");
  const statusLabel = document.createTextNode(statusLabels.idle);
  status.append(statusDot, statusLabel);
  const summary = document.createElement("p");
  summary.className = "sbfx-exporter__summary";
  summary.style.display = "none";
  info.append(status, summary);
  const actions = document.createElement("div");
  actions.className = "sbfx-exporter__actions";
  const json = createActionButton("json", svgIcons.copy, "sbfx-exporter__button");
  const file = createActionButton("file", svgIcons.download, "sbfx-exporter__button");
  const script = createActionButton(
    "script",
    svgIcons.command,
    "sbfx-exporter__button sbfx-exporter__button--secondary"
  );
  const design = createActionButton(
    "design",
    svgIcons.figma,
    "sbfx-exporter__button sbfx-exporter__button--secondary sbfx-exporter__button--icon",
    "Copy design to Figma"
  );
  actions.append(json.button, file.button, script.button, design.button);
  aside.append(header, info, actions);
  return {
    aside,
    buttons: {
      design: { button: design.button, icon: design.iconSpan, label: design.label },
      file: { button: file.button, icon: file.iconSpan, label: file.label },
      json: { button: json.button, icon: json.iconSpan, label: json.label },
      script: { button: script.button, icon: script.iconSpan, label: script.label }
    },
    info,
    statusLabel,
    subtitle,
    summary,
    toggle,
    toggleIcon
  };
}
function renderOverlay() {
  if (!overlayRefs || !overlayState) return;
  const { aside, buttons, info, statusLabel, subtitle, summary, toggle, toggleIcon } = overlayRefs;
  const { activeFormat, copiedFormat, options, status } = overlayState;
  const componentTitle = getExportComponentTitle(overlayState.context.title, options);
  aside.dataset.status = status;
  const collapsed = isOverlayCollapsed();
  aside.dataset.collapsed = collapsed ? "true" : "false";
  if (overlayWorkspace?.root.isConnected) {
    overlayWorkspace.root.dataset.exportCollapsed = collapsed ? "true" : "false";
  }
  const toggleLabel = collapsed ? "Expand Figma export panel" : "Collapse Figma export panel";
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", toggleLabel);
  toggle.title = toggleLabel;
  toggleIcon.innerHTML = collapsed ? svgIcons.unfoldMore : svgIcons.collapse;
  toggleIcon.style.display = collapsed ? "none" : "inline-flex";
  subtitle.textContent = componentTitle;
  subtitle.title = componentTitle;
  statusLabel.textContent = statusLabels[status];
  summary.textContent = overlayState.summary;
  summary.title = overlayState.summary;
  summary.style.display = overlayState.summary ? "" : "none";
  let progress = info.querySelector(".sbfx-exporter__progress");
  if (status === "copying" && !progress) {
    progress = document.createElement("span");
    progress.className = "sbfx-exporter__progress";
    progress.setAttribute("aria-hidden", "true");
    info.append(progress);
  } else if (status !== "copying" && progress) {
    progress.remove();
  }
  Object.keys(buttons).forEach((format) => {
    const entry = buttons[format];
    if (!entry) return;
    entry.button.disabled = status === "copying";
    const isDone = copiedFormat === format && status === "copied";
    entry.icon.innerHTML = isDone ? svgIcons.check : format === "json" || format === "file" ? format === "file" ? svgIcons.download : svgIcons.copy : format === "script" ? svgIcons.command : svgIcons.figma;
    if (entry.label) {
      entry.label.textContent = activeFormat === format ? actionLabels[format].busy : isDone ? actionLabels[format].done : actionLabels[format].idle;
    }
  });
}
function setOverlayStatus(status, summary) {
  if (!overlayState) return;
  overlayState.status = status;
  if (summary !== void 0) overlayState.summary = summary;
  renderOverlay();
}
async function handleCopy(format) {
  if (!overlayState) return;
  const { context, options } = overlayState;
  const componentTitle = getExportComponentTitle(context.title, options);
  const { scope, warning } = resolveExportScope();
  overlayState.activeFormat = format;
  overlayState.copiedFormat = void 0;
  setOverlayStatus(
    "copying",
    format === "design" ? "Generating SVG design..." : format === "file" ? "Preparing export file..." : format === "json" ? "Generating JSON payload..." : "Generating console script..."
  );
  try {
    const startedAt = getExporterTime();
    await waitForExporterPanelPaint();
    const payload = await createFigmaExportPayload({
      componentTitle,
      onProgress: (progress) => {
        if (progress.phase === "preparing") {
          setOverlayStatus("copying", "Preparing story surface...");
          return;
        }
        if (progress.phase === "nodes") {
          setOverlayStatus(
            "copying",
            `Reading ${progress.nodeCount ?? 0} layers from the story...`
          );
          return;
        }
        setOverlayStatus(
          "copying",
          `Resolving design tokens from ${progress.nodeCount ?? 0} layers...`
        );
      },
      options,
      scope,
      storyId: context.id ?? "unknown-story",
      storyName: context.name ?? "Story",
      storyTitle: context.title ?? ""
    });
    let exportSizeLabel = "";
    if (format === "design") {
      setOverlayStatus("copying", "Copying SVG design...");
      await waitForExporterPanelPaint();
      const svgText = createFigmaDesignSvg(payload);
      exportSizeLabel = getTextSizeLabel(svgText);
      await copySvgDesign(svgText);
    } else if (format === "file") {
      const exportText = createFigmaExportJson(payload);
      exportSizeLabel = getTextSizeLabel(exportText);
      setOverlayStatus("copying", `Starting ${exportSizeLabel} download...`);
      await waitForExporterPanelPaint();
      downloadTextFile(
        `${sanitizeExportFilename(context.id ?? payload.storyId)}.sbfx.json`,
        exportText
      );
    } else {
      const exportText = format === "json" ? createFigmaExportJson(payload) : createFigmaPluginCode(payload);
      exportSizeLabel = getTextSizeLabel(exportText);
      setOverlayStatus(
        "copying",
        format === "json" ? `Copying ${exportSizeLabel} JSON...` : `Copying ${exportSizeLabel} plugin script...`
      );
      await waitForExporterPanelPaint();
      await copyText(exportText);
    }
    overlayState.copiedFormat = format;
    overlayState.activeFormat = void 0;
    const elapsedLabel = formatExportDuration(getExporterTime() - startedAt);
    const sizeSummary = exportSizeLabel ? ` (${exportSizeLabel})` : "";
    const scopeNote = warning ? ` [${warning}]` : "";
    setOverlayStatus(
      "copied",
      format === "design" ? `Visual SVG copied from ${payload.root.name}${sizeSummary} in ${elapsedLabel}.${scopeNote}` : format === "file" ? `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; .sbfx.json downloaded.${scopeNote}` : format === "json" ? `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; JSON copied.${scopeNote}` : `${payload.tokens.length} variables exported from ${payload.root.name}${sizeSummary} in ${elapsedLabel}; script copied.${scopeNote}`
    );
    if (options.payloadSyncUrl) {
      const syncedStoryId = payload.storyId;
      void syncPayloadToBridge(payload, options.payloadSyncUrl).then((result) => {
        if (!overlayState || overlayState.status !== "copied" || overlayState.context.id !== syncedStoryId) {
          return;
        }
        setOverlayStatus("copied", `${overlayState.summary} [${result}]`);
      });
    }
  } catch (error) {
    overlayState.activeFormat = void 0;
    overlayState.copiedFormat = void 0;
    setOverlayStatus(
      "error",
      error instanceof Error ? error.message : "Export failed."
    );
  }
}
function unmountOverlay() {
  if (overlayRefs) {
    overlayRefs.aside.remove();
    overlayRefs = null;
  }
  if (overlayWorkspace?.root.isConnected) {
    delete overlayWorkspace.root.dataset.exportCollapsed;
  }
  overlayWorkspace?.release();
  overlayWorkspace = null;
  overlayState = null;
}
var noticeElement = null;
var mountedNoticeKey = null;
var dismissedNoticeKey = null;
function getNoticeMessage(reason, options) {
  if (reason === "not-story-view") {
    return "Figma export overlay is available in Story view only. Open this entry as a story to export it.";
  }
  const prefixes = options.storyTitlePrefix === false ? [] : options.storyTitlePrefix;
  const prefixList = prefixes.length ? ` (${prefixes.join(", ")})` : "";
  return `This story is excluded by storyTitlePrefix${prefixList}. Add this story's top-level namespace to storyTitlePrefix, or set it to false to include all stories.`;
}
function unmountNotice() {
  if (noticeElement) {
    noticeElement.remove();
    noticeElement = null;
  }
  mountedNoticeKey = null;
}
function syncFigmaExportNotice(context, options, reason) {
  const noticeKey = `${context.id ?? ""}|${reason}`;
  if (dismissedNoticeKey === noticeKey) {
    unmountNotice();
    return;
  }
  if (noticeElement && mountedNoticeKey === noticeKey) {
    if (!noticeElement.isConnected) document.body.append(noticeElement);
    return;
  }
  unmountNotice();
  const aside = document.createElement("aside");
  aside.setAttribute("aria-label", "Figma export status");
  aside.setAttribute("role", "status");
  aside.className = "sbfx-exporter-notice";
  aside.dataset.reason = reason;
  aside.dataset.version = getAddonVersion();
  const mark = createIconSpan(svgIcons.figma);
  mark.className = "sbfx-exporter-notice__mark";
  const body = document.createElement("div");
  body.className = "sbfx-exporter-notice__body";
  const title = document.createElement("span");
  title.className = "sbfx-exporter-notice__title";
  title.textContent = "Figma export";
  const message = document.createElement("p");
  message.className = "sbfx-exporter-notice__message";
  message.textContent = getNoticeMessage(reason, options);
  body.append(title, message);
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "sbfx-exporter-notice__dismiss";
  dismiss.setAttribute("aria-label", "Dismiss Figma export notice");
  dismiss.title = "Dismiss";
  dismiss.append(createIconSpan(svgIcons.close));
  dismiss.addEventListener("click", () => {
    dismissedNoticeKey = noticeKey;
    unmountNotice();
  });
  aside.append(mark, body, dismiss);
  document.body.append(aside);
  noticeElement = aside;
  mountedNoticeKey = noticeKey;
}
function syncFigmaExportOverlay(context, options) {
  if (typeof document === "undefined") return;
  const resolvedOptions = resolveFigmaExportAddonOptions(options);
  const enabled = context.globals?.[resolvedOptions.globalName] === "on";
  const includedStory = isStoryIncludedForFigmaExport(context.title, resolvedOptions);
  const isStoryView = (context.viewMode ?? "story") === "story";
  if (!enabled) {
    unmountOverlay();
    unmountNotice();
    dismissedNoticeKey = null;
    return;
  }
  if (!isStoryView || !includedStory) {
    unmountOverlay();
    syncFigmaExportNotice(
      context,
      resolvedOptions,
      !isStoryView ? "not-story-view" : "excluded-story"
    );
    return;
  }
  unmountNotice();
  if (!overlayRefs) {
    overlayRefs = buildOverlay();
  }
  const isNewStory = overlayState?.context.id !== context.id;
  overlayState = {
    activeFormat: void 0,
    context,
    copiedFormat: isNewStory ? void 0 : overlayState?.copiedFormat,
    options: resolvedOptions,
    status: isNewStory ? "idle" : overlayState?.status ?? "idle",
    summary: isNewStory ? "" : overlayState?.summary ?? ""
  };
  if (!overlayRefs.aside.isConnected) {
    overlayWorkspace ??= acquireFigmaWorkspaceSlot("export");
    overlayWorkspace.slot.append(overlayRefs.aside);
  }
  renderOverlay();
}

// src/preview.ts
function getFigmaExportGlobalName(options) {
  return options?.globalName ?? defaultFigmaExportGlobalName;
}
function createFigmaExportDecorator(options) {
  return function figmaExportDecorator(storyFn, context) {
    syncFigmaExportOverlay(context, options);
    return storyFn();
  };
}
function createFigmaExportGlobalTypes(options) {
  return {
    [getFigmaExportGlobalName(options)]: {
      defaultValue: "off",
      description: "Show the component-to-Figma code exporter."
    }
  };
}
function createFigmaExportInitialGlobals(options) {
  return {
    [getFigmaExportGlobalName(options)]: "off"
  };
}
export {
  createFigmaExportDecorator,
  createFigmaExportGlobalTypes,
  createFigmaExportInitialGlobals,
  createFigmaExportJson,
  createFigmaPluginCode,
  defaultFigmaExportGlobalName,
  getFigmaExportGlobalName,
  isStoryIncludedForFigmaExport,
  resolveFigmaExportAddonOptions
};
//# sourceMappingURL=index.js.map