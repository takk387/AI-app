import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway/container orchestration
 * Returns 200 OK if the service is running
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
