/**
 * @file 徽标组件（Badge）
 * @description 基于 Base UI useRender 与 shadcn/ui Base UI（base-nova）风格的 Badge 组件，
 * 用于展示状态、标签、折扣、HOT/NEW 等轻量标识。默认渲染 span，
 * 可通过 render 属性替换底层元素（如渲染为 <a> 或 Link）。
 */

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

/**
 * Badge 样式变体定义。
 * @see https://ui.shadcn.com/docs/components/badge
 */
const badgeVariants = cva(
    'inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground [a]:hover:bg-primary/80',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground [a]:hover:bg-destructive/80',
                outline: 'text-foreground',
                ghost: 'hover:bg-muted hover:text-muted-foreground',
                link: 'text-brand-text underline-offset-4 hover:underline',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

/**
 * Badge 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('default'|'secondary'|'destructive'|'outline'|'ghost'|'link')} [props.variant='default'] - 徽标变体。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素（如渲染为 <a> 或 Link）。
 * @param {React.HTMLAttributes<HTMLSpanElement>} props... - 其他原生 span 属性。
 * @returns {JSX.Element}
 */
function Badge({ className, variant = 'default', render, ...props }) {
    return useRender({
        defaultTagName: 'span',
        props: mergeProps(
            {
                className: cn(badgeVariants({ variant }), className),
            },
            props
        ),
        render,
        state: {
            slot: 'badge',
            variant,
        },
    });
}

export { Badge, badgeVariants };
