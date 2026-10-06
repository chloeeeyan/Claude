# 鬼牌夜场 · Joker Night

波普漫画风的扑克构筑网页游戏：凑牌型拿筹码 × 倍率，过关买小丑、星图和塔罗，打过 8 个底注。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev      # 开发服务器，改代码自动刷新
npm test         # 单元测试（规则、计分、存档、种子复现）
npm run sim      # 平衡模拟器，例：npm run sim -- n=400 deck=blue stake=1
npm run build    # 打包到 dist/，可直接部署为静态网站
```

## 目录结构

```
src/
  core/          游戏规则，不碰页面，测试和模拟器直接调用
    cards.js       花色、点数、牌面基础
    rules.js       牌型、盲注、Boss、增强、印、牌组、难度、跳过奖励
    jokers.js      小丑清单与效果钩子
    tarots.js      塔罗清单
    evaluate.js    牌型识别
    scoring.js     目标分、牌型等级、计分流水（返回逐步动画用的 steps）
    run.js         一局的状态机：选关 → 出牌 → 结算 → 商店 …
    rng.js         带种子的随机数（同一种子可完整复现一局）
    save.js        带版本号的存档格式与迁移
  ui/            界面
    store.js       当前对局与本地偏好（localStorage）
    hud.js         顶部抬头栏与「这一手」计分面板
    shelf.js       小丑 / 塔罗贴纸架与详情面板
    screens.js     牌桌上各阶段的内容（封面、选关、对局、结算、商店、结束）
    guide.js       玩法、牌型图鉴、牌组查看弹窗
    play.js        出牌与计分动画
    input.js       点击、键盘、拖动排序
    components.js  卡牌、小丑、塔罗、星图的 HTML 片段
  styles/        按组件拆分的样式，index.css 统一引入
tests/           Vitest 单元测试
tools/sim.js     平衡模拟器（贪心机器人批量对局）
```

## 存档与种子

- 对局自动存在浏览器本地（`jn.run`），格式带版本号。修改对局数据结构时，在 `src/core/save.js` 里把 `SAVE_VERSION` 加一，并写一个迁移函数，老玩家的进度就不会丢。
- 每局有一个种子，结束画面会显示。用同一个种子调用 `freshState(deck, stake, seed)` 可以完整复现那一局，方便排查问题。

## 部署（EdgeOne Pages）

构建设置写在根目录 `edgeone.json`（会覆盖控制台里的同名设置）：安装 `npm ci`、构建 `npm run build`、输出 `./dist`、Node 20.18.0；
`/assets/*` 带哈希文件名，长缓存；`index.html` 不缓存，发版后玩家刷新即可拿到新版。

1. 在 EdgeOne Pages（国际站）用 GitHub 登录，导入这个仓库。
2. 框架预设选 Vite（或「Other」），构建命令 `npm run build`，输出目录 `dist`，生产分支 `main`。
3. 之后每次推送到 `main`，网站会自动重新构建并更新；其他分支 / PR 会生成预览地址。

字体（站酷快乐体、Luckiest Guy）随项目一起打包，不依赖 Google 字体服务，国内可以正常加载。
