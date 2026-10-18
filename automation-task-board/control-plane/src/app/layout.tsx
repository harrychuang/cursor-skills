import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "自動化任務看板",
  description: "團隊 AI 任務的即時看板與操作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
