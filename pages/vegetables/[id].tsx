import { useState, type ChangeEvent } from 'react';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { vegetables, isVegetableId, type Vegetable } from '../../data/vegetables';
import { formatYen } from '../../lib/format';

type Props = {
  vegetable: Vegetable;
};

type Params = {
  id: string;
};

const MAX_QUANTITY = 999;

export default function VegetableDetail({
  vegetable,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [quantity, setQuantity] = useState(1);
  const total = vegetable.price * quantity;

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number.parseInt(event.target.value, 10);
    setQuantity(Number.isNaN(next) ? 0 : Math.min(Math.max(next, 0), MAX_QUANTITY));
  };

  return (
    <>
      <Head>
        <title>{vegetable.name} | Vegetable Calculator</title>
        <meta name="description" content={vegetable.description} />
      </Head>
      <main className="container">
        <Link className="back-link" href="/">
          ← 一覧に戻る
        </Link>

        <article className="detail">
          <h1>{vegetable.name}</h1>
          <p className="price-tag">
            {formatYen(vegetable.price)}
            <span className="card-unit">／ 1点</span>
          </p>

          <section>
            <h2>説明</h2>
            <p>{vegetable.description}</p>
          </section>

          <section>
            <h2>おすすめレシピ</h2>
            <p>{vegetable.recommend}</p>
          </section>

          <section className="calculator">
            <h2>価格計算</h2>
            <label htmlFor="quantity">数量</label>
            <input
              id="quantity"
              type="number"
              min="0"
              max={MAX_QUANTITY}
              step="1"
              value={quantity}
              onChange={handleQuantityChange}
            />
            <p className="total">
              合計 <strong>{formatYen(total)}</strong>
            </p>
          </section>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths<Params> = () => ({
  paths: Object.keys(vegetables).map((id) => ({ params: { id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props, Params> = ({ params }) => {
  // fallback:false かつ getStaticPaths が全 id を返すため通常は到達しないが、
  // 型を絞り込むためにガードしておく。
  if (!params || !isVegetableId(params.id)) {
    return { notFound: true };
  }

  return { props: { vegetable: vegetables[params.id] } };
};
