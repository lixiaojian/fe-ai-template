/**
 * @file 栅格列组件（Col）
 * @description 基于 CSS Grid 的 24 列栅格列，与 Row 配合使用。span 与 offset 映射为
 * col-span-* / col-start-* 类名（对应工具类由 src/shared/styles/index.css 的
 * @source inline 指令预先生成）；push / pull 是相对位移，走内联 style。
 */

import { cn } from 'cn';

/** 栅格总列数，与 antd 一致。 */
const GRID_COLUMNS = 24;

/** antd 断点 → Tailwind 前缀。antd 的 xxl(≥1600px) 无同名断点，映射到 2xl(≥1536px)。 */
const BREAKPOINT_PREFIX = {
    xs: '',
    sm: 'sm:',
    md: 'md:',
    lg: 'lg:',
    xl: 'xl:',
    xxl: '2xl:',
};

/** 断点属性名，顺序即类名输出顺序。 */
const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

/** 由 Col 自身消费、不应透传到 DOM 的属性。 */
const GRID_PROPS = ['span', 'offset', 'push', 'pull', ...BREAKPOINTS];

/**
 * 把一档栅格配置归一为对象形式。
 * @param {number|Object} value - 数字视为 span。
 * @returns {Object} 含 span / offset / push / pull 的对象。
 */
function normalize(value) {
    return typeof value === 'number' ? { span: value } : value || {};
}

/**
 * 计算 Col 的类名字符串。只处理能表达为静态工具类的部分（span / offset）。
 * @param {Object} props - Col 的属性。
 * @param {number} [props.span] - 占几列（0-24）。
 * @param {number} [props.offset] - 左侧空出几列。
 * @param {number|Object} [props.xs] - xs 断点配置，sm~xxl 同理。
 * @returns {string} 类名字符串（可能为空串）。
 */
function colClassName(props) {
    const classes = [];

    const collect = (config, prefix) => {
        if (config.span !== undefined) {
            classes.push(`${prefix}col-span-${config.span}`);
        }
        if (config.offset !== undefined) {
            classes.push(`${prefix}col-start-${config.offset + 1}`);
        }
    };

    collect(normalize({ span: props.span, offset: props.offset }), '');

    for (const breakpoint of BREAKPOINTS) {
        if (props[breakpoint] !== undefined) {
            collect(normalize(props[breakpoint]), BREAKPOINT_PREFIX[breakpoint]);
        }
    }

    return classes.join(' ');
}

/**
 * 计算 push / pull 的位移内联样式。百分比无法预生成静态工具类，故用内联 style。
 * @param {Object} props - Col 的属性。
 * @param {number} [props.push] - 向右位移几列。
 * @param {number} [props.pull] - 向左位移几列。
 * @param {number|Object} [props.xs] - xs 断点配置，sm~xxl 同理（取其 push / pull）。
 * @returns {Object|undefined} 内联样式；无需位移时返回 undefined。
 */
function colStyle(props) {
    const style = {};

    const collect = (config) => {
        // push 与 pull 同时给出时两者都写（与 antd 的 left/right 并存一致）
        if (config.push !== undefined) {
            style.left = `${((config.push / GRID_COLUMNS) * 100).toFixed(4)}%`;
        }
        if (config.pull !== undefined) {
            style.right = `${((config.pull / GRID_COLUMNS) * 100).toFixed(4)}%`;
        }
    };

    collect(normalize({ push: props.push, pull: props.pull }));

    for (const breakpoint of BREAKPOINTS) {
        if (props[breakpoint] !== undefined) {
            collect(normalize(props[breakpoint]));
        }
    }

    if (Object.keys(style).length === 0) {
        return undefined;
    }

    // 只在真有位移时才加 relative，避免给所有 Col 引入无谓的定位上下文
    return { position: 'relative', ...style };
}

/**
 * Col 组件，栅格列。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.CSSProperties} [props.style] - 额外的内联样式，与位移样式合并。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Col(props) {
    // 栅格属性全部由 colClassName / colStyle 消费，不能随 ...rest 漏到 DOM 上。
    // 断点属性不逐个解构（避免大量未使用变量的告警），改为显式挑出剩余属性。
    const { className, style, ...rest } = props;
    for (const key of GRID_PROPS) {
        delete rest[key];
    }
    const offsetStyle = colStyle(props);

    return (
        <div
            data-slot="col"
            className={cn(colClassName(props), className)}
            style={offsetStyle ? { ...offsetStyle, ...style } : style}
            {...rest}
        />
    );
}

export { Col, colClassName, colStyle };
