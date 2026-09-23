/**
 * @file 空状态组件族（Empty）
 * @description 基于 shadcn/ui base-nova 风格的空状态组件族，用于空态/加载态/错误态等占位展示。
 * 通过 Empty > EmptyHeader > EmptyMedia/EmptyTitle/EmptyDescription + EmptyContent 组合使用。
 * @see https://ui.shadcn.com/docs/components/empty
 */

import { cva } from 'class-variance-authority';
import { cn } from 'cn';

/**
 * Empty 根容器。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function Empty({ className, ...props }) {
    return (
        <div
            data-slot="empty"
            className={cn(
                'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance',
                className
            )}
            {...props}
        />
    );
}

/**
 * EmptyHeader 头部容器，包裹图标与标题/描述。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function EmptyHeader({ className, ...props }) {
    return (
        <div
            data-slot="empty-header"
            className={cn('flex max-w-sm flex-col items-center gap-2', className)}
            {...props}
        />
    );
}

/**
 * EmptyMedia 图标容器的样式变体。
 */
const emptyMediaVariants = cva(
    'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                icon: 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*="size-"])]:size-4',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

/**
 * EmptyMedia 图标容器。
 * @param {Object} props - 组件属性。
 * @param {('default'|'icon')} [props.variant='default'] - 图标展示变体，icon 为带背景的小图标块。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function EmptyMedia({ className, variant = 'default', ...props }) {
    return (
        <div
            data-slot="empty-icon"
            data-variant={variant}
            className={cn(emptyMediaVariants({ variant, className }))}
            {...props}
        />
    );
}

/**
 * EmptyTitle 标题。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function EmptyTitle({ className, ...props }) {
    return (
        <div
            data-slot="empty-title"
            className={cn('text-sm font-medium tracking-tight', className)}
            {...props}
        />
    );
}

/**
 * EmptyDescription 描述文案。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function EmptyDescription({ className, ...props }) {
    return (
        <div
            data-slot="empty-description"
            className={cn(
                'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-brand-text',
                className
            )}
            {...props}
        />
    );
}

/**
 * EmptyContent 底部内容容器，通常放置操作按钮。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到根元素的类名。
 * @returns {JSX.Element}
 */
function EmptyContent({ className, ...props }) {
    return (
        <div
            data-slot="empty-content"
            className={cn(
                'flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance',
                className
            )}
            {...props}
        />
    );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
