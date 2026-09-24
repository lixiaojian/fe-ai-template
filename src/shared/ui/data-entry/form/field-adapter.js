/**
 * @file 控件适配表与属性注入
 * @description Form.Item 通过 cloneElement 把受控值注入子控件，但各控件的受控属性名不同
 * （Base UI 的 Select / Switch / Checkbox / RadioGroup 用 onValueChange / onCheckedChange）。
 * 这里按「组件引用」建表识别，比按 data-slot 字符串识别更稳：
 * 属性注入发生在渲染前，此时拿不到渲染后的 DOM 属性。
 *
 * aria-invalid 的落点随控件而异：SelectRoot 不透传未知属性，必须落在 SelectTrigger 上；
 * 其余控件放根组件即可。
 */

import { Children, cloneElement, isValidElement } from 'react';
import { Input } from '@shared/ui/data-entry/input';
import { Textarea } from '@shared/ui/data-entry/textarea';
import { Switch } from '@shared/ui/data-entry/switch';
import { Checkbox } from '@shared/ui/data-entry/checkbox';
import { RadioGroup } from '@shared/ui/data-entry/radio-group';
import { Select, SelectTrigger } from '@shared/ui/data-entry/select';

/** 未命中适配表时的默认绑定，即 antd 的 value / onChange。 */
const DEFAULT_BINDING = { valueProp: 'value', trigger: 'onChange' };

/**
 * 控件适配表。forwardTo 表示 aria-invalid / id 需要下沉到哪个子组件。
 * @type {Map<Function, {valueProp: string, trigger: string, forwardTo?: Function}>}
 */
const BINDINGS = new Map([
    [Select, { valueProp: 'value', trigger: 'onValueChange', forwardTo: SelectTrigger }],
    [Switch, { valueProp: 'checked', trigger: 'onCheckedChange' }],
    [Checkbox, { valueProp: 'checked', trigger: 'onCheckedChange' }],
    [RadioGroup, { valueProp: 'value', trigger: 'onValueChange' }],
    [Input, DEFAULT_BINDING],
    [Textarea, DEFAULT_BINDING],
]);

/**
 * 查控件的受控属性绑定。
 * @param {Function|string} elementType - 子元素的 type。
 * @returns {{valueProp: string, trigger: string, forwardTo?: Function}} 绑定配置。
 */
function getFieldBinding(elementType) {
    return BINDINGS.get(elementType) ?? DEFAULT_BINDING;
}

/**
 * 把受控属性注入子控件。
 * @param {React.ReactNode} child - Form.Item 的子元素。
 * @param {Object} props - 待注入的属性。
 * @param {*} props.value - 字段值。
 * @param {Function} props.onChange - 值变更回调（适配后的签名）。
 * @param {boolean} props.invalid - 是否处于校验错误态。
 * @param {string} [props.id] - 控件 id。
 * @param {boolean} [props.disabled] - 是否禁用控件；仅在其为真值时注入，
 *   避免把控件自身写的 disabled 覆盖成 false。
 * @param {string} [props.valuePropName] - 显式指定取值属性，优先于适配表。
 * @param {string} [props.trigger] - 显式指定变更属性，优先于适配表。
 * @returns {React.ReactNode} 注入后的子元素；子元素不合法时原样返回。
 */
function injectFieldProps(child, props) {
    const { value, onChange, invalid, id, disabled, valuePropName, trigger } = props;

    if (Array.isArray(child)) {
        console.warn('[Form] Form.Item 只能有一个子元素，已取第一个。');
        return injectFieldProps(child[0], props);
    }

    if (!isValidElement(child)) {
        console.warn('[Form] Form.Item 的子元素必须是一个合法的 React 元素。');
        return child;
    }

    const binding = getFieldBinding(child.type);
    const valueProp = valuePropName ?? binding.valueProp;
    const triggerProp = trigger ?? binding.trigger;

    // 值必须归一，不能把 undefined 透给控件：
    // Base UI 的 Input（Field.Control）用 useControlled 判定受控与否，
    // 首次渲染拿到 undefined 就会永久按非受控处理，之后 store 里的值再变也不会回填，
    // 表现为「store 有值、输入框却空着」。checkbox 类同理，undefined 归一为 false。
    const normalizedValue = valueProp === 'checked' ? Boolean(value) : (value ?? '');

    const rootProps = { [valueProp]: normalizedValue, [triggerProp]: onChange };

    if (disabled) {
        rootProps.disabled = true;
    }

    // 默认落点：aria-invalid 与 id 直接给根组件
    if (!binding.forwardTo) {
        rootProps['aria-invalid'] = invalid;
        if (id !== undefined) {
            rootProps.id = id;
        }
        return cloneElement(child, rootProps);
    }

    // 需要下沉：根组件只吃受控属性，aria-invalid / id 交给 forwardTo 指定的子组件
    const withRoot = cloneElement(child, rootProps);
    const forwarded = Children.map(withRoot.props.children, (inner) =>
        isValidElement(inner) && inner.type === binding.forwardTo
            ? cloneElement(inner, { 'aria-invalid': invalid, id })
            : inner
    );

    return cloneElement(withRoot, { children: forwarded });
}

export { injectFieldProps, getFieldBinding };
