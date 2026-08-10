import { createRequire } from "module";

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing the shared TS (diff-engine/schemas/backend) from ../../plugin
  // until the monorepo split (TD-009) moves them into packages/.
  experimental: {
    externalDir: true,
  },
  // Those shared files `import "zod"`; because they live outside apps/web, their
  // module resolution wouldn't find apps/web/node_modules on Vercel. Force every
  // `zod` import to resolve to the copy installed here.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: require.resolve("zod"),
    };
    return config;
  },
};

export default nextConfig;
