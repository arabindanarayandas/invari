import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DemoLandingPage from './pages/DemoLandingPage';
import PlaygroundPage from './pages/PlaygroundPage';

/**
 * Demo-only App - No authentication, no protected routes.
 * Only includes /demo and /playground for public demo domain.
 */
function AppDemo() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/demo" element={<DemoLandingPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppDemo;
