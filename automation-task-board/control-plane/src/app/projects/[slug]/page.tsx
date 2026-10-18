import { notFound } from "next/navigation";
import ProjectStatus from "@/components/ProjectStatus";
import { prisma } from "@/lib/db";
import { getProjectStatus } from "@/lib/project-status";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const status = await getProjectStatus(prisma, slug);
  if (!status) notFound();
  return (
    <main className="shell">
      <header className="topbar">
        <a href="/">← 看板</a>
        <h1>{status.displayName}</h1>
        <span className="topbar-sub">專案現況 · 磁碟證據與外部活動</span>
      </header>
      <ProjectStatus initial={status} />
    </main>
  );
}
