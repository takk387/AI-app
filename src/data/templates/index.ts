/**
 * Architecture Templates Index
 * Export all pre-built application templates
 */

import { dashboardTemplate } from './dashboardTemplate';
import { crudTemplate } from './crudTemplate';
import { ecommerceTemplate } from './ecommerceTemplate';
import { saasTemplate } from './saasTemplate';
import { landingPageTemplate } from './landingPageTemplate';
import { blogTemplate } from './blogTemplate';
import type { FullTemplate, TemplateCategory, TemplateComplexity, TemplateFilterOptions } from '../../types/architectureTemplates';

/**
 * All available architecture templates
 */
export const architectureTemplates: FullTemplate[] = [
  dashboardTemplate,
  crudTemplate,
  ecommerceTemplate,
  saasTemplate,
  landingPageTemplate,
  blogTemplate
];

/**
 * Category-specific keywords for template recommendations
 */
const CATEGORY_KEYWORDS: Record<TemplateCategory, string[]> = {
  admin: ['admin', 'dashboard', 'analytics', 'monitor', 'metrics', 'management'],
  commerce: ['shop', 'store', 'product', 'cart', 'checkout', 'ecommerce', 'e-commerce', 'buy', 'sell'],
  content: ['blog', 'article', 'post', 'content', 'publish', 'cms', 'news'],
  marketing: ['landing', 'marketing', 'portfolio', 'launch', 'showcase', 'promotion'],
  saas: ['saas', 'subscription', 'billing', 'team', 'organization', 'onboarding', 'workspace']
};

/**
 * Get template by ID
 */
export function getTemplateById(id: string): FullTemplate | undefined {
  return architectureTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): FullTemplate[] {
  return architectureTemplates.filter(t => t.category === category);
}

/**
 * Get templates by complexity
 */
export function getTemplatesByComplexity(complexity: TemplateComplexity): FullTemplate[] {
  return architectureTemplates.filter(t => t.complexity === complexity);
}

/**
 * Filter templates based on options
 */
export function filterTemplates(options: TemplateFilterOptions): FullTemplate[] {
  let filtered = [...architectureTemplates];

  if (options.category) {
    filtered = filtered.filter(t => t.category === options.category);
  }

  if (options.complexity) {
    filtered = filtered.filter(t => t.complexity === options.complexity);
  }

  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.features.some(f => f.toLowerCase().includes(query))
    );
  }

  return filtered;
}

/**
 * Get recommended templates based on user description
 */
export function getRecommendedTemplates(description: string): FullTemplate[] {
  const lowerDesc = description.toLowerCase();
  
  const scores: Map<string, number> = new Map();
  
  for (const template of architectureTemplates) {
    let score = 0;
    
    // Check if template name or features match description
    if (lowerDesc.includes(template.name.toLowerCase())) {
      score += 10;
    }
    
    for (const feature of template.features) {
      if (lowerDesc.includes(feature.toLowerCase())) {
        score += 2;
      }
    }
    
    // Check for category-specific keywords
    const keywords = CATEGORY_KEYWORDS[template.category] || [];
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        score += 3;
      }
    }
    
    if (score > 0) {
      scores.set(template.id, score);
    }
  }
  
  // Sort by score and return top matches
  return architectureTemplates
    .filter(t => scores.has(t.id))
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
}

/**
 * Get all unique categories
 */
export function getAllCategories(): TemplateCategory[] {
  return ['admin', 'commerce', 'content', 'marketing', 'saas'];
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: TemplateCategory): string {
  const names: Record<TemplateCategory, string> = {
    admin: 'Admin & Dashboard',
    commerce: 'E-commerce',
    content: 'Content & Publishing',
    marketing: 'Marketing & Landing',
    saas: 'SaaS & Applications'
  };
  return names[category];
}

// Re-export individual templates
export {
  dashboardTemplate,
  crudTemplate,
  ecommerceTemplate,
  saasTemplate,
  landingPageTemplate,
  blogTemplate
};
