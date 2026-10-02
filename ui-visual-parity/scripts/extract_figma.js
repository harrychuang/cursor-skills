/**
 * Read a Figma frame into a UI Spec. Read-only: this script only reads properties.
 *
 * Run it through a tool that executes Plugin API scripts — the text below is the body of an
 * async function, so `await` and the final `return` are at the top level. Set the three
 * constants, run it, and save the returned JSON as one page. While `nextOffset` is not
 * null, run it again with OFFSET set to that value. Then merge the pages:
 *
 *   node figma_to_spec.mjs --parts page-0.json page-1.json --out reference.spec.json
 *
 * Each page stays under 18,000 characters, the output limit of script tools. The node
 * format is the one extract_dom.js produces (references/ui-spec.md), so the same diff reads
 * both. Written without optional chaining or nullish operators: older plugin sandboxes
 * reject them.
 */
const NODE_ID = "0:0"; // the frame to read, e.g. "12:345" (a URL's node-id=12-345 with ":" for "-")
const OFFSET = 0; // first node of this page
const LIMIT = 2000; // upper bound on nodes per page; the character budget usually ends the page first

const BUDGET = 18000;
const SIDES = ["Top", "Right", "Bottom", "Left"];
const SHAPES = { VECTOR: 1, BOOLEAN_OPERATION: 1, STAR: 1, POLYGON: 1 };
const PLAIN = { ELLIPSE: 1, RECTANGLE: 1, LINE: 1 };

function r2(value) {
  return Math.round(value * 100) / 100;
}
function hex2(n) {
  const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
  return s.length === 1 ? "0" + s : s;
}
/** Figma colour (0–1 channels) and opacity → #rrggbb, or #rrggbbaa when translucent. */
function hex(color, opacity) {
  const alpha = (opacity === undefined ? 1 : opacity) * (color.a === undefined ? 1 : color.a);
  return "#" + hex2(color.r * 255) + hex2(color.g * 255) + hex2(color.b * 255) + (alpha < 0.999 ? hex2(alpha * 255) : "");
}
function shown(paints) {
  if (!Array.isArray(paints)) return [];
  return paints.filter(function (paint) {
    return paint.visible !== false && (paint.opacity === undefined || paint.opacity > 0);
  });
}
function has(node, key) {
  return key in node && node[key] !== figma.mixed && node[key] !== undefined && node[key] !== null;
}

/**
 * A linear gradient as CSS would write it. Figma stores a transform from the node's unit
 * square to gradient space; inverting it gives the two handle points, from which follow the
 * CSS angle and where each stop falls along the CSS gradient line.
 */
function gradient(paint, width, height) {
  const stops = paint.gradientStops.map(function (stop) {
    return { color: hex(stop.color, paint.opacity), at: stop.position };
  });
  if (paint.type !== "GRADIENT_LINEAR") {
    const kind = paint.type === "GRADIENT_RADIAL" ? "radial" : paint.type === "GRADIENT_ANGULAR" ? "conic" : "radial";
    return kind + "(" + stops.map(function (stop) { return stop.color + " " + r2(stop.at * 100) + "%"; }).join(", ") + ")";
  }
  const t = paint.gradientTransform;
  const det = t[0][0] * t[1][1] - t[0][1] * t[1][0];
  const invert = function (x, y) {
    const px = x - t[0][2];
    const py = y - t[1][2];
    return { x: ((t[1][1] * px - t[0][1] * py) / det) * width, y: ((-t[1][0] * px + t[0][0] * py) / det) * height };
  };
  const start = invert(0, 0.5);
  const end = invert(1, 0.5);
  const angle = (Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI;
  const radians = (angle * Math.PI) / 180;
  const ux = Math.sin(radians);
  const uy = -Math.cos(radians);
  const length = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  const text = stops.map(function (stop) {
    const x = start.x + (end.x - start.x) * stop.at - width / 2;
    const y = start.y + (end.y - start.y) * stop.at - height / 2;
    return stop.color + " " + r2(((x * ux + y * uy) / length + 0.5) * 100) + "%";
  });
  return "linear(" + r2((angle + 360) % 360) + "deg, " + text.join(", ") + ")";
}

function paintsItself(node) {
  return shown(node.fills).length > 0 || (shown(node.strokes).length > 0 && node.strokeWeight !== 0) || shown(node.effects).length > 0;
}

/** A vector, or a small group or instance made only of vector shapes: one primitive, not a subtree. */
function isIcon(node) {
  if (SHAPES[node.type]) return true;
  if (!("children" in node) || node.children.length === 0) return false;
  if (node.type !== "GROUP" && paintsItself(node)) return false;
  if (node.width > 128 || node.height > 128) return false;
  let vectors = 0;
  const onlyShapes = function (child) {
    if (child.visible === false) return true;
    if (SHAPES[child.type]) {
      vectors += 1;
      return true;
    }
    if (PLAIN[child.type]) return true;
    if (child.type === "TEXT" || !("children" in child)) return false;
    return child.children.every(onlyShapes);
  };
  return node.children.every(onlyShapes) && vectors > 0;
}

/** The first vector shape in an icon, depth first: its stroke and fill stand for the icon's. */
function firstShape(node) {
  if (SHAPES[node.type]) return node;
  if (!("children" in node)) return null;
  for (let i = 0; i < node.children.length; i += 1) {
    const found = node.children[i].visible === false ? null : firstShape(node.children[i]);
    if (found) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ walk */

const root = await figma.getNodeByIdAsync(NODE_ID);
if (!root) return { error: "No node with id " + NODE_ID + ". Use the id from the frame's link, with ':' in place of '-'." };
if (!root.absoluteBoundingBox) return { error: "Node " + NODE_ID + " has no box on the canvas (a page or an invisible node). Pick a frame." };
// A frame on a page that is not loaded yet has no children to read. Loading reads; it changes nothing.
let page = root;
while (page && page.type !== "PAGE") page = page.parent;
if (page && typeof page.loadAsync === "function") await page.loadAsync();
const origin = root.absoluteBoundingBox;

const order = [];
const families = {};
const missing = {}; // fonts this file asks for that this machine does not have: their text is drawn in a fallback
(function walk(node, parent, depth, opacityAbove) {
  if (node.visible === false || !node.absoluteBoundingBox) return;
  const effective = opacityAbove * ("opacity" in node ? node.opacity : 1);
  if (effective === 0) return;
  const icon = node.type !== "TEXT" && isIcon(node);
  order.push({ node: node, parent: parent, depth: depth, opacity: effective, icon: icon });
  if (node.type === "TEXT" && has(node, "fontName")) {
    families[node.fontName.family] = true;
    if (node.hasMissingFont === true) missing[node.fontName.family] = true;
  }
  if (icon || !("children" in node)) return;
  for (let i = 0; i < node.children.length; i += 1) walk(node.children[i], node, depth + 1, effective);
})(root, null, 0, 1);

/* ------------------------------------------------------- names behind values */

const nameCache = {};
async function variableName(alias) {
  if (!alias || !alias.id) return null;
  if (nameCache[alias.id] === undefined) {
    const variable = await figma.variables.getVariableByIdAsync(alias.id);
    nameCache[alias.id] = variable ? variable.name : null;
  }
  return nameCache[alias.id];
}
async function styleName(id) {
  if (!id || id === figma.mixed) return null;
  if (nameCache[id] === undefined) {
    const style = await figma.getStyleByIdAsync(id);
    nameCache[id] = style ? style.name : null;
  }
  return nameCache[id];
}

const BOUND = {
  paddingTop: "padding", paddingRight: "padding", paddingBottom: "padding", paddingLeft: "padding", itemSpacing: "gap", counterAxisSpacing: "gap",
  topLeftRadius: "radius", topRightRadius: "radius", bottomLeftRadius: "radius", bottomRightRadius: "radius", opacity: "opacity", width: "width", height: "height",
  minWidth: "minWidth", maxWidth: "maxWidth", minHeight: "minHeight", strokeWeight: "border", strokeTopWeight: "border", strokeRightWeight: "border",
  strokeBottomWeight: "border", strokeLeftWeight: "border", fontSize: "type.size", lineHeight: "type.lineHeight", letterSpacing: "type.letterSpacing",
  fontWeight: "type.weight", fontFamily: "type.family",
};

async function tokensOf(node, isText) {
  const out = {};
  const bound = node.boundVariables || {};
  const keys = Object.keys(bound);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const field = key === "fills" ? (isText ? "fill" : "background") : key === "strokes" ? "border" : BOUND[key];
    if (!field) continue;
    const name = await variableName(Array.isArray(bound[key]) ? bound[key][0] : bound[key]);
    if (name) out[field] = name;
  }
  // A colour variable can also be bound on the paint itself.
  const fills = shown(node.fills);
  const top = fills[fills.length - 1];
  if (top && top.boundVariables && top.boundVariables.color) {
    const name = await variableName(top.boundVariables.color);
    if (name) out[isText ? "fill" : "background"] = name;
  }
  if (isText && "textStyleId" in node) {
    const name = await styleName(node.textStyleId);
    if (name) out.type = name;
  }
  if ("effectStyleId" in node) {
    const name = await styleName(node.effectStyleId);
    if (name) out.shadow = name;
  }
  return Object.keys(out).length ? out : null;
}

/* ------------------------------------------------------------- one node */

/** How a child is placed by its parent: in an auto layout flow, or at explicit coordinates. */
function placement(node, parent) {
  if (!parent) return { positioned: null, pinned: null, inset: null };
  const flow = "layoutMode" in parent && parent.layoutMode !== "NONE" && node.layoutPositioning !== "ABSOLUTE";
  if (flow) return { positioned: null, pinned: null, inset: null };
  const pinned = [];
  const c = "constraints" in node ? node.constraints : { horizontal: "MIN", vertical: "MIN" };
  if (c.horizontal === "MIN" || c.horizontal === "STRETCH") pinned.push("left");
  if (c.horizontal === "MAX" || c.horizontal === "STRETCH") pinned.push("right");
  if (c.vertical === "MIN" || c.vertical === "STRETCH") pinned.push("top");
  if (c.vertical === "MAX" || c.vertical === "STRETCH") pinned.push("bottom");
  // The offset from the parent's edge on each pinned side: what the design declares.
  const a = node.absoluteBoundingBox;
  const b = parent.absoluteBoundingBox;
  const all = b ? { left: a.x - b.x, top: a.y - b.y, right: b.x + b.width - (a.x + a.width), bottom: b.y + b.height - (a.y + a.height) } : {};
  const inset = {};
  pinned.forEach(function (side) {
    if (all[side] !== undefined) inset[side] = r2(all[side]);
  });
  return { positioned: "absolute", pinned: pinned, inset: inset };
}

function textValue(node, key, rangeGetter) {
  if (node[key] !== figma.mixed) return node[key];
  // Mixed styling: the first character's value stands for the block.
  return node[rangeGetter](0, 1);
}

async function describe(item) {
  const node = item.node;
  const box = node.absoluteBoundingBox;
  const width = box.width;
  const height = box.height;
  const isText = node.type === "TEXT";
  const fills = shown(node.fills === figma.mixed && isText ? node.getRangeFills(0, 1) : node.fills);
  const top = fills[fills.length - 1];
  const image = fills.filter(function (paint) { return paint.type === "IMAGE"; })[0];
  const strokes = shown(node.strokes);
  const stroke = strokes[strokes.length - 1];
  const kind = isText ? "text" : item.icon ? "icon" : image ? "image" : "box";

  const entry = {
    id: node.id,
    parent: item.parent ? item.parent.id : null,
    depth: item.depth,
    tag: node.type.toLowerCase(),
    name: node.name,
    selector: (item.parent ? item.parent.name + " > " : "") + node.name,
    kind: kind,
    rect: { x: r2(box.x - origin.x), y: r2(box.y - origin.y), width: r2(width), height: r2(height) },
    keys: { nodeId: node.id },
  };

  const place = placement(node, item.parent);
  const auto = "layoutMode" in node && node.layoutMode !== "NONE";
  const grid = auto && node.layoutMode === "GRID";
  entry.layout = {
    mode: grid ? "grid" : auto ? (node.layoutMode === "HORIZONTAL" ? "row" : "column") : "absolute",
    justify: auto ? { MIN: "start", CENTER: "center", MAX: "end", SPACE_BETWEEN: "space-between" }[node.primaryAxisAlignItems] || "start" : null,
    align: auto ? { MIN: "start", CENTER: "center", MAX: "end", BASELINE: "baseline" }[node.counterAxisAlignItems] || "start" : null,
    // As in the web capture: `gap` runs along the main axis (between columns, in a grid) and
    // `crossGap` across it (between rows).
    gap: grid ? (has(node, "gridColumnGap") ? r2(node.gridColumnGap) : 0) : auto ? r2(node.itemSpacing) : 0,
    crossGap: grid ? (has(node, "gridRowGap") ? r2(node.gridRowGap) : 0) : auto && has(node, "counterAxisSpacing") ? r2(node.counterAxisSpacing) : 0,
    wrap: auto && node.layoutWrap === "WRAP",
    positioned: place.positioned,
    inline: false,
  };

  if (place.pinned) {
    entry.layout.pinned = place.pinned;
    entry.layout.inset = place.inset;
  }

  // Stroke weights per side; a single weight applies to all four.
  let weights = [0, 0, 0, 0];
  if (stroke) {
    weights = SIDES.map(function (side) {
      const key = "stroke" + side + "Weight";
      return has(node, key) ? r2(node[key]) : has(node, "strokeWeight") ? r2(node.strokeWeight) : 0;
    });
  }
  const strokeInLayout = stroke && node.strokesIncludedInLayout === true && node.strokeAlign === "INSIDE";
  entry.box = {
    padding: auto ? [r2(node.paddingTop), r2(node.paddingRight), r2(node.paddingBottom), r2(node.paddingLeft)] : [0, 0, 0, 0],
    margin: [0, 0, 0, 0],
    borderWidth: strokeInLayout ? weights : [0, 0, 0, 0],
  };
  // In a flow, "fixed" is the sizing mode; at explicit coordinates every size is explicit.
  const fixed = {
    width: has(node, "layoutSizingHorizontal") ? node.layoutSizingHorizontal === "FIXED" : place.positioned !== null,
    height: has(node, "layoutSizingVertical") ? node.layoutSizingVertical === "FIXED" : place.positioned !== null,
  };
  if (fixed.width || fixed.height) entry.box.fixed = fixed;

  let paints = false;
  // A line has no height of its own: its stroke is the whole picture. Record it as the thin
  // filled box it draws, so a divider is something the diff can place and compare.
  const hairline = !isText && stroke && stroke.type === "SOLID" && (width === 0 || height === 0);
  if (hairline) {
    const thickness = Math.max.apply(null, weights);
    if (height === 0) {
      entry.rect.y = r2(entry.rect.y - thickness / 2);
      entry.rect.height = thickness;
    } else {
      entry.rect.x = r2(entry.rect.x - thickness / 2);
      entry.rect.width = thickness;
    }
    entry.background = hex(stroke.color, stroke.opacity);
    paints = true;
  }
  if (!isText && !hairline) {
    if (top && top.type === "SOLID") {
      entry.background = hex(top.color, top.opacity);
      paints = true;
    } else if (top && top.type.indexOf("GRADIENT") === 0) {
      entry.gradient = gradient(top, width, height);
      paints = true;
    }
    if (fills.length > 1) entry.fillLayers = fills.length;
    if (stroke && stroke.type === "SOLID" && weights.some(Boolean)) {
      const color = hex(stroke.color, stroke.opacity);
      const style = node.dashPattern && node.dashPattern.length ? "dashed" : "solid";
      // An inside or centred stroke is drawn where a border is; an outside stroke is a ring
      // around the box and never changes its size.
      if (node.strokeAlign === "OUTSIDE") entry.outline = { width: Math.max.apply(null, weights), color: color, style: style, offset: 0 };
      else {
        entry.border = {
          width: weights,
          color: weights.map(function (w) { return w ? color : null; }),
          style: weights.map(function (w) { return w ? style : null; }),
        };
      }
      entry.strokeAlign = node.strokeAlign.toLowerCase();
      paints = true;
    }
    const limit = Math.min(width, height) / 2;
    let radius = null;
    if (node.type === "ELLIPSE") radius = [limit, limit, limit, limit];
    else if (has(node, "cornerRadius")) radius = [node.cornerRadius, node.cornerRadius, node.cornerRadius, node.cornerRadius];
    else if ("topLeftRadius" in node) radius = [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius];
    if (radius && radius.some(Boolean)) entry.radius = radius.map(function (value) { return r2(Math.min(value, limit)); });
    if (has(node, "cornerSmoothing") && node.cornerSmoothing > 0) entry.cornerSmoothing = r2(node.cornerSmoothing);
  }

  const effects = shown(node.effects);
  const shadows = effects
    .filter(function (effect) { return effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"; })
    .map(function (effect) {
      return { inset: effect.type === "INNER_SHADOW", x: r2(effect.offset.x), y: r2(effect.offset.y), blur: r2(effect.radius), spread: r2(effect.spread || 0), color: hex(effect.color) };
    });
  if (shadows.length) {
    entry[isText ? "textShadow" : "shadow"] = shadows;
    paints = true;
  }
  for (let i = 0; i < effects.length; i += 1) {
    // CSS blur() takes the standard deviation; Figma's radius is twice that.
    if (effects[i].type === "LAYER_BLUR") entry.filter = "blur(" + r2(effects[i].radius / 2) + "px)";
    if (effects[i].type === "BACKGROUND_BLUR") entry.backdropFilter = "blur(" + r2(effects[i].radius / 2) + "px)";
  }

  if ("opacity" in node && node.opacity !== 1) entry.opacity = r2(node.opacity);
  if (item.opacity !== 1) entry.opacityEffective = r2(item.opacity);
  if (has(node, "blendMode") && node.blendMode !== "PASS_THROUGH" && node.blendMode !== "NORMAL") entry.blend = node.blendMode.toLowerCase().replace(/_/g, "-");
  if ("rotation" in node && Math.abs(node.rotation) > 0.01) entry.rotation = r2(node.rotation);
  if (node.clipsContent === true) entry.clips = true;

  if (kind === "icon") {
    const source = firstShape(node) || node;
    const iconFill = shown(source.fills)[0];
    const iconStroke = shown(source.strokes)[0];
    entry.icon = {
      // Design and code describe artwork differently; the name is all that can be compared.
      name: node.name,
      strokeWidth: iconStroke && has(source, "strokeWeight") ? r2(source.strokeWeight) : 0,
      stroke: iconStroke && iconStroke.type === "SOLID" ? hex(iconStroke.color, iconStroke.opacity) : null,
      fill: iconFill && iconFill.type === "SOLID" ? hex(iconFill.color, iconFill.opacity) : null,
    };
    paints = true;
  }

  if (kind === "image") {
    entry.asset = "figma:" + image.imageHash;
    entry.image = { fit: { FILL: "cover", FIT: "contain", CROP: "cover", TILE: "repeat" }[image.scaleMode] || "cover" };
    paints = true;
  }

  if (isText) {
    const font = textValue(node, "fontName", "getRangeFontName");
    const size = textValue(node, "fontSize", "getRangeFontSize");
    const lh = textValue(node, "lineHeight", "getRangeLineHeight");
    const ls = textValue(node, "letterSpacing", "getRangeLetterSpacing");
    const textCase = textValue(node, "textCase", "getRangeTextCase");
    const decoration = textValue(node, "textDecoration", "getRangeTextDecoration");
    const lineHeightSet = lh.unit !== "AUTO";
    // Auto line height has no number; the box height over the rounded line count stands in for it.
    const guess = Math.max(1, Math.round(height / (size * 1.2)));
    const lineHeight = lh.unit === "PIXELS" ? lh.value : lh.unit === "PERCENT" ? (size * lh.value) / 100 : height / guess;
    const characters = node.characters.length > 2000 ? node.characters.slice(0, 2000) : node.characters;
    entry.text = characters;
    if (characters.length !== node.characters.length) entry.textClipped = true;
    entry.name = characters.length > 40 ? characters.slice(0, 37) + "…" : characters;
    entry.type = {
      family: font.family,
      size: r2(size),
      weight: textValue(node, "fontWeight", "getRangeFontWeight"),
      lineHeight: r2(lineHeight),
      lineHeightSet: lineHeightSet,
      letterSpacing: r2(ls.unit === "PERCENT" ? (size * ls.value) / 100 : ls.value),
      align: { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" }[node.textAlignHorizontal] || "left",
      transform: { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" }[textCase] || "none",
      decoration: { UNDERLINE: "underline", STRIKETHROUGH: "line-through" }[decoration] || "none",
      style: /italic/i.test(font.style) ? "italic" : "normal",
      lines: Math.max(1, Math.round(height / lineHeight)),
    };
    if (node.textTruncation === "ENDING") entry.type.truncated = true;
    // A text box can be wider or taller than its words. The anchor says where the words sit.
    entry.textBox = {
      fixedWidth: node.textAutoResize !== "WIDTH_AND_HEIGHT",
      fixedHeight: node.textAutoResize === "NONE" || node.textAutoResize === "TRUNCATE",
      alignVertical: { TOP: "top", CENTER: "center", BOTTOM: "bottom" }[node.textAlignVertical] || "top",
    };
    if (top && top.type === "SOLID") entry.fill = hex(top.color, top.opacity);
    paints = true;
  }

  entry.paints = paints;
  if (node.type === "INSTANCE") {
    const main = await node.getMainComponentAsync();
    if (main) entry.component = main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name + " / " + main.name : main.name;
  }
  const tokens = await tokensOf(node, isText);
  if (tokens) entry.tokenRefs = tokens;
  return entry;
}

/* ------------------------------------------------------------------ page */

const nodes = [];
let used = 400; // the envelope around the node list
let index = OFFSET;
for (; index < Math.min(order.length, OFFSET + LIMIT); index += 1) {
  const entry = await describe(order[index]);
  const cost = JSON.stringify(entry).length + 1;
  if (nodes.length && used + cost > BUDGET) break;
  nodes.push(entry);
  used += cost;
}

const result = { total: order.length, offset: OFFSET, nextOffset: index < order.length ? index : null, nodes: nodes };
if (OFFSET === 0) {
  result.surface = {
    name: root.name,
    platform: "figma",
    source: (figma.fileKey ? "https://www.figma.com/design/" + figma.fileKey + "?node-id=" : "figma node ") + NODE_ID.replace(":", "-"),
    viewport: { width: r2(origin.width), height: r2(origin.height) },
    density: 1,
    root: { selector: NODE_ID, width: r2(origin.width), height: r2(origin.height), pageX: 0, pageY: 0 },
    fidelity: "measured",
    fonts: {
      requested: Object.keys(families),
      loaded: Object.keys(families).filter(function (family) { return !missing[family]; }),
      aligned: Object.keys(missing).length === 0,
    },
  };
}
return result;
