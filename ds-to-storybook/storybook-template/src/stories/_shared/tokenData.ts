import compCss from "../../../tokens/tokens-comp.css?raw";
import refCss from "../../../tokens/tokens-ref.css?raw";
import sysCss from "../../../tokens/tokens-sys.css?raw";
import { storybookTemplateProjectConfig } from "../../../.storybook/project.config.ts";

export type TokenLayer = "ref" | "sys" | "comp";

export type TokenFamily =
  | "color"
  | "opacity"
  | "shadow"
  | "type"
  | "spacing"
  | "shape"
  | "size"
  | "motion"
  | "other";

export type TokenDefinition = {
  name: string;
  value: string;
  layer: TokenLayer;
  family: TokenFamily;
};

const layerCss: Record<TokenLayer, string> = {
  ref: refCss,
  sys: sysCss,
  comp: compCss,
};

export const tokenLayers: TokenLayer[] = ["ref", "sys", "comp"];

export const tokenFamilies: TokenFamily[] = [
  "color",
  "opacity",
  "shadow",
  "type",
  "spacing",
  "shape",
  "size",
  "motion",
  "other",
];

function escapeRegexLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const tokenPrefix = escapeRegexLiteral(
  storybookTemplateProjectConfig.project.tokenPrefix,
);
const tokenPattern = new RegExp(
  `(--${tokenPrefix}-(ref|sys|comp)-[a-z0-9-]+)\\s*:\\s*([^;]+);`,
  "gi",
);

function getTokenFamily(name: string): TokenFamily {
  if (name.includes("-color-")) return "color";
  if (name.includes("-opacity-")) return "opacity";
  if (name.includes("-shadow-")) return "shadow";
  if (
    name.includes("-typeface-") ||
    name.includes("-typescale-") ||
    name.includes("-weight-") ||
    name.includes("-line-height-")
  ) {
    return "type";
  }
  if (name.includes("-spacing-")) return "spacing";
  if (name.includes("-shape-") || name.includes("-radius-")) return "shape";
  if (name.includes("-duration-") || name.includes("-easing-")) return "motion";
  if (name.includes("-size-")) return "size";
  return "other";
}

function parseLayerTokens(layer: TokenLayer): TokenDefinition[] {
  return Array.from(layerCss[layer].matchAll(tokenPattern), (match) => {
    const name = match[1];
    return {
      name,
      value: match[3].trim(),
      layer,
      family: getTokenFamily(name),
    };
  });
}

export const tokenCatalog: TokenDefinition[] = tokenLayers.flatMap(parseLayerTokens);
