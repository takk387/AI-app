'use client';

import React, { useState, useRef, useEffect } from 'react';

type ProjectStatus = 'draft' | 'saved' | 'generating' | 'error';

interface ProjectInfoProps {
  projectName: string;
  status: ProjectStatus;
  lastSaved?: string;
  onRename?: (newName: string) => void;
  isEditable?: boolean;
}

const statusConfig: Record<ProjectStatus, { label: string; dotClass: string }> = {
  draft: { label: 'Draft', dotClass: 'status-dot-draft' },
  saved: { label: 'Saved', dotClass: 'status-dot-saved' },
  generating: { label: 'Generating', dotClass: 'status-dot-generating' },
  error: { label: 'Error', dotClass: 'status-dot-error' },
};

export const ProjectInfo: React.FC<ProjectInfoProps> = ({
  projectName,
  status,
  lastSaved,
  onRename,
  isEditable = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(projectName);
  }, [projectName]);

  const handleStartEdit = () => {
    if (isEditable && onRename) {
      setIsEditing(true);
      setEditValue(projectName);
    }
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== projectName) {
      onRename?.(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const { label: statusLabel, dotClass } = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      {/* Project Name */}
      <div className="flex items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 text-sm font-medium bg-zinc-800 border border-zinc-700 rounded text-zinc-100 outline-none focus:border-blue-500 min-w-[120px]"
            maxLength={50}
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className={`
              text-sm font-medium text-zinc-100 hover:text-white
              ${isEditable ? 'cursor-text hover:bg-zinc-800/50 px-2 py-1 rounded' : 'cursor-default'}
            `}
            title={isEditable ? 'Click to rename' : undefined}
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-zinc-700" />

      {/* Status Indicator */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span className={`status-dot ${dotClass}`} />
        <span>{statusLabel}</span>
        {lastSaved && status === 'saved' && (
          <span className="hidden lg:inline text-zinc-500">{lastSaved}</span>
        )}
      </div>
    </div>
  );
};

export default ProjectInfo;
