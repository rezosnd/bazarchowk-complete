"use client";
import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';
const tok = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set('search', search);
      const res = await fetch(`${API}/super-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) {
        const data = await res.json();
        let users = data.data || data;
        // filter by status locally
        if (statusFilter === 'active') users = users.filter((u: any) => u.isActive && !u.isBanned);
        if (statusFilter === 'banned') users = users.filter((u: any) => u.isBanned || !u.isActive);
        if (statusFilter === 'guest') users = users.filter((u: any) => u.isGuest);
        setCustomers(users);
        setTotal(data.total || users.length);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API}/markets`, { headers: { Authorization: `Bearer ${tok()}` } });
      if (res.ok) { const d = await res.json(); setMarkets(d.data || d || []); }
    } catch {}
  };

  useEffect(() => { fetchCustomers(); fetchMarkets(); }, [fetchCustomers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchCustomers(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    if (!confirm(isBanned ? 'Unban this user?' : 'Ban this user?')) return;
    setProcessingId(userId);
    try {
      const endpoint = isBanned ? `/super-admin/users/${userId}/unban` : `/super-admin/users/${userId}/ban`;
      const res = await fetch(`${API}${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) fetchCustomers();
      else alert('Action failed.');
    } catch { alert('Network error'); }
    finally { setProcessingId(null); }
  };

  const handleAssignRole = async (userId: string, currentRole: string) => {
    const roles = ['CUSTOMER', 'MARKET_ADMIN', 'DISTRICT_ADMIN', 'SUPER_ADMIN'];
    const newRole = prompt(`Assign new role for this user.\nCurrent: ${currentRole}\nOptions: ${roles.join(', ')}`)?.toUpperCase().trim();
    if (!newRole || !roles.includes(newRole)) return;
    setProcessingId(userId);
    try {
      const res = await fetch(`${API}/super-admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ roleName: newRole })
      });
      if (res.ok) { alert(`Role updated to ${newRole}`); fetchCustomers(); }
      else alert('Role update failed.');
    } catch { alert('Network error'); }
    finally { setProcessingId(null); }
  };

  const ROLE_COLORS: Record<string, string> = {
    CUSTOMER: 'bg-gray-100 text-gray-600',
    MARKET_ADMIN: 'bg-blue-100 text-blue-700',
    DISTRICT_ADMIN: 'bg-purple-100 text-purple-700',
    SUPER_ADMIN: 'bg-orange-100 text-orange-700',
    RIDER: 'bg-green-100 text-green-700',
    SHOP_OWNER: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Customer Management</h1>
        <p className="text-sm text-gray-500 mt-1">View, search, ban, and manage roles for all platform users.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          className="flex-1 min-w-[200px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Users</option>
          <option value="active">Active Only</option>
          <option value="banned">Banned Only</option>
          <option value="guest">Guest Users</option>
        </select>
        <button onClick={() => { setPage(1); fetchCustomers(); }}
          className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{customers.filter(u => u.isActive && !u.isGuest).length}</p>
          <p className="text-xs text-gray-500 mt-1">Active (this page)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-500">{customers.filter(u => !u.isActive).length}</p>
          <p className="text-xs text-gray-500 mt-1">Banned (this page)</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[...Array(6)].map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-medium">No users found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : customers.map(user => (
                <tr key={user.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-100" />
                        : <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 font-bold text-sm">
                            {user.firstName?.[0] || user.email?.[0] || '?'}
                          </div>
                      }
                      <div>
                        <div className="font-semibold text-gray-900">
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Guest User'}
                        </div>
                        {user.isGuest && <span className="text-[10px] text-gray-400">Guest Account</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700">{user.email || '—'}</div>
                    <div className="text-xs text-gray-400">{user.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 ${ROLE_COLORS[user.role?.name] || 'bg-gray-100 text-gray-600'}`}
                      onClick={() => handleAssignRole(user.id, user.role?.name || 'CUSTOMER')}
                      title="Click to change role">
                      {user.role?.name || 'CUSTOMER'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive !== false
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">✓ Active</span>
                      : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">✕ Banned</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleBanToggle(user.id, user.isActive === false)}
                      disabled={processingId === user.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        user.isActive === false
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-red-600 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      {processingId === user.id ? '…' : user.isActive === false ? 'Unban' : 'Ban'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {customers.length} of {total} users</span>
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
