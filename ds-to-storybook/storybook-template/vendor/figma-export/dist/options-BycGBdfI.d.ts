import { d as VisualCommentOptions } from './visualComment-DawOAq7P.js';

type TokenLayer = "ref" | "sys" | "comp";
type FigmaVariableType = "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";
type FigmaVariableValue = boolean | number | string | {
    a: number;
    b: number;
    g: number;
    r: number;
};
type FigmaExportToken = {
    alias?: string;
    collection: TokenLayer;
    cssName: string;
    figmaName: string;
    rawValue: string;
    scopes: string[];
    type: FigmaVariableType;
    value?: FigmaVariableValue;
};
type FigmaBindingName = "backgroundColor" | "borderColor" | "borderWidth" | "cornerRadius" | "fontFamily" | "fontSize" | "fontWeight" | "gap" | "height" | "lineHeight" | "opacity" | "paddingBottom" | "paddingLeft" | "paddingRight" | "paddingTop" | "textColor" | "width";
type FigmaLayoutStrategy = "absolute" | "autoLayout";
type FigmaNodeKind = "frame" | "image" | "svg" | "text";
type FigmaExportArtifactKind = "component" | "page";
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
type FigmaNodeConstraint = "CENTER" | "MAX" | "MIN" | "SCALE" | "STRETCH";
type FigmaNodeConstraints = {
    horizontal: FigmaNodeConstraint;
    vertical: FigmaNodeConstraint;
};
type FigmaBorderSideName = "bottom" | "left" | "right" | "top";
type FigmaExportBorderSide = {
    color: string;
    width: number;
};
type FigmaExportBorderSides = Partial<Record<FigmaBorderSideName, FigmaExportBorderSide>>;
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
type FigmaTransformMatrix = [
    [
        number,
        number,
        number
    ],
    [
        number,
        number,
        number
    ]
];
type FigmaExportReferenceImage = {
    height: number;
    imageBase64: string;
    imageMimeType: string;
    width: number;
};
type FigmaTextDecoration = "STRIKETHROUGH" | "UNDERLINE";
type FigmaExportNode = {
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
        textGrowHeight?: boolean;
        transformMatrix?: FigmaTransformMatrix;
        width: number;
        x: number;
        y: number;
    };
};
type FigmaExportPayload = {
    artifactKind: FigmaExportArtifactKind;
    component?: FigmaComponentReference;
    componentTitle: string;
    generatedAt: string;
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

type FigmaExportAddonOptions = {
    absoluteFidelityComponents?: string[];
    collections?: Partial<Record<TokenLayer, string>>;
    componentClassPrefixes?: string[];
    embeddedSvgByDataGraphic?: Record<string, string>;
    globalName?: string;
    payloadSyncUrl?: string;
    pluginDataKey?: string;
    /** Attach a browser-render snapshot to the payload (default true). */
    referenceImage?: boolean;
    storyTitlePrefix?: false | string | string[];
    tokenLayers?: Partial<Record<TokenLayer, string>>;
    tokenPrefix?: string;
    visualComments?: VisualCommentOptions;
};
type ResolvedFigmaExportAddonOptions = {
    absoluteFidelityComponents: Set<string>;
    collections: Record<TokenLayer, string>;
    componentClassPrefixes: string[];
    embeddedSvgByDataGraphic: Record<string, string>;
    globalName: string;
    payloadSyncUrl?: string;
    pluginDataKey: string;
    referenceImage: boolean;
    storyTitlePrefix: false | string[];
    tokenLayers: Record<TokenLayer, string>;
    tokenPrefix?: string;
    visualComments: Required<VisualCommentOptions>;
};
declare const defaultFigmaExportGlobalName = "figmaExport";
declare function resolveFigmaExportAddonOptions(options: FigmaExportAddonOptions | undefined): ResolvedFigmaExportAddonOptions;
declare function isStoryIncludedForFigmaExport(title: string | undefined, options: ResolvedFigmaExportAddonOptions): boolean;

export { type FigmaExportPayload as F, type ResolvedFigmaExportAddonOptions as R, type TokenLayer as T, type FigmaBindingName as a, type FigmaExportAddonOptions as b, type FigmaExportNode as c, type FigmaExportToken as d, type FigmaLayoutStrategy as e, type FigmaNodeKind as f, defaultFigmaExportGlobalName as g, isStoryIncludedForFigmaExport as i, resolveFigmaExportAddonOptions as r };
