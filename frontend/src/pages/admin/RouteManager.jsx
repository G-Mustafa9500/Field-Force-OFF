import { useState, useEffect } from "react";
import api from "../../api/axios";
import MapPicker from "../../components/MapPicker";

const today = new Date().toISOString().split("T")[0];
const EMPTY_FORM = { name: "", routeDate: today, assignedTo: "", startPoint: { name: "Warehouse", lat: "", lng: "" }, shops: [] };

export default function RouteManager() {
  const [routes,    setRoutes]    = useState([]);
  const [shops,     setShops]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal,     setModal]     = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [filterDate,setFilterDate]= useState(today);
  const [showMap,   setShowMap]   = useState(false);

  const loadAll = async () => {
    try {
      const [r, s, e] = await Promise.all([
        api.get(`/routes?date=${filterDate}`),
        api.get("/shops"),
        api.get("/employees")
      ]);
      setRoutes(r.data); setShops(s.data); setEmployees(e.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, [filterDate]); // eslint-disable-line

  const openAdd = () => {
    setEditRoute(null);
    setForm({ ...EMPTY_FORM, routeDate: today });
    setShowMap(false); setModal(true);
  };
  const openEdit = (r) => {
    setEditRoute(r);
    setForm({ name: r.name, routeDate: r.routeDate || today, assignedTo: r.assignedTo?._id || "", startPoint: r.startPoint, shops: r.shops.map(s => ({ shop: s.shop?._id || s.shop, order: s.order })) });
    setShowMap(false); setModal(true);
  };

  const addShop  = (id) => { if (!id || form.shops.find(s => s.shop === id)) return; setForm(f => ({ ...f, shops: [...f.shops, { shop: id, order: f.shops.length + 1 }] })); };
  const removeShop = (id) => setForm(f => ({ ...f, shops: f.shops.filter(s => s.shop !== id) }));
  const moveShop = (i, dir) => {
    const arr  = [...form.shops];
    const swap = i + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[i], arr[swap]] = [arr[swap], arr[i]];
    setForm(f => ({ ...f, shops: arr.map((s, idx) => ({ ...s, order: idx + 1 })) }));
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editRoute) await api.put(`/routes/${editRoute._id}`, form);
      else           await api.post("/routes", form);
      setModal(false); loadAll();
    } catch (err) { alert(err.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Route delete karo?")) return;
    await api.delete(`/routes/${id}`); loadAll();
  };

  const getShopName = (id) => shops.find(s => s._id === id)?.name || "Shop";
  const setWarehouseMap = (loc) => setForm(f => ({ ...f, startPoint: { ...f.startPoint, lat: loc.lat, lng: loc.lng } }));

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">🗺️ Routes</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">+ Naya Route</button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-600 font-medium">📅 Kisi din ke routes:</span>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => setFilterDate(today)} className="text-xs text-blue-600 hover:underline">Aaj</button>
      </div>

      <div className="space-y-3">
        {routes.map(route => (
          <div key={route._id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{route.name}</h3>
                <p className="text-xs text-blue-500 font-medium">📅 {route.routeDate || "No date"}</p>
                <p className="text-sm text-gray-500">👤 {route.assignedTo ? `${route.assignedTo.name} (${route.assignedTo.employeeId})` : "Unassigned"}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => openEdit(route)} className="text-sm text-blue-600 hover:underline">Edit</button>
                <button onClick={() => del(route._id)}  className="text-sm text-red-500 hover:underline">Del</button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">🏭 {route.startPoint?.name}</span>
              {route.shops.sort((a, b) => (a.order||0)-(b.order||0)).map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-gray-300">→</span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full">{i+1}. {s.shop?.name || "Shop"}</span>
                </span>
              ))}
              <span className="text-gray-300">→</span>
              <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">🏭 Wapas</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">{route.shops.length} shops</p>
          </div>
        ))}
        {routes.length === 0 && <div className="bg-white rounded-2xl border border-gray-100 text-center py-12 text-gray-400">Is date pe koi route nahi</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editRoute ? "Route Edit" : "Naya Route"}</h3>
            <form onSubmit={save} className="space-y-3">
              <input className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Route Naam *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />

              {/* DATE PICKER — yeh naya feature hai */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">📅 Route Date (kab ka route hai)</label>
                <input type="date" value={form.routeDate}
                  onChange={e => setForm(f => ({ ...f, routeDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <select className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">Employee Select Karo</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.employeeId})</option>)}
              </select>

              {/* WAREHOUSE — Map Picker */}
              <div className="border rounded-xl overflow-hidden">
                <button type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-green-50 hover:bg-green-100 text-sm font-medium text-green-700"
                  onClick={() => setShowMap(v => !v)}>
                  <span>🏭 Warehouse Location {form.startPoint.lat ? `(${form.startPoint.lat}, ${form.startPoint.lng})` : "— Set karo"}</span>
                  <span>{showMap ? "▲" : "▼"}</span>
                </button>
                {showMap && (
                  <div className="p-3">
                    <MapPicker
                      value={form.startPoint.lat ? { lat: Number(form.startPoint.lat), lng: Number(form.startPoint.lng) } : null}
                      onChange={setWarehouseMap}
                      height={220}
                      label="Map pe warehouse click karo"
                    />
                  </div>
                )}
              </div>

              {/* Shops */}
              <div className="border rounded-xl p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">🏪 Shops (order mein add karo)</p>
                <select className="w-full border rounded-lg px-2 py-2 text-sm mb-2"
                  onChange={e => { addShop(e.target.value); e.target.value = ""; }}>
                  <option value="">+ Shop add karo...</option>
                  {shops.filter(s => !form.shops.find(fs => fs.shop === s._id)).map(s => (
                    <option key={s._id} value={s._id}>{s.name}{s.area ? ` — ${s.area}` : ""}</option>
                  ))}
                </select>
                {form.shops.length > 0 ? (
                  <div className="space-y-1.5">
                    {form.shops.map((s, i) => (
                      <div key={s.shop} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 text-sm">
                        <span className="text-gray-400 text-xs w-5">{i+1}.</span>
                        <span className="flex-1 text-gray-700">{getShopName(s.shop)}</span>
                        <button type="button" onClick={() => moveShop(i,-1)} disabled={i===0} className="text-gray-400 disabled:opacity-20 px-1">↑</button>
                        <button type="button" onClick={() => moveShop(i,+1)} disabled={i===form.shops.length-1} className="text-gray-400 disabled:opacity-20 px-1">↓</button>
                        <button type="button" onClick={() => removeShop(s.shop)} className="text-red-400 px-1 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-2">Koi shop nahi add ki</p>}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving..." : "Save Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
