---
name: form-validation
description: 本项目表单验证规范。创建、修改 React 表单（React Hook Form + Zod + shadcn/ui base-nova Field 组件族）时使用，含推荐模式代码示例与表单约定。
---

# 表单验证规范

项目使用 **React Hook Form + Zod** 做表单验证，shadcn/ui base-nova 提供 `Field` 组件族展示字段与错误信息。

## 相关共享组件

- `/src/shared/ui/field.jsx`：表单字段组件族，包括 `Field`、`FieldLabel`、`FieldError`、`FieldDescription`、`FieldGroup` 等。
- `/src/shared/ui/label.jsx`：标签组件。
- `/src/shared/ui/dialog.jsx`：弹层组件，用于表单弹窗场景。

## 推荐模式

base-nova 不推荐使用经典 `Form` / `FormField` 包装组件，而是直接用 `useForm` + `Controller` + `Field` 组件族组合。

```jsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@shared/ui/input';
import { Button } from '@shared/ui/button';
import { Field, FieldLabel, FieldError } from '@shared/ui/field';

const schema = z.object({
    name: z.string().min(1, '名称不能为空').max(50, '名称不能超过 50 个字符'),
});

export function MyForm() {
    const form = useForm({
        resolver: zodResolver(schema),
        mode: 'onChange', // 变更时即触发验证
        defaultValues: { name: '' },
    });

    const onSubmit = form.handleSubmit((data) => {
        console.log(data);
    });

    return (
        <form onSubmit={onSubmit}>
            <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>名称</FieldLabel>
                        <Input id={field.name} {...field} aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                )}
            />
            <Button type="submit">提交</Button>
        </form>
    );
}
```

## 约定

1. `useForm` 的 `mode` 按需设为 `'onChange'`（即时反馈）或 `'onSubmit'`（提交时反馈）。
2. `Field` 上通过 `data-invalid={fieldState.invalid}` 切换错误态；控件上通过 `aria-invalid={fieldState.invalid}` 支持无障碍。
3. 错误信息统一用 `FieldError errors={[fieldState.error]}` 渲染。
4. Zod schema 建议集中定义在组件文件顶部或同目录 `schema.js` 中，错误消息统一用中文。
5. 弹层内表单：弹层关闭前通常 `form.reset(defaultValues)`，保证再次打开时数据为最新。
