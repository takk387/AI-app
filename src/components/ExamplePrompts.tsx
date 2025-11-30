'use client';

import React from 'react';

export interface ExamplePrompt {
  id: string;
  text: string;
  category: 'saas' | 'ecommerce' | 'content' | 'social' | 'productivity' | 'other';
  icon?: string;
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  // SaaS & Business
  {
    id: 'saas-crm',
    text: 'Build a CRM for small businesses to manage leads and contacts',
    category: 'saas',
    icon: '💼',
  },
  {
    id: 'saas-project',
    text: 'Create a project management tool like Trello for remote teams',
    category: 'saas',
    icon: '📊',
  },
  {
    id: 'saas-analytics',
    text: 'Build an analytics dashboard to track website visitors and conversion rates',
    category: 'saas',
    icon: '📈',
  },

  // E-commerce
  {
    id: 'ecom-store',
    text: 'Create an online store to sell handmade crafts with Stripe payments',
    category: 'ecommerce',
    icon: '🛒',
  },
  {
    id: 'ecom-marketplace',
    text: 'Build a marketplace where users can list and sell items',
    category: 'ecommerce',
    icon: '🏪',
  },

  // Content & Media
  {
    id: 'content-blog',
    text: 'Build a blog platform with markdown support and dark mode',
    category: 'content',
    icon: '📝',
  },
  {
    id: 'content-portfolio',
    text: 'Create a portfolio website to showcase my design work',
    category: 'content',
    icon: '🎨',
  },
  {
    id: 'content-docs',
    text: 'Build a documentation site with search and navigation',
    category: 'content',
    icon: '📚',
  },

  // Social & Community
  {
    id: 'social-forum',
    text: 'Create a discussion forum like Reddit with upvoting and comments',
    category: 'social',
    icon: '💬',
  },
  {
    id: 'social-network',
    text: 'Build a social network where users can follow friends and share posts',
    category: 'social',
    icon: '👥',
  },

  // Productivity & Tools
  {
    id: 'prod-tasks',
    text: 'Build a task manager for freelancers with priorities and due dates',
    category: 'productivity',
    icon: '✅',
  },
  {
    id: 'prod-notes',
    text: 'Create a note-taking app like Notion with rich text editing',
    category: 'productivity',
    icon: '📋',
  },
  {
    id: 'prod-calendar',
    text: 'Build a booking system for appointments and scheduling',
    category: 'productivity',
    icon: '📅',
  },

  // Other
  {
    id: 'other-fitness',
    text: 'Create a fitness tracker to log workouts and track progress',
    category: 'other',
    icon: '💪',
  },
  {
    id: 'other-recipe',
    text: 'Build a recipe app where users can save and share recipes',
    category: 'other',
    icon: '🍳',
  },
];

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  variant?: 'grid' | 'chips' | 'list';
  maxDisplay?: number;
  showCategories?: boolean;
}

export const ExamplePrompts: React.FC<ExamplePromptsProps> = ({
  onSelect,
  variant = 'chips',
  maxDisplay = 5,
}) => {
  const displayPrompts = EXAMPLE_PROMPTS.slice(0, maxDisplay);

  if (variant === 'grid') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">💡</span>
          <h3 className="text-sm font-medium text-slate-300">Try these ideas:</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayPrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => onSelect(prompt.text)}
              className="bg-white/5 rounded-xl p-4 text-left hover:bg-white/10 transition-all border border-transparent hover:border-blue-500/30 group"
            >
              <div className="flex items-start gap-3">
                {prompt.icon && (
                  <span className="text-2xl flex-shrink-0">{prompt.icon}</span>
                )}
                <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  {prompt.text}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400">✨</span>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Example Ideas
          </p>
        </div>
        {displayPrompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onSelect(prompt.text)}
            className="w-full text-left px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all flex items-center gap-3 group border border-transparent hover:border-blue-500/20"
          >
            {prompt.icon && (
              <span className="text-xl flex-shrink-0">{prompt.icon}</span>
            )}
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              {prompt.text}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Chips variant (default)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-400">✨</span>
        <p className="text-xs text-slate-400">Not sure what to build? Try one of these:</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayPrompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onSelect(prompt.text)}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent text-xs text-slate-300 hover:text-blue-400 transition-all flex items-center gap-2"
          >
            {prompt.icon && <span>{prompt.icon}</span>}
            <span>{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Categorized version
interface CategorizedPromptsProps {
  onSelect: (prompt: string) => void;
}

export const CategorizedPrompts: React.FC<CategorizedPromptsProps> = ({ onSelect }) => {
  const categories = [
    { id: 'saas', label: 'SaaS & Business', icon: '💼' },
    { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
    { id: 'content', label: 'Content & Media', icon: '📝' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'productivity', label: 'Productivity', icon: '✅' },
    { id: 'other', label: 'Other', icon: '🌟' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400">💡</span>
        <h3 className="text-lg font-semibold text-white">Example Ideas</h3>
      </div>

      {categories.map((category) => {
        const prompts = EXAMPLE_PROMPTS.filter((p) => p.category === category.id);
        if (prompts.length === 0) return null;

        return (
          <div key={category.id} className="space-y-3">
            <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <span>{category.icon}</span>
              {category.label}
            </h4>
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => onSelect(prompt.text)}
                  className="w-full text-left px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all flex items-center gap-3 group border border-transparent hover:border-blue-500/20"
                >
                  {prompt.icon && (
                    <span className="text-xl flex-shrink-0">{prompt.icon}</span>
                  )}
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Placeholder text for input
export function getRandomPlaceholder(): string {
  const placeholders = [
    'Describe your app idea... (e.g., "A task manager for freelancers")',
    'What do you want to build? (e.g., "An e-commerce store for handmade goods")',
    'Tell me about your app... (e.g., "A blog platform with dark mode")',
    'What problem does your app solve? (e.g., "Help teams track projects")',
    'Describe your vision... (e.g., "A social network for developers")',
  ];

  return placeholders[Math.floor(Math.random() * placeholders.length)];
}
