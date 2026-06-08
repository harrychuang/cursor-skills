// src/preview.tsx
import { createElement } from "react";

// src/FigmaCodeExporter.tsx
import {
  CheckIcon,
  CommandIcon,
  CopyIcon,
  FigmaIcon
} from "@storybook/icons";
import { useRef, useState } from "react";

// src/tokenExport.ts
var tokenLayerOrder = {
  comp: 2,
  ref: 0,
  sys: 1
};
var tokenLayers = ["ref", "sys", "comp"];
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getTokenFamily(name) {
  if (name.includes("-color-")) return "color";
  if (name.includes("-opacity-")) return "opacity";
  if (name.includes("-shadow-")) return "shadow";
  if (name.includes("-typeface-") || name.includes("-typescale-") || name.includes("-weight-") || name.includes("-line-height-")) {
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
  const completeCandidates = Array.from(candidates.entries()).filter(([, candidate]) => tokenLayers.every((layer) => candidate.layers.has(layer))).sort(([, a], [, b]) => b.count - a.count);
  if (completeCandidates.length > 0) return completeCandidates[0][0];
  throw new Error(
    "Unable to detect a ref/sys/comp token prefix. Pass tokenPrefix in the Storybook Figma export addon options."
  );
}
function detectTokenSystem(options) {
  const customProperties = collectCssCustomProperties();
  const prefix = detectTokenPrefix(customProperties.keys(), options);
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
function getTokenScopes(token, type) {
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
function extractCssVariableNames(value, tokenSystem) {
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
function toFigmaVariableName(cssName) {
  return cssName.replace(/^--/, "").replaceAll("-", "/");
}
function toExportToken(token, tokenByName, tokenSystem) {
  const alias = getAliasTokenName(token, tokenSystem);
  const type = getTokenType(token, tokenByName, tokenSystem);
  const parsed = alias ? void 0 : parseRawValue(token.value);
  return {
    ...alias ? { alias } : { value: parsed?.value },
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
function cssColorValue(value) {
  const normalized = value.trim();
  if (!normalized || transparentValues.has(normalized)) return void 0;
  return normalized;
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
  return isUniform ? { color, width } : void 0;
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
function isAbsoluteFidelityRoot(element, options) {
  const component = element.getAttribute("data-component");
  return Boolean(component && options.absoluteFidelityComponents.has(component));
}
function getLayoutStrategy(computed, forceAbsoluteLayout) {
  if (forceAbsoluteLayout) return "absolute";
  return computed.display.includes("flex") ? "autoLayout" : "absolute";
}
function getExportDisplay(computed, layoutStrategy) {
  if (layoutStrategy === "absolute" && computed.display.includes("flex")) {
    return "block";
  }
  return computed.display;
}
function escapeSvgAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function serializeInlineSvg(element, width, height) {
  const clone = element.cloneNode(true);
  const originalNodes = [element, ...Array.from(element.querySelectorAll("*"))];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clonedNodes.forEach((clonedNode, index) => {
    const originalNode = originalNodes[index];
    if (!(originalNode instanceof Element) || !(clonedNode instanceof Element)) return;
    const originalStyle = window.getComputedStyle(originalNode);
    const fill = cssColorValue(originalStyle.fill);
    const stroke = cssColorValue(originalStyle.stroke);
    const strokeWidth = originalStyle.strokeWidth;
    const strokeLinecap = originalStyle.strokeLinecap;
    const strokeLinejoin = originalStyle.strokeLinejoin;
    if (fill) clonedNode.setAttribute("fill", fill);
    if (originalStyle.fill === "none") clonedNode.setAttribute("fill", "none");
    if (stroke) clonedNode.setAttribute("stroke", stroke);
    if (strokeWidth && strokeWidth !== "0px") {
      clonedNode.setAttribute("stroke-width", strokeWidth.replace("px", ""));
    }
    if (strokeLinecap) clonedNode.setAttribute("stroke-linecap", strokeLinecap);
    if (strokeLinejoin) clonedNode.setAttribute("stroke-linejoin", strokeLinejoin);
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
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><polygon points="${escapeSvgAttribute(points)}" fill="${escapeSvgAttribute(fill)}"${transform}/></svg>`;
  return {
    bindings: collectBindings(element, rules, false, tokenSystem),
    children: [],
    kind: "svg",
    layoutStrategy: "absolute",
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
function createInlineSvgNode(element, computed, rect, parentRect, options) {
  const width = toFiniteNumber(rect.width);
  const height = toFiniteNumber(rect.height);
  return {
    bindings: {},
    children: [],
    kind: "svg",
    layoutStrategy: "absolute",
    name: getElementName(element, options),
    svgText: serializeInlineSvg(element, width, height),
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
function getCssRules() {
  const rules = [];
  function collect(ruleList) {
    for (const rule of Array.from(ruleList)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
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
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collect(sheet.cssRules);
    } catch {
    }
  }
  return rules;
}
function selectorMatches(element, selectorText) {
  return selectorText.split(",").some((selector) => {
    const trimmed = selector.trim();
    if (!trimmed || trimmed.includes(":hover") || trimmed.includes(":focus")) {
      return false;
    }
    try {
      return element.matches(trimmed);
    } catch {
      return false;
    }
  });
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
  const declarations = [];
  for (const rule of rules) {
    if (!selectorMatches(element, rule.selectorText)) continue;
    for (const property of Array.from(rule.style)) {
      declarations.push({
        property,
        value: rule.style.getPropertyValue(property).trim()
      });
    }
    declarations.push(...parseCssTextDeclarations(rule.style.cssText));
  }
  const inlineStyle = element.getAttribute("style");
  if (inlineStyle && element instanceof HTMLElement) {
    declarations.push(...parseCssTextDeclarations(element.style.cssText));
    for (const property of Array.from(element.style)) {
      declarations.push({
        property,
        value: element.style.getPropertyValue(property).trim()
      });
    }
  }
  return declarations;
}
function findTokenForProperty(declarations, bindingName, tokenSystem) {
  const properties = bindingProperties[bindingName];
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!properties.includes(declaration.property)) continue;
    const tokens = extractCssVariableNames(declaration.value, tokenSystem);
    if (tokens.length === 0) continue;
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
        return tokens.find((token) => token.includes("-color-"));
      }
      if (bindingName === "borderWidth") {
        return tokens.find((token) => !token.includes("-color-")) || tokens[0];
      }
    }
    if (bindingName === "backgroundColor" || bindingName === "textColor") {
      return tokens.find((token) => token.includes("-color-")) || tokens[0];
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
function getTextExportWidth({
  computed,
  text,
  width
}) {
  if (!text.trim()) return width;
  const fontSize = cssLengthToNumber(computed.fontSize) ?? 14;
  const safetyWidth = Math.max(12, fontSize);
  return toFiniteNumber(width + safetyWidth);
}
function createTextLeafNode({
  bindings,
  computed,
  height,
  name,
  text,
  width,
  x,
  y
}) {
  const color = cssColorValue(computed.color);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  const exportWidth = getTextExportWidth({ computed, text, width });
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
    layoutStrategy: "absolute",
    name,
    text,
    styles: {
      ...color ? { color } : {},
      display: computed.display,
      fontFamily: computed.fontFamily,
      fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
      ...Number.isFinite(fontWeight) ? { fontWeight } : {},
      height,
      ...lineHeight ? { lineHeight } : {},
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      width: exportWidth,
      x,
      y
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
  const declarations = getPseudoMatchedDeclarations(element, rules, pseudo);
  const bindings = {};
  for (const bindingName of ["backgroundColor", "height", "width"]) {
    const token = findTokenForProperty(declarations, bindingName, tokenSystem);
    if (token) bindings[bindingName] = token;
  }
  return bindings;
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
      display: style.display,
      height,
      opacity: Number(style.opacity),
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
      return tokens.find((token) => token.includes("-color-")) || tokens[0];
    }
    return tokens.find((token) => !token.includes("-color-")) || tokens[0];
  }
  return void 0;
}
function collectBorderLineBindings(element, rules, side, tokenSystem) {
  const declarations = getMatchedDeclarations(element, rules);
  const colorToken = findBorderLineToken(declarations, side, "color", tokenSystem);
  const widthToken = findBorderLineToken(declarations, side, "width", tokenSystem);
  const bindings = {};
  if (colorToken) bindings.backgroundColor = colorToken;
  if (widthToken) {
    if (side === "left" || side === "right") {
      bindings.width = widthToken;
    } else {
      bindings.height = widthToken;
    }
  }
  return bindings;
}
function createBorderLineNode(element, rules, side, parentWidth, parentHeight, tokenSystem, options) {
  if (!isVisibleBorderSide(window.getComputedStyle(element), side)) return void 0;
  const computed = window.getComputedStyle(element);
  const borderWidth = cssBorderWidth(computed, side);
  const backgroundColor = cssColorValue(cssBorderColor(computed, side));
  if (!backgroundColor || borderWidth <= 0) return void 0;
  const isVertical = side === "left" || side === "right";
  const width = isVertical ? borderWidth : parentWidth;
  const height = isVertical ? parentHeight : borderWidth;
  const x = side === "right" ? parentWidth - borderWidth : 0;
  const y = side === "bottom" ? parentHeight - borderWidth : 0;
  return {
    bindings: collectBorderLineBindings(element, rules, side, tokenSystem),
    children: [],
    kind: "frame",
    layoutStrategy: "absolute",
    name: `${getElementName(element, options)}__border-${side}`,
    styles: {
      backgroundColor,
      display: "block",
      height: toFiniteNumber(height),
      opacity: Number(computed.opacity),
      overflow: "visible",
      width: toFiniteNumber(width),
      x: toFiniteNumber(x),
      y: toFiniteNumber(y)
    }
  };
}
function createBorderLineNodes(element, computed, rules, parentWidth, parentHeight, tokenSystem, options) {
  if (getUniformVisibleBorder(computed)) return [];
  return borderSides.map(
    (side) => createBorderLineNode(
      element,
      rules,
      side,
      parentWidth,
      parentHeight,
      tokenSystem,
      options
    )
  ).filter((node) => Boolean(node));
}
function collectBindings(element, rules, hasUniformVisibleBorder, tokenSystem) {
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
function hasElementChildren(element) {
  return Array.from(element.children).some((child) => {
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
function getCommonAncestor(elements, boundary) {
  if (elements.length === 0) return boundary;
  let ancestor = elements[0];
  while (ancestor && ancestor !== boundary) {
    if (elements.every((element) => ancestor?.contains(element))) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }
  return boundary;
}
function findExportRoot(scope) {
  const components = Array.from(scope.querySelectorAll("[data-component]"));
  if (components.length === 1) return components[0];
  if (components.length > 1) {
    const ancestor = getCommonAncestor(components, scope);
    if (ancestor !== scope) return ancestor;
  }
  return scope.firstElementChild ?? void 0;
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
async function createExportNode(element, rootRect, parentRect, rules, tokenSystem, options, forceAbsoluteLayout = false) {
  const computed = window.getComputedStyle(element);
  if (computed.display === "none" || computed.visibility === "hidden" || Number(computed.opacity) === 0) {
    return void 0;
  }
  const rect = element.getBoundingClientRect();
  const width = toFiniteNumber(rect.width);
  const height = toFiniteNumber(rect.height);
  if (width <= 0 || height <= 0) return void 0;
  const nextForceAbsoluteLayout = forceAbsoluteLayout || isAbsoluteFidelityRoot(element, options);
  if (element instanceof SVGElement) {
    return createInlineSvgNode(element, computed, rect, parentRect, options);
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
  const childElements = Array.from(element.children);
  const hasPositionedChildren = hasOutOfFlowPositionedChildren(childElements);
  const childNodes = (await Promise.all(
    childElements.map(
      (child) => createExportNode(
        child,
        rootRect,
        rect,
        rules,
        tokenSystem,
        options,
        nextForceAbsoluteLayout
      )
    )
  )).filter((child) => Boolean(child));
  const directText = getDirectText(element);
  const backgroundColor = cssColorValue(computed.backgroundColor);
  const color = cssColorValue(computed.color);
  const border = getUniformVisibleBorder(computed);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const radius = cssLengthToNumber(computed.borderTopLeftRadius);
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  const gap = cssLengthToNumber(computed.columnGap) ?? cssLengthToNumber(computed.gap);
  const bindings = collectBindings(element, rules, Boolean(border), tokenSystem);
  const layoutStrategy = getLayoutStrategy(computed, nextForceAbsoluteLayout);
  const pseudoNodes = ["before", "after"].map(
    (pseudo) => createPseudoNode(element, rules, pseudo, width, height, tokenSystem, options)
  ).filter((node) => Boolean(node));
  const borderLineNodes = createBorderLineNodes(
    element,
    computed,
    rules,
    width,
    height,
    tokenSystem,
    options
  );
  const frameLayoutStrategy = pseudoNodes.length > 0 || borderLineNodes.length > 0 || hasPositionedChildren ? "absolute" : layoutStrategy;
  if (directText && !hasElementChildren(element)) {
    if (hasBoxedTextStyle(computed, border)) {
      const paddingLeft = cssLengthToNumber(computed.paddingLeft) ?? 0;
      const paddingRight = cssLengthToNumber(computed.paddingRight) ?? 0;
      const paddingTop = cssLengthToNumber(computed.paddingTop) ?? 0;
      const paddingBottom = cssLengthToNumber(computed.paddingBottom) ?? 0;
      const textNode = createTextLeafNode({
        bindings,
        computed,
        height: Math.max(1, height - paddingTop - paddingBottom),
        name: `${getElementName(element, options)}__text`,
        text: directText,
        width: Math.max(1, width - paddingLeft - paddingRight),
        x: paddingLeft,
        y: paddingTop
      });
      return {
        bindings,
        children: [textNode, ...borderLineNodes],
        kind: "frame",
        layoutStrategy: "absolute",
        name: getElementName(element, options),
        styles: {
          ...backgroundColor ? { backgroundColor } : {},
          ...border ? { borderColor: border.color, borderWidth: border.width } : {},
          display: getExportDisplay(computed, "absolute"),
          height,
          opacity: Number(computed.opacity),
          overflow: computed.overflow,
          paddingBottom,
          paddingLeft,
          paddingRight,
          paddingTop,
          ...radius !== void 0 && radius > 0 ? { radius } : {},
          width,
          x: toFiniteNumber(rect.left - parentRect.left),
          y: toFiniteNumber(rect.top - parentRect.top)
        }
      };
    }
    return createTextLeafNode({
      bindings,
      computed,
      height,
      name: getElementName(element, options),
      text: directText,
      width,
      x: toFiniteNumber(rect.left - parentRect.left),
      y: toFiniteNumber(rect.top - parentRect.top)
    });
  }
  const kind = element instanceof HTMLImageElement ? "image" : "frame";
  return {
    bindings,
    children: kind === "image" ? [] : [...childNodes, ...pseudoNodes, ...borderLineNodes],
    kind,
    layoutStrategy: kind === "image" ? "absolute" : frameLayoutStrategy,
    name: getElementName(element, options),
    ...kind === "image" && element instanceof HTMLImageElement ? { svgText: await fetchSvgText(element, options) } : {},
    styles: {
      ...computed.alignItems ? { alignItems: computed.alignItems } : {},
      ...backgroundColor ? { backgroundColor } : {},
      ...border ? { borderColor: border.color, borderWidth: border.width } : {},
      ...color ? { color } : {},
      display: getExportDisplay(computed, frameLayoutStrategy),
      ...frameLayoutStrategy === "autoLayout" ? { flexDirection: computed.flexDirection } : {},
      fontFamily: computed.fontFamily,
      fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
      ...Number.isFinite(fontWeight) ? { fontWeight } : {},
      ...gap !== void 0 && gap >= 0 ? { gap } : {},
      height,
      ...computed.justifyContent ? { justifyContent: computed.justifyContent } : {},
      ...lineHeight ? { lineHeight } : {},
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      paddingBottom: cssLengthToNumber(computed.paddingBottom) ?? 0,
      paddingLeft: cssLengthToNumber(computed.paddingLeft) ?? 0,
      paddingRight: cssLengthToNumber(computed.paddingRight) ?? 0,
      paddingTop: cssLengthToNumber(computed.paddingTop) ?? 0,
      ...radius !== void 0 && radius > 0 ? { radius } : {},
      width,
      x: toFiniteNumber(rect.left - parentRect.left),
      y: toFiniteNumber(rect.top - parentRect.top)
    }
  };
}
async function createFigmaExportPayload({
  componentTitle,
  options,
  scope,
  storyId,
  storyName
}) {
  const root = findExportRoot(scope);
  if (!root) {
    throw new Error("No exportable story root was found.");
  }
  const rules = getCssRules();
  const tokenSystem = detectTokenSystem(options);
  const rootRect = root.getBoundingClientRect();
  const rootNode = await createExportNode(
    root,
    rootRect,
    rootRect,
    rules,
    tokenSystem,
    options
  );
  if (!rootNode) {
    throw new Error("The story root has no visible exportable bounds.");
  }
  rootNode.styles.x = 0;
  rootNode.styles.y = 0;
  const tokenNames = /* @__PURE__ */ new Set();
  function collectNodeTokens(node) {
    Object.values(node.bindings).forEach((token) => {
      if (token) tokenNames.add(token);
    });
    node.children.forEach(collectNodeTokens);
  }
  collectNodeTokens(rootNode);
  return {
    componentTitle,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    root: rootNode,
    storyId,
    storyName,
    tokenSystem: {
      collections: tokenSystem.collections,
      layers: tokenSystem.layers,
      pluginDataKey: tokenSystem.pluginDataKey,
      prefix: tokenSystem.prefix
    },
    tokens: collectTokensForExport(tokenNames, tokenSystem),
    version: 1
  };
}

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
    pluginDataKey: options?.pluginDataKey ?? "storybookCssToken",
    reviewStorageKey: options?.reviewStorageKey ?? "storybookFigmaExportReviews",
    reviewStatuses: options?.reviewStatuses ?? [
      "not-reviewed",
      "exported",
      "need-fix",
      "approved"
    ],
    sourceReferences: options?.sourceReferences ?? [],
    storyTitlePrefix: normalizeStoryTitlePrefix(options?.storyTitlePrefix),
    tokenLayers: {
      ...defaultTokenLayers,
      ...options?.tokenLayers
    },
    tokenPrefix: normalizeTokenPrefix(options?.tokenPrefix)
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
  const COLLECTION_NAMES = payload.tokenSystem?.collections || {
    ref: "ref",
    sys: "sys",
    comp: "comp",
  };
  const PLUGIN_DATA_TOKEN_KEY =
    payload.tokenSystem?.pluginDataKey || "storybookCssToken";

  const BINDABLE_RADIUS_FIELDS = [
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
  ];

  const layerOrder = { ref: 0, sys: 1, comp: 2 };
  const registry = new Map();
  const rawTokenByName = new Map(
    (payload.tokens || []).map((token) => [token.cssName, token]),
  );

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cloneColor(color) {
    return {
      r: clamp(Number(color.r) || 0, 0, 1),
      g: clamp(Number(color.g) || 0, 0, 1),
      b: clamp(Number(color.b) || 0, 0, 1),
      a: clamp(Number(color.a ?? 1), 0, 1),
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
        a: clamp(parts[3] ?? 1, 0, 1),
      };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  }

  function solidPaint(cssValue, variable) {
    const color = variable?.resolvedType === "COLOR" && variable.valuesByMode
      ? { r: 0, g: 0, b: 0 }
      : colorFromCss(cssValue);
    const paint = {
      type: "SOLID",
      color: { r: color.r, g: color.g, b: color.b },
      opacity: color.a ?? 1,
    };

    if (variable && figma.variables?.setBoundVariableForPaint) {
      try {
        return figma.variables.setBoundVariableForPaint(paint, "color", variable);
      } catch {
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
    if (created.modes[0]?.name !== "Default") {
      created.renameMode(created.modes[0].modeId, "Default");
    }
    return created;
  }

  function getVariablePluginData(variable, key) {
    try {
      return typeof variable.getPluginData === "function" ? variable.getPluginData(key) : "";
    } catch {
      return "";
    }
  }

  function setVariablePluginData(variable, key, value) {
    try {
      if (typeof variable.setPluginData === "function") {
        variable.setPluginData(key, value);
      }
    } catch {
      // Older Figma runtimes may not support plugin data on variables.
    }
  }

  async function findExistingVariable(collection, spec) {
    const variables = await figma.variables.getLocalVariablesAsync();
    return variables.find((variable) => {
      if (variable.variableCollectionId !== collection.id) return false;
      if (getVariablePluginData(variable, PLUGIN_DATA_TOKEN_KEY) === spec.cssName) return true;
      return variable.name === spec.figmaName;
    });
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
      } catch {
        // Scope support differs by variable type and Figma runtime.
      }
    }

    try {
      variable.setVariableCodeSyntax("WEB", "var(" + spec.cssName + ")");
    } catch {
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
      variable.setValueForMode(modeId, spec.value);
    }

    registry.set(spec.cssName, variable);
    return variable;
  }

  async function upsertVariables(tokens) {
    const sorted = [...tokens].sort((a, b) => {
      const byLayer = (layerOrder[a.collection] ?? 9) - (layerOrder[b.collection] ?? 9);
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
    } catch {
      // Some imported nodes do not allow direct resize.
    }
  }

  function safeBind(node, field, tokenName) {
    const variable = registry.get(tokenName);
    if (!variable || typeof node.setBoundVariable !== "function") return;

    try {
      node.setBoundVariable(field, variable);
    } catch {
      // Not every node supports every variable binding field.
    }
  }

  function setFrameLayoutMode(node, mode) {
    if (!("layoutMode" in node)) return;

    try {
      node.layoutMode = mode;
    } catch {
      // Some nodes cannot change layout mode after import.
    }
  }

  function positionChildNode(parent, child, childSpec) {
    const styles = childSpec.styles || {};

    if (childSpec.layoutStrategy === "absolute") {
      if ("layoutPositioning" in child) {
        try {
          child.layoutPositioning = "ABSOLUTE";
        } catch {
          // Older Figma nodes may not allow absolute positioning.
        }
      }

      child.x = styles.x || 0;
      child.y = styles.y || 0;
      return;
    }

    if (parent.layoutMode === "NONE") {
      child.x = styles.x || 0;
      child.y = styles.y || 0;
    }
  }

  function setFrameFills(node, styles, bindings) {
    const variable = registry.get(bindings.backgroundColor);
    if (styles.backgroundColor || variable) {
      node.fills = [solidPaint(styles.backgroundColor, variable)];
    } else {
      node.fills = [];
    }
  }

  function setStrokes(node, styles, bindings) {
    const colorVariable = registry.get(bindings.borderColor);
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
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.primaryAxisAlignItems = mapAxisAlignment(styles.justifyContent);
    node.counterAxisAlignItems = mapCounterAlignment(styles.alignItems);
    node.itemSpacing = styles.gap ?? 0;
    node.paddingLeft = styles.paddingLeft ?? 0;
    node.paddingRight = styles.paddingRight ?? 0;
    node.paddingTop = styles.paddingTop ?? 0;
    node.paddingBottom = styles.paddingBottom ?? 0;

    safeBind(node, "itemSpacing", bindings.gap);
    safeBind(node, "paddingLeft", bindings.paddingLeft);
    safeBind(node, "paddingRight", bindings.paddingRight);
    safeBind(node, "paddingTop", bindings.paddingTop);
    safeBind(node, "paddingBottom", bindings.paddingBottom);
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

  function getFontFamily(fontFamily) {
    const first = String(fontFamily || "Inter").split(",")[0]?.trim();
    return first ? first.replace(/^["']|["']$/g, "") : "Inter";
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
    return token.value ?? token.rawValue;
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
      } catch {
        // Try next style before skipping the font-family binding.
      }
    }

    return false;
  }

  async function loadTextFont(styles) {
    const family = getFontFamily(styles.fontFamily);
    const styleCandidates = getFontStyleCandidates(styles.fontWeight || 400);

    for (const style of styleCandidates) {
      const fontName = { family, style };
      try {
        await loadFont(fontName);
        return fontName;
      } catch {
        // Try the next style for the same family before falling back.
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
      } catch {
        // Some runtimes do not allow range font inspection before insertion.
      }
    }

    for (const fontName of fonts) {
      try {
        await loadFont(fontName);
      } catch {
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

  async function createTextNode(spec) {
    const node = figma.createText();
    const styles = spec.styles;
    const bindings = spec.bindings || {};
    node.name = spec.name;
    node.fontName = await loadTextFont(styles);
    node.characters = spec.text || "";
    node.fontSize = styles.fontSize || 14;
    if (styles.lineHeight && styles.lineHeight !== "normal") {
      node.lineHeight = { unit: "PIXELS", value: styles.lineHeight };
    }
    node.fills = [solidPaint(styles.color, registry.get(bindings.textColor))];
    safeResize(node, styles.width, styles.height);
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
      } catch {
        // Keep an empty wrapper if SVG import fails.
      }
    }

    return wrapper;
  }

  async function createFrameNode(spec) {
    const node = figma.createFrame();
    const styles = spec.styles;
    const bindings = spec.bindings || {};
    node.name = spec.name;
    safeResize(node, styles.width, styles.height);
    node.clipsContent = styles.overflow === "hidden";
    node.opacity = styles.opacity ?? 1;
    setFrameFills(node, styles, bindings);
    setStrokes(node, styles, bindings);
    applyRadius(node, styles, bindings);
    applyAutoLayout(node, spec, styles, bindings);
    safeBind(node, "width", bindings.width);
    safeBind(node, "height", bindings.height);
    safeBind(node, "opacity", bindings.opacity);
    safeBind(node, "strokeWeight", bindings.borderWidth);

    for (const childSpec of spec.children || []) {
      const child = await createNode(childSpec);
      await loadNodeFonts(child);
      node.appendChild(child);
      positionChildNode(node, child, childSpec);
    }

    if (spec.layoutStrategy === "absolute") {
      setFrameLayoutMode(node, "NONE");
    }

    return node;
  }

  async function createNode(spec) {
    const node =
      spec.kind === "text"
        ? await createTextNode(spec)
        : spec.kind === "image" || spec.kind === "svg"
          ? await createImageNode(spec)
          : await createFrameNode(spec);

    node.x = spec.styles.x || 0;
    node.y = spec.styles.y || 0;
    return node;
  }

  await upsertVariables(payload.tokens || []);
  const rootNode = await createNode(payload.root);
  rootNode.name = payload.componentTitle + " / " + payload.storyName;
  await loadNodeFonts(rootNode);
  figma.currentPage.appendChild(rootNode);
  figma.viewport.scrollAndZoomIntoView([rootNode]);

  figma.notify(
    "Imported " + payload.componentTitle + " with " +
      (payload.tokens || []).length + " variables checked.",
  );
})(STORYBOOK_FIGMA_EXPORT).catch((error) => {
  console.error(error);
  figma.notify("Storybook import failed: " + (error?.message || String(error)));
});
`;
}

// src/FigmaCodeExporter.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var statusLabels = {
  copied: "Copied",
  copying: "Exporting",
  error: "Failed",
  idle: "Ready"
};
var reviewStatusLabels = {
  approved: "Approved",
  exported: "Exported",
  "need-fix": "Need fix",
  "not-reviewed": "Not reviewed"
};
function getExportComponentTitle(title, options) {
  if (!title) return "Component";
  if (options.storyTitlePrefix === false) return title;
  const matchingPrefix = options.storyTitlePrefix.find(
    (prefix) => title.startsWith(prefix)
  );
  return matchingPrefix ? title.slice(matchingPrefix.length) : title;
}
function normalizeSourceReference(reference, fallbackLabel) {
  if (!reference) return void 0;
  if (typeof reference === "string") {
    return {
      label: fallbackLabel,
      type: reference.includes("figma.com") ? "figma" : "reference",
      url: reference
    };
  }
  if (!reference.url) return void 0;
  return {
    ...reference,
    label: reference.label ?? fallbackLabel,
    type: reference.type ?? (reference.url.includes("figma.com") ? "figma" : "reference")
  };
}
function getDesignParameterReferences(design) {
  if (!design) return [];
  const values = Array.isArray(design) ? design : [design];
  return values.map((entry, index) => {
    if (!entry || typeof entry !== "object") return void 0;
    const candidate = entry;
    if (!candidate.url) return void 0;
    return normalizeSourceReference(
      {
        label: candidate.name ?? (candidate.type === "figma" ? "Figma design" : "Design reference"),
        type: candidate.type === "figma" ? "figma" : "reference",
        url: candidate.url
      },
      `Design reference ${index + 1}`
    );
  }).filter((reference) => Boolean(reference));
}
function getSourceReferences(context, options) {
  const parameterReferences = context.parameters?.figmaExport?.sourceReferences ?? [];
  const singleParameterReference = context.parameters?.figmaExport?.sourceReference ?? context.parameters?.figmaExport?.sourceUrl;
  const normalizedSingle = normalizeSourceReference(singleParameterReference, "Source");
  return [
    ...options.sourceReferences.map(
      (reference, index) => normalizeSourceReference(reference, `Configured source ${index + 1}`)
    ).filter((reference) => Boolean(reference)),
    ...parameterReferences.map((reference, index) => normalizeSourceReference(reference, `Source ${index + 1}`)).filter((reference) => Boolean(reference)),
    ...normalizedSingle ? [normalizedSingle] : [],
    ...getDesignParameterReferences(context.parameters?.design)
  ];
}
function getReviewStorageKey(context, options) {
  const namespace = context.parameters?.figmaExport?.reviewStorageKey ?? options.reviewStorageKey;
  return `${namespace}:${context.id ?? context.title ?? context.name ?? "unknown-story"}`;
}
function readReviewStatus(context, options) {
  if (typeof window === "undefined") return "not-reviewed";
  const stored = window.localStorage.getItem(getReviewStorageKey(context, options));
  return options.reviewStatuses.includes(stored) ? stored : "not-reviewed";
}
function writeReviewStatus(context, options, nextStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getReviewStorageKey(context, options), nextStatus);
}
function openReference(url) {
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
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
function FigmaCodeExporter({
  children,
  context,
  options
}) {
  const scopeRef = useRef(null);
  const [activeFormat, setActiveFormat] = useState();
  const [copiedFormat, setCopiedFormat] = useState();
  const [status, setStatus] = useState("idle");
  const [summary, setSummary] = useState("");
  const resolvedOptions = resolveFigmaExportAddonOptions(options);
  const enabled = context.globals?.[resolvedOptions.globalName] === "on";
  const includedStory = isStoryIncludedForFigmaExport(context.title, resolvedOptions);
  const componentTitle = getExportComponentTitle(context.title, resolvedOptions);
  const sourceReferences = getSourceReferences(context, resolvedOptions);
  const primarySource = sourceReferences[0];
  const [reviewStatus, setReviewStatus] = useState(
    () => readReviewStatus(context, resolvedOptions)
  );
  const reviewLabel = reviewStatusLabels[reviewStatus] ?? reviewStatus;
  function handleReviewStatusChange(nextStatus) {
    setReviewStatus(nextStatus);
    writeReviewStatus(context, resolvedOptions, nextStatus);
  }
  async function handleCopy(format) {
    const scope = scopeRef.current;
    if (!scope) return;
    setActiveFormat(format);
    setCopiedFormat(void 0);
    setStatus("copying");
    setSummary(format === "json" ? "Generating JSON payload..." : "Generating console script...");
    try {
      const payload = await createFigmaExportPayload({
        componentTitle,
        options: resolvedOptions,
        scope,
        storyId: context.id ?? "unknown-story",
        storyName: context.name ?? "Story"
      });
      const exportText = format === "json" ? createFigmaExportJson(payload) : createFigmaPluginCode(payload);
      await copyText(exportText);
      setCopiedFormat(format);
      setStatus("copied");
      setSummary(
        format === "json" ? `${payload.tokens.length} variables exported from ${payload.root.name}; JSON copied for importer.` : `${payload.tokens.length} variables exported from ${payload.root.name}; script copied for plugin console only.`
      );
    } catch (error) {
      setStatus("error");
      setCopiedFormat(void 0);
      setSummary(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setActiveFormat(void 0);
    }
  }
  if (!includedStory) {
    return /* @__PURE__ */ jsx(Fragment, { children });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "sbfx-story-scope", ref: scopeRef, children }),
    enabled ? /* @__PURE__ */ jsxs(
      "aside",
      {
        "aria-label": "Figma export",
        className: "sbfx-exporter",
        "data-status": status,
        children: [
          /* @__PURE__ */ jsxs("header", { className: "sbfx-exporter__header", children: [
            /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__mark", "aria-hidden": "true", children: /* @__PURE__ */ jsx(FigmaIcon, { size: 14 }) }),
            /* @__PURE__ */ jsxs("span", { className: "sbfx-exporter__heading", children: [
              /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__title", children: "Figma export" }),
              /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__subtitle", title: componentTitle, children: componentTitle })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sbfx-exporter__info", children: [
            /* @__PURE__ */ jsxs("span", { className: "sbfx-exporter__status", children: [
              /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__status-dot", "aria-hidden": "true" }),
              statusLabels[status]
            ] }),
            summary ? /* @__PURE__ */ jsx("p", { className: "sbfx-exporter__summary", title: summary, children: summary }) : null
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sbfx-exporter__actions", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "sbfx-exporter__button",
                "data-exporting": status === "copying" ? "true" : void 0,
                disabled: status === "copying",
                onClick: () => {
                  void handleCopy("json");
                },
                type: "button",
                children: [
                  copiedFormat === "json" && status === "copied" ? /* @__PURE__ */ jsx(CheckIcon, { size: 14 }) : /* @__PURE__ */ jsx(CopyIcon, { size: 14 }),
                  activeFormat === "json" ? "Copying" : copiedFormat === "json" && status === "copied" ? "Copied" : "Copy JSON"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "sbfx-exporter__button sbfx-exporter__button--secondary",
                "data-exporting": status === "copying" ? "true" : void 0,
                disabled: status === "copying",
                onClick: () => {
                  void handleCopy("script");
                },
                type: "button",
                children: [
                  copiedFormat === "script" && status === "copied" ? /* @__PURE__ */ jsx(CheckIcon, { size: 14 }) : /* @__PURE__ */ jsx(CommandIcon, { size: 14 }),
                  activeFormat === "script" ? "Copying" : copiedFormat === "script" && status === "copied" ? "Copied" : "Plugin Console Script"
                ]
              }
            )
          ] })
        ]
      }
    ) : null,
    enabled ? /* @__PURE__ */ jsxs(
      "aside",
      {
        "aria-label": "Figma source review",
        className: "sbfx-exporter sbfx-exporter--source",
        "data-review-status": reviewStatus,
        children: [
          /* @__PURE__ */ jsxs("header", { className: "sbfx-exporter__header", children: [
            /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__mark", "aria-hidden": "true", children: /* @__PURE__ */ jsx(FigmaIcon, { size: 14 }) }),
            /* @__PURE__ */ jsxs("span", { className: "sbfx-exporter__heading", children: [
              /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__title", children: "Source review" }),
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "sbfx-exporter__subtitle",
                  title: primarySource?.label ?? "No source reference configured",
                  children: primarySource?.label ?? "No source reference configured"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sbfx-exporter__actions sbfx-exporter__actions--source", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "sbfx-exporter__button",
                disabled: !primarySource?.url,
                onClick: () => openReference(primarySource?.url),
                type: "button",
                children: [
                  /* @__PURE__ */ jsx(FigmaIcon, { size: 14 }),
                  "Open source"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "sbfx-exporter__button sbfx-exporter__button--secondary",
                disabled: !primarySource?.editUrl && !primarySource?.url,
                onClick: () => openReference(primarySource?.editUrl ?? primarySource?.url),
                type: "button",
                children: [
                  /* @__PURE__ */ jsx(CommandIcon, { size: 14 }),
                  "Edit source"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "sbfx-exporter__review", children: [
            /* @__PURE__ */ jsx("span", { className: "sbfx-exporter__review-label", children: "Export review" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                className: "sbfx-exporter__select",
                onChange: (event) => handleReviewStatusChange(event.target.value),
                value: reviewStatus,
                children: resolvedOptions.reviewStatuses.map((statusOption) => /* @__PURE__ */ jsx("option", { value: statusOption, children: reviewStatusLabels[statusOption] ?? statusOption }, statusOption))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "sbfx-exporter__summary", title: `Current review status: ${reviewLabel}`, children: [
            "Current review status: ",
            reviewLabel
          ] })
        ]
      }
    ) : null
  ] });
}

// src/preview.tsx
function getFigmaExportGlobalName(options) {
  return options?.globalName ?? defaultFigmaExportGlobalName;
}
function createFigmaExportDecorator(options) {
  return (Story, context) => createElement(FigmaCodeExporter, { context, options }, Story());
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
  getFigmaExportGlobalName
};
//# sourceMappingURL=preview.js.map