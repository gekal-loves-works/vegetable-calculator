/**
 * public/ 下的静态资源路径加上 basePath。
 *
 * next/image 在 `unoptimized: true`（静态导出必须开启）时不会自动补全 basePath，
 * 图片会以 /images/... 输出，在 GitHub Pages 的子路径下会 404，所以这里手动补全。
 * Link / router 的路径由 Next 自行处理，不要用这个函数。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function assetPath(path: string): string {
  return `${basePath}${path}`;
}
