/**
 * POST /api/figma/generate-code
 * Generate React components from LayoutDesign
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { FigmaGenerateCodeResponse } from '@/types/figma';

// CORS headers for Figma plugin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

const RequestSchema = z.object({
  layoutDesign: z.record(z.string(), z.unknown()),
  options: z
    .object({
      framework: z.enum(['react', 'next']).optional(),
      styling: z.enum(['tailwind', 'css-modules']).optional(),
      typescript: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: Request): Promise<NextResponse<FigmaGenerateCodeResponse>> {
  try {
    const body: unknown = await request.json();

    // Validate request
    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${parseResult.error.message}`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { layoutDesign, options } = parseResult.data;
    const framework = options?.framework || 'react';
    const styling = options?.styling || 'tailwind';
    const typescript = options?.typescript ?? true;

    // Initialize Anthropic client
    const anthropic = new Anthropic();

    // Build the prompt
    const prompt = buildCodeGenerationPrompt(layoutDesign as Record<string, unknown>, {
      framework,
      styling,
      typescript,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const files = parseGeneratedFiles(responseText, typescript);

    return NextResponse.json(
      {
        success: true,
        files,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Code generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during code generation',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

function buildCodeGenerationPrompt(
  layoutDesign: Record<string, unknown>,
  options: { framework: string; styling: string; typescript: boolean }
): string {
  const globalStyles = layoutDesign.globalStyles as Record<string, unknown> | undefined;
  const colors = (globalStyles?.colors as Record<string, string>) || {};
  const typography = (globalStyles?.typography as Record<string, string>) || {};
  const effects = (globalStyles?.effects as Record<string, string>) || {};
  const structure = layoutDesign.structure as Record<string, unknown> | undefined;

  return `Generate a ${options.framework === 'next' ? 'Next.js' : 'React'} component using ${options.styling === 'tailwind' ? 'Tailwind CSS' : 'CSS Modules'}${options.typescript ? ' with TypeScript' : ''}.

## Design Specifications

### Colors
${Object.entries(colors)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

### Typography
${Object.entries(typography)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

### Effects
${Object.entries(effects)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

### Layout Structure
${
  structure
    ? Object.entries(structure)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')
    : 'Standard layout'
}

## Requirements

1. Create a main layout component that implements the design system
2. Use the exact colors and typography specified
3. Include responsive breakpoints
4. ${options.styling === 'tailwind' ? 'Use Tailwind CSS classes with custom values where needed (e.g., bg-[#6366F1])' : 'Create CSS module files with the design tokens'}
5. Export the component as default

## Output Format

For each file, use this format:
\`\`\`filename:path/to/file.tsx
// file content here
\`\`\`

Generate the following files:
1. Main layout component (Layout.tsx or Layout.jsx)
2. ${options.styling === 'tailwind' ? 'globals.css with CSS variables' : 'CSS module file'}
3. Header component (if hasHeader is true)
4. Sidebar component (if hasSidebar is true)
5. Footer component (if hasFooter is true)

Make sure all components follow React best practices and are production-ready.`;
}

function parseGeneratedFiles(
  response: string,
  typescript: boolean
): FigmaGenerateCodeResponse['files'] {
  const files: FigmaGenerateCodeResponse['files'] = [];
  const fileRegex = /```filename:([^\n]+)\n([\s\S]*?)```/g;

  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();

    let language: 'typescript' | 'css' | 'json' = 'typescript';
    if (path.endsWith('.css')) language = 'css';
    else if (path.endsWith('.json')) language = 'json';

    files.push({ path, content, language });
  }

  // If no files were parsed with the filename format, try to extract code blocks
  if (files.length === 0) {
    const codeBlockRegex = /```(?:tsx?|jsx?|css)\n([\s\S]*?)```/g;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const content = match[1].trim();
      const ext = typescript ? '.tsx' : '.jsx';

      // Infer file type from content
      let path = `components/Component${blockIndex}${ext}`;
      let language: 'typescript' | 'css' | 'json' = 'typescript';

      if (content.includes('@tailwind') || content.includes(':root')) {
        path = 'globals.css';
        language = 'css';
      } else if (content.includes('export default function Layout')) {
        path = `components/Layout${ext}`;
      } else if (content.includes('Header')) {
        path = `components/Header${ext}`;
      } else if (content.includes('Sidebar')) {
        path = `components/Sidebar${ext}`;
      } else if (content.includes('Footer')) {
        path = `components/Footer${ext}`;
      }

      files.push({ path, content, language });
      blockIndex++;
    }
  }

  return files;
}
