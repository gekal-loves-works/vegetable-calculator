import type { NextConfig } from 'next';

// 当前部署在自定义域名的根目录，basePath 为空，这里的机制不生效。
// 如果以后改回 https://<user>.github.io/<repo>/ 这种子路径，
// 在构建时设置 NEXT_PUBLIC_BASE_PATH=/<repo> 即可，代码不用改。
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
