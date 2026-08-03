"use client";
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      const token = Cookies.get('admin_token');
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

  const totalRevenue = data?.dailyRevenue?.reduce((sum: number, item: any) => sum + item._sum.totalAmount, 0) || 0;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Revenue & Financials (Last 30 Days)</h1>
      <p className="text-sm text-gray-500 mt-1">Track platform commissions, rider fees, and shop payouts.</p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total Processed Revenue</p>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{totalRevenue}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mt-12 mb-4">Top Performing Shops</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-900">Shop ID</th>
              <th className="px-6 py-4 font-semibold text-gray-900 text-right">Revenue Generated</th>
              <th className="px-6 py-4 font-semibold text-gray-900 text-right">Orders Processed</th>
            </tr>
          </thead>
          <tbody>
            {data?.topShops?.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No revenue data found.</td></tr>
            ) : data?.topShops?.map((shop: any) => (
              <tr key={shop.shopId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{shop.shopId}</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">₹{shop._sum.totalAmount}</td>
                <td className="px-6 py-4 text-right text-gray-600">{shop._count.id} Orders</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
