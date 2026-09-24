/**
 * @file 应用一入口
 * @description app1 是一个完整的功能示例：用户列表（含新增弹窗与详情抽屉）与 Form 组件示例页，
 * 通过二级路由切换。路由前缀由 src/App.jsx 的 `/app1/*` 提供。
 * @returns {JSX.Element}
 */

import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import UserList from './user-list.jsx';
import FormDemo from './form-demo.jsx';

/**
 * 应用一路由前缀，需与 src/App.jsx 中 `<Route path="/app1/*">` 保持一致。
 *
 * 导航与重定向都必须用带前缀的绝对路径：AppNav 渲染在 <Routes> 之外、拿不到 route
 * context，而 `<Route path="*">` 的 pathnameBase 会带上已匹配的部分。用相对路径时，
 * 在 /app1/users 上点 `to="users"` 会得到 /app1/users/users，且每点一次再追加一层；
 * 通配路由里的 `<Navigate to="users">` 更会自匹配成无限重定向。
 */
const APP_BASE = '/app1';

/** 顶部导航项。 */
const NAV_ITEMS = [
    { to: `${APP_BASE}/users`, label: '用户列表' },
    { to: `${APP_BASE}/form`, label: 'Form 示例' },
];

/**
 * 渲染顶部导航。
 * @returns {JSX.Element}
 */
function AppNav() {
    return (
        <header className="border-b border-line bg-soft">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-8 py-4">
                <span className="text-base font-semibold">App1 示例</span>
                <nav className="flex items-center gap-4">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                isActive
                                    ? 'text-sm font-medium text-brand-text'
                                    : 'text-sm text-(--text-2) hover:text-(--text)'
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}

export default function App1() {
    return (
        <div className="flex min-h-screen flex-col">
            <AppNav />
            <main className="flex-1">
                <Routes>
                    <Route index element={<Navigate to={`${APP_BASE}/users`} replace />} />
                    <Route path="users" element={<UserList />} />
                    <Route path="form" element={<FormDemo />} />
                    {/* 通配路由落在 `/app1/*` 内部，to 必须写绝对路径：
                        `to="users"` 会相对于当前 pathnameBase 解析，指向自身，无限重定向 */}
                    <Route path="*" element={<Navigate to={`${APP_BASE}/users`} replace />} />
                </Routes>
            </main>
        </div>
    );
}
