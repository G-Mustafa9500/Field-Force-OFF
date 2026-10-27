import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

// Odometer digit component
function OdometerDigit({ digit }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-10 bg-gray-900 text-green-400 font-mono font-bold text-lg rounded border border-gray-700 mx-0.5 shadow-inner">
      {digit}
    </span>
  );
}

function Odometer({ km }) {
  const str    = km.toFixed(1);
  const [whole, dec] = str.split('.');
  const padded = whole.padStart(5, '0');

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center bg-gray-800 rounded-xl px-3 py-2 border border-gray-700">
        {padded.split('').map((d, i) => (
          <OdometerDigit key={i} digit={d} />
        ))}
        <span className="text-gray-500 font-mono font-bold text-lg mx-1">.</span>
        <OdometerDigit digit={dec} />
        <span className="text-gray-400 text-xs ml-2 font-medium self-end pb-1">km</span>
      </div>
    </div>
  );
}

// Time ago helper
function timeAgo(minutes) {
  if (minutes === null || minutes === undefined) return 'No data';
  if (minutes < 1)  return 'Abhi abhi';
  if (minutes < 60) return `${minutes} min pehle`;
  return `${Math.round(minutes / 60)} ghante pehle`;
}

// Status dot
function StatusDot({ minutes }) {
  const fresh = minutes !== null && minutes < 2;
  const stale = minutes !== null && minutes >= 2 && minutes < 10;
  return (
    <span className="relative flex h-3 w-3">
      {fresh && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${fresh ? 'bg-green-500' : stale ? 'bg-yellow-400' : 'bg-gray-400'}`} />
    </span>
  );
}

function EmployeeTrackCard({ data, onMapClick }) {
  const { employee, route, totalKm, deviations, startTime, latestLoc, shopsDone, totalShops, lastUpdateAgo } = data;

  const roleColors = {
    order_booker: 'bg-blue-100 text-blue-700',
    delivery_boy: 'bg-orange-100 text-orange-700',
  };
  const roleLabels = {
    order_booker: '📋 Order Booker',
    delivery_boy: '🛵 Delivery Boy',
  };

  const shopProgress = totalShops > 0 ? (shopsDone / totalShops) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {employee?.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{employee?.name}</p>
            <p className="text-xs text-gray-400">{employee?.employeeId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot minutes={lastUpdateAgo} />
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[employee?.role] || 'bg-gray-100 text-gray-600'}`}>
            {roleLabels[employee?.role] || employee?.role}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Odometer */}
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">⚡ Live KM Counter</p>
          <Odometer km={totalKm} />
        </div>

        {/* Route + Shops */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-400 font-medium mb-1">🗺️ Route</p>
            <p className="text-sm font-semibold text-blue-700 truncate">{route?.name || 'No route'}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-xs text-purple-400 font-medium mb-1">🏪 Shops</p>
            <p className="text-sm font-semibold text-purple-700">
              {shopsDone}/{totalShops}
              <span className="text-xs font-normal ml-1">done</span>
            </p>
          </div>
        </div>

        {/* Shop Progress Bar */}
        {totalShops > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-gray-500">Shop Progress</span>
              <span className="text-xs font-medium text-gray-600">{Math.round(shopProgress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${shopProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Location */}
        <div className={`rounded-xl p-3 border ${latestLoc ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                📍 Last Known Location
                {deviations > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    ⚠️ {deviations} deviations
                  </span>
                )}
              </p>
              {latestLoc ? (
                <>
                  <p className="text-xs font-mono text-gray-700">
                    {latestLoc.lat?.toFixed(5)}, {latestLoc.lng?.toFixed(5)}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${lastUpdateAgo < 2 ? 'text-green-600' : lastUpdateAgo < 10 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    🕐 Update: {timeAgo(lastUpdateAgo)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">Location update nahi mila abhi tak</p>
              )}
            </div>
            {latestLoc && (
              <button
                onClick={() => onMapClick(latestLoc, employee?.name)}
                className="flex-shrink-0 bg-blue-600 text-white text-xs px-3 py-2 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all ml-3"
              >
                🗺️ Map
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
          <span>Din shuru: {startTime ? new Date(startTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          <span>Bike avg: {employee?.bikeAverage || '—'} km/L</span>
        </div>
      </div>
    </div>
  );
}

export default function LiveTracking() {
  const [liveData,   setLiveData]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastRefresh,setLastRefresh]= useState(null);
  const [autoRefresh,setAutoRefresh]= useState(true);
  const [mapUrl,     setMapUrl]     = useState(null);
  const intervalRef  = useRef(null);

  const fetch = async () => {
    try {
      const { data } = await api.get('/tracking/live');
      setLiveData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Live tracking fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetch, 30000); // har 30 sec
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh]);

  const openMap = (loc, name) => {
    const url = `https://maps.google.com/?q=${loc.lat},${loc.lng}&z=15`;
    window.open(url, '_blank');
  };

  const activeCount  = liveData.length;
  const totalKm      = liveData.reduce((s, d) => s + (d.totalKm || 0), 0);
  const totalDevs    = liveData.reduce((s, d) => s + (d.deviations || 0), 0);
  const totalShopsDone = liveData.reduce((s, d) => s + (d.shopsDone || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📍 Live Tracking</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Abhi dekho — har banda kahan hai
            {lastRefresh && (
              <span className="ml-2 text-xs">
                · Last update: {lastRefresh.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto (30s)
          </label>
          <button
            onClick={fetch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Employees', value: activeCount, icon: '👥', color: 'bg-green-50 border-green-100 text-green-700' },
          { label: 'Total KM Aaj',     value: `${totalKm.toFixed(1)} km`, icon: '📏', color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { label: 'Shops Done',       value: totalShopsDone, icon: '🏪', color: 'bg-purple-50 border-purple-100 text-purple-700' },
          { label: 'Deviations',       value: totalDevs, icon: '⚠️', color: `${totalDevs > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-600'}` },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-3 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs font-medium opacity-70 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">📍</div>
          <p>Live data load ho raha hai...</p>
        </div>
      ) : activeCount === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-3">😴</div>
          <p className="font-semibold text-gray-600">Abhi koi active nahi</p>
          <p className="text-sm text-gray-400 mt-1">Jab employees check-in karenge, yahan dikhenge</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {liveData.map(d => (
            <EmployeeTrackCard key={d.sessionId} data={d} onMapClick={openMap} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Legend</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            Live (&lt;2 min ago)
          </span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Recent (2–10 min)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Stale (&gt;10 min)</span>
          <span className="flex items-center gap-1.5">🗺️ Map button = Google Maps pe exact location</span>
          <span className="flex items-center gap-1.5">⚡ Odometer = har 30 sec update hota hai</span>
        </div>
      </div>
    </div>
  );
}
