"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
const tok = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ACCEPTED: 'bg-blue-50 text-blue-700 border-blue-200',
  PREPARING: 'bg-purple-50 text-purple-700 border-purple-200',
  READY: 'bg-orange-50 text-orange-700 border-orange-200',
  OUT_FOR_DELIVERY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/super-admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || data);
        setTotal(data.total || (data.data || data).length);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API}/markets`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setMarkets(d.data || d || []); }
    } catch (e) {}
  };

  useEffect(() => { fetchOrders(); fetchMarkets(); }, [fetchOrders]);

  const handleRefund = async (orderId: string) => {
    if (!confirm('Are you sure you want to process a refund for this order?')) return;
    try {
      const res = await fetch(`${API}/payments/refund/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ reason: 'Admin requested refund' })
      });
      if (res.ok) { alert('Refund processed successfully'); fetchOrders(); }
      else { const e = await res.json(); alert(e.message || 'Refund failed'); }
    } catch { alert('Network error'); }
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.shop?.name?.toLowerCase().includes(search.toLowerCase());
    const matchMarket = !marketFilter || o.shop?.marketId === marketFilter;
    return matchSearch && matchMarket;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Order Management</h1>
        <p className="text-sm text-gray-500 mt-1">Live view of all orders across every market and shop.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          className="flex-1 min-w-[180px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search by order#, customer, shop…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
          <option value="">All Markets</option>
          {markets.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {['PLACED','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'].map(s =>
            <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
          )}
        </select>
        <button onClick={fetchOrders} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Order Details</th>
                <th className="px-6 py-4 font-semibold">Customer & Shop</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Delivery Boy</th>
                <th className="px-6 py-4 font-semibold text-right">Status & Tracking</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(6)].map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <p className="font-medium">No orders found</p>
                      <p className="text-xs">Adjust filters or wait for new orders</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(order => (
                <tr key={order.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-orange-600">{order.orderNumber}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString('en-IN')}</div>
                    <div className="font-bold text-gray-900 mt-1">₹{order.totalAmount}</div>
                    <div className="text-xs font-medium text-gray-500">{order.paymentMethod} • {order.paymentStatus}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">Customer: {order.customer?.firstName} {order.customer?.lastName}</div>
                    <div className="text-xs text-gray-500 mb-2">{order.customer?.phone}</div>
                    <div className="font-semibold text-gray-900">Shop: {order.shop?.name}</div>
                    <div className="text-xs text-blue-600">{order.shop?.city}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] text-xs text-gray-700">
                      {order.items?.length > 0 
                        ? order.items.map((it: any) => (
                            <div key={it.id} className="truncate">
                              {it.quantity}x {it.productVariant?.product?.name || 'Product'} {it.productVariant?.name && `(${it.productVariant.name})`}
                            </div>
                          ))
                        : <span className="text-gray-400 italic">Items missing</span>
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {order.rider ? (
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="font-bold text-gray-900 text-sm">{order.rider.firstName} {order.rider.lastName}</div>
                        <div className="text-xs text-gray-600 font-mono mt-0.5">{order.rider.phone}</div>
                        {order.trackingPoints && order.trackingPoints.length > 0 && (
                          <div className="text-[10px] text-blue-600 mt-1 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            Live location active
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">Not Assigned</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {order.status?.replace(/_/g,' ')}
                      </span>
                      
                      {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="text-[10px] text-gray-500 max-w-[150px] truncate" title={order.statusHistory[0].notes}>
                          Last updated: {new Date(order.statusHistory[0].createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
                        </div>
                      )}

                      {order.paymentStatus === 'PAID' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                        <button onClick={() => handleRefund(order.id)} className="text-xs text-red-500 hover:text-red-700 font-bold underline mt-1">
                          Refund Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filtered.length} of {total} orders</span>
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
