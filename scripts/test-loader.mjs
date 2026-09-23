/**
 * @file Node 测试用模块加载器
 * @description 让 `node --test` 能直接加载项目里的 `.jsx` 源码：把 `@shared/*` 别名
 * 映射到 `src/shared/*`，补全省略的扩展名，并用 Vite 内置的 Oxc 转换 JSX。
 * 仅供测试使用，不参与构建。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithOxc } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['.jsx', '.js', '/index.jsx', '/index.js'];

/** 补全省略的扩展名，找不到时原样返回交给 Node 报错。 */
function withExtension(candidate) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
    }
    for (const extension of EXTENSIONS) {
        if (fs.existsSync(candidate + extension)) {
            return candidate + extension;
        }
    }
    return candidate;
}

/** 父模块是文件时才按相对路径解析，否则（如 CLI 入口）原样交给 Node。 */
function resolveRelative(specifier, parentURL) {
    if (!parentURL || !parentURL.startsWith('file:')) {
        return undefined;
    }
    const parentPath = fileURLToPath(parentURL);
    if (!fs.existsSync(parentPath) || !fs.statSync(parentPath).isFile()) {
        return undefined;
    }
    return withExtension(path.resolve(path.dirname(parentPath), specifier));
}

export async function resolve(specifier, context, next) {
    if (specifier.startsWith('@shared/')) {
        return next(withExtension(path.join(ROOT, 'src', specifier.replace('@shared/', 'shared/'))), context);
    }
    if (specifier.startsWith('.')) {
        const resolved = resolveRelative(specifier, context.parentURL);
        if (resolved) {
            return next(resolved, context);
        }
    }
    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.endsWith('.jsx')) {
        const file = fileURLToPath(url);
        const { code } = await transformWithOxc(fs.readFileSync(file, 'utf8'), file, {
            jsx: 'automatic',
        });
        return { format: 'module', source: code, shortCircuit: true };
    }
    return next(url, context);
}
