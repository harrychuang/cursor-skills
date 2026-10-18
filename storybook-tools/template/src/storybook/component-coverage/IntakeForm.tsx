import { useCallback, useRef, useState, type DragEvent, type ClipboardEvent } from "react";

import {
  buildDownloadableRequest,
  submitCoverageRequest,
  type CoverageImagePayload,
} from "./coverageApi";
import { buildAnalysisPrompt, CopyTextButton } from "./ReportView";

const maxImageBytes = 5 * 1024 * 1024;
const submittedAnalysisNextStep =
  "下一步：複製分析提示詞，貼到 Cursor、Claude Code 或 Codex 執行。";

type PendingImage = CoverageImagePayload & { key: number; size: number };

function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`無法讀取圖片「${file.name}」`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function extensionFromMime(mimeType: string) {
  const subtype = mimeType.split("/")[1] ?? "png";

  return subtype === "jpeg" ? "jpg" : subtype;
}

function dedupeName(name: string, takenNames: readonly string[]) {
  if (!takenNames.includes(name)) {
    return name;
  }

  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex > 0 ? name.slice(dotIndex) : "";

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}${extension}`;

    if (!takenNames.includes(candidate)) {
      return candidate;
    }
  }
}

export type IntakeFormProps = {
  isDevMode: boolean;
  onSubmitted: () => Promise<void>;
};

export function IntakeForm({ isDevMode, onSubmitted }: IntakeFormProps) {
  const [title, setTitle] = useState("");
  const [prdText, setPrdText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [submitted, setSubmitted] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageKeyRef = useRef(0);
  const pastedCountRef = useRef(0);

  const acceptFiles = useCallback(
    async (incoming: readonly File[], source: "pick" | "drop" | "paste") => {
      if (incoming.length === 0) {
        return;
      }

      const problems: string[] = [];
      const imageFiles = incoming.filter((file) => file.type.startsWith("image/"));
      const nonImageCount = incoming.length - imageFiles.length;

      if (nonImageCount > 0) {
        problems.push("僅支援圖片檔，已忽略非圖片項目。");
      }

      const oversized = imageFiles.filter((file) => file.size > maxImageBytes);

      if (oversized.length > 0) {
        problems.push(
          `圖片超過單張 5MB 上限：${oversized.map((file) => file.name).join("、")}。請壓縮後再上傳。`,
        );
      }

      setFormError(problems.join(" "));

      const accepted = imageFiles.filter((file) => file.size <= maxImageBytes);
      const loaded = await Promise.all(
        accepted.map(async (file) => {
          const dataUrl = await readImageDataUrl(file);
          const baseName =
            source === "paste"
              ? `pasted-${(pastedCountRef.current += 1)}.${extensionFromMime(file.type)}`
              : file.name;

          return { baseName, dataUrl, size: file.size };
        }),
      );

      setImages((current) => {
        const next = [...current];

        for (const item of loaded) {
          next.push({
            dataUrl: item.dataUrl,
            key: (imageKeyRef.current += 1),
            name: dedupeName(item.baseName, next.map((image) => image.name)),
            size: item.size,
          });
        }

        return next;
      });
    },
    [],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      void acceptFiles(Array.from(event.dataTransfer.files), "drop");
    },
    [acceptFiles],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData.items)
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length > 0) {
        event.preventDefault();
        void acceptFiles(files, "paste");
      }
    },
    [acceptFiles],
  );

  const removeImage = useCallback((key: number) => {
    setImages((current) => current.filter((image) => image.key !== key));
  }, []);

  const validateForm = useCallback(() => {
    if (!prdText.trim() && images.length === 0) {
      setFormError("請至少提供一項輸入：上傳 UI 圖片或貼上 PRD 文字。");
      return false;
    }

    setFormError("");
    return true;
  }, [images, prdText]);

  const resetForm = useCallback(() => {
    setTitle("");
    setPrdText("");
    setImages([]);
    pastedCountRef.current = 0;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setFormNotice("");
    setSubmitted(null);

    try {
      const submittedTitle = title.trim();
      const { id } = await submitCoverageRequest({
        images: images.map(({ dataUrl, name }) => ({ dataUrl, name })),
        prdText: prdText.trim(),
        title: submittedTitle,
      });

      resetForm();
      setSubmitted({ id, title: submittedTitle || id });
      await onSubmitted();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }, [images, onSubmitted, prdText, resetForm, title, validateForm]);

  const handleDownload = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    const request = buildDownloadableRequest({
      images: images.map(({ dataUrl, name }) => ({ dataUrl, name })),
      prdText: prdText.trim(),
      title: title.trim(),
    });
    const blob = new Blob([`${JSON.stringify(request, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "request.json";
    anchor.click();
    URL.revokeObjectURL(url);

    setSubmitted(null);
    setFormNotice(
      `已下載 request.json，放入 outputs/component-coverage/requests/${request.id}/ 後執行分析。`,
    );
  }, [images, prdText, title, validateForm]);

  return (
    <section className="cca-panel" onPaste={handlePaste}>
      <h2 className="cca-panel-heading">新增分析請求</h2>
      <div className="cm-coverage__form">
        <div className="cm-coverage__form-columns">
          <div className="cm-coverage__form-column">
            <label className="cm-coverage__field">
              <span className="cm-coverage__field-label">請求標題</span>
              <input
                className="cm-coverage__input"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：損益月曆畫面"
                type="text"
                value={title}
              />
            </label>
            <div className="cm-coverage__field">
              <span className="cm-coverage__field-label">
                UI 圖片（可多張，單張上限 5MB）
              </span>
              <div
                aria-label="上傳圖片：點擊選擇檔案、拖曳檔案到此，或直接貼上剪貼簿圖片"
                className={`cm-coverage__dropzone${dragActive ? " cm-coverage__dropzone--active" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={handleDrop}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <svg
                  aria-hidden="true"
                  className="cm-coverage__dropzone-icon"
                  fill="none"
                  height="20"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  width="20"
                >
                  <rect height="14" rx="2" width="18" x="3" y="5" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="m21 15-4.35-4.35a1 1 0 0 0-1.42 0L7 19" />
                </svg>
                <span className="cm-coverage__dropzone-title">
                  拖曳、貼上（Cmd/Ctrl+V）或點擊上傳圖片
                </span>
              </div>
              <input
                accept="image/*"
                className="cm-coverage__file-input"
                multiple
                onChange={(event) => {
                  void acceptFiles(Array.from(event.target.files ?? []), "pick");

                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>

            {images.length > 0 ? (
              <ul className="cm-coverage__thumb-grid">
                {images.map((image) => (
                  <li className="cm-coverage__thumb" key={image.key}>
                    <img
                      alt={image.name}
                      className="cm-coverage__thumb-image"
                      src={image.dataUrl}
                    />
                    <span className="cm-coverage__thumb-name" title={image.name}>
                      {image.name}
                    </span>
                    <span className="cm-coverage__thumb-size">
                      {(image.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      aria-label={`移除 ${image.name}`}
                      className="cm-coverage__thumb-remove"
                      onClick={() => removeImage(image.key)}
                      type="button"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="cm-coverage__form-column cm-coverage__form-column--fill">
            <label className="cm-coverage__field cm-coverage__field--fill">
              <span className="cm-coverage__field-label">產品功能文字（PRD）</span>
              <textarea
                className="cm-coverage__textarea"
                onChange={(event) => setPrdText(event.target.value)}
                placeholder="貼上功能描述、使用者故事或 PRD 段落…"
                rows={4}
                value={prdText}
              />
            </label>
          </div>
        </div>

        {formError ? (
          <p className="cm-coverage__form-error" role="alert">
            {formError}
          </p>
        ) : null}
        {formNotice ? (
          <p className="cm-coverage__form-notice" role="status">
            {formNotice}
          </p>
        ) : null}
        {submitted ? (
          <div className="cm-coverage__form-success" role="status">
            <span className="cm-coverage__form-success-text">
              已送出「{submitted.title}」。{submittedAnalysisNextStep}
            </span>
            <CopyTextButton
              label="複製分析提示詞"
              text={buildAnalysisPrompt(submitted.id)}
            />
          </div>
        ) : null}
        <div className="cm-coverage__form-actions">
          {isDevMode ? (
            <button
              className="cm-coverage__submit-button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {submitting ? "送出中…" : "送出分析請求"}
            </button>
          ) : (
            <button
              className="cm-coverage__submit-button"
              onClick={handleDownload}
              type="button"
            >
              下載請求檔
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
