/**
 * @file 下拉选择组件（Select）
 * @description 基于 @base-ui/react/select 封装的下拉选择组件族，支持触发器、选项列表、分组、标签、分隔线等。
 */

import { Select as SelectPrimitive } from '@base-ui/react/select';

import { cn } from 'cn';
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react';

/**
 * Select 根组件，管理选中值与弹出层状态。
 */
const Select = SelectPrimitive.Root;

/**
 * 选项分组组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function SelectGroup({ className, ...props }) {
    return (
        <SelectPrimitive.Group
            data-slot="select-group"
            className={cn('scroll-my-1 p-1', className)}
            {...props}
        />
    );
}

/**
 * 选中值展示组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode | ((value: any) => React.ReactNode)} [props.children] - 自定义渲染内容或渲染函数。
 * @returns {JSX.Element}
 */
function SelectValue({ className, ...props }) {
    return (
        <SelectPrimitive.Value
            data-slot="select-value"
            className={cn('flex flex-1 text-left', className)}
            {...props}
        />
    );
}

/**
 * 下拉触发器组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('default'|'sm')} [props.size='default'] - 触发器尺寸。
 * @param {React.ReactNode} props.children - 触发器内容。
 * @returns {JSX.Element}
 */
function SelectTrigger({ className, size = 'default', children, ...props }) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            data-size={size}
            className={cn(
                "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-soft py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 hover:bg-card-hover dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon
                render={
                    <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
                }
            />
        </SelectPrimitive.Trigger>
    );
}

/**
 * 下拉内容容器组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 弹层（Popup）的额外样式类名。
 * @param {string} [props.positionerClassName] - 定位层（Positioner）的额外样式类名，用于覆盖 z-index 等定位层样式。
 * @param {React.ReactNode} props.children - 下拉内容。
 * @param {('top'|'bottom'|'left'|'right'|'inline-start'|'inline-end')} [props.side='bottom'] - 弹出位置。
 * @param {number} [props.sideOffset=4] - 弹出偏移。
 * @param {('start'|'center'|'end')} [props.align='center'] - 对齐方式。
 * @param {number} [props.alignOffset=0] - 对齐偏移。
 * @param {boolean} [props.alignItemWithTrigger=true] - 是否与触发器对齐。
 * @returns {JSX.Element}
 */
function SelectContent({
    className,
    positionerClassName,
    children,
    side = 'bottom',
    sideOffset = 4,
    align = 'center',
    alignOffset = 0,
    alignItemWithTrigger = true,
    ...props
}) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
                side={side}
                sideOffset={sideOffset}
                align={align}
                alignOffset={alignOffset}
                alignItemWithTrigger={alignItemWithTrigger}
                className={cn('isolate z-50', positionerClassName)}
            >
                <SelectPrimitive.Popup
                    data-slot="select-content"
                    data-align-trigger={alignItemWithTrigger}
                    className={cn(
                        'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className
                    )}
                    {...props}
                >
                    <SelectScrollUpButton />
                    <SelectPrimitive.List>{children}</SelectPrimitive.List>
                    <SelectScrollDownButton />
                </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
    );
}

/**
 * 分组标签组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function SelectLabel({ className, ...props }) {
    return (
        <SelectPrimitive.GroupLabel
            data-slot="select-label"
            className={cn('px-1.5 py-1 text-xs text-muted-foreground', className)}
            {...props}
        />
    );
}

/**
 * 单个选项组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 选项显示内容。
 * @param {string} props.value - 选项值。
 * @returns {JSX.Element}
 */
function SelectItem({ className, children, ...props }) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className
            )}
            {...props}
        >
            <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
                {children}
            </SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator
                render={
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                }
            >
                <CheckIcon className="pointer-events-none" />
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    );
}

/**
 * 选项分隔线组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function SelectSeparator({ className, ...props }) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}

/**
 * 向上滚动按钮组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function SelectScrollUpButton({ className, ...props }) {
    return (
        <SelectPrimitive.ScrollUpArrow
            data-slot="select-scroll-up-button"
            className={cn(
                "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <ChevronUpIcon />
        </SelectPrimitive.ScrollUpArrow>
    );
}

/**
 * 向下滚动按钮组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function SelectScrollDownButton({ className, ...props }) {
    return (
        <SelectPrimitive.ScrollDownArrow
            data-slot="select-scroll-down-button"
            className={cn(
                "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <ChevronDownIcon />
        </SelectPrimitive.ScrollDownArrow>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
