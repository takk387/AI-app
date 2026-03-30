import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveWizardDraft,
  loadWizardDraft,
  deleteDraft,
  getDraftMetadata,
  formatDraftAge,
} from '@/utils/wizardAutoSave';

/**
 * Draft persistence hook for wizard components
 * Handles auto-save and recovery of conversation state
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface DraftKeys {
  messages: string;
  state: string;
  plan: string;
}

interface UseDraftPersistenceOptions<TState> {
  draftKeys: DraftKeys;
  initialState: TState;
  createGreeting: () => Message;
  onShowToast?: (opts: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

interface UseDraftPersistenceReturn<TState, TPlan> {
  // State
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  wizardState: TState;
  setWizardState: React.Dispatch<React.SetStateAction<TState>>;
  phasePlan: TPlan | null;
  setPhasePlan: React.Dispatch<React.SetStateAction<TPlan | null>>;

  // Recovery state
  isInitialized: boolean;
  showRecoveryPrompt: boolean;
  draftAge: string;

  // Actions
  startFresh: () => void;
  recover: () => void;
  clearDrafts: () => void;
}

export function useDraftPersistence<TState, TPlan>({
  draftKeys,
  initialState,
  createGreeting,
  onShowToast,
}: UseDraftPersistenceOptions<TState>): UseDraftPersistenceReturn<TState, TPlan> {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [wizardState, setWizardState] = useState<TState>(initialState);
  const [phasePlan, setPhasePlan] = useState<TPlan | null>(null);

  // Recovery state
  const [isInitialized, setIsInitialized] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [draftAge, setDraftAge] = useState('');

  // Track if we should skip auto-save (during recovery check)
  const skipAutoSave = useRef(true);

  // Check for existing draft on mount
  useEffect(() => {
    const checkForDraft = () => {
      const messagesMetadata = getDraftMetadata(draftKeys.messages);
      const stateMetadata = getDraftMetadata(draftKeys.state);

      // If we have a saved conversation with more than just the greeting
      if (messagesMetadata || stateMetadata) {
        const savedMessages = loadWizardDraft<Message[]>(draftKeys.messages);

        // Check if there's actual conversation content (more than just greeting)
        if (savedMessages && savedMessages.length > 1) {
          const timestamp = messagesMetadata?.savedAt || stateMetadata?.savedAt;
          if (timestamp) {
            setDraftAge(formatDraftAge(timestamp));
          }
          setShowRecoveryPrompt(true);
          return;
        }
      }

      // No valid draft found, start fresh
      startFreshInternal();
    };

    checkForDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start fresh conversation
  const startFreshInternal = useCallback(() => {
    // Clear any existing drafts
    deleteDraft(draftKeys.messages);
    deleteDraft(draftKeys.state);
    deleteDraft(draftKeys.plan);

    const greeting = createGreeting();
    setMessages([greeting]);
    setWizardState(initialState);
    setPhasePlan(null);
    setShowRecoveryPrompt(false);
    setIsInitialized(true);
    skipAutoSave.current = false;
  }, [draftKeys, initialState, createGreeting]);

  // Recover saved conversation
  const recoverInternal = useCallback(() => {
    const savedMessages = loadWizardDraft<Message[]>(draftKeys.messages);
    const savedState = loadWizardDraft<TState>(draftKeys.state);
    const savedPhasePlan = loadWizardDraft<TPlan>(draftKeys.plan);

    if (savedMessages && savedMessages.length > 0) {
      // Restore timestamps as Date objects
      const messagesWithDates = savedMessages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(messagesWithDates);
    }

    if (savedState) {
      setWizardState(savedState);
    }

    if (savedPhasePlan) {
      setPhasePlan(savedPhasePlan);
    }

    setShowRecoveryPrompt(false);
    setIsInitialized(true);
    skipAutoSave.current = false;

    onShowToast?.({
      type: 'success',
      message: 'Previous conversation restored!',
    });
  }, [draftKeys, onShowToast]);

  // Clear all drafts
  const clearDraftsInternal = useCallback(() => {
    deleteDraft(draftKeys.messages);
    deleteDraft(draftKeys.state);
    deleteDraft(draftKeys.plan);
  }, [draftKeys]);

  // Auto-save messages IMMEDIATELY when they change (no debounce)
  // Messages are critical data - we don't want to lose them on crash
  useEffect(() => {
    if (!isInitialized || messages.length === 0 || skipAutoSave.current) return;

    // Save immediately - messages are too important to risk losing
    saveWizardDraft(draftKeys.messages, messages);
  }, [messages, isInitialized, draftKeys.messages]);

  // Auto-save wizard state when it changes
  useEffect(() => {
    if (!isInitialized || skipAutoSave.current) return;

    const saveTimeout = setTimeout(() => {
      saveWizardDraft(draftKeys.state, wizardState);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [wizardState, isInitialized, draftKeys.state]);

  // Auto-save phase plan when it changes
  useEffect(() => {
    if (!isInitialized || !phasePlan || skipAutoSave.current) return;

    saveWizardDraft(draftKeys.plan, phasePlan);
  }, [phasePlan, isInitialized, draftKeys.plan]);

  return {
    // State
    messages,
    setMessages,
    wizardState,
    setWizardState,
    phasePlan,
    setPhasePlan,

    // Recovery state
    isInitialized,
    showRecoveryPrompt,
    draftAge,

    // Actions
    startFresh: startFreshInternal,
    recover: recoverInternal,
    clearDrafts: clearDraftsInternal,
  };
}
