/**
 * Creates a properly configured SSE (Server-Sent Events) Response.
 *
 * Includes all required headers for streaming through reverse proxies (Railway/Nginx):
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache
 * - Connection: keep-alive
 * - X-Accel-Buffering: no (prevents Nginx from buffering the stream)
 *
 * Use this for ALL SSE routes — never construct SSE headers manually.
 *
 * ## SSE Patterns in This Codebase
 *
 * **1. Pipeline TransformStream** (preferred for new routes)
 *    Used by: `/api/planning/stream/[sessionId]`, `/api/wizard/route.ts`
 *    Pattern: Create a `TransformStream`, write `data: JSON\n\n` events via
 *    `writer.write(encoder.encode(...))`, pass `readable` to this function.
 *    Best for: multi-stage pipelines with progress events.
 *
 * **2. Proxy Passthrough**
 *    Used by: `/api/ai/claude/route.ts`, `/api/ai/gemini/route.ts`
 *    Pattern: Forward the upstream AI SDK's ReadableStream directly.
 *    The SDK already emits SSE-formatted chunks. Just wrap with this function.
 *    Best for: proxying third-party streaming APIs.
 *
 * **3. Deprecated: Manual encoder loop** (avoid for new code)
 *    Some older routes use `new ReadableStream({ start(controller) { ... } })`.
 *    These work but are harder to reason about for cancellation and backpressure.
 *    Prefer TransformStream pattern instead.
 */
export function createSSEResponse(stream: ReadableStream, status = 200): Response {
  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
