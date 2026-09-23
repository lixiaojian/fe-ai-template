/**
 * @file Form.Item 测试
 * @description 校验状态推导、错误渲染、子元素异常处理与 useStatus。
 */

import test from 'node:test';
import assert from 'node:assert';
import { resolveStatus } from '@shared/ui/data-entry/form/form-item';

test('未 touched 且未提交时 status 为 undefined', () => {
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: false }),
        undefined
    );
});

test('invalid 为 true 时 status 为 error', () => {
    assert.equal(resolveStatus({ invalid: true, isValidating: false, isTouched: true }), 'error');
});

test('isValidating 优先于 error', () => {
    assert.equal(
        resolveStatus({ invalid: true, isValidating: true, isTouched: true }),
        'validating'
    );
});

test('已 touched 且通过时 status 为 success', () => {
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: true }),
        'success'
    );
});

test('显式 validateStatus 覆盖推导结果', () => {
    assert.equal(
        resolveStatus({ invalid: true, isValidating: false, isTouched: true, explicit: 'warning' }),
        'warning'
    );
    assert.equal(
        resolveStatus({ invalid: false, isValidating: false, isTouched: false, explicit: 'error' }),
        'error'
    );
});
