'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppConcept, Feature, UIPreferences, TechnicalRequirements } from '../types/appConcept';
import {
  validateBasicInfo,
  validateFeatures,
  validateFeatureName,
  validateFeatureDescription,
  getCharacterCount,
  sanitizeInput
} from '../utils/wizardValidation';
import type { ValidationError } from '../utils/wizardValidation';
import {
  createAutoSaver,
  WIZARD_DRAFT_KEYS,
  formatDraftAge,
  clearAllDrafts
} from '../utils/wizardAutoSave';
import { ValidatedField, ValidationSummary } from './ValidationMessage';
import { FeatureLibrary } from './FeatureLibrary';
import { LayoutPreview } from './LayoutPreview';

/**
 * Props for AppConceptWizard
 */
interface AppConceptWizardProps {
  onComplete: (concept: AppConcept) => void;
  onCancel: () => void;
  initialConcept?: Partial<AppConcept>;
}

/**
 * Wizard step configuration
 */
const STEPS = [
  { number: 1, title: 'Basic Info', description: 'Name and describe your app' },
  { number: 2, title: 'Features', description: 'Define core functionality' },
  { number: 3, title: 'Design', description: 'Choose look and feel' },
  { number: 4, title: 'Technical', description: 'Set requirements' },
  { number: 5, title: 'Review', description: 'Confirm and create' }
];

/**
 * Default UI preferences
 */
const defaultUIPreferences: UIPreferences = {
  style: 'modern',
  colorScheme: 'dark',
  layout: 'single-page',
  primaryColor: '#3B82F6'
};

/**
 * Default technical requirements
 */
const defaultTechnicalRequirements: TechnicalRequirements = {
  needsAuth: false,
  needsDatabase: false,
  needsAPI: false,
  needsFileUpload: false,
  needsRealtime: false
};

/**
 * AppConceptWizard component
 */
export function AppConceptWizard({
  onComplete,
  onCancel,
  initialConcept
}: AppConceptWizardProps) {
  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Basic Info (Step 1)
  const [name, setName] = useState(initialConcept?.name || '');
  const [description, setDescription] = useState(initialConcept?.description || '');
  const [purpose, setPurpose] = useState(initialConcept?.purpose || '');
  const [targetUsers, setTargetUsers] = useState(initialConcept?.targetUsers || '');

  // Features (Step 2)
  const [features, setFeatures] = useState<Feature[]>(initialConcept?.coreFeatures || []);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDescription, setNewFeatureDescription] = useState('');
  const [newFeaturePriority, setNewFeaturePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showFeatureLibrary, setShowFeatureLibrary] = useState(false);

  // Design (Step 3)
  const [uiPreferences, setUiPreferences] = useState<UIPreferences>(
    initialConcept?.uiPreferences || defaultUIPreferences
  );

  // Technical (Step 4)
  const [technical, setTechnical] = useState<TechnicalRequirements>(
    initialConcept?.technical || defaultTechnicalRequirements
  );

  // Validation
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Draft management
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftAge, setDraftAge] = useState<string>('');

  // Auto-saver
  const autoSaver = useMemo(
    () => createAutoSaver<Partial<AppConcept>>(WIZARD_DRAFT_KEYS.APP_CONCEPT, 2000),
    []
  );

  // Check for existing draft on mount
  useEffect(() => {
    if (autoSaver.hasDraft() && !initialConcept) {
      const metadata = autoSaver.getMetadata();
      if (metadata && metadata.exists && metadata.timestamp) {
        setDraftAge(formatDraftAge(metadata.timestamp));
        setShowDraftPrompt(true);
      }
    }
  }, [autoSaver, initialConcept]);

  // Auto-save on data changes
  useEffect(() => {
    if (!showDraftPrompt) {
      const conceptData: Partial<AppConcept> = {
        name,
        description,
        purpose,
        targetUsers,
        coreFeatures: features,
        uiPreferences,
        technical
      };
      autoSaver.start(conceptData);
    }

    return () => autoSaver.stop();
  }, [name, description, purpose, targetUsers, features, uiPreferences, technical, autoSaver, showDraftPrompt]);

  // Resume draft
  const resumeDraft = useCallback(() => {
    const draft = autoSaver.load();
    if (draft) {
      setName(draft.name || '');
      setDescription(draft.description || '');
      setPurpose(draft.purpose || '');
      setTargetUsers(draft.targetUsers || '');
      setFeatures(draft.coreFeatures || []);
      setUiPreferences(draft.uiPreferences || defaultUIPreferences);
      setTechnical(draft.technical || defaultTechnicalRequirements);
    }
    setShowDraftPrompt(false);
  }, [autoSaver]);

  // Discard draft
  const discardDraft = useCallback(() => {
    autoSaver.delete();
    setShowDraftPrompt(false);
  }, [autoSaver]);

  // Validate current step
  const validateCurrentStep = useCallback((): ValidationError[] => {
    switch (currentStep) {
      case 1: {
        const result = validateBasicInfo({ name, description, purpose, targetUsers });
        return result.errors;
      }
      case 2: {
        const featuresError = validateFeatures(features);
        return featuresError ? [featuresError] : [];
      }
      default:
        return [];
    }
  }, [currentStep, name, description, purpose, targetUsers, features]);

  // Handle step navigation
  const goToNextStep = useCallback(() => {
    const stepErrors = validateCurrentStep();
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      // Mark all fields as touched
      setTouched(new Set(['name', 'description', 'purpose', 'targetUsers', 'features']));
      return;
    }

    setErrors([]);
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  }, [currentStep]);

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

  // Add feature from library
  const addFeatureFromLibrary = useCallback((feature: Omit<Feature, 'id'>) => {
    const newFeature: Feature = {
      ...feature,
      id: `feature-${Date.now()}`
    };
    setFeatures([...features, newFeature]);
  }, [features]);

  // Handle completion
  const handleComplete = useCallback(() => {
    const concept: AppConcept = {
      name: sanitizeInput(name),
      description: sanitizeInput(description),
      purpose: sanitizeInput(purpose),
      targetUsers: sanitizeInput(targetUsers),
      coreFeatures: features,
      uiPreferences,
      technical,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Clear draft on successful completion
    clearAllDrafts();

    onComplete(concept);
  }, [name, description, purpose, targetUsers, features, uiPreferences, technical, onComplete]);

  // Mark field as touched on blur
  const handleBlur = (field: string) => {
    setTouched((prev) => new Set([...prev, field]));
  };

  // Get error for specific field
  const getFieldError = (field: string): ValidationError | null => {
    if (!touched.has(field)) return null;
    return errors.find((e) => e.field === field) || null;
  };

  // Build current concept for preview
  const currentConcept = useMemo((): Partial<AppConcept> => ({
    name,
    description,
    purpose,
    targetUsers,
    coreFeatures: features,
    uiPreferences,
    technical
  }), [name, description, purpose, targetUsers, features, uiPreferences, technical]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <ValidatedField
              label="App Name"
              required
              error={getFieldError('name')}
              characterCount={getCharacterCount(name, 50)}
              hint="Choose a memorable name for your app"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="My Amazing App"
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </ValidatedField>

            <ValidatedField
              label="Description"
              required
              error={getFieldError('description')}
              characterCount={getCharacterCount(description, 500)}
              hint="What does your app do? Be specific about its main purpose"
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
                placeholder="A comprehensive app that helps users..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </ValidatedField>

            <ValidatedField
              label="Purpose"
              required
              error={getFieldError('purpose')}
              characterCount={getCharacterCount(purpose, 300)}
              hint="What problem does your app solve?"
            >
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                onBlur={() => handleBlur('purpose')}
                placeholder="The main goal is to help users..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </ValidatedField>

            <ValidatedField
              label="Target Users"
              required
              error={getFieldError('targetUsers')}
              characterCount={getCharacterCount(targetUsers, 200)}
              hint="Who will use this app?"
            >
              <input
                type="text"
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                onBlur={() => handleBlur('targetUsers')}
                placeholder="Small business owners, developers, students..."
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </ValidatedField>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Feature Library Button */}
            <button
              onClick={() => setShowFeatureLibrary(true)}
              className="w-full px-4 py-3 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>📚</span>
              <span>Browse Feature Library</span>
            </button>

            {/* Existing Features */}
            {features.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Added Features ({features.length})
                </h4>
                <div className="space-y-2">
                  {features.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-white/5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{feature.name}</span>
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
                        <p className="text-sm text-slate-400">{feature.description}</p>
                      </div>
                      <button
                        onClick={() => removeFeature(feature.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Feature */}
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

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Design Options */}
              <div className="space-y-6">
                {/* Style */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Visual Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['modern', 'minimalist', 'playful', 'professional'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setUiPreferences({ ...uiPreferences, style })}
                        className={`px-4 py-3 rounded-lg border text-left transition-all ${
                          uiPreferences.style === style
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                            : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="capitalize font-medium">{style}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Color Scheme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['light', 'dark'] as const).map((scheme) => (
                      <button
                        key={scheme}
                        onClick={() => setUiPreferences({ ...uiPreferences, colorScheme: scheme })}
                        className={`px-4 py-3 rounded-lg border text-left transition-all ${
                          uiPreferences.colorScheme === scheme
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                            : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="capitalize font-medium">
                          {scheme === 'light' ? '☀️ Light' : '🌙 Dark'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Layout Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'single-page', label: 'Single Page', icon: '📄' },
                      { value: 'multi-page', label: 'Multi-Page', icon: '📑' },
                      { value: 'dashboard', label: 'Dashboard', icon: '📊' }
                    ].map((layout) => (
                      <button
                        key={layout.value}
                        onClick={() =>
                          setUiPreferences({
                            ...uiPreferences,
                            layout: layout.value as UIPreferences['layout']
                          })
                        }
                        className={`px-4 py-3 rounded-lg border text-left transition-all ${
                          uiPreferences.layout === layout.value
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-200'
                            : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium">
                          {layout.icon} {layout.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Color */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={uiPreferences.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setUiPreferences({ ...uiPreferences, primaryColor: e.target.value })
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border border-white/10"
                    />
                    <input
                      type="text"
                      value={uiPreferences.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setUiPreferences({ ...uiPreferences, primaryColor: e.target.value })
                      }
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-slate-900 rounded-xl border border-white/10 p-4 h-[500px]">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Live Preview</h4>
                <LayoutPreview
                  preferences={uiPreferences}
                  concept={currentConcept}
                  className="h-[calc(100%-28px)]"
                  onPreferenceChange={(prefs) =>
                    setUiPreferences({ ...uiPreferences, ...prefs })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Authentication */}
              <div
                onClick={() => setTechnical({ ...technical, needsAuth: !technical.needsAuth })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technical.needsAuth
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🔐</span>
                  <span className={`font-medium ${technical.needsAuth ? 'text-blue-200' : 'text-white'}`}>
                    User Authentication
                  </span>
                </div>
                <p className="text-sm text-slate-400">Login, signup, and user sessions</p>
                {technical.needsAuth && (
                  <div className="mt-3 flex gap-2">
                    {(['simple', 'email', 'oauth'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTechnical({ ...technical, authType: type });
                        }}
                        className={`px-2 py-1 rounded text-xs ${
                          technical.authType === type
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

              {/* Database */}
              <div
                onClick={() => setTechnical({ ...technical, needsDatabase: !technical.needsDatabase })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technical.needsDatabase
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🗄️</span>
                  <span className={`font-medium ${technical.needsDatabase ? 'text-blue-200' : 'text-white'}`}>
                    Database Storage
                  </span>
                </div>
                <p className="text-sm text-slate-400">Persistent data storage and retrieval</p>
              </div>

              {/* API */}
              <div
                onClick={() => setTechnical({ ...technical, needsAPI: !technical.needsAPI })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technical.needsAPI
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🔌</span>
                  <span className={`font-medium ${technical.needsAPI ? 'text-blue-200' : 'text-white'}`}>
                    External APIs
                  </span>
                </div>
                <p className="text-sm text-slate-400">Connect to third-party services</p>
              </div>

              {/* File Upload */}
              <div
                onClick={() => setTechnical({ ...technical, needsFileUpload: !technical.needsFileUpload })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technical.needsFileUpload
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📁</span>
                  <span className={`font-medium ${technical.needsFileUpload ? 'text-blue-200' : 'text-white'}`}>
                    File Upload
                  </span>
                </div>
                <p className="text-sm text-slate-400">Upload and manage files/images</p>
              </div>

              {/* Realtime */}
              <div
                onClick={() => setTechnical({ ...technical, needsRealtime: !technical.needsRealtime })}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  technical.needsRealtime
                    ? 'bg-blue-600/20 border-blue-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className={`font-medium ${technical.needsRealtime ? 'text-blue-200' : 'text-white'}`}>
                    Real-time Updates
                  </span>
                </div>
                <p className="text-sm text-slate-400">Live data sync and notifications</p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info Summary */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>📋</span> Basic Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-400">Name:</span>{' '}
                    <span className="text-white">{name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Users:</span>{' '}
                    <span className="text-white">{targetUsers}</span>
                  </div>
                  <div className="text-slate-300 line-clamp-2">{description}</div>
                </div>
              </div>

              {/* Features Summary */}
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

              {/* Design Summary */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>🎨</span> Design
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs capitalize">
                    {uiPreferences.style}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs capitalize">
                    {uiPreferences.colorScheme}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs">
                    {uiPreferences.layout}
                  </span>
                  <span
                    className="px-2 py-1 rounded text-white text-xs"
                    style={{ backgroundColor: uiPreferences.primaryColor }}
                  >
                    {uiPreferences.primaryColor}
                  </span>
                </div>
              </div>

              {/* Technical Summary */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <span>⚙️</span> Technical
                </h4>
                <div className="flex flex-wrap gap-2">
                  {technical.needsAuth && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🔐 Auth ({technical.authType || 'simple'})
                    </span>
                  )}
                  {technical.needsDatabase && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🗄️ Database
                    </span>
                  )}
                  {technical.needsAPI && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      🔌 API
                    </span>
                  )}
                  {technical.needsFileUpload && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      📁 File Upload
                    </span>
                  )}
                  {technical.needsRealtime && (
                    <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs">
                      ⚡ Realtime
                    </span>
                  )}
                  {!technical.needsAuth &&
                    !technical.needsDatabase &&
                    !technical.needsAPI &&
                    !technical.needsFileUpload &&
                    !technical.needsRealtime && (
                      <span className="text-xs text-slate-500">No special requirements</span>
                    )}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-900 rounded-xl border border-white/10 p-4 h-[300px]">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Final Preview</h4>
              <LayoutPreview
                preferences={uiPreferences}
                concept={currentConcept}
                className="h-[calc(100%-28px)]"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
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
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">App Concept Wizard</h2>
                <p className="text-sm text-slate-300">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => {
                    if (step.number < currentStep) {
                      setCurrentStep(step.number);
                    }
                  }}
                  disabled={step.number > currentStep}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    step.number === currentStep
                      ? 'bg-blue-600 text-white'
                      : step.number < currentStep
                      ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm">
                    {step.number < currentStep ? '✓' : step.number}
                  </span>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      step.number < currentStep ? 'bg-green-500' : 'bg-slate-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={goToPrevStep}
                className="px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
              >
                ← Back
              </button>
            )}

            {currentStep < STEPS.length ? (
              <button
                onClick={goToNextStep}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg"
              >
                ✨ Create App Concept
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

export default AppConceptWizard;
