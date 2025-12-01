'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppConcept, Feature, UIPreferences, TechnicalRequirements } from '../types/appConcept';
import type { FullTemplate } from '../types/architectureTemplates';
import {
  validateFeatures,
  validateFeatureName,
  validateFeatureDescription,
  getCharacterCount,
  sanitizeInput
} from '../utils/wizardValidation';
import type { ValidationError } from '../utils/wizardValidation';
import {
  createAutoSaver,
  formatDraftAge,
  clearAllDrafts
} from '../utils/wizardAutoSave';
import { ValidatedField, ValidationSummary } from './ValidationMessage';
import { FeatureLibrary } from './FeatureLibrary';
import { LayoutPreview } from './LayoutPreview';
import { TemplateSelector } from './TemplateSelector';

/**
 * App build configuration output from the guided wizard
 */
export interface AppBuildConfig {
  description: string;
  template: FullTemplate | null;
  features: Feature[];
  designPreferences: DesignPreferences;
  technicalOptions: TechnicalOptions;
}

/**
 * Design preferences for the app
 */
export interface DesignPreferences {
  style: UIPreferences['style'];
  colorScheme: UIPreferences['colorScheme'];
  primaryColor: string;
  layout: UIPreferences['layout'];
}

/**
 * Technical options for the app
 */
export interface TechnicalOptions {
  needsAuth: boolean;
  authType?: 'simple' | 'email' | 'oauth';
  needsDatabase: boolean;
  needsAPI: boolean;
  needsFileUpload: boolean;
  needsRealtime: boolean;
}

/**
 * Props for GuidedBuildView
 */
interface GuidedBuildViewProps {
  onComplete: (config: AppBuildConfig) => void;
  onCancel: () => void;
  initialConfig?: Partial<AppBuildConfig>;
}

/**
 * Step configuration for the guided wizard
 */
interface GuidedStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  isOptional: boolean;
  estimatedTime: string;
}

const GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'describe',
    title: 'Describe Your App',
    description: 'Tell us about the app you want to build',
    icon: '💡',
    isOptional: false,
    estimatedTime: '2 min'
  },
  {
    id: 'template',
    title: 'Choose Template',
    description: 'Select a starting architecture pattern',
    icon: '📋',
    isOptional: true,
    estimatedTime: '1 min'
  },
  {
    id: 'features',
    title: 'Configure Features',
    description: 'Select and prioritize app features',
    icon: '✨',
    isOptional: false,
    estimatedTime: '3 min'
  },
  {
    id: 'design',
    title: 'Design Preferences',
    description: 'Choose colors, layout, and style',
    icon: '🎨',
    isOptional: false,
    estimatedTime: '2 min'
  },
  {
    id: 'technical',
    title: 'Technical Options',
    description: 'Configure database, auth, and APIs',
    icon: '⚙️',
    isOptional: true,
    estimatedTime: '2 min'
  },
  {
    id: 'review',
    title: 'Review & Generate',
    description: 'Review settings and start building',
    icon: '🚀',
    isOptional: false,
    estimatedTime: '1 min'
  }
];

/**
 * Default design preferences
 */
const defaultDesignPreferences: DesignPreferences = {
  style: 'modern',
  colorScheme: 'dark',
  primaryColor: '#3B82F6',
  layout: 'single-page'
};

/**
 * Default technical options
 */
const defaultTechnicalOptions: TechnicalOptions = {
  needsAuth: false,
  needsDatabase: false,
  needsAPI: false,
  needsFileUpload: false,
  needsRealtime: false
};

/**
 * Example prompts for Step 1
 */
const EXAMPLE_PROMPTS = [
  'A task management app for teams with real-time collaboration',
  'An e-commerce platform for handmade crafts with shopping cart',
  'A personal finance tracker with budgeting and expense reports',
  'A recipe sharing platform with user profiles and ratings',
  'A project portfolio showcase with contact form'
];

/**
 * Contextual tips for each step
 */
const STEP_TIPS: Record<string, string[]> = {
  describe: [
    'Be specific about your target users',
    'Mention key features you need',
    'Describe the problem your app solves'
  ],
  template: [
    'Templates provide a solid starting point',
    'You can customize everything later',
    'Choose based on your app\'s main purpose'
  ],
  features: [
    'High priority features are built first',
    'Start with core functionality',
    'You can add more features later'
  ],
  design: [
    'Preview updates in real-time',
    'Dark mode is easier on the eyes',
    'Choose colors that match your brand'
  ],
  technical: [
    'Only enable what you need',
    'Database is required for data persistence',
    'Auth is needed for user accounts'
  ],
  review: [
    'Double-check your settings',
    'You can go back to change anything',
    'Generation takes about 1-2 minutes'
  ]
};

/**
 * Draft key for guided build
 */
const GUIDED_BUILD_DRAFT_KEY = 'wizard_guided_build';

/**
 * GuidedBuildView Component
 * A step-by-step guided wizard for building applications
 */
export function GuidedBuildView({
  onComplete,
  onCancel,
  initialConfig
}: GuidedBuildViewProps) {
  // Step navigation
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Step 1: Description
  const [appDescription, setAppDescription] = useState(initialConfig?.description || '');
  const [appName, setAppName] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  
  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<FullTemplate | null>(
    initialConfig?.template || null
  );
  
  // Step 3: Features
  const [features, setFeatures] = useState<Feature[]>(initialConfig?.features || []);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [newFeaturePriority, setNewFeaturePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showFeatureLibrary, setShowFeatureLibrary] = useState(false);
  
  // Step 4: Design
  const [designPreferences, setDesignPreferences] = useState<DesignPreferences>(
    initialConfig?.designPreferences || defaultDesignPreferences
  );
  
  // Step 5: Technical
  const [technicalOptions, setTechnicalOptions] = useState<TechnicalOptions>(
    initialConfig?.technicalOptions || defaultTechnicalOptions
  );
  
  // UI State
  const [showPreview, setShowPreview] = useState(true);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftAge, setDraftAge] = useState<string>('');
  
  // Auto-saver
  const autoSaver = useMemo(
    () => createAutoSaver<Partial<AppBuildConfig> & { appName: string; targetUsers: string; currentStep: number }>(
      GUIDED_BUILD_DRAFT_KEY, 
      2000
    ),
    []
  );

  // Check for existing draft on mount
  useEffect(() => {
    if (autoSaver.hasDraft() && !initialConfig) {
      const metadata = autoSaver.getMetadata();
      if (metadata && metadata.exists && metadata.timestamp) {
        setDraftAge(formatDraftAge(metadata.timestamp));
        setShowDraftPrompt(true);
      }
    }
  }, [autoSaver, initialConfig]);

  // Auto-save on data changes
  useEffect(() => {
    if (!showDraftPrompt) {
      const draftData = {
        description: appDescription,
        template: selectedTemplate,
        features,
        designPreferences,
        technicalOptions,
        appName,
        targetUsers,
        currentStep
      };
      autoSaver.start(draftData);
    }

    return () => autoSaver.stop();
  }, [
    appDescription, selectedTemplate, features, designPreferences, 
    technicalOptions, appName, targetUsers, currentStep, autoSaver, showDraftPrompt
  ]);

  // Resume draft
  const resumeDraft = useCallback(() => {
    const draft = autoSaver.load();
    if (draft) {
      setAppDescription(draft.description || '');
      setSelectedTemplate(draft.template || null);
      setFeatures(draft.features || []);
      setDesignPreferences(draft.designPreferences || defaultDesignPreferences);
      setTechnicalOptions(draft.technicalOptions || defaultTechnicalOptions);
      setAppName(draft.appName || '');
      setTargetUsers(draft.targetUsers || '');
      setCurrentStep(draft.currentStep || 0);
      const completed = new Set<number>();
      for (let i = 0; i < (draft.currentStep || 0); i++) {
        completed.add(i);
      }
      setCompletedSteps(completed);
    }
    setShowDraftPrompt(false);
  }, [autoSaver]);

  // Discard draft
  const discardDraft = useCallback(() => {
    autoSaver.delete();
    setShowDraftPrompt(false);
  }, [autoSaver]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    let totalMinutes = 0;
    for (let i = currentStep; i < GUIDED_STEPS.length; i++) {
      const timeStr = GUIDED_STEPS[i].estimatedTime;
      const minutes = parseInt(timeStr.replace(' min', ''), 10) || 0;
      totalMinutes += minutes;
    }
    return totalMinutes === 1 ? '~1 minute' : `~${totalMinutes} minutes`;
  }, [currentStep]);

  // Build current concept for preview
  const currentConcept = useMemo((): Partial<AppConcept> => ({
    name: appName || 'My App',
    description: appDescription,
    purpose: appDescription,
    targetUsers,
    coreFeatures: features,
    uiPreferences: {
      style: designPreferences.style,
      colorScheme: designPreferences.colorScheme,
      primaryColor: designPreferences.primaryColor,
      layout: designPreferences.layout
    },
    technical: technicalOptions
  }), [appName, appDescription, targetUsers, features, designPreferences, technicalOptions]);

  // Validate current step
  const validateCurrentStep = useCallback((): ValidationError[] => {
    const stepId = GUIDED_STEPS[currentStep].id;
    
    switch (stepId) {
      case 'describe': {
        const stepErrors: ValidationError[] = [];
        if (!appDescription || appDescription.trim().length < 20) {
          stepErrors.push({
            field: 'description',
            message: 'Please provide a description of at least 20 characters',
            type: 'error'
          });
        }
        return stepErrors;
      }
      case 'template':
        return [];
      case 'features': {
        const featuresError = validateFeatures(features);
        return featuresError ? [featuresError] : [];
      }
      case 'design':
        return [];
      case 'technical':
        return [];
      case 'review':
        return [];
      default:
        return [];
    }
  }, [currentStep, appDescription, features]);

  // Handle step navigation
  const goToNextStep = useCallback(() => {
    const stepErrors = validateCurrentStep();
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      setTouched(new Set(['description', 'features']));
      return;
    }

    setErrors([]);
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < GUIDED_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
      setErrors([]);
    }
  }, [currentStep, completedSteps]);

  const skipStep = useCallback(() => {
    if (GUIDED_STEPS[currentStep].isOptional) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < GUIDED_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: FullTemplate) => {
    setSelectedTemplate(template);
    
    if (!appName) {
      setAppName(`My ${template.name}`);
    }
    
    const featureDescriptions: Record<string, string> = {
      'Sidebar navigation': 'Collapsible sidebar menu for easy navigation between sections',
      'Header with user menu': 'Top header bar with user profile, notifications, and settings',
      'Dashboard grid layout': 'Responsive grid system for organizing widgets and content',
      'Metric cards': 'Cards displaying key metrics and KPIs with icons',
      'Item list/table': 'Sortable table or list view for displaying data records',
      'Create form': 'Form with validation for creating new records',
      'Edit functionality': 'Inline or modal editing capabilities for existing records',
      'Delete with confirmation': 'Safe deletion with confirmation dialog',
      'Product listing': 'Grid or list view of products with filtering options',
      'Product detail page': 'Detailed product view with images, description, and variants',
      'Shopping cart': 'Cart functionality with item management and totals',
      'Checkout process': 'Multi-step checkout flow with payment integration',
      'User authentication': 'Login, registration, and password reset flows',
      'Onboarding flow': 'Multi-step wizard for new user setup',
      'Dashboard': 'Main dashboard with overview metrics and quick actions',
      'Settings pages': 'User profile and account settings management',
      'Hero section': 'Prominent headline with call-to-action button',
      'Features showcase': 'Grid of feature cards highlighting key benefits',
      'Call-to-action buttons': 'Prominent buttons guiding users to take action',
      'Footer': 'Site footer with navigation links and social icons',
      'Article listing': 'List of articles with pagination and filtering',
      'Article detail page': 'Full article view with rich content rendering',
      'Category navigation': 'Navigation by categories and tags',
      'Search functionality': 'Search with autocomplete and filters'
    };
    
    const templateFeatures: Feature[] = template.requiredFeatures.map((f, index) => ({
      id: `template-feature-${index}`,
      name: f,
      description: featureDescriptions[f] || `Implementation of ${f.toLowerCase()} functionality`,
      priority: 'high' as const
    }));
    setFeatures(templateFeatures);
    
    const layoutMap: Record<string, DesignPreferences['layout']> = {
      sidebar: 'dashboard',
      topnav: 'multi-page',
      minimal: 'single-page',
      split: 'dashboard'
    };
    setDesignPreferences(prev => ({
      ...prev,
      layout: layoutMap[template.layoutStructure.type] || 'single-page'
    }));
    
    setTechnicalOptions(prev => ({
      ...prev,
      needsAuth: template.technicalRequirements.needsAuth,
      needsDatabase: template.technicalRequirements.needsDatabase,
      needsAPI: template.technicalRequirements.needsAPI,
      needsFileUpload: template.technicalRequirements.needsFileUpload
    }));
    
    goToNextStep();
  }, [appName, goToNextStep]);

  // Handle feature management
  const addFeature = useCallback(() => {
    const nameError = validateFeatureName(newFeatureName, features);
    const descError = validateFeatureDescription(newFeatureDescription);

    if (nameError || descError) {
      const newErrors: ValidationError[] = [];
      if (nameError) newErrors.push(nameError);
      if (descError) newErrors.push(descError);
      setErrors(newErrors);
      return;
    }

    const newFeature: Feature = {
      id: `feature-${Date.now()}`,
      name: sanitizeInput(newFeatureName),
      description: sanitizeInput(newFeatureDescription),
      priority: newFeaturePriority
    };

    setFeatures([...features, newFeature]);
    setNewFeatureName('');
    setNewFeatureDescription('');
    setNewFeaturePriority('medium');
    setErrors([]);
  }, [newFeatureName, newFeatureDescription, newFeaturePriority, features]);

  const removeFeature = useCallback((id: string) => {
    setFeatures(features.filter((f) => f.id !== id));
  }, [features]);

  const updateFeaturePriority = useCallback((id: string, priority: 'high' | 'medium' | 'low') => {
    setFeatures(features.map((f) => (f.id === id ? { ...f, priority } : f)));
  }, [features]);

  const addFeatureFromLibrary = useCallback((feature: Omit<Feature, 'id'>) => {
    const newFeature: Feature = {
      ...feature,
      id: `feature-${Date.now()}`
    };
    setFeatures([...features, newFeature]);
  }, [features]);

  const useExamplePrompt = useCallback((prompt: string) => {
    setAppDescription(prompt);
  }, []);

  // Handle completion
  const handleComplete = useCallback(() => {
    const config: AppBuildConfig = {
      description: sanitizeInput(appDescription),
      template: selectedTemplate,
      features,
      designPreferences,
      technicalOptions
    };

    clearAllDrafts();
    autoSaver.delete();

    onComplete(config);
  }, [appDescription, selectedTemplate, features, designPreferences, technicalOptions, onComplete, autoSaver]);

  const handleBlur = (field: string) => {
    setTouched((prev) => new Set([...prev, field]));
  };

  const getFieldError = (field: string): ValidationError | null => {
    if (!touched.has(field)) return null;
    return errors.find((e) => e.field === field) || null;
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="px-6 py-4 border-b border-white/10 bg-black/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          Step {currentStep + 1} of {GUIDED_STEPS.length}
        </span>
        <span className="text-xs text-slate-400">
          {estimatedTimeRemaining} remaining
        </span>
      </div>
      <div className="flex items-center gap-1">
        {GUIDED_STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep || isCompleted;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title={step.description}
              >
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  {isCompleted ? '✓' : step.icon}
                </span>
                <span className="hidden md:inline font-medium">{step.title}</span>
              </button>
              {index < GUIDED_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 min-w-[8px] ${
                    isCompleted ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  // Render contextual help
  const renderContextualHelp = () => {
    const currentStepId = GUIDED_STEPS[currentStep].id;
    const tips = STEP_TIPS[currentStepId] || [];
    
    return (
      <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-2">
          <span className="text-blue-400">💡</span>
          <div>
            <h4 className="text-sm font-medium text-blue-200 mb-1">Tips</h4>
            <ul className="text-xs text-blue-200/70 space-y-0.5">
              {tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    const currentStepData = GUIDED_STEPS[currentStep];
    
    switch (currentStepData.id) {
      case 'describe':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <ValidatedField
                label="Describe Your App"
                required
                error={getFieldError('description')}
                characterCount={getCharacterCount(appDescription, 1000)}
                hint="Describe what your app does, who it's for, and its main features"
              >
                <textarea
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  onBlur={() => handleBlur('description')}
                  placeholder="I want to build an app that..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </ValidatedField>
              
              <div className="space-y-2">
                <span className="text-xs text-slate-400">Try an example:</span>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.slice(0, 3).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => useExamplePrompt(prompt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-300 text-xs hover:bg-slate-800 transition-all"
                    >
                      {prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  App Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="My Amazing App"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Target Users <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  placeholder="Small business owners, students..."
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'template':
        return (
          <TemplateSelector
            onSelect={handleTemplateSelect}
            onSkip={skipStep}
            userDescription={appDescription}
          />
        );

      case 'features':
        return (
          <div className="space-y-6">
            <button
              onClick={() => setShowFeatureLibrary(true)}
              className="w-full px-4 py-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>📚</span>
              <span>Browse Feature Library</span>
            </button>

            {features.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Added Features ({features.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {features.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm">{feature.name}</span>
                          <select
                            value={feature.priority}
                            onChange={(e) =>
                              updateFeaturePriority(feature.id, e.target.value as 'high' | 'medium' | 'low')
                            }
                            className={`text-xs px-2 py-0.5 rounded-full border-0 ${
                              feature.priority === 'high'
                                ? 'bg-red-500/20 text-red-300'
                                : feature.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-green-500/20 text-green-300'
                            }`}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        <p className="text-xs text-slate-400">{feature.description}</p>
                      </div>
                      <button
                        onClick={() => removeFeature(feature.id)}
                        className="p-1 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove feature"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-slate-800/30 border border-white/5 space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Add Custom Feature</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  placeholder="Feature name"
                  className="px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newFeaturePriority}
                  onChange={(e) => setNewFeaturePriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <textarea
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
                placeholder="Describe what this feature does..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              <button
                onClick={addFeature}
                disabled={!newFeatureName.trim() || !newFeatureDescription.trim()}
                className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Feature
              </button>
            </div>

            {errors.length > 0 && <ValidationSummary errors={errors} />}
          </div>
        );

      case 'design':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Visual Style</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['modern', 'minimalist', 'playful', 'professional'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setDesignPreferences({ ...designPreferences, style })}
                      className={`px-4 py-3 rounded-lg border text-center transition-all ${
                        designPreferences.style === style
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                          : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="capitalize font-medium text-sm">{style}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Color Scheme</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['light', 'dark'] as const).map((scheme) => (
                    <button
                      key={scheme}
                      onClick={() => setDesignPreferences({ ...designPreferences, colorScheme: scheme })}
                      className={`px-4 py-3 rounded-lg border text-center transition-all ${
                        designPreferences.colorScheme === scheme
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                          : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-medium text-sm">
                        {scheme === 'light' ? '☀️ Light' : '🌙 Dark'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Layout Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { value: 'single-page', label: 'Single Page', icon: '📄', desc: 'All content on one page' },
                    { value: 'multi-page', label: 'Multi-Page', icon: '📑', desc: 'Multiple separate pages' },
                    { value: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Admin-style with sidebar' }
                  ].map((layout) => (
                    <button
                      key={layout.value}
                      onClick={() =>
                        setDesignPreferences({
                          ...designPreferences,
                          layout: layout.value as DesignPreferences['layout']
                        })
                      }
                      className={`px-4 py-3 rounded-lg border text-left transition-all ${
                        designPreferences.layout === layout.value
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                          : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {layout.icon} {layout.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{layout.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={designPreferences.primaryColor || '#3B82F6'}
                    onChange={(e) =>
                      setDesignPreferences({ ...designPreferences, primaryColor: e.target.value })
                    }
                    className="w-12 h-12 rounded-lg cursor-pointer border border-white/10"
                  />
                  <input
                    type="text"
                    value={designPreferences.primaryColor || '#3B82F6'}
                    onChange={(e) =>
                      setDesignPreferences({ ...designPreferences, primaryColor: e.target.value })
                    }
                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="flex gap-1">
                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setDesignPreferences({ ...designPreferences, primaryColor: color })}
                        className="w-8 h-8 rounded-lg border-2 border-white/10 hover:border-white/30 transition-all"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'technical':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setTechnicalOptions({ ...technicalOptions, needsAuth: !technicalOptions.needsAuth })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technicalOptions.needsAuth
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🔐</span>
                  <span className={`font-medium ${technicalOptions.needsAuth ? 'text-blue-200' : 'text-white'}`}>
                    User Authentication
                  </span>
                </div>
                <p className="text-sm text-slate-400">Login, signup, and user sessions</p>
                {technicalOptions.needsAuth && (
                  <div className="mt-3 flex gap-2">
                    {(['simple', 'email', 'oauth'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTechnicalOptions({ ...technicalOptions, authType: type });
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                          technicalOptions.authType === type
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                onClick={() => setTechnicalOptions({ ...technicalOptions, needsDatabase: !technicalOptions.needsDatabase })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technicalOptions.needsDatabase
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🗄️</span>
                  <span className={`font-medium ${technicalOptions.needsDatabase ? 'text-blue-200' : 'text-white'}`}>
                    Database Storage
                  </span>
                </div>
                <p className="text-sm text-slate-400">Persistent data storage and retrieval</p>
              </div>

              <div
                onClick={() => setTechnicalOptions({ ...technicalOptions, needsAPI: !technicalOptions.needsAPI })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technicalOptions.needsAPI
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🔌</span>
                  <span className={`font-medium ${technicalOptions.needsAPI ? 'text-blue-200' : 'text-white'}`}>
                    External APIs
                  </span>
                </div>
                <p className="text-sm text-slate-400">Connect to third-party services</p>
              </div>

              <div
                onClick={() => setTechnicalOptions({ ...technicalOptions, needsFileUpload: !technicalOptions.needsFileUpload })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technicalOptions.needsFileUpload
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📁</span>
                  <span className={`font-medium ${technicalOptions.needsFileUpload ? 'text-blue-200' : 'text-white'}`}>
                    File Upload
                  </span>
                </div>
                <p className="text-sm text-slate-400">Upload and manage files/images</p>
              </div>

              <div
                onClick={() => setTechnicalOptions({ ...technicalOptions, needsRealtime: !technicalOptions.needsRealtime })}
                className={`p-4 rounded-xl border cursor-pointer transition-all sm:col-span-2 ${
                  technicalOptions.needsRealtime
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className={`font-medium ${technicalOptions.needsRealtime ? 'text-blue-200' : 'text-white'}`}>
                    Real-time Updates
                  </span>
                </div>
                <p className="text-sm text-slate-400">Live data sync, notifications, and collaborative features</p>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            {selectedTemplate && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                  <span>{selectedTemplate.icon}</span> Using {selectedTemplate.name} Template
                </h4>
                <p className="text-sm text-slate-400">{selectedTemplate.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>💡</span> App Description
                </h4>
                <p className="text-sm text-slate-300 line-clamp-3">{appDescription}</p>
                {appName && (
                  <div className="mt-2 text-xs text-slate-400">
                    Name: <span className="text-white">{appName}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>✨</span> Features ({features.length})
                </h4>
                <div className="space-y-1.5">
                  {features.slice(0, 4).map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          f.priority === 'high'
                            ? 'bg-red-500'
                            : f.priority === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <span className="text-slate-300">{f.name}</span>
                    </div>
                  ))}
                  {features.length > 4 && (
                    <p className="text-xs text-slate-500">+{features.length - 4} more</p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>🎨</span> Design
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs capitalize">
                    {designPreferences.style}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs capitalize">
                    {designPreferences.colorScheme}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">
                    {designPreferences.layout}
                  </span>
                  <span
                    className="px-2 py-1 rounded text-white text-xs"
                    style={{ backgroundColor: designPreferences.primaryColor }}
                  >
                    {designPreferences.primaryColor}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>⚙️</span> Technical
                </h4>
                <div className="flex flex-wrap gap-2">
                  {technicalOptions.needsAuth && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🔐 Auth ({technicalOptions.authType || 'simple'})
                    </span>
                  )}
                  {technicalOptions.needsDatabase && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🗄️ Database
                    </span>
                  )}
                  {technicalOptions.needsAPI && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🔌 API
                    </span>
                  )}
                  {technicalOptions.needsFileUpload && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      📁 File Upload
                    </span>
                  )}
                  {technicalOptions.needsRealtime && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      ⚡ Realtime
                    </span>
                  )}
                  {!technicalOptions.needsAuth &&
                    !technicalOptions.needsDatabase &&
                    !technicalOptions.needsAPI &&
                    !technicalOptions.needsFileUpload &&
                    !technicalOptions.needsRealtime && (
                      <span className="text-xs text-slate-500">No special requirements</span>
                    )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <h4 className="font-medium text-green-200 mb-1">Ready to Generate!</h4>
                  <p className="text-sm text-green-200/70">
                    Click &quot;Generate App&quot; below to start building your application. 
                    The AI will use your configuration to create a complete, working app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render live preview panel
  const renderPreviewPanel = () => {
    if (!showPreview) return null;
    
    return (
      <div className="hidden lg:flex lg:w-[400px] xl:w-[500px] flex-col border-l border-white/10 bg-slate-900/50">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Live Preview</h3>
          <button
            onClick={() => setShowPreview(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <LayoutPreview
            preferences={{
              style: designPreferences.style,
              colorScheme: designPreferences.colorScheme,
              primaryColor: designPreferences.primaryColor,
              layout: designPreferences.layout
            }}
            concept={currentConcept}
            className="h-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Draft Resume Prompt */}
        {showDraftPrompt && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl border border-white/10 max-w-md w-full p-6 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-white mb-2">Resume Draft?</h3>
              <p className="text-slate-400 mb-6">
                You have an unsaved draft from {draftAge}. Would you like to continue where you left off?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={discardDraft}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
                >
                  Start Fresh
                </button>
                <button
                  onClick={resumeDraft}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                >
                  Resume Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-3xl">🏗️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Guided App Builder</h2>
                <p className="text-sm text-slate-300">
                  {GUIDED_STEPS[currentStep].title} - {GUIDED_STEPS[currentStep].description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="hidden lg:flex px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all items-center gap-1.5"
              >
                {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
              </button>
              <button
                onClick={onCancel}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <span className="text-slate-400 text-xl">✕</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step Progress Bar */}
        {renderStepIndicator()}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContextualHelp()}
            {renderStepContent()}
          </div>

          {/* Live Preview Panel */}
          {renderPreviewPanel()}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={goToPrevStep}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
              >
                ← Back
              </button>
            )}

            {GUIDED_STEPS[currentStep].isOptional && currentStep < GUIDED_STEPS.length - 1 && (
              <button
                onClick={skipStep}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
              >
                Skip
              </button>
            )}

            {currentStep < GUIDED_STEPS.length - 1 ? (
              <button
                onClick={goToNextStep}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg"
              >
                🚀 Generate App
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Library Modal */}
      <FeatureLibrary
        isOpen={showFeatureLibrary}
        onClose={() => setShowFeatureLibrary(false)}
        onSelectFeature={addFeatureFromLibrary}
        existingFeatureNames={features.map((f) => f.name)}
      />
    </div>
  );
}

export default GuidedBuildView;
