import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Listing {
  _id: string;
  owner?: { _id: string; name: string };
  title: string;
  author: string;
  listingType: 'sell' | 'borrow' | 'exchange';
  condition: string;
  price: number;
  status: string;
}

interface ListingRequest {
  _id: string;
  status: 'requested' | 'approved' | 'rejected' | 'active' | 'completed';
  transactionType: 'p2p_sell' | 'p2p_borrow' | 'p2p_exchange';
  createdAt: string;
  listedBook?: {
    _id: string;
    title: string;
    author: string;
    listingType: ListingType;
    status: string;
    isApproved: boolean;
    price: number;
  };
  requester?: { _id: string; name: string; email: string };
}

type ListingType = 'sell' | 'borrow' | 'exchange';
type BookCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

const ExchangePage = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListingRequests, setMyListingRequests] = useState<ListingRequest[]>([]);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [listingType, setListingType] = useState<ListingType>('sell');
  const [condition, setCondition] = useState<BookCondition>('good');
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);

  const loadListings = async () => {
    try {
      setError('');
      const [listingsRes, listingRequestsRes] = await Promise.all([
        api.get('/api/exchange/listings'),
        api.get('/api/exchange/my/listing-requests'),
      ]);
      const { data } = listingsRes;
      setListings(data.listings || []);
      setMyListingRequests(listingRequestsRes.data.requests || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load listings');
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setActionMessage('');
      setCreating(true);

      const payload = new FormData();
      payload.append('title', title);
      payload.append('author', author);
      payload.append('listingType', listingType);
      payload.append('condition', condition);
      payload.append('price', price);
      payload.append('description', description);
      if (images) {
        Array.from(images).forEach((file) => payload.append('images', file));
      }

      const { data } = await api.post('/api/exchange/listings', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setActionMessage(data.message || 'Listing created successfully.');
      setTitle('');
      setAuthor('');
      setListingType('sell');
      setCondition('good');
      setPrice('0');
      setDescription('');
      setImages(null);
      await loadListings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create listing');
    } finally {
      setCreating(false);
    }
  };

  const requestListing = async (listingId: string) => {
    try {
      setError('');
      setActionMessage('');
      setRequestingId(listingId);
      const { data } = await api.post(`/api/exchange/listings/${listingId}/request`);
      setActionMessage(data.message || 'Request sent successfully.');
      await loadListings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to request listing');
    } finally {
      setRequestingId(null);
    }
  };

  const respondToRequest = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      setError('');
      setActionMessage('');
      setDecisionId(transactionId);
      const { data } = await api.post(`/api/exchange/transactions/${transactionId}/respond`, { action });
      setActionMessage(data.message || 'Request updated successfully.');
      await loadListings();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update request');
    } finally {
      setDecisionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Peer Exchange Listings</h2>
      {!user?.isVerified && (
        <p className="text-amber-400 text-sm">
          Verification pending. You can browse listings, but creation and requests are disabled.
        </p>
      )}
      <form onSubmit={createListing} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <h3 className="text-lg font-medium">Create New Listing</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="rounded-lg bg-slate-800 px-3 py-2 outline-none" required />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" className="rounded-lg bg-slate-800 px-3 py-2 outline-none" required />
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value as ListingType)}
            className="rounded-lg bg-slate-800 px-3 py-2 outline-none"
          >
            <option value="sell">Sell</option>
            <option value="borrow">Borrow</option>
            <option value="exchange">Exchange</option>
          </select>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as BookCondition)}
            className="rounded-lg bg-slate-800 px-3 py-2 outline-none"
          >
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" className="rounded-lg bg-slate-800 px-3 py-2 outline-none" placeholder="Price" />
          <input type="file" multiple onChange={(e) => setImages(e.target.files)} className="rounded-lg bg-slate-800 px-3 py-2" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none" rows={3} />
        <button
          disabled={!user?.isVerified || creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Listing'}
        </button>
      </form>
      {actionMessage && <p className="text-emerald-400 text-sm">{actionMessage}</p>}
      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {user && (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h3 className="text-lg font-medium">Requests For My Listings</h3>
          {myListingRequests.length === 0 ? (
            <p className="text-slate-400 text-sm">No incoming requests yet.</p>
          ) : (
            <div className="grid gap-3">
              {myListingRequests.map((request) => (
                <div key={request._id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{request.listedBook?.title || 'Listing'}</p>
                      <p className="text-sm text-slate-300">
                        Requested by: {request.requester?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Type: {request.listedBook?.listingType} | Status: {request.status}
                      </p>
                      <p className="text-xs text-slate-400">Requested on: {new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => respondToRequest(request._id, 'approve')}
                        disabled={decisionId === request._id || request.status !== 'requested'}
                        className="rounded bg-emerald-600 px-3 py-1 text-xs hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {decisionId === request._id ? 'Working...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToRequest(request._id, 'reject')}
                        disabled={decisionId === request._id || request.status !== 'requested'}
                        className="rounded bg-rose-600 px-3 py-1 text-xs hover:bg-rose-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-3">
        {listings.map((item) => (
          <div key={item._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-slate-300">{item.author}</p>
            <p className="text-sm text-slate-400">Owner: {item.owner?.name || 'Unknown'}</p>
            <p className="text-sm text-slate-400">
              Type: {item.listingType} | Condition: {item.condition}
            </p>
            <p className="text-sm text-slate-400">
              Price: {item.price} | Status: {item.status}
            </p>
            <button
              type="button"
              onClick={() => requestListing(item._id)}
              disabled={
                !user?.isVerified ||
                item.owner?._id === user?.id ||
                requestingId === item._id ||
                item.status !== 'active'
              }
              className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestingId === item._id ? 'Requesting...' : 'Request Listing'}
            </button>
          </div>
        ))}
        {listings.length === 0 && <p className="text-slate-400">No listings found.</p>}
      </div>
    </div>
  );
};

export default ExchangePage;

