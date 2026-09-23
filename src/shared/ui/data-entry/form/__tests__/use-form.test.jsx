/**
 * @file FormInstance 与合成 resolver 测试
 * @description 用 createFormControl 直接驱动，不经组件树。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createFormControl } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    composeResolver,
    createFormInstance,
    getValueByPath,
    normalizeValidateTrigger,
} from '@shared/ui/data-entry/form/use-form';

/** 造一个已订阅的 control，模拟 Form 内部的初始化。 */
function makeControl(options) {
    const control = createFormControl(options);
    control.subscribe({ formState: {}, callback: () => {} });
    return control;
}

/**
 * 造一个已绑定 RHF 的实例。
 * @param {Object} control - RHF 的 control 对象。
 * @param {string[]} names - 需要标记为「已挂载」的字段名。
 * @returns {Object} FormInstance。
 */
function bindFormInstance(control, names) {
    const instance = createFormInstance();
    instance._bind(control);
    for (const name of names) {
        instance._mountedFields.add(name);
    }
    return instance;
}

/** 挂载一个字段，让 RHF 认为它已注册。 */
function mount(control, name, value = '') {
    const element = { name, type: 'text', value, focus() {} };
    control.register(name).ref(element);
    return element;
}

/** 造一个 registry，等价于 Form.Item 注册后的形态。 */
function makeRegistry(entries) {
    return new Map(Object.entries(entries));
}

test('normalizeValidateTrigger 缺省为 onChange', () => {
    assert.deepEqual(normalizeValidateTrigger(undefined), ['onChange']);
    assert.deepEqual(normalizeValidateTrigger(null), ['onChange']);
});

test('normalizeValidateTrigger 支持字符串与数组', () => {
    assert.deepEqual(normalizeValidateTrigger('onBlur'), ['onBlur']);
    assert.deepEqual(normalizeValidateTrigger(['onChange', 'onBlur']), ['onChange', 'onBlur']);
});

test('normalizeValidateTrigger 过滤不认识的取值并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.deepEqual(normalizeValidateTrigger(['onChange', 'onFocus']), ['onChange']);
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('getValueByPath 支持点号与数组下标', () => {
    const values = { a: { b: 1 }, list: [{ x: 'p' }, { x: 'q' }] };
    assert.equal(getValueByPath(values, 'a.b'), 1);
    assert.equal(getValueByPath(values, 'list.1.x'), 'q');
    assert.equal(getValueByPath(values, 'missing.deep'), undefined);
    assert.equal(getValueByPath(values, 'a.b.c'), undefined);
});

test('合成 resolver：无用户 resolver 时只跑字段规则', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '规则错误' }], label: 'A' } });
    const resolver = composeResolver(null, registry);
    const result = await resolver({ a: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a.message, '规则错误');
});

test('合成 resolver：用户 resolver 与字段规则同时生效', async () => {
    const registry = makeRegistry({ b: { rules: [{ validator: () => '规则-b' }], label: 'B' } });
    const schema = z.object({ a: z.string().min(5, 'zod-a'), b: z.string() });
    const resolver = composeResolver(zodResolver(schema), registry);
    const result = await resolver({ a: '', b: '' }, undefined, { names: ['a', 'b'] });
    assert.equal(result.errors.a.message, 'zod-a');
    assert.equal(result.errors.b.message, '规则-b');
});

test('合成 resolver：只校验指定字段时不改动其他字段的错误', async () => {
    const registry = makeRegistry({ b: { rules: [{ validator: () => '规则-b' }], label: 'B' } });
    const resolver = composeResolver(null, registry);
    const result = await resolver({ a: 'ok', b: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a, undefined);
    assert.equal(result.errors.b, undefined);
});

test('合成 resolver：rules 短路，只取第一条错误', async () => {
    const calls = [];
    const registry = makeRegistry({
        a: {
            rules: [
                {
                    validator: () => {
                        calls.push('first');
                        return '第一条';
                    },
                },
                {
                    validator: () => {
                        calls.push('second');
                        return '第二条';
                    },
                },
            ],
            label: 'A',
        },
    });
    const result = await composeResolver(null, registry)({ a: '' }, undefined, { names: ['a'] });
    assert.equal(result.errors.a.message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('合成 resolver：数组路径上的规则错误落到嵌套结构', async () => {
    const registry = makeRegistry({
        'list.0.v': { rules: [{ validator: () => '第 0 项必填' }], label: 'V' },
    });
    const result = await composeResolver(null, registry)({ list: [{ v: '' }] }, undefined, {
        names: ['list.0.v'],
    });
    // errors 是按路径嵌套的对象，读取时同样走路径
    assert.equal(getValueByPath(result.errors, 'list.0.v').message, '第 0 项必填');
});

test('FormInstance：读写值与错误', async () => {
    const control = makeControl({ defaultValues: { a: 'init' } });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    assert.equal(instance.getFieldValue('a'), 'init');
    assert.deepEqual(instance.getFieldsValue(), { a: 'init' });

    instance.setFieldValue('a', 'changed');
    assert.equal(instance.getFieldValue('a'), 'changed');
});

test('FormInstance：setFieldValue 会清掉该字段已有的错误', async () => {
    const control = makeControl({ defaultValues: { a: '' }, criteriaMode: 'all' });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    control.register('a', { validate: { r: () => '旧错误' } });
    await instance.validateFields(['a']).catch(() => {});
    assert.equal(instance.getFieldError('a')[0], '旧错误');

    instance.setFieldValue('a', 'x');
    assert.deepEqual(instance.getFieldError('a'), []);
});

test('FormInstance：setFieldsValue 可写入未挂载字段（antd 语义）', () => {
    const control = makeControl({ defaultValues: { a: '' } });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    instance.setFieldsValue({ a: 'av', notMounted: 'nv' });
    assert.equal(instance.getFieldValue('a'), 'av');
    // 关键回归点：antd 允许先写值、后渲染字段，提交时能取到
    assert.equal(instance.getFieldValue('notMounted'), 'nv');
});

test('FormInstance：setFieldsValue 支持嵌套路径', () => {
    const control = makeControl({ defaultValues: { user: { name: '' } } });
    mount(control, 'user.name');
    const instance = bindFormInstance(control, ['user.name']);

    instance.setFieldsValue({ user: { name: '张三' } });
    assert.equal(instance.getFieldValue('user.name'), '张三');
});

test('FormInstance：isFieldTouched / isFieldsTouched', async () => {
    const control = makeControl({ defaultValues: { a: '', b: '' } });
    const element = mount(control, 'a');
    mount(control, 'b');
    const instance = bindFormInstance(control, ['a', 'b']);

    assert.equal(instance.isFieldTouched('a'), false);
    control.register('a').onBlur({ target: element, type: 'blur' });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(instance.isFieldTouched('a'), true);
    assert.equal(instance.isFieldsTouched(['a', 'b']), true);
});

test('FormInstance：validateFields 通过时 resolve 值，失败时 reject 出 errorFields', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '必填' }], label: 'A' } });
    const control = makeControl({
        defaultValues: { a: '' },
        resolver: composeResolver(null, registry),
    });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    await assert.rejects(
        () => instance.validateFields(['a']),
        (error) => {
            assert.deepEqual(error.errorFields[0].name, ['a']);
            assert.deepEqual(error.errorFields[0].errors, ['必填']);
            return true;
        }
    );
});

test('FormInstance：resetFields 恢复初始值并清错误', async () => {
    const registry = makeRegistry({ a: { rules: [{ validator: () => '必填' }], label: 'A' } });
    const control = makeControl({
        defaultValues: { a: 'init' },
        resolver: composeResolver(null, registry),
    });
    mount(control, 'a');
    const instance = bindFormInstance(control, ['a']);

    instance.setFieldValue('a', '');
    await instance.validateFields(['a']).catch(() => {});
    assert.equal(instance.getFieldError('a')[0], '必填');

    instance.resetFields();
    assert.equal(instance.getFieldValue('a'), 'init');
    assert.deepEqual(instance.getFieldError('a'), []);
});

test('FormInstance：getFieldInstance / setFields 明确抛错', () => {
    const control = makeControl({ defaultValues: {} });
    const instance = bindFormInstance(control, []);

    assert.throws(() => instance.getFieldInstance('a'), /getFieldValue/);
    assert.throws(() => instance.setFields([]), /setFieldsValue/);
});
