"use client";

import { useState, useRef, useEffect } from 'react';
import type { AppConcept, Feature, UIPreferences, TechnicalRequirements } from '../types/appConcept';
import { ExamplePrompts, getRandomPlaceholder } from './ExamplePrompts';
import { createAutoSaver, WIZARD_DRAFT_KEYS, formatDraftAge } from '../utils/wizardAutoSave';
import { useToast } from './Toast';
import LayoutPreview from './LayoutPreview';

interface ConversationalAppWizardProps {
  onComplete: (concept: AppConcept) => void;
  onCancel: () => void;
}

interface Message {
  id: string;
  type: 'assistant' | 'user';
  content: string;
  suggestions?: string[];
  quickActions?: { label: string; value: string; icon?: string }[];
  attachments?: string[]; // Base64 images
  timestamp: Date;
}

interface WizardState {
  name: string;
  description: string;
  purpose: string;
  targetUsers: string;
  features: Feature[];
  uiPreferences: UIPreferences;
  technical: TechnicalRequirements;
  currentTopic: 'initial' | 'basic' | 'features' | 'ui' | 'technical' | 'review';
}

export default function ConversationalAppWizard({ onComplete, onCancel }: ConversationalAppWizardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placeholder, setPlaceholder] = useState(getRandomPlaceholder());

  // UI State
  const [activeTab, setActiveTab] = useState<'summary' | 'preview'>('summary');
  const [previewKey, setPreviewKey] = useState(0); // To force re-render of preview animation
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const [wizardState, setWizardState] = useState<WizardState>({
    name: '',
    description: '',
    purpose: '',
    targetUsers: '',
    features: [],
    uiPreferences: {
      style: 'modern',
      colorScheme: 'auto',
      layout: 'single-page',
      referenceMedia: []
    },
    technical: {
      needsAuth: false,
      needsDatabase: false,
      needsAPI: false,
      needsFileUpload: false,
      needsRealtime: false,
    },
    currentTopic: 'initial',
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // Auto-save
  const autoSaver = useRef(createAutoSaver<{ wizardState: WizardState; messages: Message[] }>(WIZARD_DRAFT_KEYS.CONVERSATIONAL));
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  const { showToast } = useToast();

  // Check for draft on mount
  useEffect(() => {
    const metadata = autoSaver.current.getMetadata();
    if (metadata?.exists) {
      setShowDraftPrompt(true);
    }

    // Start auto-saving
    autoSaver.current.start(
      () => ({
        wizardState,
        messages,
      }),
      () => {
        setLastSaved(new Date().toISOString());
      }
    );

    return () => {
      autoSaver.current.stop();
    };
  }, []);

  // Update preview when UI prefs change
  useEffect(() => {
    setPreviewKey(prev => prev + 1);
  }, [wizardState.uiPreferences]);

  // Load draft
  const loadDraft = () => {
    const draft = autoSaver.current.load();
    if (draft) {
      setWizardState(draft.wizardState);
      setMessages(draft.messages);
      showToast({ type: 'success', message: 'Conversation restored!' });
    }
    setShowDraftPrompt(false);
  };

  const discardDraft = () => {
    autoSaver.current.delete();
    setShowDraftPrompt(false);
    // Initialize with greeting
    initializeGreeting();
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  const initializeGreeting = () => {
    const greeting: Message = {
      id: 'greeting',
      type: 'assistant',
      content: `👋 Welcome to the App Planning Assistant! I'm here to help you turn your vision into a detailed implementation plan.

Tell me about the app you want to build. You can describe it naturally, like:
- "I want to build a task manager for freelancers"
- "A social recipe sharing platform"
- "An inventory tracking system for small businesses"

What's your app idea?`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  };

  useEffect(() => {
    if (!showDraftPrompt) {
      initializeGreeting();
    }
  }, [showDraftPrompt]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const simulateTyping = async (duration: number = 1000) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsTyping(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      // Add to wizard state
      setWizardState(prev => ({
        ...prev,
        uiPreferences: {
          ...prev.uiPreferences,
          referenceMedia: [
            ...(prev.uiPreferences.referenceMedia || []),
            {
              type: file.type.startsWith('video') ? 'video' : 'image',
              url: base64,
              name: file.name
            }
          ]
        }
      }));

      // Add user message with attachment
      addMessage({
        type: 'user',
        content: `Uploaded reference: ${file.name}`,
        attachments: [base64]
      });

      // Acknowledge upload
      setTimeout(() => {
        addMessage({
          type: 'assistant',
          content: `I've received your reference image. I'll use this to guide the design!`,
        });
      }, 500);
    };
    reader.readAsDataURL(file);
  };

  const analyzeUserInput = (input: string) => {
    const lowerInput = input.toLowerCase();

    // Extract potential app name
    const namePatterns = [
      /(?:called|named)\s+["']?([^"'\n,]+)["']?/i,
      /^([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*[-–:]/,
    ];

    let extractedName = '';
    for (const pattern of namePatterns) {
      const match = input.match(pattern);
      if (match) {
        extractedName = match[1].trim();
        break;
      }
    }

    // Detect app type and suggest features
    const appTypeKeywords: Record<string, string[]> = {
      'task': ['Task Management', 'Due Dates', 'Priority Labels', 'Progress Tracking', 'Notifications'],
      'project': ['Project Dashboard', 'Team Collaboration', 'Milestone Tracking', 'File Sharing', 'Activity Timeline'],
      'social': ['User Profiles', 'News Feed', 'Comments & Likes', 'Following System', 'Notifications'],
      'ecommerce': ['Product Catalog', 'Shopping Cart', 'Checkout Process', 'Order History', 'Payment Integration'],
      'recipe': ['Recipe Database', 'Ingredient Lists', 'Search & Filter', 'User Ratings', 'Save Favorites'],
      'inventory': ['Stock Tracking', 'Low Stock Alerts', 'Barcode Scanning', 'Reports & Analytics', 'Supplier Management'],
      'blog': ['Post Editor', 'Categories & Tags', 'Comments', 'Search', 'User Subscriptions'],
      'chat': ['Real-time Messaging', 'User Presence', 'Message History', 'File Sharing', 'Group Chats'],
      'dashboard': ['Data Visualization', 'Custom Widgets', 'Real-time Updates', 'Export Reports', 'User Permissions'],
    };

    let suggestedFeatures: string[] = [];
    let detectedType = '';

    for (const [type, features] of Object.entries(appTypeKeywords)) {
      if (lowerInput.includes(type)) {
        suggestedFeatures = [...suggestedFeatures, ...features];
        detectedType = type;
      }
    }

    // Detect target users
    const userPatterns = [
      /for\s+([^.!?\n]+?)(?:\s+(?:to|that|which)|\.|!|\?|$)/i,
      /targeting\s+([^.!?\n]+)/i,
      /(?:designed|meant)\s+for\s+([^.!?\n]+)/i,
    ];

    let detectedUsers = '';
    for (const pattern of userPatterns) {
      const match = input.match(pattern);
      if (match) {
        detectedUsers = match[1].trim();
        break;
      }
    }

    // Detect technical requirements
    const needsAuth = /\b(login|auth|account|user|sign\s*(?:in|up)|register)\b/i.test(lowerInput);
    const needsDatabase = /\b(save|store|persist|database|data|history|track)\b/i.test(lowerInput);
    const needsRealtime = /\b(real-?time|live|instant|sync|collaborative)\b/i.test(lowerInput);
    const needsFileUpload = /\b(upload|file|image|photo|document|attachment)\b/i.test(lowerInput);
    const needsAPI = /\b(api|integration|external|third-?party|connect)\b/i.test(lowerInput);

    return {
      extractedName,
      suggestedFeatures: [...new Set(suggestedFeatures)],
      detectedType,
      detectedUsers,
      technical: {
        needsAuth,
        needsDatabase,
        needsRealtime,
        needsFileUpload,
        needsAPI,
      },
    };
  };

  const generateRecommendations = (state: WizardState): string[] => {
    const recommendations: string[] = [];

    // Based on features
    if (state.features.some(f => f.name.toLowerCase().includes('collaborat'))) {
      if (!state.technical.needsRealtime) {
        recommendations.push('💡 Real-time updates would enhance your collaboration features');
      }
      if (!state.technical.needsAuth) {
        recommendations.push('🔐 User authentication is essential for collaboration');
      }
    }

    // Based on technical choices
    if (state.technical.needsAuth && !state.technical.needsDatabase) {
      recommendations.push('💾 You\'ll need database storage for user accounts');
    }

    if (state.features.length > 0 && state.features.length < 3) {
      recommendations.push('✨ Consider adding more features to make your app more complete');
    }

    // UI/UX recommendations
    if (state.targetUsers.toLowerCase().includes('developer') || state.targetUsers.toLowerCase().includes('technical')) {
      if (state.uiPreferences.colorScheme === 'light') {
        recommendations.push('🌙 Developers often prefer dark mode for reduced eye strain');
      }
    }

    if (state.features.length > 5 && state.uiPreferences.layout === 'single-page') {
      recommendations.push('📱 With many features, a dashboard or multi-page layout might work better');
    }

    return recommendations;
  };

  const handleUserMessage = async (input: string) => {
    if (!input.trim()) return;

    let contextInput = input;
    if (selectedElement) {
      contextInput = `[User selected ${selectedElement}] ${input}`;
    }

    // Add user message
    addMessage({ type: 'user', content: input });
    setUserInput('');

    await simulateTyping(800);

    const { currentTopic } = wizardState;

    if (currentTopic === 'initial') {
      // First message - analyze the app idea
      const analysis = analyzeUserInput(contextInput);

      const newState = { ...wizardState };

      if (analysis.extractedName) {
        newState.name = analysis.extractedName;
      }

      newState.description = input;
      newState.purpose = input;

      if (analysis.detectedUsers) {
        newState.targetUsers = analysis.detectedUsers;
      }

      if (Object.values(analysis.technical).some(v => v)) {
        newState.technical = { ...newState.technical, ...analysis.technical };
      }

      newState.currentTopic = 'basic';
      setWizardState(newState);

      let response = `Great concept! I can see you want to build `;

      if (analysis.detectedType) {
        response += `a **${analysis.detectedType}-related application**. `;
      } else {
        response += `something interesting! `;
      }

      if (analysis.suggestedFeatures.length > 0) {
        response += `\n\nBased on your description, here are some features I'd recommend:\n`;
        analysis.suggestedFeatures.slice(0, 5).forEach(feature => {
          response += `\n• **${feature}**`;
        });
        response += `\n\nWould you like to add these features, or do you have different ones in mind?`;
      } else {
        response += `\n\nWhat are the main features you envision for this app? Describe the core functionality you want users to have.`;
      }

      if (analysis.detectedUsers) {
        response += `\n\n📍 I noticed you're targeting **${analysis.detectedUsers}** - that's a great focus!`;
      }

      addMessage({
        type: 'assistant',
        content: response,
        quickActions: analysis.suggestedFeatures.length > 0 ? [
          { label: 'Add These Features', value: 'add_suggested', icon: '✅' },
          { label: 'Customize Features', value: 'customize_features', icon: '✏️' },
          { label: 'Start Fresh', value: 'custom_features', icon: '🆕' },
        ] : undefined,
      });

    } else if (currentTopic === 'basic') {
      // Collecting basic info refinements
      if (!wizardState.name && input.length < 50) {
        setWizardState(prev => ({ ...prev, name: input.trim() }));
        addMessage({
          type: 'assistant',
          content: `"**${input.trim()}**" - nice name! Now, what problem does this app solve? What value will it provide to users?`,
        });
      } else if (!wizardState.targetUsers) {
        setWizardState(prev => ({ ...prev, targetUsers: input.trim(), currentTopic: 'features' }));
        await handleFeatureDiscussion();
      } else {
        setWizardState(prev => ({ ...prev, purpose: input.trim(), currentTopic: 'features' }));
        await handleFeatureDiscussion();
      }

    } else if (currentTopic === 'features') {
      await processFeatureInput(contextInput);

    } else if (currentTopic === 'ui') {
      await processUIInput(contextInput);

    } else if (currentTopic === 'technical') {
      await processTechnicalInput(contextInput);

    } else if (currentTopic === 'review') {
      if (input.toLowerCase().includes('yes') || input.toLowerCase().includes('confirm') || input.toLowerCase().includes('done')) {
        handleComplete();
      } else {
        addMessage({
          type: 'assistant',
          content: `No problem! What would you like to adjust? You can click on any section in the summary panel to edit it, or tell me what changes you'd like to make.`,
          quickActions: [
            { label: 'Edit Features', value: 'edit_features', icon: '✨' },
            { label: 'Edit Design', value: 'edit_ui', icon: '🎨' },
            { label: 'Edit Technical', value: 'edit_technical', icon: '⚙️' },
            { label: 'Looks Good!', value: 'confirm', icon: '✅' },
          ],
        });
      }
    }
  };

  const handleFeatureDiscussion = async () => {
    const recommendations = generateRecommendations(wizardState);
    let content = `Let's define the core features. What functionality is essential for your app?\n\nYou can:\n• Describe features naturally (e.g., "users should be able to create and manage tasks")\n• List multiple features at once\n• Ask me for recommendations based on your app type`;

    if (recommendations.length > 0) {
      content += `\n\n**My Recommendations:**\n`;
      recommendations.forEach(rec => {
        content += `\n${rec}`;
      });
    }

    addMessage({
      type: 'assistant',
      content,
      quickActions: [
        { label: 'Show Common Features', value: 'show_common', icon: '📋' },
        { label: 'Continue to Design', value: 'skip_to_ui', icon: '➡️' },
      ],
    });
  };

  const processFeatureInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // Parse features from natural language
    const featureIndicators = [
      /(?:add|include|need|want|should have|must have)\s*:?\s*([^.!?\n]+)/gi,
      /•\s*([^•\n]+)/g,
      /-\s*([^-\n]+)/g,
      /\d+\.\s*([^\d\n]+)/g,
    ];

    const extractedFeatures: string[] = [];

    // Check if user wants to move on
    if (lowerInput.includes('done') || lowerInput.includes('continue') || lowerInput.includes('next') || lowerInput.includes('that\'s all')) {
      if (wizardState.features.length === 0) {
        addMessage({
          type: 'assistant',
          content: `You haven't added any features yet. Every app needs at least one core feature! What's the main thing users should be able to do?`,
          quickActions: [
            { label: 'Show Examples', value: 'show_feature_examples', icon: '💡' },
          ],
        });
        return;
      }

      setWizardState(prev => ({ ...prev, currentTopic: 'ui' }));
      setExpandedSections(prev => new Set([...prev, 'ui']));
      setActiveTab('preview'); // Switch to preview mode

      addMessage({
        type: 'assistant',
        content: `Excellent! You've defined **${wizardState.features.length} features**. Now let's talk about design.\n\nCheck out the **Preview** panel on the right! You can see your app take shape as we make decisions.\n\nWhat style best fits your app and target audience?\n\n• **Modern** - Clean lines, subtle animations, contemporary feel\n• **Minimalist** - Simple, focused, distraction-free\n• **Playful** - Fun, colorful, engaging\n• **Professional** - Business-oriented, trustworthy, formal\n\nYou can also upload reference images!`,
        quickActions: [
          { label: 'Modern ✨', value: 'style_modern', icon: '✨' },
          { label: 'Minimalist 🎯', value: 'style_minimalist', icon: '🎯' },
          { label: 'Playful 🎨', value: 'style_playful', icon: '🎨' },
          { label: 'Professional 💼', value: 'style_professional', icon: '💼' },
          { label: 'Upload Reference 🖼️', value: 'upload_ref', icon: '🖼️' },
        ],
      });
      return;
    }

    // Extract features from input
    for (const pattern of featureIndicators) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        const feature = match[1].trim();
        if (feature.length > 3 && feature.length < 100) {
          extractedFeatures.push(feature);
        }
      }
    }

    // If no patterns matched, treat the whole input as a feature description
    if (extractedFeatures.length === 0 && input.trim().length > 3) {
      extractedFeatures.push(input.trim());
    }

    // Add extracted features
    const newFeatures = extractedFeatures.map(f => ({
      id: `feature-${Date.now()}-${Math.random()}`,
      name: f.split(' ').slice(0, 4).join(' '),
      description: f,
      priority: 'high' as const,
    }));

    setWizardState(prev => ({
      ...prev,
      features: [...prev.features, ...newFeatures],
    }));

    setExpandedSections(prev => new Set([...prev, 'features']));

    if (newFeatures.length > 0) {
      let response = `I've added ${newFeatures.length} feature${newFeatures.length > 1 ? 's' : ''}:\n`;
      newFeatures.forEach(f => {
        response += `\n✅ **${f.name}**`;
      });

      // Generate smart suggestions
      const suggestions: string[] = [];
      const allFeatureText = [...wizardState.features, ...newFeatures].map(f => f.description.toLowerCase()).join(' ');

      if (!allFeatureText.includes('search') && !allFeatureText.includes('filter')) {
        suggestions.push('Search & Filter functionality');
      }
      if (!allFeatureText.includes('notification') && !allFeatureText.includes('alert')) {
        suggestions.push('Notifications system');
      }
      if (!allFeatureText.includes('export') && !allFeatureText.includes('report')) {
        suggestions.push('Export/Reports feature');
      }

      if (suggestions.length > 0 && wizardState.features.length < 5) {
        response += `\n\n💡 **You might also want:**\n`;
        suggestions.slice(0, 3).forEach(s => {
          response += `\n• ${s}`;
        });
      }

      response += `\n\nAdd more features or say "done" when you're ready to continue.`;

      addMessage({
        type: 'assistant',
        content: response,
        quickActions: [
          { label: 'Add Suggestions', value: 'add_suggestions', icon: '➕' },
          { label: 'Done with Features', value: 'features_done', icon: '✅' },
        ],
      });
    }
  };

  const processUIInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // Update UI preferences based on input
    const newPrefs = { ...wizardState.uiPreferences };

    if (lowerInput.includes('modern')) newPrefs.style = 'modern';
    else if (lowerInput.includes('minimal')) newPrefs.style = 'minimalist';
    else if (lowerInput.includes('playful')) newPrefs.style = 'playful';
    else if (lowerInput.includes('professional')) newPrefs.style = 'professional';

    if (lowerInput.includes('dark')) newPrefs.colorScheme = 'dark';
    else if (lowerInput.includes('light')) newPrefs.colorScheme = 'light';
    else if (lowerInput.includes('auto')) newPrefs.colorScheme = 'auto';

    if (lowerInput.includes('dashboard')) newPrefs.layout = 'dashboard';
    else if (lowerInput.includes('multi') || lowerInput.includes('multiple page')) newPrefs.layout = 'multi-page';
    else if (lowerInput.includes('single')) newPrefs.layout = 'single-page';

    setWizardState(prev => ({ ...prev, uiPreferences: newPrefs }));

    // Move to technical requirements
    if (lowerInput.includes('done') || lowerInput.includes('continue') || lowerInput.includes('next')) {
      setWizardState(prev => ({ ...prev, currentTopic: 'technical' }));
      setExpandedSections(prev => new Set([...prev, 'technical']));
      setActiveTab('summary'); // Switch back to summary for final review

      const techRecommendations: string[] = [];

      if (wizardState.features.some(f => f.description.toLowerCase().includes('user') || f.description.toLowerCase().includes('account'))) {
        techRecommendations.push('🔐 **Authentication** - Your features suggest user accounts');
      }
      if (wizardState.features.some(f => f.description.toLowerCase().includes('save') || f.description.toLowerCase().includes('track'))) {
        techRecommendations.push('💾 **Database** - You\'ll need to persist data');
      }

      let content = `Now for the technical foundation. What does your app need?\n\n`;

      if (techRecommendations.length > 0) {
        content += `**Based on your features, I recommend:**\n`;
        techRecommendations.forEach(rec => {
          content += `\n${rec}`;
        });
        content += `\n\n`;
      }

      content += `Select what applies:\n• User Authentication (login/accounts)\n• Database Storage (persist data)\n• External API Integration\n• File Upload Support\n• Real-time Updates`;

      addMessage({
        type: 'assistant',
        content,
        quickActions: [
          { label: '🔐 Auth', value: 'tech_auth', icon: '🔐' },
          { label: '💾 Database', value: 'tech_db', icon: '💾' },
          { label: '🔌 API', value: 'tech_api', icon: '🔌' },
          { label: '📤 Files', value: 'tech_files', icon: '📤' },
          { label: '⚡ Realtime', value: 'tech_realtime', icon: '⚡' },
          { label: 'Continue ➡️', value: 'tech_done', icon: '➡️' },
        ],
      });
    } else {
      // Ask about color scheme and layout
      addMessage({
        type: 'assistant',
        content: `Great choice! **${newPrefs.style}** style it is.\n\nWhat about:\n\n**Color Scheme:**\n• Light - Bright and clean\n• Dark - Easy on the eyes\n• Auto - Adapts to user preference\n\n**Layout:**\n• Single Page - Everything on one scroll\n• Multi-Page - Separate pages with navigation\n• Dashboard - Sidebar with panels`,
        quickActions: [
          { label: 'Light ☀️', value: 'color_light', icon: '☀️' },
          { label: 'Dark 🌙', value: 'color_dark', icon: '🌙' },
          { label: 'Auto 🔄', value: 'color_auto', icon: '🔄' },
          { label: 'Upload Reference 🖼️', value: 'upload_ref', icon: '🖼️' },
        ],
      });
    }
  };

  const processTechnicalInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    const newTech = { ...wizardState.technical };

    if (lowerInput.includes('auth') || lowerInput.includes('login')) newTech.needsAuth = true;
    if (lowerInput.includes('database') || lowerInput.includes('storage') || lowerInput.includes('data')) newTech.needsDatabase = true;
    if (lowerInput.includes('api') || lowerInput.includes('integration')) newTech.needsAPI = true;
    if (lowerInput.includes('file') || lowerInput.includes('upload')) newTech.needsFileUpload = true;
    if (lowerInput.includes('realtime') || lowerInput.includes('real-time') || lowerInput.includes('live')) newTech.needsRealtime = true;

    setWizardState(prev => ({ ...prev, technical: newTech }));

    if (lowerInput.includes('done') || lowerInput.includes('continue') || lowerInput.includes('next') || lowerInput === '') {
      // Move to review
      setWizardState(prev => ({ ...prev, currentTopic: 'review' }));
      setExpandedSections(prev => new Set([...prev, 'basic', 'features', 'ui', 'technical']));

      addMessage({
        type: 'assistant',
        content: `Excellent! Your app concept is complete! 🎉\n\nPlease review the summary on the right panel. Everything look good?\n\nYou can:\n• Click sections to edit\n• Tell me what to change\n• Confirm to generate your implementation plan`,
        quickActions: [
          { label: '🚀 Generate Plan', value: 'confirm', icon: '🚀' },
          { label: '✏️ Make Changes', value: 'edit', icon: '✏️' },
        ],
      });
    } else {
      const selectedItems: string[] = [];
      if (newTech.needsAuth) selectedItems.push('Authentication');
      if (newTech.needsDatabase) selectedItems.push('Database');
      if (newTech.needsAPI) selectedItems.push('API Integration');
      if (newTech.needsFileUpload) selectedItems.push('File Upload');
      if (newTech.needsRealtime) selectedItems.push('Real-time Updates');

      addMessage({
        type: 'assistant',
        content: `Got it! I've noted: **${selectedItems.join(', ')}**\n\nAnything else, or ready to continue?`,
        quickActions: [
          { label: 'Continue to Review', value: 'tech_done', icon: '➡️' },
          { label: 'Add More', value: 'tech_more', icon: '➕' },
        ],
      });
    }
  };

  const handleQuickAction = async (value: string) => {
    setUserInput('');

    if (value === 'upload_ref') {
      fileInputRef.current?.click();
      return;
    }

    if (value === 'add_suggested') {
      const analysis = analyzeUserInput(wizardState.description);
      const newFeatures = analysis.suggestedFeatures.map(f => ({
        id: `feature-${Date.now()}-${Math.random()}`,
        name: f,
        description: f,
        priority: 'high' as const,
      }));

      setWizardState(prev => ({
        ...prev,
        features: [...prev.features, ...newFeatures],
        currentTopic: 'features',
      }));
      setExpandedSections(prev => new Set([...prev, 'features']));

      addMessage({ type: 'user', content: 'Add these features' });
      await simulateTyping(500);

      addMessage({
        type: 'assistant',
        content: `I've added all ${newFeatures.length} suggested features. You can adjust priorities or add custom features.\n\nWhat else should your app be able to do? Or say "done" to continue.`,
        quickActions: [
          { label: 'Add More Features', value: 'more_features', icon: '➕' },
          { label: 'Continue to Design', value: 'features_done', icon: '➡️' },
        ],
      });
    } else if (value === 'features_done' || value === 'skip_to_ui') {
      handleUserMessage('done with features');
    } else if (value.startsWith('style_')) {
      const style = value.replace('style_', '');
      handleUserMessage(style);
    } else if (value.startsWith('color_')) {
      const color = value.replace('color_', '');
      setWizardState(prev => ({
        ...prev,
        uiPreferences: { ...prev.uiPreferences, colorScheme: color as UIPreferences['colorScheme'] },
      }));
      handleUserMessage(`${color} theme, continue`);
    } else if (value.startsWith('tech_')) {
      const tech = value.replace('tech_', '');
      if (tech === 'done') {
        handleUserMessage('continue');
      } else {
        handleUserMessage(tech);
      }
    } else if (value === 'confirm') {
      handleComplete();
    } else if (value === 'edit') {
      handleUserMessage('I want to make changes');
    }
  };

  const handleComplete = () => {
    const concept: AppConcept = {
      name: wizardState.name || 'My App',
      description: wizardState.description,
      purpose: wizardState.purpose,
      targetUsers: wizardState.targetUsers,
      coreFeatures: wizardState.features,
      uiPreferences: wizardState.uiPreferences,
      technical: wizardState.technical,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Clear draft on successful completion
    autoSaver.current.delete();
    onComplete(concept);
  };

  const handleCancel = () => {
    if (messages.length > 1 || wizardState.features.length > 0) {
      if (confirm('You have unsaved progress. Your conversation has been auto-saved. Exit anyway?')) {
        onCancel();
      }
    } else {
      autoSaver.current.delete();
      onCancel();
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const updateFeaturePriority = (id: string, priority: 'high' | 'medium' | 'low') => {
    setWizardState(prev => ({
      ...prev,
      features: prev.features.map(f => f.id === id ? { ...f, priority } : f),
    }));
  };

  const removeFeature = (id: string) => {
    setWizardState(prev => ({
      ...prev,
      features: prev.features.filter(f => f.id !== id),
    }));
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    if (wizardState.name) completed += 20;
    if (wizardState.description) completed += 15;
    if (wizardState.purpose) completed += 15;
    if (wizardState.features.length > 0) completed += 25;
    if (wizardState.uiPreferences.style) completed += 15;
    if (Object.values(wizardState.technical).some(v => v === true)) completed += 10;
    return Math.min(completed, 100);
  };

  return (
    <>
      {/* File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={handleFileUpload}
      />

      {/* Draft Resume Prompt */}
      {showDraftPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[101] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-3">Resume Your Conversation?</h3>
            <p className="text-slate-400 mb-4">
              You have a saved conversation from{' '}
              {formatDraftAge(autoSaver.current.getMetadata()?.timestamp || '')}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={discardDraft}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
              >
                Start Fresh
              </button>
              <button
                onClick={loadDraft}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-7xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧙‍♂️</span>
              <h2 className="text-xl font-bold text-white">App Planning Assistant</h2>
              <div className="ml-4 flex items-center gap-2">
                <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${getCompletionPercentage()}%` }}
                  />
                </div>
                <span className="text-sm text-slate-400">{getCompletionPercentage()}%</span>
              </div>
              {lastSaved && (
                <span className="text-xs text-slate-500 ml-2">
                  Saved {formatDraftAge(lastSaved)}
                </span>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Main Content - Split Panel */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Chat */}
            <div className="w-3/5 flex flex-col border-r border-white/10">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 1 && !userInput && (
                  <div className="mb-4">
                    <ExamplePrompts
                      onSelect={(text) => {
                        setUserInput(text);
                        inputRef.current?.focus();
                      }}
                      variant="chips"
                      maxDisplay={5}
                    />
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : ''}`}>
                      {message.type === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🤖</span>
                          <span className="text-xs text-slate-400">Assistant</span>
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-2xl ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white/10 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </div>
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.attachments.map((attachment, i) => (
                              <div key={i} className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/20">
                                <img src={attachment} alt="Attachment" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.quickActions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.quickActions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => handleQuickAction(action.value)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-slate-300 transition-all flex items-center gap-1.5"
                            >
                              {action.icon && <span>{action.icon}</span>}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl rounded-bl-none p-4">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                   <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                    title="Upload Image"
                  >
                    🖼️
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleUserMessage(userInput);
                      }
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleUserMessage(userInput)}
                    disabled={!userInput.trim() || isTyping}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Summary/Preview */}
            <div className="w-2/5 flex flex-col bg-slate-950/50">
              {/* Tabs */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    activeTab === 'summary' ? 'bg-white/5 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 py-3 text-sm font-medium transition-all ${
                    activeTab === 'preview' ? 'bg-white/5 text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Preview
                </button>
              </div>

              {activeTab === 'summary' ? (
                <div className="flex-1 overflow-y-auto p-6">
                   {/* Existing Summary Content */}
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('basic')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span>📱</span>
                          <span className="font-medium text-white">Basic Information</span>
                          {wizardState.name && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">✓</span>
                          )}
                        </div>
                        <span className="text-slate-400">{expandedSections.has('basic') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.has('basic') && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                          <div>
                            <label className="text-xs text-slate-400">App Name</label>
                            <p className="text-white font-medium">{wizardState.name || <span className="text-slate-500 italic">Not set</span>}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Description</label>
                            <p className="text-sm text-slate-300">{wizardState.description || <span className="text-slate-500 italic">Not set</span>}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Purpose</label>
                            <p className="text-sm text-slate-300">{wizardState.purpose || <span className="text-slate-500 italic">Not set</span>}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Target Users</label>
                            <p className="text-sm text-slate-300">{wizardState.targetUsers || <span className="text-slate-500 italic">Not set</span>}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('features')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span>✨</span>
                          <span className="font-medium text-white">Features</span>
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                            {wizardState.features.length}
                          </span>
                        </div>
                        <span className="text-slate-400">{expandedSections.has('features') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.has('features') && (
                        <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                          {wizardState.features.length === 0 ? (
                            <p className="text-slate-500 italic text-sm">No features added yet</p>
                          ) : (
                            wizardState.features.map((feature, index) => (
                              <div key={feature.id} className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{index + 1}.</span>
                                    <span className="font-medium text-white text-sm">{feature.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={feature.priority}
                                      onChange={(e) => updateFeaturePriority(feature.id, e.target.value as 'high' | 'medium' | 'low')}
                                      className="text-xs bg-transparent border border-white/20 rounded px-1 py-0.5 text-slate-300"
                                    >
                                      <option value="high">High</option>
                                      <option value="medium">Medium</option>
                                      <option value="low">Low</option>
                                    </select>
                                    <button
                                      onClick={() => removeFeature(feature.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400">{feature.description}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* UI Preferences */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('ui')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span>🎨</span>
                          <span className="font-medium text-white">Design</span>
                        </div>
                        <span className="text-slate-400">{expandedSections.has('ui') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.has('ui') && (
                        <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <label className="text-xs text-slate-400">Style</label>
                              <p className="text-white capitalize">{wizardState.uiPreferences.style}</p>
                            </div>
                            <div>
                              <label className="text-xs text-slate-400">Theme</label>
                              <p className="text-white capitalize">{wizardState.uiPreferences.colorScheme}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-slate-400">Layout</label>
                              <p className="text-white capitalize">{wizardState.uiPreferences.layout.replace('-', ' ')}</p>
                            </div>
                            {/* Reference Media */}
                            {wizardState.uiPreferences.referenceMedia && wizardState.uiPreferences.referenceMedia.length > 0 && (
                              <div className="col-span-2 mt-2">
                                <label className="text-xs text-slate-400">References</label>
                                <div className="flex gap-2 mt-1 overflow-x-auto">
                                  {wizardState.uiPreferences.referenceMedia.map((media, i) => (
                                    <div key={i} className="w-12 h-12 rounded border border-white/20 overflow-hidden shrink-0">
                                      <img src={media.url} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Technical */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSection('technical')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span>⚙️</span>
                          <span className="font-medium text-white">Technical</span>
                        </div>
                        <span className="text-slate-400">{expandedSections.has('technical') ? '▼' : '▶'}</span>
                      </button>
                      {expandedSections.has('technical') && (
                        <div className="px-4 pb-4 border-t border-white/10 pt-3">
                          <div className="flex flex-wrap gap-2">
                            {wizardState.technical.needsAuth && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">🔐 Auth</span>
                            )}
                            {wizardState.technical.needsDatabase && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">💾 Database</span>
                            )}
                            {wizardState.technical.needsAPI && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">🔌 API</span>
                            )}
                            {wizardState.technical.needsFileUpload && (
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs">📤 Files</span>
                            )}
                            {wizardState.technical.needsRealtime && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">⚡ Realtime</span>
                            )}
                            {!Object.values(wizardState.technical).some(v => v === true) && (
                              <span className="text-slate-500 italic text-sm">No requirements selected</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Complete Button */}
                  {getCompletionPercentage() >= 50 && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <button
                        onClick={handleComplete}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <span>🚀</span>
                        <span>Generate Implementation Plan</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-hidden bg-slate-900 relative">
                  <div className="absolute inset-0 p-4">
                     <div className="h-full border border-white/10 rounded-2xl overflow-hidden">
                        <LayoutPreview 
                          key={previewKey} 
                          preferences={wizardState.uiPreferences} 
                          concept={{
                            name: wizardState.name,
                            description: wizardState.description,
                            purpose: wizardState.purpose,
                            coreFeatures: wizardState.features
                          }}
                          onPreferenceChange={(newPrefs) => {
                            setWizardState(prev => ({
                              ...prev,
                              uiPreferences: { ...prev.uiPreferences, ...newPrefs }
                            }));
                          }}
                          selectedElement={selectedElement}
                          onElementSelect={setSelectedElement}
                        />
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
