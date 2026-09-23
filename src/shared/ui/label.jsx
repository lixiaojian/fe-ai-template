/**
 * @file 标签组件（Label）
 * @description 基于 shadcn/ui Base UI（base-nova）风格的 Label 组件，
 * 渲染原生 label 元素，用于表单控件的文字标签，支持 peer/group 禁用态联动样式。
 */

import { cn } from 'cn';

/**
 * Label 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {React.LabelHTMLAttributes<HTMLLabelElement>} props... - 其他原生 label 属性。
 * @returns {JSX.Element}
 */
function Label(props) {
    const { className, ...rest } = props;

    return (
        <label
            data-slot="label"
            className={cn(
                'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                className
            )}
            {...rest}
        />
    );
}

export { Label };
