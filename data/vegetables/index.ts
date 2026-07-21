import { vegetables as generated } from './generated';

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
  dishes: readonly Dish[];
  /** 单价（日元／公斤，含税） */
  price: number;
  /**
   * 是否在售。蔬菜有季节性，过季时改成 false，
   * 该品种连同价格会从列表消失，详情页也不再生成。
   */
  available: boolean;
};

/** 列表展示用，附带 id。 */
export type VegetableWithId = Vegetable & { id: VegetableId };

/**
 * 数据源是同目录下的 <id>.md，由 scripts/build-vegetables.mjs 编译成 generated.ts。
 * 这里的 satisfies 保证生成结果符合上面的类型，同时保留 as const 推导出的字面量，
 * VegetableId 才能是联合类型而不是 string。
 */
export const vegetables = generated satisfies Record<string, Vegetable>;

export type VegetableId = keyof typeof vegetables;

export function isVegetableId(value: string): value is VegetableId {
  return value in vegetables;
}

/**
 * 过季的品种要从所有入口消失，所以列表、详情页、localStorage、
 * 订单文本解析都应该走这里，而不是直接遍历 vegetables。
 */
export const availableVegetableIds = (Object.keys(vegetables) as VegetableId[]).filter(
  (id) => vegetables[id].available,
);

export function isAvailableVegetableId(value: string): value is VegetableId {
  return isVegetableId(value) && vegetables[value].available;
}
