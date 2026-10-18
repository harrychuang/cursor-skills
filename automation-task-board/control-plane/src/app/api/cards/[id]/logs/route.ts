import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLogChunks } from "@/lib/card-detail";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId");
  const after = Number(url.searchParams.get("after") ?? 0);
  if (!runId) return Response.json({ error: "invalid-query" }, { status: 400 });
  const chunks = await getLogChunks(prisma, id, runId, Number.isFinite(after) ? after : 0);
  return Response.json({ chunks });
}
