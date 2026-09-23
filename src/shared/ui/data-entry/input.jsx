/**
 * @file 输入框组件（Input）
 * @description 基于 Base UI Input 与 shadcn/ui Base UI（base-nova）风格封装的输入框组件。
 * 统一边框、背景、placeholder、聚焦环等样式，支持 aria-invalid 错误态（边框与聚焦环变为醒目的红色），
 * 并通过 React.forwardRef 转发 ref。
 */

import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';

/**
 * Input 组件。
 * @param {Object} props - 组件属性。
 * @param {string} [props.className] - 额外的样式类名。
 * @param {string} [props.type='text'] - input 类型（如 text、password、search 等）。
 * @param {boolean} [props.aria-invalid] - 是否处于校验错误态。
 * @param {React.InputHTMLAttributes<HTMLInputElement>} props... - 其他原生 input 属性与 Base UI Input 属性。
 * @param {React.Ref<HTMLInputElement>} ref - 转发到底层 input 元素的 ref。
 * @returns {JSX.Element}
 */
const Input = React.forwardRef((props, ref) => {
    const { className, type = 'text', 'aria-invalid': ariaInvalid, ...rest } = props;
    const invalid = ariaInvalid === true || ariaInvalid === 'true';

    return (
        <InputPrimitive
            type={type}
            className={cn(
                // 文件按钮只留 file:font-medium。preflight 已对 ::file-selector-button 声明
                // border:0 solid / background-color:#0000 / font:inherit，故 file:border-0、
                // file:bg-transparent、file:text-sm 都是重复声明（IDE 也会报同属性冲突）。
                // font-medium 是例外：伪元素继承 input 的字重（400），这条把它提到 500
                'flex h-10 w-full rounded-md border bg-soft px-3 py-2 text-sm ring-offset-background file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
                // 错误态用 ring-offset-0 让红环紧贴红边框合成一个框：ring-offset-2 会在两者之间
                // 留出一道底色缝隙，看起来像两个红框。offset 宽度按分支给出，
                // 不在同一元素上叠加同属性工具类（后者会被 cn 剥离）
                invalid
                    ? 'border-destructive focus-visible:ring-destructive focus-visible:ring-offset-0'
                    : 'border-input focus-visible:ring-ring focus-visible:ring-offset-2',
                className
            )}
            ref={ref}
            aria-invalid={ariaInvalid}
            {...rest}
        />
    );
});

Input.displayName = 'Input';

export { Input };
