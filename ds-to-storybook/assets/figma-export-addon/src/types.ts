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

export type FigmaExportNode = {
  bindings: Partial<Record<FigmaBindingName, string>>;
  children: FigmaExportNode[];
  kind: FigmaNodeKind;
  layoutStrategy?: FigmaLayoutStrategy;
  name: string;
  svgText?: string;
  text?: string;
  styles: {
    alignItems?: string;
    backgroundColor?: string;
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
    lineHeight?: number | "normal";
    opacity?: number;
    overflow?: string;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    radius?: number;
    width: number;
    x: number;
    y: number;
  };
};

export type FigmaExportPayload = {
  componentTitle: string;
  generatedAt: string;
  root: FigmaExportNode;
  storyId: string;
  storyName: string;
  tokenSystem: {
    collections: Record<TokenLayer, string>;
    layers: Record<TokenLayer, string>;
    pluginDataKey: string;
    prefix: string;
  };
  tokens: FigmaExportToken[];
  version: 1;
};
