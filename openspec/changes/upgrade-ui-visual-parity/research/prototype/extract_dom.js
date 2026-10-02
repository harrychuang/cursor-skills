/**
 * extractUISpec — measure a rendered web surface into a UI Spec, exhaustively.
 *
 * Evaluate this file in the page (any browser tool that can run JavaScript works) and call
 * the function it evaluates to:
 *
 *   (<this file>)({ root: ".screen" })
 *
 * It returns every rendered element under the root with its measured box, plus one
 * "primitive" per thing that actually puts pixels on screen: painted boxes, text blocks,
 * icons, images, inputs. Nothing is sampled and nothing is typed by hand, so a detail can
 * only go unmeasured if the page does not render it.
 *
 * All numbers are CSS px relative to the root's top-left corner.
 */
(function extractUISpec(options) {
  "use strict";

  var opts = options || {};
  var root = opts.root ? document.querySelector(opts.root) : document.body;
  if (!root) throw new Error("extractUISpec: no element matches root " + opts.root);

  var rootRect = root.getBoundingClientRect();
  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, HEAD: 1, TITLE: 1, NOSCRIPT: 1, TEMPLATE: 1, BR: 1, WBR: 1, SOURCE: 1, TRACK: 1, OPTION: 1, OPTGROUP: 1 };
  var FORM = { INPUT: 1, TEXTAREA: 1, SELECT: 1 };
  var MEDIA = { IMG: 1, VIDEO: 1, CANVAS: 1, PICTURE: 1, IFRAME: 1 };

  function r2(value) {
    return Math.round(value * 100) / 100;
  }
  function px(value) {
    var n = parseFloat(value);
    return isFinite(n) ? r2(n) : 0;
  }
  function rel(rect) {
    return { x: r2(rect.left - rootRect.left), y: r2(rect.top - rootRect.top), width: r2(rect.width), height: r2(rect.height) };
  }

  /* ---------------------------------------------------------------- colour */

  var canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });
  var colorCache = {};

  function hex2(n) {
    var s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return s.length === 1 ? "0" + s : s;
  }

  /** Any CSS colour → #rrggbb, or #rrggbbaa when translucent. */
  function color(value) {
    if (!value) return null;
    if (colorCache[value] !== undefined) return colorCache[value];
    var r, g, b, a;
    var m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(value);
    if (m) {
      r = +m[1];
      g = +m[2];
      b = +m[3];
      a = m[4] === undefined ? 1 : m[4].slice(-1) === "%" ? parseFloat(m[4]) / 100 : +m[4];
    } else {
      // Every other notation (hsl, oklch, color(), color-mix, named) goes through the
      // canvas, which resolves it to sRGB bytes.
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      r = d[0];
      g = d[1];
      b = d[2];
      a = d[3] / 255;
    }
    var out = "#" + hex2(r) + hex2(g) + hex2(b) + (a < 0.999 ? hex2(a * 255) : "");
    colorCache[value] = out;
    return out;
  }
  function alphaOf(hex) {
    return hex && hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : hex ? 1 : 0;
  }

  /* --------------------------------------------- gradients and shadows */

  function splitTop(text, separator) {
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === separator && depth === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(text.slice(start).trim());
    return parts.filter(Boolean);
  }

  /** "rgb(1, 2, 3) 40%" → ["rgb(1, 2, 3)", "40%"]. */
  function leadingColor(token) {
    var fn = /^[a-z-]+\(/i.exec(token);
    if (fn) {
      var depth = 0;
      for (var i = 0; i < token.length; i += 1) {
        if (token[i] === "(") depth += 1;
        if (token[i] === ")") {
          depth -= 1;
          if (depth === 0) return [token.slice(0, i + 1), token.slice(i + 1).trim()];
        }
      }
    }
    var space = token.indexOf(" ");
    return space < 0 ? [token, ""] : [token.slice(0, space), token.slice(space + 1).trim()];
  }

  var SIDE_ANGLE = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270 };

  /** One background layer → a canonical string that reads the same however the CSS spelled it. */
  function paintLayer(layer) {
    var m = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/i.exec(layer);
    if (m) {
      var args = splitTop(m[3], ",");
      var head = "";
      var first = args[0] || "";
      var isStop = /^(#|rgb|hsl|color|ok|lab|lch|[a-z]+$)/i.test(first) && !/^(to |from |at |circle|ellipse|closest|farthest)/i.test(first) && !/(deg|rad|turn|grad)$/.test(first.split(" ")[0]);
      if (!isStop) {
        head = first;
        args = args.slice(1);
      }
      if (m[2].toLowerCase() === "linear") {
        if (!head) head = "180deg";
        else if (SIDE_ANGLE[head] !== undefined) head = SIDE_ANGLE[head] + "deg";
        else if (/turn$/.test(head)) head = r2(parseFloat(head) * 360) + "deg";
        else if (/rad$/.test(head)) head = r2((parseFloat(head) * 180) / Math.PI) + "deg";
        else if (/deg$/.test(head)) head = r2(parseFloat(head)) + "deg";
      }
      var stops = args.map(function (arg) {
        var pair = leadingColor(arg);
        return (color(pair[0]) || pair[0]) + (pair[1] ? " " + pair[1] : "");
      });
      return (m[1] ? "repeating-" : "") + m[2].toLowerCase() + "(" + (head ? head + ", " : "") + stops.join(", ") + ")";
    }
    var url = /^url\((["']?)(.*)\1\)$/.exec(layer);
    if (url) return "image(" + assetName(url[2]) + ")";
    return layer;
  }

  function parseShadows(value) {
    if (!value || value === "none") return null;
    return splitTop(value, ",").map(function (item) {
      var inset = /\binset\b/.test(item);
      var rest = item.replace(/\binset\b/, "").trim();
      var colorToken = "";
      var fn = /[a-z-]+\([^()]*(?:\([^()]*\)[^()]*)*\)/i.exec(rest);
      if (fn) {
        colorToken = fn[0];
        rest = rest.replace(fn[0], "").trim();
      } else {
        var words = rest.split(/\s+/);
        var nonLength = words.filter(function (word) {
          return !/^-?[\d.]+(px|em|rem)?$/.test(word);
        });
        colorToken = nonLength[0] || "";
        rest = words
          .filter(function (word) {
            return word !== colorToken;
          })
          .join(" ");
      }
      var n = rest.split(/\s+/).map(px);
      return { inset: inset, x: n[0] || 0, y: n[1] || 0, blur: n[2] || 0, spread: n[3] || 0, color: color(colorToken) || colorToken };
    });
  }

  function fnv(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  function assetName(src) {
    if (!src) return "";
    if (/^data:/.test(src)) return "data:" + fnv(src);
    return src.split(/[?#]/)[0].split("/").pop();
  }

  /* ---------------------------------------- what the stylesheets declare */

  // Computed styles answer "what is it" but not "why": var() is substituted before they are
  // read, and a width of 240px looks the same whether it was written as 240px or came out
  // of a flex layout. The page's own stylesheets still say which token a property was
  // written with and which sizes were set explicitly, so read both from there. Later rules
  // win, which is right far more often than not, and the result is only used to explain a
  // difference and to point at where to fix it.
  var tokenValues = {};
  var styleRules = [];
  var FIELD_OF = {
    padding: "padding", "padding-top": "padding", "padding-right": "padding", "padding-bottom": "padding", "padding-left": "padding",
    margin: "margin", "margin-top": "margin", "margin-right": "margin", "margin-bottom": "margin", "margin-left": "margin",
    gap: "gap", "row-gap": "gap", "column-gap": "gap", "border-radius": "radius", background: "background", "background-color": "background",
    color: "fill", "font-size": "type.size", "line-height": "type.lineHeight", "font-weight": "type.weight", "font-family": "type.family",
    "letter-spacing": "type.letterSpacing", "box-shadow": "shadow", border: "border", "border-color": "border", "border-top": "border",
    "border-bottom": "border", "border-left": "border", "border-right": "border", width: "width", height: "height", "min-height": "minHeight",
    "min-width": "minWidth", "max-width": "maxWidth", opacity: "opacity",
  };
  var SIZE_PROPS = { width: "width", height: "height", "inline-size": "width", "block-size": "height" };

  function collectRules(list) {
    for (var i = 0; i < list.length; i += 1) {
      var rule = list[i];
      if (rule.cssRules && rule.type !== 1) {
        if (rule.media && !window.matchMedia(rule.media.mediaText).matches) continue;
        collectRules(rule.cssRules);
        continue;
      }
      if (rule.type !== 1 || !rule.style) continue;
      var uses = [];
      var sizes = [];
      rule.style.cssText.split(";").forEach(function (declaration) {
        var at = declaration.indexOf(":");
        if (at < 0) return;
        var prop = declaration.slice(0, at).trim();
        var value = declaration.slice(at + 1).replace(/!important/, "").trim();
        if (prop.indexOf("--") === 0) tokenValues[prop] = value;
        if (SIZE_PROPS[prop]) sizes.push({ axis: SIZE_PROPS[prop], value: value });
        var refs = value.match(/var\(\s*(--[\w-]+)/g);
        if (refs && FIELD_OF[prop]) {
          uses.push({
            field: FIELD_OF[prop],
            tokens: refs.map(function (ref) {
              return ref.replace(/var\(\s*/, "");
            }),
          });
        }
      });
      if (uses.length || sizes.length) styleRules.push({ selector: rule.selectorText, uses: uses, sizes: sizes });
    }
  }
  for (var s = 0; s < document.styleSheets.length; s += 1) {
    try {
      collectRules(document.styleSheets[s].cssRules);
    } catch (error) {
      /* cross-origin sheet: unreadable, skip */
    }
  }
  var rootStyle = getComputedStyle(document.documentElement);
  Object.keys(tokenValues).forEach(function (name) {
    var resolved = rootStyle.getPropertyValue(name).trim();
    if (resolved) tokenValues[name] = resolved;
  });

  /** A size counts as set explicitly when it was written as a plain length, not as a share of something. */
  function isExplicitLength(value, style) {
    var v = value;
    for (var hop = 0; hop < 4 && /var\(/.test(v); hop += 1) {
      v = v.replace(/var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g, function (m, name) {
        return style.getPropertyValue(name).trim() || "auto";
      });
    }
    if (/%|\bv[wh]\b|\bfr\b|auto|content|stretch|inherit|initial|unset/.test(v)) return false;
    return /[\d.]+(px|rem|em|ch|ex|pt)\b/.test(v);
  }

  /** Tokens the element's properties were written with, and which of its sizes were set explicitly. */
  function declaredFor(el, style) {
    var out = { tokens: null, fixed: { width: false, height: false } };
    for (var i = 0; i < styleRules.length; i += 1) {
      var rule = styleRules[i];
      var hit = false;
      try {
        hit = el.matches(rule.selector);
      } catch (error) {
        hit = false;
      }
      if (!hit) continue;
      for (var j = 0; j < rule.uses.length; j += 1) {
        out.tokens = out.tokens || {};
        out.tokens[rule.uses[j].field] = rule.uses[j].tokens.join(" ");
      }
      for (var k = 0; k < rule.sizes.length; k += 1) out.fixed[rule.sizes[k].axis] = isExplicitLength(rule.sizes[k].value, style);
    }
    ["width", "height"].forEach(function (axis) {
      var inline = el.style && el.style.getPropertyValue(axis);
      if (inline) out.fixed[axis] = isExplicitLength(inline, style);
      if (el.hasAttribute && el.hasAttribute(axis) && /^\d/.test(el.getAttribute(axis))) out.fixed[axis] = true;
    });
    return out;
  }

  /* ------------------------------------------------------------ naming */

  function selectorOf(el) {
    var parts = [];
    var node = el;
    while (node && node !== root.parentElement && parts.length < 3) {
      var part = node.tagName.toLowerCase();
      if (node.id) part += "#" + node.id;
      else if (node.classList && node.classList.length) part += "." + Array.prototype.slice.call(node.classList, 0, 2).join(".");
      parts.unshift(part);
      if (node === root) break;
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  var ALIGN = { normal: null, "flex-start": "start", start: "start", left: "start", "flex-end": "end", end: "end", right: "end", center: "center", stretch: "stretch", baseline: "baseline", "first baseline": "baseline", "last baseline": "baseline", "space-between": "space-between", "space-around": "space-around", "space-evenly": "space-evenly" };

  /* ------------------------------------------------------- measurement */

  function normalLineHeight(el) {
    var probe = document.createElement("span");
    probe.textContent = "Xg";
    probe.style.cssText = "display:inline-block;position:absolute;visibility:hidden;line-height:normal;white-space:nowrap;padding:0;border:0;margin:0";
    el.appendChild(probe);
    var height = probe.getBoundingClientRect().height;
    el.removeChild(probe);
    return r2(height);
  }

  function intersect(a, b) {
    if (!a) return b;
    if (!b) return a;
    var left = Math.max(a.left, b.left);
    var top = Math.max(a.top, b.top);
    var right = Math.min(a.right, b.right);
    var bottom = Math.min(a.bottom, b.bottom);
    return { left: left, top: top, right: right, bottom: bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  var nodes = [];
  var fontsRequested = {};
  var counter = 0;

  function isInline(style) {
    return style.display === "inline";
  }

  /** Text nodes and inline children that belong to `el`'s own lines. */
  function inlineContent(el) {
    var ranges = [];
    var text = "";
    var segments = [];
    var baseStyle = getComputedStyle(el);
    (function walk(parent, inherited) {
      for (var i = 0; i < parent.childNodes.length; i += 1) {
        var child = parent.childNodes[i];
        if (child.nodeType === 3) {
          if (/\S/.test(child.nodeValue)) {
            var range = document.createRange();
            range.selectNodeContents(child);
            ranges.push(range);
            if (inherited) segments.push({ text: child.nodeValue.replace(/\s+/g, " ").trim(), style: inherited });
          }
          text += child.nodeValue;
        } else if (child.nodeType === 1 && !SKIP[child.tagName] && child.tagName !== "svg" && !MEDIA[child.tagName] && !FORM[child.tagName]) {
          var cs = getComputedStyle(child);
          if (!isInline(cs)) continue;
          var diff = {};
          if (cs.color !== baseStyle.color) diff.fill = color(cs.color);
          if (cs.fontWeight !== baseStyle.fontWeight) diff.weight = Number(cs.fontWeight);
          if (cs.fontSize !== baseStyle.fontSize) diff.size = px(cs.fontSize);
          if (cs.fontStyle !== baseStyle.fontStyle) diff.style = cs.fontStyle;
          if (cs.textDecorationLine !== baseStyle.textDecorationLine) diff.decoration = cs.textDecorationLine;
          walk(child, Object.keys(diff).length ? diff : inherited);
        }
      }
    })(el, null);
    return { ranges: ranges, text: text.replace(/\s+/g, " ").trim(), segments: segments };
  }

  function typeOf(style, el) {
    var family = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    fontsRequested[family] = true;
    var declared = parseFloat(style.lineHeight);
    var lineHeightSet = isFinite(declared);
    return {
      family: family,
      size: px(style.fontSize),
      weight: Number(style.fontWeight),
      lineHeight: lineHeightSet ? r2(declared) : normalLineHeight(el),
      lineHeightSet: lineHeightSet,
      letterSpacing: style.letterSpacing === "normal" ? 0 : px(style.letterSpacing),
      align: { start: "left", end: "right", "-webkit-auto": "left", justify: "justify" }[style.textAlign] || style.textAlign,
      transform: style.textTransform,
      decoration: style.textDecorationLine === "none" ? "none" : style.textDecorationLine,
      style: style.fontStyle,
      numeric: style.fontVariantNumeric,
    };
  }

  function visit(el, parentId, depth, clip, opacityAbove) {
    if (SKIP[el.tagName]) return;
    var style = getComputedStyle(el);
    if (style.display === "none") return;

    var opacity = Number(style.opacity);
    var opacityEffective = r2(opacityAbove * opacity);
    if (opacityEffective === 0) return;

    var box = el.getBoundingClientRect();
    var hidden = style.visibility !== "visible";
    var id = "n" + (counter += 1);
    var tag = el.tagName.toLowerCase();
    var isSvg = tag === "svg";
    var kind = isSvg ? "icon" : MEDIA[el.tagName] ? "image" : FORM[el.tagName] ? "input" : "box";

    var visible = intersect(box, clip);
    var onScreen = !hidden && box.width > 0 && box.height > 0 && (!clip || (visible.width > 0 && visible.height > 0));

    var bg = color(style.backgroundColor);
    var layers = style.backgroundImage && style.backgroundImage !== "none" ? splitTop(style.backgroundImage, ",").map(paintLayer) : null;
    var sides = ["Top", "Right", "Bottom", "Left"];
    var bw = sides.map(function (side) {
      var st = style["border" + side + "Style"];
      return st === "none" || st === "hidden" ? 0 : px(style["border" + side + "Width"]);
    });
    var bc = sides.map(function (side) {
      return color(style["border" + side + "Color"]);
    });
    var bs = sides.map(function (side) {
      return style["border" + side + "Style"];
    });
    var hasBorder = bw.some(function (w, i) {
      return w > 0 && alphaOf(bc[i]) > 0;
    });
    var shadows = parseShadows(style.boxShadow);
    var outlined = style.outlineStyle !== "none" && px(style.outlineWidth) > 0;

    var limit = Math.min(box.width, box.height) / 2;
    var radius = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(function (corner) {
      var raw = style["border" + corner + "Radius"].split(" ")[0];
      var value = /%$/.test(raw) ? (parseFloat(raw) / 100) * box.width : parseFloat(raw) || 0;
      // The used radius never exceeds half the box, so 9999px and "half the height" are the same pill.
      return r2(Math.min(value, limit));
    });

    var paintsBox = alphaOf(bg) > 0 || !!layers || hasBorder || !!shadows || outlined;

    // ::before and ::after have no box the page can measure, so they are recorded as part of
    // their host: a dot, an underline, a toggle thumb is something the host draws.
    var pseudo = null;
    ["before", "after"].forEach(function (which) {
      var ps = getComputedStyle(el, "::" + which);
      if (!ps || ps.content === "none" || ps.content === "normal" || ps.display === "none") return;
      var pbg = color(ps.backgroundColor);
      var pbw = sides.map(function (side) {
        var st = ps["border" + side + "Style"];
        return st === "none" || st === "hidden" ? 0 : px(ps["border" + side + "Width"]);
      });
      var text = ps.content.replace(/^["']|["']$/g, "");
      var entry = { content: text, width: px(ps.width), height: px(ps.height) };
      if (alphaOf(pbg) > 0) entry.background = pbg;
      if (ps.backgroundImage && ps.backgroundImage !== "none") entry.gradient = splitTop(ps.backgroundImage, ",").map(paintLayer).join(" | ");
      if (pbw.some(Boolean)) entry.border = { width: pbw, color: sides.map(function (side, i) { return pbw[i] ? color(ps["border" + side + "Color"]) : null; }) };
      if (text) entry.color = color(ps.color);
      var pr = px(ps.borderTopLeftRadius.split(" ")[0]);
      if (pr) entry.radius = /%/.test(ps.borderTopLeftRadius) ? "50%" : pr;
      if (ps.boxShadow && ps.boxShadow !== "none") entry.shadow = parseShadows(ps.boxShadow);
      if (Number(ps.opacity) !== 1) entry.opacity = Number(ps.opacity);
      if (ps.position === "absolute" || ps.position === "fixed") {
        entry.inset = ["top", "right", "bottom", "left"].map(function (side) {
          return ps[side] === "auto" ? null : px(ps[side]);
        });
      }
      if (ps.transform && ps.transform !== "none") entry.transform = ps.transform;
      if (entry.background || entry.gradient || entry.border || entry.shadow || text) {
        pseudo = pseudo || {};
        pseudo[which] = entry;
      }
    });

    var node = {
      id: id,
      parent: parentId,
      depth: depth,
      tag: tag,
      name: el.getAttribute("aria-label") || el.getAttribute("data-name") || selectorOf(el).split(" > ").pop(),
      selector: selectorOf(el),
      kind: kind,
      paints: onScreen && (paintsBox || kind !== "box" || !!pseudo),
      rect: rel(box),
    };

    var keys = {};
    if (el.getAttribute("data-node-id")) keys.nodeId = el.getAttribute("data-node-id");
    if (el.getAttribute("data-testid")) keys.testId = el.getAttribute("data-testid");
    if (el.id) keys.domId = el.id;
    if (Object.keys(keys).length) node.keys = keys;
    if (hidden) node.hidden = true;
    if (clip && onScreen && (visible.width < box.width - 0.5 || visible.height < box.height - 0.5)) node.visibleRect = rel(visible);

    var display = style.display;
    var flex = display.indexOf("flex") >= 0;
    var grid = display.indexOf("grid") >= 0;
    var row = flex && style.flexDirection.indexOf("row") === 0;
    node.layout = {
      mode: flex ? (row ? "row" : "column") : grid ? "grid" : "flow",
      justify: flex || grid ? ALIGN[style.justifyContent] || "start" : null,
      align: flex || grid ? ALIGN[style.alignItems] || "stretch" : null,
      gap: flex || grid ? px(row || grid ? style.columnGap : style.rowGap) : 0,
      crossGap: flex || grid ? px(row || grid ? style.rowGap : style.columnGap) : 0,
      wrap: flex ? style.flexWrap !== "nowrap" : false,
      positioned: style.position === "absolute" || style.position === "fixed" ? style.position : null,
      inline: display.indexOf("inline") === 0,
    };
    node.box = {
      padding: sides.map(function (side) {
        return px(style["padding" + side]);
      }),
      margin: sides.map(function (side) {
        return px(style["margin" + side]);
      }),
      borderWidth: bw,
    };
    ["minWidth", "maxWidth", "minHeight", "maxHeight"].forEach(function (prop) {
      var value = style[prop];
      if (value && value !== "none" && value !== "auto" && value !== "0px") node.box[prop] = /px$/.test(value) ? px(value) : value;
    });

    if (paintsBox || kind !== "box") {
      if (alphaOf(bg) > 0) node.background = bg;
      if (layers) node.gradient = layers.join(" | ");
      if (hasBorder) {
        node.border = {
          width: bw,
          color: bw.map(function (w, i) {
            return w > 0 ? bc[i] : null;
          }),
          style: bw.map(function (w, i) {
            return w > 0 ? bs[i] : null;
          }),
        };
      }
      if (shadows) node.shadow = shadows;
      if (outlined) node.outline = { width: px(style.outlineWidth), color: color(style.outlineColor), style: style.outlineStyle, offset: px(style.outlineOffset) };
      if (radius.some(Boolean)) node.radius = radius;
    }
    if (opacity !== 1) node.opacity = opacity;
    if (opacityEffective !== 1) node.opacityEffective = opacityEffective;
    if (style.filter && style.filter !== "none") node.filter = style.filter;
    if (style.backdropFilter && style.backdropFilter !== "none") node.backdropFilter = style.backdropFilter;
    if (style.mixBlendMode && style.mixBlendMode !== "normal") node.blend = style.mixBlendMode;
    if (style.transform && style.transform !== "none") node.transform = style.transform;

    if (pseudo) node.pseudo = pseudo;

    // Only what is drawn gets asked "which token, which explicit size": that is where a
    // finding can land, and it keeps the selector matching off the hundreds of wrappers.
    var refs = null;
    if (node.paints || kind !== "box") {
      var declared = declaredFor(el, style);
      refs = declared.tokens;
      if (refs) node.tokenRefs = refs;
      if (declared.fixed.width || declared.fixed.height) node.box.fixed = declared.fixed;
    }

    nodes.push(node);

    if (isSvg) {
      var shape = el.querySelector("path,circle,rect,line,polyline,polygon,ellipse");
      var ss = shape ? getComputedStyle(shape) : style;
      node.icon = {
        signature: fnv((el.getAttribute("viewBox") || "") + "|" + el.innerHTML.replace(/\s+/g, " ").replace(/> </g, "><").trim()),
        strokeWidth: ss.stroke && ss.stroke !== "none" ? px(ss.strokeWidth) : 0,
        stroke: ss.stroke && ss.stroke !== "none" ? color(ss.stroke) : null,
        fill: ss.fill && ss.fill !== "none" ? color(ss.fill) : null,
      };
      return;
    }

    if (kind === "image") {
      node.asset = assetName(el.currentSrc || el.src || "");
      node.image = { fit: style.objectFit, position: style.objectPosition, natural: el.naturalWidth ? [el.naturalWidth, el.naturalHeight] : null };
      return;
    }

    if (kind === "input") {
      node.type = typeOf(style, el.parentElement || el);
      node.fill = color(style.color);
      node.text = el.value || "";
      if (el.placeholder) {
        var ph = getComputedStyle(el, "::placeholder");
        node.placeholder = { text: el.placeholder, color: color(ph.color), opacity: Number(ph.opacity) };
      }
      return;
    }

    // An element clips its descendants when its own overflow is not visible.
    var childClip = clip;
    if (style.overflowX !== "visible" || style.overflowY !== "visible") {
      var inner = {
        left: box.left + bw[3],
        top: box.top + bw[0],
        right: box.right - bw[1],
        bottom: box.bottom - bw[2],
      };
      inner.width = inner.right - inner.left;
      inner.height = inner.bottom - inner.top;
      childClip = intersect(inner, clip);
      node.clips = true;
    }

    if (!isInline(style)) {
      var content = inlineContent(el);
      if (content.text) {
        var rects = [];
        content.ranges.forEach(function (range) {
          var list = range.getClientRects();
          for (var i = 0; i < list.length; i += 1) if (list[i].width > 0 && list[i].height > 0) rects.push(list[i]);
        });
        if (rects.length) {
          var type = typeOf(style, el);
          var lines = [];
          rects
            .slice()
            .sort(function (a, b) {
              return a.top + a.height / 2 - (b.top + b.height / 2);
            })
            .forEach(function (rect) {
              var center = rect.top + rect.height / 2;
              var last = lines[lines.length - 1];
              if (last && Math.abs(center - last.center) < type.lineHeight / 2) {
                last.left = Math.min(last.left, rect.left);
                last.right = Math.max(last.right, rect.right);
              } else lines.push({ center: center, left: rect.left, right: rect.right });
            });
          // Rebuild the line boxes: glyph rects only span the font's own ascent and descent,
          // while layout — and a design tool's text box — uses the full line height.
          var lineBox = {
            left: Math.min.apply(null, lines.map(function (line) { return line.left; })),
            right: Math.max.apply(null, lines.map(function (line) { return line.right; })),
            top: lines[0].center - type.lineHeight / 2,
            bottom: lines[lines.length - 1].center + type.lineHeight / 2,
          };
          lineBox.width = lineBox.right - lineBox.left;
          lineBox.height = lineBox.bottom - lineBox.top;
          var shown = intersect(lineBox, childClip ? { left: childClip.left, right: childClip.right, top: lineBox.top, bottom: lineBox.bottom } : null);
          var truncated = (style.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 0.5) || (style.webkitLineClamp && style.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 0.5);
          type.lines = lines.length;
          if (truncated) type.truncated = true;
          var textNode = {
            id: id + "t",
            parent: id,
            depth: depth + 1,
            tag: "#text",
            name: content.text.length > 40 ? content.text.slice(0, 37) + "…" : content.text,
            selector: node.selector,
            kind: "text",
            paints: onScreen,
            rect: rel(shown),
            text: content.text,
            type: type,
            fill: color(style.color),
          };
          if (opacityEffective !== 1) textNode.opacityEffective = opacityEffective;
          if (content.segments.length) textNode.segments = content.segments;
          if (style.textShadow && style.textShadow !== "none") textNode.textShadow = parseShadows(style.textShadow);
          if (refs) textNode.tokenRefs = refs;
          nodes.push(textNode);
        }
      }
    }

    for (var c = 0; c < el.children.length; c += 1) visit(el.children[c], id, depth + 1, childClip, opacityEffective);
  }

  visit(root, null, 0, null, 1);

  return {
    specVersion: "1.1",
    surface: {
      name: opts.name || document.title || location.pathname,
      platform: "web",
      source: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      density: window.devicePixelRatio,
      root: { selector: opts.root || "body", width: r2(rootRect.width), height: r2(rootRect.height), pageX: r2(rootRect.left + window.scrollX), pageY: r2(rootRect.top + window.scrollY) },
      theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      direction: getComputedStyle(root).direction,
      locale: document.documentElement.lang || "",
      capturedAt: new Date().toISOString(),
      fidelity: "measured",
      fonts: { requested: Object.keys(fontsRequested) },
    },
    tokens: tokenValues,
    nodes: nodes,
  };
})
