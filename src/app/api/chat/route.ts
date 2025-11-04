import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, conversationHistory, includeCodeInResponse = false, mode = 'ACT' } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
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

**CRITICAL RULES:**
- DO NOT generate any code, components, or implementation details
- DO NOT write actual functions, classes, or HTML/CSS
- Focus on WHAT to build, not HOW to implement it
- Use plain English to describe features and requirements
- Create bullet-point plans and specifications
- Ask questions to refine the requirements

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

Remember: You're designing the blueprint, not building the house. No code in PLAN mode.`;
    } else {
      // ACT MODE: Can answer questions with or without code
      systemPrompt = includeCodeInResponse 
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
