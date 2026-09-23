/**
 * @file 通用辅助函数
 * @description 放置项目中多处复用的轻量级无副作用工具函数，避免内嵌重复实现。
 */

/**
 * 通用真值转换，兼容布尔、数字、字符串等多种后端返回类型。
 * @param {*} value
 * @returns {boolean}
 */
export function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        return value !== '' && value !== '0' && value.toLowerCase() !== 'false';
    }
    return Boolean(value);
}

/**
 * 将 UTF-8 字符串编码为 Base64。
 * @param {string} str - 待编码字符串。
 * @returns {string}
 */
export function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
