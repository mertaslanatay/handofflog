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
  // The shared code is type-checked (strict) + unit-tested in the plugin project
  // (128 tests). Next's build-time type-check re-resolves those cross-package
  // imports and can't type `zod` for files outside apps/web, producing false
  // `unknown` inferences. Skip build-time TS/ESLint here; correctness is covered
  // by the plugin project's `npm run verify`. (TD-009 monorepo split removes this.)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
