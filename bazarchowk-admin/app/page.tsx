"use client";
import React, { useEffect, useState, useContext } from "react";
import { socketService } from "@/lib/socket";
import { FiActivity, FiDollarSign, FiShoppingBag, FiTruck, FiMapPin, FiUsers, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { AdminContext } from "./auth-guard";

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';
const tok = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-3 ${color} rounded-xl`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const role = profile?.role?.name || 'SUPER_ADMIN';

  useEffect(() => {
    setMetricsLoading(true);
    fetch(`${API}/super-admin/dashboard`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMetrics(d); })
      .catch(() => {})
      .finally(() => setMetricsLoading(false));

    socketService.connect();
    socketService.on("new_platform_order", (data: any) => {
      setLiveOrders(prev => [data, ...prev].slice(0, 15));
    });
    return () => { socketService.off("new_platform_order"); socketService.disconnect(); };
  }, []);

  const m = metrics || {};
  const totalRevenue = m.revenue?.totalRevenue ?? m.totalRevenue ?? 0;
  const totalOrders = m.orders?.total ?? m.totalOrders ?? 0;
  const totalUsers = m.users?.total ?? m.totalUsers ?? 0;
  const totalShops = m.shops?.total ?? m.totalShops ?? 0;
  const pendingShops = m.shops?.pending ?? m.pendingApprovals ?? 0;
  const activeRiders = m.riders?.active ?? m.activeRiders ?? 0;
  const pendingSettlements = m.settlements?.pending ?? 0;
  const openTickets = m.support?.open ?? m.openTickets ?? 0;

  const loading = metricsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {role === 'MARKET_ADMIN' ? 'Market Operations' : role === 'DISTRICT_ADMIN' ? 'District Command Center' : 'Global Super Admin'}
          </h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.firstName || 'Admin'}</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span>Live WebSocket Connected</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={<FiDollarSign size={24} />} label="Total Revenue" value={`₹${Number(totalRevenue).toLocaleString('en-IN')}`} color="bg-blue-50 text-blue-600" />
            <StatCard icon={<FiShoppingBag size={24} />} label="Total Orders" value={totalOrders} color="bg-indigo-50 text-indigo-600" />
            <StatCard icon={<FiUsers size={24} />} label="Total Customers" value={totalUsers} color="bg-purple-50 text-purple-600" />
            <StatCard icon={<FiTruck size={24} />} label="Active Riders" value={activeRiders} color="bg-orange-50 text-orange-600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={<FiCheckCircle size={24} />} label="Total Shops" value={totalShops} color="bg-green-50 text-green-600" />
            <StatCard icon={<FiAlertCircle size={24} />} label="Pending Approvals" value={pendingShops} color="bg-yellow-50 text-yellow-600" />
            <StatCard icon={<FiDollarSign size={24} />} label="Pending Settlements" value={pendingSettlements} color="bg-red-50 text-red-600" />
            <StatCard icon={<FiMapPin size={24} />} label="Open Support Tickets" value={openTickets} color="bg-teal-50 text-teal-600" />
          </div>
        </>
      )}

      {/* Live Order Stream */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiActivity className="text-blue-500" /> Live Order Stream
          </h2>
          <span className="text-xs text-gray-400">Auto-updates via WebSocket</span>
        </div>
        <div className="p-6">
          {liveOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                <FiActivity size={24} className="text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Waiting for live orders…</h3>
              <p className="text-sm text-gray-500 mt-1">New orders will appear here automatically the moment they are placed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900 font-mono text-sm">Order #{order.orderId?.split('-')[0]}</p>
                    <p className="text-xs text-gray-500">Shop: {order.shopId?.split('-')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₹{order.totalAmount}</p>
                    <p className="text-xs text-gray-400">{new Date(order.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
