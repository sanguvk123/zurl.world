import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security/headers';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Fail the production build on type errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },

  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },

  serverExternalPackages: ['pg', '@electric-sql/pglite'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },

  async redirects() {
    return [
      // Single canonical host: www -> apex.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.zurl.world' }],
        destination: 'https://zurl.world/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
