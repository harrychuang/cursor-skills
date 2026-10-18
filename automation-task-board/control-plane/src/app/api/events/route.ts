import { currentMemberId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { boardWatermark } from "@/lib/board";

export const dynamic = "force-dynamic";

const POLL_MS = 2000;

/** SSE：watermark 前進時推播 refresh，客戶端據此重新抓看板／log。 */
export async function GET(req: Request) {
  const memberId = await currentMemberId();
  if (!memberId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let last = await boardWatermark(prisma);
      controller.enqueue(encoder.encode(`event: hello\ndata: ${last}\n\n`));
      timer = setInterval(async () => {
        if (closed) return;
        try {
          const current = await boardWatermark(prisma);
          if (current !== last) {
            last = current;
            controller.enqueue(encoder.encode(`event: refresh\ndata: ${current}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`: keepalive\n\n`));
          }
        } catch {
          // 資料庫暫時無法讀取：跳過本輪
        }
      }, POLL_MS);
      req.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // 已關閉
        }
      });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
