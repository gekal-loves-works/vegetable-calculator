# 蔬菜价格计算

自家菜地的蔬菜价目表。客户可以按重量选购、算出总价，并把订单以纯文本发回来。

线上地址：<https://vege-calc.services.gekal.cn/>

## 技术栈

| 项目 | 说明 |
| --- | --- |
| 框架 | Next.js（Pages Router）+ TypeScript |
| 输出 | 静态导出（`output: 'export'`），无服务端 |
| 样式 | 原生 CSS（`styles/globals.css`），支持浅色/深色 |
| 托管 | GitHub Pages + GitHub Actions，自定义域名 |
| 数据 | `data/vegetables/*.md` + `data/*.ts`，没有数据库 |

## 开发

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 静态导出到 out/
npm run typecheck  # tsc --noEmit
npm run build:data # 把 data/vegetables/*.md 编译成 generated.ts
```

> `dev` 和 `build` 会自动先跑 `build:data`。只有在 dev 已经起着的时候改了 `.md`，
> 才需要手动跑一次 `npm run build:data`（或重启 dev）。

> `npm run build` 会重建 `.next/`。dev 正在跑的时候执行会让 dev 报
> `Cannot find module ./chunks/...`，先停 dev 再构建。

## 目录

```
data/vegetables/<id>.md    蔬菜数据，一个品种一个文件（唯一的商品来源）
data/vegetables/generated.ts  由上面的 .md 生成，别手改
data/vegetables/index.ts   类型与筛选逻辑，代码从这里 import
scripts/build-vegetables.mjs  .md → generated.ts 的编译脚本
data/farm.ts         菜地坐标与地图链接
data/site.ts         站点地址、名称、OGP 图片
components/SeoHead.tsx  标题与 OGP 标签
lib/weight.ts        重量解析、步进、规整
lib/format.ts        金额格式化
lib/orderText.ts     订单文本的生成与解析
lib/useWeights.ts    重量状态 + localStorage
lib/asset.ts         静态资源路径（补 basePath）
pages/index.tsx      列表、合计、地图
pages/vegetables/[id].tsx  详情
public/images/       蔬菜与料理图片
```

## 日常维护

### 蔬菜数据长什么样

每个品种一个 Markdown 文件，**文件名就是网址里的 id**（`data/vegetables/xiangcai.md`
→ `/vegetables/xiangcai/`）。frontmatter 放结构化字段，正文就是介绍文字：

```markdown
---
name: 香菜
order: 1                              # 列表页的展示顺序
price: 1200                           # 日元／公斤，整数
available: true
image: /images/vegetables/xiangcai.svg
dishes:
  - name: 凉拌香菜
    image: /images/dishes/xiangcai-liangban.svg
---

香气独特的芫荽，叶片鲜嫩。适合出锅前撒入或凉拌，久煮会损失香味。
```

改完跑 `npm run build:data`，它会重新生成 `generated.ts`，**生成结果要一起提交**。
CI 会检查两者是否一致，忘了生成会被拦下来。

frontmatter 只支持上面这几种写法（标量 + 缩进列表），不是完整 YAML。
字段拼错、类型不对、图片文件不存在、`order` 撞车，脚本都会指名报错，不会静默通过。

### 改价格

对应 `.md` 里改 `price`，然后 `npm run build:data`。单位是**日元／公斤**，整数。

### 过季下架

把 `available` 改成 `false` 即可。该品种会从列表消失，详情页不再生成（旧链接变 404），
价格也不会出现在 HTML 里。客户拿旧订单文本回来时，过季的品种会被忽略，不计入合计。

全部品种都 `false` 时，页面显示「当前没有在售的蔬菜，请等待下一季。」

### 增加品种

1. 新建 `data/vegetables/<key>.md`，`<key>` 用拼音（会成为网址 `/vegetables/<key>/`）
2. 放图片到 `public/images/vegetables/<key>.svg` 和 `public/images/dishes/<key>-*.svg`
3. `image` 路径以 `/images/` 开头，不要写 basePath
4. `order` 给一个没被占用的值，决定它排在列表第几位
5. `npm run build:data`，把 `.md` 和 `generated.ts` 一起提交

字段不全或图片路径写错时，`build:data` 会报错，照着提示补。

### 换图片

现在 `public/images/` 下全是**占位图**（画着品名的 SVG），上线前需要换成真实照片。

- 建议同名替换，然后把对应 `.md` 里的扩展名从 `.svg` 改成 `.jpg`
- 改品种名时，**图片文件名、`.md` 里的路径、图片内容三者要一起改**，漏一个就会 404
  （路径写错时 `build:data` 会直接报「图片不存在」，不用等到线上 404）
- 用外部 CDN 的话，需要在 `next.config.ts` 配 `images.remotePatterns`

### 改菜地位置

`data/farm.ts` 里改 `latitude` / `longitude` / `zoom` / `label`。

地图用的是免 API key 的嵌入形式。链接必须用 `?api=1` 的官方格式：
`/maps/@纬度,经度,18z` 这种只会移动地图，**不会放图钉，也无法导航**。

### 改站点名 / 分享卡片

`data/site.ts` 里改 `origin`、`name`、`description`。

SNS 分享时显示的卡片靠 OGP 标签（`components/SeoHead.tsx`），
**没有这些标签，聊天里就只会出现一条光秃秃的网址**。注意两点：

- `og:url` 和 `og:image` 必须是绝对地址，所以 `origin` 要和实际域名一致
- 卡片图是 `public/og-image.png`（1200×630）。多数平台不认 SVG，必须用 PNG/JPEG

### 图标

`public/favicon.svg` 是唯一的源文件（绿底 + 计算器 + 嫩芽）。改了以后要重新导出各尺寸：

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `favicon.svg` | 矢量 | 现代浏览器标签页 |
| `favicon-32.png` | 32 | 旧浏览器回退 |
| `apple-touch-icon.png` | 180 | iOS 添加到主屏幕（圆角由系统加，所以这张是直角满铺） |
| `favicon-192/512.png` | 192 / 512 | `site.webmanifest`（Android 主屏幕） |

导出用无头 Chrome 截图即可，仓库里没有装图形库。

### 分享卡片的缓存

改了以后各平台会缓存旧卡片，用官方调试器强制刷新：

- Facebook：<https://developers.facebook.com/tools/debug/>
- X：<https://cards-dev.twitter.com/validator>
- LINE / WeChat 没有公开的刷新入口，加 `?v=2` 之类的参数可以绕开缓存

## 订单文本

「复制订单」生成的格式：

```
【蔬菜订单】
香菜 × 1.5 公斤 = ¥1,800
韭菜 × 0.5 公斤 = ¥300
合计 ¥2,100
```

「粘贴导入」按「品名 + 数字 + 公斤／kg／千克」来识别，所以对方加了寒暄、
删了金额、调了顺序都能读回来。认不出的行直接跳过；一种都认不出时保留现有输入不动。

导入是**整体替换**，不是合并。

> 解析靠品名匹配，所以改了 `name` 之后，改名前发出去的订单文本里那个品种就读不回来了。

## 数据保存

客户填的重量存在 `localStorage`（键 `vegetable-calculator:weights`），列表页和详情页共用。

静态导出的页面是预渲染的，首帧不能读 `localStorage`（否则 hydration 不一致），
所以**加载瞬间输入框是空的**，随后才填入。读取时会丢弃已下架和格式不对的数据。

## 部署

push 到 `main` 后 GitHub Actions 自动构建并发布。

站点在自定义域名的**根目录**，所以**不要**设置 `NEXT_PUBLIC_BASE_PATH`。
设了会给所有资源加上 `/<repo>/` 前缀，导致全部 404。
域名靠 `public/CNAME` 固定。

如果以后改回 `https://<user>.github.io/<repo>/` 这种子路径，在 workflow 的构建步骤加上：

```yaml
env:
  NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}
```

代码不用改——`lib/asset.ts` 会给图片补前缀（`next/image` 在 `unoptimized` 下不会自动补）。

## 依赖更新

Dependabot 每周一早上检查更新（`.github/dependabot.yml`）：

- **github-actions** — Node 20 弃用这类警告靠它跟上，官方 actions 打包成一个 PR
- **npm** — minor / patch 合成一个 PR；major 单独开

React 和 TypeScript 的大版本被忽略了，因为要跟着 Next.js 走
（装过 TypeScript 7.x，Next 15 直接构建失败）。升 Next.js 时一起手动升。

PR 会跑 `.github/workflows/ci.yml`（typecheck + build）。
部署工作流只在 push 到 main 时触发，所以 PR 阶段需要单独的验证。

## 已知限制

- `public/images/` 全是占位图，需要换成真实照片
- 价格是含税日元整数，重量乘出来的金额四舍五入到 1 日元
- 单次下单上限 99 公斤，步进 0.1 公斤
- 数据只在浏览器本地，换设备或清缓存就没了；跨设备靠订单文本传递
- 改数据后需要重新构建部署才会生效
