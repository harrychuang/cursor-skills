export type TokenLayer = "ref" | "sys" | "comp";

export type FigmaVariableType = "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";

export type FigmaVariableValue =
  | boolean
  | number
  | string
  | {
      a: number;
      b: number;
      g: number;
      r: number;
    };

export type FigmaExportToken = {
  alias?: string;
  collection: TokenLayer;
  cssName: string;
  figmaName: string;
  rawValue: string;
  scopes: string[];
  type: FigmaVariableType;
  value?: FigmaVariableValue;
};

export type FigmaBindingName =
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

export type FigmaLayoutStrategy = "absolute" | "autoLayout";

export type FigmaNodeKind = "frame" | "image" | "svg" | "text";

export type FigmaExportArtifactKind = "component" | "page";

export type FigmaComponentReference = {
  key: string;
  name: string;
  sourceName: string;
  variant?: string;
  variantProperties?: Record<string, string>;
};

export type FigmaExportLinearGradient = {
  angle: number;
  stops: Array<{
    color: string;
    position: number;
    token?: string;
  }>;
};

export type FigmaExportNode = {
  bindings: Partial<Record<FigmaBindingName, string>>;
  children: FigmaExportNode[];
  component?: FigmaComponentReference;
  kind: FigmaNodeKind;
  layoutStrategy?: FigmaLayoutStrategy;
  name: string;
  svgText?: string;
  text?: string;
  styles: {
    alignItems?: string;
    backgroundColor?: string;
    backgroundLinearGradient?: FigmaExportLinearGradient;
    borderColor?: string;
    borderWidth?: number;
    color?: string;
    display?: string;
    flexDirection?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    gap?: number;
    height: number;
    justifyContent?: string;
    layoutAlign?: "STRETCH";
    layoutGrow?: number;
    lineHeight?: number | "normal";
    opacity?: number;
    overflow?: string;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
    radius?: number;
    textAlign?: string;
    textAutoResize?: "WIDTH_AND_HEIGHT";
    topLeftRadius?: number;
    topRightRadius?: number;
    width: number;
    x: number;
    y: number;
  };
};

export type FigmaExportPayload = {
  artifactKind: FigmaExportArtifactKind;
  component?: FigmaComponentReference;
  componentTitle: string;
  generatedAt: string;
  root: FigmaExportNode;
  storyId: string;
  storyName: string;
  storyTitle: string;
  tokenSystem: {
    collections: Record<TokenLayer, string>;
    layers: Record<TokenLayer, string>;
    pluginDataKey: string;
    prefix: string;
  };
  tokens: FigmaExportToken[];
  version: 2;
};
