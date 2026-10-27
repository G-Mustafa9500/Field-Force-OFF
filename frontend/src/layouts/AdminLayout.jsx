import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/axios';

const NAV = [
  { path: '/admin',             label: 'Dashboard',     icon: '📊', exact: true },
  { path: '/admin/live',        label: 'Live Tracking', icon: '📍', live: true },
  { path: '/admin/employees',   label: 'Employees',     icon: '👥' },
  { path: '/admin/shops',       label: 'Shops',         icon: '🏪' },
  { path: '/admin/routes',      label: 'Routes',        icon: '🗺️' },
  { path: '/admin/attendance',  label: 'Attendance',    icon: '📸' },
  { path: '/admin/alerts',      label: 'Alerts',        icon: '🚨', badge: true },
  { path: '/admin/reports',     label: 'Reports',       icon: '📈' },
  { path: '/admin/settings',    label: 'Settings',      icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, logout }            = useAuth();
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const [liveCount,  setLiveCount]  = useState(0);
  const [open, setOpen]             = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [alertRes, liveRes] = await Promise.allSettled([
          api.get('/alerts/count'),
          api.get('/tracking/live')
        ]);
        if (alertRes.status === 'fulfilled') setAlertCount(alertRes.value.data.count);
        if (liveRes.status  === 'fulfilled') setLiveCount(liveRes.value.data.length);
      } catch {}
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 30000);
    return () => clearInterval(iv);
  }, []);

  const isActive = (item) => item.exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🚚</div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm leading-none truncate">Field Force</h1>
            <p className="text-gray-400 text-xs mt-0.5 truncate">{user?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {/* Live pulsing dot */}
              {item.live && liveCount > 0 && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className={`text-xs ${active ? 'text-green-200' : 'text-green-400'}`}>{liveCount}</span>
                </span>
              )}
              {/* Alert badge */}
              {item.badge && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl font-medium transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-52 bg-gray-900 flex-col flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-52 bg-gray-900 z-50 md:hidden flex flex-col">
            <SidebarContent />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setOpen(true)} className="text-gray-600 text-xl p-1">☰</button>
          <span className="font-bold text-gray-800 flex-1">Field Force</span>
          <div className="flex items-center gap-2">
            {liveCount > 0 && (
              <Link to="/admin/live" className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {liveCount} live
              </Link>
            )}
            {alertCount > 0 && (
              <Link to="/admin/alerts" className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {alertCount}
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
