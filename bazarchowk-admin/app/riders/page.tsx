"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function RidersAndCashPage() {
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'CASH'>('MANAGEMENT');

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Riders & Cash</h1>
          <p className="text-sm text-gray-500 mt-1">Manage delivery partners and verify COD cash drops.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('MANAGEMENT')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'MANAGEMENT' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Rider Approvals & Management
        </button>
        <button
          onClick={() => setActiveTab('CASH')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'CASH' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Hub Cash Verifications
        </button>
      </div>

      {activeTab === 'MANAGEMENT' ? <RiderManagementTab /> : <CashVerificationTab />}
    </div>
  );
}

// ----------------------------------------------------------------------
// RIDER MANAGEMENT TAB
// ----------------------------------------------------------------------
function RiderManagementTab() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/delivery-partners?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRiders(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (partnerId: string) => {
    if (!confirm('Approve this rider?')) return;
    setProcessingId(partnerId);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/delivery-partners/${partnerId}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Rider approved successfully!');
        fetchRiders();
      } else {
        const error = await res.json();
        alert('Failed: ' + error.message);
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={fetchRiders} className="bg-white border border-slate-200 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center text-sm">
          Refresh List
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Rider</th>
                <th className="px-6 py-4 font-semibold">Vehicle & License</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : riders.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No delivery partners found.</td></tr>
              ) : (
                riders.map((partner) => (
                  <tr key={partner.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{partner.user?.firstName} {partner.user?.lastName}</div>
                      <div className="text-xs text-gray-500">{partner.user?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{partner.vehicleType}</div>
                      <div className="text-xs text-gray-400">License: {partner.drivingLicense || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {partner.user?.kycStatus === 'VERIFIED' ? (
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Verified</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {partner.user?.kycStatus !== 'VERIFIED' && (
                        <button
                          onClick={() => handleVerify(partner.id)}
                          disabled={processingId === partner.id}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {processingId === partner.id ? 'Approving...' : 'Approve Rider'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CASH VERIFICATION TAB
// ----------------------------------------------------------------------
function CashVerificationTab() {
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actualAmounts, setActualAmounts] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/settlement/deposits/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch cash verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (verificationId: string, expectedAmount: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const actualAmount = actualAmounts[verificationId] ?? expectedAmount;
      const note = notes[verificationId] || '';

      let status = 'VERIFIED';
      if (actualAmount < expectedAmount) status = 'REJECTED';

      const res = await fetch(`${API_BASE}/settlement/deposits/${verificationId}/verify`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status,
          rejectionReason: note || (status === 'REJECTED' ? `Shortage: Expected ${expectedAmount}, Got ${actualAmount}` : undefined)
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'SHORTAGE') {
          alert(`Warning: Shortage of ₹${result.shortageAmount} detected!`);
        } else if (result.status === 'EXCESS') {
          alert(`Notice: Excess of ₹${result.excessAmount} detected!`);
        } else {
          alert('Cash verified perfectly. Receipt generated.');
        }
        fetchPendingVerifications();
      } else {
        const error = await res.json();
        alert('Failed: ' + error.message);
      }
    } catch (e) {
      alert('Network Error');
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={fetchPendingVerifications} className="bg-white border border-slate-200 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center text-sm">
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : pendingVerifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">All Caught Up!</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">There are no pending cash deposits from riders at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingVerifications.map((verification) => (
            <div key={verification.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6">
              
              <div className="flex-1 flex items-center gap-4 border-r border-slate-100 pr-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-500">{verification.rider?.firstName?.charAt(0) || 'R'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{verification.rider?.firstName} {verification.rider?.lastName}</h3>
                  <p className="text-sm text-gray-500">{verification.rider.phone}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Pending Drop
                  </span>
                </div>
              </div>

              <div className="flex-1 px-4 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Declared by Rider</p>
                <p className="text-2xl font-black text-gray-900 mt-1">₹{verification.totalAmount}</p>
                <p className="text-xs text-gray-400 mt-1">Total COD Collected</p>
              </div>

              <div className="flex-[1.5] bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Physical Cash Counted</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">₹</span>
                      <input 
                        type="number"
                        placeholder={verification.totalAmount?.toString()}
                        value={actualAmounts[verification.id] ?? ''}
                        onChange={(e) => setActualAmounts({...actualAmounts, [verification.id]: parseFloat(e.target.value)})}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Discrepancy Notes</label>
                    <input 
                      type="text"
                      placeholder="Optional notes"
                      value={notes[verification.id] || ''}
                      onChange={(e) => setNotes({...notes, [verification.id]: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleVerify(verification.id, verification.totalAmount)}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition"
                >
                  Verify & Generate Receipt
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
