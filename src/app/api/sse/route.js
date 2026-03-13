import { clients } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    let controller;

    const stream = new ReadableStream({
        start(c) {
            controller = c;
            clients.add(controller);

            // Send initial ping
            controller.enqueue(new TextEncoder().encode(": connected\n\n"));
        },
        cancel() {
            clients.delete(controller);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
