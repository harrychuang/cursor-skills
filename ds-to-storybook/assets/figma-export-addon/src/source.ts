export type FigmaSourceResolverOptions = {
  componentSpecModules?: Record<string, string>;
  designSystemFileUrl?: string;
  nodeOverrides?: Record<string, string>;
  specModulePathForSlug?: (slug: string) => string;
};

export type StoryParameters = Record<string, unknown> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getParameterUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  return typeof value.url === "string" ? value.url : undefined;
}

export function getComponentSourceSlug(componentTitle: unknown): string {
  if (typeof componentTitle !== "string") return "";

  return componentTitle
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getFigmaNodeId(value: string): string | undefined {
  const figmaNodeMatch = value.match(/Figma\s+`(\d+):(\d+)`/);
  if (figmaNodeMatch) return `${figmaNodeMatch[1]}:${figmaNodeMatch[2]}`;

  const fingerprintMatch = value.match(/figma:[^#\s`]+#(\d+):(\d+)/);
  if (fingerprintMatch) return `${fingerprintMatch[1]}:${fingerprintMatch[2]}`;

  const urlNodeMatch = value.match(/node-id=(\d+)-(\d+)/);
  return urlNodeMatch ? `${urlNodeMatch[1]}:${urlNodeMatch[2]}` : undefined;
}

function appendFigmaNodeId(fileUrl: string, nodeId: string): string {
  try {
    const url = new URL(fileUrl);
    url.searchParams.set("node-id", nodeId.replace(":", "-"));
    return url.href;
  } catch {
    const separator = fileUrl.includes("?") ? "&" : "?";
    return `${fileUrl}${separator}node-id=${nodeId.replace(":", "-")}`;
  }
}

export function getDocumentedFigmaSourceUrl(
  componentTitle: unknown,
  options: FigmaSourceResolverOptions,
): string | undefined {
  const sourceSlug = getComponentSourceSlug(componentTitle);
  if (!sourceSlug || !options.designSystemFileUrl) return undefined;

  const overrideNodeId = options.nodeOverrides?.[sourceSlug];
  const specModulePath =
    options.specModulePathForSlug?.(sourceSlug) ??
    `../design-system/components/${sourceSlug}.md`;
  const markdown = options.componentSpecModules?.[specModulePath];
  const nodeId =
    overrideNodeId ??
    markdown
      ?.split("\n")
      .map(getFigmaNodeId)
      .find((candidate): candidate is string => Boolean(candidate));
  if (!nodeId) return undefined;

  return appendFigmaNodeId(options.designSystemFileUrl, nodeId);
}

export function getFigmaSourceUrl(
  parameters: StoryParameters,
  componentTitle: string,
  options: FigmaSourceResolverOptions = {},
): string | undefined {
  const candidates = parameters
    ? [
        parameters.figmaSourceUrl,
        getParameterUrl(parameters.figma),
        getParameterUrl(parameters.design),
      ]
    : [];

  return (
    candidates.find((candidate): candidate is string => Boolean(candidate)) ??
    getDocumentedFigmaSourceUrl(componentTitle, options)
  );
}

export function getExportComponentTitle(
  title: string | undefined,
  storyTitlePrefix: string[] | false,
): string {
  if (!title) return "Component";
  if (storyTitlePrefix === false) return title;

  const matchingPrefix = storyTitlePrefix.find((prefix) => title.startsWith(prefix));
  return matchingPrefix ? title.slice(matchingPrefix.length) : title;
}
