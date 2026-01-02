/**
 * Generate Design Options API Route
 *
 * Generates multiple design variations based on user request and element context.
 * Returns 2-3 options for the user to choose from.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { LayoutDesign, SelectedElementInfo } from '@/types/layoutDesign';
import type { DesignOption } from '@/components/layout-builder/DesignOptionsPanel';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface GenerateOptionsRequest {
  /** User's design request */
  request: string;
  /** Currently selected element (if any) */
  element?: SelectedElementInfo | null;
  /** Current design state */
  currentDesign?: Partial<LayoutDesign>;
  /** Number of options to generate (default: 3) */
  count?: number;
}

interface GenerateOptionsResponse {
  options: DesignOption[];
  error?: string;
}

/**
 * Build the system prompt for option generation
 */
function buildSystemPrompt(
  element?: SelectedElementInfo | null,
  currentDesign?: Partial<LayoutDesign>
): string {
  const elementContext = element
    ? `
The user has selected a ${element.type} element (id: "${element.id}").
Display name: ${element.displayName || element.type}
Current properties: ${JSON.stringify(element.currentProperties, null, 2)}
`
    : '';

  return `You are a design assistant helping to generate multiple design options for a layout builder.

${elementContext}

Current design state:
${JSON.stringify(currentDesign || {}, null, 2)}

Your task is to generate design variations based on the user's request. Each option should be distinct and clearly different from the others.

IMPORTANT: Respond ONLY with a valid JSON array of design options. Each option must have:
- id: A unique identifier (e.g., "option-1", "option-2")
- description: A short, descriptive name (e.g., "Clean and Minimal", "Bold and Modern")
- changes: An object containing the LayoutDesign properties to change

Example response format:
[
  {
    "id": "option-1",
    "description": "Clean and Minimal",
    "changes": {
      "globalStyles": {
        "colors": {
          "primary": "#3B82F6"
        }
      }
    }
  },
  {
    "id": "option-2",
    "description": "Bold and Vibrant",
    "changes": {
      "globalStyles": {
        "colors": {
          "primary": "#EF4444"
        }
      }
    }
  }
]

Do not include any text before or after the JSON array. Only output the JSON.`;
}

export async function POST(request: Request): Promise<NextResponse<GenerateOptionsResponse>> {
  try {
    const body: GenerateOptionsRequest = await request.json();
    const { request: userRequest, element, currentDesign, count = 3 } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { options: [], error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    if (!userRequest) {
      return NextResponse.json({ options: [], error: 'Request is required' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(element, currentDesign);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.8, // Higher temperature for more variety
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} distinct design options for: "${userRequest}"`,
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ options: [], error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response
    try {
      const rawText = textContent.text.trim();
      // Handle potential markdown code blocks
      const jsonText = rawText.startsWith('```')
        ? rawText
            .replace(/```json?\n?/g, '')
            .replace(/```\n?$/g, '')
            .trim()
        : rawText;

      const parsedOptions = JSON.parse(jsonText);

      if (!Array.isArray(parsedOptions)) {
        throw new Error('Response is not an array');
      }

      // Validate and normalize options
      const options: DesignOption[] = parsedOptions.map((opt, index) => ({
        id: opt.id || `option-${index + 1}`,
        description: opt.description || `Option ${index + 1}`,
        changes: opt.changes || {},
        preview: opt.preview,
        thumbnail: opt.thumbnail,
      }));

      return NextResponse.json({ options });
    } catch (parseError) {
      console.error('[generate-options] Failed to parse AI response:', parseError);
      console.error('[generate-options] Raw response:', textContent.text);

      // Return a fallback option
      return NextResponse.json({
        options: [
          {
            id: 'fallback-1',
            description: 'Default Option',
            changes: {},
          },
        ],
        error: 'Failed to parse AI response, returning default option',
      });
    }
  } catch (error) {
    console.error('[generate-options] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ options: [], error: message }, { status: 500 });
  }
}
