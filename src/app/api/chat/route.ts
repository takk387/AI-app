import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, conversationHistory, includeCodeInResponse = false } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    const systemPrompt = includeCodeInResponse 
      ? `You are a helpful AI programming assistant. You can:
1. Answer programming questions clearly and concisely
2. Explain concepts, best practices, and provide code examples
3. Help debug issues and suggest solutions
4. Provide guidance on React, TypeScript, Next.js, and web development

Keep your answers:
- Clear and easy to understand
- Include code examples when helpful (use markdown code blocks)
- Focused and relevant to the question
- Practical and actionable

You are NOT generating full apps in this mode - just having a helpful conversation.`
      : `You are a helpful AI programming assistant. You can:
1. Answer programming questions clearly and concisely
2. Explain concepts, best practices, and approaches
3. Help debug issues and suggest solutions
4. Provide guidance on React, TypeScript, Next.js, and web development

Keep your answers:
- Clear and easy to understand
- Focused on explaining concepts and approaches WITHOUT showing code
- Use natural language descriptions instead of code blocks
- Practical and actionable

IMPORTANT: Do NOT include code snippets, code examples, or code blocks in your response unless the user explicitly asks to "see the code" or "show me the code". Instead, describe solutions in plain English.

You are NOT generating full apps in this mode - just having a helpful conversation.`;

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

    messages.push({ role: 'user', content: prompt });

    console.log('Chat Q&A with Claude...');

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });

    const responseText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '';
      
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    return NextResponse.json({
      answer: responseText,
      type: 'chat'
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get response' },
      { status: 500 }
    );
  }
}
