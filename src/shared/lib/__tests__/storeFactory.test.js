/**
 * @file 异步 store 工厂测试
 * @description reset 与在飞请求的竞态、并发 ensure 的等待语义。
 */

import test from 'node:test';
import assert from 'node:assert';
import { create } from 'zustand';
import { createAsyncStoreSlice } from '@shared/lib/storeFactory.js';

/** 造一个异步 store，fetcher 用外部可控的 resolve/reject。 */
function makeStore() {
    const pending = [];
    const useStore = create((...args) => ({
        ...createAsyncStoreSlice({
            name: 'test',
            initialData: { list: null },
            fetcher: () =>
                new Promise((resolve, reject) => {
                    pending.push({ resolve, reject });
                }),
        })(...args),
    }));
    return { useStore, pending };
}

test('reset() 后在飞请求的结果被丢弃', async () => {
    const { useStore, pending } = makeStore();
    const promise = useStore.getState().fetch();

    useStore.getState().reset();
    pending[0].resolve({ list: [1] });
    await promise;

    assert.deepEqual(useStore.getState().list, null);
    assert.equal(useStore.getState().loaded, false);
    assert.equal(useStore.getState().isLoading, false);
});

test('reset() 后在飞请求的失败不会写回错误', async () => {
    const { useStore, pending } = makeStore();
    const promise = useStore.getState().fetch();

    useStore.getState().reset();
    pending[0].reject(new Error('boom'));
    await promise;

    assert.equal(useStore.getState().error, null);
    assert.equal(useStore.getState().loaded, false);
});

test('并发 ensure()：后来者等到数据加载完成才 resolve', async () => {
    const { useStore, pending } = makeStore();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const first = useStore.getState().ensure();
    let secondDone = false;
    const second = useStore
        .getState()
        .ensure()
        .then(() => {
            secondDone = true;
        });

    // 请求还没返回：后来者不应先 resolve
    await sleep(10);
    assert.equal(secondDone, false);
    assert.equal(useStore.getState().loaded, false);

    pending[0].resolve({ list: [2] });
    await second;
    assert.equal(secondDone, true);
    assert.deepEqual(useStore.getState().list, [2]);
    assert.equal(useStore.getState().loaded, true);
    await first;
});

test('并发 fetch()：只发一次请求，两个调用者共享同一结果', async () => {
    const { useStore, pending } = makeStore();
    const a = useStore.getState().fetch();
    const b = useStore.getState().fetch();

    assert.equal(pending.length, 1);
    pending[0].resolve({ list: [3] });
    await Promise.all([a, b]);

    assert.deepEqual(useStore.getState().list, [3]);
});

test('reset() 后可以重新加载', async () => {
    const { useStore, pending } = makeStore();
    const first = useStore.getState().fetch();
    pending[0].resolve({ list: [4] });
    await first;

    useStore.getState().reset();
    assert.equal(useStore.getState().loaded, false);

    const second = useStore.getState().fetch();
    pending[1].resolve({ list: [5] });
    await second;
    assert.deepEqual(useStore.getState().list, [5]);
    assert.equal(useStore.getState().loaded, true);
});

test('fetch 失败后 error 写入，loaded 保持 false', async () => {
    const { useStore, pending } = makeStore();
    const promise = useStore.getState().fetch();
    pending[0].reject(new Error('boom'));
    await promise;

    assert.equal(useStore.getState().error, 'test 加载失败');
    assert.equal(useStore.getState().loaded, false);
    assert.equal(useStore.getState().isLoading, false);
});
