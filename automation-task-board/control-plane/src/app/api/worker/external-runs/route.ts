import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { ingestExternalRuns, type ExternalRunInput } from "@/lib/project-status";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    projectSlug?: string;
    machineId?: string;
    runs?: ExternalRunInput[];
  } | null;
  if (!body?.projectSlug || !Array.isArray(body.runs)) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  const result = await ingestExternalRuns(prisma, body.projectSlug, body.runs, body.machineId);
  if (result.status === "unknown-project") return Response.json({ error: "unknown-project" }, { status: 409 });
  return Response.json(result);
}
