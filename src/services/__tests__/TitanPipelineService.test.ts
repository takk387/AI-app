/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TitanPipelineService Tests
 *
 * Tests the Titan Pipeline orchestrator:
 * - Stage ordering (Router → Surveyor → Photographer → Builder)
 * - GENERATE mode skips vision steps
 * - Error propagation
 * - Pipeline singleton accessor
 * - Step timings tracking
 */

import type { PipelineInput, MergeStrategy, VisualManifest } from '@/types/titanPipeline';

// ============================================================================
// MOCKS
// ============================================================================

// Mock TitanRouter
const mockRouteIntent = jest.fn();
jest.mock('@/services/TitanRouter', () => ({
  routeIntent: mockRouteIntent,
}));

// Mock TitanSurveyor
const mockSurveyLayout = jest.fn();
const mockUploadFileToGemini = jest.fn();
const mockEnhanceImageQuality = jest.fn((f: any) => Promise.resolve(f));
const mockExtractImageMetadata = jest.fn().mockResolvedValue({ width: 1920, height: 1080 });
const mockBuildCanvasConfig = jest
  .fn()
  .mockReturnValue({ width: 1920, height: 1080, source: 'image' });

jest.mock('@/services/TitanSurveyor', () => ({
  surveyLayout: mockSurveyLayout,
  uploadFileToGemini: mockUploadFileToGemini,
  enhanceImageQuality: mockEnhanceImageQuality,
  extractImageMetadata: mockExtractImageMetadata,
  buildCanvasConfig: mockBuildCanvasConfig,
}));

// Mock TitanBuilder
const mockAssembleCode = jest.fn();
jest.mock('@/services/TitanBuilder', () => ({
  assembleCode: mockAssembleCode,
}));

// Mock TitanHealingLoop
const mockRunHealingLoop = jest.fn();
jest.mock('@/services/TitanHealingLoop', () => ({
  runHealingLoop: mockRunHealingLoop,
  captureRenderedScreenshot: jest.fn(),
  extractJSXMarkup: jest.fn(),
}));

// Mock AssetExtractionService
jest.mock('@/services/AssetExtractionService', () => ({
  getAssetExtractionService: jest.fn().mockReturnValue({
    extractAsset: jest.fn().mockResolvedValue({ success: false, error: 'mock' }),
  }),
}));

// Mock Google GenAI
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn().mockResolvedValue({ text: '{}' }) },
  })),
  createPartFromUri: jest.fn(),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockInput(overrides?: Partial<PipelineInput>): PipelineInput {
  return {
    files: [],
    instructions: 'Build a dashboard',
    currentCode: null,
    appContext: { name: 'Test App', features: [] },
    ...overrides,
  } as unknown as PipelineInput;
}

function createMockStrategy(mode: string = 'CREATE'): MergeStrategy {
  return {
    mode,
    execution_plan: {
      measure_pixels: mode === 'CREATE' ? ['all'] : [],
      extract_physics: [],
      generate_assets: [],
    },
  } as unknown as MergeStrategy;
}

function createMockManifest(): VisualManifest {
  return {
    global_theme: {
      dom_tree: { id: 'root', children: [] },
    },
    originalImageRef: 'data:image/png;base64,abc',
  } as unknown as VisualManifest;
}

// ============================================================================
// TESTS
// ============================================================================

describe('TitanPipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-key';

    // Default mock implementations
    mockRouteIntent.mockResolvedValue(createMockStrategy('CREATE'));
    mockSurveyLayout.mockResolvedValue(createMockManifest());
    mockAssembleCode.mockResolvedValue({
      'App.tsx': 'export default function App() { return <div>Hello</div>; }',
      'styles.css': 'body { margin: 0; }',
    });
    mockRunHealingLoop.mockResolvedValue({
      files: { 'App.tsx': 'healed code' },
      warnings: [],
      timingMs: 500,
    });
  });

  describe('GENERATE Mode', () => {
    it('should skip vision steps and go straight to Builder', async () => {
      mockRouteIntent.mockResolvedValue(createMockStrategy('GENERATE'));

      const { runPipeline } = require('@/services/TitanPipelineService');
      const result = await runPipeline(createMockInput());

      // Router should be called
      expect(mockRouteIntent).toHaveBeenCalledTimes(1);

      // Surveyor should NOT be called in GENERATE mode
      expect(mockSurveyLayout).not.toHaveBeenCalled();

      // Builder should be called with null structure and empty manifests
      expect(mockAssembleCode).toHaveBeenCalledWith(
        null, // structure
        [], // manifests
        null, // physics
        expect.anything(), // strategy
        null, // currentCode
        expect.any(String), // instructions
        {}, // assets
        undefined, // primaryImageRef
        undefined, // healingContext
        expect.anything() // appContext
      );

      expect(result.files).toBeDefined();
      expect(result.manifests).toEqual([]);
    });
  });

  describe('CREATE Mode with Images', () => {
    it('should run Surveyor when images provided', async () => {
      mockRouteIntent.mockResolvedValue(createMockStrategy('CREATE'));

      const input = createMockInput({
        files: [{ base64: 'abc', mimeType: 'image/png', filename: 'design.png' }] as any,
      });

      const { runPipeline } = require('@/services/TitanPipelineService');
      const result = await runPipeline(input);

      expect(mockSurveyLayout).toHaveBeenCalled();
      expect(mockExtractImageMetadata).toHaveBeenCalled();
      expect(mockAssembleCode).toHaveBeenCalled();
    });

    it('should run healing loop when manifests have dom_tree', async () => {
      mockRouteIntent.mockResolvedValue(createMockStrategy('CREATE'));

      const input = createMockInput({
        files: [{ base64: 'abc', mimeType: 'image/png', filename: 'design.png' }] as any,
      });

      const { runPipeline } = require('@/services/TitanPipelineService');
      await runPipeline(input);

      expect(mockRunHealingLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          maxIterations: 3,
          targetFidelity: 95,
        })
      );
    });
  });

  describe('Stage Ordering', () => {
    it('should execute Router before Surveyor and Surveyor before Builder', async () => {
      const executionOrder: string[] = [];

      mockRouteIntent.mockImplementation(async () => {
        executionOrder.push('router');
        return createMockStrategy('CREATE');
      });

      mockSurveyLayout.mockImplementation(async () => {
        executionOrder.push('surveyor');
        return createMockManifest();
      });

      mockAssembleCode.mockImplementation(async () => {
        executionOrder.push('builder');
        return { 'App.tsx': 'code' };
      });

      mockRunHealingLoop.mockImplementation(async () => {
        executionOrder.push('healing');
        return { files: { 'App.tsx': 'healed' }, warnings: [], timingMs: 100 };
      });

      const input = createMockInput({
        files: [{ base64: 'abc', mimeType: 'image/png', filename: 'design.png' }] as any,
      });

      const { runPipeline } = require('@/services/TitanPipelineService');
      await runPipeline(input);

      // Router must come first
      expect(executionOrder.indexOf('router')).toBe(0);
      // Builder must come after surveyor
      expect(executionOrder.indexOf('builder')).toBeGreaterThan(executionOrder.indexOf('surveyor'));
      // Healing comes last
      if (executionOrder.includes('healing')) {
        expect(executionOrder.indexOf('healing')).toBeGreaterThan(
          executionOrder.indexOf('builder')
        );
      }
    });
  });

  describe('Error Propagation', () => {
    it('should propagate Router errors', async () => {
      mockRouteIntent.mockRejectedValue(new Error('Router failed'));

      const { runPipeline } = require('@/services/TitanPipelineService');
      await expect(runPipeline(createMockInput())).rejects.toThrow('Router failed');
    });

    it('should propagate Builder errors', async () => {
      mockRouteIntent.mockResolvedValue(createMockStrategy('GENERATE'));
      mockAssembleCode.mockRejectedValue(new Error('Builder failed'));

      const { runPipeline } = require('@/services/TitanPipelineService');
      await expect(runPipeline(createMockInput())).rejects.toThrow('Builder failed');
    });
  });

  describe('Step Timings', () => {
    it('should track timings for each step', async () => {
      mockRouteIntent.mockResolvedValue(createMockStrategy('GENERATE'));

      const { runPipeline } = require('@/services/TitanPipelineService');
      const result = await runPipeline(createMockInput());

      expect(result.stepTimings).toBeDefined();
      expect(typeof result.stepTimings.router).toBe('number');
      expect(typeof result.stepTimings.builder).toBe('number');
    });
  });

  describe('Singleton Accessor', () => {
    it('should return the same instance', () => {
      const { getTitanPipelineService } = require('@/services/TitanPipelineService');

      const instance1 = getTitanPipelineService();
      const instance2 = getTitanPipelineService();

      expect(instance1).toBe(instance2);
    });

    it('should expose runPipeline and liveEdit methods', () => {
      const { getTitanPipelineService } = require('@/services/TitanPipelineService');
      const instance = getTitanPipelineService();

      expect(typeof instance.runPipeline).toBe('function');
      expect(typeof instance.liveEdit).toBe('function');
    });
  });
});
