import type { ResolvedFigmaExportAddonOptions } from "./options";
import { parseCssColorToRgba } from "./color";
import type {
  FigmaExportToken,
  FigmaVariableType,
  FigmaVariableValue,
  TokenLayer,
} from "./types";

export type TokenFamily =
  | "color"
  | "motion"
  | "opacity"
  | "other"
  | "shadow"
  | "shape"
  | "size"
  | "spacing"
  | "type";

export type TokenDefinition = {
  family: TokenFamily;
  layer: TokenLayer;
  name: string;
  value: string;
};

export type DetectedTokenSystem = {
  catalog: TokenDefinition[];
  collections: Record<TokenLayer, string>;
  layers: Record<TokenLayer, string>;
  pluginDataKey: string;
  prefix: string;
};

const tokenLayerOrder: Record<TokenLayer, number> = {
  comp: 2,
  ref: 0,
  sys: 1,
};

const tokenLayers: TokenLayer[] = ["ref", "sys", "comp"];

const cssGenericFontFamilies = new Set([
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

export function getCssFontFamilyCandidates(value: string): string[] {
  const candidates: string[] = [];
  let buffer = "";
  let quote: "\"" | "'" | undefined;
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
        quote = undefined;
      } else {
        buffer += character;
      }
      continue;
    }
    if (character === "\"" || character === "'") {
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

function isFontFamilyTokenName(name: string): boolean {
  return (
    /-typeface(?:-|$)/.test(name) ||
    /-font-family(?:-|$)/.test(name) ||
    (name.includes("-typescale-") && name.endsWith("-family"))
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTokenFamily(name: string): TokenFamily {
  if (name.includes("-color-")) return "color";
  if (name.includes("-opacity-")) return "opacity";
  if (name.includes("-shadow-")) return "shadow";
  if (
    isFontFamilyTokenName(name) ||
    name.includes("-typescale-") ||
    name.includes("-weight-") ||
    name.includes("-line-height")
  ) {
    return "type";
  }
  if (name.includes("-spacing-")) return "spacing";
  if (name.includes("-shape-") || name.includes("-radius-")) return "shape";
  if (name.includes("-duration-") || name.includes("-easing-")) return "motion";
  if (name.includes("-size-")) return "size";
  return "other";
}

function normalizeTokenValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function collectCssCustomProperties(): Map<string, string> {
  const tokens = new Map<string, string>();
  const targetElements = [document.documentElement, document.body].filter(Boolean);

  function collectFromStyle(style: CSSStyleDeclaration, overwrite: boolean) {
    for (const property of Array.from(style)) {
      if (!property.startsWith("--")) continue;
      const value = style.getPropertyValue(property).trim();
      if (!value) continue;
      if (!overwrite && tokens.has(property)) continue;
      tokens.set(property, normalizeTokenValue(value));
    }
  }

  function ruleMatchesTokenTarget(rule: CSSStyleRule): boolean {
    return targetElements.some((element) => {
      try {
        return element.matches(rule.selectorText);
      } catch {
        return false;
      }
    });
  }

  function mediaRuleIsActive(rule: CSSMediaRule): boolean {
    try {
      return window.matchMedia(rule.conditionText).matches;
    } catch {
      return true;
    }
  }

  function collectRuleList(ruleList: CSSRuleList) {
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
          // Ignore inaccessible imported style sheets.
        }
        continue;
      }

      if (rule instanceof CSSMediaRule && !mediaRuleIsActive(rule)) {
        continue;
      }

      if ("cssRules" in rule) {
        try {
          collectRuleList((rule as CSSMediaRule).cssRules);
        } catch {
          // Ignore inaccessible nested rules.
        }
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectRuleList(sheet.cssRules);
    } catch {
      // Ignore cross-origin or browser-managed style sheets.
    }
  }

  // Document-level adoptedStyleSheets can also define :root/body tokens.
  let adoptedSheets: CSSStyleSheet[] = [];
  try {
    adoptedSheets = Array.from(document.adoptedStyleSheets ?? []);
  } catch {
    adoptedSheets = [];
  }
  for (const sheet of adoptedSheets) {
    try {
      collectRuleList(sheet.cssRules);
    } catch {
      // Ignore inaccessible constructed style sheets.
    }
  }

  collectFromStyle(document.documentElement.style, true);
  if (document.body) collectFromStyle(document.body.style, true);
  collectFromStyle(window.getComputedStyle(document.documentElement), false);
  if (document.body) collectFromStyle(window.getComputedStyle(document.body), false);
  return tokens;
}

function getTokenLayer(
  name: string,
  prefix: string,
  layers: Record<TokenLayer, string>,
): TokenLayer | undefined {
  for (const layer of tokenLayers) {
    const segment = layers[layer];
    if (name.startsWith(`--${prefix}-${segment}-`)) return layer;
  }

  return undefined;
}

function detectTokenPrefix(
  tokenNames: Iterable<string>,
  options: ResolvedFigmaExportAddonOptions,
): string | undefined {
  if (options.tokenPrefix) return options.tokenPrefix;

  const candidates = new Map<
    string,
    {
      count: number;
      layers: Set<TokenLayer>;
    }
  >();

  for (const name of tokenNames) {
    for (const layer of tokenLayers) {
      const segment = options.tokenLayers[layer];
      const match = name.match(new RegExp(`^--(.+?)-${escapeRegExp(segment)}-`));
      if (!match) continue;

      const prefix = match[1];
      const candidate = candidates.get(prefix) ?? {
        count: 0,
        layers: new Set<TokenLayer>(),
      };
      candidate.count += 1;
      candidate.layers.add(layer);
      candidates.set(prefix, candidate);
    }
  }

  // No custom property matches any layered pattern: degrade to a token-less
  // export (empty token system) instead of blocking the whole export.
  if (candidates.size === 0) return undefined;

  const completeCandidates = Array.from(candidates.entries())
    .filter(([, candidate]) => tokenLayers.every((layer) => candidate.layers.has(layer)))
    .sort(([, a], [, b]) => b.count - a.count);

  if (completeCandidates.length > 0) return completeCandidates[0][0];

  throw new Error(
    "Unable to detect a ref/sys/comp token prefix. Pass tokenPrefix in the Storybook Figma export addon options.",
  );
}

const emptyTokenSystemPrefix = "";

export function detectTokenSystem(
  options: ResolvedFigmaExportAddonOptions,
): DetectedTokenSystem {
  const customProperties = collectCssCustomProperties();
  const prefix = detectTokenPrefix(customProperties.keys(), options);
  if (prefix === undefined) {
    return {
      catalog: [],
      collections: options.collections,
      layers: options.tokenLayers,
      pluginDataKey: options.pluginDataKey,
      prefix: emptyTokenSystemPrefix,
    };
  }
  const catalog: TokenDefinition[] = [];

  customProperties.forEach((value, name) => {
    const layer = getTokenLayer(name, prefix, options.tokenLayers);
    if (!layer) return;

    catalog.push({
      family: getTokenFamily(name),
      layer,
      name,
      value,
    });
  });

  return {
    catalog,
    collections: options.collections,
    layers: options.tokenLayers,
    pluginDataKey: options.pluginDataKey,
    prefix,
  };
}

function parseHexColor(value: string): FigmaVariableValue | undefined {
  const normalized = value.trim();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return undefined;

  const hex = match[1];
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : hex;

  const intValue = Number.parseInt(expanded, 16);
  return {
    r: ((intValue >> 16) & 255) / 255,
    g: ((intValue >> 8) & 255) / 255,
    b: (intValue & 255) / 255,
    a: 1,
  };
}

function parseRawValue(value: string): {
  type: FigmaVariableType;
  value: FigmaVariableValue;
} {
  const trimmed = value.trim();
  const color = parseHexColor(trimmed);
  if (color) {
    return {
      type: "COLOR",
      value: color,
    };
  }

  const px = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) {
    return {
      type: "FLOAT",
      value: Number(px[1]),
    };
  }

  const number = trimmed.match(/^(-?\d+(?:\.\d+)?)$/);
  if (number) {
    return {
      type: "FLOAT",
      value: Number(number[1]),
    };
  }

  if (trimmed === "true" || trimmed === "false") {
    return {
      type: "BOOLEAN",
      value: trimmed === "true",
    };
  }

  // hsl()/oklch()/color()/named tokens parse through the browser color engine
  // so they export as COLOR variables instead of STRING fallbacks.
  const cssColor = parseCssColorToRgba(trimmed);
  if (cssColor) {
    return {
      type: "COLOR",
      value: cssColor,
    };
  }

  return {
    type: "STRING",
    value: trimmed.replace(/^["']|["']$/g, ""),
  };
}

function getFallbackType(token: TokenDefinition): FigmaVariableType {
  if (token.family === "color") return "COLOR";
  if (
    token.family === "size" ||
    token.family === "spacing" ||
    token.family === "shape" ||
    token.family === "opacity" ||
    token.name.includes("-weight-") ||
    token.name.includes("-typescale-")
  ) {
    return "FLOAT";
  }
  return "STRING";
}

function getTokenType(
  token: TokenDefinition,
  tokenByName: Map<string, TokenDefinition>,
  tokenSystem: DetectedTokenSystem,
  seen = new Set<string>(),
): FigmaVariableType {
  if (seen.has(token.name)) return getFallbackType(token);
  seen.add(token.name);

  const alias = getAliasTokenName(token, tokenSystem);
  const aliasToken = alias ? tokenByName.get(alias) : undefined;
  if (aliasToken) return getTokenType(aliasToken, tokenByName, tokenSystem, seen);

  return parseRawValue(token.value).type;
}

// Matches "-segment-" in the middle or "-segment" at the end, so
// "--md-sys-typescale-label-weight" classifies like "--md-ref-weight-700".
function nameHasSegment(name: string, segment: string): boolean {
  return name.includes(`-${segment}-`) || name.endsWith(`-${segment}`);
}

function getTokenScopes(token: TokenDefinition, type: FigmaVariableType): string[] {
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
  if (
    (token.name.includes("-typescale-") || token.name.includes("-text-")) &&
    nameHasSegment(token.name, "size")
  ) {
    return ["FONT_SIZE"];
  }
  if (nameHasSegment(token.name, "size")) return ["WIDTH_HEIGHT"];

  return ["WIDTH_HEIGHT"];
}

export function extractCssVariableNames(
  value: string,
  tokenSystem: DetectedTokenSystem,
): string[] {
  if (!tokenSystem.prefix) return [];

  const layerPattern = tokenLayers
    .map((layer) => escapeRegExp(tokenSystem.layers[layer]))
    .join("|");
  const variablePattern = new RegExp(
    `var\\(\\s*(--${escapeRegExp(tokenSystem.prefix)}-(?:${layerPattern})-[a-z0-9-]+)`,
    "gi",
  );

  return Array.from(value.matchAll(variablePattern), (match) => match[1]);
}

function getAliasTokenName(
  token: TokenDefinition,
  tokenSystem: DetectedTokenSystem,
): string | undefined {
  return extractCssVariableNames(token.value, tokenSystem)[0];
}

// Follows the alias chain to the final concrete token and parses its raw
// value. Used to verify that a candidate binding's variable value actually
// matches the computed style it would replace (for example a unitless
// line-height token of 1.3 must never bind to a 15.6px Figma line height).
export function resolveTokenComparableValue(
  cssName: string,
  tokenSystem: DetectedTokenSystem,
  seen = new Set<string>(),
): { raw: string; type: FigmaVariableType; value: FigmaVariableValue } | undefined {
  if (seen.has(cssName)) return undefined;
  seen.add(cssName);

  const token = tokenSystem.catalog.find((candidate) => candidate.name === cssName);
  if (!token) return undefined;

  const alias = getAliasTokenName(token, tokenSystem);
  if (alias) return resolveTokenComparableValue(alias, tokenSystem, seen);
  return { ...parseRawValue(token.value), raw: token.value };
}

function toFigmaVariableName(cssName: string): string {
  return cssName.replace(/^--/, "").replaceAll("-", "/");
}

function getExportTokenValue(
  token: TokenDefinition,
  parsed: { type: FigmaVariableType; value: FigmaVariableValue } | undefined,
): FigmaVariableValue | undefined {
  if (parsed?.type === "STRING" && isFontFamilyTokenName(token.name)) {
    return getCssFontFamilyCandidates(token.value)[0] ?? "Inter";
  }

  if (
    token.family !== "opacity" ||
    parsed?.type !== "FLOAT" ||
    typeof parsed.value !== "number"
  ) {
    return parsed?.value;
  }

  return parsed.value >= 0 && parsed.value <= 1
    ? parsed.value * 100
    : parsed.value;
}

function toExportToken(
  token: TokenDefinition,
  tokenByName: Map<string, TokenDefinition>,
  tokenSystem: DetectedTokenSystem,
): FigmaExportToken {
  const alias = getAliasTokenName(token, tokenSystem);
  const type = getTokenType(token, tokenByName, tokenSystem);
  const parsed = alias ? undefined : parseRawValue(token.value);

  return {
    ...(alias ? { alias } : { value: getExportTokenValue(token, parsed) }),
    collection: token.layer,
    cssName: token.name,
    figmaName: toFigmaVariableName(token.name),
    rawValue: token.value,
    scopes: getTokenScopes(token, type),
    type,
  };
}

export function collectTokensForExport(
  cssNames: Iterable<string>,
  tokenSystem: DetectedTokenSystem,
): FigmaExportToken[] {
  const visited = new Set<string>();
  const result: FigmaExportToken[] = [];
  const tokenByName = new Map<string, TokenDefinition>(
    tokenSystem.catalog.map((token) => [token.name, token]),
  );

  function visit(cssName: string) {
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
