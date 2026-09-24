/**
 * @file 用户示例的业务常量
 * @description 部门 / 角色 / 状态的选项表与取值文案。真实项目里这类枚举通常来自字典接口，
 * 这里以常量形式内置，避免 demo 依赖后端。
 */

/** 部门选项。 */
const DEPARTMENT_OPTIONS = [
    { value: 'tech', label: '技术部' },
    { value: 'product', label: '产品部' },
    { value: 'design', label: '设计部' },
    { value: 'market', label: '市场部' },
];

/** 角色选项。 */
const ROLE_OPTIONS = [
    { value: 'admin', label: '管理员' },
    { value: 'editor', label: '编辑' },
    { value: 'viewer', label: '访客' },
];

/** 启用状态选项。 */
const STATUS_OPTIONS = [
    { value: 'active', label: '启用' },
    { value: 'disabled', label: '停用' },
];

/** 部门筛选的「全部」选项值。 */
const ALL_VALUE = 'all';

/**
 * 按 value 取选项文案。
 * @param {Array<{value: string, label: string}>} options - 选项表。
 * @param {string} value - 目标值。
 * @returns {string} 文案；未命中时原样返回 value。
 */
function labelOf(options, value) {
    return options.find((option) => option.value === value)?.label ?? value;
}

export { DEPARTMENT_OPTIONS, ROLE_OPTIONS, STATUS_OPTIONS, ALL_VALUE, labelOf };
