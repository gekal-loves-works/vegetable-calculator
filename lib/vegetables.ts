/**
 * 蔬菜数据的类型与常量。
 *
 * 这里不碰文件系统，客户端代码可以放心 import。
 * 真正读取 data/vegetables/*.md 的是 lib/vegetables.server.ts，
 * 它只允许在 getStaticProps / getStaticPaths 里用。
 */

/** 所有商品统一按重量计价，单价基准为 1 公斤。 */
export const PRICE_UNIT_LABEL = '1公斤';

/** 推荐料理。image 为 public/ 下的绝对路径，basePath 由 next/image 自动补全。 */
export type Dish = {
  name: string;
  image: string;
};

export type Vegetable = {
  name: string;
  description: string;
  /** 介绍图片，public/ 下的绝对路径。 */
  image: string;
  dishes: Dish[];
  /** 单价（日元／公斤，含税） */
  price: number;
};

/** 品种 id，等于 data/vegetables/ 下的 Markdown 文件名。 */
export type VegetableId = string;

/** 列表展示用，附带 id。 */
export type VegetableWithId = Vegetable & { id: VegetableId };

/**
 * parseOrderText 认品名时用的最小信息。
 * 页面把它从 props 传进来，这样订单解析不需要 import 全量数据。
 */
export type VegetableName = {
  id: VegetableId;
  name: string;
};
