/**
 * @file 卡片组件（Card）
 * @description 基于 shadcn/ui Base UI（base-nova）风格的 Card 组件族，
 * 包含 Card、CardHeader、CardTitle、CardDescription、CardAction、CardContent、CardFooter。
 * 通过 --card-spacing CSS 变量与 data-slot 属性实现统一间距与组合样式，
 * 用于将相关内容组合在一个容器内展示。
 */

import { cn } from 'cn';

/**
 * Card 容器组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('default'|'sm')} [props.size='default'] - 卡片尺寸，控制内部间距变量。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Card({ className, size = 'default', ...props }) {
    return (
        <div
            data-slot="card"
            data-size={size}
            className={cn(
                'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
                className
            )}
            {...props}
        />
    );
}

/**
 * CardHeader 组件，用于放置卡片标题、描述与操作区。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardHeader({ className, ...props }) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
                className
            )}
            {...props}
        />
    );
}

/**
 * CardTitle 组件，卡片标题。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardTitle({ className, ...props }) {
    return (
        <div
            data-slot="card-title"
            className={cn(
                'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
                className
            )}
            {...props}
        />
    );
}

/**
 * CardDescription 组件，卡片描述文字。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardDescription({ className, ...props }) {
    return (
        <div
            data-slot="card-description"
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

/**
 * CardAction 组件，卡片头部右侧操作区，配合 CardHeader 的网格布局使用。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardAction({ className, ...props }) {
    return (
        <div
            data-slot="card-action"
            className={cn(
                'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
                className
            )}
            {...props}
        />
    );
}

/**
 * CardContent 组件，卡片主要内容区域。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardContent({ className, ...props }) {
    return (
        <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
    );
}

/**
 * CardFooter 组件，卡片底部操作区域。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function CardFooter({ className, ...props }) {
    return (
        <div
            data-slot="card-footer"
            className={cn(
                'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)',
                className
            )}
            {...props}
        />
    );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardAction, CardContent };
