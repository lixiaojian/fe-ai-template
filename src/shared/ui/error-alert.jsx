import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from 'cn';

/**
 * @file 错误提示组件（ErrorAlert）
 * @description 弹层/表单内提交类错误的统一展示样式：浅红背景 + 半透明红边框 +
 * 圆角错误块，左侧警示图标，文本自动换行。
 */

/**
 * ErrorAlert 组件。
 * @param {Object} props - 组件属性。
 * @param {React.ReactNode} props.children - 错误文本内容。
 * @param {string} [props.className] - 追加到错误块的类名（如外层间距 mt-2）。
 * @returns {JSX.Element}
 */
const ErrorAlert = React.forwardRef(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-danger-text',
            className
        )}
        role="alert"
        {...props}
    >
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>{children}</span>
    </div>
));
ErrorAlert.displayName = 'ErrorAlert';

export { ErrorAlert };
