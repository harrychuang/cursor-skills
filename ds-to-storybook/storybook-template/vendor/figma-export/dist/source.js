// src/source.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getParameterUrl(value) {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return void 0;
  return typeof value.url === "string" ? value.url : void 0;
}
function getComponentSourceSlug(componentTitle) {
  if (typeof componentTitle !== "string") return "";
  return componentTitle.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function getFigmaNodeId(value) {
  const figmaNodeMatch = value.match(/Figma\s+`(\d+):(\d+)`/);
  if (figmaNodeMatch) return `${figmaNodeMatch[1]}:${figmaNodeMatch[2]}`;
  const fingerprintMatch = value.match(/figma:[^#\s`]+#(\d+):(\d+)/);
  if (fingerprintMatch) return `${fingerprintMatch[1]}:${fingerprintMatch[2]}`;
  const urlNodeMatch = value.match(/node-id=(\d+)-(\d+)/);
  return urlNodeMatch ? `${urlNodeMatch[1]}:${urlNodeMatch[2]}` : void 0;
}
function appendFigmaNodeId(fileUrl, nodeId) {
  try {
    const url = new URL(fileUrl);
    url.searchParams.set("node-id", nodeId.replace(":", "-"));
    return url.href;
  } catch {
    const separator = fileUrl.includes("?") ? "&" : "?";
    return `${fileUrl}${separator}node-id=${nodeId.replace(":", "-")}`;
  }
}
function getDocumentedFigmaSourceUrl(componentTitle, options) {
  const sourceSlug = getComponentSourceSlug(componentTitle);
  if (!sourceSlug || !options.designSystemFileUrl) return void 0;
  const overrideNodeId = options.nodeOverrides?.[sourceSlug];
  const specModulePath = options.specModulePathForSlug?.(sourceSlug) ?? `../design-system/components/${sourceSlug}.md`;
  const markdown = options.componentSpecModules?.[specModulePath];
  const nodeId = overrideNodeId ?? markdown?.split("\n").map(getFigmaNodeId).find((candidate) => Boolean(candidate));
  if (!nodeId) return void 0;
  return appendFigmaNodeId(options.designSystemFileUrl, nodeId);
}
function getFigmaSourceUrl(parameters, componentTitle, options = {}) {
  const candidates = parameters ? [
    parameters.figmaSourceUrl,
    getParameterUrl(parameters.figma),
    getParameterUrl(parameters.design)
  ] : [];
  return candidates.find((candidate) => Boolean(candidate)) ?? getDocumentedFigmaSourceUrl(componentTitle, options);
}
function getExportComponentTitle(title, storyTitlePrefix) {
  if (!title) return "Component";
  if (storyTitlePrefix === false) return title;
  const matchingPrefix = storyTitlePrefix.find((prefix) => title.startsWith(prefix));
  return matchingPrefix ? title.slice(matchingPrefix.length) : title;
}
export {
  getComponentSourceSlug,
  getDocumentedFigmaSourceUrl,
  getExportComponentTitle,
  getFigmaNodeId,
  getFigmaSourceUrl,
  getParameterUrl
};
//# sourceMappingURL=source.js.map