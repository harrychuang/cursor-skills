import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCardDetail } from "@/lib/card-detail";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const detail = await getCardDetail(prisma, id);
  if (!detail) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(detail);
}
