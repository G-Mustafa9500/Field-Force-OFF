import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Setup() {
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/setup', form);
      alert('✅ Admin account ban gaya! Ab login karo.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error hua');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🛠️</div>
          <h1 className="text-xl font-bold text-gray-800">First Time Setup</h1>
          <p className="text-gray-400 text-sm mt-1">Admin account banao</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm">{error}</div>}
          <input
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Apna naam *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required
          />
          <input
            type="email"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email *" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required
          />
          <input
            type="password"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password *" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6}
          />
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Ban raha hai...' : 'Admin Account Banao'}
          </button>
        </form>
      </div>
    </div>
  );
}
