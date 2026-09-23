/**
 * @file 表单字段组件族（Field）
 * @description 基于 shadcn/ui Base UI（base-nova）风格的表单字段组件族，
 * 包含 FieldSet、FieldLegend、FieldGroup、Field、FieldContent、FieldLabel、FieldTitle、
 * FieldDescription、FieldSeparator、FieldError。配合 React Hook Form 与 Zod 使用：
 * Field 接收 data-invalid 切换错误态，FieldError 接收 errors 数组渲染校验错误信息。
 * @see https://ui.shadcn.com/docs/components/base/field
 */

import { useMemo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Label } from '@shared/ui/label';
import { Separator } from '@shared/ui/separator';

/**
 * FieldSet 组件，原生 fieldset 容器，用于将一组字段归组。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.FieldsetHTMLAttributes<HTMLFieldSetElement>} props... - 其他原生 fieldset 属性。
 * @returns {JSX.Element}
 */
function FieldSet(props) {
    const { className, ...rest } = props;
    return (
        <fieldset
            data-slot="field-set"
            className={cn(
                'flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldLegend 组件，FieldSet 的分组标题（原生 legend）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('legend'|'label')} [props.variant='legend'] - 标题样式，legend 为大标题、label 为字段级标题。
 * @param {React.HTMLAttributes<HTMLLegendElement>} props... - 其他原生 legend 属性。
 * @returns {JSX.Element}
 */
function FieldLegend(props) {
    const { className, variant = 'legend', ...rest } = props;
    return (
        <legend
            data-slot="field-legend"
            data-variant={variant}
            className={cn(
                'mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldGroup 组件，字段分组容器，纵向排列多个 Field。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function FieldGroup(props) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="field-group"
            className={cn(
                'group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
                className
            )}
            {...rest}
        />
    );
}

/**
 * Field 样式变体定义，控制字段内部元素的排列方向。
 */
const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-danger-text', {
    variants: {
        orientation: {
            vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
            horizontal:
                'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
            responsive:
                'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        },
    },
    defaultVariants: {
        orientation: 'vertical',
    },
});

/**
 * Field 组件，单个表单字段的容器。传入 data-invalid（如 RHF 的 fieldState.invalid）
 * 可使整块切换到错误态（destructive 色）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {('vertical'|'horizontal'|'responsive')} [props.orientation='vertical'] - 字段排列方向。
 * @param {boolean} [props.data-invalid] - 是否处于校验错误态。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function Field(props) {
    const { className, orientation = 'vertical', ...rest } = props;
    return (
        <div
            role="group"
            data-slot="field"
            data-orientation={orientation}
            className={cn(fieldVariants({ orientation }), className)}
            {...rest}
        />
    );
}

/**
 * FieldContent 组件，字段内容区，包裹控件与描述/错误信息的纵向容器。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function FieldContent(props) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="field-content"
            className={cn(
                'group/field-content flex flex-1 flex-col gap-0.5 leading-snug',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldLabel 组件，字段标签，基于 Label 并支持内嵌 Field 时的卡片式联动样式。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.LabelHTMLAttributes<HTMLLabelElement>} props... - 其他原生 label 属性。
 * @returns {JSX.Element}
 */
function FieldLabel(props) {
    const { className, ...rest } = props;
    return (
        <Label
            data-slot="field-label"
            className={cn(
                'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10',
                'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldTitle 组件，字段标题（纯展示，无 label 语义）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function FieldTitle(props) {
    const { className, ...rest } = props;
    return (
        <div
            data-slot="field-label"
            className={cn(
                'flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldDescription 组件，字段辅助说明文字。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props... - 其他原生 p 属性。
 * @returns {JSX.Element}
 */
function FieldDescription(props) {
    const { className, ...rest } = props;
    return (
        <p
            data-slot="field-description"
            className={cn(
                'text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5',
                'last:mt-0 nth-last-2:-mt-1',
                '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-brand-text',
                className
            )}
            {...rest}
        />
    );
}

/**
 * FieldSeparator 组件，字段之间的分隔线，可附带居中文字（如"或"）。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} [props.children] - 分隔线上的居中文字内容。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element}
 */
function FieldSeparator(props) {
    const { children, className, ...rest } = props;
    return (
        <div
            data-slot="field-separator"
            data-content={!!children}
            className={cn(
                'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
                className
            )}
            {...rest}
        >
            <Separator className="absolute inset-0 top-1/2" />
            {children && (
                <span
                    className="relative mx-auto block w-fit bg-soft px-2 text-muted-foreground"
                    data-slot="field-separator-content"
                >
                    {children}
                </span>
            )}
        </div>
    );
}

/**
 * FieldError 组件，字段校验错误信息。传入 children 时直接渲染；
 * 否则根据 errors 数组（如 RHF 的 fieldState.error）去重渲染错误消息，多条时以列表展示。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.ReactNode} [props.children] - 自定义错误内容，优先于 errors。
 * @param {Array<{message?: string}|undefined>} [props.errors] - 错误对象数组（如 RHF fieldState.error）。
 * @param {React.HTMLAttributes<HTMLDivElement>} props... - 其他原生 div 属性。
 * @returns {JSX.Element|null}
 */
function FieldError(props) {
    const { className, children, errors, ...rest } = props;

    const content = useMemo(() => {
        if (children) {
            return children;
        }

        if (!errors?.length) {
            return null;
        }

        const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

        if (uniqueErrors?.length === 1) {
            return uniqueErrors[0]?.message;
        }

        return (
            <ul className="ml-4 flex list-disc flex-col gap-1">
                {uniqueErrors.map(
                    (error, index) => error?.message && <li key={index}>{error.message}</li>
                )}
            </ul>
        );
    }, [children, errors]);

    if (!content) {
        return null;
    }

    return (
        <div
            role="alert"
            data-slot="field-error"
            className={cn('text-sm font-normal text-danger-text', className)}
            {...rest}
        >
            {content}
        </div>
    );
}

export {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldContent,
    FieldTitle,
};
