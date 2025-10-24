"use client";

import React, { useState, useEffect } from 'react';
import CodePreview from './CodePreview';
import ComponentPreview from './ComponentPreview';
// Optimized layout for better screen space utilization

interface AIBuilderState {
  requirements: {
    description: string;
    components: string[];
    features: string[];
    userStories?: string[];
    technicalRequirements?: string[];
    constraints?: string[];
    successCriteria?: string[];
  };
  architecture: {
    fileStructure: string[];
    dependencies: string[];
    componentHierarchy?: {
      name: string;
      children: string[];
      props: string[];
    }[];
    dataFlow?: string[];
    stateManagement?: string;
    designPatterns?: string[];
  };
  code: {
    component: string;
    explanation?: string[];
    bestPractices?: string[];
    optimizations?: string[];
  };
  testing: {
    testCases?: string[];
    edgeCases?: string[];
    accessibilityChecks?: string[];
    performanceMetrics?: {
      estimatedSize: string;
      renderTime: string;
      complexity: string;
    };
  };
  preview: {
    html: string;
  };
}

interface LoadingState {
  requirements: boolean;
  architecture: boolean;
  code: boolean;
  testing: boolean;
  preview: boolean;
}

interface ErrorState {
  message: string;
  step: 'requirements' | 'architecture' | 'code' | 'testing' | 'preview' | 'general';
  details?: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GenerationResult {
  id: string;
  code: string;
  prompt: string;
  timestamp: string;
  model: string;
  isDemoMode?: boolean;
  error?: string;
  isFavorite?: boolean;
  name?: string;
  parentId?: string; // ID of parent component if this is a variation
  variationNumber?: number; // Variation number (1, 2, 3, etc.)
  variations?: string[]; // IDs of child variations
  conversationHistory?: ChatMessage[]; // Conversation history for refinements
}

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
  usageCount: number;
}

interface HistoryState {
  generations: GenerationResult[];
  favorites: string[]; // IDs of favorite generations
}

// Helper function to save to localStorage
const saveToStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Helper function to load from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored && stored.trim()) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading from storage:', e);
        // Clear corrupted data
        localStorage.removeItem(key);
      }
    }
  }
  return defaultValue;
};

export default function AIBuilder() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    requirements: false,
    architecture: false,
    code: false,
    testing: false,
    preview: false
  });
  const [error, setError] = useState<ErrorState | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState('code');
  const [aiState, setAIState] = useState<AIBuilderState | null>(null);
  const [currentStep, setCurrentStep] = useState<'requirements' | 'architecture' | 'code' | 'testing' | 'preview'>('requirements');
  const [history, setHistory] = useState<HistoryState>({ generations: [], favorites: [] });
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());

  // Preview enhancement states
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [componentProps, setComponentProps] = useState<Record<string, any>>({});
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);
  const [showPropsEditor, setShowPropsEditor] = useState(false);
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropValue, setNewPropValue] = useState('');

  // AI Interaction states
  const [conversationMode, setConversationMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([
    { id: 'tpl_1', name: 'Modern Card', prompt: 'Create a modern card component with...', category: 'UI', usageCount: 0 },
    { id: 'tpl_2', name: 'Form with Validation', prompt: 'Build a form with validation for...', category: 'Forms', usageCount: 0 },
    { id: 'tpl_3', name: 'Dashboard Layout', prompt: 'Design a dashboard layout with...', category: 'Layouts', usageCount: 0 }
  ]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCodeSection, setSelectedCodeSection] = useState<string>('');

  // Load history from localStorage on mount (client-side only)
  useEffect(() => {
    const loadedHistory = loadFromStorage('aibuilder_history', { generations: [], favorites: [] });
    setHistory(loadedHistory);
  }, []);

  // Load prompt templates from localStorage on mount (client-side only)
  useEffect(() => {
    const loadedTemplates = loadFromStorage('prompt_templates', [
      { id: 'tpl_1', name: 'Modern Card', prompt: 'Create a modern card component with...', category: 'UI', usageCount: 0 },
      { id: 'tpl_2', name: 'Form with Validation', prompt: 'Build a form with validation for...', category: 'Forms', usageCount: 0 },
      { id: 'tpl_3', name: 'Dashboard Layout', prompt: 'Design a dashboard layout with...', category: 'Layouts', usageCount: 0 }
    ]);
    setPromptTemplates(loadedTemplates);
  }, []);

  // Save history when it changes
  useEffect(() => {
    saveToStorage('aibuilder_history', history);
  }, [history]);

  const filteredGenerations = React.useMemo(() => {
    return history.generations
      .filter(gen => {
        // Exclude child variations from main list (they'll be shown under parent)
        if (gen.parentId) return false;

        const matchesSearch = searchQuery === '' ||
          (gen.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          gen.prompt.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
          historyFilter === 'all' ||
          (historyFilter === 'favorites' && history.favorites.includes(gen.id)) ||
          (historyFilter === 'recent' && !history.favorites.includes(gen.id));

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        // Always show favorites first if not filtering
        if (historyFilter === 'all') {
          const aFav = history.favorites.includes(a.id);
          const bFav = history.favorites.includes(b.id);
          if (aFav !== bFav) return aFav ? -1 : 1;
        }
        // Then sort by timestamp
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [history, searchQuery, historyFilter]);

  const addToHistory = (newResult: GenerationResult) => {
    setHistory(prev => {
      // If this is a variation, update parent's variations array
      if (newResult.parentId) {
        const parentIndex = prev.generations.findIndex(g => g.id === newResult.parentId);
        if (parentIndex !== -1) {
          const updatedGenerations = [...prev.generations];
          const parent = { ...updatedGenerations[parentIndex] };
          parent.variations = [...(parent.variations || []), newResult.id];
          updatedGenerations[parentIndex] = parent;

          return {
            ...prev,
            generations: [newResult, ...updatedGenerations].slice(0, 100) // Keep last 100 generations
          };
        }
      }

      return {
        ...prev,
        generations: [newResult, ...prev.generations].slice(0, 100) // Keep last 100 generations
      };
    });
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => {
      const isFavorite = prev.favorites.includes(id);
      return {
        ...prev,
        favorites: isFavorite
          ? prev.favorites.filter(fid => fid !== id)
          : [...prev.favorites, id],
        generations: prev.generations.map(gen =>
          gen.id === id ? { ...gen, isFavorite: !isFavorite } : gen
        )
      };
    });
  };

  const loadGeneration = (gen: GenerationResult) => {
    setPrompt(gen.prompt);
    setGeneratedCode(gen.code);
    setResult(gen);
    setAIState(prev => ({
      ...prev,
      code: { component: gen.code }
    }));
    setCurrentStep('code');
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      setHistory({ generations: [], favorites: [] });
    }
  };

  const deleteGeneration = (id: string) => {
    setHistory(prev => {
      const genToDelete = prev.generations.find(g => g.id === id);

      // If this has variations, delete them too
      const idsToDelete = new Set([id]);
      if (genToDelete?.variations) {
        genToDelete.variations.forEach(varId => idsToDelete.add(varId));
      }

      // If this is a variation, remove it from parent's variations array
      if (genToDelete?.parentId) {
        const parent = prev.generations.find(g => g.id === genToDelete.parentId);
        if (parent?.variations) {
          parent.variations = parent.variations.filter(vid => vid !== id);
        }
      }

      return {
        generations: prev.generations.filter(gen => !idsToDelete.has(gen.id)),
        favorites: prev.favorites.filter(fid => !idsToDelete.has(fid))
      };
    });
  };

  const createVariation = (parentId: string) => {
    const parent = history.generations.find(g => g.id === parentId);
    if (!parent) return;

    // Calculate next variation number
    const existingVariations = history.generations.filter(
      g => g.parentId === parentId || g.id === parentId
    );
    const variationNumber = existingVariations.length;

    // AI-powered variation suggestions
    const variationIdeas = [
      'with dark mode support',
      'with animations and transitions',
      'with accessibility improvements',
      'with mobile-first responsive design',
      'with advanced error handling',
      'with loading states',
      'with keyboard navigation',
      'with internationalization support'
    ];

    const randomIdea = variationIdeas[Math.floor(Math.random() * variationIdeas.length)];

    // Load parent into editor with AI-suggested variation
    setPrompt(`${parent.prompt} ${randomIdea}`);
    setShowHistory(false);

    // Store parent ID for when we generate
    setResult(prev => ({ ...parent, parentId, variationNumber }));
  };

  const toggleVariationsExpanded = (id: string) => {
    setExpandedVariations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addComponentProp = () => {
    if (newPropKey.trim()) {
      // Try to parse value as JSON, otherwise use as string
      let parsedValue = newPropValue;
      try {
        parsedValue = JSON.parse(newPropValue);
      } catch {
        // Keep as string if not valid JSON
      }

      setComponentProps(prev => ({
        ...prev,
        [newPropKey]: parsedValue
      }));
      setNewPropKey('');
      setNewPropValue('');
    }
  };

  const removeComponentProp = (key: string) => {
    setComponentProps(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateComponentProp = (key: string, value: any) => {
    setComponentProps(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // AI Interaction functions
  const sendRefinementMessage = async () => {
    if (!refinementPrompt.trim() || !generatedCode) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: refinementPrompt,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setRefinementPrompt('');

    // Simulate AI response (in production, this would call your AI API)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: `I understand you want to refine the component. Let me update the code based on your request: "${userMessage.content}"`,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // Update the current result with conversation history
      if (result) {
        const updatedResult = {
          ...result,
          conversationHistory: [...(result.conversationHistory || []), userMessage, assistantMessage]
        };
        setResult(updatedResult);
      }
    }, 1000);
  };

  const saveAsTemplate = (name: string, category: string = 'Custom') => {
    const newTemplate: PromptTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      prompt: prompt,
      category,
      usageCount: 0
    };

    setPromptTemplates(prev => {
      const updated = [...prev, newTemplate];
      saveToStorage('prompt_templates', updated);
      return updated;
    });
  };

  const useTemplate = (template: PromptTemplate) => {
    setPrompt(template.prompt);
    setShowTemplates(false);

    // Increment usage count
    setPromptTemplates(prev => {
      const updated = prev.map(t =>
        t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
      );
      saveToStorage('prompt_templates', updated);
      return updated;
    });
  };

  const deleteTemplate = (id: string) => {
    setPromptTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveToStorage('prompt_templates', updated);
      return updated;
    });
  };

  const modifyCodeSection = async (instruction: string) => {
    if (!selectedCodeSection) {
      setError({
        message: 'Please select a code section to modify',
        step: 'general',
        timestamp: Date.now()
      });
      return;
    }

    // In production, this would send the selected code section and instruction to AI
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: `Modify this section:\n\`\`\`\n${selectedCodeSection}\n\`\`\`\n\nInstruction: ${instruction}`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setRefinementPrompt('');
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aibuilder-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Validate the structure
        if (!importedData.generations || !Array.isArray(importedData.generations)) {
          throw new Error('Invalid file format: missing generations array');
        }

        if (!importedData.favorites || !Array.isArray(importedData.favorites)) {
          throw new Error('Invalid file format: missing favorites array');
        }

        // Validate each generation has required fields
        const isValid = importedData.generations.every((gen: any) =>
          gen.id && gen.code && gen.prompt && gen.timestamp && gen.model
        );

        if (!isValid) {
          throw new Error('Invalid file format: generations missing required fields');
        }

        // Merge with existing history, avoiding duplicates
        setHistory(prev => {
          const existingIds = new Set(prev.generations.map(g => g.id));
          const newGenerations = importedData.generations.filter(
            (gen: GenerationResult) => !existingIds.has(gen.id)
          );

          return {
            generations: [...prev.generations, ...newGenerations].slice(0, 100), // Keep max 100
            favorites: [...new Set([...prev.favorites, ...importedData.favorites])]
          };
        });

        alert(`Successfully imported ${importedData.generations.length} components!`);
      } catch (err) {
        setError({
          message: 'Failed to import history',
          step: 'general',
          details: err instanceof Error ? err.message : 'Invalid file format',
          timestamp: Date.now()
        });
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be imported again if needed
    event.target.value = '';
  };

  const steps = [
    { id: 'requirements', icon: '📋', title: 'Requirements', description: 'Analyze what to build' },
    { id: 'architecture', icon: '🏗️', title: 'Architecture', description: 'Design the structure' },
    { id: 'code', icon: '💻', title: 'Code', description: 'Generate implementation' },
    { id: 'testing', icon: '🧪', title: 'Testing', description: 'Validate & test' },
    { id: 'preview', icon: '👁️', title: 'Preview', description: 'See it live' }
  ] as const;

  const generateComponent = async () => {
    if (!prompt.trim()) {
      setError({
        message: 'Please enter a description of what you want to build',
        step: 'general',
        timestamp: Date.now()
      });
      return;
    }

    // Reset states
    setError(null);
    setResult(null);
    setAIState(null);

    // Set loading state for current step
    setLoadingState(prev => ({
      ...prev,
      [currentStep]: true
    }));

    try {
      const response = await fetch('/api/ai-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          type: currentStep
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      setAIState(data);
      const generatedComponent = data.code?.component || '';
      setGeneratedCode(generatedComponent);
      
      const newResult: GenerationResult = {
        id: `gen_${Date.now()}`,
        code: generatedComponent,
        prompt: prompt,
        timestamp: new Date().toISOString(),
        model: 'GPT-4o-mini',
        isDemoMode: false,
        name: prompt.slice(0, 50) + '...',
        isFavorite: false
      };
      
      setResult(newResult);
      addToHistory(newResult);
      setCurrentStep('code');
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'An error occurred',
        step: currentStep,
        details: err instanceof Error ? err.stack : undefined,
        timestamp: Date.now()
      });
    } finally {
      // Reset loading state
      setLoadingState(prev => ({
        ...prev,
        [currentStep]: false
      }));
    }
  };

  const downloadCode = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GeneratedComponent.tsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const examplePrompts = [
    "Create a modern contact form with name, email, message fields and validation",
    "Build a user profile card with avatar, name, email, and social links",
    "Design a product card with image, title, price, and add to cart button",
    "Create a dashboard statistics card with number, label, and trend indicator",
    "Build a responsive navigation header with logo and menu items"
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Templates Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-black/90 backdrop-blur-xl transform transition-transform duration-300 ${
        showTemplates ? 'translate-x-0' : '-translate-x-full'
      } z-50 border-r border-white/10 flex flex-col`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white text-lg font-semibold">Prompt Templates</h2>
          <button
            onClick={() => setShowTemplates(false)}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {promptTemplates.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p>No templates yet</p>
              <p className="text-xs mt-2">Save prompts to reuse them later</p>
            </div>
          ) : (
            <div className="space-y-2">
              {promptTemplates.map(template => (
                <div
                  key={template.id}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer group transition-colors"
                  onClick={() => useTemplate(template)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{template.name}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{template.prompt}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                          {template.category}
                        </span>
                        {template.usageCount > 0 && (
                          <span className="text-xs text-slate-500">
                            Used {template.usageCount}x
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete template"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              const name = window.prompt('Template name:');
              if (name) saveAsTemplate(name);
            }}
            disabled={!prompt.trim()}
            className="w-full px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30"
          >
            💾 Save Current Prompt
          </button>
        </div>
      </div>

      {/* History Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-black/90 backdrop-blur-xl transform transition-transform duration-300 ${
        showHistory ? 'translate-x-0' : 'translate-x-full'
      } z-50 border-l border-white/10 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white text-lg font-semibold">History</h2>
          <div className="flex items-center gap-2">
            {history.generations.length > 0 && (
              <>
                <button
                  onClick={exportHistory}
                  className="text-slate-400 hover:text-green-400 text-sm px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  title="Export history as JSON"
                >
                  📤
                </button>
                <button
                  onClick={clearHistory}
                  className="text-slate-400 hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  title="Clear all history"
                >
                  🗑️
                </button>
              </>
            )}
            <label
              className="text-slate-400 hover:text-blue-400 text-sm px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="Import history from JSON"
            >
              📥
              <input
                type="file"
                accept=".json"
                onChange={importHistory}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {history.generations.length > 0 && (
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none text-sm"
            />
          </div>
        )}

        {/* Filter Buttons */}
        {history.generations.length > 0 && (
          <div className="px-4 py-2 border-b border-white/10 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                historyFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              All ({history.generations.length})
            </button>
            <button
              onClick={() => setHistoryFilter('favorites')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                historyFilter === 'favorites'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              ★ {history.favorites.length}
            </button>
            <button
              onClick={() => setHistoryFilter('recent')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                historyFilter === 'recent'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              Recent
            </button>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4">
          {history.generations.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p>No generations yet</p>
              <p className="text-xs mt-2">Your generated components will appear here</p>
            </div>
          ) : filteredGenerations.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <p>No results found</p>
              <p className="text-xs mt-2">Try a different search or filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGenerations.map(gen => {
                const variations = gen.variations?.map(vid =>
                  history.generations.find(g => g.id === vid)
                ).filter(Boolean) as GenerationResult[] || [];
                const isExpanded = expandedVariations.has(gen.id);

                return (
                  <div key={gen.id} className="space-y-1">
                    <div
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer group transition-colors relative"
                      onClick={() => loadGeneration(gen)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white truncate block">{gen.name}</span>
                            {history.favorites.includes(gen.id) && (
                              <span className="text-yellow-400 flex-shrink-0">★</span>
                            )}
                            {variations.length > 0 && (
                              <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                {variations.length} variant{variations.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(gen.timestamp).toLocaleString()}
                          </div>
                          {gen.isDemoMode && (
                            <span className="text-xs text-yellow-400 mt-1 inline-block">Demo</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {variations.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVariationsExpanded(gen.id);
                              }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              title={isExpanded ? 'Collapse variations' : 'Expand variations'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              createVariation(gen.id);
                            }}
                            className="p-1 rounded hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Create variation"
                          >
                            🔄
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(gen.id);
                            }}
                            className={`p-1 rounded hover:bg-white/10 transition-colors ${
                              history.favorites.includes(gen.id)
                                ? 'text-yellow-400'
                                : 'text-slate-400 opacity-0 group-hover:opacity-100'
                            }`}
                            title={history.favorites.includes(gen.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {history.favorites.includes(gen.id) ? '★' : '☆'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGeneration(gen.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete this generation"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Variations */}
                    {isExpanded && variations.length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-blue-500/30 space-y-1">
                        {variations.map((variation) => (
                          <div
                            key={variation.id}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer group transition-colors relative"
                            onClick={() => loadGeneration(variation)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-blue-300">Variation {variation.variationNumber || variations.indexOf(variation) + 1}</span>
                                  <span className="text-xs text-slate-300 truncate">{variation.name}</span>
                                  {history.favorites.includes(variation.id) && (
                                    <span className="text-yellow-400 flex-shrink-0 text-xs">★</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {new Date(variation.timestamp).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(variation.id);
                                  }}
                                  className={`p-1 rounded hover:bg-white/10 transition-colors text-xs ${
                                    history.favorites.includes(variation.id)
                                      ? 'text-yellow-400'
                                      : 'text-slate-400 opacity-0 group-hover:opacity-100'
                                  }`}
                                  title={history.favorites.includes(variation.id) ? 'Remove from favorites' : 'Add to favorites'}
                                >
                                  {history.favorites.includes(variation.id) ? '★' : '☆'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGeneration(variation.id);
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                                  title="Delete this variation"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Header with Steps - Streamlined */}
      <div className="border-b border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  AI Component Builder
                </h1>
                <p className="text-xs text-slate-400">Build React components with AI</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 text-sm ${
                  showTemplates
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                }`}
                title="Browse and save prompt templates"
              >
                <span className="text-base">📝</span>
                <span className="hidden lg:inline">Templates</span>
              </button>
              <button
                onClick={() => setConversationMode(!conversationMode)}
                disabled={!generatedCode}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 text-sm ${
                  conversationMode
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30 shadow-lg shadow-green-500/10'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 hover:border-white/20'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={!generatedCode ? 'Generate a component first to chat' : 'Chat with AI to refine your component'}
              >
                <span className="text-base">💬</span>
                <span className="hidden lg:inline">Chat</span>
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="relative px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 text-sm bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 hover:border-white/20"
                title="View your generation history"
              >
                <span className="text-base">�</span>
                <span className="hidden lg:inline">History</span>
                {history.generations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
                    {history.generations.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-7xl mx-auto px-6 py-3 border-t border-white/5">
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, index) => {
              const isAvailable = step.id === 'requirements' ||
                (aiState && (
                  step.id === 'architecture' && aiState.architecture ||
                  step.id === 'code' && aiState.code ||
                  step.id === 'testing' && aiState.testing ||
                  step.id === 'preview' && aiState.code
                ));
              const isActive = currentStep === step.id;
              const isCompleted = aiState && (
                (step.id === 'requirements' && aiState.requirements) ||
                (step.id === 'architecture' && aiState.architecture) ||
                (step.id === 'code' && aiState.code) ||
                (step.id === 'testing' && aiState.testing)
              );

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => isAvailable && setCurrentStep(step.id)}
                    disabled={!isAvailable}
                    className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium text-sm ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                        : isCompleted
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
                          : isAvailable
                            ? 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                            : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-50'
                    }`}
                    title={!isAvailable ? 'Generate component first' : step.description}
                  >
                    <span className="text-lg">{step.icon}</span>
                    <span className="hidden md:inline">{step.title}</span>
                    {isCompleted && !isActive && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 transition-all duration-300 ${
                      isCompleted ? 'bg-green-500/50' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Split Screen Content */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-6 overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Panel - Input */}
        <div className="h-full flex flex-col space-y-4 overflow-auto">
          {/* Input Section */}
      <div className="p-6 rounded-xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-2xl">
        <div className="space-y-4">
          <div>
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Describe Component
            </h2>
            <p className="text-sm text-slate-400 mt-1">Tell AI what you want to build</p>
          </div>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create a modern user profile card with avatar, name, bio, social links, and a follow button"
              className="w-full min-h-[120px] p-4 rounded-xl bg-slate-900/80 border-2 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none shadow-inner"
              disabled={loadingState[currentStep]}
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
              {prompt.length} characters
            </div>
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quick Examples:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.slice(0, 3).map((example, index) => (
                <button
                  key={index}
                  onClick={() => setPrompt(example)}
                  className="px-3 py-2 text-xs rounded-lg border border-blue-400/30 text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  title={example}
                >
                  💡 {example.slice(0, 35)}...
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={generateComponent}
              disabled={loadingState[currentStep] || !prompt.trim()}
              className={`flex-1 px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 shadow-lg ${
                loadingState[currentStep] || !prompt.trim()
                  ? 'bg-slate-700 cursor-not-allowed opacity-50 text-slate-400'
                  : 'bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
              }`}
              title={!prompt.trim() ? 'Enter a prompt first' : 'Generate component with AI'}
            >
              {loadingState[currentStep] ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {currentStep === 'requirements' ? 'Analyzing...' :
                     currentStep === 'architecture' ? 'Designing...' :
                     currentStep === 'code' ? 'Generating...' :
                     'Creating...'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl">⚡</span>
                  <span>
                    {currentStep === 'requirements' ? 'Analyze Requirements' :
                        currentStep === 'architecture' ? 'Design Architecture' :
                        currentStep === 'code' ? 'Generate Code' :
                        'Create Preview'}
                  </span>
                </>
              )}
            </button>

            {generatedCode && (
              <button
                onClick={downloadCode}
                className="px-5 py-3 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:border-green-500/60 flex items-center gap-2 font-semibold transition-all duration-200 shadow-lg shadow-green-500/10 hover:shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] text-sm"
                title="Download component as .tsx file"
              >
                <span className="text-lg">📥</span>
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/40 shadow-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 animate-pulse">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-red-200 font-semibold text-sm mb-1">{error.message}</div>
                  {error.details && (
                    <pre className="text-xs text-red-300/80 mt-2 p-3 bg-red-900/30 rounded-lg border border-red-500/20 overflow-x-auto max-h-32 scrollbar-thin scrollbar-thumb-red-500/20">
                      {error.details}
                    </pre>
                  )}
                  <div className="text-xs text-red-400/70 mt-2 flex items-center gap-2">
                    <span>Error in {error.step} step</span>
                    <span>•</span>
                    <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-red-100 transition-colors flex-shrink-0 p-1 hover:bg-red-500/20 rounded text-sm"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {(generatedCode || Object.values(loadingState).some(Boolean)) && (
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-base font-bold flex items-center gap-2">
                <span className="text-2xl">💻</span>
                Generated Component
              </h3>
              {result && (
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-3 py-1.5 rounded-full border font-medium ${
                    result.isDemoMode
                      ? "border-yellow-400/30 text-yellow-300 bg-yellow-400/10"
                      : "border-green-400/30 text-green-300 bg-green-400/10"
                  }`}>
                    {result.isDemoMode ? "Demo Mode" : `🤖 ${result.model}`}
                  </span>
                  <span className="text-slate-400">{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {result && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-slate-300 text-sm">"{result.prompt}"</p>
              </div>
            )}

            {result?.isDemoMode && (
              <div className="p-4 rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-start gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="text-yellow-200 text-sm font-medium">Demo Mode Active</p>
                    <p className="text-yellow-300/80 text-xs mt-1">Add your OpenAI API key to .env.local for full AI-powered generation</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              {loadingState[currentStep] ? (
                <div className="flex items-center justify-center py-16 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border-2 border-blue-500/20">
                  <div className="text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-purple-400/20 border-b-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse'}} />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold text-base">AI is working...</p>
                      <p className="text-slate-400 mt-2 text-sm">This takes 5-15 seconds</p>
                      <div className="flex items-center justify-center gap-1 mt-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : generatedCode ? (
                <div className="space-y-3">
                  <div className="flex border-2 border-white/10 rounded-xl overflow-hidden bg-slate-900/50">
                    <button
                      onClick={() => setActiveTab('code')}
                      className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                        activeTab === 'code' 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">💻</span>
                      <span>TypeScript Code</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                        activeTab === 'preview' 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">👁️</span>
                      <span>Live Preview</span>
                    </button>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-white/10">
                    {activeTab === 'code' ? (
                      <CodePreview code={generatedCode} />
                    ) : (
                      <ComponentPreview code={generatedCode} />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
        </div>

        {/* Right Panel - Output */}
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm h-full overflow-hidden relative shadow-2xl">
            {/* Requirements Step */}
            <div className={`transition-all duration-300 transform absolute inset-0 p-3 ${
              currentStep === 'requirements' ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
            }`}>
            {currentStep === 'requirements' && (
              <div className="space-y-2 overflow-y-auto h-full">
                <h2 className="text-white text-sm font-semibold flex items-center gap-1.5">
                  📋 Requirements
                </h2>
                {aiState?.requirements ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-blue-300 text-sm font-medium mb-2">Description</h3>
                      <p className="text-slate-300">{aiState.requirements.description}</p>
                    </div>

                    <div>
                      <h3 className="text-blue-300 text-sm font-medium mb-2">Components Needed</h3>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {aiState.requirements.components.map((component, idx) => (
                          <li key={idx}>{component}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-blue-300 text-sm font-medium mb-2">Features</h3>
                      <ul className="list-disc list-inside text-slate-300 space-y-1">
                        {aiState.requirements.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Enhanced Requirements Fields */}
                    {aiState.requirements.userStories && aiState.requirements.userStories.length > 0 && (
                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-2">
                          👥 User Stories
                        </h3>
                        <div className="space-y-2">
                          {aiState.requirements.userStories.map((story, idx) => (
                            <div key={idx} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <p className="text-slate-300 text-sm">{story}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.requirements.technicalRequirements && aiState.requirements.technicalRequirements.length > 0 && (
                      <div>
                        <h3 className="text-green-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ⚙️ Technical Requirements
                        </h3>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          {aiState.requirements.technicalRequirements.map((req, idx) => (
                            <li key={idx} className="text-sm">{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiState.requirements.constraints && aiState.requirements.constraints.length > 0 && (
                      <div>
                        <h3 className="text-orange-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ⚠️ Constraints & Limitations
                        </h3>
                        <div className="space-y-2">
                          {aiState.requirements.constraints.map((constraint, idx) => (
                            <div key={idx} className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                              <p className="text-slate-300 text-sm">{constraint}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.requirements.successCriteria && aiState.requirements.successCriteria.length > 0 && (
                      <div>
                        <h3 className="text-emerald-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ✓ Success Criteria
                        </h3>
                        <ul className="space-y-2">
                          {aiState.requirements.successCriteria.map((criterion, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                              <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    Enter your requirements in the prompt and click Generate to start
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Architecture Step */}
            <div className={`transition-all duration-300 transform absolute inset-0 p-4 ${
              currentStep === 'architecture' ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
            }`}>
            {currentStep === 'architecture' && (
              <div className="space-y-3 overflow-y-auto h-full">
                <h2 className="text-white text-base font-semibold flex items-center gap-2">
                  🏗️ Architecture Design
                </h2>
                {aiState?.architecture ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-blue-300 text-sm font-medium mb-2">File Structure</h3>
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                        <ul className="list-none text-slate-300 space-y-1 font-mono text-xs">
                          {aiState.architecture.fileStructure.map((file, idx) => (
                            <li key={idx} className="pl-4 flex items-center gap-2">
                              <span className="text-slate-500">├──</span>
                              <span>{file}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-blue-300 text-sm font-medium mb-2">Dependencies</h3>
                      <div className="flex flex-wrap gap-2">
                        {aiState.architecture.dependencies.map((dep, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 font-mono">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Enhanced Architecture Fields */}
                    {aiState.architecture.componentHierarchy && aiState.architecture.componentHierarchy.length > 0 && (
                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-2">
                          🔷 Component Hierarchy
                        </h3>
                        <div className="space-y-3">
                          {aiState.architecture.componentHierarchy.map((comp, idx) => (
                            <div key={idx} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <div className="font-medium text-purple-300 text-sm mb-2">{comp.name}</div>
                              {comp.props.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-xs text-slate-400 mb-1">Props:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {comp.props.map((prop, pidx) => (
                                      <span key={pidx} className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-200 font-mono">
                                        {prop}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {comp.children.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">Children:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {comp.children.map((child, cidx) => (
                                      <span key={cidx} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                                        {child}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.architecture.dataFlow && aiState.architecture.dataFlow.length > 0 && (
                      <div>
                        <h3 className="text-cyan-300 text-sm font-medium mb-2 flex items-center gap-2">
                          🔄 Data Flow
                        </h3>
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                          <div className="space-y-2">
                            {aiState.architecture.dataFlow.map((flow, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-cyan-400">→</span>
                                <span className="text-slate-300">{flow}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {aiState.architecture.stateManagement && (
                      <div>
                        <h3 className="text-green-300 text-sm font-medium mb-2 flex items-center gap-2">
                          📦 State Management
                        </h3>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <p className="text-slate-300 text-sm">{aiState.architecture.stateManagement}</p>
                        </div>
                      </div>
                    )}

                    {aiState.architecture.designPatterns && aiState.architecture.designPatterns.length > 0 && (
                      <div>
                        <h3 className="text-amber-300 text-sm font-medium mb-2 flex items-center gap-2">
                          🎨 Design Patterns
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {aiState.architecture.designPatterns.map((pattern, idx) => (
                            <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                              <span className="text-amber-300 text-sm font-medium">{pattern}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    Generate the component to see its architecture
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Code Step */}
            <div className={`transition-all duration-300 transform absolute inset-0 p-4 ${
              currentStep === 'code' ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
            }`}>
            {currentStep === 'code' && (
              <div className="h-full flex flex-col space-y-3 overflow-y-auto">
                <h2 className="text-white text-base font-semibold flex items-center gap-2">
                  💻 Generated Code
                </h2>

                {/* Enhanced Code Fields */}
                {aiState?.code?.explanation && aiState.code.explanation.length > 0 && (
                  <div>
                    <h3 className="text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
                      📝 Code Explanation
                    </h3>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
                      {aiState.code.explanation.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-400 font-bold flex-shrink-0">{idx + 1}.</span>
                          <span className="text-slate-300">{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiState?.code?.bestPractices && aiState.code.bestPractices.length > 0 && (
                  <div>
                    <h3 className="text-green-300 text-sm font-medium mb-2 flex items-center gap-2">
                      ✓ Best Practices Applied
                    </h3>
                    <div className="space-y-2">
                      {aiState.code.bestPractices.map((practice, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                          <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                          <span className="text-slate-300 text-sm">{practice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiState?.code?.optimizations && aiState.code.optimizations.length > 0 && (
                  <div>
                    <h3 className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-2">
                      ⚡ Performance Optimizations
                    </h3>
                    <div className="space-y-2">
                      {aiState.code.optimizations.map((opt, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                          <span className="text-purple-400 flex-shrink-0 mt-0.5">⚡</span>
                          <span className="text-slate-300 text-sm">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-[300px]">
                  <h3 className="text-slate-300 text-sm font-medium mb-2">Component Code</h3>
                  <CodePreview code={generatedCode} />
                </div>
              </div>
            )}
            </div>

            {/* Testing Step */}
            <div className={`transition-all duration-300 transform absolute inset-0 p-4 ${
              currentStep === 'testing' ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
            }`}>
            {currentStep === 'testing' && (
              <div className="space-y-3 overflow-y-auto h-full">
                <h2 className="text-white text-base font-semibold flex items-center gap-2">
                  🧪 Testing & Validation
                </h2>
                {aiState?.testing ? (
                  <div className="space-y-6">
                    {aiState.testing.testCases && aiState.testing.testCases.length > 0 && (
                      <div>
                        <h3 className="text-blue-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ✅ Test Cases
                        </h3>
                        <div className="space-y-2">
                          {aiState.testing.testCases.map((test, idx) => (
                            <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <span className="text-blue-400 font-mono text-xs mt-0.5">Test {idx + 1}:</span>
                                <span className="text-slate-300 text-sm flex-1">{test}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.testing.edgeCases && aiState.testing.edgeCases.length > 0 && (
                      <div>
                        <h3 className="text-orange-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ⚠️ Edge Cases to Consider
                        </h3>
                        <div className="space-y-2">
                          {aiState.testing.edgeCases.map((edge, idx) => (
                            <div key={idx} className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 flex items-start gap-2">
                              <span className="text-orange-400 flex-shrink-0 mt-0.5">⚠️</span>
                              <span className="text-slate-300 text-sm">{edge}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.testing.accessibilityChecks && aiState.testing.accessibilityChecks.length > 0 && (
                      <div>
                        <h3 className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ♿ Accessibility Checks
                        </h3>
                        <div className="space-y-2">
                          {aiState.testing.accessibilityChecks.map((check, idx) => (
                            <div key={idx} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 flex items-start gap-2">
                              <span className="text-purple-400 flex-shrink-0 mt-0.5">✓</span>
                              <span className="text-slate-300 text-sm">{check}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiState.testing.performanceMetrics && (
                      <div>
                        <h3 className="text-green-300 text-sm font-medium mb-2 flex items-center gap-2">
                          ⚡ Performance Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">Estimated Size</div>
                            <div className="text-lg font-bold text-green-300">{aiState.testing.performanceMetrics.estimatedSize}</div>
                          </div>
                          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">Render Time</div>
                            <div className="text-lg font-bold text-cyan-300">{aiState.testing.performanceMetrics.renderTime}</div>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-400 mb-1">Complexity</div>
                            <div className="text-lg font-bold text-amber-300">{aiState.testing.performanceMetrics.complexity}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-center py-8">
                    Generate the component to see testing recommendations
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Preview Step */}
            <div className={`transition-all duration-300 transform absolute inset-0 p-4 ${
              currentStep === 'preview' ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
            }`}>
            {currentStep === 'preview' && (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white text-base font-semibold flex items-center gap-2">
                    👁️ Live Preview
                  </h2>

                  {/* Preview Controls */}
                  <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setPreviewTheme('light')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          previewTheme === 'light'
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Light theme"
                      >
                        ☀️
                      </button>
                      <button
                        onClick={() => setPreviewTheme('dark')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          previewTheme === 'dark'
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Dark theme"
                      >
                        🌙
                      </button>
                    </div>

                    {/* Responsive Mode */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setPreviewMode('desktop')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          previewMode === 'desktop'
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Desktop view"
                      >
                        🖥️
                      </button>
                      <button
                        onClick={() => setPreviewMode('tablet')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          previewMode === 'tablet'
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Tablet view"
                      >
                        📱
                      </button>
                      <button
                        onClick={() => setPreviewMode('mobile')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          previewMode === 'mobile'
                            ? 'bg-white/20 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Mobile view"
                      >
                        📱
                      </button>
                    </div>

                    {/* Live Preview Toggle */}
                    <button
                      onClick={() => setLivePreviewEnabled(!livePreviewEnabled)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        livePreviewEnabled
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                      }`}
                      title="Toggle live preview"
                    >
                      {livePreviewEnabled ? '● Live' : '○ Static'}
                    </button>

                    {/* Props Editor Toggle */}
                    <button
                      onClick={() => setShowPropsEditor(!showPropsEditor)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        showPropsEditor
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                      }`}
                      title="Toggle props editor"
                    >
                      ⚙️ Props
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex gap-4">
                  {/* Props Editor Sidebar */}
                  {showPropsEditor && (
                    <div className="w-64 flex-shrink-0 bg-black/20 border border-white/10 rounded-lg p-4 overflow-y-auto">
                      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                        ⚙️ Component Props
                      </h3>

                      {/* Add New Prop */}
                      <div className="mb-4 space-y-2">
                        <input
                          type="text"
                          value={newPropKey}
                          onChange={(e) => setNewPropKey(e.target.value)}
                          placeholder="Prop name"
                          className="w-full px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={newPropValue}
                          onChange={(e) => setNewPropValue(e.target.value)}
                          placeholder="Value (JSON or string)"
                          className="w-full px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-purple-400 focus:outline-none"
                        />
                        <button
                          onClick={addComponentProp}
                          disabled={!newPropKey.trim()}
                          className="w-full px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Add Prop
                        </button>
                      </div>

                      {/* Current Props */}
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 mb-2">Current Props:</div>
                        {Object.keys(componentProps).length === 0 ? (
                          <div className="text-xs text-slate-500 text-center py-4">
                            No props set
                          </div>
                        ) : (
                          Object.entries(componentProps).map(([key, value]) => (
                            <div key={key} className="bg-white/5 rounded p-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-purple-300 font-mono">{key}</span>
                                <button
                                  onClick={() => removeComponentProp(key)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                  title="Remove prop"
                                >
                                  ✕
                                </button>
                              </div>
                              <input
                                type="text"
                                value={typeof value === 'string' ? value : JSON.stringify(value)}
                                onChange={(e) => {
                                  try {
                                    updateComponentProp(key, JSON.parse(e.target.value));
                                  } catch {
                                    updateComponentProp(key, e.target.value);
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-slate-300 font-mono focus:border-purple-400 focus:outline-none"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div className="flex-1 overflow-hidden">
                    <ComponentPreview
                      code={generatedCode}
                      theme={previewTheme}
                      mode={previewMode}
                      props={componentProps}
                      livePreview={livePreviewEnabled}
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Panel */}
      {conversationMode && generatedCode && (
        <div className="fixed bottom-0 left-0 right-0 h-80 bg-black/90 backdrop-blur-xl border-t border-white/10 z-40 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              💬 AI Chat - Refine Your Component
            </h3>
            <div className="flex items-center gap-2">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                >
                  Clear Chat
                </button>
              )}
              <button
                onClick={() => setConversationMode(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <div className="text-4xl mb-2">💬</div>
                <p>Start a conversation to refine your component</p>
                <p className="text-xs mt-2">Ask for changes, improvements, or explain specific parts</p>
              </div>
            ) : (
              chatMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                        : 'bg-white/5 text-slate-200 border border-white/10'
                    }`}
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendRefinementMessage()}
                placeholder="Ask AI to refine the component... (e.g., 'Add error handling', 'Make it more responsive')"
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-green-400 focus:outline-none"
              />
              <button
                onClick={sendRefinementMessage}
                disabled={!refinementPrompt.trim()}
                className="px-6 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/30 flex items-center gap-2"
              >
                <span>Send</span>
                <span>→</span>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  const instruction = window.prompt('What would you like to modify?');
                  if (instruction) modifyCodeSection(instruction);
                }}
                disabled={!selectedCodeSection}
                className="text-xs px-3 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎯 Modify Selected Code
              </button>
              <span className="text-xs text-slate-500">
                {selectedCodeSection ? 'Code section selected' : 'Select code in the preview to modify it'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
