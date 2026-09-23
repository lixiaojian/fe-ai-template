/**
 * @file 通用轮询工具
 * @description 按固定间隔重复执行一次异步请求，直到满足终止条件或调用方主动停止。
 *              数据获取通过 fetcher 注入，与具体请求实现解耦。
 */

/**
 * 判断值是否为非数组对象。
 * @param {*} value
 * @returns {boolean}
 */
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * 深度克隆值，支持对象、数组、Date、RegExp；函数与原始值按引用返回。
 * 轮询会把 input 交给 fetcher，深拷贝保证 fetcher 内的写入不会污染调用方对象。
 * @param {*} value
 * @returns {*}
 */
const deepClone = (value) => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item));
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
    }
    const cloned = {};
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            cloned[key] = deepClone(value[key]);
        }
    }
    return cloned;
};

/**
 * 判断对象是否逐字段匹配 predicate。
 * @param {Object} item
 * @param {Object} predicate
 * @returns {boolean}
 */
const matches = (item, predicate) => {
    for (const key in predicate) {
        if (Object.prototype.hasOwnProperty.call(predicate, key)) {
            if (item[key] !== predicate[key]) {
                return false;
            }
        }
    }
    return true;
};

/**
 * 在数组中查找匹配项；predicate 为函数时直接作为 find 的回调。
 * @param {Array} items
 * @param {Function|Object} predicate
 * @returns {*}
 */
const findItem = (items, predicate) => {
    if (typeof predicate === 'function') {
        return items.find(predicate);
    }
    if (predicate && typeof predicate === 'object') {
        return items.find((item) => matches(item, predicate));
    }
    return undefined;
};

/**
 * 默认重试策略：4xx（请求本身有问题）不重试，其余（网络错误、5xx）继续重试。
 * @param {*} err - 请求失败的原因。
 * @returns {boolean}
 */
const defaultShouldRetry = (err) => {
    const status = err?.response?.status;
    return typeof status !== 'number' || status >= 500;
};

/**
 * 轮询查询，直到满足终止条件或调用方停止。
 *
 * 每次轮询调用 `fetcher(action, input)`，并对结果执行 `process` 回调；当结果命中
 * `action.requires` 中任意条件、或 `action.isStable` 返回 true 时，执行 `success`
 * 并停止轮询。页面跳转后会自动停止继续轮询。
 *
 * @example
 * const handle = poll({
 *   fetcher: (action, input) => request.get('/status', input),
 *   action: {
 *     requires: [{ State: 'Ready' }],   // 命中即停止
 *     isStable: (result) => result.State === 'Ready',
 *     keyword: 'Id',
 *   },
 *   item: { Id: 'abc' },
 *   input: {},
 *   timeout: 3000,
 *   process: (item, result) => console.log(result),
 *   success: (item, result) => console.log('稳定', result),
 *   error: (item, err) => console.error(err),
 *   shouldRetry: (err) => !err.code,    // 返回 false 则不再重试
 * });
 *
 * handle.clear();  // 停止轮询
 *
 * @param {Object} options - 轮询配置。
 * @param {Function} options.fetcher - 数据获取函数，签名为 `(action, input) => Promise<*>`；
 *   非函数时轮询不启动，直接返回 `{ clear }`。
 * @param {Object} [options.action={}] - 请求配置（原样传给 fetcher），并支持以下轮询语义：
 * @param {Array<Function|Object>} [options.action.requires=[]] - 终止条件数组；函数 predicate
 *   或属性匹配对象均可。
 * @param {Function} [options.action.isStable] - 接收首个结果，返回 true 时立即停止轮询。
 * @param {boolean} [options.action.list=false] - 列表模式：结果数组整体传给 `process` /
 *   `isStable` / `success`，不截取首项，非数组结果按空列表处理；终止仅由 `isStable(数组)`
 *   判断，`requires` 不生效。
 * @param {string} [options.action.keyword] - 会把 `item[keyword]` 回填到请求数据。
 * @param {Object} [options.item={}] - 当前轮询项，用于 keyword 回填及回调参数。
 * @param {Object} [options.input] - 请求数据；非对象时轮询不启动。
 * @param {number} [options.timeout=2000] - 轮询间隔，单位毫秒。
 * @param {Function} [options.process] - 每次拿到结果时调用 `(item, result)`。
 * @param {Function} [options.success] - 满足终止条件时调用 `(item, result)`。
 * @param {Function} [options.error] - 请求失败时调用 `(item, err)`。
 * @param {Function} [options.shouldRetry] - 请求失败后是否继续轮询，签名为 `(err) => boolean`。
 *   默认策略：请求已到达服务端且返回 4xx（`err.response.status < 500`）时不重试——
 *   这类错误由请求本身引起，重试无意义且会持续打到服务端；无响应（网络错误）与 5xx
 *   视为临时故障，继续重试。需要别的策略时由调用方提供。
 * @returns {{ clear: Function }} - 调用 `clear()` 可停止后续轮询。
 */
export function poll(options) {
    let isStopPoll = false;
    const initialUrl = typeof window !== 'undefined' ? window.location.href : '';
    const fetcher = options.fetcher;
    const shouldRetry = options.shouldRetry || defaultShouldRetry;

    const clear = () => {
        isStopPoll = true;
    };

    if (typeof fetcher !== 'function') {
        return { clear };
    }

    const doPoll = (pollOptions) => {
        const action = pollOptions.action || {};
        const item = pollOptions.item || {};
        const timeout = pollOptions.timeout ? parseInt(pollOptions.timeout, 10) || 2000 : 2000;
        const process = pollOptions.process;
        const success = pollOptions.success;
        const error = pollOptions.error;
        const requires = action.requires || [];
        const isStable = action.isStable;
        const keyword = action.keyword || '';
        const isList = action.list === true;
        const inputData = isObject(pollOptions.input) ? deepClone(pollOptions.input) : {};

        const some = (items, checkRequires) => {
            checkRequires = checkRequires || [];

            if (isStable && isStable(items[0])) {
                return true;
            }

            for (let i = 0, l = checkRequires.length; i < l; i++) {
                if (findItem(items, checkRequires[i])) {
                    return true;
                }
            }

            return false;
        };

        const scheduleNext = () => {
            setTimeout(() => {
                if (initialUrl && initialUrl !== window.location.href) {
                    return;
                }
                if (isStopPoll) {
                    return;
                }
                doPoll(pollOptions);
            }, timeout);
        };

        if ((keyword && item[keyword]) || isObject(pollOptions.input)) {
            if (keyword && !inputData[keyword] && item[keyword]) {
                inputData[keyword] = item[keyword];
            }

            // 包一层 Promise.resolve().then：fetcher 同步 throw 或返回非 Promise 时，
            // 都走同一个 rejection 分支，不会逸出 poll() 变成未捕获异常。
            Promise.resolve()
                .then(() => fetcher(action, inputData))
                .then(
                    (data) => {
                        let result;

                        if (isList) {
                            // 列表模式保留完整数组，非数组结果按空列表处理
                            result = Array.isArray(data) ? data : [];
                        } else {
                            result = Array.isArray(data) ? data[0] : data;
                            // 结果为空说明资源尚未就绪，同样执行 process 并继续轮询
                            if (!result) {
                                result = {};
                            }
                        }

                        if (typeof process === 'function') {
                            process(item, result);
                        }

                        // 列表模式下 requires 不生效，是否终止仅由 isStable 判断
                        const isSettled = isList
                            ? Boolean(isStable && isStable(result))
                            : some([result], requires);

                        if (isSettled) {
                            if (typeof success === 'function') {
                                success(item, result);
                            }
                        } else {
                            scheduleNext();
                        }
                    },
                    (err) => {
                        if (shouldRetry(err)) {
                            scheduleNext();
                        }

                        if (typeof error === 'function') {
                            error(item, err);
                        }
                    }
                );
        }
    };

    doPoll(options);

    return { clear };
}

export default poll;
