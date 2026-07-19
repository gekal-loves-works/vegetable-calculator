export function formatYen(value: number): string {
  return `¥${value.toLocaleString('zh-CN')}`;
}

/**
 * 按重量计价，金额可能出现小数，四舍五入到日元最小单位后再格式化。
 */
export function formatYenRounded(value: number): string {
  return formatYen(Math.round(value));
}
