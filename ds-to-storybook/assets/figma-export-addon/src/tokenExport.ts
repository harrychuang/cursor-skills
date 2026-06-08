import type { ResolvedFigmaExportAddonOptions } from "./options";
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTokenFamily(name: string): TokenFamily {
  if (name.includes("-color-")) return "color";
  if (name.includes("-opacity-")) return "opacity";
  if (name.includes("-shadow-")) return "shadow";
  if (
    name.includes("-typeface-") ||
    name.includes("-typescale-") ||
    name.includes("-weight-") ||
    name.includes("-line-height-")
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
): string {
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

  const completeCandidates = Array.from(candidates.entries())
    .filter(([, candidate]) => tokenLayers.every((layer) => candidate.layers.has(layer)))
    .sort(([, a], [, b]) => b.count - a.count);

  if (completeCandidates.length > 0) return completeCandidates[0][0];

  throw new Error(
    "Unable to detect a ref/sys/comp token prefix. Pass tokenPrefix in the Storybook Figma export addon options.",
  );
}

export function detectTokenSystem(
  options: ResolvedFigmaExportAddonOptions,
): DetectedTokenSystem {
  const customProperties = collectCssCustomProperties();
  const prefix = detectTokenPrefix(customProperties.keys(), options);
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

function getTokenScopes(token: TokenDefinition, type: FigmaVariableType): string[] {
  if (type === "COLOR") {
    return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  }

  if (type === "STRING") {
    if (token.name.includes("-typeface-")) return ["FONT_FAMILY"];
    return ["TEXT_CONTENT"];
  }

  if (type !== "FLOAT") return [];

  if (token.name.includes("-opacity-")) return ["OPACITY"];
  if (token.name.includes("-radius-") || token.name.includes("-shape-")) {
    return ["CORNER_RADIUS"];
  }
  if (token.name.includes("-spacing-")) {
    return ["GAP", "WIDTH_HEIGHT"];
  }
  if (token.name.includes("-weight-")) return ["FONT_WEIGHT"];
  if (token.name.includes("-line-height-")) return ["LINE_HEIGHT"];
  if (token.name.includes("-typescale-") && token.name.includes("-size")) {
    return ["FONT_SIZE"];
  }
  if (token.name.includes("-size-")) return ["WIDTH_HEIGHT"];

  return ["WIDTH_HEIGHT"];
}

export function extractCssVariableNames(
  value: string,
  tokenSystem: DetectedTokenSystem,
): string[] {
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

function toFigmaVariableName(cssName: string): string {
  return cssName.replace(/^--/, "").replaceAll("-", "/");
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
    ...(alias ? { alias } : { value: parsed?.value }),
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
