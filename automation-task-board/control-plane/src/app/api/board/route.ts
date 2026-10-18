import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBoardState } from "@/lib/board";

export async function GET() {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  return Response.json(await getBoardState(prisma));
}
