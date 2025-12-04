/**
 * useMessageSender Hook - Message detection utilities for the AI Builder
 *
 * Provides question detection and progress message generation.
 * The Builder Expert (AI-powered) handles the main intent detection,
 * but this hook provides fast client-side utilities.
 */

import { useCallback } from 'react';
import type {
  ChatMessage,
  GeneratedComponent,
  StagePlan,
  PendingDiff,
} from '@/types/aiBuilderTypes';

/**
 * Options for useMessageSender hook
 */
export interface UseMessageSenderOptions {
  /** Current chat messages */
  chatMessages: ChatMessage[];
  /** Set chat messages */
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Current component being edited */
  currentComponent: GeneratedComponent | null;
  /** Set current component */
  setCurrentComponent: (component: GeneratedComponent | null) => void;
  /** Current mode (PLAN or ACT) */
  currentMode: 'PLAN' | 'ACT';
  /** New app stage plan for phased builds */
  newAppStagePlan: StagePlan | null;
  /** Set new app stage plan */
  setNewAppStagePlan: (plan: StagePlan | null) => void;
  /** Callback when a new component is created */
  onComponentCreated: (component: GeneratedComponent) => void;
  /** Show diff preview modal */
  onShowDiffPreview: (diff: PendingDiff) => void;
  /** Show staging consent modal */
  onShowStagingModal: (request: string) => void;
  /** Save component to storage */
  onSaveComponent: (component: GeneratedComponent) => Promise<void>;
  /** Uploaded image as base64 */
  uploadedImage: string | null;
  /** Clear uploaded image */
  onClearImage: () => void;
}

/**
 * Return type for useMessageSender hook
 */
export interface UseMessageSenderReturn {
  /** Detect if input is a question */
  isQuestion: (input: string) => boolean;
  /** Get progress messages based on request type */
  getProgressMessages: (isQuestion: boolean, isModification: boolean) => string[];
}

// Question words and phrases
const QUESTION_INDICATORS = [
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'which',
  'explain',
  'tell me',
  'can you',
  'could you',
  'would you',
  'should i',
  'is it',
  'are there',
  'do i',
  'does',
  'did',
  '?',
  'help me understand',
  'difference between',
  'i want to know',
  'i need help',
  'wondering',
  'curious',
  'question',
  'asking',
  'vs',
  'versus',
  'better than',
  'best way',
  'recommend',
  'suggestion',
  'advice',
  'opinion',
  'means',
  'mean by',
  'definition',
  'tutorial',
];

// Build request words (used to distinguish questions from build requests)
const BUILD_INDICATORS = [
  'build',
  'create',
  'make',
  'generate',
  'design',
  'develop',
  'code',
  'write',
  'implement',
  'add feature',
  'app',
  'application',
  'website',
  'component',
  'page',
  'dashboard',
  'calculator',
  'game',
  'timer',
  'counter',
  'todo',
  'form',
  'modal',
  'navbar',
  'sidebar',
  'app that',
  'component for',
  'page with',
  'project',
  'build me',
  'make me',
  'create me',
];

// Meta question patterns about capabilities
const META_QUESTION_PATTERNS = [
  /how (big|large|complex|many).*(can|could|do) you (build|create|make)/i,
  /what (can|could) you (build|create|make|generate)/i,
  /what (kind|type|sort) of (app|project|thing)/i,
  /(capabilities|limitations|able to|possible to)/i,
  /how (does|do) (this|it|you) work/i,
  /what (are|is) (your|the) (limits|capabilities|features)/i,
];

/**
 * Hook for message detection utilities
 *
 * @param _options - Configuration options (reserved for future use)
 * @returns Message sender utilities
 *
 * @example
 * ```tsx
 * const { isQuestion, getProgressMessages } = useMessageSender(options);
 *
 * if (isQuestion(userInput)) {
 *   // Handle question
 * }
 * ```
 */
export function useMessageSender(_options: UseMessageSenderOptions): UseMessageSenderReturn {
  /**
   * Detect if input is a question (client-side heuristic)
   * Note: The Builder Expert AI handles more accurate intent detection
   */
  const isQuestion = useCallback((input: string): boolean => {
    const lowerInput = input.toLowerCase();

    // Check for meta questions about capabilities
    const isMetaQuestion = META_QUESTION_PATTERNS.some((pattern) => pattern.test(input));
    if (isMetaQuestion) return true;

    // Check for question words
    const hasQuestionWords = QUESTION_INDICATORS.some((indicator) =>
      lowerInput.includes(indicator)
    );

    // Check for build words
    const hasBuildWords = BUILD_INDICATORS.some((indicator) => lowerInput.includes(indicator));

    // Handle "show me X" / "give me X" where X is an app/component
    const showGivePattern =
      /(show me|give me)\s+(a|an)?\s*(app|dashboard|calculator|game|timer|counter|todo|website|component|page|form|modal)/i;
    const hasShowGiveBuild = showGivePattern.test(input);

    return hasQuestionWords && !hasBuildWords && !hasShowGiveBuild;
  }, []);

  /**
   * Get progress messages based on request type
   */
  const getProgressMessages = useCallback(
    (isQuestionType: boolean, isModification: boolean): string[] => {
      if (isQuestionType) {
        return [
          '🤔 Thinking about your question...',
          '📚 Gathering information...',
          '✍️ Formulating answer...',
        ];
      }

      if (isModification) {
        return [
          '🔍 Analyzing your modification request...',
          '📋 Planning targeted changes...',
          '✨ Generating precise edits...',
          '🎯 Creating surgical modifications...',
        ];
      }

      return [
        '🤔 Analyzing your request...',
        '🏗️ Designing app structure...',
        '⚡ Generating components...',
        '🎨 Styling with Tailwind...',
        '✨ Adding functionality...',
        '🔧 Finalizing code...',
      ];
    },
    []
  );

  return {
    isQuestion,
    getProgressMessages,
  };
}

export default useMessageSender;
