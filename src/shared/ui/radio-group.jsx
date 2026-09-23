/**
 * @file 单选框组组件（Radio Group）
 * @description 基于 @base-ui/react-radio-group 封装的单选框组组件，支持 RadioGroup 容器与 RadioGroupItem 选项。
 */

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

import { cn } from 'cn';

/**
 * RadioGroup 根组件，管理单选状态。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {string} [props.value] - 当前选中的值。
 * @param {(value: string) => void} [props.onValueChange] - 选中值变化回调。
 * @param {React.ReactNode} props.children - 单选选项。
 * @returns {JSX.Element}
 */
function RadioGroup({ className, ...props }) {
    return (
        <RadioGroupPrimitive
            data-slot="radio-group"
            className={cn('grid w-full gap-2', className)}
            {...props}
        />
    );
}

/**
 * RadioGroup 单选项组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {string} props.value - 选项值。
 * @returns {JSX.Element}
 */
function RadioGroupItem({ className, ...props }) {
    return (
        <RadioPrimitive.Root
            data-slot="radio-group-item"
            className={cn(
                'group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary',
                className
            )}
            {...props}
        >
            <RadioPrimitive.Indicator
                data-slot="radio-group-indicator"
                className="flex size-4 items-center justify-center"
            >
                <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
            </RadioPrimitive.Indicator>
        </RadioPrimitive.Root>
    );
}

export { RadioGroup, RadioGroupItem };
