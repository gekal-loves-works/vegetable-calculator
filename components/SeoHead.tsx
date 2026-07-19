import Head from 'next/head';
import { site, absoluteUrl } from '../data/site';

type Props = {
  title: string;
  description: string;
  /** 站内路径，如 '/' 或 '/vegetables/xiangcai/'。 */
  path: string;
};

/**
 * 页面标题与 SNS 分享用的 OGP 标签。
 *
 * 没有这些标签时，LINE / WeChat / X 只会显示一条光秃秃的网址。
 * og:url 和 og:image 必须是绝对地址。
 */
export function SeoHead({ title, description, path }: Props) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(site.ogImage);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="zh_CN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
