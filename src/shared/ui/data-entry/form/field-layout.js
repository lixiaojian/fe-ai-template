/**
 * @file 表单布局解析
 * @description 把 antd 的 labelCol / wrapperCol 归一为 Row/Col 组件可用的 props。
 * 只做形状归一，具体类名由 Col 组件负责。
 */

/** horizontal 布局下 label 的默认栅格。 */
const DEFAULT_LABEL_COL = { span: 6 };

/** horizontal 布局下控件区的默认栅格。 */
const DEFAULT_WRAPPER_COL = { span: 18 };

/**
 * 把 labelCol / wrapperCol 归一为 Col 的 props。
 * @param {number|Object|null|undefined} col - antd 的 col 配置：数字视为 span，对象原样传递。
 * @returns {Object|undefined} Col 的 props；未配置时返回 undefined。
 */
function normalizeColProps(col) {
    if (col === undefined || col === null) {
        return undefined;
    }
    if (typeof col === 'number') {
        return { span: col };
    }
    return { ...col };
}

export { normalizeColProps, DEFAULT_LABEL_COL, DEFAULT_WRAPPER_COL };
