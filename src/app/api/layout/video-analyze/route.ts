/**
 * Video Analysis API Route
 *
 * Analyzes video frames to detect animations, transitions, and design elements.
 * Uses Claude Vision to compare consecutive frames and identify motion patterns.
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildVideoAnalysisPrompt } from '@/prompts/layoutBuilderSystemPrompt';
import type {
  DetectedAnimation,
  DetectedTransition,
  VideoAnalysisResult,
  ExtractedFrame,
} from '@/types/layoutDesign';
// NOTE: Preset files removed - AI generates styles dynamically instead

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract MIME type from a base64 data URL
 * Returns the actual MIME type to ensure correct image format is sent to Claude
 */
function getMediaType(
  imageDataUrl: string
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,/);
  if (match) {
    const mimeType = match[1];
    if (
      mimeType === 'image/jpeg' ||
      mimeType === 'image/png' ||
      mimeType === 'image/gif' ||
      mimeType === 'image/webp'
    ) {
      return mimeType;
    }
  }
  // Default to JPEG for video frames (most common)
  return 'image/jpeg';
}

// Vercel serverless function config
export const maxDuration = 120; // 2 minutes for video processing
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

interface VideoAnalyzeRequest {
  frames: ExtractedFrame[];
  keyFrames?: ExtractedFrame[];
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
  analysisMode?: 'quick' | 'detailed';
}

interface FramePairAnalysis {
  fromIndex: number;
  toIndex: number;
  animations: DetectedAnimation[];
  transitions: DetectedTransition[];
  description: string;
}

// ============================================================================
// FRAME ANALYSIS
// ============================================================================

/**
 * Analyze a pair of frames to detect animations between them
 */
async function analyzeFramePair(
  frame1: ExtractedFrame,
  frame2: ExtractedFrame,
  context: string
): Promise<FramePairAnalysis> {
  const prompt = buildVideoAnalysisPrompt(frame1.timestamp, frame2.timestamp, context);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getMediaType(frame1.imageDataUrl),
                data: frame1.imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getMediaType(frame2.imageDataUrl),
                data: frame2.imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return {
        fromIndex: frame1.index,
        toIndex: frame2.index,
        animations: [],
        transitions: [],
        description: 'No analysis available',
      };
    }

    // Parse the response
    let analysisText = textBlock.text.trim();

    // Try to extract JSON from the response
    const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      analysisText = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(analysisText);
      return {
        fromIndex: frame1.index,
        toIndex: frame2.index,
        animations: (parsed.animations || []).map(
          (anim: Partial<DetectedAnimation>, i: number) => ({
            id: `anim-${frame1.index}-${frame2.index}-${i}`,
            type: anim.type || 'fade',
            property: anim.property || 'opacity',
            fromValue: anim.fromValue || '0',
            toValue: anim.toValue || '1',
            duration: anim.duration || '0.3s',
            easing: anim.easing || 'ease-out',
            delay: anim.delay,
            element: anim.element || 'unknown',
            confidence: anim.confidence || 0.5,
          })
        ),
        transitions: (parsed.transitions || []).map(
          (trans: Partial<DetectedTransition>, i: number) => ({
            id: `trans-${frame1.index}-${frame2.index}-${i}`,
            type: trans.type || 'fade',
            duration: trans.duration || '0.3s',
            easing: trans.easing || 'ease-out',
            fromState: trans.fromState || 'hidden',
            toState: trans.toState || 'visible',
            affectedElements: trans.affectedElements || [],
          })
        ),
        description: parsed.description || 'Animation detected',
      };
    } catch {
      // If JSON parsing fails, extract what we can from text
      return {
        fromIndex: frame1.index,
        toIndex: frame2.index,
        animations: extractAnimationsFromText(analysisText, frame1.index, frame2.index),
        transitions: [],
        description: analysisText.slice(0, 200),
      };
    }
  } catch (error) {
    console.error('Frame pair analysis error:', error);
    return {
      fromIndex: frame1.index,
      toIndex: frame2.index,
      animations: [],
      transitions: [],
      description: 'Analysis failed',
    };
  }
}

/**
 * Extract animations from text description when JSON parsing fails
 */
function extractAnimationsFromText(
  text: string,
  fromIndex: number,
  toIndex: number
): DetectedAnimation[] {
  const animations: DetectedAnimation[] = [];
  const lowerText = text.toLowerCase();

  // Detect common animation types from description
  const animationPatterns = [
    { pattern: /fade\s*(in|out)?/i, type: 'fade' as const },
    { pattern: /slide\s*(in|out|up|down|left|right)?/i, type: 'slide' as const },
    { pattern: /scale|zoom|grow|shrink/i, type: 'scale' as const },
    { pattern: /rotat(e|ion)/i, type: 'rotate' as const },
    { pattern: /hover/i, type: 'hover-effect' as const },
    { pattern: /scroll/i, type: 'scroll-reveal' as const },
  ];

  animationPatterns.forEach((ap, i) => {
    if (ap.pattern.test(lowerText)) {
      animations.push({
        id: `detected-${fromIndex}-${toIndex}-${i}`,
        type: ap.type,
        property: ap.type === 'fade' ? 'opacity' : 'transform',
        fromValue: '0',
        toValue: '1',
        duration: '0.3s',
        easing: 'ease-out',
        element: 'detected-element',
        confidence: 0.6,
      });
    }
  });

  return animations;
}

/**
 * Analyze the first key frame for design elements
 */
async function analyzeDesignFromKeyFrame(frame: ExtractedFrame): Promise<{
  colors: string[];
  fonts: string[];
  layoutType: string;
  components: string[];
}> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getMediaType(frame.imageDataUrl),
                data: frame.imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
            },
            {
              type: 'text',
              text: `Analyze this UI design frame and extract:
1. Main colors used (as hex codes)
2. Font styles detected (describe or name if recognizable)
3. Layout type (landing page, dashboard, e-commerce, etc.)
4. UI components visible (buttons, cards, navigation, etc.)

Return as JSON:
{
  "colors": ["#hex1", "#hex2", ...],
  "fonts": ["Font description or name", ...],
  "layoutType": "type",
  "components": ["component1", "component2", ...]
}`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      let text = textBlock.text.trim();
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(text);
        return {
          colors: parsed.colors || [],
          fonts: parsed.fonts || [],
          layoutType: parsed.layoutType || 'unknown',
          components: parsed.components || [],
        };
      }
    }
  } catch (error) {
    console.error('Key frame analysis error:', error);
  }

  return {
    colors: [],
    fonts: [],
    layoutType: 'unknown',
    components: [],
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    const body: VideoAnalyzeRequest = await request.json();
    const { frames, keyFrames, metadata, analysisMode = 'detailed' } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    if (!frames || frames.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 frames required for analysis' },
        { status: 400 }
      );
    }

    // Limit frames for analysis based on mode
    const maxPairs = analysisMode === 'quick' ? 3 : 10;
    const framesToAnalyze = frames.slice(0, maxPairs + 1);

    // Analyze design from first key frame
    const designAnalysis = await analyzeDesignFromKeyFrame(keyFrames?.[0] || frames[0]);

    // Analyze consecutive frame pairs
    const framePairResults: FramePairAnalysis[] = [];
    const context = `Video duration: ${metadata.duration}s, Resolution: ${metadata.width}x${metadata.height}`;

    for (let i = 0; i < framesToAnalyze.length - 1; i++) {
      // Skip pairs with very small time differences in quick mode
      const timeDiff = framesToAnalyze[i + 1].timestamp - framesToAnalyze[i].timestamp;
      if (analysisMode === 'quick' && timeDiff < 0.5) {
        continue;
      }

      const result = await analyzeFramePair(framesToAnalyze[i], framesToAnalyze[i + 1], context);

      framePairResults.push(result);
    }

    // Aggregate all detected animations
    const allAnimations: DetectedAnimation[] = [];
    const allTransitions: DetectedTransition[] = [];

    framePairResults.forEach((result) => {
      allAnimations.push(...result.animations);
      allTransitions.push(...result.transitions);
    });

    // Presets removed - animations are AI-generated dynamically
    const animationsWithPresets = allAnimations.map((anim) => ({
      ...anim,
      matchedPreset: undefined,
      presetConfidence: 0,
    }));

    // Build the result
    const result: VideoAnalysisResult = {
      frames: frames.map((f) => ({
        index: f.index,
        timestamp: f.timestamp,
        isKeyFrame: f.isKeyFrame,
      })),
      animations: animationsWithPresets,
      transitions: allTransitions,
      designSummary: {
        dominantColors: designAnalysis.colors,
        detectedFonts: designAnalysis.fonts,
        layoutType: designAnalysis.layoutType,
        components: designAnalysis.components,
      },
      metadata: {
        duration: metadata.duration,
        frameCount: frames.length,
        keyFrameCount: keyFrames?.length || 0,
        analysisMode,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Video analysis error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze video',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Return video analysis configuration
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Video Analysis API',
    version: '1.0',
    description: 'Analyze video frames to detect UI animations and transitions',
    endpoints: {
      analyze: 'POST /api/layout/video-analyze',
    },
    supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxDuration: 60,
    maxFileSize: '100MB',
    features: [
      'Animation detection',
      'Transition analysis',
      'Design element extraction',
      'Animation preset matching',
      'Framer Motion code generation',
    ],
  });
}
