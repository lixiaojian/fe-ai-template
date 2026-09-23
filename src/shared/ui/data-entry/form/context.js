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
