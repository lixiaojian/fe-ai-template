# fe-template

通用前端工程骨架。单入口构建，通过路由前缀区分多个应用。

## 技术栈

- React 19 + react-router-dom v7
- Zustand 5（状态管理）
- Tailwind CSS v4（统一样式体系）
- [shadcn/ui](https://ui.shadcn.com/)（共享组件放 `/src/shared/ui`）
- axios（`/src/shared/lib/request.js`）
- Vite（单入口构建）
- ESLint + Prettier
- pnpm

## 快速开始

要求 Node `^20.19.0 || >=22.12.0`（Vite 8 / ESLint 10 的下限）。

```bash
pnpm install
cp .env.example .env   # 按需填写环境变量
pnpm dev
```

开发地址：

- 应用一：`http://localhost:5173/app1/`
- 应用二：`http://localhost:5173/app2/`

## 常用命令

| 命令            | 说明                                 |
| --------------- | ------------------------------------ |
| `pnpm dev`      | 启动开发服务器（默认端口 5173）      |
| `pnpm devPrd`   | 以 production 模式启动开发服务器     |
| `pnpm build`    | 生产构建，输出到 `build/`            |
| `pnpm buildPre` | 预发布构建（`--mode preproduction`） |
| `pnpm preview`  | 预览生产构建                         |
| `pnpm lint`     | 运行 ESLint（`.js` 和 `.jsx`）       |
| `pnpm format`   | 运行 Prettier 格式化                 |

环境变量按 mode 加载：`.env` 通用，`.env.production` / `.env.preproduction` 按 mode 覆盖
（`envDir` 已指向仓库根，见 `vite.config.js`）。

## 目录说明

```
├── src/
│   ├── index.html       # 唯一入口 HTML
│   ├── main.jsx         # 入口脚本（挂载 BrowserRouter）
│   ├── App.jsx          # 顶层路由（/app1/* 与 /app2/*）
│   ├── app1/            # 应用一
│   ├── app2/            # 应用二
│   └── shared/
│       ├── components/  # 跨应用共享的业务组件
│       ├── hooks/       # 共享 Hooks
│       ├── ui/          # shadcn/ui 组件
│       ├── styles/      # Tailwind 入口和 CSS 变量
│       ├── store/       # Zustand store
│       └── lib/         # 工具函数（request、urls、poll 等）
├── .agents/skills/      # AI skill 实体（见下方「AI Agent 配置」）
├── vite.config.js       # Vite 单入口配置
├── postcss.config.js    # PostCSS 配置（Tailwind v4）
└── components.json      # shadcn/ui 配置
```

## 单入口构建

Vite 以 `src/index.html` 为唯一入口，生产构建输出到 `build/`：

- `build/index.html`
- `build/assets/*`（第三方依赖统一打入 `vendor` chunk，业务代码打入入口 chunk）

开发服务器通过自定义 `spaEntryPlugin` 将任意路径请求重写为 `src/index.html`，避免刷新 404。

## 共享代码

项目内通过 Vite alias `@shared` 引用共享模块：

```js
import { Button } from '@shared/ui/button';
import { createAsyncStoreSlice } from '@shared/lib/storeFactory';
import { poll } from '@shared/lib/poll';
```

## 请求层

- `shared/lib/urls.js`：站点地址，由环境变量注入。
- `shared/lib/request.js`：axios 实例 + 拦截器（CSRF 注入、form-urlencoded 序列化、登录态跳转）。
- `shared/lib/poll.js`：通用轮询工具，数据获取通过 `fetcher` 注入。
- `shared/lib/storeFactory.js`：异步加载型 store 的样板切片。

## 添加 shadcn/ui 组件

项目使用 JavaScript，已配置 `components.json` 的 `tsx: false`。

```bash
npx shadcn add button
pnpm format   # 上游产物用双引号 / 2 空格 / 无分号，与本仓库 Prettier 配置不符，必须格式化
```

组件会安装到 `/src/shared/ui` 目录下，所有应用都可以引用。

两点注意：

- 新组件落地后不跑 `pnpm format`，`pnpm lint` 会因 prettier 规则直接报错。
- 对**已存在**的组件执行 `add`（如 `button`）会用上游版本覆盖本仓库的定制（尺寸变体、JSDoc 头等），
  改动前先 `git diff` 确认。

## AI Agent 配置

本仓库的 AI skill 采用「**实体集中存放 + 各工具软链接入**」：skill 实体放 `.agents/skills/`（随仓库分发），各 agent 工具在自己的配置目录里用符号链接指过来。

`.agents/skills/` 是 [Agent Skills](https://agentskills.io) 生态的跨客户端约定——规范本身只定义 skill 目录**内部**的结构（`SKILL.md` + 可选 `scripts/`、`assets/`），并不规定放在哪。Codex、OpenCode 把它当原生查找路径直接扫；**Claude Code 不扫 `.agents/`，只认 `.claude/skills/`**，所以需要软链把实体接进来（官方支持这种写法，多个位置指向同一目标时只加载一次）。

`.claude/` 属本机配置、不入库，因此 clone 后软链需要自己建。仓库根的 `AGENTS.md` 三个工具都原生读取。

**新增 skill 时**：实体一律放 `.agents/skills/<name>/SKILL.md`，再在 `.claude/skills/` 下建软链。不要把实体直接放进 `.claude/skills/`，那样只有 Claude Code 能用。

### 首次 clone 后

`.claude/` 不入库，软链不在仓库里，需要手动建立。把下面这段交给当前使用的 agent 执行即可：

> 本仓库的 AI skill 实体存放在 `.agents/skills/`，但 Claude Code 只扫描 `.claude/skills/`。请你在 `.claude/skills/` 下为每个 skill 建立相对路径的符号链接（目标写 `../../.agents/skills/<skill-name>`），使其对 Claude Code 可见；完成后验证每个链接能正确解析，且能读到其中的 `SKILL.md`。

## 注意事项

- 不要直接修改 `build/` 目录，它是构建产物。
- 新增共享组件时统一放到 `/src/shared/ui`，不要在各应用里各自维护。
- `pnpm install` 可能会提示 esbuild build scripts 被忽略，目前不影响构建；如遇到 esbuild 相关报错，可执行 `pnpm rebuild esbuild`。
