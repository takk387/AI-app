/**
 * Dynamic Phase Generation - API Route
 *
 * Takes a completed AppConcept and generates an optimal phase plan
 * using the DynamicPhaseGenerator service.
 */

import { NextResponse } from 'next/server';
import { DynamicPhaseGenerator } from '@/services/DynamicPhaseGenerator';
import type { AppConcept } from '@/types/appConcept';
import type { PhaseGeneratorConfig } from '@/types/dynamicPhases';

// Vercel serverless function config
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface GeneratePhasesRequest {
  concept: AppConcept;
  config?: Partial<PhaseGeneratorConfig>;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: GeneratePhasesRequest = await request.json();
    const { concept, config } = body;

    // Validate concept
    if (!concept) {
      return NextResponse.json(
        {
          error: 'App concept is required',
        },
        { status: 400 }
      );
    }

    if (!concept.name) {
      return NextResponse.json(
        {
          error: 'App concept must have a name',
        },
        { status: 400 }
      );
    }

    if (!concept.coreFeatures || concept.coreFeatures.length === 0) {
      return NextResponse.json(
        {
          error: 'App concept must have at least one feature',
        },
        { status: 400 }
      );
    }

    // Ensure required fields have defaults
    const normalizedConcept: AppConcept = {
      ...concept,
      description: concept.description || `A ${concept.name} application`,
      purpose: concept.purpose || concept.description || 'To be defined',
      targetUsers: concept.targetUsers || 'General users',
      technical: {
        needsAuth: false,
        needsDatabase: false,
        needsAPI: false,
        needsFileUpload: false,
        needsRealtime: false,
        ...concept.technical,
      },
      uiPreferences: {
        style: 'modern',
        colorScheme: 'auto',
        layout: 'single-page',
        ...concept.uiPreferences,
      },
      createdAt: concept.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate phase plan
    const generator = new DynamicPhaseGenerator(config);
    const result = generator.generatePhasePlan(normalizedConcept);

    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`Phase generation failed in ${duration}ms:`, result.error);
      return NextResponse.json(
        {
          error: result.error,
          warnings: result.warnings,
          analysisDetails: result.analysisDetails,
        },
        { status: 400 }
      );
    }

    console.log(`Generated ${result.plan!.totalPhases} phases in ${duration}ms`);
    console.log(`   Complexity: ${result.plan!.complexity}`);
    console.log(`   Estimated time: ${result.plan!.estimatedTotalTime}`);

    return NextResponse.json({
      success: true,
      plan: result.plan,
      warnings: result.warnings,
      analysisDetails: result.analysisDetails,
      generationTime: duration,
    });
  } catch (error) {
    console.error('Phase generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate phases',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Return phase generation info and examples
 */
export async function GET() {
  return NextResponse.json({
    name: 'Dynamic Phase Generator',
    version: '1.0',
    description: 'Generates optimal build phases based on app complexity',

    capabilities: [
      'Variable phase count (3-25+)',
      'Feature complexity analysis',
      'Domain-based grouping',
      'Dependency detection',
      'Context-aware sizing',
    ],

    complexityLevels: {
      simple: '2-3 phases, basic features',
      moderate: '4-6 phases, standard app',
      complex: '7-12 phases, multi-feature app',
      enterprise: '13-25+ phases, full platform',
    },

    alwaysSeparatePhases: [
      'Authentication',
      'Database Setup',
      'Real-time Features',
      'Offline Support',
      'External Integrations',
    ],

    exampleInput: {
      concept: {
        name: 'Field Service App',
        description: 'Mobile app for fire alarm installation company oversight',
        coreFeatures: [
          {
            id: '1',
            name: 'Work Orders',
            description: 'Create and manage work orders',
            priority: 'high',
          },
          {
            id: '2',
            name: 'Task Assignment',
            description: 'Chat/voice task assignment',
            priority: 'high',
          },
          {
            id: '3',
            name: 'Photo Submissions',
            description: 'Workers submit work photos',
            priority: 'high',
          },
        ],
        technical: {
          needsAuth: true,
          authType: 'phone',
          needsDatabase: true,
          needsRealtime: true,
          needsFileUpload: true,
        },
      },
    },

    exampleOutput: {
      totalPhases: 11,
      phases: [
        { number: 1, name: 'Project Setup', domain: 'setup' },
        { number: 2, name: 'Database Schema', domain: 'database' },
        { number: 3, name: 'Authentication System', domain: 'auth' },
        { number: 4, name: 'Work Orders & Job Sites', domain: 'core-entity' },
        { number: 5, name: 'Task System', domain: 'feature' },
        { number: 6, name: 'Photo Submissions', domain: 'storage' },
        { number: 7, name: 'Ticket System', domain: 'feature' },
        { number: 8, name: 'Activity Feed', domain: 'real-time' },
        { number: 9, name: 'Push Notifications', domain: 'notification' },
        { number: 10, name: 'Offline Support', domain: 'offline' },
        { number: 11, name: 'Polish & Documentation', domain: 'polish' },
      ],
      complexity: 'complex',
      estimatedTotalTime: '45-60 min',
    },
  });
}
