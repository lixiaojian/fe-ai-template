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
