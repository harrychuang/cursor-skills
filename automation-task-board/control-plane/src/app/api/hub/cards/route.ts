import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { CardActionError } from "@/lib/cards";
import { createHubCard } from "@/lib/hub-cards";

/** Design Automation Hub 派工建卡（worker token 認證，成員即 token 擁有者）。 */
export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    projectSlug?: string;
    taskId?: string;
    hubAutomationTaskId?: string;
    note?: string;
  } | null;
  if (!body?.projectSlug || !body.taskId || !body.hubAutomationTaskId) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  try {
    const result = await createHubCard(prisma, identity.memberId, {
      projectSlug: body.projectSlug,
      taskId: body.taskId,
      hubAutomationTaskId: body.hubAutomationTaskId,
      note: body.note,
    });
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof CardActionError) return Response.json({ error: error.code }, { status: 400 });
    throw error;
  }
}
