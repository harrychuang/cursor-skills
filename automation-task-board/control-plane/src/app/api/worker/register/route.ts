import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { registerMachine } from "@/lib/queue";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    machineId?: string;
    label?: string;
    runners?: string[];
    projects?: Array<{ slug?: string }>;
  } | null;
  if (!body?.machineId || !Array.isArray(body.runners) || !Array.isArray(body.projects)) {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  const projects = body.projects.filter((p): p is { slug: string } => typeof p.slug === "string" && p.slug !== "");
  const result = await registerMachine(prisma, identity, {
    machineId: body.machineId,
    label: body.label,
    runners: body.runners,
    projects,
  });
  return Response.json({ accepted: result.accepted });
}
