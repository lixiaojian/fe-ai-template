/**
 * @file 表单字段项（Form.Item）
 * @description 声明式字段容器：负责注册字段、注入受控值、渲染标签与错误信息。
 * 值绑定走 field-adapter 的适配表；错误渲染复用 FieldError 组件族，保证与 Field 视觉一致。
 *
 * 拆成 FieldItem / PlainItem 两个组件是有意为之：useController 的 name 不能为 undefined
 * （实测会抛 split 相关错误），因此「有 name」与「无 name」必须在组件边界上分流，
 * 而不是在同一个组件里条件调用 hooks。
 */

import { useEffect, useMemo, useState } from 'react';
import { useController, useWatch } from 'react-hook-form';
import { cn } from 'cn';
import { Label } from '@shared/ui/data-entry/label';
import { FieldError } from '@shared/ui/data-entry/field';
import { Col } from '@shared/ui/layout/col';
import { Row } from '@shared/ui/layout/row';
import {
    ItemContext,
    useFormContext,
    useItemContext,
    useListContext,
} from '@shared/ui/data-entry/form/context';
import { compileRules } from '@shared/ui/data-entry/form/rules';
import { normalizeValidateTrigger } from '@shared/ui/data-entry/form/use-form';
import { injectFieldProps } from '@shared/ui/data-entry/form/field-adapter';
import {
    DEFAULT_LABEL_COL,
    DEFAULT_WRAPPER_COL,
    normalizeColProps,
} from '@shared/ui/data-entry/form/field-layout';

/** 无 warning 时复用的空数组，避免每次渲染产生新引用。 */
const EMPTY_WARNINGS = [];

/**
 * 推导字段的校验状态。
 * @param {Object} params - 状态输入。
 * @param {boolean} params.invalid - 是否校验失败。
 * @param {boolean} params.isValidating - 是否校验中。
 * @param {boolean} params.isTouched - 是否被操作过。
 * @param {('success'|'warning'|'error'|'validating')} [params.explicit] - 显式指定的状态。
 * @returns {('success'|'warning'|'error'|'validating'|undefined)} 状态。
 */
function resolveStatus({ invalid, isValidating, isTouched, explicit }) {
    if (explicit) {
        return explicit;
    }
    if (isValidating) {
        return 'validating';
    }
    if (invalid) {
        return 'error';
    }
    if (isTouched) {
        return 'success';
    }
    return undefined;
}

/**
 * 读取当前 Form.Item 的校验状态（对应 antd 的 Form.Item.useStatus）。
 * @returns {{status: string|undefined, errors: string[], warnings: string[]}} 状态对象。
 */
function useItemStatus() {
    const context = useItemContext();
    if (!context) {
        return { status: undefined, errors: [], warnings: [] };
    }
    return { status: context.status, errors: context.errors, warnings: context.warnings };
}

/**
 * 计算带 List 前缀的完整字段名。
 * @param {string|Array} name - 字段名。
 * @param {string} prefix - Form.List 的 name 前缀。
 * @returns {string|undefined} 完整字段名。
 */
function resolveFieldName(name, prefix) {
    if (name === undefined || name === null) {
        return undefined;
    }
    const raw = Array.isArray(name) ? name.join('.') : String(name);
    return prefix ? `${prefix}.${raw}` : raw;
}

/**
 * 计算必填标记的渲染结果（对应 antd 的 requiredMark 配置）。
 * @param {boolean|'optional'|Function} requiredMark - antd 的 requiredMark 配置。
 * @param {Object} params - 上下文。
 * @param {boolean} params.required - 该字段是否必填。
 * @param {string} [params.label] - 字段标签文本。
 * @returns {React.ReactNode|null} 标记内容；不显示时为 null。
 */
function renderRequiredMark(requiredMark, { required, label }) {
    if (typeof requiredMark === 'function') {
        return requiredMark(label, { required }) ?? null;
    }
    if (requiredMark === false) {
        return null;
    }
    if (requiredMark === 'optional') {
        return required ? '*' : '(可选)';
    }
    return required ? '*' : null;
}

/**
 * 必填标记。requiredMark 为 true / 'optional' / 函数时分别产出星号、可选提示或自定义内容。
 * @param {Object} props - 组件属性。
 * @param {boolean} props.required - 是否必填。
 * @param {boolean|'optional'|Function} [props.requiredMark] - Form 级的 requiredMark 配置。
 * @param {string} [props.label] - 字段标签文本，供函数形式的 requiredMark 使用。
 * @returns {JSX.Element|null}
 */
function RequiredMark({ required, requiredMark, label }) {
    const mark = renderRequiredMark(requiredMark, { required, label });

    if (mark === null || mark === undefined || mark === '') {
        return null;
    }

    // 只有星号是装饰性标记；「(可选)」这类文案属于标签内容，读屏时不应被隐藏
    return mark === '*' ? (
        <span aria-hidden="true" className="mr-1 text-danger-text">
            *
        </span>
    ) : (
        <span className="mr-1">{mark}</span>
    );
}

/**
 * 计算 warningOnly 规则的提示文案。独立通道：不进错误态、不阻断提交。
 * @param {Array<Object>} warningRules - 只含 warningOnly 的规则。
 * @param {*} value - 当前字段值。
 * @param {Object} allValues - 表单全部值。
 * @param {string} label - 字段标签，供模板变量使用。
 * @returns {Promise<string[]>} 提示文案数组。
 */
async function runWarningRules(warningRules, value, allValues, label) {
    const validators = compileRules(
        warningRules.map((rule) => ({ ...rule, warningOnly: false })),
        { label }
    );
    const messages = [];
    for (const validate of validators) {
        const message = await validate(value, allValues);
        if (message) {
            messages.push(message);
        }
    }
    return messages;
}

/**
 * 渲染字段的外壳（标签 + 控件区 + 错误/提示）。
 * @param {Object} props - 渲染所需的数据。
 * @returns {JSX.Element} 字段外壳。
 */
function ItemShell(props) {
    const {
        layout,
        labelNode,
        controlNode,
        className,
        fieldName,
        invalid,
        status,
        hidden,
        onBlur,
        labelCol,
        wrapperCol,
    } = props;

    const isHorizontal = layout === 'horizontal';

    const body = isHorizontal ? (
        <Row>
            <Col {...labelCol}>{labelNode}</Col>
            <Col {...wrapperCol}>{controlNode}</Col>
        </Row>
    ) : (
        <>
            {labelNode}
            {controlNode}
        </>
    );

    return (
        <div
            data-slot="form-item"
            data-field-name={fieldName}
            data-invalid={invalid || undefined}
            data-status={status}
            onBlur={onBlur}
            className={cn(
                'flex w-full flex-col gap-2',
                layout === 'inline' && 'flex-row items-center gap-2',
                hidden && 'hidden',
                className
            )}
        >
            {body}
        </div>
    );
}

/**
 * 无 name 的 Form.Item：只作为布局容器或 noStyle 父级，不注册字段。
 * @param {Object} props - 组件属性，见 FormItem。
 * @returns {JSX.Element}
 */
function PlainItem(props) {
    const {
        label,
        required,
        help,
        extra,
        noStyle,
        hidden,
        className,
        children,
        layout,
        labelCol,
        wrapperCol,
        shouldUpdate,
    } = props;

    const formContext = useFormContext();
    const childItem = useItemContext();

    // noStyle 父级：错误来自内层冒泡上来的状态。用 useMemo 稳定引用，
    // 否则 `?? []` 每次渲染都产出新数组，会让下游 useMemo 每轮失效。
    const errors = useMemo(() => childItem?.errors ?? [], [childItem]);
    const warnings = useMemo(() => childItem?.warnings ?? [], [childItem]);
    const status = childItem?.status;

    const contextValue = useMemo(
        () => ({ name: undefined, required: Boolean(required), status, errors, warnings }),
        [required, status, errors, warnings]
    );

    // shouldUpdate：订阅全表值以驱动重渲染（任一字段变化即重渲染）。
    // 函数形式的「比较上一次值决定是否重渲染」不实现：它需要读取渲染期的上一次值，
    // 而这会触发 React Compiler 的 refs 规则；传函数时按 true 处理并开发期告警。
    const shouldSubscribe = Boolean(shouldUpdate);
    useWatch({ control: formContext.form._rhf.control, disabled: !shouldSubscribe });

    if (typeof shouldUpdate === 'function') {
        console.warn('[Form] shouldUpdate 暂不支持函数形式，已按 true 处理。');
    }

    // children 为函数时视为渲染函数，传入表单实例
    const content = typeof children === 'function' ? children(formContext.form) : children;

    const labelNode =
        label === undefined ? null : (
            <Label data-slot="form-item-label" className="leading-snug">
                <RequiredMark
                    required={Boolean(required)}
                    requiredMark={formContext.requiredMark}
                    label={label}
                />
                {label}
                {formContext.colon ? ':' : ''}
            </Label>
        );

    const controlNode = (
        <div className="flex w-full flex-col gap-1" data-slot="form-item-control">
            {content}
            {help !== undefined ? (
                <div className="text-sm text-(--text-3)">{help}</div>
            ) : (
                errors.length > 0 && <FieldError errors={errors} />
            )}
            {warnings.length > 0 && (
                <div role="alert" className="text-sm text-warning">
                    {warnings.join('；')}
                </div>
            )}
            {extra !== undefined && <div className="text-sm text-(--text-3)">{extra}</div>}
        </div>
    );

    if (noStyle) {
        return <ItemContext.Provider value={contextValue}>{content}</ItemContext.Provider>;
    }

    return (
        <ItemContext.Provider value={contextValue}>
            <ItemShell
                layout={layout ?? formContext.layout}
                labelNode={labelNode}
                controlNode={controlNode}
                className={className}
                invalid={false}
                status={status}
                hidden={hidden}
                labelCol={
                    normalizeColProps(labelCol) ??
                    normalizeColProps(formContext.labelCol) ??
                    DEFAULT_LABEL_COL
                }
                wrapperCol={
                    normalizeColProps(wrapperCol) ??
                    normalizeColProps(formContext.wrapperCol) ??
                    DEFAULT_WRAPPER_COL
                }
            />
        </ItemContext.Provider>
    );
}

/**
 * 有 name 的 Form.Item：注册字段、注入受控值、参与校验。
 * @param {Object} props - 组件属性，见 FormItem。
 * @returns {JSX.Element}
 */
function FieldItem(props) {
    const {
        name,
        label,
        rules,
        required,
        help,
        extra,
        valuePropName,
        trigger,
        getValueFromEvent,
        normalize,
        hidden = false,
        noStyle = false,
        initialValue,
        dependencies,
        validateStatus,
        htmlFor,
        labelCol,
        wrapperCol,
        layout,
        className,
        children,
        validateTrigger,
    } = props;

    const formContext = useFormContext();
    const { prefix } = useListContext();
    const fieldName = resolveFieldName(name, prefix);
    const control = formContext.form._rhf.control;
    // 本项实际生效的布局：Item 级覆盖 Form 级
    const effectiveLayout = layout ?? formContext.layout;
    // 控件 id：Form 的 name 作为前缀（antd 语义），显式 htmlFor 优先级最高
    const fieldId = htmlFor ?? (formContext.name ? `${formContext.name}_${fieldName}` : fieldName);

    const { field, fieldState } = useController({
        name: fieldName,
        control,
        defaultValue: initialValue,
        rules: normalize ? { setValueAs: normalize } : undefined,
    });

    // 本字段的校验触发时机：Item 级优先于 Form 级。校验全部由这里手动触发
    // （RHF 的 mode 已设为 onSubmit），因此字段级配置才真正生效。
    const effectiveValidateTrigger = normalizeValidateTrigger(
        validateTrigger ?? formContext.validateTrigger
    );
    const validateOnChange = effectiveValidateTrigger.includes('onChange');
    const validateOnBlur = effectiveValidateTrigger.includes('onBlur');

    /** 手动触发本字段校验。 */
    const runValidate = () => {
        formContext.form._rhf.trigger(fieldName);
    };

    /**
     * 焦点移出整个字段时才处理 blur：RadioGroup 各项之间移动焦点也会冒泡出
     * focusout，用 relatedTarget 判断焦点是否仍在字段内部，避免多余校验。
     */
    const handleBlur = (event) => {
        // touched 状态与校验时机无关，blur 一律标记
        field.onBlur();
        if (!validateOnBlur) {
            return;
        }
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
            return;
        }
        runValidate();
    };

    // 注册 rules，供合成 resolver 使用
    useEffect(() => {
        if (!rules) {
            return undefined;
        }
        formContext.form._registry.set(fieldName, {
            rules,
            label: typeof label === 'string' ? label : fieldName,
        });
        return () => {
            formContext.form._registry.delete(fieldName);
        };
    }, [formContext.form, fieldName, rules, label]);

    // 登记挂载状态，供 FormInstance 判断是否需要 register 往返
    useEffect(() => {
        formContext.form._mountedFields.add(fieldName);
        return () => {
            formContext.form._mountedFields.delete(fieldName);
        };
    }, [formContext.form, fieldName]);

    // dependencies：自己订阅依赖字段，变化时触发本字段重校验。
    // 不用 RHF 的 register({ deps })——实测其重校验不可靠。
    const dependencyNames = useMemo(() => dependencies ?? [], [dependencies]);
    const dependencyValues = useWatch({ control, name: dependencyNames });
    const dependenciesKey = JSON.stringify(dependencyValues ?? null);

    useEffect(() => {
        if (dependencyNames.length === 0) {
            return;
        }
        formContext.form._rhf.trigger(fieldName);
        // 依赖值变化（dependenciesKey）即触发；fieldName / trigger 不需要进依赖数组
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependenciesKey]);

    // warningOnly：独立通道，不进错误态、不阻断提交。
    // state 只在异步回调里写入（effect 体内同步 setState 会触发
    // react-hooks/set-state-in-effect），无 warning 规则时直接由派生值兜底。
    const [asyncWarnings, setAsyncWarnings] = useState([]);
    const warningRules = useMemo(
        () => (Array.isArray(rules) ? rules.filter((rule) => rule?.warningOnly) : []),
        [rules]
    );
    const warningKey = JSON.stringify(warningRules);

    useEffect(() => {
        if (warningRules.length === 0) {
            return undefined;
        }
        let cancelled = false;
        runWarningRules(
            warningRules,
            field.value,
            formContext.form._rhf.getValues(),
            typeof label === 'string' ? label : fieldName
        ).then((messages) => {
            if (!cancelled) {
                setAsyncWarnings(messages);
            }
        });
        return () => {
            cancelled = true;
        };
        // warningKey 代表规则内容，避免每次渲染都重跑
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warningKey, field.value, fieldName]);

    const warnings = warningRules.length === 0 ? EMPTY_WARNINGS : asyncWarnings;

    const isRequired = required ?? (Array.isArray(rules) && rules.some((rule) => rule?.required));
    const status = resolveStatus({
        invalid: fieldState.invalid,
        isValidating: fieldState.isValidating,
        isTouched: fieldState.isTouched,
        explicit: validateStatus,
    });

    const injected = injectFieldProps(children, {
        value: field.value,
        onChange: (eventOrValue) => {
            const next = getValueFromEvent ? getValueFromEvent(eventOrValue) : eventOrValue;
            field.onChange(next);
            if (validateOnChange) {
                // field.onChange 会同步把值写入 store（已实测），可直接触发校验
                runValidate();
            }
        },
        invalid: fieldState.invalid,
        id: fieldId,
        disabled: formContext.disabled,
        valuePropName,
        trigger,
    });

    const contextValue = useMemo(
        () => ({
            name: fieldName,
            required: Boolean(isRequired),
            status,
            errors: fieldState.invalid ? [fieldState.error] : [],
            warnings,
        }),
        [fieldName, isRequired, status, fieldState.invalid, fieldState.error, warnings]
    );

    if (noStyle) {
        // 包一层带 data-field-name 的容器：scrollToField 依赖它定位字段。
        // 不用 display:contents——那会让元素没有盒子，scrollIntoView 失效。
        return (
            <ItemContext.Provider value={contextValue}>
                <div
                    data-slot="form-item"
                    data-field-name={fieldName}
                    data-invalid={fieldState.invalid || undefined}
                    onBlur={handleBlur}
                >
                    {injected}
                </div>
            </ItemContext.Provider>
        );
    }

    if (hidden) {
        // 隐藏但仍注册与校验：受控控件已注入，这里用 hidden 属性隐藏外壳
        return (
            <ItemContext.Provider value={contextValue}>
                <ItemShell
                    layout={effectiveLayout}
                    labelNode={null}
                    controlNode={<div data-slot="form-item-control">{injected}</div>}
                    className={className}
                    fieldName={fieldName}
                    invalid={fieldState.invalid}
                    status={status}
                    hidden
                    onBlur={handleBlur}
                    labelCol={DEFAULT_LABEL_COL}
                    wrapperCol={DEFAULT_WRAPPER_COL}
                />
            </ItemContext.Provider>
        );
    }

    const labelNode =
        label === undefined ? null : (
            <Label
                htmlFor={fieldId}
                data-slot="form-item-label"
                className={cn(
                    'leading-snug',
                    effectiveLayout === 'horizontal' &&
                        formContext.labelAlign === 'right' &&
                        'justify-end'
                )}
            >
                <RequiredMark
                    required={Boolean(isRequired)}
                    requiredMark={formContext.requiredMark}
                    label={label}
                />
                {label}
                {formContext.colon ? ':' : ''}
            </Label>
        );

    const controlNode = (
        <div className="flex w-full flex-col gap-1" data-slot="form-item-control">
            {injected}
            {help !== undefined ? (
                <div className="text-sm text-(--text-3)">{help}</div>
            ) : (
                fieldState.invalid && <FieldError errors={[fieldState.error]} />
            )}
            {warnings.length > 0 && (
                <div role="alert" className="text-sm text-warning">
                    {warnings.join('；')}
                </div>
            )}
            {extra !== undefined && <div className="text-sm text-(--text-3)">{extra}</div>}
        </div>
    );

    return (
        <ItemContext.Provider value={contextValue}>
            <ItemShell
                layout={effectiveLayout}
                labelNode={labelNode}
                controlNode={controlNode}
                className={className}
                fieldName={fieldName}
                invalid={fieldState.invalid}
                status={status}
                onBlur={handleBlur}
                labelCol={
                    normalizeColProps(labelCol) ??
                    normalizeColProps(formContext.labelCol) ??
                    DEFAULT_LABEL_COL
                }
                wrapperCol={
                    normalizeColProps(wrapperCol) ??
                    normalizeColProps(formContext.wrapperCol) ??
                    DEFAULT_WRAPPER_COL
                }
            />
        </ItemContext.Provider>
    );
}

/**
 * Form.Item 组件。有 name 时注册字段，无 name 时仅作布局容器（noStyle 父级场景）。
 * @param {Object} props - 组件属性。
 * @param {string|Array} [props.name] - 字段名；不传则只作为布局容器。
 * @param {React.ReactNode} [props.label] - 标签内容。
 * @param {Array<Object>} [props.rules] - 校验规则数组。
 * @param {string|string[]} [props.validateTrigger] - 本字段的校验触发时机，
 *   覆盖 Form 级配置；支持 onChange / onBlur / onSubmit，可传数组。
 * @param {boolean} [props.required] - 是否强制显示必填标记。
 * @param {React.ReactNode} [props.help] - 自定义提示信息，替代规则产生的错误文案。
 * @param {React.ReactNode} [props.extra] - 额外的说明信息，可与错误并存。
 * @param {string} [props.valuePropName] - 取值属性名，覆盖适配表。
 * @param {string} [props.trigger] - 变更属性名，覆盖适配表。
 * @param {Function} [props.getValueFromEvent] - 从事件取值。
 * @param {Function} [props.normalize] - 入库前转换值。
 * @param {boolean} [props.hidden] - 隐藏但仍收集与校验。
 * @param {boolean} [props.noStyle] - 不渲染标签与布局外壳。
 * @param {*} [props.initialValue] - 字段默认值。
 * @param {Array<string>} [props.dependencies] - 依赖字段，变化时触发本字段重校验。
 * @param {boolean|Function} [props.shouldUpdate] - 自定义更新逻辑。
 * @param {('success'|'warning'|'error'|'validating')} [props.validateStatus] - 手动指定状态。
 * @param {string} [props.htmlFor] - label 的 htmlFor。
 * @param {Object} [props.labelCol] - 标签栅格。
 * @param {Object} [props.wrapperCol] - 控件栅格。
 * @param {('horizontal'|'vertical'|'inline')} [props.layout] - 本项布局。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 单个控件元素，或 shouldUpdate 的渲染函数。
 * @returns {JSX.Element}
 */
function FormItem(props) {
    const hasName = props.name !== undefined && props.name !== null;

    if (!hasName) {
        return <PlainItem {...props} />;
    }

    return <FieldItem {...props} />;
}

export { FormItem, useItemStatus, resolveStatus, renderRequiredMark };
