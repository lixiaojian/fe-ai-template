/**
 * @file Form 组件示例页
 * @description 覆盖 layout / labelCol / rules 各类型 / 控件适配 / dependencies /
 * Form.List（含列表级 rules）/ zodResolver 与 rules 共存 / noStyle / scrollToFirstError 的用法演示。
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
 * 角色选项。同时作为 Select 的 items：SelectValue 需要它才能把 value 显示成文案，
 * 否则触发器上显示的是原始值。
 */
const ROLE_ITEMS = [
    { value: 'admin', label: '管理员' },
    { value: 'user', label: '普通用户' },
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

                {/* dependencies：email 变化时自动重校验本字段，
                    因此改完邮箱后「确认邮箱」的旧错误会立即更新。
                    validator 用 (value, allValues) 签名取值，不用 antd 的
                    函数式 rules（本实现不支持，会被静默忽略）。 */}
                <Form.Item
                    name="emailConfirm"
                    label="确认邮箱"
                    dependencies={['email']}
                    rules={[
                        {
                            validator: (value, allValues) =>
                                !value || value === allValues.email
                                    ? undefined
                                    : '两次输入的邮箱不一致',
                        },
                    ]}
                >
                    <Input data-testid="email-confirm" />
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
                    <Select items={ROLE_ITEMS}>
                        <SelectTrigger>
                            <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLE_ITEMS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
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

                {/* Form.List：动态增删，列表级 rules 校验整个数组 */}
                <Form.Item label="标签列表">
                    <Form.List
                        name="items"
                        rules={[{ required: true, message: '至少保留一个标签' }]}
                    >
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
