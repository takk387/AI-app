/**
 * MediaRenderer
 *
 * Renders gallery placeholders and other complex media containment.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';

type Content = DetectedComponentEnhanced['content'];

interface MediaRendererProps {
  type: string;
  id: string;
  content?: Content;
  style: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({
  type,
  id,
  content,
  style,
  className,
  onClick,
}) => {
  if (type === 'image-gallery') {
    return (
      <div
        data-id={id}
        style={style}
        className={cn('transition-all duration-200 cursor-pointer', className)}
        onClick={onClick}
      >
        <div className="bg-gray-200 w-full h-full min-h-[100px] flex items-center justify-center text-gray-400">
          {content?.text || 'Image Gallery'}
        </div>
      </div>
    );
  }

  return null;
};
