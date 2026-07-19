import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { vegetables, type VegetableId, type VegetableWithId } from '../data/vegetables';
import { formatYen } from '../lib/format';

type Props = {
  items: VegetableWithId[];
};

export default function Home({ items }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>野菜価格一覧 | Vegetable Calculator</title>
        <meta name="description" content="在庫中の野菜の単価一覧と価格計算" />
      </Head>
      <main className="container">
        <header className="page-header">
          <h1>野菜価格一覧</h1>
          <p className="lead">全 {items.length} 品目。品名をクリックすると詳細と価格計算ができます。</p>
        </header>

        <ul className="card-grid">
          {items.map((item) => (
            <li key={item.id}>
              <Link className="card" href={`/vegetables/${item.id}`}>
                <span className="card-name">{item.name}</span>
                <span className="card-price">{formatYen(item.price)}</span>
                <span className="card-unit">／ 1点</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<Props> = () => {
  const items = (Object.keys(vegetables) as VegetableId[]).map((id) => ({
    id,
    ...vegetables[id],
  }));

  return { props: { items } };
};
