import type { VegetableId, VegetableName } from './vegetables';
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
 * 把客户发回来的文本解析成重量。
 *
 * 只认「品名 + 数字 + 公斤／kg」这个组合，所以对方顺手改了排版、
 * 加了寒暄或者删掉金额也照样能读出来。认不出的行直接跳过。
 *
 * catalog 只传在售品种（页面从 getStaticProps 的 props 里给）：客户拿着
 * 过季前的订单文本回来时，过季的那几种会被忽略，不会算进价格。
 */
export function parseOrderText(text: string, catalog: readonly VegetableName[]): WeightMap {
  const result: WeightMap = {};

  // 品名可能互相包含（比如「豆角」和「四季豆角」），先匹配长的名字才不会认错。
  const byNameLength = [...catalog].sort((a, b) => b.name.length - a.name.length);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    // 合计行里也有数字，但没有品名，正常会被下面的查找跳过；这里提前排除更保险。
    if (line === '' || line.startsWith('合计')) {
      continue;
    }

    const matchedVegetable = byNameLength.find((candidate) => line.includes(candidate.name));

    if (!matchedVegetable) {
      continue;
    }

    const matched = line.match(/(\d+(?:\.\d+)?)\s*(?:公斤|kg|KG|千克)/);

    if (!matched) {
      continue;
    }

    const normalized = normalizeWeightInput(matched[1]);

    if (normalized !== '') {
      result[matchedVegetable.id] = normalized;
    }
  }

  return result;
}
