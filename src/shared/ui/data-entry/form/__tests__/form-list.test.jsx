/**
 * @file Form.List 测试
 * @description 校验操作包装的语义（尤其 move 必须是"取出插入"而非"交换"）。
 */

import test from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { createListOperations, FormList } from '@shared/ui/data-entry/form/form-list';
import { Form, FormItem } from '@shared/ui/data-entry/form';
import { Input } from '@shared/ui/data-entry/input';
import { createFormInstance } from '@shared/ui/data-entry/form/use-form';

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

test('Form.List 渲染时把列表根注册到 RHF mount，空列表也能参与提交校验', () => {
    // 回归：空列表没有子项可挂载，_names.mount 里不会有 items，
    // 提交时 resolver 的 names 过滤会把列表级 rules 整个跳过
    const form = createFormInstance();
    function Demo() {
        return h(
            Form,
            { form },
            h(
                FormList,
                { name: 'items', rules: [{ required: true, message: '至少一项' }] },
                () => null
            )
        );
    }

    renderToStaticMarkup(h(Demo));
    assert.equal(form._rhf.control._names.mount.has('items'), true);
});

test('Form.List 的列表级 rules 参与提交校验（空列表）', async () => {
    const form = createFormInstance();
    function Demo() {
        return h(
            Form,
            { form },
            h(FormItem, { name: 'name', label: '名称' }, h(Input)),
            h(
                FormList,
                { name: 'items', rules: [{ required: true, message: '至少一项' }] },
                () => null
            )
        );
    }
    renderToStaticMarkup(h(Demo));
    // 有其它字段挂载时 names 非空，列表级规则才会被 isNameRequested 过滤
    assert.equal(form._rhf.control._names.mount.has('name'), true);
    // SSR 不执行 effect，这里补上 Form.List 在浏览器中的注册行为
    form._registry.set('items', {
        rules: [{ required: true, message: '至少一项' }],
        label: 'items',
    });

    let failedWith;
    await form._rhf.handleSubmit(
        () => {
            failedWith = 'RESOLVED';
        },
        (errors) => {
            failedWith = errors;
        }
    )({ preventDefault() {}, persist() {} });

    assert.equal(failedWith?.items?.message, '至少一项');
});
