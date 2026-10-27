import { useState, useEffect, useRef } from "react";
import api from "../../api/axios";

export default function AlertsPage() {
  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("unread");
  const [sseStatus,  setSseStatus]  = useState("connecting");
  const esRef = useRef(null);

  const load = async () => {
    try {
      const params = filter === "unread" ? "?isRead=false" : "";
      const { data } = await api.get(`/alerts${params}`);
      setAlerts(data);
    } catch {} finally { setLoading(false); }
  };

  // Polling fallback — har 15 sec
  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [filter]); // eslint-disable-line

  // SSE — real-time push
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const connect = () => {
      if (esRef.current) esRef.current.close();
      const es = new EventSource(`/api/sse?token=${token}`);
      esRef.current = es;

      es.onopen = () => setSseStatus("live");
      es.onmessage = (e) => {
        try {
          const alert = JSON.parse(e.data);
          setAlerts(prev => [alert, ...prev.filter(a => a._id !== alert._id)]);
          // Browser notification (agar permission ho)
          if (Notification.permission === "granted") {
            new Notification(`🚨 ${alert.employee?.name}`, { body: alert.description, icon: "/favicon.ico" });
          }
        } catch {}
      };
      es.onerror = () => {
        setSseStatus("polling");
        es.close();
        // Retry after 30 seconds
        setTimeout(connect, 30000);
      };
    };

    // Browser notification permission maango
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    connect();
    return () => { esRef.current?.close(); };
  }, []); // eslint-disable-line

  const markRead    = async (id) => { await api.put(`/alerts/${id}/read`); load(); };
  const markAllRead = async ()   => { await api.put("/alerts/read-all");   load(); };
  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🚨 Alerts</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {unreadCount > 0 && <p className="text-sm text-red-500 font-medium">{unreadCount} unread</p>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sseStatus === "live" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
              {sseStatus === "live" ? (<><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live</>) : "Polling"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline px-3 py-1.5">Sab Read</button>}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none">
            <option value="unread">Unread</option>
            <option value="all">Sab</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a._id}
              className={`rounded-2xl border-l-4 p-4 ${a.isRead ? "bg-white border-gray-200 opacity-60" : a.severity === "critical" ? "bg-red-50 border-red-500" : a.severity === "alert" ? "bg-orange-50 border-orange-400" : "bg-yellow-50 border-yellow-300"}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{a.severity === "critical" ? "🔴" : a.severity === "alert" ? "⚠️" : "📍"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.severity === "critical" ? "bg-red-100 text-red-700" : a.severity === "alert" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {a.severity === "critical" ? "Critical" : a.severity === "alert" ? "Alert" : "Warning"} · {Math.round(a.distanceFromRoute || 0)}m
                    </span>
                    {!a.isRead && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">New</span>}
                  </div>
                  <p className="font-semibold text-gray-800">{a.employee?.name} <span className="font-normal text-gray-400 text-sm">({a.employee?.employeeId})</span></p>
                  <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString("en-PK")}</p>
                    {a.location?.lat && (
                      <a href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}&z=16`}
                        target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        📍 Map pe dekho
                      </a>
                    )}
                  </div>
                </div>
                {!a.isRead && (
                  <button onClick={() => markRead(a._id)} className="text-xs text-gray-400 hover:text-gray-700 flex-shrink-0 border rounded-lg px-2 py-1">✓ Read</button>
                )}
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-10 text-center">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-green-700 font-semibold">Koi {filter === "unread" ? "unread " : ""}alert nahi!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
