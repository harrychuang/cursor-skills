import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authorizeSignIn } from "./allowlist";

// prisma 以動態 import 載入：middleware（edge bundle）會 import 本模組，
// 而 jwt callback 只在 sign-in（node runtime 的 auth callback route）帶 user 時碰資料庫。
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id-unset",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret-unset",
    }),
  ],
  callbacks: {
    signIn({ user }) {
      return authorizeSignIn(user.email, process.env.MEMBER_ALLOWLIST);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const { prisma } = await import("./db");
        const member = await prisma.member.upsert({
          where: { email: user.email.toLowerCase() },
          update: { name: user.name ?? user.email },
          create: { email: user.email.toLowerCase(), name: user.name ?? user.email },
        });
        token.memberId = member.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.memberId === "string") {
        (session as { memberId?: string }).memberId = token.memberId;
      }
      return session;
    },
  },
});

/** 取得目前 session 的 memberId；未登入回 null。 */
export async function currentMemberId(): Promise<string | null> {
  // 本機 UI 預覽（僅 development）：以固定 email 充當已登入成員
  if (process.env.NODE_ENV === "development" && process.env.DEV_PREVIEW_MEMBER_EMAIL) {
    const email = process.env.DEV_PREVIEW_MEMBER_EMAIL.toLowerCase();
    const { prisma } = await import("./db");
    const member = await prisma.member.upsert({
      where: { email },
      update: {},
      create: { email, name: "本機預覽" },
    });
    return member.id;
  }
  const session = await auth();
  const memberId = (session as { memberId?: string } | null)?.memberId;
  return typeof memberId === "string" ? memberId : null;
}
