/** 站点公开地址。SNS 分享用的 OGP 标签必须是绝对地址，相对路径不生效。 */
export const site = {
  origin: 'https://vege-calc.services.gekal.cn',
  name: '蔬菜价格计算',
  description: '自家菜地的当季蔬菜，按重量计价。选好数量即可算出总价。',
  /** OGP 图片。多数平台不支持 SVG，所以用 PNG，尺寸 1200×630。 */
  ogImage: '/og-image.png',
} as const;

/** 把站内路径拼成绝对地址。 */
export function absoluteUrl(path: string): string {
  return `${site.origin}${path}`;
}
