import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login        from './pages/Login';
import Setup        from './pages/Setup';
import AdminLayout  from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

import Dashboard    from './pages/admin/Dashboard';
import LiveTracking from './pages/admin/LiveTracking';
import Employees    from './pages/admin/Employees';
import Shops        from './pages/admin/Shops';
import RouteManager from './pages/admin/RouteManager';
import AttendancePage from './pages/admin/AttendancePage';
import AlertsPage   from './pages/admin/AlertsPage';
import ReportsPage  from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import EmployeeHome from './pages/employee/EmployeeHome';

function Guard({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🚚</div>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/employee" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const home = user ? (user.role === 'admin' ? '/admin' : '/employee') : '/login';

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={home} replace />} />
      <Route path="/setup" element={!user ? <Setup /> : <Navigate to={home} replace />} />

      <Route path="/admin" element={<Guard adminOnly><AdminLayout /></Guard>}>
        <Route index            element={<Dashboard />} />
        <Route path="live"      element={<LiveTracking />} />
        <Route path="employees" element={<Employees />} />
        <Route path="shops"     element={<Shops />} />
        <Route path="routes"    element={<RouteManager />} />
        <Route path="attendance"element={<AttendancePage />} />
        <Route path="alerts"    element={<AlertsPage />} />
        <Route path="reports"   element={<ReportsPage />} />
        <Route path="settings"  element={<SettingsPage />} />
      </Route>

      <Route path="/employee" element={<Guard><EmployeeLayout /></Guard>}>
        <Route index element={<EmployeeHome />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
