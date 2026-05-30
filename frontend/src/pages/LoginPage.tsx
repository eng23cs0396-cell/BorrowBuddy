import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Login</h2>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-lg bg-slate-800 p-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full rounded-lg bg-slate-800 p-3 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button disabled={loading} className="w-full rounded-lg bg-indigo-600 p-3 font-medium hover:bg-indigo-700 disabled:opacity-70">
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <p className="text-sm text-slate-300">
          New user? <Link to="/register" className="text-indigo-400 hover:underline">Create account</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;

