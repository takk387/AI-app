import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt || 'no prompt provided';

    // Placeholder: echo back the prompt. Replace with OpenAI call when ready.
    const result = {
      success: true,
      prompt,
      generated: `Echo: ${prompt}`,
      code: `// Example component for prompt: ${prompt}\nexport default function Example(){ return null }`,
      timestamp: new Date().toISOString(),
      model: 'demo',
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
