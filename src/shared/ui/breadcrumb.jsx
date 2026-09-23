/**
 * @file 面包屑组件（Breadcrumb）
 * @description 基于 shadcn/ui Base UI（base-nova）风格的面包屑导航组件族，
 * 包含 Breadcrumb、BreadcrumbList、BreadcrumbItem、BreadcrumbLink、BreadcrumbPage、
 * BreadcrumbSeparator、BreadcrumbEllipsis。支持暗色平面直角主题下的路径导航。
 */

import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from 'cn';

/**
 * Breadcrumb 根组件，渲染为 nav 并自动添加 aria-label。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 面包屑列表。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 nav 属性。
 * @returns {JSX.Element}
 */
function Breadcrumb(props) {
    const { className, ...rest } = props;
    return (
        <nav
            aria-label="breadcrumb"
            data-slot="breadcrumb"
            className={cn('inline-flex', className)}
            {...rest}
        />
    );
}

/**
 * BreadcrumbList 组件，面包屑项的有序列表容器。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 面包屑条目。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 ol 属性。
 * @returns {JSX.Element}
 */
function BreadcrumbList(props) {
    const { className, ...rest } = props;
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn(
                'flex flex-wrap items-center gap-1.5 break-words text-sm text-(--text-2)',
                className
            )}
            {...rest}
        />
    );
}

/**
 * BreadcrumbItem 组件，单个面包屑条目容器。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 条目内容。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 li 属性。
 * @returns {JSX.Element}
 */
function BreadcrumbItem(props) {
    const { className, ...rest } = props;
    return (
        <li
            data-slot="breadcrumb-item"
            className={cn('inline-flex items-center gap-1.5', className)}
            {...rest}
        />
    );
}

/**
 * BreadcrumbLink 组件，可点击的面包屑链接。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 链接文本。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 a 属性。
 * @returns {JSX.Element}
 */
function BreadcrumbLink(props) {
    const { className, ...rest } = props;
    return (
        <a
            data-slot="breadcrumb-link"
            className={cn('cursor-pointer transition-colors hover:text-brand-hi', className)}
            {...rest}
        />
    );
}

/**
 * BreadcrumbPage 组件，当前页面包屑（不可点击）。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 当前页面文本。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {Object} props... - 其他原生 span 属性。
 * @returns {JSX.Element}
 */
function BreadcrumbPage(props) {
    const { className, ...rest } = props;
    return (
        <span
            aria-current="page"
            data-slot="breadcrumb-page"
            className={cn('font-normal text-(--text)', className)}
            {...rest}
        />
    );
}

/**
 * BreadcrumbSeparator 组件，面包屑条目之间的分隔符，默认渲染为右箭头。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} [props.children] - 自定义分隔符内容。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function BreadcrumbSeparator(props) {
    const { children, className } = props;
    return (
        <li
            role="presentation"
            aria-hidden="true"
            data-slot="breadcrumb-separator"
            className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5 text-(--text-3)', className)}
        >
            {children ?? <ChevronRight />}
        </li>
    );
}

/**
 * 省略号的屏幕阅读器文案默认值。
 */
const DEFAULT_ELLIPSIS_LABEL = '更多';

/**
 * BreadcrumbEllipsis 组件，用于路径过长时的省略展示。
 * @description 省略号本身表达“路径被截断”的语义，故根节点不设 aria-hidden，
 * 由 label 提供给屏幕阅读器；图标为纯装饰，单独标记 aria-hidden。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} [props.label='更多'] - 省略号的屏幕阅读器文案；传 null 时不渲染。
 * @param {string} [props.className] - 额外的样式类名。
 * @returns {JSX.Element}
 */
function BreadcrumbEllipsis(props) {
    const { label = DEFAULT_ELLIPSIS_LABEL, className } = props;
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            className={cn('flex h-6 w-6 items-center justify-center text-(--text-3)', className)}
        >
            <MoreHorizontal size={14} aria-hidden="true" />
            {label ? <span className="sr-only">{label}</span> : null}
        </span>
    );
}

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
};
