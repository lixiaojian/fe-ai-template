/**
 * @file 注册测试用模块加载器
 * @description 由 `node --import ./scripts/register-loader.mjs` 引入，见同目录 test-loader.mjs。
 */

import { register } from 'node:module';

register('./test-loader.mjs', import.meta.url);
