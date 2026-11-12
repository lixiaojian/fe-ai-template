import axios from 'axios';
import env from '@shared/lib/env.js';
import urls from '@shared/lib/urls.js';
import { transformRequest, isRawBody } from '@shared/lib/form-urlencoded.js';

/**
 * 登录态相关错误码；接口返回这些错误码时自动跳转登录页。
 * 通过 VITE_AUTH_ERROR_CODES 配置，逗号分隔（如 "170,172,174"）。
 * 只接受十进制整数（可带负号），空白项与非法值（hex、科学计数、小数、Infinity）一律丢弃；
 * 未配置时为空数组，即不做自动跳转。
 * 注意必须先剔除空串再转数字：Number('') === 0 而非 NaN，直接转换会让空配置产出 [0]，
 * 导致 RetCode 为 0 的正常响应被误判为登录态错误。
 * @type {number[]}
 */
export const AUTH_ERROR_CODES = (env.VITE_AUTH_ERROR_CODES || '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => /^-?\d+$/.test(code))
    .map(Number);

/**
 * 跳转至登录页，并携带当前页面地址作为 service 回跳参数。
 * 未配置 VITE_PASSPORT_URL 时不跳转，由调用方 reject 处理。
 */
export function redirectToLogin() {
    if (!urls.passport) {
        return;
    }
    const page =
        window.location.protocol +
        '//' +
        window.location.host +
        window.location.pathname +
        window.location.search +
        window.location.hash;
    window.location.href = `${urls.passport}?service=${encodeURIComponent(page)}`;
}

/**
 * 从 document.cookie 中读取指定名称的 cookie。
 * cookie 名来自环境变量，可能含正则元字符（如 `a.b`），故先转义再构造正则。
 * @param {string} name - cookie 名称。
 * @returns {string|null}
 */
function getCookie(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(^| )' + escaped + '=([^;]*)(;|$)'));
    return match ? decodeURIComponent(match[2]) : null;
}

/** CSRF cookie 名；未配置时对应请求头不注入。 */
const CSRF_COOKIE = env.VITE_CSRF_COOKIE || '';
const UCSRF_COOKIE = env.VITE_UCSRF_COOKIE || '';

const CSRF = typeof document !== 'undefined' && CSRF_COOKIE ? getCookie(CSRF_COOKIE) : null;
const UCSRF = typeof document !== 'undefined' && UCSRF_COOKIE ? getCookie(UCSRF_COOKIE) : null;

const request = axios.create({
    baseURL: urls.api,
    timeout: 90000,
    withCredentials: true,
    responseType: 'json',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
});

request.interceptors.request.use(
    (config) => {
        if (!config.headers) {
            config.headers = {};
        }
        if (CSRF) {
            config.headers['CSRF-Token'] = CSRF;
        }
        if (UCSRF) {
            config.headers['U-CSRF-Token'] = UCSRF;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * 判断响应体是否表示登录态失效。
 * @param {*} data - 响应体。
 * @returns {boolean}
 */
function isAuthError(data) {
    return Boolean(data) && AUTH_ERROR_CODES.includes(Number(data.RetCode));
}

/**
 * 登录态失效时的统一处理：按需跳转登录页，并把响应体作为 rejection 原因抛出。
 * HTTP 200 与 HTTP 非 2xx 两条分支共用，避免只覆盖其中一条。
 * @param {*} data - 响应体。
 * @param {boolean} skipAuthRedirect - 为 true 时不自动跳转。
 * @returns {Promise<never>}
 */
function rejectAuthError(data, skipAuthRedirect) {
    if (!skipAuthRedirect) {
        redirectToLogin();
    }
    return Promise.reject(data);
}

request.interceptors.response.use(
    (response) => {
        const data = response.data;
        if (isAuthError(data)) {
            return rejectAuthError(data, response.config.skipAuthRedirect);
        }
        return data;
    },
    (error) => {
        const data = error.response?.data;
        // 网关以 HTTP 401/403 携带 RetCode 返回登录态失效时，同样需要跳转登录页；
        // 只在成功分支判定会漏掉这条路径。
        if (isAuthError(data)) {
            return rejectAuthError(data, error.config?.skipAuthRedirect);
        }
        const message = data?.message || error.message || '请求失败';
        console.error('[request error]', message);
        return Promise.reject(error);
    }
);

/**
 * GET 请求。
 * @param {string} url
 * @param {Object} [params]
 * @param {Object} [config]
 * @returns {Promise<*>}
 */
export function get(url, params, config = {}) {
    return request.get(url, { params, ...config });
}

/**
 * POST 请求，默认使用 form-urlencoded 序列化；
 * 显式传入 Content-Type 时跳过序列化（如 application/json）。
 * @param {string} url
 * @param {Object} [data]
 * @param {Object} [config]
 * @returns {Promise<*>}
 */
export function post(url, data, config = {}) {
    const mergedConfig = {
        transformRequest: [transformRequest],
        ...config,
    };
    // 显式传入 Content-Type 时跳过 form 序列化（如 application/json，交给 axios 默认处理）；
    // 但调用方自带 transformRequest 时保留它，不连自己的一起删掉。
    if (config.headers?.['Content-Type'] && !config.transformRequest) {
        delete mergedConfig.transformRequest;
    }
    // 二进制/表单类请求体由浏览器编码，必须去掉实例默认的 form-urlencoded 头，
    // 否则 multipart 请求会缺少 boundary，后端解析不到文件。
    // axios 的 AxiosHeaders 用 null 表示删除（undefined 会被忽略）。
    if (isRawBody(data) && !config.headers?.['Content-Type']) {
        mergedConfig.headers = { ...config.headers, 'Content-Type': null };
    }
    return request.post(url, data, mergedConfig);
}
