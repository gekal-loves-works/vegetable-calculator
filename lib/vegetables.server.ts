/**
 * 在构建时读取 data/vegetables/*.md，一个品种一个文件。
 *
 * 只能从 getStaticProps / getStaticPaths 里 import。Next.js 会把这些函数
 * 和它们的依赖从客户端 bundle 里摘掉，所以这里用 node:fs 是安全的；
 * 但组件体内千万不要 import 它，否则构建会因为找不到 fs 而失败。
 *
 * 支持的 frontmatter 语法是 YAML 的一个刻意收窄的子集：
 *   key: 标量                  （字符串／数字／true／false）
 *   key:                       后跟缩进的 `- ` 列表，每项是若干 `key: 标量`
 * 除此之外的写法一律报错，不做静默降级 —— 数据出问题要在构建时就炸掉，
 * 而不是等到线上少了一个品种或者图片 404 才发现。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { Dish, VegetableWithId } from './vegetables';

const CONTENT_DIR = join(process.cwd(), 'data', 'vegetables');
const PUBLIC_DIR = join(process.cwd(), 'public');

/** frontmatter 里允许出现的键，以及各自要求的类型。多余的键报错，防止拼错后静默丢数据。 */
const VEGETABLE_FIELDS = {
  name: 'string',
  order: 'number',
  price: 'number',
  available: 'boolean',
  image: 'string',
  dishes: 'list',
} as const;

const DISH_FIELDS = { name: 'string', image: 'string' } as const;

type Scalar = string | number | boolean;
type Record_ = { [key: string]: Scalar | Record_[] };

function fail(file: string, message: string): never {
  throw new Error(`蔬菜数据有问题 —— ${file}: ${message}`);
}

// ---------------------------------------------------------------- 解析

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function parseScalar(raw: string, file: string, lineNo: number): Scalar {
  const text = raw.trim();
  if (text === '') fail(file, `第 ${lineNo} 行的值为空`);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (/^'[\s\S]*'$|^"[\s\S]*"$/.test(text)) return text.slice(1, -1);
  return text;
}

function parsePair(line: string, file: string, lineNo: number): { key: string; rest: string } {
  const match = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*([\s\S]*)$/.exec(line.trim());
  if (!match) fail(file, `第 ${lineNo} 行不是合法的 "key: value"：${line}`);
  return { key: match[1], rest: match[2] };
}

function parseFrontmatter(lines: string[], file: string): Record_ {
  const result: Record_ = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      i++;
      continue;
    }
    if (indentOf(line) !== 0) fail(file, `第 ${i + 1} 行有意料之外的缩进：${line}`);

    const { key, rest } = parsePair(line, file, i + 1);
    if (key in result) fail(file, `第 ${i + 1} 行重复定义了 "${key}"`);

    if (rest !== '') {
      result[key] = parseScalar(rest, file, i + 1);
      i++;
      continue;
    }

    // 空值说明后面跟着一个缩进列表。
    const items: Record_[] = [];
    i++;
    while (i < lines.length) {
      const itemLine = lines[i];
      if (itemLine.trim() === '') {
        i++;
        continue;
      }
      const dash = /^(\s+)-[ \t]+([\s\S]*)$/.exec(itemLine);
      if (!dash) break;

      // 列表项内后续的键要对齐到 "- " 之后的那一列。
      const fieldColumn = dash[1].length + 2;
      const item: Record_ = {};
      const first = parsePair(dash[2], file, i + 1);
      item[first.key] = parseScalar(first.rest, file, i + 1);
      i++;

      while (i < lines.length) {
        const fieldLine = lines[i];
        if (fieldLine.trim() === '') {
          i++;
          continue;
        }
        if (indentOf(fieldLine) < fieldColumn) break;
        const pair = parsePair(fieldLine, file, i + 1);
        if (pair.key in item) fail(file, `第 ${i + 1} 行重复定义了 "${pair.key}"`);
        item[pair.key] = parseScalar(pair.rest, file, i + 1);
        i++;
      }
      items.push(item);
    }

    if (items.length === 0) fail(file, `"${key}" 没有值，也没有跟着缩进列表`);
    result[key] = items;
  }

  return result;
}

function splitDocument(raw: string, file: string): { frontmatter: Record_; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/.exec(normalized);
  if (!match) fail(file, '开头缺少 --- 包裹的 frontmatter');
  return {
    frontmatter: parseFrontmatter(match[1].split('\n'), file),
    body: (match[2] ?? '').trim(),
  };
}

// ---------------------------------------------------------------- 校验

function checkFields(
  record: Record_,
  schema: Readonly<Record<string, string>>,
  file: string,
  where: string,
): void {
  // 先报多余字段：键拼错时（prise / price）这条比"缺少 price"更直指问题。
  for (const key of Object.keys(record)) {
    if (!(key in schema)) {
      fail(file, `${where}有多余的字段 "${key}"，可用的字段是 ${Object.keys(schema).join('、')}`);
    }
  }
  for (const [key, expected] of Object.entries(schema)) {
    const value = record[key];
    if (value === undefined) fail(file, `${where}缺少 "${key}"`);
    const actual = Array.isArray(value) ? 'list' : typeof value;
    if (actual !== expected) fail(file, `${where}的 "${key}" 应该是 ${expected}，实际是 ${actual}`);
  }
}

function checkImage(path: string, file: string, where: string): void {
  if (!path.startsWith('/')) fail(file, `${where}的图片路径要以 / 开头：${path}`);
  if (!existsSync(join(PUBLIC_DIR, path))) fail(file, `${where}的图片不存在：public${path}`);
}

// ---------------------------------------------------------------- 读取

type Entry = {
  order: number;
  available: boolean;
  vegetable: VegetableWithId;
};

function loadFile(fileName: string): Entry {
  const id = basename(fileName, '.md');
  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    fail(fileName, '文件名要是小写字母数字，它会直接变成 URL 里的 id');
  }

  const raw = readFileSync(join(CONTENT_DIR, fileName), 'utf8');
  const { frontmatter, body } = splitDocument(raw, fileName);

  checkFields(frontmatter, VEGETABLE_FIELDS, fileName, 'frontmatter ');
  checkImage(frontmatter.image as string, fileName, 'frontmatter');

  if (body === '') fail(fileName, 'frontmatter 之后缺少正文，正文就是列表和详情页上的介绍文字');

  const rawDishes = frontmatter.dishes as Record_[];
  if (rawDishes.length === 0) fail(fileName, 'dishes 不能为空');

  const dishes: Dish[] = rawDishes.map((dish, index) => {
    const where = `dishes[${index}] `;
    checkFields(dish, DISH_FIELDS, fileName, where);
    checkImage(dish.image as string, fileName, where.trim());
    return { name: dish.name as string, image: dish.image as string };
  });

  return {
    order: frontmatter.order as number,
    available: frontmatter.available as boolean,
    vegetable: {
      id,
      name: frontmatter.name as string,
      // 正文是自由换行的 Markdown 段落，拼回一行给 UI 用。
      description: body.replace(/\s*\n\s*/g, ''),
      image: frontmatter.image as string,
      dishes,
      price: frontmatter.price as number,
    },
  };
}

/**
 * 读出全部品种，按 frontmatter 里的 order 排序。
 * 每次构建只会跑几次，不做缓存。
 */
function loadAll(): Entry[] {
  const fileNames = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.md'));
  if (fileNames.length === 0) throw new Error(`蔬菜数据有问题 —— ${CONTENT_DIR} 里没有 .md 文件`);

  const entries = fileNames
    .map(loadFile)
    .sort((a, b) => a.order - b.order || a.vegetable.id.localeCompare(b.vegetable.id));

  const seen = new Map<number, string>();
  for (const entry of entries) {
    const clash = seen.get(entry.order);
    if (clash) {
      throw new Error(
        `蔬菜数据有问题 —— ${entry.vegetable.id}.md 和 ${clash}.md 的 order 都是 ${entry.order}，展示顺序会不确定`,
      );
    }
    seen.set(entry.order, entry.vegetable.id);
  }

  return entries;
}

/**
 * 在售的品种。过季的要从所有入口消失，所以列表、详情页、localStorage、
 * 订单文本解析都应该走这里，而不是直接读全量。
 */
export function loadAvailableVegetables(): VegetableWithId[] {
  return loadAll()
    .filter((entry) => entry.available)
    .map((entry) => entry.vegetable);
}
