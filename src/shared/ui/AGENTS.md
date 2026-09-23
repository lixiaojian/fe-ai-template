# 共享 UI 组件规范

## 目录结构与归类

`/src/shared/ui` 下按语义分类存放组件，每个组件一个 `.jsx` 文件，入口为同目录的 `index.js`：

| 分类目录        | 放什么                                 | 现有组件                                                                                                            |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `general/`      | 通用：无明确语义归属的基础原子件       | `button` / `badge` / `separator`                                                                                    |
| `layout/`       | 布局：只负责排布与容器，不承载数据语义 | `card` / `carousel` / `col` / `row` / `stack`                                                                       |
| `navigation/`   | 导航：页面/视图之间的切换与位置指示    | `breadcrumb` / `dropdown-menu` / `tabs`                                                                             |
| `data-entry/`   | 数据录入：接收用户输入                 | `attachment` / `checkbox` / `field` / `form` / `input` / `label` / `radio-group` / `select` / `switch` / `textarea` |
| `data-display/` | 数据展示：只读呈现数据或占位           | `data-table` / `empty` / `progress` / `skeleton` / `table`                                                          |
| `feedback/`     | 反馈：告知用户状态、结果或补充说明     | `dialog` / `error-alert` / `sonner` / `tooltip`                                                                     |

归类有歧义时的判定依据：

- `progress` / `skeleton` 是度量与占位，不表达操作结果，归 `data-display` 而非 `feedback`；
- `card` 是容器，归 `layout`；若某天出现强绑业务语义的卡片，应先考虑是否属于 `/src/shared/components`；
- `attachment` 语义是待上传的文件，归 `data-entry`。

暂无 `misc/`：当前组件都有明确归属，真出现无法归类的再建，并同步更新本表。

子系统（如 `form`）可建**同名目录**，入口为 `index.jsx`，内部按职责拆成多个文件
（context / hooks / 纯函数 / 子组件）。判断标准：单个文件预计超过 300 行，
或内部有多份互不导出的私有 context 时建目录；否则维持「一个组件一个 `.jsx` 文件」。

## 测试

共享 UI 组件的测试放在同级 `__tests__/` 目录，文件名 `<组件>.test.jsx`：

```
layout/col.jsx          → layout/__tests__/col.test.jsx
data-entry/form/index.jsx → data-entry/form/__tests__/form.test.jsx
```

- 测试内引用被测模块一律走 `@shared/*` 精确路径（与业务代码一致），因此移动测试文件不需要改 import。
- 运行：`pnpm test`（等价于 `node --import ./scripts/register-loader.mjs --test "src/**/*.test.{js,jsx}"`）。
  `scripts/test-loader.mjs` 负责把 `@shared/*` 别名、省略的扩展名与 JSX 转换接进 Node 内置测试运行器，
  **不引入任何测试框架依赖**。
- 组件渲染断言用 `react-dom/server` 的 `renderToStaticMarkup`；需要交互行为的场景用
  `playwright-cli` 在示例页上验证（见根目录 `AGENTS.md`）。

## 引用约定

```js
// 业务代码：走统一出口，一次引入多个组件
import { Button, Input, Field } from '@shared/ui';

// ui 内部组件互相引用：走精确路径，不要 import 入口 index.js
import { Button } from '@shared/ui/general/button';
```

**ui 内部一律不走 `index.js`。** 入口对每个分类文件做 `export *`，若组件再反向 import 入口，
会形成循环依赖，并把全量组件拖进每个组件的依赖图（dev 冷启动与 HMR 都会变慢）。

新增组件时，除建文件外还需在 `index.js` 对应分类下补一行 `export * from './<分类>/<文件>'`。

## shadcn CLI 落点

`components.json` 的 `aliases.ui` / `aliases.components` 指向 `@shared/ui/general`，
因此 `pnpm shadcn add <name>` 新增的组件会**先落到 `general/`**。

落到 `general/` 后需人工两步收尾：

1. 若不属于通用类，`git mv` 到正确分类目录；
2. 在 `index.js` 对应分类下补 `export *`。

## JSDoc 注释规范

`/src/shared/ui` 下的所有共享 UI 组件必须包含规范的 JSDoc 注释：

- **文件顶部**：使用 `@file` / `@description` 说明组件用途。
- **每个导出组件**：使用 JSDoc 说明参数（`@param`）、类型、返回值（`@returns`）。
- **复杂常量/变体**：使用 JSDoc 说明其用途，例如 `badgeVariants`、`buttonVariants`。

示例：

```jsx
/**
 * @file 按钮组件（Button）
 * @description 基于 shadcn/ui 的 Button 组件...
 */

/**
 * Button 组件。
 * @param {Object} props - 组件属性。
 * @param {('default'|'outline')} [props.variant='default'] - 按钮样式变体。
 * @param {React.Ref<HTMLButtonElement>} ref - 转发到 button 元素的 ref。
 * @returns {JSX.Element}
 */
const Button = React.forwardRef(({ variant, className, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
));
```
