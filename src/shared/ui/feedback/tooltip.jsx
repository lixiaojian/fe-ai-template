/**
 * @file 提示气泡组件（Tooltip）
 * @description 基于 Base UI Tooltip 与项目平面直角风格（主色 #3860f4、零圆角）封装的悬浮提示组件族，
 * 包含 Tooltip、TooltipTrigger、TooltipContent、TooltipProvider。
 * Tooltip 内部已包含 Provider，可直接单独使用；Trigger 默认渲染为按钮，
 * 通常通过 render 属性替换为实际元素。
 */

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from 'cn';

/**
 * TooltipProvider 组件，为其子树内的 Tooltip 提供共享配置（如打开延迟）。
 * @param {Object} props - 组件属性。
 * @param {number} [props.delay=0] - 悬浮后打开提示的延迟毫秒数。
 * @param {React.ReactNode} props.children - 子元素。
 * @param {Object} props... - 其他 Base UI Provider 属性。
 * @returns {JSX.Element}
 */
function TooltipProvider(props) {
    const { delay = 0, ...rest } = props;
    return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...rest} />;
}

/**
 * Tooltip 根组件，管理提示的打开状态（受控用 open/onOpenChange，非受控配合悬浮触发）。
 * 内部自带 Provider，可与 TooltipTrigger、TooltipContent 组合使用。
 * @param {Object} props - 组件属性。
 * @param {boolean} [props.open] - 是否打开（受控模式）。
 * @param {(open: boolean, eventDetails: Object) => void} [props.onOpenChange] - 打开状态变化回调。
 * @param {React.ReactNode} props.children - 触发元素与提示内容。
 * @param {Object} props... - 其他 Base UI Root 属性。
 * @returns {JSX.Element}
 */
function Tooltip(props) {
    return (
        <TooltipProvider>
            <TooltipPrimitive.Root data-slot="tooltip" {...props} />
        </TooltipProvider>
    );
}

/**
 * TooltipTrigger 组件，触发提示打开的元素，默认渲染为按钮。
 * @param {Object} props - 组件属性。
 * @param {React.ReactElement} [props.render] - Base UI 的 render 属性，用于替换底层元素。
 * @param {Object} props... - 其他 Base UI Trigger 属性。
 * @returns {JSX.Element}
 */
function TooltipTrigger(props) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * TooltipContent 组件，提示气泡内容，通过 Portal 渲染到 body 并自动定位在触发元素旁。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('top'|'bottom'|'left'|'right'|'top-start'|'top-end'|'bottom-start'|'bottom-end'|'left-start'|'left-end'|'right-start'|'right-end')} [props.side='top'] - 气泡相对触发元素的方向。
 * @param {number} [props.sideOffset=4] - 气泡与触发元素的间距（像素）。
 * @param {React.ReactNode} props.children - 气泡内容。
 * @param {Object} props... - 其他 Base UI Popup 属性。
 * @returns {JSX.Element}
 */
function TooltipContent(props) {
    const { className, side = 'top', sideOffset = 4, children, ...rest } = props;
    return (
        <TooltipPrimitive.Portal data-slot="tooltip-portal">
            <TooltipPrimitive.Positioner
                data-slot="tooltip-positioner"
                side={side}
                sideOffset={sideOffset}
                className="z-50"
            >
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cn(
                        'z-50 w-fit max-w-72 rounded-md border border-border bg-card px-3 py-1.5 text-xs break-all text-foreground shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
                        'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className
                    )}
                    {...rest}
                >
                    {children}
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
