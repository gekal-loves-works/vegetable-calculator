import type { NextConfig } from 'next';

// GitHub Pages 部署时需要仓库名作为 basePath，本地开发时为空。
// GitHub Actions 中通过 NEXT_PUBLIC_BASE_PATH 注入。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
