/**
 * @file 栅格行组件（Row）
 * @description 基于 CSS Grid 的 24 列栅格行，与 Col 配合使用。gutter 通过 column-gap /
 * row-gap 实现，单位 px。
 */

import { cn } from 'cn';

/** justify → Tailwind 的 justify-* 类。 */
const JUSTIFY_CLASS = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
};

/** align → Tailwind 的 items-* 类。 */
const ALIGN_CLASS = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
    stretch: 'items-stretch',
};

/**
 * 把 gutter 归一为 [水平, 垂直] 数字对。
 * @param {number|[number, number]} [gutter] - 单个数字（仅水平）或 [水平, 垂直]。
 * @returns {[number, number]} 归一后的间距对。
 */
function normalizeGutter(gutter) {
    if (Array.isArray(gutter)) {
        return [gutter[0] ?? 0, gutter[1] ?? 0];
    }
    return [gutter ?? 0, 0];
}

/**
 * Row 组件，栅格行。
 * @param {Object} props - 组件属性。
 * @param {number|[number, number]} [props.gutter=0] - 列间距，数字或 [水平, 垂直]，单位 px。
 * @param {('start'|'end'|'center'|'space-between'|'space-around'|'space-evenly')} [props.justify] - 水平排列。
 * @param {('top'|'middle'|'bottom'|'stretch')} [props.align] - 垂直对齐。
 * @param {boolean} [props.wrap=true] - 是否允许换行。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式，与间距样式合并。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Row(props) {
    const { gutter = 0, justify, align, wrap = true, className, style, ...rest } = props;
    const [horizontalGap, verticalGap] = normalizeGutter(gutter);

    return (
        <div
            data-slot="row"
            className={cn(
                'grid grid-cols-24',
                wrap ? 'flex-wrap' : undefined,
                justify ? JUSTIFY_CLASS[justify] : undefined,
                align ? ALIGN_CLASS[align] : undefined,
                className
            )}
            style={
                horizontalGap || verticalGap
                    ? { columnGap: horizontalGap, rowGap: verticalGap, ...style }
                    : style
            }
            {...rest}
        />
    );
}

export { Row };
