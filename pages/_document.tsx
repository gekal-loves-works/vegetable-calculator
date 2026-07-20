import { Html, Head, Main, NextScript } from 'next/document';
import { assetPath } from '../lib/asset';

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* SVG 优先，浏览器不支持时退回 PNG。 */}
        <link rel="icon" href={assetPath('/favicon.svg')} type="image/svg+xml" />
        <link rel="icon" href={assetPath('/favicon-32.png')} sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href={assetPath('/apple-touch-icon.png')} />
        <link rel="manifest" href={assetPath('/site.webmanifest')} />
        <meta name="theme-color" content="#3f7d3a" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
