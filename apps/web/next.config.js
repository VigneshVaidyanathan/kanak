/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@kanak/ui',
    '@kanak/components',
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
