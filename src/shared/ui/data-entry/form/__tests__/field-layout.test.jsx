/**
 * @file 布局解析测试
 * @description labelCol / wrapperCol 到 Col props 的归一，以及三种 layout 的默认值。
 */

import test from 'node:test';
import assert from 'node:assert';
import {
    normalizeColProps,
    DEFAULT_LABEL_COL,
    DEFAULT_WRAPPER_COL,
} from '@shared/ui/data-entry/form/field-layout';

test('labelCol 归一为 Col 的 props', () => {
    assert.deepEqual(normalizeColProps({ span: 6 }), { span: 6 });
    assert.deepEqual(normalizeColProps({ span: 6, offset: 2 }), { span: 6, offset: 2 });
});

test('labelCol 支持断点对象', () => {
    assert.deepEqual(normalizeColProps({ xs: 24, md: { span: 8 } }), { xs: 24, md: { span: 8 } });
});

test('labelCol 传数字视为 span', () => {
    assert.deepEqual(normalizeColProps(6), { span: 6 });
});

test('labelCol 为空时返回 undefined，交给 Form 用默认值', () => {
    assert.equal(normalizeColProps(undefined), undefined);
    assert.equal(normalizeColProps(null), undefined);
});

test('内置默认栅格', () => {
    assert.deepEqual(DEFAULT_LABEL_COL, { span: 6 });
    assert.deepEqual(DEFAULT_WRAPPER_COL, { span: 18 });
});
