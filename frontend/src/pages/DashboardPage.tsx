import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Welcome</p>
          <p className="text-lg font-medium">{user?.name}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Role</p>
          <p className="text-lg font-medium">{user?.role}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Verification</p>
          <p className="text-lg font-medium">{user?.isVerified ? 'Verified' : 'Pending'}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

