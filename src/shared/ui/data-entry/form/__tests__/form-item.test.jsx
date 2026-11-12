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

test('normalize 对用户输入生效（onChange 路径）', async () => {
    const { Form, FormItem } = await import('@shared/ui/data-entry/form');
    const { useForm } = await import('@shared/ui/data-entry/form/use-form');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement: h } = await import('react');

    let capturedProps;
    function Probe(props) {
        capturedProps = props;
        return null;
    }

    let form;
    function Demo() {
        const [instance] = useForm();
        form = instance;
        return h(
            Form,
            { form: instance, initialValues: { n: '' } },
            h(FormItem, { name: 'n', label: '名称', normalize: (v) => String(v).trim() }, h(Probe))
        );
    }

    renderToStaticMarkup(h(Demo));
    capturedProps.onChange('  x  ');
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(form.getFieldValue('n'), 'x');
});

test('label 通过 aria-labelledby 关联到 Switch 的可见开关元素', async () => {
    const { Form, FormItem } = await import('@shared/ui/data-entry/form');
    const { Switch } = await import('@shared/ui/data-entry/switch');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement: h } = await import('react');

    const html = renderToStaticMarkup(
        h(
            Form,
            { initialValues: { active: true } },
            h(FormItem, { name: 'active', label: '启用' }, h(Switch))
        )
    );

    const labelId = html.match(/<label[^>]*id="([^"]+)"/)?.[1];
    assert.ok(labelId, 'label 应有 id');

    const switchTag = html.match(/<span[^>]*role="switch"[^>]*>/)?.[0];
    assert.ok(switchTag, '应渲染出 role=switch 的可见元素');
    assert.match(switchTag, new RegExp(`aria-labelledby="${labelId}"`));
});

test('label 通过 aria-labelledby 关联到 RadioGroup 的 radiogroup 容器', async () => {
    const { Form, FormItem } = await import('@shared/ui/data-entry/form');
    const { RadioGroup, RadioGroupItem } = await import('@shared/ui/data-entry/radio-group');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement: h } = await import('react');

    const html = renderToStaticMarkup(
        h(
            Form,
            { initialValues: { role: 'a' } },
            h(
                FormItem,
                { name: 'role', label: '角色' },
                h(RadioGroup, null, h(RadioGroupItem, { value: 'a' }))
            )
        )
    );

    const labelId = html.match(/<label[^>]*id="([^"]+)"/)?.[1];
    assert.ok(labelId, 'label 应有 id');
    const groupTag = html.match(/<div[^>]*role="radiogroup"[^>]*>/)?.[0];
    assert.ok(groupTag, '应渲染出 role=radiogroup 的容器');
    assert.match(groupTag, new RegExp(`aria-labelledby="${labelId}"`));
});

test('Input 保留 htmlFor 关联（可点击 label 聚焦）', async () => {
    const { Form, FormItem } = await import('@shared/ui/data-entry/form');
    const { Input } = await import('@shared/ui/data-entry/input');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { createElement: h } = await import('react');

    const html = renderToStaticMarkup(
        h(Form, null, h(FormItem, { name: 'n', label: '名称' }, h(Input)))
    );
    const label = html.match(/<label[^>]*>/)?.[0];
    const forId = label?.match(/for="([^"]+)"/)?.[1];
    assert.ok(forId, 'label 应有 htmlFor');
    assert.match(html, new RegExp(`id="${forId}"`));
});
