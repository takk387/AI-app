import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// PHASE TYPES
// ============================================================================

interface Phase {
  number: number;
  name: string;
  description: string;
  features: string[];
  status: 'pending' | 'building' | 'complete';
}

// ============================================================================
// FIX 3.1: FLEXIBLE REGEX + FALLBACK PARSING
// ============================================================================

/**
 * Primary (strict) parser - expects exact delimiter format
 */
function parsePhasesStrict(responseText: string): Phase[] {
  const phases: Phase[] = [];
  
  // Strict regex that handles multi-line descriptions
  const strictPhaseRegex = /===PHASE:(\d+)===\s*NAME:\s*([^\n]+)\s*DESCRIPTION:\s*([^\n]+(?:\n(?!FEATURES:)[^\n]+)*)\s*FEATURES:\s*([\s\S]*?)(?===PHASE:|===END_PHASES===|$)/g;
  
  const matches = responseText.matchAll(strictPhaseRegex);
  
  for (const match of matches) {
    const phaseNumber = parseInt(match[1]);
    const name = match[2].trim();
    const description = match[3].trim().replace(/\n/g, ' ');
    const featuresText = match[4].trim();
    
    const features = featuresText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))
      .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    if (name && features.length > 0) {
      phases.push({
        number: phaseNumber,
        name,
        description: description || name,
        features,
        status: 'pending'
      });
    }
  }
  
  return phases.sort((a, b) => a.number - b.number);
}

/**
 * Lenient parser - handles various response formats
 */
function parsePhasesLenient(responseText: string): Phase[] {
  const phases: Phase[] = [];
  
  // Try multiple patterns
  const patterns = [
    // Pattern 1: "Phase 1: Name" or "Phase 1 - Name"
    /Phase\s*(\d+)[:\-]\s*([^\n]+)\n([\s\S]*?)(?=Phase\s*\d+|$)/gi,
    // Pattern 2: "1. Name" or "1) Name"
    /^(\d+)[.\)]\s*([^\n]+)\n([\s\S]*?)(?=^\d+[.\)]|$)/gim,
    // Pattern 3: "### Phase 1: Name" (markdown headers)
    /#{1,3}\s*Phase\s*(\d+)[:\-]?\s*([^\n]+)\n([\s\S]*?)(?=#{1,3}\s*Phase|$)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = responseText.matchAll(pattern);
    
    for (const match of matches) {
      const phaseNumber = parseInt(match[1]);
      const name = match[2].trim();
      const content = match[3].trim();
      
      // Extract features from content
      const features = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.match(/^\d+\./))
        .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0 && line.length < 200);
      
      if (name && features.length > 0 && !phases.some(p => p.number === phaseNumber)) {
        phases.push({
          number: phaseNumber,
          name: name.substring(0, 50),
          description: name,
          features: features.slice(0, 10),
          status: 'pending'
        });
      }
    }
    
    if (phases.length > 0) break;
  }
  
  return phases.sort((a, b) => a.number - b.number);
}

/**
 * Extract phases with retry - asks Claude to reformat if parsing fails
 */
async function extractPhasesWithRetry(
  responseText: string,
  anthropicClient: Anthropic,
  maxRetries: number = 2
): Promise<Phase[]> {
  // Try strict parsing first
  let phases = parsePhasesStrict(responseText);
  if (phases.length > 0) {
    console.log(`✅ Strict parser extracted ${phases.length} phases`);
    return phases;
  }
  
  // Try lenient parsing
  console.log('⚠️ Strict parsing failed, trying lenient parser...');
  phases = parsePhasesLenient(responseText);
  if (phases.length > 0) {
    console.log(`✅ Lenient parser extracted ${phases.length} phases`);
    return phases;
  }
  
  // Retry with correction prompt
  console.log('⚠️ Both parsers failed, attempting reformat retry...');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const correctionResponse = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.5,
        messages: [{
          role: 'user',
          content: `Your previous response couldn't be parsed. Please reformat it using EXACTLY this structure:

===TOTAL_PHASES===
[number]
===PHASE:1===
NAME: [name - max 5 words]
DESCRIPTION: [description - one sentence]
FEATURES:
- [feature 1]
- [feature 2]
===PHASE:2===
NAME: [name]
DESCRIPTION: [description]
FEATURES:
- [feature 1]
===END_PHASES===

Original response to reformat:
${responseText.substring(0, 3000)}`
        }]
      });
      
      const textBlock = correctionResponse.content.find(block => block.type === 'text');
      const reformatted = textBlock && textBlock.type === 'text' ? textBlock.text : '';
      
      phases = parsePhasesStrict(reformatted);
      if (phases.length > 0) {
        console.log(`✅ Reformat retry ${attempt + 1} succeeded with ${phases.length} phases`);
        return phases;
      }
    } catch (retryError) {
      console.error(`Reformat retry ${attempt + 1} failed:`, retryError);
    }
  }
  
  return [];
}

// ============================================================================
// FIX 3.7: ENHANCED SYSTEM PROMPT
// ============================================================================

const ENHANCED_SYSTEM_PROMPT = `You are an expert software architect creating a phased implementation plan.

## Your Task
Analyze the user's request and break it into buildable phases.

## CRITICAL FORMAT RULES
You MUST use this EXACT format. Do not deviate:

===TOTAL_PHASES===
[number between 2 and 5]
===PHASE:1===
NAME: [Short name, max 5 words]
DESCRIPTION: [One sentence, max 20 words]
FEATURES:
- [Feature 1]
- [Feature 2]
- [Feature 3]
===PHASE:2===
NAME: [Short name]
DESCRIPTION: [One sentence]
FEATURES:
- [Feature 1]
- [Feature 2]
===END_PHASES===

## Phase Guidelines
1. Phase 1 MUST be a working app (not a skeleton)
2. Each phase adds 2-4 features maximum
3. Each phase should be independently testable
4. Earlier phases provide foundation for later phases
5. Keep descriptions SHORT - one sentence max
6. Complex features (auth, database, payments) should be isolated to their own phase

## Example Output
===TOTAL_PHASES===
3
===PHASE:1===
NAME: Core Todo Functionality
DESCRIPTION: Basic todo list with add, complete, and delete features.
FEATURES:
- Add new todos with text input
- Mark todos as complete with checkbox
- Delete todos with remove button
- Display todo count
===PHASE:2===
NAME: Data Persistence
DESCRIPTION: Save todos to localStorage for persistence.
FEATURES:
- Save todos to localStorage on change
- Load todos from localStorage on startup
- Clear all completed todos button
===PHASE:3===
NAME: Enhanced UX
DESCRIPTION: Add filtering, sorting, and visual improvements.
FEATURES:
- Filter by: All, Active, Completed
- Sort by date or alphabetically
- Smooth animations for add/remove
- Dark mode toggle
===END_PHASES===

IMPORTANT: Start your response with ===TOTAL_PHASES=== - no introduction or explanation before it.`;

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const { conversationHistory, prompt } = await request.json();
    const userRequest = prompt;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured'
      }, { status: 500 });
    }

    // Build conversation context with size limit
    const messages: any[] = [];
    
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Limit conversation history to last 20 messages to avoid context overflow
      const recentHistory = conversationHistory.slice(-20);
      
      recentHistory.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          // Truncate very long messages
          const content = typeof msg.content === 'string' 
            ? msg.content.substring(0, 2000) 
            : msg.content;
          messages.push({ 
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content 
          });
        }
      });
    }

    // Add the analysis request
    messages.push({ 
      role: 'user', 
      content: `Analyze this conversation and extract a phase-by-phase implementation plan for the app described. The user has requested: "${userRequest}"\n\nIMPORTANT: Use the EXACT delimiter format specified (===PHASE:1===, etc.). Start with ===TOTAL_PHASES===.`
    });

    console.log('📋 Extracting phase plan from conversation...');

    // ============================================================================
    // FIX 3.2: STREAMING API WITH TIMEOUT
    // ============================================================================
    
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,  // Must be > budget_tokens (10000 thinking + 6000 response)
      temperature: 1,
      thinking: {
        type: 'enabled',
        budget_tokens: 10000
      },
      system: [
        {
          type: 'text',
          text: ENHANCED_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: messages
    });

    let responseText = '';
    const timeout = 60000; // 60 seconds for phase planning
    
    try {
      for await (const chunk of stream) {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          console.error('⏱️ Phase planning timeout after', (Date.now() - startTime) / 1000, 'seconds');
          throw new Error('Phase planning timeout - request too complex. Try a simpler description.');
        }
        
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          responseText += chunk.delta.text;
        }
      }
    } catch (streamError) {
      if (streamError instanceof Error && streamError.message.includes('timeout')) {
        throw streamError;
      }
      console.error('Streaming error:', streamError);
      throw new Error('Failed to receive AI response during streaming');
    }
      
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    console.log('📝 Phase plan response length:', responseText.length, 'chars');

    // ============================================================================
    // FIX 3.1: USE FLEXIBLE PARSING WITH RETRY
    // ============================================================================
    
    const phases = await extractPhasesWithRetry(responseText, anthropic);

    // ============================================================================
    // FIX 3.5: BETTER ERROR MESSAGES
    // ============================================================================
    
    if (phases.length === 0) {
      const errorDetails = {
        responseLength: responseText.length,
        containsDelimiters: responseText.includes('===PHASE:'),
        containsEndMarker: responseText.includes('===END_PHASES==='),
        containsTotalPhases: responseText.includes('===TOTAL_PHASES==='),
        preview: responseText.substring(0, 500)
      };
      
      console.error('❌ Phase extraction failed:', errorDetails);
      
      return NextResponse.json({
        error: `Failed to parse phase plan. The AI response was ${responseText.length} characters but couldn't be parsed. ` +
               `Contains delimiters: ${errorDetails.containsDelimiters}. ` +
               `Contains end marker: ${errorDetails.containsEndMarker}. ` +
               `Please try again with a simpler request.`,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      }, { status: 500 });
    }

    console.log(`✅ Successfully extracted ${phases.length} phases in ${(Date.now() - startTime) / 1000}s`);

    return NextResponse.json({
      totalPhases: phases.length,
      phases
    });

  } catch (error) {
    console.error('❌ Error extracting phase plan:', error);
    
    // Provide helpful error messages based on error type
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract phase plan';
    const isTimeout = errorMessage.includes('timeout');
    
    return NextResponse.json(
      { 
        error: errorMessage,
        suggestion: isTimeout 
          ? 'Try describing your app more concisely, or break it into smaller parts.'
          : 'Please try again. If the problem persists, try a simpler app description.'
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
