/**
 * @file jQuery 风格的表单序列化
 * @description 把普通对象序列化为 `application/x-www-form-urlencoded` 请求体，展开规则与
 *              jQuery 的 `$.param` 一致（数组与嵌套对象用 `key[index]` 表示）。
 *
 *              不能按普通对象展开的类型原样返回：`FormData` / `URLSearchParams` / `Blob` /
 *              `File` 由 axios（浏览器）自行编码，若走这里的 `Object.keys` 展开会得到空串，
 *              上传类请求会静默丢失整个请求体；`Date` 按 ISO 字符串输出，避免变成空对象。
 */

/** 原样交给 axios 处理、不能按字段展开的类型。 */
const RAW_BODY_TYPES =
    typeof Blob === 'undefined'
        ? []
        : [
              typeof FormData === 'undefined' ? null : FormData,
              typeof URLSearchParams === 'undefined' ? null : URLSearchParams,
              Blob,
              typeof File === 'undefined' ? null : File,
          ].filter(Boolean);

/**
 * 判断值是否应原样作为请求体交给 axios。
 * @param {*} value - 待判断的值。
 * @returns {boolean}
 */
function isRawBody(value) {
    return RAW_BODY_TYPES.some((Type) => value instanceof Type);
}

/**
 * jQuery 风格的表单序列化。
 * @param {*} data - 待序列化的请求体。
 * @returns {string|*} 序列化后的字符串；无需序列化的值（原始类型、FormData 等）原样返回。
 */
function serializeForm(data) {
    // 顶层就不能按字段展开的类型：直接交给 axios / 浏览器处理
    if (isRawBody(data) || data instanceof Date) {
        return data;
    }
    const r20 = /%20/g;
    const rbracket = /\[]$/;
    const params = [];

    const add = (key, value) => {
        if (value === undefined) {
            return;
        }
        value = typeof value === 'function' ? value() : value == null ? '' : value;
        params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    };

    const buildParams = (prefix, obj) => {
        if (Array.isArray(obj)) {
            obj.forEach((v, i) => {
                if (rbracket.test(prefix)) {
                    add(prefix, v);
                } else {
                    buildParams(prefix + '[' + i + ']', v);
                }
            });
        } else if (obj instanceof Date) {
            // Date 的 Object.keys 为空，展开会得到空对象
            add(prefix, obj.toISOString());
        } else if (obj !== null && typeof obj === 'object') {
            Object.keys(obj).forEach((key) => {
                buildParams(prefix + '[' + key + ']', obj[key]);
            });
        } else {
            add(prefix, obj);
        }
    };

    if (Array.isArray(data)) {
        data.forEach((obj) => {
            Object.keys(obj).forEach((prefix) => {
                buildParams(prefix, obj[prefix]);
            });
        });
    } else if (data !== null && typeof data === 'object') {
        Object.keys(data).forEach((prefix) => {
            buildParams(prefix, data[prefix]);
        });
    } else {
        return data;
    }

    return params.join('&').replace(r20, '+');
}

/**
 * axios `transformRequest` 入口：需要原样交给浏览器编码的请求体直接放行。
 * @param {*} data - 请求体。
 * @returns {string|*} 序列化结果或原始请求体。
 */
function transformRequest(data) {
    return serializeForm(data);
}

export { serializeForm, transformRequest, isRawBody };
