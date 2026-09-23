import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@shared/ui/sonner';
import App1 from './app1/pages/index.jsx';
import App2 from './app2/pages/index.jsx';

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/app1/*" element={<App1 />} />
                <Route path="/app2/*" element={<App2 />} />
                <Route path="*" element={<Navigate to="/app1/" replace />} />
            </Routes>
            {/* 全局成功通知：右上角展示，2 秒后自动消失 */}
            <Toaster position="top-right" duration={2000} />
        </>
    );
}
