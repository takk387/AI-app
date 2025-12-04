/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  // ESLint configuration for builds
  // Skip ESLint during builds - run `npm run lint` separately
  // Many pre-existing warnings in codebase that don't affect functionality
  eslint: {
    ignoreDuringBuilds: true,
  },

  // NOTE: Turbopack is disabled by default in production builds
  // For development, Turbopack can be enabled with `next dev --turbo`
  // but is not required for tree-sitter compatibility

  webpack: (config, { isServer }) => {
    // Fix for tree-sitter native bindings
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'tree-sitter': 'commonjs tree-sitter',
        'tree-sitter-typescript': 'commonjs tree-sitter-typescript',
        'tree-sitter-javascript': 'commonjs tree-sitter-javascript',
      });
      
      // Ignore .node files
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
      });
    }
    
    return config;
  },
}
