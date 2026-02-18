/**
 * Update Concept API Route
 *
 * Handles natural language requests to update the AppConcept in PLAN mode.
 * Uses Claude to interpret user requests and optionally regenerates phases.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DynamicPhaseGenerator } from '@/services/DynamicPhaseGenerator';
import type { AppConcept } from '@/types/appConcept';
import type { ConceptChange } from '@/types/reviewTypes';

// Initialize Anthropic client
const anthropic = new Anthropic();

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface UpdateConceptRequest {
  currentConcept: AppConcept;
  userMessage: string;
  regeneratePhases: boolean;
}

export async function POST(request: Request) {
  try {
    const { currentConcept, userMessage, regeneratePhases } =
      (await request.json()) as UpdateConceptRequest;

    // Validate input
    if (!currentConcept) {
      return NextResponse.json({ success: false, error: 'No concept provided' }, { status: 400 });
    }

    // If userMessage is empty, just regenerate phases (no concept update)
    if (!userMessage || userMessage.trim() === '') {
      if (regeneratePhases) {
        const generator = new DynamicPhaseGenerator();
        const newPhasePlan = await generator.generatePhasePlan(currentConcept);

        return NextResponse.json({
          success: true,
          updatedConcept: currentConcept,
          changes: [],
          phasePlan: newPhasePlan,
          regeneratedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        updatedConcept: currentConcept,
        changes: [],
      });
    }

    // Use Claude to interpret the user's request and update concept
    const updatedConcept = await interpretConceptUpdate(currentConcept, userMessage);

    // Generate diff for confirmation
    const changes = generateConceptDiff(currentConcept, updatedConcept);

    // Optionally regenerate phases
    let newPhasePlan = null;
    if (regeneratePhases) {
      const generator = new DynamicPhaseGenerator();
      newPhasePlan = await generator.generatePhasePlan(updatedConcept);
    }

    return NextResponse.json({
      success: true,
      updatedConcept,
      changes,
      phasePlan: newPhasePlan,
      regeneratedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Concept update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update concept',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a diff between original and updated concept
 */
function generateConceptDiff(original: AppConcept, updated: AppConcept): ConceptChange[] {
  const changes: ConceptChange[] = [];

  // Check name change
  if (original.name !== updated.name) {
    changes.push({
      field: 'name',
      type: 'modified',
      oldValue: original.name,
      newValue: updated.name,
    });
  }

  // Check description change
  if (original.description !== updated.description) {
    changes.push({
      field: 'description',
      type: 'modified',
      oldValue: original.description,
      newValue: updated.description,
    });
  }

  // Check purpose change
  if (original.purpose !== updated.purpose) {
    changes.push({
      field: 'purpose',
      type: 'modified',
      oldValue: original.purpose,
      newValue: updated.purpose,
    });
  }

  // Check features
  const originalFeatures = new Set(original.coreFeatures?.map((f) => f.name) || []);
  const updatedFeatures = new Set(updated.coreFeatures?.map((f) => f.name) || []);

  // Find added features
  updated.coreFeatures?.forEach((f) => {
    if (!originalFeatures.has(f.name)) {
      changes.push({
        field: `feature: ${f.name}`,
        type: 'added',
        newValue: f,
      });
    }
  });

  // Find removed features
  original.coreFeatures?.forEach((f) => {
    if (!updatedFeatures.has(f.name)) {
      changes.push({
        field: `feature: ${f.name}`,
        type: 'removed',
        oldValue: f,
      });
    }
  });

  // Check for modified features (same name but different details)
  updated.coreFeatures?.forEach((updatedFeature) => {
    const originalFeature = original.coreFeatures?.find((f) => f.name === updatedFeature.name);
    if (originalFeature) {
      if (
        originalFeature.description !== updatedFeature.description ||
        originalFeature.priority !== updatedFeature.priority
      ) {
        changes.push({
          field: `feature: ${updatedFeature.name}`,
          type: 'modified',
          oldValue: originalFeature,
          newValue: updatedFeature,
        });
      }
    }
  });

  return changes;
}

/**
 * Use Claude to interpret the user's natural language request
 * and return an updated AppConcept
 */
async function interpretConceptUpdate(
  current: AppConcept,
  userMessage: string
): Promise<AppConcept> {
  const systemPrompt = `You are updating an app concept based on a user request.

Current concept:
${JSON.stringify(current, null, 2)}

Rules:
- Only modify fields relevant to the user's request
- Preserve all other fields exactly as they are
- Return valid JSON matching the AppConcept schema
- For new features, generate a unique id, appropriate priority (high/medium/low), and description
- For feature removal, filter out the matching feature
- Maintain consistency with existing app theme and purpose
- Keep the updatedAt timestamp current

AppConcept schema reference:
{
  name: string,
  description: string,
  purpose: string,
  targetUsers: string,
  coreFeatures: Array<{ id: string, name: string, description: string, priority: 'high' | 'medium' | 'low' }>,
  uiPreferences: { style, colorScheme, primaryColor, layout, ... },
  technical: { needsAuth, needsDatabase, needsAPI, ... },
  roles?: Array<{ name, capabilities, permissions }>,
  workflows?: Array<{ name, description, steps, involvedRoles }>,
  createdAt: string,
  updatedAt: string
}

User request: "${userMessage}"

Return ONLY the updated concept as valid JSON. No explanation, no markdown code blocks.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: systemPrompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse the JSON response
  try {
    // Clean potential markdown code blocks
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText) as AppConcept;

    // Ensure updatedAt is current
    parsed.updatedAt = new Date().toISOString();

    return parsed;
  } catch (_parseError) {
    console.error('Failed to parse concept update response:', content.text);
    throw new Error('Failed to parse AI response as valid AppConcept JSON');
  }
}
