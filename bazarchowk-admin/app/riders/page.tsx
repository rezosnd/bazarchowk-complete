"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function RidersCashVerificationPage() {
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
      const res = await fetch(`${API_BASE}/cash-verification/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch pending cash verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (verificationId: string, expectedAmount: number) => {
    try {
      const token = localStorage.getItem('admin_token');
      const actualAmount = actualAmounts[verificationId] ?? expectedAmount;
      const note = notes[verificationId] || '';

      const res = await fetch(`${API_BASE}/cash-verification/${verificationId}/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          actualAmount,
          notes: note
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
        fetchPendingVerifications(); // Refresh the list
      } else {
        const error = await res.json();
        alert('Failed: ' + error.message);
      }
    } catch (e) {
      alert('Network Error');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Hub Cash Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Physically count and verify rider COD deposits at your market hub.</p>
        </div>
        <button 
          onClick={fetchPendingVerifications}
          className="bg-white border border-slate-200 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-50 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
                  <span className="text-lg font-bold text-slate-500">{verification.rider.name?.charAt(0) || 'R'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{verification.rider.name || 'Unknown Rider'}</h3>
                  <p className="text-sm text-gray-500">{verification.rider.phone}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Pending Drop
                  </span>
                </div>
              </div>

              <div className="flex-1 px-4 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Declared by Rider</p>
                <p className="text-2xl font-black text-gray-900 mt-1">₹{verification.declaredAmount}</p>
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
                        placeholder={verification.declaredAmount.toString()}
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
                  onClick={() => handleVerify(verification.id, verification.declaredAmount)}
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
