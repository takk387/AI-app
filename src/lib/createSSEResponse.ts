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
