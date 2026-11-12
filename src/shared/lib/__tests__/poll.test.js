/**
 * @file 轮询工具测试
 * @description 生命周期（clear 与在飞请求）与默认重试策略。
 */

import test from 'node:test';
import assert from 'node:assert';
import { poll } from '@shared/lib/poll.js';

/** 等待若干毫秒。 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('clear() 后在飞请求的回调不再执行', async () => {
    let release;
    const calls = { process: 0, success: 0, error: 0 };
    const handle = poll({
        fetcher: () =>
            new Promise((resolve) => {
                release = () => resolve({ State: 'Ready' });
            }),
        action: { requires: [{ State: 'Ready' }] },
        input: {},
        process: () => {
            calls.process += 1;
        },
        success: () => {
            calls.success += 1;
        },
        error: () => {
            calls.error += 1;
        },
        timeout: 20,
    });

    await sleep(0); // 让 fetcher 先发出
    handle.clear();
    release();
    await sleep(80);

    assert.deepEqual(calls, { process: 0, success: 0, error: 0 });
});

test('clear() 后在飞请求的失败也不回调 error', async () => {
    let reject;
    let errorCalls = 0;
    const handle = poll({
        fetcher: () =>
            new Promise((_resolve, rejectFn) => {
                reject = () => rejectFn(new Error('boom'));
            }),
        input: {},
        error: () => {
            errorCalls += 1;
        },
        timeout: 20,
    });

    await sleep(0);
    handle.clear();
    reject();
    await sleep(80);

    assert.equal(errorCalls, 0);
});

test('默认重试策略：登录失效（RetCode 响应体）不重试', async () => {
    let calls = 0;
    const handle = poll({
        fetcher: () => {
            calls += 1;
            return Promise.reject({ RetCode: 170, Message: '未登录' });
        },
        input: {},
        timeout: 10,
        error: () => {},
    });

    await sleep(80);
    handle.clear();
    await sleep(40);

    assert.equal(calls, 1);
});

test('默认重试策略：5xx 与网络错误继续重试', async () => {
    let serverCalls = 0;
    const handle5xx = poll({
        fetcher: () => {
            serverCalls += 1;
            return Promise.reject({ response: { status: 500 } });
        },
        input: {},
        timeout: 10,
        error: () => {},
    });
    await sleep(60);
    handle5xx.clear();
    assert.ok(serverCalls > 1);

    let networkCalls = 0;
    const handleNetwork = poll({
        fetcher: () => {
            networkCalls += 1;
            return Promise.reject(new Error('Network Error'));
        },
        input: {},
        timeout: 10,
        error: () => {},
    });
    await sleep(60);
    handleNetwork.clear();
    assert.ok(networkCalls > 1);
});

test('默认重试策略：4xx 不重试', async () => {
    let calls = 0;
    const handle = poll({
        fetcher: () => {
            calls += 1;
            return Promise.reject({ response: { status: 404 } });
        },
        input: {},
        timeout: 10,
        error: () => {},
    });
    await sleep(60);
    handle.clear();
    assert.equal(calls, 1);
});

test('满足终止条件时调用 success 并停止', async () => {
    let calls = 0;
    let settled;
    const done = new Promise((resolve) => {
        settled = resolve;
    });
    poll({
        fetcher: () => {
            calls += 1;
            return Promise.resolve({ State: 'Ready' });
        },
        action: { requires: [{ State: 'Ready' }] },
        input: {},
        success: () => settled(),
        timeout: 10,
    });
    await done;
    assert.equal(calls, 1);
});
