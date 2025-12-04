"use client";

/**
 * AIBuilder - Refactored Orchestrator Component
 * 
 * This component has been refactored from 3182 lines to ~1570 lines (50% reduction).
 * It now uses:
 * - Zustand store for state management
 * - Extracted ChatPanel and PreviewPanel components
 * - Custom hooks (useVersionControl, useDatabaseSync, useKeyboardShortcuts, useFileStorage, useMessageSender, useDynamicBuildPhases)
 * - Modal components from ./modals
 * 
 * All functionality is preserved from the original implementation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';

// Extracted components
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { ToastProvider } from './Toast';
import AppConceptWizard from './AppConceptWizard';
import NaturalConversationWizard from './NaturalConversationWizard';
import LayoutBuilderWizard from './LayoutBuilderWizard';
import SettingsPage from './SettingsPage';
import BuilderHeader from './BuilderHeader';

// UI components
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui';

// Modal components
import {
  LibraryModal,
  ApprovalModal,
  VersionHistoryModal,
  DeploymentModal,
  DiffPreviewModal,
  StagingConsentModal,
  CompareVersionsModal,
  PhasedBuildPanel,
} from './modals';

// Build system components
import {
  PhaseDetailView,
} from './build';

// Custom hooks
import {
  useDatabaseSync,
  useFileStorage,
  useVersionControl,
  useKeyboardShortcuts,
  useMessageSender,
} from '@/hooks';
import { useDynamicBuildPhases } from '@/hooks/useDynamicBuildPhases';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';

// Scope detection service
import { scopeDetectionService } from '@/services/ScopeDetectionService';
import { adaptAllPhasesToUI, adaptDynamicProgressToUI } from '@/types/phaseAdapters';

// Types
import type { AppConcept, ImplementationPlan, BuildPhase } from '../types/appConcept';
import type { GeneratedComponent, ChatMessage, AppVersion, StagePlan, Phase, PendingChange, PendingDiff, CurrentStagePlan } from '../types/aiBuilderTypes';
import type { PhasedAppConcept, PhaseId } from '../types/buildPhases';
import type { DynamicPhasePlan } from '../types/dynamicPhases';
import { buildPhaseExecutionPrompt } from '../services/PhaseExecutionManager';

// Utils
import { exportAppAsZip, downloadBlob, parseAppFiles, getDeploymentInstructions, type DeploymentInstructions } from '../utils/exportApp';

// Services
import { createClient } from '@/utils/supabase/client';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for messages and components
 * Uses crypto.randomUUID() with fallback for older environments
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get welcome message for new conversations
 */
function getWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'system',
    content: "👋 Hi! I'm your AI App Builder.\n\n🎯 **How It Works:**\n\n**💭 PLAN Mode** (Current):\n• Discuss what you want to build\n• Design requirements and architecture\n• No code - just planning and roadmapping\n\n**⚡ ACT Mode:**\n• Generates working code from our plan\n• Modifies apps with surgical precision\n• Real-time streaming progress\n\n**🔒 Smart Protection:**\n• Every change saved to version history\n• One-click undo/redo anytime\n• Review changes before applying\n\n**✨ Pro Features:**\n🧙‍♂️ Use Wizards for guided planning • 🏗️ Build in phases • 🖼️ Upload design inspiration • 📦 Export & deploy\n\n💡 **Start by telling me what you want to build, and we'll plan it together!**",
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract component name from user prompt
 */
function extractComponentName(prompt: string): string {
  const words = prompt.split(' ').slice(0, 3).join(' ');
  return words.length > 30 ? words.slice(0, 27) + '...' : words;
}

/**
 * Phase data structure from API response
 * Properties are optional since API responses may be incomplete
 */
interface PhaseApiData {
  number?: number;
  name?: string;
  description?: string;
  features?: string[];
}

/**
 * Format phase data from API response into displayable content
 * Safely handles potentially missing properties with defaults
 */
function formatPhaseContent(phases: PhaseApiData[]): string {
  if (!Array.isArray(phases) || phases.length === 0) {
    return 'No phases defined';
  }
  
  return phases.map((phase, index) => {
    const phaseNumber = phase.number ?? index + 1;
    const phaseName = phase.name ?? 'Unnamed Phase';
    const phaseDescription = phase.description ?? '';
    const features = Array.isArray(phase.features) 
      ? phase.features.map((f) => `  • ${f}`).join('\n') 
      : '';
    
    return `**Phase ${phaseNumber}: ${phaseName}**\n${phaseDescription}${features ? '\n' + features : ''}`;
  }).join('\n\n');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIBuilder() {
  // Authentication
  const { user, loading: authLoading, sessionReady } = useAuth();
  
  // ============================================================================
  // ZUSTAND STORE STATE
  // ============================================================================
  const {
    // Chat
    chatMessages,
    setChatMessages,
    userInput,
    setUserInput,
    isGenerating,
    setIsGenerating,
    generationProgress,
    setGenerationProgress,
    
    // Mode
    currentMode,
    setCurrentMode,
    lastUserRequest,
    setLastUserRequest,
    
    // Components
    components,
    setComponents,
    currentComponent,
    setCurrentComponent,
    loadingApps,
    setLoadingApps,
    dbSyncError,
    setDbSyncError,
    
    // UI
    isClient,
    setIsClient,
    activeTab,
    setActiveTab,
    showLibrary,
    setShowLibrary,
    showVersionHistory,
    setShowVersionHistory,
    showSettings,
    setShowSettings,
    showDiffPreview,
    setShowDiffPreview,
    showApprovalModal,
    setShowApprovalModal,
    showDeploymentModal,
    setShowDeploymentModal,
    showCompareModal,
    setShowCompareModal,
    showNewAppStagingModal,
    setShowNewAppStagingModal,
    showConceptWizard,
    setShowConceptWizard,
    showConversationalWizard,
    setShowConversationalWizard,
    showLayoutBuilder,
    setShowLayoutBuilder,
    showAdvancedPhasedBuild,
    setShowAdvancedPhasedBuild,
    searchQuery,
    setSearchQuery,
    
    // Data
    pendingChange,
    setPendingChange,
    pendingDiff,
    setPendingDiff,
    pendingNewAppRequest,
    setPendingNewAppRequest,
    deploymentInstructions,
    setDeploymentInstructions,
    exportingApp,
    setExportingApp,
    compareVersions,
    setCompareVersions,
    currentStagePlan,
    setCurrentStagePlan,
    newAppStagePlan,
    setNewAppStagePlan,
    appConcept,
    setAppConcept,
    implementationPlan,
    setImplementationPlan,
    selectedPhaseId,
    setSelectedPhaseId,
    isValidating,
    setIsValidating,
    uploadedImage,
    setUploadedImage,
    
    // File storage
    contentTab,
    setContentTab,
  } = useAppStore();

// ============================================================================
// LOCAL STATE (refs, computed values, etc)
// ============================================================================
const previousModeRef = useRef<'PLAN' | 'ACT'>('PLAN');
const fileInputRef = useRef<HTMLInputElement>(null);
const [imageFile, setImageFile] = useState<File | null>(null);

// Smart Conversations: Wizard state for PLAN mode
const [wizardState, setWizardState] = useState<{
  name?: string;
  description?: string;
  features: Array<{ name: string; description: string; priority: string }>;
  technical: Record<string, boolean | string | undefined>;
  isComplete: boolean;
  readyForPhases: boolean;
}>({
  features: [],
  technical: {},
  isComplete: false,
  readyForPhases: false,
});

  // Dynamic Phase Generation state
  const [dynamicPhasePlan, setDynamicPhasePlan] = useState<DynamicPhasePlan | null>(null);
  
  // Initialize StorageService
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================
  
  // Memoized error handler for database sync to prevent infinite loops
  const handleDbError = useCallback((error: string) => {
    setDbSyncError(error);
  }, [setDbSyncError]);
  
  // Database sync hook
  const {
    saveComponent: saveComponentToDb,
    deleteComponent: deleteComponentFromDb,
    loadComponents: loadComponentsFromDb,
    isLoading: isDbLoading,
    error: dbError,
  } = useDatabaseSync({
    userId: user?.id || null,
    onError: handleDbError,
  });
  
  // Version control hook
  const versionControl = useVersionControl({
    currentComponent,
    onComponentUpdate: (updated) => {
      setCurrentComponent(updated);
      setComponents(prev => 
        prev.map(comp => comp.id === currentComponent?.id ? updated : comp)
      );
    },
  });

  // File storage hook
  const fileStorage = useFileStorage({
    userId: user?.id || null,
    storageService,
  });

  // Message sender utilities
  const messageSender = useMessageSender({
    chatMessages,
    setChatMessages,
    currentComponent,
    setCurrentComponent,
    currentMode,
    newAppStagePlan,
    setNewAppStagePlan,
    onComponentCreated: (component) => {
      setComponents(prev => [component, ...prev].slice(0, 50));
    },
    onShowDiffPreview: (diff) => {
      setPendingDiff(diff);
      setShowDiffPreview(true);
    },
    onShowStagingModal: (request) => {
      setPendingNewAppRequest(request);
      setShowNewAppStagingModal(true);
    },
    onSaveComponent: async (component) => {
      await saveComponentToDb(component);
    },
    uploadedImage,
    onClearImage: () => {
      setUploadedImage(null);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  // Streaming generation hook for real-time progress
  const streaming = useStreamingGeneration({
    onStart: () => {
      setGenerationProgress('Starting generation...');
    },
    onFileStart: (filePath) => {
      setGenerationProgress(`Generating ${filePath.split('/').pop()}...`);
    },
    onComplete: (data, stats) => {
      console.log(`Generation complete: ${stats.filesGenerated} files in ${(stats.totalTime / 1000).toFixed(1)}s`);
    },
    onError: (message) => {
      console.error('Streaming error:', message);
    },
  });

  // Dynamic build phases hook (replaces useBuildPhases)
  const dynamicBuildPhases = useDynamicBuildPhases({
    onPhaseStart: (phase) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🚀 **Starting Phase ${phase.number}: ${phase.name}**\n\n${phase.description}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onPhaseComplete: (phase, result) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: result.success
          ? `✅ **Phase ${phase.number} Complete!**\n\nImplemented ${result.implementedFeatures.length} features in ${(result.duration / 1000).toFixed(1)}s`
          : `⚠️ **Phase ${phase.number} had issues**\n\n${result.errors?.join('\n') || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onBuildComplete: (plan) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🎉 **Build Complete!**\n\nAll ${plan.totalPhases} phases finished. Your app is ready!`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onError: (error, phase) => {
      const notification: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `❌ **Build Error${phase ? ` in Phase ${phase.number}` : ''}**\n\n${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
  });

  // Adapted phases for legacy UI components
  const adaptedPhases = useMemo(() => {
    if (!dynamicPhasePlan) return [];
    return adaptAllPhasesToUI(dynamicPhasePlan);
  }, [dynamicPhasePlan]);

  const adaptedProgress = useMemo(() => {
    if (!dynamicPhasePlan) {
      return {
        currentPhaseId: null,
        currentPhaseIndex: -1,
        totalPhases: 0,
        completedPhases: [],
        percentComplete: 0,
        estimatedTimeRemaining: '',
        startedAt: '',
        lastUpdated: '',
      };
    }
    return adaptDynamicProgressToUI(dynamicPhasePlan);
  }, [dynamicPhasePlan]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: versionControl.undo,
    onRedo: versionControl.redo,
    onSave: () => {
      if (currentComponent) {
        saveComponentToDb(currentComponent);
      }
    },
    enabled: !!currentComponent,
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true);
    setChatMessages([getWelcomeMessage()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - setters are stable

  // Detect mode transitions
  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = currentMode;

    if (previousMode === 'PLAN' && currentMode === 'ACT') {
      const transitionMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `⚡ **Switched to ACT Mode**\n\nReady to build! I'll read the plan we discussed and implement it.\n\n**To build:** Type "build it" or "implement the plan" and I'll create your app based on our conversation.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, transitionMessage]);
    }

    if (previousMode === 'ACT' && currentMode === 'PLAN') {
      const transitionMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `💭 **Switched to PLAN Mode**\n\nLet's plan your next feature or discuss improvements. I won't generate code in this mode - we'll design the requirements first.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, transitionMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode]); // Only react to mode changes - setChatMessages is stable

  // Load components from database
  useEffect(() => {
    let mounted = true;
    
    const loadApps = async () => {
      if (!sessionReady) return;
      if (!mounted) return;
      
      setLoadingApps(true);
      setDbSyncError(null);
      
      try {
        if (user) {
          // Load from database
          const dbComponents = await loadComponentsFromDb();
          
          // Load from localStorage
          let localComponents: GeneratedComponent[] = [];
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ai_components');
            if (stored) {
              try {
                localComponents = JSON.parse(stored);
              } catch (e) {
                console.error('Error parsing localStorage:', e);
              }
            }
          }
          
          // Merge components
          const mergedMap = new Map<string, GeneratedComponent>();
          localComponents.forEach(comp => mergedMap.set(comp.id, comp));
          dbComponents.forEach(comp => mergedMap.set(comp.id, comp));
          
          const mergedComponents = Array.from(mergedMap.values()).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setComponents(mergedComponents);
          
          // Cache in localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('ai_components', JSON.stringify(mergedComponents));

              // Restore last active app
              const lastAppId = localStorage.getItem('current_app_id');
              if (lastAppId && mergedComponents.length > 0) {
                const lastApp = mergedComponents.find(c => c.id === lastAppId);
                if (lastApp) {
                  setCurrentComponent(lastApp);
                  if (lastApp.conversationHistory && lastApp.conversationHistory.length > 0) {
                    setChatMessages(lastApp.conversationHistory);
                  }
                  setActiveTab('preview');
                }
              }
            } catch (e) {
              console.warn('Failed to save to localStorage:', e);
            }
          }
        } else {
          // Load from localStorage only
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ai_components');
            if (stored) {
              try {
                const parsedComponents = JSON.parse(stored);
                setComponents(parsedComponents);
                
                const lastAppId = localStorage.getItem('current_app_id');
                if (lastAppId && parsedComponents.length > 0) {
                  const lastApp = parsedComponents.find((c: GeneratedComponent) => c.id === lastAppId);
                  if (lastApp) {
                    setCurrentComponent(lastApp);
                    if (lastApp.conversationHistory && lastApp.conversationHistory.length > 0) {
                      setChatMessages(lastApp.conversationHistory);
                    }
                    setActiveTab('preview');
                  }
                }
              } catch (e) {
                console.error('Error loading components from localStorage:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in loadApps:', error);
        setDbSyncError('Failed to load apps');
      } finally {
        setLoadingApps(false);
      }
    };
    
    loadApps();
    
    return () => { mounted = false; };
  // Note: This effect should only run when sessionReady or user changes.
  // loadComponentsFromDb is stable after we memoized handleDbError.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, user?.id]);

  // Save components to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && components.length > 0) {
      try {
        localStorage.setItem('ai_components', JSON.stringify(components));
      } catch (e) {
        console.warn('Failed to save components to localStorage:', e);
      }
    }
  }, [components]);

  // Save current app ID to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && currentComponent) {
      try {
        localStorage.setItem('current_app_id', currentComponent.id);
      } catch (e) {
        console.warn('Failed to save current app ID to localStorage:', e);
      }
    }
  }, [currentComponent?.id]);

  // Load files when storage tab is active
  useEffect(() => {
    if (user && showLibrary && contentTab === 'files') {
      fileStorage.loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showLibrary, contentTab]); // fileStorage.loadFiles is stable

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Image upload handler
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [setUploadedImage]);

  // Remove uploaded image
  const removeImage = useCallback(() => {
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUploadedImage]);

  // Generate implementation plan from app concept
  const generateImplementationPlan = useCallback((concept: AppConcept) => {
    const phases: BuildPhase[] = [];
    let phaseNumber = 1;

    // Phase 1: Foundation & Layout
    phases.push({
      id: `phase-${phaseNumber}`,
      phaseNumber,
      name: 'Foundation & Layout',
      description: `Set up the base structure with ${concept.uiPreferences.layout} layout, ${concept.uiPreferences.style} style, and ${concept.uiPreferences.colorScheme} color scheme`,
      objectives: ['Create main layout structure', 'Set up navigation', 'Implement responsive design', 'Apply theme and styling'],
      prompt: `Create a ${concept.uiPreferences.layout} layout for "${concept.name}" with ${concept.uiPreferences.style} styling and ${concept.uiPreferences.colorScheme} color scheme.`,
      dependencies: [],
      features: [],
      estimatedComplexity: 'moderate',
      status: 'pending'
    });
    phaseNumber++;

    // Phase 2: Core Features (High Priority)
    const highPriorityFeatures = concept.coreFeatures.filter(f => f.priority === 'high');
    if (highPriorityFeatures.length > 0) {
      phases.push({
        id: `phase-${phaseNumber}`,
        phaseNumber,
        name: 'Core Features',
        description: 'Implement high-priority features',
        objectives: highPriorityFeatures.map(f => f.name),
        prompt: `Add these core features to "${concept.name}": ${highPriorityFeatures.map(f => `${f.name} - ${f.description}`).join('; ')}`,
        dependencies: [`phase-${phaseNumber - 1}`],
        features: highPriorityFeatures.map(f => f.id),
        estimatedComplexity: 'complex',
        status: 'pending'
      });
      phaseNumber++;
    }

    // More phases can be added here...

    const plan: ImplementationPlan = {
      concept,
      phases,
      estimatedSteps: phases.length,
      createdAt: new Date().toISOString()
    };

    setImplementationPlan(plan);

    // Add system message about the plan
    const planMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `🎯 **Implementation Plan Created for "${concept.name}"**\n\n` +
        `I've analyzed your app concept and created a ${phases.length}-phase build plan:\n\n` +
        phases.map((p) => `**Phase ${p.phaseNumber}: ${p.name}**\n${p.description}`).join('\n\n') +
        `\n\n💡 **Ready to start building?** Switch to **⚡ ACT Mode** and type "build phase 1" or "start building" to begin!`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, planMessage]);

    // Convert to StagePlan format
    const stagePlan: StagePlan = {
      totalPhases: phases.length,
      currentPhase: 0,
      phases: phases.map(p => ({
        number: p.phaseNumber,
        name: p.name,
        description: p.description,
        features: p.objectives,
        status: 'pending' as const
      }))
    };
    setNewAppStagePlan(stagePlan);
  }, [setChatMessages, setImplementationPlan, setNewAppStagePlan]);

  // Handle concept wizard completion
  const handleConceptComplete = useCallback((concept: AppConcept) => {
    setAppConcept(concept);
    setShowConceptWizard(false);

    const welcomeMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `✨ **App Concept Created: "${concept.name}"**\n\n` +
        `**Description:** ${concept.description}\n\n` +
        `**Target Users:** ${concept.targetUsers}\n\n` +
        `**Features:** ${concept.coreFeatures.length} defined\n\n` +
        `I'm now generating your implementation plan...`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, welcomeMessage]);

    generateImplementationPlan(concept);
  }, [setAppConcept, setShowConceptWizard, setChatMessages, generateImplementationPlan]);

  // Handle natural wizard completion with dynamic phase plan
  const handleNaturalWizardComplete = useCallback((concept: AppConcept, phasePlan?: DynamicPhasePlan) => {
    setAppConcept(concept);
    setShowConversationalWizard(false);

    if (phasePlan) {
      setDynamicPhasePlan(phasePlan);
      // Initialize the dynamic build phases hook with the plan
      dynamicBuildPhases.initializePlan(phasePlan);

      // Convert to existing StagePlan format for compatibility
      const stagePlan: StagePlan = {
        totalPhases: phasePlan.totalPhases,
        currentPhase: 0,
        phases: phasePlan.phases.map(p => ({
          number: p.number,
          name: p.name,
          description: p.description,
          features: p.features,
          status: 'pending' as const
        }))
      };
      setNewAppStagePlan(stagePlan);

      // Show phase plan message
      const planMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `🎯 **${phasePlan.totalPhases}-Phase Build Plan Created for "${concept.name}"**\n\n` +
          `**Complexity:** ${phasePlan.complexity}\n` +
          `**Estimated Time:** ${phasePlan.estimatedTotalTime}\n\n` +
          phasePlan.phases.map(p =>
            `**Phase ${p.number}: ${p.name}** (${p.estimatedTime})\n${p.description}`
          ).join('\n\n') +
          `\n\n💡 **Ready to start?** Switch to ACT mode and type "build phase 1"!`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, planMessage]);
    } else {
      // No phase plan, just show concept created message
      const welcomeMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✨ **App Concept Created: "${concept.name}"**\n\n` +
          `**Description:** ${concept.description}\n\n` +
          `**Target Users:** ${concept.targetUsers}\n\n` +
          `**Features:** ${concept.coreFeatures.length} defined\n\n` +
          `I'm now generating your implementation plan...`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, welcomeMessage]);
      generateImplementationPlan(concept);
    }
  }, [setAppConcept, setShowConversationalWizard, setChatMessages, setNewAppStagePlan, generateImplementationPlan, dynamicBuildPhases]);

  // Start building with dynamic phase plan (context-chained execution)
  const startDynamicPhasedBuild = useCallback(async (phaseNumber: number = 1) => {
    if (!dynamicPhasePlan) {
      console.error('No dynamic phase plan available');
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: '❌ No phase plan available. Please use the Wizard to create a plan first.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Use the hook's execution context and prompt builder (avoids creating duplicate managers)
    const context = dynamicBuildPhases.getExecutionContext(phaseNumber);
    if (!context) {
      // Fallback: If hook's manager not ready, create temporary context from plan
      const phase = dynamicPhasePlan.phases.find(p => p.number === phaseNumber);
      if (!phase) {
        console.error(`Phase ${phaseNumber} not found in plan`);
        return;
      }

      // Build a basic prompt for the fallback case
      const fallbackPrompt = `Build Phase ${phaseNumber}: ${phase.name}\n\nDescription: ${phase.description}\n\nFeatures to implement:\n${phase.features.map(f => `- ${f}`).join('\n')}`;

      const startMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🚀 **Starting Phase ${phaseNumber}: ${phase.name}**\n\n${phase.description}\n\n**Features to implement:**\n${phase.features.map(f => `- ${f}`).join('\n')}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, startMessage]);
      setUserInput(fallbackPrompt);
    } else {
      const prompt = dynamicBuildPhases.getExecutionPrompt(phaseNumber) || buildPhaseExecutionPrompt(context);

      // Add a message showing we're starting this phase
      const startMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `🚀 **Starting Phase ${phaseNumber}: ${context.phaseName}**\n\n${context.phaseDescription}\n\n**Features to implement:**\n${context.features.map(f => `- ${f}`).join('\n')}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, startMessage]);

      // Set the prompt in the input for the user to send or modify
      setUserInput(prompt);
    }

    // Mark phase as in-progress in the hook's state
    dynamicBuildPhases.startPhase(phaseNumber);
    setCurrentMode('ACT');

    // Update the stage plan to show this phase as in-progress
    setNewAppStagePlan(prev => prev ? {
      ...prev,
      currentPhase: phaseNumber,
      phases: prev.phases.map(p =>
        p.number === phaseNumber ? { ...p, status: 'building' as const } : p
      )
    } : null);
  }, [dynamicPhasePlan, dynamicBuildPhases, setChatMessages, setUserInput, setCurrentMode, setNewAppStagePlan]);

  // Handle advanced phased build start - generates dynamic phases from app concept
  const handleStartAdvancedPhasedBuild = useCallback(async () => {
    if (!appConcept) return;

    // Show generating message
    const generatingMessage: ChatMessage = {
      id: generateId(),
      role: 'system',
      content: `🔄 **Generating Phase Plan...**\n\nAnalyzing "${appConcept.name}" to create an optimal build plan.`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, generatingMessage]);

    try {
      // Call API to generate dynamic phases
      const response = await fetch('/api/wizard/generate-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: appConcept }),
      });

      const data = await response.json();

      if (data.success && data.plan) {
        const phasePlan: DynamicPhasePlan = data.plan;
        setDynamicPhasePlan(phasePlan);
        dynamicBuildPhases.initializePlan(phasePlan);
        setShowAdvancedPhasedBuild(true);

        // Sync with StagePlan for ChatPanel display
        const stagePlan: StagePlan = {
          totalPhases: phasePlan.totalPhases,
          currentPhase: 0,
          phases: phasePlan.phases.map(p => ({
            number: p.number,
            name: p.name,
            description: p.description,
            features: p.features,
            status: 'pending' as const
          }))
        };
        setNewAppStagePlan(stagePlan);

        const notification: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🏗️ **${phasePlan.totalPhases}-Phase Build Plan Created**\n\nBuilding "${appConcept.name}" with ${phasePlan.complexity} complexity.\n\n**Estimated time:** ${phasePlan.estimatedTotalTime}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, notification]);
      } else {
        throw new Error(data.error || 'Failed to generate phase plan');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `❌ **Failed to generate phase plan**\n\n${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  }, [appConcept, dynamicBuildPhases, setShowAdvancedPhasedBuild, setChatMessages, setNewAppStagePlan]);

  // Handle phase detail view
  const handleViewPhaseDetails = useCallback((phaseId: PhaseId) => {
    setSelectedPhaseId(phaseId);
  }, [setSelectedPhaseId]);

  // Handle phase validation
  const handleRunValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      // For now, validation is handled by the streaming generation API
      // Future: Add specific validation logic for dynamic phases
      const currentPhase = dynamicBuildPhases.currentPhase;
      if (currentPhase) {
        const notification: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🔍 **Validating Phase ${currentPhase.number}...**\n\nChecking: ${currentPhase.testCriteria.join(', ')}`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, notification]);
      }
    } finally {
      setIsValidating(false);
    }
  }, [dynamicBuildPhases, setIsValidating, setChatMessages]);

  // Handle new app creation
  const handleNewApp = useCallback(() => {
    setCurrentComponent(null);
    setChatMessages([getWelcomeMessage()]);
    setActiveTab('chat');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('current_app_id');
      } catch (e) {
        console.warn('Failed to clear current app ID from localStorage:', e);
      }
    }
  }, [setCurrentComponent, setChatMessages, setActiveTab]);

  // Save version helper
  const saveVersion = useCallback((component: GeneratedComponent, changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE', description: string): GeneratedComponent => {
    const versions = component.versions || [];
    const newVersion: AppVersion = {
      id: generateId(),
      versionNumber: versions.length + 1,
      code: component.code,
      description: description,
      timestamp: new Date().toISOString(),
      changeType
    };
    
    return {
      ...component,
      versions: [...versions, newVersion]
    };
  }, []);

  // Approve pending change
  const approveChange = useCallback(() => {
    if (!pendingChange || !currentComponent) return;

    try {
      versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE'
      });
      versionControl.clearRedoStack();
      
      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: pendingChange.newCode,
        description: pendingChange.changeDescription,
        timestamp: new Date().toISOString()
      };
      
      updatedComponent = saveVersion(updatedComponent, 'MAJOR_CHANGE', pendingChange.changeDescription);

      setCurrentComponent(updatedComponent);
      setComponents(prev => 
        prev.map(comp => comp.id === currentComponent.id ? updatedComponent : comp)
      );

      saveComponentToDb(updatedComponent);

      const approvalMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Changes approved and applied! (Version ${updatedComponent.versions?.length || 1} saved)`,
        timestamp: new Date().toISOString(),
        componentCode: pendingChange.newCode,
        componentPreview: true
      };

      setChatMessages(prev => [...prev, approvalMessage]);
      setActiveTab('preview');
      
    } catch (error) {
      console.error('Error applying changes:', error);
    } finally {
      setPendingChange(null);
      setShowApprovalModal(false);
    }
  }, [pendingChange, currentComponent, versionControl, saveVersion, setCurrentComponent, setComponents, saveComponentToDb, setChatMessages, setActiveTab, setPendingChange, setShowApprovalModal]);

  // Reject pending change
  const rejectChange = useCallback(() => {
    const rejectionMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged.`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, rejectionMessage]);
    setPendingChange(null);
    setShowApprovalModal(false);
    setActiveTab('chat');
  }, [setChatMessages, setPendingChange, setShowApprovalModal, setActiveTab]);

  // Approve diff
  const approveDiff = useCallback(async () => {
    if (!pendingDiff || !currentComponent) return;

    try {
      const currentAppData = JSON.parse(currentComponent.code);
      const currentFiles = currentAppData.files.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content
      }));

      const response = await fetch('/api/ai-builder/apply-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFiles,
          diffs: pendingDiff.files
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || 'Failed to apply diff');
      }

      const updatedAppData = {
        ...currentAppData,
        files: result.modifiedFiles.map((f: { path: string; content: string }) => ({
          path: f.path,
          content: f.content
        }))
      };

      versionControl.pushToUndoStack({
        id: generateId(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE'
      });
      versionControl.clearRedoStack();

      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: JSON.stringify(updatedAppData, null, 2),
        description: pendingDiff.summary,
        timestamp: new Date().toISOString()
      };

      updatedComponent = saveVersion(updatedComponent, 'MINOR_CHANGE', pendingDiff.summary);

      setCurrentComponent(updatedComponent);
      setComponents(prev =>
        prev.map(comp => comp.id === currentComponent.id ? updatedComponent : comp)
      );

      saveComponentToDb(updatedComponent);

      const successMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `✅ Changes applied successfully!\n\n${pendingDiff.summary}`,
        timestamp: new Date().toISOString(),
        componentCode: JSON.stringify(updatedAppData, null, 2),
        componentPreview: true
      };

      setChatMessages(prev => [...prev, successMessage]);
      setActiveTab('preview');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `❌ **Error Applying Changes**\n\n${errorMsg}`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingDiff(null);
      setShowDiffPreview(false);
    }
  }, [pendingDiff, currentComponent, versionControl, saveVersion, setCurrentComponent, setComponents, saveComponentToDb, setChatMessages, setActiveTab, setPendingDiff, setShowDiffPreview]);

  // Reject diff
  const rejectDiff = useCallback(() => {
    const rejectionMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged.`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, rejectionMessage]);
    setPendingDiff(null);
    setShowDiffPreview(false);
    setActiveTab('chat');
  }, [setChatMessages, setPendingDiff, setShowDiffPreview, setActiveTab]);

  // Revert to version
  const revertToVersion = useCallback((version: AppVersion) => {
    if (!currentComponent) return;

    versionControl.revertToVersion(version);

    const revertMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `🔄 Successfully reverted to Version ${version.versionNumber}\n\n**Reverted to:** ${version.description}`,
      timestamp: new Date().toISOString(),
      componentCode: version.code,
      componentPreview: true
    };

    setChatMessages(prev => [...prev, revertMessage]);
    setShowVersionHistory(false);
    setActiveTab('preview');
  }, [currentComponent, versionControl, setChatMessages, setShowVersionHistory, setActiveTab]);

  // Compare versions
  const handleCompareVersions = useCallback((v1: AppVersion, v2: AppVersion) => {
    setCompareVersions({ v1, v2 });
    setShowCompareModal(true);
  }, [setCompareVersions, setShowCompareModal]);

  // Fork app
  const handleForkApp = useCallback((sourceApp: GeneratedComponent, versionToFork?: AppVersion) => {
    const forkedApp = versionControl.forkFromVersion(sourceApp, versionToFork);

    setComponents(prev => [forkedApp, ...prev]);
    setCurrentComponent(forkedApp);
    setChatMessages([{
      id: generateId(),
      role: 'assistant',
      content: `🍴 Successfully forked "${sourceApp.name}"!\n\nYou can now make changes to this forked version without affecting the original.`,
      timestamp: new Date().toISOString(),
      componentCode: forkedApp.code,
      componentPreview: true
    }]);
    setShowVersionHistory(false);
    setActiveTab('preview');
  }, [versionControl, setComponents, setCurrentComponent, setChatMessages, setShowVersionHistory, setActiveTab]);

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    const component = components.find(c => c.id === id);
    if (!component) return;
    
    const updatedComponent = { ...component, isFavorite: !component.isFavorite };
    
    setComponents(prev =>
      prev.map(comp => comp.id === id ? updatedComponent : comp)
    );
    
    saveComponentToDb(updatedComponent);
  }, [components, setComponents, saveComponentToDb]);

  // Delete component
  const deleteComponent = useCallback((id: string) => {
    // Delete from database first
    deleteComponentFromDb(id);
    
    // Update components state (this will trigger localStorage sync via useEffect)
    const updatedComponents = components.filter(comp => comp.id !== id);
    setComponents(updatedComponents);
    
    // Immediately update localStorage to ensure sync before any page refresh
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ai_components', JSON.stringify(updatedComponents));

        // If deleting the currently loaded component, clear its ID from localStorage
        if (currentComponent?.id === id) {
          localStorage.removeItem('current_app_id');
        }
      } catch (e) {
        console.warn('Failed to update localStorage after delete:', e);
      }
    }
    
    if (currentComponent?.id === id) {
      setCurrentComponent(null);
      setChatMessages([getWelcomeMessage()]);
      setActiveTab('chat');
    }
  }, [deleteComponentFromDb, components, setComponents, currentComponent, setCurrentComponent, setChatMessages, setActiveTab]);

  // Export app
  const handleExportApp = useCallback(async (comp: GeneratedComponent) => {
    setExportingApp(comp);
    
    try {
      const appData = JSON.parse(comp.code);
      const files = parseAppFiles(appData);
      
      const zipBlob = await exportAppAsZip({
        appName: comp.name,
        files: files,
      });
      
      const filename = `${comp.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
      downloadBlob(zipBlob, filename);
      
      setDeploymentInstructions(getDeploymentInstructions('vercel', comp.name));
      setShowDeploymentModal(true);
    } catch (error) {
      console.error('Error exporting app:', error);
      alert('Failed to export app. Please try again.');
    } finally {
      setExportingApp(null);
    }
  }, [setExportingApp, setDeploymentInstructions, setShowDeploymentModal]);

  // Load component
  const loadComponent = useCallback((comp: GeneratedComponent) => {
    setCurrentComponent(comp);
    setChatMessages(comp.conversationHistory);
    setShowLibrary(false);
    setActiveTab('preview');
    const hasPendingPhases = comp.stagePlan?.phases?.some(p => p.status === 'pending') ?? false;
    setNewAppStagePlan(hasPendingPhases ? comp.stagePlan! : null);
  }, [setCurrentComponent, setChatMessages, setShowLibrary, setActiveTab, setNewAppStagePlan]);

  // Download code
  const downloadCode = useCallback(() => {
    if (!currentComponent) return;
    
    const blob = new Blob([currentComponent.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentComponent.name.replace(/\s+/g, '-')}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentComponent]);

  // Filtered components - memoized to avoid recalculating on every render
  const filteredComponents = useMemo(() =>
    components.filter(comp =>
      searchQuery === '' ||
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [components, searchQuery]
  );

  // Handle build phase in chat panel
  const handleBuildPhase = useCallback((phase: Phase) => {
    // If we have a dynamic phase plan, use context-aware execution
    if (dynamicPhasePlan) {
      startDynamicPhasedBuild(phase.number);
      return;
    }

    // Fallback to simple prompt for non-dynamic plans
    const buildPrompt = `Build ${phase.name}: ${phase.description}. Features to implement: ${phase.features.join(', ')}`;
    setUserInput(buildPrompt);
    setNewAppStagePlan(prev => prev ? {
      ...prev,
      currentPhase: phase.number,
      phases: prev.phases.map(p =>
        p.number === phase.number ? { ...p, status: 'building' as const } : p
      )
    } : null);
  }, [dynamicPhasePlan, startDynamicPhasedBuild, setUserInput, setNewAppStagePlan]);

  // ============================================================================
  // SEND MESSAGE (Core message sending logic - kept in orchestrator)
  // ============================================================================
  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || isGenerating) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setLastUserRequest(userInput);
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);

    // Determine if this is a question or build request
    const isQuestion = messageSender.isQuestion(userInput);
    const isModification = currentComponent !== null;

    // Determine if this should use streaming (full-app generation only)
    const useStreaming = currentMode === 'ACT' && !isQuestion && !isModification;

    // AI Scope Detection: Analyze if this request needs phased execution
    if (currentMode === 'ACT' && !isQuestion && !isModification && !dynamicPhasePlan) {
      const scopeResult = scopeDetectionService.analyzeScope(
        userInput,
        chatMessages.slice(-10).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        currentComponent
      );

      if (scopeResult.requiresPhases && scopeResult.confidence >= 0.7) {
        // Complex request detected - generate phases first
        const analysisMessage: ChatMessage = {
          id: generateId(),
          role: 'system',
          content: `🔍 **Analyzing Request...**\n\n${scopeResult.reason}\n\n**Detected complexity:** ${scopeResult.complexity}\n**Suggested phases:** ${scopeResult.suggestedPhaseCount}\n\n⏳ Generating optimized build plan...`,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, analysisMessage]);

        try {
          // Generate concept from detected features
          const concept = {
            name: extractComponentName(userInput),
            description: userInput,
            purpose: userInput,
            targetUsers: 'General users',
            coreFeatures: scopeResult.detectedFeatures.map((f, idx) => ({
              id: `feature-${idx}`,
              name: f.charAt(0).toUpperCase() + f.slice(1).replace(/([A-Z])/g, ' $1'),
              description: `Implement ${f} functionality`,
              priority: 'high' as const,
            })),
            uiPreferences: {
              layout: 'dashboard',
              style: 'modern',
              colorScheme: 'blue',
              features: [],
            },
            technical: {
              needsAuth: scopeResult.detectedTechnical.needsAuth || false,
              needsDatabase: scopeResult.detectedTechnical.needsDatabase || false,
              needsAPI: scopeResult.detectedTechnical.needsAPI || false,
              needsFileUpload: scopeResult.detectedTechnical.needsFileUpload || false,
              needsRealtime: scopeResult.detectedTechnical.needsRealtime || false,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const response = await fetch('/api/wizard/generate-phases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept }),
          });

          const phaseData = await response.json();

          if (phaseData.success && phaseData.plan) {
            const phasePlan: DynamicPhasePlan = phaseData.plan;
            setDynamicPhasePlan(phasePlan);
            dynamicBuildPhases.initializePlan(phasePlan);

            // Sync with StagePlan for ChatPanel display
            const stagePlan: StagePlan = {
              totalPhases: phasePlan.totalPhases,
              currentPhase: 0,
              phases: phasePlan.phases.map(p => ({
                number: p.number,
                name: p.name,
                description: p.description,
                features: p.features,
                status: 'pending' as const
              }))
            };
            setNewAppStagePlan(stagePlan);

            const planMessage: ChatMessage = {
              id: generateId(),
              role: 'assistant',
              content: `🎯 **${phasePlan.totalPhases}-Phase Build Plan Created**\n\n` +
                `**Complexity:** ${phasePlan.complexity}\n` +
                `**Estimated Time:** ${phasePlan.estimatedTotalTime}\n\n` +
                phasePlan.phases.slice(0, 5).map(p =>
                  `**Phase ${p.number}: ${p.name}** (${p.estimatedTime})`
                ).join('\n') +
                (phasePlan.phases.length > 5 ? `\n\n...and ${phasePlan.phases.length - 5} more phases` : '') +
                `\n\n🚀 **Starting Phase 1 now...**`,
              timestamp: new Date().toISOString(),
            };
            setChatMessages(prev => [...prev, planMessage]);

            // Start building with phase 1
            startDynamicPhasedBuild(1);
            setIsGenerating(false);
            return; // Exit early - phased build will handle the rest
          }
        } catch (error) {
          console.error('Scope detection phase generation failed:', error);
          // Fall through to regular execution
        }
      }
    }

    // Get progress messages for non-streaming requests
    const progressMessages = messageSender.getProgressMessages(isQuestion, isModification);

    let progressIndex = 0;
    let progressInterval: NodeJS.Timeout | null = null;

    if (!useStreaming) {
      progressInterval = setInterval(() => {
        if (progressIndex < progressMessages.length) {
          setGenerationProgress(progressMessages[progressIndex]);
          progressIndex++;
        }
      }, 3000);
    }

    try {
      // Build request body
      const parsedCurrentAppState = currentComponent ? JSON.parse(currentComponent.code) : null;

      const requestBody: Record<string, unknown> = {
        prompt: userInput,
        conversationHistory: chatMessages.slice(-30),
        mode: currentMode,
        currentAppState: parsedCurrentAppState
      };

      if (uploadedImage) {
        requestBody.image = uploadedImage;
        requestBody.hasImage = true;
      }

      let data: Record<string, unknown> | null = null;

      if (useStreaming) {
        // Use streaming for full-app generation
        data = await streaming.generate(requestBody);

        if (!data) {
          throw new Error('Generation failed or was cancelled');
        }
      } else {
        // Determine endpoint based on mode and request type
        let endpoint: string;
        if (currentMode === 'PLAN') {
          // Smart Conversations: Use wizard API for intelligent planning
          endpoint = '/api/wizard/chat';
        } else {
          endpoint = isQuestion ? '/api/chat' : '/api/ai-builder/modify';
        }

        // Build request body based on endpoint
        const fetchBody = currentMode === 'PLAN' 
          ? JSON.stringify({
              message: userInput,
              conversationHistory: chatMessages.slice(-30).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
              currentState: wizardState,
            })
          : JSON.stringify(requestBody);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: fetchBody
        });

        if (progressInterval) {
          clearInterval(progressInterval);
        }
        setGenerationProgress('');

        data = await response.json();

        if (data?.error) {
          throw new Error(data.error as string);
        }

        // Smart Conversations: Update wizard state from response
        if (currentMode === 'PLAN' && data?.updatedState) {
          setWizardState(data.updatedState as typeof wizardState);
        }
      }

      // Handle diff response
      if (data?.changeType === 'MODIFICATION' && data?.files) {
        setPendingDiff({
          id: generateId(),
          summary: data.summary as string,
          files: data.files as PendingDiff['files'],
          timestamp: new Date().toISOString()
        });
        setShowDiffPreview(true);

        const diffMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🔍 **Changes Ready for Review**\n\n${data.summary}`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, diffMessage]);
        return;
      }

      // Handle chat response (including wizard responses in PLAN mode)
      if (isQuestion || data?.type === 'chat' || (currentMode === 'PLAN' && data?.message)) {
        const chatResponse: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: (data?.message || data?.answer || data?.description) as string,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, chatResponse]);
      } else if (data) {
        // Handle full-app response (both streaming and non-streaming)
        const aiAppMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: `🚀 App created\n\n${data.description || `I've created your ${data.name} app!`}`,
          timestamp: new Date().toISOString(),
          componentCode: JSON.stringify(data),
          componentPreview: !!(data.files as unknown[])?.length
        };
        setChatMessages(prev => [...prev, aiAppMessage]);

        const files = data.files as Array<{ path: string; content: string }>;
        if (files && files.length > 0) {
          let newComponent: GeneratedComponent = {
            id: isModification && currentComponent ? currentComponent.id : generateId(),
            name: (data.name as string) || extractComponentName(userInput),
            code: JSON.stringify(data, null, 2),
            description: userInput,
            timestamp: new Date().toISOString(),
            isFavorite: isModification && currentComponent ? currentComponent.isFavorite : false,
            conversationHistory: [...chatMessages, userMessage, aiAppMessage],
            versions: isModification && currentComponent ? currentComponent.versions : [],
          };

          newComponent = saveVersion(newComponent, 'NEW_APP', (data.description as string) || userInput);

          setCurrentComponent(newComponent);

          if (isModification && currentComponent) {
            setComponents(prev =>
              prev.map(comp => comp.id === currentComponent.id ? newComponent : comp)
            );
          } else {
            setComponents(prev => [newComponent, ...prev].slice(0, 50));
          }

          saveComponentToDb(newComponent);
          setActiveTab('preview');
        }
      }

    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setGenerationProgress('');

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setUploadedImage(null);
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  // Note: This callback depends on the listed values that may change. The Zustand setters
  // used internally (setChatMessages, setIsGenerating, etc.) are stable and omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, isGenerating, currentMode, currentComponent, chatMessages, uploadedImage, messageSender, streaming, saveVersion, saveComponentToDb]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Prevent hydration errors
  if (!isClient) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <BuilderHeader
          projectName={currentComponent?.name || 'Untitled App'}
          onProjectNameChange={(name) => {
            if (currentComponent) {
              // Update component name in store
              const updated = { ...currentComponent, name };
              setCurrentComponent(updated);
            }
          }}
          projectStatus={isGenerating ? 'generating' : (currentComponent ? 'saved' : 'draft')}
          hasUnsavedChanges={false}
          currentView={activeTab as 'chat' | 'code' | 'preview' | 'split'}
          onViewChange={(view) => {
            // Map 'split' to 'preview' for the store since ActiveTab doesn't support 'split'
            const mappedView = view === 'split' ? 'preview' : view;
            setActiveTab(mappedView as 'chat' | 'preview' | 'code');
          }}
          onNewProject={handleNewApp}
          onSave={() => {
            if (currentComponent) {
              saveComponentToDb(currentComponent);
            }
          }}
          onExport={(format) => {
            if (currentComponent) {
              switch (format) {
                case 'zip':
                  handleExportApp(currentComponent);
                  break;
                case 'clipboard':
                  navigator.clipboard.writeText(currentComponent.code);
                  break;
                case 'html':
                case 'react':
                  // For HTML/React, use the ZIP export which packages everything
                  handleExportApp(currentComponent);
                  break;
              }
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onHelp={() => {/* Could open help modal */}}
          onPlanApp={() => setShowConceptWizard(true)}
          onWizard={() => setShowConversationalWizard(true)}
          onLayoutBuilder={() => setShowLayoutBuilder(true)}
          onPhasedBuild={handleStartAdvancedPhasedBuild}
          hasAppConcept={!!appConcept}
          isPhasedMode={showAdvancedPhasedBuild}
          showPhasedBuildPanel={showAdvancedPhasedBuild}
          onTogglePhasedPanel={() => setShowAdvancedPhasedBuild(!showAdvancedPhasedBuild)}
          versionCount={currentComponent?.versions?.length || 0}
          onShowHistory={() => setShowVersionHistory(!showVersionHistory)}
          appCount={components.length}
          onShowLibrary={() => setShowLibrary(!showLibrary)}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          onNewApp={handleNewApp}
        />

        {/* Main Content */}
        <div className="max-w-[1800px] mx-auto px-4 py-4 h-[calc(100vh-80px)]">
          <ResizablePanelGroup 
            direction="horizontal" 
            persistenceKey="ai-builder-layout"
            className="h-full"
          >
            {/* Chat Panel */}
            <ResizablePanel defaultSize={35} minSize={20} maxSize={60}>
              <div className="h-full flex flex-col relative">
                <ChatPanel
                  messages={chatMessages}
                  isGenerating={isGenerating}
                  generationProgress={generationProgress}
                  userInput={userInput}
                  onUserInputChange={setUserInput}
                  onSendMessage={sendMessage}
                  uploadedImage={uploadedImage}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={removeImage}
                  currentMode={currentMode}
                  onModeChange={setCurrentMode}
                  stagePlan={newAppStagePlan}
                  onBuildPhase={handleBuildPhase}
                  onViewComponent={() => setActiveTab('preview')}
                  streamingProgress={streaming.progress}
                  isStreamingActive={streaming.isStreaming}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Preview Panel */}
            <ResizablePanel defaultSize={65} minSize={30} maxSize={80}>
              <PreviewPanel
                currentComponent={currentComponent}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                canUndo={versionControl.canUndo}
                canRedo={versionControl.canRedo}
                onUndo={versionControl.undo}
                onRedo={versionControl.redo}
                undoCount={versionControl.undoStack.length}
                redoCount={versionControl.redoStack.length}
                onFork={handleForkApp}
                onExport={handleExportApp}
                onDownload={downloadCode}
                isExporting={!!exportingApp}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Modals */}
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          components={components}
          filteredComponents={filteredComponents}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLoadComponent={loadComponent}
          onToggleFavorite={toggleFavorite}
          onDeleteComponent={deleteComponent}
          onExportComponent={handleExportApp}
          exportingAppId={exportingApp?.id}
          contentTab={contentTab}
          onContentTabChange={setContentTab}
          storageFiles={fileStorage.files}
          filteredFiles={fileStorage.filteredFiles}
          fileSearchQuery={fileStorage.searchQuery}
          onFileSearchChange={fileStorage.setSearchQuery}
          fileTypeFilter={fileStorage.typeFilter}
          onFileTypeFilterChange={fileStorage.setTypeFilter}
          fileSortBy={fileStorage.sortBy}
          fileSortOrder={fileStorage.sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            fileStorage.setSortBy(newSortBy);
            fileStorage.setSortOrder(newSortOrder);
          }}
          selectedFiles={fileStorage.selectedFiles}
          onFileSelect={fileStorage.selectFile}
          onFileUpload={fileStorage.uploadFiles}
          onFileDownload={fileStorage.downloadFile}
          onFileDelete={fileStorage.deleteFile}
          onBulkDelete={fileStorage.bulkDelete}
          onClearSelection={fileStorage.clearSelection}
          loadingFiles={fileStorage.isLoading}
          deletingFiles={fileStorage.deletingFiles}
          storageStats={fileStorage.storageStats}
          user={user}
        />

        <ApprovalModal
          isOpen={showApprovalModal}
          pendingChange={pendingChange}
          onApprove={approveChange}
          onReject={rejectChange}
        />

        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          currentComponent={currentComponent}
          onRevertToVersion={revertToVersion}
          onForkVersion={handleForkApp}
          onCompareVersions={handleCompareVersions}
        />

        <DeploymentModal
          isOpen={showDeploymentModal}
          onClose={() => {
            setShowDeploymentModal(false);
            setDeploymentInstructions(null);
          }}
          deploymentInstructions={deploymentInstructions}
          onPlatformChange={(platform) => setDeploymentInstructions(getDeploymentInstructions(platform, exportingApp?.name || 'app'))}
          appName={exportingApp?.name}
        />

        <DiffPreviewModal
          isOpen={showDiffPreview}
          onClose={() => {
            setPendingDiff(null);
            setShowDiffPreview(false);
          }}
          pendingDiff={pendingDiff}
          onApprove={approveDiff}
          onReject={rejectDiff}
        />

        <StagingConsentModal
          isOpen={showNewAppStagingModal}
          pendingRequest={pendingNewAppRequest}
          onBuildAllAtOnce={() => {
            setShowNewAppStagingModal(false);
            setPendingNewAppRequest('');
            setUserInput(pendingNewAppRequest);
          }}
          onBuildInPhases={async () => {
            setShowNewAppStagingModal(false);
            setIsGenerating(true);
            
            try {
              const response = await fetch('/api/ai-builder/plan-phases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: pendingNewAppRequest,
                  conversationHistory: chatMessages.slice(-20)
                })
              });

              const data = await response.json();

              if (data.error) {
                throw new Error(data.error);
              }

              setNewAppStagePlan(data);

              // Use helper function to format phase content safely
              const phaseContent = formatPhaseContent(data.phases);

              const phasePlanMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: `🏗️ **${data.totalPhases ?? 0}-Phase Build Plan Created**\n\n${phaseContent}\n\n**Ready to start?** Type **'start'** or **'begin'** to build Phase 1!`,
                timestamp: new Date().toISOString()
              };

              setChatMessages(prev => [...prev, phasePlanMessage]);
            } catch (error) {
              const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'assistant',
                content: `❌ Failed to create phase plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toISOString()
              };
              setChatMessages(prev => [...prev, errorMessage]);
            } finally {
              setIsGenerating(false);
              setPendingNewAppRequest('');
            }
          }}
        />

        <CompareVersionsModal
          isOpen={showCompareModal}
          onClose={() => {
            setShowCompareModal(false);
            setCompareVersions({ v1: null, v2: null });
          }}
          version1={compareVersions.v1}
          version2={compareVersions.v2}
          onRevertToVersion={revertToVersion}
          onForkVersion={(version) => {
            if (currentComponent) {
              handleForkApp(currentComponent, version);
            }
          }}
          currentComponent={currentComponent}
        />

        {showConceptWizard && (
          <AppConceptWizard
            onComplete={handleConceptComplete}
            onCancel={() => setShowConceptWizard(false)}
          />
        )}

        {showConversationalWizard && (
          <NaturalConversationWizard
            onComplete={handleNaturalWizardComplete}
            onCancel={() => setShowConversationalWizard(false)}
          />
        )}

        <LayoutBuilderWizard
          isOpen={showLayoutBuilder}
          onClose={() => setShowLayoutBuilder(false)}
          onApplyToAppConcept={() => {
            // Optionally close the wizard or show a success message
          }}
        />

        <SettingsPage
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {dynamicPhasePlan && (
          <PhasedBuildPanel
            isOpen={showAdvancedPhasedBuild}
            onClose={() => setShowAdvancedPhasedBuild(false)}
            phases={adaptedPhases}
            progress={adaptedProgress}
            currentPhase={dynamicBuildPhases.currentPhase ? adaptedPhases.find(p => p.order === dynamicBuildPhases.currentPhase?.number) || null : null}
            isBuilding={dynamicBuildPhases.isBuilding}
            isPaused={dynamicBuildPhases.isPaused}
            isValidating={isValidating}
            onStartBuild={handleStartAdvancedPhasedBuild}
            onPauseBuild={dynamicBuildPhases.pauseBuild}
            onResumeBuild={dynamicBuildPhases.resumeBuild}
            onSkipPhase={(phaseId) => {
              const phase = adaptedPhases.find(p => p.id === phaseId);
              if (phase) {
                dynamicBuildPhases.skipPhase(phase.order);
              }
            }}
            onRetryPhase={(phaseId) => {
              const phase = adaptedPhases.find(p => p.id === phaseId);
              if (phase) {
                dynamicBuildPhases.retryPhase(phase.order);
              }
            }}
            onViewPhaseDetails={handleViewPhaseDetails}
            onRunValidation={handleRunValidation}
            onResetBuild={dynamicBuildPhases.resetBuild}
            onExecuteCurrentPhase={async () => {
              const nextPhase = dynamicBuildPhases.getNextPhase();
              if (nextPhase) {
                startDynamicPhasedBuild(nextPhase.number);
              }
            }}
            onProceedToNextPhase={() => {
              const nextPhase = dynamicBuildPhases.getNextPhase();
              if (nextPhase) {
                startDynamicPhasedBuild(nextPhase.number);
              }
            }}
            dynamicPlan={dynamicPhasePlan}
          />
        )}

        {selectedPhaseId && adaptedPhases.length > 0 && (
          <PhaseDetailView
            phase={adaptedPhases.find(p => p.id === selectedPhaseId) || adaptedPhases[0]}
            isOpen={!!selectedPhaseId}
            onClose={() => setSelectedPhaseId(null)}
            onBuildPhase={async () => {
              const phase = adaptedPhases.find(p => p.id === selectedPhaseId);
              if (phase) {
                startDynamicPhasedBuild(phase.order);
              }
              setSelectedPhaseId(null);
            }}
            onSkipPhase={async () => {
              const phase = adaptedPhases.find(p => p.id === selectedPhaseId);
              if (phase) {
                dynamicBuildPhases.skipPhase(phase.order);
              }
              setSelectedPhaseId(null);
            }}
            onRetryPhase={async () => {
              const phase = adaptedPhases.find(p => p.id === selectedPhaseId);
              if (phase) {
                dynamicBuildPhases.retryPhase(phase.order);
              }
              setSelectedPhaseId(null);
            }}
            generatedCode={dynamicBuildPhases.accumulatedCode}
          />
        )}
      </div>
    </ToastProvider>
  );
}
