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

### 3.2 FormInstance 映射

`FormInstance` 是 RHF 方法的适配层，不持有独立状态：

| antd FormInstance                         | 落到 RHF                                | 说明                                  |
| ----------------------------------------- | --------------------------------------- | ------------------------------------- |
| `getFieldValue(name)`                     | `getValues(name)`                       |                                       |
| `getFieldsValue(nameList?, filterFunc?)`  | `getValues(nameList)`                   | 传 `true` 返回 store 全部值           |
| `getFieldError(name)`                     | `formState.errors` 经 namePath 取值     | 返回 `string[]`                       |
| `getFieldsError(nameList?)`               | 同上，批量                              | 返回 `{ name, errors }[]`             |
| `isFieldTouched(name)`                    | `formState.touchedFields`               |                                       |
| `isFieldsTouched(nameList?, allTouched?)` | 同上                                    |                                       |
| `isFieldValidating(name)`                 | `formState.validatingFields`            |                                       |
| `setFieldValue(name, value)`              | `setValue`                              |                                       |
| `setFieldsValue(values)`                  | `register` → `setValues` → `unregister` | 见 §6 风险 3                          |
| `resetFields(fields?)`                    | `reset` / `resetField`                  | 重置到 `initialValues`                |
| `validateFields(nameList?, config?)`      | `trigger`                               | `validateOnly` 为近似实现，JSDoc 标注 |
| `submit()`                                | `requestSubmit()`                       |                                       |
| `scrollToField(name, options)`            | 查 `[data-field-name]` + `setFocus`     |                                       |
| `getFieldInstance(name)`                  | 不支持                                  | 直接抛错并提示用 `getFieldValue`      |
| `setFields(fields)`                       | 不支持                                  | 抛错，提示用 `setFieldsValue`         |

**刻意对齐的语义**：`setFieldsValue` / `setFieldValue` 不触发 `onValuesChange` / `onFieldsChange`
（与 antd 一致，仅用户交互触发）。

**刻意标注为近似的实现**：

- `validateFields({ validateOnly: true })`：RHF 无"只校验不显示错误"，用 `{ shouldFocus: false }` 近似。
- `Form.Item` 的 `dependencies` 依赖 RHF `register({ deps })`，字段未挂载时不生效。
- `Form.Item` 的 `shouldUpdate` 用 `useWatch` 订阅 + 比较函数实现，属近似。

### 3.3 值绑定：控件适配表

`Form.Item` 用 `cloneElement` 把值注入子控件。按 `data-slot` 识别控件类型选择属性对：

| 识别依据                                       | value 属性 | 变更属性          |
| ---------------------------------------------- | ---------- | ----------------- |
| `data-slot="select-trigger"`                   | `value`    | `onValueChange`   |
| `data-slot="switch"`                           | `checked`  | `onCheckedChange` |
| `data-slot="checkbox"`                         | `checked`  | `onCheckedChange` |
| 其余（含 `Input` / `Textarea` / `RadioGroup`） | `value`    | `onChange`        |

- `valuePropName` / `trigger` 显式传入时**优先于**适配表。
- 识别不中时回退 `value` + `onChange`（antd 默认语义）。
- 适配表同时输出 `aria-invalid`、`id`、`ref`（`setFocus` 用）。

### 3.4 rules 编译

`rules` 数组按声明顺序编译成 RHF 的 `validate` 数组（RHF 支持 `validate` 为函数数组，按序执行并收集全部错误）。

支持字段：`required`、`pattern`、`min`、`max`、`minLength`、`maxLength`、`type`、`enum`、`len`、`whitespace`、
`validator`、`transform`、`message`、`warningOnly`。

- `message` 支持 antd 模板变量（`${label}`、`${min}` 等）与函数形式。
- `validateFirst` 为 `true` 时短路（RHF `criteriaMode: 'firstError'` + 顺序执行）；`'parallel'` 不实现，降级为顺序并告警。
- `validateDebounce` 包裹校验执行（防抖）。
- `type` 支持 `string` / `number` / `boolean` / `integer` / `float` / `url` / `email` / `date` / `array` / `object`；
  其余 antd 类型（`hex` / `regexp` / `ipv4` / `ipv6` / `json`）在 JSDoc 标注为不支持。
- `len` / `type` / `enum` / `whitespace` / `transform` 不在 RHF `RegisterOptions` 里，由编译出的 `validate` 函数实现。

**`warningOnly` 走独立通道**：RHF 只有 error 通道，warning 规则若塞进 `validate` 会阻断提交。
实现为 `Form.Item` 内独立 state + `useEffect` 跑 warning 规则，仅渲染 `--warning` 色文案，不参与 RHF 校验。

**与 `zodResolver` 的关系**：resolver 先跑，通过后才跑 `rules`；两者同时生效、互不干扰。
错误显示优先级：resolver 错误（若存在）覆盖 `rules` 错误。

### 3.5 其余 Form.Item 属性的落地

| 属性                                 | 落地方式                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `getValueFromEvent`                  | 覆盖适配表的默认取值器（默认取 `e.target.value`，`checked` 类控件取 `e.target.checked`）                                                |
| `normalize`                          | 编译进 RHF `register` 的 `setValueAs`（值入库前转换，`(value, prevValue, prevValues)` 的 antd 签名降级为 RHF 的 `(value)`，JSDoc 标注） |
| `initialValue`                       | `useEffect` 在字段值为 `undefined` 时写入一次；Form 的 `initialValues` 优先                                                             |
| `validateStatus`                     | 显式传入时覆盖计算出的 status（`success` / `warning` / `error` / `validating`）                                                         |
| `help`                               | 传入时替代 `rules` 生成的错误文案渲染                                                                                                   |
| `hidden`                             | 不渲染 DOM，但仍注册并参与校验                                                                                                          |
| `noStyle`                            | 不渲染 label 与布局外壳，仅注入控件；校验状态经 `ItemContext` 向上冒泡给父级 Item                                                       |
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

| 风险                                                   | 缓解                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| 适配表识别不中 → 值静默收集不到                        | 兜底 `value`+`onChange`；示例页逐个控件断言实际值                |
| `col-span-${n}` 动态拼接被 Tailwind 漏扫               | 静态映射表穷举 span × 断点字面量                                 |
| `setFieldsValue` 写未注册字段：antd 存 store，RHF 不存 | 适配层先 `register` 再 `setValues` 再 `unregister`，保留值与错误 |
| `Form.List` 内嵌套字段的 name 缺索引前缀               | `ListContext` 传 prefix，`Form.Item` 自动拼接                    |
| `shouldUpdate` 在 RHF 上无对应原语                     | `useWatch` 订阅全表单 + 比较函数控制重渲染，JSDoc 标注为近似     |
| `dependencies` 用 RHF `deps`：字段未挂载时不生效       | JSDoc 标注；示例页验证挂载态行为                                 |
| `zodResolver` 与 `rules` 的错误顺序                    | resolver 先跑，通过后才跑 `rules`；JSDoc 标注优先级              |
| `scrollToFirstError` 的 `focus` 对非原生控件无效       | 仅对原生可聚焦元素调用 `setFocus`                                |
| `warningOnly` 无 error 通道                            | 独立 state + `useEffect`，仅渲染 `--warning` 色文案，不阻断提交  |
| `validateFields({ validateOnly })` 语义近似            | JSDoc 标注为近似实现                                             |

## 7. 验收

1. `pnpm lint` 通过（注意：列表 `key` 无 lint 覆盖，靠 code review；不要为此引入 `eslint-plugin-react`）。
2. `pnpm build` 通过。
3. `src/app1/pages/form-demo.jsx` 示例页，覆盖矩阵：
    - 三种 `layout`（horizontal / vertical / inline）
    - `labelCol` / `wrapperCol` 含断点
    - rules 各类型：required / pattern / min / max / len / type / enum / whitespace /
      自定义 validator / 异步 validator / warningOnly
    - `Select` / `Switch` / `Checkbox` / `RadioGroup` 的值收集（验证适配表）
    - `dependencies` 联动、`shouldUpdate`
    - `Form.List` 增 / 删 / 移动，验证索引重建
    - Form 级 `zodResolver` 与字段级 `rules` 共存
    - `noStyle` 嵌套、`scrollToFirstError`
4. 用 `playwright-cli` 实跑示例页并断言 DOM：错误文案、必填星号、值回填、List 增删后的索引。
   产物落 `.playwright-cli/`，任务收尾删除；收尾复查 `git status` 无截图/日志残留。
5. 示例页保留在仓库作为用法参考。

## 8. 不做的事

- 不新建表单状态引擎（不复制 antd 的 FieldStore）。
- 不引入 `eslint-plugin-react` 或任何新依赖。
- 不改 `build/`。
- 不为栅格引入与 Tailwind 并行的第二套断点体系（`xxl` 映射到 `2xl` 并标注）。
- 不重构现有 `Field` 组件族与既有表单写法；两者并存。
