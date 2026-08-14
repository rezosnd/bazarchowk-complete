"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [unsettledShops, setUnsettledShops] = useState<any[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [commissionRate, setCommissionRate] = useState('0');

  useEffect(() => { fetchSettlements(); }, [activeTab]);
  useEffect(() => { if (showGenerate) fetchUnsettledShops(); }, [showGenerate]);

  const fetchSettlements = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/shops/list?status=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSettlements(json.data || []);
      }
    } catch (err) { console.error('Failed to fetch settlements', err); }
  };

  const fetchUnsettledShops = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      // Get all shops with delivered orders not yet in a settlement
      const res = await fetch(`${API_BASE}/settlement/shops/unsettled-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUnsettledShops(json || []);
      }
    } catch (err) { console.error('Failed to fetch unsettled shops', err); }
  };

  const handleGenerateSettlement = async (shopId: string, shopName: string, grossAmount: number) => {
    const today = new Date().toISOString().split('T')[0];
    // Find earliest unset order date for this shop, or fall back to 30 days
    const weekAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rate = parseFloat(commissionRate);
    const commission = isNaN(rate) ? 0 : Math.max(0, Math.min(100, rate));
    const netEst = grossAmount * (1 - commission / 100);

    if (!confirm(`Generate settlement for ${shopName}?\n\nGross: ₹${grossAmount.toFixed(2)}\nCommission: ${commission}%\nEst. Net Payout: ₹${netEst.toFixed(2)}\n\nThis will create a PENDING settlement. Mark as paid after transferring.`)) return;

    setGenerating(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/shops/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shopId, periodStart: weekAgo, periodEnd: today, commissionPercent: commission })
      });
      if (res.ok) {
        alert(`Settlement generated for ${shopName}! It will appear in the Pending tab.`);
        setShowGenerate(false);
        setActiveTab('PENDING');
        fetchSettlements();
      } else {
        const err = await res.json();
        alert(err?.message || 'Failed to generate settlement.');
      }
    } catch (err) { alert('Network Error'); }
    setGenerating(false);
  };

  const handleMarkAsPaid = async (id: string, name: string) => {
    const ref = prompt(`Enter payment reference (UPI TxID / Bank ref) for ${name}:`);
    if (!ref) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/shops/${id}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paymentReference: ref })
      });
      if (res.ok) {
        alert(`Settled! PDF invoice emailed automatically to ${name}.`);
        fetchSettlements();
      } else {
        alert('Failed to settle payment.');
      }
    } catch (err) { alert('Network Error'); }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Financial Settlements</h1>
          <p className="text-sm text-gray-500 mt-1">Manage weekly payouts for partners. Automated PDF invoices are dispatched on completion.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setShowGenerate(!showGenerate)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-5 rounded-lg transition shadow-sm text-sm"
          >
            + Generate Settlement
          </button>
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button onClick={() => setActiveTab('PENDING')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'PENDING' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Unsettled (Pending)
            </button>
            <button onClick={() => setActiveTab('COMPLETED')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'COMPLETED' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Settled (Completed)
            </button>
          </div>
        </div>
      </div>

      {/* Generate Panel */}
      {showGenerate && (
        <div className="bg-white rounded-2xl border border-orange-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Shops with Unsettled Orders</h2>
              <p className="text-sm text-gray-500 mt-0.5">These shops have delivered orders not yet included in any settlement.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Commission %:</label>
              <input
                type="number"
                min="0" max="100" step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="0"
              />
              <span className="text-sm text-gray-500">(0 = no fee)</span>
            </div>
          </div>
          {unsettledShops.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">All shops are fully settled. No pending orders found.</p>
          ) : (
            <div className="grid gap-3">
              {unsettledShops.map((shop: any) => (
                <div key={shop.shopId} className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-4 border border-slate-200">
                  <div>
                    <div className="font-bold text-gray-900">{shop.shopName}</div>
                    <div className="text-sm text-gray-500">{shop.orderCount} unsettled orders · Gross ₹{shop.grossAmount?.toFixed(2)}</div>
                    <div className="text-sm font-semibold text-green-700">
                      Est. Net ₹{(shop.grossAmount * (1 - (parseFloat(commissionRate) || 0) / 100))?.toFixed(2)}
                      {(parseFloat(commissionRate) || 0) > 0 ? ` (after ${commissionRate}% commission)` : ' (no commission)'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateSettlement(shop.shopId, shop.shopName, shop.grossAmount)}
                    disabled={generating}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-5 rounded-lg text-sm disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="text-gray-400 text-sm">No {activeTab.toLowerCase()} settlements found.</div>
                  {activeTab === 'PENDING' && (
                    <button
                      onClick={() => setShowGenerate(true)}
                      className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 px-6 rounded-lg"
                    >
                      + Generate Settlement for Shops
                    </button>
                  )}
                </td>
              </tr>
            ) : settlements.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{s.shop?.name || 'Unknown Shop'}</div>
                  <div className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700">SHOP</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">{new Date(s.periodStart).toLocaleDateString('en-IN')} – {new Date(s.periodEnd).toLocaleDateString('en-IN')}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s._count?.items || 0} orders</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500"><span className="mr-8">Gross Sales:</span> <span>₹{Number(s.totalOrderAmount).toFixed(2)}</span></div>
                    <div className="flex justify-between text-red-500"><span className="mr-8">Commission:</span> <span>-₹{Number(s.platformCommission).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t mt-1"><span className="mr-8">Net Payout:</span> <span>₹{Number(s.netSettlementAmt).toFixed(2)}</span></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-mono text-gray-900 font-semibold">{s.shop?.upiId || 'No UPI ID'}</div>
                  {s.shop?.bankAccountNumber && <div className="text-xs text-gray-500 mt-1">{s.shop.bankAccountNumber}</div>}
                  {s.status === 'COMPLETED' && s.paymentReference && (
                    <div className="text-xs text-green-600 mt-1 font-semibold">Ref: {s.paymentReference}</div>
                  )}
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
