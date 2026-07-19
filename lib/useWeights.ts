import { useCallback, useEffect, useState } from 'react';
import { isVegetableId, type VegetableId } from '../data/vegetables';

const STORAGE_KEY = 'vegetable-calculator:weights';

/** 输入框的原始字符串，按品种 id 保存。未输入的品种不放进来。 */
export type WeightMap = Partial<Record<VegetableId, string>>;

/**
 * 只保留当前在售品种的字符串值。
 * 商品下架或数据结构变更后，旧的 localStorage 内容不会污染状态。
 */
function parseStored(raw: string): WeightMap {
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const result: WeightMap = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (isVegetableId(key) && typeof value === 'string') {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 重量输入的共享状态，持久化到 localStorage。
 *
 * 静态导出的页面在服务端预渲染，读 localStorage 必须放在 useEffect 里，
 * 否则首次渲染的结果会和服务端不一致（hydration mismatch）。
 * 因此首帧一定是空值，读取完成后才填入。
 */
export function useWeights() {
  const [weights, setWeights] = useState<WeightMap>({});
  // 读取完成前不要回写，否则会用初始空值覆盖掉已保存的数据。
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setWeights(parseStored(raw));
      }
    } catch {
      // 隐私模式或存储被禁用时忽略，退化成不持久化。
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    } catch {
      // 同上，写入失败不影响页面功能。
    }
  }, [weights, loaded]);

  const setWeight = useCallback((id: VegetableId, value: string) => {
    setWeights((previous) => {
      if (value === '') {
        // 清空的品种直接删掉，避免存一堆空字符串。
        const { [id]: _removed, ...rest } = previous;
        return rest;
      }

      return { ...previous, [id]: value };
    });
  }, []);

  const clearWeights = useCallback(() => setWeights({}), []);

  return { weights, setWeight, clearWeights, loaded };
}
