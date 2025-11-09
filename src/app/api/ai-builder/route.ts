import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateGeneratedCode, autoFixCode, type ValidationError } from '@/utils/codeValidator';
import { analytics, generateRequestId, categorizeError, PerformanceTracker } from '@/utils/analytics';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // ============================================================================
  // ANALYTICS - Phase 4: Track request metrics
  // ============================================================================
  const requestId = generateRequestId();
  const perfTracker = new PerformanceTracker();
  
  try {
    const { prompt, conversationHistory } = await request.json();
    perfTracker.checkpoint('request_parsed');
    
    // Log request start after parsing body
    analytics.logRequestStart('ai-builder', requestId, {
      hasConversationHistory: !!conversationHistory,
    });

    console.log('Environment check:', {
      hasKey: !!process.env.ANTHROPIC_API_KEY,
      keyLength: process.env.ANTHROPIC_API_KEY?.length
    });

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Anthropic API key not configured, using demo mode');
      return NextResponse.json({
        code: `import { useState } from 'react';\n\nexport default function GeneratedComponent() {\n  const [value, setValue] = useState('');\n  \n  return (\n    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">\n      <h2 className="text-2xl font-bold mb-4 text-gray-800">Demo Component</h2>\n      <p className="text-sm text-gray-600 mb-4">Add your Anthropic API key to .env.local for full AI generation</p>\n      <input \n        value={value}\n        onChange={(e) => setValue(e.target.value)}\n        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"\n        placeholder="Type something..."\n      />\n      <p className="mt-3 text-sm text-gray-500">You typed: {value}</p>\n    </div>\n  );\n}`,
        explanation: "This is a demo component. Configure your Anthropic API key (ANTHROPIC_API_KEY) in .env.local to enable full AI generation with Claude.",
        name: "Demo Component"
      });
    }

    // Create a comprehensive system prompt for conversation-based generation
    const systemPrompt = `You are an expert React/TypeScript component generator. Generate production-ready, modern React components through natural conversation.

Rules:
1. Use functional components with TypeScript
2. Include proper TypeScript interfaces/types for reusability
3. Use modern React hooks (useState, useEffect, etc.) ONLY when necessary
4. Apply Tailwind CSS for styling
5. Follow React best practices and patterns
6. Include proper error handling and validation where needed
7. Make components accessible (ARIA labels, semantic HTML)
8. Keep components clean and modular

CRITICAL FOR PREVIEW - Use this exact pattern:
- Generate a default export function that returns PURE HTML with hardcoded values
- Include the reusable component definition separately, but the default export should show it in action
- NO props in the main return statement - use actual text values
- Example structure:

\`\`\`typescript
import React from 'react';

// Reusable component with props
interface ButtonProps {
  label: string;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      {label}
    </button>
  );
};

// Demo with hardcoded values for preview
export default function Demo() {
  return (
    <div className="p-8 space-y-4">
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Click Me
      </button>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Submit
      </button>
    </div>
  );
}
\`\`\`

Notice: The Demo function returns plain HTML elements with hardcoded text like "Click Me" and "Submit", NOT {label} or props.

Respond in this EXACT format using these delimiters:

===NAME===
Short component name (3-5 words)
===EXPLANATION===
Brief explanation of what you built and key features
===CODE===
The complete TypeScript/React component code here
===END===

CRITICAL RULES:
- The default export Demo must have ZERO curly braces with variables - only hardcoded text values!
- Use the EXACT delimiters shown above (===NAME===, ===EXPLANATION===, ===CODE===, ===END===)
- Code goes between ===CODE=== and ===END===
- Code can have any formatting - no escaping needed
- Do NOT wrap in markdown code blocks
- Do NOT add any text before ===NAME=== or after ===END===
`;

    // Build conversation context for Claude
    const messages: any[] = [];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current user prompt
    messages.push({ role: 'user', content: prompt });

    console.log('Generating component with Claude Sonnet 4.5...');
    perfTracker.checkpoint('prompt_built');

    const modelName = 'claude-sonnet-4-5-20250929';
    const completion = await anthropic.messages.create({
      model: modelName,
      max_tokens: 4096,
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: messages,
    });
    
    perfTracker.checkpoint('ai_response_received');
    
    // Log token usage
    if (completion.usage) {
      analytics.logTokenUsage(
        requestId,
        completion.usage.input_tokens || 0,
        completion.usage.output_tokens || 0,
        // @ts-ignore - cache_read_input_tokens might not be in types yet
        completion.usage.cache_read_input_tokens || 0
      );
    }

    const responseText = completion.content[0].type === 'text' ? completion.content[0].text : '';
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    console.log('Raw Claude response length:', responseText.length);

    // Parse using delimiters - bulletproof method
    const nameMatch = responseText.match(/===NAME===\s*([\s\S]*?)\s*===EXPLANATION===/);
    const explanationMatch = responseText.match(/===EXPLANATION===\s*([\s\S]*?)\s*===CODE===/);
    const codeMatch = responseText.match(/===CODE===\s*([\s\S]*?)\s*===END===/);

    if (!nameMatch || !explanationMatch || !codeMatch) {
      console.error('Failed to parse response');
      console.log('Response preview:', responseText.substring(0, 500));
      
      analytics.logRequestError(requestId, 'Failed to parse delimiter-based response', 'parsing_error', {
        modelUsed: modelName,
        responseLength: responseText.length,
      });
      
      throw new Error('Invalid response format from AI. Please try again.');
    }

    const aiResponse = {
      name: nameMatch[1].trim(),
      explanation: explanationMatch[1].trim(),
      code: codeMatch[1].trim()
    };
    
    console.log('Successfully parsed:', {
      name: aiResponse.name,
      codeLength: aiResponse.code.length
    });
    perfTracker.checkpoint('response_parsed');
    
    // Ensure code is a string
    if (aiResponse.code && typeof aiResponse.code === 'object') {
      aiResponse.code = JSON.stringify(aiResponse.code);
    }

    // ============================================================================
    // VALIDATION LAYER - Validate generated component code
    // ============================================================================
    console.log('🔍 Validating generated component...');
    
    // Assume TypeScript component (this route generates .tsx components)
    const validation = validateGeneratedCode(aiResponse.code, 'Component.tsx');
    
    let validationWarnings;
    
    if (!validation.valid) {
      console.log(`⚠️ Found ${validation.errors.length} error(s) in generated component`);
      
      // Log each error
      validation.errors.forEach(err => {
        console.log(`  - Line ${err.line}: ${err.message}`);
      });
      
      // Attempt auto-fix
      const fixedCode = autoFixCode(aiResponse.code, validation.errors);
      if (fixedCode !== aiResponse.code) {
        console.log(`✅ Auto-fixed errors in component`);
        aiResponse.code = fixedCode;
        
        // Re-validate after fix
        const revalidation = validateGeneratedCode(fixedCode, 'Component.tsx');
        if (!revalidation.valid) {
          // Some errors couldn't be auto-fixed
          validationWarnings = {
            hasWarnings: true,
            message: `Code validation detected ${revalidation.errors.length} potential issue(s). The component has been generated but may need manual review.`,
            errors: revalidation.errors
          };
        } else {
          console.log(`✅ Component validated successfully after auto-fix`);
        }
      } else {
        // No auto-fix possible
        validationWarnings = {
          hasWarnings: true,
          message: `Code validation detected ${validation.errors.length} potential issue(s). The component has been generated but may need manual review.`,
          errors: validation.errors
        };
      }
    } else {
      console.log(`✅ Component validated successfully - no errors found`);
    }
    
    perfTracker.checkpoint('validation_complete');
    
    // Log validation to analytics
    const totalErrors = validation.valid ? 0 : validation.errors.length;
    const fixedErrors = validationWarnings ? 
      totalErrors - (validationWarnings.errors?.length || 0) : 
      totalErrors;
    
    if (totalErrors > 0) {
      analytics.logValidation(requestId, totalErrors, fixedErrors);
    }
    
    perfTracker.checkpoint('response_prepared');
    
    // Log successful completion
    analytics.logRequestComplete(requestId, {
      modelUsed: modelName,
      promptLength: Math.round(systemPrompt.length / 4),
      responseLength: responseText.length,
      validationRan: true,
      validationIssuesFound: totalErrors,
      validationIssuesFixed: fixedErrors,
      metadata: {
        componentName: aiResponse.name,
        codeLength: aiResponse.code.length,
      },
    });
    
    if (process.env.NODE_ENV === 'development') {
      perfTracker.log('AI Builder Route');
    }

    return NextResponse.json({
      ...aiResponse,
      ...(validationWarnings && { validationWarnings })
    });
  } catch (error) {
    console.error('Error in AI builder route:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Log error to analytics
    analytics.logRequestError(
      requestId,
      error as Error,
      categorizeError(error as Error)
    );
    
    // If model not found, provide helpful error message
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message.includes('model')) {
        return NextResponse.json(
          { error: `Model not found: ${error.message}. Please check your Anthropic console at https://console.anthropic.com/ for available models.` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
