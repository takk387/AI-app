'use client';

/**
 * Review Status Indicator
 *
 * Small badge component for showing quality check status on phase indicators.
 */

import React from 'react';
import type { QualityPipelineState } from '@/types/codeReview';

// ============================================================================
// TYPES
// ============================================================================

export type ReviewStatus = 'pending' | 'checking' | 'passed' | 'warning' | 'failed';

interface ReviewStatusIndicatorProps {
  status: ReviewStatus;
  score?: number;
  issueCount?: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReviewStatusIndicator({
  status,
  score,
  issueCount = 0,
  onClick,
  size = 'sm',
  showScore = false,
  className = '',
}: ReviewStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: '○',
          bgColor: 'bg-slate-600/50',
          textColor: 'text-slate-400',
          borderColor: 'border-slate-500/30',
          animate: false,
        };
      case 'checking':
        return {
          icon: '🔍',
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          animate: true,
        };
      case 'passed':
        return {
          icon: '✅',
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/30',
          animate: false,
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/30',
          animate: false,
        };
      case 'failed':
        return {
          icon: '❌',
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/30',
          animate: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex items-center justify-center rounded-full
        ${sizeClasses[size]}
        ${config.bgColor}
        ${config.textColor}
        border ${config.borderColor}
        ${config.animate ? 'animate-pulse' : ''}
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        transition-all
        ${className}
      `}
      title={getStatusTitle(status, score, issueCount)}
    >
      {showScore && score !== undefined ? (
        <span className="font-bold">{score}</span>
      ) : (
        <span>{config.icon}</span>
      )}
    </button>
  );
}

/**
 * Get tooltip text for status
 */
function getStatusTitle(status: ReviewStatus, score?: number, issueCount?: number): string {
  switch (status) {
    case 'pending':
      return 'Quality check not run';
    case 'checking':
      return 'Running quality check...';
    case 'passed':
      return score ? `Passed (${score}/100)` : 'All checks passed';
    case 'warning':
      return issueCount
        ? `${issueCount} warning(s) found${score ? ` (${score}/100)` : ''}`
        : 'Warnings detected';
    case 'failed':
      return issueCount
        ? `${issueCount} issue(s) found${score ? ` (${score}/100)` : ''}`
        : 'Critical issues found';
  }
}

/**
 * Convert QualityPipelineState to ReviewStatus
 */
export function pipelineStateToStatus(state: QualityPipelineState): ReviewStatus {
  if (state.currentStep === 'validating' || state.currentStep === 'reviewing') {
    return 'checking';
  }
  if (state.currentStep === 'error') {
    return 'failed';
  }
  if (state.reviewStatus === 'failed') {
    return 'failed';
  }
  if (state.reviewStatus === 'warning') {
    return 'warning';
  }
  if (state.reviewStatus === 'passed') {
    return 'passed';
  }
  return 'pending';
}

/**
 * Inline status badge (for use in text)
 */
export function ReviewStatusBadge({
  status,
  score,
  label,
  className = '',
}: {
  status: ReviewStatus;
  score?: number;
  label?: string;
  className?: string;
}) {
  const getConfig = () => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: '○' };
      case 'checking':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🔍' };
      case 'passed':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✅' };
      case 'warning':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⚠️' };
      case 'failed':
        return { bg: 'bg-red-500/20', text: 'text-red-400', icon: '❌' };
    }
  };

  const config = getConfig();

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      <span>{config.icon}</span>
      {label && <span>{label}</span>}
      {score !== undefined && <span>({score})</span>}
    </span>
  );
}

export default ReviewStatusIndicator;
