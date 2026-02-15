/**
 * FormRenderer
 *
 * Renders input fields and search bars.
 * Enforces void element behavior (self-closing).
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';

type Content = DetectedComponentEnhanced['content'];

interface FormRendererProps {
  type: string;
  id: string;
  content?: Content;
  style: React.CSSProperties;
  className?: string; // For selectionClass and interaction classes
  onClick?: (e: React.MouseEvent) => void;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  type,
  id,
  content,
  style,
  className,
  onClick,
}) => {
  if (type === 'input' || type === 'search-bar') {
    return (
      <input
        data-id={id}
        placeholder={content?.placeholder || 'Enter text...'}
        style={style}
        className={cn('transition-all duration-200', className)}
        onClick={onClick}
        readOnly // Prevent typing in "Edit Mode"
      />
    );
  }

  return null;
};
