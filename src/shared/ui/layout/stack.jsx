/**
 * @file 堆叠布局组件（Stack）
 * @description 基于 flex 布局的间距容器组件，通过 gap 与 direction 属性控制
 * 子元素之间的间距与排列方向。间距支持预设档位（sm/md/lg/xlg，对应 8/16/24/32px）、
 * 数字（按 px 处理）或任意 CSS 长度字符串。外部可通过 className 覆盖或补充
 * 对齐、换行等 flex 工具类。
 */

import { cn } from 'cn';

/**
 * 间距预设档位映射表，与 Tailwind 间距刻度一致（sm=8px、md=16px、lg=24px、xlg=32px）。
 * 预设档位使用 Tailwind 原生类；数字与字符串值因无法被 Tailwind 静态扫描，
 * 改为内联 style 输出。
 */
const GAP_PRESETS = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xlg: 'gap-8',
};

/**
 * 将 gap 属性值解析为 CSS 长度值（预设档位返回 undefined，走 Tailwind 类）。
 * @param {('sm'|'md'|'lg'|'xlg'|number|string)} gap - 预设档位、数字（px）或 CSS 长度字符串。
 * @returns {string|undefined} CSS gap 长度值；预设档位时为 undefined。
 */
function resolveGapValue(gap) {
    if (typeof gap === 'number') {
        return `${gap}px`;
    }
    return GAP_PRESETS[gap] ? undefined : gap;
}

/**
 * Stack 组件，带间距的堆叠容器。
 * @param {Object} props - 组件属性。
 * @param {('sm'|'md'|'lg'|'xlg'|number|string)} [props.gap='md'] - 子元素间距，
 *   预设档位（8/16/24/32px）、数字（按 px 处理）或 CSS 长度字符串（如 '1.5rem'）。
 * @param {('horizontal'|'vertical')} [props.direction='vertical'] - 排列方向。
 * @param {string} [props.className] - 额外的样式类名，可补充 items-center、flex-wrap 等工具类。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式，与间距样式合并。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Stack(props) {
    const { gap = 'md', direction = 'vertical', className, style, ...rest } = props;

    const gapValue = resolveGapValue(gap);

    return (
        <div
            data-slot="stack"
            className={cn(
                'flex',
                direction === 'horizontal' ? 'flex-row' : 'flex-col',
                typeof gap === 'string' ? GAP_PRESETS[gap] : undefined,
                className
            )}
            style={gapValue ? { gap: gapValue, ...style } : style}
            {...rest}
        />
    );
}

export { Stack };
