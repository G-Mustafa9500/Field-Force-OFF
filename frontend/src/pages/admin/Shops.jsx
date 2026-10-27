import { useState, useEffect } from "react";
import api from "../../api/axios";
import MapPicker from "../../components/MapPicker";

const EMPTY = { name: "", ownerName: "", phone: "", address: "", area: "", location: { lat: "", lng: "" } };

export default function Shops() {
  const [shops,   setShops]   = useState([]);
  const [modal,   setModal]   = useState(false);
  const [editShop,setEditShop]= useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");

  const loadShops = async () => {
    try { const { data } = await api.get("/shops"); setShops(data); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadShops(); }, []);

  const openAdd  = () => { setEditShop(null); setForm(EMPTY); setModal(true); };
  const openEdit = (s) => {
    setEditShop(s);
    setForm({ name: s.name, ownerName: s.ownerName||"", phone: s.phone||"", address: s.address||"", area: s.area||"", location: s.location });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, location: { lat: Number(form.location.lat), lng: Number(form.location.lng) } };
      if (!payload.location.lat || !payload.location.lng) { alert("Location set karo map pe"); setSaving(false); return; }
      if (editShop) await api.put(`/shops/${editShop._id}`, payload);
      else          await api.post("/shops", payload);
      setModal(false); loadShops();
    } catch (err) { alert(err.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Shop delete karo?")) return;
    await api.delete(`/shops/${id}`); loadShops();
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMapLocation = (loc) => setForm(f => ({ ...f, location: loc }));
  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.area||"").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">🏪 Shops</h2>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">+ Add Shop</button>
      </div>

      <input className="w-full border rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="🔍 Shop ya area search karo..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(shop => (
          <div key={shop._id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{shop.name}</h3>
                {shop.area && <p className="text-xs text-blue-500 font-medium">{shop.area}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(shop)} className="text-xs text-blue-600 hover:underline">Edit</button>
                <button onClick={() => del(shop._id)}  className="text-xs text-red-500 hover:underline">Del</button>
              </div>
            </div>
            {shop.ownerName && <p className="text-xs text-gray-600">👤 {shop.ownerName}</p>}
            {shop.phone     && <p className="text-xs text-gray-600">📞 {shop.phone}</p>}
            {shop.address   && <p className="text-xs text-gray-600">📍 {shop.address}</p>}
            <a href={`https://maps.google.com/?q=${shop.location.lat},${shop.location.lng}&z=17`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1 inline-block">
              🗺️ {shop.location.lat?.toFixed(5)}, {shop.location.lng?.toFixed(5)}
            </a>
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">Koi shop nahi mili</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editShop ? "Shop Edit" : "Naya Shop"}</h3>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Shop Naam *" value={form.name} onChange={e => F("name", e.target.value)} required />
                <input className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Area" value={form.area} onChange={e => F("area", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Owner Naam" value={form.ownerName} onChange={e => F("ownerName", e.target.value)} />
                <input className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone" value={form.phone} onChange={e => F("phone", e.target.value)} />
              </div>
              <input className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pata / Address" value={form.address} onChange={e => F("address", e.target.value)} />

              {/* MAP PICKER — yeh naya feature hai */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-600">📍 Shop GPS Location — Map pe click karo</p>
                  <p className="text-xs text-gray-400">Ya lat/lng manually type karo</p>
                </div>
                <div className="p-3">
                  <MapPicker
                    value={form.location?.lat ? { lat: Number(form.location.lat), lng: Number(form.location.lng) } : null}
                    onChange={setMapLocation}
                    height={250}
                    label="Map pe shop ki jagah click karo"
                  />
                </div>
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  <input type="number" step="any" className="border rounded-lg px-2 py-2 text-sm focus:outline-none" placeholder="Latitude"
                    value={form.location.lat}
                    onChange={e => setForm(f => ({ ...f, location: { ...f.location, lat: e.target.value } }))} />
                  <input type="number" step="any" className="border rounded-lg px-2 py-2 text-sm focus:outline-none" placeholder="Longitude"
                    value={form.location.lng}
                    onChange={e => setForm(f => ({ ...f, location: { ...f.location, lng: e.target.value } }))} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border py-2.5 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving..." : "Save Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
