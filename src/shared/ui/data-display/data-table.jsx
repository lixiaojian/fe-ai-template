import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

/**
 * @file 通用数据表格（DataTable）
 * @description 在 Table 组件族之上封装 dataSource + columns 的声明式用法：列配置驱动
 * 表头与单元格渲染，内置加载中 / 错误 / 空数据三种整行占位状态（优先级：错误 > 加载中 >
 * 空数据 > 数据行）。需要更细粒度的控制（如分组表头、表尾、行合并）时仍可直接使用
 * Table 组件族自行组装。
 */

/**
 * DataTable 列配置。
 * @typedef {Object} TableColumn
 * @property {string} key - 列唯一标识，同时作为默认取值字段。
 * @property {string} [dataIndex] - 单元格取值字段名，默认取 key。
 * @property {React.ReactNode} [title] - 表头内容。
 * @property {(value: *, row: Object, index: number) => React.ReactNode} [render] - 自定义单元格渲染，入参为单元格值、行数据、行下标；缺省直接渲染取值。
 * @property {string} [className] - 单元格（td）类名。
 * @property {string} [headClassName] - 表头单元格（th）类名。
 * @property {Object} [headProps] - 表头单元格的其他属性（如 onClick）。
 * @property {Object|((value: *, row: Object, index: number) => Object)} [cellProps] - 单元格的其他属性（如 onClick）；传函数时按行求值。
 */

/**
 * 加载中占位文案默认值。
 */
const DEFAULT_LOADING_TEXT = '加载中…';

/**
 * 空数据占位文案默认值。
 */
const DEFAULT_EMPTY_TEXT = '暂无数据';

/**
 * 通用数据表格。
 *
 * @param {Object} props - 组件属性。
 * @param {Array<Object>} [props.dataSource=[]] - 数据源。
 * @param {Array<TableColumn>} [props.columns=[]] - 列配置。
 * @param {string|((row: Object, index: number) => string|number)} [props.rowKey] - 行 key：字段名或取值函数，缺省用行下标。
 * @param {boolean} [props.loading=false] - 是否加载中；为 true 时渲染整行 loading 占位。
 * @param {React.ReactNode} [props.loadingText='加载中…'] - 加载中占位文案；传 null 时仅展示加载图标。
 * @param {React.ReactNode} [props.error=null] - 错误内容；非空时渲染整行错误占位（优先级高于 loading）。
 * @param {React.ReactNode} [props.empty='暂无数据'] - 空数据占位内容。
 * @param {string} [props.className] - 追加到 Table 的类名。
 * @param {Object} props... - 其他透传给 Table 的属性。
 * @returns {JSX.Element}
 */
export function DataTable(props) {
    const {
        dataSource = [],
        columns = [],
        rowKey,
        loading = false,
        loadingText = DEFAULT_LOADING_TEXT,
        error = null,
        empty = DEFAULT_EMPTY_TEXT,
        className,
        ...rest
    } = props;

    /**
     * 取行 key。
     * @param {Object} row - 行数据。
     * @param {number} index - 行下标。
     * @returns {string|number}
     */
    const getRowKey = (row, index) => {
        if (typeof rowKey === 'function') {
            return rowKey(row, index);
        }
        if (rowKey && row[rowKey] !== undefined) {
            return row[rowKey];
        }
        return index;
    };

    /**
     * 渲染整行占位内容（loading / 错误 / 空数据共用）。
     * @param {React.ReactNode} content - 占位内容。
     * @returns {JSX.Element}
     */
    const renderStateRow = (content) => (
        <TableRow>
            <TableCell colSpan={columns.length} className="py-12 text-center text-(--text-3)">
                {content}
            </TableCell>
        </TableRow>
    );

    /**
     * 渲染加载中占位内容：图标与文案纵向居中排列，文案缺省时只渲染图标。
     * @returns {JSX.Element}
     */
    const renderLoadingContent = () => (
        <div className="flex flex-col items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            {loadingText ? <span>{loadingText}</span> : null}
        </div>
    );

    let bodyRows;
    if (error) {
        bodyRows = renderStateRow(error);
    } else if (loading) {
        bodyRows = renderStateRow(renderLoadingContent());
    } else if (!dataSource.length) {
        bodyRows = renderStateRow(empty);
    } else {
        bodyRows = dataSource.map((row, index) => (
            <TableRow key={getRowKey(row, index)}>
                {columns.map((column) => {
                    const value = row[column.dataIndex || column.key];
                    const cellProps =
                        typeof column.cellProps === 'function'
                            ? column.cellProps(value, row, index)
                            : column.cellProps;
                    return (
                        <TableCell key={column.key} className={column.className} {...cellProps}>
                            {column.render ? column.render(value, row, index) : value}
                        </TableCell>
                    );
                })}
            </TableRow>
        ));
    }

    return (
        <Table className={className} {...rest}>
            <TableHeader>
                <TableRow>
                    {columns.map((column) => (
                        <TableHead
                            key={column.key}
                            className={column.headClassName}
                            {...column.headProps}
                        >
                            {column.title}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>{bodyRows}</TableBody>
        </Table>
    );
}
