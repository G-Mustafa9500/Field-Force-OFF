import { useState, useEffect } from 'react';
import api from '../../api/axios';

const EMPTY = { name: '', email: '', password: '', phone: '', role: 'order_booker', bikeAverage: 40 };
// NOTE: assignedRoute hata diya — route assign Route Manager se hoga

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [modal,     setModal]     = useState(false);
  const [editEmp,   setEditEmp]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');

  const loadAll = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const openAdd  = () => { setEditEmp(null); setForm(EMPTY); setModal(true); };
  const openEdit = (emp) => {
    setEditEmp(emp);
    setForm({ name: emp.name, email: emp.email, password: '', phone: emp.phone || '', role: emp.role, bikeAverage: emp.bikeAverage || 40 });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editEmp) await api.put(`/employees/${editEmp._id}`, payload);
      else         await api.post('/employees', payload);
      setModal(false); loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Error hua');
    } finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Employee deactivate karna chahte ho?')) return;
    await api.delete(`/employees/${id}`); loadAll();
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    (emp.employeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">👥 Employees</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
          + Add Employee
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
        💡 <strong>Route assign karne ke liye</strong> — Routes page pe jao, route banao aur employee select karo. Yahan sirf employee details hain.
      </div>

      <input
        className="w-full border rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="🔍 Naam ya Employee ID search karo..."
        value={search} onChange={e => setSearch(e.target.value)}
      />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Bike Avg</th>
                <th className="text-left px-4 py-3">Route (Aaj)</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(emp => (
                <tr key={emp._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{emp.name}</p>
                    <p className="text-gray-400 text-xs">{emp.employeeId} · {emp.email}</p>
                    {emp.phone && <p className="text-gray-400 text-xs">📞 {emp.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.role === 'delivery_boy' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {emp.role === 'delivery_boy' ? '🛵 Delivery Boy' : '📋 Order Booker'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-700">{emp.bikeAverage || '—'}</span>
                    <span className="text-xs text-gray-400 ml-1">km/L</span>
                  </td>
                  <td className="px-4 py-3">
                    {emp.assignedRoute
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✅ {emp.assignedRoute.name}</span>
                      : <span className="text-xs text-gray-300 italic">Route assign nahi</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(emp)} className="text-blue-600 hover:underline mr-3 text-xs">Edit</button>
                    <button onClick={() => deactivate(emp._id)} className="text-red-500 hover:underline text-xs">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-10 text-gray-400">Koi employee nahi mila</p>}
        </div>
      </div>

      {/* Modal — Route field HATA diya, sirf employee info */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">{editEmp ? 'Employee Edit' : 'Naya Employee'}</h3>
            <p className="text-xs text-gray-400 mb-4">Route alag se Routes page se assign karo</p>
            <form onSubmit={save} className="space-y-3">
              <input className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Naam *" value={form.name} onChange={e => F('name', e.target.value)} required />
              <input type="email" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email *" value={form.email} onChange={e => F('email', e.target.value)} required />
              <input type="password" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={editEmp ? 'Naya Password (khali choro agar same rakhna hai)' : 'Password *'} value={form.password} onChange={e => F('password', e.target.value)} required={!editEmp} />
              <input className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone Number" value={form.phone} onChange={e => F('phone', e.target.value)} />

              <select className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.role} onChange={e => F('role', e.target.value)}>
                <option value="order_booker">📋 Order Booker</option>
                <option value="delivery_boy">🛵 Delivery Boy</option>
              </select>

              <div>
                <label className="text-xs text-gray-500 block mb-1">⛽ Bike Average (km per liter)</label>
                <input
                  type="number" min="1" max="100"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50 (50km/L)"
                  value={form.bikeAverage} onChange={e => F('bikeAverage', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Petrol expense isi se calculate hoga</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border py-2.5 rounded-xl text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
