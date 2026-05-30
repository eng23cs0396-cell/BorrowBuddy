import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseLink =
  'block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-800 hover:text-white';

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-full md:w-64 border-r border-slate-800 bg-slate-900/80 p-4">
      <h1 className="text-lg font-semibold mb-6">Smart Library</h1>
      <nav className="space-y-1">
        <NavLink to="/dashboard" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
          Dashboard
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
          Library
        </NavLink>
        {user?.role !== 'admin' && (
          <NavLink to="/my-borrowed" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
            My History
          </NavLink>
        )}
        <NavLink to="/exchange" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
          Exchange
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
          Reports
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
          Chat
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `${baseLink} ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300'}`}
          >
            Admin
          </NavLink>
        )}
      </nav>

      <div className="mt-8 p-3 rounded-lg bg-slate-800/70 text-sm text-slate-300">
        <p className="font-medium text-white">{user?.name}</p>
        <p>{user?.email}</p>
        <p className="mt-2">Role: {user?.role}</p>
        <p>Verified: {user?.isVerified ? 'Yes' : 'No'}</p>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-4 w-full rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-2 text-sm font-medium"
      >
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;

