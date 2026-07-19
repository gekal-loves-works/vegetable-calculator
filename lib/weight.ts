/** 单次下单上限（公斤）。 */
export const MAX_WEIGHT = 99;

/** 微调按钮的步长（公斤）。 */
export const WEIGHT_STEP = 0.1;

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), MAX_WEIGHT);
}

/**
 * 把输入框的原始字符串解析成重量。
 * 空值和非法输入按 0 处理，并夹在 0〜MAX_WEIGHT 之间。
 */
export function parseWeight(input: string): number {
  const parsed = Number.parseFloat(input);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return clamp(parsed);
}

/**
 * 按步长增减，返回新的输入框字符串。
 *
 * 0.1 的浮点加法会得到 0.30000000000000004 这类值，所以要按小数点后一位取整。
 * 结果为 0 时返回空字符串，让该品种从「已选」中移除。
 */
export function stepWeight(input: string, direction: 1 | -1): string {
  const next = clamp(parseWeight(input) + direction * WEIGHT_STEP);
  const rounded = Math.round(next * 10) / 10;

  return rounded === 0 ? '' : String(rounded);
}
