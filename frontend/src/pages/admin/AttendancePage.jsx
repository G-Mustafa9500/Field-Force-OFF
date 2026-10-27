import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AttendancePage() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [bigPhoto,setBigPhoto]= useState(null);

  // Cloudinary URLs absolute hain — no baseURL needed

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/attendance?date=${date}`); setList(data); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date]);

  const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">📸 Attendance</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading
        ? <div className="text-center py-20 text-gray-400">Loading...</div>
        : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-left px-4 py-3">Check-In</th>
                    <th className="text-left px-4 py-3">Check-Out</th>
                    <th className="text-left px-4 py-3">Photos</th>
                    <th className="text-left px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map(a => (
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{a.employee?.name}</p>
                        <p className="text-xs text-gray-400">{a.employee?.employeeId} · {a.employee?.role?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        {a.checkInTime
                          ? <span className="text-green-600 font-medium">✅ {fmt(a.checkInTime)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {a.checkOutTime
                          ? <span className="text-red-500 font-medium">🔴 {fmt(a.checkOutTime)}</span>
                          : a.checkInTime
                            ? <span className="text-orange-400 text-xs">Still out</span>
                            : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {a.checkInPhoto && (
                            <div className="relative cursor-pointer" onClick={() => setBigPhoto(a.checkInPhoto)}>
                              <img src={a.checkInPhoto} alt="in" className="w-12 h-12 rounded-lg object-cover border-2 border-green-300" />
                              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                            </div>
                          )}
                          {a.checkOutPhoto && (
                            <div className="relative cursor-pointer" onClick={() => setBigPhoto(a.checkOutPhoto)}>
                              <img src={a.checkOutPhoto} alt="out" className="w-12 h-12 rounded-lg object-cover border-2 border-red-300" />
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                            </div>
                          )}
                          {!a.checkInPhoto && !a.checkOutPhoto && <span className="text-gray-300 text-xs">No photos</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {a.checkInLocation?.lat && (
                          <a href={`https://maps.google.com/?q=${a.checkInLocation.lat},${a.checkInLocation.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline">📍 Map</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && <p className="text-center py-10 text-gray-400">Is date pe koi attendance nahi</p>}
            </div>
          </div>
        )
      }

      {/* Big photo viewer */}
      {bigPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setBigPhoto(null)}>
          <div className="relative">
            <img src={bigPhoto} alt="full" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
            <button onClick={() => setBigPhoto(null)} className="absolute top-2 right-2 bg-white/20 text-white w-8 h-8 rounded-full text-lg">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
