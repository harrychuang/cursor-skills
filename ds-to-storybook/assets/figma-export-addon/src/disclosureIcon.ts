export const collapseDisclosurePath =
  "M3.354.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 3.793 3.354.146zM6.646 9.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 10.207l-3.646 3.647a.5.5 0 01-.708-.708l4-4z";

export const unfoldMoreDisclosurePath =
  "M6.646.146a.5.5 0 01.708 0l4 4a.5.5 0 01-.708.708L7 1.207 3.354 4.854a.5.5 0 01-.708-.708l4-4zM3.354 9.146a.5.5 0 10-.708.708l4 4a.5.5 0 00.708 0l4-4a.5.5 0 00-.708-.708L7 12.793 3.354 9.146z";

function createDisclosureSvg(path: string): string {
  return `<svg viewBox="0 0 14 14" width="14" height="14" fill="none" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
}

export const collapseDisclosureSvg = createDisclosureSvg(collapseDisclosurePath);
export const unfoldMoreDisclosureSvg = createDisclosureSvg(unfoldMoreDisclosurePath);
