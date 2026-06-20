import type { FigmaExportPayload } from "./types";

export function createFigmaExportJson(payload: FigmaExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function createFigmaPluginCode(payload: FigmaExportPayload): string {
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
  const PLUGIN_DATA_COMPONENT_KEY =
    payload.componentSystem?.pluginDataKey || "storybookComponentKey";

  const BINDABLE_RADIUS_FIELDS = [
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
  ];

  const layerOrder = { ref: 0, sys: 1, comp: 2 };
  const registry = new Map();
  const componentRegistry = new Map();
  const rawTokenByName = new Map(
    (payload.tokens || []).map((token) => [token.cssName, token]),
  );

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mapTextAlignHorizontal(textAlign) {
    const normalized = String(textAlign || "left").toLowerCase();
    if (normalized === "center") return "CENTER";
    if (normalized === "right" || normalized === "end") return "RIGHT";
    if (normalized === "justify") return "JUSTIFIED";
    return "LEFT";
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

  function getLinearGradientTransform(angle) {
    const normalized = ((Number(angle) % 360) + 360) % 360;
    if (normalized === 270) return [[-1, 0, 1], [0, 1, 0]];
    if (normalized === 180) return [[0, 1, 0], [-1, 0, 1]];
    if (normalized === 0) return [[0, -1, 1], [1, 0, 0]];
    return [[1, 0, 0], [0, 1, 0]];
  }

  function linearGradientPaint(gradient) {
    return {
      type: "GRADIENT_LINEAR",
      gradientTransform: getLinearGradientTransform(gradient?.angle ?? 90),
      gradientStops: (gradient?.stops || []).map((stop, index, stops) => {
        const variable = registry.get(stop.token);
        const colorStop = {
          position:
            typeof stop.position === "number"
              ? clamp(stop.position, 0, 1)
              : stops.length > 1
                ? index / (stops.length - 1)
                : 0,
          color: cloneColor(colorFromCss(stop.color)),
        };
        if (variable?.id) {
          colorStop.boundVariables = {
            color: { type: "VARIABLE_ALIAS", id: variable.id },
          };
        }
        return colorStop;
      }),
    };
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

  function getNodePluginData(node, key) {
    try {
      return typeof node.getPluginData === "function" ? node.getPluginData(key) : "";
    } catch {
      return "";
    }
  }

  function setNodePluginData(node, key, value) {
    try {
      if (typeof node.setPluginData === "function") {
        node.setPluginData(key, value);
      }
    } catch {
      // Plugin data is metadata only; continue if unsupported.
    }
  }

  function getComponentVariantEntries(component) {
    if (!component) return [];
    const properties = component.variantProperties;
    if (properties && typeof properties === "object") {
      return Object.entries(properties)
        .map(([name, value]) => [String(name).trim(), String(value).trim()])
        .filter(([name, value]) => name && value);
    }
    return component.variant ? [["Variant", String(component.variant).trim()]] : [];
  }

  function getComponentVariantName(component) {
    const entries = getComponentVariantEntries(component);
    return entries.map(([name, value]) => name + "=" + value).join(", ");
  }

  function getComponentDisplayName(component) {
    if (!component) return "";
    const variantName = getComponentVariantName(component);
    return variantName ? component.name + ", " + variantName : component.name;
  }

  function componentVariantPropertiesMatch(node, component) {
    const expectedEntries = getComponentVariantEntries(component);
    if (expectedEntries.length === 0) return true;

    try {
      const currentProperties = node.variantProperties;
      if (currentProperties && typeof currentProperties === "object") {
        return expectedEntries.every(
          ([name, value]) => String(currentProperties[name] || "") === value,
        );
      }
    } catch {
      return false;
    }

    const displayName = getComponentDisplayName(component);
    const variantName = getComponentVariantName(component);
    return node.name === displayName || node.name === variantName;
  }

  function findLocalComponent(component) {
    if (!component?.key) return undefined;
    const cached = componentRegistry.get(component.key);
    if (cached) return cached;

    const nodes = figma.root.findAll((node) => node.type === "COMPONENT");
    const displayName = getComponentDisplayName(component);
    const sourceName = component.sourceName || component.key;
    const found = nodes.find((node) => {
      const nodeKey = getNodePluginData(node, PLUGIN_DATA_COMPONENT_KEY);
      if (nodeKey === component.key) {
        return componentVariantPropertiesMatch(node, component);
      }
      if (nodeKey) return false;

      const nodeSource = getNodePluginData(node, "storybookComponentSource");
      const parentSource =
        node.parent?.type === "COMPONENT_SET"
          ? getNodePluginData(node.parent, "storybookComponentSource")
          : "";
      const knownSource = nodeSource || parentSource;
      if (knownSource && knownSource !== sourceName) return false;

      if (component.variant) {
        return (
          componentVariantPropertiesMatch(node, component) &&
          (node.name === displayName || node.name === getComponentVariantName(component))
        );
      }
      return node.name === displayName || node.name === component.name;
    });

    if (found) componentRegistry.set(component.key, found);
    return found;
  }

  function tagComponentNode(node, component) {
    if (!component?.key) return;
    setNodePluginData(node, PLUGIN_DATA_COMPONENT_KEY, component.key);
    setNodePluginData(node, "storybookComponentName", component.name);
    setNodePluginData(node, "storybookComponentSource", component.sourceName || component.key);
  }

  async function findExistingVariable(collection, spec) {
    const variables = await figma.variables.getLocalVariablesAsync();
    return variables.find((variable) => {
      if (variable.variableCollectionId !== collection.id) return false;
      if (getVariablePluginData(variable, PLUGIN_DATA_TOKEN_KEY) === spec.cssName) return true;
      return variable.name === spec.figmaName;
    });
  }

  function isOpacityVariableSpec(spec) {
    return spec.type === "FLOAT" && (
      (Array.isArray(spec.scopes) && spec.scopes.includes("OPACITY")) ||
      String(spec.cssName || "").includes("-opacity-") ||
      String(spec.figmaName || "").includes("/opacity/")
    );
  }

  function getVariableValueForMode(spec) {
    if (!isOpacityVariableSpec(spec)) return spec.value;

    const value = Number(spec.value);
    if (!Number.isFinite(value)) return spec.value;
    return value >= 0 && value <= 1 ? value * 100 : value;
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
      variable.setValueForMode(modeId, getVariableValueForMode(spec));
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
    if (styles.backgroundLinearGradient) {
      node.fills = [linearGradientPaint(styles.backgroundLinearGradient)];
    } else if (styles.backgroundColor || variable) {
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
    } else {
      const cornerRadiusEntries = [
        ["topLeftRadius", styles.topLeftRadius],
        ["topRightRadius", styles.topRightRadius],
        ["bottomRightRadius", styles.bottomRightRadius],
        ["bottomLeftRadius", styles.bottomLeftRadius],
      ];

      for (const [field, value] of cornerRadiusEntries) {
        if (value === undefined || !(field in node)) continue;
        try {
          node[field] = value;
        } catch {
          // Some imported nodes may not support per-corner radius.
        }
      }
    }

    if (bindings.cornerRadius) {
      for (const field of BINDABLE_RADIUS_FIELDS) {
        safeBind(node, field, bindings.cornerRadius);
      }
    }
  }

  function canCreateComponentDefinition(spec) {
    return spec.kind === "frame" || ((spec.kind === "image" || spec.kind === "svg") && Boolean(spec.svgText));
  }

  function collectComponentDefinitionSpecs(spec, componentTitle, output, seen) {
    const specs = output || [];
    const seenKeys = seen || new Set();
    if (!spec) return specs;

    const component = spec.component;
    if (
      component?.key &&
      component.name === componentTitle &&
      canCreateComponentDefinition(spec) &&
      !seenKeys.has(component.key)
    ) {
      seenKeys.add(component.key);
      specs.push(spec);
      return specs;
    }

    for (const childSpec of spec.children || []) {
      collectComponentDefinitionSpecs(childSpec, componentTitle, specs, seenKeys);
    }
    return specs;
  }

  function getComponentSetParent(node) {
    return node?.parent?.type === "COMPONENT_SET" ? node.parent : undefined;
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

  function mapLayoutAlign(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "stretch") return "STRETCH";
    if (normalized === "center") return "CENTER";
    if (normalized === "flex-end" || normalized === "end" || normalized === "right") {
      return "MAX";
    }
    return "MIN";
  }

  function applyChildLayoutHints(node, styles) {
    if (!node || !styles) return;

    if (styles.layoutGrow !== undefined && "layoutGrow" in node) {
      try {
        node.layoutGrow = styles.layoutGrow;
      } catch {
        // Some nodes only accept layout grow after being appended to auto layout.
      }
    }

    if (styles.layoutAlign && "layoutAlign" in node) {
      try {
        node.layoutAlign = mapLayoutAlign(styles.layoutAlign);
      } catch {
        // Some nodes do not expose auto-layout child alignment.
      }
    }
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
    if (styles.textAlign && "textAlignHorizontal" in node) {
      try {
        node.textAlignHorizontal = mapTextAlignHorizontal(styles.textAlign);
      } catch {
        // Some imported text nodes may not allow text alignment changes.
      }
    }
    if (styles.textAutoResize && "textAutoResize" in node) {
      try {
        node.textAutoResize = styles.textAutoResize;
      } catch {
        // Some Figma runtimes may not allow text auto-resize changes.
      }
    }
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

  async function updateExistingComponentDefinition(node, spec) {
    if (!node || !spec) return;

    if (spec.kind === "text" && node.type === "TEXT") {
      const styles = spec.styles || {};
      const bindings = spec.bindings || {};
      await loadTextNodeFonts(node);
      const nextText = spec.text || "";
      if (node.characters !== nextText) {
        node.characters = nextText;
      }
      node.fontSize = styles.fontSize || 14;
      if (styles.lineHeight && styles.lineHeight !== "normal") {
        node.lineHeight = { unit: "PIXELS", value: styles.lineHeight };
      }
      if (styles.color) {
        node.fills = [solidPaint(styles.color, registry.get(bindings.textColor))];
      }
      safeResize(node, styles.width, styles.height);
      if (styles.textAlign && "textAlignHorizontal" in node) {
        try {
          node.textAlignHorizontal = mapTextAlignHorizontal(styles.textAlign);
        } catch {
          // Some imported text nodes may not allow text alignment changes.
        }
      }
      if (styles.textAutoResize && "textAutoResize" in node) {
        try {
          node.textAutoResize = styles.textAutoResize;
        } catch {
          // Some imported text nodes may not allow text auto-resize changes.
        }
      }
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
      return;
    }

    if ("fills" in node && spec.kind !== "text") {
      const styles = spec.styles || {};
      const bindings = spec.bindings || {};
      safeResize(node, styles.width, styles.height);
      if ("clipsContent" in node) node.clipsContent = styles.overflow === "hidden";
      if ("opacity" in node) node.opacity = styles.opacity ?? 1;
      setFrameFills(node, styles, bindings);
      setStrokes(node, styles, bindings);
      applyRadius(node, styles, bindings);
      applyAutoLayout(node, spec, styles, bindings);
      safeBind(node, "width", bindings.width);
      safeBind(node, "height", bindings.height);
      safeBind(node, "opacity", bindings.opacity);
      safeBind(node, "strokeWeight", bindings.borderWidth);
    }

    if (!("children" in node)) return;

    const nodeChildren = Array.from(node.children || []);
    const specChildren = spec.children || [];
    for (let index = 0; index < specChildren.length; index += 1) {
      const childSpec = specChildren[index];
      const childNode = nodeChildren[index];
      await updateExistingComponentDefinition(childNode, childSpec);
      if (childNode) {
        applyChildLayoutHints(childNode, childSpec.styles || {});
        positionChildNode(node, childNode, childSpec);
      }
    }
  }

  async function createFrameLikeNode(spec, createContainer) {
    const node = createContainer();
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
      applyChildLayoutHints(child, childSpec.styles || {});
      positionChildNode(node, child, childSpec);
    }

    if (spec.layoutStrategy === "absolute") {
      setFrameLayoutMode(node, "NONE");
    }

    return node;
  }

  async function createFrameNode(spec) {
    return createFrameLikeNode(spec, () => figma.createFrame());
  }

  async function createComponentNode(spec) {
    return createFrameLikeNode(spec, () => figma.createComponent());
  }

  async function ensureComponentDefinition(spec, component) {
    const existing = findLocalComponent(component);
    if (existing) {
      await updateExistingComponentDefinition(existing, spec);
      tagComponentNode(existing, component);
      return existing;
    }

    const componentNode =
      (spec.kind === "image" || spec.kind === "svg") && spec.svgText
        ? figma.createComponentFromNode(figma.createNodeFromSvg(spec.svgText || ""))
        : await createComponentNode(spec);
    componentNode.name = getComponentDisplayName(component);
    tagComponentNode(componentNode, component);
    componentRegistry.set(component.key, componentNode);
    return componentNode;
  }

  async function importComponentVariantSet(specs) {
    const existingComponents = specs
      .map((spec) => ({ spec, component: findLocalComponent(spec.component) }))
      .filter((entry) => Boolean(entry.component));
    const existingSet = existingComponents
      .map((entry) => getComponentSetParent(entry.component))
      .find(Boolean);
    if (existingSet) {
      for (const spec of specs) {
        const existingComponent = findLocalComponent(spec.component);
        if (existingComponent) {
          await updateExistingComponentDefinition(existingComponent, spec);
          tagComponentNode(existingComponent, spec.component);
          continue;
        }

        const createdComponent = await ensureComponentDefinition(spec, spec.component);
        if (createdComponent?.parent !== existingSet) {
          try {
            existingSet.appendChild(createdComponent);
          } catch {
            // Keep the created component on the page if this Figma runtime cannot append variants.
          }
        }
      }
      setNodePluginData(existingSet, "storybookComponentName", payload.componentTitle);
      setNodePluginData(
        existingSet,
        "storybookComponentSource",
        specs[0]?.component?.sourceName || payload.componentTitle,
      );
      return existingSet;
    }

    const componentNodes = [];
    for (const spec of specs) {
      componentNodes.push(await ensureComponentDefinition(spec, spec.component));
    }

    if (componentNodes.length > 1 && typeof figma.combineAsVariants === "function") {
      const componentSet = figma.combineAsVariants(componentNodes, figma.currentPage);
      componentSet.name = payload.componentTitle;
      componentSet.x = 0;
      componentSet.y = 0;
      setNodePluginData(componentSet, "storybookComponentName", payload.componentTitle);
      setNodePluginData(
        componentSet,
        "storybookComponentSource",
        specs[0]?.component?.sourceName || payload.componentTitle,
      );
      return componentSet;
    }

    return componentNodes[0];
  }

  async function createComponentInstanceNode(spec) {
    const component = spec.component;
    if (!component?.key || !canCreateComponentDefinition(spec)) return undefined;

    const existing = findLocalComponent(component);
    const componentNode = existing || (await ensureComponentDefinition(spec, component));
    if (!componentNode || typeof componentNode.createInstance !== "function") {
      return undefined;
    }

    const instance = componentNode.createInstance();
    tagComponentNode(instance, component);
    await updateExistingComponentDefinition(instance, spec);
    return instance;
  }

  async function createNode(spec) {
    const componentInstance =
      spec.component && spec.component.name !== payload.componentTitle
        ? await createComponentInstanceNode(spec)
        : undefined;
    const node =
      componentInstance ??
      (spec.kind === "text"
        ? await createTextNode(spec)
        : spec.kind === "image" || spec.kind === "svg"
          ? await createImageNode(spec)
          : await createFrameNode(spec));

    node.x = spec.styles.x || 0;
    node.y = spec.styles.y || 0;
    applyChildLayoutHints(node, spec.styles || {});
    return node;
  }

  await upsertVariables(payload.tokens || []);
  const shouldImportAsComponent = payload.artifactKind === "component";
  const rootComponent = payload.component || payload.root?.component;
  const componentVariantSpecs =
    shouldImportAsComponent && !rootComponent
      ? collectComponentDefinitionSpecs(payload.root, payload.componentTitle)
      : [];
  const rootNode =
    shouldImportAsComponent && rootComponent && canCreateComponentDefinition(payload.root)
      ? await ensureComponentDefinition(payload.root, rootComponent)
      : componentVariantSpecs.length > 1
        ? await importComponentVariantSet(componentVariantSpecs)
        : await createNode(payload.root);
  rootNode.name = shouldImportAsComponent && rootComponent
    ? getComponentDisplayName(rootComponent)
    : componentVariantSpecs.length > 1
      ? payload.componentTitle
      : payload.componentTitle + " / " + payload.storyName;
  rootNode.x = 0;
  rootNode.y = 0;
  await loadNodeFonts(rootNode);
  if (!rootNode.parent) figma.currentPage.appendChild(rootNode);
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
