/**
 * OpenAI Proxy API Route
 *
 * Proxies requests to OpenAI API with usage tracking and billing.
 * Supports both regular and streaming chat completions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAPIGatewayService } from '@/services/api-gateway';
import type { OpenAIChatRequest } from '@/types/api-gateway';

/**
 * POST /api/proxy/openai
 *
 * Proxy a chat completion request to OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Get user and app IDs from headers (set by deployed app)
    const userId = request.headers.get('x-user-id');
    const appId = request.headers.get('x-app-id');

    if (!userId || !appId) {
      return NextResponse.json(
        { error: 'Missing required headers: x-user-id, x-app-id' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = (await request.json()) as OpenAIChatRequest;

    if (!body.model || !body.messages) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }

    const apiGateway = getAPIGatewayService();

    // Check if streaming is requested
    if (body.stream) {
      const result = await apiGateway.proxyOpenAIStream(body, userId, appId);

      if (!result.success || !result.stream) {
        return NextResponse.json(
          { error: result.error || 'Failed to create stream' },
          { status: 500 }
        );
      }

      // Return streaming response
      return new NextResponse(result.stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming request
    const result = await apiGateway.proxyOpenAI(body, userId, appId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return response with usage info
    const responseData = typeof result.data === 'object' && result.data !== null ? result.data : {};
    return NextResponse.json({
      ...(responseData as Record<string, unknown>),
      _usage: result.usage,
    });
  } catch (error) {
    console.error('[OpenAI Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
