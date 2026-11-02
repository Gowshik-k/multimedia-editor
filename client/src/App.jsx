import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProjectProvider } from './context/ProjectContext';

import Dashboard from './pages/Dashboard';
import EditorWorkspace from './pages/EditorWorkspace';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading, demoLogin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-studio-950 flex flex-col items-center justify-center space-y-3 text-studio-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <span className="text-xs">Authenticating studio session...</span>
      </div>
    );
  }

  // If visiting a shared project link without login, auto-assign a demo collaborator session!
  if (!user) {
    if (location.pathname.startsWith('/project/')) {
      demoLogin(`Guest-${Math.floor(1000 + Math.random() * 9000)}`);
      return (
        <div className="min-h-screen bg-studio-950 flex flex-col items-center justify-center space-y-3 text-studio-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-xs">Joining collaborative room as Guest...</span>
        </div>
      );
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ProjectProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:id"
                element={
                  <ProtectedRoute>
                    <EditorWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProjectProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

