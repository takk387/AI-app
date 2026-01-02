/**
 * Interaction Presets
 *
 * Pre-defined interaction patterns for common UI behaviors.
 * Used by the InteractionEditor and AI to apply consistent interactions.
 */

import type { ElementInteractions } from '@/types/layoutDesign';

export interface InteractionPreset {
  id: string;
  name: string;
  description: string;
  category: 'hover' | 'click' | 'scroll' | 'loading' | 'gesture' | 'transition';
  interactions: Partial<ElementInteractions>;
  /** CSS for preview */
  previewCss?: string;
  /** Tailwind classes */
  tailwindClasses?: string;
}

// ============================================================================
// HOVER PRESETS
// ============================================================================

export const hoverPresets: InteractionPreset[] = [
  {
    id: 'hover-lift',
    name: 'Lift',
    description: 'Subtle lift effect with shadow',
    category: 'hover',
    interactions: {
      hover: {
        transform: 'translateY(-4px)',
        boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
        transition: 'all 0.2s ease',
      },
    },
    tailwindClasses: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  },
  {
    id: 'hover-scale',
    name: 'Scale',
    description: 'Grows slightly on hover',
    category: 'hover',
    interactions: {
      hover: {
        transform: 'scale(1.05)',
        transition: 'transform 0.2s ease',
      },
    },
    tailwindClasses: 'hover:scale-105 transition-transform duration-200',
  },
  {
    id: 'hover-glow',
    name: 'Glow',
    description: 'Adds a subtle glow effect',
    category: 'hover',
    interactions: {
      hover: {
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        transition: 'box-shadow 0.2s ease',
      },
    },
    tailwindClasses: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-shadow duration-200',
  },
  {
    id: 'hover-brighten',
    name: 'Brighten',
    description: 'Brightens the element',
    category: 'hover',
    interactions: {
      hover: {
        opacity: 0.9,
        transition: 'opacity 0.15s ease',
      },
    },
    tailwindClasses: 'hover:opacity-90 transition-opacity duration-150',
  },
  {
    id: 'hover-border-color',
    name: 'Border Highlight',
    description: 'Changes border color on hover',
    category: 'hover',
    interactions: {
      hover: {
        borderColor: '#3B82F6',
        transition: 'border-color 0.2s ease',
      },
    },
    tailwindClasses: 'hover:border-blue-500 transition-colors duration-200',
  },
];

// ============================================================================
// CLICK/ACTIVE PRESETS
// ============================================================================

export const clickPresets: InteractionPreset[] = [
  {
    id: 'click-press',
    name: 'Press',
    description: 'Scales down when pressed',
    category: 'click',
    interactions: {
      active: {
        transform: 'scale(0.95)',
      },
    },
    tailwindClasses: 'active:scale-95 transition-transform',
  },
  {
    id: 'click-bounce',
    name: 'Bounce',
    description: 'Bouncy click effect',
    category: 'click',
    interactions: {
      active: {
        transform: 'scale(0.9)',
      },
    },
    previewCss: `
      @keyframes bounce-click {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(0.9); }
      }
    `,
    tailwindClasses: 'active:scale-90 transition-transform',
  },
  {
    id: 'click-ripple',
    name: 'Ripple',
    description: 'Material Design ripple effect',
    category: 'click',
    interactions: {
      active: {
        backgroundColor: 'rgba(255,255,255,0.3)',
      },
    },
    tailwindClasses: 'active:bg-white/30 transition-colors',
  },
];

// ============================================================================
// SCROLL ANIMATION PRESETS
// ============================================================================

export const scrollPresets: InteractionPreset[] = [
  {
    id: 'scroll-fade-in',
    name: 'Fade In',
    description: 'Fades in when scrolled into view',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'fadeIn',
        duration: 500,
        threshold: 0.2,
      },
    },
  },
  {
    id: 'scroll-fade-up',
    name: 'Fade Up',
    description: 'Fades in and slides up',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'fadeInUp',
        duration: 600,
        threshold: 0.2,
      },
    },
  },
  {
    id: 'scroll-slide-left',
    name: 'Slide Left',
    description: 'Slides in from the right',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'slideInLeft',
        duration: 500,
        threshold: 0.3,
      },
    },
  },
  {
    id: 'scroll-slide-right',
    name: 'Slide Right',
    description: 'Slides in from the left',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'slideInRight',
        duration: 500,
        threshold: 0.3,
      },
    },
  },
  {
    id: 'scroll-zoom-in',
    name: 'Zoom In',
    description: 'Zooms in when scrolled into view',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'zoomIn',
        duration: 400,
        threshold: 0.2,
      },
    },
  },
  {
    id: 'scroll-stagger',
    name: 'Stagger',
    description: 'Items appear one after another',
    category: 'scroll',
    interactions: {
      scroll: {
        trigger: 'enter',
        animation: 'fadeInUp',
        duration: 400,
        delay: 100,
        threshold: 0.1,
      },
    },
  },
];

// ============================================================================
// LOADING STATE PRESETS
// ============================================================================

export const loadingPresets: InteractionPreset[] = [
  {
    id: 'loading-spinner',
    name: 'Spinner',
    description: 'Classic spinning loader',
    category: 'loading',
    interactions: {
      loading: {
        type: 'spinner',
        size: 'md',
      },
    },
  },
  {
    id: 'loading-skeleton',
    name: 'Skeleton',
    description: 'Content placeholder shimmer',
    category: 'loading',
    interactions: {
      loading: {
        type: 'skeleton',
      },
    },
  },
  {
    id: 'loading-pulse',
    name: 'Pulse',
    description: 'Pulsing opacity effect',
    category: 'loading',
    interactions: {
      loading: {
        type: 'pulse',
      },
    },
    tailwindClasses: 'animate-pulse',
  },
  {
    id: 'loading-progress',
    name: 'Progress Bar',
    description: 'Linear progress indicator',
    category: 'loading',
    interactions: {
      loading: {
        type: 'progress',
        color: '#3B82F6',
      },
    },
  },
];

// ============================================================================
// GESTURE PRESETS
// ============================================================================

export const gesturePresets: InteractionPreset[] = [
  {
    id: 'gesture-swipe-delete',
    name: 'Swipe to Delete',
    description: 'Swipe left to reveal delete action',
    category: 'gesture',
    interactions: {
      gesture: {
        type: 'swipe',
        direction: 'left',
        action: 'delete',
        feedback: 'visual',
      },
    },
  },
  {
    id: 'gesture-swipe-dismiss',
    name: 'Swipe to Dismiss',
    description: 'Swipe in any direction to dismiss',
    category: 'gesture',
    interactions: {
      gesture: {
        type: 'swipe',
        direction: 'any',
        action: 'dismiss',
        feedback: 'visual',
      },
    },
  },
  {
    id: 'gesture-drag-reorder',
    name: 'Drag to Reorder',
    description: 'Hold and drag to reorder items',
    category: 'gesture',
    interactions: {
      gesture: {
        type: 'drag',
        action: 'reorder',
        feedback: 'both',
      },
    },
  },
  {
    id: 'gesture-long-press',
    name: 'Long Press Menu',
    description: 'Long press to show context menu',
    category: 'gesture',
    interactions: {
      gesture: {
        type: 'long-press',
        action: 'context-menu',
        feedback: 'haptic',
      },
    },
  },
];

// ============================================================================
// PAGE TRANSITION PRESETS
// ============================================================================

export const transitionPresets: InteractionPreset[] = [
  {
    id: 'transition-fade',
    name: 'Fade',
    description: 'Simple fade between pages',
    category: 'transition',
    interactions: {
      pageTransition: {
        type: 'fade',
        duration: 200,
      },
    },
  },
  {
    id: 'transition-slide-left',
    name: 'Slide Left',
    description: 'New page slides in from right',
    category: 'transition',
    interactions: {
      pageTransition: {
        type: 'slide',
        direction: 'left',
        duration: 300,
      },
    },
  },
  {
    id: 'transition-slide-up',
    name: 'Slide Up',
    description: 'New page slides up from bottom',
    category: 'transition',
    interactions: {
      pageTransition: {
        type: 'slide',
        direction: 'up',
        duration: 300,
      },
    },
  },
  {
    id: 'transition-scale',
    name: 'Scale',
    description: 'Zoom in/out between pages',
    category: 'transition',
    interactions: {
      pageTransition: {
        type: 'scale',
        duration: 250,
      },
    },
  },
];

// ============================================================================
// ALL PRESETS
// ============================================================================

export const allInteractionPresets: InteractionPreset[] = [
  ...hoverPresets,
  ...clickPresets,
  ...scrollPresets,
  ...loadingPresets,
  ...gesturePresets,
  ...transitionPresets,
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: InteractionPreset['category']): InteractionPreset[] {
  return allInteractionPresets.filter((p) => p.category === category);
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): InteractionPreset | undefined {
  return allInteractionPresets.find((p) => p.id === id);
}

/**
 * Animation keyframes for scroll animations
 */
export const scrollAnimationKeyframes: Record<string, Record<string, Record<string, string>>> = {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  fadeInUp: {
    '0%': { opacity: '0', transform: 'translateY(20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInDown: {
    '0%': { opacity: '0', transform: 'translateY(-20px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  slideInLeft: {
    '0%': { opacity: '0', transform: 'translateX(50px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  slideInRight: {
    '0%': { opacity: '0', transform: 'translateX(-50px)' },
    '100%': { opacity: '1', transform: 'translateX(0)' },
  },
  zoomIn: {
    '0%': { opacity: '0', transform: 'scale(0.8)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  zoomOut: {
    '0%': { opacity: '0', transform: 'scale(1.2)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-5px)' },
    '75%': { transform: 'translateX(5px)' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
};

export default allInteractionPresets;
