'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';

// --- GEMINI 3 IMPORTS ---
import { Engine } from '@/components/Engine';
import { ArchitectService } from '@/services/ArchitectService';
import { BuilderService } from '@/services/BuilderService';
import { LayoutManifest, UISpecNode } from '@/types/schema';
import { AppConcept } from '@/types/appConcept';
import { useGeminiLayoutState, categorizeError } from '@/hooks/useGeminiLayoutState';
import { LayoutMessage } from '@/types/layoutDesign';

// --- UI COMPONENTS ---
import { ChatInput } from '@/components/layout-builder';

interface LayoutBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  appConcept?: AppConcept | null; // Optional - can generate layouts from just an image
}

export function LayoutBuilderWizard({
  isOpen,
  onClose,
  appConcept,
}: LayoutBuilderWizardProps) {
  // --- STATE: THE TRUTH ---
  const [manifest, setManifest] = useState<LayoutManifest | null>(null);
  const [messages, setMessages] = useState<LayoutMessage[]>([]);

  // --- STATE: SELECTION & VIBE ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeMetaphor, setActiveMetaphor] = useState<string>('Clean Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');

  // --- STATE: FILE UPLOAD ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // --- SERVICES (API keys handled server-side) ---
  const architect = React.useMemo(() => new ArchitectService(), []);
  const builder = React.useMemo(() => new BuilderService(), []);
  const { success, error } = useToast();

  // --- UX FEATURES: Undo/Redo, Draft Recovery, Auto-Save ---
  const {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    hasDraftToRecover,
    recoverDraft,
    discardDraft,
    enableAutoSave,
    clearAutoSave,
  } = useGeminiLayoutState({
    onDraftRecovered: (draft) => {
      // Show toast notification
      success('Draft recovered! Click "Recover" to restore your work.');
    },
  });

  // --- UNDO/REDO HANDLERS ---
  const handleUndo = useCallback(() => {
    const previousManifest = undo();
    if (previousManifest) {
      setManifest(previousManifest);
      success('Undone');
    }
  }, [undo, success]);

  const handleRedo = useCallback(() => {
    const nextManifest = redo();
    if (nextManifest) {
      setManifest(nextManifest);
      success('Redone');
    }
  }, [redo, success]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      }
      // Ctrl+Y or Cmd+Shift+Z (Mac)
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, canUndo, canRedo, handleUndo, handleRedo]);

  // --- AUTO-SAVE INTEGRATION ---
  useEffect(() => {
    if (manifest || messages.length > 0) {
      enableAutoSave(manifest, messages);
    }
  }, [manifest, messages, enableAutoSave]);

  // --- DRAFT RECOVERY HANDLER ---
  const handleRecoverDraft = useCallback(() => {
    const draft = recoverDraft();
    if (draft) {
      setManifest(draft.manifest);
      setMessages(draft.messages);
      if (draft.manifest) {
        addToHistory(draft.manifest);
      }
      success('Draft recovered successfully!');
    }
  }, [recoverDraft, addToHistory, success]);

  // --- FILE UPLOAD HANDLER ---
  const handleFileSelect = useCallback((file: File | null) => {
    setUploadedFile(file);
  }, []);

  // --- INITIALIZATION (The "Architect" Phase) ---
  const handleInitialGeneration = async (prompt: string, videoFile?: File) => {
    setIsGenerating(true);
    setLoadingStage('Architecting Structure...');

    try {
      // 1. Architect creates the Structure (Deep Think)
      const newManifest = await architect.generateLayoutManifest(appConcept, prompt, videoFile);

      setLoadingStage('Applying Base Vibe...');

      // 2. Builder applies the initial style (Flash UI)
      const styledResult = await builder.applyVibe(newManifest, activeMetaphor);

      setManifest(styledResult.manifest);
      addToHistory(styledResult.manifest); // Add to undo history
      setActiveMetaphor(styledResult.metaphor);
      success('Layout generated successfully!');
    } catch (err: any) {
      const errorInfo = categorizeError(err);
      error(errorInfo.message);
    } finally {
      setIsGenerating(false);
      setLoadingStage('');
    }
  };

  // --- THE VIBE CODING LOOP (The "Refine" Workflow) ---
  const handleChatInput = async (message: string) => {
    if (!manifest) {
      // If no layout exists, this message starts the generation
      await handleInitialGeneration(message, uploadedFile || undefined);
      // Clear the uploaded file after generation
      setUploadedFile(null);
      return;
    }

    setIsGenerating(true);

    try {
      if (selectedNodeId) {
        // --- LOCAL REFINEMENT (SCULPTING) ---
        setLoadingStage('Refining Element...');

        const nodeToUpdate = findNodeById(manifest.root, selectedNodeId);
        if (nodeToUpdate) {
          const updatedNode = await builder.refineElement(nodeToUpdate, message, activeMetaphor);
          const newRoot = updateNodeInTree(manifest.root, updatedNode);
          const updatedManifest = { ...manifest, root: newRoot };
          setManifest(updatedManifest);
          addToHistory(updatedManifest); // Add to undo history
          success('Element updated.');
        }
      } else {
        // --- GLOBAL REFINEMENT ---
        setLoadingStage('Applying New Vibe...');
        const result = await builder.applyVibe(manifest, message);
        setManifest(result.manifest);
        addToHistory(result.manifest); // Add to undo history
        setActiveMetaphor(result.metaphor);
        success('Global vibe applied.');
      }
    } catch (err: any) {
      const errorInfo = categorizeError(err);
      error(errorInfo.message);
    } finally {
      setIsGenerating(false);
      setLoadingStage('');
    }
  };

  // --- HELPERS ---

  // Recursively find a node
  const findNodeById = (node: UISpecNode, id: string): UISpecNode | null => {
    if (node.id === id) return node;
    if (!node.children) return null;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  // Recursively update a node (Immutably)
  const updateNodeInTree = (root: UISpecNode, updated: UISpecNode): UISpecNode => {
    if (root.id === updated.id) return updated;
    if (!root.children) return root;
    return {
      ...root,
      children: root.children.map((c) => updateNodeInTree(c, updated)),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-slate-900 rounded-2xl flex overflow-hidden border border-white/10">
        {/* Draft Recovery Banner */}
        {hasDraftToRecover && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">Draft found! Your previous work was auto-saved.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRecoverDraft}
                className="px-3 py-1 bg-white text-amber-700 rounded text-sm font-medium hover:bg-amber-50"
              >
                Recover
              </button>
              <button
                onClick={discardDraft}
                className="px-3 py-1 bg-amber-700 text-white rounded text-sm font-medium hover:bg-amber-800"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* --- LEFT: CHAT & TOOLS --- */}
        <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-950">
          {/* Header */}
          <div className={`p-4 border-b border-white/10 ${hasDraftToRecover ? 'mt-12' : ''}`}>
            <h2 className="text-xl font-bold text-white">Gemini Canvas</h2>
            <p className="text-xs text-slate-400">
              {manifest ? 'Interactive Mode' : 'Creation Mode'}
            </p>
          </div>

          {/* Messages Area (Simplified for Canvas) */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!manifest && (
              <div className="text-slate-400 text-center mt-20">
                <p className="mb-2">Describe your layout or upload a video.</p>
                <p className="text-xs opacity-50">"Create a dashboard for mechanic shops..."</p>
              </div>
            )}
            {/* History could go here */}
          </div>

          {/* Context Status */}
          {selectedNodeId && (
            <div className="px-4 py-2 bg-indigo-900/30 border-t border-indigo-500/30 flex justify-between items-center">
              <span className="text-xs text-indigo-300">
                Selected:{' '}
                <span className="font-mono">
                  {findNodeById(manifest!.root, selectedNodeId)?.semanticTag}
                </span>
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-xs text-indigo-400 hover:text-white"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
            <ChatInput
              onSend={(message) => handleChatInput(message)}
              onCapture={() => {}}
              isLoading={isGenerating}
              isCapturing={false}
              hasSelection={!!selectedNodeId}
              onFileSelect={handleFileSelect}
              selectedFile={uploadedFile}
            />
          </div>
        </div>

        {/* --- RIGHT: THE CANVAS (ENGINE) --- */}
        <div className={`w-2/3 bg-black relative flex flex-col ${hasDraftToRecover ? 'mt-12' : ''}`}>
          {/* Toolbar */}
          <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-slate-900">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-500">Active Metaphor:</span>
              <span className="text-xs text-white font-medium">{activeMetaphor}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Undo/Redo Buttons */}
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>

              <div className="w-px h-6 bg-white/10 mx-1"></div>

              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>
          </div>

          {/* The Render Area */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-dots-pattern">
            {isGenerating && !manifest ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white text-sm">{loadingStage}</p>
              </div>
            ) : manifest ? (
              <div className="w-full max-w-6xl min-h-[800px] bg-background shadow-2xl rounded-xl overflow-hidden relative transition-all duration-300">
                {/* THE ENGINE INSTANCE */}
                <Engine
                  node={manifest.root}
                  definitions={manifest.definitions}
                  onSelect={(id) => setSelectedNodeId(id)}
                />

                {/* Loading Overlay for Vibe Coding */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-900 border border-white/10 px-6 py-4 rounded-xl shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-white">{loadingStage}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
