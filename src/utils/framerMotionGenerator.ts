/**
 * Framer Motion Generator
 *
 * Generates Framer Motion code from detected animations.
 * Provides variants, components, and configuration for React integration.
 */

import type { DetectedAnimation, HoverAnimation, EntranceAnimation } from '@/types/layoutDesign';
import { getAnimationPreset, type AnimationPreset } from '@/data/animationPresets';

// ============================================================================
// TYPES
// ============================================================================

export interface FramerMotionVariants {
  [key: string]: Record<string, unknown>;
}

export interface FramerMotionTransition {
  duration?: number;
  delay?: number;
  ease?: string | number[];
  type?: 'tween' | 'spring' | 'inertia';
  stiffness?: number;
  damping?: number;
  mass?: number;
  repeat?: number | 'Infinity';
  repeatType?: 'loop' | 'reverse' | 'mirror';
}

export interface GeneratedMotionComponent {
  name: string;
  code: string;
  variants: FramerMotionVariants;
  props: Record<string, unknown>;
}

// ============================================================================
// EASING CONVERSIONS
// ============================================================================

/**
 * Convert CSS easing to Framer Motion easing
 */
export function cssEasingToFramerMotion(cssEasing: string): string | number[] {
  const easingMap: Record<string, string | number[]> = {
    ease: 'easeInOut',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
    linear: 'linear',
  };

  // Handle cubic-bezier
  const cubicMatch = cssEasing.match(
    /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.-]+)\s*,\s*([\d.]+)\s*,\s*([\d.-]+)\s*\)/
  );
  if (cubicMatch) {
    return [
      parseFloat(cubicMatch[1]),
      parseFloat(cubicMatch[2]),
      parseFloat(cubicMatch[3]),
      parseFloat(cubicMatch[4]),
    ];
  }

  return easingMap[cssEasing] || 'easeOut';
}

/**
 * Convert duration string to seconds
 */
export function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration > 10 ? duration / 1000 : duration; // Assume ms if > 10
  }

  const msMatch = duration.match(/([\d.]+)\s*ms/);
  if (msMatch) {
    return parseFloat(msMatch[1]) / 1000;
  }

  const sMatch = duration.match(/([\d.]+)\s*s/);
  if (sMatch) {
    return parseFloat(sMatch[1]);
  }

  return 0.3; // Default
}

// ============================================================================
// VARIANT GENERATORS
// ============================================================================

/**
 * Generate Framer Motion variants from detected animation
 */
export function generateVariants(animation: DetectedAnimation): FramerMotionVariants {
  const variants: FramerMotionVariants = {};

  switch (animation.type) {
    case 'fade':
      variants.hidden = { opacity: 0 };
      variants.visible = { opacity: 1 };
      break;

    case 'slide':
      const slideDirection = animation.property.includes('X') ? 'x' : 'y';
      const slideValue = animation.fromValue.includes('-') ? -50 : 50;
      variants.hidden = { [slideDirection]: slideValue, opacity: 0 };
      variants.visible = { [slideDirection]: 0, opacity: 1 };
      break;

    case 'scale':
      const scaleMatch = animation.fromValue.match(/scale\(([\d.]+)\)/);
      const fromScale = scaleMatch ? parseFloat(scaleMatch[1]) : 0.8;
      variants.hidden = { scale: fromScale, opacity: 0 };
      variants.visible = { scale: 1, opacity: 1 };
      break;

    case 'rotate':
      const rotateMatch = animation.fromValue.match(/rotate\(([-\d.]+)/);
      const fromRotate = rotateMatch ? parseFloat(rotateMatch[1]) : -10;
      variants.hidden = { rotate: fromRotate, opacity: 0 };
      variants.visible = { rotate: 0, opacity: 1 };
      break;

    case 'hover-effect':
      // Parse hover properties
      variants.initial = {};
      variants.hover = parseHoverProperties(animation.toValue);
      break;

    case 'scroll-reveal':
      variants.hidden = { opacity: 0, y: 30 };
      variants.visible = { opacity: 1, y: 0 };
      break;

    default:
      // Generic fade
      variants.hidden = { opacity: 0 };
      variants.visible = { opacity: 1 };
  }

  return variants;
}

/**
 * Parse hover CSS properties to Framer Motion format
 */
function parseHoverProperties(css: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Transform
  const translateYMatch = css.match(/translateY\(([-\d.]+)px\)/);
  if (translateYMatch) {
    props.y = parseFloat(translateYMatch[1]);
  }

  const translateXMatch = css.match(/translateX\(([-\d.]+)px\)/);
  if (translateXMatch) {
    props.x = parseFloat(translateXMatch[1]);
  }

  const scaleMatch = css.match(/scale\(([\d.]+)\)/);
  if (scaleMatch) {
    props.scale = parseFloat(scaleMatch[1]);
  }

  const rotateMatch = css.match(/rotate\(([-\d.]+)deg\)/);
  if (rotateMatch) {
    props.rotate = parseFloat(rotateMatch[1]);
  }

  // Box shadow
  const shadowMatch = css.match(/box-shadow:\s*([^;]+)/);
  if (shadowMatch) {
    props.boxShadow = shadowMatch[1].trim();
  }

  // Opacity
  const opacityMatch = css.match(/opacity:\s*([\d.]+)/);
  if (opacityMatch) {
    props.opacity = parseFloat(opacityMatch[1]);
  }

  // Background
  const bgMatch = css.match(/background(?:-color)?:\s*([^;]+)/);
  if (bgMatch) {
    props.backgroundColor = bgMatch[1].trim();
  }

  return props;
}

/**
 * Generate transition configuration
 */
export function generateTransition(animation: DetectedAnimation): FramerMotionTransition {
  const duration = parseDuration(animation.duration);
  const ease = cssEasingToFramerMotion(animation.easing);

  const transition: FramerMotionTransition = {
    duration,
    ease: ease as string,
  };

  if (animation.delay) {
    transition.delay = parseDuration(animation.delay);
  }

  // Use spring for bounce effects
  if (
    animation.easing.includes('bounce') ||
    animation.easing.includes('elastic') ||
    animation.type === 'scale'
  ) {
    return {
      type: 'spring',
      stiffness: 260,
      damping: 20,
      delay: transition.delay,
    };
  }

  return transition;
}

// ============================================================================
// CODE GENERATORS
// ============================================================================

/**
 * Generate complete Framer Motion component code
 */
export function generateMotionComponent(
  animation: DetectedAnimation,
  componentName: string = 'AnimatedElement'
): GeneratedMotionComponent {
  const variants = generateVariants(animation);
  const transition = generateTransition(animation);

  // Determine props based on animation type
  const props: Record<string, unknown> = {
    variants,
    transition,
  };

  if (animation.type === 'hover-effect') {
    props.whileHover = 'hover';
    props.initial = 'initial';
  } else if (animation.type === 'scroll-reveal') {
    props.initial = 'hidden';
    props.whileInView = 'visible';
    props.viewport = { once: true, margin: '-100px' };
  } else {
    props.initial = 'hidden';
    props.animate = 'visible';
  }

  // Generate code string
  const variantsCode = JSON.stringify(variants, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'");

  const transitionCode = JSON.stringify(transition, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'");

  let propsString = '';
  if (animation.type === 'hover-effect') {
    propsString = `
    variants={variants}
    initial="initial"
    whileHover="hover"
    transition={transition}`;
  } else if (animation.type === 'scroll-reveal') {
    propsString = `
    variants={variants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-100px' }}
    transition={transition}`;
  } else {
    propsString = `
    variants={variants}
    initial="hidden"
    animate="visible"
    transition={transition}`;
  }

  const code = `import { motion } from 'framer-motion';

const variants = ${variantsCode};

const transition = ${transitionCode};

export function ${componentName}({ children }) {
  return (
    <motion.div${propsString}
    >
      {children}
    </motion.div>
  );
}`;

  return {
    name: componentName,
    code,
    variants,
    props,
  };
}

/**
 * Generate staggered children animation
 */
export function generateStaggeredAnimation(
  animation: DetectedAnimation,
  staggerDelay: number = 0.1
): string {
  const variants = generateVariants(animation);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = variants;

  return `import { motion } from 'framer-motion';

const containerVariants = ${JSON.stringify(containerVariants, null, 2).replace(/"([^"]+)":/g, '$1:')};

const itemVariants = ${JSON.stringify(itemVariants, null, 2).replace(/"([^"]+)":/g, '$1:')};

export function StaggeredList({ items }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => (
        <motion.li
          key={index}
          variants={itemVariants}
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}`;
}

/**
 * Generate page transition animation
 */
export function generatePageTransition(
  type: 'fade' | 'slide' | 'scale' = 'fade',
  direction: 'left' | 'right' | 'up' | 'down' = 'right'
): string {
  let variants: FramerMotionVariants;

  switch (type) {
    case 'slide':
      const slideOffset: Record<string, { x?: number; y?: number }> = {
        left: { x: -300 },
        right: { x: 300 },
        up: { y: -300 },
        down: { y: 300 },
      };
      variants = {
        initial: { opacity: 0, ...slideOffset[direction] },
        animate: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, ...slideOffset[direction] },
      };
      break;

    case 'scale':
      variants = {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.05 },
      };
      break;

    case 'fade':
    default:
      variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }

  return `import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = ${JSON.stringify(variants, null, 2).replace(/"([^"]+)":/g, '$1:')};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

export function PageTransition({ children, key }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}`;
}

/**
 * Generate scroll-triggered reveal animation
 */
export function generateScrollReveal(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance: number = 30
): string {
  const offsets: Record<string, { x?: number; y?: number }> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: -distance },
    right: { x: distance },
  };

  const variants = {
    hidden: { opacity: 0, ...offsets[direction] },
    visible: { opacity: 1, x: 0, y: 0 },
  };

  return `import { motion } from 'framer-motion';

const variants = ${JSON.stringify(variants, null, 2).replace(/"([^"]+)":/g, '$1:')};

export function ScrollReveal({ children, delay = 0 }) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}`;
}

/**
 * Generate hover card animation
 */
export function generateHoverCard(
  liftAmount: number = 4,
  shadow: string = '0 10px 30px rgba(0,0,0,0.15)'
): string {
  return `import { motion } from 'framer-motion';

export function HoverCard({ children, className }) {
  return (
    <motion.div
      className={className}
      whileHover={{
        y: -${liftAmount},
        boxShadow: '${shadow}',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  );
}`;
}

/**
 * Generate button with tap animation
 */
export function generateAnimatedButton(): string {
  return `import { motion } from 'framer-motion';

export function AnimatedButton({ children, onClick, className }) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.98,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
    >
      {children}
    </motion.button>
  );
}`;
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Generate all Framer Motion code from multiple detected animations
 */
export function generateAllAnimations(animations: DetectedAnimation[]): {
  components: GeneratedMotionComponent[];
  variants: Record<string, FramerMotionVariants>;
  fullCode: string;
} {
  const components: GeneratedMotionComponent[] = [];
  const variants: Record<string, FramerMotionVariants> = {};

  animations.forEach((animation, index) => {
    const name = `Animated${animation.type.charAt(0).toUpperCase() + animation.type.slice(1)}${index + 1}`;
    const component = generateMotionComponent(animation, name);
    components.push(component);
    variants[animation.id] = component.variants;
  });

  // Generate combined code
  const imports = `import { motion, AnimatePresence } from 'framer-motion';`;
  const componentCodes = components.map((c) => c.code.replace(/^import.*\n/gm, '')).join('\n\n');

  const fullCode = `${imports}\n\n${componentCodes}`;

  return {
    components,
    variants,
    fullCode,
  };
}

/**
 * Convert animation preset to Framer Motion config
 */
export function presetToFramerMotion(preset: AnimationPreset): {
  variants: FramerMotionVariants;
  transition: FramerMotionTransition;
  props: Record<string, unknown>;
} {
  return {
    variants: (preset.framerMotion.variants as FramerMotionVariants) || {
      initial: preset.framerMotion.initial,
      animate: preset.framerMotion.animate,
      exit: preset.framerMotion.exit,
    },
    transition: (preset.framerMotion.transition as FramerMotionTransition) || {
      duration: preset.duration / 1000,
      ease: cssEasingToFramerMotion(preset.easing) as string,
    },
    props: {
      whileHover: preset.framerMotion.whileHover,
      whileTap: preset.framerMotion.whileTap,
      whileInView: preset.framerMotion.whileInView,
    },
  };
}
