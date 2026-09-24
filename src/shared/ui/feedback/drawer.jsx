/**
 * @file 抽屉组件（Drawer）
 * @description 基于 Base UI Drawer 封装的侧边抽屉组件族，包含 Drawer、DrawerTrigger、
 * DrawerPortal、DrawerClose、DrawerOverlay、DrawerSwipeHandle、DrawerContent、
 * DrawerHeader、DrawerFooter、DrawerTitle、DrawerDescription。
 * 与 Dialog 同源的弹层语义（Portal 渲染、焦点管理、Esc 关闭），差别在于从屏幕边缘滑出，
 * 支持拖拽方向（swipeDirection）、吸附点（snapPoints）与手势关闭。
 */

import * as React from 'react';
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from 'cn';

/** Drawer 根组件与内容区之间的配置传递（内容区需要按方向决定滑动轴与遮罩行为）。 */
const DrawerContext = React.createContext(null);

/**
 * 读取 Drawer 上下文。
 * @returns {{hasSnapPoints: boolean, modal: boolean, showSwipeHandle: boolean, swipeDirection: string}} 配置对象。
 * @throws {Error} 不在 Drawer 内使用时抛出。
 */
function useDrawer() {
    const context = React.useContext(DrawerContext);

    if (!context) {
        throw new Error('useDrawer must be used within a Drawer.');
    }

    return context;
}

/**
 * Drawer 根组件，管理打开状态与滑动方向。
 * @param {Object} props - 组件属性。
 * @param {boolean} [props.modal=true] - 是否模态；非模态时不渲染遮罩、不锁定页面滚动。
 * @param {boolean} [props.showSwipeHandle=false] - 是否显示顶部/侧边的拖拽把手。
 * @param {Array<string|number>} [props.snapPoints] - 吸附点，如 ['148px', 1]。
 * @param {('down'|'up'|'left'|'right')} [props.swipeDirection='down'] - 滑出方向与拖拽轴。
 * @param {React.ReactNode} props.children - 抽屉内容。
 * @param {Object} props... - 其他 Base UI Drawer Root 属性（如 open / onOpenChange）。
 * @returns {JSX.Element}
 */
function Drawer({
    modal = true,
    showSwipeHandle = false,
    snapPoints,
    swipeDirection = 'down',
    ...props
}) {
    const hasSnapPoints = snapPoints != null && snapPoints.length > 0;
    const contextValue = React.useMemo(
        () => ({ hasSnapPoints, modal, showSwipeHandle, swipeDirection }),
        [hasSnapPoints, modal, showSwipeHandle, swipeDirection]
    );

    return (
        <DrawerContext.Provider value={contextValue}>
            <DrawerPrimitive.Root
                data-slot="drawer"
                modal={modal}
                snapPoints={snapPoints}
                swipeDirection={swipeDirection}
                {...props}
            />
        </DrawerContext.Provider>
    );
}

/**
 * DrawerTrigger 组件，触发抽屉打开的元素，默认渲染为按钮。
 * @param {Object} props - 组件属性。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素。
 * @param {Object} props... - 其他 Base UI Trigger 属性。
 * @returns {JSX.Element}
 */
function DrawerTrigger({ ...props }) {
    return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

/**
 * DrawerPortal 组件，将抽屉传送到 body 下的传送门容器。
 * @param {React.ReactNode} props.children - 需要传送的内容。
 * @param {Object} props... - 其他 Base UI Portal 属性。
 * @returns {JSX.Element}
 */
function DrawerPortal({ ...props }) {
    return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

/**
 * DrawerClose 组件，点击后关闭抽屉的元素。
 * @param {Object} props - 组件属性。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素。
 * @param {Object} props... - 其他 Base UI Close 属性。
 * @returns {JSX.Element}
 */
function DrawerClose({ ...props }) {
    return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

/**
 * DrawerOverlay 组件，抽屉遮罩。非模态时由 DrawerContent 决定不渲染。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他 Base UI Backdrop 属性。
 * @returns {JSX.Element}
 */
function DrawerOverlay({ className, ...props }) {
    return (
        <DrawerPrimitive.Backdrop
            data-slot="drawer-overlay"
            className={cn(
                'fixed inset-0 z-50 min-h-dvh bg-black/10 opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] select-none data-ending-style:pointer-events-none data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-snap-points:[--drawer-overlay-min-opacity:0.5] data-starting-style:opacity-0 data-swiping:duration-0 supports-backdrop-filter:backdrop-blur-xs supports-[-webkit-touch-callout:none]:absolute',
                className
            )}
            {...props}
        />
    );
}

/**
 * DrawerSwipeHandle 组件，拖拽把手。仅在 Drawer 的 showSwipeHandle 为 true 时由内容区渲染。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function DrawerSwipeHandle({ className, ...props }) {
    return (
        <div
            data-slot="drawer-swipe-handle"
            aria-hidden="true"
            className={cn(
                'relative z-10 flex shrink-0 cursor-grab transition-opacity duration-200 group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-[swipe-axis=x]/drawer-popup:h-full group-data-[swipe-axis=x]/drawer-popup:w-3 group-data-[swipe-axis=x]/drawer-popup:items-center group-data-[swipe-axis=y]/drawer-popup:h-3 group-data-[swipe-axis=y]/drawer-popup:w-full group-data-[swipe-axis=y]/drawer-popup:justify-center group-data-[swipe-direction=down]/drawer-popup:items-end group-data-[swipe-direction=left]/drawer-popup:order-last group-data-[swipe-direction=left]/drawer-popup:justify-start group-data-[swipe-direction=right]/drawer-popup:justify-end group-data-[swipe-direction=up]/drawer-popup:order-last group-data-[swipe-direction=up]/drawer-popup:items-start after:block after:shrink-0 after:rounded-full after:bg-muted group-data-[swipe-axis=x]/drawer-popup:after:h-24 group-data-[swipe-axis=x]/drawer-popup:after:w-1 group-data-[swipe-axis=y]/drawer-popup:after:h-1 group-data-[swipe-axis=y]/drawer-popup:after:w-24 active:cursor-grabbing',
                className
            )}
            {...props}
        />
    );
}

/**
 * DrawerContent 组件，抽屉主体。自带 Portal、遮罩与视口，模态时才渲染遮罩。
 * 尺寸由 swipeDirection 决定：左右方向默认宽 75%（sm 及以上 24rem），上下方向高度自适应。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} props.children - 抽屉内的内容（通常为 Header / 正文 / Footer）。
 * @param {Object} props... - 其他 Base UI Popup 属性。
 * @returns {JSX.Element}
 */
function DrawerContent({ className, children, ...props }) {
    const { hasSnapPoints, modal, showSwipeHandle, swipeDirection } = useDrawer();
    const swipeAxis = swipeDirection === 'down' || swipeDirection === 'up' ? 'y' : 'x';

    return (
        <DrawerPortal data-slot="drawer-portal">
            {modal === true && <DrawerOverlay data-snap-points={hasSnapPoints ? '' : undefined} />}
            <DrawerPrimitive.Viewport
                data-slot="drawer-viewport"
                data-modal={modal}
                className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
            >
                <DrawerPrimitive.Popup
                    data-slot="drawer-popup"
                    data-swipe-axis={swipeAxis}
                    data-snap-points={hasSnapPoints ? '' : undefined}
                    className={cn(
                        // Base.
                        'group/drawer-popup pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col bg-popover text-sm text-popover-foreground transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform outline-none select-none [interpolate-size:allow-keywords] data-[swipe-direction=down]:rounded-t-xl data-[swipe-direction=down]:border-t data-[swipe-direction=left]:rounded-r-xl data-[swipe-direction=left]:border-r data-[swipe-direction=right]:rounded-l-xl data-[swipe-direction=right]:border-l data-[swipe-direction=up]:rounded-b-xl data-[swipe-direction=up]:border-b',
                        // Nested.
                        'data-nested-drawer-open:overflow-hidden data-nested-drawer-open:brightness-95',
                        // Bleed.
                        'after:pointer-events-none after:absolute after:bg-(--drawer-bleed-background,var(--color-popover)) data-[swipe-axis=x]:after:inset-y-0 data-[swipe-axis=x]:after:w-(--bleed) data-[swipe-axis=y]:after:inset-x-0 data-[swipe-axis=y]:after:h-(--bleed) data-[swipe-direction=down]:after:top-full data-[swipe-direction=left]:after:right-full data-[swipe-direction=right]:after:left-full data-[swipe-direction=up]:after:bottom-full',
                        // Sizing.
                        '[--drawer-content-height:var(--drawer-height,auto)] data-[swipe-axis=x]:[--drawer-content-width:75%] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)] data-[swipe-axis=y]:data-snap-points:[--drawer-content-height:100dvh] data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]',
                        // Stack.
                        '[--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05]',
                        // Transitions.
                        'data-ending-style:transform-(--closed-transform) data-ending-style:opacity-[0.9999] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-nested-drawer-swiping:duration-0 data-ending-style:data-nested-drawer-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-(--closed-transform) data-swiping:duration-0 data-ending-style:data-swiping:duration-[calc(var(--drawer-swipe-strength)*400ms)]',
                        // Axis: y.
                        'data-[swipe-axis=y]:inset-x-0 data-[swipe-axis=y]:data-nested-drawer-open:h-(--stack-height)',
                        // Axis: x.
                        'data-[swipe-axis=x]:inset-y-0 data-[swipe-axis=x]:flex-row',
                        // Direction: down.
                        'data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:origin-bottom data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]',
                        // Direction: up.
                        'data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:origin-top data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]',
                        // Direction: left.
                        'data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:origin-left data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]',
                        // Direction: right.
                        'data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:origin-right data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]',
                        className
                    )}
                    {...props}
                >
                    {showSwipeHandle && <DrawerSwipeHandle />}
                    <DrawerPrimitive.Content
                        data-slot="drawer-content"
                        className={cn(
                            'flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-swiping/drawer-popup:select-none'
                        )}
                    >
                        {children}
                    </DrawerPrimitive.Content>
                </DrawerPrimitive.Popup>
            </DrawerPrimitive.Viewport>
        </DrawerPortal>
    );
}

/**
 * DrawerHeader 组件，抽屉头部容器（通常放 Title / Description）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function DrawerHeader({ className, ...props }) {
    return (
        <div
            data-slot="drawer-header"
            className={cn(
                'flex shrink-0 flex-col gap-0.5 p-4 pb-0 group-data-[swipe-axis=y]/drawer-popup:text-center md:gap-0.5 md:text-left',
                className
            )}
            {...props}
        />
    );
}

/**
 * DrawerFooter 组件，抽屉底部容器，用 mt-auto 顶到内容区末尾。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function DrawerFooter({ className, ...props }) {
    return (
        <div
            data-slot="drawer-footer"
            className={cn('mt-auto flex shrink-0 flex-col gap-2 p-4 pt-0', className)}
            {...props}
        />
    );
}

/**
 * DrawerTitle 组件，抽屉标题，供无障碍读取。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他 Base UI Title 属性。
 * @returns {JSX.Element}
 */
function DrawerTitle({ className, ...props }) {
    return (
        <DrawerPrimitive.Title
            data-slot="drawer-title"
            className={cn('text-base font-medium text-foreground', className)}
            {...props}
        />
    );
}

/**
 * DrawerDescription 组件，抽屉的补充说明文字，供无障碍读取。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他 Base UI Description 属性。
 * @returns {JSX.Element}
 */
function DrawerDescription({ className, ...props }) {
    return (
        <DrawerPrimitive.Description
            data-slot="drawer-description"
            className={cn('text-sm text-balance text-muted-foreground', className)}
            {...props}
        />
    );
}

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerSwipeHandle,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
};
