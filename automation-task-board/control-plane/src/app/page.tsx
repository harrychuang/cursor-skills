import Board from "@/components/Board";
import { prisma } from "@/lib/db";
import { getBoardState } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initial = await getBoardState(prisma);
  return (
    <main className="shell">
      <header className="topbar">
        <h1>自動化任務看板</h1>
        <span className="topbar-sub">卡片由系統事件驅動 · 你只需要看「等你處理」的兩欄</span>
      </header>
      <Board initial={initial} />
    </main>
  );
}
