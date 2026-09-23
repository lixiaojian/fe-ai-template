import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    // 原 .eslintignore 的内容，ESLint 9 起改由 flat config 的 ignores 承担
    { ignores: ['node_modules', 'build', 'pnpm-lock.yaml', '.idea'] },
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    prettierRecommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
    {
        // Tailwind 类名相关规则只约束应用代码：规则文案本身会引用被禁写法，
        // 若连同 eslint.config.js 一起校验，会自己命中自己。
        files: ['src/**/*.{js,jsx}'],
        rules: {
            // Tailwind v4：CSS 变量任意值类名必须用圆括号简写，如 text-(--text)，
            // 禁止 text-[var(--text)] 写法（类名出现在字符串字面量与模板字符串中）
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'Literal[value=/-\\[var\\(--/]',
                    message: "Tailwind v4 应使用 CSS 变量简写：'xx-[var(--y)]' 应写作 'xx-(--y)'",
                },
                {
                    selector: 'TemplateElement[value.raw=/-\\[var\\(--/]',
                    message: "Tailwind v4 应使用 CSS 变量简写：'xx-[var(--y)]' 应写作 'xx-(--y)'",
                },
                {
                    selector: 'Literal[value=/-\\[1px\\]/]',
                    message: "Tailwind 应使用内置简写：'h-[1px]'/'w-[1px]' 等应写作 'h-px'/'w-px'",
                },
                {
                    selector: 'TemplateElement[value.raw=/-\\[1px\\]/]',
                    message: "Tailwind 应使用内置简写：'h-[1px]'/'w-[1px]' 等应写作 'h-px'/'w-px'",
                },
                // Tailwind v4：单个属性选择器的直接子元素变体用 *: 前缀。
                // 只匹配子选择器就是单个 [attr=value] 的情形——'[&>[role=a],[role=b]]' 这类
                // 选择器列表无法用 *: 表达，不在此规则范围内（shadcn 组件里有这种写法）
                {
                    selector: 'Literal[value=/\\[&>\\[[^,\\]]+\\]\\]:/]',
                    message:
                        "Tailwind v4 子元素变体应使用 *: 前缀：'[&>[data-slot=x]]:h-full' 应写作 '*:data-[slot=x]:h-full'",
                },
                {
                    selector: 'TemplateElement[value.raw=/\\[&>\\[[^,\\]]+\\]\\]:/]',
                    message:
                        "Tailwind v4 子元素变体应使用 *: 前缀：'[&>[data-slot=x]]:h-full' 应写作 '*:data-[slot=x]:h-full'",
                },
            ],
        },
    },
];
