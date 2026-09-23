/**
 * @file useForm 包装与 FormInstance 适配
 * @description 以 React Hook Form 为唯一状态引擎，对外暴露 antd 形状的 FormInstance。
 * 关键点是「合成 resolver」：RHF 只要 options.resolver 存在，字段级 validate 就完全不执行
 * （已实测），因此 Form 把用户 resolver 与字段 rules 合并成一个 resolver 注入。
 */

import { useMemo, useState } from 'react';
import { useForm as useRhfForm, useWatch as useRhfWatch } from 'react-hook-form';
import { compileRules } from '@shared/ui/data-entry/form/rules';
import { useFormContext } from '@shared/ui/data-entry/form/context';

/** 可聚焦元素选择器，供 scrollToField 定位控件本体。 */
const FOCUSABLE_SELECTOR = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/**
 * 按点号路径取值。
 * @param {Object} values - 值对象。
 * @param {string} path - 点号路径，如 `a.b` 或 `list.0.x`。
 * @returns {*} 取到的值；路径不存在时返回 undefined。
 */
function getValueByPath(values, path) {
    if (values === undefined || values === null || !path) {
        return undefined;
    }
    return String(path)
        .split('.')
        .reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), values);
}

/**
 * 按点号路径赋值（不可变，返回新对象）。
 * @param {Object} source - 原对象。
 * @param {string} path - 点号路径。
 * @param {*} value - 待写入的值。
 * @returns {Object} 新对象。
 */
function setValueByPath(source, path, value) {
    const keys = String(path).split('.');
    const root = source === undefined || source === null ? {} : { ...source };
    let cursor = root;

    for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        const next = cursor[key];
        cursor[key] = next === undefined || next === null ? {} : { ...next };
        cursor = cursor[key];
    }

    cursor[keys[keys.length - 1]] = value;
    return root;
}

/**
 * 把字段 rules 注册表编成一个「名字 → 校验函数数组」的快照。
 * 每次校验都重新编译，保证 Form.Item 后注册的规则也能生效。
 * @param {Map<string, {rules: Array, label?: string}>} registry - 注册表。
 * @returns {Map<string, Array<Function>>} 编译后的校验函数。
 */
function compileRegistry(registry) {
    const compiled = new Map();
    for (const [name, entry] of registry) {
        const validators = compileRules(entry.rules, { label: entry.label });
        if (validators.length > 0) {
            compiled.set(name, validators);
        }
    }
    return compiled;
}

/**
 * 合成 resolver：先跑用户 resolver，再补跑字段级 rules，合并成一个 errors 对象。
 * @param {Function|null} userResolver - 用户传入的 resolver（如 zodResolver）。
 * @param {Map<string, {rules: Array, label?: string}>} registry - 字段 rules 注册表。
 * @returns {Function} RHF 可用的 resolver。
 */
function composeResolver(userResolver, registry) {
    return async (values, context, options) => {
        let errors = {};
        let resolvedValues = values;

        if (userResolver) {
            const result = await userResolver(values, context, options);
            errors = result?.errors ? { ...result.errors } : {};
            if (result?.values) {
                resolvedValues = result.values;
            }
        }

        const compiled = compileRegistry(registry);
        const names = options?.names;

        for (const [name, validators] of compiled) {
            if (Array.isArray(names) && names.length > 0 && !names.includes(name)) {
                continue;
            }

            // 字段规则一律针对**原始输入值**校验，不用用户 resolver 返回的 values：
            // zodResolver 校验失败时返回的 values 是空对象，拿它取字段值会全部取到
            // undefined，导致所有 required 规则误报「必填」。
            const value = getValueByPath(values, name);

            for (const validate of validators) {
                // 逐条执行，首条错误即短路（antd 的 validateFirst 语义）
                const message = await validate(value, values);
                if (message) {
                    errors = setValueByPath(errors, name, { type: 'validate', message });
                    break;
                }
            }
        }

        return { values: resolvedValues, errors };
    };
}

/**
 * 把 RHF 的错误对象转成 antd 的 string[] 形状。
 * @param {Object|undefined} error - RHF 的字段错误。
 * @returns {string[]} 错误消息数组。
 */
function toErrorMessages(error) {
    if (!error) {
        return [];
    }
    if (Array.isArray(error)) {
        return error.flatMap((item) => toErrorMessages(item));
    }
    if (error.types) {
        return Object.values(error.types).filter(Boolean);
    }
    return error.message ? [error.message] : [];
}

/**
 * 构造 antd 形状的 FormInstance。
 *
 * 实例自己持有 rules 注册表、已挂载字段集合与底层 RHF 引用，后两者由 Form 通过
 * `_bind` / `_bindSubmit` 注入。这样实例在 useForm() 时即可创建，等真正渲染
 * `<Form>` 时再接到 RHF 上。若反过来由 Form 内部另建 RHF，传了外部实例的
 * `<Form form={form}>` 就会让注入的 resolver 与字段 rules 全部失效
 * （实测：表单级 zod 校验被整体跳过，非法值照样提交成功）。
 *
 * @returns {Object} 尚未绑定 RHF 的 FormInstance。
 */
function createFormInstance() {
    const registry = new Map();
    const mountedFields = new Set();
    let rhf = null;
    let submitHandler = null;

    /** 取底层 RHF；未绑定即调用说明用法有误，直接抛错而不是静默失败。 */
    const requireRhf = () => {
        if (!rhf) {
            throw new Error(
                'FormInstance 尚未绑定到 <Form>，请把 useForm() 的返回值传给 <Form form={...}>。'
            );
        }
        return rhf;
    };

    /** 写值：已挂载直接 setValue，未挂载走 register → setValue → clearErrors → unregister 往返。 */
    const writeValue = (name, value) => {
        const control = requireRhf();
        if (mountedFields.has(name)) {
            control.clearErrors(name);
            control.setValue(name, value, { shouldDirty: false, shouldTouch: false });
            return;
        }

        control.register(name);
        control.setValue(name, value, { shouldDirty: false, shouldTouch: false });
        control.clearErrors(name);
        // keepValue / keepError 缺一不可：前者保留刚写入的值，后者保留刚清过的错误状态
        control.unregister(name, { keepValue: true, keepError: true });
    };

    const instance = {
        getFieldValue: (name) => requireRhf().getValues(name),
        getFieldsValue: (nameList) =>
            nameList === undefined ? requireRhf().getValues() : requireRhf().getValues(nameList),

        getFieldError: (name) =>
            toErrorMessages(getValueByPath(requireRhf().control._formState.errors, name)),
        getFieldsError: (nameList) => {
            const errors = requireRhf().control._formState.errors;
            const names = nameList ?? Object.keys(requireRhf().getValues());
            return names.map((name) => ({
                name,
                errors: toErrorMessages(getValueByPath(errors, name)),
            }));
        },

        isFieldTouched: (name) =>
            Boolean(getValueByPath(requireRhf().control._formState.touchedFields, name)),
        isFieldsTouched: (nameList, allTouched) => {
            const touchedFields = requireRhf().control._formState.touchedFields;
            const names = nameList ?? Object.keys(requireRhf().getValues());
            const touched = names.map((name) => Boolean(getValueByPath(touchedFields, name)));
            return allTouched ? touched.every(Boolean) : touched.some(Boolean);
        },
        isFieldValidating: (name) =>
            Boolean(getValueByPath(requireRhf().control._formState.validatingFields, name)),

        setFieldValue: (name, value) => writeValue(name, value),
        setFieldsValue: (values) => {
            for (const [name, value] of Object.entries(values ?? {})) {
                // 对象值需要展开成具体路径逐个写，否则未挂载的嵌套字段会整体覆盖
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const flatten = (prefix, node) => {
                        for (const [key, child] of Object.entries(node)) {
                            const path = `${prefix}.${key}`;
                            if (
                                child !== null &&
                                typeof child === 'object' &&
                                !Array.isArray(child)
                            ) {
                                flatten(path, child);
                            } else {
                                writeValue(path, child);
                            }
                        }
                    };
                    flatten(name, value);
                } else {
                    writeValue(name, value);
                }
            }
        },

        resetFields: (nameList) => {
            const control = requireRhf();
            if (nameList === undefined) {
                control.reset();
                return;
            }
            for (const name of Array.isArray(nameList) ? nameList : [nameList]) {
                control.resetField(name);
            }
        },

        validateFields: async (nameList, config = {}) => {
            const control = requireRhf();
            const names =
                nameList === undefined
                    ? undefined
                    : Array.isArray(nameList)
                      ? nameList
                      : [nameList];
            const passed = await control.trigger(names, { shouldFocus: !config.validateOnly });

            if (passed) {
                return names === undefined ? control.getValues() : control.getValues(names);
            }

            const errors = control.control._formState.errors;
            const errorFields = Object.keys(control.getValues())
                .map((name) => ({
                    name: name.split('.'),
                    errors: toErrorMessages(getValueByPath(errors, name)),
                }))
                .filter((item) => item.errors.length > 0);

            const error = new Error('表单校验失败');
            error.errorFields = errorFields;
            error.values = control.getValues();
            throw error;
        },

        submit: () => submitHandler?.(),

        scrollToField: (name, options = {}) => {
            const element = document.querySelector(`[data-field-name="${name}"]`);
            if (!element) {
                return;
            }
            element.scrollIntoView({ block: 'center', behavior: 'smooth' });

            if (options.focus) {
                // 用 DOM 查询聚焦，而不是 RHF 的 setFocus：适配表没有把 ref 注入控件，
                // 且 Select / Switch / Checkbox 的可聚焦节点不是根元素，DOM 查询更可靠。
                const focusable = element.matches(FOCUSABLE_SELECTOR)
                    ? element
                    : element.querySelector(FOCUSABLE_SELECTOR);
                focusable?.focus?.();
            }
        },

        getFieldInstance: () => {
            throw new Error('Form 不支持 getFieldInstance，请改用 getFieldValue。');
        },
        setFields: () => {
            throw new Error('Form 不支持 setFields，请改用 setFieldsValue。');
        },

        /** 字段 rules 注册表，Form.Item 挂载时写入、卸载时移除。 */
        _registry: registry,
        /** 已挂载字段名集合，供 setFieldsValue 判断是否需要 register 往返。 */
        _mountedFields: mountedFields,
        /** 绑定底层 RHF。由 Form 在渲染期调用，幂等。 */
        _bind: (nextRhf) => {
            rhf = nextRhf;
            return instance;
        },
        /** 绑定提交函数，供 submit() 使用。 */
        _bindSubmit: (handler) => {
            submitHandler = handler;
        },
        /** 底层 RHF 对象，供内部组件（Form.Item / Form.List）直接使用。 */
        get _rhf() {
            return rhf;
        },
    };

    return instance;
}

/**
 * 创建表单实例。与 antd 一致，返回单元素数组以便解构。
 * 此时实例尚未绑定 RHF，需传给 `<Form form={...}>` 后才会接入；不传则 Form 内部自建。
 * @returns {[Object]} 含 FormInstance 的数组。
 */
function useForm() {
    const [instance] = useState(() => createFormInstance());

    return useMemo(() => [instance], [instance]);
}

/**
 * 把实例绑定到底层 RHF，并注入合成 resolver。
 * @param {Object} instance - FormInstance。
 * @param {Object} [options] - 表单配置。
 * @param {Object} [options.initialValues] - 表单默认值。
 * @param {Function} [options.resolver] - 表单级校验器，如 zodResolver(schema)。
 * @returns {Object} RHF 对象。
 */
function useBoundRhf(instance, options = {}) {
    const { initialValues, resolver } = options;

    const rhf = useRhfForm({
        defaultValues: initialValues,
        mode: 'onChange',
        criteriaMode: 'all',
        // 合成 resolver 必须在每次渲染时重建，才能读到最新的注册表
        resolver: composeResolver(resolver ?? null, instance._registry),
    });

    // 渲染期绑定：Form.Item 当帧就要用 form._rhf，放 effect 里会晚一帧。幂等。
    instance._bind(rhf);

    return rhf;
}

/**
 * 取最近的 Form 实例。
 * @returns {Object} FormInstance。
 */
function useFormInstance() {
    return useFormContext().form;
}

/**
 * 监听字段值。支持 antd 的 selector 形式与 `{ form, preserve }` 选项。
 * @param {string|string[]|Function} namePathOrSelector - 字段路径、路径数组或 selector 函数。
 * @param {Object} [formOrOptions] - FormInstance 或 `{ form }`。
 * @returns {*} 监听的值。
 */
function useWatch(namePathOrSelector, formOrOptions) {
    const context = useFormContext();
    const form = formOrOptions?.form ?? formOrOptions ?? context.form;
    const control = form._rhf?.control ?? form.control;

    const isSelector = typeof namePathOrSelector === 'function';
    const name = isSelector ? undefined : namePathOrSelector;

    const value = useRhfWatch({
        control,
        name,
        // selector 形式监听整表，再在 compute 里取子集
        compute: isSelector ? (values) => namePathOrSelector(values) : undefined,
    });

    return value;
}

export {
    composeResolver,
    createFormInstance,
    getValueByPath,
    setValueByPath,
    toErrorMessages,
    useBoundRhf,
    useForm,
    useFormInstance,
    useWatch,
};
