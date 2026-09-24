/**
 * @file 新增用户弹窗
 * @description Dialog + 声明式 Form 的组合：字段级 rules 校验通过后调用 api.createUser，
 * 成功后提示并通知父级刷新列表。表单值由 Form 内部管理，父级只关心「是否打开」与「新增成功」。
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Form,
    Input,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from '@shared/ui';
import { createUser } from '../../api.js';
import { DEPARTMENT_OPTIONS, ROLE_OPTIONS } from '../../constants.js';

/** 表单默认值。放在模块级保证引用稳定，每次挂载都是同一份初始值。 */
const DEFAULT_VALUES = {
    name: '',
    email: '',
    phone: '',
    department: 'tech',
    role: 'viewer',
    active: true,
    remark: '',
};

/**
 * 新增用户弹窗。
 *
 * 表单实例由 Form 内部自建，不在这里 useForm：Dialog 关闭后内容会卸载，
 * 再次打开即重新挂载，表单天然回到 initialValues，无需手动 resetFields
 * （手动重置要在 effect 里做，而 Base UI 的 Portal 是二次渲染才挂载内容的，
 * 父组件的 effect 早于 Form 挂载，会读到尚未绑定的实例）。
 *
 * @param {Object} props - 组件属性。
 * @param {boolean} props.open - 是否打开。
 * @param {(open: boolean) => void} props.onOpenChange - 打开状态变化回调。
 * @param {(user: Object) => void} [props.onCreated] - 新增成功回调，入参为新用户记录。
 * @returns {JSX.Element}
 */
export default function UserFormDialog(props) {
    const { open, onOpenChange, onCreated } = props;
    const [submitting, setSubmitting] = useState(false);

    /**
     * 校验通过后提交。
     * @param {Object} values - 表单值。
     * @returns {Promise<void>}
     */
    const handleFinish = async (values) => {
        setSubmitting(true);
        try {
            const user = await createUser(values);
            toast.success(`已新增用户「${user.name}」`);
            onOpenChange(false);
            onCreated?.(user);
        } catch (error) {
            toast.error(error?.message || '新增失败，请重试');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                {/* Form 包住 Header / Footer：提交按钮在表单内，回车即可提交；
                    同时命中 DialogContent 的末元素兜底规则，底栏不会被顶起 */}
                <Form initialValues={DEFAULT_VALUES} onFinish={handleFinish} aria-label="新增用户">
                    <DialogHeader>
                        <DialogTitle>新增用户</DialogTitle>
                        <DialogDescription>填写用户基本信息，带 * 的为必填项。</DialogDescription>
                    </DialogHeader>

                    <Form.Item
                        name="name"
                        label="姓名"
                        rules={[
                            { required: true, message: '请输入姓名' },
                            { max: 20, message: '姓名不能超过 20 个字符' },
                        ]}
                    >
                        <Input placeholder="请输入姓名" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="邮箱"
                        rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '邮箱格式不正确' },
                        ]}
                    >
                        <Input placeholder="name@example.com" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="手机号"
                        rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}
                    >
                        <Input placeholder="选填，11 位手机号" />
                    </Form.Item>

                    <Form.Item
                        name="department"
                        label="部门"
                        rules={[{ required: true, message: '请选择部门' }]}
                    >
                        {/* items 让 SelectValue 能按 value 找到对应文案 */}
                        <Select items={DEPARTMENT_OPTIONS}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="请选择部门" />
                            </SelectTrigger>
                            <SelectContent>
                                {DEPARTMENT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="role"
                        label="角色"
                        rules={[{ required: true, message: '请选择角色' }]}
                    >
                        <RadioGroup>
                            <div className="flex flex-wrap gap-4">
                                {ROLE_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <RadioGroupItem value={option.value} />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </RadioGroup>
                    </Form.Item>

                    <Form.Item
                        name="active"
                        label="启用"
                        valuePropName="checked"
                        extra="停用后该账号无法登录"
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        name="remark"
                        label="备注"
                        rules={[{ max: 200, message: '备注不能超过 200 个字符' }]}
                    >
                        <Textarea rows={3} placeholder="选填，最多 200 字" />
                    </Form.Item>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={submitting}
                        >
                            取消
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? '保存中…' : '保存'}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
