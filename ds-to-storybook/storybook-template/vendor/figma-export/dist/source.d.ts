type FigmaSourceResolverOptions = {
    componentSpecModules?: Record<string, string>;
    designSystemFileUrl?: string;
    nodeOverrides?: Record<string, string>;
    specModulePathForSlug?: (slug: string) => string;
};
type StoryParameters = Record<string, unknown> | undefined;
declare function getParameterUrl(value: unknown): string | undefined;
declare function getComponentSourceSlug(componentTitle: unknown): string;
declare function getFigmaNodeId(value: string): string | undefined;
declare function getDocumentedFigmaSourceUrl(componentTitle: unknown, options: FigmaSourceResolverOptions): string | undefined;
declare function getFigmaSourceUrl(parameters: StoryParameters, componentTitle: string, options?: FigmaSourceResolverOptions): string | undefined;
declare function getExportComponentTitle(title: string | undefined, storyTitlePrefix: string[] | false): string;

export { type FigmaSourceResolverOptions, type StoryParameters, getComponentSourceSlug, getDocumentedFigmaSourceUrl, getExportComponentTitle, getFigmaNodeId, getFigmaSourceUrl, getParameterUrl };
