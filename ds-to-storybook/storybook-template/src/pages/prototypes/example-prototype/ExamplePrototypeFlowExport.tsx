import { useEffect, useMemo, useState } from "react";

import {
  getPrototypeFlowLayoutStorageKey,
  readPrototypeFlowLayoutPositions,
  type PrototypeFlowLayoutPositions,
} from "../prototypeFlowLayout";
import "./example-prototype.css";
import { ExamplePrototype } from "./ExamplePrototype";
import {
  examplePrototypeFlowNodes,
  examplePrototypeRoutes,
  examplePrototypeTransitions,
  type ExamplePrototypeFlowNode,
  type ExamplePrototypeFlowTargetId,
  type ExamplePrototypeRoute,
  type ExamplePrototypeTransition,
} from "./examplePrototypeFlow";
import { examplePrototypeMeta } from "./examplePrototypeMeta";

const routePreviewWidth = 375;
const routeHeaderHeight = 64;
const routePreviewHeight = 812;
const routeFrameSize = 2;
const routeWidth = routePreviewWidth + routeFrameSize;
const routeHeight = routeHeaderHeight + routePreviewHeight + routeFrameSize;
const decisionNodeSize = 220;
const stateNodeWidth = 308;
const stateNodeHeight = 124;
const padding = 96;
const flowLineLaneOffset = 44;
const flowLineSideLaneOffset = 40;
const flowLineInterRowMinGap = 42;
const flowLineReverseOffset = 18;
const flowArrowLength = 14;
const flowArrowHalfWidth = 5;
const flowEdgeColorVariants = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
] as const;
const flowExportNodeIds = new Set<ExamplePrototypeFlowTargetId>([
  ...examplePrototypeRoutes.map((route) => route.id),
  ...examplePrototypeFlowNodes.map((node) => node.id),
]);

type FlowEdgeColorVariant = (typeof flowEdgeColorVariants)[number];

type FlowExportLayoutPositions =
  PrototypeFlowLayoutPositions<ExamplePrototypeFlowTargetId>;

type FlowItem = {
  id: ExamplePrototypeFlowTargetId;
  kind: "node" | "route";
  node?: ExamplePrototypeFlowNode;
  route?: ExamplePrototypeRoute;
  width: number;
  height: number;
  x: number;
  y: number;
};

type FlowPoint = {
  x: number;
  y: number;
};

type FlowPolylineResult = {
  labelPosition: FlowPoint;
  pointList: FlowPoint[];
  points: string;
};

type FlowEdge = {
  arrowPoints: string;
  colorVariant?: FlowEdgeColorVariant;
  from: ExamplePrototypeFlowTargetId;
  id: string;
  kind?: ExamplePrototypeTransition["kind"];
  label: string;
  labelX: number;
  labelY: number;
  points: string;
  to: ExamplePrototypeFlowTargetId;
  trigger: string;
};

function getFlowExportStorageKey() {
  return getPrototypeFlowLayoutStorageKey(examplePrototypeMeta.id);
}

function readStoredFlowExportLayoutPositions(): FlowExportLayoutPositions {
  return readPrototypeFlowLayoutPositions(
    getFlowExportStorageKey(),
    flowExportNodeIds,
  );
}

function getFallbackPosition(index: number) {
  return {
    x: (index % 3) * 360,
    y: Math.floor(index / 3) * 260,
  };
}

function getEdgeLabelPrefix(edge: FlowEdge) {
  return edge.kind === "condition" ? "條件" : "點擊";
}

function getFlowEdgeColorAnchor(
  edge: Pick<FlowEdge, "from" | "to">,
  nodeEdgeCounts: Map<ExamplePrototypeFlowTargetId, number>,
) {
  if ((nodeEdgeCounts.get(edge.from) ?? 0) > 1) return edge.from;
  if ((nodeEdgeCounts.get(edge.to) ?? 0) > 1) return edge.to;
  return undefined;
}

function addFlowEdgeColorVariants(edges: FlowEdge[]): FlowEdge[] {
  const nodeEdgeCounts = new Map<ExamplePrototypeFlowTargetId, number>();

  edges.forEach((edge) => {
    [edge.from, edge.to].forEach((nodeId) => {
      nodeEdgeCounts.set(nodeId, (nodeEdgeCounts.get(nodeId) ?? 0) + 1);
    });
  });

  const nodeEdgeIndexes = new Map<ExamplePrototypeFlowTargetId, number>();

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

function getFlowNodeSize(node: ExamplePrototypeFlowNode) {
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

function getItems(layoutPositions: FlowExportLayoutPositions): FlowItem[] {
  return [
    ...examplePrototypeRoutes.map((route, index) => {
      const position = layoutPositions[route.id] ??
        route.flowPosition ?? getFallbackPosition(index);

      return {
        height: routeHeight,
        id: route.id,
        kind: "route" as const,
        route,
        width: routeWidth,
        x: position.x,
        y: position.y,
      };
    }),
    ...examplePrototypeFlowNodes.map((node, index) => {
      const size = getFlowNodeSize(node);
      const position = layoutPositions[node.id] ??
        node.flowPosition ??
        getFallbackPosition(index + examplePrototypeRoutes.length);

      return {
        height: size.height,
        id: node.id,
        kind: "node" as const,
        node,
        width: size.width,
        x: position.x,
        y: position.y,
      };
    }),
  ];
}

function getCanvas(items: FlowItem[]) {
  const minX = Math.min(...items.map((item) => item.x));
  const minY = Math.min(...items.map((item) => item.y));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const maxY = Math.max(...items.map((item) => item.y + item.height));

  return {
    height: maxY - minY + padding * 2,
    offsetX: padding - minX,
    offsetY: padding - minY,
    width: maxX - minX + padding * 2,
  };
}

function compactPoints(points: FlowPoint[]) {
  return points.filter((point, index) => {
    const previousPoint = points[index - 1];

    return (
      !previousPoint ||
      point.x !== previousPoint.x ||
      point.y !== previousPoint.y
    );
  });
}

function getRoundedPointString(points: FlowPoint[]) {
  return points
    .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
    .join(" ");
}

function createPolylineResult(
  points: FlowPoint[],
  labelPosition?: FlowPoint,
): FlowPolylineResult {
  const pointList = compactPoints(points);
  const firstPoint = pointList[0] ?? { x: 0, y: 0 };
  const lastPoint = pointList[pointList.length - 1] ?? firstPoint;

  return {
    labelPosition: labelPosition ?? {
      x: firstPoint.x + (lastPoint.x - firstPoint.x) / 2,
      y: firstPoint.y + (lastPoint.y - firstPoint.y) / 2,
    },
    pointList,
    points: getRoundedPointString(pointList),
  };
}

function getArrowPoints(points: FlowPoint[]) {
  const pointList = compactPoints(points);
  const tip = pointList[pointList.length - 1];
  const previous = [...pointList]
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

  return getRoundedPointString([
    tip,
    {
      x: baseCenter.x + normal.x * flowArrowHalfWidth,
      y: baseCenter.y + normal.y * flowArrowHalfWidth,
    },
    {
      x: baseCenter.x - normal.x * flowArrowHalfWidth,
      y: baseCenter.y - normal.y * flowArrowHalfWidth,
    },
  ]);
}

function getItemBottom(item: FlowItem) {
  return item.y + item.height;
}

function getItemCenter(item: FlowItem) {
  return {
    x: item.x + item.width / 2,
    y: item.y + item.height / 2,
  };
}

function createGlobalPolyline(source: FlowItem, target: FlowItem) {
  const sourceBottom = {
    x: source.x + source.width / 2,
    y: getItemBottom(source),
  };
  const targetBottom = {
    x: target.x + target.width / 2,
    y: getItemBottom(target),
  };
  const laneY = Math.max(sourceBottom.y, targetBottom.y) + flowLineLaneOffset;

  return createPolylineResult(
    [
      sourceBottom,
      { x: sourceBottom.x, y: laneY },
      { x: targetBottom.x, y: laneY },
      targetBottom,
    ],
    {
      x: (sourceBottom.x + targetBottom.x) / 2,
      y: laneY,
    },
  );
}

function createSameColumnBypassPolyline(source: FlowItem, target: FlowItem) {
  const sourceCenter = getItemCenter(source);
  const targetCenter = getItemCenter(target);
  const columnOverlap =
    Math.abs(sourceCenter.x - targetCenter.x) <
    Math.min(source.width, target.width) / 2;
  const upperItem = source.y < target.y ? source : target;
  const lowerItem = source.y < target.y ? target : source;
  const verticalGap = lowerItem.y - getItemBottom(upperItem);
  const bypassThreshold = Math.min(source.height, target.height);

  if (!columnOverlap || verticalGap <= bypassThreshold) {
    return null;
  }

  const laneX =
    Math.max(source.x + source.width, target.x + target.width) +
    flowLineSideLaneOffset;
  const start = { x: source.x + source.width, y: sourceCenter.y };
  const end = { x: target.x + target.width, y: targetCenter.y };

  return createPolylineResult(
    [
      start,
      { x: laneX, y: start.y },
      { x: laneX, y: end.y },
      end,
    ],
    {
      x: laneX,
      y: (start.y + end.y) / 2,
    },
  );
}

function createInterRowPolyline(source: FlowItem, target: FlowItem) {
  const sourceCenter = getItemCenter(source);
  const targetCenter = getItemCenter(target);
  const sourceIsUpper = source.y < target.y;
  const upperItem = sourceIsUpper ? source : target;
  const lowerItem = sourceIsUpper ? target : source;
  const gapStart = getItemBottom(upperItem);
  const gapEnd = lowerItem.y;
  const laneY = gapStart + (gapEnd - gapStart) / 2;

  if (gapEnd - gapStart < flowLineInterRowMinGap) {
    return null;
  }

  const start = sourceIsUpper
    ? { x: sourceCenter.x, y: getItemBottom(source) }
    : { x: sourceCenter.x, y: source.y };
  const end = sourceIsUpper
    ? { x: targetCenter.x, y: target.y }
    : { x: targetCenter.x, y: getItemBottom(target) };

  return createPolylineResult(
    [
      start,
      { x: start.x, y: laneY },
      { x: end.x, y: laneY },
      end,
    ],
    {
      x: (start.x + end.x) / 2,
      y: laneY,
    },
  );
}

function getAnchorPair(source: FlowItem, target: FlowItem, hasReverse: boolean) {
  const sourceCenter = getItemCenter(source);
  const targetCenter = getItemCenter(target);
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const isHorizontalFlow = Math.abs(dx) >= Math.abs(dy);
  const offset = hasReverse
    ? isHorizontalFlow
      ? dx >= 0
        ? flowLineReverseOffset
        : -flowLineReverseOffset
      : dy >= 0
        ? flowLineReverseOffset
        : -flowLineReverseOffset
    : 0;

  if (isHorizontalFlow) {
    if (dx >= 0) {
      return {
        end: { x: target.x, y: targetCenter.y + offset },
        start: { x: source.x + source.width, y: sourceCenter.y + offset },
      };
    }

    return {
      end: { x: target.x + target.width, y: targetCenter.y + offset },
      start: { x: source.x, y: sourceCenter.y + offset },
    };
  }

  if (dy >= 0) {
    return {
      end: { x: targetCenter.x + offset, y: target.y },
      start: { x: sourceCenter.x + offset, y: getItemBottom(source) },
    };
  }

  return {
    end: { x: targetCenter.x + offset, y: getItemBottom(target) },
    start: { x: sourceCenter.x + offset, y: source.y },
  };
}

function createFlowPolyline(
  transition: ExamplePrototypeTransition,
  itemMap: Map<ExamplePrototypeFlowTargetId, FlowItem>,
  reverseEdgeKeys: Set<string>,
) {
  const source = itemMap.get(transition.from);
  const target = itemMap.get(transition.to);

  if (!source || !target) {
    return null;
  }

  const edgeKey = `${transition.from}->${transition.to}`;
  const hasReverse = reverseEdgeKeys.has(edgeKey);

  if (transition.kind === "global") {
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

  return createPolylineResult(
    horizontal
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
        ],
  );
}

function getFlowEdges(
  itemMap: Map<ExamplePrototypeFlowTargetId, FlowItem>,
): FlowEdge[] {
  const keyTransitions = examplePrototypeTransitions.filter(
    (transition) => transition.flowLine === "key",
  );
  const edgeKeys = new Set(
    keyTransitions.map((transition) => `${transition.from}->${transition.to}`),
  );
  const reverseEdgeKeys = new Set(
    keyTransitions
      .filter((transition) => edgeKeys.has(`${transition.to}->${transition.from}`))
      .map((transition) => `${transition.from}->${transition.to}`),
  );

  return addFlowEdgeColorVariants(
    keyTransitions.flatMap((transition) => {
      const polyline = createFlowPolyline(transition, itemMap, reverseEdgeKeys);

      if (!polyline) {
        return [];
      }

      return [
        {
          arrowPoints: getArrowPoints(polyline.pointList),
          from: transition.from,
          id: `${transition.from}-${transition.to}`,
          kind: transition.kind,
          label: transition.label,
          labelX: polyline.labelPosition.x,
          labelY: polyline.labelPosition.y,
          points: polyline.points,
          to: transition.to,
          trigger: transition.trigger,
        },
      ];
    }),
  );
}

export function ExamplePrototypeFlowExport() {
  const [layoutPositions, setLayoutPositions] = useState(() =>
    readStoredFlowExportLayoutPositions(),
  );
  const items = useMemo(
    () => getItems(layoutPositions),
    [layoutPositions],
  );
  const canvas = getCanvas(items);
  const itemMap = new Map(
    items.map((item) => [
      item.id,
      {
        ...item,
        x: item.x + canvas.offsetX,
        y: item.y + canvas.offsetY,
      },
    ]),
  );
  const edges = getFlowEdges(itemMap);

  useEffect(() => {
    const updateLayoutPositions = () => {
      setLayoutPositions(readStoredFlowExportLayoutPositions());
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === getFlowExportStorageKey()) {
        updateLayoutPositions();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateLayoutPositions();
      }
    };

    updateLayoutPositions();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", updateLayoutPositions);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", updateLayoutPositions);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section
      className="sbt-example-flow-export"
      data-component="example-prototype-flow"
      data-layout-source={
        Object.keys(layoutPositions).length > 0 ? "saved" : "metadata"
      }
      style={{
        ["--example-flow-height" as string]: `${canvas.height}px`,
        ["--example-flow-route-header-height" as string]: `${routeHeaderHeight}px`,
        ["--example-flow-route-preview-height" as string]: `${routePreviewHeight}px`,
        ["--example-flow-route-preview-width" as string]: `${routePreviewWidth}px`,
        ["--example-flow-width" as string]: `${canvas.width}px`,
      }}
    >
      <svg
        aria-hidden="true"
        className="sbt-example-flow-export__lines"
        height={canvas.height}
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        width={canvas.width}
      >
        {edges.map((edge) => (
          <g key={edge.id}>
            <polyline data-flow-color={edge.colorVariant} points={edge.points} />
            {edge.arrowPoints ? (
              <polygon data-flow-color={edge.colorVariant} points={edge.arrowPoints} />
            ) : null}
          </g>
        ))}
      </svg>

      {edges.map((edge) => (
        <span
          className="sbt-example-flow-export__edge-label"
          data-flow-color={edge.colorVariant}
          key={`${edge.id}-label`}
          style={{
            ["--example-flow-label-x" as string]: `${edge.labelX}px`,
            ["--example-flow-label-y" as string]: `${edge.labelY}px`,
          }}
          title={edge.trigger}
        >
          <span data-figma-text-auto-width="true">{getEdgeLabelPrefix(edge)}</span>
          <strong data-figma-text-auto-width="true">{edge.label}</strong>
        </span>
      ))}

      {items.map((item) => {
        const placed = itemMap.get(item.id);
        if (!placed) return null;

        return (
          <article
            className="sbt-example-flow-export__item"
            data-kind={item.kind}
            data-shape={item.node?.shape}
            data-tone={item.node?.tone}
            key={item.id}
            style={{
              ["--example-flow-item-height" as string]: `${item.height}px`,
              ["--example-flow-item-width" as string]: `${item.width}px`,
              ["--example-flow-item-x" as string]: `${placed.x}px`,
              ["--example-flow-item-y" as string]: `${placed.y}px`,
            }}
          >
            {item.route ? (
              <>
                <header className="sbt-example-flow-export__route-header">
                  <div>
                    <span>{item.route.flowGroup ?? item.route.navigationId}</span>
                    <h2>{item.route.title}</h2>
                  </div>
                  <code>{item.route.id}</code>
                </header>
                <div className="sbt-example-flow-export__route-preview">
                  <ExamplePrototype
                    initialRouteId={item.route.id}
                    isFlowPreview
                  />
                </div>
              </>
            ) : null}
            {item.node ? (
              <div className="sbt-example-flow-export__node-surface">
                <div className="sbt-example-flow-export__node-copy">
                  <span>{item.node.flowGroup ?? item.node.shape}</span>
                  <h2>{item.node.title}</h2>
                  <p>{item.node.description}</p>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
