import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ReportItem {
  _id: string;
  targetType: string;
  reason: string;
  status: string;
  description: string;
  createdAt: string;
}

type ReportTargetType = 'user' | 'listing' | 'review' | 'transaction';
type ReportReason = 'spam' | 'fraud' | 'abuse' | 'fake_listing' | 'copyright' | 'other';

const ReportsPage = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<ReportTargetType>('listing');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReports = async () => {
    try {
      setError('');
      const { data } = await api.get('/api/reports/my');
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reports');
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      setSubmitting(true);
      const { data } = await api.post('/api/reports', {
        targetType,
        targetId,
        reason,
        description,
      });
      setMessage(data.message || 'Report submitted');
      setTargetId('');
      setDescription('');
      await loadReports();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">My Reports</h2>
      <form onSubmit={submitReport} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-lg font-medium">Submit New Report</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as ReportTargetType)}
            className="rounded-lg bg-slate-800 px-3 py-2 outline-none"
          >
            <option value="user">User</option>
            <option value="listing">Listing</option>
            <option value="review">Review</option>
            <option value="transaction">Transaction</option>
          </select>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="rounded-lg bg-slate-800 px-3 py-2 outline-none"
          >
            <option value="spam">Spam</option>
            <option value="fraud">Fraud</option>
            <option value="abuse">Abuse</option>
            <option value="fake_listing">Fake Listing</option>
            <option value="copyright">Copyright</option>
            <option value="other">Other</option>
          </select>
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="Target ID (Mongo ObjectId)"
            className="rounded-lg bg-slate-800 px-3 py-2 outline-none"
            required
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue"
          className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none"
          rows={3}
        />
        <button disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      <div className="grid gap-3">
        {reports.map((report) => (
          <div key={report._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">Reason: {report.reason}</p>
            <p className="text-sm text-slate-400">Target: {report.targetType}</p>
            <p className="text-sm text-slate-400">Status: {report.status}</p>
            <p className="text-sm text-slate-300 mt-1">{report.description || 'No description'}</p>
          </div>
        ))}
        {reports.length === 0 && <p className="text-slate-400">No reports submitted yet.</p>}
      </div>
    </div>
  );
};

export default ReportsPage;

