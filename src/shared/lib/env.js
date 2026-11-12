/**
 * @file 环境变量访问入口
 * @description 集中读取 Vite 的 `import.meta.env`。
 *
 *              直接在各模块里写 `import.meta.env.VITE_X` 时，Node 环境下
 *              （`import.meta.env` 为 undefined）会抛 TypeError，导致共享库无法被
 *              node:test 直接导入。这里统一做一次兜底：Vite 构建时会把
 *              `import.meta.env` 静态替换成环境对象，运行时行为不变。
 */

const env =
    typeof import.meta !== 'undefined' && import.meta.env !== undefined ? import.meta.env : {};

export default env;
