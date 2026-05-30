import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeId, setCollegeId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!collegeId || !selfie) {
      setError('College ID and selfie are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('name', name);
      payload.append('email', email);
      payload.append('password', password);
      payload.append('collegeId', collegeId);
      payload.append('selfie', selfie);
      await register(payload);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Create account</h2>
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        <input className="w-full rounded-lg bg-slate-800 p-3 outline-none" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" className="w-full rounded-lg bg-slate-800 p-3 outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" className="w-full rounded-lg bg-slate-800 p-3 outline-none" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="space-y-2 text-sm">
          <label className="block">Upload College ID</label>
          <input type="file" onChange={(e) => setCollegeId(e.target.files?.[0] || null)} className="w-full" required />
          <label className="block">Upload Selfie</label>
          <input type="file" onChange={(e) => setSelfie(e.target.files?.[0] || null)} className="w-full" required />
        </div>
        <button disabled={loading} className="w-full rounded-lg bg-indigo-600 p-3 font-medium hover:bg-indigo-700 disabled:opacity-70">
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="text-sm text-slate-300">
          Already have account? <Link to="/login" className="text-indigo-400 hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;

