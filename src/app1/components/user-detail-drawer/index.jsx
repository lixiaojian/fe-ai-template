/**
 * @file 用户详情抽屉
 * @description Drawer + 按 id 拉取详情：打开时请求详情接口，加载中显示骨架屏，
 * 失败显示错误提示。详情比列表多出备注等字段，因此不复用列表行数据。
 */

import { useEffect, useState } from 'react';
import {
    Badge,
    Button,
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    Skeleton,
} from '@shared/ui';
import { fetchUserById } from '../../api.js';
import { DEPARTMENT_OPTIONS, ROLE_OPTIONS, labelOf } from '../../constants.js';

/** 加载态占位行数。 */
const SKELETON_ROWS = 6;

/**
 * 渲染一条「标签 + 值」。
 * @param {Object} props - 组件属性。
 * @param {string} props.label - 字段名。
 * @param {React.ReactNode} props.children - 字段值。
 * @returns {JSX.Element}
 */
function DetailRow(props) {
    const { label, children } = props;
    return (
        <div className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
            <span className="text-xs text-(--text-3)">{label}</span>
            <span className="text-sm text-(--text)">{children}</span>
        </div>
    );
}

/**
 * 用户详情抽屉。
 * @param {Object} props - 组件属性。
 * @param {boolean} props.open - 是否打开。
 * @param {number|null} props.userId - 目标用户 id；为 null 时视为未选中。
 * @param {(open: boolean) => void} props.onOpenChange - 打开状态变化回调。
 * @returns {JSX.Element}
 */
export default function UserDetailDrawer(props) {
    const { open, userId, onOpenChange } = props;
    // 记录「已完成加载的请求」：用结果里的 id 与当前 id 是否一致推导 loading，
    // 避免在 effect 里同步 setState（会多渲染一帧，也违反 React Compiler 规则）
    const [result, setResult] = useState({ id: null, user: null, error: null });

    useEffect(() => {
        if (!open || userId === null || userId === undefined) {
            return undefined;
        }

        let cancelled = false;
        fetchUserById(userId)
            .then((user) => {
                if (!cancelled) {
                    setResult({ id: userId, user, error: null });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setResult({ id: userId, user: null, error: error?.message || '加载失败' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [open, userId]);

    const loading = open && userId !== null && result.id !== userId;
    const user = result.id === userId ? result.user : null;
    const error = result.id === userId ? result.error : null;

    return (
        <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>用户详情</DrawerTitle>
                    <DrawerDescription>
                        {user ? `#${user.id} · ${user.name}` : '查看用户的完整信息'}
                    </DrawerDescription>
                </DrawerHeader>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                                <Skeleton key={index} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : null}

                    {!loading && error ? (
                        <p role="alert" className="text-sm text-danger-text">
                            {error}
                        </p>
                    ) : null}

                    {!loading && !error && user ? (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 pb-3">
                                <span className="text-base font-medium text-(--text)">
                                    {user.name}
                                </span>
                                <Badge variant={user.active ? 'default' : 'outline'}>
                                    {user.active ? '启用' : '停用'}
                                </Badge>
                            </div>

                            <DetailRow label="邮箱">{user.email || '—'}</DetailRow>
                            <DetailRow label="手机号">{user.phone || '—'}</DetailRow>
                            <DetailRow label="部门">
                                {labelOf(DEPARTMENT_OPTIONS, user.department)}
                            </DetailRow>
                            <DetailRow label="角色">{labelOf(ROLE_OPTIONS, user.role)}</DetailRow>
                            <DetailRow label="创建时间">{user.createdAt}</DetailRow>
                            <DetailRow label="备注">{user.remark || '—'}</DetailRow>
                        </div>
                    ) : null}
                </div>

                <DrawerFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        关闭
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
