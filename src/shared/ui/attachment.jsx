/**
 * @file 附件组件族（Attachment）
 * @description 基于 shadcn/ui Base UI（base-nova）风格的附件组件族，用于展示文件/图片附件及其
 * 上传状态。由 Attachment > AttachmentMedia + AttachmentContent（AttachmentTitle /
 * AttachmentDescription）+ AttachmentActions（AttachmentAction）组合而成；
 * 多个附件用 AttachmentGroup 横向排布。
 */

import { cva } from 'class-variance-authority';
import { cn } from 'cn';

import { Button } from '@shared/ui/button';

/**
 * Attachment 根容器样式变体定义。
 * @see https://ui.shadcn.com/docs/components/attachment
 */
const attachmentVariants = cva(
    'group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50 has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed',
    {
        variants: {
            size: {
                default:
                    'gap-2 text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2',
                sm: 'gap-2.5 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5',
                xs: 'gap-1.5 rounded-lg text-xs has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1',
            },
            orientation: {
                horizontal: 'min-w-40 items-center',
                vertical: 'w-24 flex-col has-data-[slot=attachment-content]:w-30',
            },
        },
    }
);

/**
 * 附件根容器，承载上传状态（state）供子组件按 data-state 派生样式。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('idle'|'uploading'|'processing'|'error'|'done')} [props.state='done'] - 上传状态；uploading/processing 会让 AttachmentTitle 播放 shimmer 动画。
 * @param {('default'|'sm'|'xs')} [props.size='default'] - 尺寸变体。
 * @param {('horizontal'|'vertical')} [props.orientation='horizontal'] - 排列方向。
 * @param {React.ReactNode} props.children - 附件内容（Media / Content / Actions）。
 * @returns {JSX.Element}
 */
function Attachment({
    className,
    state = 'done',
    size = 'default',
    orientation = 'horizontal',
    ...props
}) {
    return (
        <div
            data-slot="attachment"
            data-state={state}
            data-size={size}
            data-orientation={orientation}
            className={cn(attachmentVariants({ size, orientation }), className)}
            {...props}
        />
    );
}

/**
 * AttachmentMedia 样式变体定义。
 */
const attachmentMediaVariants = cva(
    "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5",
    {
        variants: {
            variant: {
                icon: '',
                image: 'opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover',
            },
        },
        defaultVariants: {
            variant: 'icon',
        },
    }
);

/**
 * 附件左侧的图标/缩略图区域，尺寸随 Attachment 的 size 联动。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('icon'|'image')} [props.variant='icon'] - icon 放图标（svg 尺寸由组件控制），image 放 <img> 缩略图。
 * @param {React.ReactNode} props.children - 图标或图片。
 * @returns {JSX.Element}
 */
function AttachmentMedia({ className, variant = 'icon', ...props }) {
    return (
        <div
            data-slot="attachment-media"
            data-variant={variant}
            className={cn(attachmentMediaVariants({ variant }), className)}
            {...props}
        />
    );
}

/**
 * 附件中部内容区（标题 + 描述等），占据剩余宽度。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 内容。
 * @returns {JSX.Element}
 */
function AttachmentContent({ className, ...props }) {
    return (
        <div
            data-slot="attachment-content"
            className={cn(
                'max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1',
                className
            )}
            {...props}
        />
    );
}

/**
 * 附件标题，单行截断；上传/处理中自动播放 shimmer 动画。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 标题内容（通常是文件名）。
 * @returns {JSX.Element}
 */
function AttachmentTitle({ className, ...props }) {
    return (
        <span
            data-slot="attachment-title"
            className={cn(
                'block max-w-full min-w-0 truncate font-medium group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer',
                className
            )}
            {...props}
        />
    );
}

/**
 * 附件描述行，单行截断；Attachment 处于 error 时自动转为危险色。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 描述内容（如类型、大小、状态）。
 * @returns {JSX.Element}
 */
function AttachmentDescription({ className, ...props }) {
    return (
        <span
            data-slot="attachment-description"
            className={cn(
                'mt-0.5 block min-w-0 truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-destructive/80',
                'max-w-full',
                className
            )}
            {...props}
        />
    );
}

/**
 * 附件右侧的操作区容器，vertical 方向下浮在右上角。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 操作按钮。
 * @returns {JSX.Element}
 */
function AttachmentActions({ className, ...props }) {
    return (
        <div
            data-slot="attachment-actions"
            className={cn(
                'relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1',
                className
            )}
            {...props}
        />
    );
}

/**
 * 附件操作按钮，默认 ghost 变体 + icon-xs 尺寸。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('default'|'outline'|'ghost'|'secondary'|'destructive'|'link')} [props.variant='ghost'] - 按钮样式变体。
 * @param {('default'|'sm'|'lg'|'icon'|'icon-xs'|'icon-sm')} [props.size='icon-xs'] - 按钮尺寸。
 * @param {React.ReactNode} props.children - 按钮内容（通常是图标）。
 * @returns {JSX.Element}
 */
function AttachmentAction({ className, variant, size = 'icon-xs', ...props }) {
    return (
        <Button
            data-slot="attachment-action"
            variant={variant ?? 'ghost'}
            size={size}
            className={className}
            {...props}
        />
    );
}

/**
 * 多个附件的横向排布容器，支持滚动吸附与边缘渐隐。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - Attachment 列表。
 * @returns {JSX.Element}
 */
function AttachmentGroup({ className, ...props }) {
    return (
        <div
            data-slot="attachment-group"
            className={cn(
                'flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start',
                className
            )}
            {...props}
        />
    );
}

export {
    Attachment,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentContent,
    AttachmentTitle,
    AttachmentDescription,
    AttachmentActions,
    AttachmentAction,
};
