# 共享 Form 组件设计（对齐 Ant Design Form）

- 日期：2026-09-23
- 状态：待评审
- 落点：`src/shared/ui/data-entry/form/`、`src/shared/ui/layout/row.jsx`、`src/shared/ui/layout/col.jsx`

## 1. 目标与背景

模板当前的表单写法是 `useForm` + `Controller` + `Field` 组件族（见 `.agents/skills/form-validation/SKILL.md`），
每个字段都要手写一遍 `Controller` 的 render props 与错误渲染，字段一多就重复且啰嗦。
本设计新增一套**声明式** Form 组件，API 形态对齐 Ant Design Form，让业务可以写：

```jsx
<Form form={form} layout="horizontal" labelCol={{ span: 6 }} onFinish={onFinish}>
    <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
    </Form.Item>
</Form>
```

**验收标准**：上述写法可直接运行；Ant Design Form 文档中的核心 API（见 §4）在语义上可用；
底层仍是 React Hook Form，不引入第二套表单状态引擎。

## 2. 核心决策

| 决策     | 结论                                                         | 理由                                                  |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| 状态引擎 | React Hook Form，`FormInstance` 是其薄适配层                 | 不新建 store，与既有 RHF + Zod 生态共存               |
| v1 范围  | 核心子集（§4）                                               | 覆盖业务实际会用的 API，砍掉重叠与罕用项              |
| 校验     | `rules` 编译成 RHF `validate`，与 Form 级 `zodResolver` 并存 | 自定义 validator 无失真，Zod 写法不受影响             |
| 值绑定   | `cloneElement` 注入 + 内置控件适配表                         | `<Form.Item name="x"><Select /></Form.Item>` 直接可用 |
| 栅格     | 新增公共 `Row` / `Col`（24 列 CSS Grid）                     | `labelCol`/`wrapperCol` 需要真正的 24 列能力          |
| 文件组织 | `data-entry/form/` 目录                                      | 单文件会到 700–900 行，且 context 需独立可测          |
| 错误渲染 | 复用现有 `FieldError`、`Label`                               | 与 `Field` 组件族视觉一致，不另造一套                 |

## 3. 架构

### 3.1 组件树与 context

```
Form (form/)
 └─ FormContext.Provider  { form, layout, labelCol, wrapperCol, labelAlign, colon,
 │                          requiredMark, disabled, validateTrigger, preserve,
 │                          scrollToFirstError, name, registerField }
     └─ form 元素
         └─ Form.Item (form-item.jsx)
             ├─ 读 FormContext 取布局与实例
             ├─ ItemContext.Provider { name, required, status, errors, warnings,
             │                          setWarnings, control }
             │   ├─ label 区（Label + 必填星号 + 冒号）
             │   └─ 控件区（Row/Col 承载 labelCol/wrapperCol）
             │       └─ cloneElement 注入后的子控件
             │       └─ FieldError / help / extra / warning 文案
             └─ Form.List (form-list.jsx)
                 └─ ListContext.Provider { prefix }
```

- `FormContext`：Form 级配置 + 实例，`Form.Item` / `useFormInstance` / `Form.List` 消费。
- `ItemContext`：单个字段的 name、校验状态、warning 写入通道，供 `Form.Item.useStatus()` 与嵌套 `noStyle` 消费。
- `ListContext`：`Form.List` 的 name 前缀，`Form.Item` 自动拼接（解决 List 内嵌套字段的 name 问题）。

`noStyle` 的嵌套形态在 antd 里没有固定层数限制，本设计收敛为**一层**：

```
<Form.Item label="姓名" required>          ← 外层：布局 + 标签 + 错误展示
    <Form.Item name="name" noStyle rules={...}>  ← 内层：只注入控件
        <Input />
    </Form.Item>
</Form.Item>
```

外层无 `name` 时自身不注册字段，错误来自内层经 `ItemContext` 冒泡上来的状态（status 取最差者）。
不支持的形态：多层 `noStyle` 串联（`noStyle` 内再套 `noStyle`）、外层带 `name` 且内层也带 `name`。
遇到这两种写法时开发期 `console.warn` 提示。

### 3.2 FormInstance 映射

`FormInstance` 是 RHF 方法的适配层，不持有独立状态：

| antd FormInstance                         | 落到 RHF                                                                                           | 说明                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `getFieldValue(name)`                     | `getValues(name)`                                                                                  |                                                           |
| `getFieldsValue(nameList?, filterFunc?)`  | `getValues(nameList)` / `getValues()`                                                              | `getValues(true)` 会抛错，不可用                          |
| `getFieldError(name)`                     | `formState.errors` 经 namePath 取值                                                                | 返回 `string[]`                                           |
| `getFieldsError(nameList?)`               | 同上，批量                                                                                         | 返回 `{ name, errors }[]`                                 |
| `isFieldTouched(name)`                    | `formState.touchedFields`                                                                          |                                                           |
| `isFieldsTouched(nameList?, allTouched?)` | 同上                                                                                               |                                                           |
| `isFieldValidating(name)`                 | `formState.validatingFields`                                                                       |                                                           |
| `setFieldValue(name, value)`              | `clearErrors(name)` → `setValue`                                                                   | antd 会重置该字段错误，RHF 的 `setValue` 不会（已核源码） |
| `setFieldsValue(values)`                  | `register` → `setValue` → `clearErrors` → `unregister(name, { keepValue: true, keepError: true })` | 见 §6 风险 3                                              |
| `resetFields(fields?)`                    | `reset` / `resetField`                                                                             | 重置到 `initialValues`                                    |
| `validateFields(nameList?, config?)`      | `trigger`                                                                                          | `validateOnly` 为近似实现，JSDoc 标注                     |
| `submit()`                                | `requestSubmit()`                                                                                  |                                                           |
| `scrollToField(name, options)`            | 查 `[data-field-name]` + `setFocus`                                                                |                                                           |
| `getFieldInstance(name)`                  | 不支持                                                                                             | 直接抛错并提示用 `getFieldValue`                          |
| `setFields(fields)`                       | 不支持                                                                                             | 抛错，提示用 `setFieldsValue`                             |

**刻意对齐的语义**：`setFieldsValue` / `setFieldValue` 不触发 `onValuesChange` / `onFieldsChange`
（与 antd 一致，仅用户交互触发）。

**刻意标注为近似的实现**：

- `validateFields({ validateOnly: true })`：RHF 无"只校验不显示错误"，用 `{ shouldFocus: false }` 近似。
- `Form.Item` 的 `dependencies` 依赖 RHF `register({ deps })`，字段未挂载时不生效。
- `Form.Item` 的 `shouldUpdate` 用 `useWatch` 订阅 + 比较函数实现，属近似。

### 3.3 值绑定：控件适配表

`Form.Item` 用 `cloneElement` 把值注入子控件。按 `data-slot` 识别控件类型选择属性对：

| 识别依据                        | value 属性 | 变更属性          |
| ------------------------------- | ---------- | ----------------- |
| `data-slot="select-trigger"`    | `value`    | `onValueChange`   |
| `data-slot="switch"`            | `checked`  | `onCheckedChange` |
| `data-slot="checkbox"`          | `checked`  | `onCheckedChange` |
| `data-slot="radio-group"`       | `value`    | `onValueChange`   |
| 其余（含 `Input` / `Textarea`） | `value`    | `onChange`        |

- `valuePropName` / `trigger` 显式传入时**优先于**适配表。
- 识别不中时回退 `value` + `onChange`（antd 默认语义）。
- 适配表同时输出 `aria-invalid`、`id`、`ref`（`setFocus` 用）。
- **`aria-invalid` 的落点随控件而异**（已实测）：`Select` 需放在 `SelectTrigger` 上
  （`SelectRoot` 不透传未知属性）；`Switch` / `Checkbox` / `RadioGroup` 放根组件即可透传。

### 3.4 rules 编译

- `rules` 数组按声明顺序编译成一组校验函数，由合成 resolver 依序执行。
- `message` 支持 antd 模板变量（`${label}`、`${min}` 等）与函数形式。
- `validateFirst`：合成 resolver 内**每条错误后短路**（与 antd 一致）；
  `'parallel'` 不实现，降级为顺序并开发期告警。
- `validateDebounce` 包裹校验执行（防抖）。
- `type` 支持 `string` / `number` / `boolean` / `integer` / `float` / `url` / `email` / `date` / `array` / `object`；
  其余 antd 类型（`hex` / `regexp` / `ipv4` / `ipv6` / `json`）在 JSDoc 标注为不支持。
- `len` / `type` / `enum` / `whitespace` / `transform` 由编译出的校验函数自行实现。

**`warningOnly` 走独立通道**：RHF 只有 error 通道，warning 规则若塞进 `validate` 会阻断提交。
实现为 `Form.Item` 内独立 state + `useEffect` 跑 warning 规则，仅渲染 `--warning` 色文案，不参与 RHF 校验。

**与 `zodResolver` 的关系**：RHF 的字段级 `validate` 在存在 `resolver` 时**完全不执行**（已实测）。
因此 Form 组件在内部**合成一个 resolver**：若用户传了 `resolver`（如 `zodResolver`），先跑它取错误，
再按 `rules` 注册表补跑字段级规则，合并成一个 `errors` 对象返回。这样两者同时生效、互不干扰，
且 `rules` 顺序语义得以保留（`validateFirst` 短路在合成层内实现）。

### 3.5 其余 Form.Item 属性的落地

| 属性                                 | 落地方式                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `getValueFromEvent`                  | 覆盖适配表的默认取值器（默认取 `e.target.value`，`checked` 类控件取 `e.target.checked`）                                                |
| `normalize`                          | 编译进 RHF `register` 的 `setValueAs`（值入库前转换，`(value, prevValue, prevValues)` 的 antd 签名降级为 RHF 的 `(value)`，JSDoc 标注） |
| `initialValue`                       | Item 挂载时写入一次；Form 的 `initialValues` 优先                                                                                       |
| `validateStatus`                     | 显式传入时覆盖计算出的 status（`success` / `warning` / `error` / `validating`）                                                         |
| `help`                               | 传入时替代 `rules` 生成的错误文案渲染                                                                                                   |
| `hidden`                             | 不渲染 DOM，但仍注册并参与校验                                                                                                          |
| `noStyle`                            | 不渲染 label 与布局外壳，仅注入控件；校验状态经 `ItemContext` 向上冒泡给父级 Item（嵌套形态见 §3.1）                                    |
| `labelCol` / `wrapperCol` / `layout` | Item 级覆盖 Form 级配置                                                                                                                 |

### 3.6 布局与栅格

`Row` / `Col`（`shared/ui/layout/`）为 24 列 CSS Grid：

- `Row`：`gutter`（数字或 `[水平, 垂直]`）、`justify`、`align`、`wrap`。
- `Col`：`span`（0–24）、`offset`、`push`、`pull`、`xs`~`xxl`。
- 断点映射 Tailwind：`xs` → 无前缀、`sm`/`md`/`lg`/`xl` → 同名前缀、`xxl` → `2xl`（JSDoc 标注）。
- **类名必须走静态映射表**：`col-span-${n}` 这类动态拼接 Tailwind 扫不到，需穷举 span × 断点的字面量类名。
  映射表放 `col.jsx` 内，模块顶层常量。
- `Form` 的 `labelCol` / `wrapperCol` 解析成 `Col` 的 props（`field-layout.js`），
  `layout="horizontal"` 时按 antd 语义用 `Row` 承载 label 与控件。

## 4. API 清单（v1）

### Form

`layout`、`labelCol`、`wrapperCol`、`labelAlign`、`colon`、`name`、`initialValues`、`disabled`、
`requiredMark`、`validateTrigger`、`scrollToFirstError`、`preserve`、`form`、`onFinish`、`onFinishFailed`、
`onValuesChange`、`onFieldsChange`，以及原生 `<form>` 属性（`onSubmit` 除外）。

### Form.Item

`name`、`label`、`rules`、`required`、`help`、`extra`、`validateTrigger`、`validateFirst`、`validateDebounce`、
`valuePropName`、`trigger`、`getValueFromEvent`、`normalize`、`hidden`、`noStyle`、`initialValue`、
`dependencies`、`shouldUpdate`、`validateStatus`、`htmlFor`、`labelCol`、`wrapperCol`、`layout`。

### Form.List

`name`、`initialValue`、`rules`（仅 `{ validator, message }`）、`children(fields, operation, meta)`。

- `operation.add(defaultValue?, insertIndex?)` → RHF `insert` / `append`
- `operation.remove(index | number[])` → RHF `remove`
- `operation.move(from, to)` → RHF `swap`（antd 的 move 即交换语义，RHF 7.88 有 `swap`）

### Form.ErrorList

`errors`（`ReactNode[]`）。

### Hooks

- `Form.useForm()` → `[form]`
- `Form.useFormInstance()` → 最近的 `FormInstance`
- `Form.useWatch(namePath | selector, formInstance | { form, preserve })`
- `Form.Item.useStatus()` → `{ status, errors, warnings }`

### 明确不在 v1 范围

`Form.Provider`、`validateMessages` 模板、`hasFeedback` / `feedbackIcons`、`tooltip` / `labelWrap`、
`classNames` / `styles` 语义化结构、`component={false}`、`fields`（redux 受控）、`clearOnDestroy`、
Form 级 `size` / `variant` 透传。

理由：`validateMessages` 与 Zod 的中文错误消息体系重叠；`Form.Provider` 在单页应用里几乎用不上；
其余为罕用项，需要时再单独提。

## 5. 文件组织

```
src/shared/ui/data-entry/form/
├── index.jsx           # Form 主体 + 对外聚合导出（Form / FormInstance 类型注释）
├── context.js          # FormContext、ItemContext、ListContext
├── use-form.js         # useForm 包装 + FormInstance 适配 + useFormInstance
├── use-watch.js        # useWatch（selector 与 WatchOptions）
├── rules.js            # rules → RHF validate 编译
├── field-adapter.js    # 控件适配表 + cloneElement 注入
├── field-layout.js     # labelCol/wrapperCol → Row/Col props
├── form-item.jsx       # Form.Item
└── form-list.jsx       # Form.List

src/shared/ui/layout/row.jsx   # 新增
src/shared/ui/layout/col.jsx   # 新增
```

同步改动：

- `src/shared/ui/index.js`：补 3 行 `export *`（`./data-entry/form`、`./layout/row`、`./layout/col`）。
- `src/shared/ui/AGENTS.md`：目录表补 `form` / `row` / `col`；修正"每个组件一个 `.jsx` 文件"的表述为
  "组件一个文件；子系统可建同名目录，入口 `index.jsx`"。
- `docs/` 目录新增后，`src/shared/styles/index.css` 的 `@source not "../../../docs"` 开始生效，
  无需改动。

## 6. 风险与缓解

| 风险                                                                     | 缓解                                                                                                           |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 适配表识别不中 → 值静默收集不到                                          | 兜底 `value`+`onChange`；示例页逐个控件断言实际值                                                              |
| `col-span-${n}` 动态拼接被 Tailwind 漏扫                                 | `src/shared/styles/index.css` 用 `@source inline("{,sm:,md:,lg:,xl:,2xl:}col-span-{0..24}")` 等指令显式生成    |
| `setFieldsValue` 写未注册字段：antd 存 store，RHF 不存                   | 适配层先 `register` 再 `setValue` 再 `clearErrors` 再 `unregister(name, { keepValue: true, keepError: true })` |
| `Form.List` 内嵌套字段的 name 缺索引前缀                                 | `ListContext` 传 prefix，`Form.Item` 自动拼接                                                                  |
| `shouldUpdate` 在 RHF 上无对应原语                                       | `useWatch` 订阅全表单 + 比较函数控制重渲染，JSDoc 标注为近似                                                   |
| `dependencies` 用 RHF `deps`：字段未挂载时不生效                         | JSDoc 标注；示例页验证挂载态行为                                                                               |
| `zodResolver` 与 `rules` 无法共存（RHF 有 resolver 时不跑字段 validate） | 内部合成 resolver：先跑用户 resolver，再补跑 `rules` 注册表，合并 errors                                       |
| `scrollToFirstError` 的 `focus` 对非原生控件无效                         | 仅对原生可聚焦元素调用 `setFocus`                                                                              |
| `warningOnly` 无 error 通道                                              | 独立 state + `useEffect`，仅渲染 `--warning` 色文案，不阻断提交                                                |
| `validateFields({ validateOnly })` 语义近似                              | JSDoc 标注为近似实现                                                                                           |

## 7. 验收

1. `pnpm lint` 通过（注意：列表 `key` 无 lint 覆盖，靠 code review；不要为此引入 `eslint-plugin-react`）。
2. `pnpm build` 通过。
3. `pnpm test` 通过 —— 新增 Node 内置测试：`scripts/test-loader.mjs`（把 `@shared/*` 别名、
   省略扩展名、JSX 转换接进 `node --test`）+ `scripts/register-loader.mjs`，
   测试文件与源文件同目录（`form/*.test.jsx`），脚本为
   `node --import ./scripts/register-loader.mjs --test "src/**/*.test.jsx"`。
   纯逻辑（rules 编译、message 模板、namePath、FormInstance 适配、Col 类名映射）用
   `createFormControl` + `react-dom/server` 直接断言，不引入任何新依赖。
4. `src/app1/pages/form-demo.jsx` 示例页，覆盖矩阵：
    - 三种 `layout`（horizontal / vertical / inline）
    - `labelCol` / `wrapperCol` 含断点
    - rules 各类型：required / pattern / min / max / len / type / enum / whitespace /
      自定义 validator / 异步 validator / warningOnly
    - `Select` / `Switch` / `Checkbox` / `RadioGroup` 的值收集（验证适配表）
    - `dependencies` 联动、`shouldUpdate`
    - `Form.List` 增 / 删 / 移动，验证索引重建
    - Form 级 `zodResolver` 与字段级 `rules` 共存
    - `noStyle` 嵌套、`scrollToFirstError`
5. 用 `playwright-cli` 实跑示例页并断言 DOM：错误文案、必填星号、值回填、List 增删后的索引。
   产物落 `.playwright-cli/`，任务收尾删除；收尾复查 `git status` 无截图/日志残留。
6. 示例页保留在仓库作为用法参考。

## 8. 不做的事

- 不新建表单状态引擎（不复制 antd 的 FieldStore）。
- 不引入 `eslint-plugin-react` 或任何新依赖。
- 不改 `build/`。
- 不为栅格引入与 Tailwind 并行的第二套断点体系（`xxl` 映射到 `2xl` 并标注）。
- 不重构现有 `Field` 组件族与既有表单写法；两者并存。
