/**
 * @file 数组字段（Form.List）与错误列表（Form.ErrorList）
 * @description 基于 RHF 的 useFieldArray 实现 antd 的 Form.List。children 为渲染函数，
 * 接收 (fields, operation, meta)。List 内的 Form.Item 会自动拼上索引前缀。
 *
 * 列表级 rules 不走 useFieldArray 的 rules：RHF 只要 options.resolver 存在就不再执行
 * 字段级 validate（已实测），而本组件始终注入合成 resolver。因此改为登记进 Form 的
 * rules 注册表，与 Form.Item 共用同一条校验链路。
 */

import { useEffect, useMemo } from 'react';
import { useFieldArray, useFormState } from 'react-hook-form';
import { cn } from 'cn';
import { ListContext, useFormContext } from '@shared/ui/data-entry/form/context';
import { getValueByPath, toErrorMessages } from '@shared/ui/data-entry/form/use-form';

/**
 * 把 RHF 的 fieldArray 方法包装成 antd 的 operation 形状。
 * @param {Object} fieldArray - RHF useFieldArray 的返回值。
 * @param {Function} [onActioned] - 每次增删移之后调用，用于触发列表级校验。
 * @returns {{add: Function, remove: Function, move: Function}} antd 形状的操作对象。
 */
function createListOperations(fieldArray, onActioned) {
    const run = (action) => {
        action();
        onActioned?.();
    };

    return {
        /**
         * 新增一项。
         * @param {*} [defaultValue] - 新项的默认值，缺省为空对象。
         * @param {number} [insertIndex] - 插入位置，缺省追加到末尾。
         */
        add: (defaultValue, insertIndex) => {
            const value = defaultValue === undefined ? {} : defaultValue;
            run(() =>
                insertIndex === undefined
                    ? fieldArray.append(value)
                    : fieldArray.insert(insertIndex, value)
            );
        },
        /** 删除一项或多项。 */
        remove: (index) => run(() => fieldArray.remove(index)),
        // 用 move 而非 swap：antd 的 move 是"取出并插入到目标位置"，
        // swap 只交换两项，实测 move(0,2) 于 ABCD 上 rc-field-form 与 RHF 均得 BCAD，swap 得 CBAD。
        move: (from, to) => run(() => fieldArray.move(from, to)),
    };
}

/**
 * Form.List 组件。
 * @param {Object} props - 组件属性。
 * @param {string} props.name - 列表字段名。
 * @param {Array<Object>} [props.rules] - 列表级规则，与 Form.Item 的 rules 同构，
 *   校验值是整个数组（如 `[{ required: true, message: '至少一项' }]`）。
 * @param {Array} [props.initialValue] - 不支持，列表默认值请在 `<Form initialValues>` 中给出；
 *   传入时开发期告警。
 * @param {Function} props.children - 渲染函数 `(fields, operation, meta) => ReactNode`。
 * @returns {JSX.Element}
 */
function FormList(props) {
    const { name, rules, initialValue, children } = props;
    const formContext = useFormContext();
    const form = formContext.form;
    const control = form._rhf.control;
    const hasRules = Array.isArray(rules) && rules.length > 0;

    const fieldArray = useFieldArray({ control, name });

    // 列表级规则登记进 Form 的注册表，由合成 resolver 统一执行
    useEffect(() => {
        if (!hasRules) {
            return undefined;
        }
        form._registry.set(name, { rules, label: name });
        return () => {
            form._registry.delete(name);
        };
    }, [form, name, rules, hasRules]);

    useEffect(() => {
        if (initialValue !== undefined) {
            console.warn(
                `[Form] Form.List 不支持 initialValue，请在 <Form initialValues> 中为「${name}」提供默认值。`
            );
        }
    }, [initialValue, name]);

    // 增删移之后重新校验列表：RHF 的 mode 为 onSubmit，不会自动触发。
    // 注意 trigger 挂在 RHF 实例上，control 上没有这个方法。
    const operations = useMemo(
        () =>
            createListOperations(fieldArray, hasRules ? () => form._rhf.trigger(name) : undefined),
        [fieldArray, hasRules, form, name]
    );

    // 列表自身的错误（如"至少一项"）由 rules 产生。必须订阅而不能直接读 _formState：
    // RHF 的错误对象是就地变更的，读渲染期快照只会停在首次渲染那一刻。
    const { errors: formErrors } = useFormState({ control, name });
    const meta = useMemo(() => {
        const error = getValueByPath(formErrors, name);
        // 按字段触发校验时，RHF 会把字段数组的根错误挂在数组的 root 属性上
        return { errors: toErrorMessages(Array.isArray(error) ? error.root : error) };
    }, [formErrors, name]);

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
