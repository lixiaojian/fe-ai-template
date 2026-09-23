/**
 * @file rules 编译器测试
 * @description 覆盖各规则类型、message 模板、validateFirst 短路与空值边界。
 */

import test from 'node:test';
import assert from 'node:assert';
import { compileRules, formatMessage } from '@shared/ui/data-entry/form/rules';

/** 跑一遍编译后的规则，返回第一条错误消息。 */
async function run(rules, value, allValues = {}, options = {}) {
    const compiled = compileRules(rules, { label: '字段', ...options });
    for (const validate of compiled) {
        const message = await validate(value, allValues);
        if (message) {
            return message;
        }
    }
    return undefined;
}

test('required 对空串、undefined、null、空数组都判失败', async () => {
    const rules = [{ required: true, message: '必填' }];
    assert.equal(await run(rules, ''), '必填');
    assert.equal(await run(rules, undefined), '必填');
    assert.equal(await run(rules, null), '必填');
    assert.equal(await run(rules, []), '必填');
});

test('required 对 0 与 false 判通过', async () => {
    const rules = [{ required: true, message: '必填' }];
    assert.equal(await run(rules, 0), undefined);
    assert.equal(await run(rules, false), undefined);
});

test('required 非空值通过', async () => {
    assert.equal(await run([{ required: true, message: '必填' }], 'x'), undefined);
    assert.equal(await run([{ required: true, message: '必填' }], ['a']), undefined);
});

test('pattern 匹配与不匹配', async () => {
    const rules = [{ pattern: /^\d+$/, message: '只能数字' }];
    assert.equal(await run(rules, '123'), undefined);
    assert.equal(await run(rules, '12a'), '只能数字');
});

test('min / max 作用于字符串长度与数字大小', async () => {
    assert.equal(await run([{ min: 3, message: '太短' }], 'ab'), '太短');
    assert.equal(await run([{ min: 3, message: '太短' }], 'abc'), undefined);
    assert.equal(await run([{ min: 3, message: '太小' }], 2), '太小');
    assert.equal(await run([{ max: 5, message: '太大' }], 6), '太大');
});

test('min / max 对 undefined 跳过而非报错', async () => {
    assert.equal(await run([{ min: 3, message: '太短' }], undefined), undefined);
    assert.equal(await run([{ max: 5, message: '太大' }], undefined), undefined);
});

test('len 校验精确长度', async () => {
    const rules = [{ len: 3, message: '要 3 位' }];
    assert.equal(await run(rules, 'abc'), undefined);
    assert.equal(await run(rules, 'ab'), '要 3 位');
    assert.equal(await run(rules, 'abcd'), '要 3 位');
});

test('whitespace 拒绝纯空白', async () => {
    const rules = [{ whitespace: true, message: '不能只有空格' }];
    assert.equal(await run(rules, '   '), '不能只有空格');
    assert.equal(await run(rules, ' a '), undefined);
});

test('type 支持 string / number / integer / url / email / array', async () => {
    assert.equal(await run([{ type: 'number', message: '要数字' }], '1.5'), undefined);
    assert.equal(await run([{ type: 'number', message: '要数字' }], 'abc'), '要数字');
    assert.equal(await run([{ type: 'integer', message: '要整数' }], '1.5'), '要整数');
    assert.equal(await run([{ type: 'integer', message: '要整数' }], '3'), undefined);
    assert.equal(await run([{ type: 'email', message: '要邮箱' }], 'a@b.com'), undefined);
    assert.equal(await run([{ type: 'email', message: '要邮箱' }], 'nope'), '要邮箱');
    assert.equal(await run([{ type: 'url', message: '要链接' }], 'https://a.com'), undefined);
    assert.equal(await run([{ type: 'url', message: '要链接' }], 'nope'), '要链接');
    assert.equal(await run([{ type: 'array', message: '要数组' }], [1]), undefined);
    assert.equal(await run([{ type: 'array', message: '要数组' }], 'x'), '要数组');
});

test('enum 限定取值', async () => {
    const rules = [{ enum: ['a', 'b'], message: '只能是 a 或 b' }];
    assert.equal(await run(rules, 'a'), undefined);
    assert.equal(await run(rules, 'c'), '只能是 a 或 b');
});

test('自定义 validator 可返回消息，也可返回 Promise', async () => {
    const sync = [{ validator: (v) => (v === 'ok' ? undefined : '不对') }];
    assert.equal(await run(sync, 'no'), '不对');
    assert.equal(await run(sync, 'ok'), undefined);

    const async_ = [{ validator: async (v) => (v === 'ok' ? undefined : '异步不对') }];
    assert.equal(await run(async_, 'no'), '异步不对');
});

test('validator 抛错视为校验失败，取其 message', async () => {
    const rules = [
        {
            validator: () => {
                throw new Error('炸了');
            },
        },
    ];
    assert.equal(await run(rules, 'x'), '炸了');
});

test('transform 在校验前转换值', async () => {
    const rules = [{ transform: (v) => v.trim(), len: 2, message: '要 2 位' }];
    assert.equal(await run(rules, ' ab '), undefined);
});

test('rules 为空或非数组时返回空数组', async () => {
    assert.deepEqual(compileRules(undefined), []);
    assert.deepEqual(compileRules([]), []);
});

test('按序执行，首条错误后短路（validateFirst 语义）', async () => {
    const calls = [];
    const rules = [
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
    ];
    const message = await run(rules, 'x');
    assert.equal(message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('validateFirst 为 false 时仍短路（RHF 单字段只保留一条错误）', async () => {
    const calls = [];
    const rules = [
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
    ];
    const message = await run(rules, 'x', {}, { validateFirst: false });
    assert.equal(message, '第一条');
    assert.deepEqual(calls, ['first']);
});

test('message 模板替换 ${label} 等变量', () => {
    assert.equal(
        formatMessage('${label} 至少 ${min} 个字符', { label: '名称', min: 3 }),
        '名称 至少 3 个字符'
    );
});

test('message 缺失变量时回退默认文案，不渲染 undefined', () => {
    assert.equal(
        formatMessage('${label} 至少 ${min} 个字符', { label: '名称' }, '格式不正确'),
        '格式不正确'
    );
});

test('message 可为函数，接收当前值', () => {
    const rules = [{ len: 3, message: (value) => `「${value}」长度不对` }];
    return run(rules, 'ab').then((message) => {
        assert.equal(message, '「ab」长度不对');
    });
});

test('未给 message 时使用内置默认文案', async () => {
    assert.equal(await run([{ required: true }], ''), '字段 为必填项');
    assert.equal(await run([{ pattern: /^\d+$/ }], 'a'), '字段 格式不正确');
});
