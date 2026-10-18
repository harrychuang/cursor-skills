import { auth } from "@/lib/auth";

// 全站守門：未登入的頁面導向登入、未登入的 API 回 401。
// /api/auth/*（OAuth 流程本身）與 /api/worker/*（worker token 認證，route 內自行驗證）除外。
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/worker/")) {
    return;
  }
  // 本機 UI 預覽（僅 development；production build 不生效）：跳過登入牆
  if (process.env.NODE_ENV === "development" && process.env.DEV_PREVIEW_MEMBER_EMAIL) {
    return;
  }
  if (req.auth) {
    return;
  }
  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  // callbackUrl 用相對路徑：反向代理後面 req.nextUrl 的 host 可能是容器內部位址，
  // 絕對網址會把使用者導去 localhost；相對路徑由 NextAuth 以正確的 base 解析
  const signInUrl = new URL("/api/auth/signin", req.nextUrl);
  signInUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return Response.redirect(signInUrl);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
