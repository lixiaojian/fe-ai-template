/**
 * @file 请求层测试
 * @description 通过自定义 adapter 截获最终请求配置，验证请求体的序列化与 Content-Type。
 */

import test from 'node:test';
import assert from 'node:assert';
import { post, get } from '@shared/lib/request.js';

/** 用自定义 adapter 截获一次请求的最终 config。 */
async function capture(run) {
    let captured;
    const adapter = (config) => {
        captured = config;
        return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };
    await run({ adapter });
    return captured;
}

test('post 普通对象：form-urlencoded 序列化并带默认 Content-Type', async () => {
    const config = await capture((options) => post('/x', { a: 1, b: ['x'] }, options));
    assert.equal(config.data, 'a=1&b%5B0%5D=x');
    assert.match(String(config.headers.get('Content-Type')), /application\/x-www-form-urlencoded/);
});

test('post FormData：原样发送且不残留 form-urlencoded 头', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['abc']), 'a.txt');
    const config = await capture((options) => post('/upload', formData, options));
    assert.equal(config.data, formData);
    assert.equal(config.headers.get('Content-Type'), undefined);
});

test('post 显式 Content-Type 时跳过 form 序列化（JSON 交由 axios 默认处理）', async () => {
    const payload = { a: 1 };
    const config = await capture((options) =>
        post('/x', payload, { ...options, headers: { 'Content-Type': 'application/json' } })
    );
    assert.equal(config.data, '{"a":1}');
    assert.equal(config.headers.get('Content-Type'), 'application/json');
});

test('get 把 params 透传给 axios', async () => {
    const config = await capture((options) => get('/x', { a: 1 }, options));
    assert.deepEqual(config.params, { a: 1 });
});
