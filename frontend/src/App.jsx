import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { getToken } from './services/api';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContainersPage from './pages/ContainersPage';
import BackupsPage from './pages/BackupsPage';
import RestorePage from './pages/RestorePage';
import SchedulesPage from './pages/SchedulesPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen overflow-hidden">
                <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
                  <div className="p-6">
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/containers" element={<ContainersPage />} />
                      <Route path="/backups" element={<BackupsPage />} />
                      <Route path="/restore" element={<RestorePage />} />
                      <Route path="/schedules" element={<SchedulesPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
