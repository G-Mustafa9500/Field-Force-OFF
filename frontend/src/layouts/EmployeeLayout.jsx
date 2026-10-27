import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = { order_booker: 'Order Booker', delivery_boy: 'Delivery Boy' };

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-white font-bold">🚚 Field Force</h1>
          <p className="text-blue-200 text-xs">{user?.name} · {ROLE_LABEL[user?.role] || user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg"
        >
          Logout
        </button>
      </header>
      <main className="max-w-lg mx-auto p-4 pb-10">
        <Outlet />
      </main>
    </div>
  );
}
