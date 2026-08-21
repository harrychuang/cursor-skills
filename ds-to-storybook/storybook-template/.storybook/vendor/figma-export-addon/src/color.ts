export type ParsedRgbaColor = {
  a: number;
  b: number;
  g: number;
  r: number;
};

let colorContext: CanvasRenderingContext2D | null | undefined;
const normalizedColorCache = new Map<string, string | undefined>();
const parsedColorCache = new Map<string, ParsedRgbaColor | undefined>();

const simpleColorPattern = /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\([^()]*\))$/i;

function getColorContext(): CanvasRenderingContext2D | null {
  if (colorContext !== undefined) return colorContext;

  if (typeof document === "undefined") {
    colorContext = null;
    return colorContext;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorContext = canvas.getContext("2d", { willReadFrequently: true });
  } catch {
    colorContext = null;
  }

  return colorContext;
}

function roundTripFillStyle(
  context: CanvasRenderingContext2D,
  value: string,
  sentinel: string,
): string {
  context.fillStyle = sentinel;
  context.fillStyle = value;
  return String(context.fillStyle);
}

// Invalid fillStyle assignments keep the previous value, so parsing the same
// input against two different sentinels only agrees when the input is a color
// the browser can actually parse.
function parseFillStyle(value: string): string | undefined {
  const context = getColorContext();
  if (!context) return undefined;

  const first = roundTripFillStyle(context, value, "#010203");
  const second = roundTripFillStyle(context, value, "#030201");
  return first === second ? first : undefined;
}

function readPixelRgba(value: string): ParsedRgbaColor | undefined {
  const context = getColorContext();
  if (!context) return undefined;

  try {
    context.save();
    context.globalCompositeOperation = "copy";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    context.restore();
    return {
      a: Math.round((a / 255) * 10000) / 10000,
      b: b / 255,
      g: g / 255,
      r: r / 255,
    };
  } catch {
    return undefined;
  }
}

function parseHexChannel(hex: string): number {
  return Number.parseInt(hex.length === 1 ? `${hex}${hex}` : hex, 16);
}

function rgbaFromNormalizedString(value: string): ParsedRgbaColor | undefined {
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      return {
        a: digits.length === 4 ? parseHexChannel(digits[3]) / 255 : 1,
        b: parseHexChannel(digits[2]) / 255,
        g: parseHexChannel(digits[1]) / 255,
        r: parseHexChannel(digits[0]) / 255,
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        a: digits.length === 8 ? parseHexChannel(digits.slice(6, 8)) / 255 : 1,
        b: parseHexChannel(digits.slice(4, 6)) / 255,
        g: parseHexChannel(digits.slice(2, 4)) / 255,
        r: parseHexChannel(digits.slice(0, 2)) / 255,
      };
    }
    return undefined;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return undefined;

  const parts = rgb[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return {
    a: Number.isFinite(parts[3]) ? Math.min(1, Math.max(0, parts[3])) : 1,
    b: Math.min(1, Math.max(0, parts[2] / 255)),
    g: Math.min(1, Math.max(0, parts[1] / 255)),
    r: Math.min(1, Math.max(0, parts[0] / 255)),
  };
}

function serializeRgba(color: ParsedRgbaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  if (color.a >= 1) {
    const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return `rgba(${r}, ${g}, ${b}, ${Math.round(color.a * 10000) / 10000})`;
}

// Normalizes any browser-parseable CSS color (oklch(), lab(), color(), hsl(),
// named colors, 4/8-digit hex, ...) to a hex or rgb()/rgba() string. Returns
// undefined when the value is not a color the browser can parse — callers
// decide whether to keep the original value (for example SVG url(#...) paints).
export function normalizeCssColorString(value: string): string | undefined {
  const input = value.trim();
  if (!input) return undefined;
  if (simpleColorPattern.test(input)) return input;

  const cached = normalizedColorCache.get(input);
  if (cached !== undefined || normalizedColorCache.has(input)) return cached;

  let normalized: string | undefined;
  const parsed = parseFillStyle(input);
  if (parsed !== undefined) {
    if (simpleColorPattern.test(parsed)) {
      normalized = parsed;
    } else {
      // Exotic serializations (for example color(srgb ...)) resolve through an
      // exact 1x1 pixel readback instead.
      const rgba = readPixelRgba(input);
      normalized = rgba ? serializeRgba(rgba) : undefined;
    }
  }

  normalizedColorCache.set(input, normalized);
  return normalized;
}

// Parses any browser-parseable CSS color into 0..1 RGBA components. Used for
// design-token raw values so hsl()/oklch()/named tokens become Figma COLOR
// variables instead of black or STRING fallbacks.
export function parseCssColorToRgba(value: string): ParsedRgbaColor | undefined {
  const input = value.trim();
  if (!input) return undefined;

  const cached = parsedColorCache.get(input);
  if (cached !== undefined || parsedColorCache.has(input)) return cached;

  let parsed: ParsedRgbaColor | undefined;
  const fillStyle = parseFillStyle(input);
  if (fillStyle !== undefined) {
    parsed = rgbaFromNormalizedString(fillStyle) ?? readPixelRgba(input);
  }

  parsedColorCache.set(input, parsed);
  return parsed;
}

export function isFullyTransparentColor(value: string): boolean {
  const match = value
    .trim()
    .match(/^rgba\([^)]*,\s*(-?\d*\.?\d+)\s*\)$/i);
  return match ? Number(match[1]) === 0 : false;
}
