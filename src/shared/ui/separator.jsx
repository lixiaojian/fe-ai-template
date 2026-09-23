/**
 * @file 分隔线组件（Separator）
 * @description 基于 Base UI Separator 与 shadcn/ui Base UI（base-nova）风格的分隔线组件，
 * 支持水平（horizontal）与垂直（vertical）两种方向，用于在视觉上分隔内容区域。
 */

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from 'cn';

/**
 * Separator 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('horizontal'|'vertical')} [props.orientation='horizontal'] - 分隔线方向。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生属性与 Base UI Separator 属性。
 * @returns {JSX.Element}
 */
function Separator(props) {
    const { className, orientation = 'horizontal', ...rest } = props;

    return (
        <SeparatorPrimitive
            data-slot="separator"
            orientation={orientation}
            className={cn(
                'shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
                className
            )}
            {...rest}
        />
    );
}

export { Separator };
