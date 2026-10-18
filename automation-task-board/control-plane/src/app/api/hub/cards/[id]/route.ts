import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { CardActionError } from "@/lib/cards";
import { getHubCardStatus } from "@/lib/hub-cards";

/** Hub 查派工卡狀態：只回欄位、是否放行、需要處理原因。 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  try {
    return Response.json(await getHubCardStatus(prisma, id));
  } catch (error) {
    if (error instanceof CardActionError) return Response.json({ error: error.code }, { status: 404 });
    throw error;
  }
}
