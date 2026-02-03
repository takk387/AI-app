/**
 * useChatSystem Hook - Combines chat-related functionality
 *
 * Extracted from MainBuilderView.tsx for reusability and better separation of concerns.
 * Provides chat message management, input handling, and generation state.
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, BuilderMode } from '@/types/aiBuilderTypes';
import type { WizardState } from '@/types/wizardState';

// Re-export WizardState from consolidated types for backwards compatibility
export type { WizardState } from '@/types/wizardState';

const INITIAL_WIZARD_STATE: WizardState = {
  features: [],
  technical: {},
  isComplete: false,
};

/**
 * Return type for useChatSystem hook
 */
export interface UseChatSystemReturn {
  // Wizard state (for PLAN mode Smart Conversations)
  /** Current wizard state tracking app concept */
  wizardState: WizardState;
  /** Reset wizard state */
  resetWizardState: () => void;
  /** Update wizard state from API response */
  updateWizardState: (state: WizardState) => void;

  // Messages
  /** Current chat messages */
  chatMessages: ChatMessage[];
  /** Set chat messages */
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Add a single message to the chat */
  addMessage: (message: ChatMessage) => void;

  // Input
  /** Current user input */
  userInput: string;
  /** Set user input */
  setUserInput: (input: string) => void;

  // Generation state
  /** Whether AI is currently generating */
  isGenerating: boolean;
  /** Set generating state */
  setIsGenerating: (generating: boolean) => void;
  /** Current generation progress message */
  generationProgress: string;
  /** Set generation progress message */
  setGenerationProgress: (progress: string) => void;

  // Image upload
  /** Uploaded image as base64 data URL */
  uploadedImage: string | null;
  /** Uploaded image file */
  imageFile: File | null;
  /** Handle image file upload */
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Remove uploaded image */
  removeImage: () => void;
  /** Ref for file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Last request tracking
  /** Last user request that was sent */
  lastUserRequest: string;
  /** Set last user request */
  setLastUserRequest: (request: string) => void;

  // Utilities
  /** Get the welcome message for the chat */
  getWelcomeMessage: () => ChatMessage;
  /** Get a mode transition message */
  getModeTransitionMessage: (fromMode: BuilderMode, toMode: BuilderMode) => ChatMessage;
  /** Clear the chat to welcome state */
  clearChat: () => void;
}

/**
 * Hook for managing the chat system
 *
 * @returns Chat system methods and state
 *
 * @example
 * ```tsx
 * const {
 *   chatMessages,
 *   setChatMessages,
 *   userInput,
 *   setUserInput,
 *   isGenerating,
 *   uploadedImage,
 *   handleImageUpload,
 * } = useChatSystem();
 * ```
 */
export function useChatSystem(): UseChatSystemReturn {
  // Messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Input state
  const [userInput, setUserInput] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Last request tracking
  const [lastUserRequest, setLastUserRequest] = useState('');

  // Wizard state for PLAN mode Smart Conversations
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_WIZARD_STATE);

  /**
   * Add a single message to the chat
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setChatMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Handle image file upload
   */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      console.error('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.onerror = () => {
      console.error('Error reading file:', reader.error);
    };
    reader.readAsDataURL(file);
  }, []);

  /**
   * Remove uploaded image
   */
  const removeImage = useCallback(() => {
    setUploadedImage(null);
    setImageFile(null);
    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Get the welcome message for the chat
   */
  const getWelcomeMessage = useCallback((): ChatMessage => {
    return {
      id: 'welcome',
      role: 'system',
      content:
        "👋 Hi! I'm your AI App Builder.\n\n🎯 **How It Works:**\n\n**💭 PLAN Mode** (Current):\n• Discuss what you want to build\n• I'll help design the requirements and architecture\n• No code generated - just planning and roadmapping\n• Ask questions, refine ideas, create specifications\n\n**⚡ ACT Mode:**\n• I'll read our plan and build the app\n• Generates working code based on our discussion\n• Can modify existing apps with surgical precision\n\n**🔒 Smart Protection:**\n• Every change saved to version history\n• One-click undo/redo anytime\n• Review changes before applying\n\n💡 **Start by telling me what you want to build, and we'll plan it together!**",
      timestamp: new Date().toISOString(),
    };
  }, []);

  /**
   * Get a mode transition message
   */
  const getModeTransitionMessage = useCallback(
    (fromMode: BuilderMode, toMode: BuilderMode): ChatMessage => {
      if (fromMode === 'PLAN' && toMode === 'ACT') {
        return {
          id: Date.now().toString(),
          role: 'system',
          content: `⚡ **Switched to ACT Mode**\n\nReady to build! I'll read the plan we discussed and implement it.\n\n**To build:** Type "build it" or "implement the plan" and I'll create your app based on our conversation.`,
          timestamp: new Date().toISOString(),
        };
      }

      if (fromMode === 'ACT' && toMode === 'PLAN') {
        return {
          id: Date.now().toString(),
          role: 'system',
          content: `💭 **Switched to PLAN Mode**\n\nLet's plan your next feature or discuss improvements. I won't generate code in this mode - we'll design the requirements first.`,
          timestamp: new Date().toISOString(),
        };
      }

      // Default message for same mode
      return {
        id: Date.now().toString(),
        role: 'system',
        content: `Mode: ${toMode}`,
        timestamp: new Date().toISOString(),
      };
    },
    []
  );

  /**
   * Reset wizard state
   */
  const resetWizardState = useCallback(() => {
    setWizardState(INITIAL_WIZARD_STATE);
  }, []);

  /**
   * Update wizard state from API response
   */
  const updateWizardState = useCallback((state: WizardState) => {
    setWizardState(state);
  }, []);

  /**
   * Clear the chat to welcome state
   */
  const clearChat = useCallback(() => {
    setChatMessages([getWelcomeMessage()]);
    setUserInput('');
    setIsGenerating(false);
    setGenerationProgress('');
    removeImage();
    setLastUserRequest('');
    resetWizardState();
  }, [getWelcomeMessage, removeImage, resetWizardState]);

  return {
    // Wizard state
    wizardState,
    resetWizardState,
    updateWizardState,

    // Messages
    chatMessages,
    setChatMessages,
    addMessage,

    // Input
    userInput,
    setUserInput,

    // Generation state
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,

    // Image upload
    uploadedImage,
    imageFile,
    handleImageUpload,
    removeImage,
    fileInputRef,

    // Last request tracking
    lastUserRequest,
    setLastUserRequest,

    // Utilities
    getWelcomeMessage,
    getModeTransitionMessage,
    clearChat,
  };
}

export default useChatSystem;
