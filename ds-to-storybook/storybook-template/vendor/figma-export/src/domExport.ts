import type {
  FigmaBindingName,
  FigmaComponentReference,
  FigmaExportArtifactKind,
  FigmaExportBorderStyle,
  FigmaExportEffect,
  FigmaExportLinearGradient,
  FigmaExportNode,
  FigmaExportRadialGradient,
  FigmaExportReferenceImage,
  FigmaNodeConstraints,
  FigmaLayoutStrategy,
  FigmaExportPayload,
  FigmaRadiusCorners,
  FigmaTransformMatrix,
} from "./types";
import { toPng } from "html-to-image";
import type { ResolvedFigmaExportAddonOptions } from "./options";
import {
  isFullyTransparentColor,
  normalizeCssColorString,
  parseCssColorToRgba,
  type ParsedRgbaColor,
} from "./color";
import {
  collectTokensForExport,
  detectTokenSystem,
  extractCssVariableNames,
  getCssFontFamilyCandidates,
  resolveTokenComparableValue,
  type DetectedTokenSystem,
} from "./tokenExport";

type MatchedDeclaration = {
  property: string;
  value: string;
};

type BorderSide = "top" | "right" | "bottom" | "left";
type PseudoElementName = "before" | "after";
type FigmaExportProgressPhase = "nodes" | "preparing" | "tokens";
type FigmaExportProgressCallback = (progress: {
  nodeCount?: number;
  phase: FigmaExportProgressPhase;
}) => void;

type FigmaExportTraversalState = {
  lastProgressAt: number;
  lastYieldAt: number;
  nodeCount: number;
  onProgress?: FigmaExportProgressCallback;
};

const exportTraversalProgressIntervalMs = 160;
const exportTraversalYieldIntervalMs = 32;

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
  style?: FigmaExportBorderStyle;
  width: number;
};

function getExportTime(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function waitForExportFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      window.requestAnimationFrame(settle);
      // Headless/hidden pages stop producing frames, so a timer settles the
      // race when requestAnimationFrame never fires.
      globalThis.setTimeout(settle, 120);
      return;
    }

    globalThis.setTimeout(resolve, 0);
  });
}

async function markExportNodeVisited(
  traversalState: FigmaExportTraversalState,
): Promise<void> {
  traversalState.nodeCount += 1;

  const now = getExportTime();

  if (
    traversalState.onProgress &&
    (traversalState.nodeCount === 1 ||
      now - traversalState.lastProgressAt >= exportTraversalProgressIntervalMs)
  ) {
    traversalState.lastProgressAt = now;
    traversalState.onProgress({
      nodeCount: traversalState.nodeCount,
      phase: "nodes",
    });
  }

  if (now - traversalState.lastYieldAt >= exportTraversalYieldIntervalMs) {
    await waitForExportFrame();
    traversalState.lastYieldAt = getExportTime();
  }
}

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

// Affine transform mapping local (x, y) to (a*x + c*y + tx, b*x + d*y + ty) —
// the same layout as CSS matrix(a, b, c, d, tx, ty).
type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
};

const identityAffine: AffineTransform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const linearIdentityTolerance = 0.001;
// ~0.5deg — below this the rotation is subpixel noise, not a real rotation.
const rotationEmitThresholdRadians = 0.008;

function parseCssTransformAffine(transform: string): AffineTransform | undefined {
  const normalized = transform.trim();
  if (!normalized || normalized === "none") return undefined;

  const matrix3d = normalized.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values = matrix3d[1].split(",").map((value) => Number(value.trim()));
    if (values.length !== 16 || !values.every(Number.isFinite)) return undefined;
    return {
      a: values[0],
      b: values[1],
      c: values[4],
      d: values[5],
      tx: values[12],
      ty: values[13],
    };
  }

  const matrix = normalized.match(/^matrix\((.+)\)$/);
  if (!matrix) return undefined;
  const values = matrix[1].split(",").map((value) => Number(value.trim()));
  if (values.length !== 6 || !values.every(Number.isFinite)) return undefined;
  return { a: values[0], b: values[1], c: values[2], d: values[3], tx: values[4], ty: values[5] };
}

function hasNonIdentityLinearPart(matrix: AffineTransform | undefined): boolean {
  if (!matrix) return false;
  return (
    Math.abs(matrix.a - 1) > linearIdentityTolerance ||
    Math.abs(matrix.b) > linearIdentityTolerance ||
    Math.abs(matrix.c) > linearIdentityTolerance ||
    Math.abs(matrix.d - 1) > linearIdentityTolerance
  );
}

function parseTransformOriginPoint(computed: CSSStyleDeclaration): {
  x: number;
  y: number;
} {
  const parts = computed.transformOrigin.split(/\s+/).map((part) => Number.parseFloat(part));
  return {
    x: Number.isFinite(parts[0]) ? parts[0] : 0,
    y: Number.isFinite(parts[1]) ? parts[1] : 0,
  };
}

// CSS applies the matrix about transform-origin: p -> M*(p - O) + O + Mt.
function affineAboutOrigin(
  matrix: AffineTransform,
  origin: { x: number; y: number },
): AffineTransform {
  return {
    a: matrix.a,
    b: matrix.b,
    c: matrix.c,
    d: matrix.d,
    tx: origin.x - (matrix.a * origin.x + matrix.c * origin.y) + matrix.tx,
    ty: origin.y - (matrix.b * origin.x + matrix.d * origin.y) + matrix.ty,
  };
}

function composeAffine(outer: AffineTransform, inner: AffineTransform): AffineTransform {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    tx: outer.a * inner.tx + outer.c * inner.ty + outer.tx,
    ty: outer.b * inner.tx + outer.d * inner.ty + outer.ty,
  };
}

// The untransformed border-box size: layout metrics ignore CSS transforms,
// unlike getBoundingClientRect which returns the transformed AABB.
function getUntransformedBoxSize(
  element: Element,
  rect: DOMRect,
): { height: number; width: number } {
  if (element instanceof HTMLElement && element.offsetWidth > 0 && element.offsetHeight > 0) {
    return { height: element.offsetHeight, width: element.offsetWidth };
  }
  if (element.clientWidth > 0 && element.clientHeight > 0) {
    return { height: element.clientHeight, width: element.clientWidth };
  }
  return { height: rect.height, width: rect.width };
}

type ElementTransformGeometry = {
  // Full local -> client affine for this element; children resolve against it.
  clientTransform: AffineTransform;
  fontScale: number;
  height: number;
  scaleX: number;
  scaleY: number;
  transformMatrix?: FigmaTransformMatrix;
  width: number;
  x: number;
  y: number;
};

// Resolves exact geometry for elements affected by CSS transforms (their own
// or an ancestor's): the untransformed box, the cumulative scale folded into
// width/height, and a rotation-only matrix relative to the parent node.
// Returns undefined outside transformed subtrees (callers keep the plain
// bounding-rect fast path) and for degenerate/mirrored transforms.
function resolveElementTransformGeometry(
  element: Element,
  computed: CSSStyleDeclaration,
  rect: DOMRect,
  parentRect: DOMRect,
  parentClientTransform: AffineTransform | undefined,
): ElementTransformGeometry | undefined {
  const ownMatrix = parseCssTransformAffine(computed.transform);
  const ownLinearActive = hasNonIdentityLinearPart(ownMatrix);
  if (!parentClientTransform && !ownLinearActive) return undefined;

  const box = getUntransformedBoxSize(element, rect);
  if (box.width <= 0 || box.height <= 0) return undefined;

  const ownAffine =
    ownLinearActive && ownMatrix
      ? affineAboutOrigin(ownMatrix, parseTransformOriginPoint(computed))
      : identityAffine;
  const parentTransform =
    parentClientTransform ?? {
      ...identityAffine,
      tx: parentRect.left,
      ty: parentRect.top,
    };

  // The linear part composes; the translation falls out of the client AABB:
  // rect.topLeft = min over transformed box corners + translation.
  const linear = composeAffine(parentTransform, ownAffine);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const [cornerX, cornerY] of [
    [0, 0],
    [box.width, 0],
    [box.width, box.height],
    [0, box.height],
  ]) {
    minX = Math.min(minX, linear.a * cornerX + linear.c * cornerY);
    minY = Math.min(minY, linear.b * cornerX + linear.d * cornerY);
  }
  const clientTransform: AffineTransform = {
    a: linear.a,
    b: linear.b,
    c: linear.c,
    d: linear.d,
    tx: rect.left - minX,
    ty: rect.top - minY,
  };

  const cumulativeScaleX = Math.hypot(clientTransform.a, clientTransform.b);
  const cumulativeDet =
    clientTransform.a * clientTransform.d - clientTransform.b * clientTransform.c;
  if (cumulativeScaleX < 1e-6 || cumulativeDet <= 0) return undefined;
  const cumulativeScaleY = cumulativeDet / cumulativeScaleX;

  const parentScaleX = Math.hypot(parentTransform.a, parentTransform.b);
  const parentDet =
    parentTransform.a * parentTransform.d - parentTransform.b * parentTransform.c;
  if (parentScaleX < 1e-6 || parentDet <= 0) return undefined;

  const rotation = Math.atan2(clientTransform.b, clientTransform.a);
  const parentRotation = Math.atan2(parentTransform.b, parentTransform.a);
  const relativeRotation = rotation - parentRotation;

  // Node geometry lives in client-scale units with rotation-only matrices,
  // so sizes always match what the browser painted.
  const width = toFiniteNumber(box.width * cumulativeScaleX);
  const height = toFiniteNumber(box.height * cumulativeScaleY);

  // Relative translation in the parent's normalized (rotation-only) space.
  const deltaX = clientTransform.tx - parentTransform.tx;
  const deltaY = clientTransform.ty - parentTransform.ty;
  const parentCos = Math.cos(parentRotation);
  const parentSin = Math.sin(parentRotation);
  const x = toFiniteNumber(parentCos * deltaX + parentSin * deltaY);
  const y = toFiniteNumber(-parentSin * deltaX + parentCos * deltaY);

  // Matrix components keep six decimals; coarser rounding would bend the
  // rotation angle and de-normalize the matrix columns.
  const matrixComponent = (value: number) =>
    Number.isFinite(value) ? Math.round(value * 1e6) / 1e6 : 0;
  const cos = Math.cos(relativeRotation);
  const sin = Math.sin(relativeRotation);
  const hasRotation = Math.abs(relativeRotation) > rotationEmitThresholdRadians;

  return {
    clientTransform,
    fontScale: cumulativeScaleY,
    height,
    scaleX: cumulativeScaleX,
    scaleY: cumulativeScaleY,
    ...(hasRotation
      ? {
          transformMatrix: [
            [matrixComponent(cos), matrixComponent(-sin), x],
            [matrixComponent(sin), matrixComponent(cos), y],
          ] as FigmaTransformMatrix,
        }
      : {}),
    width,
    x,
    y,
  };
}

function cssColorValue(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized || transparentValues.has(normalized)) return undefined;

  // Modern color spaces (oklch/lab/color()/hsl/named) are canonicalized to
  // hex or rgb()/rgba() so the payload never carries values the Figma plugin
  // cannot parse. Non-color paints (for example SVG url(#...)) pass through.
  const canonical = normalizeCssColorString(normalized) ?? normalized;
  if (transparentValues.has(canonical) || isFullyTransparentColor(canonical)) {
    return undefined;
  }
  return canonical;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function splitGradientArguments(value: string): string[] {
  const parts: string[] = [];
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

function parseLinearGradientAngle(
  value: string | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const degree = normalized.match(/^(-?\d*\.?\d+)(deg|grad|rad|turn)$/);
  if (degree) {
    const amount = Number(degree[1]);
    if (degree[2] === "grad") return amount * 0.9;
    if (degree[2] === "rad") return (amount * 180) / Math.PI;
    if (degree[2] === "turn") return amount * 360;
    return amount;
  }
  if (normalized === "to right") return 90;
  if (normalized === "to bottom") return 180;
  if (normalized === "to left") return 270;
  if (normalized === "to top") return 0;

  // Corner keywords depend on the box aspect ratio: the gradient line is
  // perpendicular to the diagonal joining the two neighboring corners, so
  // "to top right" on a wide box is steeper than 45deg from the horizon.
  const cornerAngle =
    width > 0 && height > 0
      ? (Math.atan2(height, width) * 180) / Math.PI
      : 45;
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
  return undefined;
}

function parseGradientStop(
  value: string,
  index: number,
  total: number,
): { color: string; position: number } | undefined {
  const colorMatch = value
    .trim()
    .match(/^(#[0-9a-f]{3,8}|[a-z][a-z-]*\((?:[^()]|\([^()]*\))*\))/i);
  if (!colorMatch) return undefined;

  const color = cssColorValue(colorMatch[1]);
  if (!color) return undefined;

  const positionMatch = value.slice(colorMatch[1].length).match(/(-?\d*\.?\d+)%/);
  const position = positionMatch
    ? clampUnit(Number(positionMatch[1]) / 100)
    : total > 1
      ? index / (total - 1)
      : 0;

  return { color, position };
}

function parseLinearGradient(
  layer: string,
  width: number,
  height: number,
): FigmaExportLinearGradient | undefined {
  const match = layer.trim().match(/^linear-gradient\((.*)\)$/i);
  if (!match) return undefined;

  const parts = splitGradientArguments(match[1]);
  if (parts.length < 2) return undefined;

  const angle = parseLinearGradientAngle(parts[0], width, height);
  const stopParts = angle === undefined ? parts : parts.slice(1);
  const stops = stopParts
    .map((part, index) => parseGradientStop(part, index, stopParts.length))
    .filter((stop): stop is { color: string; position: number } => Boolean(stop));

  return stops.length >= 2 ? { angle: angle ?? 180, stops } : undefined;
}

function parseRadialGradient(layer: string): FigmaExportRadialGradient | undefined {
  const match = layer.trim().match(/^radial-gradient\((.*)\)$/i);
  if (!match) return undefined;

  const parts = splitGradientArguments(match[1]);
  if (parts.length < 2) return undefined;

  // The first argument may be a shape/size/position configuration without a
  // color; only color stops contribute to the exported gradient.
  const stopParts =
    parseGradientStop(parts[0], 0, parts.length) === undefined
      ? parts.slice(1)
      : parts;
  const stops = stopParts
    .map((part, index) => parseGradientStop(part, index, stopParts.length))
    .filter((stop): stop is { color: string; position: number } => Boolean(stop));

  return stops.length >= 2 ? { stops } : undefined;
}

// Computed background-image is a comma-separated list of layers (first layer
// paints on top). Splitting at the top level keeps gradient arguments intact.
function getBackgroundImageLayers(backgroundImage: string): string[] {
  const normalized = backgroundImage.trim();
  if (!normalized || normalized === "none") return [];
  return splitGradientArguments(normalized).filter((layer) => layer !== "none");
}

function getBackgroundImageUrl(layer: string): string | undefined {
  const match = layer.trim().match(/^url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)$/i);
  if (!match) return undefined;
  const url = match[1] ?? match[2] ?? match[3];
  return url && !url.startsWith("data:image/svg") ? url : undefined;
}

function getBackgroundScaleMode(computed: CSSStyleDeclaration): "FILL" | "FIT" {
  const size = (computed.backgroundSize || "").trim().toLowerCase();
  return size === "contain" ? "FIT" : "FILL";
}

// Computed shadow lists serialize color-first in Chromium and Firefox, e.g.
// "rgba(0, 0, 0, 0.25) 0px 4px 12px 0px inset". Lengths follow the order
// offsetX offsetY blur spread; text-shadow omits spread and inset.
function parseShadowListToEffects(value: string): FigmaExportEffect[] {
  const normalized = value.trim();
  if (!normalized || normalized === "none") return [];

  const effects: FigmaExportEffect[] = [];

  for (const part of splitGradientArguments(normalized)) {
    const inset = /\binset\b/.test(part);
    let rest = part.replace(/\binset\b/g, " ");

    const colorMatch = rest.match(
      /(#[0-9a-f]{3,8}|[a-z][a-z-]*\((?:[^()]|\([^()]*\))*\))/i,
    );
    if (!colorMatch) continue;
    rest = rest.replace(colorMatch[1], " ");

    const color = cssColorValue(colorMatch[1]);
    if (!color) continue;

    const lengths = Array.from(
      rest.matchAll(/(-?\d*\.?\d+)px/g),
      (match) => Number(match[1]),
    );
    const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = lengths;

    effects.push({
      blur: toFiniteNumber(blur),
      color,
      offsetX: toFiniteNumber(offsetX),
      offsetY: toFiniteNumber(offsetY),
      spread: toFiniteNumber(spread),
      type: inset ? "INNER_SHADOW" : "DROP_SHADOW",
    });
  }

  return effects;
}

function getBoxShadowEffects(computed: CSSStyleDeclaration): FigmaExportEffect[] {
  return parseShadowListToEffects(computed.boxShadow);
}

function getTextShadowEffects(computed: CSSStyleDeclaration): FigmaExportEffect[] {
  return parseShadowListToEffects(computed.textShadow);
}

function parseFilterBlurRadius(filterValue: string): number | undefined {
  const normalized = filterValue.trim();
  if (!normalized || normalized === "none") return undefined;
  const match = normalized.match(/(?:^|\s)blur\(\s*(-?\d*\.?\d+)px\s*\)/i);
  if (!match) return undefined;
  const radius = Number(match[1]);
  return Number.isFinite(radius) && radius > 0 ? toFiniteNumber(radius) : undefined;
}

function getBlurEffects(computed: CSSStyleDeclaration): FigmaExportEffect[] {
  const effects: FigmaExportEffect[] = [];

  const layerBlur = parseFilterBlurRadius(computed.filter ?? "");
  if (layerBlur !== undefined) {
    effects.push({
      blur: layerBlur,
      offsetX: 0,
      offsetY: 0,
      spread: 0,
      type: "LAYER_BLUR",
    });
  }

  const backdropValue =
    computed.backdropFilter ||
    computed.getPropertyValue("-webkit-backdrop-filter") ||
    "";
  const backgroundBlur = parseFilterBlurRadius(backdropValue);
  if (backgroundBlur !== undefined) {
    effects.push({
      blur: backgroundBlur,
      offsetX: 0,
      offsetY: 0,
      spread: 0,
      type: "BACKGROUND_BLUR",
    });
  }

  return effects;
}

function cssRadiusToNumber(
  value: string,
  width: number,
  height: number,
): number {
  const length = cssLengthToNumber(value);
  if (length !== undefined) return length;

  // Percentage radii (for example border-radius: 50% avatars) approximate to
  // the shorter box side, which reproduces circles on square boxes.
  const percent = value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    return toFiniteNumber((Number(percent[1]) / 100) * Math.min(width, height));
  }

  return 0;
}

function getRadiusStyles(
  computed: CSSStyleDeclaration,
  width: number,
  height: number,
): { radius?: number; radiusCorners?: FigmaRadiusCorners } {
  const topLeft = cssRadiusToNumber(computed.borderTopLeftRadius, width, height);
  const topRight = cssRadiusToNumber(computed.borderTopRightRadius, width, height);
  const bottomRight = cssRadiusToNumber(
    computed.borderBottomRightRadius,
    width,
    height,
  );
  const bottomLeft = cssRadiusToNumber(
    computed.borderBottomLeftRadius,
    width,
    height,
  );

  if (
    topLeft === topRight &&
    topLeft === bottomRight &&
    topLeft === bottomLeft
  ) {
    return topLeft > 0 ? { radius: topLeft } : {};
  }

  return { radiusCorners: { bottomLeft, bottomRight, topLeft, topRight } };
}

function isColorTokenName(token: string): boolean {
  return token.includes("-color-") || token.endsWith("-color");
}

function findLinearGradientTokens(
  declarations: MatchedDeclaration[],
  tokenSystem: DetectedTokenSystem,
): string[] {
  if (!tokenSystem.prefix) return [];

  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index];
    if (!["background", "background-image"].includes(declaration.property)) {
      continue;
    }
    if (!declaration.value.includes("linear-gradient")) continue;

    const tokens = extractCssVariableNames(declaration.value, tokenSystem).filter(
      isColorTokenName,
    );
    if (tokens.length >= 2) return tokens;
  }

  return [];
}

function addLinearGradientStopTokens(
  gradient: { angle: number; stops: { color: string; position: number }[] } | undefined,
  declarations: MatchedDeclaration[],
  tokenSystem: DetectedTokenSystem,
): { angle: number; stops: { color: string; position: number; token?: string }[] } | undefined {
  if (!gradient) return undefined;

  const tokens = findLinearGradientTokens(declarations, tokenSystem);
  if (tokens.length === 0) return gradient;

  return {
    ...gradient,
    stops: gradient.stops.map((stop, index) => ({
      ...stop,
      ...(tokens[index] ? { token: tokens[index] } : {}),
    })),
  };
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

  if (!isUniform) return undefined;

  return {
    color,
    width,
    ...(style === "dashed" || style === "dotted"
      ? { style: style as FigmaExportBorderStyle }
      : {}),
  };
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

function toComponentKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "component";
}

function toComponentLabel(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function getComponentReference(
  element: Element,
  fallbackName?: string,
): FigmaComponentReference | undefined {
  const sourceName = element.getAttribute("data-component");
  if (!sourceName && !fallbackName) return undefined;

  const variant =
    element.getAttribute("data-figma-variant") ||
    element.getAttribute("data-variant") ||
    undefined;
  const source = sourceName || fallbackName || "component";
  const name = fallbackName || toComponentLabel(source);
  const baseKey = toComponentKey(source);
  const key = variant ? `${baseKey}--${toComponentKey(variant)}` : baseKey;

  return {
    key,
    name,
    sourceName: source,
    ...(variant ? { variant, variantProperties: { Variant: variant } } : {}),
  };
}

function getArtifactKind(storyTitle: string): FigmaExportArtifactKind {
  return storyTitle.startsWith("Pages/") ? "page" : "component";
}

function hasComponentReference(node: FigmaExportNode): boolean {
  return Boolean(node.component) || node.children.some(hasComponentReference);
}

function stripComponentReferences(node: FigmaExportNode): void {
  delete node.component;
  node.children.forEach(stripComponentReferences);
}

function isAbsoluteFidelityRoot(
  element: Element,
  options: ResolvedFigmaExportAddonOptions,
): boolean {
  const component = element.getAttribute("data-component");
  return Boolean(component && options.absoluteFidelityComponents.has(component));
}

function isFlexDisplay(display: string): boolean {
  return display.includes("flex");
}

function isOutOfFlowPositioned(computed: CSSStyleDeclaration): boolean {
  return computed.position === "absolute" || computed.position === "fixed";
}

function isFlexItem(element: Element, computed: CSSStyleDeclaration): boolean {
  if (isOutOfFlowPositioned(computed)) return false;
  const parentElement = element.parentElement;
  if (!parentElement) return false;
  return isFlexDisplay(window.getComputedStyle(parentElement).display);
}

function getLayoutStrategy(
  element: Element,
  computed: CSSStyleDeclaration,
  forceAbsoluteLayout: boolean,
): FigmaLayoutStrategy {
  if (forceAbsoluteLayout) return "absolute";
  return isFlexDisplay(computed.display) || isFlexItem(element, computed)
    ? "autoLayout"
    : "absolute";
}

function getExportDisplay(
  computed: CSSStyleDeclaration,
  layoutStrategy: FigmaLayoutStrategy,
): string {
  if (layoutStrategy === "absolute" && isFlexDisplay(computed.display)) {
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

function normalizeSvgStrokeDashValue(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized || normalized === "none") return undefined;
  return normalized.replace(/(-?\d+(?:\.\d+)?)px\b/g, "$1");
}

function serializeInlineSvg(element: SVGElement, width: number, height: number): string {
  const clone = element.cloneNode(true) as SVGElement;
  const originalNodes = [element, ...Array.from(element.querySelectorAll("*"))];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  // Without a viewBox, rewriting width/height rescales nothing and the
  // drawing crops; the intrinsic size becomes the coordinate system.
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
      originalStyle.strokeDasharray,
    );
    const strokeDashoffset = normalizeSvgStrokeDashValue(
      originalStyle.strokeDashoffset,
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
    // Root opacity already exports on the wrapper node's styles.
    if (clonedNode !== clone && nodeOpacity && nodeOpacity !== "1") {
      clonedNode.setAttribute("opacity", nodeOpacity);
    }
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
  const layoutStrategy =
    element.getAttribute("data-figma-layout-strategy") === "auto-layout" ||
    isFlexItem(element, computed)
      ? "autoLayout"
      : "absolute";
  const svgText =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    `<polygon points="${escapeSvgAttribute(points)}" fill="${escapeSvgAttribute(fill)}"${transform}/>` +
    `</svg>`;

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
  geometry?: ElementTransformGeometry,
): FigmaExportNode {
  const width = toFiniteNumber(geometry?.width ?? rect.width);
  const height = toFiniteNumber(geometry?.height ?? rect.height);
  const component = getComponentReference(element);

  return {
    bindings: {},
    children: [],
    ...(component ? { component } : {}),
    kind: "svg",
    layoutStrategy: "absolute",
    name: getElementName(element, options),
    svgText: serializeInlineSvg(element, width, height),
    styles: {
      display: computed.display,
      height,
      opacity: Number(computed.opacity),
      overflow: computed.overflow,
      ...(geometry?.transformMatrix
        ? { transformMatrix: geometry.transformMatrix }
        : {}),
      width,
      x: geometry ? geometry.x : toFiniteNumber(rect.left - parentRect.left),
      y: geometry ? geometry.y : toFiniteNumber(rect.top - parentRect.top),
    },
  };
}

function mediaRuleMatches(rule: CSSMediaRule): boolean {
  try {
    return window.matchMedia(rule.conditionText).matches;
  } catch {
    return true;
  }
}

function collectRulesFromStyleSheets(sheets: CSSStyleSheet[]): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];

  function collect(ruleList: CSSRuleList) {
    for (const rule of Array.from(ruleList)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
        continue;
      }

      // Rules behind a non-matching media query are not in effect, so their
      // var() declarations must not create token bindings.
      if (rule instanceof CSSMediaRule && !mediaRuleMatches(rule)) {
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

  for (const sheet of sheets) {
    try {
      collect(sheet.cssRules);
    } catch {
      // Ignore cross-origin or browser-managed style sheets.
    }
  }

  return rules;
}

// Style rules are collected per root: document styleSheets plus document
// adoptedStyleSheets form the base set, and each open shadow root contributes
// its own styleSheets and adoptedStyleSheets for the elements inside it
// (Lit and friends inject component styles via adoptedStyleSheets).
type CssRuleIndex = {
  documentRules: CSSStyleRule[];
  rulesByShadowRoot: Map<ShadowRoot, CSSStyleRule[]>;
};

function getDocumentAdoptedStyleSheets(): CSSStyleSheet[] {
  try {
    return Array.from(document.adoptedStyleSheets ?? []);
  } catch {
    return [];
  }
}

function createCssRuleIndex(): CssRuleIndex {
  return {
    documentRules: collectRulesFromStyleSheets([
      ...Array.from(document.styleSheets),
      ...getDocumentAdoptedStyleSheets(),
    ]),
    rulesByShadowRoot: new Map(),
  };
}

function getRulesForElement(index: CssRuleIndex, element: Element): CSSStyleRule[] {
  const root = element.getRootNode();
  if (!(root instanceof ShadowRoot)) return index.documentRules;

  let combined = index.rulesByShadowRoot.get(root);
  if (!combined) {
    let adopted: CSSStyleSheet[] = [];
    try {
      adopted = Array.from(root.adoptedStyleSheets ?? []);
    } catch {
      adopted = [];
    }
    combined = index.documentRules.concat(
      collectRulesFromStyleSheets([...Array.from(root.styleSheets), ...adopted]),
    );
    index.rulesByShadowRoot.set(root, combined);
  }
  return combined;
}

// Open shadow roots render in place of the host's light children; slots
// expand to their flattened assigned elements (falling back to the slot's own
// fallback content) and never produce nodes themselves. display:contents
// wrappers generate no box either, so their children rise to this level.
function getRenderChildren(element: Element): Element[] {
  const shadowRoot = element.shadowRoot;
  const baseChildren = shadowRoot
    ? Array.from(shadowRoot.children)
    : Array.from(element.children);

  const expanded: Element[] = [];
  for (const child of baseChildren) {
    if (child instanceof HTMLSlotElement) {
      const assigned = child.assignedElements({ flatten: true });
      expanded.push(...(assigned.length > 0 ? assigned : Array.from(child.children)));
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

// Simplified a-b-c specificity: ids, then classes/attributes/pseudo-classes,
// then element types and pseudo-elements. !important and cascade layers are
// intentionally out of scope — computed values stay authoritative for style
// values; this only ranks which declaration supplies a token binding.
function calculateSelectorSpecificity(selector: string): number {
  const withoutPseudoElements = selector.replace(/::[a-z-]+(\([^)]*\))?/gi, " x");
  const ids = withoutPseudoElements.match(/#[\w-]+/g)?.length ?? 0;
  const classLike =
    withoutPseudoElements.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(\([^)]*\))?/g)
      ?.length ?? 0;
  const typeLike =
    withoutPseudoElements.match(/(^|[\s>+~(,])[a-z][\w-]*/gi)?.length ?? 0;
  const pseudoElements = selector.match(/::[a-z-]+/gi)?.length ?? 0;

  return ids * 1_000_000 + classLike * 1_000 + typeLike + pseudoElements;
}

function getMatchedSelectorSpecificity(
  element: Element,
  selectorText: string,
): number | undefined {
  let best: number | undefined;

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
    if (best === undefined || specificity > best) best = specificity;
  }

  return best;
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
  type OrderedDeclaration = MatchedDeclaration & {
    order: number;
    specificity: number;
  };

  const collected: OrderedDeclaration[] = [];
  let order = 0;

  const push = (property: string, value: string, specificity: number) => {
    collected.push({ order: (order += 1), property, specificity, value });
  };

  for (const rule of rules) {
    const specificity = getMatchedSelectorSpecificity(element, rule.selectorText);
    if (specificity === undefined) continue;

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
        Number.MAX_SAFE_INTEGER,
      );
    }
  }

  // Later scanning is last-wins, so order by (specificity, source order) to
  // let the highest-specificity matching declaration supply the binding.
  return collected
    .sort((a, b) => a.specificity - b.specificity || a.order - b.order)
    .map(({ property, value }) => ({ property, value }));
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
    if (tokens.length === 0) return undefined;

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

function justifyContentFromTextAlign(textAlign: string): string {
  const normalized = textAlign.trim().toLowerCase();
  if (normalized === "center") return "center";
  if (normalized === "right" || normalized === "end") return "flex-end";
  return "flex-start";
}

function hasFixedFlexBasis(computed: CSSStyleDeclaration): boolean {
  if (!computed.flexBasis || computed.flexBasis === "auto" || computed.flexBasis === "content") {
    return false;
  }
  return cssLengthToNumber(computed.flexBasis) !== undefined;
}

function isClippedSingleLineText(computed: CSSStyleDeclaration): boolean {
  const overflowX = computed.overflowX.toLowerCase();
  const overflow = computed.overflow.toLowerCase();
  const textOverflow = computed.textOverflow.toLowerCase();
  const whiteSpace = computed.whiteSpace.toLowerCase();
  const clipsInline = overflowX === "hidden" || overflowX === "clip" || overflow === "hidden" || overflow === "clip";
  return clipsInline && textOverflow === "ellipsis" && whiteSpace === "nowrap";
}

// Truncated text keeps its browser box: 1 for the classic nowrap-ellipsis
// pattern, N for -webkit-line-clamp multi-line clamping.
function getLineClampCount(computed: CSSStyleDeclaration): number | undefined {
  if (isClippedSingleLineText(computed)) return 1;

  const clampValue = computed.getPropertyValue("-webkit-line-clamp").trim();
  const clamp = Number.parseInt(clampValue, 10);
  if (!Number.isFinite(clamp) || clamp < 1) return undefined;

  const overflowTokens = `${computed.overflow} ${computed.overflowY}`.toLowerCase();
  return /(hidden|clip)/.test(overflowTokens) ? clamp : undefined;
}

// Text that wraps in the browser must keep its wrap width in Figma; treating
// it as auto-width would unwrap it into one long line and blow up the layout.
function isRenderedMultilineText(
  computed: CSSStyleDeclaration,
  height: number,
): boolean {
  if (computed.whiteSpace.toLowerCase().includes("nowrap")) return false;
  const fontSize = cssLengthToNumber(computed.fontSize) ?? 14;
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  const lineHeightPx =
    typeof lineHeight === "number" && lineHeight > 0 ? lineHeight : fontSize * 1.2;
  return height >= lineHeightPx * 1.8;
}

function shouldAutoResizeText(
  element: Element,
  computed: CSSStyleDeclaration,
): boolean {
  if (isFlexItem(element, computed)) {
    if (hasFixedFlexBasis(computed)) return false;
    return Number.parseFloat(computed.flexGrow || "0") === 0;
  }
  // Widths are exported exactly (no safety margin), so single-line text hugs
  // its content and Figma's own font metrics can never wrap or clip it.
  return true;
}

function getTextAutoResize(
  element: Element,
  computed: CSSStyleDeclaration,
  height: number,
): "HEIGHT" | "WIDTH_AND_HEIGHT" | undefined {
  // Truncated text keeps a fixed box; truncation wins over the data attribute.
  if (getLineClampCount(computed) !== undefined) return undefined;
  if (element.getAttribute("data-figma-text-auto-width") === "true") {
    return "WIDTH_AND_HEIGHT";
  }
  // Wrapped text keeps its width fixed and lets Figma size the height, so
  // browser/Figma font metric differences never clip the last line.
  if (isRenderedMultilineText(computed, height)) return "HEIGHT";
  return shouldAutoResizeText(element, computed) ? "WIDTH_AND_HEIGHT" : undefined;
}

function getLayoutAlign(element: Element): "STRETCH" | undefined {
  return element.getAttribute("data-figma-layout-align") === "stretch"
    ? "STRETCH"
    : undefined;
}

const verticalSizeProperties = [
  "height",
  "block-size",
  "min-height",
  "min-block-size",
];

const horizontalSizeProperties = [
  "width",
  "inline-size",
  "min-width",
  "min-inline-size",
];

function hasExplicitSizeDeclaration(
  declarations: MatchedDeclaration[],
  properties: string[],
): boolean {
  return declarations.some(
    (declaration) =>
      properties.includes(declaration.property) &&
      declaration.value.trim().toLowerCase() !== "auto",
  );
}

function isStretchAlignment(value: string): boolean {
  return value === "stretch" || value === "normal";
}

function getResolvedFlexAlignment(
  element: Element,
  computed: CSSStyleDeclaration,
): string {
  const alignSelf = computed.alignSelf;
  if (alignSelf && alignSelf !== "auto") return alignSelf;

  const parentElement = element.parentElement;
  if (!parentElement) return "auto";
  return window.getComputedStyle(parentElement).alignItems || "auto";
}

function getFlexParentCrossAxisInfo(
  element: Element,
  computed: CSSStyleDeclaration,
): { crossAxis: "horizontal" | "vertical"; stretched: boolean } | undefined {
  if (!isFlexItem(element, computed)) return undefined;

  const parentElement = element.parentElement;
  if (!parentElement) return undefined;

  const parentComputed = window.getComputedStyle(parentElement);
  if (!isFlexDisplay(parentComputed.display)) return undefined;

  return {
    crossAxis: parentComputed.flexDirection.startsWith("column")
      ? "horizontal"
      : "vertical",
    stretched: isStretchAlignment(getResolvedFlexAlignment(element, computed)),
  };
}

function getInferredFrameLayoutAlign(
  element: Element,
  computed: CSSStyleDeclaration,
  declarations: MatchedDeclaration[],
): "STRETCH" | undefined {
  const crossAxisInfo = getFlexParentCrossAxisInfo(element, computed);
  if (!crossAxisInfo || !crossAxisInfo.stretched) return undefined;

  const crossSizeProperties =
    crossAxisInfo.crossAxis === "horizontal"
      ? horizontalSizeProperties
      : verticalSizeProperties;
  if (hasExplicitSizeDeclaration(declarations, crossSizeProperties)) {
    return undefined;
  }

  return "STRETCH";
}

function getLayoutSizingVertical(
  element: Element,
  computed: CSSStyleDeclaration,
  bindings: Partial<Record<FigmaBindingName, string>>,
  declarations: MatchedDeclaration[],
): "HUG" | undefined {
  if (bindings.height) return undefined;
  if (hasExplicitSizeDeclaration(declarations, verticalSizeProperties)) {
    return undefined;
  }
  if (element.getAttribute("data-figma-layout-sizing-vertical") === "hug") {
    return "HUG";
  }
  if (!isFlexDisplay(computed.display)) return undefined;

  const crossAxisInfo = getFlexParentCrossAxisInfo(element, computed);
  if (crossAxisInfo?.crossAxis === "vertical" && crossAxisInfo.stretched) {
    return undefined;
  }

  return "HUG";
}

function getLayoutGrow(
  element: Element,
  computed: CSSStyleDeclaration,
): number | undefined {
  if (element.getAttribute("data-figma-layout-grow") === "1") return 1;
  const flexGrow = Number.parseFloat(computed.flexGrow || "0");
  return Number.isFinite(flexGrow) && flexGrow > 0 ? flexGrow : undefined;
}

function getLayoutSizingHorizontal(
  element: Element,
  computed: CSSStyleDeclaration,
  bindings: Partial<Record<FigmaBindingName, string>>,
  declarations: MatchedDeclaration[],
): "HUG" | undefined {
  if (bindings.width) return undefined;
  // An explicit non-auto width in CSS always wins — hugging such an element
  // in Figma would diverge from the browser rendering.
  if (hasExplicitSizeDeclaration(declarations, horizontalSizeProperties)) {
    return undefined;
  }
  if (element.getAttribute("data-figma-layout-sizing-horizontal") === "hug") {
    return "HUG";
  }
  if (isFlexItem(element, computed) || computed.display.includes("inline-flex")) {
    if (hasFixedFlexBasis(computed)) return undefined;
    if (Number.parseFloat(computed.flexGrow || "0") > 0) return undefined;
    return "HUG";
  }
  // Out-of-flow flex containers shrink-wrap to their content in CSS, so an
  // absolutely positioned flex frame without an explicit width should hug.
  if (isFlexDisplay(computed.display) && isOutOfFlowPositioned(computed)) {
    return "HUG";
  }
  // Grid items with non-stretch justification shrink-wrap to their content.
  // Note: grid items blockify inline-flex, so check the parent display.
  const parentElement = element.parentElement;
  if (
    parentElement &&
    isFlexDisplay(computed.display) &&
    !isOutOfFlowPositioned(computed)
  ) {
    const parentComputed = window.getComputedStyle(parentElement);
    if (parentComputed.display.includes("grid")) {
      const justifySelf = computed.justifySelf;
      const resolved =
        justifySelf && justifySelf !== "auto"
          ? justifySelf
          : parentComputed.justifyItems;
      if (
        ["start", "center", "end", "flex-start", "flex-end"].includes(resolved)
      ) {
        return "HUG";
      }
    }
  }
  return undefined;
}

function getTextAlignVertical(element: Element): "CENTER" | undefined {
  return element.getAttribute("data-figma-text-align-vertical") === "center"
    ? "CENTER"
    : undefined;
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
  y,
}: {
  bindings: Partial<Record<FigmaBindingName, string>>;
  colorOverride?: string;
  computed: CSSStyleDeclaration;
  fontScale?: number;
  height: number;
  inlineLineBox?: boolean;
  layoutStrategy?: FigmaLayoutStrategy;
  lineCount?: number;
  name: string;
  outOfFlow?: boolean;
  text: string;
  textAutoResize?: "HEIGHT" | "WIDTH_AND_HEIGHT";
  layoutAlign?: "STRETCH";
  layoutGrow?: number;
  textAlignVertical?: "CENTER";
  transformMatrix?: FigmaTransformMatrix;
  width: number;
  x: number;
  y: number;
}): FigmaExportNode {
  const color = colorOverride ?? cssColorValue(computed.color);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const fontSize = toFiniteNumber(
    (cssLengthToNumber(computed.fontSize) ?? 14) * fontScale,
  );
  const rawLineHeight = cssLineHeightToNumber(computed.lineHeight);
  const lineHeight =
    typeof rawLineHeight === "number"
      ? toFiniteNumber(rawLineHeight * fontScale)
      : rawLineHeight;
  const textShadowEffects = getTextShadowEffects(computed);
  const rawLetterSpacing = cssLengthToNumber(computed.letterSpacing);
  const letterSpacing =
    rawLetterSpacing !== undefined
      ? toFiniteNumber(rawLetterSpacing * fontScale)
      : undefined;
  const textDecoration = getTextDecoration(computed);
  const italic = isItalicFontStyle(computed);
  const clampedLineCount = getLineClampCount(computed);
  // Inline boxes and text-run ranges measure the font content area, not the
  // visual line box: an n-line measurement is (n - 1) line boxes plus one
  // content box. Export full line boxes (height plus the missing leading, y
  // shifted up by the half-leading) so the Figma baselines land where the
  // browser drew them.
  let exportHeight = height;
  let exportY = y;
  if (
    (inlineLineBox || computed.display === "inline") &&
    !text.includes("\n") &&
    typeof lineHeight === "number" &&
    lineHeight > 0
  ) {
    const lines =
      lineCount ?? Math.max(1, Math.ceil(height / lineHeight - 0.05));
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
      "textColor",
    ]),
    children: [],
    kind: "text",
    layoutStrategy: layoutStrategy ?? (layoutAlign ? "autoLayout" : "absolute"),
    name,
    text,
    styles: {
      ...(color ? { color } : {}),
      display: computed.display,
      ...(textShadowEffects.length > 0 ? { effects: textShadowEffects } : {}),
      fontFamily: computed.fontFamily,
      fontSize,
      ...(italic ? { fontStyle: "italic" as const } : {}),
      ...(Number.isFinite(fontWeight) ? { fontWeight } : {}),
      height: exportHeight,
      ...(letterSpacing !== undefined && letterSpacing !== 0 ? { letterSpacing } : {}),
      ...(textDecoration ? { textDecoration } : {}),
      ...(layoutAlign ? { layoutAlign } : {}),
      ...(layoutGrow ? { layoutGrow } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      opacity: Number(computed.opacity),
      ...(outOfFlow ? { outOfFlow: true } : {}),
      overflow: computed.overflow,
      ...(clampedLineCount !== undefined
        ? { maxLines: clampedLineCount, textTruncation: "ENDING" as const }
        : {}),
      textAlign: computed.textAlign,
      ...(textAlignVertical ? { textAlignVertical } : {}),
      ...(textAutoResize === "HEIGHT"
        ? { textGrowHeight: true }
        : textAutoResize
          ? { textAutoResize }
          : {}),
      ...(transformMatrix ? { transformMatrix } : {}),
      width,
      x,
      y: exportY,
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
  if (!tokenSystem.prefix) return {};

  const declarations = getPseudoMatchedDeclarations(element, rules, pseudo);
  const bindings: Partial<Record<FigmaBindingName, string>> = {};

  for (const bindingName of ["backgroundColor", "height", "width"] as FigmaBindingName[]) {
    const token = findTokenForProperty(declarations, bindingName, tokenSystem);
    if (token) bindings[bindingName] = token;
  }

  return bindings;
}

function declarationsIncludeProperty(
  declarations: MatchedDeclaration[],
  properties: string[],
): boolean {
  return declarations.some((declaration) =>
    properties.includes(declaration.property),
  );
}

function getPseudoConstraints(
  declarations: MatchedDeclaration[],
): FigmaNodeConstraints {
  const hasTop = declarationsIncludeProperty(declarations, [
    "top",
    "inset-block-start",
    "inset-block",
    "inset",
  ]);
  const hasBottom = declarationsIncludeProperty(declarations, [
    "bottom",
    "inset-block-end",
    "inset-block",
    "inset",
  ]);
  const hasLeft = declarationsIncludeProperty(declarations, [
    "left",
    "inset-inline-start",
    "inset-inline",
    "inset",
  ]);
  const hasRight = declarationsIncludeProperty(declarations, [
    "right",
    "inset-inline-end",
    "inset-inline",
    "inset",
  ]);

  return {
    horizontal: hasLeft && hasRight ? "STRETCH" : hasRight && !hasLeft ? "MAX" : "MIN",
    vertical: hasTop && hasBottom ? "STRETCH" : hasBottom && !hasTop ? "MAX" : "MIN",
  };
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
      constraints: getPseudoConstraints(
        getPseudoMatchedDeclarations(element, rules, pseudo),
      ),
      display: style.display,
      height,
      opacity: Number(style.opacity),
      outOfFlow: true,
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
      return tokens.find(isColorTokenName) || tokens[0];
    }

    return tokens.find((token) => !isColorTokenName(token)) || tokens[0];
  }

  return undefined;
}

function getVisibleBorderSides(
  computed: CSSStyleDeclaration,
): Partial<Record<BorderSide, VisibleBorder>> | undefined {
  if (getUniformVisibleBorder(computed)) return undefined;

  const sides: Partial<Record<BorderSide, VisibleBorder>> = {};

  for (const side of borderSides) {
    if (!isVisibleBorderSide(computed, side)) continue;

    const width = cssBorderWidth(computed, side);
    const color = cssColorValue(cssBorderColor(computed, side));
    if (!color || width <= 0) continue;

    sides[side] = { color, width };
  }

  return Object.keys(sides).length > 0 ? sides : undefined;
}

function collectBorderSideBindings(
  element: Element,
  rules: CSSStyleRule[],
  sides: Partial<Record<BorderSide, VisibleBorder>>,
  tokenSystem: DetectedTokenSystem,
): Partial<Record<FigmaBindingName, string>> {
  if (!tokenSystem.prefix) return {};

  const declarations = getMatchedDeclarations(element, rules);
  const bindings: Partial<Record<FigmaBindingName, string>> = {};

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

function collectBindings(
  element: Element,
  rules: CSSStyleRule[],
  hasUniformVisibleBorder: boolean,
  tokenSystem: DetectedTokenSystem,
): Partial<Record<FigmaBindingName, string>> {
  if (!tokenSystem.prefix) return {};

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

type FormControlTextContent = {
  isPlaceholder: boolean;
  text: string;
};

const textlessInputTypes = new Set([
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
]);

// Form control text lives in the value/placeholder properties, never in DOM
// text nodes, so element traversal alone would export empty boxes.
function getFormControlTextContent(
  element: Element,
): FormControlTextContent | undefined {
  if (element instanceof HTMLInputElement) {
    const type = (element.getAttribute("type") || "text").trim().toLowerCase();
    if (textlessInputTypes.has(type)) return undefined;
    if (type === "button" || type === "submit" || type === "reset") {
      const label =
        element.value || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "");
      return label ? { isPlaceholder: false, text: label } : undefined;
    }
    if (type === "password" && element.value) {
      return { isPlaceholder: false, text: "•".repeat(element.value.length) };
    }
    if (element.value) return { isPlaceholder: false, text: element.value };
    if (element.placeholder) return { isPlaceholder: true, text: element.placeholder };
    return undefined;
  }

  if (element instanceof HTMLTextAreaElement) {
    if (element.value) return { isPlaceholder: false, text: element.value };
    if (element.placeholder) return { isPlaceholder: true, text: element.placeholder };
    return undefined;
  }

  if (element instanceof HTMLSelectElement) {
    const label = element.selectedOptions[0]?.textContent?.replace(/\s+/g, " ").trim();
    return label ? { isPlaceholder: false, text: label } : undefined;
  }

  return undefined;
}

function getPlaceholderTextColor(element: Element): string | undefined {
  try {
    return cssColorValue(window.getComputedStyle(element, "::placeholder").color);
  } catch {
    return undefined;
  }
}

type DirectTextRun = {
  lineCount: number;
  rect: DOMRect;
  text: string;
};

function countLineRects(range: Range): number {
  return Array.from(range.getClientRects()).filter(
    (lineRect) => lineRect.width > 0 && lineRect.height > 0,
  ).length;
}

// A wrapped inline run can begin mid-line, so a single rectangle cannot
// represent it. Binary-search the character offset where each rendered line
// ends and emit one run per line with that line's exact text and rect.
function splitTextNodeIntoLineRuns(node: Text): DirectTextRun[] {
  const content = node.textContent ?? "";
  const runs: DirectTextRun[] = [];
  const probe = document.createRange();
  let start = 0;

  for (let guard = 0; guard < 200 && start < content.length; guard += 1) {
    // Largest end offset whose range still renders on a single line.
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

// Mixed inline content ("Hello <b>world</b> tail") renders its bare text
// nodes without a wrapping element, so element traversal alone drops them.
// Ranges recover each text node's rendered bounds for a text leaf per run.
function getDirectTextRuns(element: Element): DirectTextRun[] {
  const runs: DirectTextRun[] = [];

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
        const lineRuns = splitTextNodeIntoLineRuns(node as Text);
        if (lineRuns.length > 1) {
          runs.push(...lineRuns);
          continue;
        }
      }
      runs.push({ lineCount: Math.max(1, lineCount), rect, text });
    } catch {
      // Detached or non-renderable text nodes contribute nothing.
    }
  }

  return runs;
}

function getAbsoluteStackingKey(element: Element): number {
  const computed = window.getComputedStyle(element);
  const zIndex = Number.parseInt(computed.zIndex, 10);
  if (Number.isFinite(zIndex)) return zIndex;
  return computed.position !== "static" ? 0.5 : 0;
}

// CSS paints negative z-index below the parent background's siblings, then
// static elements in DOM order, then positioned elements, then positive
// z-index strata. A stable sort keeps DOM order inside each stratum.
function sortEntriesForAbsoluteStacking(
  entries: AutoLayoutChildEntry[],
): AutoLayoutChildEntry[] {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      key: getAbsoluteStackingKey(entry.element),
    }))
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map((item) => item.entry);
}

// innerText reflects rendered line breaks (<br> elements and preserved
// white-space such as pre/pre-line), which textContent collapsing loses.
function getRenderedLeafText(element: Element): string {
  if (element instanceof HTMLElement) {
    const rendered = element.innerText.trim();
    if (rendered) return rendered;
  }
  return getDirectText(element);
}

function applyTextTransformToText(
  text: string,
  computed: CSSStyleDeclaration,
): string {
  const transform = computed.textTransform.trim().toLowerCase();
  if (transform.includes("uppercase")) return text.toUpperCase();
  if (transform.includes("lowercase")) return text.toLowerCase();
  if (transform.includes("capitalize")) {
    return text.replace(/\b\p{L}/gu, (character) => character.toUpperCase());
  }
  return text;
}

function getTextDecoration(
  computed: CSSStyleDeclaration,
): "STRIKETHROUGH" | "UNDERLINE" | undefined {
  const line = (computed.textDecorationLine || "").toLowerCase();
  if (line.includes("line-through")) return "STRIKETHROUGH";
  if (line.includes("underline")) return "UNDERLINE";
  return undefined;
}

function isItalicFontStyle(computed: CSSStyleDeclaration): boolean {
  const fontStyle = computed.fontStyle.trim().toLowerCase();
  return fontStyle.startsWith("italic") || fontStyle.startsWith("oblique");
}

function hasElementChildren(element: Element): boolean {
  return Array.from(element.children).some((child) => {
    // <br> only breaks lines inside a text leaf; it is not structural content.
    if (child.tagName === "BR") return false;
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

// The story's rendered root is exported as-is: demo markup around component
// elements is part of the story and must survive the round-trip. Component
// references still attach to the data-component nodes at any depth.
function findExportRoot(scope: HTMLElement): Element | undefined {
  return scope.firstElementChild ?? undefined;
}

const rasterImageMaxDimension = 2048;

type RasterImageCapture = {
  imageBase64: string;
  imageMimeType: string;
};

function getImageScaleMode(computed: CSSStyleDeclaration): "FILL" | "FIT" {
  const objectFit = (computed.objectFit || "").trim().toLowerCase();
  if (objectFit === "contain" || objectFit === "none" || objectFit === "scale-down") {
    return "FIT";
  }
  return "FILL";
}

function dataUrlToRasterCapture(dataUrl: string): RasterImageCapture | undefined {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return undefined;
  return { imageBase64: match[2], imageMimeType: match[1] };
}

// Draws a decoded image source onto a capped canvas (longest side 2048) and
// returns PNG base64 without the data: prefix. Fails on tainted canvases.
function drawSourceToRasterCapture(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
): RasterImageCapture | undefined {
  if (naturalWidth <= 0 || naturalHeight <= 0) return undefined;

  const scale = Math.min(
    1,
    rasterImageMaxDimension / Math.max(naturalWidth, naturalHeight),
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(source, 0, 0, width, height);
    return dataUrlToRasterCapture(canvas.toDataURL("image/png"));
  } catch {
    return undefined;
  }
}

// Renders a live subtree to pixels via html-to-image. This is the universal
// escape hatch (data-figma-rasterize) for content the node graph cannot
// represent, and the source of the browser reference snapshot. No timer
// races the capture: under headless virtual time a timer fast-forwards past
// real CPU work, and in real browsers resource fetches settle on their own.
async function captureSubtreeRaster(
  element: HTMLElement,
): Promise<RasterImageCapture | undefined> {
  try {
    const dataUrl = await toPng(element, { cacheBust: false, pixelRatio: 1 });
    return dataUrl ? dataUrlToRasterCapture(dataUrl) : undefined;
  } catch {
    return undefined;
  }
}

// Cross-origin images taint the canvas; refetching through fetch() yields
// CORS-clean bytes that can be re-encoded (and downscaled) safely.
async function fetchRasterCapture(src: string): Promise<RasterImageCapture | undefined> {
  try {
    const response = await fetch(src);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.type === "image/svg+xml") {
      return undefined;
    }

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        const capture = drawSourceToRasterCapture(bitmap, bitmap.width, bitmap.height);
        bitmap.close();
        if (capture) return capture;
      } catch {
        // Fall through to the raw data URL path below.
      }
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return dataUrlToRasterCapture(dataUrl);
  } catch {
    return undefined;
  }
}

async function captureRasterImage(
  element: HTMLImageElement,
): Promise<RasterImageCapture | undefined> {
  const src = element.currentSrc || element.src;
  if (!src || src.startsWith("data:image/svg+xml")) return undefined;

  const drawn = drawSourceToRasterCapture(
    element,
    element.naturalWidth,
    element.naturalHeight,
  );
  if (drawn) return drawn;

  return fetchRasterCapture(src);
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

type AutoLayoutChildEntry = {
  element: Element;
  node: FigmaExportNode;
};

type AutoLayoutMeasurement = {
  children: FigmaExportNode[];
  counterAxisSpacing?: number;
  gap?: number;
  layoutWrap?: "WRAP";
  paddingOverrides?: {
    bottom?: number;
    left?: number;
    right?: number;
    top?: number;
  };
  strategy: FigmaLayoutStrategy;
};

type MeasuredFlowChild = {
  crossEnd: number;
  crossStart: number;
  mainEnd: number;
  mainStart: number;
  node: FigmaExportNode;
};

function isUniformSpacing(values: number[]): boolean {
  if (values.length === 0) return true;
  return Math.max(...values) - Math.min(...values) <= 1;
}

function averageSpacing(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Derives auto-layout spacing from the children's real bounding rects instead
// of trusting declared gap alone: margin-driven spacing, space-around/evenly
// distributions, order/*-reverse visual order, and flex wrap lines all fall
// out of measurement. Non-uniform spacing (that space-between cannot explain)
// falls back to the absolute strategy so positions stay pixel-true.
function measureAutoLayoutChildren({
  childEntries,
  computed,
  containerRect,
}: {
  childEntries: AutoLayoutChildEntry[];
  computed: CSSStyleDeclaration;
  containerRect: DOMRect;
}): AutoLayoutMeasurement | undefined {
  const flowEntries = childEntries.filter((entry) => !entry.node.styles.outOfFlow);
  const outOfFlowNodes = childEntries
    .filter((entry) => entry.node.styles.outOfFlow)
    .map((entry) => entry.node);
  if (flowEntries.length === 0) return undefined;

  const isColumn = computed.flexDirection.startsWith("column");
  const measured: MeasuredFlowChild[] = flowEntries.map(({ element, node }) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left - containerRect.left;
    const y = rect.top - containerRect.top;
    return {
      crossEnd: isColumn ? x + rect.width : y + rect.height,
      crossStart: isColumn ? x : y,
      mainEnd: isColumn ? y + rect.height : x + rect.width,
      mainStart: isColumn ? y : x,
      node,
    };
  });

  const sortedByCross = [...measured].sort(
    (a, b) => a.crossStart - b.crossStart || a.mainStart - b.mainStart,
  );
  const lines: MeasuredFlowChild[][] = [];
  for (const item of sortedByCross) {
    const line = lines[lines.length - 1];
    const lineEnd = line
      ? Math.max(...line.map((entry) => entry.crossEnd))
      : Number.NEGATIVE_INFINITY;
    if (!line || item.crossStart >= lineEnd - 0.5) {
      lines.push([item]);
    } else {
      line.push(item);
    }
  }
  lines.forEach((line) => line.sort((a, b) => a.mainStart - b.mainStart));

  const mainGaps: number[] = [];
  for (const line of lines) {
    for (let index = 0; index < line.length - 1; index += 1) {
      mainGaps.push(line[index + 1].mainStart - line[index].mainEnd);
    }
  }
  const crossGaps: number[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    const currentEnd = Math.max(...lines[index].map((entry) => entry.crossEnd));
    const nextStart = Math.min(...lines[index + 1].map((entry) => entry.crossStart));
    crossGaps.push(nextStart - currentEnd);
  }

  const justify = computed.justifyContent.trim();
  const isSpaceBetween = justify === "space-between";
  const hasOverlap =
    mainGaps.some((value) => value < -0.5) || crossGaps.some((value) => value < -0.5);

  if (
    hasOverlap ||
    !isUniformSpacing(crossGaps) ||
    (!isUniformSpacing(mainGaps) && !isSpaceBetween)
  ) {
    return {
      children: childEntries.map((entry) => entry.node),
      strategy: "absolute",
    };
  }

  const wrapDeclared =
    computed.flexWrap === "wrap" || computed.flexWrap === "wrap-reverse";
  const measurement: AutoLayoutMeasurement = {
    children: [
      ...lines.flatMap((line) => line.map((entry) => entry.node)),
      ...outOfFlowNodes,
    ],
    strategy: "autoLayout",
  };

  if (mainGaps.length > 0 && !isSpaceBetween) {
    measurement.gap = Math.max(0, toFiniteNumber(averageSpacing(mainGaps)));
  }

  if (wrapDeclared && lines.length > 1) {
    measurement.layoutWrap = "WRAP";
    if (crossGaps.length > 0) {
      measurement.counterAxisSpacing = Math.max(
        0,
        toFiniteNumber(averageSpacing(crossGaps)),
      );
    }
  }

  const isStartJustified =
    justify === "" ||
    ["flex-start", "left", "normal", "start"].includes(justify);
  // space-around/space-evenly do not exist in Figma; measured edge offsets
  // become padding so MIN justification reproduces the same static layout.
  const isSpaceDistributed = justify === "space-around" || justify === "space-evenly";
  if (isStartJustified || isSpaceDistributed) {
    // Measured offsets start at the border box edge, matching Figma frames
    // whose inside strokes overlap the padding area, so the border width is
    // already part of the exported padding.
    const leading = Math.min(...measured.map((entry) => entry.mainStart));
    const containerMainSize = isColumn ? containerRect.height : containerRect.width;
    const trailing =
      containerMainSize - Math.max(...measured.map((entry) => entry.mainEnd));
    const leadingPadding = Math.max(0, toFiniteNumber(leading));
    const trailingPadding = Math.max(0, toFiniteNumber(trailing));
    measurement.paddingOverrides = isColumn
      ? { bottom: trailingPadding, top: leadingPadding }
      : { left: leadingPadding, right: trailingPadding };
  }

  return measurement;
}

async function createExportNode(
  element: Element,
  rootRect: DOMRect,
  parentRect: DOMRect,
  ruleIndex: CssRuleIndex,
  tokenSystem: DetectedTokenSystem,
  options: ResolvedFigmaExportAddonOptions,
  traversalState: FigmaExportTraversalState,
  forceAbsoluteLayout = false,
  parentClientTransform?: AffineTransform,
): Promise<FigmaExportNode | undefined> {
  await markExportNodeVisited(traversalState);

  const computed = window.getComputedStyle(element);
  if (
    computed.display === "none" ||
    computed.visibility === "hidden" ||
    Number(computed.opacity) === 0
  ) {
    return undefined;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;

  // Universal escape hatch: a subtree marked data-figma-rasterize="true"
  // exports as one bitmap exactly as painted (canvas/WebGL, exotic CSS, ...).
  if (
    element instanceof HTMLElement &&
    element.getAttribute("data-figma-rasterize") === "true"
  ) {
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
          y: toFiniteNumber(rect.top - parentRect.top),
        },
      };
    }
  }

  const transformGeometry = resolveElementTransformGeometry(
    element,
    computed,
    rect,
    parentRect,
    parentClientTransform,
  );
  const width = toFiniteNumber(transformGeometry?.width ?? rect.width);
  const height = toFiniteNumber(transformGeometry?.height ?? rect.height);
  if (width <= 0 || height <= 0) return undefined;
  const localX = transformGeometry
    ? transformGeometry.x
    : toFiniteNumber(rect.left - parentRect.left);
  const localY = transformGeometry
    ? transformGeometry.y
    : toFiniteNumber(rect.top - parentRect.top);
  const transformMatrix = transformGeometry?.transformMatrix;
  const fontScale = transformGeometry?.fontScale ?? 1;
  const insetScaleX = transformGeometry?.scaleX ?? 1;
  const insetScaleY = transformGeometry?.scaleY ?? 1;

  const rules = getRulesForElement(ruleIndex, element);
  const forceAutoLayout =
    element.getAttribute("data-figma-layout-strategy") === "auto-layout";
  const nextForceAbsoluteLayout =
    !forceAutoLayout && (forceAbsoluteLayout || isAbsoluteFidelityRoot(element, options));
  const component = getComponentReference(element);

  if (element instanceof SVGElement) {
    return createInlineSvgNode(
      element,
      computed,
      rect,
      parentRect,
      options,
      transformGeometry,
    );
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

  const childElements = getRenderChildren(element);
  const hasPositionedChildren = hasOutOfFlowPositionedChildren(childElements);
  const childNodeResults = await Promise.all(
    childElements.map((child) =>
      createExportNode(
        child,
        rootRect,
        rect,
        ruleIndex,
        tokenSystem,
        options,
        traversalState,
        nextForceAbsoluteLayout && !child.hasAttribute("data-component"),
        transformGeometry?.clientTransform,
      ),
    ),
  );
  const childEntries: AutoLayoutChildEntry[] = [];
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
    backgroundLayers
      .map((layer) => parseLinearGradient(layer, width, height))
      .find(Boolean),
    declarations,
    tokenSystem,
  );
  const backgroundRadialGradient = backgroundLayers
    .map(parseRadialGradient)
    .find(Boolean);
  const backgroundImageUrl = backgroundLayers
    .map(getBackgroundImageUrl)
    .find(Boolean);
  const color = cssColorValue(computed.color);
  const border = getUniformVisibleBorder(computed);
  const borderSideMap = getVisibleBorderSides(computed);
  const fontWeight = Number.parseInt(computed.fontWeight, 10);
  const radiusStyles = getRadiusStyles(computed, width, height);
  const boxShadowEffects = getBoxShadowEffects(computed);
  const blurEffects = getBlurEffects(computed);
  const lineHeight = cssLineHeightToNumber(computed.lineHeight);
  // The main-axis gap is column-gap in a row and row-gap in a column.
  const gap = computed.flexDirection.startsWith("column")
    ? cssLengthToNumber(computed.rowGap) ?? cssLengthToNumber(computed.gap)
    : cssLengthToNumber(computed.columnGap) ?? cssLengthToNumber(computed.gap);
  const layoutAlign = getLayoutAlign(element);
  const layoutGrow = getLayoutGrow(element, computed);
  const textLayoutStrategy =
    element.getAttribute("data-figma-layout-strategy") === "auto-layout"
      ? "autoLayout"
      : getLayoutStrategy(element, computed, nextForceAbsoluteLayout);
  const textAlignVertical = getTextAlignVertical(element);
  const bindings = collectBindings(element, rules, Boolean(border), tokenSystem);
  if (borderSideMap) {
    Object.assign(
      bindings,
      collectBorderSideBindings(element, rules, borderSideMap, tokenSystem),
    );
  }
  const layoutSizingHorizontal = getLayoutSizingHorizontal(
    element,
    computed,
    bindings,
    declarations,
  );
  const layoutSizingVertical = getLayoutSizingVertical(
    element,
    computed,
    bindings,
    declarations,
  );
  const frameLayoutAlign =
    layoutAlign ?? getInferredFrameLayoutAlign(element, computed, declarations);
  if (backgroundLinearGradient) {
    delete bindings.backgroundColor;
  }
  const layoutStrategy = getLayoutStrategy(element, computed, nextForceAbsoluteLayout);
  const pseudoNodes = (["before", "after"] as PseudoElementName[])
    .map((pseudo) =>
      createPseudoNode(element, rules, pseudo, width, height, tokenSystem, options),
    )
    .filter((node): node is FigmaExportNode => Boolean(node));
  const shouldPreserveComputedAutoLayout =
    layoutStrategy === "autoLayout" &&
    isFlexDisplay(computed.display) &&
    !hasPositionedChildren;
  const frameLayoutStrategy: FigmaLayoutStrategy =
    element.getAttribute("data-figma-layout-strategy") === "auto-layout"
      ? layoutStrategy
      : shouldPreserveComputedAutoLayout
        ? layoutStrategy
        : pseudoNodes.length > 0 || hasPositionedChildren
        ? "absolute"
        : layoutStrategy;

  const elementOutOfFlow = isOutOfFlowPositioned(computed);

  const formControlText = getFormControlTextContent(element);
  // A wrapped inline element (multi-line link) exports as a frame with
  // per-line runs below instead of a single unrepresentable text rectangle.
  const isWrappedInlineText =
    computed.display === "inline" &&
    Array.from(element.getClientRects()).filter(
      (lineRect) => lineRect.width > 0 && lineRect.height > 0,
    ).length > 1;
  if (
    formControlText !== undefined ||
    (directText &&
      !hasElementChildren(element) &&
      !element.shadowRoot &&
      !isWrappedInlineText)
  ) {
    const leafText = applyTextTransformToText(
      formControlText !== undefined
        ? formControlText.text
        : getRenderedLeafText(element),
      computed,
    );
    const leafColorOverride = formControlText?.isPlaceholder
      ? getPlaceholderTextColor(element)
      : undefined;
    // Single-line controls center their text vertically; textareas stay top.
    const leafTextAlignVertical =
      textAlignVertical ??
      (formControlText !== undefined && !(element instanceof HTMLTextAreaElement)
        ? ("CENTER" as const)
        : undefined);
    if (hasBoxedTextStyle(computed, border)) {
      const paddingLeft = (cssLengthToNumber(computed.paddingLeft) ?? 0) * insetScaleX;
      const paddingRight = (cssLengthToNumber(computed.paddingRight) ?? 0) * insetScaleX;
      const paddingTop = (cssLengthToNumber(computed.paddingTop) ?? 0) * insetScaleY;
      const paddingBottom =
        (cssLengthToNumber(computed.paddingBottom) ?? 0) * insetScaleY;
      // Browser text content sits after the border and padding; the exported
      // box is the border box, so both inset the inner text node.
      const borderLeftWidth = cssBorderWidth(computed, "left") * insetScaleX;
      const borderRightWidth = cssBorderWidth(computed, "right") * insetScaleX;
      const borderTopWidth = cssBorderWidth(computed, "top") * insetScaleY;
      const borderBottomWidth = cssBorderWidth(computed, "bottom") * insetScaleY;
      const contentHeight = Math.max(
        1,
        height - paddingTop - paddingBottom - borderTopWidth - borderBottomWidth,
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
          contentHeight / insetScaleY,
        ),
        layoutAlign,
        layoutGrow,
        textAlignVertical: leafTextAlignVertical,
        width: Math.max(
          1,
          width - paddingLeft - paddingRight - borderLeftWidth - borderRightWidth,
        ),
        x: borderLeftWidth + paddingLeft,
        y: borderTopWidth + paddingTop,
      });

      if (textLayoutStrategy === "autoLayout") {
        return {
          bindings,
          children: [textNode],
          ...(component ? { component } : {}),
          kind: "frame",
          layoutStrategy: "autoLayout",
          name: getElementName(element, options),
          styles: {
            alignItems: "center",
            ...(backgroundColor ? { backgroundColor } : {}),
            ...(backgroundLinearGradient ? { backgroundLinearGradient } : {}),
            ...(backgroundRadialGradient ? { backgroundRadialGradient } : {}),
            ...(boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {}),
            ...(blurEffects.length > 0 ? { blurEffects } : {}),
            ...(border
              ? {
                  borderColor: border.color,
                  ...(border.style ? { borderStyle: border.style } : {}),
                  borderWidth: border.width,
                }
              : {}),
            ...(borderSideMap ? { borderSides: borderSideMap } : {}),
            display: "flex",
            flexDirection: "row",
            height,
            justifyContent: justifyContentFromTextAlign(computed.textAlign),
            opacity: Number(computed.opacity),
            ...(elementOutOfFlow ? { outOfFlow: true } : {}),
            overflow: computed.overflow,
            paddingBottom: paddingBottom + borderBottomWidth,
            paddingLeft: paddingLeft + borderLeftWidth,
            paddingRight: paddingRight + borderRightWidth,
            paddingTop: paddingTop + borderTopWidth,
            ...radiusStyles,
            ...(layoutSizingHorizontal ? { layoutSizingHorizontal } : {}),
            ...(layoutSizingHorizontal && !bindings.height
              ? { layoutSizingVertical: "HUG" as const }
              : {}),
            ...(transformMatrix ? { transformMatrix } : {}),
            width,
            x: localX,
            y: localY,
          },
        };
      }

      return {
        bindings,
        children: [textNode],
        ...(component ? { component } : {}),
        kind: "frame",
        layoutStrategy: "absolute",
        name: getElementName(element, options),
        styles: {
          ...(backgroundColor ? { backgroundColor } : {}),
          ...(backgroundLinearGradient ? { backgroundLinearGradient } : {}),
          ...(backgroundRadialGradient ? { backgroundRadialGradient } : {}),
          ...(boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {}),
          ...(blurEffects.length > 0 ? { blurEffects } : {}),
          ...(border
            ? {
                borderColor: border.color,
                ...(border.style ? { borderStyle: border.style } : {}),
                borderWidth: border.width,
              }
            : {}),
          ...(borderSideMap ? { borderSides: borderSideMap } : {}),
          display: getExportDisplay(computed, "absolute"),
          height,
          opacity: Number(computed.opacity),
          ...(elementOutOfFlow ? { outOfFlow: true } : {}),
          overflow: computed.overflow,
          paddingBottom,
          paddingLeft,
          paddingRight,
          paddingTop,
          ...radiusStyles,
          ...(layoutSizingHorizontal ? { layoutSizingHorizontal } : {}),
          ...(transformMatrix ? { transformMatrix } : {}),
          width,
          x: localX,
          y: localY,
        },
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
      y: localY,
    });
    // Component elements that render as bare text (e.g. an inline text link)
    // must keep their reference for importer-side component extraction.
    return component ? { ...textLeafNode, component } : textLeafNode;
  }

  const kind =
    element instanceof HTMLImageElement || element instanceof HTMLCanvasElement
      ? "image"
      : "frame";
  let imageSvgText: string | undefined;
  let imageCapture: RasterImageCapture | undefined;
  if (element instanceof HTMLImageElement) {
    imageSvgText = await fetchSvgText(element, options);
    if (!imageSvgText) imageCapture = await captureRasterImage(element);
  } else if (element instanceof HTMLCanvasElement) {
    imageCapture = drawSourceToRasterCapture(element, element.width, element.height);
  } else if (backgroundImageUrl) {
    // CSS background images become an image fill on the frame itself.
    imageCapture = await fetchRasterCapture(backgroundImageUrl);
  }
  const elementName = getElementName(element, options);
  const inlineTextRunNodes =
    kind === "frame" && directText && !element.shadowRoot
      ? getDirectTextRuns(element).map((run, index) =>
          createTextLeafNode({
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
            y: toFiniteNumber(run.rect.top - rect.top),
          }),
        )
      : [];
  // Bare text runs have no layout element and transformed nodes carry exact
  // matrix positions, so both keep the frame at measured absolute positions
  // instead of approximating them in auto layout.
  const hasTransformedChildNodes = childNodes.some(
    (node) => node.styles.transformMatrix,
  );
  const forceAbsoluteChildren =
    inlineTextRunNodes.length > 0 ||
    Boolean(transformGeometry) ||
    hasTransformedChildNodes;
  const autoLayoutMeasurement =
    kind === "frame" &&
    !forceAbsoluteChildren &&
    frameLayoutStrategy === "autoLayout" &&
    isFlexDisplay(computed.display) &&
    childEntries.length > 0
      ? measureAutoLayoutChildren({ childEntries, computed, containerRect: rect })
      : undefined;
  const effectiveLayoutStrategy: FigmaLayoutStrategy =
    forceAbsoluteChildren
      ? "absolute"
      : autoLayoutMeasurement?.strategy ?? frameLayoutStrategy;
  const orderedChildNodes =
    effectiveLayoutStrategy === "absolute"
      ? [
          ...inlineTextRunNodes,
          ...sortEntriesForAbsoluteStacking(childEntries).map((entry) => entry.node),
        ]
      : autoLayoutMeasurement?.children ?? childNodes;
  const paddingOverrides =
    effectiveLayoutStrategy === "autoLayout"
      ? autoLayoutMeasurement?.paddingOverrides
      : undefined;
  const measuredGap =
    effectiveLayoutStrategy === "autoLayout" ? autoLayoutMeasurement?.gap : undefined;
  const effectiveGap = measuredGap ?? gap;
  const frameStyles = {
    ...(computed.alignItems ? { alignItems: computed.alignItems } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(backgroundLinearGradient ? { backgroundLinearGradient } : {}),
    ...(backgroundRadialGradient ? { backgroundRadialGradient } : {}),
    ...(boxShadowEffects.length > 0 ? { effects: boxShadowEffects } : {}),
    ...(blurEffects.length > 0 ? { blurEffects } : {}),
    ...(border
      ? {
          borderColor: border.color,
          ...(border.style ? { borderStyle: border.style } : {}),
          borderWidth: border.width,
        }
      : {}),
    ...(borderSideMap ? { borderSides: borderSideMap } : {}),
    ...(color ? { color } : {}),
    ...(effectiveLayoutStrategy === "autoLayout" &&
    autoLayoutMeasurement?.counterAxisSpacing !== undefined
      ? { counterAxisSpacing: autoLayoutMeasurement.counterAxisSpacing }
      : {}),
    display: getExportDisplay(computed, effectiveLayoutStrategy),
    ...(effectiveLayoutStrategy === "autoLayout"
      ? { flexDirection: computed.flexDirection.replace("-reverse", "") }
      : {}),
    fontFamily: computed.fontFamily,
    fontSize: cssLengthToNumber(computed.fontSize) ?? 14,
    ...(Number.isFinite(fontWeight) ? { fontWeight } : {}),
    ...(effectiveGap !== undefined && effectiveGap >= 0 ? { gap: effectiveGap } : {}),
    height,
    ...(computed.justifyContent ? { justifyContent: computed.justifyContent } : {}),
    ...(frameLayoutAlign ? { layoutAlign: frameLayoutAlign } : {}),
    ...(layoutGrow ? { layoutGrow } : {}),
    ...(layoutSizingHorizontal ? { layoutSizingHorizontal } : {}),
    ...(layoutSizingVertical ? { layoutSizingVertical } : {}),
    ...(effectiveLayoutStrategy === "autoLayout" && autoLayoutMeasurement?.layoutWrap
      ? { layoutWrap: autoLayoutMeasurement.layoutWrap }
      : {}),
    ...(lineHeight ? { lineHeight } : {}),
    opacity: Number(computed.opacity),
    ...(elementOutOfFlow ? { outOfFlow: true } : {}),
    overflow: computed.overflow,
    // CSS borders take layout space before the padding; Figma inside strokes
    // do not, so the border width folds into the exported padding.
    paddingBottom:
      paddingOverrides?.bottom ??
      (cssLengthToNumber(computed.paddingBottom) ?? 0) +
        cssBorderWidth(computed, "bottom"),
    paddingLeft:
      paddingOverrides?.left ??
      (cssLengthToNumber(computed.paddingLeft) ?? 0) +
        cssBorderWidth(computed, "left"),
    paddingRight:
      paddingOverrides?.right ??
      (cssLengthToNumber(computed.paddingRight) ?? 0) +
        cssBorderWidth(computed, "right"),
    paddingTop:
      paddingOverrides?.top ??
      (cssLengthToNumber(computed.paddingTop) ?? 0) +
        cssBorderWidth(computed, "top"),
    ...radiusStyles,
    ...(textAlignVertical ? { textAlignVertical } : {}),
    ...(transformMatrix ? { transformMatrix } : {}),
    width,
    x: localX,
    y: localY,
  };
  return {
    bindings,
    children: kind === "image" ? [] : [...orderedChildNodes, ...pseudoNodes],
    ...(component ? { component } : {}),
    ...(imageCapture ? { ...imageCapture } : {}),
    kind,
    layoutStrategy: kind === "image" ? "absolute" : effectiveLayoutStrategy,
    name: elementName,
    ...(imageSvgText ? { svgText: imageSvgText } : {}),
    styles: imageCapture
      ? {
          ...frameStyles,
          imageScaleMode:
            kind === "image"
              ? getImageScaleMode(computed)
              : getBackgroundScaleMode(computed),
        }
      : frameStyles,
  };
}

// --- Value-preserving binding guard ----------------------------------------
// Computed styles are ground truth. A token binding may only survive when the
// variable's resolved value matches the style value it would replace in
// Figma; otherwise the binding would repaint the node with the raw token
// value (a unitless line-height ratio, a padding that excludes the folded
// border width, a locally overridden custom property, ...).

const bindingNumberTolerance = 0.6;

function bindingNumbersMatch(tokenValue: number, styleValue: number): boolean {
  if (!Number.isFinite(tokenValue) || !Number.isFinite(styleValue)) return false;
  if (Math.abs(tokenValue - styleValue) <= bindingNumberTolerance) return true;
  return (
    styleValue !== 0 &&
    Math.abs(tokenValue - styleValue) / Math.abs(styleValue) <= 0.01
  );
}

function bindingColorsMatch(
  tokenColor: ParsedRgbaColor,
  styleColor: ParsedRgbaColor,
): boolean {
  return (
    Math.abs(tokenColor.r - styleColor.r) <= 0.012 &&
    Math.abs(tokenColor.g - styleColor.g) <= 0.012 &&
    Math.abs(tokenColor.b - styleColor.b) <= 0.012 &&
    Math.abs(tokenColor.a - styleColor.a) <= 0.02
  );
}

function firstFontFamilyName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return getCssFontFamilyCandidates(value)[0]?.toLowerCase();
}

type BindingExpectation =
  | { kind: "color"; value: string }
  | { kind: "font"; value: string }
  | { kind: "number"; value: number };

function getBindingExpectation(
  node: FigmaExportNode,
  bindingName: FigmaBindingName,
): BindingExpectation | undefined {
  const styles = node.styles;
  switch (bindingName) {
    case "backgroundColor":
      return styles.backgroundColor
        ? { kind: "color", value: styles.backgroundColor }
        : undefined;
    case "borderColor": {
      const color =
        styles.borderColor ??
        (styles.borderSides
          ? Object.values(styles.borderSides).find(Boolean)?.color
          : undefined);
      return color ? { kind: "color", value: color } : undefined;
    }
    case "textColor":
      return styles.color ? { kind: "color", value: styles.color } : undefined;
    case "fontFamily":
      return styles.fontFamily ? { kind: "font", value: styles.fontFamily } : undefined;
    case "fontSize":
      return typeof styles.fontSize === "number"
        ? { kind: "number", value: styles.fontSize }
        : undefined;
    case "fontWeight":
      return typeof styles.fontWeight === "number"
        ? { kind: "number", value: styles.fontWeight }
        : undefined;
    case "lineHeight":
      return typeof styles.lineHeight === "number"
        ? { kind: "number", value: styles.lineHeight }
        : undefined;
    case "gap":
      return typeof styles.gap === "number"
        ? { kind: "number", value: styles.gap }
        : undefined;
    case "height":
      return { kind: "number", value: styles.height };
    case "width":
      return { kind: "number", value: styles.width };
    case "opacity":
      return typeof styles.opacity === "number"
        ? { kind: "number", value: styles.opacity }
        : undefined;
    case "borderWidth": {
      const width =
        styles.borderWidth ??
        (styles.borderSides
          ? Object.values(styles.borderSides).find(Boolean)?.width
          : undefined);
      return typeof width === "number" ? { kind: "number", value: width } : undefined;
    }
    case "cornerRadius":
      return { kind: "number", value: styles.radius ?? 0 };
    case "paddingBottom":
      return typeof styles.paddingBottom === "number"
        ? { kind: "number", value: styles.paddingBottom }
        : undefined;
    case "paddingLeft":
      return typeof styles.paddingLeft === "number"
        ? { kind: "number", value: styles.paddingLeft }
        : undefined;
    case "paddingRight":
      return typeof styles.paddingRight === "number"
        ? { kind: "number", value: styles.paddingRight }
        : undefined;
    case "paddingTop":
      return typeof styles.paddingTop === "number"
        ? { kind: "number", value: styles.paddingTop }
        : undefined;
    default:
      return undefined;
  }
}

function bindingSurvivesValueCheck(
  node: FigmaExportNode,
  bindingName: FigmaBindingName,
  tokenName: string,
  tokenSystem: DetectedTokenSystem,
): boolean {
  const resolved = resolveTokenComparableValue(tokenName, tokenSystem);
  // Tokens outside the catalog cannot be verified (or created); keep the
  // existing behavior for them instead of guessing.
  if (!resolved) return true;

  const expected = getBindingExpectation(node, bindingName);
  if (!expected) return false;

  if (expected.kind === "number") {
    return (
      resolved.type === "FLOAT" &&
      typeof resolved.value === "number" &&
      bindingNumbersMatch(resolved.value, expected.value)
    );
  }

  if (expected.kind === "color") {
    if (resolved.type !== "COLOR" || typeof resolved.value !== "object") return false;
    const styleColor = parseCssColorToRgba(expected.value);
    return styleColor
      ? bindingColorsMatch(resolved.value as ParsedRgbaColor, styleColor)
      : false;
  }

  if (resolved.type !== "STRING") return false;
  // The unmodified raw value keeps its CSS quoting, which the font-family
  // candidate parser understands.
  const tokenFamily = firstFontFamilyName(resolved.raw);
  const styleFamily = firstFontFamilyName(expected.value);
  return Boolean(tokenFamily && styleFamily && tokenFamily === styleFamily);
}

function pruneMismatchedBindings(
  node: FigmaExportNode,
  tokenSystem: DetectedTokenSystem,
): void {
  for (const [bindingName, tokenName] of Object.entries(node.bindings)) {
    if (!tokenName) continue;
    if (
      !bindingSurvivesValueCheck(
        node,
        bindingName as FigmaBindingName,
        tokenName,
        tokenSystem,
      )
    ) {
      delete node.bindings[bindingName as FigmaBindingName];
    }
  }

  const gradient = node.styles.backgroundLinearGradient;
  if (gradient) {
    for (const stop of gradient.stops) {
      if (!stop.token) continue;
      const resolved = resolveTokenComparableValue(stop.token, tokenSystem);
      if (!resolved) continue;
      const stopColor = parseCssColorToRgba(stop.color);
      const matches =
        resolved.type === "COLOR" &&
        typeof resolved.value === "object" &&
        stopColor !== undefined &&
        bindingColorsMatch(resolved.value as ParsedRgbaColor, stopColor);
      if (!matches) delete stop.token;
    }
  }

  node.children.forEach((child) => pruneMismatchedBindings(child, tokenSystem));
}

export async function createFigmaExportPayload({
  componentTitle,
  onProgress,
  options,
  scope,
  storyId,
  storyName,
  storyTitle,
}: {
  componentTitle: string;
  onProgress?: FigmaExportProgressCallback;
  options: ResolvedFigmaExportAddonOptions;
  scope: HTMLElement;
  storyId: string;
  storyName: string;
  storyTitle: string;
}): Promise<FigmaExportPayload> {
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
  const traversalState: FigmaExportTraversalState = {
    lastProgressAt: 0,
    lastYieldAt: getExportTime(),
    nodeCount: 0,
    onProgress,
  };
  const rootNode = await createExportNode(
    root,
    rootRect,
    rootRect,
    ruleIndex,
    tokenSystem,
    options,
    traversalState,
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

  const component =
    artifactKind === "component"
      ? rootNode.component ??
        (!hasComponentReference(rootNode)
          ? getComponentReference(root, componentTitle)
          : undefined)
      : undefined;

  // Browser-render snapshot: the importer places it as a locked reference
  // layer so any node-graph gap is immediately visible next to the import.
  let reference: FigmaExportReferenceImage | undefined;
  const rootPixels = rootRect.width * rootRect.height;
  if (
    options.referenceImage &&
    root instanceof HTMLElement &&
    rootPixels > 0 &&
    rootPixels <= 8_000_000
  ) {
    const capture = await captureSubtreeRaster(root);
    if (capture) {
      reference = {
        height: toFiniteNumber(rootRect.height),
        imageBase64: capture.imageBase64,
        imageMimeType: capture.imageMimeType,
        width: toFiniteNumber(rootRect.width),
      };
    }
  }

  const tokenNames = new Set<string>();
  onProgress?.({ nodeCount: traversalState.nodeCount, phase: "tokens" });
  await waitForExportFrame();

  function collectNodeTokens(node: FigmaExportNode) {
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
    ...(component ? { component } : {}),
    componentTitle,
    generatedAt: new Date().toISOString(),
    ...(reference ? { reference } : {}),
    root: rootNode,
    storyId,
    storyName,
    storyTitle,
    tokenSystem: {
      collections: tokenSystem.collections,
      layers: tokenSystem.layers,
      pluginDataKey: tokenSystem.pluginDataKey,
      prefix: tokenSystem.prefix,
    },
    tokens: collectTokensForExport(tokenNames, tokenSystem),
    version: 2,
  };
}
