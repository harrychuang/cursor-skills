export const prototypeFlowLayoutStoragePrefix =
  "prototype-inspector:flow-layout";
export const prototypeFlowLayoutSchemaName =
  "storybook-template.prototype-flow-layout";
export const prototypeFlowLayoutSchemaVersion = 1;

export type PrototypeFlowLayoutPosition = {
  x: number;
  y: number;
};

export type PrototypeFlowLayoutPositions<NodeId extends string = string> =
  Partial<Record<NodeId, PrototypeFlowLayoutPosition>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNormalizedPrototypeId(prototypeId: string | null | undefined) {
  return typeof prototypeId === "string" && prototypeId.trim()
    ? prototypeId.trim()
    : "prototype";
}

export function getPrototypeFlowLayoutStorageKey(
  prototypeId: string | null | undefined,
) {
  return `${prototypeFlowLayoutStoragePrefix}:${getNormalizedPrototypeId(
    prototypeId,
  )}`;
}

export function normalizePrototypeFlowLayoutPositions<NodeId extends string>(
  value: unknown,
  nodeIds: ReadonlySet<NodeId>,
): PrototypeFlowLayoutPositions<NodeId> {
  if (!isRecord(value)) {
    return {};
  }

  const positionsSource = isRecord(value.positions)
    ? value.positions
    : isRecord(value.routePositions)
      ? value.routePositions
      : value;
  const positions: PrototypeFlowLayoutPositions<NodeId> = {};

  Object.entries(positionsSource).forEach(([nodeId, position]) => {
    const typedNodeId = nodeId as NodeId;

    if (
      nodeIds.has(typedNodeId) &&
      isRecord(position) &&
      typeof position.x === "number" &&
      typeof position.y === "number" &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
    ) {
      positions[typedNodeId] = {
        x: Math.round(position.x),
        y: Math.round(position.y),
      };
    }
  });

  return positions;
}

export function createPrototypeFlowLayoutPayload<NodeId extends string>(
  prototypeId: string | null | undefined,
  positions: PrototypeFlowLayoutPositions<NodeId>,
) {
  return {
    exportedAt: new Date().toISOString(),
    positions,
    prototypeId: prototypeId ?? null,
    schema: prototypeFlowLayoutSchemaName,
    version: prototypeFlowLayoutSchemaVersion,
  };
}

export function readPrototypeFlowLayoutPositions<NodeId extends string>(
  storageKey: string,
  nodeIds: ReadonlySet<NodeId>,
): PrototypeFlowLayoutPositions<NodeId> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);

    return storedValue
      ? normalizePrototypeFlowLayoutPositions(JSON.parse(storedValue), nodeIds)
      : {};
  } catch (error) {
    console.warn("Unable to read prototype flow layout.", error);
    return {};
  }
}

export function writePrototypeFlowLayoutPositions<NodeId extends string>(
  storageKey: string,
  prototypeId: string | null | undefined,
  positions: PrototypeFlowLayoutPositions<NodeId>,
  nodeIds: ReadonlySet<NodeId>,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPositions = normalizePrototypeFlowLayoutPositions(
    { positions },
    nodeIds,
  );

  try {
    if (Object.keys(normalizedPositions).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        createPrototypeFlowLayoutPayload(prototypeId, normalizedPositions),
      ),
    );
  } catch (error) {
    console.warn("Unable to store prototype flow layout.", error);
  }
}
