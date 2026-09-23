import { cn } from 'cn';

/**
 * @file 表格组件族（Table）
 * @description 基于 shadcn/ui 的 Table 组件族，渲染为带横向滚动容器的原生 table 结构。
 * 包含 Table、TableHeader、TableBody、TableFooter、TableRow、TableHead、TableCell、
 * TableCaption。样式通过 className 扩展，语义色跟随主题变量。
 */

/**
 * Table 根组件，渲染为带 overflow-x-auto 容器的 table 元素。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 追加到 table 元素的样式类名。
 * @param {Object} props... - 其他原生 table 属性。
 * @returns {JSX.Element}
 */
function Table({ className, ...props }) {
    return (
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
            <table
                data-slot="table"
                className={cn('w-full caption-bottom text-sm', className)}
                {...props}
            />
        </div>
    );
}

/**
 * TableHeader 组件，表头容器（thead）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 thead 属性。
 * @returns {JSX.Element}
 */
function TableHeader({ className, ...props }) {
    return (
        <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
    );
}

/**
 * TableBody 组件，表体容器（tbody）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 tbody 属性。
 * @returns {JSX.Element}
 */
function TableBody({ className, ...props }) {
    return (
        <tbody
            data-slot="table-body"
            className={cn('[&_tr:last-child]:border-0', className)}
            {...props}
        />
    );
}

/**
 * TableFooter 组件，表尾容器（tfoot）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 tfoot 属性。
 * @returns {JSX.Element}
 */
function TableFooter({ className, ...props }) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
            {...props}
        />
    );
}

/**
 * TableRow 组件，表格行（tr），自带 border-b 与 hover 过渡。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 tr 属性。
 * @returns {JSX.Element}
 */
function TableRow({ className, ...props }) {
    return (
        <tr
            data-slot="table-row"
            className={cn(
                'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
                className
            )}
            {...props}
        />
    );
}

/**
 * TableHead 组件，表头单元格（th）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 th 属性。
 * @returns {JSX.Element}
 */
function TableHead({ className, ...props }) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                'h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0',
                className
            )}
            {...props}
        />
    );
}

/**
 * TableCell 组件，表格单元格（td）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 td 属性。
 * @returns {JSX.Element}
 */
function TableCell({ className, ...props }) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
                className
            )}
            {...props}
        />
    );
}

/**
 * TableCaption 组件，表格标题（caption）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 caption 属性。
 * @returns {JSX.Element}
 */
function TableCaption({ className, ...props }) {
    return (
        <caption
            data-slot="table-caption"
            className={cn('mt-4 text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
