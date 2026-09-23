/**
 * @file 栅格列组件测试（Col）
 * @description 校验属性到类名 / 内联样式的映射：span / offset 走类名，push / pull 走位移样式。
 */

import test from 'node:test';
import assert from 'node:assert';
import { colClassName, colStyle } from '@shared/ui/layout/col';

test('span 映射为 col-span-N', () => {
    assert.equal(colClassName({ span: 12 }), 'col-span-12');
    assert.equal(colClassName({ span: 0 }), 'col-span-0');
});

test('offset 映射为 col-start-(N+1)', () => {
    // offset 是左侧留白 N 列，等价于起始线右移 N 条
    assert.equal(colClassName({ span: 6, offset: 6 }), 'col-span-6 col-start-7');
    assert.equal(colClassName({ span: 24, offset: 0 }), 'col-span-24 col-start-1');
});

test('push / pull 不产生类名，改走内联样式', () => {
    // 关键回归点：push 若也输出 col-start-*，会与 offset 撞同一 CSS 属性
    assert.equal(colClassName({ span: 8, push: 4 }), 'col-span-8');
    assert.deepEqual(colStyle({ push: 4 }), { position: 'relative', left: '16.6667%' });
    assert.deepEqual(colStyle({ pull: 4 }), { position: 'relative', right: '16.6667%' });
});

test('offset 与 push 同时给出时两者都保留且不冲突', () => {
    assert.equal(colClassName({ span: 6, offset: 3, push: 2 }), 'col-span-6 col-start-4');
    assert.deepEqual(colStyle({ span: 6, offset: 3, push: 2 }), {
        position: 'relative',
        left: '8.3333%',
    });
});

test('断点数字映射为带前缀的 col-span', () => {
    assert.equal(colClassName({ xs: 24, sm: 12 }), 'col-span-24 sm:col-span-12');
    assert.equal(colClassName({ xxl: 6 }), '2xl:col-span-6');
});

test('断点对象支持 span / offset / push / pull', () => {
    assert.equal(colClassName({ md: { span: 8, offset: 4 } }), 'md:col-span-8 md:col-start-5');
    assert.deepEqual(colStyle({ lg: { span: 6, pull: 2 } }), {
        position: 'relative',
        right: '8.3333%',
    });
});

test('空属性返回空值，不产生多余空格', () => {
    assert.equal(colClassName({}), '');
    assert.equal(colStyle({}), undefined);
});
