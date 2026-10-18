// 允許清單邏輯獨立成純函式，讓登入授權決策可被單元測試。
export function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

/** 登入授權決策：email 在允許清單內才放行。清單為空一律拒絕（fail closed）。 */
export function authorizeSignIn(email: string | null | undefined, allowlistRaw: string | undefined): boolean {
  if (!email) return false;
  const allowlist = parseAllowlist(allowlistRaw);
  if (allowlist.size === 0) return false;
  return allowlist.has(email.trim().toLowerCase());
}
