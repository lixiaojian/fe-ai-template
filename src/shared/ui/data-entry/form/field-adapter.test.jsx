/**
 * @file 控件适配表测试
 * @description 校验各控件被注入正确的属性对，且 aria-invalid 落在能透传的节点上。
 */

import test from 'node:test';
import assert from 'node:assert';
import { createElement as h, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from '@shared/ui/data-entry/input';
import { Textarea } from '@shared/ui/data-entry/textarea';
import { Switch } from '@shared/ui/data-entry/switch';
import { Checkbox } from '@shared/ui/data-entry/checkbox';
import { RadioGroup, RadioGroupItem } from '@shared/ui/data-entry/radio-group';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@shared/ui/data-entry/select';
import { injectFieldProps, getFieldBinding } from '@shared/ui/data-entry/form/field-adapter';

/** 渲染注入后的元素，返回 HTML。 */
function render(child, props) {
    return renderToStaticMarkup(injectFieldProps(child, props));
}

test('Input 走默认的 value / onChange', () => {
    const html = render(h(Input, null), {
        value: 'v',
        onChange: () => {},
        invalid: false,
        id: 'f_a',
    });
    assert.match(html, /value="v"/);
    assert.match(html, /id="f_a"/);
});

test('Textarea 走默认的 value / onChange', () => {
    const html = render(h(Textarea, null), {
        value: 'v',
        onChange: () => {},
        invalid: false,
        id: 'f_b',
    });
    assert.match(html, /id="f_b"/);
});

test('Switch 走 checked / onCheckedChange', () => {
    const html = render(h(Switch, null), {
        value: true,
        onChange: () => {},
        invalid: false,
        id: 'f_c',
    });
    // Base UI 的 Switch 受控时 aria-checked 反映选中态
    assert.match(html, /aria-checked="true"/);
    assert.match(html, /id="f_c"/);
});

test('Checkbox 走 checked / onCheckedChange', () => {
    const html = render(h(Checkbox, null), {
        value: true,
        onChange: () => {},
        invalid: false,
        id: 'f_d',
    });
    assert.match(html, /aria-checked="true"/);
});

test('RadioGroup 走 value / onValueChange', () => {
    const html = render(h(RadioGroup, null, h(RadioGroupItem, { value: 'a' }, 'A')), {
        value: 'a',
        onChange: () => {},
        invalid: false,
        id: 'f_e',
    });
    assert.match(html, /role="radiogroup"/);
    assert.match(html, /aria-checked="true"/);
});

test('Select 走 value / onValueChange，且 aria-invalid 落在 SelectTrigger 上', () => {
    // 回归点：SelectRoot 不透传未知属性，aria-invalid 放根节点会丢失
    const html = render(
        h(
            Select,
            null,
            h(SelectTrigger, null, h(SelectValue, null)),
            h(SelectContent, null, h(SelectItem, { value: 'a' }, 'A'))
        ),
        { value: 'a', onChange: () => {}, invalid: true, id: 'f_f' }
    );
    assert.match(html, /data-slot="select-value"[^>]*>a</);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /id="f_f"/);
});

test('value 为 undefined 时归一为空串，避免控件退化为非受控', () => {
    // 回归点：Base UI 的 Field.Control 一旦以 undefined 初始化就永久非受控，
    // 后续 store 里的值不会回填到输入框
    const html = render(h(Input, null), {
        value: undefined,
        onChange: () => {},
        invalid: false,
        id: 'f_z',
    });
    assert.match(html, /value=""/);
    assert.equal(/value="undefined"/.test(html), false);
});

test('checked 类控件的 undefined 归一为 false', () => {
    const html = render(h(Switch, null), {
        value: undefined,
        onChange: () => {},
        invalid: false,
        id: 'f_y',
    });
    assert.match(html, /aria-checked="false"/);
});

test('invalid 为 true 时 aria-invalid 为 true', () => {
    const html = render(h(Input, null), {
        value: '',
        onChange: () => {},
        invalid: true,
        id: 'f_g',
    });
    assert.match(html, /aria-invalid="true"/);
});

test('getFieldBinding 对未知组件回退 value / onChange', () => {
    const binding = getFieldBinding(function Unknown() {});
    assert.equal(binding.valueProp, 'value');
    assert.equal(binding.trigger, 'onChange');
    assert.equal(binding.forwardTo, undefined);
});

test('valuePropName / trigger 显式覆盖适配表', () => {
    const html = renderToStaticMarkup(
        injectFieldProps(h(Input, null), {
            value: 'v',
            onChange: () => {},
            invalid: false,
            id: 'f_h',
            valuePropName: 'data-x',
            trigger: 'onInput',
        })
    );
    assert.match(html, /data-x="v"/);
});

test('子元素不是合法元素时原样返回并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.equal(
            injectFieldProps(null, { value: '', onChange: () => {}, invalid: false }),
            null
        );
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('子元素是字符串时原样返回并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        assert.equal(
            injectFieldProps('文本', { value: '', onChange: () => {}, invalid: false }),
            '文本'
        );
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});

test('子元素是数组时取第一个并告警', () => {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));

    try {
        const result = injectFieldProps([h(Input, { key: 'a' }), h(Input, { key: 'b' })], {
            value: 'v',
            onChange: () => {},
            invalid: false,
        });
        assert.ok(isValidElement(result));
        assert.equal(warnings.length, 1);
    } finally {
        console.warn = original;
    }
});
