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
type FigmaExportNode = {
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
type FigmaExportPayload = {
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

type FigmaExportSourceReference = {
    editUrl?: string;
    label?: string;
    type?: "figma" | "reference" | "source" | "storybook";
    url: string;
};
type FigmaExportReviewStatus = "approved" | "exported" | "need-fix" | "not-reviewed";
type FigmaExportAddonOptions = {
    absoluteFidelityComponents?: string[];
    collections?: Partial<Record<TokenLayer, string>>;
    componentClassPrefixes?: string[];
    embeddedSvgByDataGraphic?: Record<string, string>;
    globalName?: string;
    pluginDataKey?: string;
    reviewStorageKey?: string;
    reviewStatuses?: FigmaExportReviewStatus[];
    sourceReferences?: FigmaExportSourceReference[];
    storyTitlePrefix?: false | string | string[];
    tokenLayers?: Partial<Record<TokenLayer, string>>;
    tokenPrefix?: string;
};
type ResolvedFigmaExportAddonOptions = {
    absoluteFidelityComponents: Set<string>;
    collections: Record<TokenLayer, string>;
    componentClassPrefixes: string[];
    embeddedSvgByDataGraphic: Record<string, string>;
    globalName: string;
    pluginDataKey: string;
    reviewStorageKey: string;
    reviewStatuses: FigmaExportReviewStatus[];
    sourceReferences: FigmaExportSourceReference[];
    storyTitlePrefix: false | string[];
    tokenLayers: Record<TokenLayer, string>;
    tokenPrefix?: string;
};
declare const defaultFigmaExportGlobalName = "figmaExport";
declare function resolveFigmaExportAddonOptions(options: FigmaExportAddonOptions | undefined): ResolvedFigmaExportAddonOptions;
declare function isStoryIncludedForFigmaExport(title: string | undefined, options: ResolvedFigmaExportAddonOptions): boolean;

export { type FigmaExportAddonOptions as F, type ResolvedFigmaExportAddonOptions as R, type TokenLayer as T, type FigmaExportSourceReference as a, type FigmaExportPayload as b, type FigmaBindingName as c, type FigmaExportNode as d, type FigmaExportReviewStatus as e, type FigmaExportToken as f, type FigmaLayoutStrategy as g, type FigmaNodeKind as h, defaultFigmaExportGlobalName as i, isStoryIncludedForFigmaExport as j, resolveFigmaExportAddonOptions as r };
