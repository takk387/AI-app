import type { StateCreator } from 'zustand';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { AppState } from '../useAppStore';

/**
 * Chat slice state
 */
export interface ChatSlice {
  chatMessages: ChatMessage[];
  userInput: string;
  isGenerating: boolean;
  generationProgress: string;
  // Actions
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setUserInput: (input: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setGenerationProgress: (progress: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
}

export const createChatSlice: StateCreator<AppState, [['zustand/immer', never]], [], ChatSlice> = (
  set
) => ({
  chatMessages: [] as ChatMessage[],
  userInput: '',
  isGenerating: false,
  generationProgress: '',

  setChatMessages: (messages) =>
    set((state) => ({
      chatMessages: typeof messages === 'function' ? messages(state.chatMessages) : messages,
    })),
  setUserInput: (input) => set({ userInput: input }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  clearChatMessages: () => set({ chatMessages: [] }),
});
