import { prisma } from "@/lib/db";
import { authenticateWorker } from "@/lib/worker-auth";
import { upsertProjectSnapshot } from "@/lib/project-status";

export async function POST(req: Request) {
  const identity = await authenticateWorker(req);
  if (!identity) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    projectSlug?: string;
    hasDefinition?: boolean;
    generatedAt?: string;
    snapshot?: unknown;
  } | null;
  if (!body?.projectSlug || typeof body.hasDefinition !== "boolean") {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }
  const result = await upsertProjectSnapshot(prisma, {
    projectSlug: body.projectSlug,
    hasDefinition: body.hasDefinition,
    generatedAt: body.generatedAt,
    snapshot: body.snapshot,
  });
  if (result.status === "unknown-project") return Response.json({ error: "unknown-project" }, { status: 409 });
  if (result.status === "payload-too-large") return Response.json({ error: "payload-too-large" }, { status: 413 });
  return Response.json(result);
}
