'use client';

import React, { useState, useMemo } from 'react';
import type { Feature } from '../types/appConcept';

/**
 * Feature template structure
 */
interface FeatureTemplate {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  icon: string;
}

/**
 * Feature library organized by category
 */
const featureTemplates: FeatureTemplate[] = [
  // Authentication
  {
    id: 'auth-login',
    name: 'User Login',
    description: 'Secure email/password login with session management',
    priority: 'high',
    category: 'Authentication',
    icon: '🔐'
  },
  {
    id: 'auth-signup',
    name: 'User Registration',
    description: 'New user signup with email verification',
    priority: 'high',
    category: 'Authentication',
    icon: '📝'
  },
  {
    id: 'auth-oauth',
    name: 'Social Login',
    description: 'Login with Google, GitHub, or other providers',
    priority: 'medium',
    category: 'Authentication',
    icon: '🔗'
  },
  {
    id: 'auth-password-reset',
    name: 'Password Reset',
    description: 'Forgot password flow with email recovery',
    priority: 'high',
    category: 'Authentication',
    icon: '🔄'
  },
  {
    id: 'auth-2fa',
    name: 'Two-Factor Auth',
    description: 'Additional security with 2FA verification',
    priority: 'low',
    category: 'Authentication',
    icon: '🛡️'
  },

  // Data Management
  {
    id: 'data-crud',
    name: 'CRUD Operations',
    description: 'Create, read, update, and delete data records',
    priority: 'high',
    category: 'Data Management',
    icon: '📊'
  },
  {
    id: 'data-search',
    name: 'Search & Filter',
    description: 'Search functionality with advanced filters',
    priority: 'high',
    category: 'Data Management',
    icon: '🔍'
  },
  {
    id: 'data-sort',
    name: 'Sort & Pagination',
    description: 'Data sorting with paginated results',
    priority: 'medium',
    category: 'Data Management',
    icon: '📑'
  },
  {
    id: 'data-export',
    name: 'Data Export',
    description: 'Export data to CSV, Excel, or PDF',
    priority: 'low',
    category: 'Data Management',
    icon: '📤'
  },
  {
    id: 'data-import',
    name: 'Data Import',
    description: 'Bulk import data from files',
    priority: 'low',
    category: 'Data Management',
    icon: '📥'
  },

  // User Experience
  {
    id: 'ux-dark-mode',
    name: 'Dark Mode',
    description: 'Toggle between light and dark themes',
    priority: 'medium',
    category: 'User Experience',
    icon: '🌙'
  },
  {
    id: 'ux-responsive',
    name: 'Responsive Design',
    description: 'Mobile-first responsive layout',
    priority: 'high',
    category: 'User Experience',
    icon: '📱'
  },
  {
    id: 'ux-loading',
    name: 'Loading States',
    description: 'Skeleton loaders and progress indicators',
    priority: 'medium',
    category: 'User Experience',
    icon: '⏳'
  },
  {
    id: 'ux-keyboard',
    name: 'Keyboard Shortcuts',
    description: 'Power user keyboard navigation',
    priority: 'low',
    category: 'User Experience',
    icon: '⌨️'
  },
  {
    id: 'ux-accessibility',
    name: 'Accessibility',
    description: 'WCAG compliant accessible design',
    priority: 'medium',
    category: 'User Experience',
    icon: '♿'
  },

  // Communication
  {
    id: 'comm-notifications',
    name: 'In-App Notifications',
    description: 'Real-time notification system',
    priority: 'medium',
    category: 'Communication',
    icon: '🔔'
  },
  {
    id: 'comm-email',
    name: 'Email Notifications',
    description: 'Transactional and marketing emails',
    priority: 'medium',
    category: 'Communication',
    icon: '📧'
  },
  {
    id: 'comm-chat',
    name: 'Real-time Chat',
    description: 'Live messaging between users',
    priority: 'medium',
    category: 'Communication',
    icon: '💬'
  },
  {
    id: 'comm-comments',
    name: 'Comments',
    description: 'Threaded commenting system',
    priority: 'medium',
    category: 'Communication',
    icon: '💭'
  },

  // E-commerce
  {
    id: 'ecom-cart',
    name: 'Shopping Cart',
    description: 'Add to cart with quantity management',
    priority: 'high',
    category: 'E-commerce',
    icon: '🛒'
  },
  {
    id: 'ecom-checkout',
    name: 'Checkout Flow',
    description: 'Multi-step checkout process',
    priority: 'high',
    category: 'E-commerce',
    icon: '💳'
  },
  {
    id: 'ecom-inventory',
    name: 'Inventory Management',
    description: 'Track stock levels and availability',
    priority: 'medium',
    category: 'E-commerce',
    icon: '📦'
  },
  {
    id: 'ecom-wishlist',
    name: 'Wishlist',
    description: 'Save items for later purchase',
    priority: 'low',
    category: 'E-commerce',
    icon: '❤️'
  },

  // Analytics
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Visual metrics and KPI tracking',
    priority: 'medium',
    category: 'Analytics',
    icon: '📈'
  },
  {
    id: 'analytics-charts',
    name: 'Charts & Graphs',
    description: 'Interactive data visualizations',
    priority: 'medium',
    category: 'Analytics',
    icon: '📊'
  },
  {
    id: 'analytics-reports',
    name: 'Report Generation',
    description: 'Automated report creation',
    priority: 'low',
    category: 'Analytics',
    icon: '📋'
  },

  // Social
  {
    id: 'social-profiles',
    name: 'User Profiles',
    description: 'Customizable user profile pages',
    priority: 'high',
    category: 'Social',
    icon: '👤'
  },
  {
    id: 'social-follow',
    name: 'Follow/Unfollow',
    description: 'Social following system',
    priority: 'medium',
    category: 'Social',
    icon: '👥'
  },
  {
    id: 'social-feed',
    name: 'Activity Feed',
    description: 'Timeline of user activities',
    priority: 'medium',
    category: 'Social',
    icon: '📰'
  },
  {
    id: 'social-share',
    name: 'Social Sharing',
    description: 'Share content to social platforms',
    priority: 'low',
    category: 'Social',
    icon: '🔗'
  },

  // Content
  {
    id: 'content-editor',
    name: 'Rich Text Editor',
    description: 'WYSIWYG content editor',
    priority: 'medium',
    category: 'Content',
    icon: '✏️'
  },
  {
    id: 'content-media',
    name: 'Media Gallery',
    description: 'Image and video gallery',
    priority: 'medium',
    category: 'Content',
    icon: '🖼️'
  },
  {
    id: 'content-upload',
    name: 'File Upload',
    description: 'Drag-and-drop file uploads',
    priority: 'medium',
    category: 'Content',
    icon: '📁'
  },
  {
    id: 'content-markdown',
    name: 'Markdown Support',
    description: 'Markdown content rendering',
    priority: 'low',
    category: 'Content',
    icon: '📝'
  }
];

/**
 * Get unique categories from templates
 */
const categories = Array.from(
  new Set(featureTemplates.map((t) => t.category))
);

/**
 * FeatureLibrary component
 */
interface FeatureLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (feature: Omit<Feature, 'id'>) => void;
  existingFeatureNames?: string[];
}

export function FeatureLibrary({
  isOpen,
  onClose,
  onSelectFeature,
  existingFeatureNames = []
}: FeatureLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return featureTemplates.filter((template) => {
      // Filter by search
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by category
      const matchesCategory =
        selectedCategory === null || template.category === selectedCategory;

      // Exclude already added features
      const notAdded = !existingFeatureNames.some(
        (name) => name.toLowerCase() === template.name.toLowerCase()
      );

      return matchesSearch && matchesCategory && notAdded;
    });
  }, [searchQuery, selectedCategory, existingFeatureNames]);

  const handleSelectTemplate = (template: FeatureTemplate) => {
    onSelectFeature({
      name: template.name,
      description: template.description,
      priority: template.priority
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-3xl">📚</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Feature Library</h3>
                <p className="text-sm text-slate-300">
                  Pre-built feature templates to speed up your app
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features..."
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-slate-400">
                {searchQuery || selectedCategory
                  ? 'No features found matching your criteria'
                  : 'All features have been added!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                          {template.name}
                        </h4>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            template.priority === 'high'
                              ? 'bg-red-500/20 text-red-300'
                              : template.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {template.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {template.description}
                      </p>
                      <p className="text-xs text-purple-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to add →
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filteredTemplates.length} feature
              {filteredTemplates.length === 1 ? '' : 's'} available
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureLibrary;
