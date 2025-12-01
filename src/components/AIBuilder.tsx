"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodePreview from './CodePreview';
import FullAppPreview from './FullAppPreview';
import DiffPreview from './DiffPreview';
import AppConceptWizard from './AppConceptWizard';
import ConversationalAppWizard from './ConversationalAppWizard';
import ThemeToggle from './ThemeToggle';
import SettingsPage from './SettingsPage';
import { ToastProvider } from './Toast';
import type { AppConcept, ImplementationPlan, BuildPhase } from '../types/appConcept';
import { exportAppAsZip, downloadBlob, parseAppFiles, getDeploymentInstructions, type DeploymentInstructions } from '../utils/exportApp';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/types/supabase';

// Storage components and services
import { 
  FileCard, 
  FileGrid, 
  FileFilters, 
  FileUploader, 
  FileActions, 
  StorageStats 
} from './storage';
import { StorageService } from '@/services/StorageService';
import { StorageAnalyticsService } from '@/services/StorageAnalytics';
import type { 
  FileMetadata, 
  StorageStats as StorageStatsType,
  FileId,
  UserId
} from '@/types/storage';

// Resizable panels
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui';

// Phase-driven build system components
import {
  PhaseProgressIndicator,
  PhaseControlPanel,
  ValidationDashboard,
  PhaseDetailView,
} from './build';
import { useBuildPhases } from '../hooks/useBuildPhases';
import type {
  BuildPhase as PhasedBuildPhase,
  PhaseId,
  PhasedAppConcept,
} from '../types/buildPhases';
import { getPhasePrompt, getPhaseSummary } from '../prompts/phasePrompts';

// Base44-inspired layout with conversation-first design + your dark colors

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  componentCode?: string;
  componentPreview?: boolean;
}

interface AppVersion {
  id: string;
  versionNumber: number;
  code: string;
  description: string;
  timestamp: string;
  changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE';
}

// Shared type definitions for phase building
type PhaseStatus = 'pending' | 'building' | 'complete';

interface Phase {
  number: number;
  name: string;
  description: string;
  features: string[];
  status: PhaseStatus;
}

interface StagePlan {
  totalPhases: number;
  currentPhase: number;
  phases: Phase[];
}

interface GeneratedComponent {
  id: string;
  name: string;
  code: string;
  description: string;
  timestamp: string;
  isFavorite: boolean;
  conversationHistory: ChatMessage[];
  versions?: AppVersion[];
  /** Phase build progress - null when complete or not applicable */
  stagePlan?: StagePlan | null;
}

interface PendingChange {
  id: string;
  changeDescription: string;
  newCode: string;
  timestamp: string;
}

interface PendingDiff {
  id: string;
  summary: string;
  files: Array<{
    path: string;
    action: 'MODIFY' | 'CREATE' | 'DELETE';
    changes: Array<{
      type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND';
      searchFor?: string;
      content?: string;
      replaceWith?: string;
    }>;
  }>;
  timestamp: string;
}

// Type alias for database generated_apps row
type DbGeneratedApp = Database['public']['Tables']['generated_apps']['Row'];
type DbGeneratedAppInsert = Database['public']['Tables']['generated_apps']['Insert'];

// Helper functions to convert between GeneratedComponent and database format
function componentToDb(component: GeneratedComponent, userId: string): DbGeneratedAppInsert {
  return {
    id: component.id,
    user_id: userId,
    title: component.name,
    description: component.description,
    code: component.code,
    metadata: {
      isFavorite: component.isFavorite,
      conversationHistory: component.conversationHistory,
      versions: component.versions || [],
      timestamp: component.timestamp,
      // FIX: Persist phase build plan to Supabase
      stagePlan: component.stagePlan || null
    } as unknown as Database['public']['Tables']['generated_apps']['Row']['metadata'],
    is_public: false,
    version: (component.versions?.length || 0) + 1
  };
}

// Type for the metadata stored in database
interface DbMetadata {
  isFavorite?: boolean;
  conversationHistory?: ChatMessage[];
  versions?: AppVersion[];
  timestamp?: string;
  stagePlan?: StagePlan | null;
}

function dbToComponent(dbApp: DbGeneratedApp): GeneratedComponent {
  const metadata = (dbApp.metadata as DbMetadata) || {};
  return {
    id: dbApp.id,
    name: dbApp.title,
    code: dbApp.code,
    description: dbApp.description || '',
    timestamp: metadata.timestamp || dbApp.created_at,
    isFavorite: metadata.isFavorite || false,
    conversationHistory: metadata.conversationHistory || [],
    versions: metadata.versions || [],
    stagePlan: metadata.stagePlan ?? null
  };
}

// ============================================================================
// FIX 4.1: INLINE PHASE PROGRESS COMPONENT
// ============================================================================

interface PhaseProgressCardProps {
  phases: Phase[];
  currentPhase: number;
  onBuildPhase?: (phase: Phase) => void;
}

const PhaseProgressCard: React.FC<PhaseProgressCardProps> = ({ phases, currentPhase, onBuildPhase }) => (
  <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-purple-500/30 mb-4">
    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
      <span>🏗️</span> Build Plan ({phases.length} Phases)
    </h3>
    <div className="space-y-2">
      {phases.map((phase, idx) => (
        <div 
          key={idx}
          className={`p-3 rounded-lg border transition-all ${
            phase.status === 'complete' 
              ? 'bg-green-500/20 border-green-500/30' 
              : phase.status === 'building'
              ? 'bg-blue-500/20 border-blue-500/30 animate-pulse'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">
              Phase {phase.number}: {phase.name}
            </span>
            <div className="flex items-center gap-2">
              {phase.status === 'pending' && idx === currentPhase && onBuildPhase && (
                <button
                  onClick={() => onBuildPhase(phase)}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all hover:scale-105"
                >
                  Build
                </button>
              )}
              {phase.status === 'complete' && <span className="text-green-400">✅</span>}
              {phase.status === 'building' && <span className="text-blue-400 animate-spin">⏳</span>}
              {phase.status === 'pending' && idx !== currentPhase && <span className="text-slate-500">⏸️</span>}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{phase.description}</p>
          {phase.features && phase.features.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {phase.features.slice(0, 3).map((feature, fIdx) => (
                <span key={fIdx} className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300">
                  {feature.length > 25 ? feature.substring(0, 25) + '...' : feature}
                </span>
              ))}
              {phase.features.length > 3 && (
                <span className="text-xs text-slate-500">+{phase.features.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default function AIBuilder() {
  // Authentication
  const { user, loading: authLoading, sessionReady } = useAuth();
  
  // Core state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [currentComponent, setCurrentComponent] = useState<GeneratedComponent | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Plan/Act Mode Toggle
  const [currentMode, setCurrentMode] = useState<'PLAN' | 'ACT'>('PLAN');
  const [lastUserRequest, setLastUserRequest] = useState<string>('');
  const previousModeRef = useRef<'PLAN' | 'ACT'>('PLAN');
  
  // Image upload for AI-inspired designs
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // App library/history
  const [components, setComponents] = useState<GeneratedComponent[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);
  
  // Version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Tab controls
  const [activeTab, setActiveTab] = useState<'chat' | 'preview' | 'code'>('chat');
  
  // Change approval system
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [pendingDiff, setPendingDiff] = useState<PendingDiff | null>(null);
  const [showDiffPreview, setShowDiffPreview] = useState(false);
  
  // Deployment and export
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentInstructions, setDeploymentInstructions] = useState<DeploymentInstructions | null>(null);
  const [exportingApp, setExportingApp] = useState<GeneratedComponent | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // Code Management - Undo/Redo
  const [undoStack, setUndoStack] = useState<AppVersion[]>([]);
  const [redoStack, setRedoStack] = useState<AppVersion[]>([]);
  
  // Code Management - Compare & Fork
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ v1: AppVersion | null; v2: AppVersion | null }>({ v1: null, v2: null });

  // Stage plan tracking for multi-stage modifications
  const [currentStagePlan, setCurrentStagePlan] = useState<{
    currentStage: number;
    totalStages: number;
    stageDescription: string;
    nextStages: string[];
  } | null>(null);

  // Stage plan tracking for new app builds (uses shared StagePlan type)
  const [newAppStagePlan, setNewAppStagePlan] = useState<StagePlan | null>(null);
  
  // Staging consent modal for new apps
  const [showNewAppStagingModal, setShowNewAppStagingModal] = useState(false);
  const [pendingNewAppRequest, setPendingNewAppRequest] = useState<string>('');

  // App Concept Wizard state
  const [showConceptWizard, setShowConceptWizard] = useState(false);
  const [showConversationalWizard, setShowConversationalWizard] = useState(false);
  const [appConcept, setAppConcept] = useState<AppConcept | null>(null);
  const [implementationPlan, setImplementationPlan] = useState<ImplementationPlan | null>(null);

  // Settings page state
  const [showSettings, setShowSettings] = useState(false);

  // Advanced Phase-Driven Build state
  const [showAdvancedPhasedBuild, setShowAdvancedPhasedBuild] = useState(false);
  const [selectedPhaseId, setSelectedPhaseId] = useState<PhaseId | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Phase-driven build hook
  const buildPhases = useBuildPhases({
    onPhaseStart: (phase) => {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `🚀 **Starting Phase ${phase.order}: ${phase.name}**\n\n${phase.description}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onPhaseComplete: (phase, result) => {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: result.success
          ? `✅ **Phase ${phase.order} Complete!**\n\nCompleted ${result.tasksCompleted}/${result.totalTasks} tasks in ${(result.duration / 1000).toFixed(1)}s`
          : `⚠️ **Phase ${phase.order} had issues**\n\n${result.errors?.join('\n') || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onBuildComplete: (progress) => {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `🎉 **Build Complete!**\n\nAll ${progress.totalPhases} phases finished. Your app is ready!`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
    onError: (error, phase) => {
      const notification: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `❌ **Build Error${phase ? ` in Phase ${phase.order}` : ''}**\n\n${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, notification]);
    },
  });

  // Storage state
  const [contentTab, setContentTab] = useState<'apps' | 'files'>('apps');
  const [storageFiles, setStorageFiles] = useState<FileMetadata[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [fileSortBy, setFileSortBy] = useState<'name' | 'size' | 'created_at' | 'updated_at'>('created_at');
  const [fileSortOrder, setFileSortOrder] = useState<'asc' | 'desc'>('desc');
  const [storageStats, setStorageStats] = useState<StorageStatsType | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

  // Initialize StorageService with browser client and analytics (dependency injection pattern)
  const [storageService] = useState(() => {
    const supabase = createClient();
    const analytics = new StorageAnalyticsService(supabase);
    return new StorageService(supabase, analytics);
  });

  // Ref for auto-scrolling chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // FIX 4.3: NOTIFICATION HELPER FUNCTIONS
  // ============================================================================
  
  // Show when phase is auto-split
  const showPhaseSplitNotification = useCallback((originalPhase: any, splitPhases: any[]) => {
    const notification: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: `⚠️ **Phase ${originalPhase.number} Split**\n\nThe phase was too large, so I've split it into ${splitPhases.length} parts:\n${splitPhases.map((p: any) => `- ${p.name}`).join('\n')}\n\nThis ensures each part generates complete, working code.`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, notification]);
  }, []);

  // Show truncation recovery progress
  const showRecoveryProgress = useCallback((truncationReason: string, recovering: boolean) => {
    const notification: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: recovering 
        ? `🔄 **Recovery in Progress**\n\nDetected: ${truncationReason}\n\nSalvaging completed files and retrying remaining features...`
        : `❌ **Generation Incomplete**\n\n${truncationReason}\n\nTrying a smaller approach...`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, notification]);
  }, []);

  // Show phase completion notification
  const showPhaseCompleteNotification = useCallback((phaseNumber: number, totalPhases: number) => {
    const notification: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: phaseNumber === totalPhases
        ? `🎉 **All ${totalPhases} Phases Complete!**\n\nYour app is fully built. Test it out and let me know if you'd like any adjustments!`
        : `✅ **Phase ${phaseNumber} Complete!**\n\nReady for Phase ${phaseNumber + 1}. Type **'continue'** or **'next'** to proceed.`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, notification]);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Detect mode transitions and show helpful messages
  useEffect(() => {
    const previousMode = previousModeRef.current;
    previousModeRef.current = currentMode;

    // Detect PLAN -> ACT transition
    if (previousMode === 'PLAN' && currentMode === 'ACT') {
      const transitionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `⚡ **Switched to ACT Mode**\n\nReady to build! I'll read the plan we discussed and implement it.\n\n**To build:** Type "build it" or "implement the plan" and I'll create your app based on our conversation.`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, transitionMessage]);
    }

    // Detect ACT -> PLAN transition
    if (previousMode === 'ACT' && currentMode === 'PLAN') {
      const transitionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'system',
        content: `💭 **Switched to PLAN Mode**\n\nLet's plan your next feature or discuss improvements. I won't generate code in this mode - we'll design the requirements first.`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, transitionMessage]);
    }
  }, [currentMode]);

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true);
    // Set welcome message only on client
    setChatMessages([{
      id: 'welcome',
      role: 'system',
      content: "👋 Hi! I'm your AI App Builder.\n\n🎯 **How It Works:**\n\n**💭 PLAN Mode** (Current):\n• Discuss what you want to build\n• I'll help design the requirements and architecture\n• No code generated - just planning and roadmapping\n• Ask questions, refine ideas, create specifications\n\n**⚡ ACT Mode:**\n• I'll read our plan and build the app\n• Generates working code based on our discussion\n• Can modify existing apps with surgical precision\n\n**🔒 Smart Protection:**\n• Every change saved to version history\n• One-click undo/redo anytime\n• Review changes before applying\n\n💡 **Start by telling me what you want to build, and we'll plan it together!**",
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentComponent) return;
      
      // Ctrl+Z or Cmd+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoStack.length > 0) {
          const previousVersion = undoStack[undoStack.length - 1];
          const newUndoStack = undoStack.slice(0, -1);

          // Save current state to redo stack
          const currentVersion: AppVersion = {
            id: Date.now().toString(),
            versionNumber: (currentComponent.versions?.length || 0) + 1,
            code: currentComponent.code,
            description: currentComponent.description,
            timestamp: currentComponent.timestamp,
            changeType: 'MINOR_CHANGE'
          };
          setRedoStack(prev => [...prev, currentVersion]);
          setUndoStack(newUndoStack);

          // Apply previous version
          const undoneComponent: GeneratedComponent = {
            ...currentComponent,
            code: previousVersion.code,
            description: previousVersion.description,
            timestamp: new Date().toISOString()
          };

          setCurrentComponent(undoneComponent);
          setComponents(prev => 
            prev.map(comp => comp.id === currentComponent.id ? undoneComponent : comp)
          );
        }
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y for Redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        if (redoStack.length > 0) {
          const nextVersion = redoStack[redoStack.length - 1];
          const newRedoStack = redoStack.slice(0, -1);

          // Save current state to undo stack
          const currentVersion: AppVersion = {
            id: Date.now().toString(),
            versionNumber: (currentComponent.versions?.length || 0) + 1,
            code: currentComponent.code,
            description: currentComponent.description,
            timestamp: currentComponent.timestamp,
            changeType: 'MINOR_CHANGE'
          };
          setUndoStack(prev => [...prev, currentVersion]);
          setRedoStack(newRedoStack);

          // Apply next version
          const redoneComponent: GeneratedComponent = {
            ...currentComponent,
            code: nextVersion.code,
            description: nextVersion.description,
            timestamp: new Date().toISOString()
          };

          setCurrentComponent(redoneComponent);
          setComponents(prev => 
            prev.map(comp => comp.id === currentComponent.id ? redoneComponent : comp)
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, currentComponent]);

  // Database operations
  const saveComponentToDb = async (component: GeneratedComponent) => {
    if (!user) {
      // User not authenticated - skip database save
      return { success: true };
    }

    try {
      const supabase = createClient();
      const dbData = componentToDb(component, user.id);
      
      // Upsert without onConflict parameter - let Supabase handle it automatically
      const { error } = await supabase
        .from('generated_apps')
        .upsert(dbData);
      
      if (error) {
        console.error('Error saving to database:', error);
        setDbSyncError(`Failed to save "${component.name}" to database`);
        return { success: false, error };
      }
      
      // Clear any previous errors
      setDbSyncError(null);
      return { success: true };
    } catch (error) {
      console.error('Error in saveComponentToDb:', error);
      setDbSyncError('Failed to save to database');
      return { success: false, error };
    }
  };

  const deleteComponentFromDb = async (componentId: string) => {
    if (!user) {
      // User not authenticated - skip database delete
      return { success: true };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('generated_apps')
        .delete()
        .eq('id', componentId)
        .eq('user_id', user.id); // Ensure user can only delete their own apps
      
      if (error) {
        console.error('Error deleting from database:', error);
        setDbSyncError('Failed to delete from database');
        return { success: false, error };
      }
      
      // Clear any previous errors
      setDbSyncError(null);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteComponentFromDb:', error);
      setDbSyncError('Failed to delete from database');
      return { success: false, error };
    }
  };

  // Load components from Supabase database (with localStorage fallback)
  useEffect(() => {
    let mounted = true;
    
    const loadApps = async () => {
      // Wait for session to be definitively checked
      // sessionReady only becomes true AFTER we know the auth state
      if (!sessionReady) {
        console.log('[LoadApps] Waiting for session to be ready...');
        return;
      }
      
      if (!mounted) return;
      
      console.log('[LoadApps] Session ready, user:', user?.id || 'anonymous');
      
      setLoadingApps(true);
      setDbSyncError(null);
      
      try {
        if (user) {
          // User is authenticated - load from BOTH database AND localStorage, then merge
          const supabase = createClient();
          const { data: dbApps, error } = await supabase
            .from('generated_apps')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error loading apps from database:', error);
            setDbSyncError('Failed to load apps from database');
            
            // Fallback to localStorage
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('ai_components');
              if (stored) {
                setComponents(JSON.parse(stored));
              }
            }
          } else {
            // Convert database apps to component format
            const dbComponents = (dbApps || []).map(dbToComponent);
            
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
            
            // MERGE: Use Map to deduplicate by ID
            const mergedMap = new Map<string, GeneratedComponent>();
            
            // Add localStorage components first (may include apps not yet synced to DB)
            localComponents.forEach(comp => {
              mergedMap.set(comp.id, comp);
            });
            
            // Add/overwrite with database components (database is source of truth for synced apps)
            dbComponents.forEach(comp => {
              mergedMap.set(comp.id, comp);
            });
            
            // Convert back to array and sort by timestamp (newest first)
            const mergedComponents = Array.from(mergedMap.values()).sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            setComponents(mergedComponents);
            
            // Cache merged result in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('ai_components', JSON.stringify(mergedComponents));
              
              // Restore the last active app if one was saved
              const lastAppId = localStorage.getItem('current_app_id');
              if (lastAppId && mergedComponents.length > 0) {
                const lastApp = mergedComponents.find(c => c.id === lastAppId);
                if (lastApp) {
                  console.log('[LoadApps] Restoring last active app:', lastApp.name);
                  setCurrentComponent(lastApp);
                  if (lastApp.conversationHistory && lastApp.conversationHistory.length > 0) {
                    setChatMessages(lastApp.conversationHistory);
                  }
                  setActiveTab('preview');
                }
              }
            }
          }
        } else {
          // User not authenticated - load from localStorage only
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ai_components');
            if (stored) {
              try {
                const parsedComponents = JSON.parse(stored);
                setComponents(parsedComponents);
                
                // Restore the last active app if one was saved
                const lastAppId = localStorage.getItem('current_app_id');
                if (lastAppId && parsedComponents.length > 0) {
                  const lastApp = parsedComponents.find((c: GeneratedComponent) => c.id === lastAppId);
                  if (lastApp) {
                    console.log('[LoadApps] Restoring last active app:', lastApp.name);
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
    
    return () => {
      mounted = false;
    };
  }, [sessionReady, user?.id]); // Only re-run when session is ready or user changes

  // Save components to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && components.length > 0) {
      localStorage.setItem('ai_components', JSON.stringify(components));
    }
  }, [components]);

  // Save current app ID to localStorage for restoration on refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentComponent) {
        localStorage.setItem('current_app_id', currentComponent.id);
      } else {
        // Don't remove the ID when currentComponent is null during loading
        // Only remove it if user explicitly creates a new conversation
      }
    }
  }, [currentComponent?.id]);

  // Load files when user authenticates or when storage tab is active
  useEffect(() => {
    if (user && showLibrary && contentTab === 'files') {
      loadFiles();
    }
  }, [user, showLibrary, contentTab]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
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
  };

  // Remove uploaded image
  const removeImage = () => {
    setUploadedImage(null);
    setImageFile(null);
    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // APP CONCEPT WIZARD HANDLERS
  // ============================================================================

  /**
   * Generate implementation plan from app concept
   */
  const generateImplementationPlan = useCallback((concept: AppConcept) => {
    const phases: BuildPhase[] = [];
    let phaseNumber = 1;

    // Phase 1: Foundation & Layout
    phases.push({
      id: `phase-${phaseNumber}`,
      phaseNumber,
      name: 'Foundation & Layout',
      description: `Set up the base structure with ${concept.uiPreferences.layout} layout, ${concept.uiPreferences.style} style, and ${concept.uiPreferences.colorScheme} color scheme`,
      objectives: [
        'Create main layout structure',
        'Set up navigation',
        'Implement responsive design',
        'Apply theme and styling'
      ],
      prompt: `Create a ${concept.uiPreferences.layout} layout for "${concept.name}" with ${concept.uiPreferences.style} styling and ${concept.uiPreferences.colorScheme} color scheme. Primary color: ${concept.uiPreferences.primaryColor || '#3B82F6'}. The app is for: ${concept.targetUsers}.`,
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

    // Phase 3: Technical Requirements
    const techRequirements: string[] = [];
    if (concept.technical.needsAuth) {
      techRequirements.push(`${concept.technical.authType || 'simple'} authentication`);
    }
    if (concept.technical.needsDatabase) {
      techRequirements.push('database storage');
    }
    if (concept.technical.needsAPI) {
      techRequirements.push('API integration');
    }
    if (concept.technical.needsFileUpload) {
      techRequirements.push('file upload');
    }
    if (concept.technical.needsRealtime) {
      techRequirements.push('real-time updates');
    }

    if (techRequirements.length > 0) {
      phases.push({
        id: `phase-${phaseNumber}`,
        phaseNumber,
        name: 'Technical Features',
        description: `Implement ${techRequirements.join(', ')}`,
        objectives: techRequirements,
        prompt: `Add technical features to "${concept.name}": ${techRequirements.join(', ')}`,
        dependencies: [`phase-${phaseNumber - 1}`],
        features: [],
        estimatedComplexity: 'complex',
        status: 'pending'
      });
      phaseNumber++;
    }

    // Phase 4: Secondary Features (Medium Priority)
    const mediumPriorityFeatures = concept.coreFeatures.filter(f => f.priority === 'medium');
    if (mediumPriorityFeatures.length > 0) {
      phases.push({
        id: `phase-${phaseNumber}`,
        phaseNumber,
        name: 'Secondary Features',
        description: 'Implement medium-priority features',
        objectives: mediumPriorityFeatures.map(f => f.name),
        prompt: `Add these secondary features to "${concept.name}": ${mediumPriorityFeatures.map(f => `${f.name} - ${f.description}`).join('; ')}`,
        dependencies: [`phase-${phaseNumber - 1}`],
        features: mediumPriorityFeatures.map(f => f.id),
        estimatedComplexity: 'moderate',
        status: 'pending'
      });
      phaseNumber++;
    }

    // Phase 5: Optional Features (Low Priority)
    const lowPriorityFeatures = concept.coreFeatures.filter(f => f.priority === 'low');
    if (lowPriorityFeatures.length > 0) {
      phases.push({
        id: `phase-${phaseNumber}`,
        phaseNumber,
        name: 'Optional Enhancements',
        description: 'Implement nice-to-have features',
        objectives: lowPriorityFeatures.map(f => f.name),
        prompt: `Add these optional features to "${concept.name}": ${lowPriorityFeatures.map(f => `${f.name} - ${f.description}`).join('; ')}`,
        dependencies: [`phase-${phaseNumber - 1}`],
        features: lowPriorityFeatures.map(f => f.id),
        estimatedComplexity: 'simple',
        status: 'pending'
      });
    }

    const plan: ImplementationPlan = {
      concept,
      phases,
      estimatedSteps: phases.length,
      createdAt: new Date().toISOString()
    };

    setImplementationPlan(plan);

    // Add system message about the plan
    const planMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🎯 **Implementation Plan Created for "${concept.name}"**\n\n` +
        `I've analyzed your app concept and created a ${phases.length}-phase build plan:\n\n` +
        phases.map((p, i) => `**Phase ${p.phaseNumber}: ${p.name}**\n${p.description}`).join('\n\n') +
        `\n\n💡 **Ready to start building?** Switch to **⚡ ACT Mode** and type "build phase 1" or "start building" to begin!\n\n` +
        `You can also ask me to modify the plan or discuss any phase in detail.`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, planMessage]);

    // Convert to the existing StagePlan format for compatibility
    const stagePlan: StagePlan = {
      totalPhases: phases.length,
      currentPhase: 0,
      phases: phases.map(p => ({
        number: p.phaseNumber,
        name: p.name,
        description: p.description,
        features: p.objectives,
        status: 'pending' as PhaseStatus
      }))
    };
    setNewAppStagePlan(stagePlan);
  }, []);

  /**
   * Handle wizard completion
   */
  const handleConceptComplete = useCallback((concept: AppConcept) => {
    setAppConcept(concept);
    setShowConceptWizard(false);

    // Add welcome message about the new concept
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✨ **App Concept Created: "${concept.name}"**\n\n` +
        `**Description:** ${concept.description}\n\n` +
        `**Target Users:** ${concept.targetUsers}\n\n` +
        `**Features:** ${concept.coreFeatures.length} defined\n\n` +
        `**Design:** ${concept.uiPreferences.style} style, ${concept.uiPreferences.colorScheme} mode, ${concept.uiPreferences.layout} layout\n\n` +
        `I'm now generating your implementation plan...`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, welcomeMessage]);

    // Generate implementation plan
    generateImplementationPlan(concept);
  }, [generateImplementationPlan]);

  /**
   * Start advanced phased build from app concept
   */
  const handleStartAdvancedPhasedBuild = useCallback(async () => {
    if (!appConcept) return;

    const phasedConcept: PhasedAppConcept = {
      name: appConcept.name,
      description: appConcept.description,
      appType: appConcept.uiPreferences.layout,
      features: appConcept.coreFeatures.map(f => f.name),
      uiStyle: appConcept.uiPreferences.style,
      colorScheme: appConcept.uiPreferences.colorScheme,
      complexity: appConcept.coreFeatures.length > 5 ? 'complex' : appConcept.coreFeatures.length > 2 ? 'moderate' : 'simple',
    };

    await buildPhases.startPhasedBuild(phasedConcept);
    setShowAdvancedPhasedBuild(true);

    const notification: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: `🏗️ **Advanced Phased Build Started**\n\nBuilding "${appConcept.name}" in ${buildPhases.phases.length} structured phases.\n\nUse the Phase Control Panel to manage the build process.`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, notification]);
  }, [appConcept, buildPhases]);

  /**
   * Handle phase detail view
   */
  const handleViewPhaseDetails = useCallback((phaseId: PhaseId) => {
    setSelectedPhaseId(phaseId);
  }, []);

  /**
   * Handle phase validation
   */
  const handleRunValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      await buildPhases.validateCurrentPhase();
    } finally {
      setIsValidating(false);
    }
  }, [buildPhases]);

  const sendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;

    // NEW: Check if user is starting a phased build OR continuing to next phase
    const lastMsg = chatMessages[chatMessages.length - 1];
    const isReadyToStartPhase = lastMsg?.role === 'assistant' && 
      lastMsg?.content.includes('Type **\'start\'** or **\'begin\'**') &&
      newAppStagePlan &&
      newAppStagePlan.phases.every(p => p.status === 'pending');

    const isReadyToContinuePhase = lastMsg?.role === 'assistant' &&
      lastMsg?.content.includes('Phase') &&
      lastMsg?.content.includes('Complete!') &&
      lastMsg?.content.includes('**Ready to continue?**') &&
      newAppStagePlan &&
      newAppStagePlan.phases.some(p => p.status === 'pending');

    if (isReadyToStartPhase && (userInput.toLowerCase() === 'start' || userInput.toLowerCase() === 'begin')) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, userMessage]);
      setUserInput('');

      // Build Phase 1
      const phase1 = newAppStagePlan.phases[0];
      const buildPrompt = `Build ${phase1.name}: ${phase1.description}. Features to implement: ${phase1.features.join(', ')}`;
      
      // Update phase status to building
      setNewAppStagePlan(prev => prev ? {
        ...prev,
        currentPhase: 1,
        phases: prev.phases.map(p => 
          p.number === 1 ? { ...p, status: 'building' } : p
        )
      } : null);

      // Set input to build prompt and trigger build
      setUserInput(buildPrompt);
      // Use setTimeout to allow state to update before calling sendMessage again
      setTimeout(() => {
        const sendBtn = document.querySelector('[data-send-button="true"]') as HTMLButtonElement;
        if (sendBtn) sendBtn.click();
      }, 100);
      return;
    }

    // Handle "continue" or "next" for phase progression
    if (isReadyToContinuePhase && (userInput.toLowerCase() === 'continue' || userInput.toLowerCase() === 'next')) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, userMessage]);
      setUserInput('');

      // Find next pending phase
      const nextPhase = newAppStagePlan.phases.find(p => p.status === 'pending');
      
      if (nextPhase) {
        // Build prompt for next phase
        const buildPrompt = `Build ${nextPhase.name}: ${nextPhase.description}. Features to implement: ${nextPhase.features.join(', ')}`;
        
        // Update phase status to 'building'
        setNewAppStagePlan(prev => prev ? {
          ...prev,
          currentPhase: nextPhase.number,
          phases: prev.phases.map(p => 
            p.number === nextPhase.number ? { ...p, status: 'building' } : p
          )
        } : null);

        // Auto-trigger build
        setUserInput(buildPrompt);
        setTimeout(() => {
          const sendBtn = document.querySelector('[data-send-button="true"]') as HTMLButtonElement;
          if (sendBtn) sendBtn.click();
        }, 100);
      }
      return;
    }

    // Check if user recently consented to staging (prevent redundant detection)
    const recentlyConsented = chatMessages.slice(-10).some((msg, idx, arr) => {
      if (msg.content.includes('Complex Modification Detected')) {
        const laterMessages = arr.slice(idx + 1);
        return laterMessages.some(m => 
          m.role === 'user' && 
          m.content.toLowerCase().includes('proceed')
        );
      }
      return false;
    });

    // Handle stage checkpoint responses
    const isAtStageCheckpoint = lastMsg?.role === 'assistant' &&
      lastMsg?.content.includes('Stage Complete') && 
      lastMsg?.content.includes('Happy with this stage');

    if (isAtStageCheckpoint && currentStagePlan) {
      const userResponse = userInput.toLowerCase().trim();
      
      // User approves current stage
      if (userResponse === 'yes' || userResponse.includes('looks good') || 
          userResponse === 'continue' || userResponse.includes('next')) {
        
        const nextStage = currentStagePlan.currentStage + 1;
        
        if (nextStage <= currentStagePlan.totalStages) {
          const proceedMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'system',
            content: `✅ Proceeding to Stage ${nextStage}/${currentStagePlan.totalStages}`,
            timestamp: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, proceedMessage]);
          
          // Generate next stage request and let user trigger send again
          const nextStageDesc = currentStagePlan.nextStages[nextStage - currentStagePlan.currentStage - 1] || 'Continue implementation';
          setUserInput(`Continue with Stage ${nextStage}: ${nextStageDesc}`);
          return; // Return and let the user manually submit the next stage
        } else {
          // All stages complete
          const completeMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🎉 **All Stages Complete!**\n\nYour feature has been fully implemented across ${currentStagePlan.totalStages} stages. Everything is working together now!\n\nFeel free to test it out and request any adjustments.`,
            timestamp: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, completeMessage]);
          setCurrentStagePlan(null);
          setUserInput('');
          return;
        }
      }
      // User wants to cancel staged implementation
      else if (userResponse === 'cancel' || userResponse === 'stop') {
        setCurrentStagePlan(null);
        const cancelMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Staged implementation cancelled. Your app remains in its current state (with Stage ${currentStagePlan.currentStage} applied). Feel free to request different modifications!`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, cancelMsg]);
        setUserInput('');
        return;
      }
      // User wants adjustments - let it continue to modification flow
    }

    // Detect complex modifications that need staged implementation
    const complexModificationIndicators = [
      'add authentication', 'add auth', 'login system', 'user accounts', 'signup',
      'add database', 'add backend', 'add api', 'connect to database',
      'add payment', 'stripe', 'checkout system',
      'completely change', 'redesign everything', 'rebuild',
      'add real-time', 'add websockets', 'add chat', 'live updates',
      'add notifications', 'push notifications',
      'add email', 'send emails', 'email system',
      'add file upload', 'image upload', 'file storage'
    ];

    const isComplexModification = currentComponent && 
      !isGenerating &&
      complexModificationIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)
      );

    // If complex modification detected AND user hasn't recently consented, show staging explanation
    if (isComplexModification && !recentlyConsented) {
      const stagingMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ **Complex Modification Detected**

Your request: "${userInput}"

**Why Staged Implementation?**
This feature requires substantial changes. Implementing in stages ensures:
✅ Your current app's styling and features are preserved
✅ Each piece works correctly before moving on
✅ You can guide the direction at each step
✅ No accidental changes to existing functionality

**How It Works:**
1. I'll plan the implementation in 2-4 stages
2. Show you what Stage 1 will add (you'll approve via diff preview)
3. After Stage 1 is applied, you can review and request adjustments
4. Then we proceed to Stage 2, and so on

**Important:** Your app won't lose any existing features - I'll only ADD what you requested.

Reply **'proceed'** to continue with staged implementation, or **'cancel'** to try a different approach.`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, stagingMessage]);
      setUserInput('');
      return; // Wait for user consent
    }

    // Check if user is responding to staging consent
    const lastMessage = chatMessages[chatMessages.length - 1];
    const isConsentingToStaging = userInput.toLowerCase().trim() === 'proceed' && 
      lastMessage?.content.includes('Complex Modification Detected');

    // If user is canceling staged modification
    if (userInput.toLowerCase().trim() === 'cancel' && 
        lastMessage?.content.includes('Complex Modification Detected')) {
      const cancelMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "No problem! Feel free to request a simpler modification or try a different approach. I'm here to help!",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, cancelMessage]);
      setUserInput('');
      return;
    }

    // Convert to lowercase once for all checks
    const input = userInput.toLowerCase();

    // Detect if user is explicitly asking for code
    const codeRequestIndicators = [
      'show me the code', 'show code', 'give me the code',
      'what is the code', "what's the code", 'display code',
      'let me see the code', 'code for', 'view code',
      'show implementation', 'show me how', 'code example',
      'code snippet', 'share code', 'paste code',
      'write code', 'provide code', 'code please'
    ];
    
    const isRequestingCode = codeRequestIndicators.some(indicator => 
      input.includes(indicator)
    );
    
    // Detect if this is a question or an app build request
    const questionIndicators = [
      'what', 'how', 'why', 'when', 'where', 'who', 'which',
      'explain', 'tell me', 'can you', 'could you', 'would you',
      'should i', 'is it', 'are there', 'do i', 'does', 'did',
      '?', 'help me understand', 'difference between',
      'i want to know', 'i need help',
      'wondering', 'curious', 'question', 'asking',
      'vs', 'versus', 'better than', 'best way',
      'recommend', 'suggestion', 'advice', 'opinion',
      'means', 'mean by', 'definition', 'tutorial'
    ];
    
    const buildIndicators = [
      'build', 'create', 'make', 'generate', 'design',
      'develop', 'code', 'write', 'implement', 'add feature',
      'app', 'application', 'website', 'component', 'page',
      'dashboard', 'calculator', 'game', 'timer', 'counter',
      'todo', 'form', 'modal', 'navbar', 'sidebar',
      'app that', 'component for', 'page with',
      'project', 'build me', 'make me', 'create me'
    ];
    
    // Handle "show me X" / "give me X" where X is an app/component
    const showGivePattern = /(show me|give me)\s+(a|an)?\s*(app|dashboard|calculator|game|timer|counter|todo|website|component|page|form|modal)/i;
    const hasShowGiveBuild = showGivePattern.test(userInput);
    
    // Meta questions about capabilities (asking ABOUT building, not requesting to build)
    const metaQuestionPatterns = [
      /how (big|large|complex|many).*(can|could|do) you (build|create|make)/i,
      /what (can|could) you (build|create|make|generate)/i,
      /what (kind|type|sort) of (app|project|thing)/i,
      /(capabilities|limitations|able to|possible to)/i,
      /how (does|do) (this|it|you) work/i,
      /what (are|is) (your|the) (limits|capabilities|features)/i
    ];
    
    // Check if it's a meta question about capabilities
    const isMetaQuestion = metaQuestionPatterns.some(pattern => pattern.test(userInput));
    
    // Determine if this is a question or build request
    const hasQuestionWords = questionIndicators.some(indicator => input.includes(indicator));
    const hasBuildWords = buildIndicators.some(indicator => input.includes(indicator));
    
    const isQuestion = (hasQuestionWords && !hasBuildWords && !hasShowGiveBuild) || isMetaQuestion;
    
    // NEW: Detect complex new app builds that should use staged approach
    const newAppComplexityIndicators = [
      'complete', 'full-featured', 'comprehensive', 'all features',
      'everything', 'entire', 'full', 'advanced', 'complex',
      'with authentication', 'with auth', 'with backend', 'with database',
      'multiple pages', 'full stack', 'production-ready',
      'e-commerce', 'social media', 'social network', 'marketplace',
      'cms', 'content management', 'blog platform', 'forum'
    ];
    
    const wordCount = userInput.split(' ').length;
    const hasNewAppComplexityIndicators = newAppComplexityIndicators.some(indicator => 
      input.includes(indicator)
    );
    
    // Check if this is a complex NEW app request (not a modification)
    const isComplexNewApp = !currentComponent && 
      !isQuestion && 
      (wordCount > 40 || hasNewAppComplexityIndicators) &&
      !isGenerating;
    
    // If complex new app detected, offer staged building
    if (isComplexNewApp && currentMode === 'ACT') {
      // Check if user hasn't already been prompted recently
      const recentlyPromptedForStaging = chatMessages.slice(-10).some(msg =>
        msg.content.includes('Build in Phases?')
      );
      
      if (!recentlyPromptedForStaging) {
        setPendingNewAppRequest(userInput);
        setShowNewAppStagingModal(true);
        
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: userInput,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, userMessage]);
        setUserInput('');
        return; // Wait for user decision
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    // Store the last user request for mode transition detection
    setLastUserRequest(userInput);

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);
    
    // Different progress messages for questions vs app building vs modifications
    const isModification = currentComponent !== null;
    const progressMessages = isQuestion ? [
      '🤔 Thinking about your question...',
      '📚 Gathering information...',
      '✍️ Formulating answer...'
    ] : isModification ? [
      '🔍 Analyzing your modification request...',
      '📋 Planning targeted changes...',
      '✨ Generating precise edits...',
      '🎯 Creating surgical modifications...'
    ] : [
      '🤔 Analyzing your request...',
      '🏗️ Designing app structure...',
      '⚡ Generating components...',
      '🎨 Styling with Tailwind...',
      '✨ Adding functionality...',
      '🔧 Finalizing code...'
    ];
    
    let progressIndex = 0;
    let progressInterval: NodeJS.Timeout | null = null;
    
    progressInterval = setInterval(() => {
      if (progressIndex < progressMessages.length) {
        setGenerationProgress(progressMessages[progressIndex]);
        progressIndex++;
      }
    }, 3000); // Update every 3 seconds

    try {
      // Determine whether to use diff system
      const useDiffSystem = isModification && !isQuestion;
      
      // Route based on Plan/Act mode
      let endpoint: string;
      if (currentMode === 'PLAN') {
        // In PLAN mode, ALWAYS use chat endpoint - never build code
        endpoint = '/api/chat';
      } else {
        // In ACT mode, use normal routing logic
        endpoint = isQuestion ? '/api/chat' : 
                   useDiffSystem ? '/api/ai-builder/modify' : '/api/ai-builder/full-app';
      }
      
      // Prepare the request body with enhanced conversation history for staging
      const getEnhancedHistory = () => {
        const recentMessages = chatMessages.slice(-10);
        const stagingMessages = chatMessages.filter(m => 
          m.content.includes('Complex Modification Detected') ||
          m.content.includes('Implementation Plan Ready') ||
          m.content.includes('Stage')
        ).slice(-5);
        const combined = [...stagingMessages, ...recentMessages];
        const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
        return unique.slice(-50);
      };

      // Build request body based on endpoint and mode
      let requestBody: any;
      
      // Parse current app state once if available (for code visibility across all endpoints)
      const parsedCurrentAppState = currentComponent ? JSON.parse(currentComponent.code) : null;
      
      if (currentMode === 'PLAN') {
        // In PLAN mode, always send to chat endpoint with PLAN mode flag
        // Include currentAppState so AI can see the code it has generated
        requestBody = {
          prompt: userInput,
          conversationHistory: chatMessages.slice(-30),
          includeCodeInResponse: isRequestingCode,
          mode: 'PLAN',
          currentAppState: parsedCurrentAppState
        };
      } else if (isQuestion) {
        // ACT mode Q&A
        // Include currentAppState so AI can see the code when answering questions
        requestBody = {
          prompt: userInput,
          conversationHistory: chatMessages.slice(-30),
          includeCodeInResponse: isRequestingCode,
          mode: 'ACT',
          currentAppState: parsedCurrentAppState
        };
      } else if (useDiffSystem) {
        // ACT mode modifications
        requestBody = {
          prompt: userInput,
          currentAppState: parsedCurrentAppState,
          conversationHistory: getEnhancedHistory(),
          includeCodeInResponse: isRequestingCode
        };
      } else {
        // ACT mode new apps
        // Include currentAppState so AI can see existing code when building new features
        requestBody = {
          prompt: userInput,
          conversationHistory: chatMessages.slice(-50),
          isModification: false,
          currentAppName: currentComponent?.name || null,
          includeCodeInResponse: isRequestingCode,
          currentAppState: parsedCurrentAppState
        };
      }

      // Add image if uploaded
      if (uploadedImage) {
        requestBody.image = uploadedImage;
        requestBody.hasImage = true;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      clearInterval(progressInterval);
      setGenerationProgress('');
      
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Handle staged modification response (with stage plan)
      if (data.changeType === 'MODIFICATION' && data.stagePlan && data.files) {
        const stagePlan = data.stagePlan;
        
        // Store stage plan for checkpoint handling
        setCurrentStagePlan(stagePlan);
        
        // Show stage plan explanation
        const stagePlanMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `📋 **Implementation Plan Ready**

${data.summary}

**This Stage (${stagePlan.currentStage}/${stagePlan.totalStages}):** ${stagePlan.stageDescription}

**Upcoming Stages:**
${stagePlan.nextStages.map((s: string, i: number) => `  ${stagePlan.currentStage + i + 1}. ${s}`).join('\n')}

**What This Preserves:**
✅ Your current styling and colors
✅ All existing features
✅ Current app architecture

I'll now show you the changes for Stage ${stagePlan.currentStage}. Review and approve to continue.`,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, stagePlanMessage]);
        
        // Show diff preview for this stage
        setPendingDiff({
          id: Date.now().toString(),
          summary: data.summary,
          files: data.files,
          timestamp: new Date().toISOString()
        });
        setShowDiffPreview(true);
        return; // Wait for user approval
      }

      // Handle regular diff response (from modify endpoint)
      if (data.changeType === 'MODIFICATION' && data.files) {
        setPendingDiff({
          id: Date.now().toString(),
          summary: data.summary,
          files: data.files,
          timestamp: new Date().toISOString()
        });
        setShowDiffPreview(true);
        
        const diffMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🔍 **Changes Ready for Review**\n\n${data.summary}\n\nPlease review the proposed changes before applying.`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, diffMessage]);
        return; // Exit early, wait for user approval
      }

      // Handle chat Q&A response
      if (isQuestion || data.type === 'chat') {
        const chatResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer || data.description,
          timestamp: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, chatResponse]);
      } else {
        // Handle full-app response
        // Check if this is a modification to existing app
        const isModification = currentComponent !== null;
        const changeType = data.changeType || 'NEW_APP';
        const requiresApproval = isModification && changeType === 'MAJOR_CHANGE';
        
        if (requiresApproval) {
          // Major change to existing app - requires approval
          const aiAppMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `⚠️ **Major Change Detected**\n\nI've prepared significant modifications to your app that require approval:\n\n${data.changeSummary || data.description}\n\nPlease review and approve before I apply these changes.`,
            timestamp: new Date().toISOString(),
            componentCode: JSON.stringify(data),
            componentPreview: false
          };

          setChatMessages(prev => [...prev, aiAppMessage]);
          
          // Store pending change for approval
          setPendingChange({
            id: Date.now().toString(),
            changeDescription: data.changeSummary || data.description || userInput,
            newCode: JSON.stringify(data, null, 2),
            timestamp: new Date().toISOString()
          });
          
          setShowApprovalModal(true);
        } else {
          // New app OR minor change - apply directly
          const changeLabel = isModification 
            ? (changeType === 'MINOR_CHANGE' ? '✨ Minor update applied' : '🎉 Changes applied')
            : '🚀 App created';
            
          const aiAppMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `${changeLabel}\n\n${data.description || `I've ${isModification ? 'updated' : 'created'} your ${data.name} app with ${data.files?.length || 0} files!`}${data.changeSummary ? `\n\n**What changed:** ${data.changeSummary}` : ''}`,
            timestamp: new Date().toISOString(),
            componentCode: JSON.stringify(data),
            componentPreview: !!data.files
          };

          setChatMessages(prev => [...prev, aiAppMessage]);
          
          // Check if the description suggests follow-up features (for large apps split into phases)
          const suggestsFollowUp = data.description?.toLowerCase().includes('you can ask') || 
                                   data.description?.toLowerCase().includes('add in follow-up') ||
                                   data.description?.toLowerCase().includes('next steps');
          
          if (suggestsFollowUp && !isModification) {
            // Add a helpful follow-up message
            const followUpMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              role: 'system',
              content: "💡 **Building in Phases**: I've created a solid foundation! You can now request additional features one at a time (e.g., 'add user authentication', 'add dark mode', 'add export functionality'). This ensures each feature is implemented perfectly.",
              timestamp: new Date().toISOString()
            };
            
            setChatMessages(prev => [...prev, followUpMessage]);
          }

          // Create or update the app
          if (data.files && data.files.length > 0) {
            // NEW: Check if this was a phased build completion
            // Compute the updated plan ONCE and reuse it
            let updatedPlan: typeof newAppStagePlan = null;
            let allPhasesComplete = false;
            
            if (newAppStagePlan) {
              const currentPhaseNum = newAppStagePlan.currentPhase;
              updatedPlan = {
                ...newAppStagePlan,
                phases: newAppStagePlan.phases.map(p => 
                  p.number === currentPhaseNum ? { ...p, status: 'complete' as const } : p
                )
              };
              setNewAppStagePlan(updatedPlan);
              
              // Check if there are more phases
              const nextPhase = updatedPlan.phases.find(p => p.status === 'pending');
              if (nextPhase) {
                // Add message prompting for next phase
                setTimeout(() => {
                  const nextPhaseMessage: ChatMessage = {
                    id: (Date.now() + 10).toString(),
                    role: 'assistant',
                    content: `✅ **Phase ${currentPhaseNum} Complete!**\n\n**Next up - Phase ${nextPhase.number}: ${nextPhase.name}**\n${nextPhase.description}\n\nFeatures to add:\n${nextPhase.features.map(f => `  • ${f}`).join('\n')}\n\n**Ready to continue?** Type **'continue'** or **'next'** to build Phase ${nextPhase.number}, or ask me to adjust Phase ${currentPhaseNum} first.`,
                    timestamp: new Date().toISOString()
                  };
                  setChatMessages(prev => [...prev, nextPhaseMessage]);
                }, 1000);
              } else {
                // All phases complete - will clear stagePlan in component
                allPhasesComplete = true;
                setTimeout(() => {
                  const completionMessage: ChatMessage = {
                    id: (Date.now() + 10).toString(),
                    role: 'assistant',
                    content: `🎉 **All ${newAppStagePlan.totalPhases} Phases Complete!**\n\nYour app is fully built with all requested features. Test it out and let me know if you'd like any adjustments!`,
                    timestamp: new Date().toISOString()
                  };
                  setChatMessages(prev => [...prev, completionMessage]);
                  setNewAppStagePlan(null); // Clear phase plan
                }, 1000);
              }
            }
            
            // If modifying, save current state to undo stack BEFORE making changes
            if (isModification && currentComponent) {
              const previousVersion: AppVersion = {
                id: Date.now().toString(),
                versionNumber: (currentComponent.versions?.length || 0) + 1,
                code: currentComponent.code,
                description: currentComponent.description,
                timestamp: currentComponent.timestamp,
                changeType: 'MINOR_CHANGE'
              };
              setUndoStack(prev => [...prev, previousVersion]);
              setRedoStack([]); // Clear redo stack on new change
            }
            
            let newComponent: GeneratedComponent = {
              id: isModification ? currentComponent.id : crypto.randomUUID(),
              name: data.name || extractComponentName(userInput),
              code: JSON.stringify(data, null, 2),
              description: userInput,
              timestamp: new Date().toISOString(),
              isFavorite: isModification ? currentComponent.isFavorite : false,
              conversationHistory: [...chatMessages, userMessage, aiAppMessage],
              versions: isModification ? currentComponent.versions : [],
              // FIX: Use the already-computed updatedPlan, or null if all phases complete
              stagePlan: allPhasesComplete ? null : updatedPlan
            };
            
            // Save version for this change
            newComponent = saveVersion(
              newComponent, 
              changeType || 'NEW_APP',
              data.changeSummary || data.description || userInput
            );

            setCurrentComponent(newComponent);
            
            if (isModification) {
              // Update existing component
              setComponents(prev => 
                prev.map(comp => comp.id === currentComponent.id ? newComponent : comp)
              );
            } else {
              // Add new component
              setComponents(prev => [newComponent, ...prev].slice(0, 50));
            }
            
            // Save to database
            saveComponentToDb(newComponent);
            
            setActiveTab('preview');
          }
        }
      }

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      setGenerationProgress('');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setGenerationProgress('');
      setIsGenerating(false);
      // Clear uploaded image after sending
      setUploadedImage(null);
      setImageFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const extractComponentName = (prompt: string): string => {
    // Simple extraction: take first few words
    const words = prompt.split(' ').slice(0, 3).join(' ');
    return words.length > 30 ? words.slice(0, 27) + '...' : words;
  };

  const saveVersion = (component: GeneratedComponent, changeType: 'NEW_APP' | 'MAJOR_CHANGE' | 'MINOR_CHANGE', description: string) => {
    const versions = component.versions || [];
    const newVersion: AppVersion = {
      id: Date.now().toString(),
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
  };

  const approveChange = () => {
    if (!pendingChange || !currentComponent) return;

    try {
      // Save current state to undo stack BEFORE applying changes
      const previousVersion: AppVersion = {
        id: Date.now().toString(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE'
      };
      setUndoStack(prev => [...prev, previousVersion]);
      setRedoStack([]); // Clear redo stack on new change
      
      const parsedData = JSON.parse(pendingChange.newCode);
      
      // Create new version with approved changes
      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: pendingChange.newCode,
        description: pendingChange.changeDescription,
        timestamp: new Date().toISOString()
      };
      
      // Save this as a new version in history
      updatedComponent = saveVersion(updatedComponent, 'MAJOR_CHANGE', pendingChange.changeDescription);

      setCurrentComponent(updatedComponent);
      setComponents(prev => 
        prev.map(comp => comp.id === currentComponent.id ? updatedComponent : comp)
      );

      // Save to database
      saveComponentToDb(updatedComponent);

      // Add approval confirmation message
      const approvalMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Changes approved and applied! Your ${parsedData.name || 'app'} has been updated. (Version ${updatedComponent.versions?.length || 1} saved)`,
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
  };

  const rejectChange = () => {
    // Add rejection message
    const rejectionMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged. Feel free to request different modifications!`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, rejectionMessage]);
    setPendingChange(null);
    setShowApprovalModal(false);
    setActiveTab('chat');
  };

  const approveDiff = async () => {
    if (!pendingDiff || !currentComponent) return;

    try {
      // Parse current app to get files
      const currentAppData = JSON.parse(currentComponent.code);
      const currentFiles = currentAppData.files.map((f: any) => ({
        path: f.path,
        content: f.content
      }));

      // Apply diff via server-side API (where tree-sitter can run)
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

      // Create updated app with modified files
      const updatedAppData = {
        ...currentAppData,
        files: result.modifiedFiles.map(f => ({
          path: f.path,
          content: f.content
        }))
      };

      // Save current state to undo stack
      const previousVersion: AppVersion = {
        id: Date.now().toString(),
        versionNumber: (currentComponent.versions?.length || 0) + 1,
        code: currentComponent.code,
        description: currentComponent.description,
        timestamp: currentComponent.timestamp,
        changeType: 'MINOR_CHANGE'
      };
      setUndoStack(prev => [...prev, previousVersion]);
      setRedoStack([]);

      // Create updated component
      let updatedComponent: GeneratedComponent = {
        ...currentComponent,
        code: JSON.stringify(updatedAppData, null, 2),
        description: pendingDiff.summary,
        timestamp: new Date().toISOString()
      };

      // Save as new version
      updatedComponent = saveVersion(updatedComponent, 'MINOR_CHANGE', pendingDiff.summary);

      setCurrentComponent(updatedComponent);
      setComponents(prev =>
        prev.map(comp => comp.id === currentComponent.id ? updatedComponent : comp)
      );

      // Save to database
      saveComponentToDb(updatedComponent);

      // Check if this was a staged modification
      const isStaged = pendingDiff.summary.includes('Stage');
      
      // Add success message with checkpoint if staged
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isStaged 
          ? `✅ **Stage Complete!**\n\n${pendingDiff.summary}\n\nCheck the preview to see the changes in action.\n\n**Happy with this stage?**\n• Reply **'yes'** or **'looks good'** → Move to next stage\n• Reply **'change [something]'** → I'll adjust it\n\n(Take your time to review - we'll only proceed when you're satisfied!)`
          : `✅ Changes applied successfully!\n\n${pendingDiff.summary}`,
        timestamp: new Date().toISOString(),
        componentCode: JSON.stringify(updatedAppData, null, 2),
        componentPreview: true
      };

      setChatMessages(prev => [...prev, successMessage]);
      setActiveTab('preview');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Detect if this is a pattern matching error
      const isPatternError = errorMsg.toLowerCase().includes('search pattern not found') || 
                             errorMsg.toLowerCase().includes('failed to apply');
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isPatternError 
          ? `❌ **Modification Failed - Pattern Not Found**\n\n${errorMsg}\n\n**Why this happened:**\nThe code structure I was looking for doesn't match the current file exactly. This often happens when:\n• Previous changes altered the code structure\n• Auto-formatting changed spacing/indentation\n• The code evolved differently than expected\n\n💡 **Your options:**\n\n1. **Retry with file reading** (Recommended)\n   Type: "try again" - I'll read the current file and generate better matches\n\n2. **Break it down**\n   Describe just ONE specific change (e.g., "change button color to blue")\n\n3. **Different approach**\n   Try describing what you want differently\n\n4. **Skip this change**\n   Move on to something else`
          : `❌ **Error Applying Changes**\n\n${errorMsg}\n\n💡 **What you can do:**\n• Try breaking your request into smaller steps\n• Be more specific about what you want to change\n• Type "try again" to retry with better file reading\n\n**Want to try again?** Just describe the change differently, and I'll generate a new set of modifications.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingDiff(null);
      setShowDiffPreview(false);
    }
  };

  const rejectDiff = () => {
    const rejectionMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `❌ Changes rejected. Your app remains unchanged. Feel free to request different modifications!`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, rejectionMessage]);
    setPendingDiff(null);
    setShowDiffPreview(false);
    setActiveTab('chat');
  };

  const revertToVersion = (version: AppVersion) => {
    if (!currentComponent) return;

    // Save current state to undo stack before reverting
    const currentVersion: AppVersion = {
      id: Date.now().toString(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setUndoStack(prev => [...prev, currentVersion]);
    setRedoStack([]); // Clear redo stack on new action

    // Revert to the selected version
    const revertedComponent: GeneratedComponent = {
      ...currentComponent,
      code: version.code,
      description: `Reverted to version ${version.versionNumber}`,
      timestamp: new Date().toISOString()
    };

    setCurrentComponent(revertedComponent);
    setComponents(prev => 
      prev.map(comp => comp.id === currentComponent.id ? revertedComponent : comp)
    );

    // Add revert message
    const revertMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `🔄 Successfully reverted to Version ${version.versionNumber} from ${new Date(version.timestamp).toLocaleString()}\n\n**Reverted to:** ${version.description}`,
      timestamp: new Date().toISOString(),
      componentCode: version.code,
      componentPreview: true
    };

    setChatMessages(prev => [...prev, revertMessage]);
    setShowVersionHistory(false);
    setActiveTab('preview');
  };

  // Undo last change
  const handleUndo = () => {
    if (!currentComponent || undoStack.length === 0) return;

    const previousVersion = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Save current state to redo stack
    const currentVersion: AppVersion = {
      id: Date.now().toString(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setRedoStack(prev => [...prev, currentVersion]);
    setUndoStack(newUndoStack);

    // Apply previous version
    const undoneComponent: GeneratedComponent = {
      ...currentComponent,
      code: previousVersion.code,
      description: previousVersion.description,
      timestamp: new Date().toISOString()
    };

    setCurrentComponent(undoneComponent);
    setComponents(prev => 
      prev.map(comp => comp.id === currentComponent.id ? undoneComponent : comp)
    );
  };

  // Redo last undone change
  const handleRedo = () => {
    if (!currentComponent || redoStack.length === 0) return;

    const nextVersion = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Save current state to undo stack
    const currentVersion: AppVersion = {
      id: Date.now().toString(),
      versionNumber: (currentComponent.versions?.length || 0) + 1,
      code: currentComponent.code,
      description: currentComponent.description,
      timestamp: currentComponent.timestamp,
      changeType: 'MINOR_CHANGE'
    };
    setUndoStack(prev => [...prev, currentVersion]);
    setRedoStack(newRedoStack);

    // Apply next version
    const redoneComponent: GeneratedComponent = {
      ...currentComponent,
      code: nextVersion.code,
      description: nextVersion.description,
      timestamp: new Date().toISOString()
    };

    setCurrentComponent(redoneComponent);
    setComponents(prev => 
      prev.map(comp => comp.id === currentComponent.id ? redoneComponent : comp)
    );
  };

  // Compare two versions
  const handleCompareVersions = (v1: AppVersion, v2: AppVersion) => {
    setCompareVersions({ v1, v2 });
    setShowCompareModal(true);
  };

  // Fork/Branch app
  const handleForkApp = (sourceApp: GeneratedComponent, versionToFork?: AppVersion) => {
    const codeToFork = versionToFork ? versionToFork.code : sourceApp.code;
    const descriptionSuffix = versionToFork ? ` (forked from v${versionToFork.versionNumber})` : ' (forked)';

    const forkedApp: GeneratedComponent = {
      id: crypto.randomUUID(),
      name: `${sourceApp.name} - Fork`,
      code: codeToFork,
      description: sourceApp.description + descriptionSuffix,
      timestamp: new Date().toISOString(),
      isFavorite: false,
      conversationHistory: [],
      versions: [{
        id: crypto.randomUUID(),
        versionNumber: 1,
        code: codeToFork,
        description: `Forked from ${sourceApp.name}`,
        timestamp: new Date().toISOString(),
        changeType: 'NEW_APP'
      }]
    };

    setComponents(prev => [forkedApp, ...prev]);
    setCurrentComponent(forkedApp);
    setChatMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `🍴 Successfully forked "${sourceApp.name}"!\n\nYou can now make changes to this forked version without affecting the original.`,
      timestamp: new Date().toISOString(),
      componentCode: codeToFork,
      componentPreview: true
    }]);
    setShowVersionHistory(false);
    setActiveTab('preview');
  };

  const toggleFavorite = (id: string) => {
    const component = components.find(c => c.id === id);
    if (!component) return;
    
    const updatedComponent = { ...component, isFavorite: !component.isFavorite };
    
    setComponents(prev =>
      prev.map(comp =>
        comp.id === id ? updatedComponent : comp
      )
    );
    
    // Save to database
    saveComponentToDb(updatedComponent);
  };

  const deleteComponent = (id: string) => {
    // Delete from database first
    deleteComponentFromDb(id);
    
    setComponents(prev => prev.filter(comp => comp.id !== id));
    
    // If deleting the currently loaded component, reset to welcome message
    if (currentComponent?.id === id) {
      setCurrentComponent(null);
      setChatMessages([{
        id: 'welcome',
        role: 'system',
        content: "👋 Hi! I'm your AI App Builder. Tell me what app you want to create, and I'll build it for you through conversation.\n\n✨ **Intelligent Modification System**:\n• **New apps** → Built from scratch instantly\n• **Small changes** → Surgical edits (only changes what you ask) 🎯\n• **Shows you changes** → Review before applying ✅\n• **Token efficient** → 95% fewer tokens for modifications 💰\n\n🔒 **Smart Protection**:\n• Every change saved to version history\n• One-click undo/redo anytime\n• Never lose your work\n\n💡 **Pro Tip**: For modifications, be specific (\"change button to blue\") instead of vague (\"make it better\").\n\nWhat would you like to build today?",
        timestamp: new Date().toISOString()
      }]);
      setActiveTab('chat');
    }
  };

  const handleExportApp = async (comp: GeneratedComponent) => {
    setExportingApp(comp);
    
    try {
      // Parse the app code to extract files
      const appData = JSON.parse(comp.code);
      const files = parseAppFiles(appData);
      
      // Create the ZIP file
      const zipBlob = await exportAppAsZip({
        appName: comp.name,
        files: files,
      });
      
      // Download the ZIP
      const filename = `${comp.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
      downloadBlob(zipBlob, filename);
      
      // Show deployment instructions
      setDeploymentInstructions(getDeploymentInstructions('vercel', comp.name));
      setShowDeploymentModal(true);
    } catch (error) {
      console.error('Error exporting app:', error);
      alert('Failed to export app. Please try again.');
    } finally {
      setExportingApp(null);
    }
  };

  const loadComponent = (comp: GeneratedComponent) => {
    setCurrentComponent(comp);
    setChatMessages(comp.conversationHistory);
    setShowLibrary(false);
    setActiveTab('preview');
    // Restore phase build plan if the component has one in progress
    const hasPendingPhases = comp.stagePlan?.phases?.some(p => p.status === 'pending') ?? false;
    setNewAppStagePlan(hasPendingPhases ? comp.stagePlan! : null);
  };

  const downloadCode = () => {
    if (!currentComponent) return;
    
    const blob = new Blob([currentComponent.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentComponent.name.replace(/\s+/g, '-')}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // File management functions
  const loadFiles = useCallback(async () => {
    if (!user) {
      setStorageFiles([]);
      return;
    }

    setLoadingFiles(true);
    try {
      const result = await storageService.list('user-uploads', {
        limit: 100,
        offset: 0,
        sortBy: {
          column: fileSortBy,
          order: fileSortOrder
        }
      });

      if (result.success && result.data) {
        setStorageFiles(result.data.items);
        
        // Calculate storage stats
        const totalSize = result.data.items.reduce((sum, file) => sum + file.size, 0);
        const byType: Record<string, { fileCount: number; totalSize: number }> = {};
        
        result.data.items.forEach(file => {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          if (!byType[ext]) {
            byType[ext] = { fileCount: 0, totalSize: 0 };
          }
          byType[ext].fileCount++;
          byType[ext].totalSize += file.size;
        });

        setStorageStats({
          userId: user.id as UserId,
          totalFiles: result.data.items.length,
          totalSize,
          byBucket: {
            'user-uploads': {
              fileCount: result.data.items.length,
              totalSize
            },
            'generated-apps': {
              fileCount: 0,
              totalSize: 0
            },
            'app-assets': {
              fileCount: 0,
              totalSize: 0
            }
          },
          byType,
          quota: 100 * 1024 * 1024, // 100MB limit
          quotaUsagePercent: (totalSize / (100 * 1024 * 1024)) * 100
        });
      } else {
        console.error('Failed to load files:', result.error);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoadingFiles(false);
    }
  }, [user, storageService, fileSortBy, fileSortOrder]);

  const handleFileUpload = async (files: File[]) => {
    if (!user || files.length === 0) return;

    // Track uploading files
    const newUploadingFiles = new Set(uploadingFiles);
    files.forEach(file => newUploadingFiles.add(file.name));
    setUploadingFiles(newUploadingFiles);

    try {
      // Upload files sequentially
      for (const file of files) {
        const result = await storageService.upload('user-uploads', file, {
          maxSize: 10 * 1024 * 1024,
          allowedTypes: [],
          allowedExtensions: []
        });

        if (!result.success) {
          alert(`Failed to upload ${file.name}: ${result.error?.message || 'Unknown error'}`);
        }
      }

      // Reload files after upload
      await loadFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      // Clear uploading state
      setUploadingFiles(new Set());
    }
  };

  const handleFileDelete = async (fileId: FileId) => {
    if (!user) return;

    const file = storageFiles.find(f => f.id === fileId);
    if (!file) return;

    if (!confirm(`Delete "${file.name}"?`)) return;

    // Track deleting file
    setDeletingFiles(prev => new Set([...prev, fileId]));

    try {
      const result = await storageService.delete(file.bucket, fileId);

      if (result.success) {
        // Remove from local state
        setStorageFiles(prev => prev.filter(f => f.id !== fileId));
        // Update stats
        await loadFiles();
      } else {
        alert(`Failed to delete file: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const handleFileDownload = async (file: FileMetadata) => {
    if (!user) return;

    try {
      const result = await storageService.download(file.bucket, file.path);

      if (result.success && result.data) {
        // Create download link
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert(`Failed to download file: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedFiles.size === 0) return;

    if (!confirm(`Delete ${selectedFiles.size} selected files?`)) return;

    const fileIds = Array.from(selectedFiles);
    setDeletingFiles(new Set(fileIds));

    try {
      let successCount = 0;
      let failCount = 0;

      for (const fileId of fileIds) {
        const file = storageFiles.find(f => f.id === fileId);
        if (!file) continue;
        
        const result = await storageService.delete(file.bucket, fileId as FileId);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (failCount > 0) {
        alert(`Deleted ${successCount} files, ${failCount} failed`);
      }

      // Clear selection and reload
      setSelectedFiles(new Set());
      await loadFiles();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('Failed to delete files. Please try again.');
    } finally {
      setDeletingFiles(new Set());
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const filteredComponents = components.filter(comp =>
    searchQuery === '' ||
    comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comp.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter files based on search and filters
  const filteredFiles = storageFiles.filter(file => {
    // Search filter
    if (fileSearchQuery && !file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (fileTypeFilter !== 'all') {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (fileTypeFilter === 'images' && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return false;
      }
      if (fileTypeFilter === 'documents' && !['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
        return false;
      }
    }

    return true;
  });

  // Prevent hydration errors by only rendering after client mount
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
      <header className="border-b border-white/10 glass-panel sticky top-0 z-50 shadow-2xl shadow-black/40 animate-gradient">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-gradient"></div>
        <div className="max-w-7xl mx-auto px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/60 hover:shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-12 active:scale-95">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text bg-animate">AI App Builder</h1>
                <p className="text-xs text-slate-400">Build complete apps through conversation</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Plan App Button - Opens Step Wizard */}
              <button
                onClick={() => setShowConceptWizard(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl hover:shadow-purple-500/40 group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🚀</span>
                <span className="hidden sm:inline">Plan App</span>
              </button>
              {/* Conversational Wizard Button */}
              <button
                onClick={() => setShowConversationalWizard(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl hover:shadow-emerald-500/40 group"
                title="Chat-based app planning wizard"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">🧙‍♂️</span>
                <span className="hidden sm:inline">Wizard</span>
              </button>
              {/* Phased Build Button - Shows when app concept exists */}
              {appConcept && (
                <button
                  onClick={handleStartAdvancedPhasedBuild}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 transition-all duration-300 text-sm text-white font-medium flex items-center gap-2 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl hover:shadow-orange-500/40 group"
                  title="Start advanced phased build"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">🏗️</span>
                  <span className="hidden sm:inline">Phased Build</span>
                </button>
              )}
              {/* Toggle Advanced Phased Build Panel */}
              {buildPhases.isPhasedMode && (
                <button
                  onClick={() => setShowAdvancedPhasedBuild(!showAdvancedPhasedBuild)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium flex items-center gap-2 hover:scale-110 active:scale-95 shadow-lg ${
                    showAdvancedPhasedBuild
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'glass-panel border border-orange-500/30 text-orange-400 hover:text-white hover:border-orange-500/60'
                  }`}
                  title="Toggle phased build panel"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">📊</span>
                  <span className="hidden sm:inline">Phases</span>
                </button>
              )}
              {currentComponent && currentComponent.versions && currentComponent.versions.length > 0 && (
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="px-4 py-2 rounded-lg glass-panel border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-110 active:scale-95 hover:shadow-xl hover:shadow-blue-500/40 hover:border-blue-500/50 group"
                >
                  <span className="group-hover:scale-125 transition-transform duration-300">🕒</span>
                  <span className="hidden sm:inline">History</span>
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
                    {currentComponent.versions.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => {
                  setCurrentComponent(null);
                  setChatMessages([{
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: "👋 Hi! I'm your AI App Builder. Tell me what app you want to create, and I'll build it for you through conversation.\n\n✨ **What would you like to build today?**",
                    timestamp: new Date().toISOString()
                  }]);
                }}
                className="px-4 py-2 rounded-lg glass-panel border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-110 active:scale-95 hover:shadow-xl hover:shadow-green-500/40 hover:border-green-500/50 group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">✨</span>
                <span className="hidden sm:inline">New App</span>
              </button>
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="px-4 py-2 rounded-lg glass-panel border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-110 active:scale-95 hover:shadow-xl hover:shadow-purple-500/40 hover:border-purple-500/50 group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">📂</span>
                <span className="hidden sm:inline">My Apps</span>
                {components.length > 0 && (
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
                    {components.length}
                  </span>
                )}
              </button>
              
              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-lg glass-panel border border-white/20 transition-all duration-300 text-sm text-slate-300 hover:text-white flex items-center gap-2 hover:scale-110 active:scale-95 hover:shadow-xl hover:shadow-slate-500/40 hover:border-slate-500/50 group"
                title="Open Settings"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">⚙️</span>
                <span className="hidden sm:inline">Settings</span>
              </button>
              
              {/* Theme Toggle */}
              <ThemeToggle size="md" showDropdown={true} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-4 py-4 h-[calc(100vh-80px)]">
        {/* Main Content - Resizable Panels */}
        <ResizablePanelGroup 
          direction="horizontal" 
          persistenceKey="ai-builder-layout"
          onLayoutChange={(sizes) => {
            // Optional: track layout changes for analytics
            console.log('Panel layout changed:', sizes);
          }}
          className="h-full"
        >
          {/* Chat/Conversation Panel - Left Side */}
          <ResizablePanel defaultSize={35} minSize={20} maxSize={60}>
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl shadow-black/40">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>💬</span>
                    <span>Conversation</span>
                  </h2>
                  
                  {/* Plan/Act Mode Toggle */}
                  <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setCurrentMode('PLAN')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        currentMode === 'PLAN'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Plan Mode: AI discusses and explains (no code changes)"
                    >
                      💭 Plan
                    </button>
                    <button
                      onClick={() => setCurrentMode('ACT')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        currentMode === 'ACT'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Act Mode: AI can modify code"
                    >
                      ⚡ Act
                    </button>
                  </div>
                </div>
                
                {/* Mode Description */}
                <p className="text-sm text-slate-400">
                  {currentMode === 'PLAN' 
                    ? '💭 Plan Mode: AI will discuss and explain (no code changes)'
                    : '⚡ Act Mode: AI can modify your app'
                  }
                </p>
              </div>

              {/* Chat Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* FIX 4.1: Inline Phase Progress Display */}
                {newAppStagePlan && newAppStagePlan.phases && newAppStagePlan.phases.length > 0 && (
                  <PhaseProgressCard
                    phases={newAppStagePlan.phases}
                    currentPhase={newAppStagePlan.currentPhase - 1}
                    onBuildPhase={(phase) => {
                      // Build the phase when clicked
                      const buildPrompt = `Build ${phase.name}: ${phase.description}. Features to implement: ${phase.features.join(', ')}`;
                      setUserInput(buildPrompt);
                      // Update status to building
                      setNewAppStagePlan(prev => prev ? {
                        ...prev,
                        currentPhase: phase.number,
                        phases: prev.phases.map(p => 
                          p.number === phase.number ? { ...p, status: 'building' as const } : p
                        )
                      } : null);
                    }}
                  />
                )}
                
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                        : message.role === 'system'
                        ? 'glass-panel text-purple-200 border border-purple-500/40 shadow-purple-500/20 hover:shadow-purple-500/40 hover:border-purple-500/60'
                        : 'glass-panel text-slate-200 border border-white/20 hover:border-white/30'
                    }`}
                  >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.componentPreview && (
                        <button
                          onClick={() => setActiveTab('preview')}
                          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                        >
                          👁️ View Component
                        </button>
                      )}
                      <p className="text-xs opacity-50 mt-2" suppressHydrationWarning>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl px-4 py-3 border border-blue-500/30">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">Generating your app...</div>
                          {generationProgress && (
                            <div className="text-xs text-blue-200 mt-1">{generationProgress}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/10 bg-black/20">
                {/* Image Preview */}
                {uploadedImage && (
                  <div className="mb-3 relative inline-block">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded inspiration" 
                      className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                    >
                      ✕
                    </button>
                    <div className="text-xs text-slate-400 mt-1">
                      🎨 AI will use this for design inspiration
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {/* Image Upload Button */}
                  <label
                    className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Upload image for AI-inspired design"
                  >
                    <span className="text-xl">🖼️</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      name="image-upload"
                    />
                  </label>

                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Describe what you want to build or change..."
                    disabled={isGenerating}
                    className="flex-1 px-4 py-3 rounded-xl glass-panel border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/60 disabled:opacity-50 transition-all duration-300 focus:shadow-xl focus:shadow-blue-500/30 focus:scale-[1.01] hover:border-white/30"
                    id="user-message"
                    name="user-message"
                    autoComplete="off"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isGenerating || (!userInput.trim() && !uploadedImage)}
                    data-send-button="true"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 relative overflow-hidden group"
                  >
                    <span className="relative z-10">{isGenerating ? '⏳' : '🚀'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle />

          {/* Preview/Code Panel - Right Side */}
          <ResizablePanel defaultSize={65} minSize={30} maxSize={80}>
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 h-full flex flex-col">
              {/* Tabs */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  👁️ Preview
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'code'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  💻 Code
                </button>

                {currentComponent && (
                  <>
                    {/* Undo/Redo Controls */}
                    <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                      <button
                        onClick={handleUndo}
                        disabled={undoStack.length === 0}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={`Undo${undoStack.length > 0 ? ` (${undoStack.length})` : ''}`}
                      >
                        ↶
                      </button>
                      <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={`Redo${redoStack.length > 0 ? ` (${redoStack.length})` : ''}`}
                      >
                        ↷
                      </button>
                    </div>

                    {/* Fork Button */}
                    <button
                      onClick={() => handleForkApp(currentComponent)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all flex items-center gap-2"
                      title="Fork this app"
                    >
                      <span>🍴</span>
                      <span className="hidden lg:inline">Fork</span>
                    </button>
                  </>
                )}

                <div className="flex-1"></div>

                {currentComponent && (
                  <>
                    <button
                      onClick={() => handleExportApp(currentComponent)}
                      disabled={exportingApp?.id === currentComponent.id}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>{exportingApp?.id === currentComponent.id ? '⏳' : '📦'}</span>
                      <span className="hidden sm:inline">Export & Deploy</span>
                    </button>
                    <button
                      onClick={downloadCode}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-green-500/20 flex items-center gap-2"
                    >
                      <span>📥</span>
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </>
                )}
              </div>

              {/* Preview Content */}
              <div className="flex-1 p-6 overflow-auto">
                {!currentComponent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Start Building Your App
                    </h3>
                    <p className="text-slate-400 max-w-md">
                      Describe what you want to build in the chat, and I'll create a complete app with live preview for you.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeTab === 'preview' && (
                      <div className="h-full">
                        <FullAppPreview appDataJson={currentComponent.code} />
                      </div>
                    )}

                    {activeTab === 'code' && (
                      <div className="h-full min-h-[500px]">
                        <CodePreview code={currentComponent.code} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* App Library Sidebar */}
      {showLibrary && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Library Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📂</span>
                  <span>My Content</span>
                  <span className="text-sm font-normal text-slate-400">
                    ({contentTab === 'apps' ? components.length : storageFiles.length})
                  </span>
                </h2>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  <span className="text-slate-400 text-xl">✕</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setContentTab('apps')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    contentTab === 'apps'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  🚀 Apps ({components.length})
                </button>
                <button
                  onClick={() => setContentTab('files')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    contentTab === 'files'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  📁 Files ({storageFiles.length})
                </button>
              </div>

              {/* Search */}
              {contentTab === 'apps' ? (
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  id="app-search"
                  name="app-search"
                  autoComplete="off"
                />
              ) : (
                <FileFilters
                  searchQuery={fileSearchQuery}
                  onSearchChange={setFileSearchQuery}
                  selectedType={fileTypeFilter}
                  onTypeChange={setFileTypeFilter}
                  sortBy={fileSortBy}
                  sortOrder={fileSortOrder}
                  onSortChange={(newSortBy, newSortOrder) => {
                    setFileSortBy(newSortBy);
                    setFileSortOrder(newSortOrder);
                  }}
                  onClearFilters={() => {
                    setFileSearchQuery('');
                    setFileTypeFilter('all');
                    setFileSortBy('created_at');
                    setFileSortOrder('desc');
                  }}
                />
              )}
            </div>

            {/* Library Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {contentTab === 'apps' ? (
                // Apps Tab Content
                filteredComponents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-slate-400">
                    {searchQuery ? 'No components found' : 'No components yet. Start building!'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredComponents.map((comp) => (
                    <div
                      key={comp.id}
                      className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all cursor-pointer group"
                      onClick={() => loadComponent(comp)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {comp.name}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(comp.id);
                            }}
                            className="text-xl hover:scale-125 transition-transform"
                          >
                            {comp.isFavorite ? '⭐' : '☆'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportApp(comp);
                            }}
                            className="text-lg hover:scale-125 transition-transform text-green-400 hover:text-green-300"
                            title="Export & Deploy"
                            disabled={exportingApp?.id === comp.id}
                          >
                            {exportingApp?.id === comp.id ? '⏳' : '📦'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${comp.name}"?`)) {
                                deleteComponent(comp.id);
                              }
                            }}
                            className="text-lg hover:scale-125 transition-transform text-red-400 hover:text-red-300"
                            title="Delete app"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {comp.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{new Date(comp.timestamp).toLocaleDateString()}</span>
                        <span className="text-blue-400">→ Load</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
              ) : (
                // Files Tab Content
                <>
                  {!user ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="text-6xl mb-4">🔒</div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Sign In Required
                      </h3>
                      <p className="text-slate-400 text-center max-w-md">
                        Please sign in to access file storage
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* File Uploader */}
                      <FileUploader
                        onUpload={handleFileUpload}
                        maxFileSize={10 * 1024 * 1024}
                        allowedTypes={[]}
                        allowedExtensions={[]}
                        disabled={!user}
                      />

                      {/* Storage Stats */}
                      {storageStats && (
                        <StorageStats stats={storageStats} />
                      )}

                      {/* File Grid */}
                      <FileGrid
                        files={filteredFiles}
                        selectedFiles={selectedFiles}
                        onSelectFile={(file) => handleFileSelect(file.id)}
                        onDownload={handleFileDownload}
                        onDelete={(file) => handleFileDelete(file.id as FileId)}
                        loadingFileIds={deletingFiles}
                        isLoading={loadingFiles}
                      />

                      {/* Bulk Actions */}
                      {selectedFiles.size > 0 && (
                        <div className="fixed bottom-6 right-6 bg-slate-800 rounded-xl border border-white/20 shadow-2xl p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-white text-sm">
                              {selectedFiles.size} selected
                            </span>
                            <button
                              onClick={handleBulkDelete}
                              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all"
                            >
                              🗑️ Delete Selected
                            </button>
                            <button
                              onClick={() => setSelectedFiles(new Set())}
                              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
                            >
                              Clear Selection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Approval Modal */}
      {showApprovalModal && pendingChange && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => {}}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-yellow-500/30 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Approve Changes?</h3>
                  <p className="text-sm text-yellow-200/80">Review the proposed modifications to your app</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5">
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  What's changing:
                </label>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                  <p className="text-white text-sm leading-relaxed">
                    {pendingChange.changeDescription}
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm font-medium text-blue-200 mb-1">
                      Why approval is needed
                    </p>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                      This change will modify your existing app. Approving ensures you won't accidentally lose features you like. 
                      You can reject this change and request something different instead.
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview of files being changed */}
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Files affected:
                </label>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/10 max-h-32 overflow-y-auto">
                  {(() => {
                    try {
                      const parsedData = JSON.parse(pendingChange.newCode);
                      return (
                        <div className="space-y-1">
                          {parsedData.files?.map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                              <span className="text-blue-400">📄</span>
                              <span>{file.path}</span>
                            </div>
                          ))}
                        </div>
                      );
                    } catch {
                      return <p className="text-xs text-slate-400">Unable to parse file list</p>;
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex gap-3">
              <button
                onClick={rejectChange}
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
              >
                ❌ Reject Changes
              </button>
              <button
                onClick={approveChange}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg"
              >
                ✅ Approve & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && currentComponent && currentComponent.versions && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowVersionHistory(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-blue-500/30 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-blue-500/30 bg-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-3xl">🕒</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Version History</h3>
                    <p className="text-sm text-blue-200/80">{currentComponent.name} - {currentComponent.versions.length} versions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  <span className="text-slate-400 text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Version List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {[...currentComponent.versions].reverse().map((version, idx) => {
                  const isCurrentVersion = idx === 0;
                  const changeTypeColors = {
                    NEW_APP: 'bg-purple-500/20 border-purple-500/30 text-purple-200',
                    MAJOR_CHANGE: 'bg-orange-500/20 border-orange-500/30 text-orange-200',
                    MINOR_CHANGE: 'bg-green-500/20 border-green-500/30 text-green-200'
                  };
                  const changeTypeIcons = {
                    NEW_APP: '🚀',
                    MAJOR_CHANGE: '⚡',
                    MINOR_CHANGE: '✨'
                  };
                  
                  return (
                    <div
                      key={version.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentVersion
                          ? 'bg-blue-500/20 border-blue-500/40'
                          : 'bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {isCurrentVersion ? '📍' : '📌'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-white font-semibold">
                                Version {version.versionNumber}
                              </h4>
                              {isCurrentVersion && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                                  Current
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${changeTypeColors[version.changeType]}`}>
                                {changeTypeIcons[version.changeType]} {version.changeType.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {new Date(version.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {!isCurrentVersion && (
                            <>
                              <button
                                onClick={() => handleForkApp(currentComponent, version)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
                                title="Fork this version"
                              >
                                🍴 Fork
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Revert to Version ${version.versionNumber}? Your current version will be saved.`)) {
                                    revertToVersion(version);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
                              >
                                🔄 Revert
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-300 leading-relaxed mb-3">
                        {version.description}
                      </p>
                      
                      {/* Compare button */}
                      {!isCurrentVersion && currentComponent.versions && currentComponent.versions.length > 1 && (
                        <button
                          onClick={() => {
                            const currentVer = currentComponent.versions?.find(v => 
                              v.versionNumber === Math.max(...(currentComponent.versions?.map(v => v.versionNumber) || []))
                            );
                            if (currentVer) {
                              handleCompareVersions(version, currentVer);
                            }
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          🔍 Compare with current
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>💡</span>
                <p>
                  Click "Revert" to restore a previous version. Your current version will be preserved in history.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Instructions Modal */}
      {showDeploymentModal && deploymentInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-green-500/20 to-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📦</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">App Exported Successfully!</h2>
                    <p className="text-sm text-slate-300 mt-1">Ready to deploy to production</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeploymentModal(false);
                    setDeploymentInstructions(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h3 className="text-white font-semibold mb-1">Download Started</h3>
                      <p className="text-sm text-slate-300">
                        Your app has been packaged as a ZIP file with all necessary files, including package.json, configuration files, and a README with deployment instructions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deployment Options */}
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <span>🚀</span> Deployment Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setDeploymentInstructions(getDeploymentInstructions('vercel', exportingApp?.name || 'app'))}
                      className={`p-4 rounded-xl border transition-all ${
                        deploymentInstructions.platform === 'vercel'
                          ? 'bg-black/40 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">▲</div>
                      <div className="text-white font-medium">Vercel</div>
                      <div className="text-xs text-slate-400 mt-1">Recommended</div>
                    </button>
                    <button
                      onClick={() => setDeploymentInstructions(getDeploymentInstructions('netlify', exportingApp?.name || 'app'))}
                      className={`p-4 rounded-xl border transition-all ${
                        deploymentInstructions.platform === 'netlify'
                          ? 'bg-black/40 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">◆</div>
                      <div className="text-white font-medium">Netlify</div>
                      <div className="text-xs text-slate-400 mt-1">Easy Deploy</div>
                    </button>
                    <button
                      onClick={() => setDeploymentInstructions(getDeploymentInstructions('github', exportingApp?.name || 'app'))}
                      className={`p-4 rounded-xl border transition-all ${
                        deploymentInstructions.platform === 'github'
                          ? 'bg-black/40 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">🐙</div>
                      <div className="text-white font-medium">GitHub</div>
                      <div className="text-xs text-slate-400 mt-1">Version Control</div>
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span>📋</span> Deployment Steps
                  </h3>
                  <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                    <ol className="space-y-3">
                      {deploymentInstructions.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs text-blue-400 font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm text-slate-300 leading-relaxed pt-0.5">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>

                    {deploymentInstructions.cliCommand && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Quick Deploy Command:</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(deploymentInstructions.cliCommand || '');
                              alert('Command copied to clipboard!');
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Copy
                          </button>
                        </div>
                        <code className="block px-3 py-2 rounded-lg bg-black/40 text-green-400 text-sm font-mono">
                          {deploymentInstructions.cliCommand}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Resources */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div className="text-sm text-slate-300">
                      <p className="font-semibold text-white mb-1">Tip:</p>
                      <p>
                        For the best experience, we recommend deploying to Vercel. It's optimized for Next.js apps and provides automatic deployments, preview URLs, and zero-config setup.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>📦</span>
                <span>Check your downloads folder for the ZIP file</span>
              </div>
              <button
                onClick={() => {
                  setShowDeploymentModal(false);
                  setDeploymentInstructions(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Preview Modal */}
      {showDiffPreview && pendingDiff && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => {}}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-blue-500/30 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-blue-500/30 bg-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Review Changes</h3>
                    <p className="text-sm text-blue-200/80">Smart targeted modifications</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPendingDiff(null);
                    setShowDiffPreview(false);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  <span className="text-slate-400 text-xl">✕</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <DiffPreview
                summary={pendingDiff.summary}
                files={pendingDiff.files}
                onApprove={approveDiff}
                onReject={rejectDiff}
              />
            </div>
          </div>
        </div>
      )}

      {/* New App Staging Consent Modal */}
      {showNewAppStagingModal && pendingNewAppRequest && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => {}}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-purple-500/30 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal hHeader */}
            <div className="px-6 py-5 border-b border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-3xl">🏗️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Build in Phases?</h3>
                  <p className="text-sm text-purple-200/80">Large app detected - suggested phased approach</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5">
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Your request:
                </label>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                  <p className="text-white text-sm leading-relaxed">
                    "{pendingNewAppRequest}"
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm font-medium text-blue-200 mb-2">
                      Why Build in Phases?
                    </p>
                    <ul className="text-xs text-blue-200/70 leading-relaxed space-y-1.5">
                      <li>✅ Each phase gets fully working code you can test</li>
                      <li>✅ See progress step-by-step with live previews</li>
                      <li>✅ Guide the direction after each phase</li>
                      <li>✅ Avoids overwhelming single-build approach</li>
                      <li>✅ Better quality - each piece is refined before moving on</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm font-medium text-purple-200 mb-2">
                      How It Works
                    </p>
                    <ol className="text-xs text-purple-200/70 leading-relaxed space-y-1.5">
                      <li>1. I'll analyze and break your request into 2-4 logical phases</li>
                      <li>2. Build Phase 1 (foundation + core features)</li>
                      <li>3. You review, test, and approve before Phase 2</li>
                      <li>4. Repeat until your complete app is ready</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="text-sm font-medium text-green-200 mb-1">
                      Or Build All at Once?
                    </p>
                    <p className="text-xs text-green-200/70 leading-relaxed">
                      I can also generate everything in one go. This is faster but gives you less control over the direction, and the result might need more refinement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex gap-3">
              <button
                onClick={() => {
                  // User wants all-at-once build
                  setShowNewAppStagingModal(false);
                  setPendingNewAppRequest('');
                  // Continue with normal single build by resetting the input and letting sendMessage() proceed
                  setUserInput(pendingNewAppRequest);
                  // Don't call sendMessage here - let user click send button
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
              >
                ⚡ Build All at Once
              </button>
              <button
                onClick={async () => {
                  // User wants phased build - call plan-phases API
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

                    // Store the phase plan
                    setNewAppStagePlan(data);

                    // Show phase plan to user
                    const phasePlanMessage: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: `🏗️ **${data.totalPhases}-Phase Build Plan Created**\n\n${data.phases.map((p: any) => 
                        `**Phase ${p.number}: ${p.name}**\n${p.description}\n${p.features.map((f: string) => `  • ${f}`).join('\n')}`
                      ).join('\n\n')}\n\n**Ready to start?** I'll begin with Phase 1. You can review and approve each phase before moving to the next.\n\nType **'start'** or **'begin'** to build Phase 1!`,
                      timestamp: new Date().toISOString()
                    };

                    setChatMessages(prev => [...prev, phasePlanMessage]);
                  } catch (error) {
                    const errorMessage: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: `❌ Failed to create phase plan: ${error instanceof Error ? error.message : 'Unknown error'}. Let's try building all at once instead.`,
                      timestamp: new Date().toISOString()
                    };
                    setChatMessages(prev => [...prev, errorMessage]);
                  } finally {
                    setIsGenerating(false);
                    setPendingNewAppRequest('');
                  }
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium transition-all shadow-lg"
              >
                🏗️ Build in Phases (Recommended)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Versions Modal */}
      {showCompareModal && compareVersions.v1 && compareVersions.v2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔍</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Compare Versions</h2>
                    <p className="text-sm text-slate-300 mt-1">
                      Version {compareVersions.v1.versionNumber} vs Version {compareVersions.v2.versionNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCompareModal(false);
                    setCompareVersions({ v1: null, v2: null });
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6">
                {/* Version 1 */}
                <div className="space-y-3">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📌</span>
                      <div>
                        <h3 className="text-white font-semibold">Version {compareVersions.v1.versionNumber}</h3>
                        <p className="text-xs text-slate-400">
                          {new Date(compareVersions.v1.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{compareVersions.v1.description}</p>
                  </div>
                  
                  <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">Code Preview</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(compareVersions.v1?.code || '');
                          alert('Code copied to clipboard!');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-[400px] p-3 bg-black/40 rounded-lg">
                      <code>{compareVersions.v1.code.substring(0, 1000)}...</code>
                    </pre>
                  </div>
                </div>

                {/* Version 2 */}
                <div className="space-y-3">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📍</span>
                      <div>
                        <h3 className="text-white font-semibold">Version {compareVersions.v2.versionNumber}</h3>
                        <p className="text-xs text-slate-400">
                          {new Date(compareVersions.v2.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{compareVersions.v2.description}</p>
                  </div>
                  
                  <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">Code Preview</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(compareVersions.v2?.code || '');
                          alert('Code copied to clipboard!');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-[400px] p-3 bg-black/40 rounded-lg">
                      <code>{compareVersions.v2.code.substring(0, 1000)}...</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span>⚡</span> Quick Actions
                </h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm(`Revert to Version ${compareVersions.v1?.versionNumber}?`)) {
                        if (compareVersions.v1) revertToVersion(compareVersions.v1);
                        setShowCompareModal(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
                  >
                    🔄 Revert to Version {compareVersions.v1.versionNumber}
                  </button>
                  <button
                    onClick={() => {
                      if (compareVersions.v1 && currentComponent) {
                        handleForkApp(currentComponent, compareVersions.v1);
                        setShowCompareModal(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-all"
                  >
                    🍴 Fork Version {compareVersions.v1.versionNumber}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>💡</span>
                <span>Compare code changes between versions</span>
              </div>
              <button
                onClick={() => {
                  setShowCompareModal(false);
                  setCompareVersions({ v1: null, v2: null });
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Concept Wizard Modal */}
      {showConceptWizard && (
        <AppConceptWizard
          onComplete={handleConceptComplete}
          onCancel={() => setShowConceptWizard(false)}
        />
      )}

      {/* Conversational App Wizard Modal */}
      {showConversationalWizard && (
        <ConversationalAppWizard
          onComplete={handleConceptComplete}
          onCancel={() => setShowConversationalWizard(false)}
        />
      )}

      {/* Settings Page Modal */}
      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Advanced Phased Build Panel */}
      {showAdvancedPhasedBuild && buildPhases.isPhasedMode && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20"
          onClick={() => setShowAdvancedPhasedBuild(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <span className="text-2xl">🏗️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Phase-Driven Build</h2>
                    <p className="text-sm text-slate-400">
                      {buildPhases.progress.percentComplete}% complete • {buildPhases.progress.estimatedTimeRemaining} remaining
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAdvancedPhasedBuild(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  <span className="text-slate-400 text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Phase Progress Indicator */}
              <PhaseProgressIndicator
                phases={buildPhases.phases}
                progress={buildPhases.progress}
                onPhaseClick={handleViewPhaseDetails}
              />

              {/* Control Panel and Validation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phase Control Panel */}
                <PhaseControlPanel
                  phases={buildPhases.phases}
                  progress={buildPhases.progress}
                  isBuilding={buildPhases.isBuilding}
                  isPaused={buildPhases.isPaused}
                  onStartBuild={handleStartAdvancedPhasedBuild}
                  onPauseBuild={buildPhases.pauseBuild}
                  onResumeBuild={buildPhases.resumeBuild}
                  onSkipPhase={(phaseId) => {
                    if (buildPhases.currentPhase?.id === phaseId) {
                      buildPhases.skipCurrentPhase();
                    }
                  }}
                  onRetryPhase={(phaseId) => {
                    if (buildPhases.currentPhase?.id === phaseId) {
                      buildPhases.retryCurrentPhase();
                    }
                  }}
                  onViewPhaseDetails={handleViewPhaseDetails}
                />

                {/* Validation Dashboard */}
                {buildPhases.currentPhase && (
                  <ValidationDashboard
                    phase={buildPhases.currentPhase}
                    onRunValidation={handleRunValidation}
                    onProceedAnyway={buildPhases.proceedToNextPhase}
                    onRetryPhase={buildPhases.retryCurrentPhase}
                    isValidating={isValidating}
                  />
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>💡</span>
                <span>Each phase focuses on specific aspects of your app for better quality.</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    buildPhases.resetBuild();
                    setShowAdvancedPhasedBuild(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
                >
                  Reset Build
                </button>
                {buildPhases.currentPhase && buildPhases.currentPhase.status === 'pending' && (
                  <button
                    onClick={async () => {
                      await buildPhases.executeCurrentPhase();
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium transition-all"
                  >
                    Build Current Phase
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Detail View Modal */}
      {selectedPhaseId && (
        <PhaseDetailView
          phase={buildPhases.getPhaseById(selectedPhaseId)!}
          isOpen={!!selectedPhaseId}
          onClose={() => setSelectedPhaseId(null)}
          onBuildPhase={async () => {
            await buildPhases.executeCurrentPhase();
            setSelectedPhaseId(null);
          }}
          onSkipPhase={async () => {
            await buildPhases.skipCurrentPhase();
            setSelectedPhaseId(null);
          }}
          onRetryPhase={async () => {
            await buildPhases.retryCurrentPhase();
            setSelectedPhaseId(null);
          }}
          generatedCode={buildPhases.accumulatedCode}
        />
      )}
    </div>
    </ToastProvider>
  );
}
