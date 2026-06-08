import type {
  FigmaBindingName,
  FigmaExportNode,
  FigmaLayoutStrategy,
  FigmaExportPayload,
} from "./types";
import type { ResolvedFigmaExportAddonOptions } from "./options";
import {
  collectTokensForExport,
  detectTokenSystem,
  extractCssVariableNames,
  type DetectedTokenSystem,
} from "./tokenExport";

type MatchedDeclaration = {
  property: string;
  value: string;
};

type BorderSide = "top" | "right" | "bottom" | "left";
type PseudoElementName = "before" | "after";

const bindingProperties: Record<FigmaBindingName, string[]> = {
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
  width: ["inline-size", "width"],
};

const transparentValues = new Set([
  "rgba(0, 0, 0, 0)",
  "rgba(0,0,0,0)",
  "transparent",
]);

const inheritedBindings = new Set<FigmaBindingName>([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "textColor",
]);

const borderSides: BorderSide[] = ["top", "right", "bottom", "left"];

type VisibleBorder = {
  color: string;
  width: number;
};

function toFiniteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : fallback;
}

function cssLengthToNumber(value: string): number | undefined {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : undefined;
}

function cssPercentToNumber(value: string, basis: number): number | undefined {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  return match ? (Number(match[1]) / 100) * basis : undefined;
}

function cssPositionToNumber(value: string, basis: number): number | undefined {
  return cssLengthToNumber(value) ?? cssPercentToNumber(value, basis);
}

function cssMatrixTranslationToNumber(
  transform: string,
): { x: number; y: number } | undefined {
  const matrix3d = transform.trim().match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values = matrix3d[1].split(",").map((value) => Number(value.trim()));
    if (values.length === 16 && values.every(Number.isFinite)) {
      return { x: values[12], y: values[13] };
    }
  }

  const matrix = transform.trim().match(/^matrix\((.+)\)$/);
  if (!matrix) return undefined;

  const values = matrix[1].split(",").map((value) => Number(value.trim()));
  if (values.length !== 6 || !values.every(Number.isFinite)) return undefined;
  return { x: values[4], y: values[5] };
}

function cssLineHeightToNumber(value: string): number | "normal" | undefined {
  if (value === "normal") return "normal";
  return cssLengthToNumber(value);
}

function cssColorValue(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized || transparentValues.has(normalized)) return undefined;
  return normalized;
}

function cssBorderWidth(computed: CSSStyleDeclaration, side: string): number {
  return cssLengthToNumber(computed.getPropertyValue(`border-${side}-width`)) ?? 0;
}

function cssBorderStyle(computed: CSSStyleDeclaration, side: string): string {
  return computed.getPropertyValue(`border-${side}-style`).trim();
}

function cssBorderColor(computed: CSSStyleDeclaration, side: string): string {
  return computed.getPropertyValue(`border-${side}-color`).trim();
}

function isVisibleBorderSide(computed: CSSStyleDeclaration, side: string): boolean {
  const width = cssBorderWidth(computed, side);
  const style = cssBorderStyle(computed, side);
  return width > 0 && style !== "none" && style !== "hidden";
}

function getUniformVisibleBorder(
  computed: CSSStyleDeclaration,
): VisibleBorder | undefined {
  const visibleSides = borderSides.filter((side) => isVisibleBorderSide(computed, side));

  if (visibleSides.length !== borderSides.length) return undefined;

  const width = cssBorderWidth(computed, "top");
  const style = cssBorderStyle(computed, "top");
  const color = cssColorValue(cssBorderColor(computed, "top"));

  if (!color) return undefined;

  const isUniform = borderSides.every(
    (side) =>
      cssBorderWidth(computed, side) === width &&
      cssBorderStyle(computed, side) === style &&
      cssBorderColor(computed, side) === cssBorderColor(computed, "top"),
  );

  return isUniform ? { color, width } : undefined;
}

function getElementName(
  element: Element,
  options: ResolvedFigmaExportAddonOptions,
): string {
  const component = element.getAttribute("data-component");
  const variant = element.getAttribute("data-variant");
  const icon = element.getAttribute("data-icon");
  const classNames = Array.from(element.classList);
  const preferredClassName = options.componentClassPrefixes.length
    ? classNames.find((name) =>
        options.componentClassPrefixes.some((prefix) => name.startsWith(prefix)),
      )
    : undefined;
  const className = preferredClassName ?? classNames[0];
  const base = component || icon || className || element.tagName.toLowerCase();
  return variant ? `${base}/${variant}` : base;
}

function isAbsoluteFidelityRoot(
  element: Element,
  options: ResolvedFigmaExportAddonOptions,
): boolean {
  const component = element.getAttribute("data-component");
  return Boolean(component && options.absoluteFidelityComponents.has(component));
}

function getLayoutStrategy(
  computed: CSSStyleDeclaration,
  forceAbsoluteLayout: boolean,
): FigmaLayoutStrategy {
  if (forceAbsoluteLayout) return "absolute";
  return computed.display.includes("flex") ? "autoLayout" : "absolute";
}

function getExportDisplay(
  computed: CSSStyleDeclaration,
  layoutStrategy: FigmaLayoutStrategy,
): string {
  if (layoutStrategy === "absolute" && computed.display.includes("flex")) {
    return "block";
  }

  return computed.display;
}

function escapeSvgAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function serializeInlineSvg(element: SVGElement, width: number, height: number): string {
  const clone = element.cloneNode(true) as SVGElement;
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

function splitTopLevelComma(value: string): [string, string | undefined] {
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "," && depth === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
    }
  }

  return [value.trim(), undefined];
}

function resolveCssVarInSvgValue(value: string, fallbackValue = "#000000"): string {
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
    const resolved =
      document.documentElement.style.getPropertyValue(propertyName).trim() ||
      window.getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim() ||
      (document.body
        ? window.getComputedStyle(document.body).getPropertyValue(propertyName).trim()
        : "") ||
      fallback ||
      fallbackValue;

    result += resolved.trim();
    cursor = end + 1;
  }

  return result;
}

function sanitizeSvgTextForFigma(svgText: string): string {
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

function parsePolygonPoint(value: string, size: number): number {
  const normalized = value.trim();
  if (normalized.endsWith("%")) {
    return (Number(normalized.slice(0, -1)) / 100) * size;
  }
  return Number(normalized.replace("px", ""));
}

function getPolygonPoints(
  clipPath: string,
  width: number,
  height: number,
): string | undefined {
  const match = clipPath.trim().match(/^polygon\((.+)\)$/);
  if (!match) return undefined;

  const points = match[1]
    .split(",")
    .map((point) => point.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([xValue, yValue]) => {
      const x = toFiniteNumber(parsePolygonPoint(xValue, width));
      const y = toFiniteNumber(parsePolygonPoint(yValue, height));
      return `${x},${y}`;
    });

  return points.length >= 3 ? points.join(" ") : undefined;
}

function createClipPathSvgNode(
  element: Element,
  computed: CSSStyleDeclaration,
  rect: DOMRect,
  parentRect: DOMRect,
  rules: CSSStyleRule[],
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
): FigmaExportNode | undefined {
  if (!computed.clipPath || computed.clipPath === "none") return undefined;

  const width = toFiniteNumber(rect.width);
  const height = toFiniteNumber(rect.height);
  const points = getPolygonPoints(computed.clipPath, width, height);
  if (!points) return undefined;

  const fill = cssColorValue(computed.backgroundColor) ?? cssColorValue(computed.color);
  if (!fill) return undefined;

  const transform =
    computed.transform && computed.transform.startsWith("matrix(-1")
      ? ` transform="rotate(180 ${width / 2} ${height / 2})"`
      : "";
  const svgText =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    `<polygon points="${escapeSvgAttribute(points)}" fill="${escapeSvgAttribute(fill)}"${transform}/>` +
    `</svg>`;

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
      y: toFiniteNumber(rect.top - parentRect.top),
    },
  };
}

function createInlineSvgNode(
  element: SVGElement,
  computed: CSSStyleDeclaration,
  rect: DOMRect,
  parentRect: DOMRect,
  options: ResolvedFigmaExportAddonOptions,
): FigmaExportNode {
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
      y: toFiniteNumber(rect.top - parentRect.top),
    },
  };
}

function getCssRules(): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];

  function collect(ruleList: CSSRuleList) {
    for (const rule of Array.from(ruleList)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
        continue;
      }

      if ("cssRules" in rule) {
        try {
          collect((rule as CSSMediaRule).cssRules);
        } catch {
          // Ignore inaccessible nested rules.
        }
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collect(sheet.cssRules);
    } catch {
      // Ignore cross-origin or browser-managed style sheets.
    }
  }

  return rules;
}

function selectorMatches(element: Element, selectorText: string): boolean {
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

function parseCssTextDeclarations(cssText: string): MatchedDeclaration[] {
  const declarations: MatchedDeclaration[] = [];
  let current = "";
  let depth = 0;
  const chunks: string[] = [];

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

function getMatchedDeclarations(
  element: Element,
  rules: CSSStyleRule[],
): MatchedDeclaration[] {
  const declarations: MatchedDeclaration[] = [];

  for (const rule of rules) {
    if (!selectorMatches(element, rule.selectorText)) continue;

    for (const property of Array.from(rule.style)) {
      declarations.push({
        property,
        value: rule.style.getPropertyValue(property).trim(),
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
        value: element.style.getPropertyValue(property).trim(),
      });
    }
  }

  return declarations;
}

function findTokenForProperty(
  declarations: MatchedDeclaration[],
  bindingName: FigmaBindingName,
  tokenSystem: DetectedTokenSystem,
): string | undefined {
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

  return undefined;
}

function pickBindings(
  bindings: Partial<Record<FigmaBindingName, string>>,
  names: FigmaBindingName[],
): Partial<Record<FigmaBindingName, string>> {
  const picked: Partial<Record<FigmaBindingName, string>> = {};
  names.forEach((name) => {
    const token = bindings[name];
    if (token) picked[name] = token;
  });
  return picked;
}

function getTextExportWidth({
  computed,
  text,
  width,
}: {
  computed: CSSStyleDeclaration;
  text: string;
  width: number;
}): number {
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
  y,
}: {
  bindings: Partial<Record<FigmaBindingName, string>>;
  computed: CSSStyleDeclaration;
  height: number;
  name: string;
  text: string;
  width: number;
  x: number;
  y: number;
}): FigmaExportNode {
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
      "textColor",
    ]),
    children: [],
    kind: "text",
    layoutStrategy: "absolute",
    name,
    text,
    styles: {
      ...(color ? { color } : {}),
      display: computed.display,
      fontFamily: computed.fontFamily,
      fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
      ...(Number.isFinite(fontWeight) ? { fontWeight } : {}),
      height,
      ...(lineHeight ? { lineHeight } : {}),
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      width: exportWidth,
      x,
      y,
    },
  };
}

function hasBoxedTextStyle(
  computed: CSSStyleDeclaration,
  border: VisibleBorder | undefined,
): boolean {
  return Boolean(
    cssColorValue(computed.backgroundColor) ||
      border ||
      cssLengthToNumber(computed.borderTopLeftRadius) ||
      cssLengthToNumber(computed.paddingBottom) ||
      cssLengthToNumber(computed.paddingLeft) ||
      cssLengthToNumber(computed.paddingRight) ||
      cssLengthToNumber(computed.paddingTop),
  );
}

function getPseudoMatchedDeclarations(
  element: Element,
  rules: CSSStyleRule[],
  pseudo: PseudoElementName,
): MatchedDeclaration[] {
  const declarations: MatchedDeclaration[] = [];
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
        value: rule.style.getPropertyValue(property).trim(),
      });
    }
    declarations.push(...parseCssTextDeclarations(rule.style.cssText));
  }

  return declarations;
}

function collectPseudoBindings(
  element: Element,
  rules: CSSStyleRule[],
  pseudo: PseudoElementName,
  tokenSystem: DetectedTokenSystem,
): Partial<Record<FigmaBindingName, string>> {
  const declarations = getPseudoMatchedDeclarations(element, rules, pseudo);
  const bindings: Partial<Record<FigmaBindingName, string>> = {};

  for (const bindingName of ["backgroundColor", "height", "width"] as FigmaBindingName[]) {
    const token = findTokenForProperty(declarations, bindingName, tokenSystem);
    if (token) bindings[bindingName] = token;
  }

  return bindings;
}

function createPseudoNode(
  element: Element,
  rules: CSSStyleRule[],
  pseudo: PseudoElementName,
  parentWidth: number,
  parentHeight: number,
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
): FigmaExportNode | undefined {
  const style = window.getComputedStyle(element, `::${pseudo}`);
  const content = style.content.trim();
  const width = cssLengthToNumber(style.width) ?? 0;
  const height = cssLengthToNumber(style.height) ?? 0;
  const backgroundColor = cssColorValue(style.backgroundColor);

  if (
    content === "none" ||
    content === "normal" ||
    width <= 0 ||
    height <= 0 ||
    !backgroundColor
  ) {
    return undefined;
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
      y: toFiniteNumber(top + translateY),
    },
  };
}

function getBorderLineProperties(side: BorderSide): string[] {
  const logicalProperties: Record<BorderSide, string[]> = {
    bottom: ["border-block-end", "border-block"],
    left: ["border-inline-start", "border-inline"],
    right: ["border-inline-end", "border-inline"],
    top: ["border-block-start", "border-block"],
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
    "border-width",
  ];
}

function findBorderLineToken(
  declarations: MatchedDeclaration[],
  side: BorderSide,
  target: "color" | "width",
  tokenSystem: DetectedTokenSystem,
): string | undefined {
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

  return undefined;
}

function collectBorderLineBindings(
  element: Element,
  rules: CSSStyleRule[],
  side: BorderSide,
  tokenSystem: DetectedTokenSystem,
): Partial<Record<FigmaBindingName, string>> {
  const declarations = getMatchedDeclarations(element, rules);
  const colorToken = findBorderLineToken(declarations, side, "color", tokenSystem);
  const widthToken = findBorderLineToken(declarations, side, "width", tokenSystem);
  const bindings: Partial<Record<FigmaBindingName, string>> = {};

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

function createBorderLineNode(
  element: Element,
  rules: CSSStyleRule[],
  side: BorderSide,
  parentWidth: number,
  parentHeight: number,
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
): FigmaExportNode | undefined {
  if (!isVisibleBorderSide(window.getComputedStyle(element), side)) return undefined;

  const computed = window.getComputedStyle(element);
  const borderWidth = cssBorderWidth(computed, side);
  const backgroundColor = cssColorValue(cssBorderColor(computed, side));
  if (!backgroundColor || borderWidth <= 0) return undefined;

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
      y: toFiniteNumber(y),
    },
  };
}

function createBorderLineNodes(
  element: Element,
  computed: CSSStyleDeclaration,
  rules: CSSStyleRule[],
  parentWidth: number,
  parentHeight: number,
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
): FigmaExportNode[] {
  if (getUniformVisibleBorder(computed)) return [];

  return borderSides
    .map((side) =>
      createBorderLineNode(
        element,
        rules,
        side,
        parentWidth,
        parentHeight,
        tokenSystem,
        options,
      ),
    )
    .filter((node): node is FigmaExportNode => Boolean(node));
}

function collectBindings(
  element: Element,
  rules: CSSStyleRule[],
  hasUniformVisibleBorder: boolean,
  tokenSystem: DetectedTokenSystem,
): Partial<Record<FigmaBindingName, string>> {
  const declarations = getMatchedDeclarations(element, rules);
  const bindings: Partial<Record<FigmaBindingName, string>> = {};

  (Object.keys(bindingProperties) as FigmaBindingName[]).forEach((bindingName) => {
    if (
      !hasUniformVisibleBorder &&
      (bindingName === "borderColor" || bindingName === "borderWidth")
    ) {
      return;
    }

    let token = findTokenForProperty(declarations, bindingName, tokenSystem);
    let ancestor = element.parentElement;

    while (!token && inheritedBindings.has(bindingName) && ancestor) {
      token = findTokenForProperty(
        getMatchedDeclarations(ancestor, rules),
        bindingName,
        tokenSystem,
      );
      ancestor = ancestor.parentElement;
    }

    if (token) bindings[bindingName] = token;
  });

  return bindings;
}

function getDirectText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function hasElementChildren(element: Element): boolean {
  return Array.from(element.children).some((child) => {
    const style = window.getComputedStyle(child);
    return style.display !== "none";
  });
}

function hasOutOfFlowPositionedChildren(elements: Element[]): boolean {
  return elements.some((child) => {
    const position = window.getComputedStyle(child).position;
    return position === "absolute" || position === "fixed";
  });
}

function getCommonAncestor(elements: Element[], boundary: Element): Element {
  if (elements.length === 0) return boundary;
  let ancestor: Element | null = elements[0];

  while (ancestor && ancestor !== boundary) {
    if (elements.every((element) => ancestor?.contains(element))) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }

  return boundary;
}

function findExportRoot(scope: HTMLElement): Element | undefined {
  const components = Array.from(scope.querySelectorAll("[data-component]"));
  if (components.length === 1) return components[0];
  if (components.length > 1) {
    const ancestor = getCommonAncestor(components, scope);
    if (ancestor !== scope) return ancestor;
  }

  return scope.firstElementChild ?? undefined;
}

async function fetchSvgText(
  element: HTMLImageElement,
  options: ResolvedFigmaExportAddonOptions,
): Promise<string | undefined> {
  const graphicName = element.getAttribute("data-graphic");
  if (element.getAttribute("data-component") === "graphic" && graphicName) {
    const svgText = options.embeddedSvgByDataGraphic[graphicName];
    return svgText ? sanitizeSvgTextForFigma(svgText) : undefined;
  }

  const src = element.currentSrc || element.src;
  if (!src) return undefined;

  if (src.startsWith("data:image/svg+xml")) {
    const [, encodedSvg = ""] = src.split(",", 2);
    return sanitizeSvgTextForFigma(decodeURIComponent(encodedSvg));
  }

  try {
    const response = await fetch(src);
    if (!response.ok) return undefined;
    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("svg") || text.trimStart().startsWith("<svg")) {
      return sanitizeSvgTextForFigma(text);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function createExportNode(
  element: Element,
  rootRect: DOMRect,
  parentRect: DOMRect,
  rules: CSSStyleRule[],
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
  forceAbsoluteLayout = false,
): Promise<FigmaExportNode | undefined> {
  const computed = window.getComputedStyle(element);
  if (
    computed.display === "none" ||
    computed.visibility === "hidden" ||
    Number(computed.opacity) === 0
  ) {
    return undefined;
  }

  const rect = element.getBoundingClientRect();
  const width = toFiniteNumber(rect.width);
  const height = toFiniteNumber(rect.height);
  if (width <= 0 || height <= 0) return undefined;

  const nextForceAbsoluteLayout =
    forceAbsoluteLayout || isAbsoluteFidelityRoot(element, options);

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
    options,
  );
  if (clipPathNode) return clipPathNode;

  const childElements = Array.from(element.children);
  const hasPositionedChildren = hasOutOfFlowPositionedChildren(childElements);
  const childNodes = (
    await Promise.all(
      childElements.map((child) =>
        createExportNode(
          child,
          rootRect,
          rect,
          rules,
          tokenSystem,
          options,
          nextForceAbsoluteLayout,
        ),
      ),
    )
  ).filter((child): child is FigmaExportNode => Boolean(child));

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
  const pseudoNodes = (["before", "after"] as PseudoElementName[])
    .map((pseudo) =>
      createPseudoNode(element, rules, pseudo, width, height, tokenSystem, options),
    )
    .filter((node): node is FigmaExportNode => Boolean(node));
  const borderLineNodes = createBorderLineNodes(
    element,
    computed,
    rules,
    width,
    height,
    tokenSystem,
    options,
  );
  const frameLayoutStrategy: FigmaLayoutStrategy =
    pseudoNodes.length > 0 || borderLineNodes.length > 0 || hasPositionedChildren
      ? "absolute"
      : layoutStrategy;

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
        y: paddingTop,
      });

      return {
        bindings,
        children: [textNode, ...borderLineNodes],
        kind: "frame",
        layoutStrategy: "absolute",
        name: getElementName(element, options),
        styles: {
          ...(backgroundColor ? { backgroundColor } : {}),
          ...(border ? { borderColor: border.color, borderWidth: border.width } : {}),
          display: getExportDisplay(computed, "absolute"),
          height,
          opacity: Number(computed.opacity),
          overflow: computed.overflow,
          paddingBottom,
          paddingLeft,
          paddingRight,
          paddingTop,
          ...(radius !== undefined && radius > 0 ? { radius } : {}),
          width,
          x: toFiniteNumber(rect.left - parentRect.left),
          y: toFiniteNumber(rect.top - parentRect.top),
        },
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
      y: toFiniteNumber(rect.top - parentRect.top),
    });
  }

  const kind = element instanceof HTMLImageElement ? "image" : "frame";

  return {
    bindings,
    children: kind === "image" ? [] : [...childNodes, ...pseudoNodes, ...borderLineNodes],
    kind,
    layoutStrategy: kind === "image" ? "absolute" : frameLayoutStrategy,
    name: getElementName(element, options),
    ...(kind === "image" && element instanceof HTMLImageElement
      ? { svgText: await fetchSvgText(element, options) }
      : {}),
    styles: {
      ...(computed.alignItems ? { alignItems: computed.alignItems } : {}),
      ...(backgroundColor ? { backgroundColor } : {}),
      ...(border ? { borderColor: border.color, borderWidth: border.width } : {}),
      ...(color ? { color } : {}),
      display: getExportDisplay(computed, frameLayoutStrategy),
      ...(frameLayoutStrategy === "autoLayout"
        ? { flexDirection: computed.flexDirection }
        : {}),
      fontFamily: computed.fontFamily,
      fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
      ...(Number.isFinite(fontWeight) ? { fontWeight } : {}),
      ...(gap !== undefined && gap >= 0 ? { gap } : {}),
      height,
      ...(computed.justifyContent ? { justifyContent: computed.justifyContent } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      paddingBottom: cssLengthToNumber(computed.paddingBottom) ?? 0,
      paddingLeft: cssLengthToNumber(computed.paddingLeft) ?? 0,
      paddingRight: cssLengthToNumber(computed.paddingRight) ?? 0,
      paddingTop: cssLengthToNumber(computed.paddingTop) ?? 0,
      ...(radius !== undefined && radius > 0 ? { radius } : {}),
      width,
      x: toFiniteNumber(rect.left - parentRect.left),
      y: toFiniteNumber(rect.top - parentRect.top),
    },
  };
}

export async function createFigmaExportPayload({
  componentTitle,
  options,
  scope,
  storyId,
  storyName,
}: {
  componentTitle: string;
  options: ResolvedFigmaExportAddonOptions;
  scope: HTMLElement;
  storyId: string;
  storyName: string;
}): Promise<FigmaExportPayload> {
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
    options,
  );

  if (!rootNode) {
    throw new Error("The story root has no visible exportable bounds.");
  }

  rootNode.styles.x = 0;
  rootNode.styles.y = 0;

  const tokenNames = new Set<string>();
  function collectNodeTokens(node: FigmaExportNode) {
    Object.values(node.bindings).forEach((token) => {
      if (token) tokenNames.add(token);
    });
    node.children.forEach(collectNodeTokens);
  }
  collectNodeTokens(rootNode);

  return {
    componentTitle,
    generatedAt: new Date().toISOString(),
    root: rootNode,
    storyId,
    storyName,
    tokenSystem: {
      collections: tokenSystem.collections,
      layers: tokenSystem.layers,
      pluginDataKey: tokenSystem.pluginDataKey,
      prefix: tokenSystem.prefix,
    },
    tokens: collectTokensForExport(tokenNames, tokenSystem),
    version: 1,
  };
}
