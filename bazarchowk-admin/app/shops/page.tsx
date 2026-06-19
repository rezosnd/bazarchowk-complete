"use client";

import React, { useState, useEffect } from 'react';

interface Shop {
  id: string;
  name: string;
  ownerId: string;
  city: string;
  deliveryRadius: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ShopsAdminPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/shops`);
      if (res.ok) {
        const data = await res.json();
        setShops(data);
      }
    } catch (error) {
      console.error('Failed to fetch shops', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, currentStatus: boolean) => {
    setProcessingId(id);
    try {
      // In production, pass Bearer Token
      const res = await fetch(`${API_BASE}/shops/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !currentStatus }),
      });

      if (res.ok) {
        fetchShops();
      } else {
        alert('Verification failed. Ensure you are logged in as Admin.');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Shop Verification & Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Review new partner applications and approve them for the marketplace.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Shop Name & Location</th>
                <th scope="col" className="px-6 py-4 font-semibold">Owner ID</th>
                <th scope="col" className="px-6 py-4 font-semibold">Delivery Radius</th>
                <th scope="col" className="px-6 py-4 font-semibold">Verification Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading shops...</td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No shops registered yet.</td>
                </tr>
              ) : shops.map((shop) => (
                <tr key={shop.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-semibold text-gray-900">{shop.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{shop.city}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {shop.ownerId.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">
                    {shop.deliveryRadius} km
                  </td>
                  <td className="px-6 py-4">
                    {shop.isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Pending Review
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleVerify(shop.id, shop.isVerified)}
                      disabled={processingId === shop.id}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        shop.isVerified 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-white bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/20'
                      }`}
                    >
                      {processingId === shop.id 
                        ? 'Processing...' 
                        : shop.isVerified ? 'Revoke Verification' : 'Approve Shop'}
                    </button>
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
