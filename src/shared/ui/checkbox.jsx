/**
 * @file 复选框组件（Checkbox）
 * @description 基于 Base UI Checkbox 与 shadcn/ui Base UI（base-nova）风格封装的复选框组件。
 * 通过 Indicator 渲染选中标记，支持受控（checked/onCheckedChange）与非受控用法。
 */

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';
import { cn } from 'cn';

/**
 * Checkbox 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.checked] - 是否选中（受控模式）。
 * @param {boolean} [props.defaultChecked] - 初始是否选中（非受控模式）。
 * @param {(checked: boolean, eventDetails: Object) => void} [props.onCheckedChange] - 选中状态变化回调。
 * @param {boolean} [props.disabled] - 是否禁用。
 * @param {React.Ref<HTMLButtonElement>} ref - 转发到底层 button 元素的 ref。
 * @returns {JSX.Element}
 */
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        data-slot="checkbox"
        className={cn(
            'peer pointer-events-none flex size-4 shrink-0 items-center justify-center border border-input bg-soft shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator
            data-slot="checkbox-indicator"
            className="flex items-center justify-center text-current"
        >
            <CheckIcon className="size-3.5" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
