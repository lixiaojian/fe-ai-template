/**
 * @file 骨架屏组件（Skeleton）
 * @description 用于在数据加载时展示占位骨架，支持自定义尺寸与样式。
 */

import { cn } from 'cn';

/**
 * Skeleton 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {boolean} [props.animated=true] - 是否播放脉冲动画。加载中传 true；
 *                                          加载已结束但无数据可展示时传 false，只留一块静态等高占位。
 * @returns {JSX.Element}
 */
function Skeleton({ className, animated = true, ...props }) {
    return (
        <div
            data-slot="skeleton"
            className={cn('rounded-md bg-muted', animated && 'animate-pulse', className)}
            {...props}
        />
    );
}

export { Skeleton };
