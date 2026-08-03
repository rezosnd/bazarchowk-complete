"use client";
import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = Cookies.get('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/dashboard`, {
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
    return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Platform Analytics</h1>
      <p className="text-sm text-gray-500 mt-1">Deep dive into user engagement, order volume, and system growth.</p>
      
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-4xl font-bold text-blue-600 mt-2">{data?.users?.total || 0}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">Total Shops</div>
          <div className="text-4xl font-bold text-purple-600 mt-2">{data?.shops?.total || 0}</div>
          {data?.shops?.pendingVerification > 0 && (
            <div className="text-xs font-semibold text-amber-600 mt-1 bg-amber-50 px-2 py-0.5 rounded-full">
              {data?.shops?.pendingVerification} Pending
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">Total Orders</div>
          <div className="text-4xl font-bold text-emerald-600 mt-2">{data?.orders?.total || 0}</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">Online Riders</div>
          <div className="text-4xl font-bold text-pink-600 mt-2">{data?.delivery?.onlinePartners || 0}</div>
        </div>
      </div>

      <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Live System Health</h2>
        <div className="flex gap-8">
          <div>
            <div className="text-sm text-gray-500">Open Support Tickets</div>
            <div className="text-2xl font-bold text-gray-800">{data?.support?.openTickets || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Fraud Alerts (Recent)</div>
            <div className="text-2xl font-bold text-red-600">{data?.recentFraudAlerts?.length || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Pending Ads</div>
            <div className="text-2xl font-bold text-gray-800">{data?.ads?.pendingApproval || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
