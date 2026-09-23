/**
 * @file Form.List 测试
 * @description 校验操作包装的语义（尤其 move 必须是"取出插入"而非"交换"）。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createListOperations } from '@shared/ui/data-entry/form/form-list';

/** 造一个记录调用的假 fieldArray。 */
function makeSpy() {
    const calls = [];
    return {
        calls,
        append: (...args) => calls.push(['append', ...args]),
        insert: (...args) => calls.push(['insert', ...args]),
        remove: (...args) => calls.push(['remove', ...args]),
        move: (...args) => calls.push(['move', ...args]),
        swap: (...args) => calls.push(['swap', ...args]),
    };
}

test('add 不给位置时走 append', () => {
    const spy = makeSpy();
    createListOperations(spy).add({ name: 'x' });
    assert.deepEqual(spy.calls, [['append', { name: 'x' }]]);
});

test('add 给位置时走 insert', () => {
    const spy = makeSpy();
    createListOperations(spy).add({ name: 'x' }, 1);
    assert.deepEqual(spy.calls, [['insert', 1, { name: 'x' }]]);
});

test('add 不给默认值时插入空对象', () => {
    const spy = makeSpy();
    createListOperations(spy).add();
    assert.deepEqual(spy.calls, [['append', {}]]);
});

test('remove 转发索引', () => {
    const spy = makeSpy();
    createListOperations(spy).remove(2);
    assert.deepEqual(spy.calls, [['remove', 2]]);
});

test('remove 支持索引数组', () => {
    const spy = makeSpy();
    createListOperations(spy).remove([0, 2]);
    assert.deepEqual(spy.calls, [['remove', [0, 2]]]);
});

test('move 走 RHF 的 move，不是 swap', () => {
    // 关键回归点：swap 是交换语义，与 antd 的 move 不同
    const spy = makeSpy();
    createListOperations(spy).move(0, 2);
    assert.deepEqual(spy.calls, [['move', 0, 2]]);
    assert.equal(
        spy.calls.some(([name]) => name === 'swap'),
        false
    );
});
