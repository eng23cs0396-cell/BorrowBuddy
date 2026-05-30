import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  bannedUsers: number;
  totalLibraryBooks: number;
  totalListings: number;
  pendingReports: number;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned';
  isVerified: boolean;
}

interface AdminListing {
  _id: string;
  title: string;
  status: string;
  isApproved: boolean;
  owner?: { name: string; email: string };
}

interface AdminReport {
  _id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  targetType: string;
}

interface AdminTransaction {
  _id: string;
  transactionType: string;
  status: string;
  dueDate: string | null;
  returnRequestedAt: string | null;
  requester?: { name: string; email: string };
  libraryBook?: { title: string; isbn: string };
}

const AdminPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAll = async () => {
    try {
      setError('');
      const [statsRes, usersRes, listingsRes, reportsRes, transactionsRes] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/users'),
        api.get('/api/admin/listings'),
        api.get('/api/admin/reports'),
        api.get('/api/admin/transactions', { params: { type: 'library_borrow' } }),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setListings(listingsRes.data.listings || []);
      setReports(reportsRes.data.reports || []);
      setTransactions(transactionsRes.data.transactions || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load admin dashboard data');
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateUserStatus = async (userId: string, status: 'active' | 'banned') => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/users/${userId}/status`, { status });
      setMessage(data.message || 'User updated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update user');
    }
  };

  const updateUserVerification = async (userId: string, isVerified: boolean) => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/users/${userId}/verification`, { isVerified });
      setMessage(data.message || 'User verification updated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update verification');
    }
  };

  const moderateListing = async (listingId: string, action: 'approve' | 'flag' | 'remove') => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/listings/${listingId}/moderation`, { action });
      setMessage(data.message || 'Listing moderated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to moderate listing');
    }
  };

  const updateReport = async (
    reportId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  ) => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/reports/${reportId}/status`, { status });
      setMessage(data.message || 'Report updated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update report');
    }
  };

  const reviewBorrowRequest = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/transactions/${transactionId}/library-borrow`, { action });
      setMessage(data.message || 'Borrow request updated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to review borrow request');
    }
  };

  const reviewReturnRequest = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      setError('');
      setMessage('');
      const { data } = await api.patch(`/api/admin/transactions/${transactionId}/library-return`, { action });
      setMessage(data.message || 'Return request updated');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to review return request');
    }
  };

  const pendingBorrowRequests = transactions.filter(
    (transaction) => transaction.transactionType === 'library_borrow' && transaction.status === 'requested'
  );

  const pendingReturnRequests = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'library_borrow' &&
      ['active', 'overdue'].includes(transaction.status) &&
      Boolean(transaction.returnRequestedAt)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      {!stats ? (
        <p className="text-slate-300">Loading stats...</p>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-slate-400 text-sm">{key}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-medium mb-3">Users</h3>
            <div className="space-y-2">
              {users.slice(0, 8).map((u) => (
                <div key={u._id} className="border border-slate-800 rounded-lg p-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-slate-300">{u.email}</p>
                  <p className="text-xs text-slate-400">
                    Role: {u.role} | Status: {u.status} | Verified: {u.isVerified ? 'Yes' : 'No'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateUserStatus(u._id, u.status === 'active' ? 'banned' : 'active')}
                      className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-700"
                    >
                      {u.status === 'active' ? 'Ban' : 'Unban'}
                    </button>
                    <button
                      onClick={() => updateUserVerification(u._id, !u.isVerified)}
                      className="rounded bg-indigo-600 px-2 py-1 text-xs hover:bg-indigo-700"
                    >
                      {u.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-medium mb-3">Listings Moderation</h3>
            <div className="space-y-2">
              {listings.slice(0, 8).map((listing) => (
                <div key={listing._id} className="border border-slate-800 rounded-lg p-3">
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-xs text-slate-400">
                    Status: {listing.status} | Approved: {listing.isApproved ? 'Yes' : 'No'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => moderateListing(listing._id, 'approve')} className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-700">
                      Approve
                    </button>
                    <button onClick={() => moderateListing(listing._id, 'flag')} className="rounded bg-amber-600 px-2 py-1 text-xs hover:bg-amber-700">
                      Flag
                    </button>
                    <button onClick={() => moderateListing(listing._id, 'remove')} className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-700">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-medium mb-3">Library Borrow Approvals</h3>
            <div className="space-y-2">
              {pendingBorrowRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No pending borrow requests.</p>
              ) : (
                pendingBorrowRequests.map((transaction) => (
                  <div key={transaction._id} className="border border-slate-800 rounded-lg p-3">
                    <p className="font-medium">{transaction.libraryBook?.title}</p>
                    <p className="text-xs text-slate-400">
                      Requester: {transaction.requester?.name} | {transaction.requester?.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => reviewBorrowRequest(transaction._id, 'approve')}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-700"
                      >
                        Approve Borrow
                      </button>
                      <button
                        onClick={() => reviewBorrowRequest(transaction._id, 'reject')}
                        className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-700"
                      >
                        Reject Borrow
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-medium mb-3">Library Return Approvals</h3>
            <div className="space-y-2">
              {pendingReturnRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No pending return requests.</p>
              ) : (
                pendingReturnRequests.map((transaction) => (
                  <div key={transaction._id} className="border border-slate-800 rounded-lg p-3">
                    <p className="font-medium">{transaction.libraryBook?.title}</p>
                    <p className="text-xs text-slate-400">
                      Requester: {transaction.requester?.name} | {transaction.requester?.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => reviewReturnRequest(transaction._id, 'approve')}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-700"
                      >
                        Approve Return
                      </button>
                      <button
                        onClick={() => reviewReturnRequest(transaction._id, 'reject')}
                        className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-700"
                      >
                        Reject Return
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-medium mb-3">Reports</h3>
            <div className="space-y-2">
              {reports.slice(0, 8).map((report) => (
                <div key={report._id} className="border border-slate-800 rounded-lg p-3">
                  <p className="font-medium">
                    {report.reason} ({report.targetType})
                  </p>
                  <p className="text-xs text-slate-400">Status: {report.status}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => updateReport(report._id, 'reviewed')} className="rounded bg-indigo-600 px-2 py-1 text-xs hover:bg-indigo-700">
                      Mark Reviewed
                    </button>
                    <button onClick={() => updateReport(report._id, 'resolved')} className="rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-700">
                      Resolve
                    </button>
                    <button onClick={() => updateReport(report._id, 'rejected')} className="rounded bg-rose-600 px-2 py-1 text-xs hover:bg-rose-700">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminPage;

