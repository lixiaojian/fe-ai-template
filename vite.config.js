import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

function spaEntryPlugin(entryFile) {
    return {
        name: 'spa-entry',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '';
                const [pathname] = url.split('?');

                // 静态资源请求（带扩展名）直接放行
                if (pathname.includes('.') && !pathname.endsWith('.html')) {
                    next();
                    return;
                }

                // Vite 内部资源路径直接放行
                if (pathname.startsWith('/@')) {
                    next();
                    return;
                }

                const query = url.slice(pathname.length);
                req.url = `${entryFile}${query}`;
                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), spaEntryPlugin('/index.html')],
    // Vite 8 的 configLoader: 'native' 不支持 __dirname，改用 import.meta.dirname
    root: path.resolve(import.meta.dirname, 'src'),
    // Vite 的 envDir 默认等于 root（即 src/），会让仓库根的 .env 被静默忽略。
    // 这里显式指回项目根，使 .env / .env.production / .env.preproduction 按惯例生效。
    envDir: import.meta.dirname,
    build: {
        outDir: path.resolve(import.meta.dirname, 'build'),
        // outDir 在项目根之外，vite 默认不清空，历次构建的孤儿产物会持续堆积
        emptyOutDir: true,
        // Vite 8 起 rollup 由 rolldown 取代：rollupOptions → rolldownOptions，
        // 分包由 output.manualChunks 改为 output.codeSplitting.groups
        rolldownOptions: {
            input: {
                index: path.resolve(import.meta.dirname, 'src/index.html'),
            },
            output: {
                // 第三方依赖统一打入 vendor chunk，业务代码打入入口 chunk
                codeSplitting: {
                    groups: [{ name: 'vendor', test: /node_modules/, priority: 10 }],
                },
            },
        },
    },
    resolve: {
        alias: {
            '@shared': path.resolve(import.meta.dirname, 'src/shared'),
        },
    },
    server: {
        port: 5173,
        open: false,
    },
});
