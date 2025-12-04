'use client';

/**
 * LayoutBuilderWizard Component
 *
 * A modal-based layout builder with conversational AI that can "see" the layout
 * through screenshots and provide visual design feedback.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLayoutBuilder } from '@/hooks/useLayoutBuilder';
import { LayoutPreview } from '@/components/LayoutPreview';
import type { LayoutMessage, SuggestedAction, DesignChange } from '@/types/layoutDesign';
import type { UIPreferences } from '@/types/appConcept';

// ============================================================================
// TYPES
// ============================================================================

interface LayoutBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToAppConcept?: () => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Message bubble component
 */
function MessageBubble({ message }: { message: LayoutMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
        }`}
      >
        {/* Show selected element indicator if present */}
        {message.selectedElement && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Selected:</span>
            <span className="font-medium">{message.selectedElement}</span>
          </div>
        )}

        {/* Show attached snapshot indicator */}
        {message.previewSnapshot && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Attached preview snapshot</span>
          </div>
        )}

        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

/**
 * Suggested actions bar
 */
function SuggestedActionsBar({
  actions,
  onAction,
}: {
  actions: SuggestedAction[];
  onAction: (action: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-700">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.action)}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Recent changes indicator
 */
function RecentChangesIndicator({ changes }: { changes: DesignChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/20">
      <div className="text-xs text-green-400 font-medium mb-1">Recent Changes:</div>
      <div className="space-y-1">
        {changes.slice(0, 3).map((change, i) => (
          <div key={i} className="text-xs text-green-300/80">
            {change.property}: {String(change.oldValue)} → {String(change.newValue)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reference images panel
 */
function ReferenceImagesPanel({
  images,
  onRemove,
  onAdd,
}: {
  images: string[];
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onAdd();
      // This will trigger addReferenceImage in parent
    };
    reader.readAsDataURL(file);
  };

  if (images.length === 0) {
    return (
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors text-sm"
      >
        + Add design inspiration
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 font-medium">Reference Images</div>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative group">
            <img
              src={img}
              alt={`Reference ${i + 1}`}
              className="w-16 h-16 object-cover rounded-lg border border-slate-600"
            />
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 border-2 border-dashed border-slate-600 rounded-lg text-slate-500 hover:border-slate-500 hover:text-slate-400 transition-colors text-2xl flex items-center justify-center"
        >
          +
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </button>
      </div>
    </div>
  );
}

/**
 * Chat input component
 */
function ChatInput({
  onSend,
  onCapture,
  isLoading,
  hasSelection,
}: {
  onSend: (text: string, includeCapture: boolean) => void;
  onCapture: () => void;
  isLoading: boolean;
  hasSelection: boolean;
}) {
  const [input, setInput] = useState('');
  const [includeCapture, setIncludeCapture] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || includeCapture) {
      onSend(input, includeCapture);
      setInput('');
      setIncludeCapture(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-700 p-4">
      {/* Capture toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setIncludeCapture(!includeCapture)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            includeCapture
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {includeCapture ? 'Attached' : 'Attach Preview'}
        </button>

        <button
          type="button"
          onClick={onCapture}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition-colors"
        >
          Capture Now
        </button>

        {hasSelection && (
          <span className="text-xs text-blue-400 ml-auto">
            Element selected - AI will see it highlighted
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you'd like to change..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !includeCapture)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LayoutBuilderWizard({
  isOpen,
  onClose,
  onApplyToAppConcept,
}: LayoutBuilderWizardProps) {
  const {
    messages,
    design,
    isLoading,
    selectedElement,
    referenceImages,
    suggestedActions,
    recentChanges,
    sendMessage,
    setSelectedElement,
    addReferenceImage,
    removeReferenceImage,
    capturePreview,
    updateDesign,
    saveDesign,
    applyToAppConcept,
    hasUnsavedChanges,
  } = useLayoutBuilder();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build UIPreferences from design for LayoutPreview
  const previewPreferences: UIPreferences = {
    style: design.basePreferences?.style || 'modern',
    colorScheme: design.basePreferences?.colorScheme || 'dark',
    layout: design.basePreferences?.layout || 'single-page',
    primaryColor: design.globalStyles?.colors?.primary || '#3B82F6',
  };

  // Handle suggested action clicks
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'capture_preview':
          capturePreview();
          break;
        case 'upload_reference':
          fileInputRef.current?.click();
          break;
        case 'toggle_theme':
          updateDesign({
            basePreferences: {
              ...design.basePreferences,
              colorScheme: design.basePreferences?.colorScheme === 'dark' ? 'light' : 'dark',
            } as typeof design.basePreferences,
          });
          break;
        case 'save_design':
          saveDesign();
          break;
        case 'apply_to_concept':
          applyToAppConcept();
          onApplyToAppConcept?.();
          break;
      }
    },
    [
      capturePreview,
      updateDesign,
      design.basePreferences,
      saveDesign,
      applyToAppConcept,
      onApplyToAppConcept,
    ]
  );

  // Handle reference image upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        addReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Reset input
      e.target.value = '';
    },
    [addReferenceImage]
  );

  // Handle preference changes from preview
  const handlePreferenceChange = useCallback(
    (prefs: Partial<UIPreferences>) => {
      updateDesign({
        basePreferences: {
          ...design.basePreferences,
          style: prefs.style || design.basePreferences?.style,
          colorScheme: prefs.colorScheme || design.basePreferences?.colorScheme,
          layout: prefs.layout || design.basePreferences?.layout,
        } as typeof design.basePreferences,
        globalStyles: {
          ...design.globalStyles,
          colors: {
            ...design.globalStyles?.colors,
            primary: prefs.primaryColor || design.globalStyles?.colors?.primary,
          },
        } as typeof design.globalStyles,
      });
    },
    [design, updateDesign]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] max-w-[1600px] bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Layout Builder</h2>
            {hasUnsavedChanges && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                saveDesign();
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Save Design
            </button>
            <button
              onClick={() => {
                applyToAppConcept();
                onApplyToAppConcept?.();
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
            >
              Apply to App Concept
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat panel (left) */}
          <div className="w-1/2 flex flex-col border-r border-slate-700">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-slate-700 rounded-2xl px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Recent changes */}
            <RecentChangesIndicator changes={recentChanges} />

            {/* Suggested actions */}
            <SuggestedActionsBar actions={suggestedActions} onAction={handleAction} />

            {/* Reference images */}
            <div className="px-4 py-3 border-t border-slate-700">
              <ReferenceImagesPanel
                images={referenceImages}
                onRemove={removeReferenceImage}
                onAdd={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onCapture={capturePreview}
              isLoading={isLoading}
              hasSelection={!!selectedElement}
            />
          </div>

          {/* Preview panel (right) */}
          <div className="w-1/2 flex flex-col bg-slate-950">
            {/* Selected element indicator */}
            {selectedElement && (
              <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 flex items-center justify-between">
                <span className="text-sm text-blue-300">
                  Selected: <strong>{selectedElement}</strong>
                </span>
                <button
                  onClick={() => setSelectedElement(null)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Layout Preview */}
            <div className="flex-1 p-4" id="layout-preview-container">
              <div id="layout-preview-frame" className="h-full">
                <LayoutPreview
                  preferences={previewPreferences}
                  className="h-full"
                  onPreferenceChange={handlePreferenceChange}
                  onElementSelect={setSelectedElement}
                  selectedElement={selectedElement}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutBuilderWizard;
