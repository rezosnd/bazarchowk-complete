"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RiderSettlementsPage() {
  const [loading, setLoading] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);

  useEffect(() => { fetchUnsettledRiders(); }, []);

  const fetchUnsettledRiders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/riders/unsettled`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setRiders(json || []);
      }
    } catch (err) { console.error('Failed to fetch unsettled riders', err); }
  };

  const handlePayout = async (riderId: string, name: string, amount: number, count: number) => {
    if (!confirm(`Are you sure you want to payout ₹${amount.toFixed(2)} to ${name} for ${count} deliveries? This will mark all their pending earnings as PAID.`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/riders/${riderId}/payout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        alert(`Successfully settled ₹${amount.toFixed(2)} for ${name}!`);
        fetchUnsettledRiders();
      } else {
        const err = await res.json();
        alert(err?.message || 'Failed to settle rider earnings.');
      }
    } catch (err) { alert('Network Error'); }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Rider Settlements (Payouts)</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and payout earnings to delivery partners for completed deliveries.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Delivery Partner</th>
              <th className="px-6 py-4 font-semibold">Unsettled Deliveries</th>
              <th className="px-6 py-4 font-semibold">Total Earnings (Payout)</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {riders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="text-gray-400 text-sm">No riders have pending earnings right now.</div>
                </td>
              </tr>
            ) : riders.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{r.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">{r.completedDeliveries} completed</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-green-600 font-bold text-lg">
                    ₹{r.totalEarning.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handlePayout(r.riderId, r.name, r.totalEarning, r.completedDeliveries)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-sm"
                  >
                    {loading ? 'Processing...' : 'Settle & Payout'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
