import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from 'next/link';
import type { VegetableName } from '../lib/vegetables';
import { loadAvailableVegetables } from '../lib/vegetables.server';
import { SeoHead } from '../components/SeoHead';
import { site } from '../data/site';

type Props = {
  items: VegetableName[];
};

/**
 * 静态导出会生成 out/404.html，GitHub Pages 对找不到的路径自动返回它。
 *
 * 最常见的来路不是打错地址，而是过季下架：品种一旦 available: false，
 * 详情页就不再生成，客户手里的旧链接会直接变成这一页。所以这里顺手
 * 把在售品种列出来，别让人卡在死胡同里。
 */
export default function NotFound({ items }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <SeoHead
        title={`页面不存在 | ${site.name}`}
        description="这个页面找不到了。可能是地址输错，也可能是该品种已经过季下架。"
        path="/404.html"
        noindex
      />
      <main className="container">
        <article className="detail not-found">
          <p className="not-found-code">404</p>
          <h1>这个页面找不到了</h1>
          <p>
            可能是地址输错了；也可能是这个品种已经过季下架，链接跟着一起失效。
            下一季上架时会重新出现。
          </p>

          {items.length > 0 && (
            <>
              <h2>现在在售</h2>
              <ul className="not-found-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link href={`/vegetables/${item.id}/`}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="not-found-actions">
            <Link className="map-button" href="/">
              返回价格一览
            </Link>
          </p>
        </article>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<Props> = () => {
  // 只要 id 和名字，图片和价格这一页用不上。
  return {
    props: {
      items: loadAvailableVegetables().map(({ id, name }) => ({ id, name })),
    },
  };
};
