type FigmaVariableType = "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";
type TokenCollection = "comp" | "ref" | "sys";
type FigmaNodeKind = "frame" | "image" | "svg" | "text";
type TextAutoResizeMode = "HEIGHT" | "WIDTH_AND_HEIGHT";
type TextHorizontalAlign = "CENTER" | "JUSTIFIED" | "LEFT" | "RIGHT";
type TextVerticalAlign = "CENTER";
type FigmaExportArtifactKind = "component" | "page";

type RgbaColor = {
  a: number;
  b: number;
  g: number;
  r: number;
};

type FigmaVariableValue = boolean | number | string | RgbaColor;

type FigmaExportToken = {
  alias?: string;
  collection: TokenCollection;
  cssName: string;
  figmaName: string;
  rawValue: string;
  scopes: string[];
  type: FigmaVariableType;
  value?: FigmaVariableValue;
};

type FigmaComponentReference = {
  key: string;
  name: string;
  sourceName: string;
  variant?: string;
  variantProperties?: Record<string, string>;
};

type FigmaExportGradientStop = {
  color: string;
  position: number;
  token?: string;
};

type FigmaExportLinearGradient = {
  angle: number;
  stops: FigmaExportGradientStop[];
};

type FigmaExportRadialGradient = {
  stops: FigmaExportGradientStop[];
};

type FigmaTokenSystem = {
  collections?: Partial<Record<TokenCollection, string>>;
  pluginDataKey?: string;
};

type FigmaComponentSystem = {
  componentsPageName?: string;
  pluginDataKey?: string;
};

type FigmaBindingName =
  | "backgroundColor"
  | "borderColor"
  | "borderWidth"
  | "cornerRadius"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "gap"
  | "height"
  | "lineHeight"
  | "opacity"
  | "paddingBottom"
  | "paddingLeft"
  | "paddingRight"
  | "paddingTop"
  | "textColor"
  | "width";

type FigmaNodeConstraintValue = "CENTER" | "MAX" | "MIN" | "SCALE" | "STRETCH";

type FigmaExportConstraints = {
  horizontal: FigmaNodeConstraintValue;
  vertical: FigmaNodeConstraintValue;
};

type FigmaBorderSideName = "bottom" | "left" | "right" | "top";

type FigmaExportBorderSide = {
  color?: string;
  width: number;
};

type FigmaExportBorderSides = Partial<
  Record<FigmaBorderSideName, FigmaExportBorderSide>
>;

type FigmaExportEffect = {
  blur: number;
  color?: string;
  offsetX: number;
  offsetY: number;
  spread: number;
  type: "BACKGROUND_BLUR" | "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR";
};

type FigmaExportBorderStyle = "dashed" | "dotted";

type FigmaRadiusCorners = {
  bottomLeft: number;
  bottomRight: number;
  topLeft: number;
  topRight: number;
};

type FigmaImageScaleMode = "FILL" | "FIT";

// Row-major 2x3 affine matrix in Figma Transform layout.
type FigmaTransformMatrix = [
  [number, number, number],
  [number, number, number],
];

type FigmaExportReferenceImage = {
  height: number;
  imageBase64: string;
  imageMimeType: string;
  width: number;
};

type FigmaTextDecorationSpec = "STRIKETHROUGH" | "UNDERLINE";

type FigmaExportNode = {
  bindings?: Partial<Record<FigmaBindingName, string>>;
  children?: FigmaExportNode[];
  component?: FigmaComponentReference;
  imageBase64?: string;
  imageMimeType?: string;
  kind: FigmaNodeKind;
  name: string;
  styles: {
    alignItems?: string;
    backgroundColor?: string;
    backgroundLinearGradient?: FigmaExportLinearGradient;
    backgroundRadialGradient?: FigmaExportRadialGradient;
    blurEffects?: FigmaExportEffect[];
    borderColor?: string;
    borderSides?: FigmaExportBorderSides;
    borderStyle?: FigmaExportBorderStyle;
    borderWidth?: number;
    constraints?: FigmaExportConstraints;
    color?: string;
    counterAxisSpacing?: number;
    display?: string;
    effects?: FigmaExportEffect[];
    flexDirection?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: "italic";
    fontWeight?: number;
    gap?: number;
    height: number;
    imageScaleMode?: FigmaImageScaleMode;
    justifyContent?: string;
    layoutAlign?: "STRETCH";
    layoutGrow?: number;
    layoutSizingHorizontal?: "HUG";
    layoutSizingVertical?: "HUG";
    layoutWrap?: "WRAP";
    letterSpacing?: number;
    lineHeight?: number | "normal";
    maxLines?: number;
    textTruncation?: "ENDING";
    opacity?: number;
    outOfFlow?: boolean;
    overflow?: string;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    radius?: number;
    radiusCorners?: FigmaRadiusCorners;
    textAlign?: string;
    textAlignVertical?: TextVerticalAlign;
    textAutoResize?: TextAutoResizeMode;
    textDecoration?: FigmaTextDecorationSpec;
    textGrowHeight?: boolean;
    transformMatrix?: FigmaTransformMatrix;
    width: number;
    x: number;
    y: number;
  };
  svgText?: string;
  text?: string;
};

type FigmaExportPayload = {
  artifactKind?: FigmaExportArtifactKind;
  component?: FigmaComponentReference;
  componentSystem?: FigmaComponentSystem;
  componentTitle: string;
  generatedAt: string;
  reference?: FigmaExportReferenceImage;
  root: FigmaExportNode;
  storyId: string;
  storyName: string;
  storyTitle?: string;
  tokens: FigmaExportToken[];
  tokenSystem?: FigmaTokenSystem;
  version: 1 | 2;
};

type ImportMessage =
  | {
      includeReference?: boolean;
      json: string;
      type: "import-json";
    }
  | {
      type: "cancel";
    };

// One text node whose font differs from what the payload asked for. Structured
// rather than a warning string so the UI can count substitutions and the
// environment-fault reading can be computed from the run's records.
type FontSubstitution = {
  attemptedStyles: string[];
  loadedFamily: string;
  loadedStyle: string;
  nodePath: string;
  requestedFamily: string;
  requestedWeight: number;
};

// What the font resolution path hands back: the font it loaded plus every
// style name it tried on the way there.
type FontResolution = {
  attemptedStyles: string[];
  font: FontName;
};

type NearestFontAttempt = {
  attemptedStyles: string[];
  font?: FontName;
};

type ImportStats = {
  artifactKind?: FigmaExportArtifactKind;
  componentDefinitionsPrepared?: number;
  componentsCreated: number;
  // Every text node this run loaded a different family or style for.
  fontSubstitutions: FontSubstitution[];
  importedAsComponent?: boolean;
  nodesCreated: number;
  referencePlaced?: boolean;
  reusedComponents: number;
  reusedVariables: number;
  rootName?: string;
  rootType?: SceneNode["type"];
  componentSectionsOrganized?: number;
  sectionName?: string;
  targetPageName?: string;
  tokensChecked: number;
  variablesCreated: number;
  // Identity of the variant group the import reconstructed, or null when the
  // payload tree was reconstructed instead. Skipped holds the candidates that
  // lost, so an unexpected result is diagnosable from the import report.
  variantGroupSelected?: string | null;
  variantGroupsSkipped?: string[];
  warnings: string[];
};

type VariablePluginData = Variable & {
  getPluginData?: (key: string) => string;
  setPluginData?: (key: string, value: string) => void;
};

type VariableWithCodeSyntax = Variable & {
  setVariableCodeSyntax?: (platform: "WEB", codeSyntax: string) => void;
};

type BoundVariableTarget = SceneNode & {
  setBoundVariable?: (field: string, variable: Variable | null) => void;
};

type NodePluginData = BaseNode & {
  getPluginData?: (key: string) => string;
  setPluginData?: (key: string, value: string) => void;
};

type NodeWithChildren = BaseNode & {
  children?: readonly BaseNode[];
};

type FrameLikeNode = ComponentNode | FrameNode;

type CreateNodeOptions = {
  autoAttachComponentSet?: boolean;
  inferredTextAlignHorizontal?: TextHorizontalAlign;
  isRoot?: boolean;
  reuseComponents?: boolean;
};

function getTextAlignHorizontal(
  spec: FigmaExportNode,
  options: CreateNodeOptions,
): TextHorizontalAlign {
  const explicitTextAlign = mapTextAlignHorizontal(spec.styles.textAlign);
  if (explicitTextAlign) return explicitTextAlign;
  if (spec.kind === "text" && spec.styles.layoutAlign === "STRETCH") return "CENTER";
  return (
    options.inferredTextAlignHorizontal ??
    "LEFT"
  );
}

function applyTextAlignHorizontal(
  node: TextNode,
  spec: FigmaExportNode,
  options: CreateNodeOptions,
  path: string,
): void {
  try {
    node.textAlignHorizontal = getTextAlignHorizontal(spec, options);
  } catch (error) {
    console.warn(`Could not set ${path}.textAlignHorizontal: ${formatError(error)}`);
  }
}

function applyTextAlignVertical(
  node: TextNode,
  value: TextVerticalAlign | undefined,
  path: string,
): void {
  if (!value) return;

  try {
    node.textAlignVertical = value;
  } catch (error) {
    console.warn(`Could not set ${path}.textAlignVertical: ${formatError(error)}`);
  }
}

function applyTextAlignmentFromSpec(
  node: SceneNode,
  spec: FigmaExportNode,
  options: CreateNodeOptions,
  path: string,
): void {
  if (node.type === "TEXT" && spec.kind === "text") {
    applyTextAlignHorizontal(node, spec, options, path);
    applyTextAlignVertical(node, spec.styles.textAlignVertical, path);
    return;
  }

  if (!("children" in node)) return;

  const children = Array.from(node.children).filter(
    (child): child is SceneNode => "visible" in child,
  );
  const specChildren = spec.children ?? [];
  const usedChildIndexes = new Set<number>();

  for (let specIndex = 0; specIndex < specChildren.length; specIndex += 1) {
    const childSpec = specChildren[specIndex];
    const namedIndex = children.findIndex(
      (child, childIndex) =>
        !usedChildIndexes.has(childIndex) && child.name === childSpec.name,
    );
    const fallbackIndex =
      specIndex < children.length && !usedChildIndexes.has(specIndex) ? specIndex : -1;
    const childIndex = namedIndex >= 0 ? namedIndex : fallbackIndex;
    if (childIndex < 0) continue;

    usedChildIndexes.add(childIndex);
    applyTextAlignmentFromSpec(
      children[childIndex],
      childSpec,
      options,
      `${path}/${childSpec.name}`,
    );
  }
}

type VariantComponentSpec = {
  component: FigmaComponentReference;
  depth: number;
  path: string;
  spec: FigmaExportNode;
};

// Minimal shape the variant group selection rule needs. Declared structurally so
// the rule stays a pure function testable without the Figma plugin runtime.
type VariantGroupCandidateEntry = {
  component: { name?: string; sourceName?: string };
  depth: number;
};

type VariantGroupSelection = {
  // Index into the supplied groups array, or -1 when no group qualifies.
  selectedIndex: number;
  selectedIdentity: string;
  skippedIdentities: string[];
};

function normalizeComponentIdentity(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getVariantGroupIdentity(
  group: readonly VariantGroupCandidateEntry[],
): string {
  const first = group[0];
  if (!first) return "";
  return first.component.sourceName || first.component.name || "";
}

function variantGroupMatchesTitle(
  group: readonly VariantGroupCandidateEntry[],
  componentTitle: string,
): boolean {
  const expected = normalizeComponentIdentity(componentTitle);
  if (!expected) return false;
  return group.some(
    (entry) =>
      normalizeComponentIdentity(entry.component.name) === expected ||
      normalizeComponentIdentity(entry.component.sourceName) === expected,
  );
}

function getVariantGroupCandidateDepth(
  group: readonly VariantGroupCandidateEntry[],
): number {
  if (!group.length) return Number.MAX_SAFE_INTEGER;
  return group.reduce(
    (min, entry) => Math.min(min, safeNumber(entry.depth, 0)),
    Number.MAX_SAFE_INTEGER,
  );
}

// Chooses which variant group an artifact-kind `component` payload should be
// reconstructed as, when the payload carries no root component reference.
//
// A payload root that IS a set of variants must become a component set, but a
// composite component that merely USES several variants of a nested component
// must not be replaced by that nested component's set. Two rules keep those
// apart:
//   1. A group whose component identity matches `componentTitle` wins outright,
//      regardless of how many variants it holds.
//   2. Otherwise only the root-most groups may qualify, and only when they hold
//      at least two variants. A group nested below them is never eligible.
// When nothing qualifies the caller reconstructs the payload's actual tree.
function selectVariantGroup(
  groups: readonly (readonly VariantGroupCandidateEntry[])[],
  componentTitle: string,
): VariantGroupSelection {
  const nonEmpty = groups
    .map((group, index) => ({ group, index }))
    .filter((entry) => entry.group.length > 0);

  const skippedIdentities: string[] = [];
  const noSelection = (): VariantGroupSelection => ({
    selectedIndex: -1,
    selectedIdentity: "",
    skippedIdentities: nonEmpty.map((entry) => getVariantGroupIdentity(entry.group)),
  });

  if (!nonEmpty.length) return noSelection();

  // Rule 1: identity match beats every count or depth heuristic.
  const matched = nonEmpty.filter((entry) =>
    variantGroupMatchesTitle(entry.group, componentTitle),
  );

  // Rule 2: fall back to the root-most groups holding at least two variants.
  const rootMostDepth = nonEmpty.reduce(
    (min, entry) => Math.min(min, getVariantGroupCandidateDepth(entry.group)),
    Number.MAX_SAFE_INTEGER,
  );
  const eligible = matched.length
    ? matched
    : nonEmpty.filter(
        (entry) =>
          entry.group.length >= 2 &&
          getVariantGroupCandidateDepth(entry.group) === rootMostDepth,
      );

  if (!eligible.length) return noSelection();

  const winner = eligible
    .slice()
    .sort((a, b) => {
      const depthDelta =
        getVariantGroupCandidateDepth(a.group) - getVariantGroupCandidateDepth(b.group);
      if (depthDelta !== 0) return depthDelta;
      return b.group.length - a.group.length;
    })[0];

  for (const entry of nonEmpty) {
    if (entry.index === winner.index) continue;
    skippedIdentities.push(getVariantGroupIdentity(entry.group));
  }

  return {
    selectedIndex: winner.index,
    selectedIdentity: getVariantGroupIdentity(winner.group),
    skippedIdentities,
  };
}

type ComponentDefinitionRecord = {
  component: FigmaComponentReference;
  node: ComponentNode;
};

type ComponentSetRecord = {
  component: FigmaComponentReference;
  node: ComponentSetNode;
};

type ComponentSectionMetadata = {
  componentTitle?: string;
  storyId?: string;
  storyName?: string;
};

type ComponentSectionTarget = {
  key: string;
  metadata?: ComponentSectionMetadata;
  name: string;
  node: ComponentNode | ComponentSetNode;
  role: "dependency" | "root";
};

// Bump this on every behavior change so the Figma UI badge confirms which
// build is running (Figma re-reads code.js per run, but the badge removes doubt).
const PLUGIN_VERSION = "1.9.0 (2026-07-30)";

const SUPPORTED_PAYLOAD_VERSIONS = [1, 2] as const;
const DEFAULT_TOKEN_PLUGIN_DATA_KEY = "storybookCssToken";
const LEGACY_CM_TOKEN_PLUGIN_DATA_KEY = "cmCssToken";
const STORYBOOK_COMPONENT_PLUGIN_DATA_KEY = "storybookComponentKey";
const COMPONENT_SET_GRID_GAP = 32;
const COMPONENT_SET_GRID_MIN_CELL_WIDTH = 96;
const COMPONENT_SET_GRID_MIN_CELL_HEIGHT = 72;
const COMPONENT_SET_GRID_COMPACT_MAX_SIZE = 96;
const COMPONENT_SET_GRID_MEDIUM_MAX_SIZE = 180;
const COMPONENT_SET_GRID_COMPACT_COLUMNS = 8;
const COMPONENT_SET_GRID_MEDIUM_COLUMNS = 4;
const COMPONENTS_PAGE_NAME = "Components";
const COMPONENT_SECTION_GAP = 160;
const COMPONENT_SECTION_MIN_HEIGHT = 160;
const COMPONENT_SECTION_MIN_WIDTH = 240;
const COMPONENT_SECTION_PADDING = 64;
const COMPONENT_SECTION_PLUGIN_DATA_KEY = "storybookComponentSectionKey";
const REFERENCE_IMAGE_PLUGIN_DATA_KEY = "storybookReferenceImage";
const REFERENCE_IMAGE_GAP = 64;
const COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY = "storybookComponentSpecHash";
const COMPONENT_SECTION_ROLE_PLUGIN_DATA_KEY = "storybookComponentSectionRole";
const STORYBOOK_STORY_PLUGIN_DATA_KEY = "storybookStoryId";
const COLLECTION_NAMES: Record<TokenCollection, string> = {
  comp: "comp",
  ref: "ref",
  sys: "sys",
};
const COLLECTION_ORDER: Record<TokenCollection, number> = {
  ref: 0,
  sys: 1,
  comp: 2,
};
const INDIVIDUAL_RADIUS_BINDING_FIELDS = [
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
];

figma.showUI(__html__, {
  height: 600,
  themeColors: true,
  width: 440,
});
figma.ui.postMessage({ type: "plugin-version", version: PLUGIN_VERSION });

figma.ui.onmessage = (msg: ImportMessage) => {
  if (msg.type === "cancel") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "import-json") {
    void importFromJson(msg.json, msg.includeReference === true);
  }
};

async function importFromJson(json: string, includeReference: boolean): Promise<void> {
  figma.ui.postMessage({ status: "importing", type: "import-status" });

  try {
    const payload = parsePayload(json);
    const stats = await importStorybookDesign(payload, includeReference);

    figma.ui.postMessage({
      stats,
      type: "import-complete",
    });
    figma.notify(
      `Imported ${payload.componentTitle} / ${payload.storyName} as ${stats.rootType ?? "node"}: ${stats.nodesCreated} nodes, ${stats.tokensChecked} variables checked. (plugin v${PLUGIN_VERSION})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({
      message,
      type: "import-error",
    });
    figma.notify(`Storybook Code To Design import failed: ${message}`, { error: true });
  }
}

async function importStorybookDesign(
  payload: FigmaExportPayload,
  includeReference = false,
): Promise<ImportStats> {
  await figma.loadAllPagesAsync();
  const artifactKind = getPayloadArtifactKind(payload);
  const shouldImportAsComponent = artifactKind === "component";
  const targetPage = shouldImportAsComponent
    ? await getOrCreateComponentsPage()
    : await getPageArtifactTargetPage(payload);
  await setCurrentPageIfNeeded(targetPage);

  const context = createImportContext(payload);
  await context.upsertVariables();
  if (!shouldImportAsComponent) {
    await context.preparePageComponentDefinitions(payload.root);
  }

  const rootComponent = getPayloadRootComponent(payload, artifactKind);
  const rootNode: SceneNode =
    shouldImportAsComponent &&
    rootComponent &&
    context.canCreateComponentDefinition(payload.root)
      ? await context.ensureComponentDefinition(
          payload.root,
          rootComponent,
          payload.root.name,
          { reuseComponents: true },
        )
      : shouldImportAsComponent
        ? await context.createComponentSetFromVariants(
            payload.root,
            payload.componentTitle,
          )
      : await context.createNode(payload.root, payload.root.name, {
          isRoot: true,
          reuseComponents: true,
        });

  if (shouldImportAsComponent && rootComponent) {
    rootNode.name = getComponentDisplayName(rootComponent);
  } else if (rootNode.type !== "COMPONENT_SET") {
    rootNode.name = `${payload.componentTitle} / ${payload.storyName}`;
  }

  const componentViewportNode = shouldImportAsComponent
    ? getComponentImportViewportNode(rootNode)
    : rootNode;
  const viewportNode = shouldImportAsComponent
    ? placeComponentImportInSection(componentViewportNode, payload, targetPage)
    : rootNode;
  const componentDefinitionsPage = shouldImportAsComponent
    ? targetPage
    : context.getComponentDefinitionParentPage();
  const dependencySections = context.organizeComponentDependencySections(
    rootNode,
    componentDefinitionsPage,
  );

  if (!shouldImportAsComponent) {
    rootNode.x = 0;
    rootNode.y = 0;
  }
  if (!rootNode.parent) figma.currentPage.appendChild(rootNode);
  if (viewportNode.parent === figma.currentPage) {
    figma.currentPage.selection = [viewportNode];
  }
  if (includeReference) {
    placeBrowserReferenceImage(
      payload,
      shouldImportAsComponent ? componentViewportNode : rootNode,
      viewportNode,
      targetPage,
      context.stats,
    );
  }
  cleanupEmptyManagedSections(componentDefinitionsPage);
  figma.viewport.scrollAndZoomIntoView([viewportNode]);

  context.stats.artifactKind = artifactKind;
  context.stats.importedAsComponent = shouldImportAsComponent;
  context.stats.componentSectionsOrganized =
    dependencySections.length + (viewportNode.type === "SECTION" ? 1 : 0);
  context.stats.rootName = rootNode.name;
  context.stats.rootType = rootNode.type;
  context.stats.targetPageName = targetPage.name;
  if (viewportNode.type === "SECTION") {
    context.stats.sectionName = viewportNode.name;
  }
  context.reportFontEnvironmentFault();

  return context.stats;
}

function getPayloadArtifactKind(payload: FigmaExportPayload): FigmaExportArtifactKind {
  if (payload.artifactKind) return payload.artifactKind;
  if (payload.storyTitle?.startsWith("Pages/")) return "page";
  return "component";
}

function getPayloadRootComponent(
  payload: FigmaExportPayload,
  artifactKind: FigmaExportArtifactKind,
): FigmaComponentReference | undefined {
  if (artifactKind !== "component") return undefined;
  return payload.component ?? payload.root.component;
}

async function getOrCreateComponentsPage(): Promise<PageNode> {
  const existing = figma.root.children.find(
    (page) => page.name === COMPONENTS_PAGE_NAME,
  );
  if (existing) return existing;

  const page = figma.createPage();
  page.name = COMPONENTS_PAGE_NAME;
  return page;
}

async function setCurrentPageIfNeeded(page: PageNode): Promise<void> {
  if (figma.currentPage.id === page.id) return;
  await figma.setCurrentPageAsync(page);
}

async function getPageArtifactTargetPage(
  payload: FigmaExportPayload,
): Promise<PageNode> {
  const componentsPageName =
    payload.componentSystem?.componentsPageName?.trim() || COMPONENTS_PAGE_NAME;
  if (figma.currentPage.name.toLowerCase() !== componentsPageName.toLowerCase()) {
    return figma.currentPage;
  }

  const pageName = getPageArtifactPageName(payload);
  const existing = figma.root.children.find(
    (page) => page.name.toLowerCase() === pageName.toLowerCase(),
  );
  if (existing) return existing;

  const page = figma.createPage();
  page.name = pageName;
  return page;
}

function getPageArtifactPageName(payload: FigmaExportPayload): string {
  const title = (payload.storyTitle || payload.componentTitle || "").trim();
  const normalizedTitle = title.startsWith("Pages/")
    ? title.slice("Pages/".length)
    : title;
  return normalizedTitle.replace(/\//g, " / ") || "Storybook Pages";
}

function placeComponentImportInSection(
  rootNode: SceneNode,
  payload: FigmaExportPayload,
  targetPage: PageNode,
): SectionNode {
  const rootComponent = getComponentImportSectionReference(rootNode, payload);
  const shouldUseComponentSection = Boolean(
    rootComponent && (rootComponent.variant || rootNode.type === "COMPONENT_SET"),
  );

  return placeNodeInComponentSection(rootNode, targetPage, {
    key:
      shouldUseComponentSection && rootComponent
        ? getComponentReferenceSectionKey(rootComponent)
        : getRootComponentSectionKey(payload),
    metadata: {
      componentTitle: payload.componentTitle,
      storyId: payload.storyId,
      storyName: payload.storyName,
    },
    name:
      shouldUseComponentSection && rootComponent
        ? getComponentReferenceSectionName(rootComponent)
        : getComponentSectionName(payload),
    role: "root",
  });
}

function getComponentImportSectionReference(
  rootNode: SceneNode,
  payload: FigmaExportPayload,
): FigmaComponentReference | undefined {
  const rootComponent = getPayloadRootComponent(payload, "component");
  if (rootComponent) return rootComponent;
  if (rootNode.type !== "COMPONENT_SET") return undefined;

  const name =
    getNodePluginData(rootNode, "storybookComponentName") ||
    payload.componentTitle ||
    rootNode.name ||
    "Component";
  const sourceName = getNodePluginData(rootNode, "storybookComponentSource") || name;

  return {
    key: `component:${sourceName}`,
    name,
    sourceName,
  };
}

function getComponentImportViewportNode(rootNode: SceneNode): SceneNode {
  if (rootNode.type === "COMPONENT" && rootNode.parent?.type === "COMPONENT_SET") {
    return rootNode.parent;
  }
  return rootNode;
}

function placeNodeInComponentSection(
  node: ComponentNode | ComponentSetNode | SceneNode,
  targetPage: PageNode,
  target: Omit<ComponentSectionTarget, "node">,
): SectionNode {
  const { created, section } = getOrCreateComponentSection(
    targetPage,
    target.name,
    target.key,
  );

  configureComponentSection(section, target);

  if (created) {
    positionNewComponentSection(section, targetPage);
  }

  for (const child of [...section.children]) {
    if (child.id !== node.id) child.remove();
  }

  if (node.parent !== section) {
    section.appendChild(node);
  }

  node.x = COMPONENT_SECTION_PADDING;
  node.y = COMPONENT_SECTION_PADDING;
  resizeSectionToChild(section, node);

  return section;
}

function getOrCreateComponentSection(
  targetPage: PageNode,
  sectionName: string,
  sectionKey: string,
): { created: boolean; section: SectionNode } {
  const existing = targetPage.children.find((node): node is SectionNode => {
    return (
      node.type === "SECTION" &&
      (getNodePluginData(node, COMPONENT_SECTION_PLUGIN_DATA_KEY) === sectionKey ||
        getNodePluginData(node, STORYBOOK_STORY_PLUGIN_DATA_KEY) === sectionKey ||
        node.name === sectionName)
    );
  });

  if (existing) return { created: false, section: existing };

  const section = figma.createSection();
  if (section.parent !== targetPage) {
    targetPage.appendChild(section);
  }
  return { created: true, section };
}

function configureComponentSection(
  section: SectionNode,
  target: Omit<ComponentSectionTarget, "node">,
): void {
  section.name = target.name;
  section.fills = [whitePaint()];
  section.strokes = [];
  setNodePluginData(section, COMPONENT_SECTION_PLUGIN_DATA_KEY, target.key);
  setNodePluginData(section, COMPONENT_SECTION_ROLE_PLUGIN_DATA_KEY, target.role);

  if (target.metadata?.storyId) {
    setNodePluginData(section, STORYBOOK_STORY_PLUGIN_DATA_KEY, target.metadata.storyId);
  }
  if (target.metadata?.componentTitle) {
    setNodePluginData(
      section,
      "storybookComponentTitle",
      target.metadata.componentTitle,
    );
  }
  if (target.metadata?.storyName) {
    setNodePluginData(section, "storybookStoryName", target.metadata.storyName);
  }
}

function getComponentSectionName(payload: FigmaExportPayload): string {
  const componentTitle = payload.componentTitle.trim() || "Component";
  const storyName = payload.storyName.trim();
  return storyName ? `${componentTitle} / ${storyName}` : componentTitle;
}

function getRootComponentSectionKey(payload: FigmaExportPayload): string {
  return `story:${payload.storyId}`;
}

function getComponentReferenceSectionKey(component: FigmaComponentReference): string {
  const source = String(component.sourceName || component.name || component.key).trim();
  return `component:${source || component.key}`;
}

function getComponentReferenceSectionName(component: FigmaComponentReference): string {
  return component.name || component.sourceName || "Component";
}

function cleanupEmptyManagedSections(targetPage: PageNode): void {
  for (const node of [...targetPage.children]) {
    if (node.type !== "SECTION") continue;
    const isManagedSection = Boolean(
      getNodePluginData(node, COMPONENT_SECTION_PLUGIN_DATA_KEY) ||
        getNodePluginData(node, STORYBOOK_STORY_PLUGIN_DATA_KEY),
    );
    if (isManagedSection && node.children.length === 0) {
      node.remove();
    }
  }
}

// Places the exporter's browser-render snapshot as a locked layer next to
// the import, so node-graph gaps are immediately visible inside Figma.
function placeBrowserReferenceImage(
  payload: FigmaExportPayload,
  anchorNode: SceneNode,
  viewportNode: SceneNode,
  targetPage: PageNode,
  stats: ImportStats,
): void {
  const reference = payload.reference;
  if (!reference) return;

  let frame: FrameNode;
  try {
    const bytes = figma.base64Decode(reference.imageBase64);
    const image = figma.createImage(bytes);
    frame = figma.createFrame();
    frame.name = "Browser Reference";
    frame.resize(
      Math.max(1, safeNumber(reference.width, 1)),
      Math.max(1, safeNumber(reference.height, 1)),
    );
    frame.fills = [{ imageHash: image.hash, scaleMode: "FILL", type: "IMAGE" }];
  } catch (error) {
    stats.warnings.push(
      `Could not create the browser reference image: ${formatError(error)}`,
    );
    return;
  }

  setNodePluginData(frame, REFERENCE_IMAGE_PLUGIN_DATA_KEY, payload.storyId);

  const container: PageNode | SectionNode =
    viewportNode.type === "SECTION" ? viewportNode : targetPage;
  for (const child of [...container.children]) {
    if (
      child.id !== frame.id &&
      getNodePluginData(child, REFERENCE_IMAGE_PLUGIN_DATA_KEY) === payload.storyId
    ) {
      child.remove();
    }
  }
  container.appendChild(frame);

  const anchorWidth = getSceneNodeWidth(anchorNode);
  if (container.type === "SECTION") {
    frame.x = COMPONENT_SECTION_PADDING + anchorWidth + REFERENCE_IMAGE_GAP;
    frame.y = COMPONENT_SECTION_PADDING;
    container.resizeWithoutConstraints(
      Math.max(
        safeNumber(container.width, 0),
        frame.x + safeNumber(frame.width, 0) + COMPONENT_SECTION_PADDING,
      ),
      Math.max(
        safeNumber(container.height, 0),
        frame.y + safeNumber(frame.height, 0) + COMPONENT_SECTION_PADDING,
      ),
    );
  } else {
    frame.x =
      safeNumber((anchorNode as SceneNode & { x?: number }).x, 0) +
      anchorWidth +
      REFERENCE_IMAGE_GAP;
    frame.y = safeNumber((anchorNode as SceneNode & { y?: number }).y, 0);
  }

  frame.locked = true;
  stats.referencePlaced = true;
}

function collectSceneNodeIds(node: SceneNode, ids = new Set<string>()): Set<string> {
  ids.add(node.id);

  if (!("children" in node)) return ids;

  for (const child of node.children) {
    if ("visible" in child) collectSceneNodeIds(child, ids);
  }

  return ids;
}

function positionNewComponentSection(section: SectionNode, targetPage: PageNode): void {
  const existingSections = targetPage.children.filter(
    (node): node is SectionNode => node.type === "SECTION" && node.id !== section.id,
  );
  const nextY =
    existingSections.length === 0
      ? 0
      : Math.max(
          ...existingSections.map((node) => node.y + safeNumber(node.height, 0)),
        ) + COMPONENT_SECTION_GAP;

  section.x = 0;
  section.y = nextY;
}

function resizeSectionToChild(section: SectionNode, child: SceneNode): void {
  section.resizeWithoutConstraints(
    Math.max(
      COMPONENT_SECTION_MIN_WIDTH,
      getSceneNodeWidth(child) + COMPONENT_SECTION_PADDING * 2,
    ),
    Math.max(
      COMPONENT_SECTION_MIN_HEIGHT,
      getSceneNodeHeight(child) + COMPONENT_SECTION_PADDING * 2,
    ),
  );
}

function getSceneNodeWidth(node: SceneNode): number {
  return safeNumber((node as SceneNode & { width?: number }).width, 1);
}

function getSceneNodeHeight(node: SceneNode): number {
  return safeNumber((node as SceneNode & { height?: number }).height, 1);
}

function whitePaint(): SolidPaint {
  return {
    color: { b: 1, g: 1, r: 1 },
    opacity: 1,
    type: "SOLID",
  };
}

function createImportContext(payload: FigmaExportPayload) {
  const artifactKind = getPayloadArtifactKind(payload);
  const tokens = payload.tokens;
  const collectionNames = {
    ...COLLECTION_NAMES,
    ...(payload.tokenSystem?.collections ?? {}),
  };
  const tokenPluginDataKey =
    payload.tokenSystem?.pluginDataKey ?? DEFAULT_TOKEN_PLUGIN_DATA_KEY;
  const componentPluginDataKey =
    payload.componentSystem?.pluginDataKey ?? STORYBOOK_COMPONENT_PLUGIN_DATA_KEY;
  const tokenByCssName = new Map(tokens.map((token) => [token.cssName, token]));
  const fontFamilyTokenNames = collectFontFamilyTokenNames(payload.root, tokenByCssName);
  const registry = new Map<string, Variable>();
  const componentRegistry = new Map<string, ComponentNode>();
  const componentDefinitionRecords = new Map<string, ComponentDefinitionRecord>();
  const componentSetRecords = new Map<string, ComponentSetRecord>();
  const warnedVariantPropertyNodeIds = new Set<string>();
  const loadedExistingFontKeys = new Set<string>();
  let componentDefinitionOffsetY = 0;
  const stats: ImportStats = {
    componentDefinitionsPrepared: 0,
    componentsCreated: 0,
    fontSubstitutions: [],
    nodesCreated: 0,
    reusedComponents: 0,
    reusedVariables: 0,
    tokensChecked: tokens.length,
    variablesCreated: 0,
    warnings: [],
  };

  function warn(message: string): void {
    stats.warnings.push(message);
  }

  // Existing nodes (earlier imports, manual edits) can use fonts this run
  // never loaded, and Figma rejects any relayouting operation — appendChild
  // into a component set, resize, alignment — on trees with unloaded fonts.
  // Returns the fonts that could not be loaded so callers can skip the node
  // instead of failing the whole import.
  async function preloadNodeTreeFonts(node: BaseNode): Promise<FontName[]> {
    const failed: FontName[] = [];

    async function visit(current: BaseNode): Promise<void> {
      if (current.type === "TEXT") {
        const text = current as TextNode;
        const fonts: FontName[] = [];
        if (text.fontName !== figma.mixed) fonts.push(text.fontName as FontName);
        try {
          if (text.characters.length > 0) {
            fonts.push(...text.getRangeAllFontNames(0, text.characters.length));
          }
        } catch {
          // Range inspection is best-effort; fontName covers the common case.
        }
        for (const font of fonts) {
          const key = `${font.family}\n${font.style}`;
          if (loadedExistingFontKeys.has(key)) continue;
          try {
            await figma.loadFontAsync(font);
            loadedExistingFontKeys.add(key);
          } catch {
            failed.push(font);
          }
        }
      }

      const children = (current as NodeWithChildren).children;
      if (children) {
        for (const child of children) {
          await visit(child);
        }
      }
    }

    await visit(node);
    return failed;
  }

  function describeFont(font: FontName | undefined): string {
    return font ? `${font.family} ${font.style}` : "unknown font";
  }

  async function upsertVariables(): Promise<void> {
    const sorted = [...tokens].sort((a, b) => {
      const byCollection =
        COLLECTION_ORDER[a.collection] - COLLECTION_ORDER[b.collection];
      return byCollection || a.figmaName.localeCompare(b.figmaName);
    });

    for (const token of sorted) {
      await upsertVariable(token, []);
    }
  }

  async function upsertVariable(
    spec: FigmaExportToken,
    stack: string[],
  ): Promise<Variable> {
    const registered = registry.get(spec.cssName);
    if (registered) return registered;

    if (stack.includes(spec.cssName)) {
      throw new Error(`Circular token alias detected: ${[...stack, spec.cssName].join(" -> ")}`);
    }

    let aliasTarget: Variable | undefined;
    if (spec.alias) {
      const aliasSpec = tokenByCssName.get(spec.alias);
      aliasTarget = aliasSpec
        ? await upsertVariable(aliasSpec, [...stack, spec.cssName])
        : await findVariableByCssToken(spec.alias, tokenPluginDataKey);

      if (!aliasTarget) {
        throw new Error(`Missing alias target ${spec.alias} for ${spec.cssName}`);
      }
    }

    const collection = await getCollection(spec.collection, collectionNames);
    const modeId = collection.modes[0].modeId;
    let variable = await findExistingVariable(collection, spec, tokenPluginDataKey);

    if (variable && variable.resolvedType !== spec.type) {
      throw new Error(
        `Variable type mismatch for ${spec.cssName}: existing ${variable.resolvedType}, export ${spec.type}`,
      );
    }

    if (variable) {
      stats.reusedVariables += 1;
    } else {
      variable = figma.variables.createVariable(spec.figmaName, collection, spec.type);
      stats.variablesCreated += 1;
    }

    setVariableMetadata(variable, spec);
    setVariableValue(variable, modeId, spec, aliasTarget);
    registry.set(spec.cssName, variable);

    return variable;
  }

  function setVariableMetadata(variable: Variable, spec: FigmaExportToken): void {
    if (Array.isArray(spec.scopes) && spec.scopes.length > 0) {
      try {
        variable.scopes = spec.scopes as VariableScope[];
      } catch (error) {
        warn(`Could not set scopes for ${spec.cssName}: ${formatError(error)}`);
      }
    }

    try {
      (variable as VariableWithCodeSyntax).setVariableCodeSyntax?.(
        "WEB",
        `var(${spec.cssName})`,
      );
    } catch (error) {
      warn(`Could not set code syntax for ${spec.cssName}: ${formatError(error)}`);
    }

    try {
      setVariablePluginData(variable, tokenPluginDataKey, spec.cssName);
      if (tokenPluginDataKey !== LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) {
        setVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY, spec.cssName);
      }
    } catch (error) {
      warn(`Could not set plugin data for ${spec.cssName}: ${formatError(error)}`);
    }
  }

  function setVariableValue(
    variable: Variable,
    modeId: string,
    spec: FigmaExportToken,
    aliasTarget: Variable | undefined,
  ): void {
    if (spec.alias) {
      if (!aliasTarget) {
        throw new Error(`Missing alias target ${spec.alias} for ${spec.cssName}`);
      }
      variable.setValueForMode(modeId, {
        id: aliasTarget.id,
        type: "VARIABLE_ALIAS",
      });
      return;
    }

    variable.setValueForMode(
      modeId,
      normalizeVariableValue(spec, fontFamilyTokenNames),
    );
  }

  async function createNode(
    spec: FigmaExportNode,
    path: string,
    options: CreateNodeOptions = {},
  ): Promise<SceneNode> {
    if (
      options.reuseComponents &&
      !options.isRoot &&
      spec.component?.key &&
      canCreateComponentDefinition(spec)
    ) {
      const existing = await findLocalComponent(spec.component);
      if (
        !existing ||
        getNodePluginData(existing, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY) ===
          getComponentSpecHash(spec)
      ) {
        const instance = await createComponentInstance(spec, spec.component, path, options);
        stats.nodesCreated += 1;
        return instance;
      }
      // The shared definition was built from different content. Instancing it
      // would show the wrong text/structure, so build a plain subtree instead.
    }

    const node =
      spec.kind === "text"
        ? await createTextNode(spec, path, options)
        : spec.kind === "image" || spec.kind === "svg"
          ? createImageNode(spec, path)
          : await createFrameNode(spec, path, options, false);

    node.x = safeNumber(spec.styles.x, 0);
    node.y = safeNumber(spec.styles.y, 0);
    stats.nodesCreated += 1;
    return node;
  }

  async function createFrameNode(
    spec: FigmaExportNode,
    path: string,
    options: CreateNodeOptions,
    asComponent: boolean,
  ): Promise<FrameLikeNode> {
    const node = asComponent ? figma.createComponent() : figma.createFrame();
    const styles = spec.styles;
    const bindings = spec.bindings ?? {};

    node.name = spec.name || "frame";
    safeResize(node, styles.width, styles.height, path);
    node.clipsContent = shouldClipContent(styles.overflow);
    node.opacity = clamp(safeNumber(styles.opacity, 1), 0, 1);
    setFrameFills(node, spec, path);
    setStrokes(node, styles, bindings, path);
    applyRadius(node, styles, bindings, path);
    applyEffects(node, collectSpecEffects(styles), path);
    applyAutoLayout(node, styles, bindings, path);

    safeBindNumberMatched(node, "width", bindings.width, styles.width, path);
    safeBindNumberMatched(node, "height", bindings.height, styles.height, path);
    safeBindNumberMatched(node, "opacity", bindings.opacity, styles.opacity, path);
    if (!styles.borderSides) {
      safeBindNumberMatched(node, "strokeWeight", bindings.borderWidth, styles.borderWidth, path);
    }

    for (const childSpec of spec.children ?? []) {
      const childOptions = {
        ...options,
        inferredTextAlignHorizontal:
          childSpec.kind === "text"
            ? getInferredChildTextAlignHorizontal(node)
            : undefined,
        isRoot: false,
      };
      const child = await createNode(
        childSpec,
        `${path}/${childSpec.name}`,
        childOptions,
      );
      node.appendChild(child);
      applyAutoLayoutChildSizing(node, child, childSpec, `${path}/${childSpec.name}`);
      applyChildPlacement(node, child, childSpec, `${path}/${childSpec.name}`);
      if (child.type === "TEXT") {
        applyTextAlignHorizontal(
          child,
          childSpec,
          childOptions,
          `${path}/${childSpec.name}`,
        );
      }
      if (node.layoutMode === "NONE") {
        child.x = safeNumber(childSpec.styles.x, 0);
        child.y = safeNumber(childSpec.styles.y, 0);
        applyChildTransformMatrix(child, childSpec, `${path}/${childSpec.name}`);
      }
    }

    return node;
  }

  async function ensureComponentDefinition(
    spec: FigmaExportNode,
    component: FigmaComponentReference,
    path: string,
    options: CreateNodeOptions = {},
  ): Promise<ComponentNode> {
    const existing = await findLocalComponent(component);
    if (existing) {
      if (
        componentDefinitionRecords.has(component.key) &&
        getNodePluginData(existing, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY) !==
          getComponentSpecHash(spec)
      ) {
        warn(
          `Duplicate variant name "${getComponentDisplayName(component)}" with different content at ${path}; the later design overwrote the earlier one. Give each export item a distinct figmaVariant.`,
        );
      }
      const failedFonts = await preloadNodeTreeFonts(existing);
      if (failedFonts.length > 0) {
        warn(
          `Existing component "${existing.name}" uses ${failedFonts.length} font(s) that could not be loaded (e.g. ${describeFont(failedFonts[0])}); its previous text is replaced from the export.`,
        );
      }
      if (spec.kind === "frame") {
        // Children are rebuilt from the spec below; removing them first is
        // font-free, so resize and auto-layout never touch stale text.
        for (const child of [...existing.children]) {
          child.remove();
        }
      }
      syncExistingFrameFromSpec(existing, spec, path);
      await syncExistingFrameChildrenFromSpec(existing, spec, path, {
        ...options,
        isRoot: false,
        reuseComponents: true,
      });
      applyTextAlignmentFromSpec(existing, spec, options, path);
      setNodePluginData(
        existing,
        COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY,
        getComponentSpecHash(spec),
      );
      trackComponentDefinition(existing, component);
      if (component.variant && options.autoAttachComponentSet !== false) {
        const componentSet = await attachVariantComponentToSet(existing, component);
        if (componentSet) {
          trackComponentSet(componentSet, component);
        }
      }
      moveExistingComponentDefinitionToTargetPage(existing);
      stats.reusedComponents += 1;
      return existing;
    }

    const componentNode =
      (spec.kind === "image" || spec.kind === "svg") && spec.svgText
        ? figma.createComponentFromNode(createSvgSceneNode(spec, path))
        : ((await createFrameNode(
            spec,
            path,
            { ...options, autoAttachComponentSet: true, reuseComponents: true },
            true,
          )) as ComponentNode);
    componentNode.name = getComponentDisplayName(component);
    tagComponentNode(componentNode, component);
    setNodePluginData(
      componentNode,
      COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY,
      getComponentSpecHash(spec),
    );
    componentRegistry.set(component.key, componentNode);
    trackComponentDefinition(componentNode, component);
    stats.componentsCreated += 1;
    stats.nodesCreated += 1;

    if (component.variant && options.autoAttachComponentSet !== false) {
      const componentSet = await attachVariantComponentToSet(componentNode, component);
      if (componentSet) {
        trackComponentSet(componentSet, component);
        return componentNode;
      }
    }

    parkComponentDefinition(componentNode);
    return componentNode;
  }

  async function createComponentInstance(
    spec: FigmaExportNode,
    component: FigmaComponentReference,
    path: string,
    options: CreateNodeOptions,
  ): Promise<InstanceNode> {
    const componentNode = await ensureComponentDefinition(spec, component, path, options);
    const instance = componentNode.createInstance();
    instance.name = component.name;
    safeResize(instance, spec.styles.width, spec.styles.height, path);
    instance.x = safeNumber(spec.styles.x, 0);
    instance.y = safeNumber(spec.styles.y, 0);
    return instance;
  }

  async function createComponentSetFromVariants(
    root: FigmaExportNode,
    fallbackName: string,
  ): Promise<SceneNode> {
    const componentSpecs = collectComponentDefinitionSpecs(root, root.name);
    const variantSpecs = componentSpecs.filter((entry) =>
      Boolean(entry.component.variant),
    );
    const variantGroups = groupVariantComponentSpecs(variantSpecs);
    const variantGroup = chooseVariantGroup(variantGroups, fallbackName);

    // A group that matched the component title but holds a single variant is a
    // plain component, not a set — combining one node into a variant set would
    // misrepresent it.
    if (variantGroup && variantGroup.length < 2) {
      const only = variantGroup[0];
      return ensureComponentDefinition(only.spec, only.component, only.path, {
        autoAttachComponentSet: true,
        reuseComponents: true,
      });
    }

    if (!variantGroup) {
      const componentSpec = chooseComponentDefinitionSpec(componentSpecs, fallbackName);
      if (componentSpec) {
        return ensureComponentDefinition(
          componentSpec.spec,
          componentSpec.component,
          componentSpec.path,
          { autoAttachComponentSet: true, reuseComponents: true },
        );
      }

      return createNode(root, root.name, {
        isRoot: true,
        reuseComponents: false,
      });
    }

    const existingSet = await findExistingComponentSet(
      variantGroup.map((entry) => entry.component),
    );
    if (existingSet) {
      for (const entry of variantGroup) {
        await ensureComponentDefinition(entry.spec, entry.component, entry.path, {
          autoAttachComponentSet: true,
          reuseComponents: true,
        });
      }
      await attachStandaloneVariantComponentsToSet(existingSet, variantGroup[0].component);
      tagVariantComponentSet(existingSet, variantGroup[0].component);
      normalizeComponentSetVariantNames(existingSet, variantGroup[0].component);
      layoutVariantComponentSet(existingSet);
      trackComponentSet(existingSet, variantGroup[0].component);
      return existingSet;
    }

    const componentNodes: ComponentNode[] = [];
    for (const entry of variantGroup) {
      const componentNode = await ensureComponentDefinition(
        entry.spec,
        entry.component,
        entry.path,
        {
          autoAttachComponentSet: false,
          reuseComponents: true,
        },
      );
      prepareVariantNodeForComponentSet(componentNode, entry.component);
      componentNodes.push(componentNode);
    }

    try {
      const componentSet = figma.combineAsVariants(
        await getStandaloneVariantNodesForNewSet(componentNodes, variantGroup[0].component),
        figma.currentPage,
      );
      componentSet.name = variantGroup[0].component.name || fallbackName;
      tagVariantComponentSet(componentSet, variantGroup[0].component);
      normalizeComponentSetVariantNames(componentSet, variantGroup[0].component);
      layoutVariantComponentSet(componentSet);
      trackComponentSet(componentSet, variantGroup[0].component);
      return componentSet;
    } catch (error) {
      warn(`Could not combine component variants: ${formatError(error)}`);
      return createNode(root, root.name, {
        isRoot: true,
        reuseComponents: true,
      });
    }
  }

  function syncExistingFrameFromSpec(
    node: FrameLikeNode,
    spec: FigmaExportNode,
    path: string,
  ): void {
    if (spec.kind !== "frame") return;

    const styles = spec.styles;
    const bindings = spec.bindings ?? {};

    safeResize(node, styles.width, styles.height, path);
    node.clipsContent = shouldClipContent(styles.overflow);
    node.opacity = clamp(safeNumber(styles.opacity, 1), 0, 1);
    setFrameFills(node, spec, path);
    setStrokes(node, styles, bindings, path);
    applyRadius(node, styles, bindings, path);
    applyEffects(node, collectSpecEffects(styles), path);
    applyAutoLayout(node, styles, bindings, path);

    safeBindNumberMatched(node, "width", bindings.width, styles.width, path);
    safeBindNumberMatched(node, "height", bindings.height, styles.height, path);
    safeBindNumberMatched(node, "opacity", bindings.opacity, styles.opacity, path);
    if (!styles.borderSides) {
      safeBindNumberMatched(node, "strokeWeight", bindings.borderWidth, styles.borderWidth, path);
    }
  }

  async function syncExistingFrameChildrenFromSpec(
    node: FrameLikeNode,
    spec: FigmaExportNode,
    path: string,
    options: CreateNodeOptions,
  ): Promise<void> {
    if (spec.kind !== "frame") return;

    for (const child of [...node.children]) {
      child.remove();
    }

    for (const childSpec of spec.children ?? []) {
      const childOptions = {
        ...options,
        inferredTextAlignHorizontal:
          childSpec.kind === "text"
            ? getInferredChildTextAlignHorizontal(node)
            : undefined,
        isRoot: false,
      };
      const childPath = `${path}/${childSpec.name}`;
      const child = await createNode(childSpec, childPath, childOptions);

      node.appendChild(child);
      applyAutoLayoutChildSizing(node, child, childSpec, childPath);
      applyChildPlacement(node, child, childSpec, childPath);
      if (child.type === "TEXT") {
        applyTextAlignHorizontal(child, childSpec, childOptions, childPath);
      }
      if (node.layoutMode === "NONE") {
        child.x = safeNumber(childSpec.styles.x, 0);
        child.y = safeNumber(childSpec.styles.y, 0);
        applyChildTransformMatrix(child, childSpec, childPath);
      }
    }
  }

  function collectComponentDefinitionSpecs(
    node: FigmaExportNode,
    path: string,
    depth = 0,
  ): VariantComponentSpec[] {
    const entries: VariantComponentSpec[] = [];
    if (node.component?.key && canCreateComponentDefinition(node)) {
      entries.push({ component: node.component, depth, path, spec: node });
    }

    for (const child of node.children ?? []) {
      entries.push(
        ...collectComponentDefinitionSpecs(child, `${path}/${child.name}`, depth + 1),
      );
    }

    return entries;
  }

  function collectPageComponentDefinitionSpecs(
    root: FigmaExportNode,
  ): VariantComponentSpec[] {
    const seen = new Set<string>();
    return collectComponentDefinitionSpecs(root, root.name).filter((entry) => {
      if (entry.depth === 0) return false;
      if (seen.has(entry.component.key)) return false;
      seen.add(entry.component.key);
      return true;
    });
  }

  async function preparePageComponentDefinitions(root: FigmaExportNode): Promise<void> {
    if (artifactKind !== "page") return;

    for (const entry of collectPageComponentDefinitionSpecs(root)) {
      await ensureComponentDefinition(entry.spec, entry.component, entry.path, {
        reuseComponents: true,
      });
      stats.componentDefinitionsPrepared =
        safeNumber(stats.componentDefinitionsPrepared, 0) + 1;
    }
  }

  function chooseComponentDefinitionSpec(
    entries: VariantComponentSpec[],
    fallbackName: string,
  ): VariantComponentSpec | undefined {
    return [...entries].sort((a, b) => {
      const preferredDelta =
        Number(componentDefinitionMatchesFallback(b, fallbackName)) -
        Number(componentDefinitionMatchesFallback(a, fallbackName));
      if (preferredDelta !== 0) return preferredDelta;

      const depthDelta = a.depth - b.depth;
      if (depthDelta !== 0) return depthDelta;

      return getComponentSpecArea(b) - getComponentSpecArea(a);
    })[0];
  }

  function componentDefinitionMatchesFallback(
    entry: VariantComponentSpec,
    fallbackName: string,
  ): boolean {
    const expectedName = normalizeComponentIdentity(fallbackName);
    if (!expectedName) return false;

    return (
      normalizeComponentIdentity(entry.component.name) === expectedName ||
      normalizeComponentIdentity(entry.component.sourceName) === expectedName
    );
  }

  function getComponentSpecArea(entry: VariantComponentSpec): number {
    return (
      Math.max(1, safeNumber(entry.spec.styles.width, 1)) *
      Math.max(1, safeNumber(entry.spec.styles.height, 1))
    );
  }

  function chooseVariantGroup(
    groups: VariantComponentSpec[][],
    fallbackName: string,
  ): VariantComponentSpec[] | undefined {
    const selection = selectVariantGroup(groups, fallbackName);
    recordVariantGroupSelection(selection);
    if (selection.selectedIndex < 0) return undefined;
    return groups[selection.selectedIndex];
  }

  function recordVariantGroupSelection(selection: VariantGroupSelection): void {
    stats.variantGroupSelected =
      selection.selectedIndex < 0 ? null : selection.selectedIdentity;
    stats.variantGroupsSkipped = selection.skippedIdentities;
    if (selection.selectedIndex < 0 && selection.skippedIdentities.length) {
      warn(
        `No variant group matched the component title; reconstructed the payload tree instead of ${selection.skippedIdentities.join(", ")}.`,
      );
    }
  }

  function groupVariantComponentSpecs(
    entries: VariantComponentSpec[],
  ): VariantComponentSpec[][] {
    const groups = new Map<string, VariantComponentSpec[]>();
    for (const entry of entries) {
      const groupKey = entry.component.sourceName || entry.component.name;
      const group = groups.get(groupKey) ?? [];
      group.push(entry);
      groups.set(groupKey, group);
    }
    return Array.from(groups.values());
  }

  async function findExistingComponentSet(
    components: FigmaComponentReference[],
  ): Promise<ComponentSetNode | undefined> {
    for (const component of components) {
      const existing = await findLocalComponent(component);
      if (existing?.parent?.type === "COMPONENT_SET") {
        return existing.parent;
      }
    }
    return components[0] ? findVariantComponentSet(components[0]) : undefined;
  }

  async function findLocalComponent(
    component: FigmaComponentReference,
  ): Promise<ComponentNode | undefined> {
    const cached = componentRegistry.get(component.key);
    if (cached) return cached;

    await figma.loadAllPagesAsync();
    const found = collectComponentNodes(figma.root).find((node) => {
        if (getNodePluginData(node, componentPluginDataKey) === component.key) {
          return true;
        }
        return componentNodeMatchesReference(node, component);
      });

    if (found) componentRegistry.set(component.key, found);
    return found;
  }

  function organizeComponentDependencySections(
    rootNode: SceneNode,
    targetPage: PageNode,
  ): SectionNode[] {
    const excludedNodeIds = collectSceneNodeIds(rootNode);
    const targets = collectDependencySectionTargets(excludedNodeIds);
    return targets.map((target) =>
      placeNodeInComponentSection(target.node, targetPage, target),
    );
  }

  function collectDependencySectionTargets(
    excludedNodeIds: Set<string>,
  ): ComponentSectionTarget[] {
    const targets = new Map<string, ComponentSectionTarget>();

    for (const record of Array.from(componentDefinitionRecords.values())) {
      const node = getComponentDefinitionSectionNode(record.node);
      if (shouldSkipComponentSectionNode(node, excludedNodeIds)) continue;

      const sectionKey = getComponentReferenceSectionKey(record.component);
      const existing = targets.get(sectionKey);
      if (existing?.node.type === "COMPONENT_SET") continue;

      targets.set(sectionKey, {
        key: sectionKey,
        name: getComponentReferenceSectionName(record.component),
        node,
        role: "dependency",
      });
    }

    for (const record of Array.from(componentSetRecords.values())) {
      if (shouldSkipComponentSectionNode(record.node, excludedNodeIds)) continue;

      const sectionKey = getComponentReferenceSectionKey(record.component);
      targets.set(sectionKey, {
        key: sectionKey,
        name: getComponentReferenceSectionName(record.component),
        node: record.node,
        role: "dependency",
      });
    }

    return Array.from(targets.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
    );
  }

  function trackComponentDefinition(
    node: ComponentNode,
    component: FigmaComponentReference,
  ): void {
    componentDefinitionRecords.set(component.key, { component, node });
    if (node.parent?.type === "COMPONENT_SET") {
      trackComponentSet(node.parent, component);
    }
  }

  function trackComponentSet(
    node: ComponentSetNode,
    component: FigmaComponentReference,
  ): void {
    componentSetRecords.set(getComponentReferenceSectionKey(component), {
      component,
      node,
    });
  }

  function getComponentDefinitionSectionNode(
    node: ComponentNode,
  ): ComponentNode | ComponentSetNode {
    return node.parent?.type === "COMPONENT_SET" ? node.parent : node;
  }

  function shouldSkipComponentSectionNode(
    node: ComponentNode | ComponentSetNode,
    excludedNodeIds: Set<string>,
  ): boolean {
    return node.removed || excludedNodeIds.has(node.id);
  }

  async function attachVariantComponentToSet(
    componentNode: ComponentNode,
    component: FigmaComponentReference,
  ): Promise<ComponentSetNode | undefined> {
    const attachFailedFonts = await preloadNodeTreeFonts(componentNode);
    if (attachFailedFonts.length > 0) {
      warn(
        `Left ${componentNode.name} outside its component set: font ${describeFont(attachFailedFonts[0])} could not be loaded.`,
      );
      return undefined;
    }
    const existingSet = await findVariantComponentSet(component);
    if (existingSet) {
      prepareVariantNodeForComponentSet(componentNode, component);
      if (componentNode.parent === existingSet) {
        tagVariantComponentSet(existingSet, component);
        normalizeComponentSetVariantNames(existingSet, component);
        layoutVariantComponentSet(existingSet);
        moveComponentDefinitionNodeToTargetPage(existingSet);
        return existingSet;
      }

      try {
        existingSet.appendChild(componentNode);
        tagVariantComponentSet(existingSet, component);
        normalizeComponentSetVariantNames(existingSet, component);
        layoutVariantComponentSet(existingSet);
        moveComponentDefinitionNodeToTargetPage(existingSet);
        return existingSet;
      } catch (error) {
        warn(
          `Could not append ${component.key} to component set ${existingSet.name}: ${formatError(error)}`,
        );
      }
    }

    if (artifactKind === "page") {
      moveComponentDefinitionNodeToTargetPage(componentNode);
    }
    const siblingComponents = findStandaloneVariantComponents(component).filter(
      (node) => node !== componentNode,
    );
    const usableSiblings: ComponentNode[] = [];
    for (const sibling of siblingComponents) {
      const failedFonts = await preloadNodeTreeFonts(sibling);
      if (failedFonts.length > 0) {
        warn(
          `Left existing standalone variant ${sibling.name} out of the ${component.name} component set: font ${describeFont(failedFonts[0])} could not be loaded.`,
        );
        continue;
      }
      usableSiblings.push(sibling);
    }
    if (usableSiblings.length === 0) return undefined;

    try {
      const targetParent = getAncestorPage(componentNode) ?? figma.currentPage;
      const variantNodes = [...usableSiblings, componentNode];
      for (const node of variantNodes) {
        prepareVariantNodeForComponentSet(
          node,
          getStoredComponentReference(node, component),
        );
        if (node.parent !== targetParent) {
          targetParent.appendChild(node);
        }
      }
      const componentSet = figma.combineAsVariants(
        variantNodes,
        targetParent,
      );
      componentSet.name = component.name;
      tagVariantComponentSet(componentSet, component);
      normalizeComponentSetVariantNames(componentSet, component);
      layoutVariantComponentSet(componentSet);
      moveComponentDefinitionNodeToTargetPage(componentSet);
      return componentSet;
    } catch (error) {
      warn(
        `Could not combine ${component.name} variants into a component set: ${formatError(error)}`,
      );
      return undefined;
    }
  }

  async function findVariantComponentSet(
    component: FigmaComponentReference,
  ): Promise<ComponentSetNode | undefined> {
    await figma.loadAllPagesAsync();
    return collectComponentSetNodes(figma.root).find((node) =>
      componentSetMatchesVariantGroup(node, component),
    );
  }

  function findStandaloneVariantComponents(
    component: FigmaComponentReference,
  ): ComponentNode[] {
    return collectComponentNodes(figma.root).filter((node) => {
      return (
        node.parent?.type !== "COMPONENT_SET" &&
        componentNodeMatchesVariantGroup(node, component)
      );
    });
  }

  function collectComponentNodes(node: BaseNode): ComponentNode[] {
    const components: ComponentNode[] = [];
    if (node.type === "COMPONENT") {
      components.push(node as ComponentNode);
    }

    const children = (node as NodeWithChildren).children;
    if (children) {
      for (const child of children) {
        components.push(...collectComponentNodes(child));
      }
    }

    return components;
  }

  function collectComponentSetNodes(node: BaseNode): ComponentSetNode[] {
    const componentSets: ComponentSetNode[] = [];
    if (node.type === "COMPONENT_SET") {
      componentSets.push(node as ComponentSetNode);
    }

    const children = (node as NodeWithChildren).children;
    if (children) {
      for (const child of children) {
        componentSets.push(...collectComponentSetNodes(child));
      }
    }

    return componentSets;
  }

  function componentSetMatchesVariantGroup(
    node: ComponentSetNode,
    component: FigmaComponentReference,
  ): boolean {
    if (
      normalizeComponentIdentity(getNodePluginData(node, "storybookComponentSource")) ===
        normalizeComponentIdentity(component.sourceName || component.name) ||
      normalizeComponentIdentity(getNodePluginData(node, "storybookComponentName")) ===
        normalizeComponentIdentity(component.name)
    ) {
      return true;
    }

    if (
      normalizeComponentIdentity(node.name) ===
        normalizeComponentIdentity(component.name) ||
      normalizeComponentIdentity(node.name) ===
        normalizeComponentIdentity(component.sourceName)
    ) {
      return true;
    }

    return node.children.some((child) => {
      return (
        child.type === "COMPONENT" &&
        componentNodeMatchesVariantGroup(child, component)
      );
    });
  }

  function componentNodeMatchesReference(
    node: ComponentNode,
    component: FigmaComponentReference,
  ): boolean {
    const variantDisplayName = getVariantPropertyDisplayName(component);
    return (
      node.name === getComponentDisplayName(component) ||
      (Boolean(variantDisplayName) &&
        node.name === variantDisplayName &&
        node.parent?.type === "COMPONENT_SET" &&
        componentSetMatchesVariantGroup(node.parent, component)) ||
      (!component.variant && node.name === component.name)
    );
  }

  function componentNodeMatchesVariantGroup(
    node: ComponentNode,
    component: FigmaComponentReference,
  ): boolean {
    const expectedSource = normalizeComponentIdentity(
      component.sourceName || component.name,
    );
    const expectedName = normalizeComponentIdentity(component.name);
    const source = normalizeComponentIdentity(
      getNodePluginData(node, "storybookComponentSource"),
    );
    const name = normalizeComponentIdentity(
      getNodePluginData(node, "storybookComponentName"),
    );

    if (source && source === expectedSource) return true;
    if (name && name === expectedName) return true;

    const baseName = normalizeComponentIdentity(node.name.split(",")[0]);
    return baseName === expectedName || baseName === expectedSource;
  }

  function tagComponentNode(
    node: ComponentNode,
    component: FigmaComponentReference,
  ): void {
    setNodePluginData(node, componentPluginDataKey, component.key);
    setNodePluginData(node, "storybookComponentName", component.name);
    setNodePluginData(
      node,
      "storybookComponentSource",
      component.sourceName || component.key,
    );
    if (component.variant) {
      setNodePluginData(node, "storybookComponentVariant", component.variant);
    }
    if (component.variantProperties) {
      setNodePluginData(
        node,
        "storybookComponentVariantProperties",
        JSON.stringify(component.variantProperties),
      );
    }
  }

  function tagVariantComponentSet(
    node: ComponentSetNode,
    component: FigmaComponentReference,
  ): void {
    setNodePluginData(node, "storybookComponentName", component.name);
    setNodePluginData(
      node,
      "storybookComponentSource",
      component.sourceName || component.name,
    );
  }

  async function attachStandaloneVariantComponentsToSet(
    componentSet: ComponentSetNode,
    component: FigmaComponentReference,
  ): Promise<void> {
    const existingVariantIdentities = getComponentSetVariantIdentities(componentSet);

    for (const node of findStandaloneVariantComponents(component)) {
      const nodeComponent = getStoredComponentReference(node, component);
      const variantIdentity = getComponentVariantIdentity(nodeComponent);
      if (variantIdentity && existingVariantIdentities.has(variantIdentity)) continue;

      const failedFonts = await preloadNodeTreeFonts(node);
      if (failedFonts.length > 0) {
        warn(
          `Left existing standalone variant ${node.name} outside ${componentSet.name}: font ${describeFont(failedFonts[0])} could not be loaded.`,
        );
        continue;
      }

      try {
        prepareVariantNodeForComponentSet(node, nodeComponent);
        componentSet.appendChild(node);
        if (variantIdentity) existingVariantIdentities.add(variantIdentity);
      } catch (error) {
        warn(
          `Could not attach existing standalone variant ${node.name} to ${componentSet.name}: ${formatError(error)}`,
        );
      }
    }
  }

  async function getStandaloneVariantNodesForNewSet(
    componentNodes: ComponentNode[],
    component: FigmaComponentReference,
  ): Promise<ComponentNode[]> {
    const nodes = uniqueComponentNodes([
      ...findStandaloneVariantComponents(component),
      ...componentNodes,
    ]);

    const usable: ComponentNode[] = [];
    for (const node of nodes) {
      const failedFonts = await preloadNodeTreeFonts(node);
      if (failedFonts.length > 0 && !componentNodes.includes(node)) {
        warn(
          `Left existing standalone variant ${node.name} out of the new component set: font ${describeFont(failedFonts[0])} could not be loaded.`,
        );
        continue;
      }
      usable.push(node);
      prepareVariantNodeForComponentSet(
        node,
        getStoredComponentReference(node, component),
      );
      if (node.parent !== figma.currentPage) {
        figma.currentPage.appendChild(node);
      }
    }

    return usable;
  }

  function uniqueComponentNodes(nodes: ComponentNode[]): ComponentNode[] {
    const seen = new Set<string>();
    const result: ComponentNode[] = [];
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      result.push(node);
    }
    return result;
  }

  function normalizeComponentSetVariantNames(
    componentSet: ComponentSetNode,
    fallbackComponent: FigmaComponentReference,
  ): void {
    for (const child of componentSet.children) {
      if (child.type !== "COMPONENT") continue;
      prepareVariantNodeForComponentSet(
        child,
        getStoredComponentReference(child, fallbackComponent),
      );
    }
  }

  function prepareVariantNodeForComponentSet(
    node: ComponentNode,
    component: FigmaComponentReference,
  ): void {
    const variantName = getVariantPropertyDisplayName(component);
    if (variantName) {
      node.name = variantName;
    }
    tagComponentNode(node, component);
  }

  function getStoredComponentReference(
    node: ComponentNode,
    fallbackComponent: FigmaComponentReference,
  ): FigmaComponentReference {
    const key = getNodePluginData(node, componentPluginDataKey) || fallbackComponent.key;
    const name =
      getNodePluginData(node, "storybookComponentName") || fallbackComponent.name;
    const sourceName =
      getNodePluginData(node, "storybookComponentSource") ||
      fallbackComponent.sourceName ||
      name;
    const variant =
      getNodePluginData(node, "storybookComponentVariant") ||
      fallbackComponent.variant;
    const variantProperties =
      getStoredVariantProperties(node) || fallbackComponent.variantProperties;

    return {
      key,
      name,
      sourceName,
      variant,
      variantProperties,
    };
  }

  function getComponentSetVariantIdentities(
    componentSet: ComponentSetNode,
  ): Set<string> {
    const identities = new Set<string>();
    for (const child of componentSet.children) {
      if (child.type !== "COMPONENT") continue;
      const identity = getComponentVariantIdentity(
        getStoredComponentReference(child, {
          key: "",
          name: componentSet.name,
          sourceName: componentSet.name,
        }),
      );
      if (identity) identities.add(identity);
    }
    return identities;
  }

  function getComponentVariantIdentity(
    component: FigmaComponentReference,
  ): string | undefined {
    const variantProperties =
      component.variantProperties && Object.keys(component.variantProperties).length > 0
        ? component.variantProperties
        : component.variant
          ? { Variant: component.variant }
          : undefined;

    if (!variantProperties) return undefined;

    return Object.keys(variantProperties)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => `${name}:${variantProperties[name]}`)
      .join("|");
  }

  function layoutVariantComponentSet(node: ComponentSetNode): void {
    const variantNodes = sortVariantComponents(
      node.children.filter((child): child is ComponentNode => child.type === "COMPONENT"),
    );
    if (variantNodes.length === 0) return;

    const grid = getComponentSetGridMetrics(variantNodes);
    const rows = Math.ceil(variantNodes.length / grid.columns);
    const width = grid.columns * grid.cellWidth + (grid.columns - 1) * grid.gap;
    const height = rows * grid.cellHeight + (rows - 1) * grid.gap;

    for (let index = 0; index < variantNodes.length; index += 1) {
      const child = variantNodes[index];
      const column = index % grid.columns;
      const row = Math.floor(index / grid.columns);
      const offsetX = Math.max(0, (grid.cellWidth - safeNumber(child.width, 0)) / 2);
      const offsetY = Math.max(0, (grid.cellHeight - safeNumber(child.height, 0)) / 2);
      child.x = column * (grid.cellWidth + grid.gap) + offsetX;
      child.y = row * (grid.cellHeight + grid.gap) + offsetY;
    }

    safeResizeWithoutConstraints(
      node,
      Math.max(1, width),
      Math.max(1, height),
      `${node.name}.componentSetGrid`,
    );
  }

  function sortVariantComponents(children: ComponentNode[]): ComponentNode[] {
    return [...children].sort((a, b) =>
      getVariantComponentSortKey(a).localeCompare(
        getVariantComponentSortKey(b),
        undefined,
        { numeric: true, sensitivity: "base" },
      ),
    );
  }

  function getVariantComponentSortKey(node: ComponentNode): string {
    const variantProperties = getReadableVariantProperties(node);
    if (variantProperties) {
      return Object.keys(variantProperties)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => `${name}:${variantProperties[name]}`)
        .join("|");
    }

    return getNodePluginData(node, "storybookComponentVariant") || node.name;
  }

  function getReadableVariantProperties(
    node: ComponentNode,
  ): Record<string, string> | undefined {
    const storedVariantProperties = getStoredVariantProperties(node);

    try {
      return node.variantProperties ?? storedVariantProperties;
    } catch (error) {
      if (!warnedVariantPropertyNodeIds.has(node.id)) {
        warnedVariantPropertyNodeIds.add(node.id);
        warn(
          `Could not read Figma variant properties for ${node.name}; using Storybook variant metadata instead: ${formatError(error)}`,
        );
      }
      return storedVariantProperties;
    }
  }

  function getStoredVariantProperties(
    node: ComponentNode,
  ): Record<string, string> | undefined {
    const rawValue = getNodePluginData(node, "storybookComponentVariantProperties");
    if (!rawValue) return undefined;

    try {
      const parsed = JSON.parse(rawValue);
      if (!isRecord(parsed)) return undefined;

      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          result[key] = value;
        }
      }

      return Object.keys(result).length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  }

  function getComponentSetGridMetrics(children: ComponentNode[]): {
    cellHeight: number;
    cellWidth: number;
    columns: number;
    gap: number;
  } {
    const maxWidth = Math.max(...children.map((child) => safeNumber(child.width, 1)));
    const maxHeight = Math.max(...children.map((child) => safeNumber(child.height, 1)));
    const maxSize = Math.max(maxWidth, maxHeight);
    const maxColumns =
      maxSize <= COMPONENT_SET_GRID_COMPACT_MAX_SIZE
        ? COMPONENT_SET_GRID_COMPACT_COLUMNS
        : maxSize <= COMPONENT_SET_GRID_MEDIUM_MAX_SIZE
          ? COMPONENT_SET_GRID_MEDIUM_COLUMNS
          : 1;

    return {
      cellHeight: Math.max(COMPONENT_SET_GRID_MIN_CELL_HEIGHT, maxHeight),
      cellWidth: Math.max(COMPONENT_SET_GRID_MIN_CELL_WIDTH, maxWidth),
      columns: Math.max(1, Math.min(maxColumns, children.length)),
      gap: COMPONENT_SET_GRID_GAP,
    };
  }

  function parkComponentDefinition(node: ComponentNode): void {
    if (artifactKind === "page") {
      moveComponentDefinitionNodeToTargetPage(getComponentDefinitionSectionNode(node));
      return;
    }

    const rootWidth = safeNumber(payload.root.styles.width, 0);
    node.x = rootWidth + 80;
    node.y = stats.componentsCreated * 24;
  }

  function getComponentDefinitionParentPage(): PageNode {
    if (artifactKind !== "page") return figma.currentPage;

    const pageName =
      payload.componentSystem?.componentsPageName?.trim() || COMPONENTS_PAGE_NAME;
    const existing = figma.root.children.find(
      (page) => page.name.toLowerCase() === pageName.toLowerCase(),
    );
    if (existing) return existing;

    const page = figma.createPage();
    page.name = pageName;
    return page;
  }

  function getNextComponentDefinitionY(page: PageNode): number {
    if (componentDefinitionOffsetY === 0 && page.children.length > 0) {
      componentDefinitionOffsetY = page.children.reduce((maxBottom, child) => {
        const childNode = child as SceneNode & { height?: number; y?: number };
        const bottom = safeNumber(childNode.y, 0) + safeNumber(childNode.height, 0);
        return Math.max(maxBottom, bottom);
      }, 0);
      if (componentDefinitionOffsetY > 0) componentDefinitionOffsetY += 24;
    }

    return componentDefinitionOffsetY;
  }

  function moveComponentDefinitionNodeToTargetPage(
    node: ComponentNode | ComponentSetNode,
  ): void {
    if (artifactKind !== "page") return;

    const parentPage = getComponentDefinitionParentPage();
    if (getAncestorPage(node)?.id === parentPage.id) return;

    const nextY = getNextComponentDefinitionY(parentPage);
    parentPage.appendChild(node);
    node.x = 0;
    node.y = nextY;
    componentDefinitionOffsetY = nextY + safeNumber(node.height, 0) + 24;
  }

  function moveExistingComponentDefinitionToTargetPage(
    componentNode: ComponentNode,
  ): void {
    if (artifactKind !== "page") return;
    moveComponentDefinitionNodeToTargetPage(getComponentDefinitionSectionNode(componentNode));
  }

  function getAncestorPage(node: BaseNode): PageNode | undefined {
    let parent: BaseNode | null = node.parent;
    while (parent) {
      if (parent.type === "PAGE") return parent as PageNode;
      parent = parent.parent;
    }
    return undefined;
  }

  async function createTextNode(
    spec: FigmaExportNode,
    path: string,
    options: CreateNodeOptions,
  ): Promise<TextNode> {
    const node = figma.createText();
    const styles = spec.styles;
    const bindings = spec.bindings ?? {};

    node.name = spec.name || "text";
    node.fontName = (await loadTextFont(styles, path)).font;
    node.characters = spec.text ?? "";
    node.fontSize = safeNumber(styles.fontSize, 14);
    node.textAutoResize = "NONE";
    applyTextAlignHorizontal(node, spec, options, path);
    applyTextAlignVertical(node, styles.textAlignVertical, path);
    if (typeof styles.lineHeight === "number") {
      node.lineHeight = {
        unit: "PIXELS",
        value: styles.lineHeight,
      };
    }
    if (typeof styles.letterSpacing === "number") {
      try {
        node.letterSpacing = { unit: "PIXELS", value: styles.letterSpacing };
      } catch (error) {
        warn(`Could not set letter spacing for ${path}: ${formatError(error)}`);
      }
    }
    if (styles.textDecoration) {
      try {
        node.textDecoration = styles.textDecoration;
      } catch (error) {
        warn(`Could not set text decoration for ${path}: ${formatError(error)}`);
      }
    }
    node.fills = [solidPaint(styles.color, bindings.textColor, `${path}.textColor`)];
    applyEffects(node, collectSpecEffects(styles), path);
    safeResize(node, styles.width, styles.height, path);
    applyTextAutoResize(
      node,
      styles.textGrowHeight ? "HEIGHT" : styles.textAutoResize,
      path,
    );
    applyTextTruncation(node, styles, path);
    applyTextAlignHorizontal(node, spec, options, path);

    safeBindNumberMatched(node, "width", bindings.width, styles.width, path);
    safeBindNumberMatched(node, "height", bindings.height, styles.height, path);
    await safeBindFontFamily(
      node,
      bindings.fontFamily,
      styles.fontFamily,
      styles.fontWeight ?? 400,
      styles.fontStyle === "italic",
      path,
    );
    safeBindNumberMatched(node, "fontSize", bindings.fontSize, styles.fontSize, path);
    safeBindNumberMatched(node, "fontWeight", bindings.fontWeight, styles.fontWeight, path);
    if (typeof styles.lineHeight === "number") {
      safeBindNumberMatched(node, "lineHeight", bindings.lineHeight, styles.lineHeight, path);
    } else if (bindings.lineHeight) {
      warn(
        `Skipped ${path}.lineHeight binding to ${bindings.lineHeight}: the rendered line height is auto.`,
      );
    }

    return node;
  }

  function createImageNode(spec: FigmaExportNode, path: string): FrameNode {
    const wrapper = figma.createFrame();
    const styles = spec.styles;
    const bindings = spec.bindings ?? {};

    wrapper.name = spec.name || "image";
    wrapper.fills = [];
    wrapper.clipsContent = shouldClipContent(styles.overflow);
    wrapper.opacity = clamp(safeNumber(styles.opacity, 1), 0, 1);
    safeResize(wrapper, styles.width, styles.height, path);
    safeBind(wrapper, "width", bindings.width, path);
    safeBind(wrapper, "height", bindings.height, path);
    safeBind(wrapper, "opacity", bindings.opacity, path);

    if (spec.svgText) {
      try {
        const targetWidth = Math.max(1, safeNumber(styles.width, 1));
        const targetHeight = Math.max(1, safeNumber(styles.height, 1));
        const svgNode = figma.createNodeFromSvg(
          setSvgRootSize(spec.svgText, targetWidth, targetHeight),
        );
        svgNode.name = `${wrapper.name}/svg`;
        fitSvgNodeToTarget(svgNode, targetWidth, targetHeight, `${path}/svg`);
        svgNode.x = 0;
        svgNode.y = 0;
        wrapper.appendChild(svgNode);
        stats.nodesCreated += 1;
      } catch (error) {
        warn(`Could not create SVG for ${path}: ${formatError(error)}`);
      }
    } else if (spec.imageBase64) {
      const fills: Paint[] = [];
      // Letterboxed (FIT) images show the element background around the
      // bitmap, so the background paints below the image fill.
      if (styles.backgroundColor) {
        fills.push(
          solidPaint(styles.backgroundColor, bindings.backgroundColor, `${path}.fill`),
        );
      }
      const imagePaint = createImagePaint(
        spec.imageBase64,
        styles.imageScaleMode,
        path,
      );
      if (imagePaint) fills.push(imagePaint);
      wrapper.fills = fills;
    } else {
      warn(`Image ${path} has no SVG or raster payload; created an empty image frame.`);
    }

    setStrokes(wrapper, styles, bindings, path);
    applyRadius(wrapper, styles, bindings, path);
    applyEffects(wrapper, collectSpecEffects(styles), path);

    return wrapper;
  }

  // Frame resize alone never scales vector children; rescale transforms the
  // whole subtree so a 24px icon file rendered at 16px imports at 16px.
  function fitSvgNodeToTarget(
    node: FrameNode,
    width: number,
    height: number,
    path: string,
  ): void {
    const currentWidth = safeNumber(node.width, width);
    const currentHeight = safeNumber(node.height, height);
    if (
      Math.abs(currentWidth - width) < 0.5 &&
      Math.abs(currentHeight - height) < 0.5
    ) {
      return;
    }

    try {
      const rescale = (node as FrameNode & { rescale?: (scale: number) => void })
        .rescale;
      if (typeof rescale === "function" && currentWidth > 0) {
        rescale.call(node, width / currentWidth);
      }
    } catch (error) {
      warn(`Could not rescale SVG for ${path}: ${formatError(error)}`);
    }
    safeResize(node, width, height, path);
  }

  function createSvgSceneNode(spec: FigmaExportNode, path: string): FrameNode {
    const targetWidth = Math.max(1, safeNumber(spec.styles.width, 1));
    const targetHeight = Math.max(1, safeNumber(spec.styles.height, 1));
    const svgNode = figma.createNodeFromSvg(
      setSvgRootSize(spec.svgText || "", targetWidth, targetHeight),
    );
    svgNode.name = spec.name || "svg";
    fitSvgNodeToTarget(svgNode, targetWidth, targetHeight, path);
    svgNode.x = safeNumber(spec.styles.x, 0);
    svgNode.y = safeNumber(spec.styles.y, 0);
    return svgNode;
  }

  function canCreateComponentDefinition(spec: FigmaExportNode): boolean {
    return (
      spec.kind === "frame" ||
      ((spec.kind === "image" || spec.kind === "svg") && Boolean(spec.svgText))
    );
  }

  // CSS paints background-color at the bottom, then background-image layers
  // on top; Figma fills render index 0 at the bottom, so the array is
  // [solid, image, radial, linear].
  function setFrameFills(
    node: FrameLikeNode,
    spec: FigmaExportNode,
    path: string,
  ): void {
    const styles = spec.styles;
    const bindings = spec.bindings ?? {};
    const fills: Paint[] = [];

    // A binding without a computed color only paints when its variable
    // exists; otherwise a placeholder black rectangle would appear.
    const hasBindableBackground = Boolean(
      bindings.backgroundColor &&
        registry.get(bindings.backgroundColor)?.resolvedType === "COLOR",
    );
    if (styles.backgroundColor || hasBindableBackground) {
      fills.push(
        solidPaint(styles.backgroundColor, bindings.backgroundColor, `${path}.fill`),
      );
    }

    if (spec.kind === "frame" && spec.imageBase64) {
      const imagePaint = createImagePaint(
        spec.imageBase64,
        styles.imageScaleMode,
        `${path}.backgroundImage`,
      );
      if (imagePaint) fills.push(imagePaint);
    }

    if (styles.backgroundRadialGradient) {
      fills.push(radialGradientPaint(styles.backgroundRadialGradient, path));
    }

    if (styles.backgroundLinearGradient) {
      fills.push(linearGradientPaint(styles.backgroundLinearGradient, path));
    }

    node.fills = fills;
  }

  function createImagePaint(
    imageBase64: string,
    scaleMode: FigmaImageScaleMode | undefined,
    path: string,
  ): ImagePaint | undefined {
    try {
      const bytes = figma.base64Decode(imageBase64);
      const image = figma.createImage(bytes);
      return {
        imageHash: image.hash,
        scaleMode: scaleMode === "FIT" ? "FIT" : "FILL",
        type: "IMAGE",
      };
    } catch (error) {
      warn(`Could not create image fill for ${path}: ${formatError(error)}`);
      return undefined;
    }
  }

  function linearGradientPaint(
    gradient: FigmaExportLinearGradient,
    path: string,
  ): GradientPaint {
    return {
      gradientStops: gradient.stops.map((stop, index) =>
        linearGradientStop(stop, index, gradient.stops.length, path),
      ),
      gradientTransform: getLinearGradientTransform(safeNumber(gradient.angle, 90)),
      type: "GRADIENT_LINEAR",
    };
  }

  // The identity transform maps the radial gradient onto the ellipse
  // inscribed in the node bounds — close to the CSS farthest-side default.
  function radialGradientPaint(
    gradient: FigmaExportRadialGradient,
    path: string,
  ): GradientPaint {
    return {
      gradientStops: gradient.stops.map((stop, index) =>
        linearGradientStop(stop, index, gradient.stops.length, path),
      ),
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      type: "GRADIENT_RADIAL",
    };
  }

  function linearGradientStop(
    stop: FigmaExportGradientStop,
    index: number,
    stopCount: number,
    path: string,
  ): ColorStop {
    const colorStop: ColorStop = {
      color: cloneColor(colorFromCss(stop.color)),
      position:
        typeof stop.position === "number"
          ? clamp(stop.position, 0, 1)
          : stopCount > 1
            ? index / (stopCount - 1)
            : 0,
    };

    if (!stop.token) return colorStop;

    if (!tokenColorMatchesStyle(stop.token, stop.color)) {
      warn(
        `Skipped ${path}.fill.gradientStops.${index} binding to ${stop.token}: token color does not match the stop color.`,
      );
      return colorStop;
    }

    const variable = registry.get(stop.token);
    if (!variable) {
      warn(`Missing variable for ${path}.fill.gradientStops.${index}: ${stop.token}`);
      return colorStop;
    }

    if (variable.resolvedType !== "COLOR") {
      warn(
        `Cannot bind ${path}.fill.gradientStops.${index} to non-color variable ${stop.token}`,
      );
      return colorStop;
    }

    return {
      ...colorStop,
      boundVariables: {
        color: figma.variables.createVariableAlias(variable),
      },
    };
  }

  function setStrokes(
    node: FrameLikeNode,
    styles: FigmaExportNode["styles"],
    bindings: Partial<Record<FigmaBindingName, string>>,
    path: string,
  ): void {
    if (styles.borderSides) {
      setBorderSideStrokes(node, styles.borderSides, bindings, path);
      return;
    }

    const hasBindableBorder = Boolean(
      bindings.borderColor &&
        registry.get(bindings.borderColor)?.resolvedType === "COLOR",
    );
    if (!styles.borderColor && !hasBindableBorder) return;

    node.strokes = [
      solidPaint(styles.borderColor, bindings.borderColor, `${path}.stroke`),
    ];
    node.strokeAlign = "INSIDE";
    if (typeof styles.borderWidth === "number") {
      node.strokeWeight = styles.borderWidth;
    }
    applyStrokeDashPattern(node, styles, path);
  }

  function applyStrokeDashPattern(
    node: FrameLikeNode,
    styles: FigmaExportNode["styles"],
    path: string,
  ): void {
    if (!styles.borderStyle) return;

    const width = Math.max(1, safeNumber(styles.borderWidth, 1));
    try {
      if (styles.borderStyle === "dashed") {
        node.dashPattern = [width * 2, width * 2];
      } else {
        // Zero-length dashes with round caps render as browser-like dots.
        node.dashPattern = [0.01, width * 2];
        (node as FrameLikeNode & { strokeCap: StrokeCap }).strokeCap = "ROUND";
      }
    } catch (error) {
      warn(`Could not set ${styles.borderStyle} border for ${path}: ${formatError(error)}`);
    }
  }

  function setBorderSideStrokes(
    node: FrameLikeNode,
    sides: FigmaExportBorderSides,
    bindings: Partial<Record<FigmaBindingName, string>>,
    path: string,
  ): void {
    const sideNames: FigmaBorderSideName[] = ["top", "right", "bottom", "left"];
    const firstSide = sideNames
      .map((side) => sides[side])
      .find((side): side is FigmaExportBorderSide => Boolean(side));
    if (!firstSide) return;

    node.strokes = [
      solidPaint(firstSide.color, bindings.borderColor, `${path}.stroke`),
    ];
    node.strokeAlign = "INSIDE";
    node.strokeTopWeight = safeNumber(sides.top?.width, 0);
    node.strokeRightWeight = safeNumber(sides.right?.width, 0);
    node.strokeBottomWeight = safeNumber(sides.bottom?.width, 0);
    node.strokeLeftWeight = safeNumber(sides.left?.width, 0);

    if (bindings.borderWidth) {
      if (sides.top) {
        safeBindNumberMatched(node, "strokeTopWeight", bindings.borderWidth, sides.top.width, path);
      }
      if (sides.right) {
        safeBindNumberMatched(node, "strokeRightWeight", bindings.borderWidth, sides.right.width, path);
      }
      if (sides.bottom) {
        safeBindNumberMatched(node, "strokeBottomWeight", bindings.borderWidth, sides.bottom.width, path);
      }
      if (sides.left) {
        safeBindNumberMatched(node, "strokeLeftWeight", bindings.borderWidth, sides.left.width, path);
      }
    }
  }

  function solidPaint(
    cssValue: string | undefined,
    tokenName: string | undefined,
    path: string,
  ): SolidPaint {
    const cssColor = colorFromCss(cssValue);
    const paint: SolidPaint = {
      color: {
        b: cssColor.b,
        g: cssColor.g,
        r: cssColor.r,
      },
      opacity: cssColor.a,
      type: "SOLID",
    };

    if (!tokenName) return paint;

    if (!tokenColorMatchesStyle(tokenName, cssValue)) {
      warn(
        `Skipped ${path} binding to ${tokenName}: token color does not match the rendered color.`,
      );
      return paint;
    }

    const variable = registry.get(tokenName);
    if (!variable) {
      warn(`Missing variable for ${path}: ${tokenName}`);
      return paint;
    }

    if (variable.resolvedType !== "COLOR") {
      warn(`Cannot bind ${path} to non-color variable ${tokenName}`);
      return paint;
    }

    try {
      return figma.variables.setBoundVariableForPaint(paint, "color", variable);
    } catch (error) {
      warn(`Could not bind paint ${path} to ${tokenName}: ${formatError(error)}`);
      return paint;
    }
  }

  function applyRadius(
    node: FrameLikeNode,
    styles: FigmaExportNode["styles"],
    bindings: Partial<Record<FigmaBindingName, string>>,
    path: string,
  ): void {
    if (
      bindings.cornerRadius &&
      !tokenNumberMatchesStyle(bindings.cornerRadius, styles.radius ?? 0)
    ) {
      warn(
        `Skipped ${path}.cornerRadius binding to ${bindings.cornerRadius}: token value does not match the rendered radius.`,
      );
      bindings = { ...bindings, cornerRadius: undefined };
    }
    if (styles.radiusCorners) {
      try {
        node.topLeftRadius = Math.max(0, safeNumber(styles.radiusCorners.topLeft, 0));
        node.topRightRadius = Math.max(0, safeNumber(styles.radiusCorners.topRight, 0));
        node.bottomRightRadius = Math.max(
          0,
          safeNumber(styles.radiusCorners.bottomRight, 0),
        );
        node.bottomLeftRadius = Math.max(
          0,
          safeNumber(styles.radiusCorners.bottomLeft, 0),
        );
      } catch (error) {
        warn(`Could not set per-corner radius for ${path}: ${formatError(error)}`);
      }
    } else if (typeof styles.radius === "number") {
      node.cornerRadius = styles.radius;
    }

    safeBindRadius(node, bindings.cornerRadius, path);
  }

  // Shadow effects and blur effects travel in separate payload fields for
  // backward compatibility; Figma receives them as one effects list.
  function collectSpecEffects(
    styles: FigmaExportNode["styles"],
  ): FigmaExportEffect[] {
    return [...(styles.effects ?? []), ...(styles.blurEffects ?? [])];
  }

  function applyEffects(
    node: SceneNode,
    effects: FigmaExportEffect[] | undefined,
    path: string,
  ): void {
    if (!effects || effects.length === 0) return;

    try {
      const mapped = effects.map((effect) => {
        if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
          return {
            radius: Math.max(0, safeNumber(effect.blur, 0)),
            type: effect.type,
            visible: true,
          };
        }

        return {
          blendMode: "NORMAL" as const,
          color: cloneColor(colorFromCss(effect.color)),
          offset: {
            x: safeNumber(effect.offsetX, 0),
            y: safeNumber(effect.offsetY, 0),
          },
          radius: Math.max(0, safeNumber(effect.blur, 0)),
          spread: safeNumber(effect.spread, 0),
          type: effect.type,
          visible: true,
        };
      });
      (node as SceneNode & { effects: readonly Effect[] }).effects =
        mapped as unknown as Effect[];
    } catch (error) {
      warn(`Could not set effects for ${path}: ${formatError(error)}`);
    }
  }

  function applyAutoLayout(
    node: FrameLikeNode,
    styles: FigmaExportNode["styles"],
    bindings: Partial<Record<FigmaBindingName, string>>,
    path: string,
  ): void {
    if (!String(styles.display ?? "").includes("flex")) return;

    const primaryAxisAlignItems = mapAxisAlignment(styles.justifyContent);

    node.layoutMode = String(styles.flexDirection ?? "").startsWith("column")
      ? "VERTICAL"
      : "HORIZONTAL";
    const isHorizontalLayout = node.layoutMode === "HORIZONTAL";
    const horizontalSizingMode =
      styles.layoutSizingHorizontal === "HUG" ? "AUTO" : "FIXED";
    const verticalSizingMode =
      styles.layoutSizingVertical === "HUG" ? "AUTO" : "FIXED";
    node.primaryAxisSizingMode = isHorizontalLayout
      ? horizontalSizingMode
      : verticalSizingMode;
    node.counterAxisSizingMode = isHorizontalLayout
      ? verticalSizingMode
      : horizontalSizingMode;
    applyCounterAxisAlignment(node, styles.alignItems, isHorizontalLayout, path);
    node.itemSpacing =
      primaryAxisAlignItems === "SPACE_BETWEEN" ? 0 : safeNumber(styles.gap, 0);
    node.paddingLeft = safeNumber(styles.paddingLeft, 0);
    node.paddingRight = safeNumber(styles.paddingRight, 0);
    node.paddingTop = safeNumber(styles.paddingTop, 0);
    node.paddingBottom = safeNumber(styles.paddingBottom, 0);
    node.primaryAxisAlignItems = primaryAxisAlignItems;

    if (styles.layoutWrap === "WRAP") {
      try {
        (node as FrameLikeNode & { layoutWrap: "NO_WRAP" | "WRAP" }).layoutWrap =
          "WRAP";
        if (typeof styles.counterAxisSpacing === "number") {
          (
            node as FrameLikeNode & { counterAxisSpacing: number | null }
          ).counterAxisSpacing = Math.max(0, styles.counterAxisSpacing);
        }
      } catch (error) {
        warn(`Could not set layout wrap for ${path}: ${formatError(error)}`);
      }
    }

    if (primaryAxisAlignItems !== "SPACE_BETWEEN") {
      safeBindNumberMatched(node, "itemSpacing", bindings.gap, styles.gap, path);
    }
    safeBindNumberMatched(node, "paddingLeft", bindings.paddingLeft, styles.paddingLeft, path);
    safeBindNumberMatched(node, "paddingRight", bindings.paddingRight, styles.paddingRight, path);
    safeBindNumberMatched(node, "paddingTop", bindings.paddingTop, styles.paddingTop, path);
    safeBindNumberMatched(node, "paddingBottom", bindings.paddingBottom, styles.paddingBottom, path);
  }

  function applyCounterAxisAlignment(
    node: FrameLikeNode,
    alignItems: string | undefined,
    isHorizontalLayout: boolean,
    path: string,
  ): void {
    const mapped = mapCounterAlignment(alignItems);
    // Figma only supports baseline alignment on horizontal auto layout.
    if (mapped === "BASELINE" && !isHorizontalLayout) {
      node.counterAxisAlignItems = "MIN";
      return;
    }

    try {
      node.counterAxisAlignItems = mapped;
    } catch (error) {
      warn(`Could not set counter axis alignment for ${path}: ${formatError(error)}`);
      node.counterAxisAlignItems = mapped === "BASELINE" ? "MIN" : mapped;
    }
  }

  function applyChildPlacement(
    parent: FrameLikeNode,
    child: SceneNode,
    spec: FigmaExportNode,
    path: string,
  ): void {
    if (spec.styles.outOfFlow && parent.layoutMode !== "NONE") {
      try {
        (child as SceneNode & { layoutPositioning: "ABSOLUTE" | "AUTO" }).layoutPositioning =
          "ABSOLUTE";
        child.x = safeNumber(spec.styles.x, 0);
        child.y = safeNumber(spec.styles.y, 0);
        applyChildTransformMatrix(child, spec, path);
      } catch (error) {
        warn(`Could not absolutely position ${path}: ${formatError(error)}`);
      }
    }

    applyConstraints(child, spec.styles.constraints, path);
  }

  // Applies the exporter's rotation matrix. Must run after x/y assignment —
  // the x/y setters would otherwise overwrite the matrix translation.
  function applyChildTransformMatrix(
    child: SceneNode,
    spec: FigmaExportNode,
    path: string,
  ): void {
    const matrix = spec.styles.transformMatrix;
    if (!matrix) return;

    try {
      (child as SceneNode & { relativeTransform: Transform }).relativeTransform =
        matrix as Transform;
    } catch (error) {
      warn(`Could not apply transform for ${path}: ${formatError(error)}`);
    }
  }

  function applyConstraints(
    child: SceneNode,
    constraints: FigmaExportConstraints | undefined,
    path: string,
  ): void {
    if (!constraints) return;

    try {
      (child as SceneNode & { constraints: Constraints }).constraints = {
        horizontal: constraints.horizontal,
        vertical: constraints.vertical,
      };
    } catch (error) {
      warn(`Could not set constraints for ${path}: ${formatError(error)}`);
    }
  }

  function applyAutoLayoutChildSizing(
    parent: FrameLikeNode,
    child: SceneNode,
    spec: FigmaExportNode,
    path: string,
  ): void {
    if (parent.layoutMode === "NONE") return;
    if (spec.styles.outOfFlow) return;

    if (spec.styles.layoutAlign === "STRETCH") {
      try {
        (child as SceneNode & { layoutAlign: "STRETCH" }).layoutAlign = "STRETCH";
      } catch (error) {
        warn(`Could not set ${path}.layoutAlign to STRETCH: ${formatError(error)}`);
      }
    }

    if (spec.styles.layoutGrow === 1) {
      try {
        (child as SceneNode & { layoutGrow: number }).layoutGrow = 1;
      } catch (error) {
        warn(`Could not set ${path}.layoutGrow to 1: ${formatError(error)}`);
      }
    }
  }

  function safeBind(
    node: SceneNode,
    field: string,
    tokenName: string | undefined,
    path: string,
  ): boolean {
    if (!tokenName) return false;

    const variable = registry.get(tokenName);
    if (!variable) {
      warn(`Missing variable for ${path}.${field}: ${tokenName}`);
      return false;
    }

    const target = node as BoundVariableTarget;
    if (typeof target.setBoundVariable !== "function") {
      warn(`Node ${path} does not support variable binding for ${field}`);
      return false;
    }

    try {
      target.setBoundVariable(field, variable);
      return true;
    } catch (error) {
      warn(`Could not bind ${path}.${field} to ${tokenName}: ${formatError(error)}`);
      return false;
    }
  }

  async function safeBindFontFamily(
    node: SceneNode,
    tokenName: string | undefined,
    styleFontFamily: string | undefined,
    fontWeight: number,
    italic: boolean,
    path: string,
  ): Promise<boolean> {
    if (!tokenName) return false;
    const tokenFamily = getFontFamilyFromToken(tokenName);
    const styleFamily = styleFontFamily
      ? getFontFamilyCandidates(styleFontFamily)[0]
      : undefined;
    if (
      tokenFamily &&
      styleFamily &&
      tokenFamily.toLowerCase() !== styleFamily.toLowerCase()
    ) {
      warn(
        `Skipped ${path}.fontFamily binding to ${tokenName}: token family "${tokenFamily}" does not match the rendered family "${styleFamily}".`,
      );
      return false;
    }
    const loaded = await loadBoundFontFamily(tokenName, fontWeight, italic, path);
    if (!loaded) return false;
    return safeBind(node, "fontFamily", tokenName, path);
  }

  function safeBindRadius(
    node: SceneNode,
    tokenName: string | undefined,
    path: string,
  ): void {
    if (!tokenName) return;

    const variable = registry.get(tokenName);
    if (!variable) {
      warn(`Missing variable for ${path}.radius: ${tokenName}`);
      return;
    }

    const target = node as BoundVariableTarget;
    if (typeof target.setBoundVariable !== "function") {
      warn(`Node ${path} does not support radius variable binding`);
      return;
    }

    try {
      target.setBoundVariable("cornerRadius", variable);
      return;
    } catch {
      // Some Figma runtimes only support per-corner radius bindings.
    }

    const failures: string[] = [];
    let successCount = 0;
    for (const field of INDIVIDUAL_RADIUS_BINDING_FIELDS) {
      try {
        target.setBoundVariable(field, variable);
        successCount += 1;
      } catch (error) {
        failures.push(`${field}: ${formatError(error)}`);
      }
    }

    if (successCount === 0) {
      warn(`Could not bind ${path}.radius to ${tokenName}: ${failures.join("; ")}`);
    } else if (failures.length > 0) {
      warn(
        `Partially bound ${path}.radius to ${tokenName}; unsupported fields: ${failures.join("; ")}`,
      );
    }
  }

  function safeResize(
    node: SceneNode,
    width: number | undefined,
    height: number | undefined,
    path: string,
  ): void {
    if (typeof (node as LayoutMixin).resize !== "function") return;

    try {
      (node as LayoutMixin).resize(
        Math.max(1, safeNumber(width, 1)),
        Math.max(1, safeNumber(height, 1)),
      );
    } catch (error) {
      warn(`Could not resize ${path}: ${formatError(error)}`);
    }
  }

  function safeResizeWithoutConstraints(
    node: SceneNode,
    width: number | undefined,
    height: number | undefined,
    path: string,
  ): void {
    const layoutNode = node as LayoutMixin;
    const resize = layoutNode.resizeWithoutConstraints ?? layoutNode.resize;
    if (typeof resize !== "function") return;

    try {
      resize.call(
        layoutNode,
        Math.max(1, safeNumber(width, 1)),
        Math.max(1, safeNumber(height, 1)),
      );
    } catch (error) {
      warn(`Could not resize ${path}: ${formatError(error)}`);
    }
  }

  function applyTextAutoResize(
    node: TextNode,
    mode: TextAutoResizeMode | undefined,
    path: string,
  ): void {
    if (!mode) return;

    try {
      node.textAutoResize = mode;
    } catch (error) {
      warn(`Could not set text auto-resize for ${path}: ${formatError(error)}`);
    }
  }

  function applyTextTruncation(
    node: TextNode,
    styles: FigmaExportNode["styles"],
    path: string,
  ): void {
    if (styles.textTruncation !== "ENDING") return;

    try {
      node.textTruncation = "ENDING";
      if (typeof styles.maxLines === "number" && styles.maxLines >= 1) {
        node.maxLines = Math.round(styles.maxLines);
      }
    } catch (error) {
      warn(`Could not set text truncation for ${path}: ${formatError(error)}`);
    }
  }

  let availableFontStylesByFamily: Map<string, string[]> | undefined;

  async function getAvailableFontStyles(family: string): Promise<string[]> {
    if (!availableFontStylesByFamily) {
      availableFontStylesByFamily = new Map();
      try {
        const fonts = await figma.listAvailableFontsAsync();
        for (const font of fonts) {
          const list = availableFontStylesByFamily.get(font.fontName.family);
          if (list) list.push(font.fontName.style);
          else availableFontStylesByFamily.set(font.fontName.family, [font.fontName.style]);
        }
      } catch (error) {
        warn(`Could not list available fonts: ${formatError(error)}`);
      }
    }
    return availableFontStylesByFamily.get(family) ?? [];
  }

  // Candidate style names cover Latin conventions only; families like
  // Hiragino (W3/W6) resolve through the family's actual style list by
  // nearest weight, so the first CSS family wins over a later fallback.
  // Returns the style it tried so the caller records the W-number attempts
  // only this path can discover, instead of reconstructing the pre-resolution
  // candidate list at the reporting site.
  async function loadNearestAvailableFont(
    family: string,
    weight: number,
    italic: boolean,
  ): Promise<NearestFontAttempt> {
    const styleNames = await getAvailableFontStyles(family);
    const style = selectNearestFontStyle(styleNames, weight, italic);
    if (!style) return { attemptedStyles: [] };
    const candidate = { family, style };
    try {
      await figma.loadFontAsync(candidate);
      return { attemptedStyles: [style], font: candidate };
    } catch {
      return { attemptedStyles: [style] };
    }
  }

  // A substitution is a load that differs from what the payload asked for:
  // a later family in the CSS stack, or a style the requested weight never
  // named — the available-style path picked that one. Synonyms of the
  // requested weight ("SemiBold" for "Semi Bold") are the requested style,
  // not a substitution. A payload with no specific family (CSS generic only)
  // requested nothing to substitute. Recording never aborts an import.
  function recordFontSubstitution(record: {
    attemptedStyles: readonly string[];
    font: FontName;
    path: string;
    requestedFamily: string;
    requestedWeight: number;
    styleCandidates: readonly string[];
  }): void {
    try {
      if (!record.requestedFamily) return;
      if (
        record.font.family === record.requestedFamily &&
        record.styleCandidates.includes(record.font.style)
      ) {
        return;
      }
      stats.fontSubstitutions.push({
        attemptedStyles: record.attemptedStyles.slice(),
        loadedFamily: record.font.family || "",
        loadedStyle: record.font.style || "",
        nodePath: record.path || "",
        requestedFamily: record.requestedFamily,
        requestedWeight: record.requestedWeight,
      });
    } catch {
      // Reporting a substitution must never break the import.
    }
  }

  async function loadTextFont(
    styles: FigmaExportNode["styles"],
    path: string,
  ): Promise<FontResolution> {
    const fontWeight = styles.fontWeight ?? 400;
    const fontItalic = styles.fontStyle === "italic";
    const families = getFontFamilyCandidates(styles.fontFamily);
    const styleCandidates = getFontStyleCandidates(fontWeight, fontItalic);
    const requestedFamily = families[0] ?? "";
    const attemptedStyles: string[] = [];

    function noteAttempt(style: string): void {
      if (!attemptedStyles.includes(style)) attemptedStyles.push(style);
    }

    function resolved(font: FontName): FontResolution {
      recordFontSubstitution({
        attemptedStyles,
        font,
        path,
        requestedFamily,
        requestedWeight: fontWeight,
        styleCandidates,
      });
      return { attemptedStyles, font };
    }

    for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
      const family = families[familyIndex];
      for (const style of styleCandidates) {
        const candidate = { family, style };
        noteAttempt(style);
        try {
          await figma.loadFontAsync(candidate);
          if (familyIndex > 0) {
            warn(
              `Loaded fallback font for ${path}; ${families[0]} was unavailable, using ${family} ${style}.`,
            );
          }
          return resolved(candidate);
        } catch {
          // Try the next style, then the family's actual style list.
        }
      }

      const nearest = await loadNearestAvailableFont(family, fontWeight, fontItalic);
      for (const style of nearest.attemptedStyles) noteAttempt(style);
      if (nearest.font) {
        if (familyIndex > 0) {
          warn(
            `Loaded fallback font for ${path}; ${families[0]} was unavailable, using ${nearest.font.family} ${nearest.font.style}.`,
          );
        }
        return resolved(nearest.font);
      }
    }

    const fallback = { family: "Inter", style: "Regular" };
    noteAttempt(fallback.style);
    try {
      await figma.loadFontAsync(fallback);
      warn(
        `Loaded fallback font for ${path}; ${families.join(", ") || "CSS generic family"} (${styleCandidates.join(", ")}) was unavailable.`,
      );
      return resolved(fallback);
    } catch (error) {
      warn(`Could not load fallback font for ${path}: ${formatError(error)}`);
      throw error;
    }
  }

  function resolveTokenValue(
    tokenName: string | undefined,
    visited = new Set<string>(),
  ): FigmaVariableValue | undefined {
    if (!tokenName) return undefined;
    if (visited.has(tokenName)) return undefined;
    visited.add(tokenName);

    const token = tokenByCssName.get(tokenName);
    if (!token) return undefined;
    if (token.alias) return resolveTokenValue(token.alias, visited);
    return token.rawValue || token.value;
  }

  function resolveTokenSpec(
    tokenName: string | undefined,
    visited = new Set<string>(),
  ): FigmaExportToken | undefined {
    if (!tokenName || visited.has(tokenName)) return undefined;
    visited.add(tokenName);
    const token = tokenByCssName.get(tokenName);
    if (!token) return undefined;
    if (token.alias) return resolveTokenSpec(token.alias, visited) ?? token;
    return token;
  }

  // The raw CSS value is the comparison truth (export-side value transforms
  // like the opacity percent scale must not skew the check).
  function resolveTokenNumber(tokenName: string): number | undefined {
    const spec = resolveTokenSpec(tokenName);
    if (!spec) return undefined;
    const raw = String(spec.rawValue ?? "").trim();
    const match = raw.match(/^-?\d*\.?\d+/);
    if (match) return Number(match[0]);
    return typeof spec.value === "number" ? spec.value : undefined;
  }

  function resolveTokenRgba(tokenName: string): RgbaColor | undefined {
    const spec = resolveTokenSpec(tokenName);
    if (!spec || spec.type !== "COLOR") return undefined;
    if (isColor(spec.value)) return spec.value;
    return colorFromCssStrict(String(spec.rawValue ?? ""));
  }

  // Computed styles are ground truth: a variable may only bind when its
  // resolved value matches the style value it would replace (a unitless
  // line-height ratio must never override a pixel line height).
  function tokenNumberMatchesStyle(
    tokenName: string | undefined,
    styleValue: number | undefined,
  ): boolean {
    if (!tokenName) return true;
    if (typeof styleValue !== "number" || !Number.isFinite(styleValue)) return true;
    const tokenValue = resolveTokenNumber(tokenName);
    if (tokenValue === undefined) return true;
    if (Math.abs(tokenValue - styleValue) <= 0.6) return true;
    return (
      styleValue !== 0 &&
      Math.abs(tokenValue - styleValue) / Math.abs(styleValue) <= 0.01
    );
  }

  function safeBindNumberMatched(
    node: SceneNode,
    field: string,
    tokenName: string | undefined,
    styleValue: number | undefined,
    path: string,
  ): void {
    if (!tokenName) return;
    if (!tokenNumberMatchesStyle(tokenName, styleValue)) {
      warn(
        `Skipped ${path}.${field} binding to ${tokenName}: token value ` +
          `${resolveTokenNumber(tokenName)} does not match the rendered value ${styleValue}.`,
      );
      return;
    }
    safeBind(node, field, tokenName, path);
  }

  function rgbaRoughlyEqual(a: RgbaColor, b: RgbaColor): boolean {
    return (
      Math.abs(a.r - b.r) <= 0.012 &&
      Math.abs(a.g - b.g) <= 0.012 &&
      Math.abs(a.b - b.b) <= 0.012 &&
      Math.abs(safeNumber(a.a, 1) - safeNumber(b.a, 1)) <= 0.02
    );
  }

  function tokenColorMatchesStyle(
    tokenName: string | undefined,
    cssValue: string | undefined,
  ): boolean {
    if (!tokenName || !cssValue) return true;
    const tokenColor = resolveTokenRgba(tokenName);
    if (!tokenColor) return true;
    const styleColor = colorFromCssStrict(cssValue);
    if (!styleColor) return true;
    return rgbaRoughlyEqual(tokenColor, styleColor);
  }

  function getFontFamilyFromToken(tokenName: string | undefined): string | undefined {
    const value = resolveTokenValue(tokenName);
    return typeof value === "string" ? getFontFamily(value) : undefined;
  }

  async function loadBoundFontFamily(
    tokenName: string,
    fontWeight: number,
    italic: boolean,
    path: string,
  ): Promise<boolean> {
    const family = getFontFamilyFromToken(tokenName);
    if (!family) {
      warn(`Could not resolve font family token for ${path}.fontFamily: ${tokenName}`);
      return false;
    }

    const styleCandidates = getFontStyleCandidates(fontWeight, italic);
    for (const style of styleCandidates) {
      try {
        await figma.loadFontAsync({ family, style });
        return true;
      } catch {
        // Try the next style for the same family before skipping the binding.
      }
    }

    if (await loadNearestAvailableFont(family, fontWeight, italic)) return true;

    warn(
      `Skipped fontFamily binding for ${path}; ${family} (${styleCandidates.join(", ")}) could not be loaded.`,
    );
    return false;
  }

  // Turns this run's substitution records into the whole-environment reading.
  // Placed first in warnings because the report area truncates, and this line
  // names the corrective action for every per-node font warning below it. When
  // the determination does not hold, those per-family messages stand alone.
  function reportFontEnvironmentFault(): void {
    const message = formatFontEnvironmentFaultWarning(
      detectFontEnvironmentFault(stats.fontSubstitutions),
    );
    if (message) stats.warnings.unshift(message);
  }

  return {
    canCreateComponentDefinition,
    createComponentSetFromVariants,
    createNode,
    ensureComponentDefinition,
    getComponentDefinitionParentPage,
    organizeComponentDependencySections,
    preparePageComponentDefinitions,
    reportFontEnvironmentFault,
    stats,
    upsertVariables,
  };
}

async function getCollection(
  layer: TokenCollection,
  collectionNames: Record<TokenCollection, string>,
): Promise<VariableCollection> {
  const collectionName = collectionNames[layer];
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const existing = collections.find((collection) => collection.name === collectionName);
  if (existing) return existing;

  const created = figma.variables.createVariableCollection(collectionName);
  if (created.modes[0] && created.modes[0].name !== "Default") {
    created.renameMode(created.modes[0].modeId, "Default");
  }
  return created;
}

async function findExistingVariable(
  collection: VariableCollection,
  spec: FigmaExportToken,
  pluginDataKey: string,
): Promise<Variable | undefined> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const collectionVariables = variables.filter(
    (variable) => variable.variableCollectionId === collection.id,
  );

  const byPluginData = collectionVariables.find(
    (variable) =>
      getVariablePluginData(variable, pluginDataKey) === spec.cssName ||
      getVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) === spec.cssName,
  );
  if (byPluginData) return byPluginData;

  return collectionVariables.find((variable) => variable.name === spec.figmaName);
}

async function findVariableByCssToken(
  cssName: string,
  pluginDataKey: string,
): Promise<Variable | undefined> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const byPluginData = variables.find(
    (variable) =>
      getVariablePluginData(variable, pluginDataKey) === cssName ||
      getVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) === cssName,
  );
  if (byPluginData) return byPluginData;

  const figmaName = cssTokenToFigmaVariableName(cssName);
  return variables.find((variable) => variable.name === figmaName);
}

function getVariablePluginData(variable: Variable, key: string): string {
  try {
    return (variable as VariablePluginData).getPluginData?.(key) ?? "";
  } catch {
    return "";
  }
}

function setVariablePluginData(variable: Variable, key: string, value: string): void {
  (variable as VariablePluginData).setPluginData?.(key, value);
}

function getNodePluginData(node: BaseNode, key: string): string {
  try {
    return (node as NodePluginData).getPluginData?.(key) ?? "";
  } catch {
    return "";
  }
}

function setNodePluginData(node: BaseNode, key: string, value: string): void {
  try {
    (node as NodePluginData).setPluginData?.(key, value);
  } catch {
    // Component metadata is best-effort and only used for future reuse.
  }
}

function getComponentSpecHash(spec: FigmaExportNode): string {
  const normalized = {
    ...spec,
    styles: { ...spec.styles, x: 0, y: 0 },
  };
  const json = JSON.stringify(normalized);
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) {
    hash = ((hash << 5) + hash + json.charCodeAt(index)) | 0;
  }
  return String(hash >>> 0);
}

function getComponentDisplayName(component: FigmaComponentReference): string {
  const variantDisplayName = getVariantPropertyDisplayName(component);
  if (variantDisplayName) return `${component.name}, ${variantDisplayName}`;
  return component.name;
}

function getVariantPropertyDisplayName(component: FigmaComponentReference): string {
  const variantProperties =
    component.variantProperties && Object.keys(component.variantProperties).length > 0
      ? component.variantProperties
      : component.variant
        ? { Variant: component.variant }
        : undefined;

  if (!variantProperties) return "";
  return Object.entries(variantProperties)
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");
}

function cssTokenToFigmaVariableName(cssName: string): string {
  return cssName.replace(/^--/, "").replace(/-/g, "/");
}

function collectFontFamilyTokenNames(
  root: FigmaExportNode,
  tokenByCssName: ReadonlyMap<string, FigmaExportToken>,
): Set<string> {
  const names = new Set<string>();

  function addAliasChain(tokenName: string | undefined): void {
    let current = tokenName;
    while (current && !names.has(current)) {
      names.add(current);
      current = tokenByCssName.get(current)?.alias;
    }
  }

  function visit(node: FigmaExportNode): void {
    addAliasChain(node.bindings?.fontFamily);
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return names;
}

function normalizeVariableValue(
  spec: FigmaExportToken,
  fontFamilyTokenNames: ReadonlySet<string> = new Set<string>(),
): VariableValue {
  const value = spec.value ?? parseRawTokenValue(spec.rawValue, spec.type);

  if (spec.type === "COLOR") {
    return cloneColor(value);
  }
  if (spec.type === "FLOAT") {
    return safeNumber(value, 0);
  }
  if (spec.type === "BOOLEAN") {
    return Boolean(value);
  }
  if (
    spec.type === "STRING" &&
    ((Array.isArray(spec.scopes) && spec.scopes.includes("FONT_FAMILY")) ||
      fontFamilyTokenNames.has(spec.cssName))
  ) {
    return getFontFamily(String(spec.rawValue || spec.value || "Inter"));
  }
  return String(value ?? "");
}

function parseRawTokenValue(
  rawValue: string | undefined,
  type: FigmaVariableType,
): FigmaVariableValue {
  const raw = String(rawValue ?? "").trim();

  if (type === "COLOR") return colorFromCss(raw);
  if (type === "FLOAT") {
    const number = raw.match(/^-?\d+(?:\.\d+)?/);
    return number ? Number(number[0]) : 0;
  }
  if (type === "BOOLEAN") return raw === "true";
  return raw.replace(/^["']|["']$/g, "");
}

function cloneColor(value: unknown): RGBA {
  const color = isColor(value) ? value : colorFromCss(String(value ?? ""));
  return {
    a: clamp(safeNumber(color.a, 1), 0, 1),
    b: clamp(safeNumber(color.b, 0), 0, 1),
    g: clamp(safeNumber(color.g, 0), 0, 1),
    r: clamp(safeNumber(color.r, 0), 0, 1),
  };
}

// CSS angles are clockwise with 0deg pointing up; Figma's identity gradient
// runs along +x (the CSS 90deg direction). Rotate about the tile center so
// any angle maps, not just the four axis-aligned ones.
function getLinearGradientTransform(angle: number): Transform {
  const radians = ((angle - 90) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const translateX = 0.5 - (cos * 0.5 + sin * 0.5);
  const translateY = 0.5 - (-sin * 0.5 + cos * 0.5);
  return [
    [cos, sin, translateX],
    [-sin, cos, translateY],
  ];
}

// Accepts commas, spaces, and the slash alpha separator so both legacy
// "rgb(1, 2, 3)" and modern "rgb(1 2 3 / 0.5)" syntaxes parse.
function splitColorComponents(inner: string): string[] {
  return inner
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter((part) => part.length > 0);
}

function parseColorComponent(part: string | undefined, scale: number): number | undefined {
  if (part === undefined) return undefined;
  const percent = part.match(/^(-?\d*\.?\d+)%$/);
  if (percent) return (Number(percent[1]) / 100) * scale;
  const numeric = part.match(/^(-?\d*\.?\d+)$/);
  return numeric ? Number(numeric[1]) : undefined;
}

function hslToRgbColor(hue: number, saturation: number, lightness: number): {
  b: number;
  g: number;
  r: number;
} {
  const normalizedHue = (((hue % 360) + 360) % 360) / 60;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs((normalizedHue % 2) - 1));
  const offset = lightness - chroma / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (normalizedHue < 1) [r, g, b] = [chroma, secondary, 0];
  else if (normalizedHue < 2) [r, g, b] = [secondary, chroma, 0];
  else if (normalizedHue < 3) [r, g, b] = [0, chroma, secondary];
  else if (normalizedHue < 4) [r, g, b] = [0, secondary, chroma];
  else if (normalizedHue < 5) [r, g, b] = [secondary, 0, chroma];
  else [r, g, b] = [chroma, 0, secondary];

  return { b: b + offset, g: g + offset, r: r + offset };
}

// The exporter normalizes colors to hex/rgb, so named values only appear in
// hand-written payloads or raw token values; a small map keeps the common
// ones from importing as black.
const NAMED_CSS_COLORS: Record<string, RgbaColor> = {
  black: { a: 1, b: 0, g: 0, r: 0 },
  blue: { a: 1, b: 1, g: 0, r: 0 },
  gray: { a: 1, b: 0.502, g: 0.502, r: 0.502 },
  green: { a: 1, b: 0, g: 0.502, r: 0 },
  grey: { a: 1, b: 0.502, g: 0.502, r: 0.502 },
  red: { a: 1, b: 0, g: 0, r: 1 },
  transparent: { a: 0, b: 0, g: 0, r: 0 },
  white: { a: 1, b: 1, g: 1, r: 1 },
};

// Returns undefined for formats colorFromCss cannot faithfully parse, so
// value comparisons never mistake the black fallback for a real color.
function colorFromCssStrict(cssValue: string): RgbaColor | undefined {
  const value = cssValue.trim();
  if (!value) return undefined;
  if (
    NAMED_CSS_COLORS[value.toLowerCase()] ||
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgba?\(/i.test(value) ||
    /^hsla?\(/i.test(value)
  ) {
    return colorFromCss(value);
  }
  return undefined;
}

function colorFromCss(cssValue: string | undefined): RgbaColor {
  if (!cssValue) return { a: 1, b: 0, g: 0, r: 0 };

  const value = cssValue.trim();
  const named = NAMED_CSS_COLORS[value.toLowerCase()];
  if (named) return { ...named };

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      const channel = (index: number) =>
        Number.parseInt(`${digits[index]}${digits[index]}`, 16) / 255;
      return {
        a: digits.length === 4 ? channel(3) : 1,
        b: channel(2),
        g: channel(1),
        r: channel(0),
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      const channel = (index: number) =>
        Number.parseInt(digits.slice(index, index + 2), 16) / 255;
      return {
        a: digits.length === 8 ? channel(6) : 1,
        b: channel(4),
        g: channel(2),
        r: channel(0),
      };
    }
    return { a: 1, b: 0, g: 0, r: 0 };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = splitColorComponents(rgb[1]);
    return {
      a: clamp(safeNumber(parseColorComponent(parts[3], 1), 1), 0, 1),
      b: clamp(safeNumber(parseColorComponent(parts[2], 255), 0) / 255, 0, 1),
      g: clamp(safeNumber(parseColorComponent(parts[1], 255), 0) / 255, 0, 1),
      r: clamp(safeNumber(parseColorComponent(parts[0], 255), 0) / 255, 0, 1),
    };
  }

  const hsl = value.match(/^hsla?\(([^)]+)\)$/i);
  if (hsl) {
    const parts = splitColorComponents(hsl[1]);
    const hue = safeNumber(
      parseColorComponent(parts[0]?.replace(/deg$/i, ""), 360),
      0,
    );
    const saturation = clamp(safeNumber(parseColorComponent(parts[1], 1), 0), 0, 1);
    const lightness = clamp(safeNumber(parseColorComponent(parts[2], 1), 0), 0, 1);
    const alpha = clamp(safeNumber(parseColorComponent(parts[3], 1), 1), 0, 1);
    const rgbColor = hslToRgbColor(hue, saturation, lightness);
    return {
      a: alpha,
      b: clamp(rgbColor.b, 0, 1),
      g: clamp(rgbColor.g, 0, 1),
      r: clamp(rgbColor.r, 0, 1),
    };
  }

  return { a: 1, b: 0, g: 0, r: 0 };
}

function parsePayload(json: string): FigmaExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON. Use Storybook's Copy JSON output. ${formatError(error)}`);
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid payload: expected a JSON object.");
  }

  if (
    typeof parsed.version !== "number" ||
    !SUPPORTED_PAYLOAD_VERSIONS.includes(
      parsed.version as (typeof SUPPORTED_PAYLOAD_VERSIONS)[number],
    )
  ) {
    throw new Error(
      `Unsupported payload version ${String(parsed.version)}. Expected version 1 or 2.`,
    );
  }

  if (!Array.isArray(parsed.tokens)) {
    throw new Error("Invalid payload: tokens must be an array.");
  }

  if (!isRecord(parsed.root)) {
    throw new Error("Invalid payload: root node tree is missing.");
  }

  if (typeof parsed.componentTitle !== "string") {
    throw new Error("Invalid payload: componentTitle must be a string.");
  }

  if (typeof parsed.storyId !== "string" || typeof parsed.storyName !== "string") {
    throw new Error("Invalid payload: story metadata is missing.");
  }
  if (
    parsed.artifactKind !== undefined &&
    parsed.artifactKind !== "component" &&
    parsed.artifactKind !== "page"
  ) {
    throw new Error("Invalid payload: artifactKind must be component or page.");
  }
  if (parsed.storyTitle !== undefined && typeof parsed.storyTitle !== "string") {
    throw new Error("Invalid payload: storyTitle must be a string.");
  }
  if (parsed.component !== undefined) {
    validateComponentReference(parsed.component, "component");
  }
  if (parsed.reference !== undefined) {
    validateReferenceImage(parsed.reference);
  }

  for (const token of parsed.tokens) {
    validateToken(token);
  }
  validateNode(parsed.root, "root");

  return parsed as FigmaExportPayload;
}

function validateToken(token: unknown): void {
  if (!isRecord(token)) throw new Error("Invalid token: expected object.");
  if (
    token.collection !== "ref" &&
    token.collection !== "sys" &&
    token.collection !== "comp"
  ) {
    throw new Error(`Invalid token collection for ${String(token.cssName)}.`);
  }
  if (!isCssCustomPropertyName(token.cssName)) {
    throw new Error("Invalid token: cssName must be a CSS custom property name.");
  }
  if (typeof token.figmaName !== "string" || token.figmaName.length === 0) {
    throw new Error(`Invalid token ${token.cssName}: figmaName is missing.`);
  }
  if (
    token.type !== "BOOLEAN" &&
    token.type !== "COLOR" &&
    token.type !== "FLOAT" &&
    token.type !== "STRING"
  ) {
    throw new Error(`Invalid token ${token.cssName}: unsupported type.`);
  }
  if ("alias" in token && typeof token.alias !== "string") {
    throw new Error(`Invalid token ${token.cssName}: alias must be a string.`);
  }
}

function isCssCustomPropertyName(value: unknown): value is string {
  return typeof value === "string" && /^--[A-Za-z0-9_-]+$/.test(value);
}

function validateNode(node: unknown, path: string): void {
  if (!isRecord(node)) throw new Error(`Invalid node ${path}: expected object.`);
  if (
    node.kind !== "frame" &&
    node.kind !== "image" &&
    node.kind !== "svg" &&
    node.kind !== "text"
  ) {
    throw new Error(`Invalid node ${path}: unsupported kind.`);
  }
  if (typeof node.name !== "string") {
    throw new Error(`Invalid node ${path}: name must be a string.`);
  }
  if (!isRecord(node.styles)) {
    throw new Error(`Invalid node ${path}: styles are missing.`);
  }
  if (
    typeof node.styles.width !== "number" ||
    typeof node.styles.height !== "number" ||
    typeof node.styles.x !== "number" ||
    typeof node.styles.y !== "number"
  ) {
    throw new Error(`Invalid node ${path}: width, height, x, and y must be numbers.`);
  }
  if (
    node.styles.textAutoResize !== undefined &&
    node.styles.textAutoResize !== "WIDTH_AND_HEIGHT" &&
    node.styles.textAutoResize !== "HEIGHT"
  ) {
    throw new Error(`Invalid node ${path}: unsupported textAutoResize value.`);
  }
  if (
    node.styles.textTruncation !== undefined &&
    node.styles.textTruncation !== "ENDING"
  ) {
    throw new Error(`Invalid node ${path}: unsupported textTruncation value.`);
  }
  if (node.styles.maxLines !== undefined && typeof node.styles.maxLines !== "number") {
    throw new Error(`Invalid node ${path}: maxLines must be a number.`);
  }
  if (node.styles.textAlign !== undefined && typeof node.styles.textAlign !== "string") {
    throw new Error(`Invalid node ${path}: textAlign must be a string.`);
  }
  if (
    node.styles.layoutAlign !== undefined &&
    node.styles.layoutAlign !== "STRETCH"
  ) {
    throw new Error(`Invalid node ${path}: unsupported layoutAlign value.`);
  }
  if (
    node.styles.layoutGrow !== undefined &&
    node.styles.layoutGrow !== 1
  ) {
    throw new Error(`Invalid node ${path}: unsupported layoutGrow value.`);
  }
  if (
    node.styles.layoutSizingHorizontal !== undefined &&
    node.styles.layoutSizingHorizontal !== "HUG"
  ) {
    throw new Error(`Invalid node ${path}: unsupported layoutSizingHorizontal value.`);
  }
  if (
    node.styles.layoutSizingVertical !== undefined &&
    node.styles.layoutSizingVertical !== "HUG"
  ) {
    throw new Error(`Invalid node ${path}: unsupported layoutSizingVertical value.`);
  }
  if (
    node.styles.textAlignVertical !== undefined &&
    node.styles.textAlignVertical !== "CENTER"
  ) {
    throw new Error(`Invalid node ${path}: unsupported textAlignVertical value.`);
  }
  if (node.styles.backgroundLinearGradient !== undefined) {
    validateLinearGradient(node.styles.backgroundLinearGradient, `${path}.backgroundLinearGradient`);
  }
  if (node.styles.backgroundRadialGradient !== undefined) {
    validateRadialGradient(
      node.styles.backgroundRadialGradient,
      `${path}.backgroundRadialGradient`,
    );
  }
  if (node.styles.textGrowHeight !== undefined && typeof node.styles.textGrowHeight !== "boolean") {
    throw new Error(`Invalid node ${path}: textGrowHeight must be a boolean.`);
  }
  if (node.styles.blurEffects !== undefined) {
    validateEffects(node.styles.blurEffects, `${path}.blurEffects`);
  }
  if (node.styles.transformMatrix !== undefined) {
    validateTransformMatrix(node.styles.transformMatrix, `${path}.transformMatrix`);
  }
  if (
    node.styles.borderStyle !== undefined &&
    node.styles.borderStyle !== "dashed" &&
    node.styles.borderStyle !== "dotted"
  ) {
    throw new Error(`Invalid node ${path}: unsupported borderStyle value.`);
  }
  if (node.styles.borderSides !== undefined) {
    validateBorderSides(node.styles.borderSides, `${path}.borderSides`);
  }
  if (node.styles.effects !== undefined) {
    validateEffects(node.styles.effects, `${path}.effects`);
  }
  if (node.styles.radiusCorners !== undefined) {
    validateRadiusCorners(node.styles.radiusCorners, `${path}.radiusCorners`);
  }
  if (node.styles.layoutWrap !== undefined && node.styles.layoutWrap !== "WRAP") {
    throw new Error(`Invalid node ${path}: unsupported layoutWrap value.`);
  }
  if (
    node.styles.counterAxisSpacing !== undefined &&
    typeof node.styles.counterAxisSpacing !== "number"
  ) {
    throw new Error(`Invalid node ${path}: counterAxisSpacing must be a number.`);
  }
  if (
    node.styles.letterSpacing !== undefined &&
    typeof node.styles.letterSpacing !== "number"
  ) {
    throw new Error(`Invalid node ${path}: letterSpacing must be a number.`);
  }
  if (
    node.styles.textDecoration !== undefined &&
    node.styles.textDecoration !== "STRIKETHROUGH" &&
    node.styles.textDecoration !== "UNDERLINE"
  ) {
    throw new Error(`Invalid node ${path}: unsupported textDecoration value.`);
  }
  if (node.styles.fontStyle !== undefined && node.styles.fontStyle !== "italic") {
    throw new Error(`Invalid node ${path}: unsupported fontStyle value.`);
  }
  if (
    node.styles.imageScaleMode !== undefined &&
    node.styles.imageScaleMode !== "FILL" &&
    node.styles.imageScaleMode !== "FIT"
  ) {
    throw new Error(`Invalid node ${path}: unsupported imageScaleMode value.`);
  }
  if (node.imageBase64 !== undefined && typeof node.imageBase64 !== "string") {
    throw new Error(`Invalid node ${path}: imageBase64 must be a string.`);
  }
  if (node.imageMimeType !== undefined && typeof node.imageMimeType !== "string") {
    throw new Error(`Invalid node ${path}: imageMimeType must be a string.`);
  }
  if (node.styles.outOfFlow !== undefined && typeof node.styles.outOfFlow !== "boolean") {
    throw new Error(`Invalid node ${path}: outOfFlow must be a boolean.`);
  }
  if (node.styles.constraints !== undefined) {
    validateConstraints(node.styles.constraints, `${path}.constraints`);
  }
  if (node.component !== undefined) {
    validateComponentReference(node.component, `${path}.component`);
  }
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      throw new Error(`Invalid node ${path}: children must be an array.`);
    }
    node.children.forEach((child, index) => validateNode(child, `${path}/${index}`));
  }
}

const CONSTRAINT_VALUES = ["CENTER", "MAX", "MIN", "SCALE", "STRETCH"];

function validateConstraints(constraints: unknown, path: string): void {
  if (!isRecord(constraints)) {
    throw new Error(`Invalid node ${path}: expected object.`);
  }
  if (
    !CONSTRAINT_VALUES.includes(String(constraints.horizontal)) ||
    !CONSTRAINT_VALUES.includes(String(constraints.vertical))
  ) {
    throw new Error(`Invalid node ${path}: unsupported constraint value.`);
  }
}

const EFFECT_TYPES = [
  "BACKGROUND_BLUR",
  "DROP_SHADOW",
  "INNER_SHADOW",
  "LAYER_BLUR",
];
const EFFECT_NUMBER_FIELDS = ["blur", "offsetX", "offsetY", "spread"];
const RADIUS_CORNER_FIELDS = ["bottomLeft", "bottomRight", "topLeft", "topRight"];

function validateEffects(effects: unknown, path: string): void {
  if (!Array.isArray(effects)) {
    throw new Error(`Invalid node ${path}: effects must be an array.`);
  }

  effects.forEach((effect, index) => {
    if (!isRecord(effect)) {
      throw new Error(`Invalid node ${path}.${index}: expected object.`);
    }
    if (!EFFECT_TYPES.includes(String(effect.type))) {
      throw new Error(`Invalid node ${path}.${index}: unsupported effect type.`);
    }
    for (const field of EFFECT_NUMBER_FIELDS) {
      if (typeof effect[field] !== "number") {
        throw new Error(`Invalid node ${path}.${index}: ${field} must be a number.`);
      }
    }
    if (effect.color !== undefined && typeof effect.color !== "string") {
      throw new Error(`Invalid node ${path}.${index}: color must be a string.`);
    }
  });
}

function validateRadiusCorners(corners: unknown, path: string): void {
  if (!isRecord(corners)) {
    throw new Error(`Invalid node ${path}: expected object.`);
  }

  for (const field of RADIUS_CORNER_FIELDS) {
    if (typeof corners[field] !== "number") {
      throw new Error(`Invalid node ${path}.${field}: must be a number.`);
    }
  }
}

function validateBorderSides(borderSides: unknown, path: string): void {
  if (!isRecord(borderSides)) {
    throw new Error(`Invalid node ${path}: expected object.`);
  }

  for (const side of ["top", "right", "bottom", "left"]) {
    const value = borderSides[side];
    if (value === undefined) continue;
    if (!isRecord(value) || typeof value.width !== "number") {
      throw new Error(`Invalid node ${path}.${side}: width must be a number.`);
    }
    if (value.color !== undefined && typeof value.color !== "string") {
      throw new Error(`Invalid node ${path}.${side}: color must be a string.`);
    }
  }
}

function validateLinearGradient(gradient: unknown, path: string): void {
  if (!isRecord(gradient)) {
    throw new Error(`Invalid node ${path}: expected object.`);
  }
  if (typeof gradient.angle !== "number") {
    throw new Error(`Invalid node ${path}: angle must be a number.`);
  }
  if (!Array.isArray(gradient.stops) || gradient.stops.length < 2) {
    throw new Error(`Invalid node ${path}: stops must contain at least two colors.`);
  }

  gradient.stops.forEach((stop, index) => {
    if (!isRecord(stop)) {
      throw new Error(`Invalid node ${path}.stops.${index}: expected object.`);
    }
    if (typeof stop.color !== "string") {
      throw new Error(`Invalid node ${path}.stops.${index}: color must be a string.`);
    }
    if (typeof stop.position !== "number") {
      throw new Error(`Invalid node ${path}.stops.${index}: position must be a number.`);
    }
    if (stop.token !== undefined && typeof stop.token !== "string") {
      throw new Error(`Invalid node ${path}.stops.${index}: token must be a string.`);
    }
  });
}

function validateTransformMatrix(matrix: unknown, path: string): void {
  const isValid =
    Array.isArray(matrix) &&
    matrix.length === 2 &&
    matrix.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 3 &&
        row.every((value) => typeof value === "number" && Number.isFinite(value)),
    );
  if (!isValid) {
    throw new Error(`Invalid node ${path}: expected a 2x3 number matrix.`);
  }
}

function validateReferenceImage(reference: unknown): void {
  if (!isRecord(reference)) {
    throw new Error("Invalid reference: expected object.");
  }
  if (typeof reference.imageBase64 !== "string" || reference.imageBase64.length === 0) {
    throw new Error("Invalid reference: imageBase64 must be a non-empty string.");
  }
  if (typeof reference.imageMimeType !== "string") {
    throw new Error("Invalid reference: imageMimeType must be a string.");
  }
  if (
    typeof reference.width !== "number" ||
    typeof reference.height !== "number" ||
    reference.width <= 0 ||
    reference.height <= 0
  ) {
    throw new Error("Invalid reference: width and height must be positive numbers.");
  }
}

function validateRadialGradient(gradient: unknown, path: string): void {
  if (!isRecord(gradient)) {
    throw new Error(`Invalid node ${path}: expected object.`);
  }
  if (!Array.isArray(gradient.stops) || gradient.stops.length < 2) {
    throw new Error(`Invalid node ${path}: stops must contain at least two colors.`);
  }

  gradient.stops.forEach((stop, index) => {
    if (!isRecord(stop)) {
      throw new Error(`Invalid node ${path}.stops.${index}: expected object.`);
    }
    if (typeof stop.color !== "string") {
      throw new Error(`Invalid node ${path}.stops.${index}: color must be a string.`);
    }
    if (typeof stop.position !== "number") {
      throw new Error(`Invalid node ${path}.stops.${index}: position must be a number.`);
    }
    if (stop.token !== undefined && typeof stop.token !== "string") {
      throw new Error(`Invalid node ${path}.stops.${index}: token must be a string.`);
    }
  });
}

function validateComponentReference(component: unknown, path: string): void {
  if (!isRecord(component)) {
    throw new Error(`Invalid ${path}: expected object.`);
  }
  if (
    typeof component.key !== "string" ||
    typeof component.name !== "string" ||
    typeof component.sourceName !== "string"
  ) {
    throw new Error(`Invalid ${path}: key, name, and sourceName are required.`);
  }
  if (component.variant !== undefined && typeof component.variant !== "string") {
    throw new Error(`Invalid ${path}: variant must be a string.`);
  }
}

function getInferredChildTextAlignHorizontal(
  parent: FrameLikeNode,
): TextHorizontalAlign | undefined {
  if (parent.layoutMode === "HORIZONTAL") {
    if (parent.primaryAxisAlignItems === "CENTER") return "CENTER";
    if (parent.primaryAxisAlignItems === "MAX") return "RIGHT";
  }

  if (parent.layoutMode === "VERTICAL") {
    if (parent.counterAxisAlignItems === "CENTER") return "CENTER";
    if (parent.counterAxisAlignItems === "MAX") return "RIGHT";
  }

  return undefined;
}

// overflow auto/scroll/overlay also clip content in the browser; only
// visible lets children spill out of the box.
function shouldClipContent(overflow: string | undefined): boolean {
  return /(hidden|clip|auto|scroll|overlay)/i.test(String(overflow ?? ""));
}

// Rewrites the root <svg> tag so createNodeFromSvg yields the rendered size.
// Without a viewBox, changing width/height crops instead of scaling, so the
// intrinsic size becomes the viewBox first.
function setSvgRootSize(svgText: string, width: number, height: number): string {
  const match = svgText.match(/<svg\b[^>]*>/i);
  if (!match) return svgText;

  const rootTag = match[0];

  const readAttribute = (name: string): string | undefined => {
    const attribute = rootTag.match(
      new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
    );
    return attribute ? attribute[2] ?? attribute[3] : undefined;
  };

  const parseIntrinsicLength = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const length = value.trim().match(/^(\d*\.?\d+)(px)?$/);
    return length ? Number(length[1]) : undefined;
  };

  let nextTag = rootTag;
  const writeAttribute = (name: string, value: string) => {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*')`, "i");
    nextTag = pattern.test(nextTag)
      ? nextTag.replace(pattern, `${name}="${value}"`)
      : nextTag.replace(/<svg\b/i, `<svg ${name}="${value}"`);
  };

  if (!readAttribute("viewBox")) {
    const intrinsicWidth = parseIntrinsicLength(readAttribute("width"));
    const intrinsicHeight = parseIntrinsicLength(readAttribute("height"));
    if (intrinsicWidth && intrinsicHeight) {
      writeAttribute("viewBox", `0 0 ${intrinsicWidth} ${intrinsicHeight}`);
    }
  }
  writeAttribute("width", String(Math.max(1, width)));
  writeAttribute("height", String(Math.max(1, height)));

  return svgText.replace(rootTag, nextTag);
}

function mapTextAlignHorizontal(value: string | undefined): TextHorizontalAlign | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "center" || normalized === "-webkit-center") return "CENTER";
  if (normalized === "right" || normalized === "end") return "RIGHT";
  if (normalized === "justify") return "JUSTIFIED";
  if (normalized === "left" || normalized === "start") return "LEFT";
  return undefined;
}

// space-around/space-evenly intentionally map to MIN: the exporter converts
// their measured edge offsets into padding, so MIN reproduces the layout.
function mapAxisAlignment(value: string | undefined): "CENTER" | "MAX" | "MIN" | "SPACE_BETWEEN" {
  if (value === "center") return "CENTER";
  if (value === "flex-end" || value === "end" || value === "right") return "MAX";
  if (value === "space-between") return "SPACE_BETWEEN";
  return "MIN";
}

function mapCounterAlignment(value: string | undefined): "BASELINE" | "CENTER" | "MAX" | "MIN" {
  if (value === "center") return "CENTER";
  if (value === "flex-end" || value === "end") return "MAX";
  if (String(value ?? "").includes("baseline")) return "BASELINE";
  return "MIN";
}

function getUprightFontStyleCandidates(weight: number): string[] {
  if (weight >= 900) return ["Black", "Heavy", "ExtraBold", "Extra Bold", "Bold", "Regular"];
  if (weight >= 800) return ["ExtraBold", "Extra Bold", "Black", "Bold", "Regular"];
  if (weight >= 700) return ["Bold", "Semibold", "Semi Bold", "SemiBold", "Medium", "Regular"];
  if (weight >= 600) return ["Semi Bold", "Semibold", "SemiBold", "Medium", "Regular"];
  if (weight >= 500) return ["Medium", "Regular"];
  if (weight >= 400) return ["Regular"];
  if (weight >= 300) return ["Light", "Regular"];
  if (weight >= 200) return ["Extra Light", "ExtraLight", "Light", "Thin", "Regular"];
  return ["Thin", "Extra Light", "ExtraLight", "Light", "Regular"];
}

function getFontStyleCandidates(weight: number, italic = false): string[] {
  const upright = getUprightFontStyleCandidates(weight);
  if (!italic) return upright;

  // Prefer italic variants of the same weight, then fall back to upright.
  const italicCandidates = upright.map((style) =>
    style === "Regular" ? "Italic" : `${style} Italic`,
  );
  return italicCandidates.concat(upright);
}

const FONT_STYLE_WEIGHT_NAMES: Record<string, number> = {
  hairline: 100,
  thin: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  book: 400,
  normal: 400,
  regular: 400,
  roman: 400,
  medium: 500,
  demi: 600,
  demibold: 600,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

type ParsedFontStyle = { italic: boolean; weight: number };

// Parses a font style name into weight/italic semantics. W-number names
// (Hiragino "W6" -> 600) and purely numeric names win over the Latin table;
// unparseable names return undefined so callers can skip them.
function parseFontStyleWeight(styleName: string): ParsedFontStyle | undefined {
  const italic = /\b(italic|oblique)\b/i.test(styleName);
  const base = styleName
    .replace(/\b(italic|oblique)\b/gi, " ")
    .replace(/[\s_-]+/g, " ")
    .trim();
  const wNumber = /^w ?(\d{1,2})$/i.exec(base);
  if (wNumber) return { italic, weight: Number(wNumber[1]) * 100 };
  if (/^\d{2,4}$/.test(base)) return { italic, weight: Number(base) };
  if (!base && italic) return { italic, weight: 400 };
  const named = FONT_STYLE_WEIGHT_NAMES[base.toLowerCase().replace(/ /g, "")];
  return named === undefined ? undefined : { italic, weight: named };
}

// Picks the closest-weight style from a family's actual style names,
// preferring the requested slant, and the heavier style on weight ties
// (matching browser bolder-resolution behavior).
function selectNearestFontStyle(
  styles: string[],
  weight: number,
  italic: boolean,
): string | undefined {
  for (const requireSlantMatch of [true, false]) {
    let best: { distance: number; style: string; weight: number } | undefined;
    for (const style of styles) {
      const parsed = parseFontStyleWeight(style);
      if (!parsed) continue;
      if (requireSlantMatch ? parsed.italic !== italic : parsed.italic) continue;
      const distance = Math.abs(parsed.weight - weight);
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && parsed.weight > best.weight)
      ) {
        best = { distance, style, weight: parsed.weight };
      }
    }
    if (best) return best.style;
  }
  return undefined;
}

type FontEnvironmentFault = {
  families: string[];
  isEnvironmentFault: boolean;
};

// Two or more distinct requested families that failed every style in one run
// cannot be explained by "those fonts are not installed" — it points at the
// local font service being unreachable, which the plugin sandbox cannot probe
// directly. One failing family stays a per-family report. Pure: no Figma API,
// no network probing, and it never throws on malformed records.
function detectFontEnvironmentFault(
  substitutions: readonly FontSubstitution[] | undefined,
): FontEnvironmentFault {
  const families: string[] = [];
  for (const substitution of substitutions ?? []) {
    if (!substitution) continue;
    const requestedFamily =
      typeof substitution.requestedFamily === "string" ? substitution.requestedFamily : "";
    const loadedFamily =
      typeof substitution.loadedFamily === "string" ? substitution.loadedFamily : "";
    // A different loaded family means every style of the requested one failed;
    // a style-only substitution means the family itself did load.
    if (!requestedFamily || requestedFamily === loadedFamily) continue;
    if (!families.includes(requestedFamily)) families.push(requestedFamily);
  }
  return { families, isEnvironmentFault: families.length >= 2 };
}

// The report line for a determined environment fault: what failed, which
// families, and the corrective action. Undefined when the determination does
// not hold, so the individual per-family messages stand on their own.
function formatFontEnvironmentFaultWarning(fault: FontEnvironmentFault): string | undefined {
  if (!fault.isEnvironmentFault) return undefined;
  return (
    `All local fonts failed to load: ${fault.families.join(", ")} could not be loaded in any style. ` +
    "Figma's local font service is likely unavailable — restart Figma or check font access permissions, then import again."
  );
}

const CSS_GENERIC_FONT_FAMILIES = new Set([
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

function getFontFamilyCandidates(fontFamily: string | undefined): string[] {
  const candidates: string[] = [];
  let buffer = "";
  let quote: '"' | "'" | undefined;
  let escaped = false;

  function pushCandidate(): void {
    const candidate = buffer.trim().replace(/^["']|["']$/g, "");
    buffer = "";
    if (!candidate || CSS_GENERIC_FONT_FAMILIES.has(candidate.toLowerCase())) return;
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }

  for (const character of String(fontFamily ?? "")) {
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
    if (character === '"' || character === "'") {
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

function getFontFamily(fontFamily: string | undefined): string {
  return getFontFamilyCandidates(fontFamily)[0] ?? "Inter";
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isColor(value: unknown): value is RgbaColor {
  return (
    isRecord(value) &&
    typeof value.r === "number" &&
    typeof value.g === "number" &&
    typeof value.b === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Exposes pure helpers for Node-based verification (test/verify-pure-functions.cjs).
// The Figma plugin runtime has no CommonJS `module`, so this block never runs there.
declare const module: { exports?: Record<string, unknown> } | undefined;
if (typeof module !== "undefined" && module) {
  module.exports = {
    collectFontFamilyTokenNames,
    colorFromCss,
    colorFromCssStrict,
    detectFontEnvironmentFault,
    formatFontEnvironmentFaultWarning,
    getFontFamilyCandidates,
    getFontStyleCandidates,
    getLinearGradientTransform,
    normalizeVariableValue,
    parseFontStyleWeight,
    parsePayload,
    selectNearestFontStyle,
    selectVariantGroup,
    setSvgRootSize,
    shouldClipContent,
  };
}
