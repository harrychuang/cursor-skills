import { notFound } from "next/navigation";
import CardDetail from "@/components/CardDetail";
import { prisma } from "@/lib/db";
import { getCardDetail } from "@/lib/card-detail";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCardDetail(prisma, id);
  if (!detail) notFound();
  return (
    <main className="shell">
      <header className="topbar">
        <a href="/">← 看板</a>
        <h1>
          {detail.projectName} · {detail.taskId}
        </h1>
        <span className="topbar-sub">{detail.column}</span>
      </header>
      <CardDetail initial={detail} />
    </main>
  );
}
