"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' or 'COMPLETED'
  const [loading, setLoading] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    fetchSettlements();
  }, [activeTab]);

  const fetchSettlements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/shops/list?status=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setSettlements(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch settlements', err);
    }
  };

  const handleMarkAsPaid = async (id: string, name: string) => {
    if (!confirm(`Confirm Bank Transfer to ${name}? \n\nThis will instantly dispatch an automated Email with a PDF breakdown of all sales and deductions to the partner.`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/shops/${id}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentReference: 'MANUAL_TRANSFER_UI' })
      });

      if (res.ok) {
        alert(`Payment Settled!\n\nThe PDF report has been automatically emailed to ${name}.`);
        fetchSettlements();
      } else {
        alert('Failed to settle payment.');
      }
    } catch (err) {
      alert('Network Error');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Financial Settlements</h1>
          <p className="text-sm text-gray-500 mt-1">Manage weekly payouts for partners. Automated PDF invoices are dispatched on completion.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'PENDING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Unsettled (Pending)
          </button>
          <button 
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'COMPLETED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Settled (Completed)
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Partner</th>
              <th className="px-6 py-4 font-semibold">Period & Volume</th>
              <th className="px-6 py-4 font-semibold">Financial Breakdown</th>
              <th className="px-6 py-4 font-semibold">Payment Details</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No {activeTab.toLowerCase()} settlements found.</td></tr>
            ) : settlements.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{s.shop?.name || 'Unknown Shop'}</div>
                  <div className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    SHOP
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">{new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s._count?.items || 0} total deliveries</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500"><span className="mr-8">Gross Sales:</span> <span>₹{s.totalOrderAmount}</span></div>
                    <div className="flex justify-between text-red-500"><span className="mr-8">Commission:</span> <span>-₹{s.platformCommission}</span></div>
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t mt-1"><span className="mr-8">Net Payout:</span> <span>₹{s.netSettlementAmt}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-mono text-gray-900 font-semibold">{s.shop?.upiId || 'No UPI ID Provided'}</div>
                  {s.shop?.bankAccountNumber && <div className="text-xs text-gray-500 mt-1">{s.shop.bankAccountNumber}</div>}
                </td>
                <td className="px-6 py-4 text-right">
                  {s.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleMarkAsPaid(s.id, s.shop?.name || 'Shop')}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition shadow-sm"
                    >
                      {loading ? 'Processing...' : 'Settle Payment'}
                    </button>
                  ) : (
                    <div className="inline-flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        Settled
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1">PDF Emailed</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
