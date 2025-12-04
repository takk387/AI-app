import type { FullTemplate } from '../../types/architectureTemplates';

/**
 * Blog/CMS Template
 * Content management and publishing platforms
 */
export const blogTemplate: FullTemplate = {
  id: 'blog',
  name: 'Blog / CMS',
  description:
    'Content management and publishing platforms with article listings, rich content display, and categories.',
  icon: '📰',
  category: 'content',
  features: [
    'Article list',
    'Article detail',
    'Categories/tags',
    'Author profiles',
    'Comments section',
    'Search',
    'Related posts',
  ],
  complexity: 'moderate',
  estimatedComponents: 14,
  basePrompt: `Create a blog/CMS application with the following structure:
- Article list view with card-based layout
- Article detail page with rich content rendering
- Category and tag filtering/navigation
- Author profile pages with bio and posts
- Comments section placeholder
- Search functionality with results page
- Related/recommended posts section
- Responsive reading experience`,
  requiredFeatures: [
    'Article listing',
    'Article detail page',
    'Category navigation',
    'Search functionality',
  ],
  suggestedFeatures: [
    'Comments system',
    'Social sharing',
    'Reading time estimate',
    'Table of contents',
    'Newsletter subscription',
  ],
  layoutStructure: {
    type: 'topnav',
    regions: ['header', 'content', 'sidebar', 'footer'],
  },
  components: [
    { name: 'ArticleList', description: 'Grid/list of article cards', priority: 'core' },
    { name: 'ArticleCard', description: 'Article preview card', priority: 'core' },
    { name: 'ArticleDetail', description: 'Full article page with content', priority: 'core' },
    { name: 'ArticleContent', description: 'Rich text content renderer', priority: 'core' },
    { name: 'CategoryNav', description: 'Category/tag navigation', priority: 'core' },
    { name: 'TagList', description: 'Tag display and filtering', priority: 'optional' },
    { name: 'AuthorCard', description: 'Author bio and avatar', priority: 'optional' },
    { name: 'AuthorProfile', description: 'Full author profile page', priority: 'optional' },
    { name: 'CommentsSection', description: 'Article comments placeholder', priority: 'optional' },
    { name: 'SearchBar', description: 'Search input component', priority: 'core' },
    { name: 'SearchResults', description: 'Search results display', priority: 'optional' },
    { name: 'RelatedPosts', description: 'Related articles sidebar', priority: 'optional' },
    { name: 'TableOfContents', description: 'Article TOC navigation', priority: 'optional' },
    { name: 'ShareButtons', description: 'Social sharing buttons', priority: 'optional' },
  ],
  technicalRequirements: {
    needsAuth: false,
    needsDatabase: true,
    needsAPI: true,
    needsFileUpload: true,
  },
};

export default blogTemplate;
