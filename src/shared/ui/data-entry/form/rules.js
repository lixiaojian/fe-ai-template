/**
 * @file rules 编译器
 * @description 把 Ant Design 风格的 rules 数组编译成一组按序执行的校验函数。
 * 每个函数接收 (value, allValues)，返回错误消息字符串表示失败、返回 undefined 表示通过。
 * 由 form 目录内的合成 resolver 统一调用（见 use-form.js）。
 *
 * 与 RHF 原生 validate 的关系：RHF 的 validate 只在没有 resolver 时执行，
 * 本模块的输出因此不交给 register，而是由合成 resolver 接管。
 */

/** 内置默认文案，antd 在未给 message 时使用同款措辞。 */
const DEFAULT_MESSAGES = {
    required: '${label} 为必填项',
    pattern: '${label} 格式不正确',
    whitespace: '${label} 不能为纯空白字符',
    min: '${label} 不能小于 ${min}',
    max: '${label} 不能大于 ${max}',
    len: '${label} 长度必须为 ${len}',
    enum: '${label} 必须是 ${enum} 之一',
    type: '${label} 不是合法的 ${type}',
};

/** type 规则支持的类型 → 判定函数。 */
const TYPE_CHECKERS = {
    string: (value) => typeof value === 'string',
    // antd 的 type 判定接受数字字符串（表单控件的值天然是字符串）
    number: (value) => String(value).trim() !== '' && !Number.isNaN(Number(value)),
    integer: (value) => String(value).trim() !== '' && Number.isInteger(Number(value)),
    float: (value) => String(value).trim() !== '' && !Number.isNaN(Number(value)),
    boolean: (value) => typeof value === 'boolean',
    array: (value) => Array.isArray(value),
    object: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
    date: (value) => value instanceof Date && !Number.isNaN(value.getTime()),
    url: (value) => /^https?:\/\/[^\s]+$/i.test(String(value)),
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
};

/**
 * 判断值是否为空。空串、null、undefined、空数组都算空；0 与 false 不算空（与 antd 一致）。
 * @param {*} value - 待判定的值。
 * @returns {boolean} 是否为空。
 */
function isEmptyValue(value) {
    if (value === undefined || value === null || value === '') {
        return true;
    }
    return Array.isArray(value) && value.length === 0;
}

/**
 * 替换 message 模板里的 ${var} 占位符。
 * @param {string|Function} template - 模板字符串或返回字符串的函数。
 * @param {Object} variables - 变量表。
 * @param {string} [defaultMessage] - 模板中有变量缺失时使用的回退文案。
 * @param {*} [value] - 当前字段值，供函数形式的 template 使用。
 * @returns {string} 替换后的消息。
 */
function formatMessage(template, variables, defaultMessage, value) {
    if (typeof template === 'function') {
        return String(template(value));
    }

    const source = template ?? defaultMessage ?? '';
    if (!source) {
        return '';
    }

    let missing = false;
    const result = String(source).replace(/\$\{(\w+)\}/g, (_, key) => {
        if (variables[key] === undefined) {
            missing = true;
            return '';
        }
        return String(variables[key]);
    });

    // 模板引用了不存在的变量时整体回退，避免渲染出「至少  个字符」这种断句
    if (missing) {
        return defaultMessage ? formatMessage(defaultMessage, variables, undefined, value) : '';
    }

    return result;
}

/**
 * 取某条规则的最终消息。优先用规则自带的 message，其次用内置默认文案。
 * @param {Object} rule - 单条规则。
 * @param {string} key - 默认文案的键。
 * @param {Object} variables - 模板变量。
 * @param {*} value - 当前字段值。
 * @returns {string} 消息文案。
 */
function resolveMessage(rule, key, variables, value) {
    const fallback = DEFAULT_MESSAGES[key];
    const template = rule.message ?? fallback;
    return formatMessage(template, variables, fallback, value);
}

/**
 * 把 rules 数组编译成按序执行的校验函数数组。
 * @param {Array<Object>} [rules] - antd 风格的规则数组。
 * @param {Object} [options] - 编译选项。
 * @param {string} [options.label] - 字段标签，用于 ${label} 变量。
 * @param {string[]} [options.dependencies] - 依赖字段名（仅用于文档，实际订阅在 Form.Item 内）。
 * @returns {Array<(value: *, allValues: Object) => (string|undefined|Promise<string|undefined>)>} 校验函数数组。
 */
function compileRules(rules, options = {}) {
    if (!Array.isArray(rules) || rules.length === 0) {
        return [];
    }

    const { label = '' } = options;
    const validators = [];

    for (const rule of rules) {
        // warningOnly 由 Form.Item 单独处理，不进入错误通道，否则会阻断提交
        if (!rule || rule.warningOnly) {
            continue;
        }

        // transform 先于本条规则的其他判定生效
        const transform = typeof rule.transform === 'function' ? rule.transform : undefined;

        const check = (value) => {
            const variables = { label, ...rule, value };

            if (rule.required) {
                // required 的 message 若是字符串，antd 直接当文案用，不做变量替换
                if (isEmptyValue(value)) {
                    return typeof rule.message === 'string' && !rule.message.includes('${')
                        ? rule.message
                        : resolveMessage(rule, 'required', variables, value);
                }
                // required 单独给出且值非空时不再跑本规则的其他判定
                if (rule.pattern === undefined && rule.type === undefined) {
                    return undefined;
                }
            }

            if (
                rule.whitespace &&
                typeof value === 'string' &&
                value.trim() === '' &&
                value !== ''
            ) {
                return resolveMessage(rule, 'whitespace', variables, value);
            }

            if (rule.pattern !== undefined && !isEmptyValue(value)) {
                if (!new RegExp(rule.pattern).test(String(value))) {
                    return resolveMessage(rule, 'pattern', variables, value);
                }
            }

            // min / max：数字比较大小，字符串比较长度；空值跳过（配合 required 使用）
            if (rule.min !== undefined && !isEmptyValue(value)) {
                const size = typeof value === 'number' ? value : String(value).length;
                if (size < rule.min) {
                    return resolveMessage(rule, 'min', variables, value);
                }
            }

            if (rule.max !== undefined && !isEmptyValue(value)) {
                const size = typeof value === 'number' ? value : String(value).length;
                if (size > rule.max) {
                    return resolveMessage(rule, 'max', variables, value);
                }
            }

            if (rule.len !== undefined && !isEmptyValue(value)) {
                const size =
                    typeof value === 'number' ? String(value).length : String(value).length;
                if (size !== rule.len) {
                    return resolveMessage(rule, 'len', variables, value);
                }
            }

            if (rule.enum !== undefined && !isEmptyValue(value)) {
                if (!rule.enum.map(String).includes(String(value))) {
                    return resolveMessage(
                        rule,
                        'enum',
                        { ...variables, enum: rule.enum.join('、') },
                        value
                    );
                }
            }

            if (rule.type !== undefined && !isEmptyValue(value)) {
                const checker = TYPE_CHECKERS[rule.type];
                if (!checker) {
                    console.warn(`[Form] rules 的 type「${rule.type}」暂不支持，已跳过该条校验。`);
                } else if (!checker(value)) {
                    return resolveMessage(rule, 'type', variables, value);
                }
            }

            return undefined;
        };

        validators.push(async (rawValue, allValues) => {
            const value = transform ? transform(rawValue) : rawValue;

            if (typeof rule.validator === 'function') {
                try {
                    const result = await rule.validator(value, allValues);
                    if (result === undefined || result === null || result === true) {
                        return undefined;
                    }
                    // validator 直接抛错或返回 Error 时取其 message
                    if (result instanceof Error) {
                        return result.message;
                    }
                    if (typeof result === 'string') {
                        return result;
                    }
                    return resolveMessage(rule, 'pattern', { ...rule, label, value }, value);
                } catch (error) {
                    return error?.message ?? String(error);
                }
            }

            return check(value);
        });
    }

    return validators;
}

export { compileRules, formatMessage, isEmptyValue };
