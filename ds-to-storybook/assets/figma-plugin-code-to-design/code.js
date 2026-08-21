"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
function getTextAlignHorizontal(spec, options) {
    var _a;
    var explicitTextAlign = mapTextAlignHorizontal(spec.styles.textAlign);
    if (explicitTextAlign)
        return explicitTextAlign;
    if (spec.kind === "text" && spec.styles.layoutAlign === "STRETCH")
        return "CENTER";
    return ((_a = options.inferredTextAlignHorizontal) !== null && _a !== void 0 ? _a : "LEFT");
}
function applyTextAlignHorizontal(node, spec, options, path) {
    try {
        node.textAlignHorizontal = getTextAlignHorizontal(spec, options);
    }
    catch (error) {
        console.warn("Could not set ".concat(path, ".textAlignHorizontal: ").concat(formatError(error)));
    }
}
function applyTextAlignVertical(node, value, path) {
    if (!value)
        return;
    try {
        node.textAlignVertical = value;
    }
    catch (error) {
        console.warn("Could not set ".concat(path, ".textAlignVertical: ").concat(formatError(error)));
    }
}
function applyTextAlignmentFromSpec(node, spec, options, path) {
    var _a;
    if (node.type === "TEXT" && spec.kind === "text") {
        applyTextAlignHorizontal(node, spec, options, path);
        applyTextAlignVertical(node, spec.styles.textAlignVertical, path);
        return;
    }
    if (!("children" in node))
        return;
    var children = Array.from(node.children).filter(function (child) { return "visible" in child; });
    var specChildren = (_a = spec.children) !== null && _a !== void 0 ? _a : [];
    var usedChildIndexes = new Set();
    var _loop_1 = function (specIndex) {
        var childSpec = specChildren[specIndex];
        var namedIndex = children.findIndex(function (child, childIndex) {
            return !usedChildIndexes.has(childIndex) && child.name === childSpec.name;
        });
        var fallbackIndex = specIndex < children.length && !usedChildIndexes.has(specIndex) ? specIndex : -1;
        var childIndex = namedIndex >= 0 ? namedIndex : fallbackIndex;
        if (childIndex < 0)
            return "continue";
        usedChildIndexes.add(childIndex);
        applyTextAlignmentFromSpec(children[childIndex], childSpec, options, "".concat(path, "/").concat(childSpec.name));
    };
    for (var specIndex = 0; specIndex < specChildren.length; specIndex += 1) {
        _loop_1(specIndex);
    }
}
function normalizeComponentIdentity(value) {
    return String(value !== null && value !== void 0 ? value : "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}
function getVariantGroupIdentity(group) {
    var first = group[0];
    if (!first)
        return "";
    return first.component.sourceName || first.component.name || "";
}
function variantGroupMatchesTitle(group, componentTitle) {
    var expected = normalizeComponentIdentity(componentTitle);
    if (!expected)
        return false;
    return group.some(function (entry) {
        return normalizeComponentIdentity(entry.component.name) === expected ||
            normalizeComponentIdentity(entry.component.sourceName) === expected;
    });
}
function getVariantGroupCandidateDepth(group) {
    if (!group.length)
        return Number.MAX_SAFE_INTEGER;
    return group.reduce(function (min, entry) { return Math.min(min, safeNumber(entry.depth, 0)); }, Number.MAX_SAFE_INTEGER);
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
function selectVariantGroup(groups, componentTitle) {
    var nonEmpty = groups
        .map(function (group, index) { return ({ group: group, index: index }); })
        .filter(function (entry) { return entry.group.length > 0; });
    var skippedIdentities = [];
    var noSelection = function () { return ({
        selectedIndex: -1,
        selectedIdentity: "",
        skippedIdentities: nonEmpty.map(function (entry) { return getVariantGroupIdentity(entry.group); }),
    }); };
    if (!nonEmpty.length)
        return noSelection();
    // Rule 1: identity match beats every count or depth heuristic.
    var matched = nonEmpty.filter(function (entry) {
        return variantGroupMatchesTitle(entry.group, componentTitle);
    });
    // Rule 2: fall back to the root-most groups holding at least two variants.
    var rootMostDepth = nonEmpty.reduce(function (min, entry) { return Math.min(min, getVariantGroupCandidateDepth(entry.group)); }, Number.MAX_SAFE_INTEGER);
    var eligible = matched.length
        ? matched
        : nonEmpty.filter(function (entry) {
            return entry.group.length >= 2 &&
                getVariantGroupCandidateDepth(entry.group) === rootMostDepth;
        });
    if (!eligible.length)
        return noSelection();
    var winner = eligible
        .slice()
        .sort(function (a, b) {
        var depthDelta = getVariantGroupCandidateDepth(a.group) - getVariantGroupCandidateDepth(b.group);
        if (depthDelta !== 0)
            return depthDelta;
        return b.group.length - a.group.length;
    })[0];
    for (var _i = 0, nonEmpty_1 = nonEmpty; _i < nonEmpty_1.length; _i++) {
        var entry = nonEmpty_1[_i];
        if (entry.index === winner.index)
            continue;
        skippedIdentities.push(getVariantGroupIdentity(entry.group));
    }
    return {
        selectedIndex: winner.index,
        selectedIdentity: getVariantGroupIdentity(winner.group),
        skippedIdentities: skippedIdentities,
    };
}
// Bump this on every behavior change so the Figma UI badge confirms which
// build is running (Figma re-reads code.js per run, but the badge removes doubt).
var PLUGIN_VERSION = "1.9.0 (2026-07-30)";
var SUPPORTED_PAYLOAD_VERSIONS = [1, 2];
var DEFAULT_TOKEN_PLUGIN_DATA_KEY = "storybookCssToken";
var LEGACY_CM_TOKEN_PLUGIN_DATA_KEY = "cmCssToken";
var STORYBOOK_COMPONENT_PLUGIN_DATA_KEY = "storybookComponentKey";
var COMPONENT_SET_GRID_GAP = 32;
var COMPONENT_SET_GRID_MIN_CELL_WIDTH = 96;
var COMPONENT_SET_GRID_MIN_CELL_HEIGHT = 72;
var COMPONENT_SET_GRID_COMPACT_MAX_SIZE = 96;
var COMPONENT_SET_GRID_MEDIUM_MAX_SIZE = 180;
var COMPONENT_SET_GRID_COMPACT_COLUMNS = 8;
var COMPONENT_SET_GRID_MEDIUM_COLUMNS = 4;
var COMPONENTS_PAGE_NAME = "Components";
var COMPONENT_SECTION_GAP = 160;
var COMPONENT_SECTION_MIN_HEIGHT = 160;
var COMPONENT_SECTION_MIN_WIDTH = 240;
var COMPONENT_SECTION_PADDING = 64;
var COMPONENT_SECTION_PLUGIN_DATA_KEY = "storybookComponentSectionKey";
var REFERENCE_IMAGE_PLUGIN_DATA_KEY = "storybookReferenceImage";
var REFERENCE_IMAGE_GAP = 64;
var COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY = "storybookComponentSpecHash";
var COMPONENT_SECTION_ROLE_PLUGIN_DATA_KEY = "storybookComponentSectionRole";
var STORYBOOK_STORY_PLUGIN_DATA_KEY = "storybookStoryId";
var COLLECTION_NAMES = {
    comp: "comp",
    ref: "ref",
    sys: "sys",
};
var COLLECTION_ORDER = {
    ref: 0,
    sys: 1,
    comp: 2,
};
var INDIVIDUAL_RADIUS_BINDING_FIELDS = [
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
figma.ui.onmessage = function (msg) {
    if (msg.type === "cancel") {
        figma.closePlugin();
        return;
    }
    if (msg.type === "import-json") {
        void importFromJson(msg.json, msg.includeReference === true);
    }
};
function importFromJson(json, includeReference) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, stats, error_1, message;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    figma.ui.postMessage({ status: "importing", type: "import-status" });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    payload = parsePayload(json);
                    return [4 /*yield*/, importStorybookDesign(payload, includeReference)];
                case 2:
                    stats = _b.sent();
                    figma.ui.postMessage({
                        stats: stats,
                        type: "import-complete",
                    });
                    figma.notify("Imported ".concat(payload.componentTitle, " / ").concat(payload.storyName, " as ").concat((_a = stats.rootType) !== null && _a !== void 0 ? _a : "node", ": ").concat(stats.nodesCreated, " nodes, ").concat(stats.tokensChecked, " variables checked. (plugin v").concat(PLUGIN_VERSION, ")"));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    message = error_1 instanceof Error ? error_1.message : String(error_1);
                    figma.ui.postMessage({
                        message: message,
                        type: "import-error",
                    });
                    figma.notify("Storybook Code To Design import failed: ".concat(message), { error: true });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function importStorybookDesign(payload_1) {
    return __awaiter(this, arguments, void 0, function (payload, includeReference) {
        var artifactKind, shouldImportAsComponent, targetPage, _a, context, rootComponent, rootNode, _b, _c, componentViewportNode, viewportNode, componentDefinitionsPage, dependencySections;
        if (includeReference === void 0) { includeReference = false; }
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, figma.loadAllPagesAsync()];
                case 1:
                    _d.sent();
                    artifactKind = getPayloadArtifactKind(payload);
                    shouldImportAsComponent = artifactKind === "component";
                    if (!shouldImportAsComponent) return [3 /*break*/, 3];
                    return [4 /*yield*/, getOrCreateComponentsPage()];
                case 2:
                    _a = _d.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, getPageArtifactTargetPage(payload)];
                case 4:
                    _a = _d.sent();
                    _d.label = 5;
                case 5:
                    targetPage = _a;
                    return [4 /*yield*/, setCurrentPageIfNeeded(targetPage)];
                case 6:
                    _d.sent();
                    context = createImportContext(payload);
                    return [4 /*yield*/, context.upsertVariables()];
                case 7:
                    _d.sent();
                    if (!!shouldImportAsComponent) return [3 /*break*/, 9];
                    return [4 /*yield*/, context.preparePageComponentDefinitions(payload.root)];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9:
                    rootComponent = getPayloadRootComponent(payload, artifactKind);
                    if (!(shouldImportAsComponent &&
                        rootComponent &&
                        context.canCreateComponentDefinition(payload.root))) return [3 /*break*/, 11];
                    return [4 /*yield*/, context.ensureComponentDefinition(payload.root, rootComponent, payload.root.name, { reuseComponents: true })];
                case 10:
                    _b = _d.sent();
                    return [3 /*break*/, 16];
                case 11:
                    if (!shouldImportAsComponent) return [3 /*break*/, 13];
                    return [4 /*yield*/, context.createComponentSetFromVariants(payload.root, payload.componentTitle)];
                case 12:
                    _c = _d.sent();
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, context.createNode(payload.root, payload.root.name, {
                        isRoot: true,
                        reuseComponents: true,
                    })];
                case 14:
                    _c = _d.sent();
                    _d.label = 15;
                case 15:
                    _b = _c;
                    _d.label = 16;
                case 16:
                    rootNode = _b;
                    if (shouldImportAsComponent && rootComponent) {
                        rootNode.name = getComponentDisplayName(rootComponent);
                    }
                    else if (rootNode.type !== "COMPONENT_SET") {
                        rootNode.name = "".concat(payload.componentTitle, " / ").concat(payload.storyName);
                    }
                    componentViewportNode = shouldImportAsComponent
                        ? getComponentImportViewportNode(rootNode)
                        : rootNode;
                    viewportNode = shouldImportAsComponent
                        ? placeComponentImportInSection(componentViewportNode, payload, targetPage)
                        : rootNode;
                    componentDefinitionsPage = shouldImportAsComponent
                        ? targetPage
                        : context.getComponentDefinitionParentPage();
                    dependencySections = context.organizeComponentDependencySections(rootNode, componentDefinitionsPage);
                    if (!shouldImportAsComponent) {
                        rootNode.x = 0;
                        rootNode.y = 0;
                    }
                    if (!rootNode.parent)
                        figma.currentPage.appendChild(rootNode);
                    if (viewportNode.parent === figma.currentPage) {
                        figma.currentPage.selection = [viewportNode];
                    }
                    if (includeReference) {
                        placeBrowserReferenceImage(payload, shouldImportAsComponent ? componentViewportNode : rootNode, viewportNode, targetPage, context.stats);
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
                    return [2 /*return*/, context.stats];
            }
        });
    });
}
function getPayloadArtifactKind(payload) {
    var _a;
    if (payload.artifactKind)
        return payload.artifactKind;
    if ((_a = payload.storyTitle) === null || _a === void 0 ? void 0 : _a.startsWith("Pages/"))
        return "page";
    return "component";
}
function getPayloadRootComponent(payload, artifactKind) {
    var _a;
    if (artifactKind !== "component")
        return undefined;
    return (_a = payload.component) !== null && _a !== void 0 ? _a : payload.root.component;
}
function getOrCreateComponentsPage() {
    return __awaiter(this, void 0, void 0, function () {
        var existing, page;
        return __generator(this, function (_a) {
            existing = figma.root.children.find(function (page) { return page.name === COMPONENTS_PAGE_NAME; });
            if (existing)
                return [2 /*return*/, existing];
            page = figma.createPage();
            page.name = COMPONENTS_PAGE_NAME;
            return [2 /*return*/, page];
        });
    });
}
function setCurrentPageIfNeeded(page) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (figma.currentPage.id === page.id)
                        return [2 /*return*/];
                    return [4 /*yield*/, figma.setCurrentPageAsync(page)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getPageArtifactTargetPage(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var componentsPageName, pageName, existing, page;
        var _a, _b;
        return __generator(this, function (_c) {
            componentsPageName = ((_b = (_a = payload.componentSystem) === null || _a === void 0 ? void 0 : _a.componentsPageName) === null || _b === void 0 ? void 0 : _b.trim()) || COMPONENTS_PAGE_NAME;
            if (figma.currentPage.name.toLowerCase() !== componentsPageName.toLowerCase()) {
                return [2 /*return*/, figma.currentPage];
            }
            pageName = getPageArtifactPageName(payload);
            existing = figma.root.children.find(function (page) { return page.name.toLowerCase() === pageName.toLowerCase(); });
            if (existing)
                return [2 /*return*/, existing];
            page = figma.createPage();
            page.name = pageName;
            return [2 /*return*/, page];
        });
    });
}
function getPageArtifactPageName(payload) {
    var title = (payload.storyTitle || payload.componentTitle || "").trim();
    var normalizedTitle = title.startsWith("Pages/")
        ? title.slice("Pages/".length)
        : title;
    return normalizedTitle.replace(/\//g, " / ") || "Storybook Pages";
}
function placeComponentImportInSection(rootNode, payload, targetPage) {
    var rootComponent = getComponentImportSectionReference(rootNode, payload);
    var shouldUseComponentSection = Boolean(rootComponent && (rootComponent.variant || rootNode.type === "COMPONENT_SET"));
    return placeNodeInComponentSection(rootNode, targetPage, {
        key: shouldUseComponentSection && rootComponent
            ? getComponentReferenceSectionKey(rootComponent)
            : getRootComponentSectionKey(payload),
        metadata: {
            componentTitle: payload.componentTitle,
            storyId: payload.storyId,
            storyName: payload.storyName,
        },
        name: shouldUseComponentSection && rootComponent
            ? getComponentReferenceSectionName(rootComponent)
            : getComponentSectionName(payload),
        role: "root",
    });
}
function getComponentImportSectionReference(rootNode, payload) {
    var rootComponent = getPayloadRootComponent(payload, "component");
    if (rootComponent)
        return rootComponent;
    if (rootNode.type !== "COMPONENT_SET")
        return undefined;
    var name = getNodePluginData(rootNode, "storybookComponentName") ||
        payload.componentTitle ||
        rootNode.name ||
        "Component";
    var sourceName = getNodePluginData(rootNode, "storybookComponentSource") || name;
    return {
        key: "component:".concat(sourceName),
        name: name,
        sourceName: sourceName,
    };
}
function getComponentImportViewportNode(rootNode) {
    var _a;
    if (rootNode.type === "COMPONENT" && ((_a = rootNode.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET") {
        return rootNode.parent;
    }
    return rootNode;
}
function placeNodeInComponentSection(node, targetPage, target) {
    var _a = getOrCreateComponentSection(targetPage, target.name, target.key), created = _a.created, section = _a.section;
    configureComponentSection(section, target);
    if (created) {
        positionNewComponentSection(section, targetPage);
    }
    for (var _i = 0, _b = __spreadArray([], section.children, true); _i < _b.length; _i++) {
        var child = _b[_i];
        if (child.id !== node.id)
            child.remove();
    }
    if (node.parent !== section) {
        section.appendChild(node);
    }
    node.x = COMPONENT_SECTION_PADDING;
    node.y = COMPONENT_SECTION_PADDING;
    resizeSectionToChild(section, node);
    return section;
}
function getOrCreateComponentSection(targetPage, sectionName, sectionKey) {
    var existing = targetPage.children.find(function (node) {
        return (node.type === "SECTION" &&
            (getNodePluginData(node, COMPONENT_SECTION_PLUGIN_DATA_KEY) === sectionKey ||
                getNodePluginData(node, STORYBOOK_STORY_PLUGIN_DATA_KEY) === sectionKey ||
                node.name === sectionName));
    });
    if (existing)
        return { created: false, section: existing };
    var section = figma.createSection();
    if (section.parent !== targetPage) {
        targetPage.appendChild(section);
    }
    return { created: true, section: section };
}
function configureComponentSection(section, target) {
    var _a, _b, _c;
    section.name = target.name;
    section.fills = [whitePaint()];
    section.strokes = [];
    setNodePluginData(section, COMPONENT_SECTION_PLUGIN_DATA_KEY, target.key);
    setNodePluginData(section, COMPONENT_SECTION_ROLE_PLUGIN_DATA_KEY, target.role);
    if ((_a = target.metadata) === null || _a === void 0 ? void 0 : _a.storyId) {
        setNodePluginData(section, STORYBOOK_STORY_PLUGIN_DATA_KEY, target.metadata.storyId);
    }
    if ((_b = target.metadata) === null || _b === void 0 ? void 0 : _b.componentTitle) {
        setNodePluginData(section, "storybookComponentTitle", target.metadata.componentTitle);
    }
    if ((_c = target.metadata) === null || _c === void 0 ? void 0 : _c.storyName) {
        setNodePluginData(section, "storybookStoryName", target.metadata.storyName);
    }
}
function getComponentSectionName(payload) {
    var componentTitle = payload.componentTitle.trim() || "Component";
    var storyName = payload.storyName.trim();
    return storyName ? "".concat(componentTitle, " / ").concat(storyName) : componentTitle;
}
function getRootComponentSectionKey(payload) {
    return "story:".concat(payload.storyId);
}
function getComponentReferenceSectionKey(component) {
    var source = String(component.sourceName || component.name || component.key).trim();
    return "component:".concat(source || component.key);
}
function getComponentReferenceSectionName(component) {
    return component.name || component.sourceName || "Component";
}
function cleanupEmptyManagedSections(targetPage) {
    for (var _i = 0, _a = __spreadArray([], targetPage.children, true); _i < _a.length; _i++) {
        var node = _a[_i];
        if (node.type !== "SECTION")
            continue;
        var isManagedSection = Boolean(getNodePluginData(node, COMPONENT_SECTION_PLUGIN_DATA_KEY) ||
            getNodePluginData(node, STORYBOOK_STORY_PLUGIN_DATA_KEY));
        if (isManagedSection && node.children.length === 0) {
            node.remove();
        }
    }
}
// Places the exporter's browser-render snapshot as a locked layer next to
// the import, so node-graph gaps are immediately visible inside Figma.
function placeBrowserReferenceImage(payload, anchorNode, viewportNode, targetPage, stats) {
    var reference = payload.reference;
    if (!reference)
        return;
    var frame;
    try {
        var bytes = figma.base64Decode(reference.imageBase64);
        var image = figma.createImage(bytes);
        frame = figma.createFrame();
        frame.name = "Browser Reference";
        frame.resize(Math.max(1, safeNumber(reference.width, 1)), Math.max(1, safeNumber(reference.height, 1)));
        frame.fills = [{ imageHash: image.hash, scaleMode: "FILL", type: "IMAGE" }];
    }
    catch (error) {
        stats.warnings.push("Could not create the browser reference image: ".concat(formatError(error)));
        return;
    }
    setNodePluginData(frame, REFERENCE_IMAGE_PLUGIN_DATA_KEY, payload.storyId);
    var container = viewportNode.type === "SECTION" ? viewportNode : targetPage;
    for (var _i = 0, _a = __spreadArray([], container.children, true); _i < _a.length; _i++) {
        var child = _a[_i];
        if (child.id !== frame.id &&
            getNodePluginData(child, REFERENCE_IMAGE_PLUGIN_DATA_KEY) === payload.storyId) {
            child.remove();
        }
    }
    container.appendChild(frame);
    var anchorWidth = getSceneNodeWidth(anchorNode);
    if (container.type === "SECTION") {
        frame.x = COMPONENT_SECTION_PADDING + anchorWidth + REFERENCE_IMAGE_GAP;
        frame.y = COMPONENT_SECTION_PADDING;
        container.resizeWithoutConstraints(Math.max(safeNumber(container.width, 0), frame.x + safeNumber(frame.width, 0) + COMPONENT_SECTION_PADDING), Math.max(safeNumber(container.height, 0), frame.y + safeNumber(frame.height, 0) + COMPONENT_SECTION_PADDING));
    }
    else {
        frame.x =
            safeNumber(anchorNode.x, 0) +
                anchorWidth +
                REFERENCE_IMAGE_GAP;
        frame.y = safeNumber(anchorNode.y, 0);
    }
    frame.locked = true;
    stats.referencePlaced = true;
}
function collectSceneNodeIds(node, ids) {
    if (ids === void 0) { ids = new Set(); }
    ids.add(node.id);
    if (!("children" in node))
        return ids;
    for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
        var child = _a[_i];
        if ("visible" in child)
            collectSceneNodeIds(child, ids);
    }
    return ids;
}
function positionNewComponentSection(section, targetPage) {
    var existingSections = targetPage.children.filter(function (node) { return node.type === "SECTION" && node.id !== section.id; });
    var nextY = existingSections.length === 0
        ? 0
        : Math.max.apply(Math, existingSections.map(function (node) { return node.y + safeNumber(node.height, 0); })) + COMPONENT_SECTION_GAP;
    section.x = 0;
    section.y = nextY;
}
function resizeSectionToChild(section, child) {
    section.resizeWithoutConstraints(Math.max(COMPONENT_SECTION_MIN_WIDTH, getSceneNodeWidth(child) + COMPONENT_SECTION_PADDING * 2), Math.max(COMPONENT_SECTION_MIN_HEIGHT, getSceneNodeHeight(child) + COMPONENT_SECTION_PADDING * 2));
}
function getSceneNodeWidth(node) {
    return safeNumber(node.width, 1);
}
function getSceneNodeHeight(node) {
    return safeNumber(node.height, 1);
}
function whitePaint() {
    return {
        color: { b: 1, g: 1, r: 1 },
        opacity: 1,
        type: "SOLID",
    };
}
function createImportContext(payload) {
    var _a, _b, _c, _d, _e, _f;
    var artifactKind = getPayloadArtifactKind(payload);
    var tokens = payload.tokens;
    var collectionNames = __assign(__assign({}, COLLECTION_NAMES), ((_b = (_a = payload.tokenSystem) === null || _a === void 0 ? void 0 : _a.collections) !== null && _b !== void 0 ? _b : {}));
    var tokenPluginDataKey = (_d = (_c = payload.tokenSystem) === null || _c === void 0 ? void 0 : _c.pluginDataKey) !== null && _d !== void 0 ? _d : DEFAULT_TOKEN_PLUGIN_DATA_KEY;
    var componentPluginDataKey = (_f = (_e = payload.componentSystem) === null || _e === void 0 ? void 0 : _e.pluginDataKey) !== null && _f !== void 0 ? _f : STORYBOOK_COMPONENT_PLUGIN_DATA_KEY;
    var tokenByCssName = new Map(tokens.map(function (token) { return [token.cssName, token]; }));
    var fontFamilyTokenNames = collectFontFamilyTokenNames(payload.root, tokenByCssName);
    var registry = new Map();
    var componentRegistry = new Map();
    var componentDefinitionRecords = new Map();
    var componentSetRecords = new Map();
    var warnedVariantPropertyNodeIds = new Set();
    var loadedExistingFontKeys = new Set();
    var componentDefinitionOffsetY = 0;
    var stats = {
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
    function warn(message) {
        stats.warnings.push(message);
    }
    // Existing nodes (earlier imports, manual edits) can use fonts this run
    // never loaded, and Figma rejects any relayouting operation — appendChild
    // into a component set, resize, alignment — on trees with unloaded fonts.
    // Returns the fonts that could not be loaded so callers can skip the node
    // instead of failing the whole import.
    function preloadNodeTreeFonts(node) {
        return __awaiter(this, void 0, void 0, function () {
            function visit(current) {
                return __awaiter(this, void 0, void 0, function () {
                    var text, fonts, _i, fonts_1, font, key, _a, children, _b, children_1, child;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (!(current.type === "TEXT")) return [3 /*break*/, 6];
                                text = current;
                                fonts = [];
                                if (text.fontName !== figma.mixed)
                                    fonts.push(text.fontName);
                                try {
                                    if (text.characters.length > 0) {
                                        fonts.push.apply(fonts, text.getRangeAllFontNames(0, text.characters.length));
                                    }
                                }
                                catch (_d) {
                                    // Range inspection is best-effort; fontName covers the common case.
                                }
                                _i = 0, fonts_1 = fonts;
                                _c.label = 1;
                            case 1:
                                if (!(_i < fonts_1.length)) return [3 /*break*/, 6];
                                font = fonts_1[_i];
                                key = "".concat(font.family, "\n").concat(font.style);
                                if (loadedExistingFontKeys.has(key))
                                    return [3 /*break*/, 5];
                                _c.label = 2;
                            case 2:
                                _c.trys.push([2, 4, , 5]);
                                return [4 /*yield*/, figma.loadFontAsync(font)];
                            case 3:
                                _c.sent();
                                loadedExistingFontKeys.add(key);
                                return [3 /*break*/, 5];
                            case 4:
                                _a = _c.sent();
                                failed.push(font);
                                return [3 /*break*/, 5];
                            case 5:
                                _i++;
                                return [3 /*break*/, 1];
                            case 6:
                                children = current.children;
                                if (!children) return [3 /*break*/, 10];
                                _b = 0, children_1 = children;
                                _c.label = 7;
                            case 7:
                                if (!(_b < children_1.length)) return [3 /*break*/, 10];
                                child = children_1[_b];
                                return [4 /*yield*/, visit(child)];
                            case 8:
                                _c.sent();
                                _c.label = 9;
                            case 9:
                                _b++;
                                return [3 /*break*/, 7];
                            case 10: return [2 /*return*/];
                        }
                    });
                });
            }
            var failed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        failed = [];
                        return [4 /*yield*/, visit(node)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, failed];
                }
            });
        });
    }
    function describeFont(font) {
        return font ? "".concat(font.family, " ").concat(font.style) : "unknown font";
    }
    function upsertVariables() {
        return __awaiter(this, void 0, void 0, function () {
            var sorted, _i, sorted_1, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sorted = __spreadArray([], tokens, true).sort(function (a, b) {
                            var byCollection = COLLECTION_ORDER[a.collection] - COLLECTION_ORDER[b.collection];
                            return byCollection || a.figmaName.localeCompare(b.figmaName);
                        });
                        _i = 0, sorted_1 = sorted;
                        _a.label = 1;
                    case 1:
                        if (!(_i < sorted_1.length)) return [3 /*break*/, 4];
                        token = sorted_1[_i];
                        return [4 /*yield*/, upsertVariable(token, [])];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function upsertVariable(spec, stack) {
        return __awaiter(this, void 0, void 0, function () {
            var registered, aliasTarget, aliasSpec, _a, collection, modeId, variable;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        registered = registry.get(spec.cssName);
                        if (registered)
                            return [2 /*return*/, registered];
                        if (stack.includes(spec.cssName)) {
                            throw new Error("Circular token alias detected: ".concat(__spreadArray(__spreadArray([], stack, true), [spec.cssName], false).join(" -> ")));
                        }
                        if (!spec.alias) return [3 /*break*/, 5];
                        aliasSpec = tokenByCssName.get(spec.alias);
                        if (!aliasSpec) return [3 /*break*/, 2];
                        return [4 /*yield*/, upsertVariable(aliasSpec, __spreadArray(__spreadArray([], stack, true), [spec.cssName], false))];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, findVariableByCssToken(spec.alias, tokenPluginDataKey)];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        aliasTarget = _a;
                        if (!aliasTarget) {
                            throw new Error("Missing alias target ".concat(spec.alias, " for ").concat(spec.cssName));
                        }
                        _b.label = 5;
                    case 5: return [4 /*yield*/, getCollection(spec.collection, collectionNames)];
                    case 6:
                        collection = _b.sent();
                        modeId = collection.modes[0].modeId;
                        return [4 /*yield*/, findExistingVariable(collection, spec, tokenPluginDataKey)];
                    case 7:
                        variable = _b.sent();
                        if (variable && variable.resolvedType !== spec.type) {
                            throw new Error("Variable type mismatch for ".concat(spec.cssName, ": existing ").concat(variable.resolvedType, ", export ").concat(spec.type));
                        }
                        if (variable) {
                            stats.reusedVariables += 1;
                        }
                        else {
                            variable = figma.variables.createVariable(spec.figmaName, collection, spec.type);
                            stats.variablesCreated += 1;
                        }
                        setVariableMetadata(variable, spec);
                        setVariableValue(variable, modeId, spec, aliasTarget);
                        registry.set(spec.cssName, variable);
                        return [2 /*return*/, variable];
                }
            });
        });
    }
    function setVariableMetadata(variable, spec) {
        var _a, _b;
        if (Array.isArray(spec.scopes) && spec.scopes.length > 0) {
            try {
                variable.scopes = spec.scopes;
            }
            catch (error) {
                warn("Could not set scopes for ".concat(spec.cssName, ": ").concat(formatError(error)));
            }
        }
        try {
            (_b = (_a = variable).setVariableCodeSyntax) === null || _b === void 0 ? void 0 : _b.call(_a, "WEB", "var(".concat(spec.cssName, ")"));
        }
        catch (error) {
            warn("Could not set code syntax for ".concat(spec.cssName, ": ").concat(formatError(error)));
        }
        try {
            setVariablePluginData(variable, tokenPluginDataKey, spec.cssName);
            if (tokenPluginDataKey !== LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) {
                setVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY, spec.cssName);
            }
        }
        catch (error) {
            warn("Could not set plugin data for ".concat(spec.cssName, ": ").concat(formatError(error)));
        }
    }
    function setVariableValue(variable, modeId, spec, aliasTarget) {
        if (spec.alias) {
            if (!aliasTarget) {
                throw new Error("Missing alias target ".concat(spec.alias, " for ").concat(spec.cssName));
            }
            variable.setValueForMode(modeId, {
                id: aliasTarget.id,
                type: "VARIABLE_ALIAS",
            });
            return;
        }
        variable.setValueForMode(modeId, normalizeVariableValue(spec, fontFamilyTokenNames));
    }
    function createNode(spec_1, path_1) {
        return __awaiter(this, arguments, void 0, function (spec, path, options) {
            var existing, instance, node, _a, _b;
            var _c;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!(options.reuseComponents &&
                            !options.isRoot &&
                            ((_c = spec.component) === null || _c === void 0 ? void 0 : _c.key) &&
                            canCreateComponentDefinition(spec))) return [3 /*break*/, 3];
                        return [4 /*yield*/, findLocalComponent(spec.component)];
                    case 1:
                        existing = _d.sent();
                        if (!(!existing ||
                            getNodePluginData(existing, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY) ===
                                getComponentSpecHash(spec))) return [3 /*break*/, 3];
                        return [4 /*yield*/, createComponentInstance(spec, spec.component, path, options)];
                    case 2:
                        instance = _d.sent();
                        stats.nodesCreated += 1;
                        return [2 /*return*/, instance];
                    case 3:
                        if (!(spec.kind === "text")) return [3 /*break*/, 5];
                        return [4 /*yield*/, createTextNode(spec, path, options)];
                    case 4:
                        _a = _d.sent();
                        return [3 /*break*/, 9];
                    case 5:
                        if (!(spec.kind === "image" || spec.kind === "svg")) return [3 /*break*/, 6];
                        _b = createImageNode(spec, path);
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, createFrameNode(spec, path, options, false)];
                    case 7:
                        _b = _d.sent();
                        _d.label = 8;
                    case 8:
                        _a = _b;
                        _d.label = 9;
                    case 9:
                        node = _a;
                        node.x = safeNumber(spec.styles.x, 0);
                        node.y = safeNumber(spec.styles.y, 0);
                        stats.nodesCreated += 1;
                        return [2 /*return*/, node];
                }
            });
        });
    }
    function createFrameNode(spec, path, options, asComponent) {
        return __awaiter(this, void 0, void 0, function () {
            var node, styles, bindings, _i, _a, childSpec, childOptions, child;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        node = asComponent ? figma.createComponent() : figma.createFrame();
                        styles = spec.styles;
                        bindings = (_b = spec.bindings) !== null && _b !== void 0 ? _b : {};
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
                        _i = 0, _a = (_c = spec.children) !== null && _c !== void 0 ? _c : [];
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        childSpec = _a[_i];
                        childOptions = __assign(__assign({}, options), { inferredTextAlignHorizontal: childSpec.kind === "text"
                                ? getInferredChildTextAlignHorizontal(node)
                                : undefined, isRoot: false });
                        return [4 /*yield*/, createNode(childSpec, "".concat(path, "/").concat(childSpec.name), childOptions)];
                    case 2:
                        child = _d.sent();
                        node.appendChild(child);
                        applyAutoLayoutChildSizing(node, child, childSpec, "".concat(path, "/").concat(childSpec.name));
                        applyChildPlacement(node, child, childSpec, "".concat(path, "/").concat(childSpec.name));
                        if (child.type === "TEXT") {
                            applyTextAlignHorizontal(child, childSpec, childOptions, "".concat(path, "/").concat(childSpec.name));
                        }
                        if (node.layoutMode === "NONE") {
                            child.x = safeNumber(childSpec.styles.x, 0);
                            child.y = safeNumber(childSpec.styles.y, 0);
                            applyChildTransformMatrix(child, childSpec, "".concat(path, "/").concat(childSpec.name));
                        }
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, node];
                }
            });
        });
    }
    function ensureComponentDefinition(spec_1, component_1, path_1) {
        return __awaiter(this, arguments, void 0, function (spec, component, path, options) {
            var existing, failedFonts, _i, _a, child, componentSet, componentNode, _b, componentSet;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, findLocalComponent(component)];
                    case 1:
                        existing = _c.sent();
                        if (!existing) return [3 /*break*/, 6];
                        if (componentDefinitionRecords.has(component.key) &&
                            getNodePluginData(existing, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY) !==
                                getComponentSpecHash(spec)) {
                            warn("Duplicate variant name \"".concat(getComponentDisplayName(component), "\" with different content at ").concat(path, "; the later design overwrote the earlier one. Give each export item a distinct figmaVariant."));
                        }
                        return [4 /*yield*/, preloadNodeTreeFonts(existing)];
                    case 2:
                        failedFonts = _c.sent();
                        if (failedFonts.length > 0) {
                            warn("Existing component \"".concat(existing.name, "\" uses ").concat(failedFonts.length, " font(s) that could not be loaded (e.g. ").concat(describeFont(failedFonts[0]), "); its previous text is replaced from the export."));
                        }
                        if (spec.kind === "frame") {
                            // Children are rebuilt from the spec below; removing them first is
                            // font-free, so resize and auto-layout never touch stale text.
                            for (_i = 0, _a = __spreadArray([], existing.children, true); _i < _a.length; _i++) {
                                child = _a[_i];
                                child.remove();
                            }
                        }
                        syncExistingFrameFromSpec(existing, spec, path);
                        return [4 /*yield*/, syncExistingFrameChildrenFromSpec(existing, spec, path, __assign(__assign({}, options), { isRoot: false, reuseComponents: true }))];
                    case 3:
                        _c.sent();
                        applyTextAlignmentFromSpec(existing, spec, options, path);
                        setNodePluginData(existing, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY, getComponentSpecHash(spec));
                        trackComponentDefinition(existing, component);
                        if (!(component.variant && options.autoAttachComponentSet !== false)) return [3 /*break*/, 5];
                        return [4 /*yield*/, attachVariantComponentToSet(existing, component)];
                    case 4:
                        componentSet = _c.sent();
                        if (componentSet) {
                            trackComponentSet(componentSet, component);
                        }
                        _c.label = 5;
                    case 5:
                        moveExistingComponentDefinitionToTargetPage(existing);
                        stats.reusedComponents += 1;
                        return [2 /*return*/, existing];
                    case 6:
                        if (!((spec.kind === "image" || spec.kind === "svg") && spec.svgText)) return [3 /*break*/, 7];
                        _b = figma.createComponentFromNode(createSvgSceneNode(spec, path));
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, createFrameNode(spec, path, __assign(__assign({}, options), { autoAttachComponentSet: true, reuseComponents: true }), true)];
                    case 8:
                        _b = (_c.sent());
                        _c.label = 9;
                    case 9:
                        componentNode = _b;
                        componentNode.name = getComponentDisplayName(component);
                        tagComponentNode(componentNode, component);
                        setNodePluginData(componentNode, COMPONENT_SPEC_HASH_PLUGIN_DATA_KEY, getComponentSpecHash(spec));
                        componentRegistry.set(component.key, componentNode);
                        trackComponentDefinition(componentNode, component);
                        stats.componentsCreated += 1;
                        stats.nodesCreated += 1;
                        if (!(component.variant && options.autoAttachComponentSet !== false)) return [3 /*break*/, 11];
                        return [4 /*yield*/, attachVariantComponentToSet(componentNode, component)];
                    case 10:
                        componentSet = _c.sent();
                        if (componentSet) {
                            trackComponentSet(componentSet, component);
                            return [2 /*return*/, componentNode];
                        }
                        _c.label = 11;
                    case 11:
                        parkComponentDefinition(componentNode);
                        return [2 /*return*/, componentNode];
                }
            });
        });
    }
    function createComponentInstance(spec, component, path, options) {
        return __awaiter(this, void 0, void 0, function () {
            var componentNode, instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ensureComponentDefinition(spec, component, path, options)];
                    case 1:
                        componentNode = _a.sent();
                        instance = componentNode.createInstance();
                        instance.name = component.name;
                        safeResize(instance, spec.styles.width, spec.styles.height, path);
                        instance.x = safeNumber(spec.styles.x, 0);
                        instance.y = safeNumber(spec.styles.y, 0);
                        return [2 /*return*/, instance];
                }
            });
        });
    }
    function createComponentSetFromVariants(root, fallbackName) {
        return __awaiter(this, void 0, void 0, function () {
            var componentSpecs, variantSpecs, variantGroups, variantGroup, only, componentSpec, existingSet, _i, variantGroup_1, entry, componentNodes, _a, variantGroup_2, entry, componentNode, componentSet, _b, _c, error_2;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        componentSpecs = collectComponentDefinitionSpecs(root, root.name);
                        variantSpecs = componentSpecs.filter(function (entry) {
                            return Boolean(entry.component.variant);
                        });
                        variantGroups = groupVariantComponentSpecs(variantSpecs);
                        variantGroup = chooseVariantGroup(variantGroups, fallbackName);
                        // A group that matched the component title but holds a single variant is a
                        // plain component, not a set — combining one node into a variant set would
                        // misrepresent it.
                        if (variantGroup && variantGroup.length < 2) {
                            only = variantGroup[0];
                            return [2 /*return*/, ensureComponentDefinition(only.spec, only.component, only.path, {
                                    autoAttachComponentSet: true,
                                    reuseComponents: true,
                                })];
                        }
                        if (!variantGroup) {
                            componentSpec = chooseComponentDefinitionSpec(componentSpecs, fallbackName);
                            if (componentSpec) {
                                return [2 /*return*/, ensureComponentDefinition(componentSpec.spec, componentSpec.component, componentSpec.path, { autoAttachComponentSet: true, reuseComponents: true })];
                            }
                            return [2 /*return*/, createNode(root, root.name, {
                                    isRoot: true,
                                    reuseComponents: false,
                                })];
                        }
                        return [4 /*yield*/, findExistingComponentSet(variantGroup.map(function (entry) { return entry.component; }))];
                    case 1:
                        existingSet = _d.sent();
                        if (!existingSet) return [3 /*break*/, 7];
                        _i = 0, variantGroup_1 = variantGroup;
                        _d.label = 2;
                    case 2:
                        if (!(_i < variantGroup_1.length)) return [3 /*break*/, 5];
                        entry = variantGroup_1[_i];
                        return [4 /*yield*/, ensureComponentDefinition(entry.spec, entry.component, entry.path, {
                                autoAttachComponentSet: true,
                                reuseComponents: true,
                            })];
                    case 3:
                        _d.sent();
                        _d.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, attachStandaloneVariantComponentsToSet(existingSet, variantGroup[0].component)];
                    case 6:
                        _d.sent();
                        tagVariantComponentSet(existingSet, variantGroup[0].component);
                        normalizeComponentSetVariantNames(existingSet, variantGroup[0].component);
                        layoutVariantComponentSet(existingSet);
                        trackComponentSet(existingSet, variantGroup[0].component);
                        return [2 /*return*/, existingSet];
                    case 7:
                        componentNodes = [];
                        _a = 0, variantGroup_2 = variantGroup;
                        _d.label = 8;
                    case 8:
                        if (!(_a < variantGroup_2.length)) return [3 /*break*/, 11];
                        entry = variantGroup_2[_a];
                        return [4 /*yield*/, ensureComponentDefinition(entry.spec, entry.component, entry.path, {
                                autoAttachComponentSet: false,
                                reuseComponents: true,
                            })];
                    case 9:
                        componentNode = _d.sent();
                        prepareVariantNodeForComponentSet(componentNode, entry.component);
                        componentNodes.push(componentNode);
                        _d.label = 10;
                    case 10:
                        _a++;
                        return [3 /*break*/, 8];
                    case 11:
                        _d.trys.push([11, 13, , 14]);
                        _c = (_b = figma).combineAsVariants;
                        return [4 /*yield*/, getStandaloneVariantNodesForNewSet(componentNodes, variantGroup[0].component)];
                    case 12:
                        componentSet = _c.apply(_b, [_d.sent(), figma.currentPage]);
                        componentSet.name = variantGroup[0].component.name || fallbackName;
                        tagVariantComponentSet(componentSet, variantGroup[0].component);
                        normalizeComponentSetVariantNames(componentSet, variantGroup[0].component);
                        layoutVariantComponentSet(componentSet);
                        trackComponentSet(componentSet, variantGroup[0].component);
                        return [2 /*return*/, componentSet];
                    case 13:
                        error_2 = _d.sent();
                        warn("Could not combine component variants: ".concat(formatError(error_2)));
                        return [2 /*return*/, createNode(root, root.name, {
                                isRoot: true,
                                reuseComponents: true,
                            })];
                    case 14: return [2 /*return*/];
                }
            });
        });
    }
    function syncExistingFrameFromSpec(node, spec, path) {
        var _a;
        if (spec.kind !== "frame")
            return;
        var styles = spec.styles;
        var bindings = (_a = spec.bindings) !== null && _a !== void 0 ? _a : {};
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
    function syncExistingFrameChildrenFromSpec(node, spec, path, options) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, child, _b, _c, childSpec, childOptions, childPath, child;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (spec.kind !== "frame")
                            return [2 /*return*/];
                        for (_i = 0, _a = __spreadArray([], node.children, true); _i < _a.length; _i++) {
                            child = _a[_i];
                            child.remove();
                        }
                        _b = 0, _c = (_d = spec.children) !== null && _d !== void 0 ? _d : [];
                        _e.label = 1;
                    case 1:
                        if (!(_b < _c.length)) return [3 /*break*/, 4];
                        childSpec = _c[_b];
                        childOptions = __assign(__assign({}, options), { inferredTextAlignHorizontal: childSpec.kind === "text"
                                ? getInferredChildTextAlignHorizontal(node)
                                : undefined, isRoot: false });
                        childPath = "".concat(path, "/").concat(childSpec.name);
                        return [4 /*yield*/, createNode(childSpec, childPath, childOptions)];
                    case 2:
                        child = _e.sent();
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
                        _e.label = 3;
                    case 3:
                        _b++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function collectComponentDefinitionSpecs(node, path, depth) {
        var _a, _b;
        if (depth === void 0) { depth = 0; }
        var entries = [];
        if (((_a = node.component) === null || _a === void 0 ? void 0 : _a.key) && canCreateComponentDefinition(node)) {
            entries.push({ component: node.component, depth: depth, path: path, spec: node });
        }
        for (var _i = 0, _c = (_b = node.children) !== null && _b !== void 0 ? _b : []; _i < _c.length; _i++) {
            var child = _c[_i];
            entries.push.apply(entries, collectComponentDefinitionSpecs(child, "".concat(path, "/").concat(child.name), depth + 1));
        }
        return entries;
    }
    function collectPageComponentDefinitionSpecs(root) {
        var seen = new Set();
        return collectComponentDefinitionSpecs(root, root.name).filter(function (entry) {
            if (entry.depth === 0)
                return false;
            if (seen.has(entry.component.key))
                return false;
            seen.add(entry.component.key);
            return true;
        });
    }
    function preparePageComponentDefinitions(root) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, entry;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (artifactKind !== "page")
                            return [2 /*return*/];
                        _i = 0, _a = collectPageComponentDefinitionSpecs(root);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        entry = _a[_i];
                        return [4 /*yield*/, ensureComponentDefinition(entry.spec, entry.component, entry.path, {
                                reuseComponents: true,
                            })];
                    case 2:
                        _b.sent();
                        stats.componentDefinitionsPrepared =
                            safeNumber(stats.componentDefinitionsPrepared, 0) + 1;
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function chooseComponentDefinitionSpec(entries, fallbackName) {
        return __spreadArray([], entries, true).sort(function (a, b) {
            var preferredDelta = Number(componentDefinitionMatchesFallback(b, fallbackName)) -
                Number(componentDefinitionMatchesFallback(a, fallbackName));
            if (preferredDelta !== 0)
                return preferredDelta;
            var depthDelta = a.depth - b.depth;
            if (depthDelta !== 0)
                return depthDelta;
            return getComponentSpecArea(b) - getComponentSpecArea(a);
        })[0];
    }
    function componentDefinitionMatchesFallback(entry, fallbackName) {
        var expectedName = normalizeComponentIdentity(fallbackName);
        if (!expectedName)
            return false;
        return (normalizeComponentIdentity(entry.component.name) === expectedName ||
            normalizeComponentIdentity(entry.component.sourceName) === expectedName);
    }
    function getComponentSpecArea(entry) {
        return (Math.max(1, safeNumber(entry.spec.styles.width, 1)) *
            Math.max(1, safeNumber(entry.spec.styles.height, 1)));
    }
    function chooseVariantGroup(groups, fallbackName) {
        var selection = selectVariantGroup(groups, fallbackName);
        recordVariantGroupSelection(selection);
        if (selection.selectedIndex < 0)
            return undefined;
        return groups[selection.selectedIndex];
    }
    function recordVariantGroupSelection(selection) {
        stats.variantGroupSelected =
            selection.selectedIndex < 0 ? null : selection.selectedIdentity;
        stats.variantGroupsSkipped = selection.skippedIdentities;
        if (selection.selectedIndex < 0 && selection.skippedIdentities.length) {
            warn("No variant group matched the component title; reconstructed the payload tree instead of ".concat(selection.skippedIdentities.join(", "), "."));
        }
    }
    function groupVariantComponentSpecs(entries) {
        var _a;
        var groups = new Map();
        for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
            var entry = entries_1[_i];
            var groupKey = entry.component.sourceName || entry.component.name;
            var group = (_a = groups.get(groupKey)) !== null && _a !== void 0 ? _a : [];
            group.push(entry);
            groups.set(groupKey, group);
        }
        return Array.from(groups.values());
    }
    function findExistingComponentSet(components) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, components_1, component, existing;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, components_1 = components;
                        _b.label = 1;
                    case 1:
                        if (!(_i < components_1.length)) return [3 /*break*/, 4];
                        component = components_1[_i];
                        return [4 /*yield*/, findLocalComponent(component)];
                    case 2:
                        existing = _b.sent();
                        if (((_a = existing === null || existing === void 0 ? void 0 : existing.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET") {
                            return [2 /*return*/, existing.parent];
                        }
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, components[0] ? findVariantComponentSet(components[0]) : undefined];
                }
            });
        });
    }
    function findLocalComponent(component) {
        return __awaiter(this, void 0, void 0, function () {
            var cached, found;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cached = componentRegistry.get(component.key);
                        if (cached)
                            return [2 /*return*/, cached];
                        return [4 /*yield*/, figma.loadAllPagesAsync()];
                    case 1:
                        _a.sent();
                        found = collectComponentNodes(figma.root).find(function (node) {
                            if (getNodePluginData(node, componentPluginDataKey) === component.key) {
                                return true;
                            }
                            return componentNodeMatchesReference(node, component);
                        });
                        if (found)
                            componentRegistry.set(component.key, found);
                        return [2 /*return*/, found];
                }
            });
        });
    }
    function organizeComponentDependencySections(rootNode, targetPage) {
        var excludedNodeIds = collectSceneNodeIds(rootNode);
        var targets = collectDependencySectionTargets(excludedNodeIds);
        return targets.map(function (target) {
            return placeNodeInComponentSection(target.node, targetPage, target);
        });
    }
    function collectDependencySectionTargets(excludedNodeIds) {
        var targets = new Map();
        for (var _i = 0, _a = Array.from(componentDefinitionRecords.values()); _i < _a.length; _i++) {
            var record = _a[_i];
            var node = getComponentDefinitionSectionNode(record.node);
            if (shouldSkipComponentSectionNode(node, excludedNodeIds))
                continue;
            var sectionKey = getComponentReferenceSectionKey(record.component);
            var existing = targets.get(sectionKey);
            if ((existing === null || existing === void 0 ? void 0 : existing.node.type) === "COMPONENT_SET")
                continue;
            targets.set(sectionKey, {
                key: sectionKey,
                name: getComponentReferenceSectionName(record.component),
                node: node,
                role: "dependency",
            });
        }
        for (var _b = 0, _c = Array.from(componentSetRecords.values()); _b < _c.length; _b++) {
            var record = _c[_b];
            if (shouldSkipComponentSectionNode(record.node, excludedNodeIds))
                continue;
            var sectionKey = getComponentReferenceSectionKey(record.component);
            targets.set(sectionKey, {
                key: sectionKey,
                name: getComponentReferenceSectionName(record.component),
                node: record.node,
                role: "dependency",
            });
        }
        return Array.from(targets.values()).sort(function (a, b) {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        });
    }
    function trackComponentDefinition(node, component) {
        var _a;
        componentDefinitionRecords.set(component.key, { component: component, node: node });
        if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET") {
            trackComponentSet(node.parent, component);
        }
    }
    function trackComponentSet(node, component) {
        componentSetRecords.set(getComponentReferenceSectionKey(component), {
            component: component,
            node: node,
        });
    }
    function getComponentDefinitionSectionNode(node) {
        var _a;
        return ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET" ? node.parent : node;
    }
    function shouldSkipComponentSectionNode(node, excludedNodeIds) {
        return node.removed || excludedNodeIds.has(node.id);
    }
    function attachVariantComponentToSet(componentNode, component) {
        return __awaiter(this, void 0, void 0, function () {
            var attachFailedFonts, existingSet, siblingComponents, usableSiblings, _i, siblingComponents_1, sibling, failedFonts, targetParent, variantNodes, _a, variantNodes_1, node, componentSet;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, preloadNodeTreeFonts(componentNode)];
                    case 1:
                        attachFailedFonts = _c.sent();
                        if (attachFailedFonts.length > 0) {
                            warn("Left ".concat(componentNode.name, " outside its component set: font ").concat(describeFont(attachFailedFonts[0]), " could not be loaded."));
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, findVariantComponentSet(component)];
                    case 2:
                        existingSet = _c.sent();
                        if (existingSet) {
                            prepareVariantNodeForComponentSet(componentNode, component);
                            if (componentNode.parent === existingSet) {
                                tagVariantComponentSet(existingSet, component);
                                normalizeComponentSetVariantNames(existingSet, component);
                                layoutVariantComponentSet(existingSet);
                                moveComponentDefinitionNodeToTargetPage(existingSet);
                                return [2 /*return*/, existingSet];
                            }
                            try {
                                existingSet.appendChild(componentNode);
                                tagVariantComponentSet(existingSet, component);
                                normalizeComponentSetVariantNames(existingSet, component);
                                layoutVariantComponentSet(existingSet);
                                moveComponentDefinitionNodeToTargetPage(existingSet);
                                return [2 /*return*/, existingSet];
                            }
                            catch (error) {
                                warn("Could not append ".concat(component.key, " to component set ").concat(existingSet.name, ": ").concat(formatError(error)));
                            }
                        }
                        if (artifactKind === "page") {
                            moveComponentDefinitionNodeToTargetPage(componentNode);
                        }
                        siblingComponents = findStandaloneVariantComponents(component).filter(function (node) { return node !== componentNode; });
                        usableSiblings = [];
                        _i = 0, siblingComponents_1 = siblingComponents;
                        _c.label = 3;
                    case 3:
                        if (!(_i < siblingComponents_1.length)) return [3 /*break*/, 6];
                        sibling = siblingComponents_1[_i];
                        return [4 /*yield*/, preloadNodeTreeFonts(sibling)];
                    case 4:
                        failedFonts = _c.sent();
                        if (failedFonts.length > 0) {
                            warn("Left existing standalone variant ".concat(sibling.name, " out of the ").concat(component.name, " component set: font ").concat(describeFont(failedFonts[0]), " could not be loaded."));
                            return [3 /*break*/, 5];
                        }
                        usableSiblings.push(sibling);
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6:
                        if (usableSiblings.length === 0)
                            return [2 /*return*/, undefined];
                        try {
                            targetParent = (_b = getAncestorPage(componentNode)) !== null && _b !== void 0 ? _b : figma.currentPage;
                            variantNodes = __spreadArray(__spreadArray([], usableSiblings, true), [componentNode], false);
                            for (_a = 0, variantNodes_1 = variantNodes; _a < variantNodes_1.length; _a++) {
                                node = variantNodes_1[_a];
                                prepareVariantNodeForComponentSet(node, getStoredComponentReference(node, component));
                                if (node.parent !== targetParent) {
                                    targetParent.appendChild(node);
                                }
                            }
                            componentSet = figma.combineAsVariants(variantNodes, targetParent);
                            componentSet.name = component.name;
                            tagVariantComponentSet(componentSet, component);
                            normalizeComponentSetVariantNames(componentSet, component);
                            layoutVariantComponentSet(componentSet);
                            moveComponentDefinitionNodeToTargetPage(componentSet);
                            return [2 /*return*/, componentSet];
                        }
                        catch (error) {
                            warn("Could not combine ".concat(component.name, " variants into a component set: ").concat(formatError(error)));
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function findVariantComponentSet(component) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, figma.loadAllPagesAsync()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, collectComponentSetNodes(figma.root).find(function (node) {
                                return componentSetMatchesVariantGroup(node, component);
                            })];
                }
            });
        });
    }
    function findStandaloneVariantComponents(component) {
        return collectComponentNodes(figma.root).filter(function (node) {
            var _a;
            return (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) !== "COMPONENT_SET" &&
                componentNodeMatchesVariantGroup(node, component));
        });
    }
    function collectComponentNodes(node) {
        var components = [];
        if (node.type === "COMPONENT") {
            components.push(node);
        }
        var children = node.children;
        if (children) {
            for (var _i = 0, children_2 = children; _i < children_2.length; _i++) {
                var child = children_2[_i];
                components.push.apply(components, collectComponentNodes(child));
            }
        }
        return components;
    }
    function collectComponentSetNodes(node) {
        var componentSets = [];
        if (node.type === "COMPONENT_SET") {
            componentSets.push(node);
        }
        var children = node.children;
        if (children) {
            for (var _i = 0, children_3 = children; _i < children_3.length; _i++) {
                var child = children_3[_i];
                componentSets.push.apply(componentSets, collectComponentSetNodes(child));
            }
        }
        return componentSets;
    }
    function componentSetMatchesVariantGroup(node, component) {
        if (normalizeComponentIdentity(getNodePluginData(node, "storybookComponentSource")) ===
            normalizeComponentIdentity(component.sourceName || component.name) ||
            normalizeComponentIdentity(getNodePluginData(node, "storybookComponentName")) ===
                normalizeComponentIdentity(component.name)) {
            return true;
        }
        if (normalizeComponentIdentity(node.name) ===
            normalizeComponentIdentity(component.name) ||
            normalizeComponentIdentity(node.name) ===
                normalizeComponentIdentity(component.sourceName)) {
            return true;
        }
        return node.children.some(function (child) {
            return (child.type === "COMPONENT" &&
                componentNodeMatchesVariantGroup(child, component));
        });
    }
    function componentNodeMatchesReference(node, component) {
        var _a;
        var variantDisplayName = getVariantPropertyDisplayName(component);
        return (node.name === getComponentDisplayName(component) ||
            (Boolean(variantDisplayName) &&
                node.name === variantDisplayName &&
                ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET" &&
                componentSetMatchesVariantGroup(node.parent, component)) ||
            (!component.variant && node.name === component.name));
    }
    function componentNodeMatchesVariantGroup(node, component) {
        var expectedSource = normalizeComponentIdentity(component.sourceName || component.name);
        var expectedName = normalizeComponentIdentity(component.name);
        var source = normalizeComponentIdentity(getNodePluginData(node, "storybookComponentSource"));
        var name = normalizeComponentIdentity(getNodePluginData(node, "storybookComponentName"));
        if (source && source === expectedSource)
            return true;
        if (name && name === expectedName)
            return true;
        var baseName = normalizeComponentIdentity(node.name.split(",")[0]);
        return baseName === expectedName || baseName === expectedSource;
    }
    function tagComponentNode(node, component) {
        setNodePluginData(node, componentPluginDataKey, component.key);
        setNodePluginData(node, "storybookComponentName", component.name);
        setNodePluginData(node, "storybookComponentSource", component.sourceName || component.key);
        if (component.variant) {
            setNodePluginData(node, "storybookComponentVariant", component.variant);
        }
        if (component.variantProperties) {
            setNodePluginData(node, "storybookComponentVariantProperties", JSON.stringify(component.variantProperties));
        }
    }
    function tagVariantComponentSet(node, component) {
        setNodePluginData(node, "storybookComponentName", component.name);
        setNodePluginData(node, "storybookComponentSource", component.sourceName || component.name);
    }
    function attachStandaloneVariantComponentsToSet(componentSet, component) {
        return __awaiter(this, void 0, void 0, function () {
            var existingVariantIdentities, _i, _a, node, nodeComponent, variantIdentity, failedFonts;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        existingVariantIdentities = getComponentSetVariantIdentities(componentSet);
                        _i = 0, _a = findStandaloneVariantComponents(component);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        node = _a[_i];
                        nodeComponent = getStoredComponentReference(node, component);
                        variantIdentity = getComponentVariantIdentity(nodeComponent);
                        if (variantIdentity && existingVariantIdentities.has(variantIdentity))
                            return [3 /*break*/, 3];
                        return [4 /*yield*/, preloadNodeTreeFonts(node)];
                    case 2:
                        failedFonts = _b.sent();
                        if (failedFonts.length > 0) {
                            warn("Left existing standalone variant ".concat(node.name, " outside ").concat(componentSet.name, ": font ").concat(describeFont(failedFonts[0]), " could not be loaded."));
                            return [3 /*break*/, 3];
                        }
                        try {
                            prepareVariantNodeForComponentSet(node, nodeComponent);
                            componentSet.appendChild(node);
                            if (variantIdentity)
                                existingVariantIdentities.add(variantIdentity);
                        }
                        catch (error) {
                            warn("Could not attach existing standalone variant ".concat(node.name, " to ").concat(componentSet.name, ": ").concat(formatError(error)));
                        }
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function getStandaloneVariantNodesForNewSet(componentNodes, component) {
        return __awaiter(this, void 0, void 0, function () {
            var nodes, usable, _i, nodes_1, node, failedFonts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nodes = uniqueComponentNodes(__spreadArray(__spreadArray([], findStandaloneVariantComponents(component), true), componentNodes, true));
                        usable = [];
                        _i = 0, nodes_1 = nodes;
                        _a.label = 1;
                    case 1:
                        if (!(_i < nodes_1.length)) return [3 /*break*/, 4];
                        node = nodes_1[_i];
                        return [4 /*yield*/, preloadNodeTreeFonts(node)];
                    case 2:
                        failedFonts = _a.sent();
                        if (failedFonts.length > 0 && !componentNodes.includes(node)) {
                            warn("Left existing standalone variant ".concat(node.name, " out of the new component set: font ").concat(describeFont(failedFonts[0]), " could not be loaded."));
                            return [3 /*break*/, 3];
                        }
                        usable.push(node);
                        prepareVariantNodeForComponentSet(node, getStoredComponentReference(node, component));
                        if (node.parent !== figma.currentPage) {
                            figma.currentPage.appendChild(node);
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, usable];
                }
            });
        });
    }
    function uniqueComponentNodes(nodes) {
        var seen = new Set();
        var result = [];
        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
            var node = nodes_2[_i];
            if (seen.has(node.id))
                continue;
            seen.add(node.id);
            result.push(node);
        }
        return result;
    }
    function normalizeComponentSetVariantNames(componentSet, fallbackComponent) {
        for (var _i = 0, _a = componentSet.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.type !== "COMPONENT")
                continue;
            prepareVariantNodeForComponentSet(child, getStoredComponentReference(child, fallbackComponent));
        }
    }
    function prepareVariantNodeForComponentSet(node, component) {
        var variantName = getVariantPropertyDisplayName(component);
        if (variantName) {
            node.name = variantName;
        }
        tagComponentNode(node, component);
    }
    function getStoredComponentReference(node, fallbackComponent) {
        var key = getNodePluginData(node, componentPluginDataKey) || fallbackComponent.key;
        var name = getNodePluginData(node, "storybookComponentName") || fallbackComponent.name;
        var sourceName = getNodePluginData(node, "storybookComponentSource") ||
            fallbackComponent.sourceName ||
            name;
        var variant = getNodePluginData(node, "storybookComponentVariant") ||
            fallbackComponent.variant;
        var variantProperties = getStoredVariantProperties(node) || fallbackComponent.variantProperties;
        return {
            key: key,
            name: name,
            sourceName: sourceName,
            variant: variant,
            variantProperties: variantProperties,
        };
    }
    function getComponentSetVariantIdentities(componentSet) {
        var identities = new Set();
        for (var _i = 0, _a = componentSet.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (child.type !== "COMPONENT")
                continue;
            var identity = getComponentVariantIdentity(getStoredComponentReference(child, {
                key: "",
                name: componentSet.name,
                sourceName: componentSet.name,
            }));
            if (identity)
                identities.add(identity);
        }
        return identities;
    }
    function getComponentVariantIdentity(component) {
        var variantProperties = component.variantProperties && Object.keys(component.variantProperties).length > 0
            ? component.variantProperties
            : component.variant
                ? { Variant: component.variant }
                : undefined;
        if (!variantProperties)
            return undefined;
        return Object.keys(variantProperties)
            .sort(function (a, b) { return a.localeCompare(b); })
            .map(function (name) { return "".concat(name, ":").concat(variantProperties[name]); })
            .join("|");
    }
    function layoutVariantComponentSet(node) {
        var variantNodes = sortVariantComponents(node.children.filter(function (child) { return child.type === "COMPONENT"; }));
        if (variantNodes.length === 0)
            return;
        var grid = getComponentSetGridMetrics(variantNodes);
        var rows = Math.ceil(variantNodes.length / grid.columns);
        var width = grid.columns * grid.cellWidth + (grid.columns - 1) * grid.gap;
        var height = rows * grid.cellHeight + (rows - 1) * grid.gap;
        for (var index = 0; index < variantNodes.length; index += 1) {
            var child = variantNodes[index];
            var column = index % grid.columns;
            var row = Math.floor(index / grid.columns);
            var offsetX = Math.max(0, (grid.cellWidth - safeNumber(child.width, 0)) / 2);
            var offsetY = Math.max(0, (grid.cellHeight - safeNumber(child.height, 0)) / 2);
            child.x = column * (grid.cellWidth + grid.gap) + offsetX;
            child.y = row * (grid.cellHeight + grid.gap) + offsetY;
        }
        safeResizeWithoutConstraints(node, Math.max(1, width), Math.max(1, height), "".concat(node.name, ".componentSetGrid"));
    }
    function sortVariantComponents(children) {
        return __spreadArray([], children, true).sort(function (a, b) {
            return getVariantComponentSortKey(a).localeCompare(getVariantComponentSortKey(b), undefined, { numeric: true, sensitivity: "base" });
        });
    }
    function getVariantComponentSortKey(node) {
        var variantProperties = getReadableVariantProperties(node);
        if (variantProperties) {
            return Object.keys(variantProperties)
                .sort(function (a, b) { return a.localeCompare(b); })
                .map(function (name) { return "".concat(name, ":").concat(variantProperties[name]); })
                .join("|");
        }
        return getNodePluginData(node, "storybookComponentVariant") || node.name;
    }
    function getReadableVariantProperties(node) {
        var _a;
        var storedVariantProperties = getStoredVariantProperties(node);
        try {
            return (_a = node.variantProperties) !== null && _a !== void 0 ? _a : storedVariantProperties;
        }
        catch (error) {
            if (!warnedVariantPropertyNodeIds.has(node.id)) {
                warnedVariantPropertyNodeIds.add(node.id);
                warn("Could not read Figma variant properties for ".concat(node.name, "; using Storybook variant metadata instead: ").concat(formatError(error)));
            }
            return storedVariantProperties;
        }
    }
    function getStoredVariantProperties(node) {
        var rawValue = getNodePluginData(node, "storybookComponentVariantProperties");
        if (!rawValue)
            return undefined;
        try {
            var parsed = JSON.parse(rawValue);
            if (!isRecord(parsed))
                return undefined;
            var result = {};
            for (var _i = 0, _a = Object.entries(parsed); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (typeof value === "string") {
                    result[key] = value;
                }
            }
            return Object.keys(result).length > 0 ? result : undefined;
        }
        catch (_c) {
            return undefined;
        }
    }
    function getComponentSetGridMetrics(children) {
        var maxWidth = Math.max.apply(Math, children.map(function (child) { return safeNumber(child.width, 1); }));
        var maxHeight = Math.max.apply(Math, children.map(function (child) { return safeNumber(child.height, 1); }));
        var maxSize = Math.max(maxWidth, maxHeight);
        var maxColumns = maxSize <= COMPONENT_SET_GRID_COMPACT_MAX_SIZE
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
    function parkComponentDefinition(node) {
        if (artifactKind === "page") {
            moveComponentDefinitionNodeToTargetPage(getComponentDefinitionSectionNode(node));
            return;
        }
        var rootWidth = safeNumber(payload.root.styles.width, 0);
        node.x = rootWidth + 80;
        node.y = stats.componentsCreated * 24;
    }
    function getComponentDefinitionParentPage() {
        var _a, _b;
        if (artifactKind !== "page")
            return figma.currentPage;
        var pageName = ((_b = (_a = payload.componentSystem) === null || _a === void 0 ? void 0 : _a.componentsPageName) === null || _b === void 0 ? void 0 : _b.trim()) || COMPONENTS_PAGE_NAME;
        var existing = figma.root.children.find(function (page) { return page.name.toLowerCase() === pageName.toLowerCase(); });
        if (existing)
            return existing;
        var page = figma.createPage();
        page.name = pageName;
        return page;
    }
    function getNextComponentDefinitionY(page) {
        if (componentDefinitionOffsetY === 0 && page.children.length > 0) {
            componentDefinitionOffsetY = page.children.reduce(function (maxBottom, child) {
                var childNode = child;
                var bottom = safeNumber(childNode.y, 0) + safeNumber(childNode.height, 0);
                return Math.max(maxBottom, bottom);
            }, 0);
            if (componentDefinitionOffsetY > 0)
                componentDefinitionOffsetY += 24;
        }
        return componentDefinitionOffsetY;
    }
    function moveComponentDefinitionNodeToTargetPage(node) {
        var _a;
        if (artifactKind !== "page")
            return;
        var parentPage = getComponentDefinitionParentPage();
        if (((_a = getAncestorPage(node)) === null || _a === void 0 ? void 0 : _a.id) === parentPage.id)
            return;
        var nextY = getNextComponentDefinitionY(parentPage);
        parentPage.appendChild(node);
        node.x = 0;
        node.y = nextY;
        componentDefinitionOffsetY = nextY + safeNumber(node.height, 0) + 24;
    }
    function moveExistingComponentDefinitionToTargetPage(componentNode) {
        if (artifactKind !== "page")
            return;
        moveComponentDefinitionNodeToTargetPage(getComponentDefinitionSectionNode(componentNode));
    }
    function getAncestorPage(node) {
        var parent = node.parent;
        while (parent) {
            if (parent.type === "PAGE")
                return parent;
            parent = parent.parent;
        }
        return undefined;
    }
    function createTextNode(spec, path, options) {
        return __awaiter(this, void 0, void 0, function () {
            var node, styles, bindings, _a;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        node = figma.createText();
                        styles = spec.styles;
                        bindings = (_b = spec.bindings) !== null && _b !== void 0 ? _b : {};
                        node.name = spec.name || "text";
                        _a = node;
                        return [4 /*yield*/, loadTextFont(styles, path)];
                    case 1:
                        _a.fontName = (_e.sent()).font;
                        node.characters = (_c = spec.text) !== null && _c !== void 0 ? _c : "";
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
                            }
                            catch (error) {
                                warn("Could not set letter spacing for ".concat(path, ": ").concat(formatError(error)));
                            }
                        }
                        if (styles.textDecoration) {
                            try {
                                node.textDecoration = styles.textDecoration;
                            }
                            catch (error) {
                                warn("Could not set text decoration for ".concat(path, ": ").concat(formatError(error)));
                            }
                        }
                        node.fills = [solidPaint(styles.color, bindings.textColor, "".concat(path, ".textColor"))];
                        applyEffects(node, collectSpecEffects(styles), path);
                        safeResize(node, styles.width, styles.height, path);
                        applyTextAutoResize(node, styles.textGrowHeight ? "HEIGHT" : styles.textAutoResize, path);
                        applyTextTruncation(node, styles, path);
                        applyTextAlignHorizontal(node, spec, options, path);
                        safeBindNumberMatched(node, "width", bindings.width, styles.width, path);
                        safeBindNumberMatched(node, "height", bindings.height, styles.height, path);
                        return [4 /*yield*/, safeBindFontFamily(node, bindings.fontFamily, styles.fontFamily, (_d = styles.fontWeight) !== null && _d !== void 0 ? _d : 400, styles.fontStyle === "italic", path)];
                    case 2:
                        _e.sent();
                        safeBindNumberMatched(node, "fontSize", bindings.fontSize, styles.fontSize, path);
                        safeBindNumberMatched(node, "fontWeight", bindings.fontWeight, styles.fontWeight, path);
                        if (typeof styles.lineHeight === "number") {
                            safeBindNumberMatched(node, "lineHeight", bindings.lineHeight, styles.lineHeight, path);
                        }
                        else if (bindings.lineHeight) {
                            warn("Skipped ".concat(path, ".lineHeight binding to ").concat(bindings.lineHeight, ": the rendered line height is auto."));
                        }
                        return [2 /*return*/, node];
                }
            });
        });
    }
    function createImageNode(spec, path) {
        var _a;
        var wrapper = figma.createFrame();
        var styles = spec.styles;
        var bindings = (_a = spec.bindings) !== null && _a !== void 0 ? _a : {};
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
                var targetWidth = Math.max(1, safeNumber(styles.width, 1));
                var targetHeight = Math.max(1, safeNumber(styles.height, 1));
                var svgNode = figma.createNodeFromSvg(setSvgRootSize(spec.svgText, targetWidth, targetHeight));
                svgNode.name = "".concat(wrapper.name, "/svg");
                fitSvgNodeToTarget(svgNode, targetWidth, targetHeight, "".concat(path, "/svg"));
                svgNode.x = 0;
                svgNode.y = 0;
                wrapper.appendChild(svgNode);
                stats.nodesCreated += 1;
            }
            catch (error) {
                warn("Could not create SVG for ".concat(path, ": ").concat(formatError(error)));
            }
        }
        else if (spec.imageBase64) {
            var fills = [];
            // Letterboxed (FIT) images show the element background around the
            // bitmap, so the background paints below the image fill.
            if (styles.backgroundColor) {
                fills.push(solidPaint(styles.backgroundColor, bindings.backgroundColor, "".concat(path, ".fill")));
            }
            var imagePaint = createImagePaint(spec.imageBase64, styles.imageScaleMode, path);
            if (imagePaint)
                fills.push(imagePaint);
            wrapper.fills = fills;
        }
        else {
            warn("Image ".concat(path, " has no SVG or raster payload; created an empty image frame."));
        }
        setStrokes(wrapper, styles, bindings, path);
        applyRadius(wrapper, styles, bindings, path);
        applyEffects(wrapper, collectSpecEffects(styles), path);
        return wrapper;
    }
    // Frame resize alone never scales vector children; rescale transforms the
    // whole subtree so a 24px icon file rendered at 16px imports at 16px.
    function fitSvgNodeToTarget(node, width, height, path) {
        var currentWidth = safeNumber(node.width, width);
        var currentHeight = safeNumber(node.height, height);
        if (Math.abs(currentWidth - width) < 0.5 &&
            Math.abs(currentHeight - height) < 0.5) {
            return;
        }
        try {
            var rescale = node
                .rescale;
            if (typeof rescale === "function" && currentWidth > 0) {
                rescale.call(node, width / currentWidth);
            }
        }
        catch (error) {
            warn("Could not rescale SVG for ".concat(path, ": ").concat(formatError(error)));
        }
        safeResize(node, width, height, path);
    }
    function createSvgSceneNode(spec, path) {
        var targetWidth = Math.max(1, safeNumber(spec.styles.width, 1));
        var targetHeight = Math.max(1, safeNumber(spec.styles.height, 1));
        var svgNode = figma.createNodeFromSvg(setSvgRootSize(spec.svgText || "", targetWidth, targetHeight));
        svgNode.name = spec.name || "svg";
        fitSvgNodeToTarget(svgNode, targetWidth, targetHeight, path);
        svgNode.x = safeNumber(spec.styles.x, 0);
        svgNode.y = safeNumber(spec.styles.y, 0);
        return svgNode;
    }
    function canCreateComponentDefinition(spec) {
        return (spec.kind === "frame" ||
            ((spec.kind === "image" || spec.kind === "svg") && Boolean(spec.svgText)));
    }
    // CSS paints background-color at the bottom, then background-image layers
    // on top; Figma fills render index 0 at the bottom, so the array is
    // [solid, image, radial, linear].
    function setFrameFills(node, spec, path) {
        var _a, _b;
        var styles = spec.styles;
        var bindings = (_a = spec.bindings) !== null && _a !== void 0 ? _a : {};
        var fills = [];
        // A binding without a computed color only paints when its variable
        // exists; otherwise a placeholder black rectangle would appear.
        var hasBindableBackground = Boolean(bindings.backgroundColor &&
            ((_b = registry.get(bindings.backgroundColor)) === null || _b === void 0 ? void 0 : _b.resolvedType) === "COLOR");
        if (styles.backgroundColor || hasBindableBackground) {
            fills.push(solidPaint(styles.backgroundColor, bindings.backgroundColor, "".concat(path, ".fill")));
        }
        if (spec.kind === "frame" && spec.imageBase64) {
            var imagePaint = createImagePaint(spec.imageBase64, styles.imageScaleMode, "".concat(path, ".backgroundImage"));
            if (imagePaint)
                fills.push(imagePaint);
        }
        if (styles.backgroundRadialGradient) {
            fills.push(radialGradientPaint(styles.backgroundRadialGradient, path));
        }
        if (styles.backgroundLinearGradient) {
            fills.push(linearGradientPaint(styles.backgroundLinearGradient, path));
        }
        node.fills = fills;
    }
    function createImagePaint(imageBase64, scaleMode, path) {
        try {
            var bytes = figma.base64Decode(imageBase64);
            var image = figma.createImage(bytes);
            return {
                imageHash: image.hash,
                scaleMode: scaleMode === "FIT" ? "FIT" : "FILL",
                type: "IMAGE",
            };
        }
        catch (error) {
            warn("Could not create image fill for ".concat(path, ": ").concat(formatError(error)));
            return undefined;
        }
    }
    function linearGradientPaint(gradient, path) {
        return {
            gradientStops: gradient.stops.map(function (stop, index) {
                return linearGradientStop(stop, index, gradient.stops.length, path);
            }),
            gradientTransform: getLinearGradientTransform(safeNumber(gradient.angle, 90)),
            type: "GRADIENT_LINEAR",
        };
    }
    // The identity transform maps the radial gradient onto the ellipse
    // inscribed in the node bounds — close to the CSS farthest-side default.
    function radialGradientPaint(gradient, path) {
        return {
            gradientStops: gradient.stops.map(function (stop, index) {
                return linearGradientStop(stop, index, gradient.stops.length, path);
            }),
            gradientTransform: [
                [1, 0, 0],
                [0, 1, 0],
            ],
            type: "GRADIENT_RADIAL",
        };
    }
    function linearGradientStop(stop, index, stopCount, path) {
        var colorStop = {
            color: cloneColor(colorFromCss(stop.color)),
            position: typeof stop.position === "number"
                ? clamp(stop.position, 0, 1)
                : stopCount > 1
                    ? index / (stopCount - 1)
                    : 0,
        };
        if (!stop.token)
            return colorStop;
        if (!tokenColorMatchesStyle(stop.token, stop.color)) {
            warn("Skipped ".concat(path, ".fill.gradientStops.").concat(index, " binding to ").concat(stop.token, ": token color does not match the stop color."));
            return colorStop;
        }
        var variable = registry.get(stop.token);
        if (!variable) {
            warn("Missing variable for ".concat(path, ".fill.gradientStops.").concat(index, ": ").concat(stop.token));
            return colorStop;
        }
        if (variable.resolvedType !== "COLOR") {
            warn("Cannot bind ".concat(path, ".fill.gradientStops.").concat(index, " to non-color variable ").concat(stop.token));
            return colorStop;
        }
        return __assign(__assign({}, colorStop), { boundVariables: {
                color: figma.variables.createVariableAlias(variable),
            } });
    }
    function setStrokes(node, styles, bindings, path) {
        var _a;
        if (styles.borderSides) {
            setBorderSideStrokes(node, styles.borderSides, bindings, path);
            return;
        }
        var hasBindableBorder = Boolean(bindings.borderColor &&
            ((_a = registry.get(bindings.borderColor)) === null || _a === void 0 ? void 0 : _a.resolvedType) === "COLOR");
        if (!styles.borderColor && !hasBindableBorder)
            return;
        node.strokes = [
            solidPaint(styles.borderColor, bindings.borderColor, "".concat(path, ".stroke")),
        ];
        node.strokeAlign = "INSIDE";
        if (typeof styles.borderWidth === "number") {
            node.strokeWeight = styles.borderWidth;
        }
        applyStrokeDashPattern(node, styles, path);
    }
    function applyStrokeDashPattern(node, styles, path) {
        if (!styles.borderStyle)
            return;
        var width = Math.max(1, safeNumber(styles.borderWidth, 1));
        try {
            if (styles.borderStyle === "dashed") {
                node.dashPattern = [width * 2, width * 2];
            }
            else {
                // Zero-length dashes with round caps render as browser-like dots.
                node.dashPattern = [0.01, width * 2];
                node.strokeCap = "ROUND";
            }
        }
        catch (error) {
            warn("Could not set ".concat(styles.borderStyle, " border for ").concat(path, ": ").concat(formatError(error)));
        }
    }
    function setBorderSideStrokes(node, sides, bindings, path) {
        var _a, _b, _c, _d;
        var sideNames = ["top", "right", "bottom", "left"];
        var firstSide = sideNames
            .map(function (side) { return sides[side]; })
            .find(function (side) { return Boolean(side); });
        if (!firstSide)
            return;
        node.strokes = [
            solidPaint(firstSide.color, bindings.borderColor, "".concat(path, ".stroke")),
        ];
        node.strokeAlign = "INSIDE";
        node.strokeTopWeight = safeNumber((_a = sides.top) === null || _a === void 0 ? void 0 : _a.width, 0);
        node.strokeRightWeight = safeNumber((_b = sides.right) === null || _b === void 0 ? void 0 : _b.width, 0);
        node.strokeBottomWeight = safeNumber((_c = sides.bottom) === null || _c === void 0 ? void 0 : _c.width, 0);
        node.strokeLeftWeight = safeNumber((_d = sides.left) === null || _d === void 0 ? void 0 : _d.width, 0);
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
    function solidPaint(cssValue, tokenName, path) {
        var cssColor = colorFromCss(cssValue);
        var paint = {
            color: {
                b: cssColor.b,
                g: cssColor.g,
                r: cssColor.r,
            },
            opacity: cssColor.a,
            type: "SOLID",
        };
        if (!tokenName)
            return paint;
        if (!tokenColorMatchesStyle(tokenName, cssValue)) {
            warn("Skipped ".concat(path, " binding to ").concat(tokenName, ": token color does not match the rendered color."));
            return paint;
        }
        var variable = registry.get(tokenName);
        if (!variable) {
            warn("Missing variable for ".concat(path, ": ").concat(tokenName));
            return paint;
        }
        if (variable.resolvedType !== "COLOR") {
            warn("Cannot bind ".concat(path, " to non-color variable ").concat(tokenName));
            return paint;
        }
        try {
            return figma.variables.setBoundVariableForPaint(paint, "color", variable);
        }
        catch (error) {
            warn("Could not bind paint ".concat(path, " to ").concat(tokenName, ": ").concat(formatError(error)));
            return paint;
        }
    }
    function applyRadius(node, styles, bindings, path) {
        var _a;
        if (bindings.cornerRadius &&
            !tokenNumberMatchesStyle(bindings.cornerRadius, (_a = styles.radius) !== null && _a !== void 0 ? _a : 0)) {
            warn("Skipped ".concat(path, ".cornerRadius binding to ").concat(bindings.cornerRadius, ": token value does not match the rendered radius."));
            bindings = __assign(__assign({}, bindings), { cornerRadius: undefined });
        }
        if (styles.radiusCorners) {
            try {
                node.topLeftRadius = Math.max(0, safeNumber(styles.radiusCorners.topLeft, 0));
                node.topRightRadius = Math.max(0, safeNumber(styles.radiusCorners.topRight, 0));
                node.bottomRightRadius = Math.max(0, safeNumber(styles.radiusCorners.bottomRight, 0));
                node.bottomLeftRadius = Math.max(0, safeNumber(styles.radiusCorners.bottomLeft, 0));
            }
            catch (error) {
                warn("Could not set per-corner radius for ".concat(path, ": ").concat(formatError(error)));
            }
        }
        else if (typeof styles.radius === "number") {
            node.cornerRadius = styles.radius;
        }
        safeBindRadius(node, bindings.cornerRadius, path);
    }
    // Shadow effects and blur effects travel in separate payload fields for
    // backward compatibility; Figma receives them as one effects list.
    function collectSpecEffects(styles) {
        var _a, _b;
        return __spreadArray(__spreadArray([], ((_a = styles.effects) !== null && _a !== void 0 ? _a : []), true), ((_b = styles.blurEffects) !== null && _b !== void 0 ? _b : []), true);
    }
    function applyEffects(node, effects, path) {
        if (!effects || effects.length === 0)
            return;
        try {
            var mapped = effects.map(function (effect) {
                if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
                    return {
                        radius: Math.max(0, safeNumber(effect.blur, 0)),
                        type: effect.type,
                        visible: true,
                    };
                }
                return {
                    blendMode: "NORMAL",
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
            node.effects =
                mapped;
        }
        catch (error) {
            warn("Could not set effects for ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function applyAutoLayout(node, styles, bindings, path) {
        var _a, _b;
        if (!String((_a = styles.display) !== null && _a !== void 0 ? _a : "").includes("flex"))
            return;
        var primaryAxisAlignItems = mapAxisAlignment(styles.justifyContent);
        node.layoutMode = String((_b = styles.flexDirection) !== null && _b !== void 0 ? _b : "").startsWith("column")
            ? "VERTICAL"
            : "HORIZONTAL";
        var isHorizontalLayout = node.layoutMode === "HORIZONTAL";
        var horizontalSizingMode = styles.layoutSizingHorizontal === "HUG" ? "AUTO" : "FIXED";
        var verticalSizingMode = styles.layoutSizingVertical === "HUG" ? "AUTO" : "FIXED";
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
                node.layoutWrap =
                    "WRAP";
                if (typeof styles.counterAxisSpacing === "number") {
                    node.counterAxisSpacing = Math.max(0, styles.counterAxisSpacing);
                }
            }
            catch (error) {
                warn("Could not set layout wrap for ".concat(path, ": ").concat(formatError(error)));
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
    function applyCounterAxisAlignment(node, alignItems, isHorizontalLayout, path) {
        var mapped = mapCounterAlignment(alignItems);
        // Figma only supports baseline alignment on horizontal auto layout.
        if (mapped === "BASELINE" && !isHorizontalLayout) {
            node.counterAxisAlignItems = "MIN";
            return;
        }
        try {
            node.counterAxisAlignItems = mapped;
        }
        catch (error) {
            warn("Could not set counter axis alignment for ".concat(path, ": ").concat(formatError(error)));
            node.counterAxisAlignItems = mapped === "BASELINE" ? "MIN" : mapped;
        }
    }
    function applyChildPlacement(parent, child, spec, path) {
        if (spec.styles.outOfFlow && parent.layoutMode !== "NONE") {
            try {
                child.layoutPositioning =
                    "ABSOLUTE";
                child.x = safeNumber(spec.styles.x, 0);
                child.y = safeNumber(spec.styles.y, 0);
                applyChildTransformMatrix(child, spec, path);
            }
            catch (error) {
                warn("Could not absolutely position ".concat(path, ": ").concat(formatError(error)));
            }
        }
        applyConstraints(child, spec.styles.constraints, path);
    }
    // Applies the exporter's rotation matrix. Must run after x/y assignment —
    // the x/y setters would otherwise overwrite the matrix translation.
    function applyChildTransformMatrix(child, spec, path) {
        var matrix = spec.styles.transformMatrix;
        if (!matrix)
            return;
        try {
            child.relativeTransform =
                matrix;
        }
        catch (error) {
            warn("Could not apply transform for ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function applyConstraints(child, constraints, path) {
        if (!constraints)
            return;
        try {
            child.constraints = {
                horizontal: constraints.horizontal,
                vertical: constraints.vertical,
            };
        }
        catch (error) {
            warn("Could not set constraints for ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function applyAutoLayoutChildSizing(parent, child, spec, path) {
        if (parent.layoutMode === "NONE")
            return;
        if (spec.styles.outOfFlow)
            return;
        if (spec.styles.layoutAlign === "STRETCH") {
            try {
                child.layoutAlign = "STRETCH";
            }
            catch (error) {
                warn("Could not set ".concat(path, ".layoutAlign to STRETCH: ").concat(formatError(error)));
            }
        }
        if (spec.styles.layoutGrow === 1) {
            try {
                child.layoutGrow = 1;
            }
            catch (error) {
                warn("Could not set ".concat(path, ".layoutGrow to 1: ").concat(formatError(error)));
            }
        }
    }
    function safeBind(node, field, tokenName, path) {
        if (!tokenName)
            return false;
        var variable = registry.get(tokenName);
        if (!variable) {
            warn("Missing variable for ".concat(path, ".").concat(field, ": ").concat(tokenName));
            return false;
        }
        var target = node;
        if (typeof target.setBoundVariable !== "function") {
            warn("Node ".concat(path, " does not support variable binding for ").concat(field));
            return false;
        }
        try {
            target.setBoundVariable(field, variable);
            return true;
        }
        catch (error) {
            warn("Could not bind ".concat(path, ".").concat(field, " to ").concat(tokenName, ": ").concat(formatError(error)));
            return false;
        }
    }
    function safeBindFontFamily(node, tokenName, styleFontFamily, fontWeight, italic, path) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenFamily, styleFamily, loaded;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!tokenName)
                            return [2 /*return*/, false];
                        tokenFamily = getFontFamilyFromToken(tokenName);
                        styleFamily = styleFontFamily
                            ? getFontFamilyCandidates(styleFontFamily)[0]
                            : undefined;
                        if (tokenFamily &&
                            styleFamily &&
                            tokenFamily.toLowerCase() !== styleFamily.toLowerCase()) {
                            warn("Skipped ".concat(path, ".fontFamily binding to ").concat(tokenName, ": token family \"").concat(tokenFamily, "\" does not match the rendered family \"").concat(styleFamily, "\"."));
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, loadBoundFontFamily(tokenName, fontWeight, italic, path)];
                    case 1:
                        loaded = _a.sent();
                        if (!loaded)
                            return [2 /*return*/, false];
                        return [2 /*return*/, safeBind(node, "fontFamily", tokenName, path)];
                }
            });
        });
    }
    function safeBindRadius(node, tokenName, path) {
        if (!tokenName)
            return;
        var variable = registry.get(tokenName);
        if (!variable) {
            warn("Missing variable for ".concat(path, ".radius: ").concat(tokenName));
            return;
        }
        var target = node;
        if (typeof target.setBoundVariable !== "function") {
            warn("Node ".concat(path, " does not support radius variable binding"));
            return;
        }
        try {
            target.setBoundVariable("cornerRadius", variable);
            return;
        }
        catch (_a) {
            // Some Figma runtimes only support per-corner radius bindings.
        }
        var failures = [];
        var successCount = 0;
        for (var _i = 0, INDIVIDUAL_RADIUS_BINDING_FIELDS_1 = INDIVIDUAL_RADIUS_BINDING_FIELDS; _i < INDIVIDUAL_RADIUS_BINDING_FIELDS_1.length; _i++) {
            var field = INDIVIDUAL_RADIUS_BINDING_FIELDS_1[_i];
            try {
                target.setBoundVariable(field, variable);
                successCount += 1;
            }
            catch (error) {
                failures.push("".concat(field, ": ").concat(formatError(error)));
            }
        }
        if (successCount === 0) {
            warn("Could not bind ".concat(path, ".radius to ").concat(tokenName, ": ").concat(failures.join("; ")));
        }
        else if (failures.length > 0) {
            warn("Partially bound ".concat(path, ".radius to ").concat(tokenName, "; unsupported fields: ").concat(failures.join("; ")));
        }
    }
    function safeResize(node, width, height, path) {
        if (typeof node.resize !== "function")
            return;
        try {
            node.resize(Math.max(1, safeNumber(width, 1)), Math.max(1, safeNumber(height, 1)));
        }
        catch (error) {
            warn("Could not resize ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function safeResizeWithoutConstraints(node, width, height, path) {
        var _a;
        var layoutNode = node;
        var resize = (_a = layoutNode.resizeWithoutConstraints) !== null && _a !== void 0 ? _a : layoutNode.resize;
        if (typeof resize !== "function")
            return;
        try {
            resize.call(layoutNode, Math.max(1, safeNumber(width, 1)), Math.max(1, safeNumber(height, 1)));
        }
        catch (error) {
            warn("Could not resize ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function applyTextAutoResize(node, mode, path) {
        if (!mode)
            return;
        try {
            node.textAutoResize = mode;
        }
        catch (error) {
            warn("Could not set text auto-resize for ".concat(path, ": ").concat(formatError(error)));
        }
    }
    function applyTextTruncation(node, styles, path) {
        if (styles.textTruncation !== "ENDING")
            return;
        try {
            node.textTruncation = "ENDING";
            if (typeof styles.maxLines === "number" && styles.maxLines >= 1) {
                node.maxLines = Math.round(styles.maxLines);
            }
        }
        catch (error) {
            warn("Could not set text truncation for ".concat(path, ": ").concat(formatError(error)));
        }
    }
    var availableFontStylesByFamily;
    function getAvailableFontStyles(family) {
        return __awaiter(this, void 0, void 0, function () {
            var fonts, _i, fonts_2, font, list, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!availableFontStylesByFamily) return [3 /*break*/, 4];
                        availableFontStylesByFamily = new Map();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, figma.listAvailableFontsAsync()];
                    case 2:
                        fonts = _b.sent();
                        for (_i = 0, fonts_2 = fonts; _i < fonts_2.length; _i++) {
                            font = fonts_2[_i];
                            list = availableFontStylesByFamily.get(font.fontName.family);
                            if (list)
                                list.push(font.fontName.style);
                            else
                                availableFontStylesByFamily.set(font.fontName.family, [font.fontName.style]);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _b.sent();
                        warn("Could not list available fonts: ".concat(formatError(error_3)));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, (_a = availableFontStylesByFamily.get(family)) !== null && _a !== void 0 ? _a : []];
                }
            });
        });
    }
    // Candidate style names cover Latin conventions only; families like
    // Hiragino (W3/W6) resolve through the family's actual style list by
    // nearest weight, so the first CSS family wins over a later fallback.
    // Returns the style it tried so the caller records the W-number attempts
    // only this path can discover, instead of reconstructing the pre-resolution
    // candidate list at the reporting site.
    function loadNearestAvailableFont(family, weight, italic) {
        return __awaiter(this, void 0, void 0, function () {
            var styleNames, style, candidate, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, getAvailableFontStyles(family)];
                    case 1:
                        styleNames = _b.sent();
                        style = selectNearestFontStyle(styleNames, weight, italic);
                        if (!style)
                            return [2 /*return*/, { attemptedStyles: [] }];
                        candidate = { family: family, style: style };
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, figma.loadFontAsync(candidate)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, { attemptedStyles: [style], font: candidate }];
                    case 4:
                        _a = _b.sent();
                        return [2 /*return*/, { attemptedStyles: [style] }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    // A substitution is a load that differs from what the payload asked for:
    // a later family in the CSS stack, or a style the requested weight never
    // named — the available-style path picked that one. Synonyms of the
    // requested weight ("SemiBold" for "Semi Bold") are the requested style,
    // not a substitution. A payload with no specific family (CSS generic only)
    // requested nothing to substitute. Recording never aborts an import.
    function recordFontSubstitution(record) {
        try {
            if (!record.requestedFamily)
                return;
            if (record.font.family === record.requestedFamily &&
                record.styleCandidates.includes(record.font.style)) {
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
        }
        catch (_a) {
            // Reporting a substitution must never break the import.
        }
    }
    function loadTextFont(styles, path) {
        return __awaiter(this, void 0, void 0, function () {
            function noteAttempt(style) {
                if (!attemptedStyles.includes(style))
                    attemptedStyles.push(style);
            }
            function resolved(font) {
                recordFontSubstitution({
                    attemptedStyles: attemptedStyles,
                    font: font,
                    path: path,
                    requestedFamily: requestedFamily,
                    requestedWeight: fontWeight,
                    styleCandidates: styleCandidates,
                });
                return { attemptedStyles: attemptedStyles, font: font };
            }
            var fontWeight, fontItalic, families, styleCandidates, requestedFamily, attemptedStyles, familyIndex, family, _i, styleCandidates_1, style, candidate, _a, nearest, _b, _c, style, fallback, error_4;
            var _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        fontWeight = (_d = styles.fontWeight) !== null && _d !== void 0 ? _d : 400;
                        fontItalic = styles.fontStyle === "italic";
                        families = getFontFamilyCandidates(styles.fontFamily);
                        styleCandidates = getFontStyleCandidates(fontWeight, fontItalic);
                        requestedFamily = (_e = families[0]) !== null && _e !== void 0 ? _e : "";
                        attemptedStyles = [];
                        familyIndex = 0;
                        _f.label = 1;
                    case 1:
                        if (!(familyIndex < families.length)) return [3 /*break*/, 10];
                        family = families[familyIndex];
                        _i = 0, styleCandidates_1 = styleCandidates;
                        _f.label = 2;
                    case 2:
                        if (!(_i < styleCandidates_1.length)) return [3 /*break*/, 7];
                        style = styleCandidates_1[_i];
                        candidate = { family: family, style: style };
                        noteAttempt(style);
                        _f.label = 3;
                    case 3:
                        _f.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, figma.loadFontAsync(candidate)];
                    case 4:
                        _f.sent();
                        if (familyIndex > 0) {
                            warn("Loaded fallback font for ".concat(path, "; ").concat(families[0], " was unavailable, using ").concat(family, " ").concat(style, "."));
                        }
                        return [2 /*return*/, resolved(candidate)];
                    case 5:
                        _a = _f.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [4 /*yield*/, loadNearestAvailableFont(family, fontWeight, fontItalic)];
                    case 8:
                        nearest = _f.sent();
                        for (_b = 0, _c = nearest.attemptedStyles; _b < _c.length; _b++) {
                            style = _c[_b];
                            noteAttempt(style);
                        }
                        if (nearest.font) {
                            if (familyIndex > 0) {
                                warn("Loaded fallback font for ".concat(path, "; ").concat(families[0], " was unavailable, using ").concat(nearest.font.family, " ").concat(nearest.font.style, "."));
                            }
                            return [2 /*return*/, resolved(nearest.font)];
                        }
                        _f.label = 9;
                    case 9:
                        familyIndex += 1;
                        return [3 /*break*/, 1];
                    case 10:
                        fallback = { family: "Inter", style: "Regular" };
                        noteAttempt(fallback.style);
                        _f.label = 11;
                    case 11:
                        _f.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, figma.loadFontAsync(fallback)];
                    case 12:
                        _f.sent();
                        warn("Loaded fallback font for ".concat(path, "; ").concat(families.join(", ") || "CSS generic family", " (").concat(styleCandidates.join(", "), ") was unavailable."));
                        return [2 /*return*/, resolved(fallback)];
                    case 13:
                        error_4 = _f.sent();
                        warn("Could not load fallback font for ".concat(path, ": ").concat(formatError(error_4)));
                        throw error_4;
                    case 14: return [2 /*return*/];
                }
            });
        });
    }
    function resolveTokenValue(tokenName, visited) {
        if (visited === void 0) { visited = new Set(); }
        if (!tokenName)
            return undefined;
        if (visited.has(tokenName))
            return undefined;
        visited.add(tokenName);
        var token = tokenByCssName.get(tokenName);
        if (!token)
            return undefined;
        if (token.alias)
            return resolveTokenValue(token.alias, visited);
        return token.rawValue || token.value;
    }
    function resolveTokenSpec(tokenName, visited) {
        var _a;
        if (visited === void 0) { visited = new Set(); }
        if (!tokenName || visited.has(tokenName))
            return undefined;
        visited.add(tokenName);
        var token = tokenByCssName.get(tokenName);
        if (!token)
            return undefined;
        if (token.alias)
            return (_a = resolveTokenSpec(token.alias, visited)) !== null && _a !== void 0 ? _a : token;
        return token;
    }
    // The raw CSS value is the comparison truth (export-side value transforms
    // like the opacity percent scale must not skew the check).
    function resolveTokenNumber(tokenName) {
        var _a;
        var spec = resolveTokenSpec(tokenName);
        if (!spec)
            return undefined;
        var raw = String((_a = spec.rawValue) !== null && _a !== void 0 ? _a : "").trim();
        var match = raw.match(/^-?\d*\.?\d+/);
        if (match)
            return Number(match[0]);
        return typeof spec.value === "number" ? spec.value : undefined;
    }
    function resolveTokenRgba(tokenName) {
        var _a;
        var spec = resolveTokenSpec(tokenName);
        if (!spec || spec.type !== "COLOR")
            return undefined;
        if (isColor(spec.value))
            return spec.value;
        return colorFromCssStrict(String((_a = spec.rawValue) !== null && _a !== void 0 ? _a : ""));
    }
    // Computed styles are ground truth: a variable may only bind when its
    // resolved value matches the style value it would replace (a unitless
    // line-height ratio must never override a pixel line height).
    function tokenNumberMatchesStyle(tokenName, styleValue) {
        if (!tokenName)
            return true;
        if (typeof styleValue !== "number" || !Number.isFinite(styleValue))
            return true;
        var tokenValue = resolveTokenNumber(tokenName);
        if (tokenValue === undefined)
            return true;
        if (Math.abs(tokenValue - styleValue) <= 0.6)
            return true;
        return (styleValue !== 0 &&
            Math.abs(tokenValue - styleValue) / Math.abs(styleValue) <= 0.01);
    }
    function safeBindNumberMatched(node, field, tokenName, styleValue, path) {
        if (!tokenName)
            return;
        if (!tokenNumberMatchesStyle(tokenName, styleValue)) {
            warn("Skipped ".concat(path, ".").concat(field, " binding to ").concat(tokenName, ": token value ") +
                "".concat(resolveTokenNumber(tokenName), " does not match the rendered value ").concat(styleValue, "."));
            return;
        }
        safeBind(node, field, tokenName, path);
    }
    function rgbaRoughlyEqual(a, b) {
        return (Math.abs(a.r - b.r) <= 0.012 &&
            Math.abs(a.g - b.g) <= 0.012 &&
            Math.abs(a.b - b.b) <= 0.012 &&
            Math.abs(safeNumber(a.a, 1) - safeNumber(b.a, 1)) <= 0.02);
    }
    function tokenColorMatchesStyle(tokenName, cssValue) {
        if (!tokenName || !cssValue)
            return true;
        var tokenColor = resolveTokenRgba(tokenName);
        if (!tokenColor)
            return true;
        var styleColor = colorFromCssStrict(cssValue);
        if (!styleColor)
            return true;
        return rgbaRoughlyEqual(tokenColor, styleColor);
    }
    function getFontFamilyFromToken(tokenName) {
        var value = resolveTokenValue(tokenName);
        return typeof value === "string" ? getFontFamily(value) : undefined;
    }
    function loadBoundFontFamily(tokenName, fontWeight, italic, path) {
        return __awaiter(this, void 0, void 0, function () {
            var family, styleCandidates, _i, styleCandidates_2, style, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        family = getFontFamilyFromToken(tokenName);
                        if (!family) {
                            warn("Could not resolve font family token for ".concat(path, ".fontFamily: ").concat(tokenName));
                            return [2 /*return*/, false];
                        }
                        styleCandidates = getFontStyleCandidates(fontWeight, italic);
                        _i = 0, styleCandidates_2 = styleCandidates;
                        _b.label = 1;
                    case 1:
                        if (!(_i < styleCandidates_2.length)) return [3 /*break*/, 6];
                        style = styleCandidates_2[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, figma.loadFontAsync({ family: family, style: style })];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [4 /*yield*/, loadNearestAvailableFont(family, fontWeight, italic)];
                    case 7:
                        if (_b.sent())
                            return [2 /*return*/, true];
                        warn("Skipped fontFamily binding for ".concat(path, "; ").concat(family, " (").concat(styleCandidates.join(", "), ") could not be loaded."));
                        return [2 /*return*/, false];
                }
            });
        });
    }
    // Turns this run's substitution records into the whole-environment reading.
    // Placed first in warnings because the report area truncates, and this line
    // names the corrective action for every per-node font warning below it. When
    // the determination does not hold, those per-family messages stand alone.
    function reportFontEnvironmentFault() {
        var message = formatFontEnvironmentFaultWarning(detectFontEnvironmentFault(stats.fontSubstitutions));
        if (message)
            stats.warnings.unshift(message);
    }
    return {
        canCreateComponentDefinition: canCreateComponentDefinition,
        createComponentSetFromVariants: createComponentSetFromVariants,
        createNode: createNode,
        ensureComponentDefinition: ensureComponentDefinition,
        getComponentDefinitionParentPage: getComponentDefinitionParentPage,
        organizeComponentDependencySections: organizeComponentDependencySections,
        preparePageComponentDefinitions: preparePageComponentDefinitions,
        reportFontEnvironmentFault: reportFontEnvironmentFault,
        stats: stats,
        upsertVariables: upsertVariables,
    };
}
function getCollection(layer, collectionNames) {
    return __awaiter(this, void 0, void 0, function () {
        var collectionName, collections, existing, created;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    collectionName = collectionNames[layer];
                    return [4 /*yield*/, figma.variables.getLocalVariableCollectionsAsync()];
                case 1:
                    collections = _a.sent();
                    existing = collections.find(function (collection) { return collection.name === collectionName; });
                    if (existing)
                        return [2 /*return*/, existing];
                    created = figma.variables.createVariableCollection(collectionName);
                    if (created.modes[0] && created.modes[0].name !== "Default") {
                        created.renameMode(created.modes[0].modeId, "Default");
                    }
                    return [2 /*return*/, created];
            }
        });
    });
}
function findExistingVariable(collection, spec, pluginDataKey) {
    return __awaiter(this, void 0, void 0, function () {
        var variables, collectionVariables, byPluginData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, figma.variables.getLocalVariablesAsync()];
                case 1:
                    variables = _a.sent();
                    collectionVariables = variables.filter(function (variable) { return variable.variableCollectionId === collection.id; });
                    byPluginData = collectionVariables.find(function (variable) {
                        return getVariablePluginData(variable, pluginDataKey) === spec.cssName ||
                            getVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) === spec.cssName;
                    });
                    if (byPluginData)
                        return [2 /*return*/, byPluginData];
                    return [2 /*return*/, collectionVariables.find(function (variable) { return variable.name === spec.figmaName; })];
            }
        });
    });
}
function findVariableByCssToken(cssName, pluginDataKey) {
    return __awaiter(this, void 0, void 0, function () {
        var variables, byPluginData, figmaName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, figma.variables.getLocalVariablesAsync()];
                case 1:
                    variables = _a.sent();
                    byPluginData = variables.find(function (variable) {
                        return getVariablePluginData(variable, pluginDataKey) === cssName ||
                            getVariablePluginData(variable, LEGACY_CM_TOKEN_PLUGIN_DATA_KEY) === cssName;
                    });
                    if (byPluginData)
                        return [2 /*return*/, byPluginData];
                    figmaName = cssTokenToFigmaVariableName(cssName);
                    return [2 /*return*/, variables.find(function (variable) { return variable.name === figmaName; })];
            }
        });
    });
}
function getVariablePluginData(variable, key) {
    var _a, _b, _c;
    try {
        return (_c = (_b = (_a = variable).getPluginData) === null || _b === void 0 ? void 0 : _b.call(_a, key)) !== null && _c !== void 0 ? _c : "";
    }
    catch (_d) {
        return "";
    }
}
function setVariablePluginData(variable, key, value) {
    var _a, _b;
    (_b = (_a = variable).setPluginData) === null || _b === void 0 ? void 0 : _b.call(_a, key, value);
}
function getNodePluginData(node, key) {
    var _a, _b, _c;
    try {
        return (_c = (_b = (_a = node).getPluginData) === null || _b === void 0 ? void 0 : _b.call(_a, key)) !== null && _c !== void 0 ? _c : "";
    }
    catch (_d) {
        return "";
    }
}
function setNodePluginData(node, key, value) {
    var _a, _b;
    try {
        (_b = (_a = node).setPluginData) === null || _b === void 0 ? void 0 : _b.call(_a, key, value);
    }
    catch (_c) {
        // Component metadata is best-effort and only used for future reuse.
    }
}
function getComponentSpecHash(spec) {
    var normalized = __assign(__assign({}, spec), { styles: __assign(__assign({}, spec.styles), { x: 0, y: 0 }) });
    var json = JSON.stringify(normalized);
    var hash = 5381;
    for (var index = 0; index < json.length; index += 1) {
        hash = ((hash << 5) + hash + json.charCodeAt(index)) | 0;
    }
    return String(hash >>> 0);
}
function getComponentDisplayName(component) {
    var variantDisplayName = getVariantPropertyDisplayName(component);
    if (variantDisplayName)
        return "".concat(component.name, ", ").concat(variantDisplayName);
    return component.name;
}
function getVariantPropertyDisplayName(component) {
    var variantProperties = component.variantProperties && Object.keys(component.variantProperties).length > 0
        ? component.variantProperties
        : component.variant
            ? { Variant: component.variant }
            : undefined;
    if (!variantProperties)
        return "";
    return Object.entries(variantProperties)
        .map(function (_a) {
        var name = _a[0], value = _a[1];
        return "".concat(name, "=").concat(value);
    })
        .join(", ");
}
function cssTokenToFigmaVariableName(cssName) {
    return cssName.replace(/^--/, "").replace(/-/g, "/");
}
function collectFontFamilyTokenNames(root, tokenByCssName) {
    var names = new Set();
    function addAliasChain(tokenName) {
        var _a;
        var current = tokenName;
        while (current && !names.has(current)) {
            names.add(current);
            current = (_a = tokenByCssName.get(current)) === null || _a === void 0 ? void 0 : _a.alias;
        }
    }
    function visit(node) {
        var _a, _b;
        addAliasChain((_a = node.bindings) === null || _a === void 0 ? void 0 : _a.fontFamily);
        for (var _i = 0, _c = (_b = node.children) !== null && _b !== void 0 ? _b : []; _i < _c.length; _i++) {
            var child = _c[_i];
            visit(child);
        }
    }
    visit(root);
    return names;
}
function normalizeVariableValue(spec, fontFamilyTokenNames) {
    var _a;
    if (fontFamilyTokenNames === void 0) { fontFamilyTokenNames = new Set(); }
    var value = (_a = spec.value) !== null && _a !== void 0 ? _a : parseRawTokenValue(spec.rawValue, spec.type);
    if (spec.type === "COLOR") {
        return cloneColor(value);
    }
    if (spec.type === "FLOAT") {
        return safeNumber(value, 0);
    }
    if (spec.type === "BOOLEAN") {
        return Boolean(value);
    }
    if (spec.type === "STRING" &&
        ((Array.isArray(spec.scopes) && spec.scopes.includes("FONT_FAMILY")) ||
            fontFamilyTokenNames.has(spec.cssName))) {
        return getFontFamily(String(spec.rawValue || spec.value || "Inter"));
    }
    return String(value !== null && value !== void 0 ? value : "");
}
function parseRawTokenValue(rawValue, type) {
    var raw = String(rawValue !== null && rawValue !== void 0 ? rawValue : "").trim();
    if (type === "COLOR")
        return colorFromCss(raw);
    if (type === "FLOAT") {
        var number = raw.match(/^-?\d+(?:\.\d+)?/);
        return number ? Number(number[0]) : 0;
    }
    if (type === "BOOLEAN")
        return raw === "true";
    return raw.replace(/^["']|["']$/g, "");
}
function cloneColor(value) {
    var color = isColor(value) ? value : colorFromCss(String(value !== null && value !== void 0 ? value : ""));
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
function getLinearGradientTransform(angle) {
    var radians = ((angle - 90) * Math.PI) / 180;
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var translateX = 0.5 - (cos * 0.5 + sin * 0.5);
    var translateY = 0.5 - (-sin * 0.5 + cos * 0.5);
    return [
        [cos, sin, translateX],
        [-sin, cos, translateY],
    ];
}
// Accepts commas, spaces, and the slash alpha separator so both legacy
// "rgb(1, 2, 3)" and modern "rgb(1 2 3 / 0.5)" syntaxes parse.
function splitColorComponents(inner) {
    return inner
        .replace(/\//g, " ")
        .split(/[\s,]+/)
        .filter(function (part) { return part.length > 0; });
}
function parseColorComponent(part, scale) {
    if (part === undefined)
        return undefined;
    var percent = part.match(/^(-?\d*\.?\d+)%$/);
    if (percent)
        return (Number(percent[1]) / 100) * scale;
    var numeric = part.match(/^(-?\d*\.?\d+)$/);
    return numeric ? Number(numeric[1]) : undefined;
}
function hslToRgbColor(hue, saturation, lightness) {
    var _a, _b, _c, _d, _e, _f;
    var normalizedHue = (((hue % 360) + 360) % 360) / 60;
    var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    var secondary = chroma * (1 - Math.abs((normalizedHue % 2) - 1));
    var offset = lightness - chroma / 2;
    var r = 0;
    var g = 0;
    var b = 0;
    if (normalizedHue < 1)
        _a = [chroma, secondary, 0], r = _a[0], g = _a[1], b = _a[2];
    else if (normalizedHue < 2)
        _b = [secondary, chroma, 0], r = _b[0], g = _b[1], b = _b[2];
    else if (normalizedHue < 3)
        _c = [0, chroma, secondary], r = _c[0], g = _c[1], b = _c[2];
    else if (normalizedHue < 4)
        _d = [0, secondary, chroma], r = _d[0], g = _d[1], b = _d[2];
    else if (normalizedHue < 5)
        _e = [secondary, 0, chroma], r = _e[0], g = _e[1], b = _e[2];
    else
        _f = [chroma, 0, secondary], r = _f[0], g = _f[1], b = _f[2];
    return { b: b + offset, g: g + offset, r: r + offset };
}
// The exporter normalizes colors to hex/rgb, so named values only appear in
// hand-written payloads or raw token values; a small map keeps the common
// ones from importing as black.
var NAMED_CSS_COLORS = {
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
function colorFromCssStrict(cssValue) {
    var value = cssValue.trim();
    if (!value)
        return undefined;
    if (NAMED_CSS_COLORS[value.toLowerCase()] ||
        /^#[0-9a-f]{3,8}$/i.test(value) ||
        /^rgba?\(/i.test(value) ||
        /^hsla?\(/i.test(value)) {
        return colorFromCss(value);
    }
    return undefined;
}
function colorFromCss(cssValue) {
    var _a;
    if (!cssValue)
        return { a: 1, b: 0, g: 0, r: 0 };
    var value = cssValue.trim();
    var named = NAMED_CSS_COLORS[value.toLowerCase()];
    if (named)
        return __assign({}, named);
    var hex = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        var digits_1 = hex[1];
        if (digits_1.length === 3 || digits_1.length === 4) {
            var channel = function (index) {
                return Number.parseInt("".concat(digits_1[index]).concat(digits_1[index]), 16) / 255;
            };
            return {
                a: digits_1.length === 4 ? channel(3) : 1,
                b: channel(2),
                g: channel(1),
                r: channel(0),
            };
        }
        if (digits_1.length === 6 || digits_1.length === 8) {
            var channel = function (index) {
                return Number.parseInt(digits_1.slice(index, index + 2), 16) / 255;
            };
            return {
                a: digits_1.length === 8 ? channel(6) : 1,
                b: channel(4),
                g: channel(2),
                r: channel(0),
            };
        }
        return { a: 1, b: 0, g: 0, r: 0 };
    }
    var rgb = value.match(/^rgba?\(([^)]+)\)$/i);
    if (rgb) {
        var parts = splitColorComponents(rgb[1]);
        return {
            a: clamp(safeNumber(parseColorComponent(parts[3], 1), 1), 0, 1),
            b: clamp(safeNumber(parseColorComponent(parts[2], 255), 0) / 255, 0, 1),
            g: clamp(safeNumber(parseColorComponent(parts[1], 255), 0) / 255, 0, 1),
            r: clamp(safeNumber(parseColorComponent(parts[0], 255), 0) / 255, 0, 1),
        };
    }
    var hsl = value.match(/^hsla?\(([^)]+)\)$/i);
    if (hsl) {
        var parts = splitColorComponents(hsl[1]);
        var hue = safeNumber(parseColorComponent((_a = parts[0]) === null || _a === void 0 ? void 0 : _a.replace(/deg$/i, ""), 360), 0);
        var saturation = clamp(safeNumber(parseColorComponent(parts[1], 1), 0), 0, 1);
        var lightness = clamp(safeNumber(parseColorComponent(parts[2], 1), 0), 0, 1);
        var alpha = clamp(safeNumber(parseColorComponent(parts[3], 1), 1), 0, 1);
        var rgbColor = hslToRgbColor(hue, saturation, lightness);
        return {
            a: alpha,
            b: clamp(rgbColor.b, 0, 1),
            g: clamp(rgbColor.g, 0, 1),
            r: clamp(rgbColor.r, 0, 1),
        };
    }
    return { a: 1, b: 0, g: 0, r: 0 };
}
function parsePayload(json) {
    var parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (error) {
        throw new Error("Invalid JSON. Use Storybook's Copy JSON output. ".concat(formatError(error)));
    }
    if (!isRecord(parsed)) {
        throw new Error("Invalid payload: expected a JSON object.");
    }
    if (typeof parsed.version !== "number" ||
        !SUPPORTED_PAYLOAD_VERSIONS.includes(parsed.version)) {
        throw new Error("Unsupported payload version ".concat(String(parsed.version), ". Expected version 1 or 2."));
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
    if (parsed.artifactKind !== undefined &&
        parsed.artifactKind !== "component" &&
        parsed.artifactKind !== "page") {
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
    for (var _i = 0, _a = parsed.tokens; _i < _a.length; _i++) {
        var token = _a[_i];
        validateToken(token);
    }
    validateNode(parsed.root, "root");
    return parsed;
}
function validateToken(token) {
    if (!isRecord(token))
        throw new Error("Invalid token: expected object.");
    if (token.collection !== "ref" &&
        token.collection !== "sys" &&
        token.collection !== "comp") {
        throw new Error("Invalid token collection for ".concat(String(token.cssName), "."));
    }
    if (!isCssCustomPropertyName(token.cssName)) {
        throw new Error("Invalid token: cssName must be a CSS custom property name.");
    }
    if (typeof token.figmaName !== "string" || token.figmaName.length === 0) {
        throw new Error("Invalid token ".concat(token.cssName, ": figmaName is missing."));
    }
    if (token.type !== "BOOLEAN" &&
        token.type !== "COLOR" &&
        token.type !== "FLOAT" &&
        token.type !== "STRING") {
        throw new Error("Invalid token ".concat(token.cssName, ": unsupported type."));
    }
    if ("alias" in token && typeof token.alias !== "string") {
        throw new Error("Invalid token ".concat(token.cssName, ": alias must be a string."));
    }
}
function isCssCustomPropertyName(value) {
    return typeof value === "string" && /^--[A-Za-z0-9_-]+$/.test(value);
}
function validateNode(node, path) {
    if (!isRecord(node))
        throw new Error("Invalid node ".concat(path, ": expected object."));
    if (node.kind !== "frame" &&
        node.kind !== "image" &&
        node.kind !== "svg" &&
        node.kind !== "text") {
        throw new Error("Invalid node ".concat(path, ": unsupported kind."));
    }
    if (typeof node.name !== "string") {
        throw new Error("Invalid node ".concat(path, ": name must be a string."));
    }
    if (!isRecord(node.styles)) {
        throw new Error("Invalid node ".concat(path, ": styles are missing."));
    }
    if (typeof node.styles.width !== "number" ||
        typeof node.styles.height !== "number" ||
        typeof node.styles.x !== "number" ||
        typeof node.styles.y !== "number") {
        throw new Error("Invalid node ".concat(path, ": width, height, x, and y must be numbers."));
    }
    if (node.styles.textAutoResize !== undefined &&
        node.styles.textAutoResize !== "WIDTH_AND_HEIGHT" &&
        node.styles.textAutoResize !== "HEIGHT") {
        throw new Error("Invalid node ".concat(path, ": unsupported textAutoResize value."));
    }
    if (node.styles.textTruncation !== undefined &&
        node.styles.textTruncation !== "ENDING") {
        throw new Error("Invalid node ".concat(path, ": unsupported textTruncation value."));
    }
    if (node.styles.maxLines !== undefined && typeof node.styles.maxLines !== "number") {
        throw new Error("Invalid node ".concat(path, ": maxLines must be a number."));
    }
    if (node.styles.textAlign !== undefined && typeof node.styles.textAlign !== "string") {
        throw new Error("Invalid node ".concat(path, ": textAlign must be a string."));
    }
    if (node.styles.layoutAlign !== undefined &&
        node.styles.layoutAlign !== "STRETCH") {
        throw new Error("Invalid node ".concat(path, ": unsupported layoutAlign value."));
    }
    if (node.styles.layoutGrow !== undefined &&
        node.styles.layoutGrow !== 1) {
        throw new Error("Invalid node ".concat(path, ": unsupported layoutGrow value."));
    }
    if (node.styles.layoutSizingHorizontal !== undefined &&
        node.styles.layoutSizingHorizontal !== "HUG") {
        throw new Error("Invalid node ".concat(path, ": unsupported layoutSizingHorizontal value."));
    }
    if (node.styles.layoutSizingVertical !== undefined &&
        node.styles.layoutSizingVertical !== "HUG") {
        throw new Error("Invalid node ".concat(path, ": unsupported layoutSizingVertical value."));
    }
    if (node.styles.textAlignVertical !== undefined &&
        node.styles.textAlignVertical !== "CENTER") {
        throw new Error("Invalid node ".concat(path, ": unsupported textAlignVertical value."));
    }
    if (node.styles.backgroundLinearGradient !== undefined) {
        validateLinearGradient(node.styles.backgroundLinearGradient, "".concat(path, ".backgroundLinearGradient"));
    }
    if (node.styles.backgroundRadialGradient !== undefined) {
        validateRadialGradient(node.styles.backgroundRadialGradient, "".concat(path, ".backgroundRadialGradient"));
    }
    if (node.styles.textGrowHeight !== undefined && typeof node.styles.textGrowHeight !== "boolean") {
        throw new Error("Invalid node ".concat(path, ": textGrowHeight must be a boolean."));
    }
    if (node.styles.blurEffects !== undefined) {
        validateEffects(node.styles.blurEffects, "".concat(path, ".blurEffects"));
    }
    if (node.styles.transformMatrix !== undefined) {
        validateTransformMatrix(node.styles.transformMatrix, "".concat(path, ".transformMatrix"));
    }
    if (node.styles.borderStyle !== undefined &&
        node.styles.borderStyle !== "dashed" &&
        node.styles.borderStyle !== "dotted") {
        throw new Error("Invalid node ".concat(path, ": unsupported borderStyle value."));
    }
    if (node.styles.borderSides !== undefined) {
        validateBorderSides(node.styles.borderSides, "".concat(path, ".borderSides"));
    }
    if (node.styles.effects !== undefined) {
        validateEffects(node.styles.effects, "".concat(path, ".effects"));
    }
    if (node.styles.radiusCorners !== undefined) {
        validateRadiusCorners(node.styles.radiusCorners, "".concat(path, ".radiusCorners"));
    }
    if (node.styles.layoutWrap !== undefined && node.styles.layoutWrap !== "WRAP") {
        throw new Error("Invalid node ".concat(path, ": unsupported layoutWrap value."));
    }
    if (node.styles.counterAxisSpacing !== undefined &&
        typeof node.styles.counterAxisSpacing !== "number") {
        throw new Error("Invalid node ".concat(path, ": counterAxisSpacing must be a number."));
    }
    if (node.styles.letterSpacing !== undefined &&
        typeof node.styles.letterSpacing !== "number") {
        throw new Error("Invalid node ".concat(path, ": letterSpacing must be a number."));
    }
    if (node.styles.textDecoration !== undefined &&
        node.styles.textDecoration !== "STRIKETHROUGH" &&
        node.styles.textDecoration !== "UNDERLINE") {
        throw new Error("Invalid node ".concat(path, ": unsupported textDecoration value."));
    }
    if (node.styles.fontStyle !== undefined && node.styles.fontStyle !== "italic") {
        throw new Error("Invalid node ".concat(path, ": unsupported fontStyle value."));
    }
    if (node.styles.imageScaleMode !== undefined &&
        node.styles.imageScaleMode !== "FILL" &&
        node.styles.imageScaleMode !== "FIT") {
        throw new Error("Invalid node ".concat(path, ": unsupported imageScaleMode value."));
    }
    if (node.imageBase64 !== undefined && typeof node.imageBase64 !== "string") {
        throw new Error("Invalid node ".concat(path, ": imageBase64 must be a string."));
    }
    if (node.imageMimeType !== undefined && typeof node.imageMimeType !== "string") {
        throw new Error("Invalid node ".concat(path, ": imageMimeType must be a string."));
    }
    if (node.styles.outOfFlow !== undefined && typeof node.styles.outOfFlow !== "boolean") {
        throw new Error("Invalid node ".concat(path, ": outOfFlow must be a boolean."));
    }
    if (node.styles.constraints !== undefined) {
        validateConstraints(node.styles.constraints, "".concat(path, ".constraints"));
    }
    if (node.component !== undefined) {
        validateComponentReference(node.component, "".concat(path, ".component"));
    }
    if (node.children !== undefined) {
        if (!Array.isArray(node.children)) {
            throw new Error("Invalid node ".concat(path, ": children must be an array."));
        }
        node.children.forEach(function (child, index) { return validateNode(child, "".concat(path, "/").concat(index)); });
    }
}
var CONSTRAINT_VALUES = ["CENTER", "MAX", "MIN", "SCALE", "STRETCH"];
function validateConstraints(constraints, path) {
    if (!isRecord(constraints)) {
        throw new Error("Invalid node ".concat(path, ": expected object."));
    }
    if (!CONSTRAINT_VALUES.includes(String(constraints.horizontal)) ||
        !CONSTRAINT_VALUES.includes(String(constraints.vertical))) {
        throw new Error("Invalid node ".concat(path, ": unsupported constraint value."));
    }
}
var EFFECT_TYPES = [
    "BACKGROUND_BLUR",
    "DROP_SHADOW",
    "INNER_SHADOW",
    "LAYER_BLUR",
];
var EFFECT_NUMBER_FIELDS = ["blur", "offsetX", "offsetY", "spread"];
var RADIUS_CORNER_FIELDS = ["bottomLeft", "bottomRight", "topLeft", "topRight"];
function validateEffects(effects, path) {
    if (!Array.isArray(effects)) {
        throw new Error("Invalid node ".concat(path, ": effects must be an array."));
    }
    effects.forEach(function (effect, index) {
        if (!isRecord(effect)) {
            throw new Error("Invalid node ".concat(path, ".").concat(index, ": expected object."));
        }
        if (!EFFECT_TYPES.includes(String(effect.type))) {
            throw new Error("Invalid node ".concat(path, ".").concat(index, ": unsupported effect type."));
        }
        for (var _i = 0, EFFECT_NUMBER_FIELDS_1 = EFFECT_NUMBER_FIELDS; _i < EFFECT_NUMBER_FIELDS_1.length; _i++) {
            var field = EFFECT_NUMBER_FIELDS_1[_i];
            if (typeof effect[field] !== "number") {
                throw new Error("Invalid node ".concat(path, ".").concat(index, ": ").concat(field, " must be a number."));
            }
        }
        if (effect.color !== undefined && typeof effect.color !== "string") {
            throw new Error("Invalid node ".concat(path, ".").concat(index, ": color must be a string."));
        }
    });
}
function validateRadiusCorners(corners, path) {
    if (!isRecord(corners)) {
        throw new Error("Invalid node ".concat(path, ": expected object."));
    }
    for (var _i = 0, RADIUS_CORNER_FIELDS_1 = RADIUS_CORNER_FIELDS; _i < RADIUS_CORNER_FIELDS_1.length; _i++) {
        var field = RADIUS_CORNER_FIELDS_1[_i];
        if (typeof corners[field] !== "number") {
            throw new Error("Invalid node ".concat(path, ".").concat(field, ": must be a number."));
        }
    }
}
function validateBorderSides(borderSides, path) {
    if (!isRecord(borderSides)) {
        throw new Error("Invalid node ".concat(path, ": expected object."));
    }
    for (var _i = 0, _a = ["top", "right", "bottom", "left"]; _i < _a.length; _i++) {
        var side = _a[_i];
        var value = borderSides[side];
        if (value === undefined)
            continue;
        if (!isRecord(value) || typeof value.width !== "number") {
            throw new Error("Invalid node ".concat(path, ".").concat(side, ": width must be a number."));
        }
        if (value.color !== undefined && typeof value.color !== "string") {
            throw new Error("Invalid node ".concat(path, ".").concat(side, ": color must be a string."));
        }
    }
}
function validateLinearGradient(gradient, path) {
    if (!isRecord(gradient)) {
        throw new Error("Invalid node ".concat(path, ": expected object."));
    }
    if (typeof gradient.angle !== "number") {
        throw new Error("Invalid node ".concat(path, ": angle must be a number."));
    }
    if (!Array.isArray(gradient.stops) || gradient.stops.length < 2) {
        throw new Error("Invalid node ".concat(path, ": stops must contain at least two colors."));
    }
    gradient.stops.forEach(function (stop, index) {
        if (!isRecord(stop)) {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": expected object."));
        }
        if (typeof stop.color !== "string") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": color must be a string."));
        }
        if (typeof stop.position !== "number") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": position must be a number."));
        }
        if (stop.token !== undefined && typeof stop.token !== "string") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": token must be a string."));
        }
    });
}
function validateTransformMatrix(matrix, path) {
    var isValid = Array.isArray(matrix) &&
        matrix.length === 2 &&
        matrix.every(function (row) {
            return Array.isArray(row) &&
                row.length === 3 &&
                row.every(function (value) { return typeof value === "number" && Number.isFinite(value); });
        });
    if (!isValid) {
        throw new Error("Invalid node ".concat(path, ": expected a 2x3 number matrix."));
    }
}
function validateReferenceImage(reference) {
    if (!isRecord(reference)) {
        throw new Error("Invalid reference: expected object.");
    }
    if (typeof reference.imageBase64 !== "string" || reference.imageBase64.length === 0) {
        throw new Error("Invalid reference: imageBase64 must be a non-empty string.");
    }
    if (typeof reference.imageMimeType !== "string") {
        throw new Error("Invalid reference: imageMimeType must be a string.");
    }
    if (typeof reference.width !== "number" ||
        typeof reference.height !== "number" ||
        reference.width <= 0 ||
        reference.height <= 0) {
        throw new Error("Invalid reference: width and height must be positive numbers.");
    }
}
function validateRadialGradient(gradient, path) {
    if (!isRecord(gradient)) {
        throw new Error("Invalid node ".concat(path, ": expected object."));
    }
    if (!Array.isArray(gradient.stops) || gradient.stops.length < 2) {
        throw new Error("Invalid node ".concat(path, ": stops must contain at least two colors."));
    }
    gradient.stops.forEach(function (stop, index) {
        if (!isRecord(stop)) {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": expected object."));
        }
        if (typeof stop.color !== "string") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": color must be a string."));
        }
        if (typeof stop.position !== "number") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": position must be a number."));
        }
        if (stop.token !== undefined && typeof stop.token !== "string") {
            throw new Error("Invalid node ".concat(path, ".stops.").concat(index, ": token must be a string."));
        }
    });
}
function validateComponentReference(component, path) {
    if (!isRecord(component)) {
        throw new Error("Invalid ".concat(path, ": expected object."));
    }
    if (typeof component.key !== "string" ||
        typeof component.name !== "string" ||
        typeof component.sourceName !== "string") {
        throw new Error("Invalid ".concat(path, ": key, name, and sourceName are required."));
    }
    if (component.variant !== undefined && typeof component.variant !== "string") {
        throw new Error("Invalid ".concat(path, ": variant must be a string."));
    }
}
function getInferredChildTextAlignHorizontal(parent) {
    if (parent.layoutMode === "HORIZONTAL") {
        if (parent.primaryAxisAlignItems === "CENTER")
            return "CENTER";
        if (parent.primaryAxisAlignItems === "MAX")
            return "RIGHT";
    }
    if (parent.layoutMode === "VERTICAL") {
        if (parent.counterAxisAlignItems === "CENTER")
            return "CENTER";
        if (parent.counterAxisAlignItems === "MAX")
            return "RIGHT";
    }
    return undefined;
}
// overflow auto/scroll/overlay also clip content in the browser; only
// visible lets children spill out of the box.
function shouldClipContent(overflow) {
    return /(hidden|clip|auto|scroll|overlay)/i.test(String(overflow !== null && overflow !== void 0 ? overflow : ""));
}
// Rewrites the root <svg> tag so createNodeFromSvg yields the rendered size.
// Without a viewBox, changing width/height crops instead of scaling, so the
// intrinsic size becomes the viewBox first.
function setSvgRootSize(svgText, width, height) {
    var match = svgText.match(/<svg\b[^>]*>/i);
    if (!match)
        return svgText;
    var rootTag = match[0];
    var readAttribute = function (name) {
        var _a;
        var attribute = rootTag.match(new RegExp("\\b".concat(name, "\\s*=\\s*(\"([^\"]*)\"|'([^']*)')"), "i"));
        return attribute ? (_a = attribute[2]) !== null && _a !== void 0 ? _a : attribute[3] : undefined;
    };
    var parseIntrinsicLength = function (value) {
        if (!value)
            return undefined;
        var length = value.trim().match(/^(\d*\.?\d+)(px)?$/);
        return length ? Number(length[1]) : undefined;
    };
    var nextTag = rootTag;
    var writeAttribute = function (name, value) {
        var pattern = new RegExp("\\b".concat(name, "\\s*=\\s*(\"[^\"]*\"|'[^']*')"), "i");
        nextTag = pattern.test(nextTag)
            ? nextTag.replace(pattern, "".concat(name, "=\"").concat(value, "\""))
            : nextTag.replace(/<svg\b/i, "<svg ".concat(name, "=\"").concat(value, "\""));
    };
    if (!readAttribute("viewBox")) {
        var intrinsicWidth = parseIntrinsicLength(readAttribute("width"));
        var intrinsicHeight = parseIntrinsicLength(readAttribute("height"));
        if (intrinsicWidth && intrinsicHeight) {
            writeAttribute("viewBox", "0 0 ".concat(intrinsicWidth, " ").concat(intrinsicHeight));
        }
    }
    writeAttribute("width", String(Math.max(1, width)));
    writeAttribute("height", String(Math.max(1, height)));
    return svgText.replace(rootTag, nextTag);
}
function mapTextAlignHorizontal(value) {
    var normalized = String(value !== null && value !== void 0 ? value : "").trim().toLowerCase();
    if (!normalized)
        return undefined;
    if (normalized === "center" || normalized === "-webkit-center")
        return "CENTER";
    if (normalized === "right" || normalized === "end")
        return "RIGHT";
    if (normalized === "justify")
        return "JUSTIFIED";
    if (normalized === "left" || normalized === "start")
        return "LEFT";
    return undefined;
}
// space-around/space-evenly intentionally map to MIN: the exporter converts
// their measured edge offsets into padding, so MIN reproduces the layout.
function mapAxisAlignment(value) {
    if (value === "center")
        return "CENTER";
    if (value === "flex-end" || value === "end" || value === "right")
        return "MAX";
    if (value === "space-between")
        return "SPACE_BETWEEN";
    return "MIN";
}
function mapCounterAlignment(value) {
    if (value === "center")
        return "CENTER";
    if (value === "flex-end" || value === "end")
        return "MAX";
    if (String(value !== null && value !== void 0 ? value : "").includes("baseline"))
        return "BASELINE";
    return "MIN";
}
function getUprightFontStyleCandidates(weight) {
    if (weight >= 900)
        return ["Black", "Heavy", "ExtraBold", "Extra Bold", "Bold", "Regular"];
    if (weight >= 800)
        return ["ExtraBold", "Extra Bold", "Black", "Bold", "Regular"];
    if (weight >= 700)
        return ["Bold", "Semibold", "Semi Bold", "SemiBold", "Medium", "Regular"];
    if (weight >= 600)
        return ["Semi Bold", "Semibold", "SemiBold", "Medium", "Regular"];
    if (weight >= 500)
        return ["Medium", "Regular"];
    if (weight >= 400)
        return ["Regular"];
    if (weight >= 300)
        return ["Light", "Regular"];
    if (weight >= 200)
        return ["Extra Light", "ExtraLight", "Light", "Thin", "Regular"];
    return ["Thin", "Extra Light", "ExtraLight", "Light", "Regular"];
}
function getFontStyleCandidates(weight, italic) {
    if (italic === void 0) { italic = false; }
    var upright = getUprightFontStyleCandidates(weight);
    if (!italic)
        return upright;
    // Prefer italic variants of the same weight, then fall back to upright.
    var italicCandidates = upright.map(function (style) {
        return style === "Regular" ? "Italic" : "".concat(style, " Italic");
    });
    return italicCandidates.concat(upright);
}
var FONT_STYLE_WEIGHT_NAMES = {
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
// Parses a font style name into weight/italic semantics. W-number names
// (Hiragino "W6" -> 600) and purely numeric names win over the Latin table;
// unparseable names return undefined so callers can skip them.
function parseFontStyleWeight(styleName) {
    var italic = /\b(italic|oblique)\b/i.test(styleName);
    var base = styleName
        .replace(/\b(italic|oblique)\b/gi, " ")
        .replace(/[\s_-]+/g, " ")
        .trim();
    var wNumber = /^w ?(\d{1,2})$/i.exec(base);
    if (wNumber)
        return { italic: italic, weight: Number(wNumber[1]) * 100 };
    if (/^\d{2,4}$/.test(base))
        return { italic: italic, weight: Number(base) };
    if (!base && italic)
        return { italic: italic, weight: 400 };
    var named = FONT_STYLE_WEIGHT_NAMES[base.toLowerCase().replace(/ /g, "")];
    return named === undefined ? undefined : { italic: italic, weight: named };
}
// Picks the closest-weight style from a family's actual style names,
// preferring the requested slant, and the heavier style on weight ties
// (matching browser bolder-resolution behavior).
function selectNearestFontStyle(styles, weight, italic) {
    for (var _i = 0, _a = [true, false]; _i < _a.length; _i++) {
        var requireSlantMatch = _a[_i];
        var best = void 0;
        for (var _b = 0, styles_1 = styles; _b < styles_1.length; _b++) {
            var style = styles_1[_b];
            var parsed = parseFontStyleWeight(style);
            if (!parsed)
                continue;
            if (requireSlantMatch ? parsed.italic !== italic : parsed.italic)
                continue;
            var distance = Math.abs(parsed.weight - weight);
            if (!best ||
                distance < best.distance ||
                (distance === best.distance && parsed.weight > best.weight)) {
                best = { distance: distance, style: style, weight: parsed.weight };
            }
        }
        if (best)
            return best.style;
    }
    return undefined;
}
// Two or more distinct requested families that failed every style in one run
// cannot be explained by "those fonts are not installed" — it points at the
// local font service being unreachable, which the plugin sandbox cannot probe
// directly. One failing family stays a per-family report. Pure: no Figma API,
// no network probing, and it never throws on malformed records.
function detectFontEnvironmentFault(substitutions) {
    var families = [];
    for (var _i = 0, _a = substitutions !== null && substitutions !== void 0 ? substitutions : []; _i < _a.length; _i++) {
        var substitution = _a[_i];
        if (!substitution)
            continue;
        var requestedFamily = typeof substitution.requestedFamily === "string" ? substitution.requestedFamily : "";
        var loadedFamily = typeof substitution.loadedFamily === "string" ? substitution.loadedFamily : "";
        // A different loaded family means every style of the requested one failed;
        // a style-only substitution means the family itself did load.
        if (!requestedFamily || requestedFamily === loadedFamily)
            continue;
        if (!families.includes(requestedFamily))
            families.push(requestedFamily);
    }
    return { families: families, isEnvironmentFault: families.length >= 2 };
}
// The report line for a determined environment fault: what failed, which
// families, and the corrective action. Undefined when the determination does
// not hold, so the individual per-family messages stand on their own.
function formatFontEnvironmentFaultWarning(fault) {
    if (!fault.isEnvironmentFault)
        return undefined;
    return ("All local fonts failed to load: ".concat(fault.families.join(", "), " could not be loaded in any style. ") +
        "Figma's local font service is likely unavailable — restart Figma or check font access permissions, then import again.");
}
var CSS_GENERIC_FONT_FAMILIES = new Set([
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
function getFontFamilyCandidates(fontFamily) {
    var candidates = [];
    var buffer = "";
    var quote;
    var escaped = false;
    function pushCandidate() {
        var candidate = buffer.trim().replace(/^["']|["']$/g, "");
        buffer = "";
        if (!candidate || CSS_GENERIC_FONT_FAMILIES.has(candidate.toLowerCase()))
            return;
        if (!candidates.includes(candidate))
            candidates.push(candidate);
    }
    for (var _i = 0, _a = String(fontFamily !== null && fontFamily !== void 0 ? fontFamily : ""); _i < _a.length; _i++) {
        var character = _a[_i];
        if (escaped) {
            buffer += character;
            escaped = false;
            continue;
        }
        if (quote) {
            if (character === "\\") {
                escaped = true;
            }
            else if (character === quote) {
                quote = undefined;
            }
            else {
                buffer += character;
            }
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
        }
        else if (character === ",") {
            pushCandidate();
        }
        else {
            buffer += character;
        }
    }
    pushCandidate();
    return candidates;
}
function getFontFamily(fontFamily) {
    var _a;
    return (_a = getFontFamilyCandidates(fontFamily)[0]) !== null && _a !== void 0 ? _a : "Inter";
}
function safeNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function isColor(value) {
    return (isRecord(value) &&
        typeof value.r === "number" &&
        typeof value.g === "number" &&
        typeof value.b === "number");
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
if (typeof module !== "undefined" && module) {
    module.exports = {
        collectFontFamilyTokenNames: collectFontFamilyTokenNames,
        colorFromCss: colorFromCss,
        colorFromCssStrict: colorFromCssStrict,
        detectFontEnvironmentFault: detectFontEnvironmentFault,
        formatFontEnvironmentFaultWarning: formatFontEnvironmentFaultWarning,
        getFontFamilyCandidates: getFontFamilyCandidates,
        getFontStyleCandidates: getFontStyleCandidates,
        getLinearGradientTransform: getLinearGradientTransform,
        normalizeVariableValue: normalizeVariableValue,
        parseFontStyleWeight: parseFontStyleWeight,
        parsePayload: parsePayload,
        selectNearestFontStyle: selectNearestFontStyle,
        selectVariantGroup: selectVariantGroup,
        setSvgRootSize: setSvgRootSize,
        shouldClipContent: shouldClipContent,
    };
}
