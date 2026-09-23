/**
 * @file 应用一占位页
 * @description 模板占位页，替换为实际业务页面。
 * @returns {JSX.Element}
 */
export default function App1() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
            <h1 className="text-2xl font-bold">应用一</h1>
            <p className="text-muted-foreground">
                路由前缀 <code className="text-brand-text">/app1/*</code>
            </p>
        </div>
    );
}
