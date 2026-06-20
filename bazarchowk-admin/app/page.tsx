"use client";
import React, { useEffect, useState } from "react";
import { socketService } from "@/lib/socket";
import { FiActivity, FiDollarSign, FiShoppingBag, FiTruck } from "react-icons/fi";

export default function AdminDashboard() {
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 45200,
    totalOrders: 154,
    activeRiders: 28,
  });

  useEffect(() => {
    socketService.connect();

    socketService.on("new_platform_order", (data) => {
      setLiveOrders((prev) => [data, ...prev].slice(0, 10)); // Keep last 10
      setMetrics((prev) => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
        totalRevenue: prev.totalRevenue + data.totalAmount,
      }));
    });

    return () => {
      socketService.off("new_platform_order");
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-gray-500 mt-1">Real-time command center</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span>Live WebSocket Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FiDollarSign size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue (Today)</p>
            <h3 className="text-2xl font-bold text-gray-900">₹{metrics.totalRevenue.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FiShoppingBag size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Orders Processed</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><FiTruck size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Riders</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics.activeRiders}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiActivity className="text-blue-500" /> Live Order Stream
          </h2>
        </div>
        <div className="p-6">
          {liveOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                <FiActivity size={24} className="text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Waiting for orders</h3>
              <p className="text-sm text-gray-500 mt-1">Live orders will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-bold text-gray-900">Order #{order.orderId.split('-')[0]}</p>
                    <p className="text-sm text-gray-500">Shop ID: {order.shopId.split('-')[0]}</p>
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
