/**
 * @file 下拉菜单组件族（DropdownMenu）
 * @description 基于 @base-ui/react/menu 封装的下拉菜单组件族，支持触发器、菜单项、
 * 分组、标签、分隔线、复选框项、单选项与子菜单。
 * 弹层经 Portal 渲染到 body，样式使用 html 级语义 token（popover / accent / muted-foreground），
 * 不引用 Zone 级变量。
 */

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from 'cn';
import { ChevronRightIcon, CheckIcon } from 'lucide-react';

/**
 * 下拉菜单根组件，管理开关状态与菜单项键盘导航。
 * @param {Object} props - 组件属性。
 * @param {boolean} [props.open] - 受控的打开状态。
 * @param {(open: boolean) => void} [props.onOpenChange] - 打开状态变化回调。
 * @returns {JSX.Element}
 */
function DropdownMenu({ ...props }) {
    return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

/**
 * 弹层传送门组件，将菜单内容渲染到 body 下。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 弹层内容。
 * @returns {JSX.Element}
 */
function DropdownMenuPortal({ ...props }) {
    return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

/**
 * 菜单触发器组件，默认渲染 button，可用 render 属性替换为其他元素。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 触发内容。
 * @returns {JSX.Element}
 */
function DropdownMenuTrigger({ ...props }) {
    return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

/**
 * 菜单内容容器组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 弹层（Popup）的额外样式类名。
 * @param {string} [props.positionerClassName] - 定位层（Positioner）的额外样式类名，用于覆盖 z-index 等定位层样式。
 * @param {('top'|'bottom'|'left'|'right'|'inline-start'|'inline-end')} [props.side='bottom'] - 弹出位置。
 * @param {number} [props.sideOffset=4] - 弹出偏移。
 * @param {('start'|'center'|'end')} [props.align='start'] - 对齐方式。
 * @param {number} [props.alignOffset=0] - 对齐偏移。
 * @returns {JSX.Element}
 */
function DropdownMenuContent({
    align = 'start',
    alignOffset = 0,
    side = 'bottom',
    sideOffset = 4,
    className,
    positionerClassName,
    ...props
}) {
    return (
        <MenuPrimitive.Portal>
            <MenuPrimitive.Positioner
                className={cn('isolate z-50 outline-none', positionerClassName)}
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
            >
                <MenuPrimitive.Popup
                    data-slot="dropdown-menu-content"
                    className={cn(
                        'z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95',
                        className
                    )}
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
    );
}

/**
 * 菜单项分组组件。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 分组内容。
 * @returns {JSX.Element}
 */
function DropdownMenuGroup({ ...props }) {
    return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

/**
 * 分组标签组件，不可聚焦、不可点击。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.inset] - 是否左侧缩进对齐菜单项文字。
 * @param {React.ReactNode} props.children - 标签内容。
 * @returns {JSX.Element}
 */
function DropdownMenuLabel({ className, inset, ...props }) {
    return (
        <MenuPrimitive.GroupLabel
            data-slot="dropdown-menu-label"
            data-inset={inset}
            className={cn(
                'px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7',
                className
            )}
            {...props}
        />
    );
}

/**
 * 菜单项组件，默认渲染 div，可用 render 属性替换为 a 等元素。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.inset] - 是否左侧缩进对齐菜单项文字。
 * @param {('default'|'destructive')} [props.variant='default'] - 菜单项样式变体。
 * @param {React.ReactNode} props.children - 菜单项内容。
 * @returns {JSX.Element}
 */
function DropdownMenuItem({ className, inset, variant = 'default', ...props }) {
    return (
        <MenuPrimitive.Item
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            className={cn(
                "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent not-data-[variant=destructive]:focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        />
    );
}

/**
 * 子菜单根组件。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 子菜单触发器与内容。
 * @returns {JSX.Element}
 */
function DropdownMenuSub({ ...props }) {
    return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

/**
 * 子菜单触发器组件，自带右侧箭头图标。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.inset] - 是否左侧缩进对齐菜单项文字。
 * @param {React.ReactNode} props.children - 触发内容。
 * @returns {JSX.Element}
 */
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
    return (
        <MenuPrimitive.SubmenuTrigger
            data-slot="dropdown-menu-sub-trigger"
            data-inset={inset}
            className={cn(
                "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            {children}
            <ChevronRightIcon className="ml-auto" />
        </MenuPrimitive.SubmenuTrigger>
    );
}

/**
 * 子菜单内容容器组件，复用 DropdownMenuContent 的定位与动画。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 弹层的额外样式类名。
 * @param {string} [props.positionerClassName] - 定位层的额外样式类名。
 * @param {('start'|'center'|'end')} [props.align='start'] - 对齐方式。
 * @param {number} [props.alignOffset=-3] - 对齐偏移。
 * @param {('top'|'bottom'|'left'|'right')} [props.side='right'] - 弹出位置。
 * @param {number} [props.sideOffset=0] - 弹出偏移。
 * @returns {JSX.Element}
 */
function DropdownMenuSubContent({
    align = 'start',
    alignOffset = -3,
    side = 'right',
    sideOffset = 0,
    className,
    ...props
}) {
    return (
        <DropdownMenuContent
            data-slot="dropdown-menu-sub-content"
            className={cn(
                'w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                className
            )}
            align={align}
            alignOffset={alignOffset}
            side={side}
            sideOffset={sideOffset}
            {...props}
        />
    );
}

/**
 * 复选框菜单项组件，选中态在右侧展示对勾。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.checked] - 是否选中。
 * @param {boolean} [props.inset] - 是否左侧缩进对齐菜单项文字。
 * @param {React.ReactNode} props.children - 菜单项内容。
 * @returns {JSX.Element}
 */
function DropdownMenuCheckboxItem({ className, children, checked, inset, ...props }) {
    return (
        <MenuPrimitive.CheckboxItem
            data-slot="dropdown-menu-checkbox-item"
            data-inset={inset}
            className={cn(
                "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            checked={checked}
            {...props}
        >
            <span
                className="pointer-events-none absolute right-2 flex items-center justify-center"
                data-slot="dropdown-menu-checkbox-item-indicator"
            >
                <MenuPrimitive.CheckboxItemIndicator>
                    <CheckIcon />
                </MenuPrimitive.CheckboxItemIndicator>
            </span>
            {children}
        </MenuPrimitive.CheckboxItem>
    );
}

/**
 * 单选项分组组件，管理同组内的选中值。
 * @param {Object} props - 组件属性。
 * @param {any} [props.value] - 当前选中值。
 * @param {(value: any) => void} [props.onValueChange] - 选中值变化回调。
 * @returns {JSX.Element}
 */
function DropdownMenuRadioGroup({ ...props }) {
    return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

/**
 * 单选项组件，选中态在右侧展示对勾。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.inset] - 是否左侧缩进对齐菜单项文字。
 * @param {React.ReactNode} props.children - 菜单项内容。
 * @returns {JSX.Element}
 */
function DropdownMenuRadioItem({ className, children, inset, ...props }) {
    return (
        <MenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            data-inset={inset}
            className={cn(
                "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className
            )}
            {...props}
        >
            <span
                className="pointer-events-none absolute right-2 flex items-center justify-center"
                data-slot="dropdown-menu-radio-item-indicator"
            >
                <MenuPrimitive.RadioItemIndicator>
                    <CheckIcon />
                </MenuPrimitive.RadioItemIndicator>
            </span>
            {children}
        </MenuPrimitive.RadioItem>
    );
}

/**
 * 菜单分隔线组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function DropdownMenuSeparator({ className, ...props }) {
    return (
        <MenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}

/**
 * 菜单项快捷键提示组件，右对齐展示。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 快捷键文案。
 * @returns {JSX.Element}
 */
function DropdownMenuShortcut({ className, ...props }) {
    return (
        <span
            data-slot="dropdown-menu-shortcut"
            className={cn(
                'ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground',
                className
            )}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuPortal,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
};
