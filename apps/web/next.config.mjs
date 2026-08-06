/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing the shared TS (diff-engine/schemas/backend) from ../../plugin
  // until the monorepo split (TD-009) moves them into packages/.
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
