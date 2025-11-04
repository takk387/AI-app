import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { conversationHistory, prompt } = await request.json();
    const userRequest = prompt; // Use prompt for consistency with other endpoints

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured'
      }, { status: 500 });
    }

    const systemPrompt = `You are an expert software architect. Analyze the conversation and extract a clear, actionable phase plan for building the application.

Your task:
1. Review the entire conversation to understand the full scope
2. Identify all major features and requirements
3. Break them into logical, buildable phases (typically 2-5 phases)
4. Each phase should be independently testable
5. Earlier phases should provide foundation for later phases

Phase Structure:
- Phase 1: Foundation + 2-3 core features (should be a working app)
- Phase 2-4: Add major features incrementally
- Final Phase: Polish, optimization, edge cases

Return your analysis in this EXACT format:

===TOTAL_PHASES===
[number]
===PHASE:1===
NAME: [Short phase name]
DESCRIPTION: [What this phase accomplishes]
FEATURES:
- [Feature 1]
- [Feature 2]
- [Feature 3]
===PHASE:2===
NAME: [Short phase name]
DESCRIPTION: [What this phase adds]
FEATURES:
- [Feature 1]
- [Feature 2]
===END_PHASES===

CRITICAL:
- Phase 1 must be a working app (not a skeleton)
- Each phase adds meaningful functionality
- Features should be specific and clear
- Aim for 3-5 phases (not too granular, not too broad)`;

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Include the full conversation for context
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ 
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content 
          });
        }
      });
    }

    // Add the analysis request
    messages.push({ 
      role: 'user', 
      content: `Analyze this conversation and extract a phase-by-phase implementation plan for the app described. The user has requested: "${userRequest}"`
    });

    console.log('Extracting phase plan from conversation...');

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more structured output
      system: systemPrompt,
      messages: messages
    });

    const responseText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '';
      
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    console.log('Phase plan response:', responseText);

    // Parse the response
    const totalPhasesMatch = responseText.match(/===TOTAL_PHASES===\s*(\d+)/);
    const totalPhases = totalPhasesMatch ? parseInt(totalPhasesMatch[1]) : 3;

    // Extract all phases
    const phaseMatches = responseText.matchAll(/===PHASE:(\d+)===\s*NAME:\s*(.+?)\s*DESCRIPTION:\s*(.+?)\s*FEATURES:\s*([\s\S]*?)(?===PHASE:|\s*===END_PHASES===)/g);
    
    const phases: Array<{
      number: number;
      name: string;
      description: string;
      features: string[];
      status: 'pending' | 'building' | 'complete';
    }> = [];

    for (const match of phaseMatches) {
      const phaseNumber = parseInt(match[1]);
      const name = match[2].trim();
      const description = match[3].trim();
      const featuresText = match[4].trim();
      
      // Parse features (lines starting with -)
      const features = featuresText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-'))
        .map(line => line.substring(1).trim());

      phases.push({
        number: phaseNumber,
        name,
        description,
        features,
        status: 'pending'
      });
    }

    // Sort by phase number
    phases.sort((a, b) => a.number - b.number);

    if (phases.length === 0) {
      throw new Error('Failed to extract phases from response');
    }

    console.log(`Extracted ${phases.length} phases`);

    return NextResponse.json({
      totalPhases: phases.length,
      phases
    });

  } catch (error) {
    console.error('Error extracting phase plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract phase plan' },
      { status: 500 }
    );
  }
}
