"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
const tok = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

export default function ShopsAdminPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (verifiedFilter !== '') params.set('verified', verifiedFilter);
      const res = await fetch(`${API}/super-admin/shops?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShops(data.data || data);
        setTotal(data.total || (data.data || data).length);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, verifiedFilter]);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API}/markets`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setMarkets(d.data || d || []); }
    } catch (e) {}
  };

  useEffect(() => { fetchShops(); fetchMarkets(); }, [fetchShops]);

  const handleVerify = async (id: string, currentStatus: boolean) => {
    setProcessingId(id);
    try {
      const endpoint = currentStatus ? `/super-admin/shops/${id}/suspend` : `/super-admin/shops/${id}/verify`;
      const res = await fetch(`${API}${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) fetchShops();
      else alert('Action failed. Please try again.');
    } catch (e) { alert('Network error'); }
    finally { setProcessingId(null); }
  };

  const filtered = shops.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.owner?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      s.owner?.email?.toLowerCase().includes(search.toLowerCase());
    const matchMarket = !marketFilter || s.marketId === marketFilter;
    return matchSearch && matchMarket;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Shop Management</h1>
        <p className="text-sm text-gray-500 mt-1">Verify, approve, and manage partner shops across all markets.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          className="flex-1 min-w-[180px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search by name, city, owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          value={marketFilter}
          onChange={e => setMarketFilter(e.target.value)}
        >
          <option value="">All Markets</option>
          {markets.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          value={verifiedFilter}
          onChange={e => { setVerifiedFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="true">Verified Only</option>
          <option value="false">Pending Only</option>
        </select>
        <button onClick={fetchShops} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Shop</th>
                <th className="px-6 py-4 font-semibold">Owner</th>
                <th className="px-6 py-4 font-semibold">Market</th>
                <th className="px-6 py-4 font-semibold">Delivery Radius</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <p className="font-medium">No shops found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(shop => (
                <tr key={shop.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {shop.logoUrl
                        ? <img src={shop.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-100" />
                        : <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-sm">{shop.name?.[0]}</div>
                      }
                      <div>
                        <div className="font-semibold text-gray-900">{shop.name}</div>
                        <div className="text-xs text-gray-400">{shop.city || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{shop.owner?.firstName} {shop.owner?.lastName}</div>
                    <div className="text-xs text-gray-400">{shop.owner?.email || shop.owner?.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    {shop.market
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">{shop.market.name}</span>
                      : <span className="text-gray-300 text-xs">No market</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{shop.deliveryRadius ?? '—'} km</td>
                  <td className="px-6 py-4">
                    {shop.isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ Verified</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Pending
                      </span>
                    )}
                    {!shop.isActive && <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Suspended</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleVerify(shop.id, shop.isVerified)}
                      disabled={processingId === shop.id}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${shop.isVerified ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-white bg-orange-500 hover:bg-orange-600 shadow-sm'}`}
                    >
                      {processingId === shop.id ? 'Processing…' : shop.isVerified ? 'Suspend' : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filtered.length} of {total} shops</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-slate-50">← Prev</button>
            <span className="px-3 py-1.5 font-medium">Page {page}</span>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-30 hover:bg-slate-50">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
