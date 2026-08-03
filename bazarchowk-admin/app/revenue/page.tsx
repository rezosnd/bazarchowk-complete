"use client";
import React, { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

function getToken() {
  if (typeof document !== 'undefined') {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('admin_token='));
    if (cookie) return cookie.split('=')[1];
  }
  return localStorage.getItem('admin_token') || '';
}

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      const token = getToken();
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date().toISOString();
      const res = await fetch(`${API_BASE}/super-admin/revenue?startDate=${start}&endDate=${end}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading financials...</div>;
  }

  const totalRevenue = data?.totalRevenue || data?.dailyRevenue?.reduce((sum: number, item: any) => sum + (item._sum.totalAmount || 0), 0) || 0;
  const totalOrders = data?.totalOrderCount || 0;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Revenue &amp; Financials (Last 30 Days)</h1>
      <p className="text-sm text-gray-500 mt-1">Track platform commissions, rider fees, and shop payouts.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Processed Revenue</p>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-gray-500">Delivered Orders</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            ₹{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mt-12 mb-4">Top Performing Shops</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {!data?.topShops || data.topShops.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-lg font-semibold">No delivered orders in this period</p>
            <p className="text-sm mt-1">Revenue data will appear here once orders are completed.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Shop Name</th>
                <th className="px-6 py-4 font-semibold text-gray-500">City</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Revenue Generated</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.topShops.map((s: any) => (
                <tr key={s.shopId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">{s.shop?.name || s.shopId}</td>
                  <td className="px-6 py-4 text-gray-500">{s.shop?.city || '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">₹{(s._sum.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{s._count.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
