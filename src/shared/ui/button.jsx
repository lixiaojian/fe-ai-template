/**
 * @file 按钮组件（Button）
 * @description 基于 Base UI Button 与 shadcn/ui Base UI（base-nova）风格封装的按钮组件。
 * 支持变体（variant）、尺寸（size）与 render 组合，可通过 React.forwardRef 转发 ref。
 */

import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

/**
 * Button 样式变体定义。
 * @see https://ui.shadcn.com/docs/components/button
 */
const buttonVariants = cva(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                outline: 'border-border bg-soft hover:bg-muted hover:text-foreground',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'hover:bg-muted hover:text-foreground',
                link: 'text-brand-text underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 rounded-md px-3',
                lg: 'h-11 rounded-md px-8',
                icon: 'h-10 w-10',
                'icon-xs': 'size-6',
                'icon-sm': 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

/**
 * Button 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('default'|'outline'|'ghost'|'secondary'|'destructive'|'link')} [props.variant='default'] - 按钮样式变体。
 * @param {('default'|'sm'|'lg'|'icon'|'icon-xs'|'icon-sm')} [props.size='default'] - 按钮尺寸。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素（如渲染为 <a> 或 Link）。
 * @param {React.ReactNode} props.children - 按钮内容。
 * @param {React.Ref<HTMLElement>} ref - 转发到 Base UI Button 的 ref。
 * @returns {JSX.Element}
 */
const Button = React.forwardRef(
    ({ className, variant = 'default', size = 'default', render, children, ...props }, ref) => {
        // render 为字符串标签的非 <button> 元素（如 <a>）时关闭原生按钮语义，
        // 避免 Base UI "expected a native <button>" 警告；组件类型无法静态判断，保持默认
        const isNativeRender =
            !React.isValidElement(render) ||
            typeof render.type !== 'string' ||
            render.type === 'button';

        return (
            <ButtonPrimitive
                ref={ref}
                data-slot="button"
                nativeButton={isNativeRender}
                className={cn(buttonVariants({ variant, size }), className)}
                render={render}
                {...props}
            >
                {children}
            </ButtonPrimitive>
        );
    }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
