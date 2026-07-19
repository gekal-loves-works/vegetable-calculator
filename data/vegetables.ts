export type Vegetable = {
  name: string;
  description: string;
  recommend: string;
  /** 単価（日本円、税込） */
  price: number;
};

/** 一覧表示用に id を含めた形。 */
export type VegetableWithId = Vegetable & { id: VegetableId };

export const vegetables = {
  tomato: {
    name: 'トマト（西红柿）',
    description: '甘みと酸味のバランスが良い完熟トマト。リコピンが豊富で、生食でも加熱でも美味しく食べられます。',
    recommend: 'カプレーゼ、トマトと卵の炒め物、トマトソースパスタ',
    price: 380,
  },
  cabbage: {
    name: 'キャベツ（卷心菜）',
    description: '葉が柔らかく甘みのある春キャベツ。ビタミンUを含み、胃にやさしい野菜です。',
    recommend: '回鍋肉、お好み焼き、コールスロー',
    price: 220,
  },
  carrot: {
    name: 'にんじん（胡萝卜）',
    description: 'β-カロテンをたっぷり含む根菜。加熱すると甘みが増し、油と一緒に摂ると吸収率が上がります。',
    recommend: 'きんぴら、キャロットラペ、カレー',
    price: 150,
  },
  spinach: {
    name: 'ほうれん草（菠菜）',
    description: '鉄分と葉酸が豊富な緑黄色野菜。あく抜きのため、さっと下茹でするのがおすすめです。',
    recommend: 'おひたし、ごま和え、ソテー',
    price: 260,
  },
  potato: {
    name: 'じゃがいも（土豆）',
    description: 'ホクホクとした食感の男爵いも。加熱してもビタミンCが壊れにくいのが特徴です。',
    recommend: 'ポテトサラダ、肉じゃが、フライドポテト',
    price: 180,
  },
  eggplant: {
    name: 'なす（茄子）',
    description: '皮の紫色はナスニンというポリフェノール。油との相性が抜群で、旨みをよく吸います。',
    recommend: '麻婆茄子、焼きなす、揚げ浸し',
    price: 240,
  },
} as const satisfies Record<string, Vegetable>;

export type VegetableId = keyof typeof vegetables;

export function isVegetableId(value: string): value is VegetableId {
  return value in vegetables;
}
