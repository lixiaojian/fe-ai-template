# Form 组件

声明式表单，**API 形态对齐 Ant Design Form**，底层以 React Hook Form（RHF）为唯一状态引擎，
不引入第二套表单状态。适合字段较多、需要统一布局与错误展示的场景。

与项目既有的「`useForm` + `Controller` + `Field` 组件族」命令式写法**并存**，按场景二选一：

| 写法   | 入口                               | 适合                                             |
| ------ | ---------------------------------- | ------------------------------------------------ |
| 命令式 | `react-hook-form` + `Field` 组件族 | 字段少、需要完全控制渲染                         |
| 声明式 | 本文档的 `Form` / `Form.Item`      | 字段多、需要栅格布局、统一错误展示、动态增删字段 |

两者共用同一套错误渲染（`Form.Item` 内部复用 `FieldError` 与 `Label`），视觉一致。

---

## 目录

- [快速开始](#快速开始)
- [Form](#form)
- [Form.Item](#formitem)
- [Form.List](#formlist)
- [Form.ErrorList](#formerrorlist)
- [Hooks](#hooks)
- [FormInstance](#forminstance)
- [rules 校验规则](#rules-校验规则)
- [控件适配](#控件适配)
- [布局与栅格](#布局与栅格)
- [校验时机](#校验时机)
- [与 zodResolver 共存](#与-zodresolver-共存)
- [完整示例](#完整示例)
- [已知限制](#已知限制)
- [常见坑](#常见坑)
- [实现说明](#实现说明)
- [测试](#测试)

---

## 快速开始

```jsx
import { Form, Input, Button } from '@shared/ui';

function Demo() {
    const [form] = Form.useForm();

    return (
        <Form form={form} layout="horizontal" onFinish={(values) => console.log(values)}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                <Input />
            </Form.Item>

            <Button type="submit">提交</Button>
        </Form>
    );
}
```

三个约定：

1. `Form.Item` 的**直接子元素必须是一个控件**，`Form.Item` 会用 `cloneElement` 把受控值注入进去。
2. 提交按钮写 `type="submit"`，或调用 `form.submit()`；提交结果经 `onFinish` / `onFinishFailed` 给出。
3. `Form.Item` 必须放在 `<Form>` 内，否则运行时抛错。

---

## Form

```jsx
<Form
    form={form}
    layout="horizontal"
    labelCol={{ span: 6 }}
    wrapperCol={{ span: 18 }}
    initialValues={{ nickname: '默认值' }}
    scrollToFirstError={{ focus: true }}
    onFinish={onFinish}
    onFinishFailed={onFinishFailed}
    resolver={zodResolver(schema)}
>
    ...
</Form>
```

| 属性                 | 类型                                           | 默认值         | 说明                                                              |
| -------------------- | ---------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `form`               | `FormInstance`                                 | 内部自建       | `Form.useForm()` 的返回值；不传则 Form 内部创建一个               |
| `layout`             | `'horizontal' \| 'vertical' \| 'inline'`       | `'vertical'`   | 表单布局                                                          |
| `labelCol`           | `number \| Object`                             | `{ span: 6 }`  | 标签栅格，仅 `horizontal` 生效；数字视为 `span`                   |
| `wrapperCol`         | `number \| Object`                             | `{ span: 18 }` | 控件栅格，仅 `horizontal` 生效                                    |
| `labelAlign`         | `'left' \| 'right'`                            | `'right'`      | 标签对齐，仅 `horizontal` 生效                                    |
| `colon`              | `boolean`                                      | `true`         | 标签是否自动加冒号                                                |
| `name`               | `string`                                       | —              | 表单名，作为字段 DOM `id` 的前缀（`${name}_${field}`）            |
| `initialValues`      | `Object`                                       | —              | 表单默认值，仅在初始化与 `resetFields()` 时生效                   |
| `disabled`           | `boolean`                                      | `false`        | 禁用整个表单，会向控件注入 `disabled`                             |
| `requiredMark`       | `boolean \| 'optional' \| Function`            | `true`         | 必填标记样式，见下                                                |
| `scrollToFirstError` | `boolean \| { focus?: boolean }`               | `false`        | 提交失败时滚动到第一个错误字段；`focus: true` 时同时聚焦控件      |
| `validateTrigger`    | `string \| string[]`                           | `'onChange'`   | 字段校验触发时机的默认值，`Form.Item` 可覆盖                      |
| `resolver`           | `Function`                                     | —              | 表单级校验器，如 `zodResolver(schema)`；与字段级 `rules` 同时生效 |
| `onFinish`           | `(values) => void`                             | —              | 校验通过后的提交回调                                              |
| `onFinishFailed`     | `({ values, errorFields, outOfDate }) => void` | —              | 校验失败回调                                                      |
| `onValuesChange`     | `(changedValues, allValues) => void`           | —              | 字段值变化回调，**仅用户交互触发**                                |
| `onFieldsChange`     | `(changedFields, allFields) => void`           | —              | 字段状态变化回调，**仅用户交互触发**                              |
| `className`          | `string`                                       | —              | 额外的样式类名                                                    |

其余属性透传到原生 `<form>` 元素。

### requiredMark

```jsx
<Form requiredMark={false}>                       {/* 不显示任何标记 */}
<Form requiredMark="optional">                    {/* 必填显示 *，非必填显示「(可选)」 */}
<Form requiredMark={(label, { required }) => required ? '必填' : null}>
```

`required` 的判定：`Form.Item` 显式传了 `required` 用它，否则看 `rules` 里是否有 `required: true`。

### onValuesChange / onFieldsChange

与 antd 一致，**只有用户交互**（输入、选择、勾选）才触发；`form.setFieldsValue()` 这类程序化写值不触发。

```jsx
<Form
    onValuesChange={(changedValues, allValues) => {
        console.log('本次变化：', changedValues);
        console.log('当前全部：', allValues);
    }}
>
```

---

## Form.Item

`Form.Item` 有两种形态，由**有没有 `name`** 决定：

- **有 `name`**：注册字段、注入受控值、参与校验；
- **无 `name`**：只作布局容器（承载 `label` 或作为 `noStyle` 的父级），不注册字段。

```jsx
{
    /* 有 name：普通字段 */
}
<Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
    <Input />
</Form.Item>;

{
    /* 无 name：纯布局容器 */
}
<Form.Item label="标签列表">
    <Form.List name="items">...</Form.List>
</Form.Item>;
```

| 属性                | 类型                                                | 默认值  | 说明                                                      |
| ------------------- | --------------------------------------------------- | ------- | --------------------------------------------------------- |
| `name`              | `string \| Array`                                   | —       | 字段名，支持 `'a.b'` 与 `['a', 'b']` 两种写法             |
| `label`             | `ReactNode`                                         | —       | 标签内容                                                  |
| `rules`             | `Array<Object>`                                     | —       | 校验规则，见 [rules 校验规则](#rules-校验规则)            |
| `required`          | `boolean`                                           | —       | 强制显示必填标记（不影响校验，校验仍由 `rules` 决定）     |
| `help`              | `ReactNode`                                         | —       | 自定义提示文案，**传入时替代** `rules` 产生的错误文案     |
| `extra`             | `ReactNode`                                         | —       | 额外说明，与错误文案可并存                                |
| `validateTrigger`   | `string \| string[]`                                | Form 级 | 本字段的校验触发时机，覆盖 Form 级配置                    |
| `valuePropName`     | `string`                                            | 适配表  | 取值属性名，覆盖控件适配表（如 `'checked'`）              |
| `trigger`           | `string`                                            | 适配表  | 变更属性名，覆盖控件适配表（如 `'onCheckedChange'`）      |
| `getValueFromEvent` | `Function`                                          | —       | 从回调参数取值；不传时由 RHF 自行从事件/值中提取          |
| `normalize`         | `Function`                                          | —       | 值入库前转换，签名降级为 `(value)`（antd 是三参数）       |
| `hidden`            | `boolean`                                           | `false` | 不显示，但**仍注册并参与校验**                            |
| `noStyle`           | `boolean`                                           | `false` | 不渲染标签与布局外壳，只注入控件                          |
| `initialValue`      | `*`                                                 | —       | 字段默认值；`Form.initialValues` 已覆盖该字段时以后者为准 |
| `dependencies`      | `string[]`                                          | —       | 依赖字段，变化时自动重校验本字段                          |
| `shouldUpdate`      | `boolean`                                           | `false` | `true` 时订阅全表值，任一字段变化即重渲染本项             |
| `validateStatus`    | `'success' \| 'warning' \| 'error' \| 'validating'` | —       | 手动指定状态，覆盖自动推导                                |
| `htmlFor`           | `string`                                            | —       | label 的 `htmlFor`，缺省为字段名（带 Form `name` 前缀）   |
| `labelCol`          | `number \| Object`                                  | Form 级 | 本项的标签栅格                                            |
| `wrapperCol`        | `number \| Object`                                  | Form 级 | 本项的控件栅格                                            |
| `layout`            | `'horizontal' \| 'vertical' \| 'inline'`            | Form 级 | 本项的布局                                                |
| `className`         | `string`                                            | —       | 额外的样式类名                                            |
| `children`          | `ReactNode \| Function`                             | —       | 单个控件；`shouldUpdate` 场景下可以是渲染函数             |

### 状态推导

未显式指定 `validateStatus` 时，状态按以下优先级推导（`data-status` 属性上可观察）：

```
validating（校验中） > error（校验失败） > success（已操作且通过） > undefined（未操作过）
```

```jsx
{
    /* 手动指定状态：如服务端返回的异步校验结果 */
}
<Form.Item name="code" label="编号" validateStatus="error" help="编号已被占用">
    <Input />
</Form.Item>;
```

### hidden：隐藏但仍提交

```jsx
<Form.Item name="id" hidden initialValue={record.id}>
    <Input />
</Form.Item>
```

字段仍然注册、参与校验，`getFieldsValue()` / `onFinish` 都能拿到值。

### dependencies：字段联动

```jsx
<Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
    <Input type="password" />
</Form.Item>;

{
    /* 密码变化时，本字段自动重校验，旧的「不一致」提示会立即更新 */
}
<Form.Item
    name="passwordConfirm"
    label="确认密码"
    dependencies={['password']}
    rules={[
        {
            validator: (value, allValues) =>
                !value || value === allValues.password ? undefined : '两次输入的密码不一致',
        },
    ]}
>
    <Input type="password" />
</Form.Item>;
```

注意 `validator` 的签名是 `(value, allValues)`——本实现**不支持** antd 的「函数式 rules」
（`rules={({ getFieldValue }) => [...]}`），写成函数会被静默忽略。

### shouldUpdate：依赖字段变化时重渲染

```jsx
<Form.Item shouldUpdate>
    {() => <div>当前昵称：{form.getFieldValue('nickname') || '（空）'}</div>}
</Form.Item>
```

只支持布尔值。函数形式（比较上一次值决定是否重渲染）不实现，传函数时按 `true` 处理并开发期告警。

### 自定义控件

适配表命中不了的自研控件，用 `valuePropName` / `trigger` 显式指定：

```jsx
<Form.Item name="tags" label="标签" valuePropName="value" trigger="onTagsChange">
    <MyTagPicker />
</Form.Item>
```

---

## Form.List

动态增删字段数组，`children` 是**渲染函数**，接收 `(fields, operation, meta)`。

```jsx
<Form.Item label="联系人">
    <Form.List name="contacts" rules={[{ required: true, message: '至少保留一位联系人' }]}>
        {(fields, operation, meta) => (
            <div className="flex w-full flex-col gap-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Form.Item
                            name={`${index}.name`}
                            noStyle
                            rules={[{ required: true, message: '姓名不能为空' }]}
                        >
                            <Input placeholder="姓名" />
                        </Form.Item>
                        <Button type="button" onClick={() => operation.remove(index)}>
                            删除
                        </Button>
                    </div>
                ))}

                <Form.ErrorList errors={meta.errors} />

                <Button type="button" onClick={() => operation.add({ name: '' })}>
                    新增
                </Button>
            </div>
        )}
    </Form.List>
</Form.Item>
```

| 属性           | 类型       | 说明                                                          |
| -------------- | ---------- | ------------------------------------------------------------- |
| `name`         | `string`   | 列表字段名                                                    |
| `rules`        | `Array`    | 列表级规则，校验值是**整个数组**（如 `[{ required: true }]`） |
| `children`     | `Function` | `(fields, operation, meta) => ReactNode`                      |
| `initialValue` | —          | **不支持**，请在 `<Form initialValues>` 中为列表名提供默认值  |

### children 的三个参数

**`fields`**：RHF 的字段数组，每项含 `id`。**必须用 `field.id` 作 `key`**，不要用 `index`——
否则增删后 React 会复用错误的 DOM 节点。

**`operation`**：

| 方法                               | 说明                                   |
| ---------------------------------- | -------------------------------------- |
| `add(defaultValue?, insertIndex?)` | 新增一项，缺省追加到末尾、默认值 `{}`  |
| `remove(index \| number[])`        | 删除一项或多项                         |
| `move(from, to)`                   | 取出 `from` 插入到 `to` 位置（非交换） |

`move` 的语义与 antd 一致：`ABCD` 上 `move(0, 2)` 得 `BCAD`。没有暴露 `swap`。

**`meta`**：`{ errors: string[] }`，列表级 `rules` 产生的错误，用 `<Form.ErrorList errors={meta.errors} />` 渲染。

### 列表内字段的 name

`Form.List` 内的 `Form.Item` 会自动拼上**列表名前缀**（`ListContext`），
所以列表内的 `name` 只需要写「相对路径」：

```jsx
<Form.List name="contacts">
    {(fields, operation) =>
        fields.map((field, index) => (
            {/* 最终字段名是 contacts.0.name */}
            <Form.Item key={field.id} name={`${index}.name`}>
                <Input />
            </Form.Item>
        ))
    }
</Form.List>
```

`name={[index, 'name']}` 等价，两种写法都支持。

---

## Form.ErrorList

渲染一组错误消息，无错误时返回 `null`。

```jsx
<Form.ErrorList errors={meta.errors} />
```

| 属性        | 类型          | 说明           |
| ----------- | ------------- | -------------- |
| `errors`    | `ReactNode[]` | 错误消息列表   |
| `className` | `string`      | 额外的样式类名 |

---

## Hooks

### Form.useForm()

```jsx
const [form] = Form.useForm();
```

返回单元素数组（与 antd 一致，便于解构）。创建时实例尚未接入 RHF，
渲染 `<Form form={form}>` 时才绑定；不传 `form` 时 Form 内部自建一个。

### Form.useFormInstance()

```jsx
function SubmitButton() {
    const form = Form.useFormInstance();
    return <Button onClick={() => form.resetFields()}>重置</Button>;
}
```

取最近的 `FormInstance`，适合在深层子组件里拿到表单。

### Form.useWatch()

```jsx
const nickname = Form.useWatch('nickname'); // 单个字段
const [start, end] = Form.useWatch(['range', 'start']); // 路径数组，返回值是数组

// 显式指定实例（如监听另一个表单）
const role = Form.useWatch('role', otherForm);
```

**必须在 `<Form>` 的子树里调用**（内部要读 Form 上下文）。因此监听逻辑要写在子组件里，
不能和 `<Form>` 写在同一个组件的函数体里，否则首次渲染时上下文还不存在：

```jsx
function Parent() {
    const role = Form.useWatch('role'); // ✗ 抛错：不在 Form 内
    return <Form>{/* ... */}</Form>;
}

function Parent() {
    return (
        <Form>
            <Child /> {/* ✓ 子组件里调用 */}
        </Form>
    );
}
```

```jsx
{
    /* selector 形式：从全表值派生任意结果 */
}
const total = Form.useWatch((values) =>
    values.items?.reduce((sum, item) => sum + Number(item.price || 0), 0)
);
```

### Form.Item.useStatus()

读取当前 `Form.Item` 的校验状态，用于自定义错误展示：

```jsx
function StatusHint() {
    const { status, errors, warnings } = Form.Item.useStatus();
    if (status !== 'error') return null;
    return <span>{errors[0]}</span>;
}
```

不在 `Form.Item` 内调用时返回 `{ status: undefined, errors: [], warnings: [] }`。

---

## FormInstance

`Form.useForm()` 返回的实例，方法语义对齐 antd。

| 方法                                      | 说明                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `getFieldValue(name)`                     | 取单个字段值                                                               |
| `getFieldsValue(nameList?)`               | 取全部或指定字段的值                                                       |
| `getFieldError(name)`                     | 取字段错误，返回 `string[]`                                                |
| `getFieldsError(nameList?)`               | 批量取错误，返回 `{ name: string[], errors: string[] }[]`                  |
| `isFieldTouched(name)`                    | 字段是否被操作过                                                           |
| `isFieldsTouched(nameList?, allTouched?)` | 批量判断；`allTouched` 为 `true` 时要求全部 touched                        |
| `isFieldValidating(name)`                 | 字段是否正在校验中（见下方说明）                                           |
| `setFieldValue(name, value)`              | 写单个字段值，并清掉该字段已有错误                                         |
| `setFieldsValue(values)`                  | 批量写值，支持嵌套对象；**未挂载的字段也能写入**                           |
| `resetFields(nameList?)`                  | 重置到 `initialValues`（不传则重置整个表单）                               |
| `validateFields(nameList?, config?)`      | 手动校验；通过时 resolve 值，失败时 reject 一个带 `errorFields` 的 `Error` |
| `submit()`                                | 提交表单，等价于 antd 的 `form.submit()`                                   |
| `scrollToField(name, { focus? })`         | 滚动到字段（可选聚焦）                                                     |
| `getFieldInstance(name)`                  | **不支持**，直接抛错并提示改用 `getFieldValue`                             |
| `setFields(fields)`                       | **不支持**，直接抛错并提示改用 `setFieldsValue`                            |

`setFieldsValue` / `setFieldValue` **不触发** `onValuesChange` / `onFieldsChange`，与 antd 语义一致。

```jsx
// 回填一条记录
form.setFieldsValue({ nickname: '张三', role: 'admin' });

// 手动校验部分字段
try {
    const values = await form.validateFields(['email', 'phone']);
    console.log('通过', values);
} catch (error) {
    console.log('失败字段', error.errorFields);
}
```

`isFieldValidating` 有两个前提，缺一即**恒为 `false` 且不报错**：

1. RHF 只在 `validatingFields` 被订阅时才写入该状态（订阅由 `Form.Item` 读取 `fieldState.isValidating` 顺带建立）；
2. RHF 只对异步（`AsyncFunction`）校验器置位，同步规则再慢也不会进入 `validatingFields`。

---

## rules 校验规则

`rules` 是 antd 风格的规则数组，**按声明顺序执行，首条错误即短路**（与 antd 的 `validateFirst` 一致）。
每字段最终只保留一条错误消息。

### 支持的规则

| 规则          | 类型                 | 说明                                                                                 |
| ------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `required`    | `boolean`            | 必填。空串 / `null` / `undefined` / 空数组算空；**`0` 与 `false` 不算空**            |
| `pattern`     | `RegExp`             | 正则匹配                                                                             |
| `min` / `max` | `number`             | 数字比大小；字符串与数组比长度；**空值跳过**（需配合 `required`）                    |
| `len`         | `number`             | 长度必须精确等于                                                                     |
| `enum`        | `Array`              | 取值必须在数组内                                                                     |
| `type`        | `string`             | 类型判定，见下                                                                       |
| `whitespace`  | `boolean`            | 拒绝纯空白字符串                                                                     |
| `transform`   | `Function`           | 校验前转换值（仅本规则生效，不写回表单）                                             |
| `validator`   | `Function`           | 自定义校验，`(value, allValues) => undefined \| string \| false \| Error \| Promise` |
| `message`     | `string \| Function` | 错误文案，支持 `${label}` 等模板变量，也可传 `(value) => string`                     |
| `warningOnly` | `boolean`            | 只提示不拦截，见下                                                                   |

`type` 支持：`string` / `number` / `integer` / `float` / `boolean` / `array` / `object` / `date` / `url` / `email`。
其余 antd 类型（`hex` / `regexp` / `ipv4` / `ipv6` / `json`）不支持，遇到时开发期告警并跳过该条校验。

```jsx
<Form.Item
    name="nickname"
    label="昵称"
    rules={[
        { required: true, message: '请输入昵称' },
        { min: 3, message: '至少 ${min} 个字符' },
        { max: 10, message: '至多 ${max} 个字符' },
    ]}
>
    <Input />
</Form.Item>
```

### message 模板变量

```jsx
{ required: true, message: '${label} 不能为空' }   // label 为 Form.Item 的 label
{ min: 3, message: '至少 ${min} 个字符' }
{ len: 11, message: '长度必须为 ${len}' }
{ enum: ['a', 'b'], message: '必须是 ${enum} 之一' }
{ type: 'email', message: '${label} 不是合法的 ${type}' }
```

未提供 `message` 时使用内置默认文案（如 `'${label} 为必填项'`）。
模板引用了不存在的变量时，整体回退到默认文案，不会渲染出「至少 个字符」这种断句。

```jsx
{
    message: (value) => `「${value}」已被占用`;
} // 函数形式，接收当前值
```

### 自定义 validator

```jsx
<Form.Item
    name="username"
    label="用户名"
    rules={[
        {
            validator: async (value, allValues) => {
                if (!value) return undefined;
                const taken = await checkUsername(value);
                return taken ? '用户名已被占用' : undefined;
            },
        },
    ]}
>
    <Input />
</Form.Item>
```

返回值约定：

| 返回                          | 结果                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `undefined` / `null` / `true` | 通过                                                            |
| `string`                      | 失败，用该字符串作错误文案                                      |
| `Error`                       | 失败，取其 `message`                                            |
| `false` 或其他真值            | 失败，用规则自带的 `message`，没有则回退到「${label} 校验失败」 |
| 抛错                          | 失败，取异常的 `message`                                        |

### warningOnly：只提示不拦截

```jsx
<Form.Item
    name="password"
    label="密码"
    rules={[{ required: true, message: '请输入密码' }]}
>
    <Input type="password" />
</Form.Item>

<Form.Item
    name="passwordStrength"
    label="密码强度"
    rules={[
        {
            warningOnly: true,
            validator: (value) => (String(value).length < 8 ? '密码较短，建议加长' : undefined),
        },
    ]}
>
    <Input />
</Form.Item>
```

`warningOnly` 的规则**不进错误通道**：文案以 warning 色渲染在控件下方，字段状态不变为 error，
**不会阻断提交**。它走独立通道，与同一字段上的普通规则互不影响。

---

## 控件适配

`Form.Item` 用 `cloneElement` 把受控值注入子控件。各控件的受控属性名不同，由内置适配表处理：

| 控件                 | 取值属性  | 变更属性          | 备注                                  |
| -------------------- | --------- | ----------------- | ------------------------------------- |
| `Input` / `Textarea` | `value`   | `onChange`        | 默认绑定                              |
| `Select`             | `value`   | `onValueChange`   | `aria-invalid` 下沉到 `SelectTrigger` |
| `Switch`             | `checked` | `onCheckedChange` |                                       |
| `Checkbox`           | `checked` | `onCheckedChange` |                                       |
| `RadioGroup`         | `value`   | `onValueChange`   |                                       |
| 其他组件             | `value`   | `onChange`        | 兜底（antd 默认语义）                 |

- 显式传 `valuePropName` / `trigger` 时**优先于**适配表。
- `checked` 类控件的 `undefined` 会被归一为 `false`，其余归一为空串——否则 Base UI 的
  `Field.Control` 会把首次渲染的 `undefined` 判定为「非受控」，之后 store 里的值再变也不回填。
- 子元素**只能有一个**。传数组时取第一个并告警，传字符串等非元素时原样返回并告警。
- `Form` 的 `disabled` 只在为真值时注入，不会把控件自身写的 `disabled` 覆盖成 `false`。

```jsx
{/* Switch / Checkbox 需要 valuePropName="checked" —— 适配表已按组件引用识别，一般可省略；
    但自研控件或包装过的组件仍需显式指定 */}
<Form.Item name="enabled" label="启用" valuePropName="checked">
    <Switch />
</Form.Item>

<Form.Item name="agree" label="同意条款" valuePropName="checked">
    <Checkbox />
</Form.Item>

<Form.Item name="gender" label="性别">
    <RadioGroup>{/* ... */}</RadioGroup>
</Form.Item>

<Form.Item name="role" label="角色">
    <Select items={ROLE_ITEMS}>
        <SelectTrigger>
            <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>{/* ... */}</SelectContent>
    </Select>
</Form.Item>
```

> `SelectValue` 需要 `Select` 的 `items` 才能把 value 显示成文案，否则触发器上显示原始值——
> 这是 Base UI Select 的用法要求，与 Form 无关。

---

## 布局与栅格

### 三种布局

```jsx
<Form layout="vertical">    {/* 默认：标签在控件上方，占满一行 */}
<Form layout="horizontal">  {/* 标签在左，控件在右，用 24 列栅格分配宽度 */}
<Form layout="inline">      {/* 表单项横向排列，适合搜索栏 */}
```

`horizontal` 下默认 `labelCol={{ span: 6 }}`、`wrapperCol={{ span: 18 }}`：

```jsx
<Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
```

`Form.Item` 上可以逐项覆盖：

```jsx
<Form.Item name="remark" label="备注" labelCol={{ span: 3 }} wrapperCol={{ span: 21 }}>
```

`labelCol` / `wrapperCol` 支持断点对象，直接透传给 `Col`：

```jsx
<Form labelCol={{ xs: 24, md: 6 }} wrapperCol={{ xs: 24, md: 18 }}>
```

### Row / Col

`Row` / `Col` 是 24 列 CSS Grid 栅格，可在表单内自由使用：

```jsx
<Row gutter={8}>
    <Col span={12}>
        <Button type="submit" className="w-full">
            提交
        </Button>
    </Col>
    <Col span={12}>
        <Button type="button" className="w-full" onClick={() => form.resetFields()}>
            重置
        </Button>
    </Col>
</Row>
```

| 组件  | 属性                                                                               |
| ----- | ---------------------------------------------------------------------------------- |
| `Row` | `gutter`（数字或 `[水平, 垂直]`，px）、`justify`、`align`、`wrap`                  |
| `Col` | `span`（0–24）、`offset`、`push`、`pull`、`xs` / `sm` / `md` / `lg` / `xl` / `xxl` |

断点映射 Tailwind：`xs` → 无前缀、`sm` / `md` / `lg` / `xl` → 同名前缀、**`xxl` → `2xl`**
（antd 的 `xxl` 是 ≥1600px，Tailwind 的 `2xl` 是 ≥1536px，本实现就近映射）。

---

## 校验时机

RHF 的校验时机（`mode` / `reValidateMode`）是**表单级**的，无法逐字段配置。
因此本实现把 RHF 的自动校验整个关掉，改由 `Form.Item` 按各自的 `validateTrigger` 手动触发：

| 取值       | 行为                               |
| ---------- | ---------------------------------- |
| `onChange` | 默认。值变更后立刻校验             |
| `onBlur`   | 输入时不校验，焦点移出字段后才校验 |
| `onSubmit` | 不额外触发，仅提交时校验           |

```jsx
{/* Form 级默认：失焦才校验 */}
<Form validateTrigger="onBlur">

{/* Item 级覆盖 Form 级 */}
<Form.Item name="phone" label="手机号" validateTrigger="onChange">

{/* 数组：多个时机同时生效 */}
<Form.Item name="email" label="邮箱" validateTrigger={['onChange', 'onBlur']}>
```

`blur` 一律标记 touched（与校验时机无关）。焦点在字段内部移动（如 `RadioGroup` 各项之间）
不会触发 `onBlur` 校验。

---

## 与 zodResolver 共存

字段级 `rules` 与表单级 `resolver` **可以同时生效**：

```jsx
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.looseObject({
    email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
});

<Form resolver={zodResolver(schema)}>
    <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
        <Input />
    </Form.Item>
    <Form.Item name="nickname" label="昵称" rules={[{ min: 3, message: '至少 3 个字符' }]}>
        <Input />
    </Form.Item>
</Form>;
```

两点必须注意：

1. **用 `z.looseObject` 而不是 `z.object`。** zod 默认会剥掉 schema 之外的键，而 `onFinish`
   收到的就是 resolver 返回的 `values`——用 `z.object` 会让非 schema 字段在 `onFinish` 里消失。
2. **`onFinish` 收到的是 resolver 返回的 values**，与 RHF 原生行为一致。

> 为什么能共存：RHF 只要 `options.resolver` 存在，字段级 `validate` 就完全不执行。
> 因此 Form 内部**合成一个 resolver**——先跑用户的 resolver，再按 `rules` 注册表补跑字段级规则，
> 合并成一个 `errors` 对象。详见[实现说明](#实现说明)。

---

## 完整示例

仓库内 `src/app1/pages/form-demo.jsx` 是可运行的完整示例，覆盖
三种布局 / 各 rules 类型 / 控件适配 / `dependencies` / `Form.List` / `noStyle` /
`scrollToFirstError` / zod 与 rules 共存。开发服务器启动后访问
`http://localhost:5173/app1/form` 查看。

下面按能力分组给出最小示例。

### 1. 基础字段 + 提交

```jsx
function BasicForm() {
    const [form] = Form.useForm();

    return (
        <Form
            form={form}
            initialValues={{ nickname: '默认昵称' }}
            onFinish={(values) => console.log('提交', values)}
        >
            <Form.Item
                name="nickname"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称' }]}
            >
                <Input />
            </Form.Item>

            <Button type="submit">提交</Button>
        </Form>
    );
}
```

### 2. 横向布局 + 栅格

```jsx
<Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
    <Form.Item
        name="email"
        label="邮箱"
        rules={[{ required: true, type: 'email', message: '邮箱格式不正确' }]}
    >
        <Input />
    </Form.Item>
</Form>
```

### 3. 提交失败滚动到第一个错误并聚焦

```jsx
<Form scrollToFirstError={{ focus: true }} onFinish={onFinish}>
```

### 4. 禁用整个表单

```jsx
<Form disabled={readonly}>{/* 所有控件都会被注入 disabled */}</Form>
```

### 5. 程序化回填与重置

```jsx
function EditForm({ record }) {
    const [form] = Form.useForm();

    useEffect(() => {
        form.setFieldsValue(record); // 不触发 onValuesChange
    }, [form, record]);

    return (
        <Form form={form} initialValues={{ nickname: '' }}>
            <Form.Item name="nickname" label="昵称">
                <Input />
            </Form.Item>
            <Button type="button" onClick={() => form.resetFields()}>
                重置
            </Button>
        </Form>
    );
}
```

### 6. 监听字段值做联动

`Form.useWatch` 内部要读 Form 上下文，**必须在 `<Form>` 的子树里调用**——
所以监听逻辑要放进一个子组件，不能和 `<Form>` 写在同一个组件的函数体里：

```jsx
function LinkedForm() {
    return (
        <Form>
            <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                <Select items={ROLE_ITEMS}>{/* ... */}</Select>
            </Form.Item>

            <LevelField />
        </Form>
    );
}

/** 子组件里监听，才能拿到 Form 上下文。 */
function LevelField() {
    const role = Form.useWatch('role');

    if (role !== 'admin') {
        return null;
    }
    return (
        <Form.Item
            name="level"
            label="权限等级"
            rules={[{ required: true, message: '请选择等级' }]}
        >
            <Select items={LEVEL_ITEMS}>{/* ... */}</Select>
        </Form.Item>
    );
}
```

### 7. 动态增删（Form.List）

见 [Form.List](#formlist) 一节。

### 8. 自定义状态展示

`Form.Item.useStatus()` 读取的是**最近一层** `Form.Item` 的状态，所以要写在**自定义控件内部**
（控件渲染在该 Item 的 Provider 之内），而不是和控件并列写在 children 里：

```jsx
/** 自定义控件：内部读取所在 Form.Item 的状态。 */
function CodeInput({ value, onChange, ...rest }) {
    const { status, errors } = Form.Item.useStatus();

    return (
        <div className="flex flex-col gap-1">
            <Input value={value} onChange={onChange} {...rest} />
            <span data-status={status} className="text-sm text-(--text-3)">
                {errors[0] ?? ''}
            </span>
        </div>
    );
}

<Form.Item name="code" label="编号" rules={[{ pattern: /^\d{6}$/, message: '请输入 6 位数字' }]}>
    <CodeInput />
</Form.Item>;
```

写成并列的两个子元素（`<Input />` + `<FieldStatus />`）不行——`Form.Item` 只接受**一个**子元素。

---

## 已知限制

以下是**刻意不做**或**与 antd 有差异**的部分，写代码前请先确认。

### 未实现的 antd API

`Form.Provider`、`validateMessages`（错误文案体系与 Zod 的中文消息重叠）、
`hasFeedback` / `feedbackIcons`、`tooltip` / `labelWrap`、`classNames` / `styles` 语义化结构、
`component={false}`、`fields`（redux 受控）、`clearOnDestroy`、Form 级 `size` / `variant`、
Form 级 `preserve`、`Form.Item` 的 `validateFirst` / `validateDebounce`。

其中 `validateFirst` 的行为是**恒定的**：每字段按规则顺序执行，首条错误即短路。

### 与 antd 的语义差异

| 项                                  | 差异                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `shouldUpdate`                      | 只支持布尔；函数形式按 `true` 处理并告警                                                  |
| `noStyle` 嵌套                      | 外层 `Form.Item` **不会**显示内层字段的错误文案（见下）                                   |
| `onValuesChange` 的 `changedValues` | 嵌套路径字段（如 Form.List 内的 `items.0.value`）取不到值，建议改用第二个参数 `allValues` |
| `onFieldsChange` 的 `changedFields` | `name` 是单元素字符串数组（如 `['items.0.value']`），不是拆分后的完整路径                 |
| `validateFields({ validateOnly })`  | 近似实现（RHF 无「只校验不显示错误」，用 `shouldFocus: false` 近似）                      |
| `normalize`                         | 签名降级为 `(value)`，antd 的 `(value, prevValue, prevValues)` 不提供                     |
| `Form.List` 的 `initialValue`       | 不支持，请在 `<Form initialValues>` 中提供                                                |
| `Form.List` 的 `operation`          | 只有 `add` / `remove` / `move`，没有 `swap` / `insert`                                    |
| `xxl` 断点                          | 映射到 Tailwind 的 `2xl`（1536px），不是 antd 的 1600px                                   |

**关于 `noStyle` 嵌套**：当前实现里内层字段的校验状态**不会冒泡**给外层 `Form.Item`，
因此下面这种写法虽然能布局、能校验（提交会被拦截、控件会变红），
但**外层不会渲染错误文案**：

```jsx
{
    /* 错误文案不会显示 —— 目前不推荐 */
}
<Form.Item label="联系方式" required>
    <Form.Item name="contact" noStyle rules={[{ required: true, message: '请输入联系方式' }]}>
        <Input />
    </Form.Item>
</Form.Item>;
```

需要「外层管标签、内层管校验」时，改用普通写法（字段自己带 `label`），
或在外层用 `Form.Item.useStatus()` 自行渲染错误。

### 其他注意

- **不要给 `<Form>` 传 `onSubmit`**：它会覆盖内部的提交处理，导致校验被整体跳过。
  用 `onFinish` / `onFinishFailed` 接收结果。
- `FormInstance` 的 `getFieldInstance` / `setFields` 会直接抛错，不是静默失败。

---

## 常见坑

1. **`Form.Item` 只能有一个子元素。** 需要多个控件时用 `noStyle` 或包一层 `div`。
2. **`min` / `max` / `len` 对空值跳过**，只写 `{ min: 3 }` 时，空串也能通过——需要配 `required`。
3. **`required` 的「空」不含 `0` 和 `false`**，数字 `0` 和布尔 `false` 视为有值（与 antd 一致）。
4. **`Form.List` 内的字段名要自己拼索引**（`${index}.name`），列表名前缀由 `Form.List` 自动加。
5. **`Form.List` 的 `key` 用 `field.id`**，不要用 `index`。
6. **`zodResolver` 用 `z.looseObject`**，否则非 schema 字段会在 `onFinish` 里消失。
7. **函数式 `rules` 不支持**，`rules={({ getFieldValue }) => [...]}` 会被静默忽略，改用 `dependencies` + `validator`。
8. **`Form.useWatch` 必须在 `<Form>` 内调用**，否则抛错。
9. **`warningOnly` 不阻断提交**，别拿它做必填校验。

---

## 实现说明

给维护者：几个关键设计点，改代码前先读。

### 合成 resolver

RHF 只要 `options.resolver` 存在，字段级 `validate` 就**完全不执行**。
所以 Form 内部合成一个 resolver（`use-form.js` 的 `composeResolver`）：先跑用户 resolver 取错误，
再按 `Form` 实例持有的 `rules` 注册表补跑字段级规则，合并成一个 `errors` 对象返回。

两个必须守住的点：

- 字段规则一律针对**原始输入值**校验，不能用用户 resolver 返回的 `values`——
  `zodResolver` 校验失败时返回的 `values` 是空对象，拿它取字段值会全部取到 `undefined`，
  导致所有 `required` 规则误报「必填」。
- `FormInstance` 自己持有 `rules` 注册表与已挂载字段集合，由 `Form` 在渲染期通过 `_bind(rhf)` 接入。
  反过来由 `Form` 内部另建 RHF 的话，`<Form form={form}>` 会让注入的 resolver 与字段 rules 全部失效。

### 文件职责

| 文件               | 职责                                                         |
| ------------------ | ------------------------------------------------------------ |
| `index.jsx`        | `Form` 主体 + 对外聚合导出                                   |
| `form-item.jsx`    | `Form.Item`（`FieldItem` / `PlainItem` 两分支）              |
| `form-list.jsx`    | `Form.List`、`Form.ErrorList`                                |
| `use-form.js`      | `useForm` / `FormInstance` 适配 / 合成 resolver / `useWatch` |
| `rules.js`         | `rules` 数组 → 校验函数数组                                  |
| `field-adapter.js` | 控件适配表 + `cloneElement` 注入                             |
| `field-layout.js`  | `labelCol` / `wrapperCol` → `Row` / `Col` 的 props           |
| `context.js`       | `FormContext` / `ItemContext` / `ListContext`（不对外导出）  |

`Form.Item` 拆成 `FieldItem` / `PlainItem` 是有意为之：`useController` 的 `name` 不能为 `undefined`，
所以「有 name」与「无 name」必须在组件边界上分流，而不是在同一个组件里条件调用 hooks。

### 调试选择器

| 属性                            | 落点                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `data-slot="form"`              | `<form>` 元素                                               |
| `data-layout`                   | `<form>` 元素，值为 `layout`                                |
| `data-disabled`                 | `<form>` 元素，`disabled` 为真时存在                        |
| `data-slot="form-item"`         | 每个 `Form.Item` 外壳                                       |
| `data-field-name`               | 字段的完整路径（含 Form.List 索引），`scrollToField` 依赖它 |
| `data-invalid`                  | 字段处于错误态时存在                                        |
| `data-status`                   | 推导或显式指定的状态                                        |
| `data-slot="form-item-control"` | 控件区（错误文案所在容器）                                  |

---

## 测试

```bash
pnpm test    # node --import ./scripts/register-loader.mjs --test "src/**/*.test.{js,jsx}"
```

本目录的测试在 `__tests__/` 下，按文件职责拆分：

| 文件                     | 覆盖内容                                              |
| ------------------------ | ----------------------------------------------------- |
| `rules.test.jsx`         | 各规则类型、message 模板、短路语义、空值边界          |
| `use-form.test.jsx`      | 合成 resolver、`FormInstance` 各方法、namePath        |
| `field-adapter.test.jsx` | 各控件的绑定与注入、value 归一、告警分支              |
| `field-layout.test.jsx`  | `labelCol` / `wrapperCol` 归一                        |
| `form.test.jsx`          | `isUserEvent`、`firstErrorPath`、`requiredMark`、渲染 |
| `form-item.test.jsx`     | 状态推导与显式覆盖                                    |
| `form-list.test.jsx`     | `operation` 的语义（尤其 `move` 必须是「取出插入」）  |

组件渲染断言用 `react-dom/server` 的 `renderToStaticMarkup`；需要交互行为的场景用
`playwright-cli` 在示例页上验证。
