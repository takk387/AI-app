/**
 * Layout Builder Chat - API Route
 *
 * Handles AI-powered layout design conversations with vision capabilities.
 * Claude can "see" the layout preview via screenshots and provide visual feedback.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  LAYOUT_BUILDER_SYSTEM_PROMPT,
  buildLayoutBuilderPrompt,
} from '@/prompts/layoutBuilderSystemPrompt';
import type {
  LayoutDesign,
  LayoutMessage,
  LayoutChatRequest,
  LayoutChatResponse,
  DesignChange,
  SuggestedAction,
  defaultLayoutDesign,
} from '@/types/layoutDesign';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// DESIGN EXTRACTION
// ============================================================================

/**
 * Extract design changes from the AI response
 * Looks for specific property change suggestions
 */
async function extractDesignUpdates(
  response: string,
  currentDesign: Partial<LayoutDesign>
): Promise<{
  updates: Partial<LayoutDesign>;
  changes: DesignChange[];
}> {
  const extractionPrompt = `Analyze this design assistant response and extract any specific design changes mentioned.

Return a JSON object with:
1. "updates" - A partial LayoutDesign object with only the fields that should be changed
2. "changes" - An array describing each change

**RESPONSE TO ANALYZE:**
${response}

**CURRENT DESIGN STATE:**
${JSON.stringify(currentDesign, null, 2)}

Return ONLY valid JSON in this format:
{
  "updates": {
    "globalStyles": {
      "colors": { "primary": "#newcolor" },
      "effects": { "borderRadius": "xl" }
    }
  },
  "changes": [
    {
      "property": "globalStyles.colors.primary",
      "oldValue": "#3B82F6",
      "newValue": "#6366F1",
      "reason": "Changed to purple for a more vibrant feel"
    }
  ]
}

If no specific changes were suggested, return:
{
  "updates": {},
  "changes": []
}`;

  try {
    const extractResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    const textBlock = extractResponse.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      let jsonText = textBlock.text.trim();
      // Clean markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText
          .replace(/```json?\n?/g, '')
          .replace(/```$/g, '')
          .trim();
      }

      const extracted = JSON.parse(jsonText);
      return {
        updates: extracted.updates || {},
        changes: extracted.changes || [],
      };
    }
  } catch (error) {
    console.error('Design extraction error:', error);
  }

  return { updates: {}, changes: [] };
}

/**
 * Deep merge design updates into current design
 */
function mergeDesignUpdates(
  current: Partial<LayoutDesign>,
  updates: Partial<LayoutDesign>
): Partial<LayoutDesign> {
  const merged = { ...current };

  // Merge globalStyles
  if (updates.globalStyles) {
    merged.globalStyles = {
      ...current.globalStyles,
      ...updates.globalStyles,
      typography: {
        ...current.globalStyles?.typography,
        ...updates.globalStyles?.typography,
      },
      colors: {
        ...current.globalStyles?.colors,
        ...updates.globalStyles?.colors,
      },
      spacing: {
        ...current.globalStyles?.spacing,
        ...updates.globalStyles?.spacing,
      },
      effects: {
        ...current.globalStyles?.effects,
        ...updates.globalStyles?.effects,
      },
    } as LayoutDesign['globalStyles'];
  }

  // Merge components
  if (updates.components) {
    merged.components = {
      ...current.components,
      ...updates.components,
    };
  }

  // Merge structure
  if (updates.structure) {
    merged.structure = {
      ...current.structure,
      ...updates.structure,
    } as LayoutDesign['structure'];
  }

  // Merge responsive
  if (updates.responsive) {
    merged.responsive = {
      ...current.responsive,
      ...updates.responsive,
    } as LayoutDesign['responsive'];
  }

  // Merge base preferences
  if (updates.basePreferences) {
    merged.basePreferences = {
      ...current.basePreferences,
      ...updates.basePreferences,
    } as LayoutDesign['basePreferences'];
  }

  return merged;
}

/**
 * Generate suggested actions based on conversation state
 */
function generateSuggestedActions(
  design: Partial<LayoutDesign>,
  messageCount: number,
  hasScreenshot: boolean
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Always suggest capturing if no screenshot was provided
  if (!hasScreenshot && messageCount > 0) {
    actions.push({
      label: 'Capture Preview',
      action: 'capture_preview',
      icon: '📸',
    });
  }

  // Suggest reference upload if none exist
  if (!design.referenceMedia?.length) {
    actions.push({
      label: 'Upload Inspiration',
      action: 'upload_reference',
      icon: '🎨',
    });
  }

  // Suggest theme toggle
  const isDark = design.basePreferences?.colorScheme === 'dark';
  actions.push({
    label: isDark ? 'Try Light Mode' : 'Try Dark Mode',
    action: 'toggle_theme',
    icon: isDark ? '☀️' : '🌙',
  });

  // Suggest saving after some conversation
  if (messageCount >= 4) {
    actions.push({
      label: 'Save Design',
      action: 'save_design',
      icon: '💾',
    });
  }

  // Suggest applying to concept after significant progress
  if (messageCount >= 6 && design.globalStyles?.colors?.primary) {
    actions.push({
      label: 'Apply to App Concept',
      action: 'apply_to_concept',
      icon: '✨',
    });
  }

  return actions;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: LayoutChatRequest = await request.json();
    const {
      message,
      conversationHistory,
      currentDesign,
      selectedElement,
      previewScreenshot,
      referenceImages,
    } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Anthropic API key not configured',
        },
        { status: 500 }
      );
    }

    // Build Claude messages from conversation history
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      });
    }

    // Build current message with images
    const currentContent: Anthropic.ContentBlockParam[] = [];

    // Add preview screenshot if provided
    if (previewScreenshot) {
      const match = previewScreenshot.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: match[2],
          },
        });
      }
    }

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      for (const imageData of referenceImages) {
        const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          currentContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: match[2],
            },
          });
        }
      }
    }

    // Add text message
    let messageText = message;

    // Add selected element context to message
    if (selectedElement) {
      messageText = `[User has selected the "${selectedElement}" element in the preview]\n\n${message}`;
    }

    currentContent.push({ type: 'text', text: messageText });

    // Add current message
    messages.push({
      role: 'user',
      content: currentContent.length > 1 ? currentContent : messageText,
    });

    // Build system prompt with context
    const systemPrompt = buildLayoutBuilderPrompt(
      currentDesign,
      selectedElement || null,
      !!previewScreenshot,
      referenceImages?.length || 0
    );

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages,
    });

    // Extract response text
    const textBlock = response.content.find((block) => block.type === 'text');
    const assistantMessage = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // Extract design updates from the response
    const { updates, changes } = await extractDesignUpdates(assistantMessage, currentDesign);

    // Merge updates into current design
    const updatedDesign = mergeDesignUpdates(currentDesign, updates);

    // Update conversation context
    const newMessageCount = (currentDesign.conversationContext?.messageCount || 0) + 2;
    updatedDesign.conversationContext = {
      ...currentDesign.conversationContext,
      messageCount: newMessageCount,
      lastUpdated: new Date().toISOString(),
      keyDecisions: [
        ...(currentDesign.conversationContext?.keyDecisions || []),
        ...changes.map((c) => c.reason),
      ].slice(-10), // Keep last 10 decisions
      userPreferences: currentDesign.conversationContext?.userPreferences || [],
    };

    // Generate suggested actions
    const suggestedActions = generateSuggestedActions(
      updatedDesign,
      newMessageCount,
      !!previewScreenshot
    );

    const result: LayoutChatResponse = {
      message: assistantMessage,
      updatedDesign,
      suggestedActions,
      designChanges: changes.length > 0 ? changes : undefined,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };

    console.log(
      `Layout chat response in ${Date.now() - startTime}ms (${response.usage.input_tokens} in, ${response.usage.output_tokens} out)`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Layout chat error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process layout message',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return layout builder configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Layout Builder Chat',
    version: '1.0',
    description: 'AI-powered layout design with vision capabilities',
    features: [
      'Visual analysis via screenshots',
      'Element selection awareness',
      'Reference image comparison',
      'Real-time design updates',
      'Design change tracking',
    ],
    endpoints: {
      chat: 'POST /api/layout/chat',
    },
    supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxImageSize: '5MB',
  });
}
