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

    return (set, get) => ({
        isLoading: false,
        loaded: false,
        error: null,
        ...initialData,

        /**
         * 触发数据加载；加载中再次调用会被忽略。
         * @returns {Promise<void>}
         */
        fetch: async () => {
            if (get().isLoading) {
                return;
            }

            set({ isLoading: true, error: null });

            try {
                const data = await fetcher();
                set({
                    ...data,
                    isLoading: false,
                    loaded: true,
                    error: null,
                });
            } catch (err) {
                set({
                    isLoading: false,
                    loaded: false,
                    error: typeof err === 'string' ? err : errorMessage,
                });
                console.error(`[${name}] fetch failed:`, err);
            }
        },

        /**
         * 保证数据已加载；未加载时自动触发一次请求。
         * @returns {Promise<void>}
         */
        ensure: async () => {
            const { loaded, isLoading, fetch } = get();
            if (!loaded && !isLoading) {
                await fetch();
            }
        },

        /**
         * 清空数据与加载状态。
         */
        reset: () => {
            set({
                ...initialData,
                isLoading: false,
                loaded: false,
                error: null,
            });
        },
    });
}
