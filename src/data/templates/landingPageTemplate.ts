import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * Landing Page Template
 * Marketing sites, portfolios, product launches
 */
export const landingPageTemplate: FullTemplate = {
  id: 'landing-page',
  name: 'Landing Page',
  description:
    'Marketing sites, portfolios, and product launches with hero sections, features, and call-to-action elements.',
  icon: '🎯',
  category: 'marketing',
  features: [
    'Hero section',
    'Features grid',
    'Testimonials',
    'Pricing table',
    'FAQ accordion',
    'Contact form',
    'Footer',
  ],
  complexity: 'simple',
  estimatedComponents: 10,
  basePrompt: `Create a landing page with the following structure:
- Hero section with headline, subtext, and prominent CTA button
- Features grid showcasing key benefits (icons + descriptions)
- Testimonials/social proof section with quotes
- Pricing table with multiple tiers
- FAQ accordion with common questions
- Contact form with validation
- Footer with navigation links and social icons`,
  requiredFeatures: ['Hero section', 'Features showcase', 'Call-to-action buttons', 'Footer'],
  suggestedFeatures: [
    'Testimonials',
    'Pricing table',
    'FAQ section',
    'Newsletter signup',
    'Social proof badges',
  ],
  layoutStructure: {
    type: 'minimal',
    regions: ['header', 'hero', 'features', 'social-proof', 'pricing', 'faq', 'contact', 'footer'],
  },
  components: [
    { name: 'HeroSection', description: 'Main hero with headline and CTA', priority: 'core' },
    { name: 'FeatureGrid', description: 'Grid of feature cards', priority: 'core' },
    { name: 'FeatureCard', description: 'Single feature with icon', priority: 'core' },
    { name: 'Testimonials', description: 'Customer testimonials carousel', priority: 'optional' },
    { name: 'TestimonialCard', description: 'Single testimonial quote', priority: 'optional' },
    { name: 'PricingTable', description: 'Pricing tiers comparison', priority: 'optional' },
    { name: 'PricingCard', description: 'Single pricing tier', priority: 'optional' },
    { name: 'FAQAccordion', description: 'Collapsible FAQ section', priority: 'optional' },
    { name: 'ContactForm', description: 'Contact form with validation', priority: 'optional' },
    { name: 'Footer', description: 'Footer with links and social', priority: 'core' },
  ],
  technicalRequirements: {
    needsAuth: false,
    needsDatabase: false,
    needsAPI: false,
    needsFileUpload: false,
  },
};

export default landingPageTemplate;
