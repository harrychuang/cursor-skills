import {
  Component,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  getCompositionPreviewRenderer,
  getCompositionPreviewStoryId,
} from "./compositionPreviewRegistry";
import {
  resolveCompositionSlot,
  type CompositionPreviewOverride,
  type CompositionSlotResolution,
} from "./compositionPreviewModel";
import {
  classifyCoverageBlock,
  type CoverageBlock,
  type CoverageComposition,
  type CoverageCompositionBlock,
  type CoverageCompositionGroup,
  type CoverageCompositionNode,
} from "./coverageTypes";

export type CompositionPreviewProps = {
  activeReferenceImage?: CompositionReferenceImage;
  blocks: readonly CoverageBlock[];
  canvasMode: CompositionCanvasMode;
  composition: CoverageComposition;
  onCanvasModeChange: (mode: CompositionCanvasMode) => void;
  onClearSelection: () => void;
  onReferenceImageError: (name: string) => void;
  onReferenceImageSelect: (name: string) => void;
  onSelectBlock: (blockId: string) => void;
  previewOverride?: CompositionPreviewOverride;
  referenceImages: readonly CompositionReferenceImage[];
  selectedBlockId?: string;
  storyIndex: ReadonlyMap<string, string>;
};

export type CompositionCanvasMode = "assembled" | "reference";

export type CompositionReferenceImage = {
  name: string;
  url: string;
};

const compositionPreviewCopy = {
  assembled: "組裝 UI",
  reference: "UI Reference",
  referenceSelect: "選擇 UI Reference",
  referenceUnavailable: "沒有可用的 UI Reference，仍可繼續覆核組裝 UI。",
  reviewOnly: "審核預覽，不是正式畫面",
} as const;

type CompositionStyle = CSSProperties & {
  "--cca-composition-columns"?: number;
  "--cca-composition-span"?: number;
};

type CompositionSlotErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKey: string;
};

type CompositionSlotErrorBoundaryState = {
  failed: boolean;
};

class CompositionSlotErrorBoundary extends Component<
  CompositionSlotErrorBoundaryProps,
  CompositionSlotErrorBoundaryState
> {
  state: CompositionSlotErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): CompositionSlotErrorBoundaryState {
    return { failed: true };
  }

  componentDidUpdate(previousProps: CompositionSlotErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function storyDocsPath(storyTitle: string) {
  const slug = storyTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `/docs/${slug}--docs`;
}

function PreviewUnavailable({
  copy,
  storyTitle,
  title = "此區塊無法產生真實元件預覽",
}: {
  copy: string;
  storyTitle?: string;
  title?: string;
}) {
  return (
    <div className="cm-coverage__composition-unavailable" role="status">
      <span className="cm-coverage__composition-unavailable-title">{title}</span>
      <span className="cm-coverage__composition-unavailable-copy">{copy}</span>
      {storyTitle ? (
        <a
          className="cm-coverage__story-link cm-coverage__composition-docs-link"
          href={`?path=${storyDocsPath(storyTitle)}`}
          target="_top"
        >
          開啟元件文件
        </a>
      ) : null}
    </div>
  );
}

function ComponentSlotBody({
  resolution,
  storyIndex,
}: {
  resolution: Extract<CompositionSlotResolution, { kind: "component" }>;
  storyIndex: ReadonlyMap<string, string>;
}) {
  const renderComponent = getCompositionPreviewRenderer(resolution.componentId);

  if (!renderComponent) {
    const storyId = resolveCompositionPreviewStoryId(resolution, storyIndex);

    if (storyId) {
      return (
        <StorybookFallback
          componentName={resolution.componentName}
          storyId={storyId}
          storyTitle={resolution.storyTitle}
        />
      );
    }

    return (
      <PreviewUnavailable
        copy={`「${resolution.componentName}」尚未註冊可信任的組裝預覽 renderer，且 Storybook index 沒有對應 story；其他區塊仍可繼續審核。`}
        storyTitle={resolution.storyTitle}
      />
    );
  }

  const failureFallback = (
    <PreviewUnavailable
      copy={`「${resolution.componentName}」renderer 發生錯誤；錯誤已隔離，其他區塊仍可繼續審核。`}
      storyTitle={resolution.storyTitle}
    />
  );

  return (
    <CompositionSlotErrorBoundary
      fallback={failureFallback}
      resetKey={resolution.componentId}
    >
      <div
        aria-hidden="true"
        className="cm-coverage__composition-component-surface"
        data-preview-component={resolution.componentId}
        inert
      >
        {renderComponent()}
      </div>
    </CompositionSlotErrorBoundary>
  );
}

export function resolveCompositionPreviewStoryId(
  resolution: Extract<CompositionSlotResolution, { kind: "component" }>,
  storyIndex: ReadonlyMap<string, string>,
): string | undefined {
  const registryStoryId = getCompositionPreviewStoryId(resolution.componentId);

  if (registryStoryId) {
    return registryStoryId;
  }

  return getCompositionPreviewRenderer(resolution.componentId)
    ? undefined
    : storyIndex.get(resolution.storyTitle);
}

function StorybookFallback({
  componentName,
  storyId,
  storyTitle,
}: {
  componentName: string;
  storyId: string;
  storyTitle: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <PreviewUnavailable
        copy={`「${componentName}」的 Story 預覽載入失敗；其他區塊仍可繼續審核。`}
        storyTitle={storyTitle}
      />
    );
  }

  return (
    <div
      className="cm-coverage__composition-story-fallback"
      data-story-id={storyId}
    >
      <div
        aria-hidden="true"
        className="cm-coverage__composition-story-frame"
        inert
      >
        <iframe
          aria-hidden="true"
          className="cm-coverage__composition-story-iframe"
          onError={() => setFailed(true)}
          src={`iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`}
          tabIndex={-1}
          title={`${componentName} Story 預覽`}
        />
      </div>
    </div>
  );
}

function PlaceholderSlotBody({
  resolution,
}: {
  resolution: Extract<CompositionSlotResolution, { kind: "placeholder" }>;
}) {
  return (
    <div className="cm-coverage__composition-placeholder">
      <span className="cm-coverage__composition-placeholder-kicker">
        缺少元件
      </span>
      <strong className="cm-coverage__composition-placeholder-title">
        {resolution.suggestedName}
      </strong>
      <span className="cm-coverage__composition-placeholder-meta">
        分類 {resolution.category}・角色 {resolution.role}
      </span>
      <p className="cm-coverage__composition-placeholder-rationale">
        {resolution.rationale}
      </p>
    </div>
  );
}

function UnavailableSlotBody({
  resolution,
}: {
  resolution: Extract<CompositionSlotResolution, { kind: "unavailable" }>;
}) {
  return <PreviewUnavailable copy={resolution.reason} />;
}

/**
 * Skip-decided blocks collapse to an excluded row: the component preview is
 * not rendered, but the row keeps the block's grid cell and stays selectable
 * so the reviewer can reopen the decision in the inspector.
 */
function SkippedSlotBody({ blockLabel }: { blockLabel: string }) {
  return (
    <div className="cm-coverage__composition-slot-skip" role="status">
      <span className="cm-coverage__chip cm-coverage__chip--composition-skip">
        不實作
      </span>
      <span className="cm-coverage__composition-slot-skip-label">
        {blockLabel}
      </span>
      <span className="cm-coverage__composition-slot-skip-hint">
        已排除，點擊可重新覆核
      </span>
    </div>
  );
}

function CompositionBlockSlot({
  block,
  node,
  onSelectBlock,
  selected,
  storyIndex,
  previewOverride,
}: {
  block: CoverageBlock;
  node: CoverageCompositionBlock;
  onSelectBlock: (blockId: string) => void;
  selected: boolean;
  storyIndex: ReadonlyMap<string, string>;
  previewOverride?: CompositionPreviewOverride;
}) {
  const resolution = resolveCompositionSlot(block, node, previewOverride);
  const coverage = classifyCoverageBlock(block);
  const style: CompositionStyle | undefined = node.span
    ? { "--cca-composition-span": node.span }
    : undefined;
  let body: ReactNode;

  if (resolution.skipped) {
    body = <SkippedSlotBody blockLabel={block.label} />;
  } else if (resolution.kind === "component") {
    body = <ComponentSlotBody resolution={resolution} storyIndex={storyIndex} />;
  } else if (resolution.kind === "placeholder") {
    body = <PlaceholderSlotBody resolution={resolution} />;
  } else {
    body = <UnavailableSlotBody resolution={resolution} />;
  }

  return (
    <article
      className="cm-coverage__composition-slot"
      data-coverage={coverage}
      data-kind={resolution.kind}
      data-selected={selected ? "true" : "false"}
      data-skipped={resolution.skipped ? "true" : "false"}
      data-state={resolution.state}
      style={style}
    >
      {body}
      <button
        aria-label={`覆核 ${block.label}，${resolution.badgeLabel}`}
        aria-pressed={selected}
        className="cm-coverage__composition-slot-select"
        onClick={() => onSelectBlock(block.id)}
        type="button"
      >
        {resolution.kind === "component" ? null : (
          <>
            <span className="cm-coverage__composition-slot-label">
              {block.label}
            </span>
            <span
              className={`cm-coverage__chip cm-coverage__chip--composition-${resolution.state}`}
            >
              {resolution.badgeLabel}
            </span>
          </>
        )}
      </button>
    </article>
  );
}

function CompositionGroupView({
  blockById,
  group,
  onSelectBlock,
  selectedBlockId,
  storyIndex,
  previewOverride,
}: {
  blockById: ReadonlyMap<string, CoverageBlock>;
  group: CoverageCompositionGroup;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId?: string;
  storyIndex: ReadonlyMap<string, string>;
  previewOverride?: CompositionPreviewOverride;
}) {
  const style: CompositionStyle | undefined = group.columns
    ? { "--cca-composition-columns": group.columns }
    : undefined;

  const renderNode = (node: CoverageCompositionNode): ReactNode => {
    if (node.kind === "group") {
      return (
        <CompositionGroupView
          blockById={blockById}
          group={node}
          key={node.id}
          onSelectBlock={onSelectBlock}
          selectedBlockId={selectedBlockId}
          storyIndex={storyIndex}
          previewOverride={previewOverride}
        />
      );
    }

    const block = blockById.get(node.blockId);

    if (!block) {
      return null;
    }

    return (
      <CompositionBlockSlot
        block={block}
        key={node.id}
        node={node}
        onSelectBlock={onSelectBlock}
        selected={selectedBlockId === block.id}
        storyIndex={storyIndex}
        previewOverride={previewOverride}
      />
    );
  };

  return (
    <section
      aria-label={group.label}
      className="cm-coverage__composition-group"
      data-layout={group.layout}
      style={style}
    >
      <div className="cm-coverage__composition-group-children">
        {group.children.map(renderNode)}
      </div>
    </section>
  );
}

export function CompositionPreview({
  activeReferenceImage,
  blocks,
  canvasMode,
  composition,
  onCanvasModeChange,
  onClearSelection,
  onReferenceImageError,
  onReferenceImageSelect,
  onSelectBlock,
  referenceImages,
  selectedBlockId,
  storyIndex,
  previewOverride,
}: CompositionPreviewProps) {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const referenceAvailable = referenceImages.length > 0;
  const showReference =
    canvasMode === "reference" && activeReferenceImage !== undefined;

  return (
    <div
      aria-label={`${composition.label}，審核預覽，不是正式畫面`}
      className="cm-coverage__composition-canvas"
      data-viewport={composition.viewport}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          canvasMode === "assembled" &&
          selectedBlockId !== undefined
        ) {
          event.preventDefault();
          onClearSelection();
        }
      }}
      role="region"
    >
      <header className="cm-coverage__composition-canvas-header">
        <span className="cm-coverage__composition-canvas-title">
          {composition.label}
        </span>
        <span className="cm-coverage__composition-review-only">
          {compositionPreviewCopy.reviewOnly}
        </span>
      </header>
      <div className="cm-coverage__composition-canvas-toolbar">
        <div
          aria-label="預覽畫布"
          className="cm-coverage__composition-canvas-modes"
          role="group"
        >
          <button
            aria-pressed={canvasMode === "assembled"}
            className="cm-coverage__composition-canvas-mode"
            onClick={() => onCanvasModeChange("assembled")}
            type="button"
          >
            {compositionPreviewCopy.assembled}
          </button>
          <button
            aria-pressed={canvasMode === "reference"}
            className="cm-coverage__composition-canvas-mode"
            disabled={!referenceAvailable}
            onClick={() => onCanvasModeChange("reference")}
            type="button"
          >
            {compositionPreviewCopy.reference}
          </button>
        </div>
        {showReference && referenceImages.length > 1 ? (
          <label className="cm-coverage__composition-reference-select-label">
            <span>{compositionPreviewCopy.referenceSelect}</span>
            <select
              className="cm-coverage__composition-reference-select"
              onChange={(event) => onReferenceImageSelect(event.target.value)}
              value={activeReferenceImage.name}
            >
              {referenceImages.map((image) => (
                <option key={image.name} value={image.name}>
                  {image.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {!referenceAvailable ? (
        <span
          className="cm-coverage__composition-reference-unavailable"
          role="status"
        >
          {compositionPreviewCopy.referenceUnavailable}
        </span>
      ) : null}
      {showReference ? (
        <figure className="cm-coverage__composition-reference">
          <img
            alt={`${composition.label} UI Reference ${activeReferenceImage.name}`}
            className="cm-coverage__composition-reference-image"
            onError={() => onReferenceImageError(activeReferenceImage.name)}
            src={activeReferenceImage.url}
          />
          <figcaption className="cm-coverage__composition-reference-caption">
            {activeReferenceImage.name}
          </figcaption>
        </figure>
      ) : (
        <div
          className="cm-coverage__composition-screen"
          onClick={(event) => {
            const target = event.target;

            if (
              target instanceof Element &&
              target.closest(".cm-coverage__composition-slot")
            ) {
              return;
            }

            onClearSelection();
          }}
        >
          <CompositionGroupView
            blockById={blockById}
            group={composition.root}
            onSelectBlock={onSelectBlock}
            selectedBlockId={selectedBlockId}
            storyIndex={storyIndex}
            previewOverride={previewOverride}
          />
        </div>
      )}
    </div>
  );
}
