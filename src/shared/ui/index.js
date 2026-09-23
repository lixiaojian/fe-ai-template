/**
 * @file 共享 UI 组件统一出口
 * @description 汇总 `src/shared/ui` 下按语义分类存放的纯展示组件，供业务代码以
 * `import { Button, Input } from '@shared/ui'` 一次性引入。
 *
 * 约定：
 * - 新增组件时在对应分类目录下建文件，并在此处补一行 `export *`；
 * - 组件之间互相引用一律走精确路径（如 `@shared/ui/general/button`），
 *   不要 import 本文件，否则会形成循环依赖并把全量组件拖进依赖图；
 * - 分类目录与归类规则见同目录 AGENTS.md。
 */

// ── 通用 ──
export * from './general/badge';
export * from './general/button';
export * from './general/separator';

// ── 布局 ──
export * from './layout/card';
export * from './layout/carousel';
export * from './layout/stack';

// ── 导航 ──
export * from './navigation/breadcrumb';
export * from './navigation/dropdown-menu';
export * from './navigation/tabs';

// ── 数据录入 ──
export * from './data-entry/attachment';
export * from './data-entry/checkbox';
export * from './data-entry/field';
export * from './data-entry/input';
export * from './data-entry/label';
export * from './data-entry/radio-group';
export * from './data-entry/select';
export * from './data-entry/switch';
export * from './data-entry/textarea';

// ── 数据展示 ──
export * from './data-display/data-table';
export * from './data-display/empty';
export * from './data-display/progress';
export * from './data-display/skeleton';
export * from './data-display/table';

// ── 反馈 ──
export * from './feedback/dialog';
export * from './feedback/error-alert';
export * from './feedback/sonner';
export * from './feedback/tooltip';
