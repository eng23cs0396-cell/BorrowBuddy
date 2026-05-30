import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LibraryBook {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  rackLocation: string;
  availableCopies: number;
  totalCopies: number;
}

const LibraryPage = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [borrowingId, setBorrowingId] = useState<string | null>(null);

  const loadBooks = async (q = '') => {
    try {
      setError('');
      const { data } = await api.get('/api/library-books', { params: { query: q || undefined } });
      setBooks(data.books || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load library books');
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const borrowBook = async (bookId: string) => {
    try {
      setActionMessage('');
      setError('');
      setBorrowingId(bookId);
      const { data } = await api.post(`/api/library-books/${bookId}/borrow`);
      setActionMessage(data.message || 'Book borrowed successfully.');
      await loadBooks(query);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to borrow book');
    } finally {
      setBorrowingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Library Books</h2>
      {!user?.isVerified && (
        <p className="text-amber-400 text-sm">
          Your account is not verified yet. You can browse books but cannot borrow until verification.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, ISBN"
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 outline-none"
        />
        <button onClick={() => loadBooks(query)} className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700">
          Search
        </button>
      </div>
      {actionMessage && <p className="text-emerald-400 text-sm">{actionMessage}</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      <div className="grid gap-3">
        {books.map((book) => (
          <div key={book._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">{book.title}</p>
            <p className="text-sm text-slate-300">{book.author}</p>
            <p className="text-sm text-slate-400">ISBN: {book.isbn}</p>
            <p className="text-sm text-slate-400">Rack: {book.rackLocation}</p>
            <p className="text-sm text-slate-400">
              Available: {book.availableCopies}/{book.totalCopies}
            </p>
            <button
              type="button"
              onClick={() => borrowBook(book._id)}
              disabled={!user?.isVerified || book.availableCopies <= 0 || borrowingId === book._id}
              className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {borrowingId === book._id ? 'Borrowing...' : 'Borrow Book'}
            </button>
          </div>
        ))}
        {books.length === 0 && <p className="text-slate-400">No books found.</p>}
      </div>
    </div>
  );
};

export default LibraryPage;

