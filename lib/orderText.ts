import { vegetables, type VegetableId } from '../data/vegetables';
import { formatYenRounded } from './format';
import { normalizeWeightInput } from './weight';
import type { WeightMap } from './useWeights';

export type OrderRow = {
  id: VegetableId;
  name: string;
  weight: number;
  subtotal: number;
};

/** 生成可以直接发到 SNS 的纯文本。格式要能被 parseOrderText 读回来。 */
export function buildOrderText(rows: OrderRow[], total: number): string {
  const lines = rows.map(
    (row) => `${row.name} × ${row.weight} 公斤 = ${formatYenRounded(row.subtotal)}`,
  );

  return ['【蔬菜订单】', ...lines, `合计 ${formatYenRounded(total)}`].join('\n');
}

/**
 * 品名可能互相包含（比如「豆角」和「四季豆角」），
 * 先匹配长的名字才不会认错。
 */
const idsByNameLength = (Object.keys(vegetables) as VegetableId[]).sort(
  (a, b) => vegetables[b].name.length - vegetables[a].name.length,
);

/**
 * 把客户发回来的文本解析成重量。
 *
 * 只认「品名 + 数字 + 公斤／kg」这个组合，所以对方顺手改了排版、
 * 加了寒暄或者删掉金额也照样能读出来。认不出的行直接跳过。
 */
export function parseOrderText(text: string): WeightMap {
  const result: WeightMap = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    // 合计行里也有数字，但没有品名，正常会被下面的查找跳过；这里提前排除更保险。
    if (line === '' || line.startsWith('合计')) {
      continue;
    }

    const id = idsByNameLength.find((candidate) => line.includes(vegetables[candidate].name));

    if (!id) {
      continue;
    }

    const matched = line.match(/(\d+(?:\.\d+)?)\s*(?:公斤|kg|KG|千克)/);

    if (!matched) {
      continue;
    }

    const normalized = normalizeWeightInput(matched[1]);

    if (normalized !== '') {
      result[id] = normalized;
    }
  }

  return result;
}
