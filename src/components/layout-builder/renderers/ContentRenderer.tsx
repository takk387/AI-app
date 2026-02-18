/**
 * ContentRenderer
 *
 * Renders text, image placeholders, and mixed icon+text content.
 * Handles layout logic for icon positioning (left/right/top/bottom).
 */

import React from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';

type Content = DetectedComponentEnhanced['content'];

interface ContentRendererProps {
  component: DetectedComponentEnhanced;
  /** Pre-rendered icon element to avoid duplicating render logic */
  iconElement?: React.ReactNode;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ component, iconElement }) => {
  const { content, style, role, children } = component;
  const isContainer = role === 'container' || (children && children.length > 0);
  const bounds = component.bounds;

  // If this is a container with children, don't show placeholder content
  if (isContainer && children && children.length > 0) {
    return null;
  }

  // Check for icon content - support named icons, SVG paths, and custom visuals
  const hasIconContent =
    content?.hasIcon && (content?.iconSvgPath || content?.iconName || content?.hasCustomVisual);
  const hasTextContent = content?.text;
  const hasImageContent = content?.hasImage;

  // Render icon + text combination
  if (hasIconContent && hasTextContent && iconElement) {
    const iconPosition = content?.iconPosition || 'left';

    // Determine flex direction based on icon position
    const getFlexClass = () => {
      switch (iconPosition) {
        case 'top':
          return 'flex-col';
        case 'bottom':
          return 'flex-col-reverse';
        case 'right':
          return 'flex-row-reverse';
        case 'left':
        default:
          return 'flex-row';
      }
    };

    // Center items for vertical layouts, align center for horizontal
    const isVertical = iconPosition === 'top' || iconPosition === 'bottom';
    const alignClass = isVertical ? 'items-center text-center' : 'items-center';

    return (
      <div className={`flex ${getFlexClass()} ${alignClass}`} style={{ gap: style?.gap || '8px' }}>
        {iconElement}
        {/* Add flex constraints to text to prevent overlap */}
        <span
          style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {content.text}
        </span>
      </div>
    );
  }

  // Render standalone icon
  if (hasIconContent && iconElement) {
    return <div className="flex items-center justify-center w-full h-full">{iconElement}</div>;
  }

  // Render text only
  if (hasTextContent) {
    return <>{content.text}</>;
  }

  // Render image content (with description-aware placeholders)
  if (hasImageContent) {
    // Check if there's a background image set on the component - if so, don't show placeholder
    if (style?.backgroundImage) {
      return null; // Background image is handled by the component's styles
    }

    // If we have an image description from Gemini, show a styled placeholder
    // that communicates what the image depicts (for future DALL-E generation)
    if (content?.imageDescription) {
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2 overflow-hidden"
          style={{
            backgroundColor: style?.backgroundColor || 'rgba(229, 231, 235, 0.3)',
            minHeight: bounds?.height ? undefined : '60px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-gray-400 opacity-60"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs text-gray-500 text-center px-2 opacity-80 leading-tight">
            {content.imageDescription}
          </span>
        </div>
      );
    }

    // Generic image placeholder if no description
    return (
      <div
        className="w-full h-full bg-gray-200 flex items-center justify-center"
        style={{ minHeight: bounds?.height ? undefined : '100px' }}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return null;
};
