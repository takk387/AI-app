'use client';

import React from 'react';
import type { ValidationError } from '../utils/wizardValidation';

/**
 * ValidationMessage - Displays a single validation error or warning
 */
interface ValidationMessageProps {
  error: ValidationError | null;
  className?: string;
}

export function ValidationMessage({ error, className = '' }: ValidationMessageProps) {
  if (!error) return null;

  const isWarning = error.type === 'warning';

  return (
    <div
      className={`flex items-center gap-2 text-sm mt-1.5 animate-fade-in-up ${
        isWarning
          ? 'text-yellow-400'
          : 'text-red-400'
      } ${className}`}
    >
      <span className="flex-shrink-0">
        {isWarning ? '⚠️' : '❌'}
      </span>
      <span>{error.message}</span>
    </div>
  );
}

/**
 * CharacterCounter - Shows character count with visual feedback
 */
interface CharacterCounterProps {
  current: number;
  limit: number;
  className?: string;
}

export function CharacterCounter({ current, limit, className = '' }: CharacterCounterProps) {
  const percentage = (current / limit) * 100;
  const isOverLimit = current > limit;
  const isNearLimit = percentage >= 80 && percentage < 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isOverLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${
          isOverLimit
            ? 'text-red-400'
            : isNearLimit
            ? 'text-yellow-400'
            : 'text-slate-400'
        }`}
      >
        {current}/{limit}
      </span>
    </div>
  );
}

/**
 * ValidatedField - Wrapper component with label, error display, character counter, and hint
 */
interface ValidatedFieldProps {
  label: string;
  required?: boolean;
  error?: ValidationError | null;
  hint?: string;
  characterCount?: {
    current: number;
    limit: number;
  };
  children: React.ReactNode;
  className?: string;
}

export function ValidatedField({
  label,
  required = false,
  error,
  hint,
  characterCount,
  children,
  className = ''
}: ValidatedFieldProps) {
  const hasError = error && error.type === 'error';
  const hasWarning = error && error.type === 'warning';

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
        <span>{label}</span>
        {required && (
          <span className="text-red-400 text-xs">*</span>
        )}
      </label>

      <div
        className={`rounded-lg transition-all duration-200 ${
          hasError
            ? 'ring-2 ring-red-500/50'
            : hasWarning
            ? 'ring-2 ring-yellow-500/50'
            : ''
        }`}
      >
        {children}
      </div>

      {characterCount && (
        <CharacterCounter
          current={characterCount.current}
          limit={characterCount.limit}
        />
      )}

      {error && <ValidationMessage error={error} />}

      {hint && !error && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}

/**
 * ValidationSummary - Shows all validation errors in a summary box
 */
interface ValidationSummaryProps {
  errors: ValidationError[];
  className?: string;
}

export function ValidationSummary({ errors, className = '' }: ValidationSummaryProps) {
  const errorCount = errors.filter((e) => e.type === 'error').length;
  const warningCount = errors.filter((e) => e.type === 'warning').length;

  if (errors.length === 0) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        errorCount > 0
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">
          {errorCount > 0 ? '❌' : '⚠️'}
        </span>
        <div className="flex-1">
          <h4
            className={`font-medium mb-2 ${
              errorCount > 0 ? 'text-red-200' : 'text-yellow-200'
            }`}
          >
            {errorCount > 0
              ? `${errorCount} error${errorCount === 1 ? '' : 's'} found`
              : `${warningCount} warning${warningCount === 1 ? '' : 's'}`}
          </h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li
                key={`${error.field}-${index}`}
                className={`text-sm ${
                  error.type === 'error' ? 'text-red-300' : 'text-yellow-300'
                }`}
              >
                • {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ValidationMessage;
