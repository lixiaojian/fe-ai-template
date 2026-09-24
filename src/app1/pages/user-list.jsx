/**
 * @file 用户列表页
 * @description app1 的主页面：筛选 + 表格 + 新增弹窗 + 详情抽屉。
 * 列表数据按「查询条件 → 结果」的对应关系推导加载态：结果里记录的 key 与当前 key
 * 不一致即为加载中，这样不必在 effect 里同步 setState。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    DataTable,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@shared/ui';
import { fetchUsers } from '../api.js';
import {
    ALL_VALUE,
    DEPARTMENT_OPTIONS,
    ROLE_OPTIONS,
    STATUS_OPTIONS,
    labelOf,
} from '../constants.js';
import UserFormDialog from '../components/user-form-dialog/index.jsx';
import UserDetailDrawer from '../components/user-detail-drawer/index.jsx';

/** 全部部门的选项，与部门表合并后供筛选下拉使用。 */
const DEPARTMENT_FILTERS = [{ value: ALL_VALUE, label: '全部部门' }, ...DEPARTMENT_OPTIONS];

/** 全部状态的选项。 */
const STATUS_FILTERS = [{ value: ALL_VALUE, label: '全部状态' }, ...STATUS_OPTIONS];

/**
 * 渲染用户列表页。
 * @returns {JSX.Element}
 */
export default function UserList() {
    // 输入框里的关键字与真正生效的关键字分开：回车或点击搜索后才生效
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [department, setDepartment] = useState(ALL_VALUE);
    const [status, setStatus] = useState(ALL_VALUE);
    const [reloadToken, setReloadToken] = useState(0);

    const [createOpen, setCreateOpen] = useState(false);
    // 详情抽屉的 id 与开关分开：关闭时保留 id，退出动画期间内容不会被清空
    const [detailId, setDetailId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // 查询条件串：既作为请求的标识，也用来判断当前结果是否对应当前条件。
    // 用 JSON 序列化而非拼接分隔符，避免关键字里出现分隔符时不同条件撞成同一个 key。
    const queryKey = JSON.stringify([keyword, department, status, reloadToken]);
    const [result, setResult] = useState({ key: '', list: [], error: null });

    useEffect(() => {
        let cancelled = false;

        fetchUsers({ keyword, department, status })
            .then((list) => {
                if (!cancelled) {
                    setResult({ key: queryKey, list, error: null });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setResult({ key: queryKey, list: [], error: error?.message || '加载失败' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [queryKey, keyword, department, status]);

    const loading = result.key !== queryKey;
    // 重新查询期间不能沿用上一次的错误：DataTable 的优先级是「错误 > 加载中」，
    // 若把旧错误透下去，用户改完条件后看到的是上一次的报错而非加载态
    const error = loading ? null : result.error;

    const handleSearch = useCallback(() => {
        setKeyword(keywordInput.trim());
        setReloadToken((token) => token + 1);
    }, [keywordInput]);

    const handleReset = useCallback(() => {
        setKeywordInput('');
        setKeyword('');
        setDepartment(ALL_VALUE);
        setStatus(ALL_VALUE);
        setReloadToken((token) => token + 1);
    }, []);

    const handleKeywordKeyDown = useCallback(
        (event) => {
            // 中文输入法选词确认也会发出 Enter，此时 isComposing 为 true，必须跳过，
            // 否则输入「张」回车选词就会误触发一次搜索
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                handleSearch();
            }
        },
        [handleSearch]
    );

    const handleOpenCreate = useCallback(() => {
        setCreateOpen(true);
    }, []);

    const handleCreated = useCallback(() => {
        setReloadToken((token) => token + 1);
    }, []);

    const handleOpenDetail = useCallback((id) => {
        setDetailId(id);
        setDetailOpen(true);
    }, []);

    const handleDetailOpenChange = useCallback((nextOpen) => {
        setDetailOpen(nextOpen);
    }, []);

    const columns = useMemo(
        () => [
            { key: 'name', title: '姓名' },
            { key: 'email', title: '邮箱' },
            {
                key: 'department',
                title: '部门',
                render: (value) => labelOf(DEPARTMENT_OPTIONS, value),
            },
            { key: 'role', title: '角色', render: (value) => labelOf(ROLE_OPTIONS, value) },
            {
                key: 'active',
                title: '状态',
                render: (value) => (
                    <Badge variant={value ? 'default' : 'outline'}>{value ? '启用' : '停用'}</Badge>
                ),
            },
            { key: 'createdAt', title: '创建时间' },
            {
                key: 'action',
                title: '操作',
                render: (_value, row) => (
                    <Button variant="link" size="sm" onClick={() => handleOpenDetail(row.id)}>
                        详情
                    </Button>
                ),
            },
        ],
        [handleOpenDetail]
    );

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">用户列表</h1>
                    <p className="mt-1 text-sm text-(--text-3)">
                        演示 DataTable + 新增弹窗（Dialog + Form）+ 详情抽屉（Drawer）的组合用法。
                    </p>
                </div>
                <Button onClick={handleOpenCreate} data-testid="open-create">
                    新增用户
                </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex w-full flex-col gap-1.5 sm:w-64">
                    <label htmlFor="user-keyword" className="text-sm text-(--text-2)">
                        关键字
                    </label>
                    <Input
                        id="user-keyword"
                        value={keywordInput}
                        placeholder="姓名或邮箱，回车搜索"
                        onChange={(event) => setKeywordInput(event.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                    />
                </div>

                <div className="flex w-full flex-col gap-1.5 sm:w-40">
                    <label htmlFor="user-department" className="text-sm text-(--text-2)">
                        部门
                    </label>
                    {/* items 让 SelectValue 能按 value 找到对应文案，否则触发器上显示的是原始值 */}
                    <Select
                        value={department}
                        onValueChange={setDepartment}
                        items={DEPARTMENT_FILTERS}
                    >
                        <SelectTrigger id="user-department" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DEPARTMENT_FILTERS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex w-full flex-col gap-1.5 sm:w-40">
                    <label htmlFor="user-status" className="text-sm text-(--text-2)">
                        状态
                    </label>
                    <Select value={status} onValueChange={setStatus} items={STATUS_FILTERS}>
                        <SelectTrigger id="user-status" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_FILTERS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleSearch} data-testid="search">
                        搜索
                    </Button>
                    <Button variant="outline" onClick={handleReset} data-testid="reset-filter">
                        重置
                    </Button>
                </div>
            </div>

            <DataTable
                dataSource={result.list}
                columns={columns}
                rowKey="id"
                loading={loading}
                error={error}
                empty="没有符合条件的用户"
                data-testid="user-table"
            />

            <UserFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={handleCreated}
            />

            <UserDetailDrawer
                open={detailOpen}
                userId={detailId}
                onOpenChange={handleDetailOpenChange}
            />
        </div>
    );
}
