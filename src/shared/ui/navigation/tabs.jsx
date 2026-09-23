/**
 * @file 标签页组件（Tabs）
 * @description 基于 Base UI Tabs 与 shadcn/ui Base UI（base-nova）风格封装的标签页组件族，
 * 包含 Tabs、TabsList、TabsTrigger、TabsContent。提供键盘导航与 ARIA 无障碍支持。
 */

import * as React from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from 'cn';

/**
 * Tabs 根容器组件，管理标签页的选中状态（受控用 value，非受控用 defaultValue）。
 * @param {Object} props - 组件属性。
 * @param {string|number} [props.value] - 当前激活的标签值（受控模式）。
 * @param {string|number} [props.defaultValue] - 初始激活的标签值（非受控模式）。
 * @param {(value: string|number, eventDetails: Object) => void} [props.onValueChange] - 激活值变化回调。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.Ref<HTMLDivElement>} ref - 转发到根 div 的 ref。
 * @returns {JSX.Element}
 */
const Tabs = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Root ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
));
Tabs.displayName = 'Tabs';

/**
 * TabsList 组件，标签按钮的容器。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.Ref<HTMLDivElement>} ref - 转发到 div 的 ref。
 * @returns {JSX.Element}
 */
const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        data-slot="tabs-list"
        className={cn(
            'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
            className
        )}
        {...props}
    />
));
TabsList.displayName = 'TabsList';

/**
 * TabsTrigger 组件，单个标签按钮，激活时带 data-active 属性。
 * @param {Object} props - 组件属性。
 * @param {string|number} props.value - 该标签对应的值。
 * @param {boolean} [props.disabled] - 是否禁用。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.Ref<HTMLElement>} ref - 转发到底层 button 元素的 ref。
 * @returns {JSX.Element}
 */
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Tab
        ref={ref}
        data-slot="tabs-trigger"
        className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground',
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = 'TabsTrigger';

/**
 * TabsContent 组件，与某个 TabsTrigger 对应的内容面板。
 * @param {Object} props - 组件属性。
 * @param {string|number} props.value - 对应标签的值。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.Ref<HTMLDivElement>} ref - 转发到 div 的 ref。
 * @returns {JSX.Element}
 */
const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Panel
        ref={ref}
        data-slot="tabs-content"
        className={cn('flex-1 outline-none', className)}
        {...props}
    />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
