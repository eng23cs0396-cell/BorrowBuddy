import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LibraryBook {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  rackLocation: string;
}

interface BorrowTransaction {
  _id: string;
  libraryBook?: LibraryBook | null;
  dueDate: string | null;
  status: string;
  fineAmount: number;
  returnedAt: string | null;
  returnRequestedAt: string | null;
  createdAt: string;
}

interface RequestedListing {
  _id: string;
  status: string;
  transactionType: 'p2p_sell' | 'p2p_borrow' | 'p2p_exchange';
  dueDate: string | null;
  amountPaid: number;
  createdAt: string;
  listedBook?: {
    title: string;
    author: string;
    isbn: string;
    listingType: 'sell' | 'borrow' | 'exchange';
    status: string;
    isApproved: boolean;
    price: number;
  };
  owner?: { name: string; email: string };
}

const MyBorrowedBooksPage = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [borrowed, setBorrowed] = useState<BorrowTransaction[]>([]);
  const [pendingBorrowRequests, setPendingBorrowRequests] = useState<BorrowTransaction[]>([]);
  const [pendingReturnRequests, setPendingReturnRequests] = useState<BorrowTransaction[]>([]);
  const [returned, setReturned] = useState<BorrowTransaction[]>([]);
  const [requestedListings, setRequestedListings] = useState<RequestedListing[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const loadBorrowedBooks = async () => {
    try {
      setLoading(true);
      const [libraryRes, requestsRes] = await Promise.allSettled([
        api.get('/api/library-books/my-borrowed/list'),
        api.get('/api/exchange/my/requests'),
      ]);

      if (libraryRes.status === 'fulfilled') {
        const { data } = libraryRes.value;
        setPendingBorrowRequests(data.pendingBorrowRequests || []);
        setBorrowed(data.activeBorrowedTransactions || []);
        setPendingReturnRequests(data.pendingReturnRequests || []);
        setReturned(data.returned || []);
      } else {
        setPendingBorrowRequests([]);
        setBorrowed([]);
        setPendingReturnRequests([]);
        setReturned([]);
      }

      if (requestsRes.status === 'fulfilled') {
        setRequestedListings(requestsRes.value.data.requests || []);
      } else {
        setRequestedListings([]);
      }

      if (libraryRes.status === 'rejected' && requestsRes.status === 'rejected') {
        throw libraryRes.reason || requestsRes.reason;
      }

      const firstError = libraryRes.status === 'rejected' ? libraryRes.reason : requestsRes.status === 'rejected' ? requestsRes.reason : null;
      setError(firstError?.response?.data?.message || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !token) return;
    loadBorrowedBooks();
  }, [authLoading, token]);

  const returnBook = async (transactionId: string) => {
    try {
      setActionMessage('');
      setError('');
      setReturning(transactionId);
      const { data } = await api.post(`/api/library-books/transactions/${transactionId}/return`);
      setActionMessage(data.message || 'Return request submitted successfully.');
      await loadBorrowedBooks();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to return book');
    } finally {
      setReturning(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'overdue' || (new Date(dueDate) < new Date());
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysLeft;
  };

  if (authLoading || loading) {
    return <div className="text-slate-400">Loading history...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">My History</h2>

      {!user?.isVerified && (
        <p className="text-amber-400 text-sm">
          Your account is not verified yet. You can view history, but cannot borrow new books or create listings until verification.
        </p>
      )}

      {actionMessage && <p className="text-emerald-400 text-sm">{actionMessage}</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {/* Pending Borrow Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Pending Borrow Requests ({pendingBorrowRequests.length})</h3>
        {pendingBorrowRequests.length === 0 ? (
          <p className="text-slate-400">No borrow requests waiting for admin approval.</p>
        ) : (
          <div className="grid gap-3">
            {pendingBorrowRequests.map((transaction) => (
              <div key={transaction._id} className="rounded-xl border border-amber-700 bg-amber-950/30 p-4">
                <p className="font-medium">{transaction.libraryBook?.title || 'Deleted or unavailable book'}</p>
                <p className="text-sm text-slate-300">{transaction.libraryBook?.author || 'Book record not available'}</p>
                <p className="mt-2 text-sm text-amber-300">Waiting for admin approval</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Currently Borrowed */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Currently Borrowed ({borrowed.length})</h3>
        {borrowed.length === 0 ? (
          <p className="text-slate-400">You haven't borrowed any books yet.</p>
        ) : (
          <div className="grid gap-3">
            {borrowed.map((transaction) => {
              const dueDate = transaction.dueDate || new Date().toISOString();
              const overdue = isOverdue(dueDate, transaction.status);
              const daysLeft = getDaysUntilDue(dueDate);
              return (
                <div key={transaction._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{transaction.libraryBook?.title || 'Deleted or unavailable book'}</p>
                      <p className="text-sm text-slate-300">{transaction.libraryBook?.author || 'Book record not available'}</p>
                    </div>
                    {overdue && <span className="bg-rose-600 text-white text-xs px-2 py-1 rounded">OVERDUE</span>}
                  </div>

                  <p className="text-sm text-slate-400">ISBN: {transaction.libraryBook?.isbn || 'N/A'}</p>
                  <p className="text-sm text-slate-400">Rack: {transaction.libraryBook?.rackLocation || 'N/A'}</p>

                  <div className="mt-3 flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${overdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {overdue ? `Overdue` : `Due in ${daysLeft} days`}
                      </p>
                      <p className="text-xs text-slate-400">Due: {formatDate(transaction.dueDate)}</p>
                      {transaction.fineAmount > 0 && (
                        <p className="text-sm text-rose-400 mt-1">Fine: Rs. {transaction.fineAmount}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {transaction.returnRequestedAt ? (
                        <p className="text-sm text-amber-300">Return request pending admin approval</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => returnBook(transaction._id)}
                          disabled={returning === transaction._id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {returning === transaction._id ? 'Requesting...' : 'Request Return'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Return Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Pending Return Requests ({pendingReturnRequests.length})</h3>
        {pendingReturnRequests.length === 0 ? (
          <p className="text-slate-400">No return requests waiting for admin approval.</p>
        ) : (
          <div className="grid gap-3">
            {pendingReturnRequests.map((transaction) => (
              <div key={transaction._id} className="rounded-xl border border-amber-700 bg-amber-950/30 p-4">
                <p className="font-medium">{transaction.libraryBook?.title || 'Deleted or unavailable book'}</p>
                <p className="text-sm text-slate-300">{transaction.libraryBook?.author || 'Book record not available'}</p>
                <p className="mt-2 text-sm text-amber-300">Return requested, waiting for admin approval</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requested Listings */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Requested Listings ({requestedListings.length})</h3>
        {requestedListings.length === 0 ? (
          <p className="text-slate-400">No listing requests yet.</p>
        ) : (
          <div className="grid gap-3">
            {requestedListings.map((request) => {
              const title = request.listedBook?.title || 'Listing';
              return (
                <div key={request._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-slate-300">{request.listedBook?.author}</p>
                      <p className="text-xs text-slate-400">Type: {request.listedBook?.listingType}</p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    Owner: {request.owner?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-400">
                    Requested on: {formatDate(request.createdAt)}
                  </p>
                  {request.dueDate && (
                    <p className="text-sm text-slate-400">Due: {formatDate(request.dueDate)}</p>
                  )}
                  {request.amountPaid > 0 && (
                    <p className="text-sm text-emerald-400">Amount: Rs. {request.amountPaid}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Previously Returned */}
      {returned.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Previously Returned ({returned.length})</h3>
          <div className="grid gap-3">
            {returned.slice(0, 5).map((transaction) => (
              <div key={transaction._id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 opacity-75">
                <p className="font-medium text-slate-300">{transaction.libraryBook?.title || 'Deleted or unavailable book'}</p>
                <p className="text-sm text-slate-400">{transaction.libraryBook?.author || 'Book record not available'}</p>
                <p className="text-xs text-slate-500 mt-2">Returned: {formatDate(transaction.returnedAt || '')}</p>
                {transaction.fineAmount > 0 && (
                  <p className="text-xs text-rose-400 mt-1">Fine paid: Rs. {transaction.fineAmount}</p>
                )}
              </div>
            ))}
            {returned.length > 5 && <p className="text-slate-400 text-sm">... and {returned.length - 5} more</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBorrowedBooksPage;
