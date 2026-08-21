export type FigmaWorkspaceSlotName = "review" | "export";

export type FigmaWorkspaceSlotHandle = {
  root: HTMLElement;
  slot: HTMLElement;
  release(): void;
};

const workspaceSelector = "[data-sbfx-workspace]";
const workspaceNarrowQuery = "(max-width: 720px)";

let workspaceRoot: HTMLElement | null = null;
let workspaceMedia: MediaQueryList | null = null;
let workspaceMediaCleanup: (() => void) | null = null;

function setWorkspaceOrientation(root: HTMLElement, media: MediaQueryList): void {
  const orientation = media.matches ? "bottom" : "side";
  root.dataset.orientation = orientation;
  document.documentElement.dataset.sbfxWorkspaceOrientation = orientation;
}

function connectWorkspaceOrientation(root: HTMLElement): void {
  workspaceMediaCleanup?.();
  workspaceMedia = window.matchMedia(workspaceNarrowQuery);
  const update = () => setWorkspaceOrientation(root, workspaceMedia!);
  update();
  workspaceMedia.addEventListener?.("change", update);
  workspaceMediaCleanup = () => {
    workspaceMedia?.removeEventListener?.("change", update);
    workspaceMedia = null;
    workspaceMediaCleanup = null;
  };
}

function ensureWorkspaceRoot(): HTMLElement {
  if (workspaceRoot?.isConnected) return workspaceRoot;

  const existing = document.querySelector<HTMLElement>(workspaceSelector);
  if (existing) {
    workspaceRoot = existing;
    connectWorkspaceOrientation(existing);
    document.documentElement.dataset.sbfxWorkspaceOpen = "true";
    return existing;
  }

  const root = document.createElement("aside");
  root.className = "sbfx-workspace";
  root.dataset.sbfxCaptureIgnore = "true";
  root.dataset.sbfxWorkspace = "true";
  root.setAttribute("aria-label", "Figma workspace");

  for (const name of ["export", "review"] as const) {
    const slot = document.createElement("div");
    slot.className = `sbfx-workspace__slot sbfx-workspace__slot--${name}`;
    slot.dataset.sbfxWorkspaceSlot = name;
    root.append(slot);
  }

  document.body.append(root);
  workspaceRoot = root;
  document.documentElement.dataset.sbfxWorkspaceOpen = "true";
  connectWorkspaceOrientation(root);
  return root;
}

function releaseWorkspaceIfEmpty(): void {
  window.setTimeout(() => {
    const root = workspaceRoot?.isConnected
      ? workspaceRoot
      : document.querySelector<HTMLElement>(workspaceSelector);
    if (!root) return;
    const activeSlot = Array.from(
      root.querySelectorAll<HTMLElement>("[data-sbfx-workspace-slot]"),
    ).some((slot) => slot.dataset.active === "true" || slot.childElementCount > 0);
    if (activeSlot) return;

    root.remove();
    workspaceRoot = null;
    workspaceMediaCleanup?.();
    delete document.documentElement.dataset.sbfxWorkspaceOpen;
    delete document.documentElement.dataset.sbfxWorkspaceOrientation;
  }, 0);
}

export function acquireFigmaWorkspaceSlot(
  name: FigmaWorkspaceSlotName,
): FigmaWorkspaceSlotHandle {
  const root = ensureWorkspaceRoot();
  const slot = root.querySelector<HTMLElement>(
    `[data-sbfx-workspace-slot="${name}"]`,
  );
  if (!slot) throw new Error(`Figma workspace slot ${name} is unavailable.`);
  slot.dataset.active = "true";

  let released = false;
  return {
    root,
    slot,
    release() {
      if (released) return;
      released = true;
      delete slot.dataset.active;
      releaseWorkspaceIfEmpty();
    },
  };
}
