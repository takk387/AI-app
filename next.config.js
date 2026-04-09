const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next.js 16: Turbopack is default. Empty config silences webpack/turbopack conflict.
  turbopack: {},

  // COOP/COEP headers required for WebContainers (SharedArrayBuffer)
  // Applied to all routes — needed for WebContainer preview to work
  // Using 'credentialless' for COEP to avoid breaking third-party resources
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Webpack config for tree-sitter native bindings (production builds)
  // Turbopack uses this as fallback when it can't handle native modules
  webpack: (config, { isServer, dev }) => {
    if (!dev) {
      config.optimization = config.optimization || {};
      config.optimization.minimize = false;
    }

    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'tree-sitter': 'commonjs tree-sitter',
        'tree-sitter-typescript': 'commonjs tree-sitter-typescript',
        'tree-sitter-javascript': 'commonjs tree-sitter-javascript',
        'puppeteer': 'commonjs puppeteer',
        'esbuild': 'commonjs esbuild',
      });

      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
      });
    }

    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
