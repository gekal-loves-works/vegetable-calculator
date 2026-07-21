import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  PRICE_UNIT_LABEL,
  type VegetableId,
  type VegetableWithId,
} from '../lib/vegetables';
import { loadAvailableVegetables } from '../lib/vegetables.server';
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
import { SeoHead } from '../components/SeoHead';
import { site } from '../data/site';

type Props = {
  items: VegetableWithId[];
};

export default function Home({ items }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { weights, setWeight, replaceWeights, clearWeights } = useWeights(
    items.map((item) => item.id),
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');

  // 每张卡片的 <li>，用来判断哪几张已经滚出屏幕上沿。
  const cardRefs = useRef(new Map<VegetableId, HTMLLIElement>());
  const setCardRef = (id: VegetableId) => (el: HTMLLIElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };
  // 滚出屏幕的卡片里、最靠近顶部的最多三张，钉在头部。
  const [pinnedIds, setPinnedIds] = useState<VegetableId[]>([]);

  useEffect(() => {
    let frame = 0;
    const recompute = () => {
      frame = 0;
      const above: VegetableId[] = [];
      for (const item of items) {
        const el = cardRefs.current.get(item.id);
        // bottom <= 0 表示整张卡片都在视口上沿之上，即已完全滚出。
        if (el && el.getBoundingClientRect().bottom <= 0) above.push(item.id);
      }
      const next = above.slice(-3);
      setPinnedIds((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
      );
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(recompute);
    };
    recompute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  const scrollToCard = (id: VegetableId) => {
    cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
    const parsed = parseOrderText(importText, items);
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
      <SeoHead
        title={`蔬菜价格一览 | ${site.name}`}
        description={site.description}
        path="/"
      />
      {pinnedIds.length > 0 && (
        <div className="pinned-bar" role="navigation" aria-label="已滚出屏幕的品种">
          {pinnedIds.map((id) => {
            const row = rows.find((item) => item.id === id);
            if (!row) return null;
            return (
              <button
                key={id}
                type="button"
                className="pinned-chip"
                onClick={() => scrollToCard(id)}
                aria-label={`回到 ${row.name}`}
              >
                <Image
                  className="pinned-chip-thumb"
                  src={assetPath(row.image)}
                  alt=""
                  width={56}
                  height={56}
                />
                <span className="pinned-chip-name">{row.name}</span>
                {row.weight > 0 && (
                  <span className="pinned-chip-sub">{formatYenRounded(row.subtotal)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <main className="container">
        <header className="page-header">
          <h1>蔬菜价格一览</h1>
          <p className="lead">
            {items.length === 0
              ? '当前没有在售的蔬菜，请等待下一季。'
              : `共 ${items.length} 个品种，均按重量计价。输入各品种的重量即可算出总价。`}
          </p>
        </header>

        <ul className="card-grid">
          {rows.map((row) => (
            <li key={row.id} className="card" ref={setCardRef(row.id)}>
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
  // 构建时读 data/vegetables/*.md。过季的品种不进入页面，
  // 连价格也不会出现在 HTML 里。
  return { props: { items: loadAvailableVegetables() } };
};
