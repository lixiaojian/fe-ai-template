/**
 * @file 进度条组件族（Progress）
 * @description 基于 Base UI Progress 与 shadcn/ui Base UI（base-nova）风格的进度条组件，
 * 由 Progress > ProgressTrack > ProgressIndicator 组成。
 */

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from 'cn';

/**
 * 进度条根容器，承载当前进度值供 Track / Indicator 派生宽度。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {number|null} [props.value] - 当前进度（0-100）；传 null 为不确定态。
 * @param {React.ReactNode} [props.children] - 可选的 ProgressLabel / ProgressValue。
 * @returns {JSX.Element}
 */
function Progress({ className, children, value, ...props }) {
    return (
        <ProgressPrimitive.Root
            value={value}
            data-slot="progress"
            className={cn('flex flex-wrap gap-3', className)}
            {...props}
        >
            {children}
            <ProgressTrack>
                <ProgressIndicator />
            </ProgressTrack>
        </ProgressPrimitive.Root>
    );
}

/**
 * 进度条轨道（背景条）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function ProgressTrack({ className, ...props }) {
    return (
        <ProgressPrimitive.Track
            className={cn(
                'relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted',
                className
            )}
            data-slot="progress-track"
            {...props}
        />
    );
}

/**
 * 进度条指示条（前景条），宽度由 Base UI 按 value 计算。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function ProgressIndicator({ className, ...props }) {
    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn('h-full bg-primary transition-all', className)}
            {...props}
        />
    );
}

export { Progress, ProgressTrack, ProgressIndicator };
