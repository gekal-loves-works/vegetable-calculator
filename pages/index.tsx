import { useState, type ChangeEvent } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import {
  vegetables,
  PRICE_UNIT_LABEL,
  type VegetableId,
  type VegetableWithId,
} from '../data/vegetables';
import { farm, mapEmbedUrl, mapSearchUrl, mapDirectionsUrl } from '../data/farm';
import { formatYen, formatYenRounded } from '../lib/format';
import { assetPath } from '../lib/asset';
import {
  MAX_WEIGHT,
  WEIGHT_STEP,
  normalizeWeightInput,
  parseWeight,
  stepWeight,
} from '../lib/weight';
import { useWeights } from '../lib/useWeights';
import { buildOrderText, parseOrderText } from '../lib/orderText';

type Props = {
  items: VegetableWithId[];
};

export default function Home({ items }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { weights, setWeight, replaceWeights, clearWeights } = useWeights();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');

  const rows = items.map((item) => {
    const weight = parseWeight(weights[item.id] ?? '');
    return { ...item, weight, subtotal: item.price * weight };
  });

  const selected = rows.filter((row) => row.weight > 0);
  const grandTotal = selected.reduce((sum, row) => sum + row.subtotal, 0);

  const handleWeightChange = (id: VegetableId) => (event: ChangeEvent<HTMLInputElement>) => {
    setWeight(id, event.target.value);
  };

  const handleStep = (id: VegetableId, direction: 1 | -1) => () => {
    setWeight(id, stepWeight(weights[id] ?? '', direction));
  };

  const handleBlur = (id: VegetableId) => () => {
    setWeight(id, normalizeWeightInput(weights[id] ?? ''));
  };

  const orderText = buildOrderText(selected, grandTotal);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderText);
      setStatus('已复制，可以直接粘贴到聊天里');
    } catch {
      // http 页面或浏览器不允许时会失败，退回到手动复制。
      setImportOpen(true);
      setImportText(orderText);
      setStatus('无法自动复制，请手动选中下面的文本复制');
    }
  };

  const handleImport = () => {
    const parsed = parseOrderText(importText);
    const count = Object.keys(parsed).length;

    if (count === 0) {
      setStatus('没有识别到品种，请确认文本里有「品名 数量 公斤」');
      return;
    }

    replaceWeights(parsed);
    setImportText('');
    setImportOpen(false);
    setStatus(`已导入 ${count} 种`);
  };

  const handleClear = () => {
    clearWeights();
    setStatus('');
  };

  return (
    <>
      <Head>
        <title>蔬菜价格一览 | 蔬菜价格计算</title>
        <meta name="description" content="在售蔬菜单价一览与价格计算" />
      </Head>
      <main className="container">
        <header className="page-header">
          <h1>蔬菜价格一览</h1>
          <p className="lead">
            共 {items.length} 个品种，均按重量计价。输入各品种的重量即可算出总价。
          </p>
        </header>

        <ul className="card-grid">
          {rows.map((row) => (
            <li key={row.id} className="card">
              <Link className="card-link" href={`/vegetables/${row.id}`}>
                <Image
                  className="card-image"
                  src={assetPath(row.image)}
                  alt={row.name}
                  width={800}
                  height={600}
                />
                <span className="card-body">
                  <span className="card-name">{row.name}</span>
                  <span className="card-price">
                    {formatYen(row.price)}
                    <span className="card-unit">／ {PRICE_UNIT_LABEL}</span>
                  </span>
                </span>
              </Link>

              <div className="card-calc">
                <label className="visually-hidden" htmlFor={`weight-${row.id}`}>
                  {row.name}的重量（公斤）
                </label>
                <button
                  type="button"
                  className="step-button"
                  onClick={handleStep(row.id, -1)}
                  disabled={row.weight <= 0}
                  aria-label={`${row.name}减少 ${WEIGHT_STEP} 公斤`}
                >
                  −
                </button>
                <input
                  id={`weight-${row.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={MAX_WEIGHT}
                  step={WEIGHT_STEP}
                  placeholder="0"
                  value={weights[row.id] ?? ''}
                  onChange={handleWeightChange(row.id)}
                  onBlur={handleBlur(row.id)}
                />
                <button
                  type="button"
                  className="step-button"
                  onClick={handleStep(row.id, 1)}
                  disabled={row.weight >= MAX_WEIGHT}
                  aria-label={`${row.name}增加 ${WEIGHT_STEP} 公斤`}
                >
                  ＋
                </button>
                <span className="input-suffix">kg</span>
                <span className="card-subtotal">{formatYenRounded(row.subtotal)}</span>
              </div>
            </li>
          ))}
        </ul>

        <section className="summary" aria-live="polite">
          <div className="summary-main">
            <span className="summary-label">
              已选 {selected.length} 种 / 共 {items.length} 种
            </span>
            <strong className="summary-total">{formatYenRounded(grandTotal)}</strong>
          </div>

          {/* 选得多时明细会把这块撑得很高，手机上会挡住输入框，所以默认收起。 */}
          {selected.length > 0 && (
            <details className="summary-details">
              <summary>明细</summary>
              <ul className="summary-list">
                {selected.map((row) => (
                  <li key={row.id}>
                    <span>
                      {row.name} × {row.weight} 公斤
                    </span>
                    <span>{formatYenRounded(row.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="order-actions">
            <button
              type="button"
              className="order-button"
              onClick={handleCopy}
              disabled={selected.length === 0}
            >
              复制订单
            </button>
            <button
              type="button"
              className="clear-button"
              onClick={() => setImportOpen((open) => !open)}
            >
              {importOpen ? '取消导入' : '粘贴导入'}
            </button>
            {selected.length > 0 && (
              <button type="button" className="clear-button" onClick={handleClear}>
                清空
              </button>
            )}
          </div>

          {importOpen && (
            <div className="import-box">
              <label className="visually-hidden" htmlFor="order-text">
                订单文本
              </label>
              <textarea
                id="order-text"
                rows={5}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={'把收到的订单文本粘贴到这里，例如\n香菜 × 1.5 公斤 = ¥1,800'}
              />
              <button type="button" className="order-button" onClick={handleImport}>
                导入
              </button>
            </div>
          )}

          {status !== '' && <p className="order-status">{status}</p>}
        </section>

        <section className="map-section">
          <h2>{farm.label}</h2>
          <div className="map-frame">
            <iframe
              src={mapEmbedUrl}
              title={farm.label}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="map-actions">
            <a
              className="map-button"
              href={mapDirectionsUrl}
              target="_blank"
              rel="noreferrer"
            >
              导航到这里 ↗
            </a>
            <a className="map-link" href={mapSearchUrl} target="_blank" rel="noreferrer">
              在 Google 地图中打开 ↗
            </a>
          </div>
        </section>
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
