/**
 * @file Form 主体测试
 * @description 校验提交回调、onValuesChange 的触发边界与 requiredMark 推导。
 */

import test from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Form } from '@shared/ui/data-entry/form';
import { Input } from '@shared/ui/data-entry/input';
import {
    firstErrorPath,
    isUserEvent,
    renderRequiredMark,
} from '@shared/ui/data-entry/form/index.jsx';

test('isUserEvent：带 type 的 watch 回调视为用户交互', () => {
    assert.equal(isUserEvent({ type: 'change', name: 'a' }), true);
    assert.equal(isUserEvent({ type: 'blur', name: 'a' }), true);
});

test('isUserEvent：无 type 的回调（setValue 触发）不算用户交互', () => {
    // 关键回归点：antd 的 setFieldsValue 不触发 onValuesChange
    assert.equal(isUserEvent({ name: 'a' }), false);
    assert.equal(isUserEvent(undefined), false);
});

test('firstErrorPath 下钻到第一个叶子字段的完整路径', () => {
    // 关键回归点：列表字段的顶层键是 items，DOM 上的 data-field-name 是 items.0.value
    assert.equal(
        firstErrorPath({ items: [{ value: { type: 'validate', message: '不能为空' } }] }),
        'items.0.value'
    );
    assert.equal(firstErrorPath({ a: { type: 'validate', message: '错了' } }), 'a');
    assert.equal(firstErrorPath({ a: { b: { type: 'validate', message: '错了' } } }), 'a.b');
    assert.equal(firstErrorPath({}), undefined);
    assert.equal(firstErrorPath(undefined), undefined);
});

test('requiredMark 为 true 时显示必填星号', () => {
    assert.equal(renderRequiredMark(true, { required: true }), '*');
});

test('requiredMark 为 false 时不显示', () => {
    assert.equal(renderRequiredMark(false, { required: true }), null);
});

test('requiredMark 为 optional 时对非必填字段显示「(可选)」', () => {
    assert.equal(renderRequiredMark('optional', { required: false }), '(可选)');
    assert.equal(renderRequiredMark('optional', { required: true }), '*');
});

test('requiredMark 为函数时使用其返回值', () => {
    assert.equal(
        renderRequiredMark((label, { required }) => (required ? '必填' : ''), { required: true }),
        '必填'
    );
});

test('Form 能渲染出 form 元素并透传 className', () => {
    const html = renderToStaticMarkup(
        h(Form, { className: 'my-form' }, h(Form.Item, { name: 'a', label: 'A' }, h(Input, null)))
    );
    assert.match(html, /<form/);
    assert.match(html, /my-form/);
});

test('Form.Item 在 Form 外使用时报错', () => {
    assert.throws(
        () => renderToStaticMarkup(h(Form.Item, { name: 'a' }, h(Input, null))),
        /必须放在 <Form> 内部/
    );
});
