import {
  createElement,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPrototypeFlowLayoutPayload,
  getPrototypeFlowLayoutStorageKey,
  normalizePrototypeFlowLayoutPositions,
  readPrototypeFlowLayoutPositions,
  writePrototypeFlowLayoutPositions,
} from "../../src/pages/prototypes/prototypeFlowLayout";

import "./prototype-inspector.css";

const prototypeInspectorModes = [
  { id: "story", label: "Story" },
  { id: "docs", label: "Docs" },
  { id: "flow", label: "UI Flow" },
  { id: "data", label: "Data" },
];

const docDefinitions = [
  { docKey: "prd", id: "prd", label: "PRD" },
  { docKey: "uiSpec", id: "ui-spec", label: "UI Spec" },
  { docKey: "flowSpec", id: "flow-spec", label: "Flow Spec" },
  { docKey: "dataSpec", id: "data-spec", label: "Data Spec" },
  {
    docKey: "implementationGuide",
    id: "implementation-guide",
    label: "Implementation Guide",
  },
  { docKey: "acceptance", id: "acceptance", label: "Acceptance" },
];

const defaultPrototypeModeGlobalName = "prototypeMode";
const defaultPrototypeParameterName = "prototype";
const routePreviewMeasurementSelector = '[data-prototype-route-preview="true"]';
const previewHeightCssVariable =
  "--prototype-inspector-viewport-compact-height";
const previewWidthCssVariable =
  "--prototype-inspector-viewport-compact-width";
const nodeWidth = 423;
const nodeHeaderHeight = 64;
const nodeFrameSize = 2;
const decisionNodeSize = 220;
const stateNodeWidth = 308;
const stateNodeHeight = 124;
const defaultNodePreviewWidth = 375;
const defaultNodePreviewHeight = 812;
const defaultNodeHeight =
  defaultNodePreviewHeight + nodeHeaderHeight + nodeFrameSize;
const canvasPadding = 96;
const zoomStep = 0.1;
const minZoomScale = 0.15;
const maxZoomScale = 1.4;
const maxEdgeLabelScale = 2.4;
const edgeLabelVisualMinWidth = 64;
const edgeLabelVisualMaxWidth = 176;
const edgeLabelVisualHeight = 22;
const edgeLabelPlacementMargin = 18;
const edgeLabelObstacleMargin = 14;
const flowArrowLength = 14;
const flowArrowHalfWidth = 5;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEditableEventTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true']"),
  );
}

function clampZoomScale(value) {
  return Math.min(maxZoomScale, Math.max(minZoomScale, value));
}

function getEdgeLabelScale(canvasScale) {
  return canvasScale > 0 ? Math.min(maxEdgeLabelScale, 1 / canvasScale) : 1;
}

function getPrototypeMode(value) {
  return prototypeInspectorModes.some((mode) => mode.id === value)
    ? value
    : "story";
}

function getPrototypeParameter(context, parameterName) {
  const prototype = context.parameters?.[parameterName];
  return isRecord(prototype) ? prototype : null;
}

function getFlowLayoutStorageKey(prototype) {
  return getPrototypeFlowLayoutStorageKey(prototype.id);
}

function sanitizeFilename(value) {
  return String(value ?? "prototype")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prototype";
}

function getRoutePosition(route, index) {
  const explicitPosition =
    route.flowPosition ?? route.position ?? route.layout?.position;

  if (
    isRecord(explicitPosition) &&
    typeof explicitPosition.x === "number" &&
    typeof explicitPosition.y === "number"
  ) {
    return explicitPosition;
  }

  return {
    x: (index % 3) * 360,
    y: Math.floor(index / 3) * 260,
  };
}

function normalizeRoutes(flow) {
  return Array.isArray(flow?.routes) ? flow.routes.filter(isRecord) : [];
}

function normalizeFlowNodes(flow) {
  return Array.isArray(flow?.nodes)
    ? flow.nodes.filter((node) => isRecord(node) && typeof node.id === "string")
    : [];
}

function readStoredFlowLayoutPositions(storageKey, nodeIds) {
  return readPrototypeFlowLayoutPositions(storageKey, nodeIds);
}

function writeStoredFlowLayout(storageKey, prototype, positions, nodeIds) {
  writePrototypeFlowLayoutPositions(storageKey, prototype.id, positions, nodeIds);
}

function getFlowLayoutPositions(routePositionMap) {
  const positions = {};

  routePositionMap.forEach((position, routeId) => {
    positions[routeId] = {
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
  });

  return positions;
}

function normalizeTransitions(flow) {
  return Array.isArray(flow?.transitions)
    ? flow.transitions.filter(
        (transition) =>
          isRecord(transition) &&
          typeof transition.from === "string" &&
          typeof transition.to === "string",
      )
    : [];
}

function getTransitionText(transition) {
  return transition.label ?? transition.trigger ?? `${transition.from} -> ${transition.to}`;
}

const flowEdgeColorVariants = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
];

function aggregateTransitions(transitions, nodeIds) {
  const edgeMap = new Map();

  for (const transition of transitions) {
    if (!nodeIds.has(transition.from) || !nodeIds.has(transition.to)) {
      continue;
    }

    const key = `${transition.from}->${transition.to}`;
    const edge =
      edgeMap.get(key) ??
      {
        flowLines: [],
        from: transition.from,
        key,
        kinds: [],
        labels: [],
        to: transition.to,
        triggers: [],
      };
    const label = getTransitionText(transition);

    if (!edge.labels.includes(label)) {
      edge.labels.push(label);
    }
    if (transition.trigger && !edge.triggers.includes(transition.trigger)) {
      edge.triggers.push(transition.trigger);
    }
    if (transition.kind && !edge.kinds.includes(transition.kind)) {
      edge.kinds.push(transition.kind);
    }
    if (transition.flowLine && !edge.flowLines.includes(transition.flowLine)) {
      edge.flowLines.push(transition.flowLine);
    }

    edgeMap.set(key, edge);
  }

  return [...edgeMap.values()];
}

function isVisibleFlowEdge(edge) {
  return edge.flowLines.includes("key");
}

function getFlowEdgeColorAnchor(edge, nodeEdgeCounts) {
  if ((nodeEdgeCounts.get(edge.from) ?? 0) > 1) return edge.from;
  if ((nodeEdgeCounts.get(edge.to) ?? 0) > 1) return edge.to;
  return undefined;
}

function addFlowEdgeColorVariants(edges) {
  const nodeEdgeCounts = new Map();

  edges.forEach((edge) => {
    [edge.from, edge.to].forEach((nodeId) => {
      nodeEdgeCounts.set(nodeId, (nodeEdgeCounts.get(nodeId) ?? 0) + 1);
    });
  });

  const nodeEdgeIndexes = new Map();

  return edges.map((edge) => {
    const anchor = getFlowEdgeColorAnchor(edge, nodeEdgeCounts);

    if (!anchor) return edge;

    const index = nodeEdgeIndexes.get(anchor) ?? 0;
    nodeEdgeIndexes.set(anchor, index + 1);

    return {
      ...edge,
      colorVariant: flowEdgeColorVariants[index % flowEdgeColorVariants.length],
    };
  });
}

function createPolylineResult(points, labelPosition) {
  const compactPoints = points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return !previousPoint || point.x !== previousPoint.x || point.y !== previousPoint.y;
  });
  const labelStart = compactPoints[1] ?? compactPoints[0];
  const labelEnd =
    compactPoints[compactPoints.length - 2] ??
    compactPoints[compactPoints.length - 1];

  return {
    labelPosition:
      labelPosition ??
      {
        x: (labelStart.x + labelEnd.x) / 2,
        y: (labelStart.y + labelEnd.y) / 2,
      },
    pointList: compactPoints,
    points: compactPoints.map((point) => `${point.x},${point.y}`).join(" "),
  };
}

function getFlowArrowPoints(points) {
  const compactPoints = points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return !previousPoint || point.x !== previousPoint.x || point.y !== previousPoint.y;
  });
  const tip = compactPoints[compactPoints.length - 1];
  const previous = [...compactPoints]
    .reverse()
    .find((point) => point.x !== tip?.x || point.y !== tip?.y);

  if (!tip || !previous) {
    return "";
  }

  const dx = tip.x - previous.x;
  const dy = tip.y - previous.y;
  const length = Math.hypot(dx, dy);

  if (length <= 0) {
    return "";
  }

  const ux = dx / length;
  const uy = dy / length;
  const baseCenter = {
    x: tip.x - ux * flowArrowLength,
    y: tip.y - uy * flowArrowLength,
  };
  const normal = {
    x: -uy,
    y: ux,
  };
  const left = {
    x: baseCenter.x + normal.x * flowArrowHalfWidth,
    y: baseCenter.y + normal.y * flowArrowHalfWidth,
  };
  const right = {
    x: baseCenter.x - normal.x * flowArrowHalfWidth,
    y: baseCenter.y - normal.y * flowArrowHalfWidth,
  };

  return [tip, left, right]
    .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
    .join(" ");
}

function getFlowMetadataNodeSize(node) {
  if (node.shape === "decision") {
    return {
      height: decisionNodeSize,
      width: decisionNodeSize,
    };
  }

  return {
    height: stateNodeHeight,
    width: stateNodeWidth,
  };
}

function getNodeWidth(node) {
  return node.width ?? nodeWidth;
}

function getNodeHeight(node) {
  return node.height ?? defaultNodeHeight;
}

function getDefaultNodePreviewHeight() {
  return getDefaultPreviewDimension(
    previewHeightCssVariable,
    defaultNodePreviewHeight,
  );
}

function getDefaultNodePreviewWidth() {
  return getDefaultPreviewDimension(
    previewWidthCssVariable,
    defaultNodePreviewWidth,
  );
}

function getDefaultPreviewDimension(cssVariableName, fallbackValue) {
  if (typeof document === "undefined") {
    return fallbackValue;
  }

  const tokenValue = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariableName)
    .trim();
  const parsedValue = Number.parseFloat(tokenValue);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

function getRouteBottom(route) {
  return route.y + getNodeHeight(route);
}

function getRouteCenter(route) {
  return {
    x: route.x + getNodeWidth(route) / 2,
    y: route.y + getNodeHeight(route) / 2,
  };
}

function createGlobalPolyline(source, target) {
  const sourceBottom = {
    x: source.x + getNodeWidth(source) / 2,
    y: getRouteBottom(source),
  };
  const targetBottom = {
    x: target.x + getNodeWidth(target) / 2,
    y: getRouteBottom(target),
  };
  const laneY = Math.max(sourceBottom.y, targetBottom.y) + 44;
  const points = [
    sourceBottom,
    { x: sourceBottom.x, y: laneY },
    { x: targetBottom.x, y: laneY },
    targetBottom,
  ];

  return createPolylineResult(points, {
    x: (sourceBottom.x + targetBottom.x) / 2,
    y: laneY,
  });
}

function createSameColumnBypassPolyline(source, target) {
  const sourceCenter = getRouteCenter(source);
  const targetCenter = getRouteCenter(target);
  const columnOverlap =
    Math.abs(sourceCenter.x - targetCenter.x) <
    Math.min(getNodeWidth(source), getNodeWidth(target)) / 2;
  const upperRoute = source.y < target.y ? source : target;
  const lowerRoute = source.y < target.y ? target : source;
  const verticalGap = lowerRoute.y - getRouteBottom(upperRoute);
  const bypassThreshold = Math.min(getNodeHeight(source), getNodeHeight(target));

  if (!columnOverlap || verticalGap <= bypassThreshold) {
    return null;
  }

  const laneX =
    Math.max(source.x + getNodeWidth(source), target.x + getNodeWidth(target)) + 40;
  const start = { x: source.x + getNodeWidth(source), y: sourceCenter.y };
  const end = { x: target.x + getNodeWidth(target), y: targetCenter.y };
  const points = [
    start,
    { x: laneX, y: start.y },
    { x: laneX, y: end.y },
    end,
  ];

  return createPolylineResult(points, {
    x: laneX,
    y: (start.y + end.y) / 2,
  });
}

function createInterRowPolyline(source, target) {
  const sourceCenter = getRouteCenter(source);
  const targetCenter = getRouteCenter(target);
  const sourceIsUpper = source.y < target.y;
  const upperRoute = sourceIsUpper ? source : target;
  const lowerRoute = sourceIsUpper ? target : source;
  const gapStart = getRouteBottom(upperRoute);
  const gapEnd = lowerRoute.y;
  const laneY = gapStart + (gapEnd - gapStart) / 2;

  if (gapEnd - gapStart < 42) {
    return null;
  }

  const start = sourceIsUpper
    ? { x: sourceCenter.x, y: getRouteBottom(source) }
    : { x: sourceCenter.x, y: source.y };
  const end = sourceIsUpper
    ? { x: targetCenter.x, y: target.y }
    : { x: targetCenter.x, y: getRouteBottom(target) };
  const points = [
    start,
    { x: start.x, y: laneY },
    { x: end.x, y: laneY },
    end,
  ];

  return createPolylineResult(points, {
    x: (start.x + end.x) / 2,
    y: laneY,
  });
}

function getAnchorPair(source, target, hasReverse) {
  const sourceCenter = getRouteCenter(source);
  const targetCenter = getRouteCenter(target);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const isHorizontalFlow = Math.abs(dx) >= Math.abs(dy);
  const offset = hasReverse
    ? isHorizontalFlow
      ? dx >= 0
        ? 18
        : -18
      : dy >= 0
        ? 18
        : -18
    : 0;

  if (isHorizontalFlow) {
    if (dx >= 0) {
      return {
        end: { x: target.x, y: targetCenter.y + offset },
        start: { x: source.x + getNodeWidth(source), y: sourceCenter.y + offset },
      };
    }

    return {
      end: { x: target.x + getNodeWidth(target), y: targetCenter.y + offset },
      start: { x: source.x, y: sourceCenter.y + offset },
    };
  }

  if (dy >= 0) {
    return {
      end: { x: targetCenter.x + offset, y: target.y },
      start: { x: sourceCenter.x + offset, y: getRouteBottom(source) },
    };
  }

  return {
    end: { x: targetCenter.x + offset, y: getRouteBottom(target) },
    start: { x: sourceCenter.x + offset, y: source.y },
  };
}

function createPolyline(edge, routePositionMap, reverseEdgeKeys) {
  const source = routePositionMap.get(edge.from);
  const target = routePositionMap.get(edge.to);

  if (!source || !target) {
    return null;
  }

  const hasReverse = reverseEdgeKeys.has(edge.key);
  const isGlobalTransition = edge.kinds.includes("global");

  if (isGlobalTransition) {
    return createGlobalPolyline(source, target);
  }

  if (!hasReverse) {
    const bypassPolyline = createSameColumnBypassPolyline(source, target);

    if (bypassPolyline) {
      return bypassPolyline;
    }

    const interRowPolyline = createInterRowPolyline(source, target);

    if (interRowPolyline) {
      return interRowPolyline;
    }
  }

  const { start, end } = getAnchorPair(source, target, hasReverse);
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const points = horizontal
    ? [
        start,
        { x: start.x + (end.x - start.x) / 2, y: start.y },
        { x: start.x + (end.x - start.x) / 2, y: end.y },
        end,
      ]
    : [
        start,
        { x: start.x, y: start.y + (end.y - start.y) / 2 },
        { x: end.x, y: start.y + (end.y - start.y) / 2 },
        end,
      ];

  return createPolylineResult(points);
}

function getLabelRect(position, size) {
  return {
    bottom: position.y + size.height / 2,
    left: position.x - size.width / 2,
    right: position.x + size.width / 2,
    top: position.y - size.height / 2,
  };
}

function getIntersectionArea(firstRect, secondRect) {
  const width =
    Math.min(firstRect.right, secondRect.right) -
    Math.max(firstRect.left, secondRect.left);
  const height =
    Math.min(firstRect.bottom, secondRect.bottom) -
    Math.max(firstRect.top, secondRect.top);

  return width > 0 && height > 0 ? width * height : 0;
}

function expandRect(rect, margin) {
  return {
    bottom: rect.bottom + margin,
    left: rect.left - margin,
    right: rect.right + margin,
    top: rect.top - margin,
  };
}

function clampLabelPosition(position, size, canvasMetrics) {
  return {
    x: Math.min(
      canvasMetrics.width - size.width / 2 - edgeLabelPlacementMargin,
      Math.max(size.width / 2 + edgeLabelPlacementMargin, position.x),
    ),
    y: Math.min(
      canvasMetrics.height - size.height / 2 - edgeLabelPlacementMargin,
      Math.max(size.height / 2 + edgeLabelPlacementMargin, position.y),
    ),
  };
}

function getRouteObstacleRects(routePositionMap) {
  return [...routePositionMap.values()].map((route) => ({
    bottom: getRouteBottom(route) + edgeLabelObstacleMargin,
    left: route.x - edgeLabelObstacleMargin,
    right: route.x + getNodeWidth(route) + edgeLabelObstacleMargin,
    top: route.y - edgeLabelObstacleMargin,
  }));
}

function getEdgeLabelPrefix(edge) {
  return edge.kinds.includes("condition") ? "條件" : "點擊";
}

function getLabelCanvasSize(edge, labelScale) {
  const labelText = `${getEdgeLabelPrefix(edge)} ${edge.labels.join(" / ")}`;
  const textUnits = [...labelText].reduce((units, character) => {
    if (/\s/.test(character)) {
      return units + 0.35;
    }

    return units + (/^[\u4e00-\u9fff]$/.test(character) ? 1 : 0.62);
  }, 0);
  const visualWidth = Math.min(
    edgeLabelVisualMaxWidth,
    Math.max(edgeLabelVisualMinWidth, textUnits * 7 + 32),
  );

  return {
    height: edgeLabelVisualHeight * labelScale,
    width: visualWidth * labelScale,
  };
}

function getLabelPositionScore(
  position,
  size,
  origin,
  routeObstacles,
  placedLabelRects,
  canvasMetrics,
) {
  const rect = getLabelRect(position, size);
  const routeOverlap = routeObstacles.reduce(
    (total, obstacle) => total + getIntersectionArea(rect, obstacle),
    0,
  );
  const labelOverlap = placedLabelRects.reduce(
    (total, labelRect) => total + getIntersectionArea(rect, labelRect),
    0,
  );
  const overflow =
    Math.max(0, -rect.left) +
    Math.max(0, -rect.top) +
    Math.max(0, rect.right - canvasMetrics.width) +
    Math.max(0, rect.bottom - canvasMetrics.height);
  const distance = Math.hypot(position.x - origin.x, position.y - origin.y);

  return routeOverlap * 1000 + labelOverlap * 600 + overflow * 200 + distance;
}

function getTotalIntersectionArea(rect, obstacles) {
  return obstacles.reduce(
    (total, obstacle) => total + getIntersectionArea(rect, obstacle),
    0,
  );
}

function resolveLabelCandidate(position, size, obstacles, canvasMetrics) {
  let nextPosition = clampLabelPosition(position, size, canvasMetrics);

  for (let index = 0; index < 8; index += 1) {
    const rect = getLabelRect(nextPosition, size);
    const overlappingObstacle = obstacles
      .map((obstacle) => ({
        area: getIntersectionArea(rect, obstacle),
        obstacle,
      }))
      .filter((item) => item.area > 0)
      .sort((first, second) => second.area - first.area)[0];

    if (!overlappingObstacle) {
      return nextPosition;
    }

    const obstacle = overlappingObstacle.obstacle;
    const pushOptions = [
      {
        x: obstacle.left - rect.right - edgeLabelPlacementMargin,
        y: 0,
      },
      {
        x: obstacle.right - rect.left + edgeLabelPlacementMargin,
        y: 0,
      },
      {
        x: 0,
        y: obstacle.top - rect.bottom - edgeLabelPlacementMargin,
      },
      {
        x: 0,
        y: obstacle.bottom - rect.top + edgeLabelPlacementMargin,
      },
    ]
      .map((push) => {
        const positionAfterPush = clampLabelPosition(
          {
            x: nextPosition.x + push.x,
            y: nextPosition.y + push.y,
          },
          size,
          canvasMetrics,
        );
        const rectAfterPush = getLabelRect(positionAfterPush, size);

        return {
          distance: Math.hypot(positionAfterPush.x - position.x, positionAfterPush.y - position.y),
          overlap: getTotalIntersectionArea(rectAfterPush, obstacles),
          position: positionAfterPush,
        };
      })
      .sort(
        (first, second) =>
          first.overlap - second.overlap || first.distance - second.distance,
      );

    nextPosition = pushOptions[0]?.position ?? nextPosition;
  }

  return nextPosition;
}

function getLabelCandidatePositions(polyline, size) {
  const candidates = [polyline.labelPosition];
  const points = polyline.pointList ?? [];
  const segmentRatios = [0.5, 0.35, 0.65];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength < edgeLabelPlacementMargin * 2) {
      continue;
    }

    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    const primaryOffset =
      (isHorizontal ? size.height : size.width) / 2 + edgeLabelPlacementMargin;
    const offsets = [
      0,
      -primaryOffset,
      primaryOffset,
      -primaryOffset * 2,
      primaryOffset * 2,
    ];

    for (const ratio of segmentRatios) {
      const base = {
        x: start.x + dx * ratio,
        y: start.y + dy * ratio,
      };

      for (const offset of offsets) {
        candidates.push(
          isHorizontal
            ? { x: base.x, y: base.y + offset }
            : { x: base.x + offset, y: base.y },
        );
      }
    }
  }

  const uniqueCandidates = new Map();
  candidates.forEach((candidate) => {
    uniqueCandidates.set(`${Math.round(candidate.x)}:${Math.round(candidate.y)}`, candidate);
  });

  return [...uniqueCandidates.values()];
}

function placeEdgeLabels(edges, routePositionMap, canvasMetrics, labelScale) {
  const routeObstacles = getRouteObstacleRects(routePositionMap);
  const placedLabelRects = [];

  return edges.map((edge) => {
    const labelSize = getLabelCanvasSize(edge, labelScale);
    const origin = edge.polyline.labelPosition;
    const obstacles = [...routeObstacles, ...placedLabelRects];
    const candidates = getLabelCandidatePositions(edge.polyline, labelSize)
      .map((candidate) =>
        resolveLabelCandidate(candidate, labelSize, obstacles, canvasMetrics),
      )
      .map((candidate) => ({
        position: candidate,
        score: getLabelPositionScore(
          candidate,
          labelSize,
          origin,
          routeObstacles,
          placedLabelRects,
          canvasMetrics,
        ),
      }))
      .sort((first, second) => first.score - second.score);
    const bestPosition = candidates[0]?.position ?? origin;

    placedLabelRects.push(
      expandRect(getLabelRect(bestPosition, labelSize), edgeLabelPlacementMargin / 2),
    );

    return {
      ...edge,
      polyline: {
        ...edge.polyline,
        labelPosition: bestPosition,
      },
    };
  });
}

function getCanvasMetrics(routePositionMap) {
  const positions = [...routePositionMap.values()];

  if (positions.length === 0) {
    return {
      height: canvasPadding * 2,
      offsetX: canvasPadding,
      offsetY: canvasPadding,
      width: canvasPadding * 2,
    };
  }

  const minX = Math.min(...positions.map((position) => position.x));
  const minY = Math.min(...positions.map((position) => position.y));
  const maxX = Math.max(
    ...positions.map((position) => position.x + getNodeWidth(position)),
  );
  const maxY = Math.max(...positions.map((position) => getRouteBottom(position)));
  const offsetX = canvasPadding - minX;
  const offsetY = canvasPadding - minY;

  return {
    height: maxY - minY + canvasPadding * 2,
    offsetX,
    offsetY,
    width: maxX - minX + canvasPadding * 2,
  };
}

function createDisplayRoutePositionMap(routePositionMap, canvasMetrics) {
  const map = new Map();

  routePositionMap.forEach((position, routeId) => {
    map.set(routeId, {
      ...position,
      x: position.x + canvasMetrics.offsetX,
      y: position.y + canvasMetrics.offsetY,
    });
  });

  return map;
}

function getOutgoingTransitions(transitions, routeId) {
  return transitions
    .filter((transition) => transition.from === routeId)
    .map(getTransitionText);
}

function MarkdownInline({ value }) {
  const segments = String(value).split(/(`[^`]+`)/g);

  return createElement(
    Fragment,
    null,
    segments.map((segment, index) =>
      segment.startsWith("`") && segment.endsWith("`")
        ? createElement("code", { key: index }, segment.slice(1, -1))
        : segment,
    ),
  );
}

function MarkdownDocument({ value }) {
  const blocks = [];
  const lines = String(value).split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        createElement(
          "pre",
          { className: "prototype-inspector__markdown-code", key: index },
          createElement("code", { "data-language": language }, codeLines.join("\n")),
        ),
      );
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(createElement("h4", { key: index }, line.slice(4)));
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(createElement("h3", { key: index }, line.slice(3)));
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(createElement("h2", { key: index }, line.slice(2)));
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        createElement(
          "ul",
          { key: index },
          items.map((item, itemIndex) =>
            createElement(
              "li",
              { key: itemIndex },
              createElement(MarkdownInline, { value: item }),
            ),
          ),
        ),
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s/, ""));
        index += 1;
      }
      blocks.push(
        createElement(
          "ol",
          { key: index },
          items.map((item, itemIndex) =>
            createElement(
              "li",
              { key: itemIndex },
              createElement(MarkdownInline, { value: item }),
            ),
          ),
        ),
      );
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[index]) &&
      !lines[index].startsWith("```")
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(
      createElement(
        "p",
        { key: index },
        createElement(MarkdownInline, { value: paragraphLines.join(" ") }),
      ),
    );
  }

  return createElement("article", { className: "prototype-inspector__markdown" }, blocks);
}

function PrototypeDocs({ prototype }) {
  const availableDocs = docDefinitions.filter((doc) => {
    const value = prototype.docs?.[doc.docKey];
    return typeof value === "string" && value.trim().length > 0;
  });
  const [selectedDocId, setSelectedDocId] = useState(availableDocs[0]?.id ?? "");
  const normalizedDocId = availableDocs.some((doc) => doc.id === selectedDocId)
    ? selectedDocId
    : availableDocs[0]?.id ?? "";
  const selectedDoc = availableDocs.find((doc) => doc.id === normalizedDocId);
  const content = selectedDoc ? prototype.docs?.[selectedDoc.docKey] : undefined;

  if (!content) {
    return createElement(PrototypeEmpty, {
      message: "No prototype documents found.",
    });
  }

  return createElement(
    "div",
    { className: "prototype-inspector prototype-inspector--docs" },
    createElement(PrototypeHeader, {
      eyebrow: prototype.id,
      title: prototype.title,
    }),
    createElement(
      "div",
      { className: "prototype-inspector__tabs", role: "tablist" },
      availableDocs.map((doc) =>
        createElement(
          "button",
          {
            "aria-selected": normalizedDocId === doc.id,
            className: "prototype-inspector__tab",
            key: doc.id,
            onClick: () => setSelectedDocId(doc.id),
            role: "tab",
            type: "button",
          },
          doc.label,
        ),
      ),
    ),
    createElement(
      "div",
      { className: "prototype-inspector__body" },
      createElement(MarkdownDocument, { value: content }),
    ),
  );
}

function PrototypeHeader({ eyebrow, title, description }) {
  return createElement(
    "header",
    { className: "prototype-inspector__header" },
    eyebrow
      ? createElement("p", { className: "prototype-inspector__eyebrow" }, eyebrow)
      : null,
    createElement("h2", null, title),
    description
      ? createElement("p", { className: "prototype-inspector__lead" }, description)
      : null,
  );
}

function getRoutePreviewSource(routeId) {
  if (typeof window === "undefined") {
    return "";
  }

  const storyId = new URLSearchParams(window.location.search).get("id");
  if (!storyId) {
    return "";
  }

  const params = new URLSearchParams({
    globals: `${defaultPrototypeModeGlobalName}:story`,
    id: storyId,
    prototypeFlowPreview: "true",
    prototypeRoute: routeId,
    viewMode: "story",
  });

  return `${window.location.pathname}?${params.toString()}`;
}

function normalizeStorybookGlobals(value) {
  const globals = new Map();

  String(value ?? "")
    .split(";")
    .forEach((entry) => {
      const [key, ...valueParts] = entry.split(":");
      const trimmedKey = key?.trim();
      const trimmedValue = valueParts.join(":").trim();

      if (trimmedKey && trimmedValue) {
        globals.set(trimmedKey, trimmedValue);
      }
    });

  return globals;
}

function createStorybookGlobals(overrides) {
  const params = new URLSearchParams(window.location.search);
  const globals = normalizeStorybookGlobals(params.get("globals"));

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      globals.delete(key);
      return;
    }

    globals.set(key, String(value));
  });

  return [...globals.entries()].map(([key, value]) => `${key}:${value}`).join(";");
}

function getPrototypeFlowExportStoryId(prototype) {
  const figmaExport = isRecord(prototype.figmaExport)
    ? prototype.figmaExport
    : {};
  const flowExport = isRecord(prototype.flow?.figmaExport)
    ? prototype.flow.figmaExport
    : {};
  const storyId =
    figmaExport.flowStoryId ??
    figmaExport.storyId ??
    flowExport.storyId ??
    prototype.flow?.figmaExportStoryId;

  return typeof storyId === "string" && storyId.trim() ? storyId.trim() : "";
}

function getPrototypeFlowExportStoryUrl(prototype) {
  if (typeof window === "undefined") {
    return "";
  }

  const storyId = getPrototypeFlowExportStoryId(prototype);
  if (!storyId) {
    return "";
  }

  const url = new URL(window.location.href);

  if (url.pathname.endsWith("/iframe.html")) {
    url.pathname = url.pathname.replace(/\/iframe\.html$/, "/");
  }

  url.hash = "";
  url.search = "";
  url.searchParams.set("path", `/story/${storyId}`);
  url.searchParams.set(
    "globals",
    createStorybookGlobals({
      figmaExport: "on",
      [defaultPrototypeModeGlobalName]: "story",
    }),
  );

  return url.toString();
}

function openPrototypeFlowExportStory(prototype) {
  const url = getPrototypeFlowExportStoryUrl(prototype);
  if (!url) {
    return;
  }

  const openedWindow = window.open(url, "_blank");

  if (openedWindow) {
    openedWindow.opener = null;
    return;
  }

  const targetWindow = window.top && window.top !== window ? window.top : window;
  targetWindow.location.assign(url);
}

function getMeasuredFramePreviewSize(iframe) {
  const doc = iframe.contentDocument;

  if (!doc?.body) {
    return null;
  }

  const routePreview = doc.querySelector(routePreviewMeasurementSelector);

  if (routePreview) {
    const rect = routePreview.getBoundingClientRect();

    return {
      height: Math.ceil(Math.max(rect.height, routePreview.scrollHeight)),
      width: Math.ceil(Math.max(rect.width, routePreview.scrollWidth)),
    };
  }

  if (
    doc.body.classList.contains("sb-show-preparing-story") ||
    doc.body.classList.contains("sb-show-preparing-docs")
  ) {
    return null;
  }

  const storyRoot = doc.querySelector("#storybook-root");
  const content = storyRoot?.firstElementChild ?? storyRoot ?? doc.body;
  const rect = content.getBoundingClientRect();

  return {
    height: Math.ceil(
      Math.max(
        rect.height,
        content.scrollHeight,
        doc.body.scrollHeight,
        doc.documentElement.scrollHeight,
      ),
    ),
    width: Math.ceil(
      Math.max(
        rect.width,
        content.scrollWidth,
        doc.body.scrollWidth,
        doc.documentElement.scrollWidth,
      ),
    ),
  };
}

function PrototypeFlowNode({
  isDragging,
  node,
  onPointerCancel,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
}) {
  const isDecision = node.shape === "decision";

  return createElement(
    "article",
    {
      "aria-label": node.title ?? node.id,
      className: "prototype-inspector__flow-node",
      "data-dragging": isDragging ? "true" : undefined,
      "data-shape": node.shape ?? "state",
      "data-tone": node.tone ?? "default",
      onPointerCancel,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
      style: {
        "--prototype-flow-node-height": `${node.height}px`,
        "--prototype-flow-node-width": `${node.width}px`,
        "--prototype-flow-node-x": `${node.position.x}px`,
        "--prototype-flow-node-y": `${node.position.y}px`,
      },
    },
    createElement(
      "div",
      { className: "prototype-inspector__flow-node-surface" },
      createElement(
        "div",
        { className: "prototype-inspector__flow-node-copy" },
        createElement(
          "span",
          { className: "prototype-inspector__flow-node-eyebrow" },
          isDecision ? "IF / ELSE" : (node.flowGroup ?? "state"),
        ),
        createElement("strong", null, node.title ?? node.id),
        node.description
          ? createElement("p", null, node.description)
          : null,
      ),
    ),
  );
}

function PrototypeRouteCard({
  height,
  isDragging,
  onPreviewSizeChange,
  onPointerCancel,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  previewHeight,
  previewWidth,
  route,
  width,
}) {
  const previewSource = getRoutePreviewSource(route.id);
  const iframeRef = useRef(null);
  const measurePreviewSize = (iframe) => {
    const measuredSize = getMeasuredFramePreviewSize(iframe);

    if (measuredSize?.height && measuredSize?.width) {
      onPreviewSizeChange(route.id, measuredSize);
      return true;
    }

    return false;
  };

  useEffect(() => {
    let isActive = true;
    let retryCount = 80;
    let retryTimer = null;

    const updateMeasuredSize = () => {
      if (!isActive) {
        return;
      }

      const iframe = iframeRef.current;

      if (iframe && measurePreviewSize(iframe)) {
        return;
      }

      if (retryCount > 0) {
        retryCount -= 1;
        retryTimer = window.setTimeout(updateMeasuredSize, 250);
      }
    };

    updateMeasuredSize();

    return () => {
      isActive = false;

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [onPreviewSizeChange, previewSource, route.id]);

  const handlePreviewLoad = (event) => {
    measurePreviewSize(event.currentTarget);
  };

  return createElement(
    "article",
    {
      "aria-label": route.title ?? route.id,
      className: "prototype-inspector__flow-card",
      "data-dragging": isDragging ? "true" : undefined,
      onPointerCancel,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
      style: {
        "--prototype-flow-card-x": `${route.position.x}px`,
        "--prototype-flow-card-y": `${route.position.y}px`,
        "--prototype-flow-card-width": `${width}px`,
        "--prototype-flow-card-height": `${height}px`,
        "--prototype-flow-preview-height": `${previewHeight}px`,
        "--prototype-flow-preview-width": `${previewWidth}px`,
      },
    },
    createElement(
      "header",
      { className: "prototype-inspector__flow-card-header" },
      createElement(
        "div",
        { className: "prototype-inspector__flow-card-title" },
        createElement("span", null, route.flowGroup ?? route.navigationId ?? "route"),
        createElement("h3", null, route.title ?? route.id),
      ),
      createElement("code", null, route.id),
    ),
    createElement(
      "div",
      { className: "prototype-inspector__flow-preview" },
      previewSource
        ? createElement("iframe", {
            loading: "eager",
            onLoad: handlePreviewLoad,
            ref: iframeRef,
            src: previewSource,
            title: `${route.title ?? route.id} preview`,
          })
        : createElement(PrototypeEmpty, {
            message: "Route preview is unavailable.",
          }),
    ),
  );
}

function PrototypeFlow({ prototype }) {
  const flow = prototype.flow;
  const routes = useMemo(() => normalizeRoutes(flow), [flow]);
  const flowNodes = useMemo(() => normalizeFlowNodes(flow), [flow]);
  const transitions = useMemo(() => normalizeTransitions(flow), [flow]);
  const canvasNodeIds = useMemo(
    () => new Set([...routes.map((route) => route.id), ...flowNodes.map((node) => node.id)]),
    [flowNodes, routes],
  );
  const layoutStorageKey = useMemo(
    () => getFlowLayoutStorageKey(prototype),
    [prototype.id],
  );
  const flowWrapRef = useRef(null);
  const importInputRef = useRef(null);
  const isPanModifierActiveRef = useRef(false);
  const resetConfirmButtonRef = useRef(null);
  const [draggedPositions, setDraggedPositions] = useState(() =>
    readStoredFlowLayoutPositions(layoutStorageKey, canvasNodeIds),
  );
  const [dragState, setDragState] = useState(null);
  const [focusedRouteId, setFocusedRouteId] = useState(null);
  const [fitScale, setFitScale] = useState(0.36);
  const [isPanModifierActive, setIsPanModifierActive] = useState(false);
  const [manualScale, setManualScale] = useState(1);
  const [panState, setPanState] = useState(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [routePreviewSizes, setRoutePreviewSizes] = useState({});
  const [zoomMode, setZoomMode] = useState("fit");
  const defaultPreviewHeight = getDefaultNodePreviewHeight();
  const defaultPreviewWidth = getDefaultNodePreviewWidth();
  const setPanModifierActive = useCallback((isActive) => {
    isPanModifierActiveRef.current = isActive;
    setIsPanModifierActive(isActive);
  }, []);
  const hasCustomLayout = Object.keys(draggedPositions).length > 0;
  const flowExportStoryId = getPrototypeFlowExportStoryId(prototype);
  useEffect(() => {
    setDraggedPositions(readStoredFlowLayoutPositions(layoutStorageKey, canvasNodeIds));
  }, [canvasNodeIds, layoutStorageKey]);
  useEffect(() => {
    writeStoredFlowLayout(layoutStorageKey, prototype, draggedPositions, canvasNodeIds);
  }, [canvasNodeIds, draggedPositions, layoutStorageKey, prototype]);
  useEffect(() => {
    if (!hasCustomLayout) {
      setIsResetDialogOpen(false);
    }
  }, [hasCustomLayout]);
  useEffect(() => {
    if (!isResetDialogOpen) {
      return undefined;
    }

    const focusTimer = window.setTimeout(() => {
      resetConfirmButtonRef.current?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsResetDialogOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isResetDialogOpen]);
  const routePositionMap = useMemo(() => {
    const map = new Map();

    routes.forEach((route, index) => {
      const position = draggedPositions[route.id] ?? getRoutePosition(route, index);
      const previewSize = routePreviewSizes[route.id] ?? {};
      const previewHeight = previewSize.height ?? defaultPreviewHeight;
      const previewWidth = previewSize.width ?? defaultPreviewWidth;

      map.set(route.id, {
        ...position,
        height: previewHeight + nodeHeaderHeight + nodeFrameSize,
        nodeType: "route",
        previewHeight,
        previewWidth,
        width: previewWidth + nodeFrameSize,
      });
    });

    flowNodes.forEach((node, index) => {
      const size = getFlowMetadataNodeSize(node);
      const position =
        draggedPositions[node.id] ?? getRoutePosition(node, routes.length + index);

      map.set(node.id, {
        ...position,
        ...size,
        description: node.description,
        flowGroup: node.flowGroup,
        nodeType: "flow",
        shape: node.shape,
        title: node.title,
        tone: node.tone,
      });
    });

    return map;
  }, [
    defaultPreviewHeight,
    defaultPreviewWidth,
    draggedPositions,
    flowNodes,
    routePreviewSizes,
    routes,
  ]);
  const aggregatedEdges = useMemo(
    () =>
      addFlowEdgeColorVariants(
        aggregateTransitions(transitions, canvasNodeIds).filter(isVisibleFlowEdge),
      ),
    [canvasNodeIds, transitions],
  );
  const reverseEdgeKeys = useMemo(() => {
    const edgeKeys = new Set(aggregatedEdges.map((edge) => edge.key));
    return new Set(
      aggregatedEdges
        .filter((edge) => edgeKeys.has(`${edge.to}->${edge.from}`))
        .map((edge) => edge.key),
    );
  }, [aggregatedEdges]);
  const canvasMetrics = useMemo(
    () => getCanvasMetrics(routePositionMap),
    [routePositionMap],
  );
  const displayRoutePositionMap = useMemo(
    () => createDisplayRoutePositionMap(routePositionMap, canvasMetrics),
    [canvasMetrics, routePositionMap],
  );
  const canvasScale = zoomMode === "fit" ? fitScale : manualScale;
  useEffect(() => {
    const flowWrap = flowWrapRef.current;
    if (!flowWrap) {
      return undefined;
    }

    const updateFitScale = () => {
      const availableWidth = Math.max(1, flowWrap.clientWidth - canvasPadding);
      const availableHeight = Math.max(1, flowWrap.clientHeight - canvasPadding);
      const nextFitScale = clampZoomScale(
        Math.min(
          availableWidth / canvasMetrics.width,
          availableHeight / canvasMetrics.height,
          1,
        ),
      );

      setFitScale(nextFitScale);
    };
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateFitScale);

    updateFitScale();
    resizeObserver?.observe(flowWrap);
    window.addEventListener("resize", updateFitScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateFitScale);
    };
  }, [canvasMetrics.height, canvasMetrics.width]);
  const scaledCanvasMetrics = {
    height: Math.ceil(canvasMetrics.height * canvasScale),
    width: Math.ceil(canvasMetrics.width * canvasScale),
  };
  const renderedEdges = useMemo(
    () =>
      aggregatedEdges
        .map((edge) => ({
          ...edge,
          polyline: createPolyline(edge, displayRoutePositionMap, reverseEdgeKeys),
        }))
        .filter((edge) => edge.polyline),
    [aggregatedEdges, displayRoutePositionMap, reverseEdgeKeys],
  );
  const edgeLabelScale = getEdgeLabelScale(canvasScale);
  const labeledEdges = useMemo(
    () =>
      placeEdgeLabels(
        renderedEdges,
        displayRoutePositionMap,
        canvasMetrics,
        edgeLabelScale,
      ),
    [canvasMetrics, displayRoutePositionMap, edgeLabelScale, renderedEdges],
  );
  const getEdgeFocusState = (edge) => {
    if (!focusedRouteId) {
      return undefined;
    }

    return edge.from === focusedRouteId || edge.to === focusedRouteId
      ? "active"
      : "muted";
  };
  const handlePreviewSizeChange = useCallback((routeId, previewSize) => {
    setRoutePreviewSizes((sizes) => {
      const currentSize = sizes[routeId];

      if (
        currentSize &&
        Math.abs(currentSize.height - previewSize.height) < 2 &&
        Math.abs(currentSize.width - previewSize.width) < 2
      ) {
        return sizes;
      }

      return {
        ...sizes,
        [routeId]: previewSize,
      };
    });
  }, []);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }

      if (event.code === "Space" || event.key === "Meta") {
        event.preventDefault();
        setPanModifierActive(true);
      }
    };
    const handleKeyUp = (event) => {
      if (event.code === "Space" || event.key === "Meta") {
        event.preventDefault();
        setPanModifierActive(false);
      }
    };
    const handleWindowBlur = () => {
      setPanModifierActive(false);
      setPanState(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [setPanModifierActive]);
  const beginPan = (event) => {
    if (
      event.button !== 0 ||
      isEditableEventTarget(event.target) ||
      !(isPanModifierActiveRef.current || event.metaKey)
    ) {
      return;
    }

    const flowWrap = flowWrapRef.current;
    if (!flowWrap) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    setPanState({
      originScrollLeft: flowWrap.scrollLeft,
      originScrollTop: flowWrap.scrollTop,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    });
  };
  const updatePan = (event) => {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    const flowWrap = flowWrapRef.current;
    if (!flowWrap) {
      return;
    }

    event.preventDefault();
    flowWrap.scrollLeft = panState.originScrollLeft - (event.clientX - panState.startX);
    flowWrap.scrollTop = panState.originScrollTop - (event.clientY - panState.startY);
  };
  const endPan = (event) => {
    if (!panState || panState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setPanState(null);
  };
  const beginDrag = (routeId, event) => {
    if (event.button !== 0 || isPanModifierActiveRef.current || event.metaKey) {
      return;
    }

    const position = routePositionMap.get(routeId);
    if (!position) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    setFocusedRouteId(routeId);
    if (zoomMode === "fit") {
      setManualScale(fitScale);
      setZoomMode("manual");
    }
    setDragState({
      originX: position.x,
      originY: position.y,
      pointerId: event.pointerId,
      routeId,
      startX: event.clientX,
      startY: event.clientY,
    });
  };
  const updateDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextX =
      dragState.originX + (event.clientX - dragState.startX) / canvasScale;
    const nextY =
      dragState.originY + (event.clientY - dragState.startY) / canvasScale;

    setDraggedPositions((positions) => ({
      ...positions,
      [dragState.routeId]: {
        x: Math.round(nextX),
        y: Math.round(nextY),
      },
    }));
  };
  const endDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragState(null);
  };
  const zoomBy = (scaleDelta, anchor) => {
    const flowWrap = flowWrapRef.current;
    const baseScale = zoomMode === "fit" ? fitScale : manualScale;
    const nextScale = clampZoomScale(baseScale + scaleDelta);

    if (flowWrap && anchor && nextScale !== baseScale) {
      const flowWrapRect = flowWrap.getBoundingClientRect();
      const anchorOffsetX = anchor.clientX - flowWrapRect.left;
      const anchorOffsetY = anchor.clientY - flowWrapRect.top;
      const canvasX = (flowWrap.scrollLeft + anchorOffsetX) / baseScale;
      const canvasY = (flowWrap.scrollTop + anchorOffsetY) / baseScale;

      window.requestAnimationFrame(() => {
        flowWrap.scrollLeft = canvasX * nextScale - anchorOffsetX;
        flowWrap.scrollTop = canvasY * nextScale - anchorOffsetY;
      });
    }

    setManualScale(nextScale);
    setZoomMode("manual");
  };
  const zoomIn = () => {
    zoomBy(zoomStep);
  };
  const zoomOut = () => {
    zoomBy(-zoomStep);
  };
  const fitCanvas = () => {
    setZoomMode("fit");
  };
  const zoomWithWheel = (event) => {
    if (!event.altKey || isEditableEventTarget(event.target)) {
      return;
    }

    event.preventDefault();
    zoomBy(event.deltaY < 0 ? zoomStep : -zoomStep, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };
  const openResetDialog = () => {
    if (hasCustomLayout) {
      setIsResetDialogOpen(true);
    }
  };
  const closeResetDialog = () => {
    setIsResetDialogOpen(false);
  };
  const confirmResetLayout = () => {
    setDraggedPositions({});
    setFocusedRouteId(null);
    setIsResetDialogOpen(false);
  };
  const exportLayout = () => {
    const payload = createPrototypeFlowLayoutPayload(
      prototype.id,
      getFlowLayoutPositions(routePositionMap),
    );
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json",
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.download = `${sanitizeFilename(prototype.id)}-ui-flow-layout.json`;
    downloadLink.href = downloadUrl;
    downloadLink.style.display = "none";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };
  const openImportPicker = () => {
    importInputRef.current?.click();
  };
  const importLayout = (event) => {
    const file = event.currentTarget.files?.[0];

    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      try {
        const importedLayout = JSON.parse(String(reader.result ?? ""));
        const importedPositions = normalizePrototypeFlowLayoutPositions(
          importedLayout,
          canvasNodeIds,
        );

        if (Object.keys(importedPositions).length === 0) {
          window.alert("No matching UI Flow positions were found in this file.");
          return;
        }

        setDraggedPositions(importedPositions);
        setFocusedRouteId(null);
      } catch (error) {
        console.warn("Unable to import prototype flow layout.", error);
        window.alert("Unable to import this UI Flow layout file.");
      }
    });
    reader.readAsText(file);
  };

  if (!flow || routes.length === 0) {
    return createElement(PrototypeEmpty, {
      message: "No UI flow found for this prototype.",
    });
  }

  return createElement(
    "div",
    { className: "prototype-inspector prototype-inspector--flow" },
    createElement(
      "div",
      {
        className: "prototype-inspector__flow-wrap",
        "data-pan-modifier": isPanModifierActive || panState ? "true" : undefined,
        "data-panning": panState ? "true" : undefined,
        onPointerCancel: endPan,
        onPointerDown: beginPan,
        onPointerMove: updatePan,
        onPointerUp: endPan,
        onWheel: zoomWithWheel,
        ref: flowWrapRef,
      },
      createElement(
        "div",
        {
          className:
            "prototype-inspector__flow-controls prototype-inspector__flow-controls--zoom",
          role: "group",
          "aria-label": "UI Flow zoom controls",
        },
        createElement(
          "button",
          {
            "aria-label": "Zoom in",
            onClick: zoomIn,
            title: "Zoom in",
            type: "button",
          },
          "+",
        ),
        createElement(
          "span",
          { className: "prototype-inspector__flow-scale" },
          `${Math.round(canvasScale * 100)}%`,
        ),
        createElement(
          "button",
          {
            "aria-label": "Zoom out",
            onClick: zoomOut,
            title: "Zoom out",
            type: "button",
          },
          "-",
        ),
        createElement(
          "button",
          {
            "aria-label": "Fit canvas",
            "aria-pressed": zoomMode === "fit",
            onClick: fitCanvas,
            title: "Fit canvas",
            type: "button",
          },
          "Fit",
        ),
      ),
      createElement(
        "div",
        {
          className:
            "prototype-inspector__flow-controls prototype-inspector__flow-controls--layout",
          role: "group",
          "aria-label": "UI Flow layout controls",
        },
        createElement("input", {
          accept: "application/json,.json",
          className: "prototype-inspector__flow-import-input",
          onChange: importLayout,
          ref: importInputRef,
          type: "file",
        }),
        createElement(
          "button",
          {
            "aria-label": "Reset UI Flow layout",
            disabled: !hasCustomLayout,
            onClick: openResetDialog,
            title: "Reset layout",
            type: "button",
          },
          "Reset Layout",
        ),
        createElement(
          "button",
          {
            "aria-label": "Import UI Flow layout",
            onClick: openImportPicker,
            title: "Import layout JSON",
            type: "button",
          },
          "Import Layout",
        ),
        createElement(
          "button",
          {
            "aria-label": "Export UI Flow layout",
            onClick: exportLayout,
            title: "Export layout JSON",
            type: "button",
          },
          "Export Layout",
        ),
        flowExportStoryId
          ? createElement(
              "button",
              {
                "aria-label": "Open Static Flow story for Figma export",
                className: "prototype-inspector__flow-export-button",
                onClick: () => openPrototypeFlowExportStory(prototype),
                title: "Open sibling Static Flow story for Figma export",
                type: "button",
              },
              "Open Static Flow",
            )
          : null,
      ),
      isResetDialogOpen
        ? createElement(
            "div",
            {
              className: "prototype-inspector__flow-reset-dialog-backdrop",
              onPointerDown: (event) => {
                if (event.target === event.currentTarget) {
                  closeResetDialog();
                }
              },
            },
            createElement(
              "section",
              {
                "aria-describedby": "prototype-flow-reset-description",
                "aria-labelledby": "prototype-flow-reset-title",
                "aria-modal": "true",
                className: "prototype-inspector__flow-reset-dialog",
                onPointerDown: (event) => event.stopPropagation(),
                role: "dialog",
              },
              createElement(
                "div",
                { className: "prototype-inspector__flow-reset-dialog-copy" },
                createElement(
                  "h2",
                  { id: "prototype-flow-reset-title" },
                  "Reset UI Flow layout?",
                ),
                createElement(
                  "p",
                  { id: "prototype-flow-reset-description" },
                  "This will clear the saved canvas positions and restore the default flow layout.",
                ),
              ),
              createElement(
                "div",
                { className: "prototype-inspector__flow-reset-dialog-actions" },
                createElement(
                  "button",
                  {
                    className:
                      "prototype-inspector__flow-reset-dialog-confirm",
                    onClick: confirmResetLayout,
                    ref: resetConfirmButtonRef,
                    type: "button",
                  },
                  "Reset",
                ),
                createElement(
                  "button",
                  {
                    className:
                      "prototype-inspector__flow-reset-dialog-cancel",
                    onClick: closeResetDialog,
                    type: "button",
                  },
                  "Cancel",
                ),
              ),
            ),
          )
        : null,
      createElement(
        "div",
        {
          className: "prototype-inspector__flow-scaled",
          style: {
            "--prototype-flow-scaled-height": `${scaledCanvasMetrics.height}px`,
            "--prototype-flow-scaled-width": `${scaledCanvasMetrics.width}px`,
          },
        },
        createElement(
          "div",
          {
            className: "prototype-inspector__flow-canvas",
            style: {
              "--prototype-flow-canvas-height": `${canvasMetrics.height}px`,
              "--prototype-flow-canvas-scale": canvasScale,
              "--prototype-flow-canvas-width": `${canvasMetrics.width}px`,
              "--prototype-flow-label-scale": edgeLabelScale,
            },
          },
          createElement(
            "svg",
            {
              "aria-hidden": "true",
              className: "prototype-inspector__flow-lines",
              height: canvasMetrics.height,
              viewBox: `0 0 ${canvasMetrics.width} ${canvasMetrics.height}`,
              width: canvasMetrics.width,
            },
            renderedEdges.map((edge) =>
              createElement(
                "g",
                {
                  key: edge.key,
                },
                createElement("title", null, edge.labels.join(" / ")),
                createElement("polyline", {
                  className: "prototype-inspector__flow-line",
                  "data-flow-color": edge.colorVariant,
                  "data-flow-focus": getEdgeFocusState(edge),
                  points: edge.polyline.points,
                }),
                getFlowArrowPoints(edge.polyline.pointList)
                  ? createElement("polygon", {
                      className: "prototype-inspector__flow-arrow",
                      "data-flow-color": edge.colorVariant,
                      "data-flow-focus": getEdgeFocusState(edge),
                      points: getFlowArrowPoints(edge.polyline.pointList),
                    })
                  : null,
              ),
            ),
          ),
          labeledEdges.map((edge) =>
            createElement(
              "div",
              {
                className: "prototype-inspector__flow-edge-label",
                "data-figma-layout-sizing-horizontal": "hug",
                "data-figma-layout-sizing-vertical": "hug",
                "data-figma-layout-strategy": "auto-layout",
                "data-flow-color": edge.colorVariant,
                "data-flow-focus": getEdgeFocusState(edge),
                key: `${edge.key}-label`,
                style: {
                  "--prototype-flow-label-x": `${edge.polyline.labelPosition.x}px`,
                  "--prototype-flow-label-y": `${edge.polyline.labelPosition.y}px`,
                },
                title: edge.triggers.join(" / "),
              },
              createElement(
                "span",
                { "data-figma-text-auto-width": "true" },
                getEdgeLabelPrefix(edge),
              ),
              createElement(
                "strong",
                { "data-figma-text-auto-width": "true" },
                edge.labels.join(" / "),
              ),
            ),
          ),
          flowNodes.map((node, index) => {
            const position =
              displayRoutePositionMap.get(node.id) ??
              getRoutePosition(node, routes.length + index);
            const size = getFlowMetadataNodeSize(node);

            return createElement(PrototypeFlowNode, {
              isDragging: dragState?.routeId === node.id,
              key: node.id,
              node: {
                ...node,
                height: position.height ?? size.height,
                position,
                width: position.width ?? size.width,
              },
              onPointerCancel: endDrag,
              onPointerDown: (event) => beginDrag(node.id, event),
              onPointerEnter: () => setFocusedRouteId(node.id),
              onPointerLeave: () => setFocusedRouteId(null),
              onPointerMove: updateDrag,
              onPointerUp: endDrag,
            });
          }),
          routes.map((route, index) => {
            const position =
              displayRoutePositionMap.get(route.id) ?? getRoutePosition(route, index);
            const height = position.height ?? defaultNodeHeight;
            const previewHeight = position.previewHeight ?? defaultPreviewHeight;
            const previewWidth = position.previewWidth ?? defaultPreviewWidth;
            const width = position.width ?? defaultPreviewWidth + nodeFrameSize;

            return createElement(PrototypeRouteCard, {
              key: route.id,
              height,
              isDragging: dragState?.routeId === route.id,
              onPreviewSizeChange: handlePreviewSizeChange,
              onPointerCancel: endDrag,
              onPointerDown: (event) => beginDrag(route.id, event),
              onPointerEnter: () => setFocusedRouteId(route.id),
              onPointerLeave: () => setFocusedRouteId(null),
              onPointerMove: updateDrag,
              onPointerUp: endDrag,
              previewHeight,
              previewWidth,
              route: {
                ...route,
                position,
              },
              width,
            });
          }),
        ),
      ),
    ),
  );
}

function normalizeDataItems(value) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function formatDataValue(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatDataValue).join(", ") : "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      ([, entryValue]) => entryValue !== undefined && entryValue !== null,
    );

    return entries.length > 0
      ? entries
          .map(([key, entryValue]) => `${key}: ${formatDataValue(entryValue)}`)
          .join(" / ")
      : "-";
  }

  return String(value);
}

function PrototypeDataSection({ children, description, title }) {
  return createElement(
    "section",
    { className: "prototype-inspector__data-section" },
    createElement(
      "header",
      { className: "prototype-inspector__data-section-header" },
      createElement("h3", null, title),
      description
        ? createElement("p", null, description)
        : null,
    ),
    children,
  );
}

function PrototypeDataKeyValues({ value }) {
  if (!isRecord(value)) {
    return null;
  }

  return createElement(
    "dl",
    { className: "prototype-inspector__data-summary" },
    Object.entries(value).map(([key, entryValue]) =>
      createElement(
        "div",
        { className: "prototype-inspector__data-summary-item", key },
        createElement("dt", null, key),
        createElement("dd", null, formatDataValue(entryValue)),
      ),
    ),
  );
}

function PrototypeDataTags({ value }) {
  const values = Array.isArray(value)
    ? value.filter((item) => item !== undefined && item !== null && item !== "")
    : value
      ? [value]
      : [];

  if (values.length === 0) {
    return "-";
  }

  return createElement(
    "ul",
    { className: "prototype-inspector__data-tags" },
    values.map((item) =>
      createElement("li", { key: formatDataValue(item) }, formatDataValue(item)),
    ),
  );
}

function PrototypeDataCode({ value }) {
  return createElement("code", null, formatDataValue(value));
}

function PrototypeDataTable({ columns, emptyMessage = "No data found.", rows }) {
  if (!rows || rows.length === 0) {
    return createElement(PrototypeEmpty, { message: emptyMessage });
  }

  return createElement(
    "div",
    {
      className:
        "prototype-inspector__table-wrap prototype-inspector__data-table-wrap",
    },
    createElement(
      "table",
      { className: "prototype-inspector__table" },
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          columns.map((column) =>
            createElement("th", { key: column.key }, column.label),
          ),
        ),
      ),
      createElement(
        "tbody",
        null,
        rows.map((row, rowIndex) =>
          createElement(
            "tr",
            { key: row.id ?? row.name ?? row.route ?? row.endpoint ?? rowIndex },
            columns.map((column) =>
              createElement(
                "td",
                { key: column.key },
                column.render
                  ? column.render(row)
                  : formatDataValue(row[column.key]),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function PrototypeDataSchemas({ schemas }) {
  if (schemas.length === 0) {
    return null;
  }

  return createElement(
    PrototypeDataSection,
    {
      description:
        "Field-level contract for props, fixtures, and future API responses.",
      title: "Data Schemas",
    },
    createElement(
      "div",
      { className: "prototype-inspector__data-schema-list" },
      schemas.map((schema) =>
        createElement(
          "article",
          { className: "prototype-inspector__data-schema", key: schema.name },
          createElement(
            "header",
            { className: "prototype-inspector__data-schema-header" },
            createElement("h4", null, schema.name),
            schema.description
              ? createElement("p", null, schema.description)
              : null,
          ),
          createElement(PrototypeDataTable, {
            columns: [
              {
                key: "name",
                label: "Field",
                render: (field) =>
                  createElement(PrototypeDataCode, { value: field.name }),
              },
              {
                key: "type",
                label: "Type",
                render: (field) =>
                  createElement(PrototypeDataCode, { value: field.type }),
              },
              { key: "required", label: "Required" },
              { key: "source", label: "Source" },
              { key: "description", label: "Description" },
            ],
            emptyMessage: "No fields found.",
            rows: normalizeDataItems(schema.fields),
          }),
        ),
      ),
    ),
  );
}

function PrototypeData({ prototype }) {
  const routes = normalizeRoutes(prototype.flow);
  const data = isRecord(prototype.data) ? prototype.data : {};
  const apiContracts = normalizeDataItems(
    data.apiContracts ?? data.apis ?? data.api,
  );
  const dataSources = normalizeDataItems(
    data.dataSources ?? data.sources ?? data.source,
  );
  const schemas = normalizeDataItems(data.schemas ?? data.schema);
  const routeDataRequirements = normalizeDataItems(
    data.routeDataRequirements ?? data.routeRequirements,
  );
  const stateRules = normalizeDataItems(data.stateRules ?? data.states);

  return createElement(
    "div",
    { className: "prototype-inspector prototype-inspector--data" },
    createElement(PrototypeHeader, {
      eyebrow: prototype.id,
      title: "Prototype Data",
      description:
        "API contracts, source ownership, UI data mapping, state rules, and fixture payloads.",
    }),
    createElement(
      "div",
      { className: "prototype-inspector__data-body" },
      isRecord(data.overview)
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "High-level data contract that explains what the Data tab owns.",
              title: "Overview",
            },
            createElement(PrototypeDataKeyValues, { value: data.overview }),
          )
        : null,
      apiContracts.length > 0
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "API replacement points for moving from local fixtures to product integration.",
              title: "API Contracts",
            },
            createElement(PrototypeDataTable, {
              columns: [
                {
                  key: "method",
                  label: "Method",
                  render: (api) =>
                    createElement(PrototypeDataCode, { value: api.method }),
                },
                {
                  key: "endpoint",
                  label: "Endpoint",
                  render: (api) =>
                    createElement(PrototypeDataCode, { value: api.endpoint }),
                },
                { key: "usage", label: "Usage" },
                {
                  key: "routes",
                  label: "Routes",
                  render: (api) =>
                    createElement(PrototypeDataTags, { value: api.routes }),
                },
                {
                  key: "request",
                  label: "Request",
                  render: (api) =>
                    createElement(PrototypeDataCode, { value: api.request }),
                },
                {
                  key: "response",
                  label: "Response",
                  render: (api) =>
                    createElement(PrototypeDataCode, { value: api.response }),
                },
                {
                  key: "mock",
                  label: "Mock",
                  render: (api) =>
                    createElement(PrototypeDataCode, { value: api.mock }),
                },
              ],
              rows: apiContracts,
            }),
          )
        : null,
      dataSources.length > 0
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "Where the data should come from, who owns it, and how often it changes.",
              title: "Data Sources",
            },
            createElement(PrototypeDataTable, {
              columns: [
                {
                  key: "id",
                  label: "Source",
                  render: (source) =>
                    createElement(PrototypeDataCode, { value: source.id }),
                },
                { key: "owner", label: "Owner" },
                { key: "source", label: "System" },
                { key: "refresh", label: "Refresh" },
                { key: "description", label: "Description" },
              ],
              rows: dataSources,
            }),
          )
        : null,
      createElement(PrototypeDataSchemas, { schemas }),
      routeDataRequirements.length > 0 || routes.length > 0
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "Route-level UI mapping between screens, APIs, and required data.",
              title: "Route Data Map",
            },
            createElement(PrototypeDataTable, {
              columns: [
                {
                  key: "route",
                  label: "Route",
                  render: (route) =>
                    createElement(PrototypeDataCode, {
                      value: route.route ?? route.id,
                    }),
                },
                { key: "state", label: "State" },
                {
                  key: "api",
                  label: "API",
                  render: (route) =>
                    createElement(PrototypeDataCode, { value: route.api }),
                },
                {
                  key: "requiredData",
                  label: "Required Data",
                  render: (route) =>
                    createElement(PrototypeDataTags, {
                      value: route.requiredData,
                    }),
                },
              ],
              rows:
                routeDataRequirements.length > 0
                  ? routeDataRequirements
                  : routes.map((route) => ({
                      api: "-",
                      requiredData: [],
                      route: route.id,
                      state: route.title ?? route.id,
                    })),
            }),
          )
        : null,
      stateRules.length > 0
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "Runtime state and edge cases that should stay deterministic in the prototype.",
              title: "State Rules",
            },
            createElement(PrototypeDataTable, {
              columns: [
                { key: "trigger", label: "Trigger" },
                {
                  key: "fixture",
                  label: "Fixture",
                  render: (rule) =>
                    createElement(PrototypeDataCode, { value: rule.fixture }),
                },
                { key: "uiBehavior", label: "UI Behavior" },
              ],
              rows: stateRules,
            }),
          )
        : null,
      isRecord(data.fixtures)
        ? createElement(
            PrototypeDataSection,
            {
              description:
                "Local deterministic fixtures used by Storybook while the prototype is not wired to APIs.",
              title: "Fixture Summary",
            },
            createElement(PrototypeDataKeyValues, { value: data.fixtures }),
          )
        : null,
      createElement(
        PrototypeDataSection,
        {
          description:
            "Raw metadata remains available for debugging and future automation.",
          title: "Raw Payload",
        },
        createElement(
          "pre",
          { className: "prototype-inspector__code" },
          JSON.stringify(prototype.data ?? prototype, null, 2),
        ),
      ),
    ),
  );
}

function PrototypeEmpty({ message }) {
  return createElement(
    "div",
    { className: "prototype-inspector prototype-inspector--empty" },
    createElement("p", { className: "prototype-inspector__empty" }, message),
  );
}

function createPrototypeInspectorDecorator(options = {}) {
  const globalName = options.globalName ?? defaultPrototypeModeGlobalName;
  const parameterName = options.parameterName ?? defaultPrototypeParameterName;

  return (Story, context) => {
    const prototypeMode = getPrototypeMode(context.globals?.[globalName]);
    const prototype = getPrototypeParameter(context, parameterName);

    if (prototypeMode === "story" || !prototype) {
      return Story();
    }

    if (prototypeMode === "docs") {
      return createElement(PrototypeDocs, { prototype });
    }

    if (prototypeMode === "flow") {
      return createElement(PrototypeFlow, { prototype });
    }

    return createElement(PrototypeData, { prototype });
  };
}

export const decorators = [createPrototypeInspectorDecorator()];

export const globalTypes = {
  [defaultPrototypeModeGlobalName]: {
    defaultValue: "story",
    description: "Controls the Prototype toolbar canvas mode.",
  },
};

export const initialGlobals = {
  [defaultPrototypeModeGlobalName]: "story",
};
