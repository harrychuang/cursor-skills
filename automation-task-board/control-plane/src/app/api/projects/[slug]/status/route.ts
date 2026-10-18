import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectStatus } from "@/lib/project-status";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { slug } = await params;
  const status = await getProjectStatus(prisma, slug);
  if (!status) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(status);
}
