/**
 * 把 data/vegetables/*.md 编译成 data/vegetables/generated.ts。
 *
 * 为什么要生成而不是运行时读取：站点是 output: 'export' 的纯静态导出，
 * vegetables 在 pages/ 和 lib/ 里都是模块顶层 import，客户端 bundle 也要用；
 * 而且 VegetableId 是从 `as const` 对象推导出的字面量联合类型，全站的
 * 类型安全都挂在它上面。运行时解析 Markdown 会让它退化成 string。
 *
 * 用法：
 *   node scripts/build-vegetables.mjs           写入生成文件
 *   node scripts/build-vegetables.mjs --check   只校验，内容不一致时退出码 1（CI 用）
 *
 * 支持的 frontmatter 语法是 YAML 的一个刻意收窄的子集：
 *   key: 标量                  （字符串／数字／true／false）
 *   key:                       后跟缩进的 `- ` 列表，每项是若干 `key: 标量`
 * 除此之外的写法一律报错，不做静默降级。
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'data', 'vegetables');
const PUBLIC_DIR = join(ROOT, 'public');
const OUT_FILE = join(CONTENT_DIR, 'generated.ts');

/** frontmatter 里允许出现的键，以及各自要求的类型。多余的键报错，防止拼错后静默丢数据。 */
const VEGETABLE_FIELDS = {
  name: 'string',
  order: 'number',
  price: 'number',
  available: 'boolean',
  image: 'string',
  dishes: 'list',
};
const DISH_FIELDS = { name: 'string', image: 'string' };

class ContentError extends Error {}

function fail(file, message) {
  throw new ContentError(`${file}: ${message}`);
}

// ---------------------------------------------------------------- 解析

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function parseScalar(raw, file, lineNo) {
  const text = raw.trim();
  if (text === '') fail(file, `第 ${lineNo} 行的值为空`);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (/^'.*'$|^".*"$/s.test(text)) return text.slice(1, -1);
  return text;
}

function parsePair(line, file, lineNo) {
  const match = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/.exec(line.trim());
  if (!match) fail(file, `第 ${lineNo} 行不是合法的 "key: value"：${line}`);
  return { key: match[1], rest: match[2] };
}

function parseFrontmatter(lines, file) {
  const result = {};
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
    const items = [];
    i++;
    while (i < lines.length) {
      const itemLine = lines[i];
      if (itemLine.trim() === '') {
        i++;
        continue;
      }
      const dash = /^(\s+)-[ \t]+(.*)$/.exec(itemLine);
      if (!dash) break;

      // 列表项内后续的键要对齐到 "- " 之后的那一列。
      const fieldColumn = dash[1].length + 2;
      const item = {};
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

function splitDocument(raw, file) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/.exec(normalized);
  if (!match) fail(file, '开头缺少 --- 包裹的 frontmatter');
  return {
    frontmatter: parseFrontmatter(match[1].split('\n'), file),
    body: (match[2] ?? '').trim(),
  };
}

// ---------------------------------------------------------------- 校验

function checkFields(record, schema, file, where) {
  // 先报多余字段：键拼错时（prise / price）这条比"缺少 price"更直指问题。
  for (const key of Object.keys(record)) {
    if (!(key in schema)) fail(file, `${where}有多余的字段 "${key}"，可用的字段是 ${Object.keys(schema).join('、')}`);
  }
  for (const [key, expected] of Object.entries(schema)) {
    const value = record[key];
    if (value === undefined) fail(file, `${where}缺少 "${key}"`);
    const actual = Array.isArray(value) ? 'list' : typeof value;
    if (actual !== expected) fail(file, `${where}的 "${key}" 应该是 ${expected}，实际是 ${actual}`);
  }
}

function checkImage(path, file, where) {
  if (!path.startsWith('/')) fail(file, `${where}的图片路径要以 / 开头：${path}`);
  if (!existsSync(join(PUBLIC_DIR, path))) fail(file, `${where}的图片不存在：public${path}`);
}

function loadVegetable(fileName) {
  const id = basename(fileName, '.md');
  if (!/^[a-z][a-z0-9]*$/.test(id)) {
    fail(fileName, '文件名要是小写字母数字，它会直接变成 URL 里的 id');
  }

  const { frontmatter, body } = splitDocument(readFileSync(join(CONTENT_DIR, fileName), 'utf8'), fileName);
  checkFields(frontmatter, VEGETABLE_FIELDS, fileName, 'frontmatter ');
  checkImage(frontmatter.image, fileName, 'frontmatter');

  if (body === '') fail(fileName, 'frontmatter 之后缺少正文，正文就是列表和详情页上的介绍文字');
  if (frontmatter.dishes.length === 0) fail(fileName, 'dishes 不能为空');

  frontmatter.dishes.forEach((dish, index) => {
    const where = `dishes[${index}] `;
    checkFields(dish, DISH_FIELDS, fileName, where);
    checkImage(dish.image, fileName, where.trim());
  });

  return {
    id,
    order: frontmatter.order,
    vegetable: {
      name: frontmatter.name,
      // 正文是自由换行的 Markdown 段落，拼回一行给 UI 用。
      description: body.replace(/\s*\n\s*/g, ''),
      image: frontmatter.image,
      dishes: frontmatter.dishes.map((dish) => ({ name: dish.name, image: dish.image })),
      price: frontmatter.price,
      available: frontmatter.available,
    },
  };
}

// ---------------------------------------------------------------- 生成

function quote(text) {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function render(entries) {
  const body = entries
    .map(({ id, vegetable }) => {
      const dishes = vegetable.dishes
        .map((dish) => `      { name: ${quote(dish.name)}, image: ${quote(dish.image)} },`)
        .join('\n');
      return [
        `  ${id}: {`,
        `    name: ${quote(vegetable.name)},`,
        `    description: ${quote(vegetable.description)},`,
        `    image: ${quote(vegetable.image)},`,
        '    dishes: [',
        dishes,
        '    ],',
        `    price: ${vegetable.price},`,
        `    available: ${vegetable.available},`,
        '  },',
      ].join('\n');
    })
    .join('\n');

  return [
    '// 此文件由 scripts/build-vegetables.mjs 生成，请勿手动编辑。',
    '// 要改蔬菜数据，编辑 data/vegetables/<id>.md，然后运行 `npm run build:data`。',
    '// 键的顺序来自各文件 frontmatter 里的 order，它决定列表页的展示顺序。',
    '',
    'export const vegetables = {',
    body,
    '} as const;',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- 入口

function main() {
  const checkOnly = process.argv.includes('--check');

  const fileNames = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.md'));
  if (fileNames.length === 0) throw new ContentError(`${CONTENT_DIR} 里没有 .md 文件`);

  const entries = fileNames.map(loadVegetable).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const seen = new Map();
  for (const entry of entries) {
    const clash = seen.get(entry.order);
    if (clash) throw new ContentError(`${entry.id}.md 和 ${clash}.md 的 order 都是 ${entry.order}，展示顺序会不确定`);
    seen.set(entry.order, entry.id);
  }

  const output = render(entries);
  const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : null;

  if (checkOnly) {
    if (current !== output) {
      console.error('data/vegetables/generated.ts 和 data/vegetables/*.md 不一致。');
      console.error('请运行 `npm run build:data` 并提交生成结果。');
      process.exit(1);
    }
    console.log(`generated.ts 与 ${entries.length} 个 Markdown 源文件一致。`);
    return;
  }

  if (current === output) {
    console.log(`generated.ts 已是最新（${entries.length} 个品种）。`);
    return;
  }
  writeFileSync(OUT_FILE, output);
  console.log(`已生成 generated.ts（${entries.length} 个品种）。`);
}

try {
  main();
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`蔬菜数据有问题 —— ${error.message}`);
    process.exit(1);
  }
  throw error;
}
