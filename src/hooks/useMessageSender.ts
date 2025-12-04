/**
 * useMessageSender Hook - Core message sending logic for the AI Builder
 *
 * Extracted from AIBuilder.tsx for reusability and better separation of concerns.
 * This hook provides the message detection, routing logic, and API interaction
 * for Plan/Act mode, question detection, and build requests.
 *
 * Note: Due to the complexity of the message sending logic in AIBuilder.tsx,
 * this hook provides utility functions and constants that can be used alongside
 * the main sendMessage implementation.
 */

import { useCallback, useRef } from 'react';
import type {
  ChatMessage,
  GeneratedComponent,
  StagePlan,
  PendingDiff,
  CurrentStagePlan,
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
  /** Detect if input is a build request */
  isBuildRequest: (input: string) => boolean;
  /** Detect if input is requesting code */
  isCodeRequest: (input: string) => boolean;
  /** Detect if input is a complex modification */
  isComplexModification: (input: string, hasCurrentComponent: boolean) => boolean;
  /** Detect if input is a complex new app request */
  isComplexNewApp: (input: string, hasCurrentComponent: boolean) => boolean;
  /** Check if user is at a phase start point */
  isReadyToStartPhase: (
    lastMessage: ChatMessage | undefined,
    stagePlan: StagePlan | null
  ) => boolean;
  /** Check if user is ready to continue to next phase */
  isReadyToContinuePhase: (
    lastMessage: ChatMessage | undefined,
    stagePlan: StagePlan | null
  ) => boolean;
  /** Get progress messages based on request type */
  getProgressMessages: (isQuestion: boolean, isModification: boolean) => string[];
  /** Extract component name from user prompt */
  extractComponentName: (prompt: string) => string;
  /** Question indicators for detection */
  questionIndicators: string[];
  /** Build indicators for detection */
  buildIndicators: string[];
  /** Complex modification indicators */
  complexModificationIndicators: string[];
  /** New app complexity indicators */
  newAppComplexityIndicators: string[];
  /** Code request indicators */
  codeRequestIndicators: string[];
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

// Build request words and phrases
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

// Complex modification indicators
const COMPLEX_MODIFICATION_INDICATORS = [
  'add authentication',
  'add auth',
  'login system',
  'user accounts',
  'signup',
  'add database',
  'add backend',
  'add api',
  'connect to database',
  'add payment',
  'stripe',
  'checkout system',
  'completely change',
  'redesign everything',
  'rebuild',
  'add real-time',
  'add websockets',
  'add chat',
  'live updates',
  'add notifications',
  'push notifications',
  'add email',
  'send emails',
  'email system',
  'add file upload',
  'image upload',
  'file storage',
];

// New app complexity indicators
const NEW_APP_COMPLEXITY_INDICATORS = [
  'complete',
  'full-featured',
  'comprehensive',
  'all features',
  'everything',
  'entire',
  'full',
  'advanced',
  'complex',
  'with authentication',
  'with auth',
  'with backend',
  'with database',
  'multiple pages',
  'full stack',
  'production-ready',
  'e-commerce',
  'social media',
  'social network',
  'marketplace',
  'cms',
  'content management',
  'blog platform',
  'forum',
];

// Code request indicators
const CODE_REQUEST_INDICATORS = [
  'show me the code',
  'show code',
  'give me the code',
  'what is the code',
  "what's the code",
  'display code',
  'let me see the code',
  'code for',
  'view code',
  'show implementation',
  'show me how',
  'code example',
  'code snippet',
  'share code',
  'paste code',
  'write code',
  'provide code',
  'code please',
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
 * Hook for message sending utilities and detection logic
 *
 * @param options - Configuration options
 * @returns Message sender utilities
 *
 * @example
 * ```tsx
 * const {
 *   isQuestion,
 *   isBuildRequest,
 *   isComplexModification,
 *   getProgressMessages,
 * } = useMessageSender({
 *   chatMessages,
 *   setChatMessages,
 *   currentComponent,
 *   setCurrentComponent,
 *   currentMode,
 *   newAppStagePlan,
 *   setNewAppStagePlan,
 *   onComponentCreated: handleComponentCreated,
 *   onShowDiffPreview: handleShowDiff,
 *   onShowStagingModal: handleShowStaging,
 *   onSaveComponent: saveComponent,
 *   uploadedImage,
 *   onClearImage: clearImage,
 * });
 * ```
 */
export function useMessageSender(_options: UseMessageSenderOptions): UseMessageSenderReturn {
  // We don't use options directly in this simplified version,
  // but they're available for future enhancements

  /**
   * Detect if input is a question
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
   * Detect if input is a build request
   */
  const isBuildRequest = useCallback((input: string): boolean => {
    const lowerInput = input.toLowerCase();

    const hasBuildWords = BUILD_INDICATORS.some((indicator) => lowerInput.includes(indicator));

    // Handle "show me X" / "give me X" where X is an app/component
    const showGivePattern =
      /(show me|give me)\s+(a|an)?\s*(app|dashboard|calculator|game|timer|counter|todo|website|component|page|form|modal)/i;
    const hasShowGiveBuild = showGivePattern.test(input);

    return hasBuildWords || hasShowGiveBuild;
  }, []);

  /**
   * Detect if input is requesting code
   */
  const isCodeRequest = useCallback((input: string): boolean => {
    const lowerInput = input.toLowerCase();
    return CODE_REQUEST_INDICATORS.some((indicator) => lowerInput.includes(indicator));
  }, []);

  /**
   * Detect if input is a complex modification
   */
  const isComplexModification = useCallback(
    (input: string, hasCurrentComponent: boolean): boolean => {
      if (!hasCurrentComponent) return false;

      const lowerInput = input.toLowerCase();
      return COMPLEX_MODIFICATION_INDICATORS.some((indicator) => lowerInput.includes(indicator));
    },
    []
  );

  /**
   * Detect if input is a complex new app request
   */
  const isComplexNewApp = useCallback((input: string, hasCurrentComponent: boolean): boolean => {
    if (hasCurrentComponent) return false;

    const lowerInput = input.toLowerCase();
    const wordCount = input.split(' ').length;

    const hasComplexityIndicators = NEW_APP_COMPLEXITY_INDICATORS.some((indicator) =>
      lowerInput.includes(indicator)
    );

    // Check for question first
    const hasQuestionWords = QUESTION_INDICATORS.some((indicator) =>
      lowerInput.includes(indicator)
    );

    if (hasQuestionWords) return false;

    return wordCount > 40 || hasComplexityIndicators;
  }, []);

  /**
   * Check if user is at a phase start point
   */
  const isReadyToStartPhase = useCallback(
    (lastMessage: ChatMessage | undefined, stagePlan: StagePlan | null): boolean => {
      if (!lastMessage || !stagePlan) return false;

      return (
        lastMessage.role === 'assistant' &&
        lastMessage.content.includes("Type **'start'** or **'begin'**") &&
        stagePlan.phases.every((p) => p.status === 'pending')
      );
    },
    []
  );

  /**
   * Check if user is ready to continue to next phase
   */
  const isReadyToContinuePhase = useCallback(
    (lastMessage: ChatMessage | undefined, stagePlan: StagePlan | null): boolean => {
      if (!lastMessage || !stagePlan) return false;

      return (
        lastMessage.role === 'assistant' &&
        lastMessage.content.includes('Phase') &&
        lastMessage.content.includes('Complete!') &&
        lastMessage.content.includes('**Ready to continue?**') &&
        stagePlan.phases.some((p) => p.status === 'pending')
      );
    },
    []
  );

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

  /**
   * Extract component name from user prompt
   */
  const extractComponentName = useCallback((prompt: string): string => {
    // Simple extraction: take first few words
    const words = prompt.split(' ').slice(0, 3).join(' ');
    return words.length > 30 ? words.slice(0, 27) + '...' : words;
  }, []);

  return {
    isQuestion,
    isBuildRequest,
    isCodeRequest,
    isComplexModification,
    isComplexNewApp,
    isReadyToStartPhase,
    isReadyToContinuePhase,
    getProgressMessages,
    extractComponentName,
    questionIndicators: QUESTION_INDICATORS,
    buildIndicators: BUILD_INDICATORS,
    complexModificationIndicators: COMPLEX_MODIFICATION_INDICATORS,
    newAppComplexityIndicators: NEW_APP_COMPLEXITY_INDICATORS,
    codeRequestIndicators: CODE_REQUEST_INDICATORS,
  };
}

export default useMessageSender;
