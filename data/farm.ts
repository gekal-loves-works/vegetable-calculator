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

/**
 * 以下用 Google Maps URLs 官方格式（api=1）。
 * `/maps/@lat,lng,18z` 只是把地图移到该位置，不会放置图钉，
 * 因此无法作为导航目的地，不要用那种形式。
 */

/** 在 Google 地图中打开并显示图钉。 */
export const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;

/** 导航到菜地。不指定 origin，Google 会以用户当前位置作为起点。 */
export const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`;
