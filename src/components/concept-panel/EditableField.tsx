'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PencilIcon, CheckIcon, XIcon } from '@/components/ui/Icons';

export type FieldType = 'text' | 'textarea' | 'select' | 'priority';

export interface SelectOption {
  value: string;
  label: string;
}

export interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  type?: FieldType;
  options?: SelectOption[];
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

const priorityOptions: SelectOption[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/**
 * Reusable inline editing component
 * - Click to edit, blur/Enter to save, Escape to cancel
 * - Supports: text, textarea, select, priority dropdown
 * - Visual hover/edit states
 */
export function EditableField({
  value,
  onChange,
  label,
  type = 'text',
  options,
  placeholder = 'Click to edit...',
  maxLength,
  readOnly = false,
  className = '',
  labelClassName = '',
  valueClassName = '',
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Sync edit value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (
        inputRef.current instanceof HTMLInputElement ||
        inputRef.current instanceof HTMLTextAreaElement
      ) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (editValue !== value) {
      onChange(editValue);
    }
    setIsEditing(false);
  }, [editValue, value, onChange]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && type !== 'textarea') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [type, handleSave, handleCancel]
  );

  const handleClick = useCallback(() => {
    if (!readOnly && !isEditing) {
      setIsEditing(true);
    }
  }, [readOnly, isEditing]);

  // Get display value for priority
  const getDisplayValue = () => {
    if (type === 'priority') {
      const opt = priorityOptions.find((o) => o.value === value);
      return opt?.label || value;
    }
    if (type === 'select' && options) {
      const opt = options.find((o) => o.value === value);
      return opt?.label || value;
    }
    return value;
  };

  // Priority badge colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error-500/20 text-error-300 border-error-500/30';
      case 'medium':
        return 'bg-warning-500/20 text-warning-300 border-warning-500/30';
      case 'low':
        return 'bg-success-500/20 text-success-300 border-success-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  if (isEditing) {
    const activeOptions = type === 'priority' ? priorityOptions : options;

    return (
      <div className={`relative ${className}`}>
        {label && (
          <label
            className={`text-xs text-slate-500 uppercase tracking-wide block mb-1 ${labelClassName}`}
          >
            {label}
          </label>
        )}
        <div className="flex items-start gap-2">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={3}
              className="flex-1 bg-slate-800 border border-garden-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-garden-500 resize-none"
            />
          ) : type === 'select' || type === 'priority' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                onChange(e.target.value);
                setIsEditing(false);
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-slate-800 border border-garden-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-garden-500"
            >
              {activeOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              className="flex-1 bg-slate-800 border border-garden-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-garden-500"
            />
          )}
          <button
            type="button"
            onClick={handleSave}
            className="p-1 text-success-400 hover:text-success-300 transition-colors"
            title="Save"
          >
            <CheckIcon size={14} />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 text-error-400 hover:text-error-300 transition-colors"
            title="Cancel"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative ${!readOnly ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      {label && (
        <label
          className={`text-xs text-slate-500 uppercase tracking-wide block mb-1 ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2 ${!readOnly ? 'group-hover:bg-slate-800/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors' : ''}`}
      >
        {type === 'priority' ? (
          <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(value)}`}>
            {getDisplayValue()}
          </span>
        ) : (
          <span
            className={`text-slate-100 ${!value ? 'text-slate-500 italic' : ''} ${valueClassName}`}
          >
            {getDisplayValue() || placeholder}
          </span>
        )}
        {!readOnly && (
          <PencilIcon
            size={12}
            className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          />
        )}
      </div>
    </div>
  );
}

export default EditableField;
