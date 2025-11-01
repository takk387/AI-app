import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TypeScript interfaces for diff format
interface DiffChange {
  type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND';
  line?: number;
  searchFor?: string;
  content?: string;
  replaceWith?: string;
}

interface FileDiff {
  path: string;
  action: 'MODIFY' | 'CREATE' | 'DELETE';
  changes: DiffChange[];
}

interface DiffResponse {
  changeType: 'MODIFICATION';
  summary: string;
  files: FileDiff[];
}

export async function POST(request: Request) {
  try {
    const { prompt, currentAppState, conversationHistory } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    if (!currentAppState) {
      return NextResponse.json({
        error: 'Current app state is required for modifications'
      }, { status: 400 });
    }

    const systemPrompt = `You are an expert code modification assistant. Your job is to generate MINIMAL, TARGETED changes to existing code - NOT rewrite entire files.

🎯 CRITICAL RULES FOR MODIFICATIONS:

1. **MINIMAL CHANGES ONLY**
   - Change ONLY what the user explicitly requested
   - Preserve ALL existing code that wasn't mentioned
   - Don't rewrite entire files - use surgical edits
   - Think: "What's the SMALLEST change to accomplish this?"

2. **DIFF FORMAT REQUIRED**
   - You MUST respond in the exact JSON diff format below
   - NO conversational text, NO markdown, ONLY valid JSON
   - Each change must be precise and targeted

3. **CHANGE TYPES AVAILABLE**
   - ADD_IMPORT: Add import at top of file
   - INSERT_AFTER: Insert code after a specific line/pattern
   - INSERT_BEFORE: Insert code before a specific line/pattern  
   - REPLACE: Replace specific code with new code
   - DELETE: Remove specific code
   - APPEND: Add code at end of file

4. **SEARCH PATTERNS**
   - Use unique, exact code snippets for searchFor
   - Include enough context to be unambiguous
   - Use actual code from the file, not summaries

📋 REQUIRED RESPONSE FORMAT:

\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Brief description of what was changed",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [darkMode, setDarkMode] = useState(false);"
        },
        {
          "type": "REPLACE",
          "searchFor": "<div className=\\"container\\">",
          "replaceWith": "<div className={\`container \${darkMode ? 'dark' : ''}\`}>"
        }
      ]
    }
  ]
}
\`\`\`

📝 EXAMPLES:

**Example 1: Add Dark Mode Toggle**
User request: "Add a dark mode toggle"
Current app has: Basic layout with container div

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added dark mode toggle button and state management",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [darkMode, setDarkMode] = useState(false);"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "<h1",
          "content": "      <button\\n        onClick={() => setDarkMode(!darkMode)}\\n        className=\\"px-4 py-2 bg-gray-800 text-white rounded\\"\\n      >\\n        {darkMode ? '☀️ Light' : '🌙 Dark'}\\n      </button>"
        },
        {
          "type": "REPLACE",
          "searchFor": "<div className=\\"min-h-screen",
          "replaceWith": "<div className={\`min-h-screen \${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}\`}"
        }
      ]
    }
  ]
}
\`\`\`

**Example 2: Fix Button Color**
User request: "Change the button to blue"

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Changed button color from gray to blue",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "REPLACE",
          "searchFor": "className=\\"px-4 py-2 bg-gray-500",
          "replaceWith": "className=\\"px-4 py-2 bg-blue-500"
        }
      ]
    }
  ]
}
\`\`\`

**Example 3: Add New Feature (Multiple Files)**
User request: "Add a counter that saves to localStorage"

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added counter with localStorage persistence",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState, useEffect } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [count, setCount] = useState(0);\\n\\n  useEffect(() => {\\n    const saved = localStorage.getItem('count');\\n    if (saved) setCount(parseInt(saved));\\n  }, []);\\n\\n  useEffect(() => {\\n    localStorage.setItem('count', count.toString());\\n  }, [count]);"
        },
        {
          "type": "INSERT_BEFORE",
          "searchFor": "</div>\\n    </div>\\n  );\\n}",
          "content": "      <div className=\\"mt-8\\">\\n        <button onClick={() => setCount(count + 1)}>Count: {count}</button>\\n      </div>"
        }
      ]
    }
  ]
}
\`\`\`

🚨 CRITICAL REMINDERS:

1. **NEVER include conversational text** - Only valid JSON
2. **NEVER rewrite entire files** - Only targeted changes
3. **ALWAYS use exact code snippets** in searchFor
4. **ALWAYS preserve existing functionality** unless explicitly asked to change it
5. **Response must be valid JSON** that can be parsed directly

Current App State:
${JSON.stringify(currentAppState, null, 2)}

Now generate the minimal diff to accomplish the user's request.`;

    console.log('Generating modifications with Claude Sonnet 4.5...');

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current modification request
    messages.push({ role: 'user', content: prompt });

    // Use streaming for better handling with timeout
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096, // Much smaller than full-app since we're only sending diffs
      temperature: 0.7,
      system: systemPrompt,
      messages: messages
    });

    // Collect the full response with timeout
    let responseText = '';
    const timeout = 45000; // 45 seconds
    const startTime = Date.now();
    
    try {
      for await (const chunk of stream) {
        if (Date.now() - startTime > timeout) {
          throw new Error('AI response timeout - the modification was taking too long. Please try a simpler request or try again.');
        }
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          responseText += chunk.delta.text;
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      throw new Error(streamError instanceof Error ? streamError.message : 'Failed to receive AI response');
    }
      
    console.log('Modification response length:', responseText.length, 'chars');
    console.log('Response preview:', responseText.substring(0, 500));
    
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse JSON response
    let diffResponse: DiffResponse;
    
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      
      diffResponse = JSON.parse(jsonString.trim());
      
      // Validate response structure
      if (!diffResponse.changeType || !diffResponse.summary || !diffResponse.files) {
        throw new Error('Invalid diff response structure');
      }
      
      console.log('Parsed diff response:', {
        changeType: diffResponse.changeType,
        summary: diffResponse.summary,
        filesCount: diffResponse.files.length
      });
      
    } catch (parseError) {
      console.error('Failed to parse diff response:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json({
        error: 'The AI had trouble understanding how to modify your app. This can happen with complex changes. Try breaking your request into smaller steps, or use simpler language.',
        suggestion: 'Try asking for one change at a time, like "add a button" or "change the color to blue".',
        technicalDetails: {
          responsePreview: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

    return NextResponse.json(diffResponse);
    
  } catch (error) {
    console.error('Error in modify route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate modifications' },
      { status: 500 }
    );
  }
}
