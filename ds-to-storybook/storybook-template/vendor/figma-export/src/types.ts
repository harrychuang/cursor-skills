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

export type FigmaExportGradientStop = {
  color: string;
  position: number;
  token?: string;
};

export type FigmaExportLinearGradient = {
  angle: number;
  stops: FigmaExportGradientStop[];
};

export type FigmaExportRadialGradient = {
  stops: FigmaExportGradientStop[];
};

export type FigmaNodeConstraint = "CENTER" | "MAX" | "MIN" | "SCALE" | "STRETCH";

export type FigmaNodeConstraints = {
  horizontal: FigmaNodeConstraint;
  vertical: FigmaNodeConstraint;
};

export type FigmaBorderSideName = "bottom" | "left" | "right" | "top";

export type FigmaExportBorderSide = {
  color: string;
  width: number;
};

export type FigmaExportBorderSides = Partial<
  Record<FigmaBorderSideName, FigmaExportBorderSide>
>;

export type FigmaExportEffect = {
  blur: number;
  color?: string;
  offsetX: number;
  offsetY: number;
  spread: number;
  type: "BACKGROUND_BLUR" | "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR";
};

export type FigmaExportBorderStyle = "dashed" | "dotted";

export type FigmaRadiusCorners = {
  bottomLeft: number;
  bottomRight: number;
  topLeft: number;
  topRight: number;
};

export type FigmaImageScaleMode = "FILL" | "FIT";

// Row-major 2x3 affine matrix in Figma Transform layout: node-local (x, y)
// maps to parent space as (m00*x + m01*y + m02, m10*x + m11*y + m12).
export type FigmaTransformMatrix = [
  [number, number, number],
  [number, number, number],
];

export type FigmaExportReferenceImage = {
  height: number;
  imageBase64: string;
  imageMimeType: string;
  width: number;
};

export type FigmaTextDecoration = "STRIKETHROUGH" | "UNDERLINE";

export type FigmaExportNode = {
  bindings: Partial<Record<FigmaBindingName, string>>;
  children: FigmaExportNode[];
  component?: FigmaComponentReference;
  imageBase64?: string;
  imageMimeType?: string;
  kind: FigmaNodeKind;
  layoutStrategy?: FigmaLayoutStrategy;
  name: string;
  svgText?: string;
  text?: string;
  styles: {
    alignItems?: string;
    backgroundColor?: string;
    backgroundLinearGradient?: FigmaExportLinearGradient;
    backgroundRadialGradient?: FigmaExportRadialGradient;
    // Blur effects live apart from shadow effects so importers predating
    // LAYER_BLUR/BACKGROUND_BLUR keep accepting the payload.
    blurEffects?: FigmaExportEffect[];
    borderColor?: string;
    borderSides?: FigmaExportBorderSides;
    borderStyle?: FigmaExportBorderStyle;
    borderWidth?: number;
    color?: string;
    constraints?: FigmaNodeConstraints;
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
    textAlignVertical?: "CENTER";
    textAutoResize?: "WIDTH_AND_HEIGHT";
    textDecoration?: FigmaTextDecoration;
    // Fixed-width wrapped text; a separate flag (instead of a textAutoResize
    // value) so importers predating it keep accepting the payload.
    textGrowHeight?: boolean;
    // CSS transform (rotation, mirrored/nested rotations) relative to the
    // parent node; width/height/x/y describe the untransformed local box.
    transformMatrix?: FigmaTransformMatrix;
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
  // Pixel snapshot of the rendered story for side-by-side fidelity checks in
  // Figma; older importers ignore the extra field.
  reference?: FigmaExportReferenceImage;
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
