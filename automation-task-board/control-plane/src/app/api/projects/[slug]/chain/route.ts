import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setProjectChain } from "@/lib/cards";

/** 設定專案任務鏈（整組取代）。 */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    entries?: Array<{ taskId?: string; requiresReview?: boolean }>;
  } | null;
  if (!Array.isArray(body?.entries) || body.entries.some((e) => typeof e.taskId !== "string" || e.taskId === "")) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  const chain = await setProjectChain(prisma, {
    projectSlug: slug,
    entries: body.entries as Array<{ taskId: string; requiresReview?: boolean }>,
  });
  return Response.json({ chain });
}
