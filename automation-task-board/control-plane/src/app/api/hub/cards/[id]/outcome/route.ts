import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { CardActionError } from "@/lib/cards";
import { recordHubOutcome, type HubOutcome } from "@/lib/hub-cards";

/** Hub 回寫 Figma Plugin 的 apply 結果（卡片不在待確認時只寫歷史）。 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { outcome?: string; errorCode?: string } | null;
  if (!body?.outcome) return Response.json({ error: "invalid-body" }, { status: 400 });
  try {
    const result = await recordHubOutcome(prisma, identity.memberId, id, body.outcome as HubOutcome, body.errorCode);
    return Response.json(result);
  } catch (error) {
    if (error instanceof CardActionError) {
      return Response.json({ error: error.code }, { status: error.code === "not-found" ? 404 : 400 });
    }
    throw error;
  }
}
