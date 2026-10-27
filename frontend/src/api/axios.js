import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

// ── Request: Token auto-attach ──────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
}, err => Promise.reject(err));

// ── Response: 401 → auto logout, network errors handle ──────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Token expire ho gaya — logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // Network error
    if (!err.response) {
      console.error('Network error — server se connection nahi');
    }
    return Promise.reject(err);
  }
);

export default api;
