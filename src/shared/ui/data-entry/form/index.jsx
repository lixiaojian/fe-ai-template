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
import { FormItem, renderRequiredMark, useItemStatus } from '@shared/ui/data-entry/form/form-item';
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
 * 取错误对象里第一个叶子字段的路径。
 *
 * RHF 的 errors 按字段路径嵌套，Object.keys 拿到的是顶层键：Form.List 的字段第一层
 * 只有列表名（items），而 DOM 上的 data-field-name 是完整路径（items.0.value），
 * 直接用顶层键会定位不到元素。这里下钻到第一个带 message / type 的叶子。
 *
 * @param {Object} errors - RHF 的 errors 对象。
 * @returns {string|undefined} 点号路径；无错误时返回 undefined。
 */
function firstErrorPath(errors) {
    const walk = (node, prefix) => {
        for (const [key, child] of Object.entries(node ?? {})) {
            const path = prefix ? `${prefix}.${key}` : key;
            if (child && (child.message || child.type)) {
                return path;
            }
            const nested = walk(child, path);
            if (nested) {
                return nested;
            }
        }
        return undefined;
    };

    return walk(errors, '');
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
    form._bindSubmit(() => {
        if (!formElement) {
            return;
        }
        try {
            formElement.requestSubmit();
        } catch {
            // 表单没有提交按钮时 requestSubmit() 会抛 TypeError（HTML 规范要求 submitter 是提交按钮），
            // 此时派发一个可取消的 submit 事件，React 的 onSubmit 同样会收到。
            formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    });

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
                const first = firstErrorPath(errors);
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
    firstErrorPath,
    renderRequiredMark,
};
