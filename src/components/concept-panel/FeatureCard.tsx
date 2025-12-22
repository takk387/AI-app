'use client';

import { useState, useCallback } from 'react';
import { TrashIcon, GripVerticalIcon } from '@/components/ui/Icons';
import type { Feature } from '@/types/appConcept';
import { EditableField } from './EditableField';

interface FeatureCardProps {
  feature: Feature;
  onUpdate: (updates: Partial<Feature>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

/**
 * Feature item with inline editing, priority badge, delete button
 */
export function FeatureCard({ feature, onUpdate, onDelete, readOnly = false }: FeatureCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = useCallback(() => {
    if (showDeleteConfirm) {
      onDelete();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  }, [showDeleteConfirm, onDelete]);

  return (
    <div className="group bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
      <div className="flex items-start gap-2">
        {/* Drag handle (visual only for now) */}
        {!readOnly && (
          <div className="mt-1 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
            <GripVerticalIcon size={14} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Feature name */}
          <div className="flex items-center gap-2 mb-1">
            <EditableField
              value={feature.name}
              onChange={(name) => onUpdate({ name })}
              placeholder="Feature name"
              readOnly={readOnly}
              valueClassName="font-medium text-sm"
            />
          </div>

          {/* Feature description */}
          {(feature.description || !readOnly) && (
            <EditableField
              value={feature.description || ''}
              onChange={(description) => onUpdate({ description })}
              type="textarea"
              placeholder="Add a description..."
              readOnly={readOnly}
              valueClassName="text-xs text-zinc-400"
            />
          )}
        </div>

        {/* Priority badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <EditableField
            value={feature.priority}
            onChange={(priority) => onUpdate({ priority: priority as 'high' | 'medium' | 'low' })}
            type="priority"
            readOnly={readOnly}
          />

          {/* Delete button */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleDelete}
              className={`p-1 rounded transition-colors ${
                showDeleteConfirm
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400'
              }`}
              title={showDeleteConfirm ? 'Click again to confirm' : 'Delete feature'}
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeatureCard;
