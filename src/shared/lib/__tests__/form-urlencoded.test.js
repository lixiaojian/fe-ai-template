/**
 * @file form-urlencoded 序列化测试
 * @description 覆盖 jQuery 风格序列化，以及不能按普通对象展开的二进制/原生类型。
 */

import test from 'node:test';
import assert from 'node:assert';
import { serializeForm } from '@shared/lib/form-urlencoded';

test('普通对象按 jQuery 风格展开数组与嵌套对象', () => {
    assert.equal(
        serializeForm({ a: 1, b: ['x', 'y'], c: { d: 'e' } }),
        'a=1&b%5B0%5D=x&b%5B1%5D=y&c%5Bd%5D=e'
    );
});

test('空值与 undefined 的处理', () => {
    assert.equal(serializeForm({ a: null, b: undefined, c: '' }), 'a=&c=');
});

test('空格编码为 +', () => {
    assert.equal(serializeForm({ q: 'a b' }), 'q=a+b');
});

test('FormData 原样返回，不被展开成空串', () => {
    const formData = new FormData();
    formData.append('file', new Blob(['abc']), 'a.txt');
    formData.append('name', 'x');
    assert.equal(serializeForm(formData), formData);
});

test('URLSearchParams 原样返回', () => {
    const params = new URLSearchParams('a=1');
    assert.equal(serializeForm(params), params);
});

test('Blob 原样返回', () => {
    const blob = new Blob(['abc']);
    assert.equal(serializeForm(blob), blob);
});

test('Date 序列化为 ISO 字符串，而非空对象', () => {
    assert.equal(serializeForm({ d: new Date(0) }), 'd=1970-01-01T00%3A00%3A00.000Z');
});

test('顶层 Date 原样返回', () => {
    const date = new Date(0);
    assert.equal(serializeForm(date), date);
});

test('非对象值原样返回', () => {
    assert.equal(serializeForm('a=1'), 'a=1');
    assert.equal(serializeForm(undefined), undefined);
});
