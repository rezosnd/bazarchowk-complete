"use client";

import React, { useState, useEffect } from 'react';

interface OrderItem {
  quantity: number;
  productVariant: { name: string; sku: string };
}

interface Order {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string };
  shop: { name: string };
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalOrders();
  }, []);

  const fetchGlobalOrders = async () => {
    setLoading(true);
    try {
      // Admins likely have a global orders endpoint or use shop fetching mapped globally.
      const res = await fetch(`${API_BASE}/orders/global`); // Mock global endpoint assumption
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch global orders', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLACED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'ACCEPTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PREPARING': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'READY': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Global Order Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Live overview of all active and historical transactions across the ecosystem.</p>
        </div>
        <button onClick={fetchGlobalOrders} className="p-2 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Order ID</th>
                <th scope="col" className="px-6 py-4 font-semibold">Customer & Shop</th>
                <th scope="col" className="px-6 py-4 font-semibold">Items</th>
                <th scope="col" className="px-6 py-4 font-semibold">Amount</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading live order stream...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No recent orders found.</td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-xs font-bold text-green-600 mb-0.5">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{order.customer?.name || 'Guest'}</div>
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">via {order.shop?.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] text-xs text-gray-600 truncate">
                      {order.items?.map(item => `${item.quantity}x ${item.productVariant?.name}`).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-gray-900">₹{order.totalAmount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{order.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
