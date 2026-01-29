import { NextRequest, NextResponse } from 'next/server';
import { getGeminiLayoutService } from '@/services/GeminiLayoutService';

export async function POST(req: NextRequest) {
  try {
    // Parse request body ONCE - fixes bug where req.json() was called multiple times
    const body = await req.json();
    const { action, images, image, instructions, component, prompt, original, current } = body;

    const service = getGeminiLayoutService();

    switch (action) {
      case 'analyze-image':
        if (!image) {
          return NextResponse.json({ error: 'Image required' }, { status: 400 });
        }
        // Use two-stage architecture - now returns { components, designSpec, errors, ... }
        const analysis = await service.analyzeImageTwoStage(image, instructions);
        return NextResponse.json(analysis);

      case 'analyze-video-flow':
        if (!images || !Array.isArray(images)) {
          return NextResponse.json({ error: 'Keyframes required' }, { status: 400 });
        }
        const motion = await service.analyzeVideoFlow(images, instructions);
        return NextResponse.json(motion);

      case 'edit-component':
        if (!component || !prompt) {
          return NextResponse.json({ error: 'Component and prompt required' }, { status: 400 });
        }
        const edited = await service.editComponent(component, prompt);
        return NextResponse.json(edited);

      case 'critique':
        if (!original || !current) {
          return NextResponse.json({ error: 'Both images required' }, { status: 400 });
        }
        const critique = await service.critiqueLayout(original, current);
        return NextResponse.json(critique);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Gemini Layout API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
