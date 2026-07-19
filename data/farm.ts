/** 菜地位置。换地方时只动这里。 */
export const farm = {
  label: '菜地位置',
  latitude: 35.6801064,
  longitude: 140.0828115,
  /** 嵌入地图的缩放级别。原始链接是 21（最大），太近了看不到周边，这里放宽一些。 */
  zoom: 18,
} as const;

const coordinates = `${farm.latitude},${farm.longitude}`;

/**
 * 不需要 API key 的嵌入地址。
 * 官方的 Maps Embed API 需要密钥，静态站点里密钥会暴露在 HTML 中，
 * 所以先用这个免密钥的形式。
 */
export const mapEmbedUrl = `https://www.google.com/maps?q=${coordinates}&z=${farm.zoom}&hl=zh-CN&output=embed`;

/** 在 Google 地图中打开（新标签页）。 */
export const mapLinkUrl = `https://www.google.com/maps/@${coordinates},${farm.zoom}z`;
