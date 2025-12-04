import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isMockAIEnabled, mockChatResponse } from '@/utils/mockAI';
import { logAPI } from '@/utils/debug';

// Vercel serverless function config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // Mock AI Mode check - return instant mock response if enabled
  if (isMockAIEnabled()) {
    logAPI('POST', '/api/chat', { mock: true });
    return NextResponse.json({
      message: mockChatResponse.message,
      tokensUsed: mockChatResponse.tokensUsed,
      _mock: true,
    });
  }

  try {
    const {
      prompt,
      conversationHistory,
      includeCodeInResponse = false,
      mode = 'ACT',
      currentAppState,
      image,
      hasImage,
    } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local',
        },
        { status: 500 }
      );
    }

    // Build current app context section if we have an app loaded
    let currentAppContext = '';
    if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
      currentAppContext = `

===CURRENT APP CONTEXT===
The user has an app loaded. Here is the current state:

App Name: ${currentAppState.name || 'Unnamed App'}
App Type: ${currentAppState.appType || 'Unknown'}
Files in the app:
${currentAppState.files.map((f: any) => `- ${f.path}`).join('\n')}

FILE CONTENTS:
${currentAppState.files
  .map(
    (f: any) => `
--- ${f.path} ---
${f.content}
--- END ${f.path} ---
`
  )
  .join('\n')}
===END CURRENT APP CONTEXT===

When discussing the app, reference the actual code above. You can see exactly what has been built.`;
    }

    // Different system prompts based on mode
    let systemPrompt: string;

    if (mode === 'PLAN') {
      // PLAN MODE: Focus on planning, requirements, and architecture
      systemPrompt = `You are an AI planning and requirements specialist. In PLAN MODE, you help users design and plan their applications.

**Your Role:**
- Help design app architecture and requirements
- Ask clarifying questions to understand needs
- Create roadmaps and feature specifications
- Discuss best practices and approaches
- Break complex features into actionable steps
${currentAppContext ? '- Reference the CURRENT APP CONTEXT below when discussing the existing app' : ''}

**CRITICAL RULES:**
- DO NOT generate any code, components, or implementation details
- DO NOT write actual functions, classes, or HTML/CSS
- Focus on WHAT to build, not HOW to implement it
- Use plain English to describe features and requirements
- Create bullet-point plans and specifications
- Ask questions to refine the requirements
${currentAppContext ? '- When discussing the current app, reference specific files and features that exist' : ''}

**Example Interaction:**
User: "I want a todo app"
You: "Great! Let's plan that out. A todo app typically needs:
- Task creation and deletion
- Task completion tracking
- Optional: Priority levels, due dates, categories
- Data persistence (localStorage or backend?)

What features are most important to you? Do you need:
1. Just basic add/delete/complete?
2. Advanced features like priorities or due dates?
3. User accounts or just local storage?"

Remember: You're designing the blueprint, not building the house. No code in PLAN mode.${currentAppContext}`;
    } else {
      // ACT MODE: Can answer questions with or without code
      systemPrompt = includeCodeInResponse
        ? `You are a helpful AI programming assistant. You can:
1. Answer programming questions clearly and concisely
2. Explain concepts, best practices, and provide code examples
3. Help debug issues and suggest solutions
4. Provide guidance on React, TypeScript, Next.js, and web development
${currentAppContext ? '5. Reference the CURRENT APP CONTEXT below when answering questions about the loaded app' : ''}

Keep your answers:
- Clear and easy to understand
- Include code examples when helpful (use markdown code blocks)
- Focused and relevant to the question
- Practical and actionable
${currentAppContext ? '- When discussing the current app, reference specific code and files that exist' : ''}

You are NOT generating full apps in this mode - just having a helpful conversation.${currentAppContext}`
        : `You are a helpful AI programming assistant. You can:
1. Answer programming questions clearly and concisely
2. Explain concepts, best practices, and approaches
3. Help debug issues and suggest solutions
4. Provide guidance on React, TypeScript, Next.js, and web development
${currentAppContext ? '5. Reference the CURRENT APP CONTEXT below when answering questions about the loaded app' : ''}

Keep your answers:
- Clear and easy to understand
- Focused on explaining concepts and approaches WITHOUT showing code
- Use natural language descriptions instead of code blocks
- Practical and actionable
${currentAppContext ? '- When discussing the current app, reference the actual structure and components that exist' : ''}

IMPORTANT: Do NOT include code snippets, code examples, or code blocks in your response unless the user explicitly asks to "see the code" or "show me the code". Instead, describe solutions in plain English.

You are NOT generating full apps in this mode - just having a helpful conversation.${currentAppContext}`;
    }

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant' && msg.content) {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add user message with optional image
    if (hasImage && image) {
      const imageMatch = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (imageMatch) {
        let mediaType = imageMatch[1];
        const base64Data = imageMatch[2];

        const validMediaTypes: { [key: string]: string } = {
          'image/jpeg': 'image/jpeg',
          'image/jpg': 'image/jpeg',
          'image/png': 'image/png',
          'image/gif': 'image/gif',
          'image/webp': 'image/webp',
        };

        const normalizedType = validMediaTypes[mediaType.toLowerCase()];
        if (!normalizedType) {
          console.error('Unsupported image type:', mediaType);
          throw new Error(
            `Unsupported image type: ${mediaType}. Please use JPEG, PNG, GIF, or WebP.`
          );
        }

        console.log('Image media type:', normalizedType, 'Original:', mediaType);

        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizedType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        });
      } else {
        console.error('Invalid image data URL format');
        messages.push({ role: 'user', content: prompt });
      }
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    console.log('Chat Q&A with Claude...');

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10000, // Must be > budget_tokens (5000 thinking + 5000 response)
      temperature: 1, // Required for extended thinking
      thinking: {
        type: 'enabled',
        budget_tokens: 5000,
      },
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages,
    });

    // Find the text response (skip thinking blocks)
    const textBlock = completion.content.find((block) => block.type === 'text');
    const responseText = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    if (!responseText) {
      throw new Error('No response from Claude');
    }

    return NextResponse.json({
      answer: responseText,
      type: 'chat',
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get response' },
      { status: 500 }
    );
  }
}
