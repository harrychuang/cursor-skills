import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { approveCardForRun, CardActionError } from "@/lib/cards";

/** 放行未 auto-run 的卡。 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  try {
    const card = await approveCardForRun(prisma, memberId, id);
    return Response.json({ card });
  } catch (error) {
    if (error instanceof CardActionError) {
      return Response.json({ error: error.code }, { status: error.code === "not-found" ? 404 : 409 });
    }
    throw error;
  }
}
