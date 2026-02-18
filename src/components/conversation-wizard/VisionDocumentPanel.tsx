'use client';

import { useState } from 'react';
import type { VisionDocument, VisionFeature } from '@/types/wizardState';

interface VisionDocumentPanelProps {
  visionDocument?: VisionDocument;
  isGenerating: boolean;
  onContinueToDesign: () => void;
}

/**
 * Expandable feature card showing rich VisionBoard-format feature detail
 */
function FeatureCard({ feature }: { feature: VisionFeature }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg p-3 cursor-pointer"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {feature.title}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide ${
              feature.complexityLevel === 'high'
                ? 'bg-error-600/20 text-error-300'
                : feature.complexityLevel === 'medium'
                  ? 'bg-warning-600/20 text-warning-300'
                  : 'bg-success-600/20 text-success-300'
            }`}
          >
            {feature.complexityLevel}
          </span>
          <span
            className="text-xs transition-transform"
            style={{
              color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {!expanded && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {feature.userStory}
        </p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {/* User Story */}
          <div>
            <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
              User Story
            </label>
            <p className="italic">{feature.userStory}</p>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Description
            </label>
            <p>{feature.description}</p>
          </div>

          {/* Behavior */}
          <div>
            <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Behavior &amp; States
            </label>
            <p>{feature.behavior}</p>
          </div>

          {/* Acceptance Criteria */}
          {feature.acceptanceCriteria.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Acceptance Criteria
              </label>
              <ul className="space-y-0.5 ml-3">
                {feature.acceptanceCriteria.map((criterion, i) => (
                  <li key={i} className="list-disc">{criterion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Edge Cases */}
          <div>
            <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
              Edge Cases
            </label>
            <p>{feature.edgeCases}</p>
          </div>

          {/* UX Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-wide block mb-0.5" style={{ color: 'var(--text-muted)' }}>
              UX Notes
            </label>
            <p>{feature.uxNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Side panel displaying the VisionBoard-format Vision Document
 */
export function VisionDocumentPanel({
  visionDocument,
  isGenerating,
  onContinueToDesign,
}: VisionDocumentPanelProps) {
  const hasContent = visionDocument && (
    visionDocument.name ||
    visionDocument.overview ||
    visionDocument.features.length > 0
  );
  const isConceptReady = !!(visionDocument?.name && visionDocument.features.length > 0);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b relative" style={{ borderColor: 'var(--border-color)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Vision Document
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {isGenerating ? 'Updating...' : hasContent ? 'PRD in progress' : 'Waiting for conversation...'}
        </p>
        {isGenerating && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden"
            style={{ background: 'var(--border-color)' }}
          >
            <div
              className="h-full w-1/3 animate-pulse rounded"
              style={{ background: 'var(--brand-primary, #6366f1)' }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Start chatting to build your Vision Document. Rich feature specs, user flows, and design
              direction will appear here as the conversation develops.
            </p>
          </div>
        ) : (
          <>
            {/* App Name */}
            {visionDocument.name && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  App Name
                </label>
                <p className="mt-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {visionDocument.name}
                </p>
              </div>
            )}

            {/* Overview */}
            {visionDocument.overview && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Overview
                </label>
                <p className="mt-1 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.overview}
                </p>
              </div>
            )}

            {/* Core Purpose */}
            {visionDocument.corePurpose && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Core Purpose
                </label>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.corePurpose}
                </p>
              </div>
            )}

            {/* Target Audience */}
            {visionDocument.targetAudience && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Target Audience
                </label>
                <p className="mt-1 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.targetAudience}
                </p>
              </div>
            )}

            {/* Competitive Edge */}
            {visionDocument.competitiveEdge && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Competitive Edge
                </label>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.competitiveEdge}
                </p>
              </div>
            )}

            {/* Features */}
            {visionDocument.features.length > 0 && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Features ({visionDocument.features.length})
                </label>
                <div className="mt-2 space-y-2">
                  {visionDocument.features.map((feature) => (
                    <FeatureCard key={feature.id} feature={feature} />
                  ))}
                </div>
              </div>
            )}

            {/* User Flow */}
            {visionDocument.userFlow && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  User Flow
                </label>
                <p className="mt-1 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.userFlow}
                </p>
              </div>
            )}

            {/* Page Breakdown */}
            {visionDocument.pageBreakdown && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Page Breakdown
                </label>
                <p className="mt-1 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.pageBreakdown}
                </p>
              </div>
            )}

            {/* Design Mood */}
            {visionDocument.designMood && (
              <div>
                <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Design Mood
                </label>
                <p className="mt-1 text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                  {visionDocument.designMood}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Button */}
      {isConceptReady && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onContinueToDesign} className="btn-primary w-full py-2.5">
            Continue to Design
          </button>
        </div>
      )}
    </div>
  );
}

export default VisionDocumentPanel;
