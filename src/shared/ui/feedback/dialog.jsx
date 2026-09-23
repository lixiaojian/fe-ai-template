/**
 * @file 对话框组件（Dialog）
 * @description 基于 Base UI Dialog 与项目平面直角风格（主色 #3860f4、零圆角）封装的模态对话框组件族，
 * 包含 Dialog、DialogTrigger、DialogPortal、DialogClose、DialogOverlay、DialogContent、
 * DialogHeader、DialogFooter、DialogTitle、DialogDescription。
 * 通过 Portal 渲染遮罩与弹层，提供焦点管理、键盘关闭（Esc）与无障碍支持。
 */

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@shared/ui/general/button';

/**
 * 内容区末元素的底部兜底间距。
 *
 * DialogContent 的内容区上下不留 padding（见 DialogContent 内注释），首尾间距由
 * DialogHeader / DialogFooter 自身的 p-5 提供；末元素不是 Footer 收尾的弹层
 *（如仅一行提示文案）会贴住下边框，故补 20px。
 *
 * 排除两种情况：末元素本身就是 DialogFooter，以及末元素是包裹了 Footer 的容器
 *（如 <form> 包住 Header/Footer 的写法），否则底栏会被顶起、下方露出弹层背景。
 */
const CONTENT_BOTTOM_SPACING =
    '[&>*:last-child:not([data-slot=dialog-footer]):not(:has([data-slot=dialog-footer]))]:mb-5';

/**
 * Dialog 根组件，管理打开状态（受控用 open/onOpenChange，非受控配合 DialogTrigger 使用）。
 * 默认点击遮罩时不关闭弹窗（disablePointerDismissal=true）。
 * @param {Object} props - 组件属性。
 * @param {boolean} [props.open] - 是否打开（受控模式）。
 * @param {(open: boolean, eventDetails: Object) => void} [props.onOpenChange] - 打开状态变化回调。
 * @param {boolean} [props.disablePointerDismissal=true] - 是否禁止点击遮罩关闭弹窗。
 * @param {React.ReactNode} props.children - 对话框内容。
 * @param {Object} props... - 其他 Base UI Dialog Root 属性。
 * @returns {JSX.Element}
 */
function Dialog(props) {
    const { children, disablePointerDismissal = true, ...rest } = props;
    return (
        <DialogPrimitive.Root
            data-slot="dialog"
            disablePointerDismissal={disablePointerDismissal}
            {...rest}
        >
            {children}
        </DialogPrimitive.Root>
    );
}

/**
 * DialogTrigger 组件，触发对话框打开的元素，默认渲染为按钮。
 * @param {Object} props - 组件属性。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素。
 * @param {Object} props... - 其他 Base UI Trigger 属性。
 * @returns {JSX.Element}
 */
function DialogTrigger(props) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/**
 * DialogPortal 组件，将对话框内容传送到 body 下的传送门容器。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 需要传送的内容。
 * @returns {JSX.Element}
 */
function DialogPortal(props) {
    const { children, ...rest } = props;
    return (
        <DialogPrimitive.Portal data-slot="dialog-portal" {...rest}>
            {children}
        </DialogPrimitive.Portal>
    );
}

/**
 * DialogClose 组件，点击后关闭对话框的元素。
 * @param {Object} props - 组件属性。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素。
 * @param {Object} props... - 其他 Base UI Close 属性。
 * @returns {JSX.Element}
 */
function DialogClose(props) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * DialogOverlay 组件，对话框背后的半透明遮罩层，通常由 DialogContent 内部渲染。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function DialogOverlay(props) {
    const { className, ...rest } = props;
    return (
        <DialogPrimitive.Backdrop
            data-slot="dialog-overlay"
            className={cn(
                'fixed inset-0 isolate z-50 bg-black/70 duration-200 supports-backdrop-filter:backdrop-blur-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
                className
            )}
            {...rest}
        />
    );
}

/**
 * DialogContent 组件，对话框主体内容容器，自带遮罩层与右上角关闭按钮。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.showCloseButton=true] - 是否显示右上角默认关闭按钮。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式。
 * @param {React.ReactNode} props.children - 对话框内容。
 * @returns {JSX.Element}
 */
function DialogContent(props) {
    const { className, children, showCloseButton = true, style, ...rest } = props;
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    'fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-8rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-sm',
                    'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                    className
                )}
                style={{ color: 'var(--text)', ...style }}
                {...rest}
            >
                <div className="relative flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                    {/* 仅内容区滚动；上下不留 padding，Header/Footer 紧贴首尾，
                        避免滚动时内容从 Header 上方 / Footer 下方漏出 */}
                    <div
                        className={cn(
                            'min-h-0 flex-1 overflow-y-auto px-5',
                            CONTENT_BOTTOM_SPACING
                        )}
                    >
                        {children}
                    </div>

                    {showCloseButton && (
                        <DialogPrimitive.Close
                            data-slot="dialog-close"
                            className="absolute top-3 right-3 z-20 text-muted-foreground hover:text-brand-text"
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground hover:bg-accent hover:text-brand-text"
                                />
                            }
                        >
                            <XIcon />
                            <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                    )}
                </div>
            </DialogPrimitive.Popup>
        </DialogPortal>
    );
}

/**
 * DialogHeader 组件，对话框头部区域，通常放置 DialogTitle 与 DialogDescription。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function DialogHeader(props) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="dialog-header"
            className={cn(
                '-mx-5 mb-3 sticky top-0 z-10 flex flex-col gap-1.5 rounded-t-2xl border-b border-border bg-soft p-5',
                className
            )}
            {...rest}
        />
    );
}

/**
 * DialogFooter 组件，对话框底部操作区域，可选自带关闭按钮。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.showCloseButton=false] - 是否显示默认"Close"关闭按钮。
 * @param {React.ReactNode} props.children - 底部内容（通常为按钮组）。
 * @returns {JSX.Element}
 */
function DialogFooter(props) {
    const { className, showCloseButton = false, children, ...rest } = props;
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                '-mx-5 mt-5 sticky bottom-0 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-border bg-soft p-5 sm:flex-row sm:justify-end',
                className
            )}
            {...rest}
        >
            {children}
            {showCloseButton && (
                <DialogPrimitive.Close render={<Button variant="outline" />}>
                    Close
                </DialogPrimitive.Close>
            )}
        </div>
    );
}

/**
 * DialogTitle 组件，对话框标题，提供无障碍标题语义。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他 Base UI Title 属性。
 * @returns {JSX.Element}
 */
function DialogTitle(props) {
    const { className, ...rest } = props;
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn(
                'text-base leading-none font-semibold tracking-wide text-foreground',
                className
            )}
            {...rest}
        />
    );
}

/**
 * DialogDescription 组件，对话框描述文字。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他 Base UI Description 属性。
 * @returns {JSX.Element}
 */
function DialogDescription(props) {
    const { className, ...rest } = props;
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn(
                'text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-brand-text',
                className
            )}
            {...rest}
        />
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};
