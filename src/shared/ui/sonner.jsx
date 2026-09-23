import { Toaster as Sonner } from 'sonner';

/**
 * @file Toast 通知组件（sonner）
 * @description 基于 sonner 的全局通知组件：在应用根组件挂载一次，业务代码通过
 * `import { toast } from 'sonner'` 在任意位置唤起通知（如操作成功提示）。
 * 默认右上角展示、深色主题，具体展示位置与自动关闭时长在挂载处配置。
 */

/**
 * Toaster 组件，全局 Toast 通知容器。
 *
 * @param {Object} props - sonner Toaster 属性（如 position、duration、richColors）。
 * @returns {JSX.Element}
 */
function Toaster(props) {
    return <Sonner theme="dark" richColors className="toaster group" {...props} />;
}

export { Toaster };
