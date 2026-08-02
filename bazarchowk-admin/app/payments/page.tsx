'use client';

import React, { useState, useEffect } from 'react';
export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'}/payments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await res.json();
      setPayments(data.data || []);
    } catch (error) {
      console.error('Failed to fetch payments', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('Are you sure you want to refund this payment? This action cannot be undone.')) return;
    
    setRefunding(orderId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app'}/payments/refund/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Admin Action' })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to refund');
      }
      alert('Refund successful');
      fetchPayments();
    } catch (error: any) {
      alert(error.message || 'Failed to refund');
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Refunds</h1>
          <p className="text-gray-500 text-sm mt-1">Manage Razorpay transactions and process refunds</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Payment ID</th>
                <th className="px-6 py-4 font-semibold">Order No.</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading payments...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{p.razorpayPaymentId || p.razorpayOrderId}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.order?.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 font-medium">{p.order?.customer?.name}</div>
                      <div className="text-xs text-gray-500">{p.order?.customer?.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{p.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium \${
                        p.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'REFUNDED' ? 'bg-purple-100 text-purple-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'PAID' && (
                        <button
                          onClick={() => handleRefund(p.orderId)}
                          disabled={refunding === p.orderId}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          {refunding === p.orderId ? 'Refunding...' : 'Refund'}
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
