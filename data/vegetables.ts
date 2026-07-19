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

export const vegetables = {
  xiangcai: {
    name: '香菜',
    description: '香气独特的芫荽，叶片鲜嫩。适合出锅前撒入或凉拌，久煮会损失香味。',
    image: '/images/vegetables/xiangcai.svg',
    dishes: [
      { name: '凉拌香菜', image: '/images/dishes/xiangcai-liangban.svg' },
      { name: '香菜牛肉', image: '/images/dishes/xiangcai-niurou.svg' },
      { name: '香菜羊肉汤', image: '/images/dishes/xiangcai-yangroutang.svg' },
    ],
    price: 1200,
    available: true,
  },
  jiucai: {
    name: '韭菜',
    description: '叶片扁平、味道浓郁的韭菜，膳食纤维丰富。宜大火快炒，保持脆嫩口感。',
    image: '/images/vegetables/jiucai.svg',
    dishes: [
      { name: '韭菜炒鸡蛋', image: '/images/dishes/jiucai-chaojidan.svg' },
      { name: '韭菜盒子', image: '/images/dishes/jiucai-hezi.svg' },
      { name: '韭菜饺子', image: '/images/dishes/jiucai-jiaozi.svg' },
    ],
    price: 600,
    available: true,
  },
  sigua: {
    name: '丝瓜',
    description: '肉质清甜多汁的夏季瓜类。去皮后易氧化变黑，建议现切现做。',
    image: '/images/vegetables/sigua.svg',
    dishes: [
      { name: '蒜蓉丝瓜', image: '/images/dishes/sigua-suanrong.svg' },
      { name: '丝瓜炒蛋', image: '/images/dishes/sigua-chaodan.svg' },
      { name: '丝瓜蛤蜊汤', image: '/images/dishes/sigua-gelitang.svg' },
    ],
    price: 800,
    available: true,
  },
  niujiajiao: {
    name: '牛角椒',
    description: '辣度适中的鲜辣椒，富含维生素 C。可作主菜也可作配色提辣。',
    image: '/images/vegetables/niujiajiao.svg',
    dishes: [
      { name: '虎皮青椒', image: '/images/dishes/niujiajiao-hupiqingjiao.svg' },
      { name: '辣椒炒肉', image: '/images/dishes/niujiajiao-chaorou.svg' },
      { name: '剁椒鱼头', image: '/images/dishes/niujiajiao-duojiaoyutou.svg' },
    ],
    price: 600,
    available: true,
  },
  sijidou: {
    name: '四季豆',
    description: '爽脆饱满的四季豆。生的含皂苷，必须彻底加热熟透后再食用，避免夹生。',
    image: '/images/vegetables/sijidou.svg',
    dishes: [
      { name: '干煸四季豆', image: '/images/dishes/sijidou-ganbian.svg' },
      { name: '四季豆焖面', image: '/images/dishes/sijidou-menmian.svg' },
      { name: '蒜蓉四季豆', image: '/images/dishes/sijidou-suanrong.svg' },
    ],
    price: 800,
    available: true,
  },
} as const satisfies Record<string, Vegetable>;

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
