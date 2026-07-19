import type { ChangeEvent } from 'react';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import {
  vegetables,
  availableVegetableIds,
  isAvailableVegetableId,
  PRICE_UNIT_LABEL,
  type Vegetable,
  type VegetableId,
} from '../../data/vegetables';
import { formatYen, formatYenRounded } from '../../lib/format';
import { assetPath } from '../../lib/asset';
import {
  MAX_WEIGHT,
  WEIGHT_STEP,
  normalizeWeightInput,
  parseWeight,
  stepWeight,
} from '../../lib/weight';
import { useWeights } from '../../lib/useWeights';

type Props = {
  id: VegetableId;
  vegetable: Vegetable;
};

type Params = {
  id: string;
};

export default function VegetableDetail({
  id,
  vegetable,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  // 和列表页共用同一份持久化状态，两边互相同步。
  const { weights, setWeight } = useWeights();

  const weightInput = weights[id] ?? '';
  const weight = parseWeight(weightInput);
  const total = vegetable.price * weight;

  const handleWeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    setWeight(id, event.target.value);
  };

  const handleStep = (direction: 1 | -1) => () => {
    setWeight(id, stepWeight(weightInput, direction));
  };

  const handleBlur = () => {
    setWeight(id, normalizeWeightInput(weightInput));
  };

  return (
    <>
      <Head>
        <title>{`${vegetable.name} | 蔬菜价格计算`}</title>
        <meta name="description" content={vegetable.description} />
      </Head>
      <main className="container">
        <Link className="back-link" href="/">
          ← 返回列表
        </Link>

        <article className="detail">
          <Image
            className="hero-image"
            src={assetPath(vegetable.image)}
            alt={`${vegetable.name}的介绍图片`}
            width={800}
            height={600}
            priority
          />

          <h1>{vegetable.name}</h1>
          <p className="price-tag">
            {formatYen(vegetable.price)}
            <span className="card-unit">／ {PRICE_UNIT_LABEL}</span>
          </p>

          <section className="calculator">
            <h2>价格计算</h2>
            <label htmlFor="weight">重量（公斤）</label>
            <div className="input-row">
              <button
                type="button"
                className="step-button"
                onClick={handleStep(-1)}
                disabled={weight <= 0}
                aria-label={`减少 ${WEIGHT_STEP} 公斤`}
              >
                −
              </button>
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_WEIGHT}
                step={WEIGHT_STEP}
                placeholder="0"
                value={weightInput}
                onChange={handleWeightChange}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="step-button"
                onClick={handleStep(1)}
                disabled={weight >= MAX_WEIGHT}
                aria-label={`增加 ${WEIGHT_STEP} 公斤`}
              >
                ＋
              </button>
              <span className="input-suffix">kg</span>
            </div>
            <p className="total">
              <span className="total-label">合计</span>
              <strong>{formatYenRounded(total)}</strong>
            </p>
            <p className="note">
              {formatYen(vegetable.price)}／{PRICE_UNIT_LABEL} × {weight} 公斤（金额四舍五入到 1 日元）
            </p>
          </section>

          <section>
            <h2>介绍</h2>
            <p>{vegetable.description}</p>
          </section>

          <section>
            <h2>推荐食谱</h2>
            <ul className="dish-grid">
              {vegetable.dishes.map((dish) => (
                <li key={dish.name} className="dish">
                  <Image
                    className="dish-image"
                    src={assetPath(dish.image)}
                    alt={dish.name}
                    width={800}
                    height={600}
                  />
                  <span className="dish-name">{dish.name}</span>
                </li>
              ))}
            </ul>
          </section>

        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths<Params> = () => ({
  // 过季的品种不生成详情页，旧链接会落到 404。
  paths: availableVegetableIds.map((id) => ({ params: { id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props, Params> = ({ params }) => {
  // fallback:false 且 getStaticPaths 返回了全部 id，正常情况下不会走到这里，
  // 加类型守卫只是为了收窄类型。
  if (!params || !isAvailableVegetableId(params.id)) {
    return { notFound: true };
  }

  return { props: { id: params.id, vegetable: vegetables[params.id] } };
};
