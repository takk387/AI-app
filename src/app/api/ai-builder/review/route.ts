/**
 * Code Review API Route
 *
 * POST /api/ai-builder/review
 *
 * Performs code review on generated files, detecting issues and applying auto-fixes.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  ReviewRequest,
  ReviewResponse,
  ReviewFile,
  ReviewStrictness,
} from '@/types/codeReview';
import { performLightReview, performComprehensiveReview } from '@/services/CodeReviewService';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: ReviewRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const req = body as Record<string, unknown>;

  // Validate reviewType
  if (!req.reviewType || !['light', 'comprehensive'].includes(req.reviewType as string)) {
    return { valid: false, error: 'reviewType must be "light" or "comprehensive"' };
  }

  // Validate files
  if (!req.files || !Array.isArray(req.files)) {
    return { valid: false, error: 'files must be an array' };
  }

  for (const file of req.files) {
    if (!file.path || typeof file.path !== 'string') {
      return { valid: false, error: 'Each file must have a path string' };
    }
    if (!file.content || typeof file.content !== 'string') {
      return { valid: false, error: 'Each file must have a content string' };
    }
  }

  // Validate strictness if provided
  if (req.strictness && !['relaxed', 'standard', 'strict'].includes(req.strictness as string)) {
    return { valid: false, error: 'strictness must be "relaxed", "standard", or "strict"' };
  }

  // Validate requirements for comprehensive review
  if (req.reviewType === 'comprehensive') {
    if (!req.requirements) {
      return { valid: false, error: 'requirements are required for comprehensive review' };
    }
  }

  return {
    valid: true,
    data: {
      reviewType: req.reviewType as 'light' | 'comprehensive',
      files: req.files as ReviewFile[],
      requirements: req.requirements as ReviewRequest['requirements'],
      phaseContext: req.phaseContext as ReviewRequest['phaseContext'],
      strictness: (req.strictness as ReviewStrictness) || 'standard',
      enableLogicAnalysis: req.enableLogicAnalysis as boolean,
    },
  };
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ReviewResponse>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          issues: [],
          fixes: [],
          report: {
            timestamp: new Date().toISOString(),
            reviewType: 'light',
            totalIssues: 0,
            fixedIssues: 0,
            remainingIssues: 0,
            issuesByCategory: {},
            issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            scores: {
              syntax: 0,
              security: 0,
              bestPractices: 0,
              performance: 0,
              accessibility: 0,
            },
            overallScore: 0,
            passed: false,
            issues: [],
            fixes: [],
            validationComplete: false,
            reviewComplete: false,
            durationMs: Date.now() - startTime,
          },
          error: validation.error,
        },
        { status: 400 }
      );
    }

    const { reviewType, files, requirements, phaseContext, strictness, enableLogicAnalysis } =
      validation.data;

    // Perform review based on type
    let result;
    if (reviewType === 'comprehensive' && requirements) {
      result = await performComprehensiveReview(files, requirements, { strictness });
    } else {
      result = await performLightReview(files, phaseContext, { strictness, enableLogicAnalysis });
    }

    // Return response
    return NextResponse.json({
      success: true,
      issues: result.issues,
      fixes: result.fixes,
      report: result.report,
      modifiedFiles: result.modifiedFiles,
    });
  } catch (error) {
    console.error('Code review error:', error);

    return NextResponse.json(
      {
        success: false,
        issues: [],
        fixes: [],
        report: {
          timestamp: new Date().toISOString(),
          reviewType: 'light',
          totalIssues: 0,
          fixedIssues: 0,
          remainingIssues: 0,
          issuesByCategory: {},
          issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          scores: {
            syntax: 0,
            security: 0,
            bestPractices: 0,
            performance: 0,
            accessibility: 0,
          },
          overallScore: 0,
          passed: false,
          issues: [],
          fixes: [],
          validationComplete: false,
          reviewComplete: false,
          durationMs: Date.now() - startTime,
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS (for CORS)
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
