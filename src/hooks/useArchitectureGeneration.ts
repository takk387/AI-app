import { useState, useCallback } from 'react';
import type { AppConcept, TechnicalRequirements, UIPreferences } from '@/types/appConcept';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import type { LayoutManifest } from '@/types/schema';

/**
 * Architecture generation hook for wizard components
 * Handles generating backend architecture before phase generation
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Array<{ name: string; description?: string; priority: 'high' | 'medium' | 'low' }>;
  technical: Partial<TechnicalRequirements>;
  uiPreferences: Partial<UIPreferences>;
  roles?: Array<{ name: string; capabilities: string[] }>;
  workflows?: Array<{
    name: string;
    description?: string;
    steps: string[];
    involvedRoles: string[];
  }>;
  isComplete: boolean;
  readyForPhases: boolean;
}

interface UseArchitectureGenerationOptions {
  wizardState: WizardState;
  importedLayoutManifest: LayoutManifest | null;
  onShowToast: (opts: { type: 'success' | 'info' | 'error'; message: string }) => void;
  onAddMessage: (message: Message) => void;
  // Callback when architecture generation completes successfully
  onArchitectureComplete?: (spec: ArchitectureSpec) => void;
}

interface UseArchitectureGenerationReturn {
  architectureSpec: ArchitectureSpec | null;
  isGeneratingArchitecture: boolean;
  architectureError: string | null;
  generateArchitecture: () => Promise<ArchitectureSpec | null>;
  clearArchitecture: () => void;
  needsBackend: boolean;
}

export function useArchitectureGeneration({
  wizardState,
  importedLayoutManifest,
  onShowToast,
  onAddMessage,
  onArchitectureComplete,
}: UseArchitectureGenerationOptions): UseArchitectureGenerationReturn {
  const [architectureSpec, setArchitectureSpec] = useState<ArchitectureSpec | null>(null);
  const [isGeneratingArchitecture, setIsGeneratingArchitecture] = useState(false);
  const [architectureError, setArchitectureError] = useState<string | null>(null);

  // Check if backend is needed based on technical requirements
  const needsBackend =
    !!wizardState.technical.needsAuth ||
    !!wizardState.technical.needsDatabase ||
    !!wizardState.technical.needsRealtime ||
    !!wizardState.technical.needsFileUpload;

  /**
   * Generate architecture specification using BackendArchitectureAgent
   */
  const generateArchitecture = useCallback(async (): Promise<ArchitectureSpec | null> => {
    if (!wizardState.name) {
      onShowToast({ type: 'error', message: 'Please provide an app name first' });
      return null;
    }

    if (wizardState.features.length === 0) {
      onShowToast({ type: 'error', message: 'Please define at least one feature first' });
      return null;
    }

    if (!needsBackend) {
      onShowToast({ type: 'info', message: 'No backend requirements detected' });
      return null;
    }

    setIsGeneratingArchitecture(true);
    setArchitectureError(null);

    // Add generating message to chat
    const generatingMessage: Message = {
      id: `arch-generating-${Date.now()}`,
      role: 'assistant',
      content:
        "🏗️ **Analyzing Backend Architecture...**\n\nI'm designing the optimal database schema, API routes, and authentication strategy for your app.",
      timestamp: new Date(),
    };
    onAddMessage(generatingMessage);

    try {
      // Build the AppConcept from wizard state
      const concept: AppConcept = {
        name: wizardState.name,
        description: wizardState.description || '',
        purpose: wizardState.purpose || '',
        targetUsers: wizardState.targetUsers || '',
        coreFeatures: wizardState.features.map((f, idx) => ({
          id: `feature-${idx}`,
          name: f.name,
          description: f.description || '',
          priority: f.priority,
        })),
        uiPreferences: wizardState.uiPreferences as UIPreferences,
        technical: wizardState.technical as TechnicalRequirements,
        roles: wizardState.roles?.map((r) => ({
          name: r.name,
          capabilities: r.capabilities,
          permissions: [],
        })),
        workflows: wizardState.workflows,
        layoutManifest: importedLayoutManifest || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/wizard/generate-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Architecture generation failed');
      }

      if (!data.architectureSpec) {
        throw new Error('No architecture specification returned');
      }

      setArchitectureSpec(data.architectureSpec);

      // Add success message to chat with summary
      const successMessage: Message = {
        id: `arch-success-${Date.now()}`,
        role: 'assistant',
        content: formatArchitectureMessage(data.architectureSpec, data.reasoning),
        timestamp: new Date(),
      };
      onAddMessage(successMessage);

      onShowToast({ type: 'success', message: 'Backend architecture generated!' });

      // Call completion callback to trigger next step (e.g., phase generation)
      if (onArchitectureComplete) {
        onArchitectureComplete(data.architectureSpec);
      }

      return data.architectureSpec;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setArchitectureError(errorMessage);

      // Add error message to chat
      const errorChatMessage: Message = {
        id: `arch-error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Architecture Generation Failed**\n\n${errorMessage}\n\nYou can try again or proceed without architecture analysis.`,
        timestamp: new Date(),
      };
      onAddMessage(errorChatMessage);

      onShowToast({ type: 'error', message: `Architecture generation failed: ${errorMessage}` });

      return null;
    } finally {
      setIsGeneratingArchitecture(false);
    }
  }, [
    wizardState,
    importedLayoutManifest,
    needsBackend,
    onShowToast,
    onAddMessage,
    onArchitectureComplete,
  ]);

  /**
   * Clear the architecture specification
   */
  const clearArchitecture = useCallback(() => {
    setArchitectureSpec(null);
    setArchitectureError(null);
  }, []);

  return {
    architectureSpec,
    isGeneratingArchitecture,
    architectureError,
    generateArchitecture,
    clearArchitecture,
    needsBackend,
  };
}

/**
 * Format architecture specification as a chat message
 */
function formatArchitectureMessage(
  spec: ArchitectureSpec,
  reasoning?: {
    summary: string;
    decisions: Array<{ area: string; decision: string; reasoning: string }>;
  }
): string {
  const parts: string[] = ['✅ **Backend Architecture Designed!**\n'];

  // Summary
  if (reasoning?.summary) {
    parts.push(`${reasoning.summary}\n`);
  }

  // Database schema summary
  if (spec.database?.tables && spec.database.tables.length > 0) {
    parts.push(`### 📊 Database Schema`);
    parts.push(`**${spec.database.tables.length} tables** designed:\n`);
    spec.database.tables.slice(0, 5).forEach((table) => {
      parts.push(`- **${table.name}**: ${table.fields?.length || 0} fields`);
    });
    if (spec.database.tables.length > 5) {
      parts.push(`- _...and ${spec.database.tables.length - 5} more tables_`);
    }
    parts.push('');
  }

  // API routes summary
  if (spec.api?.routes && spec.api.routes.length > 0) {
    parts.push(`### 🔌 API Routes`);
    parts.push(`**${spec.api.routes.length} endpoints** planned:\n`);
    spec.api.routes.slice(0, 5).forEach((route) => {
      parts.push(`- \`${route.method} ${route.path}\`: ${route.description || 'No description'}`);
    });
    if (spec.api.routes.length > 5) {
      parts.push(`- _...and ${spec.api.routes.length - 5} more routes_`);
    }
    parts.push('');
  }

  // Auth summary
  if (spec.auth) {
    parts.push(`### 🔐 Authentication`);
    parts.push(`- **Strategy**: ${spec.auth.strategy || 'NextAuth.js'}`);
    if (spec.auth.providers && spec.auth.providers.length > 0) {
      const providerNames = spec.auth.providers.map((p) => p.provider || p.type);
      parts.push(`- **Providers**: ${providerNames.join(', ')}`);
    }
    if (spec.auth.rbac?.roles && spec.auth.rbac.roles.length > 0) {
      parts.push(`- **Roles**: ${spec.auth.rbac.roles.map((r) => r.name).join(', ')}`);
    }
    parts.push('');
  }

  // Key decisions
  if (reasoning?.decisions && reasoning.decisions.length > 0) {
    parts.push(`### 💡 Key Decisions`);
    reasoning.decisions.slice(0, 3).forEach((d) => {
      parts.push(`- **${d.area}**: ${d.decision}`);
    });
    parts.push('');
  }

  parts.push('---');
  parts.push(
    'Review the architecture in the side panel, then click **"Proceed to Phases"** to continue.'
  );

  return parts.join('\n');
}
