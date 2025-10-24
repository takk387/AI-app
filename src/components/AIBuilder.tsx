"use client";

import React, { useState, useEffect, useRef } from 'react';
import CodePreview from './CodePreview';
import FullAppPreview from './FullAppPreview';
import { exportAppAsZip, downloadBlob, parseAppFiles, getDeploymentInstructions, type DeploymentInstructions } from '../utils/exportApp';

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

interface GeneratedComponent {
  id: string;
  name: string;
  code: string;
  description: string;
  timestamp: string;
  isFavorite: boolean;
  conversationHistory: ChatMessage[];
  versions?: AppVersion[]; // Version history
}

interface PendingChange {
  id: string;
  changeDescription: string;
  newCode: string;
  timestamp: string;
}

export default function AIBuilder() {
  // Core state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [currentComponent, setCurrentComponent] = useState<GeneratedComponent | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Image upload for AI-inspired designs
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // App library/history
  const [components, setComponents] = useState<GeneratedComponent[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<AppVersion | null>(null);
  
  // Tab controls
  const [activeTab, setActiveTab] = useState<'chat' | 'preview' | 'code'>('chat');
  
  // Change approval system
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  
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

  // Ref for auto-scrolling chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true);
    // Set welcome message only on client
    setChatMessages([{
      id: 'welcome',
      role: 'system',
      content: "👋 Hi! I'm your AI App Builder. Tell me what app you want to create, and I'll build it for you through conversation.\n\n🔒 **Smart Change Protection**:\n• **New apps** → Created instantly\n• **Minor changes** (bug fixes, tweaks) → Applied automatically ✨\n• **Major changes** (new features, UI redesigns) → Require your approval ⚠️\n\n🕒 **Version History**:\n• Every change is automatically saved\n• View all previous versions anytime\n• One-click revert to any past version\n• Never lose your work!\n\nWhat would you like to build today?",
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

  // Load components from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai_components');
      if (stored) {
        try {
          setComponents(JSON.parse(stored));
        } catch (e) {
          console.error('Error loading components:', e);
        }
      }
    }
  }, []);

  // Save components to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && components.length > 0) {
      localStorage.setItem('ai_components', JSON.stringify(components));
    }
  }, [components]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    reader.readAsDataURL(file);
  };

  // Remove uploaded image
  const removeImage = () => {
    setUploadedImage(null);
    setImageFile(null);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;

    // Detect if this is a question or an app build request
    const questionIndicators = [
      'what', 'how', 'why', 'when', 'where', 'who', 'which',
      'explain', 'tell me', 'can you', 'could you', 'would you',
      'should i', 'is it', 'are there', 'do i', 'does',
      '?', 'help me understand', 'difference between'
    ];
    
    const buildIndicators = [
      'build', 'create', 'make', 'generate', 'design',
      'develop', 'code', 'write', 'implement', 'add feature'
    ];
    
    const input = userInput.toLowerCase();
    const isQuestion = questionIndicators.some(indicator => input.includes(indicator)) &&
                      !buildIndicators.some(indicator => input.includes(indicator));
    
    // Detect potentially very large app requests and provide guidance
    const complexityIndicators = [
      'complete', 'full-featured', 'comprehensive', 'all features',
      'everything', 'entire', 'full', 'advanced', 'complex',
      'with authentication', 'with backend', 'with database',
      'multiple pages', 'full stack', 'production-ready'
    ];
    
    const wordCount = userInput.split(' ').length;
    const hasComplexityIndicators = complexityIndicators.some(indicator => 
      input.includes(indicator)
    );
    
    // If request seems very complex, add a helpful note
    if ((wordCount > 50 || hasComplexityIndicators) && !currentComponent && !isQuestion) {
      const helpMessage: ChatMessage = {
        id: Date.now().toString() + '_help',
        role: 'system',
        content: "💡 **Tip**: I'll build a working app with core features. For very large apps, I can generate the foundation first, then you can request additional features in follow-up messages. This ensures everything works perfectly!",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, helpMessage]);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);
    
    // Different progress messages for questions vs app building
    const progressMessages = isQuestion ? [
      '🤔 Thinking about your question...',
      '📚 Gathering information...',
      '✍️ Formulating answer...'
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
      // Route to appropriate endpoint based on intent
      const endpoint = isQuestion ? '/api/chat' : '/api/ai-builder/full-app';
      
      // Prepare the request body
      const requestBody: any = isQuestion ? {
        // For Q&A: just prompt and history
        prompt: userInput,
        conversationHistory: chatMessages.slice(-5)
      } : {
        // For app building: include modification context
        prompt: userInput,
        conversationHistory: chatMessages.slice(-5),
        isModification: currentComponent !== null,
        currentAppName: currentComponent?.name
      };

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
        console.log('=== Full App Response ===');
        console.log('App name:', data.name);
        console.log('Files:', data.files?.length);
        console.log('Change type:', data.changeType);
        
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
              id: isModification ? currentComponent.id : Date.now().toString(),
              name: data.name || extractComponentName(userInput),
              code: JSON.stringify(data, null, 2),
              description: userInput,
              timestamp: new Date().toISOString(),
              isFavorite: isModification ? currentComponent.isFavorite : false,
              conversationHistory: [...chatMessages, userMessage, aiAppMessage],
              versions: isModification ? currentComponent.versions : []
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
    setSelectedVersion(null);
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
      id: Date.now().toString(),
      name: `${sourceApp.name} - Fork`,
      code: codeToFork,
      description: sourceApp.description + descriptionSuffix,
      timestamp: new Date().toISOString(),
      isFavorite: false,
      conversationHistory: [],
      versions: [{
        id: Date.now().toString(),
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
    setComponents(prev =>
      prev.map(comp =>
        comp.id === id ? { ...comp, isFavorite: !comp.isFavorite } : comp
      )
    );
  };

  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    
    // If deleting the currently loaded component, clear it
    if (currentComponent?.id === id) {
      setCurrentComponent(null);
      setChatMessages([]);
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

  const filteredComponents = components.filter(comp =>
    searchQuery === '' ||
    comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comp.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prevent hydration errors by only rendering after client mount
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI App Builder</h1>
                <p className="text-xs text-slate-400">Build complete apps through conversation</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {currentComponent && currentComponent.versions && currentComponent.versions.length > 0 && (
                <button
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm text-slate-300 hover:text-white flex items-center gap-2"
                >
                  <span>🕒</span>
                  <span className="hidden sm:inline">History</span>
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {currentComponent.versions.length}
                  </span>
                </button>
              )}
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm text-slate-300 hover:text-white flex items-center gap-2"
              >
                <span>📂</span>
                <span className="hidden sm:inline">My Apps</span>
                {components.length > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {components.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chat/Conversation Panel - Left Side */}
          <div className="lg:col-span-5">
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-black/20">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Conversation</span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Tell me what to build or how to improve it
                </p>
              </div>

              {/* Chat Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.role === 'system'
                          ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                          : 'bg-white/10 text-slate-200 border border-white/10'
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
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isGenerating}
                    />
                  </label>

                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Describe what you want to build or change..."
                    disabled={isGenerating}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isGenerating || (!userInput.trim() && !uploadedImage)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                  >
                    {isGenerating ? '⏳' : '🚀'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview/Code Panel - Right Side */}
          <div className="lg:col-span-7">
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              {/* Tabs */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10 bg-black/20">
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
              <div className="p-6">
                {!currentComponent ? (
                  <div className="h-[calc(100vh-300px)] flex flex-col items-center justify-center text-center">
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
                    {/* Component Info */}
                    <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {currentComponent.name}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {currentComponent.description}
                      </p>
                    </div>

                    {activeTab === 'preview' && (
                      <div>
                        <FullAppPreview appDataJson={currentComponent.code} />
                      </div>
                    )}

                    {activeTab === 'code' && (
                      <div className="min-h-[500px]">
                        <CodePreview code={currentComponent.code} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
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
                  <span>My Apps</span>
                  <span className="text-sm font-normal text-slate-400">
                    ({components.length})
                  </span>
                </h2>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all"
                >
                  <span className="text-slate-400 text-xl">✕</span>
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Library Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredComponents.length === 0 ? (
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
    </div>
  );
}
