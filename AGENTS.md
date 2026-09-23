# AGENTS.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目概述

通用前端工程骨架。单入口构建（`src/index.html` → `src/main.jsx`），内部通过路由前缀区分多个应用：

- `/src/app1`：应用一。
- `/src/app2`：应用二。
- `/src/shared`：两个应用共享的组件、样式、状态与工具。

应用数量与名称按需调整：改 `src/App.jsx` 的路由、重命名 `src/app*/` 目录即可。

## 表单验证

项目使用 **React Hook Form + Zod** 做表单验证，shadcn/ui base-nova 提供 `Field` 组件族展示字段与错误信息。
推荐模式、共享组件与约定见 `.agents/skills/form-validation/SKILL.md`（写表单时自动加载）。

## 【重要】组件创建规范

- **优先使用 shadcn/ui 已有组件**（https://ui.shadcn.com/docs/components），避免自行实现相同功能的通用 UI 组件。
- 若 shadcn/ui 无合适组件，按下面的分流规则决定放到 `/src/shared/ui` 还是 `/src/shared/components`。
- 仅在组件确实只属于单一应用且不会被共享时，才在 `/src/app1` 或 `/src/app2` 内部创建局部组件。

### 【重要】`shared/ui` 与 `shared/components` 的分流

| 目录                     | 放什么                           | 判断标准                                                                                                        | 现有例子                                                          |
| ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/src/shared/ui`         | **纯展示组件**（dumb component） | 只吃 props、只吐 JSX：不读 store、不发请求、不依赖路由与登录态；无状态或状态仅限纯 UI 交互（展开、hover、输入） | `button` / `input` / `dialog` / `select` / `data-table` / `stack` |
| `/src/shared/components` | **业务组件**（smart component）  | 含业务逻辑：读写 store、调接口、依赖登录态、路由等                                                              | 项目特有的 Header、数据启动加载组件等                             |

判断方法：组件里出现 `@shared/store`、`@shared/hooks`、`@shared/lib/request`、
`@shared/lib/urls` 中任意一个，或含硬编码的业务文案与接口字段名，就属于业务组件。

业务组件在 `components` 下按目录组织：一个组件一个目录，入口为 `index.jsx`，同目录平级放该组件私有的
`hooks` / 子组件 / `api.js` / `constants.js`；跨组件复用的 hooks 仍放 `/src/shared/hooks`。
两处组件的 JSDoc 注释规范一致，见 `src/shared/ui/AGENTS.md`。

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写（`.env` 已忽略，不入库）：

| 变量                                     | 说明                                             |
| ---------------------------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL`                      | 网关地址；留空则请求走同源相对路径               |
| `VITE_PASSPORT_URL`                      | 登录页地址；留空则登录态错误码不自动跳转         |
| `VITE_AUTH_ERROR_CODES`                  | 触发跳转登录的错误码，逗号分隔，如 `170,172,174` |
| `VITE_CSRF_COOKIE` / `VITE_UCSRF_COOKIE` | CSRF cookie 名；留空则不注入对应请求头           |

## 代码规范

ESLint 使用 flat config（`eslint.config.js`），已无 `.eslintrc.cjs` / `.eslintignore`：
忽略项写在配置顶部的 `ignores`，文件类型由各配置块的 `files` 决定，故 `pnpm lint` 不再需要 `--ext`。

未使用变量使用 `_` 前缀可忽略。

### 【重要】React 相关规则：只用 eslint-plugin-react-hooks

**不要引入 `eslint-plugin-react`。** 它已停止维护（7.37.5 为最后一版，2025-04），peer 范围不含
ESLint 10，启用即抛 `TypeError: contextOrFilename.getFilename is not a function`。

本模板的 React 检查由两处承担：

1. `eslint-plugin-react-hooks` v7 —— 16 条规则：2 条基础（`rules-of-hooks`、`exhaustive-deps`）
   加 14 条 React Compiler 规则（`set-state-in-effect`、`purity`、`static-components`、`immutability`
   等，其中 12 条 error 级），是当前 React 检查的主力；
2. ESLint 10 原生 —— 已能跟踪 JSX 引用，`no-unused-vars` / `no-undef` 无需插件辅助。

由此带来的两条约定：

- **仅在运行时用到 `React.xxx` 时才 `import * as React from 'react'`。** 构建走 automatic JSX
  runtime（产物是 `jsx`/`jsxs` 调用，不经 `React.createElement`），纯 JSX 文件里的 React 命名空间
  import 是死代码。JSDoc 中的 `{React.ReactNode}` 是纯文档（`tsconfig.json` 为 `checkJs: false`
  且未装 typescript），不受此约束。
- **列表渲染的 `key` 不再有 lint 检查**（原 `react/jsx-key` 已随之移除），靠 code review 把关。

若日后需要恢复 `jsx-key` 一类检查，可选：`@eslint-react/eslint-plugin`（活跃维护，但强制引入
`typescript` 作为 peer，且无 `no-unknown-property` / `jsx-no-target-blank` 对应规则），或自写
本地规则。

### 【重要】禁止同属性工具类重复（IDE 冲突警告）

同一元素上禁止同时书写作用于**同一 CSS 属性**的两个工具类（IDE 会报
`'xxx' applies the same CSS properties as 'yyy'` 冲突警告；运行时 `cn` 会剥离先写的冲突类，
只有最后一个生效，被剥离/被覆盖的一个是死代码）：

- 典型案例：`text-(--text)` 与 `placeholder:text-(--text-3)` 连用。占位符颜色**不要**在业务代码里用工具类指定：
    - shared `Input` / `Textarea` 基础类已内置 `placeholder:text-muted-foreground`；
    - 确需自定义占位符颜色时写 CSS 规则，不与 text 颜色类同写。
- 同理避免 `text-(--x) hover:text-(--x)` 这类与基础值相同的同色变体冗余。

### 【重要】已登记进 @theme 的 token 必须用短工具类，不写 `(--x)` 简写

`src/shared/styles/index.css` 的 `@theme inline` 里登记了 `--color-*`，Tailwind 会据此生成短工具类。
此时再写 `text-(--brand)` 这类 `var()` 简写，IDE 会报
`The class 'text-(--brand)' can be written as 'text-brand'`，且两种写法等价，属于冗余：

| 不要写                                                                    | 要写                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `text-(--brand)` / `text-(--brand-hi)` / `text-(--brand-text)`            | `text-brand` / `text-brand-hi` / `text-brand-text`            |
| `text-(--danger)` / `text-(--danger-text)` / `text-(--danger-text-light)` | `text-danger` / `text-danger-text` / `text-danger-text-light` |
| `text-(--success)` / `text-(--warning)`                                   | `text-success` / `text-warning`                               |
| `border-(--line)` / `border-(--danger)`                                   | `border-line` / `border-danger`                               |
| `bg-(--line)` / `bg-(--line-2)` / `bg-(--brand-hi)`                       | `bg-line` / `bg-line-2` / `bg-brand-hi`                       |
| `ring-(--brand-hi)`                                                       | `ring-brand-hi`                                               |
| `bg-(--bg-card)` / `bg-(--bg-card-hover)` / `bg-(--bg-soft)`              | `bg-card` / `bg-card-hover` / `bg-soft`                       |

最后一行是**别名**：`--bg-card` / `--bg-card-hover` / `--bg-soft` 与 `--card` / `--card-hover` / `--soft`
取值完全相同（见 tokens.css），后者才是登记名。

**判断方法**：变量名去掉 `--` 后，能在 `@theme inline` 中找到 `--color-<该名字>`，就用短工具类。

**仍用 `(--x)` 写法的两类**（无短类名可用，IDE 也不会警告）：

- 未登记进 `@theme` 的业务 token：`--text` / `--text-2` / `--text-3` → `text-(--text-3)`；
- 组件内部或第三方注入的变量：`--card-spacing`、`--anchor-width`、`--available-height`、`--transform-origin`。

短工具类经 `--color-*` → `:root` 上的 token 解析，**Portal 弹层内同样可用**。

### 【重要】直接子元素变体用 `*:` 前缀，不写 `[&>[attr]]`

子选择器是**单个属性选择器**时，`[&>[data-slot=x]]:h-full` 与 `*:data-[slot=x]:h-full`
完全等价，但前者 IDE 会报
`The class '[&>[data-slot=x]]:h-full' can be written as '*:data-[slot=x]:h-full'`：

| 不要写                                    | 要写                                    |
| ----------------------------------------- | --------------------------------------- |
| `[&>[data-slot=carousel-content]]:h-full` | `*:data-[slot=carousel-content]:h-full` |
| `[&>[data-state=open]]:opacity-100`       | `*:data-[state=open]:opacity-100`       |
| `[&>*]:w-full`                            | `*:w-full`                              |

**仍用 `[&>…]` 的三类**（没有 `*:` 等价写法，IDE 也不会警告）：

- 元素选择器：`[&>svg]:h-3.5`、`[&>a]:underline`、`[&>tr]:last:border-b-0`；
- 类选择器：`[&>.sr-only]:w-auto`；
- 选择器列表：`[&>[role=checkbox],[role=radio]]:mt-px`（`*:` 只能接单个选择器，逗号会把整条规则拆坏）。

ESLint 已按此规则拦截（`eslint.config.js` 的 `no-restricted-syntax`），只匹配上述第一类。

### 【重要】Portal 弹层内可直接使用 token

Dialog / Popover 等弹层内容会 Portal 到 `body`。本模板的 token（`--text`、`--text-2`、`--text-3`、
`--line`、`--brand` 等）**全部挂在 `:root`**（见 `src/shared/styles/tokens.css`），
不在任何 zone 类下，因此 Portal 弹层内**同样可解析**，短工具类（`text-brand`、`bg-card` 等）
与 `(--x)` 写法都可直接用，无需改写为字面值。

日后若引入 zone 级作用域（把 token 从 `:root` 挪到某个容器类下），弹层内才会失效——
届时把该容器类一并加到弹层节点上，或改用 html 级的语义 token（`muted-foreground`、`ring-ring`）。

## 【重要】Playwright 验证产物用后即清

用 `playwright-cli` 做页面验证时，产物一律落在 `.playwright-cli/`（已在 `.gitignore` 中），
**任务结束前删除本次生成的文件**：

```bash
rm -f .playwright-cli/*.png .playwright-cli/*.yml .playwright-cli/*.log
```

- `*.png` 截图、`page-*.yml` 快照、`console-*.log` 控制台日志，都是逐次命令产生的临时文件，无保留价值。
- **`--filename` 相对当前工作目录解析**，写 `--filename=verify.png` 会把截图丢到**仓库根目录**，
  成为未跟踪文件污染 `git status`。两种正确写法：
    - 不传 `--filename`：自动存为 `.playwright-cli/page-<时间戳>.png`；
    - 传相对路径：`--filename=.playwright-cli/verify-footer.png`。
- 任务收尾时一并 `git status` 复查，确认没有截图/日志类文件残留在仓库根目录。

## 【重要】注意事项

- 不要直接修改 `build/`，它是构建产物。
- 新增共享组件按「组件创建规范」分流：纯展示放 `/src/shared/ui`，含业务逻辑放 `/src/shared/components`；不要在各应用里各自维护。
- 若新增 `docs/` 目录存放文档，需确认 `src/shared/styles/index.css` 的 `@source not "../../../docs"` 仍指向它，避免文档正文里的工具类被 Tailwind 提取成死规则。
- `pnpm install` 可能提示某些依赖的 build scripts 被忽略（pnpm 默认阻止依赖执行安装脚本），
  一般不影响构建。Vite 8 已改用 rolldown，**esbuild 不再是依赖**，旧文档里的
  `pnpm rebuild esbuild` 已无意义；若确实有包需要执行安装脚本，用 `pnpm approve-builds`。
