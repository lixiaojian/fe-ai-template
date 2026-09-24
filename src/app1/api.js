/**
 * @file 用户数据源（内存 mock）
 * @description demo 没有后端，用一个模块级数组模拟服务端：接口全部异步并带一小段延时，
 * 便于观察 DataTable 的 loading 态与详情抽屉的加载过程。
 * 换成真实接口时只需把下面几个函数的实现替换为 `@shared/lib/request` 的调用，签名不变。
 */

import { ALL_VALUE } from './constants.js';

/** 模拟网络往返耗时（毫秒）。 */
const LATENCY = 350;

/** 造一批已存在的用户记录，模拟服务端已有数据。 */
const SEED = [
    {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800000001',
        department: 'tech',
        role: 'admin',
        active: true,
        remark: '负责前端基础设施与组件库维护。',
        createdAt: '2024-03-12 10:24:00',
    },
    {
        id: 2,
        name: '李四',
        email: 'lisi@example.com',
        phone: '13800000002',
        department: 'product',
        role: 'editor',
        active: true,
        remark: '负责用户中心与权限模块的需求设计。',
        createdAt: '2024-05-08 14:02:00',
    },
    {
        id: 3,
        name: '王五',
        email: 'wangwu@example.com',
        phone: '13800000003',
        department: 'design',
        role: 'viewer',
        active: false,
        remark: '已转岗，账号暂时停用。',
        createdAt: '2024-07-21 09:41:00',
    },
];

/** 当前用户表。 */
let users = SEED.map((user) => ({ ...user }));

/** 自增主键。 */
let nextId = 4;

/**
 * 延时一段时间。
 * @param {number} [ms] - 毫秒数。
 * @returns {Promise<void>}
 */
function sleep(ms = LATENCY) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * 生成创建时间文案，格式与种子数据一致。
 * @param {Date} [date] - 时间点，缺省为当前时刻。
 * @returns {string} `YYYY-MM-DD HH:mm:ss`。
 */
function formatTime(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

/**
 * 查询用户列表。
 * @param {Object} [query] - 查询条件。
 * @param {string} [query.keyword] - 姓名或邮箱的关键字，忽略大小写。
 * @param {string} [query.department] - 部门，`ALL_VALUE` 或空表示不限。
 * @param {string} [query.status] - 状态，`active` / `disabled`，`ALL_VALUE` 或空表示不限。
 * @returns {Promise<Array<Object>>} 用户列表（按创建时间倒序）。
 */
async function fetchUsers(query = {}) {
    const { keyword, department, status } = query;
    await sleep();

    const trimmed = keyword?.trim().toLowerCase();

    return users
        .filter((user) => {
            if (trimmed) {
                const haystack = `${user.name} ${user.email}`.toLowerCase();
                if (!haystack.includes(trimmed)) {
                    return false;
                }
            }
            if (department && department !== ALL_VALUE && user.department !== department) {
                return false;
            }
            return !(status && status !== ALL_VALUE && user.active !== (status === 'active'));
        })
        .map((user) => ({ ...user }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 查询用户详情。
 * @param {number} id - 用户 id。
 * @returns {Promise<Object>} 用户记录。
 * @throws {Error} 用户不存在时抛出。
 */
async function fetchUserById(id) {
    await sleep();
    const user = users.find((item) => item.id === id);
    if (!user) {
        throw new Error(`用户 ${id} 不存在`);
    }
    return { ...user };
}

/**
 * 新增用户。
 * @param {Object} payload - 表单值。
 * @param {string} payload.name - 姓名。
 * @param {string} payload.email - 邮箱。
 * @param {string} [payload.phone] - 手机号。
 * @param {string} payload.department - 部门。
 * @param {string} payload.role - 角色。
 * @param {boolean} [payload.active] - 是否启用。
 * @param {string} [payload.remark] - 备注。
 * @returns {Promise<Object>} 新建的用户记录。
 */
async function createUser(payload) {
    await sleep();
    const user = {
        id: nextId,
        name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone?.trim() ?? '',
        department: payload.department,
        role: payload.role,
        active: Boolean(payload.active),
        remark: payload.remark?.trim() ?? '',
        createdAt: formatTime(),
    };
    nextId += 1;
    users = [user, ...users];
    return { ...user };
}

export { fetchUsers, fetchUserById, createUser };
