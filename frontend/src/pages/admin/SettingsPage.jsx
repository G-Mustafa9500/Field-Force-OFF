import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function SettingsPage() {
  const [petrolPrice, setPetrolPrice] = useState(280);
  const [saved,       setSaved]       = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => { if (data.petrol_price) setPetrolPrice(data.petrol_price); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      await api.put('/settings', { key: 'petrol_price', value: Number(petrolPrice) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Save nahi hua'); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Settings</h2>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
          ✅ Settings save ho gaye!
        </div>
      )}

      {/* Petrol Price */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h3 className="font-semibold text-gray-700 mb-4">⛽ Petrol Price</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-600 block mb-1.5">Current Petrol Rate (Rs. per liter)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs.</span>
              <input type="number" value={petrolPrice} onChange={e => setPetrolPrice(e.target.value)} min="1"
                className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Yeh price sab employees ke petrol expense calculation mein use hogi</p>
          </div>
          <button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
            Save
          </button>
        </div>

        {/* Preview */}
        <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm">
          <p className="text-gray-500 font-medium mb-2">📊 Preview (40km/L bike se 100km):</p>
          <p className="text-gray-700">Fuel used: <strong>2.5 liters</strong></p>
          <p className="text-gray-700">Cost: <strong>Rs. {Math.round(2.5 * petrolPrice).toLocaleString()}</strong></p>
        </div>
      </div>

      {/* Deviation Zones Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">📍 Route Deviation Zones</h3>
        <div className="space-y-2">
          {[
            { range: '0 – 500m', label: 'Safe Zone', desc: 'Normal — koi alert nahi', color: 'bg-green-50 border-green-200 text-green-700', icon: '✅' },
            { range: '500m – 600m', label: 'Buffer Zone', desc: 'Gali / traffic ke liye allowance', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: '⚠️' },
            { range: '600m+', label: 'Alert Zone', desc: 'Admin ko alert jaata hai turant', color: 'bg-red-50 border-red-200 text-red-700', icon: '🚨' },
          ].map(z => (
            <div key={z.range} className={`flex items-center gap-3 p-3 rounded-xl border ${z.color}`}>
              <span className="text-xl">{z.icon}</span>
              <div>
                <p className="font-semibold text-sm">{z.range} — {z.label}</p>
                <p className="text-xs opacity-80">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Zones fixed hain — system mein hardcoded hain for consistency.</p>
      </div>
    </div>
  );
}
