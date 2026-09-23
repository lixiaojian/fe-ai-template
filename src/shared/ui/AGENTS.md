# 共享 UI 组件文档规范

`/src/shared/ui` 下的所有共享 UI 组件必须包含规范的 JSDoc 注释：

- **文件顶部**：使用 `@file` / `@description` 说明组件用途。
- **每个导出组件**：使用 JSDoc 说明参数（`@param`）、类型、返回值（`@returns`）。
- **复杂常量/变体**：使用 JSDoc 说明其用途，例如 `badgeVariants`、`buttonVariants`。

示例：

```jsx
/**
 * @file 按钮组件（Button）
 * @description 基于 shadcn/ui 的 Button 组件...
 */

/**
 * Button 组件。
 * @param {Object} props - 组件属性。
 * @param {('default'|'outline')} [props.variant='default'] - 按钮样式变体。
 * @param {React.Ref<HTMLButtonElement>} ref - 转发到 button 元素的 ref。
 * @returns {JSX.Element}
 */
const Button = React.forwardRef(({ variant, className, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
));
```
