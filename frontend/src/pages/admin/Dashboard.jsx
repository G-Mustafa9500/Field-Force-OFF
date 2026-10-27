import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function Dashboard() {
  const [summary, setSummary]       = useState(null);
  const [alerts,  setAlerts]        = useState([]);
  const [sessions, setSessions]     = useState([]);
  const [loading,  setLoading]      = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [s, a, se] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/alerts?isRead=false'),
          api.get(`/tracking/sessions?date=${today}`)
        ]);
        setSummary(s.data);
        setAlerts(a.data.slice(0, 5));
        setSessions(se.data.slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;

  const STATS = [
    { label: "Aaj Attendance",    value: summary?.todayAttendance || 0, icon: '📸', color: 'bg-blue-50 text-blue-600',   border: 'border-blue-200' },
    { label: 'Active Trackers',   value: summary?.activeSessions  || 0, icon: '📍', color: 'bg-green-50 text-green-600', border: 'border-green-200' },
    { label: 'Shop Check-ins',    value: summary?.todayCheckIns   || 0, icon: '🏪', color: 'bg-purple-50 text-purple-600', border: 'border-purple-200' },
    { label: 'Unread Alerts',     value: summary?.unreadAlerts    || 0, icon: '🚨', color: 'bg-red-50 text-red-600',     border: 'border-red-200' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STATS.map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-4 border ${s.border}`}>
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Live Sessions */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-700">📍 Live Sessions Aaj</h3>
            <Link to="/admin/reports" className="text-xs text-blue-500 hover:underline">Sab dekho</Link>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {sessions.length === 0
              ? <p className="text-center py-6 text-gray-400 text-sm">Koi active session nahi</p>
              : sessions.map(s => (
                <div key={s._id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.employee?.name}</p>
                    <p className="text-xs text-gray-400">{s.route?.name || 'No route'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{(s.totalKm || 0).toFixed(1)} km</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status === 'active' ? '🟢 Live' : '✅ Done'}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-700">🚨 Haaliya Alerts</h3>
            <Link to="/admin/alerts" className="text-xs text-blue-500 hover:underline">Sab dekho</Link>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {alerts.length === 0
              ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm text-green-600 font-medium">Koi alert nahi! Sab theek hai.</p>
                </div>
              ) : alerts.map(a => (
                <div key={a._id} className={`p-3 flex gap-3 ${a.severity === 'critical' ? 'bg-red-50' : 'bg-orange-50'}`}>
                  <span className="text-lg flex-shrink-0">{a.severity === 'critical' ? '🔴' : '⚠️'}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.employee?.name}</p>
                    <p className="text-xs text-gray-600">{a.description}</p>
                    <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
