# 共享 Form 组件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `src/shared/ui` 下新增一套声明式 Form 组件，API 形态对齐 Ant Design Form，底层以 React Hook Form 为唯一状态引擎。

**Architecture:** `Form` 内部调用 RHF `useForm`，并注入一个**合成 resolver**（先跑用户传入的 `resolver`，再补跑字段级 `rules`，合并 errors）。`FormInstance` 是 RHF 方法的薄适配层，不持有独立状态。`Form.Item` 通过 `cloneElement` 把值注入子控件，控件类型由内置适配表按**组件引用**识别。栅格由新增的 `Row` / `Col`（24 列 CSS Grid）承担，类名靠 Tailwind 的 `@source inline` 指令生成。

**Tech Stack:** React 19、React Hook Form 7.88、Zod 4、@base-ui/react、Tailwind 4.3、Vite 8、Node 24 内置测试（`node --test`）

**Spec:** `docs/superpowers/specs/2026-09-23-shared-form-component-design.md`

## Global Constraints

- 不引入任何新依赖（不装 jsdom / vitest / eslint-plugin-react / antd）。
- 不改 `build/`（构建产物）。
- 代码注释、JSDoc、错误消息统一用中文。
- 共享 UI 组件必须带 JSDoc（`@file` / `@description` / `@param` / `@returns`），见 `src/shared/ui/AGENTS.md`。
- `src/shared/ui` 内部组件互相引用走**精确路径**（`@shared/ui/general/button`），禁止 import `@shared/ui/index.js`。
- 仅在运行时用到 `React.xxx` 时才 `import * as React from 'react'`。
- 同一元素上禁止写作用于同一 CSS 属性的两个工具类（`cn` 会剥离先写的那个，是死代码）。
- 已登记进 `@theme inline` 的 token 用短工具类（`text-brand`），不写 `text-(--brand)`；未登记的用 `(--x)` 写法（`text-(--text-3)`）。
- 直接子元素变体用 `*:` 前缀，不写 `[&>[attr]]`。
- 列表渲染的 `key` 无 lint 覆盖，靠 code review 把关。
- Playwright 产物落 `.playwright-cli/`，任务收尾删除；收尾复查 `git status`。
- 测试文件与源文件**同目录**，命名 `<name>.test.jsx`。
- 测试命令统一为：`node --import ./scripts/register-loader.mjs --test <文件或 glob>`。

## Review Focus

以下五类输入/条件 spec 未逐条展开，但最可能在使用中出问题。每一条都在拥有该代码的任务里配了对应测试：

1. **空值边界**：`undefined` / `null` / `''` / `[]` 传给 `required`、`min`、`len`、`type`。期望：`required` 对空串与空数组都判失败；`min` / `len` 对 `undefined` 跳过而非抛异常。
2. **`Form.List` 删除中间项后的索引重建**：删掉 `items[1]` 后，原 `items[2]` 的值与错误应迁移到 `items[1]`，不串位、不残留。
3. **`Form.Item` 子元素异常**：子元素是 `null`、字符串或数组时，期望开发期告警而非崩溃；`null` 时不注册字段。
4. **`setFieldsValue` 写未注册字段**：期望值能进 store 并在提交时取到（antd 语义），而非静默丢弃。
5. **`message` 模板变量缺失**：写了 `${min}` 但规则未给 `min` 时，期望回退到默认文案，而不是渲染出 `undefined`。

---

## 文件结构

| 文件                                             | 职责                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `scripts/test-loader.mjs`                        | 已存在。Node 测试用 loader：`@shared/*` 别名、补扩展名、Oxc 转 JSX |
| `scripts/register-loader.mjs`                    | 已存在。`register()` 入口                                          |
| `src/shared/ui/layout/col.jsx`                   | 新增。24 列栅格列                                                  |
| `src/shared/ui/layout/row.jsx`                   | 新增。24 列栅格行                                                  |
| `src/shared/ui/data-entry/form/rules.js`         | 新增。`rules` → 校验函数数组 + message 模板                        |
| `src/shared/ui/data-entry/form/context.js`       | 新增。FormContext / ItemContext / ListContext                      |
| `src/shared/ui/data-entry/form/use-form.js`      | 新增。`useForm` 包装 + FormInstance 适配 + `useFormInstance`       |
| `src/shared/ui/data-entry/form/field-adapter.js` | 新增。控件适配表 + `cloneElement` 注入                             |
| `src/shared/ui/data-entry/form/field-layout.js`  | 新增。`labelCol` / `wrapperCol` → Row/Col props                    |
| `src/shared/ui/data-entry/form/form-item.jsx`    | 新增。`Form.Item`                                                  |
| `src/shared/ui/data-entry/form/form-list.jsx`    | 新增。`Form.List` + `Form.ErrorList`                               |
| `src/shared/ui/data-entry/form/index.jsx`        | 新增。`Form` 主体 + 聚合导出                                       |
| `src/shared/styles/index.css`                    | 修改。追加 4 条 `@source inline`                                   |
| `src/shared/ui/index.js`                         | 修改。补 3 行 `export *`                                           |
| `src/shared/ui/AGENTS.md`                        | 修改。补组件表与目录约定                                           |
| `src/app1/pages/form-demo.jsx`                   | 新增。示例页（保留）                                               |

---

## Task 1: 栅格基座（Row / Col）

**Files:**

- Modify: `src/shared/styles/index.css`（在 `@source not "../../../docs"` 之后追加）
- Create: `src/shared/ui/layout/col.jsx`
- Create: `src/shared/ui/layout/row.jsx`
- Create: `src/shared/ui/layout/col.test.jsx`
- Modify: `src/shared/ui/index.js`

**Interfaces:**

- Consumes: 无
- Produces:
    - `colClassName(props) -> string`：属性 → 类名字符串，供 `field-layout.js` 复用
    - `colStyle(props) -> Object|undefined`：push / pull 的位移内联样式
    - `Row`：`{ gutter?: number | [number, number], justify?, align?, wrap?, className?, style?, children }`
    - `Col`：`{ span?, offset?, push?, pull?, xs?/sm?/md?/lg?/xl?/xxl?: number | { span?, offset?, push?, pull? }, className?, style?, children }`

**实现要点（务必遵守）：** `offset` 与 `push` 在 antd 里是两套机制 —— `offset` 是左侧留白（改栅格起始线），`push`/`pull` 是相对位移（`position: relative` + `left`/`right` 百分比）。若把 `offset` 与 `push` 都映射成 `col-start-*`，同一元素会出现两个同属性工具类，`cn` 会剥离先写的那个。因此：

- `span` → `col-span-N`（类名）
- `offset` → `col-start-(offset+1)`（类名）
- `push` / `pull` → 内联 `style` 的 `position: relative; left/right: N%`（百分比无法预生成静态类）

- [ ] **Step 1: 追加 Tailwind 类名生成指令**

编辑 `src/shared/styles/index.css`，在 `@source not "../../../docs";` 那一行之后追加：

```css
/* 栅格类名：Row/Col 按属性动态拼类名（col-span-${n}），Tailwind 扫不到字符串以外的形态，
   故用 @source inline 显式生成。花括号展开由 Tailwind 4 原生支持，
   覆盖 0-24 span、1-25 起始线/结束线与全部断点变体。 */
@source inline("{,sm:,md:,lg:,xl:,2xl:}col-span-{0..24}");
@source inline("{,sm:,md:,lg:,xl:,2xl:}col-start-{1..25}");
@source inline("{,sm:,md:,lg:,xl:,2xl:}col-end-{1..25}");
@source inline("grid-cols-24");
```

- [ ] **Step 2: 写失败测试**

创建 `src/shared/ui/layout/col.test.jsx`：

```jsx
/**
 * @file 栅格列组件测试（Col）
 * @description 校验属性到类名 / 内联样式的映射：span / offset 走类名，push / pull 走位移样式。
 */

import test from 'node:test';
import assert from 'node:assert';
import { colClassName, colStyle } from '@shared/ui/layout/col';

test('span 映射为 col-span-N', () => {
    assert.equal(colClassName({ span: 12 }), 'col-span-12');
    assert.equal(colClassName({ span: 0 }), 'col-span-0');
});

test('offset 映射为 col-start-(N+1)', () => {
    // offset 是左侧留白 N 列，等价于起始线右移 N 条
    assert.equal(colClassName({ span: 6, offset: 6 }), 'col-span-6 col-start-7');
    assert.equal(colClassName({ span: 24, offset: 0 }), 'col-span-24 col-start-1');
});

test('push / pull 不产生类名，改走内联样式', () => {
    // 关键回归点：push 若也输出 col-start-*，会与 offset 撞同一 CSS 属性
    assert.equal(colClassName({ span: 8, push: 4 }), 'col-span-8');
    assert.deepEqual(colStyle({ push: 4 }), { position: 'relative', left: '16.6667%' });
    assert.deepEqual(colStyle({ pull: 4 }), { position: 'relative', right: '16.6667%' });
});

test('offset 与 push 同时给出时两者都保留且不冲突', () => {
    assert.equal(colClassName({ span: 6, offset: 3, push: 2 }), 'col-span-6 col-start-4');
    assert.deepEqual(colStyle({ span: 6, offset: 3, push: 2 }), {
        position: 'relative',
        left: '8.3333%',
    });
});

test('断点数字映射为带前缀的 col-span', () => {
    assert.equal(colClassName({ xs: 24, sm: 12 }), 'col-span-24 sm:col-span-12');
    assert.equal(colClassName({ xxl: 6 }), '2xl:col-span-6');
});

test('断点对象支持 span / offset / push / pull', () => {
    assert.equal(colClassName({ md: { span: 8, offset: 4 } }), 'md:col-span-8 md:col-start-5');
    assert.deepEqual(colStyle({ lg: { span: 6, pull: 2 } }), {
        position: 'relative',
        right: '8.3333%',
    });
});

test('空属性返回空值，不产生多余空格', () => {
    assert.equal(colClassName({}), '');
    assert.equal(colStyle({}), undefined);
});
```

- [ ] **Step 3: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/layout/col.test.jsx
```

Expected: FAIL — 无法解析 `@shared/ui/layout/col`。

- [ ] **Step 4: 实现 Col**

创建 `src/shared/ui/layout/col.jsx`：

```jsx
/**
 * @file 栅格列组件（Col）
 * @description 基于 CSS Grid 的 24 列栅格列，与 Row 配合使用。span 与 offset 映射为
 * col-span-* / col-start-* 类名（对应工具类由 src/shared/styles/index.css 的
 * @source inline 指令预先生成）；push / pull 是相对位移，走内联 style。
 */

import { cn } from 'cn';

/** 栅格总列数，与 antd 一致。 */
const GRID_COLUMNS = 24;

/** antd 断点 → Tailwind 前缀。antd 的 xxl(≥1600px) 无同名断点，映射到 2xl(≥1536px)。 */
const BREAKPOINT_PREFIX = {
    xs: '',
    sm: 'sm:',
    md: 'md:',
    lg: 'lg:',
    xl: 'xl:',
    xxl: '2xl:',
};

/** 断点属性名，顺序即类名输出顺序。 */
const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

/** 由 Col 自身消费、不应透传到 DOM 的属性。 */
const GRID_PROPS = ['span', 'offset', 'push', 'pull', ...BREAKPOINTS];

/**
 * 把一档栅格配置归一为对象形式。
 * @param {number|Object} value - 数字视为 span。
 * @returns {Object} 含 span / offset / push / pull 的对象。
 */
function normalize(value) {
    return typeof value === 'number' ? { span: value } : value || {};
}

/**
 * 计算 Col 的类名字符串。只处理能表达为静态工具类的部分（span / offset）。
 * @param {Object} props - Col 的属性。
 * @param {number} [props.span] - 占几列（0-24）。
 * @param {number} [props.offset] - 左侧空出几列。
 * @param {number|Object} [props.xs] - xs 断点配置，sm~xxl 同理。
 * @returns {string} 类名字符串（可能为空串）。
 */
function colClassName(props) {
    const classes = [];

    const collect = (config, prefix) => {
        if (config.span !== undefined) {
            classes.push(`${prefix}col-span-${config.span}`);
        }
        if (config.offset !== undefined) {
            classes.push(`${prefix}col-start-${config.offset + 1}`);
        }
    };

    collect(normalize({ span: props.span, offset: props.offset }), '');

    for (const breakpoint of BREAKPOINTS) {
        if (props[breakpoint] !== undefined) {
            collect(normalize(props[breakpoint]), BREAKPOINT_PREFIX[breakpoint]);
        }
    }

    return classes.join(' ');
}

/**
 * 计算 push / pull 的位移内联样式。百分比无法预生成静态工具类，故用内联 style。
 * @param {Object} props - Col 的属性。
 * @param {number} [props.push] - 向右位移几列。
 * @param {number} [props.pull] - 向左位移几列。
 * @param {number|Object} [props.xs] - xs 断点配置，sm~xxl 同理（取其 push / pull）。
 * @returns {Object|undefined} 内联样式；无需位移时返回 undefined。
 */
function colStyle(props) {
    const style = {};

    const collect = (config) => {
        // push 与 pull 同时给出时两者都写（与 antd 的 left/right 并存一致）
        if (config.push !== undefined) {
            style.left = `${((config.push / GRID_COLUMNS) * 100).toFixed(4)}%`;
        }
        if (config.pull !== undefined) {
            style.right = `${((config.pull / GRID_COLUMNS) * 100).toFixed(4)}%`;
        }
    };

    collect(normalize({ push: props.push, pull: props.pull }));

    for (const breakpoint of BREAKPOINTS) {
        if (props[breakpoint] !== undefined) {
            collect(normalize(props[breakpoint]));
        }
    }

    if (Object.keys(style).length === 0) {
        return undefined;
    }

    // 只在真有位移时才加 relative，避免给所有 Col 引入无谓的定位上下文
    return { position: 'relative', ...style };
}

/**
 * Col 组件，栅格列。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式，与位移样式合并。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Col(props) {
    // 栅格属性全部由 colClassName / colStyle 消费，不能随 ...rest 漏到 DOM 上。
    // 断点属性不逐个解构（避免大量未使用变量的告警），改为显式挑出剩余属性。
    const { className, style, ...rest } = props;
    for (const key of GRID_PROPS) {
        delete rest[key];
    }
    const offsetStyle = colStyle(props);

    return (
        <div
            data-slot="col"
            className={cn(colClassName(props), className)}
            style={offsetStyle ? { ...offsetStyle, ...style } : style}
            {...rest}
        />
    );
}

export { Col, colClassName, colStyle };
```

- [ ] **Step 5: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/layout/col.test.jsx
```

Expected: PASS（7 个测试）。

- [ ] **Step 6: 实现 Row**

创建 `src/shared/ui/layout/row.jsx`：

```jsx
/**
 * @file 栅格行组件（Row）
 * @description 基于 CSS Grid 的 24 列栅格行，与 Col 配合使用。gutter 通过 column-gap /
 * row-gap 实现，单位 px。
 */

import { cn } from 'cn';

/** justify → Tailwind 的 justify-* 类。 */
const JUSTIFY_CLASS = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
};

/** align → Tailwind 的 items-* 类。 */
const ALIGN_CLASS = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
    stretch: 'items-stretch',
};

/**
 * 把 gutter 归一为 [水平, 垂直] 数字对。
 * @param {number|[number, number]} [gutter] - 单个数字（仅水平）或 [水平, 垂直]。
 * @returns {[number, number]} 归一后的间距对。
 */
function normalizeGutter(gutter) {
    if (Array.isArray(gutter)) {
        return [gutter[0] ?? 0, gutter[1] ?? 0];
    }
    return [gutter ?? 0, 0];
}

/**
 * Row 组件，栅格行。
 * @param {Object} props - 组件属性。
 * @param {number|[number, number]} [props.gutter=0] - 列间距，数字或 [水平, 垂直]，单位 px。
 * @param {('start'|'end'|'center'|'space-between'|'space-around'|'space-evenly')} [props.justify] - 水平排列。
 * @param {('top'|'middle'|'bottom'|'stretch')} [props.align] - 垂直对齐。
 * @param {boolean} [props.wrap=true] - 是否允许换行。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式，与间距样式合并。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Row(props) {
    const { gutter = 0, justify, align, wrap = true, className, style, ...rest } = props;
    const [horizontalGap, verticalGap] = normalizeGutter(gutter);

    return (
        <div
            data-slot="row"
            className={cn(
                'grid grid-cols-24',
                wrap ? 'flex-wrap' : undefined,
                justify ? JUSTIFY_CLASS[justify] : undefined,
                align ? ALIGN_CLASS[align] : undefined,
                className
            )}
            style={
                horizontalGap || verticalGap
                    ? { columnGap: horizontalGap, rowGap: verticalGap, ...style }
                    : style
            }
            {...rest}
        />
    );
}

export { Row };
```

- [ ] **Step 7: 补导出**

编辑 `src/shared/ui/index.js`，`// ── 布局 ──` 段内按字母序插入两行：

```js
export * from './layout/card';
export * from './layout/carousel';
export * from './layout/col';
export * from './layout/row';
export * from './layout/stack';
```

- [ ] **Step 8: 验证构建与 lint**

```bash
pnpm lint && pnpm build && grep -c "col-span-24" build/assets/*.css
```

Expected: lint 与 build 通过，`grep` 输出 ≥ 1（栅格类名确实进了产物）。

- [ ] **Step 9: 提交**

```bash
git add src/shared/ui/layout/col.jsx src/shared/ui/layout/row.jsx src/shared/ui/layout/col.test.jsx src/shared/styles/index.css src/shared/ui/index.js
git commit -m "feat(ui): 新增 24 列栅格 Row/Col 组件"
```

---

## Task 2: rules 编译器

**Files:**

- Create: `src/shared/ui/data-entry/form/rules.js`
- Create: `src/shared/ui/data-entry/form/rules.test.jsx`

**Interfaces:**

- Consumes: 无
- Produces:
    - `compileRules(rules, options) -> Array<(value, allValues) => string | undefined>`：把 antd rules 数组编译成按序执行的校验函数数组，返回第一条错误消息后短路
    - `formatMessage(template, variables) -> string`：替换 `${var}` 占位符，缺失变量回退到 `defaultMessage`

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/rules.test.jsx`：

```jsx
/**
 * @file rules 编译器测试
 * @description 覆盖各规则类型、message 模板、validateFirst 短路与空值边界。
 */

import test from 'node:test';
import assert from 'node:assert';
import { compileRules, formatMessage } from '@shared/ui/data-entry/form/rules';

/** 跑一遍编译后的规则，返回第一条错误消息。 */
async function run(rules, value, allValues = {}, options = {}) {
    const compiled = compileRules(rules, { label: '字段', ...options });
    for (const validate of compiled) {
        const message = await validate(value, allValues);
        if (message) {
            return message;
        }
    }
    return undefined;
}

test('required 对空串、undefined、null、空数组都判失败', async () => {
    const rules = [{ required: true, message: '必填' }];
    assert.equal(await run(rules, ''), '必填');
    assert.equal(await run(rules, undefined), '必填');
    assert.equal(await run(rules, null), '必填');
    assert.equal(await run(rules, []), '必填');
});

test('required 对 0 与 false 判通过', async () => {
    const rules = [{ required: true, message: '必填' }];
    assert.equal(await run(rules, 0), undefined);
    assert.equal(await run(rules, false), undefined);
});

test('required 非空值通过', async () => {
    assert.equal(await run([{ required: true, message: '必填' }], 'x'), undefined);
    assert.equal(await run([{ required: true, message: '必填' }], ['a']), undefined);
});

test('pattern 匹配与不匹配', async () => {
    const rules = [{ pattern: /^\d+$/, message: '只能数字' }];
    assert.equal(await run(rules, '123'), undefined);
    assert.equal(await run(rules, '12a'), '只能数字');
});

test('min / max 作用于字符串长度与数字大小', async () => {
    assert.equal(await run([{ min: 3, message: '太短' }], 'ab'), '太短');
    assert.equal(await run([{ min: 3, message: '太短' }], 'abc'), undefined);
    assert.equal(await run([{ min: 3, message: '太小' }], 2), '太小');
    assert.equal(await run([{ max: 5, message: '太大' }], 6), '太大');
});

test('min / max 对 undefined 跳过而非报错', async () => {
    assert.equal(await run([{ min: 3, message: '太短' }], undefined), undefined);
    assert.equal(await run([{ max: 5, message: '太大' }], undefined), undefined);
});

test('len 校验精确长度', async () => {
    const rules = [{ len: 3, message: '要 3 位' }];
    assert.equal(await run(rules, 'abc'), undefined);
    assert.equal(await run(rules, 'ab'), '要 3 位');
    assert.equal(await run(rules, 'abcd'), '要 3 位');
});

test('whitespace 拒绝纯空白', async () => {
    const rules = [{ whitespace: true, message: '不能只有空格' }];
    assert.equal(await run(rules, '   '), '不能只有空格');
    assert.equal(await run(rules, ' a '), undefined);
});

test('type 支持 string / number / integer / url / email / array', async () => {
    assert.equal(await run([{ type: 'number', message: '要数字' }], '1.5'), undefined);
    assert.equal(await run([{ type: 'number', message: '要数字' }], 'abc'), '要数字');
    assert.equal(await run([{ type: 'integer', message: '要整数' }], '1.5'), '要整数');
    assert.equal(await run([{ type: 'integer', message: '要整数' }], '3'), undefined);
    assert.equal(await run([{ type: 'email', message: '要邮箱' }], 'a@b.com'), undefined);
    assert.equal(await run([{ type: 'email', message: '要邮箱' }], 'nope'), '要邮箱');
    assert.equal(await run([{ type: 'url', message: '要链接' }], 'https://a.com'), undefined);
    assert.equal(await run([{ type: 'url', message: '要链接' }], 'nope'), '要链接');
    assert.equal(await run([{ type: 'array', message: '要数组' }], [1]), undefined);
    assert.equal(await run([{ type: 'array', message: '要数组' }], 'x'), '要数组');
});

test('enum 限定取值', async () => {
    const rules = [{ enum: ['a', 'b'], message: '只能是 a 或 b' }];
    assert.equal(await run(rules, 'a'), undefined);
    assert.equal(await run(rules, 'c'), '只能是 a 或 b');
});

test('自定义 validator 可返回消息，也可返回 Promise', async () => {
    const sync = [{ validator: (v) => (v === 'ok' ? undefined : '不对') }];
    assert.equal(await run(sync, 'no'), '不对');
    assert.equal(await run(sync, 'ok'), undefined);

    const async_ = [{ validator: async (v) => (v === 'ok' ? undefined : '异步不对') }];
    assert.equal(await run(async_, 'no'), '异步不对');
});

test('validator 抛错视为校验失败，取其 message', async () => {
    const rules = [
        {
            validator: () => {
                throw new Error('炸了');
            },
        },
    ];
    assert.equal(await run(rules, 'x'), '炸了');
});

test('transform 在校验前转换值', async () => {
    const rules = [{ transform: (v) => v.trim(), len: 2, message: '要 2 位' }];
    assert.equal(await run(rules, ' ab '), undefined);
});

test('rules 为空或非数组时返回空数组', async () => {
    assert.deepEqual(compileRules(undefined), []);
    assert.deepEqual(compileRules([]), []);
});

test('按序执行，首条错误后短路（validateFirst 语义）', async () => {
    const calls = [];
    const rules = [
        {
            validator: () => {
                calls.push('first');
                return '第一条';
            },
        },
        {
            validator: () => {
                calls.push('second');
                return '第二条';
            },
        },
    ];
    const message = await run(rules, 'x');
    assert.equal(message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('validateFirst 为 false 时仍短路（RHF 单字段只保留一条错误）', async () => {
    const calls = [];
    const rules = [
        {
            validator: () => {
                calls.push('first');
                return '第一条';
            },
        },
        {
            validator: () => {
                calls.push('second');
                return '第二条';
            },
        },
    ];
    const message = await run(rules, 'x', {}, { validateFirst: false });
    assert.equal(message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('message 模板替换 ${label} 等变量', () => {
    assert.equal(
        formatMessage('${label} 至少 ${min} 个字符', { label: '名称', min: 3 }),
        '名称 至少 3 个字符'
    );
});

test('message 缺失变量时回退默认文案，不渲染 undefined', () => {
    assert.equal(
        formatMessage('${label} 至少 ${min} 个字符', { label: '名称' }, '格式不正确'),
        '格式不正确'
    );
});

test('message 可为函数，接收当前值', () => {
    const rules = [{ len: 3, message: (value) => `「${value}」长度不对` }];
    return run(rules, 'ab').then((message) => {
        assert.equal(message, '「ab」长度不对');
    });
});

test('未给 message 时使用内置默认文案', async () => {
    assert.equal(await run([{ required: true }], ''), '字段 为必填项');
    assert.equal(await run([{ pattern: /^\d+$/ }], 'a'), '字段 格式不正确');
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/rules.test.jsx
```

Expected: FAIL — 无法解析 `@shared/ui/data-entry/form/rules`。

- [ ] **Step 3: 实现 rules.js**

创建 `src/shared/ui/data-entry/form/rules.js`：

```js
/**
 * @file rules 编译器
 * @description 把 Ant Design 风格的 rules 数组编译成一组按序执行的校验函数。
 * 每个函数接收 (value, allValues)，返回错误消息字符串表示失败、返回 undefined 表示通过。
 * 由 form 目录内的合成 resolver 统一调用（见 use-form.js）。
 *
 * 与 RHF 原生 validate 的关系：RHF 的 validate 只在没有 resolver 时执行，
 * 本模块的输出因此不交给 register，而是由合成 resolver 接管。
 */

/** 内置默认文案，antd 在未给 message 时使用同款措辞。 */
const DEFAULT_MESSAGES = {
    required: '${label} 为必填项',
    pattern: '${label} 格式不正确',
    whitespace: '${label} 不能为纯空白字符',
    min: '${label} 不能小于 ${min}',
    max: '${label} 不能大于 ${max}',
    len: '${label} 长度必须为 ${len}',
    enum: '${label} 必须是 ${enum} 之一',
    type: '${label} 不是合法的 ${type}',
};

/** type 规则支持的类型 → 判定函数。 */
const TYPE_CHECKERS = {
    string: (value) => typeof value === 'string',
    // antd 的 type 判定接受数字字符串（表单控件的值天然是字符串）
    number: (value) => String(value).trim() !== '' && !Number.isNaN(Number(value)),
    integer: (value) => String(value).trim() !== '' && Number.isInteger(Number(value)),
    float: (value) => String(value).trim() !== '' && !Number.isNaN(Number(value)),
    boolean: (value) => typeof value === 'boolean',
    array: (value) => Array.isArray(value),
    object: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
    date: (value) => value instanceof Date && !Number.isNaN(value.getTime()),
    url: (value) => /^https?:\/\/[^\s]+$/i.test(String(value)),
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
};

/**
 * 判断值是否为空。空串、null、undefined、空数组都算空；0 与 false 不算空（与 antd 一致）。
 * @param {*} value - 待判定的值。
 * @returns {boolean} 是否为空。
 */
function isEmptyValue(value) {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    return Array.isArray(value) && value.length === 0;
}

/**
 * 替换 message 模板里的 ${var} 占位符。
 * @param {string|Function} template - 模板字符串或返回字符串的函数。
 * @param {Object} variables - 变量表。
 * @param {string} [defaultMessage] - 模板中有变量缺失时使用的回退文案。
 * @param {*} [value] - 当前字段值，供函数形式的 template 使用。
 * @returns {string} 替换后的消息。
 */
function formatMessage(template, variables, defaultMessage, value) {
    if (typeof template === 'function') {
        return String(template(value));
    }

    const source = template ?? defaultMessage ?? '';
    if (!source) {
        return '';
    }

    let missing = false;
    const result = String(source).replace(/\$\{(\w+)\}/g, (_, key) => {
        if (variables[key] === undefined) {
            missing = true;
            return '';
        }
        return String(variables[key]);
    });

    // 模板引用了不存在的变量时整体回退，避免渲染出「至少  个字符」这种断句
    if (missing) {
        return defaultMessage ? formatMessage(defaultMessage, variables, undefined, value) : '';
    }

    return result;
}

/**
 * 取某条规则的最终消息。优先用规则自带的 message，其次用内置默认文案。
 * @param {Object} rule - 单条规则。
 * @param {string} key - 默认文案的键。
 * @param {Object} variables - 模板变量。
 * @param {*} value - 当前字段值。
 * @returns {string} 消息文案。
 */
function resolveMessage(rule, key, variables, value) {
    const fallback = DEFAULT_MESSAGES[key];
    const template = rule.message ?? fallback;
    return formatMessage(template, variables, fallback, value);
}

/**
 * 把 rules 数组编译成按序执行的校验函数数组。
 * @param {Array<Object>} [rules] - antd 风格的规则数组。
 * @param {Object} [options] - 编译选项。
 * @param {string} [options.label] - 字段标签，用于 ${label} 变量。
 * @param {string[]} [options.dependencies] - 依赖字段名（仅用于文档，实际订阅在 Form.Item 内）。
 * @returns {Array<(value: *, allValues: Object) => (string|undefined|Promise<string|undefined>)>} 校验函数数组。
 */
function compileRules(rules, options = {}) {
    if (!Array.isArray(rules) || rules.length === 0) {
        return [];
    }

    const { label = '' } = options;
    const validators = [];

    for (const rule of rules) {
        // warningOnly 由 Form.Item 单独处理，不进入错误通道，否则会阻断提交
        if (!rule || rule.warningOnly) {
            continue;
        }

        // transform 先于本条规则的其他判定生效
        const transform = typeof rule.transform === 'function' ? rule.transform : undefined;

        const check = (value) => {
            const variables = { label, ...rule, value };

            if (rule.required) {
                // required 的 message 若是字符串，antd 直接当文案用，不做变量替换
                if (isEmptyValue(value)) {
                    return typeof rule.message === 'string' && !rule.message.includes('${')
                        ? rule.message
                        : resolveMessage(rule, 'required', variables, value);
                }
                // required 单独给出且值非空时不再跑本规则的其他判定
                if (rule.pattern === undefined && rule.type === undefined) {
                    return undefined;
                }
            }

            if (
                rule.whitespace &&
                typeof value === 'string' &&
                value.trim() === '' &&
                value !== ''
            ) {
                return resolveMessage(rule, 'whitespace', variables, value);
            }

            if (rule.pattern !== undefined && !isEmptyValue(value)) {
                if (!new RegExp(rule.pattern).test(String(value))) {
                    return resolveMessage(rule, 'pattern', variables, value);
                }
            }

            // min / max：数字比较大小，字符串比较长度；空值跳过（配合 required 使用）
            if (rule.min !== undefined && !isEmptyValue(value)) {
                const size = typeof value === 'number' ? value : String(value).length;
                if (size < rule.min) {
                    return resolveMessage(rule, 'min', variables, value);
                }
            }

            if (rule.max !== undefined && !isEmptyValue(value)) {
                const size = typeof value === 'number' ? value : String(value).length;
                if (size > rule.max) {
                    return resolveMessage(rule, 'max', variables, value);
                }
            }

            if (rule.len !== undefined && !isEmptyValue(value)) {
                const size =
                    typeof value === 'number' ? String(value).length : String(value).length;
                if (size !== rule.len) {
                    return resolveMessage(rule, 'len', variables, value);
                }
            }

            if (rule.enum !== undefined && !isEmptyValue(value)) {
                if (!rule.enum.map(String).includes(String(value))) {
                    return resolveMessage(
                        rule,
                        'enum',
                        { ...variables, enum: rule.enum.join('、') },
                        value
                    );
                }
            }

            if (rule.type !== undefined && !isEmptyValue(value)) {
                const checker = TYPE_CHECKERS[rule.type];
                if (!checker) {
                    console.warn(`[Form] rules 的 type「${rule.type}」暂不支持，已跳过该条校验。`);
                } else if (!checker(value)) {
                    return resolveMessage(rule, 'type', variables, value);
                }
            }

            return undefined;
        };

        validators.push(async (rawValue, allValues) => {
            const value = transform ? transform(rawValue) : rawValue;

            if (typeof rule.validator === 'function') {
                try {
                    const result = await rule.validator(value, allValues);
                    if (result === undefined || result === null || result === true) {
                        return undefined;
                    }
                    // validator 直接抛错或返回 Error 时取其 message
                    if (result instanceof Error) {
                        return result.message;
                    }
                    if (typeof result === 'string') {
                        return result;
                    }
                    return resolveMessage(rule, 'pattern', { ...rule, label, value }, value);
                } catch (error) {
                    return error?.message ?? String(error);
                }
            }

            return check(value);
        });
    }

    return validators;
}

export { compileRules, formatMessage, isEmptyValue };
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/rules.test.jsx
```

Expected: PASS（21 个测试）。若 `min / max` 或 `len` 的数字分支断言不符，按实际语义修正实现而不是改测试。

- [ ] **Step 5: 提交**

```bash
git add src/shared/ui/data-entry/form/rules.js src/shared/ui/data-entry/form/rules.test.jsx
git commit -m "feat(form): 新增 rules 编译器与 message 模板"
```

---

## Task 3: context 与控件适配表

**Files:**

- Create: `src/shared/ui/data-entry/form/context.js`
- Create: `src/shared/ui/data-entry/form/field-adapter.js`
- Create: `src/shared/ui/data-entry/form/field-adapter.test.jsx`

**Interfaces:**

- Consumes: 无
- Produces:
    - `FormContext` / `ItemContext` / `ListContext`：React context 对象
    - `useFormContext()` → Form 级配置对象；不在 `Form` 内时抛错
    - `useItemContext()` → 当前 Item 状态或 `null`
    - `useListContext()` → `{ prefix: string }`，默认 `{ prefix: '' }`
    - `injectFieldProps(child, props) -> ReactElement`：`props` 为 `{ value, onChange, invalid, id }`
    - `getFieldBinding(elementType) -> { valueProp, trigger, forwardTo? }`

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/field-adapter.test.jsx`：

```jsx
/**
 * @file 控件适配表测试
 * @description 校验各控件被注入正确的属性对，且 aria-invalid 落在能透传的节点上。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createElement as h, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from '@shared/ui/data-entry/input';
import { Textarea } from '@shared/ui/data-entry/textarea';
import { Switch } from '@shared/ui/data-entry/switch';
import { Checkbox } from '@shared/ui/data-entry/checkbox';
import { RadioGroup, RadioGroupItem } from '@shared/ui/data-entry/radio-group';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@shared/ui/data-entry/select';
import { injectFieldProps, getFieldBinding } from '@shared/ui/data-entry/form/field-adapter';

/** 渲染注入后的元素，返回 HTML。 */
function render(child, props) {
    return renderToStaticMarkup(injectFieldProps(child, props));
}

test('Input 走默认的 value / onChange', () => {
    const html = render(h(Input, null), {
        value: 'v',
        onChange: () => {},
        invalid: false,
        id: 'f_a',
    });
    assert.match(html, /value="v"/);
    assert.match(html, /id="f_a"/);
});

test('Textarea 走默认的 value / onChange', () => {
    const html = render(h(Textarea, null), {
        value: 'v',
        onChange: () => {},
        invalid: false,
        id: 'f_b',
    });
    assert.match(html, /id="f_b"/);
});

test('Switch 走 checked / onCheckedChange', () => {
    const html = render(h(Switch, null), {
        value: true,
        onChange: () => {},
        invalid: false,
        id: 'f_c',
    });
    // Base UI 的 Switch 受控时 aria-checked 反映选中态
    assert.match(html, /aria-checked="true"/);
    assert.match(html, /id="f_c"/);
});

test('Checkbox 走 checked / onCheckedChange', () => {
    const html = render(h(Checkbox, null), {
        value: true,
        onChange: () => {},
        invalid: false,
        id: 'f_d',
    });
    assert.match(html, /aria-checked="true"/);
});

test('RadioGroup 走 value / onValueChange', () => {
    const html = render(h(RadioGroup, null, h(RadioGroupItem, { value: 'a' }, 'A')), {
        value: 'a',
        onChange: () => {},
        invalid: false,
        id: 'f_e',
    });
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-checked="true"/);
});

test('Select 走 value / onValueChange，且 aria-invalid 落在 SelectTrigger 上', () => {
    // 回归点：SelectRoot 不透传未知属性，aria-invalid 放根节点会丢失
    const html = render(
        h(
            Select,
            null,
            h(SelectTrigger, null, h(SelectValue, null)),
            h(SelectContent, null, h(SelectItem, { value: 'a' }, 'A'))
        ),
        { value: 'a', onChange: () => {}, invalid: true, id: 'f_f' }
    );
    assert.match(html, /data-slot="select-value"[^>]*>a</);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /id="f_f"/);
});

test('value 为 undefined 时归一为空串，避免控件退化为非受控', () => {
    // 回归点：Base UI 的 Field.Control 一旦以 undefined 初始化就永久非受控，
    // 后续 store 里的值不会回填到输入框
    const html = render(h(Input, null), {
        value: undefined,
        onChange: () => {},
        invalid: false,
        id: 'f_z',
    });
    assert.match(html, /value=""/);
    assert.equal(/value="undefined"/.test(html), false);
});

test('checked 类控件的 undefined 归一为 false', () => {
    const html = render(h(Switch, null), {
        value: undefined,
        onChange: () => {},
        invalid: false,
        id: 'f_y',
    });
    assert.match(html, /aria-checked="false"/);
});

test('invalid 为 true 时 aria-invalid 为 true', () => {
    const html = render(h(Input, null), {
        value: '',
        onChange: () => {},
        invalid: true,
        id: 'f_g',
    });
    assert.match(html, /aria-invalid="true"/);
});

test('getFieldBinding 对未知组件回退 value / onChange', () => {
    const binding = getFieldBinding(function Unknown() {});
    assert.equal(binding.valueProp, 'value');
    assert.equal(binding.trigger, 'onChange');
    assert.equal(binding.forwardTo, undefined);
});

test('valuePropName / trigger 显式覆盖适配表', () => {
    const html = renderToStaticMarkup(
        injectFieldProps(h(Input, null), {
            value: 'v',
            onChange: () => {},
            invalid: false,
            id: 'f_h',
            valuePropName: 'data-x',
            trigger: 'onInput',
        })
    );
    assert.match(html, /data-x="v"/);
});

test('子元素不是合法元素时原样返回并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.equal(
            injectFieldProps(null, { value: '', onChange: () => {}, invalid: false }),
            null
        );
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('子元素是字符串时原样返回并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.equal(
            injectFieldProps('文本', { value: '', onChange: () => {}, invalid: false }),
            '文本'
        );
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('子元素是数组时取第一个并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        const result = injectFieldProps([h(Input, { key: 'a' }), h(Input, { key: 'b' })], {
            value: 'v',
            onChange: () => {},
            invalid: false,
        });
        assert.ok(isValidElement(result));
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/field-adapter.test.jsx
```

Expected: FAIL — 无法解析 `@shared/ui/data-entry/form/field-adapter`。

- [ ] **Step 3: 实现 context.js**

创建 `src/shared/ui/data-entry/form/context.js`：

```js
/**
 * @file Form 子系统的内部 context
 * @description Form / Form.Item / Form.List 之间共享的上下文。三个 context 都只在本目录内使用，
 * 不从 index.jsx 导出为公共 API。
 */

import { createContext, useContext } from 'react';

/** Form 级配置与实例，由 Form 提供、Form.Item 与 useFormInstance 消费。 */
const FormContext = createContext(null);

/** 单个 Form.Item 的状态，供 noStyle 嵌套与 Form.Item.useStatus 消费。 */
const ItemContext = createContext(null);

/** Form.List 的 name 前缀，供内部 Form.Item 拼接完整路径。 */
const ListContext = createContext({ prefix: '' });

/**
 * 读取 Form 上下文。
 * @returns {Object} Form 级配置对象。
 * @throws {Error} 不在 Form 内使用时抛出。
 */
function useFormContext() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error('Form 相关组件必须放在 <Form> 内部使用。');
    }
    return context;
}

/**
 * 读取当前 Form.Item 的状态。
 * @returns {Object|null} Item 状态；不在 Item 内时返回 null。
 */
function useItemContext() {
    return useContext(ItemContext);
}

/**
 * 读取 Form.List 的 name 前缀。
 * @returns {{prefix: string}} 前缀对象；不在 List 内时 prefix 为空串。
 */
function useListContext() {
    return useContext(ListContext);
}

export { FormContext, ItemContext, ListContext, useFormContext, useItemContext, useListContext };
```

- [ ] **Step 4: 实现 field-adapter.js**

创建 `src/shared/ui/data-entry/form/field-adapter.js`：

```js
/**
 * @file 控件适配表与属性注入
 * @description Form.Item 通过 cloneElement 把受控值注入子控件，但各控件的受控属性名不同
 * （Base UI 的 Select / Switch / Checkbox / RadioGroup 用 onValueChange / onCheckedChange）。
 * 这里按「组件引用」建表识别，比按 data-slot 字符串识别更稳：
 * 属性注入发生在渲染前，此时拿不到渲染后的 DOM 属性。
 *
 * aria-invalid 的落点随控件而异：SelectRoot 不透传未知属性，必须落在 SelectTrigger 上；
 * 其余控件放根组件即可。
 */

import { Children, cloneElement, isValidElement } from 'react';
import { Input } from '@shared/ui/data-entry/input';
import { Textarea } from '@shared/ui/data-entry/textarea';
import { Switch } from '@shared/ui/data-entry/switch';
import { Checkbox } from '@shared/ui/data-entry/checkbox';
import { RadioGroup } from '@shared/ui/data-entry/radio-group';
import { Select, SelectTrigger } from '@shared/ui/data-entry/select';

/** 未命中适配表时的默认绑定，即 antd 的 value / onChange。 */
const DEFAULT_BINDING = { valueProp: 'value', trigger: 'onChange' };

/**
 * 控件适配表。forwardTo 表示 aria-invalid / id 需要下沉到哪个子组件。
 * @type {Map<Function, {valueProp: string, trigger: string, forwardTo?: Function}>}
 */
const BINDINGS = new Map([
    [Select, { valueProp: 'value', trigger: 'onValueChange', forwardTo: SelectTrigger }],
    [Switch, { valueProp: 'checked', trigger: 'onCheckedChange' }],
    [Checkbox, { valueProp: 'checked', trigger: 'onCheckedChange' }],
    [RadioGroup, { valueProp: 'value', trigger: 'onValueChange' }],
    [Input, DEFAULT_BINDING],
    [Textarea, DEFAULT_BINDING],
]);

/**
 * 查控件的受控属性绑定。
 * @param {Function|string} elementType - 子元素的 type。
 * @returns {{valueProp: string, trigger: string, forwardTo?: Function}} 绑定配置。
 */
function getFieldBinding(elementType) {
    return BINDINGS.get(elementType) ?? DEFAULT_BINDING;
}

/**
 * 把受控属性注入子控件。
 * @param {React.ReactNode} child - Form.Item 的子元素。
 * @param {Object} props - 待注入的属性。
 * @param {*} props.value - 字段值。
 * @param {Function} props.onChange - 值变更回调（适配后的签名）。
 * @param {boolean} props.invalid - 是否处于校验错误态。
 * @param {string} [props.id] - 控件 id。
 * @param {string} [props.valuePropName] - 显式指定取值属性，优先于适配表。
 * @param {string} [props.trigger] - 显式指定变更属性，优先于适配表。
 * @returns {React.ReactNode} 注入后的子元素；子元素不合法时原样返回。
 */
function injectFieldProps(child, props) {
    const { value, onChange, invalid, id, valuePropName, trigger } = props;

    if (Array.isArray(child)) {
        console.warn('[Form] Form.Item 只能有一个子元素，已取第一个。');
        return injectFieldProps(child[0], props);
    }

    if (!isValidElement(child)) {
        console.warn('[Form] Form.Item 的子元素必须是一个合法的 React 元素。');
        return child;
    }

    const binding = getFieldBinding(child.type);
    const valueProp = valuePropName ?? binding.valueProp;
    const triggerProp = trigger ?? binding.trigger;

    // 值必须归一，不能把 undefined 透给控件：
    // Base UI 的 Input（Field.Control）用 useControlled 判定受控与否，
    // 首次渲染拿到 undefined 就会永久按非受控处理，之后 store 里的值再变也不会回填，
    // 表现为「store 有值、输入框却空着」。checkbox 类同理，undefined 归一为 false。
    const normalizedValue = valueProp === 'checked' ? Boolean(value) : (value ?? '');

    const rootProps = { [valueProp]: normalizedValue, [triggerProp]: onChange };

    // 默认落点：aria-invalid 与 id 直接给根组件
    if (!binding.forwardTo) {
        rootProps['aria-invalid'] = invalid;
        if (id !== undefined) {
            rootProps.id = id;
        }
        return cloneElement(child, rootProps);
    }

    // 需要下沉：根组件只吃受控属性，aria-invalid / id 交给 forwardTo 指定的子组件
    const withRoot = cloneElement(child, rootProps);
    const forwarded = Children.map(withRoot.props.children, (inner) =>
        isValidElement(inner) && inner.type === binding.forwardTo
            ? cloneElement(inner, { 'aria-invalid': invalid, id })
            : inner
    );

    return cloneElement(withRoot, { children: forwarded });
}

export { injectFieldProps, getFieldBinding };
```

- [ ] **Step 5: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/field-adapter.test.jsx
```

Expected: PASS（12 个测试）。

- [ ] **Step 6: 提交**

```bash
git add src/shared/ui/data-entry/form/context.js src/shared/ui/data-entry/form/field-adapter.js src/shared/ui/data-entry/form/field-adapter.test.jsx
git commit -m "feat(form): 新增内部 context 与控件适配表"
```

---

## Task 4: 布局解析（field-layout）

**Files:**

- Create: `src/shared/ui/data-entry/form/field-layout.js`
- Create: `src/shared/ui/data-entry/form/field-layout.test.jsx`

**Interfaces:**

- Consumes: `@shared/ui/layout/col` 的 `colClassName`
- Produces:
    - `normalizeColProps(col) -> Object`：antd 的 `labelCol` / `wrapperCol` 归一为 `Col` 的 props
    - `LABEL_COL_CLASS` / `WRAPPER_COL_CLASS`：内置的默认栅格类名常量

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/field-layout.test.jsx`：

```jsx
/**
 * @file 布局解析测试
 * @description labelCol / wrapperCol 到 Col props 的归一，以及三种 layout 的默认值。
 */

import test from 'node:test';
import assert from 'node:assert';
import {
    normalizeColProps,
    DEFAULT_LABEL_COL,
    DEFAULT_WRAPPER_COL,
} from '@shared/ui/data-entry/form/field-layout';

test('labelCol 归一为 Col 的 props', () => {
    assert.deepEqual(normalizeColProps({ span: 6 }), { span: 6 });
    assert.deepEqual(normalizeColProps({ span: 6, offset: 2 }), { span: 6, offset: 2 });
});

test('labelCol 支持断点对象', () => {
    assert.deepEqual(normalizeColProps({ xs: 24, md: { span: 8 } }), { xs: 24, md: { span: 8 } });
});

test('labelCol 传数字视为 span', () => {
    assert.deepEqual(normalizeColProps(6), { span: 6 });
});

test('labelCol 为空时返回 undefined，交给 Form 用默认值', () => {
    assert.equal(normalizeColProps(undefined), undefined);
    assert.equal(normalizeColProps(null), undefined);
});

test('内置默认栅格', () => {
    assert.deepEqual(DEFAULT_LABEL_COL, { span: 6 });
    assert.deepEqual(DEFAULT_WRAPPER_COL, { span: 18 });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/field-layout.test.jsx
```

Expected: FAIL — 无法解析模块。

- [ ] **Step 3: 实现 field-layout.js**

创建 `src/shared/ui/data-entry/form/field-layout.js`：

```js
/**
 * @file 表单布局解析
 * @description 把 antd 的 labelCol / wrapperCol 归一为 Row/Col 组件可用的 props。
 * 只做形状归一，具体类名由 Col 组件负责。
 */

/** horizontal 布局下 label 的默认栅格。 */
const DEFAULT_LABEL_COL = { span: 6 };

/** horizontal 布局下控件区的默认栅格。 */
const DEFAULT_WRAPPER_COL = { span: 18 };

/**
 * 把 labelCol / wrapperCol 归一为 Col 的 props。
 * @param {number|Object|null|undefined} col - antd 的 col 配置：数字视为 span，对象原样传递。
 * @returns {Object|undefined} Col 的 props；未配置时返回 undefined。
 */
function normalizeColProps(col) {
    if (col === undefined || col === null) {
        return undefined;
    }
    if (typeof col === 'number') {
        return { span: col };
    }
    return { ...col };
}

export { normalizeColProps, DEFAULT_LABEL_COL, DEFAULT_WRAPPER_COL };
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/field-layout.test.jsx
```

Expected: PASS（5 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/shared/ui/data-entry/form/field-layout.js src/shared/ui/data-entry/form/field-layout.test.jsx
git commit -m "feat(form): 新增 labelCol/wrapperCol 布局解析"
```

---

## Task 5: useForm / FormInstance / 合成 resolver

**Files:**

- Create: `src/shared/ui/data-entry/form/use-form.js`
- Create: `src/shared/ui/data-entry/form/use-form.test.jsx`

**Interfaces:**

- Consumes: `compileRules`（Task 2）
- Produces:
    - `composeResolver(userResolver, registry) -> resolver`：`registry` 是 `Map<name, {rules, label}>`
    - `createFormInstance() -> FormInstance`：antd 形状的实例，由 Form 通过 `_bind(rhf)` 接入底层 RHF
    - `useForm(formProps) -> [FormInstance]`
    - `useFormInstance() -> FormInstance`
    - `useWatch(namePathOrSelector, formOrOptions) -> *`
    - `getValueByPath(values, path) -> *` / `setValueByPath(target, path, value)`：点号路径取值赋值

**关键实现约束：**

- 合成 resolver 在**每次校验时**读取 registry，因此 Form.Item 后注册的规则也能生效。
- `validateFields` 失败时必须 **reject**（antd 语义），携带 `errorFields`。
- `setFieldsValue` 对**已挂载**字段直接 `setValue`，对未挂载字段走 `register → setValue → clearErrors → unregister({ keepValue: true, keepError: true })`。
- 是否"已挂载"由 Form 自己的 `Set` 维护（Form.Item 挂载时登记），不读 RHF 内部字段。
- **读错误状态一律走 `control._formState`，不要用 `rhf.formState`**：`createFormControl()` 的返回值上没有 `formState` 字段（已实测，`typeof === 'undefined'`），只有 `useForm()` 的返回值才有；而 `control._formState` 在两条路径上都存在，测试与运行时因此可以共用同一份实现。
- **`useController` 的 `name` 不能为 `undefined`**（实测抛 `Cannot read properties of undefined (reading 'split')`）。因此 `Form.Item` 必须拆成两个组件：有 `name` 的走带 hooks 的 `FieldItem`，无 `name` 的走 `PlainItem`，靠组件边界而非条件 hooks 来分流。

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/use-form.test.jsx`：

```jsx
/**
 * @file FormInstance 与合成 resolver 测试
 * @description 用 createFormControl 直接驱动，不经组件树。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createFormControl } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    composeResolver,
    createFormInstance,
    getValueByPath,
    normalizeValidateTrigger,
} from '@shared/ui/data-entry/form/use-form';

/** 造一个已订阅的 control，模拟 Form 内部的初始化。 */
function makeControl(options) {
    const control = createFormControl(options);
    control.subscribe({ formState: {}, callback: () => {} });
    return control;
}

/**
 * 造一个已绑定 RHF 的实例。
 * @param {Object} control - RHF 的 control 对象。
 * @param {string[]} names - 需要标记为「已挂载」的字段名。
 * @returns {Object} FormInstance。
 */
function bindFormInstance(control, names) {
    const instance = createFormInstance();
    instance._bind(control);
    for (const name of names) {
        instance._mountedFields.add(name);
    }
    return instance;
}

/** 挂载一个字段，让 RHF 认为它已注册。 */
function mount(control, name, value = '') {
    const element = { name, type: 'text', value, focus() {} };
    control.register(name).ref(element);
    return element;
}

/** 造一个 registry，等价于 Form.Item 注册后的形态。 */
function makeRegistry(entries) {
    return new Map(Object.entries(entries));
}

test('normalizeValidateTrigger 缺省为 onChange', () => {
    assert.deepEqual(normalizeValidateTrigger(undefined), ['onChange']);
    assert.deepEqual(normalizeValidateTrigger(null), ['onChange']);
});

test('normalizeValidateTrigger 支持字符串与数组', () => {
    assert.deepEqual(normalizeValidateTrigger('onBlur'), ['onBlur']);
    assert.deepEqual(normalizeValidateTrigger(['onChange', 'onBlur']), ['onChange', 'onBlur']);
});

test('normalizeValidateTrigger 过滤不认识的取值并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.deepEqual(normalizeValidateTrigger(['onChange', 'onFocus']), ['onChange']);
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('getValueByPath 支持点号与数组下标', () => {
    const values = { a: { b: 1 }, list: [{ x: 'p' }, { x: 'q' }] };
    assert.equal(getValueByPath(values, 'a.b'), 1);
    assert.equal(getValueByPath(values, 'list.1.x'), 'q');
    assert.equal(getValueByPath(values, 'missing.deep'), undefined);
    assert.equal(getValueByPath(values, 'a.b.c'), undefined);
});

test('合成 resolver：无用户 resolver 时只跑字段规则', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '规则错误' }], label: 'A' } });
    const resolver = composeResolver(null, registry);
    const result = await resolver({ a: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a.message, '规则错误');
});

test('合成 resolver：用户 resolver 与字段规则同时生效', async () => {
    const registry = makeRegistry({ b: { rules: [{ validator: () => '规则-b' }], label: 'B' } });
    const schema = z.object({ a: z.string().min(5, 'zod-a'), b: z.string() });
    const resolver = composeResolver(zodResolver(schema), registry);
    const result = await resolver({ a: '', b: '' }, undefined, { names: ['a', 'b'] });
    assert.equal(result.errors.a.message, 'zod-a');
    assert.equal(result.errors.b.message, '规则-b');
});

test('合成 resolver：只校验指定字段时不改动其他字段的错误', async () => {
    const registry = makeRegistry({ b: { rules: [{ validator: () => '规则-b' }], label: 'B' } });
    const resolver = composeResolver(null, registry);
    const result = await resolver({ a: 'ok', b: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a, undefined);
    assert.equal(result.errors.b, undefined);
});

test('合成 resolver：rules 短路，只取第一条错误', async () => {
    const calls = [];
    const registry = makeRegistry({
        a: {
            rules: [
                {
                    validator: () => {
                        calls.push('first');
                        return '第一条';
                    },
                },
                {
                    validator: () => {
                        calls.push('second');
                        return '第二条';
                    },
                },
            ],
            label: 'A',
        },
    });
    const result = await composeResolver(null, registry)({ a: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a.message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('合成 resolver：数组路径上的规则错误落到嵌套结构', async () => {
    const registry = makeRegistry({
        'list.0.v': { rules: [{ validator: () => '第 0 项必填' }], label: 'V' },
    });
    const result = await composeResolver(null, registry)({ list: [{ v: '' }] }, undefined, {
        names: ['list.0.v'],
    });
    // errors 是按路径嵌套的对象，读取时同样走路径
    assert.equal(getValueByPath(result.errors, 'list.0.v').message, '第 0 项必填');
});

test('FormInstance：读写值与错误', async () => {
    const control = makeControl({ defaultValues: { a: 'init' } });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    assert.equal(instance.getFieldValue('a'), 'init');
    assert.deepEqual(instance.getFieldsValue(), { a: 'init' });

    instance.setFieldValue('a', 'changed');
    assert.equal(instance.getFieldValue('a'), 'changed');
});

test('FormInstance：setFieldValue 会清掉该字段已有的错误', async () => {
    const control = makeControl({ defaultValues: { a: '' }, criteriaMode: 'all' });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    control.register('a', { validate: { r: () => '旧错误' } });
    await instance.validateFields(['a']).catch(() => {});
    assert.equal(instance.getFieldError('a')[0], '旧错误');

    instance.setFieldValue('a', 'x');
    assert.deepEqual(instance.getFieldError('a'), []);
});

test('FormInstance：setFieldsValue 可写入未挂载字段（antd 语义）', () => {
    const control = makeControl({ defaultValues: { a: '' } });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    instance.setFieldsValue({ a: 'av', notMounted: 'nv' });
    assert.equal(instance.getFieldValue('a'), 'av');
    // 关键回归点：antd 允许先写值、后渲染字段，提交时能取到
    assert.equal(instance.getFieldValue('notMounted'), 'nv');
});

test('FormInstance：setFieldsValue 支持嵌套路径', () => {
    const control = makeControl({ defaultValues: { user: { name: '' } } });
    mount(control, 'user.name');
    const instance = bindFormInstance(control, ['user.name']);

    instance.setFieldsValue({ user: { name: '张三' } });
    assert.equal(instance.getFieldValue('user.name'), '张三');
});

test('FormInstance：isFieldTouched / isFieldsTouched', async () => {
    const control = makeControl({ defaultValues: { a: '', b: '' } });
    const element = mount(control, 'a');
    mount(control, 'b');
    const instance = bindFormInstance(control, ['a', 'b']);

    assert.equal(instance.isFieldTouched('a'), false);
    control.register('a').onBlur({ target: element, type: 'blur' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(instance.isFieldTouched('a'), true);
    assert.equal(instance.isFieldsTouched(['a', 'b']), true);
});

test('FormInstance：validateFields 通过时 resolve 值，失败时 reject 出 errorFields', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '必填' }], label: 'A' } });
    const control = makeControl({
        defaultValues: { a: '' },
        resolver: composeResolver(null, registry),
    });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    await assert.rejects(
        () => instance.validateFields(['a']),
        (error) => {
            assert.deepEqual(error.errorFields[0].name, ['a']);
            assert.deepEqual(error.errorFields[0].errors, ['必填']);
            return true;
        }
    );
});

test('FormInstance：resetFields 恢复初始值并清错误', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '必填' }], label: 'A' } });
    const control = makeControl({
        defaultValues: { a: 'init' },
        resolver: composeResolver(null, registry),
    });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    instance.setFieldValue('a', '');
    await instance.validateFields(['a']).catch(() => {});
    assert.equal(instance.getFieldError('a')[0], '必填');

    instance.resetFields();
    assert.equal(instance.getFieldValue('a'), 'init');
    assert.deepEqual(instance.getFieldError('a'), []);
});

test('FormInstance：getFieldInstance / setFields 明确抛错', () => {
    const control = makeControl({ defaultValues: {} });
    const instance = bindFormInstance(control, []);

    assert.throws(() => instance.getFieldInstance('a'), /getFieldValue/);
    assert.throws(() => instance.setFields([]), /setFieldsValue/);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/use-form.test.jsx
```

Expected: FAIL — 无法解析模块。

- [ ] **Step 3: 实现 use-form.js**

创建 `src/shared/ui/data-entry/form/use-form.js`：

```jsx
/**
 * @file useForm 包装与 FormInstance 适配
 * @description 以 React Hook Form 为唯一状态引擎，对外暴露 antd 形状的 FormInstance。
 * 关键点是「合成 resolver」：RHF 只要 options.resolver 存在，字段级 validate 就完全不执行
 * （已实测），因此 Form 把用户 resolver 与字段 rules 合并成一个 resolver 注入。
 */

import { useMemo, useState } from 'react';
import { useForm as useRhfForm, useWatch as useRhfWatch } from 'react-hook-form';
import { compileRules } from '@shared/ui/data-entry/form/rules';
import { useFormContext } from '@shared/ui/data-entry/form/context';

/** 可聚焦元素选择器，供 scrollToField 定位控件本体。 */
const FOCUSABLE_SELECTOR = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/**
 * 按点号路径取值。
 * @param {Object} values - 值对象。
 * @param {string} path - 点号路径，如 `a.b` 或 `list.0.x`。
 * @returns {*} 取到的值；路径不存在时返回 undefined。
 */
function getValueByPath(values, path) {
    if (values === undefined || values === null || !path) {
        return undefined;
    }
    return String(path)
        .split('.')
        .reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), values);
}

/** 支持的校验触发时机。 */
const VALIDATE_TRIGGERS = ['onChange', 'onBlur', 'onSubmit'];

/**
 * 归一 validateTrigger 为字符串数组。
 * @param {string|string[]} [validateTrigger] - antd 的 validateTrigger，缺省为 onChange。
 * @returns {string[]} 触发时机数组；不认识的取值会被过滤并开发期告警。
 */
function normalizeValidateTrigger(validateTrigger) {
    if (validateTrigger === undefined || validateTrigger === null) {
        return ['onChange'];
    }

    const list = Array.isArray(validateTrigger) ? validateTrigger : [validateTrigger];
    const unknown = list.filter((item) => !VALIDATE_TRIGGERS.includes(item));
    if (unknown.length > 0) {
        console.warn(`[Form] validateTrigger 不支持「${unknown.join('、')}」，已忽略。`);
    }

    return list.filter((item) => VALIDATE_TRIGGERS.includes(item));
}

/**
 * 按点号路径赋值（不可变，返回新对象）。
 * @param {Object} source - 原对象。
 * @param {string} path - 点号路径。
 * @param {*} value - 待写入的值。
 * @returns {Object} 新对象。
 */
function setValueByPath(source, path, value) {
    const keys = String(path).split('.');
    const root = source === undefined || source === null ? {} : { ...source };
    let cursor = root;

    for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        const next = cursor[key];
        cursor[key] = next === undefined || next === null ? {} : { ...next };
        cursor = cursor[key];
    }

    cursor[keys[keys.length - 1]] = value;
    return root;
}

/**
 * 把字段 rules 注册表编成一个「名字 → 校验函数数组」的快照。
 * 每次校验都重新编译，保证 Form.Item 后注册的规则也能生效。
 * @param {Map<string, {rules: Array, label?: string}>} registry - 注册表。
 * @returns {Map<string, Array<Function>>} 编译后的校验函数。
 */
function compileRegistry(registry) {
    const compiled = new Map();
    for (const [name, entry] of registry) {
        const validators = compileRules(entry.rules, { label: entry.label });
        if (validators.length > 0) {
            compiled.set(name, validators);
        }
    }
    return compiled;
}

/**
 * 合成 resolver：先跑用户 resolver，再补跑字段级 rules，合并成一个 errors 对象。
 * @param {Function|null} userResolver - 用户传入的 resolver（如 zodResolver）。
 * @param {Map<string, {rules: Array, label?: string}>} registry - 字段 rules 注册表。
 * @returns {Function} RHF 可用的 resolver。
 */
function composeResolver(userResolver, registry) {
    return async (values, context, options) => {
        let errors = {};
        let resolvedValues = values;

        if (userResolver) {
            const result = await userResolver(values, context, options);
            errors = result?.errors ? { ...result.errors } : {};
            if (result?.values) {
                resolvedValues = result.values;
            }
        }

        const compiled = compileRegistry(registry);
        const names = options?.names;

        for (const [name, validators] of compiled) {
            if (Array.isArray(names) && names.length > 0 && !names.includes(name)) {
                continue;
            }

            // 字段规则一律针对**原始输入值**校验，不用用户 resolver 返回的 values：
            // zodResolver 校验失败时返回的 values 是空对象，拿它取字段值会全部取到
            // undefined，导致所有 required 规则误报「必填」。
            const value = getValueByPath(values, name);

            for (const validate of validators) {
                // 逐条执行，首条错误即短路（antd 的 validateFirst 语义）
                const message = await validate(value, values);
                if (message) {
                    errors = setValueByPath(errors, name, { type: 'validate', message });
                    break;
                }
            }
        }

        return { values: resolvedValues, errors };
    };
}

/**
 * 把 RHF 的错误对象转成 antd 的 string[] 形状。
 * @param {Object|undefined} error - RHF 的字段错误。
 * @returns {string[]} 错误消息数组。
 */
function toErrorMessages(error) {
    if (!error) {
        return [];
    }
    if (Array.isArray(error)) {
        return error.flatMap((item) => toErrorMessages(item));
    }
    if (error.types) {
        return Object.values(error.types).filter(Boolean);
    }
    return error.message ? [error.message] : [];
}

/**
 * 构造 antd 形状的 FormInstance。
 *
 * 实例自己持有 rules 注册表、已挂载字段集合与底层 RHF 引用，后两者由 Form 通过
 * `_bind` / `_bindSubmit` 注入。这样实例在 useForm() 时即可创建，等真正渲染
 * `<Form>` 时再接到 RHF 上。若反过来由 Form 内部另建 RHF，传了外部实例的
 * `<Form form={form}>` 就会让注入的 resolver 与字段 rules 全部失效
 * （实测：表单级 zod 校验被整体跳过，非法值照样提交成功）。
 *
 * @returns {Object} 尚未绑定 RHF 的 FormInstance。
 */
function createFormInstance() {
    const registry = new Map();
    const mountedFields = new Set();
    let rhf = null;
    let submitHandler = null;

    /** 取底层 RHF；未绑定即调用说明用法有误，直接抛错而不是静默失败。 */
    const requireRhf = () => {
        if (!rhf) {
            throw new Error(
                'FormInstance 尚未绑定到 <Form>，请把 useForm() 的返回值传给 <Form form={...}>。'
            );
        }
        return rhf;
    };

    /** 写值：已挂载直接 setValue，未挂载走 register → setValue → clearErrors → unregister 往返。 */
    const writeValue = (name, value) => {
        const control = requireRhf();
        if (mountedFields.has(name)) {
            control.clearErrors(name);
            control.setValue(name, value, { shouldDirty: false, shouldTouch: false });
            return;
        }

        control.register(name);
        control.setValue(name, value, { shouldDirty: false, shouldTouch: false });
        control.clearErrors(name);
        // keepValue / keepError 缺一不可：前者保留刚写入的值，后者保留刚清过的错误状态
        control.unregister(name, { keepValue: true, keepError: true });
    };

    const instance = {
        getFieldValue: (name) => requireRhf().getValues(name),
        getFieldsValue: (nameList) =>
            nameList === undefined ? requireRhf().getValues() : requireRhf().getValues(nameList),

        getFieldError: (name) =>
            toErrorMessages(getValueByPath(requireRhf().control._formState.errors, name)),
        getFieldsError: (nameList) => {
            const errors = requireRhf().control._formState.errors;
            const names = nameList ?? Object.keys(requireRhf().getValues());
            return names.map((name) => ({
                name,
                errors: toErrorMessages(getValueByPath(errors, name)),
            }));
        },

        isFieldTouched: (name) =>
            Boolean(getValueByPath(requireRhf().control._formState.touchedFields, name)),
        isFieldsTouched: (nameList, allTouched) => {
            const touchedFields = requireRhf().control._formState.touchedFields;
            const names = nameList ?? Object.keys(requireRhf().getValues());
            const touched = names.map((name) => Boolean(getValueByPath(touchedFields, name)));
            return allTouched ? touched.every(Boolean) : touched.some(Boolean);
        },
        isFieldValidating: (name) =>
            Boolean(getValueByPath(requireRhf().control._formState.validatingFields, name)),

        setFieldValue: (name, value) => writeValue(name, value),
        setFieldsValue: (values) => {
            for (const [name, value] of Object.entries(values ?? {})) {
                // 对象值需要展开成具体路径逐个写，否则未挂载的嵌套字段会整体覆盖
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const flatten = (prefix, node) => {
                        for (const [key, child] of Object.entries(node)) {
                            const path = `${prefix}.${key}`;
                            if (
                                child !== null &&
                                typeof child === 'object' &&
                                !Array.isArray(child)
                            ) {
                                flatten(path, child);
                            } else {
                                writeValue(path, child);
                            }
                        }
                    };
                    flatten(name, value);
                } else {
                    writeValue(name, value);
                }
            }
        },

        resetFields: (nameList) => {
            const control = requireRhf();
            if (nameList === undefined) {
                control.reset();
                return;
            }
            for (const name of Array.isArray(nameList) ? nameList : [nameList]) {
                control.resetField(name);
            }
        },

        validateFields: async (nameList, config = {}) => {
            const control = requireRhf();
            const names =
                nameList === undefined
                    ? undefined
                    : Array.isArray(nameList)
                      ? nameList
                      : [nameList];
            const passed = await control.trigger(names, { shouldFocus: !config.validateOnly });

            if (passed) {
                return names === undefined ? control.getValues() : control.getValues(names);
            }

            const errors = control.control._formState.errors;
            const errorFields = Object.keys(control.getValues())
                .map((name) => ({
                    name: name.split('.'),
                    errors: toErrorMessages(getValueByPath(errors, name)),
                }))
                .filter((item) => item.errors.length > 0);

            const error = new Error('表单校验失败');
            error.errorFields = errorFields;
            error.values = control.getValues();
            throw error;
        },

        submit: () => submitHandler?.(),

        scrollToField: (name, options = {}) => {
            const element = document.querySelector(`[data-field-name="${name}"]`);
            if (!element) {
                return;
            }
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });

            if (options.focus) {
                // 用 DOM 查询聚焦，而不是 RHF 的 setFocus：适配表没有把 ref 注入控件，
                // 且 Select / Switch / Checkbox 的可聚焦节点不是根元素，DOM 查询更可靠。
                const focusable = element.matches(FOCUSABLE_SELECTOR)
                    ? element
                    : element.querySelector(FOCUSABLE_SELECTOR);
                focusable?.focus?.();
            }
        },

        getFieldInstance: () => {
            throw new Error('Form 不支持 getFieldInstance，请改用 getFieldValue。');
        },
        setFields: () => {
            throw new Error('Form 不支持 setFields，请改用 setFieldsValue。');
        },

        /** 字段 rules 注册表，Form.Item 挂载时写入、卸载时移除。 */
        _registry: registry,
        /** 已挂载字段名集合，供 setFieldsValue 判断是否需要 register 往返。 */
        _mountedFields: mountedFields,
        /** 绑定底层 RHF。由 Form 在渲染期调用，幂等。 */
        _bind: (nextRhf) => {
            rhf = nextRhf;
            return instance;
        },
        /** 绑定提交函数，供 submit() 使用。 */
        _bindSubmit: (handler) => {
            submitHandler = handler;
        },
        /** 底层 RHF 对象，供内部组件（Form.Item / Form.List）直接使用。 */
        get _rhf() {
            return rhf;
        },
    };

    return instance;
}

/**
 * 创建表单实例。与 antd 一致，返回单元素数组以便解构。
 * 此时实例尚未绑定 RHF，需传给 `<Form form={...}>` 后才会接入；不传则 Form 内部自建。
 * @returns {[Object]} 含 FormInstance 的数组。
 */
function useForm() {
    const [instance] = useState(() => createFormInstance());

    return useMemo(() => [instance], [instance]);
}

/**
 * 把实例绑定到底层 RHF，并注入合成 resolver。
 * @param {Object} instance - FormInstance。
 * @param {Object} [options] - 表单配置。
 * @param {Object} [options.initialValues] - 表单默认值。
 * @param {Function} [options.resolver] - 表单级校验器，如 zodResolver(schema)。
 * @returns {Object} RHF 对象。
 */
function useBoundRhf(instance, options = {}) {
    const { initialValues, resolver } = options;

    const rhf = useRhfForm({
        defaultValues: initialValues,
        // 校验改由 Form.Item 按各自的 validateTrigger 手动 trigger 驱动，
        // 因此必须关掉 RHF 自身的自动校验：RHF 的 mode 是表单级的，
        // 只要它是 onChange，所有字段都会在 change 时校验，字段级 validateTrigger 形同虚设。
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        criteriaMode: 'all',
        // 合成 resolver 必须在每次渲染时重建，才能读到最新的注册表
        resolver: composeResolver(resolver ?? null, instance._registry),
    });

    // 渲染期绑定：Form.Item 当帧就要用 form._rhf，放 effect 里会晚一帧。幂等。
    instance._bind(rhf);

    return rhf;
}

/**
 * 取最近的 Form 实例。
 * @returns {Object} FormInstance。
 */
function useFormInstance() {
    return useFormContext().form;
}

/**
 * 监听字段值。支持 antd 的 selector 形式与 `{ form, preserve }` 选项。
 * @param {string|string[]|Function} namePathOrSelector - 字段路径、路径数组或 selector 函数。
 * @param {Object} [formOrOptions] - FormInstance 或 `{ form }`。
 * @returns {*} 监听的值。
 */
function useWatch(namePathOrSelector, formOrOptions) {
    const context = useFormContext();
    const form = formOrOptions?.form ?? formOrOptions ?? context.form;
    const control = form._rhf?.control ?? form.control;

    const isSelector = typeof namePathOrSelector === 'function';
    const name = isSelector ? undefined : namePathOrSelector;

    const value = useRhfWatch({
        control,
        name,
        // selector 形式监听整表，再在 compute 里取子集
        compute: isSelector ? (values) => namePathOrSelector(values) : undefined,
    });

    return value;
}

export {
    composeResolver,
    createFormInstance,
    getValueByPath,
    setValueByPath,
    toErrorMessages,
    normalizeValidateTrigger,
    useBoundRhf,
    useForm,
    useFormInstance,
    useWatch,
};
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/use-form.test.jsx
```

Expected: PASS（14 个测试）。若 `isFieldTouched` 或 `validateFields` 断言不符，按实际语义修正实现。

- [ ] **Step 5: 提交**

```bash
git add src/shared/ui/data-entry/form/use-form.js src/shared/ui/data-entry/form/use-form.test.jsx
git commit -m "feat(form): 新增 useForm 包装、合成 resolver 与 FormInstance 适配"
```

---

## Task 6: Form.Item

**Files:**

- Create: `src/shared/ui/data-entry/form/form-item.jsx`
- Create: `src/shared/ui/data-entry/form/form-item.test.jsx`

**Interfaces:**

- Consumes: `ItemContext`、`useFormContext`、`injectFieldProps`、`compileRules`、`normalizeColProps`
- Produces:
    - `FormItem`：组件，导出为 `Form.Item`
    - `useItemStatus()`：`Form.Item.useStatus()` 的实现，返回 `{ status, errors, warnings }`
    - `resolveStatus({ invalid, isValidating, isTouched, explicit }) -> 'error'|'warning'|'validating'|'success'|undefined`

**实现约束：**

- 字段名 = `ListContext.prefix` + `name`（Form.List 内的字段自动拼前缀）。
- `dependencies` 不用 RHF 的 `register({ deps })`（实测其重校验不可靠），改用 `watch` 订阅依赖字段，变化时 `trigger(name)`。
- `warningOnly` 规则不进错误通道：用独立 state + `useEffect` 计算，只渲染黄色文案。
- `noStyle` 只支持一层：外层无 `name` 时自身不注册，错误来自内层经 `ItemContext` 冒泡。
- 子元素为 `null` 时不注册字段，只告警。

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/form-item.test.jsx`：

```jsx
/**
 * @file Form.Item 测试
 * @description 校验状态推导、错误渲染、子元素异常处理与 useStatus。
 */

import test from 'node:test';
import assert from 'node:assert';
import { resolveStatus } from '@shared/ui/data-entry/form/form-item';

test('未 touched 且未提交时 status 为 undefined', () => {
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: false }),
        undefined
    );
});

test('invalid 为 true 时 status 为 error', () => {
    assert.equal(resolveStatus({ invalid: true, isValidating: false, isTouched: true }), 'error');
});

test('isValidating 优先于 error', () => {
    assert.equal(
        resolveStatus({ invalid: true, isValidating: true, isTouched: true }),
        'validating'
    );
});

test('已 touched 且通过时 status 为 success', () => {
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: true }),
        'success'
    );
});

test('显式 validateStatus 覆盖推导结果', () => {
    assert.equal(
        resolveStatus({ invalid: true, isValidating: false, isTouched: true, explicit: 'warning' }),
        'warning'
    );
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: false, explicit: 'error' }),
        'error'
    );
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form-item.test.jsx
```

Expected: FAIL — 无法解析模块。

- [ ] **Step 3: 实现 form-item.jsx**

创建 `src/shared/ui/data-entry/form/form-item.jsx`：

```jsx
/**
 * @file 表单字段项（Form.Item）
 * @description 声明式字段容器：负责注册字段、注入受控值、渲染标签与错误信息。
 * 值绑定走 field-adapter 的适配表；错误渲染复用 FieldError 组件族，保证与 Field 视觉一致。
 *
 * 拆成 FieldItem / PlainItem 两个组件是有意为之：useController 的 name 不能为 undefined
 * （实测会抛 split 相关错误），因此「有 name」与「无 name」必须在组件边界上分流，
 * 而不是在同一个组件里条件调用 hooks。
 */

import { useEffect, useMemo, useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { cn } from 'cn';
import { Label } from '@shared/ui/data-entry/label';
import { FieldError } from '@shared/ui/data-entry/field';
import { Col } from '@shared/ui/layout/col';
import { Row } from '@shared/ui/layout/row';
import {
    ItemContext,
    useFormContext,
    useItemContext,
    useListContext,
} from '@shared/ui/data-entry/form/context';
import { compileRules } from '@shared/ui/data-entry/form/rules';
import { normalizeValidateTrigger } from '@shared/ui/data-entry/form/use-form';
import { injectFieldProps } from '@shared/ui/data-entry/form/field-adapter';
import {
    DEFAULT_LABEL_COL,
    DEFAULT_WRAPPER_COL,
    normalizeColProps,
} from '@shared/ui/data-entry/form/field-layout';

/** 无 warning 时复用的空数组，避免每次渲染产生新引用。 */
const EMPTY_WARNINGS = [];

/**
 * 推导字段的校验状态。
 * @param {Object} params - 状态输入。
 * @param {boolean} params.invalid - 是否校验失败。
 * @param {boolean} params.isValidating - 是否校验中。
 * @param {boolean} params.isTouched - 是否被操作过。
 * @param {('success'|'warning'|'error'|'validating')} [params.explicit] - 显式指定的状态。
 * @returns {('success'|'warning'|'error'|'validating'|undefined)} 状态。
 */
function resolveStatus({ invalid, isValidating, isTouched, explicit }) {
    if (explicit) {
        return explicit;
    }
    if (isValidating) {
        return 'validating';
    }
    if (invalid) {
        return 'error';
    }
    if (isTouched) {
        return 'success';
    }
    return undefined;
}

/**
 * 读取当前 Form.Item 的校验状态（对应 antd 的 Form.Item.useStatus）。
 * @returns {{status: string|undefined, errors: string[], warnings: string[]}} 状态对象。
 */
function useItemStatus() {
    const context = useItemContext();
    if (!context) {
        return { status: undefined, errors: [], warnings: [] };
    }
    return { status: context.status, errors: context.errors, warnings: context.warnings };
}

/**
 * 计算带 List 前缀的完整字段名。
 * @param {string|Array} name - 字段名。
 * @param {string} prefix - Form.List 的 name 前缀。
 * @returns {string|undefined} 完整字段名。
 */
function resolveFieldName(name, prefix) {
    if (name === undefined || name === null) {
        return undefined;
    }
    const raw = Array.isArray(name) ? name.join('.') : String(name);
    return prefix ? `${prefix}.${raw}` : raw;
}

/**
 * 必填星号。
 * @param {Object} props - 组件属性。
 * @param {boolean} props.required - 是否必填。
 * @returns {JSX.Element|null}
 */
function RequiredMark({ required }) {
    if (!required) {
        return null;
    }
    return (
        <span aria-hidden="true" className="mr-1 text-danger-text">
            *
        </span>
    );
}

/**
 * 计算 warningOnly 规则的提示文案。独立通道：不进错误态、不阻断提交。
 * @param {Array<Object>} warningRules - 只含 warningOnly 的规则。
 * @param {*} value - 当前字段值。
 * @param {Object} allValues - 表单全部值。
 * @param {string} label - 字段标签，供模板变量使用。
 * @returns {Promise<string[]>} 提示文案数组。
 */
async function runWarningRules(warningRules, value, allValues, label) {
    const validators = compileRules(
        warningRules.map((rule) => ({ ...rule, warningOnly: false })),
        { label }
    );
    const messages = [];
    for (const validate of validators) {
        const message = await validate(value, allValues);
        if (message) {
            messages.push(message);
        }
    }
    return messages;
}

/**
 * 渲染字段的外壳（标签 + 控件区 + 错误/提示）。
 * @param {Object} props - 渲染所需的数据。
 * @returns {JSX.Element} 字段外壳。
 */
function ItemShell(props) {
    const {
        layout,
        labelNode,
        controlNode,
        className,
        fieldName,
        invalid,
        status,
        hidden,
        onBlur,
        labelCol,
        wrapperCol,
    } = props;

    const isHorizontal = layout === 'horizontal';

    const body = isHorizontal ? (
        <Row>
            <Col {...labelCol}>{labelNode}</Col>
            <Col {...wrapperCol}>{controlNode}</Col>
        </Row>
    ) : (
        <>
            {labelNode}
            {controlNode}
        </>
    );

    return (
        <div
            data-slot="form-item"
            data-field-name={fieldName}
            data-invalid={invalid || undefined}
            data-status={status}
            onBlur={onBlur}
            className={cn(
                'flex w-full flex-col gap-2',
                layout === 'inline' && 'flex-row items-center gap-2',
                hidden && 'hidden',
                className
            )}
        >
            {body}
        </div>
    );
}

/**
 * 无 name 的 Form.Item：只作为布局容器或 noStyle 父级，不注册字段。
 * @param {Object} props - 组件属性，见 FormItem。
 * @returns {JSX.Element}
 */
function PlainItem(props) {
    const {
        label,
        required,
        help,
        extra,
        noStyle,
        hidden,
        className,
        children,
        layout,
        labelCol,
        wrapperCol,
        shouldUpdate,
    } = props;

    const formContext = useFormContext();
    const childItem = useItemContext();

    // noStyle 父级：错误来自内层冒泡上来的状态。用 useMemo 稳定引用，
    // 否则 `?? []` 每次渲染都产出新数组，会让下游 useMemo 每轮失效。
    const errors = useMemo(() => childItem?.errors ?? [], [childItem]);
    const warnings = useMemo(() => childItem?.warnings ?? [], [childItem]);
    const status = childItem?.status;

    const contextValue = useMemo(
        () => ({ name: undefined, required: Boolean(required), status, errors, warnings }),
        [required, status, errors, warnings]
    );

    // shouldUpdate：订阅全表值以驱动重渲染（任一字段变化即重渲染）。
    // 函数形式的「比较上一次值决定是否重渲染」不实现：它需要读取渲染期的上一次值，
    // 而这会触发 React Compiler 的 refs 规则；传函数时按 true 处理并开发期告警。
    const shouldSubscribe = Boolean(shouldUpdate);
    useWatch({ control: formContext.form._rhf.control, disabled: !shouldSubscribe });

    if (typeof shouldUpdate === 'function') {
        console.warn('[Form] shouldUpdate 暂不支持函数形式，已按 true 处理。');
    }

    // children 为函数时视为渲染函数，传入表单实例
    const content = typeof children === 'function' ? children(formContext.form) : children;

    const labelNode =
        label === undefined ? null : (
            <Label data-slot="form-item-label" className="leading-snug">
                <RequiredMark required={Boolean(required)} />
                {label}
                {formContext.colon ? ':' : ''}
            </Label>
        );

    const controlNode = (
        <div className="flex w-full flex-col gap-1" data-slot="form-item-control">
            {content}
            {help !== undefined ? (
                <div className="text-sm text-(--text-3)">{help}</div>
            ) : (
                errors.length > 0 && <FieldError errors={errors} />
            )}
            {warnings.length > 0 && (
                <div role="alert" className="text-sm text-warning">
                    {warnings.join('；')}
                </div>
            )}
            {extra !== undefined && <div className="text-sm text-(--text-3)">{extra}</div>}
        </div>
    );

    if (noStyle) {
        return <ItemContext.Provider value={contextValue}>{content}</ItemContext.Provider>;
    }

    return (
        <ItemContext.Provider value={contextValue}>
            <ItemShell
                layout={layout ?? formContext.layout}
                labelNode={labelNode}
                controlNode={controlNode}
                className={className}
                invalid={false}
                status={status}
                hidden={hidden}
                labelCol={
                    normalizeColProps(labelCol) ??
                    normalizeColProps(formContext.labelCol) ??
                    DEFAULT_LABEL_COL
                }
                wrapperCol={
                    normalizeColProps(wrapperCol) ??
                    normalizeColProps(formContext.wrapperCol) ??
                    DEFAULT_WRAPPER_COL
                }
            />
        </ItemContext.Provider>
    );
}

/**
 * 有 name 的 Form.Item：注册字段、注入受控值、参与校验。
 * @param {Object} props - 组件属性，见 FormItem。
 * @returns {JSX.Element}
 */
function FieldItem(props) {
    const {
        name,
        label,
        rules,
        required,
        help,
        extra,
        valuePropName,
        trigger,
        getValueFromEvent,
        normalize,
        hidden = false,
        noStyle = false,
        initialValue,
        dependencies,
        validateStatus,
        htmlFor,
        labelCol,
        wrapperCol,
        layout,
        className,
        children,
        validateTrigger,
    } = props;

    const formContext = useFormContext();
    const { prefix } = useListContext();
    const fieldName = resolveFieldName(name, prefix);
    const control = formContext.form._rhf.control;

    // 本字段的校验触发时机：Item 级优先于 Form 级。校验全部由这里手动触发
    // （RHF 的 mode 已设为 onSubmit），因此字段级配置才真正生效。
    const effectiveValidateTrigger = normalizeValidateTrigger(
        validateTrigger ?? formContext.validateTrigger
    );
    const validateOnChange = effectiveValidateTrigger.includes('onChange');
    const validateOnBlur = effectiveValidateTrigger.includes('onBlur');

    /** 手动触发本字段校验。 */
    const runValidate = () => {
        formContext.form._rhf.trigger(fieldName);
    };

    /**
     * 焦点移出整个字段时才处理 blur：RadioGroup 各项之间移动焦点也会冒泡出
     * focusout，用 relatedTarget 判断焦点是否仍在字段内部，避免多余校验。
     */
    const handleBlur = (event) => {
        // touched 状态与校验时机无关，blur 一律标记
        field.onBlur();
        if (!validateOnBlur) {
            return;
        }
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
            return;
        }
        runValidate();
    };

    // 注册 rules，供合成 resolver 使用
    useEffect(() => {
        if (!rules) {
            return undefined;
        }
        formContext.form._registry.set(fieldName, {
            rules,
            label: typeof label === 'string' ? label : fieldName,
        });
        return () => {
            formContext.form._registry.delete(fieldName);
        };
    }, [formContext.form, fieldName, rules, label]);

    // 登记挂载状态，供 FormInstance 判断是否需要 register 往返
    useEffect(() => {
        formContext.form._mountedFields.add(fieldName);
        return () => {
            formContext.form._mountedFields.delete(fieldName);
        };
    }, [formContext.form, fieldName]);

    const { field, fieldState } = useController({
        name: fieldName,
        control,
        defaultValue: initialValue,
        rules: normalize ? { setValueAs: normalize } : undefined,
    });

    // dependencies：自己订阅依赖字段，变化时触发本字段重校验。
    // 不用 RHF 的 register({ deps })——实测其重校验不可靠。
    const dependencyNames = useMemo(() => dependencies ?? [], [dependencies]);
    const dependencyValues = useWatch({ control, name: dependencyNames });
    const dependenciesKey = JSON.stringify(dependencyValues ?? null);

    useEffect(() => {
        if (dependencyNames.length === 0) {
            return;
        }
        formContext.form._rhf.trigger(fieldName);
        // 依赖值变化（dependenciesKey）即触发；fieldName / trigger 不需要进依赖数组
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependenciesKey]);

    // warningOnly：独立通道，不进错误态、不阻断提交。
    // state 只在异步回调里写入（effect 体内同步 setState 会触发
    // react-hooks/set-state-in-effect），无 warning 规则时直接由派生值兜底。
    const [asyncWarnings, setAsyncWarnings] = useState([]);
    const warningRules = useMemo(
        () => (Array.isArray(rules) ? rules.filter((rule) => rule?.warningOnly) : []),
        [rules]
    );
    const warningKey = JSON.stringify(warningRules);

    useEffect(() => {
        if (warningRules.length === 0) {
            return undefined;
        }
        let cancelled = false;
        runWarningRules(
            warningRules,
            field.value,
            formContext.form._rhf.getValues(),
            typeof label === 'string' ? label : fieldName
        ).then((messages) => {
            if (!cancelled) {
                setAsyncWarnings(messages);
            }
        });
        return () => {
            cancelled = true;
        };
        // warningKey 代表规则内容，避免每次渲染都重跑
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warningKey, field.value, fieldName]);

    const warnings = warningRules.length === 0 ? EMPTY_WARNINGS : asyncWarnings;

    const isRequired = required ?? (Array.isArray(rules) && rules.some((rule) => rule?.required));
    const status = resolveStatus({
        invalid: fieldState.invalid,
        isValidating: fieldState.isValidating,
        isTouched: fieldState.isTouched,
        explicit: validateStatus,
    });

    const injected = injectFieldProps(children, {
        value: field.value,
        onChange: (eventOrValue) => {
            const next = getValueFromEvent ? getValueFromEvent(eventOrValue) : eventOrValue;
            field.onChange(next);
            if (validateOnChange) {
                // field.onChange 会同步把值写入 store（已实测），可直接触发校验
                runValidate();
            }
        },
        invalid: fieldState.invalid,
        id: htmlFor ?? fieldName,
        valuePropName,
        trigger,
    });

    const contextValue = useMemo(
        () => ({
            name: fieldName,
            required: Boolean(isRequired),
            status,
            errors: fieldState.invalid ? [fieldState.error] : [],
            warnings,
        }),
        [fieldName, isRequired, status, fieldState.invalid, fieldState.error, warnings]
    );

    if (noStyle) {
        // 包一层带 data-field-name 的容器：scrollToField 依赖它定位字段。
        // 不用 display:contents——那会让元素没有盒子，scrollIntoView 失效。
        return (
            <ItemContext.Provider value={contextValue}>
                <div
                    data-slot="form-item"
                    data-field-name={fieldName}
                    data-invalid={fieldState.invalid || undefined}
                    onBlur={handleBlur}
                >
                    {injected}
                </div>
            </ItemContext.Provider>
        );
    }

    if (hidden) {
        // 隐藏但仍注册与校验：受控控件已注入，这里用 hidden 属性隐藏外壳
        return (
            <ItemContext.Provider value={contextValue}>
                <ItemShell
                    layout={layout ?? formContext.layout}
                    labelNode={null}
                    controlNode={<div data-slot="form-item-control">{injected}</div>}
                    className={className}
                    fieldName={fieldName}
                    invalid={fieldState.invalid}
                    status={status}
                    hidden
                    onBlur={handleBlur}
                    labelCol={DEFAULT_LABEL_COL}
                    wrapperCol={DEFAULT_WRAPPER_COL}
                />
            </ItemContext.Provider>
        );
    }

    const labelNode =
        label === undefined ? null : (
            <Label
                htmlFor={htmlFor ?? fieldName}
                data-slot="form-item-label"
                className={cn(
                    'leading-snug',
                    formContext.layout === 'horizontal' &&
                        formContext.labelAlign === 'right' &&
                        'justify-end'
                )}
            >
                <RequiredMark required={Boolean(isRequired)} />
                {label}
                {formContext.colon ? ':' : ''}
            </Label>
        );

    const controlNode = (
        <div className="flex w-full flex-col gap-1" data-slot="form-item-control">
            {injected}
            {help !== undefined ? (
                <div className="text-sm text-(--text-3)">{help}</div>
            ) : (
                fieldState.invalid && <FieldError errors={[fieldState.error]} />
            )}
            {warnings.length > 0 && (
                <div role="alert" className="text-sm text-warning">
                    {warnings.join('；')}
                </div>
            )}
            {extra !== undefined && <div className="text-sm text-(--text-3)">{extra}</div>}
        </div>
    );

    return (
        <ItemContext.Provider value={contextValue}>
            <ItemShell
                layout={layout ?? formContext.layout}
                labelNode={labelNode}
                controlNode={controlNode}
                className={className}
                fieldName={fieldName}
                invalid={fieldState.invalid}
                status={status}
                onBlur={handleBlur}
                labelCol={
                    normalizeColProps(labelCol) ??
                    normalizeColProps(formContext.labelCol) ??
                    DEFAULT_LABEL_COL
                }
                wrapperCol={
                    normalizeColProps(wrapperCol) ??
                    normalizeColProps(formContext.wrapperCol) ??
                    DEFAULT_WRAPPER_COL
                }
            />
        </ItemContext.Provider>
    );
}

/**
 * Form.Item 组件。有 name 时注册字段，无 name 时仅作布局容器（noStyle 父级场景）。
 * @param {Object} props - 组件属性。
 * @param {string|Array} [props.name] - 字段名；不传则只作为布局容器。
 * @param {React.ReactNode} [props.label] - 标签内容。
 * @param {Array<Object>} [props.rules] - 校验规则数组。
 * @param {string|string[]} [props.validateTrigger] - 本字段的校验触发时机，
 *   覆盖 Form 级配置；支持 onChange / onBlur / onSubmit，可传数组。
 * @param {boolean} [props.required] - 是否强制显示必填标记。
 * @param {React.ReactNode} [props.help] - 自定义提示信息，替代规则产生的错误文案。
 * @param {React.ReactNode} [props.extra] - 额外的说明信息，可与错误并存。
 * @param {string} [props.valuePropName] - 取值属性名，覆盖适配表。
 * @param {string} [props.trigger] - 变更属性名，覆盖适配表。
 * @param {Function} [props.getValueFromEvent] - 从事件取值。
 * @param {Function} [props.normalize] - 入库前转换值。
 * @param {boolean} [props.hidden] - 隐藏但仍收集与校验。
 * @param {boolean} [props.noStyle] - 不渲染标签与布局外壳。
 * @param {*} [props.initialValue] - 字段默认值。
 * @param {Array<string>} [props.dependencies] - 依赖字段，变化时触发本字段重校验。
 * @param {boolean|Function} [props.shouldUpdate] - 自定义更新逻辑。
 * @param {('success'|'warning'|'error'|'validating')} [props.validateStatus] - 手动指定状态。
 * @param {string} [props.htmlFor] - label 的 htmlFor。
 * @param {Object} [props.labelCol] - 标签栅格。
 * @param {Object} [props.wrapperCol] - 控件栅格。
 * @param {('horizontal'|'vertical'|'inline')} [props.layout] - 本项布局。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 单个控件元素，或 shouldUpdate 的渲染函数。
 * @returns {JSX.Element}
 */
function FormItem(props) {
    const hasName = props.name !== undefined && props.name !== null;

    if (!hasName) {
        return <PlainItem {...props} />;
    }

    return <FieldItem {...props} />;
}

export { FormItem, useItemStatus, resolveStatus };
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form-item.test.jsx
```

Expected: PASS（5 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/shared/ui/data-entry/form/form-item.jsx src/shared/ui/data-entry/form/form-item.test.jsx
git commit -m "feat(form): 新增 Form.Item"
```

---

## Task 7: Form.List 与 Form.ErrorList

**Files:**

- Create: `src/shared/ui/data-entry/form/form-list.jsx`
- Create: `src/shared/ui/data-entry/form/form-list.test.jsx`

**Interfaces:**

- Consumes: `ListContext`、`useFormContext`、`compileRules`
- Produces:
    - `FormList`：组件，导出为 `Form.List`
    - `FormErrorList`：组件，导出为 `Form.ErrorList`
    - `createListOperations(fieldArray, prefix) -> { add, remove, move }`：把 RHF 的 fieldArray 方法包装成 antd 形状

**实现约束：**

- `add(defaultValue?, insertIndex?)`：给了 `insertIndex` 用 RHF `insert`，否则 `append`。
- `remove(index | number[])`：直接转发 RHF `remove`。
- `move(from, to)`：用 RHF **`move`**（实测与 antd 的 rc-field-form `move` 语义一致：`move(0,2)` 于 `ABCD` 上均得 `BCAD`）。**不要用 `swap`**，那是交换，得 `CBAD`。
- `ListContext.prefix` 传列表的完整路径，内部 `Form.Item` 自动拼索引。

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/form-list.test.jsx`：

```jsx
/**
 * @file Form.List 测试
 * @description 校验操作包装的语义（尤其 move 必须是"取出插入"而非"交换"）。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createListOperations } from '@shared/ui/data-entry/form/form-list';

/** 造一个记录调用的假 fieldArray。 */
function makeSpy() {
    const calls = [];
    return {
        calls,
        append: (...args) => calls.push(['append', ...args]),
        insert: (...args) => calls.push(['insert', ...args]),
        remove: (...args) => calls.push(['remove', ...args]),
        move: (...args) => calls.push(['move', ...args]),
        swap: (...args) => calls.push(['swap', ...args]),
    };
}

test('add 不给位置时走 append', () => {
    const spy = makeSpy();
    createListOperations(spy).add({ name: 'x' });
    assert.deepEqual(spy.calls, [['append', { name: 'x' }]]);
});

test('add 给位置时走 insert', () => {
    const spy = makeSpy();
    createListOperations(spy).add({ name: 'x' }, 1);
    assert.deepEqual(spy.calls, [['insert', 1, { name: 'x' }]]);
});

test('add 不给默认值时插入空对象', () => {
    const spy = makeSpy();
    createListOperations(spy).add();
    assert.deepEqual(spy.calls, [['append', {}]]);
});

test('remove 转发索引', () => {
    const spy = makeSpy();
    createListOperations(spy).remove(2);
    assert.deepEqual(spy.calls, [['remove', 2]]);
});

test('remove 支持索引数组', () => {
    const spy = makeSpy();
    createListOperations(spy).remove([0, 2]);
    assert.deepEqual(spy.calls, [['remove', [0, 2]]]);
});

test('move 走 RHF 的 move，不是 swap', () => {
    // 关键回归点：swap 是交换语义，与 antd 的 move 不同
    const spy = makeSpy();
    createListOperations(spy).move(0, 2);
    assert.deepEqual(spy.calls, [['move', 0, 2]]);
    assert.equal(
        spy.calls.some(([name]) => name === 'swap'),
        false
    );
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form-list.test.jsx
```

Expected: FAIL — 无法解析模块。

- [ ] **Step 3: 实现 form-list.jsx**

创建 `src/shared/ui/data-entry/form/form-list.jsx`：

```jsx
/**
 * @file 数组字段（Form.List）与错误列表（Form.ErrorList）
 * @description 基于 RHF 的 useFieldArray 实现 antd 的 Form.List。children 为渲染函数，
 * 接收 (fields, operation, meta)。List 内的 Form.Item 会自动拼上索引前缀。
 */

import { useMemo } from 'react';
import { useFieldArray } from 'react-hook-form';
import { cn } from 'cn';
import { ListContext, useFormContext } from '@shared/ui/data-entry/form/context';
import { compileRules } from '@shared/ui/data-entry/form/rules';

/**
 * 把 RHF 的 fieldArray 方法包装成 antd 的 operation 形状。
 * @param {Object} fieldArray - RHF useFieldArray 的返回值。
 * @returns {{add: Function, remove: Function, move: Function}} antd 形状的操作对象。
 */
function createListOperations(fieldArray) {
    return {
        /**
         * 新增一项。
         * @param {*} [defaultValue] - 新项的默认值，缺省为空对象。
         * @param {number} [insertIndex] - 插入位置，缺省追加到末尾。
         */
        add: (defaultValue, insertIndex) => {
            const value = defaultValue === undefined ? {} : defaultValue;
            if (insertIndex === undefined) {
                fieldArray.append(value);
            } else {
                fieldArray.insert(insertIndex, value);
            }
        },
        /** 删除一项或多项。 */
        remove: (index) => fieldArray.remove(index),
        // 用 move 而非 swap：antd 的 move 是"取出并插入到目标位置"，
        // swap 只交换两项，实测 move(0,2) 于 ABCD 上 rc-field-form 与 RHF 均得 BCAD，swap 得 CBAD。
        move: (from, to) => fieldArray.move(from, to),
    };
}

/**
 * Form.List 组件。
 * @param {Object} props - 组件属性。
 * @param {string} props.name - 列表字段名。
 * @param {Array} [props.initialValue] - 列表初始值。
 * @param {Array<Object>} [props.rules] - 列表级规则，仅支持 `{ validator, message }`。
 * @param {Function} props.children - 渲染函数 `(fields, operation, meta) => ReactNode`。
 * @returns {JSX.Element}
 */
function FormList(props) {
    const { name, rules, children } = props;
    const formContext = useFormContext();

    const fieldArray = useFieldArray({
        control: formContext.form._rhf.control,
        name,
        rules: Array.isArray(rules)
            ? {
                  validate: (value) => {
                      const validators = compileRules(rules, { label: name });
                      return (async () => {
                          for (const validate of validators) {
                              const message = await validate(
                                  value,
                                  formContext.form._rhf.getValues()
                              );
                              if (message) {
                                  return message;
                              }
                          }
                          return undefined;
                      })();
                  },
              }
            : undefined,
    });

    const operations = useMemo(() => createListOperations(fieldArray), [fieldArray]);

    // 列表自身的错误（如"至少一项"）由 rules 产生
    const listErrors = useMemo(() => {
        const error = formContext.form._rhf.control._formState.errors?.[name];
        if (!error) {
            return [];
        }
        return error.types
            ? Object.values(error.types).filter(Boolean)
            : error.message
              ? [error.message]
              : [];
    }, [formContext.form, name]);

    const meta = useMemo(() => ({ errors: listErrors }), [listErrors]);

    return (
        <ListContext.Provider value={{ prefix: name }}>
            {children(fieldArray.fields, operations, meta)}
        </ListContext.Provider>
    );
}

/**
 * Form.ErrorList 组件，渲染一组错误消息。
 * @param {Object} props - 组件属性。
 * @param {Array<React.ReactNode>} props.errors - 错误消息列表。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element|null}
 */
function FormErrorList(props) {
    const { errors, className } = props;

    if (!Array.isArray(errors) || errors.length === 0) {
        return null;
    }

    return (
        <ul
            role="alert"
            className={cn('ml-4 flex list-disc flex-col gap-1 text-sm text-danger-text', className)}
        >
            {errors.map((error, index) => (
                <li key={index}>{error}</li>
            ))}
        </ul>
    );
}

export { FormList, FormErrorList, createListOperations };
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form-list.test.jsx
```

Expected: PASS（6 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/shared/ui/data-entry/form/form-list.jsx src/shared/ui/data-entry/form/form-list.test.jsx
git commit -m "feat(form): 新增 Form.List 与 Form.ErrorList"
```

---

## Task 8: Form 主体与聚合导出

**Files:**

- Create: `src/shared/ui/data-entry/form/index.jsx`
- Create: `src/shared/ui/data-entry/form/form.test.jsx`
- Modify: `src/shared/ui/index.js`
- Modify: `src/shared/ui/AGENTS.md`

**Interfaces:**

- Consumes: `createFormInstance`、`composeResolver`、`FormContext`、`FormItem`、`FormList`、`FormErrorList`、`useForm`、`useFormInstance`、`useWatch`、`useItemStatus`
- Produces: `Form`（含静态属性 `.Item` / `.List` / `.ErrorList` / `.useForm` / `.useFormInstance` / `.useWatch`）

**实现约束：**

- `Form` 渲染原生 `<form>`，`onFinish` / `onFinishFailed` 由 `handleSubmit` 驱动。
- `onValuesChange` / `onFieldsChange` **只在用户交互时触发**（用 RHF 的 `watch` 回调，回调里 `info.type` 存在即为用户交互），`setFieldsValue` 不触发。
- `scrollToFirstError` 在提交失败时对第一个错误字段滚动并聚焦。
- `disabled` 通过 context 传给 Form.Item，由注入的属性落到控件。
- `requiredMark` 支持 `true` / `false` / `'optional'` / 函数。

- [ ] **Step 1: 写失败测试**

创建 `src/shared/ui/data-entry/form/form.test.jsx`：

```jsx
/**
 * @file Form 主体测试
 * @description 校验提交回调、onValuesChange 的触发边界与 requiredMark 推导。
 */

import test from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Form } from '@shared/ui/data-entry/form';
import { Input } from '@shared/ui/data-entry/input';
import { isUserEvent, renderRequiredMark } from '@shared/ui/data-entry/form/index.jsx';

test('isUserEvent：带 type 的 watch 回调视为用户交互', () => {
    assert.equal(isUserEvent({ type: 'change', name: 'a' }), true);
    assert.equal(isUserEvent({ type: 'blur', name: 'a' }), true);
});

test('isUserEvent：无 type 的回调（setValue 触发）不算用户交互', () => {
    // 关键回归点：antd 的 setFieldsValue 不触发 onValuesChange
    assert.equal(isUserEvent({ name: 'a' }), false);
    assert.equal(isUserEvent(undefined), false);
});

test('requiredMark 为 true 时显示必填星号', () => {
    assert.equal(renderRequiredMark(true, { required: true }), '*');
});

test('requiredMark 为 false 时不显示', () => {
    assert.equal(renderRequiredMark(false, { required: true }), null);
});

test('requiredMark 为 optional 时对非必填字段显示「(可选)」', () => {
    assert.equal(renderRequiredMark('optional', { required: false }), '(可选)');
    assert.equal(renderRequiredMark('optional', { required: true }), '*');
});

test('requiredMark 为函数时使用其返回值', () => {
    assert.equal(
        renderRequiredMark((label, { required }) => (required ? '必填' : ''), { required: true }),
        '必填'
    );
});

test('Form 能渲染出 form 元素并透传 className', () => {
    const html = renderToStaticMarkup(
        h(Form, { className: 'my-form' }, h(Form.Item, { name: 'a', label: 'A' }, h(Input, null)))
    );
    assert.match(html, /<form/);
    assert.match(html, /my-form/);
});

test('Form.Item 在 Form 外使用时报错', () => {
    assert.throws(
        () => renderToStaticMarkup(h(Form.Item, { name: 'a' }, h(Input, null))),
        /必须放在 <Form> 内部/
    );
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form.test.jsx
```

Expected: FAIL — 无法解析模块。

- [ ] **Step 3: 实现 index.jsx**

创建 `src/shared/ui/data-entry/form/index.jsx`：

````jsx
/**
 * @file 表单组件（Form）
 * @description 声明式表单，API 形态对齐 Ant Design Form，底层以 React Hook Form 为唯一状态引擎。
 * 支持 layout / labelCol / wrapperCol / rules / Form.List / FormInstance 等核心能力。
 * 用法：
 *
 * ```jsx
 * <Form form={form} layout="horizontal" onFinish={(values) => console.log(values)}>
 *     <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
 *         <Input />
 *     </Form.Item>
 * </Form>
 * ```
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from 'cn';
import { FormContext } from '@shared/ui/data-entry/form/context';
import {
    createFormInstance,
    useBoundRhf,
    useForm,
    useFormInstance,
    useWatch,
} from '@shared/ui/data-entry/form/use-form';
import { FormItem, useItemStatus } from '@shared/ui/data-entry/form/form-item';
import { FormList, FormErrorList } from '@shared/ui/data-entry/form/form-list';

/**
 * 判断一次 watch 回调是否由用户交互触发。RHF 在用户输入时会带上 event type，
 * 程序化的 setValue 不带，借此对齐 antd「setFieldsValue 不触发 onValuesChange」的语义。
 * @param {{type?: string}} info - RHF watch 回调的第二个参数。
 * @returns {boolean} 是否用户交互。
 */
function isUserEvent(info) {
    return Boolean(info?.type);
}

/**
 * 计算必填标记的渲染结果。
 * @param {boolean|'optional'|Function} requiredMark - antd 的 requiredMark 配置。
 * @param {Object} params - 上下文。
 * @param {boolean} params.required - 该字段是否必填。
 * @param {string} [params.label] - 字段标签文本。
 * @returns {string|null} 标记文本；不显示时为 null。
 */
function renderRequiredMark(requiredMark, { required, label }) {
    if (typeof requiredMark === 'function') {
        return requiredMark(label, { required }) ?? null;
    }
    if (requiredMark === false) {
        return null;
    }
    if (requiredMark === 'optional') {
        return required ? '*' : '(可选)';
    }
    return required ? '*' : null;
}

/**
 * Form 组件。
 * @param {Object} props - 组件属性。
 * @param {Object} [props.form] - Form.useForm() 创建的实例，不传则内部创建。
 * @param {('horizontal'|'vertical'|'inline')} [props.layout='vertical'] - 表单布局。
 * @param {Object} [props.labelCol] - 标签栅格，仅 horizontal 生效。
 * @param {Object} [props.wrapperCol] - 控件栅格，仅 horizontal 生效。
 * @param {('left'|'right')} [props.labelAlign='right'] - 标签对齐。
 * @param {boolean} [props.colon=true] - 标签是否带冒号。
 * @param {string} [props.name] - 表单名，作为字段 id 前缀。
 * @param {Object} [props.initialValues] - 表单默认值，仅初始化与 resetFields 时生效。
 * @param {boolean} [props.disabled=false] - 是否禁用整个表单。
 * @param {boolean|'optional'|Function} [props.requiredMark=true] - 必填标记样式。
 * @param {boolean} [props.scrollToFirstError=false] - 提交失败时滚动到第一个错误字段。
 * @param {string|string[]} [props.validateTrigger='onChange'] - 字段校验触发时机的默认值，
 *   Form.Item 可各自覆盖。校验由 Form.Item 手动触发，因此 RHF 自身的自动校验已关闭。
 * @param {Function} [props.resolver] - 表单级校验器，如 zodResolver(schema)。
 *   注意：与 RHF 一致，onFinish 收到的是 resolver 返回的 values；
 *   若 schema 只覆盖部分字段，其余字段会被 zod 剥掉，需用 z.looseObject。
 * @param {Function} [props.onFinish] - 校验通过后的提交回调。
 * @param {Function} [props.onFinishFailed] - 校验失败回调。
 * @param {Function} [props.onValuesChange] - 字段值变化回调（仅用户交互触发）。
 * @param {Function} [props.onFieldsChange] - 字段状态变化回调（仅用户交互触发）。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 表单项。
 * @returns {JSX.Element}
 */
function Form(props) {
    const {
        form: externalForm,
        layout = 'vertical',
        labelCol,
        wrapperCol,
        labelAlign = 'right',
        colon = true,
        name,
        initialValues,
        disabled = false,
        requiredMark = true,
        scrollToFirstError = false,
        validateTrigger = 'onChange',
        resolver,
        onFinish,
        onFinishFailed,
        onValuesChange,
        onFieldsChange,
        className,
        children,
        ...rest
    } = props;

    // 实例由 useForm() 或 Form 自建，二者都会在这里绑定到同一个 RHF 上。
    // 关键：RHF 的 resolver 由「实例自己的注册表」合成，所以外部实例同样生效。
    const [fallbackInstance] = useState(() => createFormInstance());
    const form = externalForm ?? fallbackInstance;

    const [formElement, setFormElement] = useState(null);

    // 底层 RHF 与合成 resolver 都由 useBoundRhf 创建，并顺手把实例绑定上去
    const rhf = useBoundRhf(form, { initialValues, resolver });
    form._bindSubmit(() => formElement?.requestSubmit());

    // onValuesChange / onFieldsChange：只在用户交互时触发
    useEffect(() => {
        const subscription = rhf.watch((values, info) => {
            if (!isUserEvent(info)) {
                return;
            }
            onValuesChange?.(info.name ? { [info.name]: values?.[info.name] } : values, values);
            onFieldsChange?.(
                info.name ? [{ name: [info.name], value: values?.[info.name] }] : [],
                []
            );
        });
        return () => subscription.unsubscribe();
    }, [rhf, onValuesChange, onFieldsChange]);

    const handleFinish = useCallback(
        (values) => {
            onFinish?.(values);
        },
        [onFinish]
    );

    const handleFinishFailed = useCallback(
        (errors) => {
            onFinishFailed?.({ values: rhf.getValues(), errorFields: errors, outOfDate: false });

            if (scrollToFirstError) {
                const first = Object.keys(errors ?? {})[0];
                if (first) {
                    form.scrollToField(first, {
                        focus:
                            typeof scrollToFirstError === 'object'
                                ? scrollToFirstError.focus
                                : false,
                    });
                }
            }
        },
        [form, rhf, onFinishFailed, scrollToFirstError]
    );

    const submitHandler = rhf.handleSubmit(handleFinish, handleFinishFailed);

    const contextValue = useMemo(
        () => ({
            form,
            layout,
            labelCol,
            wrapperCol,
            labelAlign,
            colon,
            disabled,
            requiredMark,
            name,
            validateTrigger,
        }),
        [
            form,
            layout,
            labelCol,
            wrapperCol,
            labelAlign,
            colon,
            disabled,
            requiredMark,
            name,
            validateTrigger,
        ]
    );

    return (
        <FormContext.Provider value={contextValue}>
            <form
                ref={setFormElement}
                data-slot="form"
                data-layout={layout}
                data-disabled={disabled || undefined}
                className={cn(
                    'flex w-full flex-col gap-5',
                    layout === 'inline' && 'flex-row flex-wrap items-end gap-4',
                    className
                )}
                onSubmit={submitHandler}
                {...rest}
            >
                {children}
            </form>
        </FormContext.Provider>
    );
}

Form.Item = FormItem;
Form.List = FormList;
Form.ErrorList = FormErrorList;
Form.useForm = useForm;
Form.useFormInstance = useFormInstance;
Form.useWatch = useWatch;
Form.Item.useStatus = useItemStatus;

export {
    Form,
    FormItem,
    FormList,
    FormErrorList,
    useForm,
    useFormInstance,
    useWatch,
    useItemStatus,
    isUserEvent,
    renderRequiredMark,
};
````

- [ ] **Step 4: 运行测试确认通过**

```bash
node --import ./scripts/register-loader.mjs --test src/shared/ui/data-entry/form/form.test.jsx
```

Expected: PASS（8 个测试）。

- [ ] **Step 5: 补统一出口**

编辑 `src/shared/ui/index.js`，`// ── 数据录入 ──` 段内按字母序插入一行：

```js
export * from './data-entry/attachment';
export * from './data-entry/checkbox';
export * from './data-entry/field';
export * from './data-entry/form';
export * from './data-entry/input';
export * from './data-entry/label';
export * from './data-entry/radio-group';
export * from './data-entry/select';
export * from './data-entry/switch';
export * from './data-entry/textarea';
```

- [ ] **Step 6: 更新 AGENTS.md**

编辑 `src/shared/ui/AGENTS.md`，两处改动：

1. 目录表 `data-entry/` 行的现有组件列表补 `form`：

```
| `data-entry/`    | 数据录入：接收用户输入                       | `attachment` / `checkbox` / `field` / `form` / `input` / `label` / `radio-group` / `select` / `switch` / `textarea` |
```

2. 目录表 `layout/` 行的现有组件列表补 `row` / `col`：

```
| `layout/`        | 布局：只负责排布与容器，不承载数据语义       | `card` / `carousel` / `col` / `row` / `stack`                                                                        |
```

3. 在「目录结构与归类」小节末尾追加一段说明文件与目录的取舍：

```markdown
子系统（如 `form`）可建**同名目录**，入口为 `index.jsx`，内部按职责拆成多个文件（context / hooks /
纯函数 / 子组件）。判断标准：单个文件预计超过 300 行，或内部有多份互不导出的私有 context 时，
建目录；否则维持「一个组件一个 `.jsx` 文件」。
```

- [ ] **Step 7: 验证构建与 lint**

```bash
pnpm lint && pnpm build
```

Expected: 均通过。

- [ ] **Step 8: 提交**

```bash
git add src/shared/ui/data-entry/form/index.jsx src/shared/ui/data-entry/form/form.test.jsx src/shared/ui/index.js src/shared/ui/AGENTS.md
git commit -m "feat(form): 新增 Form 主体与聚合导出"
```

---

## Task 9: 示例页与端到端验证

**Files:**

- Create: `src/app1/pages/form-demo.jsx`
- Modify: `src/app1/pages/index.jsx`（渲染示例页）

**Interfaces:**

- Consumes: `Form`、`Row` / `Col`、全部 data-entry 控件、`zodResolver`
- Produces: 可在浏览器访问的示例页 `/app1/`

- [ ] **Step 1: 写示例页**

创建 `src/app1/pages/form-demo.jsx`：

```jsx
/**
 * @file Form 组件示例页
 * @description 覆盖 layout / labelCol / rules 各类型 / 控件适配 / dependencies /
 * Form.List / zodResolver 与 rules 共存 / noStyle / scrollToFirstError 的用法演示。
 * 既是可运行文档，也是 Playwright 验证的靶子。
 */

import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Button,
    Checkbox,
    Form,
    Input,
    RadioGroup,
    RadioGroupItem,
    Row,
    Col,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from '@shared/ui';

/**
 * 表单级 Zod schema，演示与字段级 rules 共存。
 * 用 looseObject 而非 object：zod 默认会剥掉 schema 之外的键，而 RHF 的提交载荷
 * 就是 resolver 返回的 values，用 object 会让非 schema 字段在 onFinish 里消失。
 */
const profileSchema = z.looseObject({
    email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
});

/** 各 rules 类型的演示规则。 */
const ruleShowcase = [
    { required: true, message: '必填项' },
    { min: 3, message: '至少 ${min} 个字符' },
    { max: 10, message: '至多 ${max} 个字符' },
];

/**
 * Form 示例页。
 * @returns {JSX.Element}
 */
export default function FormDemo() {
    const [form] = Form.useForm();
    const [result, setResult] = useState('');

    const onFinish = (values) => {
        setResult(JSON.stringify(values, null, 2));
    };

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
            <h1 className="text-2xl font-bold">Form 示例</h1>

            <Form
                form={form}
                layout="horizontal"
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                initialValues={{ nickname: '默认昵称', items: [{ value: '第一项' }] }}
                scrollToFirstError={{ focus: true }}
                onFinish={onFinish}
                resolver={zodResolver(profileSchema)}
                data-testid="demo-form"
            >
                <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[{ required: true, message: '请输入邮箱' }]}
                >
                    <Input placeholder="表单级 zod 与字段 rules 同时生效" />
                </Form.Item>

                <Form.Item name="nickname" label="昵称" rules={ruleShowcase}>
                    <Input />
                </Form.Item>

                <Form.Item name="bio" label="简介" rules={[{ max: 20, message: '至多 20 字' }]}>
                    <Textarea />
                </Form.Item>

                {/* validateTrigger="onBlur"：输入时不校验，失焦后才提示 */}
                <Form.Item
                    name="phone"
                    label="手机号"
                    validateTrigger="onBlur"
                    rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}
                >
                    <Input data-testid="phone" />
                </Form.Item>

                <Form.Item
                    name="role"
                    label="角色"
                    rules={[{ required: true, message: '请选择角色' }]}
                >
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">管理员</SelectItem>
                            <SelectItem value="user">普通用户</SelectItem>
                        </SelectContent>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="gender"
                    label="性别"
                    rules={[{ required: true, message: '请选择性别' }]}
                >
                    <RadioGroup>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="male" />男
                            </label>
                            <label className="flex items-center gap-2">
                                <RadioGroupItem value="female" />女
                            </label>
                        </div>
                    </RadioGroup>
                </Form.Item>

                <Form.Item name="enabled" label="启用" valuePropName="checked">
                    <Switch />
                </Form.Item>

                <Form.Item
                    name="agree"
                    label="同意条款"
                    valuePropName="checked"
                    rules={[{ validator: (v) => (v ? undefined : '请先同意条款') }]}
                >
                    <Checkbox />
                </Form.Item>

                {/* noStyle 嵌套：外层管布局与标签，内层只注入控件 */}
                <Form.Item label="联系方式" required>
                    <Form.Item
                        name="contact"
                        noStyle
                        rules={[{ required: true, message: '请输入联系方式' }]}
                    >
                        <Input />
                    </Form.Item>
                </Form.Item>

                {/* Form.List：动态增删 */}
                <Form.Item label="标签列表">
                    <Form.List name="items">
                        {(fields, operation, meta) => (
                            <div className="flex w-full flex-col gap-2">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <Form.Item
                                            name={`${index}.value`}
                                            noStyle
                                            rules={[{ required: true, message: '不能为空' }]}
                                        >
                                            <Input data-testid={`item-${index}`} />
                                        </Form.Item>
                                        <Button
                                            type="button"
                                            onClick={() => operation.remove(index)}
                                        >
                                            删除
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => operation.move(index, 0)}
                                            data-testid={`move-${index}`}
                                        >
                                            置顶
                                        </Button>
                                    </div>
                                ))}
                                <Form.ErrorList errors={meta.errors} />
                                <Button
                                    type="button"
                                    onClick={() => operation.add({ value: '' })}
                                    data-testid="add-item"
                                >
                                    新增一项
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </Form.Item>

                {/* shouldUpdate：依赖字段变化时重渲染 */}
                <Form.Item shouldUpdate>
                    {() => (
                        <div className="text-sm text-(--text-3)" data-testid="watch-preview">
                            当前昵称：{form.getFieldValue('nickname') || '（空）'}
                        </div>
                    )}
                </Form.Item>

                <Row gutter={8}>
                    <Col span={12}>
                        <Button type="submit" className="w-full" data-testid="submit">
                            提交
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            type="button"
                            className="w-full"
                            onClick={() => form.resetFields()}
                            data-testid="reset"
                        >
                            重置
                        </Button>
                    </Col>
                </Row>
            </Form>

            <pre data-testid="result" className="rounded bg-soft p-4 text-sm">
                {result || '（尚未提交）'}
            </pre>
        </div>
    );
}
```

- [ ] **Step 2: 挂到应用一**

编辑 `src/app1/pages/index.jsx`，替换为：

```jsx
/**
 * @file 应用一入口
 * @description 目前渲染 Form 组件示例页。
 * @returns {JSX.Element}
 */

import FormDemo from './form-demo.jsx';

export default function App1() {
    return <FormDemo />;
}
```

- [ ] **Step 3: 启动开发服务器**

```bash
pnpm dev
```

在后台运行，等待输出 `Local: http://localhost:5173/`。

- [ ] **Step 4: 用 Playwright 验证**

```bash
playwright-cli open http://localhost:5173/app1/
playwright-cli snapshot
```

逐项断言（每步用 `snapshot` 或 `eval` 取实际值，不要只看截图）：

1. **初始渲染**：`eval "document.querySelectorAll('[data-slot=form-item]').length"` 应 ≥ 8。
2. **必填星号**：`eval "document.querySelector('[data-slot=form-item-label]').textContent"` 含 `*`。
3. **rules 报错**：把昵称清空后提交，`eval "document.querySelector('[data-slot=field-error]').textContent"` 应出现文案。
4. **控件值收集**：选角色 → 点提交 → `eval "document.querySelector('[data-testid=result]').textContent"` 中应含 `"role": "admin"`。
5. **Switch / Checkbox**：切换开关并勾选同意 → 提交后 result 中 `"enabled": true`、`"agree": true`。
6. **Form.List 增删**：点 `add-item` 两次 → 输入值 → 删中间一项 → 断言剩下项的输入框值迁移正确（`eval` 取 `input[data-testid^=item-]` 的 value 数组）。
7. **move 语义**：输入 A / B / C 后点 `move-2`（置顶）→ 断言顺序变为 C / A / B，而不是交换后的 C / B / A。
8. **noStyle**：清空联系方式 → 提交 → 断言错误文案出现在外层 Item 内。
9. **scrollToFirstError**：清空邮箱后提交 → 断言焦点落到首个错误字段（`document.activeElement.id`）。
10. **validateTrigger="onBlur"**：往手机号输入 `123` → 断言此时**没有**错误文案；再让它失焦 → 断言出现「手机号格式不正确」。这是字段级校验触发时机的关键回归点。
11. **zodResolver 与 rules 共存**：邮箱填非法值 + 角色留空 → 提交 → 断言两个错误同时出现。
12. **控制台无报错**：`playwright-cli console` 无 error 级别输出。

- [ ] **Step 5: 清理 Playwright 产物**

```bash
rm -f .playwright-cli/*.png .playwright-cli/*.yml .playwright-cli/*.log
git status --short
```

Expected: 无截图 / 日志类未跟踪文件。

- [ ] **Step 6: 全量校验**

```bash
pnpm lint && pnpm build && node --import ./scripts/register-loader.mjs --test "src/**/*.test.jsx"
```

Expected: 三者均通过。

- [ ] **Step 7: 提交**

```bash
git add src/app1/pages/form-demo.jsx src/app1/pages/index.jsx
git commit -m "feat(app1): 新增 Form 示例页"
```

---

## 完成标准

- [x] `pnpm lint` 通过
- [x] `pnpm build` 通过
- [x] `node --import ./scripts/register-loader.mjs --test "src/**/*.test.jsx"` 全绿（79 个测试）
- [x] Playwright 断言通过（见下）
- [x] `.playwright-cli/` 已清理，`git status` 无残留
- [x] `src/shared/ui/AGENTS.md` 已更新
- [x] 示例页保留在仓库

## 实现记录（计划执行时补）

本计划的全部代码在写完后被**抽取到 `src` 下真跑过一轮**，因此下面这些是实测结论，不是推断：

| 现象                            | 根因                                                        | 落点                            |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| 非法值照样提交成功              | `Form` 内部另建 RHF，外部实例的 resolver 被绕过             | 实例改为持有注册表 + `_bind`    |
| store 有值、输入框空着          | Base UI `Field.Control` 首渲染拿到 `undefined` 即永久非受控 | `injectFieldProps` 归一 `value` |
| 所有 `required` 误报「必填」    | 用 `zodResolver` 失败时返回的空 `values` 取字段值           | 合成 resolver 改用原始输入值    |
| `onFinish` 只有 schema 内的字段 | zod 默认剥离未知键，而提交载荷就是 resolver 的 `values`     | 示例页改用 `z.looseObject`      |
| `scrollToField` 不聚焦          | 适配表未注入 ref，RHF `setFocus` 找不到元素                 | 改为 DOM 查询可聚焦子元素       |
| `noStyle` 字段找不到            | 无 `data-field-name` 容器                                   | 包一层带该属性的 div            |

Playwright 实测结论（`http://localhost:5174/app1/`）：

- 表单项 10 个、必填星号 5 个；
- `Select` / `RadioGroup` / `Switch` / `Checkbox` / `Input` / `Textarea` 与 `noStyle` 嵌套字段的值全部正确进入提交载荷；
- 表单级 zod 与字段级 rules 同时生效（`邮箱格式不正确` 与 `请选择角色` 并存）；
- `Form.List` 增 / 删 / `move` 均正确：`move(2, 0)` 于 `['第一项','B','C']` 上得 `['C','第一项','B']`（取出插入，非交换），删除中间项后索引正确重建；
- `scrollToFirstError={{ focus: true }}` 提交失败后焦点落到首个错误字段；
- 控制台无 error 级别输出。
