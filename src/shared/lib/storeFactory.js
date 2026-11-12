/**
 * @file Store 工厂
 * @description 为需要“加载一次、全局复用”的异步数据提供统一的 Zustand store 样板，
 * 减少重复的 isLoading/loaded/error/fetch/ensure/reset 代码。
 */

/**
 * 创建异步加载型 store 切片。
 *
 * @template T
 * @param {Object} options - 配置项。
 * @param {string} options.name - store 名称，用于错误日志。
 * @param {T} options.initialData - 业务数据的初始值。
 * @param {() => Promise<T>} options.fetcher - 数据获取函数，返回需要合并到 state 的业务数据。
 * @returns {(set: Function, get: Function) => Object} 可在 create((set, get) => ({ ...slice(set, get), ... })) 中展开使用的切片。
 */
export function createAsyncStoreSlice({ name, initialData, fetcher }) {
    const errorMessage = `${name} 加载失败`;
    // 请求代次：reset() 时递增，在飞请求回来时代次不符就丢弃结果。
    // 否则 reset 之后旧请求仍会写回数据，已清空的 store 会「复活」。
    let requestId = 0;
    // 在飞请求：并发调用共享同一个 Promise，后来者不会在数据就绪前提前 resolve。
    let inflight = null;

    return (set, get) => ({
        isLoading: false,
        loaded: false,
        error: null,
        ...initialData,

        /**
         * 触发数据加载；加载中再次调用会复用同一个请求。
         * @returns {Promise<void>}
         */
        fetch: () => {
            if (inflight) {
                return inflight;
            }

            const id = ++requestId;
            set({ isLoading: true, error: null });

            inflight = (async () => {
                try {
                    const data = await fetcher();
                    // reset() 已让本次请求作废
                    if (id !== requestId) {
                        return;
                    }
                    set({
                        ...data,
                        isLoading: false,
                        loaded: true,
                        error: null,
                    });
                } catch (err) {
                    if (id !== requestId) {
                        return;
                    }
                    set({
                        isLoading: false,
                        loaded: false,
                        error: typeof err === 'string' ? err : errorMessage,
                    });
                    console.error(`[${name}] fetch failed:`, err);
                }
            })().finally(() => {
                // 期间没有 reset 才清理；reset 已把 inflight 置空，
                // 不能把 reset 之后新发起的请求覆盖掉。
                if (id === requestId) {
                    inflight = null;
                }
            });

            return inflight;
        },

        /**
         * 保证数据已加载；未加载时触发请求并等待其完成。
         * @returns {Promise<void>}
         */
        ensure: async () => {
            if (get().loaded) {
                return;
            }
            await get().fetch();
        },

        /**
         * 清空数据与加载状态；在飞请求的结果随后会被丢弃。
         */
        reset: () => {
            requestId += 1;
            inflight = null;
            set({
                ...initialData,
                isLoading: false,
                loaded: false,
                error: null,
            });
        },
    });
}
