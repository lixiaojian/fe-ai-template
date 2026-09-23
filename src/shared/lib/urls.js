/**
 * @file 站点地址配置
 * @description 通过 Vite 环境变量注入，见根目录 .env.example。
 *              未配置时为空串，request.js 的 baseURL 随之为空，请求走同源相对路径。
 */

const urls = {
    /** 网关地址。 */
    api: import.meta.env.VITE_API_BASE_URL || '',
    /** 登录页地址；为空时登录态错误码不自动跳转。 */
    passport: import.meta.env.VITE_PASSPORT_URL || '',
};

export default urls;
