"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function FinanceReportsPage() {
  const [pnlData, setPnlData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Setup default dates (First day of current month to today)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchPnlReport();
    }
  }, [startDate, endDate]);

  const fetchPnlReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      // Adding time to ISO string to satisfy backend date parsing
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const res = await fetch(`${API_BASE}/finance/reports/pnl?startDate=${start}&endDate=${end.toISOString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setPnlData(data);
      }
    } catch (e) {
      console.error('Failed to fetch P&L Report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    // In a production scenario, this triggers a PDF/CSV download from the backend
    alert('Exporting Profit & Loss Statement to PDF...');
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Accounting & Finance</h1>
          <p className="text-sm text-gray-500 mt-1">Live Profit & Loss Statement, Expense Ledger, and Revenue Tracking.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2 items-center bg-white border border-slate-200 px-3 py-1 rounded-lg">
            <span className="text-xs font-bold text-gray-500">From:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm font-semibold text-gray-800 outline-none bg-transparent"
            />
            <span className="text-xs font-bold text-gray-500 ml-2">To:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm font-semibold text-gray-800 outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={downloadReport}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Export P&L
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : !pnlData ? (
        <div className="text-center py-12 text-gray-500">No financial data available for this period.</div>
      ) : (
        <>
          {/* Top Line Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-emerald-500">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">₹{pnlData.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
              <p className="text-xs text-gray-400 mt-1">Platform Fees + Delivery Fees + Ads</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-red-500">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Expenses</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">₹{pnlData.totalExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
              <p className="text-xs text-gray-400 mt-1">Rider Payouts + Operating Costs</p>
            </div>
            <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 border-l-4 border-l-indigo-500">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Net Profit / Loss</p>
              <h2 className={`text-3xl font-black mt-2 ${pnlData.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnlData.netProfit >= 0 ? '+' : '-'}₹{Math.abs(pnlData.netProfit)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-xs text-slate-500 mt-1">EBITDA for selected period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-slate-100 pb-4">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Platform Commissions</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.revenueBreakdown?.commissions?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Customer Delivery Fees</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.revenueBreakdown?.deliveryFees?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Advertisement Revenue</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.revenueBreakdown?.ads?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Other Income</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.revenueBreakdown?.other?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-gray-900 font-bold uppercase text-xs tracking-wider">Gross Revenue</span>
                  <span className="text-emerald-600 font-black text-lg">₹{pnlData.totalRevenue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-slate-100 pb-4">Expense Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Rider Payouts (Cost of Goods Sold)</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.expenseBreakdown?.riderPayouts?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Payment Gateway Fees</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.expenseBreakdown?.gatewayFees?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Marketing & Promotions</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.expenseBreakdown?.marketing?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Operational Overhead</span>
                  <span className="text-gray-900 font-bold">₹{pnlData.expenseBreakdown?.operations?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-gray-900 font-bold uppercase text-xs tracking-wider">Total Expenses</span>
                  <span className="text-red-500 font-black text-lg">₹{pnlData.totalExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
