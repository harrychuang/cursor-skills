import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

function requireText(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing ${JSON.stringify(expected)}`);
  }
}

const [preview, report, model, styles, story] = await Promise.all([
  read("src/storybook/component-coverage/CompositionPreview.tsx"),
  read("src/storybook/component-coverage/ReportView.tsx"),
  read("src/storybook/component-coverage/compositionPreviewModel.ts"),
  read("src/storybook/component-coverage/component-coverage.css"),
  read("src/stories/tools/ComponentCoverageAnalyzer.stories.tsx"),
]);

for (const expected of [
  'reference: "UI Reference"',
  "onClearSelection",
  "onReferenceImageSelect",
  "referenceImages",
  'event.key === "Escape"',
  "cm-coverage__composition-slot-skip",
  "已排除，點擊可重新覆核",
  "resolution.skipped",
]) {
  requireText(preview, expected, "Composition preview contract");
}

for (const expected of [
  "storyManagerPath",
  'target="_blank"',
  "尚未選取任何元件",
  "onDraftOverrideChange",
  "activeReferenceImageName",
  "cm-coverage__report-open-state",
  "cm-coverage__report-disclosure",
  "aria-controls={detailId}",
  "findInspectorEvidenceRegion(",
  "selectedEvidenceRegion && request",
  "UI Reference 元件截圖",
  "無可用 UI Reference 截圖",
  "region.x * image.naturalWidth",
  "region.y * image.naturalHeight",
  "region.width * image.naturalWidth",
  "region.height * image.naturalHeight",
  "image.onerror = markUnavailable",
  "componentCoverageStaticBase}/requests/${requestId}/${region.image}",
  "onOpen={onOpenImage}",
  'variant="inspector"',
  "buildComponentPickerGroups",
  'aria-label="搜尋元件"',
  "分析候選",
  "沒有符合的元件",
  "請先選擇處理方式",
  "cm-coverage__picker-list",
]) {
  requireText(report, expected, "Report view contract");
}

for (const expected of [
  "CompositionPreviewOverride",
  "updateCompositionPreviewOverride",
  "findCompositionBlockNode",
  "findInspectorEvidenceRegion",
  "requestImageNames?.includes(region.image)",
  '"draft-override"',
]) {
  requireText(model, expected, "Preview model contract");
}

for (const expected of [
  ".cm-coverage__composition-canvas-mode",
  ".cm-coverage__composition-reference-image",
  ".cm-coverage__composition-inspector-empty",
  ".cm-coverage__report-entry[data-expanded=\"true\"]",
  ".cm-coverage__report-disclosure",
  "padding: 10px 10px 10px 8px;",
  ".cm-coverage__crop--inspector",
  ".cm-coverage__crop-unavailable",
  ".cm-coverage__picker-list",
  ".cm-coverage__picker-option",
  ".cm-coverage__composition-slot-skip",
  '.cm-coverage__composition-slot[data-skipped="true"] .cm-coverage__composition-slot-label',
]) {
  requireText(styles, expected, "Preview styles contract");
}

requireText(
  story,
  "右側 inspector 同步顯示所選元件在 UI Reference 中的原圖裁切",
  "Analyzer story contract",
);
requireText(
  story,
  "標記不實作的區塊會在組裝預覽收合為排除列",
  "Analyzer story contract",
);

console.log("Component Coverage preview contract check passed.");
