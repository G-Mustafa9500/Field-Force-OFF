import { useState, useEffect } from "react";
import api from "../../api/axios";

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [tab,       setTab]      = useState("fuel");
  const [fuel,      setFuel]     = useState([]);
  const [sessions,  setSessions] = useState([]);
  const [checkIns,  setCheckIns] = useState([]);
  const [loading,   setLoading]  = useState(false);
  const [startDate, setStartDate]= useState(today);
  const [endDate,   setEndDate]  = useState(today);
  const [bigPhoto,  setBigPhoto] = useState(null);

  // Cloudinary URLs absolute hain — no baseURL needed

  const load = async () => {
    setLoading(true);
    try {
      const [f, s, c] = await Promise.all([
        api.get(`/reports/fuel?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/tracking/sessions?date=${startDate}`),
        api.get(`/reports/checkins?date=${startDate}`)
      ]);
      setFuel(f.data); setSessions(s.data); setCheckIns(c.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [startDate, endDate]); // eslint-disable-line

  const totalKm  = fuel.reduce((s, r) => s + (r.totalKm || 0), 0);
  const totalAmt = fuel.reduce((s, r) => s + (r.fuelAmount || 0), 0);

  // CSV Export
  const exportCSV = () => {
    const rows = [["Employee", "ID", "Role", "Days", "KM", "Liters", "Petrol Amount (Rs)", "Deviations"]];
    fuel.forEach(r => rows.push([
      r.employee.name, r.employee.employeeId,
      r.employee.role?.replace("_", " "),
      r.days, r.totalKm.toFixed(1), r.fuelUsed.toFixed(2),
      r.fuelAmount, r.deviations
    ]));
    rows.push(["TOTAL", "", "", fuel.reduce((s,r)=>s+r.days,0), totalKm.toFixed(1), "", totalAmt, ""]);
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `fuel-report-${startDate}-to-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: "fuel",     label: "⛽ Fuel" },
    { id: "sessions", label: "📍 Sessions" },
    { id: "checkins", label: "🏪 Check-ins" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 Reports</h2>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Start</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">End</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm">Filter</button>
        {tab === "fuel" && fuel.length > 0 && (
          <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium ml-auto">
            ⬇️ Export CSV
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
        <>
          {tab === "fuel" && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-xs text-blue-400 font-medium">Total KM</p>
                  <p className="text-2xl font-bold text-blue-700">{totalKm.toFixed(1)} km</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-xs text-green-400 font-medium">Total Petrol Cost</p>
                  <p className="text-2xl font-bold text-green-700">Rs. {totalAmt.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <th className="text-left px-4 py-3">Employee</th>
                      <th className="text-right px-4 py-3">Days</th>
                      <th className="text-right px-4 py-3">KM</th>
                      <th className="text-right px-4 py-3">Liter</th>
                      <th className="text-right px-4 py-3">Rs. Amount</th>
                      <th className="text-right px-4 py-3">Deviations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fuel.map(r => (
                      <tr key={r.employee._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{r.employee.name}</p>
                          <p className="text-xs text-gray-400">{r.employee.employeeId} · {r.employee.bikeAverage}km/L</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{r.days}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(r.totalKm||0).toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(r.fuelUsed||0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">Rs. {(r.fuelAmount||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          {r.deviations > 0 ? <span className="text-red-500 font-medium">⚠️ {r.deviations}</span> : <span className="text-green-500">✅ 0</span>}
                        </td>
                      </tr>
                    ))}
                    {fuel.length > 0 && (
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-gray-700">TOTAL</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fuel.reduce((s,r)=>s+r.days,0)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{totalKm.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fuel.reduce((s,r)=>s+(r.fuelUsed||0),0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-800">Rs. {totalAmt.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{fuel.reduce((s,r)=>s+(r.deviations||0),0)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {fuel.length === 0 && <p className="text-center py-10 text-gray-400">Is period mein koi data nahi</p>}
              </div>
            </div>
          )}

          {tab === "sessions" && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y">
                {sessions.map(s => (
                  <div key={s._id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{s.employee?.name}</p>
                      <p className="text-xs text-gray-400">{s.employee?.employeeId} · {s.route?.name || "No route"}</p>
                      <div className="flex gap-3 mt-1 text-xs">
                        {s.startTime && <span className="text-green-600">▶ {new Date(s.startTime).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"})}</span>}
                        {s.endTime   && <span className="text-red-500">■ {new Date(s.endTime).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"})}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-800">{(s.totalKm||0).toFixed(2)} km</p>
                      <p className="text-xs text-green-600">Rs. {(s.fuelAmount||0).toLocaleString()}</p>
                      {s.deviationCount > 0 && <p className="text-xs text-red-500">⚠️ {s.deviationCount}</p>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status==="active"?"bg-green-100 text-green-600":"bg-gray-100 text-gray-500"}`}>
                        {s.status === "active" ? "🟢 Live" : "✅ Done"}
                      </span>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && <p className="text-center py-10 text-gray-400">Koi session nahi</p>}
              </div>
            </div>
          )}

          {tab === "checkins" && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {checkIns.map(c => (
                  <div key={c._id} className="p-3 flex items-center gap-3">
                    {c.photo && (
                      <img src={c.photo} alt="check-in"
                        className="w-12 h-12 rounded-xl object-cover cursor-pointer flex-shrink-0 border"
                        onClick={() => setBigPhoto(c.photo)} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{c.employee?.name} <span className="text-gray-400 text-xs">({c.employee?.employeeId})</span></p>
                      <p className="text-sm text-blue-600">🏪 {c.shop?.name}</p>
                      <p className="text-xs text-gray-400">{c.shop?.area} · {new Date(c.timestamp).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {c.checkInStatus === "verified"
                        ? <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">✅ Verified</span>
                        : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">⚠️ {c.distanceFromShop}m Warning</span>}
                    </div>
                  </div>
                ))}
                {checkIns.length === 0 && <p className="text-center py-10 text-gray-400">Koi check-in nahi</p>}
              </div>
            </div>
          )}
        </>
      )}

      {bigPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setBigPhoto(null)}>
          <img src={bigPhoto} alt="full" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
