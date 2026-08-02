"use client";

import React, { useState, useEffect } from 'react';

interface InventoryLog {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  user: { name: string, email: string };
}

interface InventoryItem {
  id: string;
  quantity: number;
  lowStockThreshold: number;
  shop: { name: string };
  productVariant: { sku: string, name: string, product: { name: string } };
  logs: InventoryLog[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function InventoryAdminPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalInventory();
  }, []);

  const fetchGlobalInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/inventory/global`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      } else {
        console.error('Failed to load inventory');
      }
    } catch (error) {
      console.error('Failed to fetch global inventory', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Global Inventory Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Audit stock levels and track ledger mutations across all network shops.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">SKU / Product</th>
                <th scope="col" className="px-6 py-4 font-semibold">Shop</th>
                <th scope="col" className="px-6 py-4 font-semibold">Stock Level</th>
                <th scope="col" className="px-6 py-4 font-semibold">Threshold</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Latest Log</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading ledger data...</td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No inventory ledgers found.</td>
                </tr>
              ) : inventory.map((item) => {
                const isLowStock = item.quantity <= item.lowStockThreshold;
                const latestLog = item.logs?.[0];

                return (
                  <tr key={item.id} className={`bg-white border-b border-slate-100 transition-colors ${isLowStock ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-gray-500 mb-0.5">{item.productVariant?.sku}</div>
                      <div className="font-semibold text-gray-900">{item.productVariant?.product?.name}</div>
                      <div className="text-xs text-gray-600">{item.productVariant?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                      {item.shop?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.quantity}
                        </span>
                        {isLowStock && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {item.lowStockThreshold} units
                    </td>
                    <td className="px-6 py-4 text-right">
                      {latestLog ? (
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            latestLog.type === 'SALE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            latestLog.type === 'RESTOCK' ? 'bg-green-50 text-green-700 border-green-200' :
                            latestLog.type === 'ADJUSTMENT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {latestLog.type} ({latestLog.quantity > 0 ? '+' : ''}{latestLog.quantity})
                          </span>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px] ml-auto">
                            {new Date(latestLog.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No logs</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
