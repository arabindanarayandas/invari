import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ApplicationsPage from './pages/ApplicationsPage';
import DashboardPage from './pages/DashboardPage';
import GlobalDashboardPage from './pages/GlobalDashboardPage';
import DemoLandingPage from './pages/DemoLandingPage';
import PlaygroundPage from './pages/PlaygroundPage';
import { useState, useEffect } from 'react';
import apiClient from './api/client';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Global Dashboard page wrapper
function GlobalDashboardPageWrapper() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavigate = (view) => {
    if (view === 'applications') navigate('/agents');
    else if (view === 'dashboard') navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <GlobalDashboardPage onNavigate={handleNavigate} onLogout={handleLogout} />
  );
}

// Applications page wrapper with routing
function ApplicationsPageWrapper() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSelectApplication = (app) => {
    navigate(`/agents/${app.id}`);
  };

  const handleNavigate = (view) => {
    if (view === 'dashboard') navigate('/dashboard');
    else if (view === 'applications') navigate('/agents');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ApplicationsPage
      onSelectApplication={handleSelectApplication}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />
  );
}

// Dashboard page wrapper with routing
function DashboardPageWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await apiClient.getAgent(id);
        if (response.success) {
          setApplication(response.data);
        } else {
          navigate('/agents');
        }
      } catch (error) {
        console.error('Failed to fetch agent:', error);
        navigate('/agents');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAgent();
    }
  }, [id, navigate]);

  const handleBackToApplications = () => {
    navigate('/agents');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-slate-400">Loading agent...</div>
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <DashboardPage
      application={application}
      onBack={handleBackToApplications}
      onLogout={handleLogout}
    />
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><GlobalDashboardPageWrapper /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><ApplicationsPageWrapper /></ProtectedRoute>} />
      <Route path="/agents/:id" element={<ProtectedRoute><DashboardPageWrapper /></ProtectedRoute>} />
      {/* Public demo routes — no authentication required */}
      <Route path="/demo" element={<DemoLandingPage />} />
      <Route path="/playground" element={<PlaygroundPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
