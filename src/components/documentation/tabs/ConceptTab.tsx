'use client';

/**
 * ConceptTab - Displays comprehensive app concept summary
 * Including architecture, workflows, roles with permissions, and full conversation context
 */

import React, { useState } from 'react';
import {
  TargetIcon,
  ZapIcon,
  SettingsIcon,
  GitBranchIcon,
  CubeIcon,
  CodeIcon,
  PaletteIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/ui/Icons';
import type { ConceptSnapshot } from '@/types/projectDocumentation';

interface ConceptTabProps {
  snapshot: ConceptSnapshot;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-zinc-400">{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    high: 'bg-error-500/20 text-error-400',
    medium: 'bg-warning-500/20 text-warning-400',
    low: 'bg-success-500/20 text-success-400',
  };

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs font-medium ${config[priority] || config.medium}`}
    >
      {priority}
    </span>
  );
}

export function ConceptTab({ snapshot }: ConceptTabProps) {
  return (
    <div className="p-4">
      {/* App Name & Description */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-2">{snapshot.name}</h2>
        {snapshot.description && <p className="text-zinc-400 text-sm">{snapshot.description}</p>}
        <div className="text-xs text-zinc-600 mt-2">
          Source: {snapshot.source} | Captured: {new Date(snapshot.capturedAt).toLocaleString()}
        </div>
      </div>

      {/* Purpose */}
      {snapshot.purpose && (
        <Section icon={<TargetIcon size={16} />} title="Purpose">
          <p className="text-zinc-300 text-sm">{snapshot.purpose}</p>
        </Section>
      )}

      {/* Target Users */}
      {snapshot.targetUsers && (
        <Section icon={<TargetIcon size={16} />} title="Target Users">
          <p className="text-zinc-300 text-sm">{snapshot.targetUsers}</p>
        </Section>
      )}

      {/* Features */}
      {snapshot.features && snapshot.features.length > 0 && (
        <Section icon={<ZapIcon size={16} />} title="Features">
          <ul className="space-y-2">
            {snapshot.features.map((feature, index) => (
              <li key={feature.id || index} className="flex items-start gap-2 text-sm">
                <span className="text-zinc-600 mt-0.5">{index + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-medium">{feature.name}</span>
                    <PriorityBadge priority={feature.priority} />
                  </div>
                  {feature.description && (
                    <p className="text-zinc-500 text-xs mt-0.5">{feature.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Technical Requirements */}
      <Section icon={<SettingsIcon size={16} />} title="Technical Requirements">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'needsAuth', label: 'Authentication' },
            { key: 'needsDatabase', label: 'Database' },
            { key: 'needsAPI', label: 'API Integration' },
            { key: 'needsFileUpload', label: 'File Upload' },
            { key: 'needsRealtime', label: 'Real-time' },
          ].map(({ key, label }) => {
            const value = snapshot.technical[key as keyof typeof snapshot.technical];
            return (
              <div
                key={key}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  value ? 'bg-success-500/10 text-success-400' : 'bg-zinc-800/50 text-zinc-500'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${value ? 'bg-success-400' : 'bg-zinc-600'}`}
                />
                {label}
              </div>
            );
          })}
        </div>
        {snapshot.technical.authType && (
          <div className="mt-2 text-xs text-zinc-500">Auth Type: {snapshot.technical.authType}</div>
        )}
      </Section>

      {/* Roles with Capabilities AND Permissions */}
      {snapshot.roles && snapshot.roles.length > 0 && (
        <Section icon={<TargetIcon size={16} />} title="User Roles">
          <div className="space-y-2">
            {snapshot.roles.map((role, index) => (
              <div key={index} className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-sm font-medium text-zinc-200">{role.name}</div>
                {role.capabilities && role.capabilities.length > 0 && (
                  <div className="mt-1">
                    <div className="text-xs text-zinc-500 mb-1">Capabilities:</div>
                    <div className="flex flex-wrap gap-1">
                      {role.capabilities.map((cap, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs text-zinc-400"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {role.permissions && role.permissions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-zinc-500 mb-1">Permissions:</div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Workflows with descriptions and involved roles */}
      {snapshot.workflows && snapshot.workflows.length > 0 && (
        <Section icon={<GitBranchIcon size={16} />} title="Workflows">
          <div className="space-y-3">
            {snapshot.workflows.map((workflow, index) => (
              <div key={index} className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-sm font-medium text-zinc-200">{workflow.name}</div>
                {workflow.description && (
                  <p className="text-xs text-zinc-500 mt-1">{workflow.description}</p>
                )}
                {workflow.involvedRoles && workflow.involvedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {workflow.involvedRoles.map((role, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-1 mt-2">
                  {workflow.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-600 mt-0.5">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Architecture Section - NEW */}
      {snapshot.architectureSpec && (
        <Section icon={<CubeIcon size={16} />} title="Backend Architecture">
          <div className="space-y-3">
            {/* Database */}
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-xs font-medium text-zinc-300 mb-1">Database</div>
              <div className="text-xs text-zinc-400">
                Strategy:{' '}
                <span className="text-zinc-300">
                  {snapshot.architectureSpec.database?.strategy || 'Not specified'}
                </span>
              </div>
              {snapshot.architectureSpec.database?.tables &&
                snapshot.architectureSpec.database.tables.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-zinc-500">Tables: </span>
                    <span className="text-xs text-zinc-400">
                      {snapshot.architectureSpec.database.tables.map((t) => t.name).join(', ')}
                    </span>
                  </div>
                )}
            </div>

            {/* API */}
            {snapshot.architectureSpec.api && (
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-xs font-medium text-zinc-300 mb-1">API</div>
                <div className="text-xs text-zinc-400">
                  Style:{' '}
                  <span className="text-zinc-300">
                    {snapshot.architectureSpec.api.style || 'REST'}
                  </span>
                </div>
                {snapshot.architectureSpec.api.routes &&
                  snapshot.architectureSpec.api.routes.length > 0 && (
                    <div className="mt-1 text-xs text-zinc-500">
                      {snapshot.architectureSpec.api.routes.length} API routes defined
                    </div>
                  )}
              </div>
            )}

            {/* Auth */}
            {snapshot.architectureSpec.auth && (
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-xs font-medium text-zinc-300 mb-1">Authentication</div>
                <div className="text-xs text-zinc-400">
                  Strategy:{' '}
                  <span className="text-zinc-300">{snapshot.architectureSpec.auth.strategy}</span>
                </div>
                {snapshot.architectureSpec.auth.rbac?.roles && (
                  <div className="mt-1 text-xs text-zinc-500">
                    {snapshot.architectureSpec.auth.rbac.roles.length} roles configured
                  </div>
                )}
              </div>
            )}

            {/* Features summary */}
            <div className="flex flex-wrap gap-2">
              {snapshot.architectureSpec.realtime && (
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                  Real-time
                </span>
              )}
              {snapshot.architectureSpec.storage && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                  File Storage
                </span>
              )}
              {snapshot.architectureSpec.caching && (
                <span className="px-2 py-0.5 bg-success-500/20 text-success-400 rounded text-xs">
                  Caching
                </span>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* UI Preferences */}
      {snapshot.uiPreferences && (
        <Section icon={<PaletteIcon size={16} />} title="UI Preferences">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-800/50 rounded p-2">
              <span className="text-zinc-500">Style: </span>
              <span className="text-zinc-300">{snapshot.uiPreferences.style}</span>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <span className="text-zinc-500">Layout: </span>
              <span className="text-zinc-300">{snapshot.uiPreferences.layout}</span>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <span className="text-zinc-500">Color Scheme: </span>
              <span className="text-zinc-300">{snapshot.uiPreferences.colorScheme}</span>
            </div>
            {snapshot.uiPreferences.primaryColor && (
              <div className="bg-zinc-800/50 rounded p-2 flex items-center gap-2">
                <span className="text-zinc-500">Primary: </span>
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: snapshot.uiPreferences.primaryColor }}
                />
                <span className="text-zinc-300">{snapshot.uiPreferences.primaryColor}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Conversation Context - Expandable */}
      <ConversationContextSection snapshot={snapshot} />
    </div>
  );
}

/**
 * Expandable conversation context section
 */
function ConversationContextSection({ snapshot }: { snapshot: ConceptSnapshot }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasContext = snapshot.conversationContext || snapshot.conversationSummary;
  if (!hasContext) return null;

  return (
    <Section icon={<CodeIcon size={16} />} title="Conversation Context">
      <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
        {/* Summary always visible */}
        {snapshot.conversationSummary && (
          <div className="p-3 text-xs text-zinc-400 border-b border-zinc-700/50">
            <div className="text-zinc-500 mb-1">Summary:</div>
            {snapshot.conversationSummary}
          </div>
        )}

        {/* Full context expandable */}
        {snapshot.conversationContext && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-700/30 transition-colors"
            >
              <span>
                Full Conversation ({snapshot.conversationContext.length.toLocaleString()} chars)
              </span>
              {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
            </button>
            {isExpanded && (
              <div className="p-3 text-xs text-zinc-400 max-h-60 overflow-y-auto whitespace-pre-wrap border-t border-zinc-700/50">
                {snapshot.conversationContext}
              </div>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

export default ConceptTab;
