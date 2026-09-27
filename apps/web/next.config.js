/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@kanak/ui',
    '@kanak/components',
    '@kanak/llm',
    '@kanak/shared',
    '@kanak/utils',
    '@kanak/convex',
    '@kanak/api',
  ],
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  // Dev only: keep compiled routes in memory instead of disposing them after
  // 15s, so revisiting a route does not recompile it from scratch.
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100,
  },
  webpack: (config, { isServer }) => {
    // Ensure proper resolution of Convex generated files
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
