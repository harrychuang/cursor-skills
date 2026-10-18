import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCard } from "@/lib/cards";

/** member 手動建卡。 */
export async function POST(req: Request) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    projectSlug?: string;
    taskId?: string;
    note?: string;
    autoRun?: boolean;
    reviewGate?: boolean;
  } | null;
  if (!body?.projectSlug || !body.taskId) return Response.json({ error: "invalid-body" }, { status: 400 });
  const card = await createCard(prisma, memberId, {
    projectSlug: body.projectSlug,
    taskId: body.taskId,
    note: body.note,
    autoRun: body.autoRun,
    reviewGate: body.reviewGate,
  });
  return Response.json({ card }, { status: 201 });
}
